import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {reserveTasks} from '../src/simulation/tasks.js';
import {contractExpired} from '../src/simulation/workforce.js';
import {cancelIdle} from '../src/simulation/idle.js';
const output=process.argv[2];if(!output)throw Error('Usage: node tools/benchmark_center_task_pools.mjs OUTPUT.json');
const revision='5e1ea92',source=execFileSync('git',['show',revision+':src/simulation/tasks.js'],{encoding:'utf8'});
const body=source.slice(source.indexOf('export function reserveTasks('),source.indexOf('export function releaseTask(')).replace('export function','return function');
const reference=new Function('contractExpired','cancelIdle',body)(contractExpired,cancelIdle);
const hash=b=>createHash('sha256').update(b).digest('hex'),cases=[];
for(const centers of [1,5])for(const blocked of [false,true]){
 const state={day:2,plants:Array.from({length:10000},(_,i)=>({id:'p'+i,x:i%50,z:Math.floor(i/50)})),crates:[],structures:[],
  tasks:Array.from({length:1600},(_,i)=>({id:'t'+i,created:i,centerId:'c'+i%centers,targetId:'p'+(8400+i),workerId:null,blocked:i%3===0})),
  workers:Array.from({length:140},(_,i)=>({id:'w'+i,x:i%30,z:0,centerId:'c'+i%centers,status:'idle',taskId:null,contractDay:2,incapacitated:false,idleState:{mode:'rest'}}))};
 const reachable=(w,t)=>!blocked||Number(t.id.slice(1))%7!==0&&Number(w.id.slice(1))%11!==0;
 const timings={reference:[],candidate:[]};let comparisons=0;
 for(let pair=0;pair<24;pair++){
  const copies={reference:structuredClone(state),candidate:structuredClone(state)};
  for(const mode of pair%2?['candidate','reference']:['reference','candidate']){
   const start=performance.now();(mode==='reference'?reference:reserveTasks)(copies[mode],reachable);
   const elapsed=performance.now()-start;if(pair>=4)timings[mode].push(elapsed);
  }
  assert.deepEqual(copies.candidate,copies.reference);comparisons++;
 }
 const summarize=a=>{const s=[...a].sort((a,b)=>a-b);return {median:(s[9]+s[10])/2,p95:s[18],max:s.at(-1),samples:a};};
 const row={centers,blocked,comparisons,timings:Object.fromEntries(Object.entries(timings).map(([k,a])=>[k,summarize(a)]))};cases.push(row);console.log(JSON.stringify(row));
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:'Synthetic Node CPU reservation passes: 10000 historical crops,1600 queued targets,140 employees. No A* cost; cloning excluded,24 alternating pairs/case,4 warmups. Not full-game/GPU/phone timing.',
 baselineRevision:revision,sourceHashes:{baseline:hash(source),candidate:hash(readFileSync('src/simulation/tasks.js')),tool:hash(readFileSync('tools/benchmark_center_task_pools.mjs'))},cases},null,2)+'\n');
