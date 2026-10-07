// Exact committed baseline; setup and state comparisons are outside timing.
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {reserveTasks as candidate} from '../src/simulation/tasks.js';
const baselineRef=process.argv[2]??'332e242c';
let source=execFileSync('git',['show',baselineRef+':src/simulation/tasks.js'],{encoding:'utf8'});
for(const file of ['workforce.js','idle.js'])source=source.replace(`'./${file}'`,JSON.stringify(new URL('../src/simulation/'+file,import.meta.url).href));
const {reserveTasks:baseline}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(workers,tasks){
 const plants=Array.from({length:tasks},(_,i)=>({id:'p'+i,x:i%40,z:Math.floor(i/40)}));
 return {day:2,plants,crates:[],structures:[],tasks:plants.map((p,i)=>({id:'t'+i,created:i,centerId:'center',targetId:p.id,workerId:null,blocked:false})),workers:Array.from({length:workers},(_,i)=>({id:'w'+i,x:(i*17)%43,z:(i*7)%19,centerId:'center',status:'idle',taskId:null,contractDay:2,incapacitated:false}))};
}
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:sorted.length,medianMs:(sorted[11]+sorted[12])/2,p95Ms:sorted[22],maxMs:sorted.at(-1)};};
const cases=[];
for(const spec of [{workers:4,tasks:8,iterations:100},{workers:40,tasks:100,iterations:20},{workers:140,tasks:1600,iterations:4},{workers:40,tasks:100,iterations:10,blocked:true},{workers:140,tasks:160,iterations:2,blocked:true}]){
 const samples={baseline:[],candidate:[]},base=fixture(spec.workers,spec.tasks),canExecute=()=>!spec.blocked;
 for(let trial=0;trial<28;trial++){
  const states={baseline:Array.from({length:spec.iterations},()=>structuredClone(base)),candidate:Array.from({length:spec.iterations},()=>structuredClone(base))};
  for(const name of trial%2?['candidate','baseline']:['baseline','candidate']){
   const start=performance.now();for(const state of states[name])({baseline,candidate})[name](state,canExecute);
   if(trial>=4)samples[name].push(performance.now()-start);
  }
  assert.deepEqual(states.candidate,states.baseline);
 }
 cases.push({...spec,baseline:summarize(samples.baseline),candidate:summarize(samples.candidate)});
}
console.log(JSON.stringify({baselineRef,node:process.version,cases,scope:'Synthetic reservation CPU only, no A* route cost. Alternating pairs, four warmups excluded, full state equality for every pair. Existing campaigns and browser processes may compete for CPU. Not GPU, FPS, mobile or hundred-night acceptance.'},null,2));
