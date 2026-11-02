import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeConfig } from '../src/config/schema.ts';
import { identityOf, mintToken } from '../src/jellyfin/auth.ts';
import { encodeGuid } from '../src/jellyfin/ids.ts';
import { handleJellyfinRequest, isJellyfinPath } from '../src/jellyfin/index.ts';
import { Library } from '../src/jellyfin/library.ts';

const origin = 'https://rill.example';
const directUrl = 'https://video.example/movie.mkv';
const guid = { kind: 'movie', source: 'imdb', num: 1234567, anime: false };
const itemId = encodeGuid(guid);

async function server(t) {
  const cfg = normalizeConfig({ addons: { stream: ['https://addon.example/manifest.json'] } });
  const ctx = { cfg, cfgToken: 'test-config', env: {}, scope: t.name, origin, lang: 'en' };
  const who = await identityOf(ctx);
  const token = await mintToken(ctx, who.userId, 'test-device');
  t.mock.method(Library.prototype, 'meta', async () => ({ id: 'tt1234567', type: 'movie', name: 'Test film', runtime: '90 min' }));
  t.mock.method(globalThis, 'fetch', async input => {
    const url = String(input);
    if (url === 'https://addon.example/manifest.json') return Response.json({ name: 'Test add-on', resources: ['stream'], types: ['movie'] });
    assert.match(url, /^https:\/\/addon\.example\/stream\/movie\/tt1234567\.json$/);
    return Response.json({ streams: [{ url: directUrl }] });
  });
  return {
    ctx, token,
    call(path, { signedIn = true, ...init } = {}) {
      const headers = new Headers(init.headers);
      if (signedIn) headers.set('x-emby-token', token);
      return handleJellyfinRequest(ctx, new Request(new URL(path, origin), { ...init, headers }), ctx.env);
    },
  };
}

test('an item placeholder is an absolute authenticated URL that resolves on play', async t => {
  const s = await server(t);
  const res = await s.call(`/Items/${itemId}`);
  assert.equal(res.status, 200);
  const item = await res.json();
  const source = item.MediaSources[0];
  assert.equal(source.Type, 'Default');
  const path = new URL(source.Path);
  assert.equal(path.origin, origin);
  assert.equal(path.pathname, `/Videos/${itemId}/stream`);
  assert.equal(path.searchParams.get('api_key'), s.token);
  const play = await s.call(source.Path, { signedIn: false });
  assert.equal(play.status, 302);
  assert.equal(play.headers.get('location'), directUrl);
});

test('item list containers and Jellyfin prefixes also get streamable placeholders', async t => {
  const s = await server(t);
  const res = await s.call(`/Jellyfin/Items?Ids=${itemId}`);
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.equal(list.Items.length, 1);
  const source = list.Items[0].MediaSources[0];
  assert.equal(source.Type, 'Default');
  assert.equal(new URL(source.Path).pathname, `/Jellyfin/Videos/${itemId}/stream`);
  assert.equal((await s.call(source.Path, { signedIn: false })).status, 302);
});

test('array responses get streamable placeholders and resolved sources retain their original URL', async t => {
  const s = await server(t);
  t.mock.method(Library.prototype, 'browsable', async () => [{ type: 'movie' }]);
  t.mock.method(Library.prototype, 'latest', async function () {
    return [this.titleItemOf({ id: 'tt1234567', type: 'movie', name: 'Test film' }, guid)];
  });
  const latest = await (await s.call('/Items/Latest')).json();
  assert.equal(latest[0].MediaSources[0].Type, 'Default');
  assert.equal(new URL(latest[0].MediaSources[0].Path).origin, origin);
  const resolved = await (await s.call(`/Items/${itemId}?Fields=MediaSources`)).json();
  assert.equal(resolved.MediaSources[0].Path, directUrl);
});

test('download uses the existing stream selection and requires sign-in', async t => {
  const s = await server(t);
  const download = await s.call(`/Items/${itemId}/Download`);
  assert.equal(download.status, 302);
  assert.equal(download.headers.get('location'), directUrl);
  assert.equal(download.headers.get('cache-control'), 'no-store');
  assert.equal((await s.call(`/Items/${itemId}/Download`, { signedIn: false })).status, 401);
  assert.equal((await s.call(`/Items/${itemId}/Download?MediaSourceId=missing`)).status, 404);
  assert.equal((await s.call('/Items/invalid/Download')).status, 404);
  assert.equal((await s.call(`/Items/${itemId}/Download`, { method: 'HEAD' })).status, 302);
});

test('BitrateTest returns the requested size with a bounded allocation', async t => {
  const s = await server(t);
  assert.equal(isJellyfinPath('/Playback/BitrateTest'), true);
  for (const [query, expected] of [['', 102400], ['?Size=500000', 500000], ['?Size=-1', 1], ['?Size=invalid', 102400], ['?Size=999999999', 10000000]]) {
    const res = await s.call('/Playback/BitrateTest' + query);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/octet-stream');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal((await res.arrayBuffer()).byteLength, expected);
  }
  assert.equal((await s.call('/Playback/BitrateTest', { signedIn: false })).status, 401);
});
