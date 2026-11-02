import type { Ctx } from '../context';
import { metaAddons } from '../config/schema';
import { cacheGet, cachePut, fetchJson } from '../util/cache';
import { mapLimit, uniq } from '../util/concurrency';
import type { ContentType, Manifest, Meta, MetaPreview, Stream, Subtitle } from './types';
import { bridgeIds, bundleFromStremioId } from '../meta/ids';
import { mergeArtwork } from '../meta/artwork';

export function addonBase(manifestUrl: string): string | null {
  try {
    let u = manifestUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    u = u.replace(/\/manifest\.json(\?.*)?$/i, '').replace(/\/+$/, '');
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

export async function getManifest(manifestUrl: string): Promise<Manifest | null> {
  const base = addonBase(manifestUrl);
  if (!base) return null;
  return fetchJson<Manifest>(`${base}/manifest.json`, { ttl: 3600 });
}

function resourceSupports(manifest: Manifest, resource: string, type: string, id?: string): boolean {
  for (const r of manifest.resources || []) {
    if (typeof r === 'string') {
      if (r !== resource) continue;
      if (manifest.types?.length && !manifest.types.includes(type)) continue;
      if (id && manifest.idPrefixes?.length && !manifest.idPrefixes.some((p) => id.startsWith(p))) continue;
      return true;
    }
    if (r.name !== resource) continue;
    if (r.types?.length && !r.types.includes(type)) continue;
    if (id && r.idPrefixes?.length && !r.idPrefixes.some((p) => id.startsWith(p))) continue;
    return true;
  }
  return false;
}

export async function addonCatalog(base: string, type: ContentType, id: string, extra: Record<string, string | number | undefined> = {}): Promise<MetaPreview[]> {
  const parts = Object.entries(extra).filter(([, v]) => v !== undefined && v !== '' && v !== 0).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  const url = `${base}/catalog/${type}/${encodeURIComponent(id)}${parts.length ? `/${parts.join('&')}` : ''}.json`;
  const data = await fetchJson<{ metas?: MetaPreview[] }>(url, { ttl: 600 });
  return data?.metas ?? [];
}

export async function addonMeta(base: string, type: ContentType, id: string): Promise<Meta | null> {
  const data = await fetchJson<{ meta?: Meta }>(`${base}/meta/${type}/${encodeURIComponent(id)}.json`, { ttl: 1800 });
  return data?.meta ?? null;
}

export async function externalMeta(ctx: Ctx, type: ContentType, id: string): Promise<Meta | null> {
  for (const url of metaAddons(ctx.cfg)) {
    const base = addonBase(url);
    if (!base) continue;
    const manifest = await getManifest(url);
    if (manifest && !resourceSupports(manifest, 'meta', type, id)) continue;
    const meta = await addonMeta(base, type, id);
    if (meta) {
      if (!ctx.cfg.artwork.posters.length && !ctx.cfg.artwork.backgrounds.length && !ctx.cfg.artwork.logos.length) return meta;
      try {
        const ids = await bridgeIds(ctx, { ...bundleFromStremioId(id), ...meta.ids }, type);
        const art = await mergeArtwork(ctx, type, ids);
        return { ...meta, poster: art.poster ?? meta.poster, background: art.background ?? meta.background, logo: art.logo ?? meta.logo };
      } catch { return meta; }
    }
  }
  return null;
}

function pickSupported(manifest: Manifest | null, resource: string, types: ContentType[], ids: string[]): { type: ContentType; id: string } | null {
  if (!manifest) return { type: types[0], id: ids[0] };
  for (const type of uniq(types, (x) => x)) {
    for (const id of ids) if (resourceSupports(manifest, resource, type, id)) return { type, id };
  }
  return null;
}

export interface SourcedStream extends Stream {
  addon: string;
}

export interface StreamReport { addons: number; asked: number; failed: number; streams: number }

export async function externalStreams(ctx: Ctx, type: ContentType, ids: string | string[], fallbackType: ContentType = type, report?: StreamReport): Promise<SourcedStream[]> {
  const candidates = uniq((Array.isArray(ids) ? ids : [ids]).filter(Boolean), (x) => x);
  if (report) report.addons = ctx.cfg.addons.stream.length;
  if (!candidates.length) return [];
  const key = `streams:${ctx.scope}:${type}:${candidates.join('|')}`;
  const hit = await cacheGet<SourcedStream[]>(key);
  if (hit?.length) { if (report) report.streams = hit.length; return hit; }
  const results = await mapLimit(ctx.cfg.addons.stream, 6, async (url) => {
    try {
      const base = addonBase(url);
      if (!base) return [] as SourcedStream[];
      const manifest = await getManifest(url);
      const asked = pickSupported(manifest, 'stream', [type, fallbackType], candidates);
      if (!asked) return [];
      if (report) report.asked++;
      const data = await fetchJson<{ streams?: Stream[] }>(`${base}/stream/${asked.type}/${encodeURIComponent(asked.id)}.json`, { ttl: 0, timeoutMs: 20000 });
      if (!data && report) report.failed++;
      const name = manifest?.name || base;
      return (Array.isArray(data?.streams) ? data.streams : [])
        .filter((s) => s && typeof s === 'object' && !Array.isArray(s))
        .map((s) => ({ ...s, addon: name }));
    } catch {
      // One invalid add-on response must not discard other add-ons' results.
      if (report) report.failed++;
      return [] as SourcedStream[];
    }
  });
  const streams = uniq(results.flat(), (s) => s.url || (s.infoHash ? `${s.infoHash}:${s.fileIdx ?? ''}` : '') || s.externalUrl || s.ytId || JSON.stringify(s));
  if (report) report.streams = streams.length;
  if (streams.length) await cachePut(key, streams, 120);
  return streams;
}

export async function externalSubtitles(ctx: Ctx, type: ContentType, ids: string | string[], extra: { filename?: string; videoHash?: string; videoSize?: number } = {}, fallbackType: ContentType = type): Promise<Subtitle[]> {
  const candidates = uniq((Array.isArray(ids) ? ids : [ids]).filter(Boolean), (x) => x);
  if (!candidates.length) return [];
  const parts = Object.entries(extra).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  const results = await mapLimit(ctx.cfg.addons.subtitle, 6, async (url) => {
    const base = addonBase(url);
    if (!base) return [] as Subtitle[];
    const manifest = await getManifest(url);
    const asked = pickSupported(manifest, 'subtitles', [type, fallbackType], candidates);
    if (!asked) return [];
    const path = `${base}/subtitles/${asked.type}/${encodeURIComponent(asked.id)}${parts.length ? `/${parts.join('&')}` : ''}.json`;
    const data = await fetchJson<{ subtitles?: Subtitle[] }>(path, { ttl: 600 });
    return data?.subtitles ?? [];
  });
  return uniq(results.flat(), (s) => s.url);
}

export async function externalCatalogs(ctx: Ctx): Promise<Array<{ base: string; addonName: string; catalog: Manifest['catalogs'][number] }>> {
  const groups = await mapLimit(metaAddons(ctx.cfg), 3, async (url) => {
    const base = addonBase(url);
    const manifest = base ? await getManifest(url) : null;
    if (!base || !manifest) return [];
    return (manifest.catalogs || []).map(catalog => ({ base, addonName: manifest.name, catalog }));
  });
  return groups.flat();
}
