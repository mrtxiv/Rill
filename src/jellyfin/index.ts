import { loginThrottle, resetLogin } from '../storage/login-limits';
import { profileContext, profileUsers } from './profiles';
import { presentTitles } from './presentation';
import { revokeToken } from './auth';
import { registerAccount } from '../storage/state';
import { Hono, type Context } from 'hono';
import type { Ctx } from '../context';
import {
  approveQuickConnect,
  claimQuickConnect,
  clientInfoOf,
  credentialsMatch,
  identityOf,
  mintToken,
  quickConnectDto,
  readQuickConnect,
  startQuickConnect,
  tokenOf,
  verifyToken,
} from './auth';
import { collectionFolder, genreDto, listOf, publicSystemInfo, sessionDto, systemInfo, userData, userDto, type Dto } from './dto';
import { dashGuid, decodeGuid, encodeGuid, genreIdOf, parentSeriesOf, plainGuid, type LabelGuid, type TitleGuid } from './ids';
import { imageUrlFor, imageResponse } from './images';
import { imageTaggedJson, imageUrlByTag } from './image-tags';
import { collectionTypeOf, filterByType, includeTypesOf, Library, type CatalogRef, type ItemType, type ResumeScope, type Show } from './library';
import { pickSource, playbackInfo, resolveSources, subtitleResponse } from './playback';
import { qBool, qInt, qList, type JfEnv, type JfRequest } from './request';
import { reportOf, setPlayed, updateUserData } from './sessions';
import { onPlaying, onProgress, onStopped } from './reports';
import { handleJellyfinSocket } from './socket';
import { EMPTY_LIST, registerStubs } from './stubs';
import { segments } from './segments';
import { sha256 } from '../util/bytes';
import { personFor,creditsFor } from './people';
import { applyAgeCap } from '../addon/agecap';
import type { Meta } from '../stremio/types';
import { collectionMembers } from '../addon/collections';
import { boxSetDto, boxSetMembers, boxSetOf, collectionOf, collectionViewDto, visibleCollections } from './collections';
import { mapLimit } from '../util/concurrency';

const inner = new Hono<JfEnv>();
const state = new WeakMap<Request, JfRequest>();
const libraries = new WeakMap<JfRequest, Library>();

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
};

async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const type = (req.headers.get('content-type') || '').toLowerCase();
  try {
    const text = await req.text();
    if (!text) return {};
    if (type.includes('json') || text.trim().startsWith('{')) {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    }
    if (type.includes('form-urlencoded')) return Object.fromEntries(new URLSearchParams(text).entries());
  } catch {
  }
  return {};
}

export function isJellyfinPath(path: string): boolean {
  const root = path.toLowerCase().split('/')[1];
  return root === 'jellyfin' || root === 'emby' || inner.routes.some(route => route.path.split('/')[1] === root);
}

export async function handleJellyfinRequest(ctx: Ctx, raw: Request, env: Parameters<typeof inner.fetch>[1], exec?: Parameters<typeof inner.fetch>[2]): Promise<Response> {
  const url = new URL(raw.url);
  if (raw.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const full = url.pathname;
  const prefix = /^\/jellyfin(?=\/|$)/i.exec(full)?.[0] ?? '';
  let sub = full.slice(prefix.length);
  if (!sub.startsWith('/')) sub = `/${sub}`;
  sub = sub.replace(/^\/emby(?=\/|$)/i, '') || '/';

  const params = new Map<string, string>();
  url.searchParams.forEach((v, k) => {
    if (!params.has(k.toLowerCase())) params.set(k.toLowerCase(), v);
  });

  const body = await readBody(raw);
  const token = tokenOf(raw);
  const claims = token ? await verifyToken(ctx,token) : null;
  const scoped = profileContext(ctx,claims?.p);
  if (!scoped) return new Response('Unknown profile',{status:401});
  ctx = scoped;
  const who = await identityOf(ctx);
  if (claims && claims.u !== who.userId) return new Response('Invalid user',{status:401});

  const jf: JfRequest = {
    ctx,
    who,
    client: clientInfoOf(raw),
    claims,
    accessToken: claims ? token : undefined,
    base: `${ctx.origin}${prefix}`,
    rawPath: sub,
    q: (name) => params.get(name.toLowerCase()),
    body,
  };

  if (jf.client.deviceId === 'unknown' && claims?.d) jf.client.deviceId = claims.d;

  const routed = new Request(`${url.origin}${sub.toLowerCase()}${url.search}`, { method: raw.method, headers: raw.headers });
  state.set(routed, jf);

  if (exec) ctx.defer = work => exec!.waitUntil(work.catch(() => console.warn('Background tracking failed')));
  const res = await inner.fetch(routed, env, exec);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  if (res.status === 101) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers, ...(res.webSocket ? { webSocket: res.webSocket } : {}) });
}

type C = Context<JfEnv, any, any>;

inner.use('*', async (c, next) => {
  const jf = state.get(c.req.raw);
  if (!jf) return c.json({ Message: 'Request state missing' }, 500);
  c.set('jf', jf);
  c.set('ctx', jf.ctx);
  const started = Date.now();
  await next();
  const durationMs = Date.now() - started;
  if (c.res.status >= 500 || durationMs >= 5000) {
    // Route templates omit item IDs and authentication query parameters.
    console.warn('Slow or failed Jellyfin request', {
      method: c.req.method, route: c.req.routePath, status: c.res.status, durationMs,
    });
  }
});

const PUBLIC = [
  /^\/system\/info\/public$/,
  /^\/system\/ping$/,
  /^\/quickconnect\/(enabled|initiate|connect)$/,
  /^\/users\/(authenticatebyname|authenticatewithquickconnect|public)$/,
  /^\/branding\//,
  /^\/(items|users)\/[^/]+\/images\//,
  /^\/sessions\/logout$/,
  /^\/socket$/,
  /^\/embywebsocket$/,
];

inner.use('*', async (c, next) => {
  const jf = c.get('jf');
  const path = new URL(c.req.url).pathname;
  if (!jf.claims && !PUBLIC.some((re) => re.test(path))) return c.json({ Message: 'Unauthorized' }, 401);
  const requestedUser = /^\/users\/([0-9a-f-]{32,36})(?:\/|$)/i.exec(path)?.[1] || jf.q('userid');
  if (jf.claims && requestedUser && !path.includes('/images/') && plainGuid(requestedUser) !== jf.who.userId) return c.json({Message:'User does not match session'},403);
  await next();
});

const ID_FIELD = /^(Id|ItemId|ParentId|SeriesId|SeasonId|UserId|ServerId|Key|DisplayPreferencesId|MediaSourceId|PlaylistItemId|OwnerId|Parent(Backdrop|Logo|Thumb|Primary|Art)ItemId|PrimaryImageItemId|BackdropImageItemId|ChannelId|AlbumId)$/;
function dashIds(key: string, value: unknown): unknown {
  if (typeof value === 'string' && (ID_FIELD.test(key) || key.endsWith('Ids')) && /^[0-9a-f]{32}$/i.test(value)) return dashGuid(value.toLowerCase());
  if (Array.isArray(value) && key.endsWith('Ids')) return value.map(v => typeof v === 'string' && /^[0-9a-f]{32}$/i.test(v) ? dashGuid(v.toLowerCase()) : v);
  return value;
}

async function reply(c: C, body: unknown, status = 200): Promise<Response> {
  const items = Array.isArray(body) ? body : (body as {Items?: unknown} | null)?.Items;
  if (Array.isArray(items) && c.get('jf').claims) {
    try { await presentTitles(c.get('jf').ctx, items); }
    catch { console.warn('Homepage metadata cache unavailable'); }
  }
  // Cover every item response, including folders and playback/user-data updates.
  const records: Dto[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const dto = value as Dto;
    if (typeof dto.IsFavorite === 'boolean' && plainGuid(dto.ItemId ?? dto.Key)) {records.push(dto);return;}
    // Item metadata (people, streams and images) contains no nested user state.
    // Only traverse the response containers that can contain item DTOs.
    for (const key of ['UserData','Items','NowPlayingItem','CurrentProgram']) visit(dto[key]);
  };
  visit(body);
  if (records.length && c.get('jf').claims) {
    await lib(c).decorateUserData(records);
  }
  return c.body(await imageTaggedJson(c.get('jf').ctx, body, dashIds), status as never, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
}

function lib(c: C): Library {
  const jf = c.get('jf');
  let library = libraries.get(jf);
  if (!library) { library = new Library(jf); libraries.set(jf, library); }
  return library;
}

function defer(c: C, work: () => Promise<unknown>): void {
  const p = work().catch(() => { console.warn('Playback update failed before completion'); });
  try {
    c.executionCtx.waitUntil(p);
  } catch {
  }
}

function itemGuid(c: C, name = 'id'): { id: string; g: ReturnType<typeof decodeGuid> } {
  const id = plainGuid(c.req.param(name));
  return { id, g: decodeGuid(id) };
}

const notFound = (c: C) => reply(c, { Message: 'Item not found' }, 404);

inner.get('/system/info/public', (c) => {
  const jf = c.get('jf');
  return reply(c, publicSystemInfo(jf.ctx, jf.who, jf.base));
});
inner.get('/system/info', (c) => {
  const jf = c.get('jf');
  return reply(c, systemInfo(jf.ctx, jf.who, jf.base));
});
inner.all('/system/ping', (c) => c.json(c.get('jf').ctx.cfg.name || 'Rill'));

inner.get('/quickconnect/enabled', (c) => c.json(true));
inner.post('/quickconnect/initiate', async (c) => {
  const jf = c.get('jf');
  return reply(c, quickConnectDto(await startQuickConnect(jf.ctx, jf.client)));
});
inner.get('/quickconnect/connect', async (c) => {
  const jf = c.get('jf');
  const rec = await readQuickConnect(jf.ctx, String(jf.q('secret') ?? ''));
  return rec ? reply(c, quickConnectDto(rec)) : reply(c, { Message: 'Unknown quick connect secret' }, 404);
});
inner.post('/quickconnect/authorize', async (c) => {
  const jf = c.get('jf');
  const rec = await approveQuickConnect(jf.ctx, String(jf.q('code') ?? jf.body.Code ?? ''));
  return rec ? c.json(true) : reply(c, { Message: 'Unknown quick connect code' }, 404);
});

async function signIn(c: C): Promise<Response> {
  const jf = c.get('jf');
  await registerAccount(jf.ctx,true);
  const token = await mintToken(jf.ctx, jf.who.userId, jf.client.deviceId);
  return reply(c, {
    User: userDto(jf.ctx, jf.who),
    SessionInfo: sessionDto(jf.ctx, jf.who, jf.client),
    AccessToken: token,
    ServerId: jf.who.serverId,
  });
}

inner.post('/users/authenticatebyname', async (c) => {
  const jf = c.get('jf');
  const retry = await loginThrottle(jf.ctx.env, c.req.raw);
  if (retry) { c.header('Retry-After', String(retry)); return reply(c, { Message: 'Too many attempts. Try again later.' }, 429); }
  const username = jf.body.Username ?? jf.body.username;
  const password = jf.body.Pw ?? jf.body.pw ?? jf.body.Password ?? jf.body.password ?? '';
  const profile = jf.ctx.cfg.jellyfin.profiles?.find(p => p.name.toLowerCase() === String(username ?? '').trim().toLowerCase());
  const loginCtx = profile ? {...jf.ctx,cfg:{...jf.ctx.cfg,jellyfin:{...jf.ctx.cfg.jellyfin,username:profile.name}}} : jf.ctx;
  if (!credentialsMatch(loginCtx, username, password)) return reply(c, { Message: 'Invalid username or password' }, 401);
  await resetLogin(jf.ctx.env, c.req.raw);
  jf.ctx = profileContext(jf.ctx,profile?.id)!;
  jf.who = await identityOf(jf.ctx);
  return signIn(c);
});

inner.post('/users/authenticatewithquickconnect', async (c) => {
  const jf = c.get('jf');
  const rec = await claimQuickConnect(jf.ctx, String(jf.body.Secret ?? jf.body.secret ?? ''));
  if (!rec) return reply(c, { Message: 'Quick connect request is not approved' }, 401);
  const scoped = profileContext(jf.ctx,rec.profileId);
  if (!scoped) return reply(c,{Message:'Unknown profile'},401);
  jf.ctx = scoped; jf.who = await identityOf(scoped);
  return signIn(c);
});

inner.post('/sessions/logout', async (c) => {
  await revokeToken(c.get('jf').ctx, tokenOf(c.req.raw));
  return c.body(null,204);
});

inner.get('/tracking/status', async c => {
  const ctx=c.get('jf').ctx;
  if (!ctx.env.DB) return c.json({durable:false,pending:0,failed:0,services:[]});
  if (ctx.profile && !ctx.profile.sharesHistory) return c.json({durable:true,pending:0,failed:0,services:[]});
  const rows=await ctx.env.DB.prepare("SELECT service,status,count(*) AS count FROM deliveries WHERE scope=? AND status IN ('pending','failed') GROUP BY service,status").bind(ctx.scope).all<{service:string;status:string;count:number}>();
  const bulk=await ctx.env.DB.prepare("SELECT COALESCE(SUM(json_array_length(events)-position),0) AS remaining FROM bulk_actions WHERE scope=? AND status='pending'").bind(ctx.scope).first<{remaining:number}>();
  return c.json({durable:true,pending:(bulk?.remaining ?? 0)+rows.results.filter(r=>r.status==='pending').reduce((s,r)=>s+r.count,0),failed:rows.results.filter(r=>r.status==='failed').reduce((s,r)=>s+r.count,0),services:rows.results});
});

inner.post('/tracking/retry', async c => {
  const ctx=c.get('jf').ctx;
  if (!ctx.env.DB) return c.json({Message:'Durable storage is not configured'},409);
  if (ctx.profile && !ctx.profile.sharesHistory) return c.json({Message:'Profile has independent history'},403);
  const result=await ctx.env.DB.prepare("UPDATE deliveries SET status='pending',attempts=0,due=?,lease=NULL,lease_until=0 WHERE scope=? AND status='failed'").bind(Date.now(),ctx.scope).run();
  return c.json({queued:result.meta.changes});
});

inner.get('/users/public', async (c) => reply(c,(await profileUsers(c.get('jf').ctx)).map(p => userDto(p.ctx,p.who))));
inner.get('/users/me', (c) => {
  const jf = c.get('jf');
  return reply(c, userDto(jf.ctx, jf.who));
});
inner.get('/users', async (c) => reply(c,(await profileUsers(c.get('jf').ctx)).map(p => userDto(p.ctx,p.who))));
inner.post('/users/:uid/configuration', (c) => c.body(null, 204));
inner.post('/users/:uid/policy', (c) => c.body(null, 204));
inner.post('/users/configuration', (c) => c.body(null, 204));

inner.get('/sessions', (c) => {
  const jf = c.get('jf');
  return reply(c, [sessionDto(jf.ctx, jf.who, jf.client)]);
});
inner.post('/sessions/capabilities', (c) => c.body(null, 204));
inner.post('/sessions/capabilities/full', (c) => c.body(null, 204));
inner.post('/sessions/viewing', (c) => c.body(null, 204));

inner.get('/socket', (c) => handleJellyfinSocket(c.get('jf').ctx, c.req.raw));
inner.get('/embywebsocket', (c) => handleJellyfinSocket(c.get('jf').ctx, c.req.raw));

async function viewsHandler(c: C): Promise<Response> {
  const views = await lib(c).views();
  return reply(c, listOf(views, views.length, 0));
}
inner.get('/users/:uid/views', viewsHandler);
inner.get('/userviews', viewsHandler);
inner.get('/library/mediafolders', viewsHandler);

inner.get('/library/virtualfolders', async (c) => {
  const views = await lib(c).views();
  return reply(
    c,
    views.map((v) => ({
      Name: v.Name,
      Locations: [v.Path],
      CollectionType: v.CollectionType ?? null,
      LibraryOptions: { Enabled: true, EnableRealtimeMonitor: false, PathInfos: [] },
      ItemId: v.Id,
      PrimaryImageItemId: v.Id,
      RefreshStatus: 'Idle',
    })),
  );
});

async function groupingHandler(c: C): Promise<Response> {
  const views = await lib(c).views();
  return reply(c, views.map((v) => ({ Name: v.Name, Id: v.Id })));
}
inner.get('/userviews/groupingoptions', groupingHandler);
inner.get('/users/:uid/groupingoptions', groupingHandler);

function sortWithin(items: Dto[], sortBy: string[], descending: boolean): Dto[] {
  const key = sortBy[0] ?? '';
  const num = (v: unknown) => (typeof v === 'number' ? v : Number.NEGATIVE_INFINITY);
  const ud = (i: Dto) => (i.UserData ?? {}) as Dto;
  const played = (i: Dto) => {
    const ms = Date.parse(String(ud(i).LastPlayedDate ?? ''));
    return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
  };
  const cmp: ((a: Dto, b: Dto) => number) | null =
    key === 'SortName' || key === 'Name'
      ? (a, b) => String(a.SortName ?? a.Name ?? '').localeCompare(String(b.SortName ?? b.Name ?? ''))
      : key === 'ProductionYear' || key === 'PremiereDate' || key === 'DateCreated'
        ? (a, b) => Date.parse(String(a.PremiereDate ?? '')) - Date.parse(String(b.PremiereDate ?? ''))
        : key === 'DatePlayed'
          ? (a, b) => played(a) - played(b)
        : key === 'PlayCount'
          ? (a, b) => num(ud(a).PlayCount) - num(ud(b).PlayCount)
        : key === 'CommunityRating'
          ? (a, b) => num(a.CommunityRating) - num(b.CommunityRating)
          : key === 'Runtime'
            ? (a, b) => num(a.RunTimeTicks) - num(b.RunTimeTicks)
            : key === 'IndexNumber' || key === 'ParentIndexNumber'
              ? (a, b) => num(a.ParentIndexNumber) - num(b.ParentIndexNumber) || num(a.IndexNumber) - num(b.IndexNumber)
              : key === 'Random'
                ? () => Math.random() - 0.5
                : null;
  if (!cmp) return items;
  const sorted = [...items].sort(cmp);
  return descending && key !== 'Random' ? sorted.reverse() : sorted;
}

function itemFilters(jf: JfRequest): string[] {
  const filters = qList(jf, 'Filters');
  if (jf.q('IsFavorite') !== undefined) filters.push(qBool(jf, 'IsFavorite', false) ? 'IsFavorite' : 'IsNotFavorite');
  return filters;
}

function applyFilters(items: Dto[], filters: string[]): Dto[] {
  let out = items;
  const ud = (i: Dto) => (i.UserData ?? {}) as Dto;
  if (filters.includes('IsPlayed')) out = out.filter((i) => ud(i).Played === true);
  if (filters.includes('IsUnplayed')) out = out.filter((i) => ud(i).Played !== true);
  if (filters.includes('IsResumable')) out = out.filter((i) => Number(ud(i).PlaybackPositionTicks ?? 0) > 0 && !(i.Type === 'Episode' && ud(i).Likes === false));
  if (filters.includes('IsFavorite')) out = out.filter((i) => ud(i).IsFavorite === true);
  if (filters.includes('IsNotFavorite')) out = out.filter((i) => ud(i).IsFavorite !== true);
  if (filters.includes('Likes')) out = out.filter((i) => ud(i).Likes === true);
  if (filters.includes('Dislikes')) out = out.filter((i) => ud(i).Likes === false);
  return out;
}

function nothingSurvives(jf: JfRequest): boolean {
  const excluded = new Set(qList(jf, 'ExcludeItemTypes'));
  const media = new Set(qList(jf, 'MediaTypes'));
  if (!excluded.size && !media.size) return false;
  return !(['Movie', 'Series', 'Episode'] as const).some((kind) => {
    if (excluded.has(kind)) return false;
    if (!media.size) return true;
    return media.has(kind === 'Series' ? 'Unknown' : 'Video');
  });
}

async function genreExtra(L: Library, jf: JfRequest): Promise<string | undefined> {
  const names = qList(jf, 'Genres').length ? qList(jf, 'Genres') : qList(jf, 'Genre');
  if (names.length) return names[0];
  for (const raw of qList(jf, 'GenreIds')) {
    const g = decodeGuid(raw);
    if (g && g.kind === 'misc' && g.sub === 'genre') return L.genreNameOf(g);
  }
  return undefined;
}

async function childrenOf(L: Library, jf: JfRequest, g: TitleGuid, wanted: Set<ItemType> | null): Promise<{ items: Dto[]; shows: Map<string, Show> } | null> {
  const show = await L.show(g);
  if (!show) return null;
  const wantsEpisodes = g.kind === 'season' || (qBool(jf, 'Recursive', false) && (!wanted || wanted.has('Episode')));
  const items = wantsEpisodes ? L.episodeItems(show, g.kind === 'season' ? g.season : undefined) : L.seasonItems(show);
  const shows = new Map([[show.id, show]]);
  await L.decorate(items, shows);
  return { items, shows };
}

async function listItems(c: C): Promise<Response> {
  const jf = c.get('jf');
  const L = lib(c);
  const start = Math.max(0, qInt(jf, 'StartIndex', 0));
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 100)), 500);
  const wanted = includeTypesOf(qList(jf, 'IncludeItemTypes'));
  const filters = itemFilters(jf);
  const sortBy = qList(jf, 'SortBy');
  const descending = (jf.q('SortOrder') ?? '').toLowerCase() === 'descending';
  const parentRaw = jf.q('ParentId');
  const term = (jf.q('SearchTerm') ?? '').trim();

  if (nothingSurvives(jf)) return reply(c, listOf([], 0, start));
  const personId=qList(jf,'PersonIds')[0];
  if(personId) {
    const guid=decodeGuid(personId);
    const person=guid?.kind==='misc'?await personFor(jf.ctx,guid):null;
    if(!person)return reply(c,listOf([],0,start));
    const previews=await creditsFor(jf.ctx,person.id);
    const safe=[...await applyAgeCap(jf.ctx,'movie',previews.filter(m=>m.type==='movie')),...await applyAgeCap(jf.ctx,'series',previews.filter(m=>m.type==='series'))];
    const items=filterByType(safe.map(m=>{
      const g=L.guidOfBundle({tmdb:Number(m.id.split(':')[1])},m.type==='movie'?'movie':'series');
      return g?L.titleItemOf(m as Meta,g):null;
    }).filter((x):x is Dto=>x!==null),wanted);
    const filtered = sortWithin(applyFilters(await L.decorate(items), filters), sortBy, descending);
    return reply(c,listOf(filtered.slice(start,start+limit),filtered.length,start));
  }

  const ids = qList(jf, 'Ids');
  if (ids.length) {
    const items: Dto[] = [];
    for (const raw of ids.slice(0, 50)) {
      const item = await singleItem(L, plainGuid(raw), false);
      if (item) items.push(item);
    }
    const filtered = sortWithin(applyFilters(await L.decoratePreferences(filterByType(items, wanted)), filters), sortBy, descending);
    return reply(c, listOf(filtered.slice(start, start + limit), filtered.length, start));
  }

  // Saved preferences are the source of this list, independent of current catalog pages.
  if (filters.some(filter => ['IsFavorite', 'Likes', 'Dislikes'].includes(filter)) && !parentRaw) {
    const excluded = new Set(qList(jf, 'ExcludeItemTypes'));
    const included = new Set(qList(jf, 'IncludeItemTypes'));
    const typeOf = (id: string): string => {
      const g = decodeGuid(id);
      if (!g) return '';
      if (g.kind === 'movie' && (g.source === 'tmdbc' || g.source === 'tvdbc') || g.kind === 'misc' && g.sub === 'boxset') return 'BoxSet';
      if (g.kind === 'view' || g.kind === 'misc' && g.sub === 'collection') return 'CollectionFolder';
      if (g.kind === 'misc') return g.sub === 'genre' ? 'Genre' : 'Person';
      return g.kind[0].toUpperCase() + g.kind.slice(1);
    };
    const saved = filters.includes('IsFavorite') ? [...await L.favorites()] : [...await L.ratings()]
      .filter(([, likes]) => (!filters.includes('Likes') || likes) && (!filters.includes('Dislikes') || !likes)).map(([id]) => id);
    const ids = saved.filter(id => (!included.size || included.has(typeOf(id))) && !excluded.has(typeOf(id)));
    const resolved = await mapLimit(ids, 4, id => singleItem(L, id, false));
    const media = new Set(qList(jf, 'MediaTypes'));
    const genre = (await genreExtra(L, jf))?.toLowerCase();
    const items = resolved.filter((item): item is Dto => item !== null).filter(item =>
      (!included.size || included.has(String(item.Type))) && !excluded.has(String(item.Type)) &&
      (!media.size || media.has(String(item.MediaType ?? 'Unknown'))) &&
      (!term || String(item.Name ?? '').toLowerCase().includes(term.toLowerCase())) &&
      (!genre || (item.Genres as string[] | undefined)?.some(name => name.toLowerCase() === genre)));
    const filtered = sortWithin(applyFilters(await L.decoratePreferences(items), filters), sortBy, descending);
    return reply(c, listOf(filtered.slice(start, start + limit), filtered.length, start));
  }

  if (term) {
    const found = await L.search(term, wanted, start + limit);
    const filtered = sortWithin(applyFilters(found, filters), sortBy, descending);
    return reply(c, listOf(filtered.slice(start, start + limit), filtered.length, start));
  }

  if (!parentRaw) {
    if (!qBool(jf, 'Recursive', false)) {
      const views = applyFilters(await L.decoratePreferences(await L.views()), filters);
      return reply(c, listOf(views.slice(start, start + limit), views.length, start));
    }
    if (wanted?.has('BoxSet') && !wanted.has('Movie') && !wanted.has('Series')) {
      const sets = (await visibleCollections(L)).flatMap((col) => col.folders.map((f) => boxSetDto(L, col, f)));
      const items = sortWithin(applyFilters(await L.decoratePreferences(sets), filters), sortBy, descending);
      return reply(c, listOf(items.slice(start, start + limit), items.length, start));
    }
    const genre = await genreExtra(L, jf);
    const pool = (await L.browsable()).filter((cat) => {
      if (!wanted) return true;
      const ct = collectionTypeOf(cat.type);
      return ct === 'movies' ? wanted.has('Movie') : ct === 'tvshows' ? wanted.has('Series') : true;
    });
    const collected: Dto[] = [];
    let offset = 0;
    let more = false;
    for (const cat of pool) {
      if (collected.length >= limit) break;
      const localStart = Math.max(0, start - offset);
      const need = limit - collected.length;
      const page = await L.window(cat, localStart, need, genre ? { genre } : {});
      for (const m of page.items) {
        const item = L.previewItem(m, cat, cat.viewId);
        if (item && collected.length < limit) collected.push(item);
      }
      offset += localStart + page.items.length;
      if (page.hasMore) {
        more = true;
        if (collected.length >= limit) break;
      }
    }
    const items = sortWithin(applyFilters(await L.decorate(filterByType(collected, wanted)), filters), sortBy, descending);
    return reply(c, listOf(items, more ? start + items.length + limit : start + items.length, start));
  }

  const parent = decodeGuid(parentRaw);
  if (!parent) return reply(c, listOf([], 0, start));
  if (parent.kind === 'misc' && parent.sub === 'collection') {
    const col = await collectionOf(L, parent);
    if (!col) return reply(c, listOf([], 0, start));
    const items = sortWithin(applyFilters(await L.decoratePreferences(col.folders.map((f) => boxSetDto(L, col, f))), filters), sortBy, descending);
    return reply(c, listOf(items.slice(start, start + limit), items.length, start));
  }
  if (parent.kind === 'misc' && parent.sub === 'boxset') {
    const found = await boxSetOf(L, parent);
    if (!found) return reply(c, listOf([], 0, start));
    const page = await boxSetMembers(L, found.folder, start, limit);
    const items = sortWithin(applyFilters(filterByType(page.items, wanted), filters), sortBy, descending);
    return reply(c, listOf(items, page.hasMore ? start + items.length + limit : start + items.length, start));
  }
  if(parent.kind==='movie'&&(parent.source==='tvdbc'||parent.source==='tmdbc')) {
    const members=await collectionMembers(jf.ctx,`${parent.source}:${parent.num}`,start,limit);
    const safe=await applyAgeCap(jf.ctx,'movie',members.items);
    const fake={id:'collection',type:'movie',viewId:plainGuid(parentRaw)} as CatalogRef;
    const items=safe.map(m=>L.previewItem(m,fake,fake.viewId)).filter((m):m is Dto=>!!m);
    return reply(c,listOf(applyFilters(await L.decorate(filterByType(items,wanted)), filters),members.total,start));
  }

  if (parent.kind === 'series' || parent.kind === 'season') {
    const found = await childrenOf(L, jf, parent, wanted);
    if (!found) return reply(c, listOf([], 0, start));
    let items = applyFilters(found.items, filters);
    if (sortBy.length) items = sortWithin(items, sortBy, descending);
    return reply(c, listOf(items.slice(start, start + limit), items.length, start));
  }

  if (parent.kind === 'movie' || parent.kind === 'episode') return reply(c, listOf([], 0, start));

  const cat = await L.viewOf(parent as LabelGuid);
  if (!cat) return reply(c, listOf([], 0, start));
  const genre = await genreExtra(L, jf);
  const page = await L.window(cat, start, limit, genre ? { genre } : {});
  const built = page.items.map((m) => L.previewItem(m, cat, cat.viewId)).filter((x): x is Dto => Boolean(x));
  const items = sortWithin(applyFilters(await L.decorate(filterByType(built, wanted)), filters), sortBy, descending);
  const total = page.hasMore && items.length > 0 ? start + items.length + limit : start + items.length;
  return reply(c, listOf(items, total, start));
}

async function singleItem(L: Library, id: string, withSources: boolean): Promise<Dto | null> {
  const g = decodeGuid(id);
  if (!g) return null;
  if (g.kind === 'view') {
    const cat = await L.viewOf(g);
    return cat ? collectionFolder(cat.viewId, L.jf.who, cat.name, collectionTypeOf(cat.type)) : null;
  }
  if (g.kind === 'misc') {
    if(g.sub==='genre')return genreDto(await L.genreNameOf(g),L.jf.who);
    if (g.sub === 'collection') {
      const col = await collectionOf(L, g);
      return col ? collectionViewDto(L, col) : null;
    }
    if (g.sub === 'boxset') {
      const found = await boxSetOf(L, g);
      return found ? boxSetDto(L, found.collection, found.folder) : null;
    }
    const person=await personFor(L.ctx,g);
    return person?{Id:id,ServerId:L.jf.who.serverId,Name:person.name,Type:'Person',Overview:person.biography??'',PremiereDate:person.birthday?`${person.birthday}T00:00:00.000Z`:null,EndDate:person.deathday?`${person.deathday}T00:00:00.000Z`:null,ProductionLocations:person.place_of_birth?[person.place_of_birth]:[],ProviderIds:{Tmdb:String(person.id)},ExternalUrls:[{Name:'TMDB',Url:`https://www.themoviedb.org/person/${person.id}`}],ImageTags:person.profile_path?{Primary:`https://image.tmdb.org/t/p/h632${person.profile_path}`}:{},PrimaryImageAspectRatio:2/3,IsFolder:false}:null;
  }

  if (g.kind === 'movie' || g.kind === 'series') {
    const meta = await L.meta(g);
    if (!meta) return null;
    const item = L.titleItemOf(meta, g);
    const shows = new Map<string, Show>();
    if (g.kind === 'series') {
      const show = await L.show(g);
      if (show) shows.set(show.id, show);
    }
    if (withSources && g.kind === 'movie') await attachSources(L, item, g, id);
    await L.decorate([item], shows);
    return item;
  }

  const show = await L.show(g);
  if (!show) return null;
  const shows = new Map([[show.id, show]]);
  if (g.kind === 'season') {
    const item = L.seasonItems(show).find((s) => s.IndexNumber === g.season);
    if (!item) return null;
    await L.decorate([item], shows);
    return item;
  }
  const ep = L.findEpisode(show, g);
  if (!ep) return null;
  const item = L.episodeItem(show, ep);
  if (withSources) await attachSources(L, item, g, id);
  await L.decorate([item], shows);
  return item;
}

async function attachSources(L: Library, item: Dto, g: TitleGuid, id: string): Promise<void> {
  const { sources } = await resolveSources(L, g, id);
  if (!sources.length) return;
  item.MediaSources = sources;
  item.MediaStreams = sources[0].MediaStreams;
  item.Container = sources[0].Container;
  if (sources.length > 1) item.MediaSourceCount = sources.length;
}

async function singleItemHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const { id } = itemGuid(c);
  const withSources = qList(jf, 'Fields').includes('MediaSources');
  const item = await singleItem(lib(c), id, withSources);
  if (item && !item.UserData) item.UserData = userData(id);
  return item ? reply(c, item) : notFound(c);
}

registerStubs(inner);
inner.get('/mediasegments/:id',async c=> {
  const jf=c.get('jf'),id=c.req.param('id'),g=decodeGuid(id);
  if(!g || g.kind!=='movie' && g.kind!=='episode') return reply(c,listOf([],0,0));
  const meta=await lib(c).meta(g);
  if(!meta) return reply(c,listOf([],0,0));
  const wanted=qList(jf,'IncludeSegmentTypes');
  const found=await segments(jf.ctx,meta.ids??{},g.kind,g.season,g.episode);
  const items=await Promise.all(found.filter(s=>!wanted.length||wanted.includes(s.type)).map(async s=>({Id:(await sha256(`${id}:${s.type}`)).slice(0,32),ItemId:id,Type:s.type,StartTicks:Math.round(s.startMs*10000),EndTicks:Math.round(s.endMs*10000)})));
  return reply(c,listOf(items,items.length,0));
});
inner.get('/items/filters', filtersHandler);
inner.get('/items/filters2', filtersHandler);
inner.get('/items/latest', latestHandler);
inner.get('/users/:uid/items/latest', latestHandler);
inner.get('/useritems/resume', resumeHandler);
inner.get('/users/:uid/items/resume', resumeHandler);

inner.get('/items', listItems);
inner.get('/users/:uid/items', listItems);
inner.get('/items/:id', singleItemHandler);
inner.get('/users/:uid/items/:id', singleItemHandler);
inner.get('/users/:uid', (c) => {
  const jf = c.get('jf');
  return reply(c, userDto(jf.ctx, jf.who));
});

async function latestHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const L = lib(c);
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 20)), 100);
  const wanted = includeTypesOf(qList(jf, 'IncludeItemTypes'));
  const parent = decodeGuid(jf.q('ParentId'));
  let cats: CatalogRef[] = [];
  if (parent && parent.kind === 'misc' && parent.sub === 'collection') {
    const col = await collectionOf(L, parent);
    return reply(c, col ? col.folders.slice(0, limit).map((f) => boxSetDto(L, col, f)) : []);
  }
  if (parent && parent.kind === 'view') {
    const cat = await L.viewOf(parent);
    if (cat) cats = [cat];
  } else if (!parent) {
    const all = await L.browsable();
    const movies = all.find((x) => x.type === 'movie');
    const shows = all.find((x) => x.type === 'series' || x.type === 'anime');
    cats = [movies, shows].filter((x): x is CatalogRef => Boolean(x) && (!wanted || wanted.has(x!.type === 'movie' ? 'Movie' : 'Series')));
  }
  const items: Dto[] = [];
  for (const cat of cats) items.push(...(await L.latest(cat, limit)));
  return reply(c, filterByType(items, wanted).slice(0, limit));
}

async function resumeScope(L: Library, parentRaw: string | undefined): Promise<ResumeScope | null> {
  if (!parentRaw) return {};
  const parent = decodeGuid(parentRaw);
  if (parent?.kind === 'view') {
    const cat = await L.viewOf(parent);
    return cat ? { kind: cat.type === 'movie' ? 'movie' : 'episode' } : null;
  }
  if (parent?.kind !== 'series' && parent?.kind !== 'season') return null;
  const show = await L.show(parent);
  return show ? { show, season: parent.kind === 'season' ? parent.season : undefined } : null;
}

async function resumeHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const L = lib(c);
  const start = Math.max(0, qInt(jf, 'StartIndex', 0));
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 20)), 100);
  const wanted = includeTypesOf(qList(jf, 'IncludeItemTypes'));
  const scope = await resumeScope(L, jf.q('ParentId'));
  if (!scope) return reply(c, listOf([], 0, start));
  const { items, total } = await L.resumeShelf(start, limit, scope);
  return reply(c, listOf(filterByType(items, wanted), total, start));
}

inner.get('/shows/nextup', async (c) => {
  const jf = c.get('jf');
  const start = Math.max(0, qInt(jf, 'StartIndex', 0));
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 20)), 100);
  const opts = {
    includeResumable: qBool(jf, 'EnableResumable', true),
    includeRewatching: qBool(jf, 'EnableRewatching', false),
  };
  const seriesRaw = jf.q('SeriesId');
  const scoped = decodeGuid(seriesRaw || jf.q('ParentId'));
  const title = scoped && scoped.kind !== 'view' && scoped.kind !== 'misc' ? scoped : null;
  if (seriesRaw || title) {
    const items = title ? await lib(c).nextUpOf(title, opts) : [];
    return reply(c, listOf(items.slice(start, start + limit), items.length, start));
  }
  const { items, total } = await lib(c).nextUpShelf(start, limit, opts);
  return reply(c, listOf(items, total, start));
});

inner.get('/shows/upcoming', async (c) => {
  const jf = c.get('jf');
  const start = Math.max(0, qInt(jf, 'StartIndex', 0));
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 20)), 100);
  const { items, total } = await lib(c).upcomingShelf(start, limit);
  return reply(c, listOf(items, total, start));
});

inner.get('/shows/:id/seasons', async (c) => {
  const { g } = itemGuid(c);
  if (!g || g.kind !== 'series') return reply(c, EMPTY_LIST);
  const L = lib(c);
  const show = await L.show(g);
  if (!show) return reply(c, EMPTY_LIST);
  const items = await L.decorate(L.seasonItems(show), new Map([[show.id, show]]));
  return reply(c, listOf(items, items.length, 0));
});

inner.get('/shows/:id/episodes', async (c) => {
  const jf = c.get('jf');
  const { g } = itemGuid(c);
  if (!g || (g.kind !== 'series' && g.kind !== 'season')) return reply(c, EMPTY_LIST);
  const L = lib(c);
  const show = await L.show(g);
  if (!show) return reply(c, EMPTY_LIST);
  let season: number | undefined = g.kind === 'season' ? g.season : undefined;
  const rawSeason = jf.q('Season');
  if (rawSeason !== undefined && /^\d+$/.test(rawSeason)) season = Number(rawSeason);
  else {
    const sg = decodeGuid(jf.q('SeasonId'));
    if (sg && sg.kind === 'season') season = sg.season;
  }
  let items = await L.decorate(L.episodeItems(show, season), new Map([[show.id, show]]));
  items = applyFilters(items, itemFilters(jf));
  const start = Math.max(0, qInt(jf, 'StartIndex', 0));
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', items.length || 1)), 1000);
  return reply(c, listOf(items.slice(start, start + limit), items.length, start));
});

async function similarHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const { g } = itemGuid(c);
  if (!g || g.kind === 'view' || g.kind === 'misc') return reply(c, EMPTY_LIST);
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 12)), 50);
  const title = g.kind === 'movie' || g.kind === 'series' ? g : parentSeriesOf(g);
  const items = await lib(c).similar(title, limit);
  return reply(c, listOf(items, items.length, 0));
}
inner.get('/items/:id/similar', similarHandler);
inner.get('/movies/:id/similar', similarHandler);
inner.get('/shows/:id/similar', similarHandler);

inner.get('/items/:id/ancestors', async (c) => {
  const { g } = itemGuid(c);
  const L = lib(c);
  if (g?.kind === 'misc' && g.sub === 'boxset') {
    const found = await boxSetOf(L, g);
    return reply(c, found ? [collectionViewDto(L, found.collection)] : []);
  }
  if (!g || (g.kind !== 'episode' && g.kind !== 'season')) return reply(c, []);
  const show = await L.show(g);
  if (!show) return reply(c, []);
  const chain: Dto[] = [];
  if (g.kind === 'episode') {
    const season = L.seasonItems(show).find((s) => s.IndexNumber === (g.season ?? 1));
    if (season) chain.push(season);
  }
  chain.push(L.titleItemOf(show.meta, show.guid));
  return reply(c, chain);
});

async function genresFor(L: Library, jf: JfRequest): Promise<string[]> {
  const parent = decodeGuid(jf.q('ParentId'));
  const cats = await L.browsable();
  if (parent && parent.kind === 'view') {
    const cat = await L.viewOf(parent);
    return cat ? cat.genres : [];
  }
  const wanted = includeTypesOf(qList(jf, 'IncludeItemTypes'));
  const all = new Set<string>();
  for (const cat of cats) {
    const ct = collectionTypeOf(cat.type);
    if (wanted && !(ct === 'movies' ? wanted.has('Movie') : wanted.has('Series'))) continue;
    for (const g of cat.genres) all.add(g);
  }
  return [...all].sort();
}

inner.get('/genres', async (c) => {
  const jf = c.get('jf');
  const genres = await genresFor(lib(c), jf);
  const items = genres.map((name) => genreDto(name, jf.who));
  return reply(c, listOf(items, items.length, 0));
});

inner.get('/genres/:name', async (c) => {
  const jf = c.get('jf');
  const segment = jf.rawPath.split('/').filter(Boolean)[1] ?? c.req.param('name');
  const name = decodeURIComponent(segment);
  const genres = await genresFor(lib(c), { ...jf, q: () => undefined });
  const match = genres.find((g) => g.toLowerCase() === name.toLowerCase()) ?? name;
  return reply(c, genreDto(match, jf.who));
});

async function filtersHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const genres = await genresFor(lib(c), jf);
  return reply(c, {
    Genres: genres,
    Tags: [],
    OfficialRatings: [],
    Years: [],
    GenreItems: genres.map((name) => ({ Name: name, Id: genreIdOf(name), ServerId: jf.who.serverId })),
  });
}

inner.get('/search/hints', async (c) => {
  const jf = c.get('jf');
  const term = (jf.q('SearchTerm') ?? '').trim();
  const limit = Math.min(Math.max(1, qInt(jf, 'Limit', 20)), 50);
  if (!term) return reply(c, { SearchHints: [], TotalRecordCount: 0 });
  const items = (await lib(c).search(term, includeTypesOf(qList(jf, 'IncludeItemTypes')), limit)).slice(0, limit);
  return reply(c, {
    SearchHints: items.map((i) => ({
      ItemId: i.Id,
      Id: i.Id,
      Name: i.Name,
      Type: i.Type,
      MediaType: i.MediaType ?? 'Video',
      ProductionYear: i.ProductionYear,
      PrimaryImageTag: (i.ImageTags as Dto | undefined)?.Primary,
      BackdropImageTag: (i.BackdropImageTags as string[] | undefined)?.[0],
      BackdropImageItemId: i.Id,
      PrimaryImageAspectRatio: i.PrimaryImageAspectRatio,
      RunTimeTicks: i.RunTimeTicks,
    })),
    TotalRecordCount: items.length,
  });
});

async function playbackHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const { id, g } = itemGuid(c);
  if (!g || (g.kind !== 'movie' && g.kind !== 'episode')) return reply(c, { MediaSources: [], PlaySessionId: '', ErrorCode: 'NotAllowed' }, 404);
  const { sources } = await resolveSources(lib(c), g, id);
  const wanted = jf.q('MediaSourceId') ?? (typeof jf.body.MediaSourceId === 'string' ? jf.body.MediaSourceId : undefined);
  return reply(c, playbackInfo(sources, wanted, id));
}
inner.get('/items/:id/playbackinfo', playbackHandler);
inner.post('/items/:id/playbackinfo', playbackHandler);
inner.get('/items/:id/mediasources', async (c) => {
  const { id, g } = itemGuid(c);
  if (!g || (g.kind !== 'movie' && g.kind !== 'episode')) return reply(c, []);
  const { sources } = await resolveSources(lib(c), g, id);
  return reply(c, sources);
});

async function videoHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const { id, g } = itemGuid(c);
  if (!g || (g.kind !== 'movie' && g.kind !== 'episode')) return notFound(c);
  const { sources } = await resolveSources(lib(c), g, id, { includeSubtitles: false });
  const chosen = pickSource(sources, jf.q('MediaSourceId'), id);
  if (!chosen || typeof chosen.Path !== 'string') return reply(c, { Message: chosen === null && sources.length ? 'Media source not found' : 'No playable stream' }, 404);
  return new Response(null, { status: 302, headers: { location: chosen.Path, 'cache-control': 'no-store' } });
}
const VIDEO_FILE = /^(stream|original)(\.[a-z0-9]+)?$/i;
const videoFileHandler = (c: C) => (VIDEO_FILE.test(c.req.param('file') ?? '') ? videoHandler(c) : c.notFound());
for (const path of ['/videos/:id/:file', '/videos/:id/stream/:filename']) {
  inner.get(path, path.endsWith(':file') ? videoFileHandler : videoHandler);
  inner.on('HEAD', path, path.endsWith(':file') ? videoFileHandler : videoHandler);
}

async function subtitleHandler(c: C): Promise<Response> {
  const { id, g } = itemGuid(c);
  if (!g || (g.kind !== 'movie' && g.kind !== 'episode')) return notFound(c);
  const { sources } = await resolveSources(lib(c), g, id);
  const index = parseInt(c.req.param('index') ?? '', 10);
  if (!Number.isFinite(index)) return notFound(c);
  const fmt = /\.([a-z0-9]+)$/i.exec(c.req.param('file') ?? '')?.[1] ?? 'srt';
  return subtitleResponse(sources, c.req.param('msid') ?? '', index, fmt);
}
inner.get('/videos/:id/:msid/subtitles/:index/:file', subtitleHandler);
inner.get('/videos/:id/:msid/subtitles/:index/:start/:file', subtitleHandler);

function report(c: C, paramName?: string) {
  const jf = c.get('jf');
  const paused = jf.q('IsPaused')?.toLowerCase();
  return reportOf({
    ...jf.body,
    PositionTicks: jf.body.PositionTicks ?? jf.body.positionTicks ?? jf.q('PositionTicks'),
    IsPaused: jf.body.IsPaused ?? jf.body.isPaused ?? (paused === 'true' ? true : paused === 'false' ? false : undefined),
    PlaySessionId: jf.body.PlaySessionId ?? jf.body.playSessionId ?? jf.q('PlaySessionId'),
    RunTimeTicks: jf.body.RunTimeTicks ?? jf.body.runTimeTicks ?? jf.q('RunTimeTicks'),
  }, paramName ? c.req.param(paramName) : undefined);
}

inner.post('/sessions/playing', async (c) => {
  const r = report(c);
  if (r) { if (c.get('jf').ctx.env.DB) await onPlaying(lib(c),r); else defer(c, () => onPlaying(lib(c),r)); }
  return c.body(null, 204);
});
inner.post('/playingitems/:id', async (c) => {
  const r = report(c, 'id');
  if (r) { if (c.get('jf').ctx.env.DB) await onPlaying(lib(c),r); else defer(c, () => onPlaying(lib(c),r)); }
  return c.body(null, 204);
});
inner.post('/sessions/playing/progress', async (c) => {
  const r = report(c);
  if (r) { if (c.get('jf').ctx.env.DB) await onProgress(lib(c),r); else defer(c, () => onProgress(lib(c),r)); }
  return c.body(null, 204);
});
inner.post('/playingitems/:id/progress', async (c) => {
  const r = report(c, 'id');
  if (r) { if (c.get('jf').ctx.env.DB) await onProgress(lib(c),r); else defer(c, () => onProgress(lib(c),r)); }
  return c.body(null, 204);
});
inner.post('/sessions/playing/stopped', async (c) => {
  const r = report(c);
  if (r) { if (c.get('jf').ctx.env.DB) await onStopped(lib(c),r); else defer(c, () => onStopped(lib(c),r)); }
  return c.body(null, 204);
});
inner.delete('/playingitems/:id', async (c) => {
  const r = report(c, 'id');
  if (r) { if (c.get('jf').ctx.env.DB) await onStopped(lib(c),r); else defer(c, () => onStopped(lib(c),r)); }
  return c.body(null, 204);
});
inner.post('/sessions/playing/ping', (c) => c.body(null, 204));

const markPlayed = (watched: boolean) => async (c: C) => reply(c, await setPlayed(lib(c), c.req.param('id') ?? '', watched));
inner.post('/users/:uid/playeditems/:id', markPlayed(true));
inner.delete('/users/:uid/playeditems/:id', markPlayed(false));
inner.post('/userplayeditems/:id', markPlayed(true));
inner.delete('/userplayeditems/:id', markPlayed(false));

const favoriteHandler = (favorite: boolean) => async (c: C) => {
  const L = lib(c);
  if (!L.ctx.env.DB) return reply(c, { Message: 'Durable storage is required to save favorites' }, 503);
  const { id, g } = itemGuid(c);
  if (!g) return notFound(c);
  const item = await singleItem(L, id, false);
  if (!item && favorite) return notFound(c);
  await L.setFavorite(id, favorite);
  return reply(c, item?.UserData ?? userData(id));
};
for (const path of ['/users/:uid/favoriteitems/:id', '/userfavoriteitems/:id']) {
  inner.post(path, favoriteHandler(true));
  inner.delete(path, favoriteHandler(false));
}

const ratingHandler = (clear: boolean) => async (c: C) => {
  const L = lib(c);
  if (!L.ctx.env.DB) return reply(c, { Message: 'Durable storage is required to save ratings' }, 503);
  const raw = clear ? undefined : c.get('jf').q('Likes')?.trim().toLowerCase();
  if (raw !== undefined && raw !== 'true' && raw !== 'false') return reply(c, { Message: 'Likes must be true or false' }, 400);
  const likes = raw === undefined ? null : raw === 'true';
  const { id, g } = itemGuid(c);
  if (!g) return notFound(c);
  const item = await singleItem(L, id, false);
  if (!item && likes !== null) return notFound(c);
  await L.setRating(id, likes);
  return reply(c, item?.UserData ?? userData(id));
};
for (const path of ['/users/:uid/items/:id/rating', '/useritems/:id/rating']) {
  inner.post(path, ratingHandler(false));
  inner.delete(path, ratingHandler(true));
}

const userDataHandler = async (c: C) => {
  const L = lib(c), body = c.get('jf').body;
  const { id, g } = itemGuid(c);
  if (!g) return notFound(c);
  const favorite = body.IsFavorite ?? body.isFavorite;
  const likes = 'Likes' in body ? body.Likes : body.likes;
  const hasRating = likes !== undefined;
  if (hasRating && likes !== null && typeof likes !== 'boolean') return reply(c, { Message: 'Likes must be true, false or null' }, 400);
  if (typeof favorite === 'boolean' || hasRating) {
    if (!L.ctx.env.DB) return reply(c, { Message: 'Durable storage is required to save preferences' }, 503);
    const item = await singleItem(L, id, false);
    if (!item) return notFound(c);
    if (typeof favorite === 'boolean') await L.setFavorite(id, favorite);
    if (hasRating) await L.setRating(id, likes as boolean | null);
    if (body.Played === undefined && body.played === undefined && body.PlaybackPositionTicks === undefined && body.playbackPositionTicks === undefined) {
      return reply(c, item.UserData ?? userData(id));
    }
  }
  return reply(c, await updateUserData(L, id, body));
};
const getUserDataHandler = async (c: C) => {
  const item = await singleItem(lib(c), itemGuid(c).id, false);
  return item ? reply(c, item.UserData ?? userData(itemGuid(c).id)) : notFound(c);
};
inner.get('/items/:id/userdata', getUserDataHandler);
inner.get('/useritems/:id/userdata', getUserDataHandler);
inner.get('/users/:uid/items/:id/userdata', getUserDataHandler);
inner.post('/items/:id/userdata', userDataHandler);
inner.post('/useritems/:id/userdata', userDataHandler);
inner.post('/users/:uid/items/:id/userdata', userDataHandler);

async function imageHandler(c: C): Promise<Response> {
  const jf = c.get('jf');
  const id = plainGuid(c.req.param('id'));
  const type = (c.req.param('type') ?? '').toLowerCase();
  const index = c.req.param('index') ?? jf.q('imageIndex') ?? '0';
  if (!decodeGuid(id) || !['primary','backdrop','logo','thumb','banner','art'].includes(type) || index !== '0') return c.body(null, 404);
  // Tags are opaque cache keys, never caller-supplied fetch destinations.
  const url = await imageUrlByTag(jf.ctx, jf.q('tag')) ?? await imageUrlFor(lib(c), id, type);
  return url ? imageResponse(jf, c.req.raw, url, type) : c.body(null, 404);
}
inner.get('/items/:id/images/:type', imageHandler);
inner.get('/items/:id/images/:type/:index', imageHandler);
inner.on('HEAD', '/items/:id/images/:type', imageHandler);
inner.on('HEAD', '/items/:id/images/:type/:index', imageHandler);
async function profileImage(c: C): Promise<Response> {
  const jf = c.get('jf');
  if (c.req.param('type')?.toLowerCase() !== 'primary' || (c.req.param('index') ?? jf.q('imageIndex') ?? '0') !== '0') return c.body(null, 404);
  const profile = (await profileUsers(jf.ctx)).find(p => p.who.userId === plainGuid(c.req.param('uid')));
  const url = profile?.ctx.profile?.avatar;
  return url ? imageResponse(jf, c.req.raw, url, 'primary') : c.body(null,404);
}
inner.get('/users/:uid/images/:type',profileImage);
inner.get('/users/:uid/images/:type/:index',profileImage);
inner.on('HEAD', '/users/:uid/images/:type',profileImage);
inner.on('HEAD', '/users/:uid/images/:type/:index',profileImage);

inner.notFound((c) => c.json({ Message: `Unsupported Jellyfin endpoint: ${c.req.method} ${c.get('jf')?.rawPath ?? ''}` }, 404));
inner.onError((err, c) => c.json({ Message: err instanceof Error ? err.message : 'Internal error' }, 500));

export function describeJellyfinId(raw: string): ReturnType<typeof decodeGuid> {
  return decodeGuid(raw);
}

export { encodeGuid as encodeJellyfinId };
