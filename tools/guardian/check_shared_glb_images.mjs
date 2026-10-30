import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {shareGlbImages} from '../share-glb-images.mjs';
const root=path.resolve('dist'),out=path.resolve('test-results/shared-glb-images');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.glb')?[path.join(d,e.name)]:[]);
const inputs=walk(root).map(p=>({name:path.relative(root,p).replaceAll('\\','/'),bytes:fs.readFileSync(p)}));
const result=shareGlbImages(inputs,name=>path.posix.relative(path.posix.dirname(name),'assets/shared-images.bin'));
const parse=b=>{const n=b.readUInt32LE(12);return {json:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
let views=0,images=0;
for(const file of result.outputs){const before=parse(inputs.find(i=>i.name===file.name).bytes),after=parse(file.bytes);for(const field of ['accessors','meshes','skins','animations','nodes','materials','textures','images'])assert.deepEqual(after.json[field],before.json[field],file.name+' '+field);
 for(let i=0;i<before.json.bufferViews.length;i++){const a=before.json.bufferViews[i],b=after.json.bufferViews[i];if(a.buffer===0){const actual=b.buffer===0?after.bin:result.shared;assert.deepEqual(actual.subarray(b.byteOffset??0,(b.byteOffset??0)+b.byteLength),before.bin.subarray(a.byteOffset??0,(a.byteOffset??0)+a.byteLength));views++;}
 const ac=a.extensions?.EXT_meshopt_compression,bc=b.extensions?.EXT_meshopt_compression;if(ac?.buffer===0){assert.deepEqual(after.bin.subarray(bc.byteOffset,bc.byteOffset+bc.byteLength),before.bin.subarray(ac.byteOffset,ac.byteOffset+ac.byteLength));views++;}}
 images+=before.json.images.length;const target=path.join(out,file.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.bytes);
}
fs.mkdirSync(path.join(out,'assets'),{recursive:true});fs.writeFileSync(path.join(out,'assets/shared-images.bin'),result.shared);
const report={scope:'Candidate package only; exact data/metadata parity, not browser loading acceptance.',models:result.outputs.length,groups:result.groups,sharedBytes:result.shared.length,savedBytes:result.savedBytes,verifiedPayloadViews:views,images};fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
