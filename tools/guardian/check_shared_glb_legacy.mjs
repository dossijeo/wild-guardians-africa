import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {decodeWebGlb} from '../../public/runtime/glb-legacy.js';
const root=path.resolve('test-results/shared-glb-images');
const names=JSON.parse(await fs.readFile(path.join(root,'models.json'),'utf8'));
const array=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const parse=b=>{const n=b.readUInt32LE(12);return {json:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
let payloadViews=0;
for(const name of names){
 const original=await fs.readFile(path.join('public',name)),candidate=await fs.readFile(path.join(root,name));
 const before=parse(Buffer.from(await decodeWebGlb(array(original))));
 const after=parse(Buffer.from(await decodeWebGlb(array(candidate),pathToFileURL(path.join(root,name)).href,async url=>array(await fs.readFile(new URL(url))))));
 for(const field of ['accessors','meshes','skins','animations','nodes','materials','textures','images'])assert.deepEqual(after.json[field],before.json[field],name+' '+field);
 assert.equal(after.json.buffers.length,1);
 assert.equal(after.json.bufferViews.length,before.json.bufferViews.length);
 for(let i=0;i<before.json.bufferViews.length;i++){
  const a=before.json.bufferViews[i],b=after.json.bufferViews[i];
  assert.deepEqual(after.bin.subarray(b.byteOffset,b.byteOffset+b.byteLength),before.bin.subarray(a.byteOffset,a.byteOffset+a.byteLength),name+' view '+i);payloadViews++;
 }
}
const report={scope:'Legacy decoder decoded payload parity; not visual acceptance.',models:names.length,payloadViews,passed:true};
await fs.writeFile(path.join(root,'legacy-receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
