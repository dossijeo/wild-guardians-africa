import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {encodeChunkCache,decodeChunkCache} from '../tools/experiments/chunk-cache-codec.mjs';
import {chunkTransferables} from '../src/rendering/chunk-data.js';
const fixture=()=>({cx:-1,cz:2,instances:[{slot:1,x:3.14,z:-22.5,scale:1.2,yaw:.7}],terrain:new Float32Array([0,-0,1.234567]),water:new Float32Array(),groundMask:new Uint8Array([0,128,255])});

test('cache decoding from compressed Node Buffer owns independent transferable arrays and preserves original bytes',()=>{
 const data=fixture(),compressed=gzipSync(encodeChunkCache(data,'generation-a')),bytes=gunzipSync(compressed);
 const restored=decodeChunkCache(bytes,'generation-a');assert.deepEqual(restored,data);
 const buffers=chunkTransferables(restored);assert.equal(new Set(buffers).size,3);
 const transferred=structuredClone(restored,{transfer:buffers});assert.deepEqual(transferred,data);
 assert(buffers.every(b=>b.byteLength===0));assert(bytes.byteLength>0);
 assert.deepEqual(decodeChunkCache(bytes,'generation-a'),data);
});
test('stale generation, truncation and changed payloads cannot silently supply cached chunks',()=>{
 const bytes=encodeChunkCache(fixture(),'generation-a');
 assert.throws(()=>decodeChunkCache(bytes,'generation-b'),/Obsolete/);
 assert.throws(()=>decodeChunkCache(bytes.subarray(0,bytes.length-1),'generation-a'),/Corrupt/);
 const tampered=bytes.slice();tampered[tampered.length-1]^=1;
 assert.throws(()=>decodeChunkCache(tampered,'generation-a'),/Corrupt/);
});
