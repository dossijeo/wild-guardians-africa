import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeWebGlb} from '../public/runtime/glb-legacy.js';
function make(){
 const json={asset:{version:'2.0'},buffers:[{byteLength:4},{uri:'../shared/maps.bin',byteLength:8}],bufferViews:[{buffer:0,byteOffset:0,byteLength:4},{buffer:1,byteOffset:4,byteLength:4}]};
 const text=Buffer.from(JSON.stringify(json));const n=Math.ceil(text.length/4)*4,b=Buffer.alloc(28+n+4);b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(n,12);b.writeUInt32LE(0x4e4f534a,16);b.fill(32,20,20+n);text.copy(b,20);b.writeUInt32LE(4,20+n);b.writeUInt32LE(0x004e4942,24+n);b.set([1,2,3,4],28+n);return b.buffer.slice(b.byteOffset,b.byteOffset+b.length);
}
test('legacy decoder re-embeds external image ranges relative to model URL',async()=>{
 const seen=[];const output=Buffer.from(await decodeWebGlb(make(),'https://example.test/game/assets/web/a.glb',async url=>{seen.push(url);return Uint8Array.from([9,9,9,9,5,6,7,8]).buffer;}));
 assert.deepEqual(seen,['https://example.test/game/assets/shared/maps.bin']);const n=output.readUInt32LE(12),json=JSON.parse(output.subarray(20,20+n));assert.deepEqual(json.buffers,[{byteLength:8}]);assert.deepEqual(json.bufferViews.map(v=>[v.buffer,v.byteOffset]),[[0,0],[0,4]]);assert.deepEqual([...output.subarray(28+n)],[1,2,3,4,5,6,7,8]);
});
test('legacy decoder fails explicitly on missing base URL or truncated external data',async()=>{
 await assert.rejects(decodeWebGlb(make()),/require the model URL/);
 await assert.rejects(decodeWebGlb(make(),'https://example.test/a.glb',async()=>new ArrayBuffer(2)),/Truncated external/);
});
