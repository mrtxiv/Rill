import { Hono } from 'hono';
import type { Ctx } from '../context';
import type { Env } from '../env';
import { collectionOf, normalizeConfig, type RillConfig } from '../config/schema';
import { DECADES, FRANCHISES, NETWORKS, STUDIOS, dedupe } from '../jellyfin/curated';
import { decodeConfig, encodeConfig } from '../config/codec';
import { getManifest } from '../stremio/client';
import { sha256 } from '../util/bytes';
import { listCatalogDefinitions, defaultCatalogEnabled, catalogSource } from '../addon/catalogs';
import { renderPage, renderLogo } from './page';
import { BRAND_ICON, BRAND_WORDMARK } from '../brand';
import { queueRecommendations,recommendationJob } from '../storage/recommendation-jobs';
import { syncMovieLens,movieLensSyncStatus,importRatingsCsv } from '../addon/movielens-sync';
import { aiCatalog } from '../addon/ai';
import { tmdbGet } from '../meta/tmdb';
import { helperAllowed, mountAccountRoutes } from './account';

export const uiRouter = new Hono<{ Variables: { ctx?: Ctx }; Bindings: Env }>();

const TRAKT_API = 'https://api.trakt.tv';
const SIMKL_API = 'https://api.simkl.com';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
const UPSTREAM_TIMEOUT_MS = 15000;

type Json = Record<string, unknown>;

async function readBody(req: Request): Promise<Json> {
  try {
    const data: unknown = await req.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Json) : {};
  } catch {
    return {};
  }
}

function field(body: Json, key: string): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

async function upstream(url: string, init: RequestInit = {}): Promise<{ status: number; data: Json | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    let data: Json | null = null;
    try {
      const parsed: unknown = await res.json();
      data = parsed && typeof parsed === 'object' ? (parsed as Json) : null;
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function expiryFrom(expiresIn: unknown): number | undefined {
  const secs = num(expiresIn);
  return secs === undefined ? undefined : Date.now() + secs * 1000;
}

async function tokenFromInput(input: string): Promise<{ token: string; config: RillConfig } | null> {
  const raw = input.trim();
  if (!raw) return null;
  const candidates: string[] = [];
  const asUrl = raw.replace(/^stremio:\/\//i, 'https://');
  if (/^https?:\/\//i.test(asUrl)) {
    try {
      const u = new URL(asUrl);
      for (const seg of u.pathname.split('/')) {
        if (seg) candidates.push(decodeURIComponent(seg));
      }
    } catch {
    }
  }
  candidates.push(raw);
  candidates.sort((a, b) => b.length - a.length);
  for (const token of candidates) {
    if (token.length < 8) continue;
    const config = await decodeConfig(token);
    if (config) return { token, config };
  }
  return null;
}

async function buildCtx(cfg: RillConfig, env: Env | undefined, origin: string): Promise<Ctx> {
  const cfgToken = await encodeConfig(cfg);
  const scope = (await sha256(cfg.installationKey||cfgToken)).slice(0,cfg.installationKey?32:16);
  return {
    cfg,
    env: env ?? {},
    cfgToken,
    origin,
    scope,
    cacheRevision:(await sha256(JSON.stringify(cfg))).slice(0,16),
    lang: (cfg.language || 'en').slice(0, 2).toLowerCase(),
    tmdbKey: cfg.keys.tmdb || env?.TMDB_KEY,
  };
}

uiRouter.get('/', (c) => {
  return c.html(renderPage(), 200, { 'Cache-Control': 'no-store' });
});

uiRouter.get('/logo.svg', (c) => {
  return c.body(renderLogo(), 200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
});

uiRouter.get('/wordmark.svg', (c) => c.body(BRAND_WORDMARK, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }));
uiRouter.get('/favicon.svg', (c) => c.body(BRAND_ICON, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }));

uiRouter.use('/api/*', async (c, next) => {
  // Only the settings page calls these: same-origin JSON blocks cross-site requests.
  if (c.req.header('origin') !== new URL(c.req.url).origin) return c.json({ error: 'Same-origin requests only.' }, 403);
  if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) return c.json({ error: 'JSON required.' }, 415);
  if (!c.req.path.startsWith('/api/account/') && !(await helperAllowed(c.env, c.req.raw, buildCtx))) return c.json({ error: 'Sign in first.' }, 401);
  await next();
  c.header('Cache-Control', 'no-store');
});

mountAccountRoutes(uiRouter, buildCtx);

uiRouter.post('/api/config/encode', async (c) => {
  const body = await readBody(c.req.raw);
  const cfg = normalizeConfig(body);
  const token = await encodeConfig(cfg);
  return c.json({ token });
});

uiRouter.post('/api/config/decode', async (c) => {
  const body = await readBody(c.req.raw);
  const found = await tokenFromInput(field(body, 'input'));
  if (!found) return c.json({ error: 'Not a valid config token or install URL.' }, 400);
  return c.json({ config: found.config, token: found.token });
});

uiRouter.post('/api/catalogs', async (c) => {
  const body = await readBody(c.req.raw);
  const cfg = normalizeConfig(body);
  const origin = new URL(c.req.url).origin;
  try {
    const ctx = await buildCtx(cfg, c.env, origin);
    const catalogs = await listCatalogDefinitions(ctx);
    return c.json({ catalogs: catalogs.map(d => ({ ...d, defaultEnabled: defaultCatalogEnabled(d), source: catalogSource(d) })) });
  } catch {
    return c.json({ error: 'Catalog list is unavailable right now.', catalogs: [] }, 502);
  }
});

uiRouter.post('/api/recommendations/generate',async c=>{
  const body=await readBody(c.req.raw),cfg=normalizeConfig(body.config??body);
  if(!cfg.recommendations?.enabled||!cfg.recommendations.apiKey||!cfg.recommendations.model)return c.json({error:'Enable recommendations and enter the model and API key first.'},400);
  if(!c.env.DB)return c.json({error:'Connect durable storage before generating recommendations.'},503);
  const ctx=await buildCtx(cfg,c.env,new URL(c.req.url).origin);
  if(!ctx.tmdbKey)return c.json({error:'Add a TMDB key to resolve recommended titles.'},400);
  try {
    return c.json({job:await queueRecommendations(ctx,body.rebuild===true)},202);
  } catch {return c.json({error:'Recommendations could not be prepared. Check your history, model name and provider key, then try again.'},502);}
});

uiRouter.post('/api/recommendations/status',async c=>{
  const body=await readBody(c.req.raw),cfg=normalizeConfig(body.config??body);
  const ctx=await buildCtx(cfg,c.env,new URL(c.req.url).origin);
  if(!ctx.env.DB)return c.json({error:'Connect durable storage first.'},503);
  return c.json({job:await recommendationJob(ctx,field(body,'id')||undefined)});
});

uiRouter.post('/api/movielens/:action',async c=>{
  const body=await readBody(c.req.raw),cfg=normalizeConfig(body.config??body);
  const ctx=await buildCtx(cfg,c.env,new URL(c.req.url).origin);
  if(!cfg.movieLens?.username||!cfg.movieLens.password)return c.json({error:'Connect MovieLens first.'},400);
  try {
    if(c.req.param('action')==='status')return c.json({status:await movieLensSyncStatus(ctx)});
    if(c.req.param('action')==='sync')return c.json({status:await syncMovieLens(ctx,true)});
    if(c.req.param('action')==='import')return c.json({status:await importRatingsCsv(ctx,field(body,'csv'))});
    return c.json({error:'Unknown MovieLens action.'},404);
  }catch(error){return c.json({error:error instanceof Error?error.message:'MovieLens import failed.'},502);}
});

uiRouter.post('/api/catalogs/generate',async c=>{
  const body=await readBody(c.req.raw),cfg=normalizeConfig(body.config);
  try{return c.json({catalog:await aiCatalog(await buildCtx(cfg,c.env,new URL(c.req.url).origin),field(body,'query'),field(body,'provider'),field(body,'type'))});}
  catch(error){return c.json({error:error instanceof Error?error.message:'The catalog could not be generated.'},400);}
});

uiRouter.post('/api/people/search', async (c) => {
  const body = await readBody(c.req.raw);
  const cfg = normalizeConfig(body.config);
  const query = field(body, 'query').trim();
  if (!query) return c.json({ people: [] });
  try {
    const ctx = await buildCtx(cfg, c.env, new URL(c.req.url).origin);
    if (!ctx.tmdbKey) return c.json({ error: 'People search needs a TMDB key.', people: [] }, 400);
    const data = await tmdbGet<{ results?: Array<{ id: number; name: string; profile_path?: string; known_for_department?: string }> }>(ctx, '/search/person', { query, language: cfg.language, include_adult: cfg.search.includeAdult }, 3600);
    return c.json({ people: (data?.results ?? []).slice(0, 10).map((p) => ({ id: p.id, name: p.name, department: p.known_for_department ?? '', photo: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : '' })) });
  } catch {
    return c.json({ error: 'People search is unavailable right now.', people: [] }, 502);
  }
});

uiRouter.post('/api/collections/options', (c) => c.json({ studios: dedupe(STUDIOS), networks: dedupe(NETWORKS), franchises: dedupe(FRANCHISES), decades: DECADES.map((d) => d.name) }));

uiRouter.post('/api/collections/import', async (c) => {
  const body = await readBody(c.req.raw);
  let raw: unknown = body.data;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (/^https?:\/\//i.test(text)) {
      try {
        const res = await fetch(text, { headers: { accept: 'application/json' } });
        raw = res.ok ? await res.json() : null;
      } catch {
        raw = null;
      }
    } else {
      try { raw = JSON.parse(text); } catch { raw = null; }
    }
  }
  const unwrap = (v: unknown): unknown[] => {
    if (!v || typeof v !== 'object') return [];
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.collections)) return o.collections;
    if (o.collection) return [o.collection];
    if (Array.isArray(v)) return v;
    return [v];
  };
  const collections = unwrap(raw).map((x) => collectionOf(x as never)).filter((x): x is NonNullable<typeof x> => !!x);
  if (!collections.length) return c.json({ error: 'Nothing importable was found. Paste a collection export or a link to one.' }, 400);
  return c.json({ collections });
});

uiRouter.post('/api/franchises/search', async (c) => {
  const body = await readBody(c.req.raw);
  const cfg = normalizeConfig(body.config);
  const query = field(body, 'query').trim();
  if (!query) return c.json({ franchises: [] });
  try {
    const ctx = await buildCtx(cfg, c.env, new URL(c.req.url).origin);
    if (!ctx.tmdbKey) return c.json({ error: 'Franchise search needs a TMDB key.', franchises: [] }, 400);
    const data = await tmdbGet<{ results?: Array<{ id: number; name: string; poster_path?: string }> }>(ctx, '/search/collection', { query, language: cfg.language }, 3600);
    return c.json({ franchises: (data?.results ?? []).slice(0, 10).map((p) => ({ id: p.id, name: p.name })) });
  } catch {
    return c.json({ error: 'Franchise search is unavailable right now.', franchises: [] }, 502);
  }
});

uiRouter.post('/api/probe', async (c) => {
  const body = await readBody(c.req.raw);
  const url = field(body, 'url');
  if (!url) return c.json({ error: 'Missing url.' }, 400);
  const manifest = await getManifest(url);
  if (!manifest) return c.json({ error: 'No manifest found at that address.' }, 502);
  const resources = (manifest.resources || []).map((r) => (typeof r === 'string' ? r : r.name));
  return c.json({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    resources: [...new Set(resources)],
    types: manifest.types || [],
    catalogs: (manifest.catalogs || []).length,
    idPrefixes: manifest.idPrefixes || [],
  });
});

function traktHeaders(clientId: string, bearer?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': clientId,
  };
  if (bearer) h.Authorization = `Bearer ${bearer}`;
  return h;
}

uiRouter.post('/api/oauth/trakt/device', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  if (!clientId) return c.json({ error: 'Missing clientId.' }, 400);
  const r = await upstream(`${TRAKT_API}/oauth/device/code`, {
    method: 'POST',
    headers: traktHeaders(clientId),
    body: JSON.stringify({ client_id: clientId }),
  });
  if (r.status !== 200 || !r.data) return c.json({ error: `Trakt refused the request (${r.status || 'network'}).` }, 502);
  return c.json({
    deviceCode: r.data.device_code,
    userCode: r.data.user_code,
    verificationUrl: r.data.verification_url,
    expiresIn: num(r.data.expires_in) ?? 600,
    interval: num(r.data.interval) ?? 5,
  });
});

uiRouter.post('/api/oauth/trakt/token', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  const clientSecret = field(body, 'clientSecret');
  const deviceCode = field(body, 'deviceCode');
  if (!clientId || !clientSecret || !deviceCode) return c.json({ error: 'Missing clientId, clientSecret or deviceCode.' }, 400);
  const r = await upstream(`${TRAKT_API}/oauth/device/token`, {
    method: 'POST',
    headers: traktHeaders(clientId),
    body: JSON.stringify({ code: deviceCode, client_id: clientId, client_secret: clientSecret }),
  });
  if (r.status === 400) return c.json({ pending: true });
  if (r.status === 429) return c.json({ pending: true, slowDown: true });
  if (r.status === 404) return c.json({ error: 'Trakt does not know this device code.' }, 400);
  if (r.status === 409) return c.json({ error: 'This code was already used.' }, 400);
  if (r.status === 410) return c.json({ error: 'The code expired. Start again.' }, 400);
  if (r.status === 418) return c.json({ error: 'You denied the request on Trakt.' }, 400);
  if (r.status !== 200 || !r.data || typeof r.data.access_token !== 'string') {
    return c.json({ error: `Trakt answered ${r.status || 'nothing'}.` }, 502);
  }
  const accessToken = r.data.access_token;
  let username: string | undefined;
  const me = await upstream(`${TRAKT_API}/users/settings`, { headers: traktHeaders(clientId, accessToken) });
  const user = me.data?.user;
  if (user && typeof user === 'object' && typeof (user as Json).username === 'string') username = (user as Json).username as string;
  return c.json({
    accessToken,
    refreshToken: typeof r.data.refresh_token === 'string' ? r.data.refresh_token : undefined,
    expiresAt: expiryFrom(r.data.expires_in),
    username,
  });
});

uiRouter.post('/api/oauth/trakt/refresh', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  const clientSecret = field(body, 'clientSecret');
  const refreshToken = field(body, 'refreshToken');
  if (!clientId || !clientSecret || !refreshToken) return c.json({ error: 'Missing clientId, clientSecret or refreshToken.' }, 400);
  const r = await upstream(`${TRAKT_API}/oauth/token`, {
    method: 'POST',
    headers: traktHeaders(clientId),
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'refresh_token',
    }),
  });
  if (r.status !== 200 || !r.data || typeof r.data.access_token !== 'string') {
    return c.json({ error: `Trakt refused the refresh (${r.status || 'network'}).` }, 502);
  }
  return c.json({
    accessToken: r.data.access_token,
    refreshToken: typeof r.data.refresh_token === 'string' ? r.data.refresh_token : refreshToken,
    expiresAt: expiryFrom(r.data.expires_in),
  });
});

uiRouter.post('/api/oauth/simkl/pin', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  if (!clientId) return c.json({ error: 'Missing clientId.' }, 400);
  const q = new URLSearchParams({ client_id: clientId });
  const redirect = field(body, 'redirect');
  if (redirect) q.set('redirect', redirect);
  const r = await upstream(`${SIMKL_API}/oauth/pin?${q}`, { headers: { 'simkl-api-key': clientId } });
  if (r.status !== 200 || !r.data || r.data.result !== 'OK' || !r.data.user_code) {
    return c.json({ error: `Simkl did not hand out a PIN (${r.status || 'network'}).` }, 502);
  }
  return c.json({
    userCode: String(r.data.user_code),
    verificationUrl: typeof r.data.verification_url === 'string' ? r.data.verification_url : 'https://simkl.com/pin',
    expiresIn: num(r.data.expires_in) ?? 900,
    interval: num(r.data.interval) ?? 5,
  });
});

uiRouter.post('/api/oauth/simkl/poll', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  const userCode = field(body, 'userCode');
  if (!clientId || !userCode) return c.json({ error: 'Missing clientId or userCode.' }, 400);
  const q = new URLSearchParams({ client_id: clientId });
  const r = await upstream(`${SIMKL_API}/oauth/pin/${encodeURIComponent(userCode)}?${q}`, { headers: { 'simkl-api-key': clientId } });
  if (r.status === 200 && r.data?.result === 'OK' && typeof r.data.access_token === 'string') {
    return c.json({ accessToken: r.data.access_token });
  }
  const message = typeof r.data?.message === 'string' ? r.data.message.toLowerCase() : '';
  if (message.includes('slow')) return c.json({ pending: true, slowDown: true });
  if (r.status === 200 && r.data?.result === 'OK' && r.data.device_code) {
    return c.json({ error: 'The PIN expired. Start again.' }, 400);
  }
  if (r.status === 0) return c.json({ pending: true });
  if (r.status >= 500) return c.json({ pending: true });
  if (r.status !== 200 && r.status !== 400) return c.json({ error: `Simkl answered ${r.status}.` }, 502);
  return c.json({ pending: true });
});

uiRouter.post('/api/oauth/mal/token', async (c) => {
  const body = await readBody(c.req.raw);
  const clientId = field(body, 'clientId');
  const code = field(body, 'code');
  const verifier = field(body, 'verifier');
  if (!clientId || !code || !verifier) return c.json({ error: 'Missing clientId, code or verifier.' }, 400);
  const form = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
  });
  const clientSecret = field(body, 'clientSecret');
  if (clientSecret) form.set('client_secret', clientSecret);
  const redirectUri = field(body, 'redirectUri');
  if (redirectUri) form.set('redirect_uri', redirectUri);
  const r = await upstream(MAL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (r.status !== 200 || !r.data || typeof r.data.access_token !== 'string') {
    const why = typeof r.data?.error === 'string' ? r.data.error : String(r.status || 'network');
    return c.json({ error: `MyAnimeList refused the code (${why}).` }, 502);
  }
  return c.json({
    accessToken: r.data.access_token,
    refreshToken: typeof r.data.refresh_token === 'string' ? r.data.refresh_token : undefined,
    expiresAt: expiryFrom(r.data.expires_in),
  });
});
