import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {shareGlbImageFamilies} from '../share-glb-image-families.mjs';
const root=path.resolve('dist'),out=path.resolve('test-results/shared-glb-images');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.glb')?[path.join(d,e.name)]:[]);
const inputs=walk(root).map(p=>({name:path.relative(root,p).replaceAll('\\','/'),bytes:fs.readFileSync(p)}));
const result=shareGlbImageFamilies(inputs);
const parse=b=>{const n=b.readUInt32LE(12);return {json:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
let views=0,images=0;
for(const file of result.outputs){const before=parse(inputs.find(i=>i.name===file.name).bytes),after=parse(file.bytes);for(const field of ['accessors','meshes','skins','animations','nodes','materials','textures','images'])assert.deepEqual(after.json[field],before.json[field],file.name+' '+field);
 for(let i=0;i<before.json.bufferViews.length;i++){const a=before.json.bufferViews[i],b=after.json.bufferViews[i];if(a.buffer===0){const actual=b.buffer===0?after.bin:result.banks.find(bank=>bank.name===path.posix.normalize(path.posix.join(path.posix.dirname(file.name),after.json.buffers[b.buffer].uri))).bytes;assert.deepEqual(actual.subarray(b.byteOffset??0,(b.byteOffset??0)+b.byteLength),before.bin.subarray(a.byteOffset??0,(a.byteOffset??0)+a.byteLength));views++;}
 const ac=a.extensions?.EXT_meshopt_compression,bc=b.extensions?.EXT_meshopt_compression;if(ac?.buffer===0){assert.deepEqual(after.bin.subarray(bc.byteOffset,bc.byteOffset+bc.byteLength),before.bin.subarray(ac.byteOffset,ac.byteOffset+ac.byteLength));views++;}}
 images+=before.json.images.length;const target=path.join(out,file.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.bytes);
}
for(const bank of result.banks){const target=path.join(out,bank.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bank.bytes);}
fs.writeFileSync(path.join(out,'models.json'),JSON.stringify(result.outputs.map(o=>o.name)));
for(const file of result.outputs){const original=parse(inputs.find(i=>i.name===file.name).bytes);const originalImages=(original.json.images??[]).reduce((sum,image)=>sum+(image.bufferView===undefined?0:original.json.bufferViews[image.bufferView].byteLength),0);const sharedBytes=result.banks.filter(b=>b.models.includes(file.name)).reduce((sum,b)=>sum+b.bytes.length,0);assert.ok(sharedBytes<=originalImages+result.banks.length*4,'No unrelated texture payload for '+file.name);}
const report={scope:'Candidate package only; exact data/metadata parity, not browser loading acceptance.',models:result.outputs.length,banks:result.banks.length,largestBankBytes:Math.max(...result.banks.map(b=>b.bytes.length)),savedBytes:result.savedBytes,verifiedPayloadViews:views,images};fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
