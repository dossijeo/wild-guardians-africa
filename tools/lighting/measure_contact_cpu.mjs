import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {NativeContacts} from '../../src/rendering/contacts.js';
const prototypes=Array.from({length:20},()=>({group:0,radius:1})),layers=[true,true,true,true],chunks=new Map();
const percentile=(v,p)=>v.slice().sort((a,b)=>a-b)[Math.floor((v.length-1)*p)];
const summary=v=>({samples:v.length,medianMs:percentile(v,.5),p95Ms:percentile(v,.95)});
const results=[];
for(const count of [0,50,200])for(const buildings of [false,true]){
 const state={structures:Array.from({length:count},(_,i)=>({id:'wall-'+i,kind:'wall',status:'intact',material:'adobe',x:i%20*3-30,z:Math.floor(i/20)*3-15,yaw:i%3*.4,hp:100,maxHp:100}))};
 const c=new NativeContacts({buildings}),cached=[],rebuild=[];
 for(let i=0;i<125;i++){const start=performance.now();c.update(chunks,prototypes,[-40,-40,40,40],i,layers,state);const dt=performance.now()-start;if(i>=25)rebuild.push(dt);}
 for(let i=0;i<1100;i++){const start=performance.now();c.update(chunks,prototypes,[-40,-40,40,40],124,layers,state);const dt=performance.now()-start;if(i>=100)cached.push(dt);}
 results.push({walls:count,buildings,cached:summary(cached),rebuild:summary(rebuild)});c.dispose();
}
const report={scope:'Node CPU microbenchmark, empty natural-prop chunks, 256 squared atlas. Includes cache-key construction and rasterization; excludes GPU upload, browser scheduling and full-game frametime.',results};
writeFileSync(process.argv[2]??'docs/lighting-reference/wall-contact-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results));
