import assert from 'node:assert/strict';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {reserveTasks} from '../src/simulation/tasks.js';
assert.ok(process.argv[2],'Pass a frozen reference root');assert.ok(process.argv[3],'Pass output JSON');
const reference=(await import(pathToFileURL(resolve(process.argv[2],'src/simulation/tasks.js')))).reserveTasks;
function fixture(){return {day:2,workers:Array.from({length:114},(_,i)=>({id:'worker-'+i,status:'acting',taskId:'occupied-'+i,contractDay:2})),plants:Array.from({length:14558},(_,i)=>({id:'plot-'+i,alive:i>=14300})),crates:Array.from({length:14095},(_,i)=>({id:'crate-'+i,delivered:i<14090})),structures:[{id:'wall'}],tasks:Array.from({length:1200},(_,i)=>({id:'task-'+i,created:i,centerId:'center',targetId:i%4===0?'missing-'+i:i%4===1?'plot-'+(14300+i%258):i%4===2?'crate-'+(14090+i%5):'wall',workerId:i%7===0?'reserved':null,blocked:i%5!==0}))};}
const rows=[],timings={reference:[],candidate:[]};let expectedHash;
for(let trial=0;trial<20;trial++){
 const pair={};for(const mode of trial%2?['candidate','reference']:['reference','candidate']){
  const state=fixture(),start=performance.now();(mode==='reference'?reference:reserveTasks)(state,()=>{throw Error('Busy worker queried a route');});const ms=performance.now()-start;
  const serialized=JSON.stringify(state),hash=createHash('sha256').update(serialized).digest('hex');expectedHash??=hash;assert.equal(hash,expectedHash);pair[mode]={ms,hash};if(trial>=10)timings[mode].push(ms);
 }if(trial>=10)rows.push(pair);
}
const counted={};for(const mode of ['reference','candidate']){
 const state=fixture();let reads=0;for(const group of [state.plants,state.crates,state.structures])for(const entity of group){const id=entity.id;Object.defineProperty(entity,'id',{enumerable:true,get(){reads++;return id;}});}
 (mode==='reference'?reference:reserveTasks)(state,()=>{throw Error('Unexpected route');});counted[mode]=reads;
}
const median=a=>{const sorted=[...a].sort((a,b)=>a-b);return (sorted[4]+sorted[5])/2;};
const report={scope:'Synthetic historical farm reservation maintenance only; 14558 plants, 14095 crates, 1200 queued tasks and 114 occupied workers. Setup, serialization and hashing excluded from timings. Ten warmup pairs and ten alternating timed pairs. No native terrain, render, audio, FPS, GPU, phone or economic campaign claim.',node:process.version,referenceRoot:resolve(process.argv[2]),fullStateHash:expectedHash,rows,medianMs:{reference:median(timings.reference),candidate:median(timings.candidate)},candidateWins:rows.filter(r=>r.candidate.ms<r.reference.ms).length,idReads:counted};writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
