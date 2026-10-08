import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
assert.ok(process.argv[2]&&process.argv[3]&&process.argv[4],'Pass reference, candidate and output');
const {TerrainField:A}=await import(pathToFileURL(resolve(process.argv[2],'src/world/terrain.js')));
const {TerrainField:B}=await import(pathToFileURL(resolve(process.argv[3],'src/world/terrain.js')));
let compared=0,boundaryQueries=0;const rows=[];
for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])for(const seed of ['712','12345','-98']){
 const c={biome,seed,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:[true,true,true,true,true,true]},a=new A(c),b=new B(c);
 const compare=(x,z)=>{assert.equal(b.height(x,z),a.height(x,z));assert.equal(b.surface(x,z),a.surface(x,z));compared+=2;};
 for(let i=0;i<1200;i++)compare(((i*7919)%20001-10000)/17,((i*3571)%18001-9000)/19);
 if(['savanna','grand_river','volcanoes'].includes(biome))for(let tx=-1;tx<=1;tx++)for(let tz=-1;tz<=1;tz++){
  const p=a.pond(tx,tz);for(const e of [-1e-8,-Number.EPSILON,0,Number.EPSILON,1e-8])for(const sign of [-1,1]){
   compare(p.x+sign*p.radius*(1.8+e),p.z);compare(p.x,p.z+sign*p.radius*(1.8+e));boundaryQueries+=4;
  }
 }
 rows.push({biome,seed,gridQueries:2400});
}
const c={biome:'savanna',seed:'712',relief:1,river:true},a=new A(c),b=new B(c);let callsA=0,callsB=0;
a.pondMetric=()=>{callsA++;return .4;};b.pondMetric=()=>{callsB++;return .4;};
for(const [x,z] of [[0,0],[100,100],[-100,-100]])assert.equal(b.height(x,z),a.height(x,z));assert.equal(callsB,callsA);assert.ok(callsA>0);
const out={scope:'Exact scalar height/surface samples and cutoff neighbors, no rendering, benchmark or complete route acceptance.',compared,boundaryQueries,rows,overriddenMetricCalls:{reference:callsA,candidate:callsB}};
writeFileSync(process.argv[4],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
