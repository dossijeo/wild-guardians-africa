import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeIdleMovingTask} from './helpers/native-idle-moving-task.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

function queue(f,kind='initial'){
 const p=f.point(6,0),target=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);if(kind==='water'){target.water[0].status='manual';target.water[1].status='due';target.growth=target.water[1].at;}f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});const task=enqueue(f.state,f.worker.centerId,kind,target.id);return {target,task};
}
for(const kind of ['initial','water'])test(`ordinary planner ${kind} choice during22 waits for its actual prepared stop`,()=>{
 const f=controlledNativeIdleMovingTask({stop:false});try{
  const {task,target}=queue(f,kind),body=f.body(1),peer=f.body(3);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),0);f.advance(.05);f.planner.projectNativeIdleStroll(f.state,f.worker);
  assert.equal(task.workerId,null);assert.equal(f.worker.taskId,null);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert(f.walkLease.isCurrent());assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  const choice=f.planner.nativeIdleStrollStopRequest(f.actor);assert.equal(choice.reason,'task');assert.equal(choice.taskId,task.id);assert.equal(choice.binding.reference.bodyId,1);
  f.advance(.05);f.planner.projectNativeIdleStroll(f.state,f.worker);assert.deepEqual(f.planner.nativeIdleStrollStopRequest(f.actor),choice);assert.equal(f.planner.pendingTaskRoute(f.actor),null);
  target.alive=false;emit(f.state,'CropDestroyed',{targetId:target.id});assert.equal(f.planner.nativeIdleStrollStopRequest(f.actor),null,'dirty target cannot retain an obsolete stop choice');assert(f.walkLease.isCurrent());
 }finally{f.close();}
});

test('deferred WALK choice wakes only after its actual REST successor when WALK finishes before stop',()=>{
 const f=controlledNativeIdleMovingTask({stop:false});try{
  const {task}=queue(f);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);
  assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),0);
  const stop=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(stop.status,'proposed');
  f.advance(f.strollBinding.reference.endTime-f.state.elapsed+.1);assert(f.planner.projectNativeIdleStroll(f.state,f.worker).arrived);
  assert.equal(f.planner.planIfNeeded(f.state.elapsed),null);assert.equal(f.planner.nativeIdleStrollStopRequest(f.actor),null);assert.equal(task.workerId,null);
  assert(f.planner.cancelNativeIdleStrollStopProposal(stop.ticket));assert.equal(f.planner.planIfNeeded(f.state.elapsed),null,'cancelling an uncommitted stop does not transfer ownership');
  const prepared=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(prepared.status,'proposed');const rest=prepared.proposal;
  const lease=f.c.admitIdleCycle(rest.nativeIdleCycle,{preparingWorldBoundary:rest.worldBoundary});
  assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),rest.ticket.ticket),1);f.planner.commitNativeCausalClock();const binding=f.planner.nativeIdleCycleBinding(f.actor);f.c.installIdleCycles(binding.reference.worldBoundary,[binding]);f.planner.projectNativeIdleCycle(f.state,f.worker);assert(lease.isCurrent());
  const next=f.planner.planIfNeeded(f.state.elapsed);assert.equal(next.find(r=>r.status===1).taskId,Number(task.id.split('-').at(-1)));
  f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(f.planner.planIfNeeded(f.state.elapsed),null,'repeated projection does not replan');
  assert.equal(f.planner.commitTaskBatchToState(f.state,next,{navVersion:1,pendingResources:true}),1);assert.equal(task.workerId,f.worker.id);
 }finally{f.close();}
});

for(const kind of ['initial','water'])test(`ordinary authority ${kind} while22 is acquired traverses stop12, Task14, action and one real watering`,async()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0];let f;
 try{
  const farm=saved.state.structures.find(s=>s.id===worker.centerId);farm.x=worker.x-6;farm.z=worker.z+6;
  let target;
  if(kind==='water'){const plant=createPlant(`plant-${saved.state.nextId++}`,'mijo',farm.x,farm.z+4,worker.centerId);plant.water[0].status='manual';plant.growth=plant.water[1].at-.2;saved.state.plants.push(plant);target=plant.id;}
  f=await nativeProductionAuthority(saved.state);await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll'&&r.committed));f.advance(.05);await f.present();
  const before=f.snapshot();assert.equal(before.workers[0].nativeRouteAdmission,'native-idle-stroll');
  const center=before.structures.find(s=>s.id===worker.centerId);let result;
  if(kind==='initial'){
  for(const [dx,dz]of [[0,4],[4,0],[-4,0],[0,-4],[2,3],[-2,3]]){result=f.command({kind:'plant',id:`moving-plant-${dx}-${dz}`,species:'mijo',x:center.x+dx,z:center.z+dz});if(result.value===true)break;}
  assert.equal(result.value,true,JSON.stringify(result));target=JSON.parse(result.snapshot).events.findLast(e=>e.type==='CropPlaced').targetId;
  }else{assert.equal(before.plants.find(p=>p.id===target).water[1].status,'future');f.advance(.3);}
  f.advance(.05);await f.present();await untilProduction(f,()=>f.records.some(r=>r.kind==='idle-stroll-stop'&&r.committed));
  f.advance(.05);await f.present();await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  for(let i=0;i<1000&&!f.snapshot().events.some(e=>e.type==='WaterSatisfied'&&e.targetId===target);i++){f.advance(.1);await f.present();}
  const state=f.snapshot();assert.equal(state.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===target).length,1);
  const stop=f.records.find(r=>r.kind==='idle-stroll-stop'),start=f.records.find(r=>r.kind==='task-start');assert(stop.committed);assert.equal(start.resources.bodyId,1);assert.equal(start.resources.targetId,Number(target.split('-').at(-1)));
  assert.equal(state.plants.find(p=>p.id===target).water[kind==='initial'?0:1].status,'manual');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();}
});
