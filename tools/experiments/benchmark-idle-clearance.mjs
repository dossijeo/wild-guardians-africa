import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {updateIdle} from '../../src/simulation/idle.js';
import {createWorkerBodyIndex} from '../../src/simulation/actor-motion.js';

const anchor={id:'benchmark-center',x:0,z:0};
const nav={version:1,path:()=>{throw Error('Unexpected route query')},
  segmentClear:()=>true,walkable:()=>true};
function setup(count){
  const workers=Array.from({length:count},(_,i)=>{
    const x=i*30,z=0,id=`worker-${i}`;
    return {id,personId:id,profile:'youngMale',status:'idle',x,z,
      radius:.28,path:[{x:x+1000,z}],pathVersion:1,destinationId:`idle-${id}`,
      idleState:{anchorId:anchor.id,mode:'walk',elapsed:0,rng:1,
        remaining:1000,approachRetry:0,pathVersion:1,
        destination:{id:`idle-${id}`,x:x+1000,z}}};
  });
  return {workers,raid:null};
}
function run(count,ticks,variant){
  const state=setup(count),start=performance.now();
  for(let tick=0;tick<ticks;tick++){
    const index=variant==='indexed'?createWorkerBodyIndex(state.workers):null;
    for(const worker of state.workers){
      updateIdle(worker,anchor,.01,nav,712,[],variant==='control'?null:state,index);
      index?.update(worker);
    }
  }
  const ms=performance.now()-start;
  return {ms,x:state.workers[0].x,heapBytes:process.memoryUsage().heapUsed};
}
const counts=[10,50,150,300],ticks=200,rounds=4,rows=[];
for(const count of counts){
  for(const variant of ['control','linear','indexed'])run(count,40,variant);
  for(let round=0;round<rounds;round++){
    const order=round%2?['indexed','linear','control','control','linear','indexed']:
      ['control','linear','indexed','indexed','linear','control'];
    for(const variant of order){
      const result=run(count,ticks,variant);
      rows.push({count,ticks,round,variant,...result});
    }
  }
  assert.equal(new Set(rows.filter(row=>row.count===count).map(row=>row.x)).size,1,
    'Body indexing must preserve movement in the separated-actor benchmark');
}
const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b),middle=sorted.length/2;
  return (sorted[middle-1]+sorted[middle])/2;
};
const summary=counts.flatMap(count=>['control','linear','indexed'].map(variant=>{
  const samples=rows.filter(row=>row.count===count&&row.variant===variant);
  return {count,variant,medianMs:median(samples.map(row=>row.ms)),
    minMs:Math.min(...samples.map(row=>row.ms)),maxMs:Math.max(...samples.map(row=>row.ms))};
}));
console.log(JSON.stringify({source:'benchmark-idle-clearance',ticks,rounds,summary,rows},null,2));
