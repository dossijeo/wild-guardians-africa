// Compare separate and shared production updates; no render or decoding cost.
import {AudioSystem} from '../src/audio/audio.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import assert from 'node:assert/strict';
const output=resolve(process.argv[2]??'.cache/audio-task-frame.json');
const report={node:process.version,scope:'same production modules, isolated CPU, 100 workers and 1000 tasks',warmup:100,samples:500,cases:[]};
for(const status of ['idle','walking','acting']){
 const lots=[];
 for(const mode of ['separate','shared','shared','separate']){
  const audio=new AudioSystem({sfx:1,music:1});audio.context={state:'running',currentTime:0};audio.sound=()=>null;audio.stopVoice=()=>{};
  const tasks=Array.from({length:1000},(_,i)=>({id:`t${i}`,workerId:`w${i}`,kind:'water',targetId:`p${i}`}));
  const workers=Array.from({length:100},(_,i)=>({id:`w${i}`,profile:'olderFemale',status,taskId:status==='idle'?null:`t${i}`,actionRemaining:3.4,x:i,z:0}));
  const state={elapsed:0,workers,plants:Array.from({length:1000},(_,i)=>({id:`p${i}`,alive:true})),crates:[],pauses:[]};let reads=0;
  Object.defineProperty(state,'tasks',{get(){reads++;return tasks;}});
  const domain=JSON.stringify({tasks,workers,plants:state.plants});
  const update=mode==='shared'?()=>audio.updateFarmActors(state):()=>{audio.updateWorkers(state);audio.updateWork(state);audio.updateFarm(state);};
  for(let i=0;i<report.warmup;i++){state.elapsed+=.016;update();}
  reads=0;const samples=[];
  for(let i=0;i<report.samples;i++){state.elapsed+=.016;const start=performance.now();update();samples.push(performance.now()-start);}
  assert.equal(JSON.stringify({tasks,workers,plants:state.plants}),domain);
  assert.equal(reads,report.samples*(status==='idle'?0:status==='walking'||mode==='shared'?1:3));
  audio.workers.dispose();audio.work.dispose();audio.farm.dispose();lots.push({mode,reads,samples});
 }
 const summary=mode=>{const values=lots.filter(l=>l.mode===mode).flatMap(l=>l.samples).sort((a,b)=>a-b);return {medianMs:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)]};};
 report.cases.push({status,separate:summary('separate'),shared:summary('shared'),lots});
}
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.cases.map(({status,separate,shared})=>({status,separate,shared})),null,2));
