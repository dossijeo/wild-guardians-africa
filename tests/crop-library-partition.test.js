import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {partitionCropLibrary} from '../tools/experiments/partition-crop-library.mjs';import {readGlb} from '../tools/glb-container.mjs';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const out=path.resolve('.cache/maize-partition-candidate'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=partitionCropLibrary(out),originals=Object.fromEntries(Object.entries(manifest.sources).map(([k,s])=>[k,readGlb(fs.readFileSync('public/'+s.runtime))]));
const partitions=manifest.partitions.map(p=>({...p,glb:readGlb(fs.readFileSync(path.join(out,p.file)))}));
const normalizedAccessor=a=>{const copy=structuredClone(a);delete copy.bufferView;return copy;};
function compressed(glb,v){const e=v.extensions.EXT_meshopt_compression;return glb.bin.subarray(e.byteOffset??0,(e.byteOffset??0)+e.byteLength);}
function decode(glb,v){const e=v.extensions.EXT_meshopt_compression,target=new Uint8Array(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(target,e.count,e.byteStride,compressed(glb,v),e.mode,e.filter);return target;}
test('all40 stages/32 authored transitions partition once with exact extras, transforms and primitive semantics',()=>{
 for(const kind of ['steady','bridges']){
  const input=originals[kind],selected=partitions.filter(p=>p.kind===kind),ids=selected.flatMap(p=>p.nodeSourceIndices).sort((a,b)=>a-b);assert.deepEqual(ids,input.json.nodes.map((_,i)=>i));
  assert.equal(selected.find(p=>p.group==='maize').nodeSourceIndices.length,kind==='steady'?5:4);assert.equal(selected.find(p=>p.group==='remainder').nodeSourceIndices.length,kind==='steady'?35:28);
  for(const p of selected){
   const j=p.glb.json;for(const [i,id]of p.nodeSourceIndices.entries()){const node=structuredClone(j.nodes[i]);node.mesh=p.meshSourceIndices[node.mesh];assert.deepEqual(node,input.json.nodes[id]);}
   for(const [i,id]of p.meshSourceIndices.entries()){const mesh=structuredClone(j.meshes[i]);for(const primitive of mesh.primitives){for(const name of Object.keys(primitive.attributes))primitive.attributes[name]=p.accessorSourceIndices[primitive.attributes[name]];primitive.indices=p.accessorSourceIndices[primitive.indices];if(primitive.material!==undefined)primitive.material=p.materialSourceIndices[primitive.material];}assert.deepEqual(mesh,input.json.meshes[id]);}
   for(const [i,id]of p.accessorSourceIndices.entries())assert.deepEqual(normalizedAccessor(j.accessors[i]),normalizedAccessor(input.json.accessors[id]));
  }
 }
});
test('real meshopt decoder preserves every compressed slice and decoded attribute/index bit pattern',async()=>{
 await MeshoptDecoder.ready;let checkedViews=0,checkedAccessors=0,bytes=0;
 for(const p of partitions){const input=originals[p.kind],sourceDecoded=new Map(),actualDecoded=new Map();
  for(const [i,id]of p.bufferViewSourceIndices.entries()){
   const old=input.json.bufferViews[id],actual=p.glb.json.bufferViews[i];assert.deepEqual(Buffer.from(compressed(p.glb,actual)),Buffer.from(compressed(input,old)));
   const fields=v=>{const c=structuredClone(v);delete c.byteOffset;delete c.buffer;delete c.extensions.EXT_meshopt_compression.byteOffset;return c;};assert.deepEqual(fields(actual),fields(old));
   const a=decode(input,old),b=decode(p.glb,actual);assert.deepEqual(b,a);assert.equal(a.byteLength,old.byteLength);sourceDecoded.set(id,a);actualDecoded.set(i,b);checkedViews++;bytes+=a.byteLength;
  }
  const laneBytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  for(const [i,id]of p.accessorSourceIndices.entries()){
   const a=input.json.accessors[id],b=p.glb.json.accessors[i],lane=laneBytes[a.componentType]*components[a.type],stride=input.json.bufferViews[a.bufferView].byteStride??lane,offset=a.byteOffset??0;
   const original=sourceDecoded.get(a.bufferView),actual=actualDecoded.get(b.bufferView);
   for(let row=0;row<a.count;row++)assert.deepEqual(actual.subarray(offset+row*stride,offset+row*stride+lane),original.subarray(offset+row*stride,offset+row*stride+lane));checkedAccessors++;
  }
 }
 assert.equal(checkedViews,40*4+32*8);assert.equal(checkedAccessors,checkedViews);assert.equal(bytes,57074092);
});
test('material/UV/sampler definitions remain exact; every original image stored once with shared URI and unchanged WebP bytes',()=>{
 const original=originals.steady.json;
 for(const p of partitions.filter(p=>p.kind==='steady')){
  const j=p.glb.json;assert.deepEqual(j.samplers,original.samplers);assert.deepEqual(j.textures,original.textures);
  for(const [i,id]of p.materialSourceIndices.entries())assert.deepEqual(j.materials[i],original.materials[id]);
  for(const [i,image]of j.images.entries()){const source=structuredClone(original.images[i]);delete source.bufferView;source.uri=manifest.textures[i].uri;assert.deepEqual(image,source);}
  assert.ok(j.meshes.every(mesh=>mesh.primitives.every(pr=>pr.attributes.TEXCOORD_0!==undefined)));
 }
 const seen=new Set();for(const t of manifest.textures){assert.ok(!seen.has(t.uri));seen.add(t.uri);const bytes=fs.readFileSync(path.join(out,t.uri)),v=original.bufferViews[original.images[t.index].bufferView];assert.equal(sha(bytes),t.sha256);assert.deepEqual(bytes,Buffer.from(originals.steady.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)));}
 assert.equal(seen.size,6);assert.equal(manifest.textures.reduce((n,t)=>n+t.bytes,0),7648314);
});
test('repeat generation is byte deterministic, refuses production output and leaves original assets/manifests unchanged',()=>{
 const paths=[...Object.values(manifest.sources).map(s=>'public/'+s.runtime),'public/content/models.json','public/content/crop-bridges.json','content/manifests/web-assets.json'],before=paths.map(p=>sha(fs.readFileSync(p))),files=['partition-manifest.json',...manifest.partitions.map(p=>p.file),...manifest.textures.map(t=>t.uri)],expected=files.map(p=>sha(fs.readFileSync(path.join(out,p))));
 assert.throws(()=>partitionCropLibrary(path.resolve('public/assets')),/own .cache/);partitionCropLibrary(out);assert.deepEqual(files.map(p=>sha(fs.readFileSync(path.join(out,p)))),expected);assert.deepEqual(paths.map(p=>sha(fs.readFileSync(p))),before);
});
