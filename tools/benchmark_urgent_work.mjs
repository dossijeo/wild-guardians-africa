import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {urgentWork} from '../src/simulation/locomotion.js';
import {PROFILES,contractExpired} from '../src/simulation/workforce.js';
import {BALANCE as B} from '../src/simulation/balance.js';
const output=process.argv[2];if(!output)throw Error('Usage: node tools/benchmark_urgent_work.mjs OUTPUT.json');
const revision=process.argv.find(a=>a.startsWith('--baseline='))?.slice('--baseline='.length)??'523e950',verifyOnly=process.argv.includes('--verify-only'),source=execFileSync('git',['show',revision+':src/simulation/locomotion.js'],{encoding:'utf8'});
const body=source.slice(source.indexOf('export function urgentWork('),source.indexOf('export function movePath(')).replace('export function','return function');
const reference=new Function('PROFILES','contractExpired','B',body)(PROFILES,contractExpired,B);
const hash=b=>createHash('sha256').update(b).digest('hex');
let seed=712;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const statuses=['walking','acting','carrying','arriving','idle','waiting','home','returning','fleeing','incapacitated'];
let decisions=0;
for(let trial=0;trial<500;trial++){
 const s={day:3,time:[0,249,250,299,300][Math.floor(random()*5)],workers:[],tasks:[]};
 for(let i=0,n=Math.floor(random()*40);i<n;i++)s.workers.push({id:'w'+i,centerId:'c'+Math.floor(random()*5),profile:PROFILES[Math.floor(random()*4)].id,status:statuses[Math.floor(random()*statuses.length)],incapacitated:random()<.2,contractDay:random()<.2?2:3});
 for(let i=0,n=Math.floor(random()*150);i<n;i++)s.tasks.push({centerId:'c'+Math.floor(random()*5),workerId:random()<.5?'assigned':null});
 const before=JSON.stringify(s);for(const w of s.workers){assert.equal(urgentWork(s,w),reference(s,w));decisions++;}assert.equal(JSON.stringify(s),before);
 // Re-query after same-pass task completion and employee departure; no stale
 // per-center count is allowed even when the array identity stays unchanged.
 s.tasks.pop();if(s.workers.length)s.workers[0].status='returning';
 for(const w of s.workers){assert.equal(urgentWork(s,w),reference(s,w));decisions++;}
}
const cases=[];
if(!verifyOnly)for(const [workers,tasks,centers,iterations] of [[4,8,1,500],[140,1600,1,12],[140,1600,5,12]]){
 const s={day:3,time:100,workers:Array.from({length:workers},(_,i)=>({id:'w'+i,centerId:'c'+i%centers,profile:PROFILES[i%4].id,status:'walking',contractDay:3})),tasks:Array.from({length:tasks},(_,i)=>({centerId:'c'+i%centers}))};
 const timings={reference:[],candidate:[]};let comparisons=0;
 for(let pair=0;pair<24;pair++){
  const sums={};for(const mode of pair%2?['candidate','reference']:['reference','candidate']){
   const select=mode==='reference'?reference:urgentWork,start=performance.now();let sum=0;
   for(let n=0;n<iterations;n++)for(const w of s.workers)sum+=Number(select(s,w));
   const elapsed=performance.now()-start;sums[mode]=sum;if(pair>=4)timings[mode].push(elapsed);
  }assert.equal(sums.candidate,sums.reference);comparisons++;
 }
 const summarize=a=>{const sorted=[...a].sort((a,b)=>a-b);return {median:(sorted[9]+sorted[10])/2,p95:sorted[18],max:sorted.at(-1),samples:a};};
 const row={workers,tasks,centers,iterations,comparisons,timings:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,summarize(v)]))};cases.push(row);console.log(JSON.stringify(row));
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:verifyOnly?'Behavior comparisons only; no timing samples.': 'Node CPU urgency queries only; no navigation, full-game frame, GPU, allocation-byte or mobile measurement. 24 alternating pairs per case, four warmups excluded. Live same-pass mutation comparisons use original source.',baselineRevision:revision,randomTrials:500,decisions,sourceHashes:{baseline:hash(source),candidate:hash(readFileSync('src/simulation/locomotion.js')),tool:hash(readFileSync('tools/benchmark_urgent_work.mjs'))},cases},null,2)+'\n');
