import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createOpeningWorld} from './check_opening.mjs';
import {fluidAt} from '../src/world/fluid-placement.js';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const reference=process.argv[2];assert.ok(reference,'Pass an explicit frozen reference root');
const {fluidAt:completeAt}=await import(pathToFileURL(resolve(reference,'src/world/fluid-placement.js')));
const rows=[];
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const {nav,s}=createOpeningWorld({biome}),field=nav.field,center=s.structures[0],points=[];
 for(let z=-24;z<=24;z+=1.5)for(let x=-24;x<=24;x+=1.5)points.push([center.x+x+.28,center.z+z-.28]);
 for(const [x,z] of points)assert.equal(fluidAt(field,x,z),completeAt(field,x,z));
 let checksum=0;const run=fast=>{const start=performance.now();for(let i=0;i<10;i++)for(const [x,z] of points)checksum+=fast?Number(fluidAt(field,x,z)):Number(completeAt(field,x,z));return performance.now()-start;};
 for(let i=0;i<3;i++){run(false);run(true);}
 const samples=[];for(let i=0;i<10;i++){const row={};for(const fast of i%2?[true,false]:[false,true])row[fast?'boolean':'complete']=run(fast);samples.push(row);}
 const median=key=>{const a=samples.map(s=>s[key]).sort((a,b)=>a-b);return (a[4]+a[5])/2;};
 rows.push({biome,points:points.length,repeats:10,checksum,medianMs:{complete:median('complete'),boolean:median('boolean')},samples});
}
console.log(JSON.stringify({scope:'Native CPU fluid probes through the actual old and new fluidAt functions, original full-query occupancy verified at each point before measurement; three warmups and ten alternating samples. Mangrove retains the full query. No GPU, mobile, FPS or image claim.',referenceRoot:reference,rows},null,2));
