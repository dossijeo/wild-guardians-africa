import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {chunkBounds} from '../src/rendering/water-source.js';
import {sampleSavannaAcacias,treeAtlasAnchor,compareTreeInstances} from '../tools/experiments/far-tree-sampling.js';
const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
const config=seed=>({seed:String(seed),biome:'savanna',relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)});
test('tree-only queries equal complete native populations across seeds and chunk boundaries',()=>{
 for(const seed of [712,42]){
  const c=config(seed),field=new TerrainField(c),all=[];
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   const bounds=chunkBounds(x,z),expected=scatterWorld({...c,cx:x,cz:z},profile,field).instances[0];
   assert.deepEqual(sampleSavannaAcacias(c,profile,bounds,{field}),expected);all.push(...expected);
  }
  const whole=sampleSavannaAcacias(c,profile,{minX:-72,minZ:-72,maxX:72,maxZ:72},{field});
  assert.deepEqual(whole,[...all].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));assert.equal(new Set(whole.map(t=>t.id)).size,whole.length);
  const removed=whole.slice(0,3).map(t=>t.id);
  assert.deepEqual(sampleSavannaAcacias(c,profile,{minX:-72,minZ:-72,maxX:72,maxZ:72},{field,suppressed:new Set(removed)}),whole.filter(t=>!removed.includes(t.id)));
 }
});
test('atlas anchor preserves the original anisotropic native model transform',()=>{
 const local=[.0515078306,0,1.27623853],trees=sampleSavannaAcacias(config(712),profile,chunkBounds(0,0));assert.ok(trees.length);
 for(const t of trees){const a=treeAtlasAnchor(t,local),c=Math.cos(t.yaw),s=Math.sin(t.yaw);assert.deepEqual(a.origin,{x:t.x,y:t.y,z:t.z});assert.equal(a.id,t.id);assert.equal(a.sx,t.sx);assert.equal(a.sy,t.sy);assert.equal(a.sz,t.sz);assert.ok(Math.abs(a.x-(t.x+local[0]*t.sx*c+local[2]*t.sz*s))<1e-12);assert.ok(Math.abs(a.z-(t.z-local[0]*t.sx*s+local[2]*t.sz*c))<1e-12);}
 assert.throws(()=>sampleSavannaAcacias({...config(1),biome:'desert'},profile,chunkBounds(0,0)),/savanna/);
 assert.throws(()=>sampleSavannaAcacias(config(1),profile,{minX:1,maxX:0,minZ:0,maxZ:1}),/bounds/);
});

test('overlapping moving regions retain exact acacia identity, anchor and anisotropic transform',()=>{
 const c=config(712),local=[.0515078306,0,1.27623853],sample=(x,z)=>sampleSavannaAcacias(c,profile,{minX:x-180,maxX:x+180,minZ:z-180,maxZ:z+180}).map(t=>treeAtlasAnchor(t,local));
 const first=sample(0,0),next=sample(96,96),match=compareTreeInstances(first,next);
 assert.ok(match.shared>0);assert.equal(match.changed,0);assert.ok(match.added>0);assert.ok(match.removed>0);
 assert.deepEqual(compareTreeInstances(first,sample(0,0)),{shared:first.length,changed:0,added:0,removed:0});
 const old=new Map(first.map(t=>[t.id,t]));for(const tree of next)if(old.has(tree.id))assert.deepEqual(tree,old.get(tree.id));
 const shared=next.find(t=>old.has(t.id));for(const key of ['x','y','z','yaw','sx','sy','sz']){
  const mutated=next.map(t=>t===shared?{...t,[key]:t[key]+.1}:t);assert.equal(compareTreeInstances(first,mutated).changed,1);
 }
 const moved=next.map(t=>t===shared?{...t,origin:{...t.origin,z:t.origin.z+1}}:t);assert.equal(compareTreeInstances(first,moved).changed,1);
});
