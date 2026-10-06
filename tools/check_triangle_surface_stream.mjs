import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {buildGroundData} from '../src/rendering/terrain-source.js';
const root=process.argv[2];assert.ok(root,'Pass explicit frozen reference root');
const Reference=await import(pathToFileURL(resolve(root,'src/world/terrain.js'))),rows=[];
for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
 const config={seed:'712',biome,relief:1,density:1,river:true,n:1,layers:Array(6).fill(true)},profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${biome}.json`,import.meta.url))).profile;
 const fields={reference:new Reference.TerrainField(config),candidate:new TerrainField(config)},hashes={reference:createHash('sha256'),candidate:createHash('sha256')},probes={reference:0,candidate:0},evictions={reference:0,candidate:0};
 for(const mode of Object.keys(fields)){
  const f=fields[mode],lattice=f.lattice.bind(f);f.lattice=(...a)=>{probes[mode]++;return lattice(...a);};
  const map=f.heightCache,remove=map.delete;map.delete=function(key){evictions[mode]++;return remove.call(this,key);};
 }
 let samples=0,props=0,groundValues=0;
 for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){
  const results={};
  for(const mode of Object.keys(fields)){
   const bytes=Buffer.alloc(65*65*8);let i=0;
   for(let z=0;z<=64;z++)for(let x=0;x<=64;x++)bytes.writeDoubleLE(fields[mode].surface(cx*48-24+x*.75,cz*48-24+z*.75),8*i++);
   results[mode]=bytes;hashes[mode].update(bytes);
  }
  assert.deepEqual(results.candidate,results.reference,`${biome} surface ${cx},${cz}`);samples+=65*65;
  const expectedGround=buildGroundData(fields.reference,profile,cx,cz),actualGround=buildGroundData(fields.candidate,profile,cx,cz);
  assert.deepEqual(actualGround,expectedGround,`${biome} vertices/colors/normals ${cx},${cz}`);groundValues+=actualGround.length;
  const expected=Reference.scatterWorld({...config,cx,cz},profile,fields.reference),actual=scatterWorld({...config,cx,cz},profile,fields.candidate);
  assert.deepEqual(actual,expected,`${biome} props ${cx},${cz}`);props+=actual.instances.reduce((n,a)=>n+a.length,0);
  for(const field of Object.values(fields))assert.ok(field.heightCache.size<=12000);
 }
 assert.ok(evictions.reference>0&&evictions.candidate>0);assert.ok(probes.candidate<probes.reference);
 const referenceSha256=hashes.reference.digest('hex'),candidateSha256=hashes.candidate.digest('hex');assert.equal(candidateSha256,referenceSha256);
 rows.push({biome,chunks:9,samples,props,groundValues,probes,evictions,heightCacheLimit:12000,referenceSha256,candidateSha256,exactHeightGroundAndVegetation:true});
}
console.log(JSON.stringify({scope:'54 streamed native chunks, exact Float64 heights, Float32 ground vertices/colors/normals and all prop instances compared to frozen reference. Both caches evict within their original limit. Cache insertion order intentionally differs when unused samples are omitted; no GPU/FPS/mobile claim.',rows},null,2));
