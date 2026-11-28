import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeVisibilityViews,villageVisibilityView,patchNativeAmbientVisibility} from '../src/rendering/native-ambient-visibility.js';
import {artLightingFunctions} from '../src/rendering/biome-material-source.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('all six native AO banks match active source geometry and every LOD layout',()=>{
 let slots=0,levels=0;
 for(const biome of ['savanna','desert','grand_river','mangrove','volcanoes','canyons']){
  const pack=json('public/content/biome-'+biome+'.json'),meta=json('public/content/lighting/global-ao/'+biome+'.json'),data=read('public'+meta.binary);
  assert.equal(meta.sourceSHA256,sha(read('public'+pack.binary.url)));
  assert.equal(meta.manifestSHA256,sha(read('public/content/biome-'+biome+'.json')));
  assert.equal(meta.outputSHA256,sha(data));
  const buffer=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),views=nativeVisibilityViews(pack,meta,buffer);
  slots+=views.length;levels+=views.flat().length;
  for(const row of meta.records){assert.equal(row.invalidNormals,0);assert.equal(row.traversalLimit,0);assert.ok(row.mean>0&&row.mean<=255);}
  const stale=structuredClone(meta);stale.source='/wrong.bin';assert.throws(()=>nativeVisibilityViews(pack,stale,buffer),/Stale/);
  const broken=structuredClone(meta);broken.records[0].count++;assert.throws(()=>nativeVisibilityViews(pack,broken,buffer),/layout mismatch/);
 }
 assert.equal(slots,120);assert.equal(levels,360);
});
test('AO patch replaces local indirect response without moving the authored emission block',()=>{
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:artLightingFunctions};
 const emission=artLightingFunctions.slice(artLightingFunctions.indexOf('if(uArtVolcanicGlow'));
 patchNativeAmbientVisibility(shader,{value:1});
 assert.equal(shader.fragmentShader.slice(shader.fragmentShader.indexOf('if(uArtVolcanicGlow')),emission);
 assert.match(shader.fragmentShader,/indirect\*cavityVisibility\+max\(illumination-indirect/);
 assert.match(shader.vertexShader,/vAmbientVisibility=ambientVisibility/);
 assert.throws(()=>patchNativeAmbientVisibility({uniforms:{},vertexShader:'',fragmentShader:''},{value:1}),/anchor missing/);
});


test('village AO covers every active unit without cross-unit vertex aliases',()=>{
 let units=0;
 for(const pack of json('public/content/villages.json')){
  const meta=json('public/content/lighting/global-ao/village-'+pack.id+'.json'),data=read('public'+meta.binary),source=read('public'+pack.binary.url);
  assert.equal(meta.sourceSHA256,sha(source));assert.equal(meta.outputSHA256,sha(data));
  const view=villageVisibilityView(pack,meta,data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  assert.equal(view.length,pack.vertexBytes/32);assert.equal(meta.records.length,pack.units.length);
  const indices=new Uint32Array(source.buffer.slice(source.byteOffset+pack.vertexBytes,source.byteOffset+source.length));
  const seen=new Set();
  for(const unit of pack.units){const ids=new Set(indices.slice(unit.offset,unit.offset+unit.count)),record=meta.records.find(r=>r.key===unit.key);assert.equal(record.vertices,ids.size);assert.equal(record.invalidNormals,0);assert.equal(record.traversalLimit,0);for(const id of ids){assert.ok(!seen.has(id));seen.add(id);}units++;}
  assert.throws(()=>villageVisibilityView({...pack,id:'wrong'},meta,view.buffer),/Stale/);
 }
 assert.equal(units,46);
});
