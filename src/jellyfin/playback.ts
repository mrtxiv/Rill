import { externalStreams, externalSubtitles, type StreamReport } from '../stremio/client';
import type { Stream } from '../stremio/types';
import { containerOf, mediaSource, mediaSourceId, runtimeTicks, streamLabel, subtitleContentType, subtitleFormat, subtitleEntries, type Dto, type MediaSourceInput } from './dto';
import { plainGuid, type TitleGuid } from './ids';
import type { Library } from './library';

type Unplayable = 'torrent' | 'headers' | 'other';

function needsHeaders(s: Stream): boolean {
  const ph = s.behaviorHints?.proxyHeaders;
  return Boolean(ph && ((ph.request && Object.keys(ph.request).length) || (ph.response && Object.keys(ph.response).length)));
}

export function playableUrl(s: Stream, torrentServer?: string): string | Unplayable {
  if (typeof s.url === 'string' && /^https?:\/\//i.test(s.url)) return needsHeaders(s) ? 'headers' : s.url;
  if (typeof s.infoHash !== 'string' || !/^[a-f0-9]{40}$/i.test(s.infoHash)) return 'other';
  if (!torrentServer) return 'torrent';
  // Stremio uses -1 to select the main video when the add-on omits a file index.
  const idx = Number.isInteger(s.fileIdx) && s.fileIdx! >= 0 ? s.fileIdx! : -1;
  const trackers = (Array.isArray(s.sources) ? s.sources : []).filter(x => typeof x === 'string' && /^(tracker:|dht:)/.test(x)).slice(0, 20);
  const query = trackers.length ? `?${trackers.map(t => `tr=${encodeURIComponent(t)}`).join('&')}` : '';
  return `${torrentServer}/${s.infoHash.toLowerCase()}/${idx}${query}`;
}

export interface ResolvedSources {
  sources: Dto[];
  streamType: string;
  streamId: string;
}

export async function resolveSources(lib: Library, g: TitleGuid, itemId: string, options: { includeSubtitles?: boolean } = {}): Promise<ResolvedSources> {
  const empty = { sources: [], streamType: '', streamId: '' };
  if ((g.kind !== 'movie' && g.kind !== 'episode') || g.source === 'tmdbc' || g.source === 'tvdbc') return empty;
  const ctx = lib.ctx;
  const show = g.kind === 'episode' ? await lib.show(g) : null;
  const meta = g.kind === 'movie' ? await lib.meta(g) : show?.meta ?? null;
  // A stream add-on can resolve the item ID without metadata, but age restrictions
  // must still fail closed when metadata is unavailable or was filtered out.
  if (!meta && ctx.cfg.ageCap && ctx.cfg.ageCap.toLowerCase() !== 'none') return empty;
  if(meta?.collection)return empty;
  const streamType = lib.streamTypeOf(g);
  const streamIds = lib.streamIdsOf(show, g, meta);
  const streamId = streamIds[0];

  let streams: Stream[] = [];
  const report: StreamReport = { addons: 0, asked: 0, failed: 0, streams: 0 };
  try {
    streams = await externalStreams(ctx, streamType, streamIds, g.kind === 'movie' ? 'movie' : 'series', report);
  } catch {
    streams = [];
  }
  const skipped: Record<Unplayable, number> = { torrent: 0, headers: 0, other: 0 };
  const usable: Array<{ s: Stream; url: string }> = [];
  for (const s of streams) {
    const url = playableUrl(s, ctx.cfg.jellyfin.torrentServer);
    if (url === 'torrent' || url === 'headers' || url === 'other') skipped[url]++;
    else if (usable.length < ctx.cfg.jellyfin.maxSources) usable.push({ s, url });
  }
  if (!usable.length) {
    // Stream addresses can carry add-on credentials, so log counts only.
    console.warn('No playable stream', { ...report, torrentOnly: skipped.torrent, needsHeaders: skipped.headers, other: skipped.other });
    return { sources: [], streamType, streamId };
  }

  const runtime = runtimeTicks(meta?.runtime);
  const subs = options.includeSubtitles !== false && ctx.cfg.addons.subtitle.length ? subtitleEntries(await externalSubtitles(ctx, streamType, streamIds, {}, g.kind === 'movie' ? 'movie' : 'series').catch(() => [])) : [];

  const seen = new Set<string>();
  const sources: Dto[] = [];
  for (const { s, url } of usable) {
    const hashed = await mediaSourceId(url);
    if (seen.has(hashed)) continue;
    seen.add(hashed);
    const id = sources.length === 0 ? plainGuid(itemId) || hashed : hashed;
    const size = Number(s.behaviorHints?.videoSize);
    const input: MediaSourceInput = {
      id,
      url,
      label: streamLabel(s),
      container: containerOf({ ...s, url }),
      size: Number.isFinite(size) && size > 0 ? size : null,
      filename: s.behaviorHints?.filename ?? null,
      runtimeTicks: runtime,
      subtitles: [
        ...(s.subtitles ?? []).filter((x) => x && /^https?:\/\//i.test(x.url)),
        ...subs,
      ].map((x, i) => ({ url: x.url, lang: x.lang || 'und', deliveryUrl: `${lib.jf.base}/Videos/${plainGuid(itemId)}/${id}/Subtitles/${2 + i}/Stream.${subtitleFormat(x.url)}${lib.jf.accessToken ? `?api_key=${encodeURIComponent(lib.jf.accessToken)}` : ''}` })),
    };
    const dto = mediaSource(input);
    dto.ETag = hashed;
    sources.push(dto);
  }
  return { sources, streamType, streamId };
}

export function playbackInfo(sources: Dto[], wantedSourceId: string | undefined, itemId: string): Dto {
  let picked = sources;
  const wanted = wantedSourceId ? plainGuid(wantedSourceId) || wantedSourceId : '';
  if (wanted && wanted !== plainGuid(itemId)) {
    const match = sources.filter((s) => s.Id === wanted || s.ETag === wanted);
    if (match.length) picked = match;
  }
  if (!picked.length) return { MediaSources: [], PlaySessionId: crypto.randomUUID(), ErrorCode: 'NoCompatibleStream' };
  return { MediaSources: picked, PlaySessionId: crypto.randomUUID() };
}

export function pickSource(sources: Dto[], wantedSourceId: string | undefined, itemId: string): Dto | null {
  if (!sources.length) return null;
  const wanted = wantedSourceId ? plainGuid(wantedSourceId) || wantedSourceId : '';
  if (!wanted || wanted === plainGuid(itemId)) return sources[0];
  return sources.find((s) => s.Id === wanted || s.ETag === wanted) ?? null;
}

export async function subtitleResponse(sources: Dto[], sourceId: string, index: number, fmt: string): Promise<Response> {
  const wanted = plainGuid(sourceId) || sourceId;
  const src = sources.find((s) => s.Id === wanted || s.ETag === wanted) ?? sources[0];
  const streams = (src?.MediaStreams as Dto[] | undefined) ?? [];
  const sub = streams.find((s) => s.Type === 'Subtitle' && s.Index === index);
  const url = sub?.DeliveryUrl ? subtitleUrlOf(sub) : null;
  if (!url) return new Response('Subtitle not found', { status: 404 });
  try {
    const upstream = await fetch(url, { headers: { accept: '*/*' },signal:AbortSignal.timeout(15000) });
    if (!upstream.ok) return new Response('Subtitle unavailable', { status: 502 });
    const original=subtitleFormat(url),requested=fmt.replace(/^.*\./,'').toLowerCase();
    const type = subtitleContentType(requested || original);
    if(requested==='vtt'&&original==='srt') {
      const text=(await upstream.text()).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
      const vtt='WEBVTT\n\n'+text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
      return new Response(vtt,{headers:{'content-type':type,'cache-control':'private, max-age=3600'}});
    }
    if(requested&&requested!==original){await upstream.body?.cancel();return new Response('Unsupported subtitle conversion',{status:400});}
    return new Response(upstream.body, { status: 200, headers: { 'content-type': type, 'cache-control': 'private, max-age=3600' } });
  } catch {
    return new Response('Subtitle unavailable', { status: 502 });
  }
}

function subtitleUrlOf(stream: Dto): string | null {
  const raw = stream.Path;
  return typeof raw === 'string' && /^https?:\/\//i.test(raw) ? raw : null;
}
