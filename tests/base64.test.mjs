import assert from 'node:assert/strict';
import { test } from 'node:test';
import { b64urlDecode, b64urlEncode } from '../src/util/bytes.ts';
import { decodeConfig, encodeConfig } from '../src/config/codec.ts';
import { normalizeConfig } from '../src/config/schema.ts';

test('base64url matches known vectors without padding', () => {
  for (const [text, encoded] of [['', ''], ['f', 'Zg'], ['fo', 'Zm8'], ['foo', 'Zm9v'], ['foobar', 'Zm9vYmFy']]) {
    const bytes = new TextEncoder().encode(text);
    assert.equal(b64urlEncode(bytes), encoded);
    assert.deepEqual(b64urlDecode(encoded), bytes);
  }
  assert.equal(b64urlEncode(Uint8Array.of(251, 255)), '-_8');
  assert.deepEqual(b64urlDecode('-_8'), Uint8Array.of(251, 255));
  assert.deepEqual(b64urlDecode('+/8='), Uint8Array.of(251, 255));
});

test('encoding respects byte offsets and handles large payloads', () => {
  const backing = Uint8Array.of(255, 102, 111, 111, 255);
  assert.equal(b64urlEncode(backing.subarray(1, 4)), 'Zm9v');
  const bytes = Uint8Array.from({ length: 256 * 1024 }, (_, i) => i % 256);
  assert.deepEqual(b64urlDecode(b64urlEncode(bytes)), bytes);
});

test('decoding preserves atob acceptance of padding, whitespace and malformed inputs', () => {
  const inputs = ['', 'Zg', 'Zg=', 'Zg==', 'Zm8=', ' Zg ', 'Zm 8', '\tZm9v\n', 'A', 'Zg===', 'Zm8==', 'ab=c', '#Zm9v', 'Zm9v\u000b', 'é'];
  const alphabet = 'ABab09-_+/= !\t\n';
  let state = 12345;
  for (let i = 0; i < 1000; i++) {
    let input = '';
    for (let j = 0; j < i % 12; j++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      input += alphabet[state % alphabet.length];
    }
    inputs.push(input);
  }
  for (const input of inputs) {
    const padding = input.length % 4 ? '='.repeat(4 - input.length % 4) : '';
    let expected;
    try { expected = atob(input.replace(/-/g, '+').replace(/_/g, '/') + padding); } catch {
      assert.throws(() => b64urlDecode(input), undefined, JSON.stringify(input));
      continue;
    }
    assert.deepEqual(b64urlDecode(input), Uint8Array.from(expected, c => c.charCodeAt(0)), JSON.stringify(input));
  }
});

test('compressed configuration still round-trips through the codec', async () => {
  const cfg = normalizeConfig({ name: 'Codec test', language: 'es-MX', addons: { meta: ['https://metadata.example/manifest.json'] } });
  const encoded = await encodeConfig(cfg);
  assert.ok(encoded.startsWith('c1.'));
  assert.equal((await decodeConfig(encoded)).name, cfg.name);
  assert.deepEqual((await decodeConfig(encoded)).addons, cfg.addons);
  assert.equal(await decodeConfig('c1.invalid!'), null);
});
