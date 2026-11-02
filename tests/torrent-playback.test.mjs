import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeConfig } from '../src/config/schema.ts';
import { encodeGuid } from '../src/jellyfin/ids.ts';
import * as playback from '../src/jellyfin/playback.ts';

const hash = 'a'.repeat(40);
const torrentServer = 'https://torrent.example/stream';
const addonUrl = 'https://addon.example/manifest.json';
const directUrl = 'https://video.example/movie.mkv';
const guid = { kind: 'movie', source: 'imdb', num: 1234567, anime: false };
const itemId = encodeGuid(guid);

function library(t, streams, jellyfin = {}) {
  t.mock.method(globalThis, 'fetch', async input => {
    const url = String(input);
    if (url.endsWith('/manifest.json')) return Response.json({ name: 'Test add-on', resources: ['stream'], types: ['movie'] });
    assert.match(url, /\/stream\/movie\/tt1234567\.json$/);
    return Response.json({ streams });
  });
  const cfg = normalizeConfig({ addons: { stream: [addonUrl] }, jellyfin });
  return {
    ctx: { cfg, env: {}, scope: t.name, origin: 'https://rill.example' },
    jf: { base: 'https://rill.example' },
    meta: async () => ({ runtime: '90 min' }),
    streamTypeOf: () => 'movie',
    streamIdsOf: () => ['tt1234567'],
  };
}

test('torrent server setting accepts HTTP(S) bases without credentials, queries or fragments', () => {
  assert.equal(normalizeConfig({ jellyfin: { torrentServer: torrentServer + '/' } }).jellyfin.torrentServer, torrentServer);
  assert.equal(normalizeConfig({ jellyfin: { torrentServer: 'http://localhost:11470' } }).jellyfin.torrentServer, 'http://localhost:11470');
  for (const value of ['', 'ftp://torrent.example', 'http://user:pass@torrent.example', 'https://torrent.example/?q=1', 'https://torrent.example/#part', 'https://torrent.example?q=1', 'https://torrent.example#part']) {
    assert.equal(normalizeConfig({ jellyfin: { torrentServer: value } }).jellyfin.torrentServer, undefined);
  }
  assert.equal(normalizeConfig({}).jellyfin.torrentServer, undefined);
});

test('torrent URLs retain file selection and bounded tracker hints', () => {
  const sources = ['tracker:udp://tracker.example:1337/announce', 'dht:' + hash, 'https://ignored.example'];
  assert.equal(playback.playableUrl({ infoHash: hash.toUpperCase(), fileIdx: 2, sources }, torrentServer),
    `${torrentServer}/${hash}/2?tr=${encodeURIComponent(sources[0])}&tr=${encodeURIComponent(sources[1])}`);
  assert.equal(playback.playableUrl({ infoHash: hash, sources: 'invalid' }, torrentServer), `${torrentServer}/${hash}/-1`);
  assert.equal(playback.playableUrl({ infoHash: hash, fileIdx: -2 }, torrentServer), `${torrentServer}/${hash}/-1`);
  const many = playback.playableUrl({ infoHash: hash, sources: Array(30).fill(sources[0]) }, torrentServer);
  assert.equal(new URL(many).searchParams.getAll('tr').length, 20);
  assert.equal(playback.playableUrl({ infoHash: 'invalid' }, torrentServer), 'other');
});

test('torrent-only results play through the configured server and retain distinct files', async t => {
  const lib = library(t, [{ infoHash: hash, fileIdx: 1 }, { infoHash: hash, fileIdx: 2 }], { torrentServer });
  const result = await playback.resolveSources(lib, guid, itemId);
  assert.deepEqual(result.sources.map(s => s.Path), [`${torrentServer}/${hash}/1`, `${torrentServer}/${hash}/2`]);
  assert.equal(result.sources[0].Id, itemId);
  assert.notEqual(result.sources[0].ETag, result.sources[1].ETag);
  assert.equal(playback.playbackInfo(result.sources, undefined, itemId).ErrorCode, undefined);
});

test('unplayable results log counts without URLs or hashes', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const lib = library(t, [
    { infoHash: hash },
    { url: directUrl, behaviorHints: { proxyHeaders: { request: { Referer: 'https://referer.example' } } } },
    { externalUrl: 'https://external.example' },
  ]);
  const result = await playback.resolveSources(lib, guid, itemId);
  assert.equal(playback.playbackInfo(result.sources, undefined, itemId).ErrorCode, 'NoCompatibleStream');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][1].torrentOnly, 1);
  assert.equal(warnings[0][1].needsHeaders, 1);
  assert.equal(warnings[0][1].other, 1);
  assert.equal(warnings[0][1].streams, 3);
  assert.equal(JSON.stringify(warnings).includes(hash), false);
  assert.equal(JSON.stringify(warnings).includes('https://'), false);
});

test('direct streams still play, obey maxSources and reject required headers', async t => {
  const lib = library(t, [
    { url: directUrl + '?headers=required', behaviorHints: { proxyHeaders: { response: { Header: 'value' } } } },
    { url: directUrl },
    { url: 'https://video.example/second.mp4' },
  ], { maxSources: 1 });
  const { sources } = await playback.resolveSources(lib, guid, itemId);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].Path, directUrl);
});

test('age restrictions still require metadata before looking up streams', async t => {
  const lib = library(t, [{ infoHash: hash }], { torrentServer });
  lib.ctx.cfg.ageCap = 'PG-13';
  lib.meta = async () => null;
  const fetches = globalThis.fetch.mock.calls.length;
  assert.deepEqual((await playback.resolveSources(lib, guid, itemId)).sources, []);
  assert.equal(globalThis.fetch.mock.calls.length, fetches);
});

test('failed add-on requests are counted without logging their addresses', async t => {
  const lib = library(t, []);
  t.mock.method(globalThis, 'fetch', async input => String(input).endsWith('/manifest.json')
    ? Response.json({ resources: ['stream'], types: ['movie'] }) : new Response(null, { status: 502 }));
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const { sources } = await playback.resolveSources(lib, guid, itemId);
  assert.deepEqual(sources, []);
  assert.deepEqual(warnings[0][1], { addons: 1, asked: 1, failed: 1, streams: 0, torrentOnly: 0, needsHeaders: 0, other: 0 });
});
