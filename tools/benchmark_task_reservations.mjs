// CPU diagnostic only: excludes setup/cloning and makes no GPU/FPS claim.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {reserveTasks} from '../src/simulation/tasks.js';
import {contractExpired} from '../src/simulation/workforce.js';
import {cancelIdle} from '../src/simulation/idle.js';

function previous(state) {
  for(const t of [...state.tasks].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))) {
    if(t.workerId)continue;
    const target=[...state.plants,...state.crates,...state.structures].find(e=>e.id===t.targetId);
    if(!target)continue;
    const workers=state.workers.filter(w=>w.centerId===t.centerId&&w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state));
    workers.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
    const worker=workers.find(()=>true);t.blocked=!worker&&workers.length>0;
    if(worker){cancelIdle(worker);t.workerId=worker.id;worker.taskId=t.id;worker.status='walking';}
  }
}
const source={day:2,
  plants:Array.from({length:14558},(_,i)=>({id:'plant-'+i,x:i%25,z:Math.floor(i/25),alive:i>=14300})),
  crates:Array.from({length:14095},(_,i)=>({id:'crate-'+i,x:i%25,z:0,delivered:i<14090})),
  structures:[{id:'center',x:0,z:0}],
  tasks:Array.from({length:100},(_,i)=>({id:'task-'+i,created:i,centerId:'center',targetId:'plant-'+(14300+i),workerId:null,blocked:false})),
  workers:Array.from({length:40},(_,i)=>({id:'worker-'+i,x:i%10,z:0,centerId:'center',status:'idle',taskId:null,contractDay:2,incapacitated:false}))};
const timings={previous:[],shared:[]};
for(let trial=0;trial<25;trial++) {
  const states={previous:structuredClone(source),shared:structuredClone(source)};
  // Alternate order to reduce a systematic warm-up/order advantage.
  for(const name of trial%2?['shared','previous']:['previous','shared']) {
    const start=performance.now();(name==='previous'?previous:reserveTasks)(states[name]);
    const duration=performance.now()-start;if(trial>=5)timings[name].push(duration);
  }
  assert.deepEqual(states.shared,states.previous);
}
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:sorted.length,minMs:sorted[0],medianMs:(sorted[9]+sorted[10])/2,p90Ms:sorted[17],maxMs:sorted.at(-1)};};
console.log(JSON.stringify({node:process.version,scope:'Synthetic CPU reservation benchmark: 14558 historical crops, 14095 crates, 100 pending tasks and 40 idle workers; no route-search cost, setup excluded, full state equivalence checked. Not a frame, GPU or phone benchmark.',previous:summary(timings.previous),shared:summary(timings.shared)},null,2));
