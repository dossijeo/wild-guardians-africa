import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2]&&process.argv[3],'Pass reference and candidate source roots');
const {Navigation:Reference,BIOME_IDS}=await import(pathToFileURL(resolve(process.argv[2],'src/world/navigation.js')));
const {Navigation:Candidate}=await import(pathToFileURL(resolve(process.argv[3],'src/world/navigation.js')));
const rows=[];let queries=0;
for(const biome of Object.keys(BIOME_IDS)){
 const profile=JSON.parse(readFileSync(resolve(process.argv[2],`public/content/biome-${BIOME_IDS[biome]}.json`),'utf8')).profile;
 const a=new Reference(712,biome,profile),b=new Candidate(712,biome,profile),counts=[0,0];
 for(const [i,nav] of [a,b].entries()){
  const original=nav.testSegmentClear;nav.testSegmentClear=function(...args){counts[i]++;return original.apply(this,args);};
  nav.obstacles=[{id:'gate',kind:'wall',material:'adobe',gate:true,yaw:Math.PI/4,x:0,z:0}];
 }
 let accepted=0;
 for(let i=0;i<24;i++)for(const radius of [.28,1.1])for(const worker of [false,true])for(let repeat=0;repeat<2;repeat++){
  const fractional=i%2?.375:0,start={x:i-12+fractional,z:i%7-3+fractional},end={x:start.x+3,z:start.z+2};
  const ignore=i%3===0?'gate':null,result=a.segmentClear(start,end,radius,ignore,worker);
  assert.equal(b.segmentClear(start,end,radius,ignore,worker),result);
  assert.equal(counts[1],counts[0],'Same physical-query cache misses');
  assert.deepEqual([...b.segmentCache],[...a.segmentCache],'Same ordered directed keys and results');
  queries++;if(result)accepted++;
 }
 rows.push({biome,queries:192,accepted,physicalQueries:counts[0],cachedEdges:a.segmentCache.size});
}
console.log(JSON.stringify({scope:'Six real procedural biomes with native scatter profiles, rotated gate, integer/fractional endpoints, worker/animal radii, ignored-obstacle permissions and repeat queries. Exact results, directed cache keys/order and physical-query counts compared.',queries,rows},null,2));
