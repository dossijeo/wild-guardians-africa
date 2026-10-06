import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2]&&process.argv[3],'Pass reference and candidate source roots');
const load=root=>import(pathToFileURL(resolve(root,'src/world/navigation.js')));
const {Navigation:Original}=await load(process.argv[2]),{Navigation:Candidate}=await load(process.argv[3]);
const biomes=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'];
let queries=0,calls=0;const rows=[];
for(const biome of biomes){
 const a=new Original(712,biome,{}),b=new Candidate(712,biome,{});let left=[],right=[];
 for(const [nav,trace] of [[a,left],[b,right]])for(const method of ['surface','slope','waterInfo','fluidInside']){const fn=nav.field[method];nav.field[method]=function(...args){const result=fn.apply(this,args);trace.push([method,args,result]);return result;};}
 let accepted=0,biomeCalls=0;
 for(let i=0;i<60;i++)for(const radius of [0,.28,.9])for(const worker of [false,true])for(const allowFluid of [false,true]){
  left.length=right.length=0;const x=(i*17.3)%173-86.5,z=(i*31.7)%179-89.5;
  const value=a.terrainValid(x,z,radius,worker,allowFluid);assert.equal(b.terrainValid(x,z,radius,worker,allowFluid),value);assert.deepEqual(right,left);queries++;calls+=left.length;biomeCalls+=left.length;if(value)accepted++;
 }
 rows.push({biome,queries:720,accepted,observedTerrainCalls:biomeCalls});
}
console.log(JSON.stringify({scope:'Six real procedural terrain fields, same seed, 60 fractional positions per biome, three radii, worker/animal and allowFluid states. Exact booleans and ordered terrain-method arguments/results compared.',queries,observedTerrainCalls:calls,rows},null,2));
