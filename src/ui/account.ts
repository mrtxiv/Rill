import type { Hono } from 'hono';
import type { Ctx } from '../context';
import type { Env } from '../env';
import { normalizeConfig, type RillConfig } from '../config/schema';
import { decodeConfig, encodeConfig } from '../config/codec';
import { registerAccount } from '../storage/state';
import { signingSecret } from '../jellyfin/auth';
import { b64urlDecode, b64urlEncode, hmac, sha256, timingSafeEqual } from '../util/bytes';
import { mountUpdateRoutes } from './updates';

const COOKIE = 'rill_owner';
const SESSION_DAYS = 30;
const MIN_PASSWORD = 8;

interface OwnerRow { installation_key: string; username: string; password_hash: string; salt: string }
type Json = Record<string, unknown>;
type BuildCtx = (cfg: RillConfig, env: Env, origin: string) => Promise<Ctx>;

async function pbkdf2(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return b64urlEncode(new Uint8Array(bits));
}

async function readOwner(env: Env): Promise<OwnerRow | null> {
  if (!env.DB) return null;
  return env.DB.prepare('SELECT installation_key, username, password_hash, salt FROM owner WHERE id = 1').first<OwnerRow>();
}

// INSERT OR IGNORE: of two first saves racing to claim a new install, only one becomes the owner.
async function claimOwner(env: Env, installationKey: string, username: string, password: string): Promise<boolean> {
  const salt = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const result = await env.DB!.prepare('INSERT OR IGNORE INTO owner(id, installation_key, username, password_hash, salt, created) VALUES(1, ?, ?, ?, ?, ?)')
    .bind(installationKey, username, await pbkdf2(password, salt), salt, Date.now()).run();
  return result.meta.changes === 1;
}

async function writeOwner(env: Env, installationKey: string, username: string, password: string): Promise<void> {
  const salt = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2(password, salt);
  await env.DB!.prepare(`INSERT INTO owner(id, installation_key, username, password_hash, salt, created) VALUES(1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET installation_key = excluded.installation_key, username = excluded.username, password_hash = excluded.password_hash, salt = excluded.salt`)
    .bind(installationKey, username, hash, salt, Date.now()).run();
}

function cookieValue(req: Request): string {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return '';
}

async function sessionKey(ctx: Ctx): Promise<string> {
  return sha256(`rill:owner-session:${await signingSecret(ctx)}`);
}

async function mintSession(ctx: Ctx): Promise<string> {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 86400_000, n: crypto.randomUUID() })));
  return `${payload}.${await hmac(await sessionKey(ctx), payload)}`;
}

async function validSession(ctx: Ctx, req: Request): Promise<boolean> {
  const value = cookieValue(req);
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const payload = value.slice(0, dot), sig = value.slice(dot + 1);
  if (!timingSafeEqual(await hmac(await sessionKey(ctx), payload), sig)) return false;
  try {
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as { exp?: number };
    return typeof claims.exp === 'number' && claims.exp > Date.now();
  } catch { return false; }
}

function setCookie(origin: string, value: string, maxAge: number): string {
  const secure = origin.startsWith('https://') ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

async function ownerConfig(env: Env, owner: OwnerRow): Promise<RillConfig | null> {
  const scope = (await sha256(owner.installation_key)).slice(0, 32);
  const row = await env.DB!.prepare('SELECT config FROM accounts WHERE scope = ?').bind(scope).first<{ config: string }>();
  return row ? decodeConfig(row.config) : null;
}

async function readBody(req: Request): Promise<Json> {
  try { const d: unknown = await req.json(); return d && typeof d === 'object' && !Array.isArray(d) ? d as Json : {}; } catch { return {}; }
}

export function mountAccountRoutes(router: Hono<{ Variables: { ctx?: Ctx }; Bindings: Env }>, buildCtx: BuildCtx): void {
  const baseCtx = (env: Env, origin: string) => buildCtx(normalizeConfig({}), env, origin);

  mountUpdateRoutes(router, async (c) => Boolean(c.env.DB && await readOwner(c.env) &&
    await validSession(await baseCtx(c.env, new URL(c.req.url).origin), c.req.raw)));

  router.post('/api/account/status', async (c) => {
    const origin = new URL(c.req.url).origin;
    if (!c.env.DB) return c.json({ durable: false, exists: false, signedIn: false });
    const owner = await readOwner(c.env);
    const signedIn = owner ? await validSession(await baseCtx(c.env, origin), c.req.raw) : false;
    return c.json({ durable: true, exists: Boolean(owner), signedIn, username: signedIn ? owner!.username : undefined, setupToken: !owner && Boolean(c.env.RILL_SETUP_TOKEN) });
  });

  router.post('/api/account/login', async (c) => {
    const origin = new URL(c.req.url).origin;
    const owner = c.env.DB ? await readOwner(c.env) : null;
    if (!owner) return c.json({ error: 'No account exists yet.' }, 404);
    const body = await readBody(c.req.raw);
    const username = String(body.username ?? '').trim().toLowerCase(), password = String(body.password ?? '');
    const ok = username === owner.username.toLowerCase() && timingSafeEqual(await pbkdf2(password, owner.salt), owner.password_hash);
    if (!ok) return c.json({ error: 'Wrong username or password.' }, 401);
    const ctx = await baseCtx(c.env, origin);
    c.header('Set-Cookie', setCookie(origin, await mintSession(ctx), SESSION_DAYS * 86400));
    return c.json({ config: await ownerConfig(c.env, owner), username: owner.username });
  });

  router.post('/api/account/load', async (c) => {
    const origin = new URL(c.req.url).origin;
    const owner = c.env.DB ? await readOwner(c.env) : null;
    if (!owner || !(await validSession(await baseCtx(c.env, origin), c.req.raw))) return c.json({ error: 'Sign in first.' }, 401);
    return c.json({ config: await ownerConfig(c.env, owner), username: owner.username });
  });

  router.post('/api/account/save', async (c) => {
    const origin = new URL(c.req.url).origin;
    if (!c.env.DB) return c.json({ error: 'Durable storage is not configured.' }, 503);
    const body = await readBody(c.req.raw);
    const cfg = normalizeConfig(body.config);
    const username = cfg.jellyfin.username.trim(), password = cfg.jellyfin.password;
    if (!username) return c.json({ error: 'Set a Jellyfin username first.' }, 400);
    if (password.length < MIN_PASSWORD) return c.json({ error: `Set a Jellyfin password of at least ${MIN_PASSWORD} characters first.` }, 400);
    const owner = await readOwner(c.env);
    let fresh = false;
    if (owner) {
      if (!(await validSession(await baseCtx(c.env, origin), c.req.raw))) return c.json({ error: 'Sign in first.' }, 401);
      cfg.installationKey = owner.installation_key;
    } else {
      fresh = true;
      // With RILL_SETUP_TOKEN set, only someone who knows it can claim a new install. Digests keep the compare length-independent.
      if (c.env.RILL_SETUP_TOKEN && !timingSafeEqual(await sha256(String(body.setupToken ?? '').trim()), await sha256(c.env.RILL_SETUP_TOKEN.trim()))) return c.json({ error: 'Enter the setup token.' }, 403);
      if (!cfg.installationKey) cfg.installationKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      if (!(await claimOwner(c.env, cfg.installationKey, username, password))) return c.json({ error: 'An account already exists. Sign in.' }, 409);
    }
    cfg.revision = Math.max(Date.now(), (cfg.revision ?? 0) + 1);
    const token = await encodeConfig(cfg);
    const ctx = await buildCtx(cfg, c.env, origin);
    try {
      await registerAccount({ ...ctx, cfgToken: token, accountConfigToken: token }, true);
    } catch (error) {
      // Release a fresh claim whose config didn't save, so the next attempt can claim again.
      if (fresh) await c.env.DB.prepare('DELETE FROM owner WHERE id = 1 AND installation_key = ?').bind(cfg.installationKey).run();
      throw error;
    }
    if (!fresh && (owner!.username !== username || !timingSafeEqual(await pbkdf2(password, owner!.salt), owner!.password_hash))) {
      await writeOwner(c.env, cfg.installationKey, username, password);
    }
    if (fresh) c.header('Set-Cookie', setCookie(origin, await mintSession(ctx), SESSION_DAYS * 86400));
    return c.json({ config: cfg, token, username });
  });

  router.post('/api/account/logout', async (c) => {
    c.header('Set-Cookie', setCookie(new URL(c.req.url).origin, '', 0));
    return c.json({ ok: true });
  });
}
