import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import type { Env, RillJob } from './env';
import { preparePresentation } from './jellyfin/presentation';
import type { Ctx } from './context';
import { decodeConfig } from './config/codec';
import { sha256 } from './util/bytes';
import { addonRouter } from './addon/index';
import { handleJellyfinRequest, isJellyfinPath } from './jellyfin/index';
import { uiRouter } from './ui/index';
import { ensureSchema } from './storage/migrate';

type App = { Bindings: Env; Variables: { ctx: Ctx } };

const app = new Hono<App>();

app.use(contextStorage());

app.use('*', async (c, next) => {
  if (c.env.DB) await ensureSchema(c.env.DB);
  await next();
  // Stremio and Jellyfin clients call from other origins with tokens, never cookies. The cookie-authenticated
  // settings API stays same-origin, so other sites can't read its responses with the owner's session.
  if (new URL(c.req.url).pathname.startsWith('/api/')) return;
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Headers', 'Authorization, *');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
});
app.options('*', (c) => c.body(null, 204));

async function buildCtx(c: { req: { url: string; raw: Request }; env: Env }, cfgToken: string, savedConfig = false): Promise<Ctx | null> {
  let cfg = await decodeConfig(cfgToken);
  if (!cfg) return null;
  const url = new URL(c.req.url);
  const scope = (await sha256(cfg.installationKey || cfgToken)).slice(0, cfg.installationKey ? 32 : 16);
  let accountConfigToken=cfgToken;
  if (c.env.DB && cfg.installationKey && !savedConfig) {
    const saved = await c.env.DB.prepare('SELECT config FROM accounts WHERE scope=?').bind(scope).first<{config:string}>();
    const active=saved ? await decodeConfig(saved.config):null;
    if (active) {cfg=active;accountConfigToken=saved!.config;}
  }
  return {
    cfg,
    env: c.env,
    cfgToken,
    accountConfigToken,
    origin: `${url.protocol}//${url.host}`,
    scope,
    cacheRevision:(await sha256(JSON.stringify(cfg))).slice(0,16),
    lang: (cfg.language || 'en-US').slice(0, 2).toLowerCase(),
    tmdbKey: cfg.keys.tmdb || c.env.TMDB_KEY || undefined,
  };
}

app.route('/', uiRouter);

app.use('*', async (c, next) => {
  if (!isJellyfinPath(new URL(c.req.url).pathname)) return next();
  if (!c.env.DB) return c.json({ Message: 'Save your server account before connecting.' }, 503);
  const owner = await c.env.DB.prepare('SELECT installation_key FROM owner WHERE id = 1').first<{ installation_key: string }>();
  if (!owner) return c.json({ Message: 'Set up your server account before connecting.' }, 503);
  const scope = (await sha256(owner.installation_key)).slice(0, 32);
  const saved = await c.env.DB.prepare('SELECT config FROM accounts WHERE scope=?').bind(scope).first<{ config: string }>();
  const ctx = saved ? await buildCtx(c, saved.config, true) : null;
  if (!ctx || ctx.scope !== scope) return c.json({ Message: 'Server configuration is unavailable.' }, 503);
  let exec: Parameters<typeof handleJellyfinRequest>[3];
  try { exec = c.executionCtx; } catch {}
  return handleJellyfinRequest(ctx, c.req.raw, c.env, exec);
});

app.use('/:cfg/*', async (c, next) => {
  const ctx = await buildCtx(c, c.req.param('cfg'));
  if (!ctx) return c.json({ error: 'bad config' }, 400);
  try {
    const exec = c.executionCtx;
    ctx.defer = work => exec.waitUntil(work.catch(() => console.warn('Background work failed')));
  } catch {}
  c.set('ctx', ctx);
  await next();
});
app.route('/:cfg', addonRouter);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal', message: String(err?.message || err) }, 500);
});

import { hasScheduledWork, scheduled } from './storage/scheduled';
export default {
  fetch: app.fetch,
  async scheduled(event:ScheduledController,env:Env):Promise<void> {
    if(env.RILL_JOBS) {
      // Keep idle maintenance from consuming the free daily Queue allowance.
      if(Math.floor(event.scheduledTime/60_000)%30===0 || await hasScheduledWork(env,event.scheduledTime)) {
        await env.RILL_JOBS.send({kind:'maintenance',scheduledTime:event.scheduledTime});
      }
    }
    else await scheduled(event,env);
  },
  async queue(batch:MessageBatch<RillJob>,env:Env):Promise<void> {
    for(const message of batch.messages) {
      if(message.body.kind==='maintenance')await scheduled({scheduledTime:message.body.scheduledTime,cron:'* * * * *',noRetry(){}} as ScheduledController,env);
      else if(message.body.kind==='presentation')await preparePresentation(message.body,env);
      message.ack();
    }
  },
};
