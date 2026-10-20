import {performance} from 'node:perf_hooks';
import {walkTo} from '../../src/simulation/game.js';

const count=Number(process.argv[2]??50);
const steps=Number(process.argv[3]??100);
const nav={version:1,path:(_actor,target)=>[{x:target.x,z:target.z}],
  segmentClear:()=>true,workerMotionClear:()=>true,walkable:()=>true};
const makeState=()=>({elapsed:0,structures:[],raid:null,workers:Array.from({length:count},(_,i)=>({
  id:`worker-${i}`,personId:`person-${i}`,status:'walking',
  x:0,z:i*3,radius:.28,path:[{x:100,z:i*3}],destinationId:`goal-${i}`,
  pathVersion:1,runRemaining:50
}))});
for(let j=0;j<3;j++){
  const state=makeState();
  const destinations=state.workers.map((w,i)=>({id:`goal-${i}`,x:100,z:w.z}));
  const start=performance.now();
  for(let step=0;step<steps;step++){
    state.elapsed+=.1;
    for(let i=0;i<count;i++)walkTo(state,state.workers[i],destinations[i],.1,nav);
  }
  console.log(JSON.stringify({workers:count,steps,run:j,ms:performance.now()-start}));
}
