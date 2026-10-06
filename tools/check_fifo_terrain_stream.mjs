import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
assert.ok(process.argv[2],'Pass explicit frozen reference root');
const Reference=await import(pathToFileURL(resolve(process.argv[2],'src/world/terrain.js')));
const rows=[];
for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
 const config={seed:'712',biome,relief:1,density:1,river:true,n:1,layers:Array(6).fill(true)};
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${biome}.json`,import.meta.url))).profile;
 const fields={reference:new Reference.TerrainField(config),candidate:new TerrainField(config)},hashes={reference:createHash('sha256'),candidate:createHash('sha256')},evictions={reference:0,candidate:0};
 for(const mode of Object.keys(fields)){const map=fields[mode].heightCache,remove=map.delete;map.delete=function(key){evictions[mode]++;return remove.call(this,key);};}
 let samples=0,props=0;
 for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++){
  const results={};
  for(const mode of Object.keys(fields)){
   const values=Buffer.alloc(65*65*8);let i=0;
   for(let z=0;z<=64;z++)for(let x=0;x<=64;x++)values.writeDoubleLE(fields[mode].surface(cx*48-24+x*.75,cz*48-24+z*.75),8*i++);
   results[mode]=values;hashes[mode].update(values);
  }
  assert.deepEqual(results.candidate,results.reference,`${biome} surface changed at ${cx},${cz}`);samples+=65*65;
  const expected=Reference.scatterWorld({...config,cx,cz},profile,fields.reference),actual=scatterWorld({...config,cx,cz},profile,fields.candidate);
  assert.deepEqual(actual,expected,`${biome} vegetation changed at ${cx},${cz}`);props+=actual.instances.reduce((n,a)=>n+a.length,0);
  assert.deepEqual([...fields.candidate.heightCache],[...fields.reference.heightCache],`${biome} FIFO order changed`);
 }
 assert.ok(evictions.reference>0);assert.equal(evictions.candidate,evictions.reference);
 const referenceSha256=hashes.reference.digest('hex'),candidateSha256=hashes.candidate.digest('hex');assert.equal(candidateSha256,referenceSha256);
 rows.push({biome,chunks:9,samples,props,evictions,heightCacheLimit:12000,referenceSha256,candidateSha256,exactHeightAndVegetationAndCacheOrder:true});
}
console.log(JSON.stringify({scope:'Nine streamed native terrain chunks per biome, exact Float64 surface samples, full procedural prop instances and final cache insertion order compared with frozen reference; forces actual height cache eviction. No rendering or frame-rate acceptance.',rows},null,2));
