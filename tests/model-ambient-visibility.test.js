import {Assets} from '../src/rendering/assets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {geometryOnly} from '../tools/calibrate_footsteps.mjs';
import {assetUrl} from '../src/rendering/asset-url.js';
import {attachModelVisibility} from '../src/rendering/model-ambient-visibility.js';
const read=p=>readFileSync(new URL('../public'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const catalogue=readdirSync(new URL('../public/content/lighting/global-ao/',import.meta.url)).filter(n=>/^model-(?!crops).*\.json$/.test(n)).map(n=>{const metadata='/content/lighting/global-ao/'+n;return {source:json(metadata).source,metadata};});
test('model AO maps original and shipped compressed primitives without changing rig or morph geometry',async()=>{
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 for(const entry of catalogue){
  const meta=json(entry.metadata),data=read(meta.binary);assert.equal(meta.sourceSHA256,sha(read(entry.source)));assert.equal(meta.outputSHA256,sha(data));
  for(const source of new Set([entry.source,assetUrl(entry.source)])){
   const gltf=await loader.parseAsync(geometryOnly(read(source)),''),before=[];
   gltf.scene.traverse(m=>{if(m.isMesh)before.push({mesh:m,position:m.geometry.attributes.position,index:m.geometry.index,skin:m.geometry.attributes.skinWeight,morph:m.geometry.morphAttributes.position});});
   const result=attachModelVisibility(gltf,meta,data.buffer.slice(data.byteOffset,data.byteOffset+data.length));
   assert.equal(result.mapped,meta.records.length);
   for(const row of before){const g=row.mesh.geometry;assert.equal(g.attributes.position,row.position);assert.equal(g.index,row.index);assert.equal(g.attributes.skinWeight,row.skin);assert.equal(g.morphAttributes.position,row.morph);assert.equal(g.attributes.ambientVisibility.count,g.attributes.position.count);assert.equal(g.attributes.ambientVisibility.normalized,true);for(let i=0;i<g.attributes.position.count;i++){const moves=g.morphAttributes.position?.some(a=>Math.hypot(a.getX(i),a.getY(i),a.getZ(i))>1e-7);if(moves)assert.equal(g.attributes.ambientVisibility.getX(i),1,'moving facial vertex must remain unoccluded');}}
   const invalid=structuredClone(meta);invalid.records[0].count++;assert.throws(()=>attachModelVisibility(gltf,invalid,data.buffer.slice(data.byteOffset,data.byteOffset+data.length)),/primitive mismatch/);
  }
 }
});

test('asset owner resolves catalogue aliases for original and shipped model URLs',async t=>{
 t.mock.method(globalThis,'fetch',async url=>{const b=read(url);return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};});
 const entry=catalogue[0];
 for(const source of [entry.source,assetUrl(entry.source)]){
  const assets=new Assets();assets.visualSearch='?globalAO=1';
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  assets.loader={loadAsync:async()=>loader.parseAsync(geometryOnly(read(assetUrl(source))), '')};
  try{const gltf=await assets.model(source);let count=0;gltf.scene.traverse(m=>{if(m.isMesh){assert.ok(m.geometry.attributes.ambientVisibility);count++;}});assert.ok(count>0);}
  finally{assets.disposeModels();}
 }
});
