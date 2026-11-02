import type { Ctx } from '../context';
import type { Env } from '../env';
import { decodeConfig } from '../config/codec';
import { sha256 } from '../util/bytes';
import { decodeGuid, plainGuid } from './ids';
import { titleItem, PREVIEW_PEOPLE_LIMIT, type Dto } from './dto';
import { Library } from './library';
import { profileContext } from './profiles';

export interface PresentationJob {
  kind: 'presentation';
  scope: string;
  revision: string;
  profileId?: string;
  id?: string;
  ids?: string[];
}

const TTL = 7 * 86400_000;
const LEASE = 5 * 60_000;
const PER_MESSAGE = 8;
const revisions = new WeakMap<object, Promise<string>>();
const fields = ['People', 'ImageTags', 'BackdropImageTags', 'Overview', 'Genres', 'GenreItems',
  'Studios', 'Taglines', 'OfficialRating', 'CommunityRating', 'RunTimeTicks', 'ProviderIds',
  'ProductionLocations', 'RemoteTrailers'] as const;

export function presentationRevision(cfg: Ctx['cfg']): Promise<string> {
  let revision = revisions.get(cfg);
  if (!revision) {
    const { language, providers, artwork, keys, addons, search } = cfg;
    revision = sha256(JSON.stringify([language, providers, artwork, keys, addons.catalog, addons.meta, search])).then(h => h.slice(0, 16));
    revisions.set(cfg, revision);
  }
  return revision;
}

function keyOf(ctx: Ctx, revision: string, id: string): string {
  return `jf-presentation:v2:${ctx.scope}:${revision}:${ctx.cfg.ageCap ?? ''}:${id}`;
}

function apply(item: Dto, data: Dto): void {
  for (const field of fields) {
    const value = data[field];
    if (field === 'ImageTags' || field === 'ProviderIds') {
      item[field] = { ...(value as Dto), ...(item[field] as Dto) };
    } else if (field === 'People' && Array.isArray(value) && value.length) {
      item.People = value;
    } else if (item[field] == null || item[field] === '' || Array.isArray(item[field]) && !(item[field] as unknown[]).length) {
      item[field] = value;
    }
  }
}

/** One indexed read per page; provider lookups run only in the queue consumer. */
export async function presentTitles(ctx: Ctx, items: Dto[]): Promise<void> {
  const db = ctx.env.DB;
  if (!db || !ctx.cacheRevision) return;
  const revision = await presentationRevision(ctx.cfg);
  const titles = items.filter(item => item && (item.Type === 'Movie' || item.Type === 'Series'));
  const byKey = new Map<string, Dto[]>();
  for (const item of titles) {
    const id = plainGuid(item.Id);
    if (!id) continue;
    const key = keyOf(ctx, revision, id);
    const copies = byKey.get(key) ?? [];
    copies.push(item);
    byKey.set(key, copies);
  }
  const keys = [...byKey.keys()];
  const missing: string[] = [];
  for (let offset = 0; offset < keys.length; offset += 80) {
    const page = keys.slice(offset, offset + 80);
    const rows = await db.prepare(`SELECT key,value FROM presentations WHERE key IN (${page.map(() => '?').join(',')}) AND expires>?`)
      .bind(...page, Date.now()).all<{key: string; value: string}>();
    const found = new Set<string>();
    for (const row of rows.results) {
      found.add(row.key);
      const data = JSON.parse(row.value) as Dto | null;
      if (data) for (const item of byKey.get(row.key) ?? []) apply(item, data);
    }
    missing.push(...page.filter(key => !found.has(key)));
  }
  if (missing.length && ctx.env.RILL_JOBS && ctx.defer) {
    ctx.defer(requestPresentations(ctx, revision, missing.slice(0, 100)));
  }
}

async function requestPresentations(ctx: Ctx, revision: string, keys: string[]): Promise<void> {
  const db = ctx.env.DB!;
  // Claim in batches so simultaneous homepage requests cannot enqueue the same title.
  for (let offset = 0; offset < keys.length; offset += 40) {
    const page = keys.slice(offset, offset + 40);
    const now = Date.now();
    const claimed = await db.prepare(`INSERT INTO presentations(key,value,expires) VALUES ${page.map(() => "(?,'null',?)").join(',')}
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires WHERE presentations.expires<=?
      RETURNING key`).bind(...page.flatMap(key => [key, now + LEASE]), now).all<{key: string}>();
    if (!claimed.results.length) continue;
    try {
      const ids = claimed.results.map(({key}) => key.slice(key.lastIndexOf(':') + 1));
      const messages = [];
      for (let i = 0; i < ids.length; i += PER_MESSAGE) messages.push({ body: {
        kind: 'presentation' as const, scope: ctx.scope, revision, profileId: ctx.profile?.id, ids: ids.slice(i, i + PER_MESSAGE),
      } });
      await ctx.env.RILL_JOBS!.sendBatch(messages);
    } catch (error) {
      await db.prepare(`DELETE FROM presentations WHERE key IN (${claimed.results.map(() => '?').join(',')}) AND value='null' AND expires=?`)
        .bind(...claimed.results.map(row => row.key), now + LEASE).run();
      throw error;
    }
  }
}

export async function preparePresentation(job: PresentationJob, env: Env): Promise<void> {
  if (!env.DB) return;
  const saved = await env.DB.prepare('SELECT config,origin FROM accounts WHERE scope=?')
    .bind(job.scope).first<{config: string; origin: string}>();
  const cfg = saved ? await decodeConfig(saved.config) : null;
  if (!cfg || !saved) return;
  const revision = await presentationRevision(cfg);
  const cacheRevision = (await sha256(JSON.stringify(cfg))).slice(0, 16);
  // Ignore jobs for replaced settings or deleted profiles, never cache their metadata.
  // Old single-title messages used the full configuration hash.
  if (revision !== job.revision && (job.ids || cacheRevision !== job.revision)) return;
  const ctx = profileContext({cfg,env,cfgToken:saved.config,cacheRevision,scope:job.scope,
    origin:saved.origin,lang:cfg.language.slice(0,2).toLowerCase(),tmdbKey:cfg.keys.tmdb || env.TMDB_KEY}, job.profileId);
  if (!ctx) return;
  const library = new Library({ctx,who:{serverId:'',userId:''},base:saved.origin,rawPath:'',
    client:{client:'Rill',device:'Queue',deviceId:'queue',version:'1'},claims:null,q:()=>undefined,body:{}});
  const ids = (job.ids ?? (job.id ? [job.id] : [])).slice(0, PER_MESSAGE);
  const rows: Array<[string, string]> = [];
  let failed = 0;
  for (const id of ids) {
    const guid = decodeGuid(id);
    if (!guid || guid.kind !== 'movie' && guid.kind !== 'series') continue;
    const meta = await library.meta(guid, false).catch(() => null);
    if (!meta) { failed++; continue; }
    const item = titleItem(meta, guid, id, library.jf.who);
    const data = Object.fromEntries(fields.map(field => [field, item[field]]));
    // Large series can have hundreds of crew credits. Keep homepage payloads bounded.
    data.People = (item.People as Dto[]).slice(0, PREVIEW_PEOPLE_LIMIT);
    rows.push([keyOf(ctx, revision, id), JSON.stringify(data)]);
  }
  if (rows.length) {
    const expires = Date.now() + TTL;
    await env.DB.batch(rows.map(([key, value]) => env.DB!.prepare('INSERT INTO presentations(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires')
      .bind(key, value, expires)));
  }
  // Failed titles retain their short lease and can be requested by a later page load.
  if (failed && !rows.length) throw new Error('Homepage metadata is temporarily unavailable');
}
