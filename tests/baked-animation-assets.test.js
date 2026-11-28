import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { readPackedBakedAnimation } from '../src/rendering/baked-animation-assets.js';

const bankUrl = 'https://game.test/nested/release/content/baked-animations/youngMale';

function bankResponse({ full = false, corruptRange = false, truncate = false, extraOutput = false } = {}) {
  const meta = { clip: 'Idle', byteLength: 4 };
  const metadata = Buffer.from(JSON.stringify(meta));
  const size = Buffer.alloc(4);
  size.writeUInt32LE(metadata.length);
  const payload = Buffer.from([0, 0, 128, 63]);
  const bytes = Buffer.concat([size, metadata, payload]);
  const encoded = gzipSync(extraOutput ? Buffer.concat([bytes, payload]) : bytes);
  const binary = Buffer.concat([Buffer.alloc(13), encoded, Buffer.alloc(8)]);
  const index = { version: 1, bytes: binary.length, clips: { Idle: { offset: 13, length: encoded.length, decodedBytes: bytes.length } } };
  const end = 12 + encoded.length;

  return async (url, { headers, signal }) => {
    signal?.throwIfAborted();
    if (url === bankUrl + '.json') return Response.json(index);
    assert.equal(url, bankUrl + '.bin');
    assert.equal(headers.Range, `bytes=13-${end}`);
    if (full) return new Response(binary);
    return new Response(truncate ? encoded.subarray(1) : encoded, {
      status: 206,
      headers: { 'Content-Range': `bytes ${corruptRange ? 12 : 13}-${end}/${binary.length}` }
    });
  };
}

test('downloads the selected bake from a range or a server returning the whole bank', async () => {
  for (const full of [false, true]) {
    const [meta, data] = await readPackedBakedAnimation(bankUrl, 'Idle', { fetcher: bankResponse({ full }) });
    assert.deepEqual(meta, { clip: 'Idle', byteLength: 4 });
    assert.equal(new Float32Array(data)[0], 1);
  }
});

test('rejects unknown clips, corrupt ranges and members with invalid lengths', async () => {
  await assert.rejects(readPackedBakedAnimation(bankUrl, 'constructor', { fetcher: bankResponse() }), /index/);
  for (const [options, error] of [
    [{ corruptRange: true }, /range/], [{ truncate: true }, /Truncated/], [{ extraOutput: true }, /declared length/]
  ]) {
    await assert.rejects(readPackedBakedAnimation(bankUrl, 'Idle', { fetcher: bankResponse(options) }), error);
  }
});

test('a cancelled bank read cannot reach the clip request', async () => {
  const abort = new AbortController();
  const productionFetch = bankResponse();
  const fetcher = async (url, options) => {
    assert.equal(url, bankUrl + '.json');
    const response = await productionFetch(url, options);
    abort.abort();
    return response;
  };
  await assert.rejects(readPackedBakedAnimation(bankUrl, 'Idle', { fetcher, signal: abort.signal }), { name: 'AbortError' });
});
