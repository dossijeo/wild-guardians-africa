import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
const ref=process.argv[2]??'f63d82db',output=process.argv[3];assert.ok(output);
const source=execFileSync('git',['show',ref+':src/world/navigation.js'],{encoding:'utf8'});
const resolved=source.replace(/from '(\.\/[^']+)'/g,(_match,path)=>`from '${new URL('../src/world/'+path,import.meta.url).href}'`);
const {Navigation:Before}=await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'));
const rows=[],checks=[];
for(const count of [1,20,100]){
 const walls=Array.from({length:count},(_,i)=>({kind:'wall',x:(i%10)*3,z:Math.floor(i/10)*3,yaw:i*.2,material:['madera','adobe','piedra','reforzado'][i%4],gate:i%7===0,baseScaleX:.8+i%3*.2}));
 const a=new Before(712,'sabana'),b=new Navigation(712,'sabana');
 for(const nav of [a,b]){nav.obstacles=walls;nav.propsAt=()=>[];nav.terrainValid=()=>true;}
 const queries=Array.from({length:1000},(_,i)=>({start:{x:(i%31)-5,z:(i%37)-8},end:{x:(i%29)-4,z:(i%41)-7},radius:[.28,.3,.6][i%3]}));
 const run=nav=>{let sum=0;for(let repeat=0;repeat<10;repeat++)for(const q of queries){sum+=nav.testWalkable(q.start.x,q.start.z,q.radius,null,false)?1:0;sum+=nav.testSegmentClear(q.start,q.end,q.radius,null,false)?1:0;}return sum;};
 assert.equal(run(a),run(b));checks.push({count,exact:true,pointAndSegmentQueries:20000});
 for(let iteration=-2;iteration<12;iteration++)for(const [mode,nav] of iteration%2?[['candidate',b],['reference',a]]:[['reference',a],['candidate',b]]){
  const started=performance.now(),sum=run(nav),ms=performance.now()-started;
  if(iteration>=0)rows.push({count,mode,iteration,sum,ms});
 }
}
for(const a of rows.filter(r=>r.mode==='reference'))assert.equal(a.sum,rows.find(b=>b.count===a.count&&b.iteration===a.iteration&&b.mode==='candidate').sum);
const median=values=>{const s=values.toSorted((a,b)=>a-b);return(s[5]+s[6])/2;};
const summary=[1,20,100].map(count=>({walls:count,referenceMs:median(rows.filter(r=>r.count===count&&r.mode==='reference').map(r=>r.ms)),candidateMs:median(rows.filter(r=>r.count===count&&r.mode==='candidate').map(r=>r.ms))}));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
writeFileSync(output,JSON.stringify({reference:ref,baselineSourceSha256:sha(source),candidateNavigationSha256:sha(readFileSync('src/world/navigation.js')),candidateFrameSha256:sha(readFileSync('src/world/wall-collision-frame.js')),checks,summary,rows,scope:'Isolated rigid wall collision CPU: identical native point/segment methods, empty props and terrain allowed, warm cache, 2 warmup pairs and 12 alternating measured pairs. Not whole navigation, GPU, FPS, memory or physical-mobile evidence.'},null,2)+'\n');
console.log(JSON.stringify(summary));
