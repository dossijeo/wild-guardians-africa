import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url));
const village=JSON.parse(read('public/content/villages.json')).find(v=>v.id==='mapungubwe');
const count=village.units.find(u=>u.key==='mapu-0').count;
function mesh(path){
  const bytes=read(path),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const offset=buffer.byteLength-count*4;
  return {vertices:new Float32Array(buffer,0,offset/4),indices:new Uint32Array(buffer,offset,count)};
}

test('workshop art UV seams preserve every source triangle position and normal',()=>{
  const before=mesh('public/assets/visual-lab/mapu-0-repacked.bin');
  const after=mesh('public/assets/visual-lab/mapu-0-art.bin');
  assert.equal(count,7992*3);
  for(let corner=0;corner<count;corner++){
    const a=before.indices[corner]*8,b=after.indices[corner]*8;
    assert.ok(b+7<after.vertices.length,`index ${corner} stays in the buffer`);
    for(let component=0;component<6;component++)assert.equal(after.vertices[b+component],before.vertices[a+component],`corner ${corner}, component ${component}`);
    for(let component=6;component<8;component++)assert.ok(Number.isFinite(after.vertices[b+component])&&after.vertices[b+component]>=0&&after.vertices[b+component]<=1,`UV ${corner} stays in atlas`);
  }
});

test('workshop art does not mutate source village metadata, geometry or colour',()=>{
  const audit=JSON.parse(read('docs/qa/global-visual-lab/workshop-art/refinement-audit.json'));
  for(const [path,expected] of Object.entries(audit.sourceHashes)){
    const digest=createHash('sha256').update(read(path.replaceAll('\\','/'))).digest('hex');
    assert.equal(digest,expected,path);
  }
});

test('shared art replaces source downloads and keeps one material and buffer for all units',async t=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async url=>{
    requests.push(url);const bytes=read('public'+url);
    return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  });
  const assets=new Assets();assets.visualLab='village-shared-art';
  const textures=[];t.mock.method(assets,'texture',async url=>{textures.push(url);return new THREE.Texture();});
  const meshes=await assets.village(village);
  assert.deepEqual(requests,['/assets/visual-lab/mapungubwe-shared-art.bin']);
  assert.deepEqual(textures,['/assets/visual-lab/mapungubwe-shared-art.webp']);
  assert.equal(new Set(meshes.map(m=>m.material)).size,1);
  assert.equal(new Set(meshes.map(m=>m.geometry.attributes.position.data)).size,1);
  const bytes=read('public'+village.binary.url),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const source=new Float32Array(buffer,0,village.vertexBytes/4),indices=new Uint32Array(buffer,village.vertexBytes,village.indexCount);
  const result=meshes[0].geometry,out=result.attributes.position.data.array;
  for(let corner=0;corner<village.indexCount;corner++){
    const a=indices[corner]*8,b=result.index.array[corner]*8;
    for(let component=0;component<6;component++)assert.equal(out[b+component],source[a+component]);
    assert.ok(out[b+6]>=0&&out[b+6]<=1&&out[b+7]>=0&&out[b+7]<=1);
  }
  for(const [i,m]of meshes.entries())assert.deepEqual(m.geometry.drawRange,{start:village.units[i].offset,count:village.units[i].count});
  assets.disposeModels();
});
