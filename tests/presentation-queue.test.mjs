import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { decodeConfig, encodeConfig } from '../src/config/codec.ts';
import { normalizeConfig } from '../src/config/schema.ts';
import { encodeGuid } from '../src/jellyfin/ids.ts';
import { Library } from '../src/jellyfin/library.ts';
import * as presentation from '../src/jellyfin/presentation.ts';
import { getManifest } from '../src/stremio/client.ts';
import { sha256 } from '../src/util/bytes.ts';
import { cacheGet, cachePut } from '../src/util/cache.ts';

async function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0015_presentations.sql', import.meta.url), 'utf8'));
  sql.exec('CREATE TABLE accounts(scope TEXT PRIMARY KEY, config TEXT, origin TEXT)');
  t.after(() => sql.close());
  const DB = {
    prepare(query) {
      const statement = sql.prepare(query);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async all() { return { results: statement.all(...args) }; },
        async first() { return statement.get(...args) ?? null; },
        async run() { statement.run(...args); return { success: true }; },
      };
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
  };
  const jobs = [], pending = [];
  const cfg = await decodeConfig(await encodeConfig(normalizeConfig({ addons: { meta: ['https://metadata.example/manifest.json'] } })));
  const cfgToken = await encodeConfig(cfg);
  const ctx = {
    cfg, cfgToken, scope: 'test', origin: 'https://rill.example', lang: 'en',
    cacheRevision: (await sha256(JSON.stringify(cfg))).slice(0, 16),
    env: { DB, RILL_JOBS: { sendBatch: async messages => jobs.push(...messages.map(m => m.body)) } },
    defer: promise => pending.push(promise),
  };
  sql.prepare('INSERT INTO accounts VALUES(?,?,?)').run(ctx.scope, cfgToken, ctx.origin);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network request'); });
  const metadata = t.mock.method(Library.prototype, 'meta', async g => ({
    id: `tt${g.num}`, type: g.kind, name: 'Test title', description: 'Full overview',
    cast: Array.from({ length: 60 }, (_, i) => `Actor ${i}`),
  }));
  return {
    ctx, sql, jobs, metadata,
    async request(items) { await presentation.presentTitles(ctx, items); await Promise.all(pending.splice(0)); },
    async save(cfg) { sql.prepare('UPDATE accounts SET config=?').run(await encodeConfig(cfg)); },
  };
}

function titles(count) {
  return Array.from({ length: count }, (_, i) => ({
    Id: encodeGuid({ kind: 'movie', source: 'imdb', num: 2000000 + i, anime: false }), Type: 'Movie', Overview: null,
  }));
}

test('17 titles use three Queue messages and seven-day entries prevent repeat jobs', async t => {
  const f = await fixture(t), items = titles(17);
  const before = Date.now();
  await f.request(items);
  assert.deepEqual(f.jobs.map(job => job.ids.length), [8, 8, 1]);
  await f.request(items);
  assert.equal(f.jobs.length, 3);
  for (const job of f.jobs.splice(0)) await presentation.preparePresentation(job, f.ctx.env);
  const rows = f.sql.prepare('SELECT value,expires FROM presentations').all();
  assert.equal(rows.length, 17);
  for (const row of rows) {
    assert.ok(row.expires >= before + 7 * 86400_000);
    assert.ok(row.expires <= Date.now() + 7 * 86400_000);
    assert.ok(JSON.parse(row.value).People.length > 0 && JSON.parse(row.value).People.length <= 40);
  }
  const again = titles(17);
  await f.request(again);
  assert.equal(f.jobs.length, 0);
  assert.equal(again[0].Overview, 'Full overview');
});

test('metadata revisions ignore playback and tracker settings, but track metadata settings', async () => {
  const base = normalizeConfig({});
  const unrelated = normalizeConfig({ ...base, revision: 42, trackers: { primary: 'trakt' }, jellyfin: { ...base.jellyfin, maxSources: 1, home: ['latest'] } });
  assert.equal(await presentation.presentationRevision(base), await presentation.presentationRevision(unrelated));
  for (const changed of [
    { ...base, language: 'fr-FR' },
    { ...base, providers: { ...base.providers, movie: 'tmdb' } },
    { ...base, addons: { ...base.addons, meta: ['https://other.example/manifest.json'] } },
    { ...base, artwork: { ...base.artwork, posters: ['tmdb'] } },
    { ...base, search: { ...base.search, includeAdult: true } },
  ]) assert.notEqual(await presentation.presentationRevision(base), await presentation.presentationRevision(changed));
});

test('stale metadata settings and deleted profiles do not publish queued data', async t => {
  const f = await fixture(t);
  await f.request(titles(1));
  await f.save({ ...f.ctx.cfg, language: 'fr-FR' });
  await presentation.preparePresentation(f.jobs[0], f.ctx.env);
  assert.equal(f.metadata.mock.calls.length, 0);
  await f.save(f.ctx.cfg);
  await presentation.preparePresentation({ ...f.jobs[0], profileId: 'deleted' }, f.ctx.env);
  assert.equal(f.metadata.mock.calls.length, 0);
});

test('a partial batch stores good titles and retries a failed title after its lease', async t => {
  const f = await fixture(t), items = titles(3);
  f.metadata.mock.mockImplementation(async g => g.num === 2000001 ? null : { name: 'Test title', description: 'Recovered overview' });
  await f.request(items);
  await presentation.preparePresentation(f.jobs.shift(), f.ctx.env);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM presentations WHERE value!='null'").get().n, 2);
  f.sql.prepare("UPDATE presentations SET expires=0 WHERE value='null'").run();
  await f.request(titles(3));
  assert.deepEqual(f.jobs[0].ids, [items[1].Id]);
  f.metadata.mock.mockImplementation(async () => ({ name: 'Test title', description: 'Recovered overview' }));
  await presentation.preparePresentation(f.jobs[0], f.ctx.env);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM presentations WHERE value!='null'").get().n, 3);
});

test('a wholly failed batch remains retryable', async t => {
  const f = await fixture(t);
  f.metadata.mock.mockImplementation(async () => null);
  await f.request(titles(2));
  await assert.rejects(presentation.preparePresentation(f.jobs[0], f.ctx.env), /metadata is temporarily unavailable/);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM presentations WHERE value='null'").get().n, 2);
});

test('Queue delivery failure releases claimed entries', async t => {
  const f = await fixture(t);
  f.ctx.env.RILL_JOBS.sendBatch = async () => { throw new Error('Queue unavailable'); };
  await assert.rejects(f.request(titles(2)), /Queue unavailable/);
  assert.equal(f.sql.prepare('SELECT count(*) AS n FROM presentations').get().n, 0);
});

test('messages queued before batching still prepare a single title', async t => {
  const f = await fixture(t), item = titles(1)[0];
  await presentation.preparePresentation({ kind: 'presentation', scope: f.ctx.scope, revision: f.ctx.cacheRevision, id: item.Id }, f.ctx.env);
  assert.equal(f.sql.prepare("SELECT count(*) AS n FROM presentations WHERE value!='null'").get().n, 1);
  await f.request([item]);
  assert.equal(item.Overview, 'Full overview');
  assert.equal(f.jobs.length, 0);
});

test('Queue jobs can reuse manifests without an edge cache, while stream results stay out of the hot cache', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ name: 'Test add-on', resources: ['meta'] }));
  const url = 'https://manifest-cache.example/manifest.json';
  assert.equal((await getManifest(url)).name, 'Test add-on');
  assert.equal((await getManifest(url)).name, 'Test add-on');
  assert.equal(fetch.mock.calls.length, 1);
  await cachePut('streams:test:movie:test', [{ url: 'https://video.example/movie.mkv' }], 120);
  assert.equal(await cacheGet('streams:test:movie:test'), null);
});
