import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {chunkBounds} from '../src/rendering/water-source.js';
import {sampleFarTrees,treeAtlasAnchor,compareTreeInstances} from '../tools/experiments/far-tree-sampling.js';
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
for(const biome of biomes)test(`${biome}: far species keep exact native identities across seed and chunk boundaries`,()=>{
 const profile=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')).profile,slots=biome==='canyons'?[0,1]:[0,1,2,3];
 for(const seed of [712,42]){
  const config={seed:String(seed),biome,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)},field=new TerrainField(config),all=[];
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   const bounds=chunkBounds(x,z),native=scatterWorld({...config,cx:x,cz:z},profile,field).instances;
   const expected=slots.flatMap(slot=>native[slot].map(tree=>({...tree,slot})));
   assert.deepEqual(sampleFarTrees(config,profile,bounds,{field}),expected);all.push(...expected);
  }
  const bounds={minX:-72,minZ:-72,maxX:72,maxZ:72},whole=sampleFarTrees(config,profile,bounds,{field}),byId=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(byId(whole),byId(all));assert.equal(new Set(whole.map(t=>t.id)).size,whole.length);
  const suppressed=new Set(whole.slice(0,3).map(t=>t.id));
  assert.deepEqual(byId(sampleFarTrees(config,profile,bounds,{field,suppressed})),whole.filter(t=>!suppressed.has(t.id)));
  const base=[.15,.02,-.35],moved=sampleFarTrees(config,profile,{minX:-120,minZ:-120,maxX:120,maxZ:120},{field});
  const match=compareTreeInstances(whole.map(t=>treeAtlasAnchor(t,base)),moved.map(t=>treeAtlasAnchor(t,base)));
  assert.equal(match.shared,whole.length);assert.equal(match.changed,0);
 }
});
test('far vegetation accepts only real large-tree slots and never canyon mesa slots',()=>{
 const config={biome:'canyons'},profile={};
 assert.throws(()=>sampleFarTrees(config,profile,{minX:0,minZ:0,maxX:1,maxZ:1},{slots:[2]}),/slots/);
 assert.throws(()=>sampleFarTrees({...config,biome:'unknown'},profile,{minX:0,minZ:0,maxX:1,maxZ:1}),/biome/);
});
