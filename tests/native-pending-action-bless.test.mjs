import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActionSave} from '../tests/helpers/native-task-action-restoration.js';
import {nativeProductionAuthority,untilProduction} from '../tests/helpers/native-production-authority.js';
import {createPlant} from '../src/simulation/crops.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function declarationIsolation(f,reference,request){
 const clock=f.host.inspect().nativeCausalClock;
 const make=(source=request,epoch=request.authorityEpoch)=>{
  const c=createNativeRouteControl({authorityEpoch:epoch,initialSequence:clock.intentSequence,initialTime:clock.committedThrough,pendingActionRequests:source?[source]:[]});
  c.acceptClock({...clock,authorityEpoch:epoch,anchorAbsoluteMs:1000,anchorLogicalTime:clock.committedThrough},{baseline:true});return c;
 };
 const controls=[];try{
  const c=make();controls.push(c);const lease=c.admitInitialIdleBody(reference,{preparingWorldBoundary:reference.worldBoundary});
  assert.equal(lease.isPrepared(),true);assert.equal(lease.isCurrent(),false);
  const absent=make(null);controls.push(absent);assert.throws(()=>absent.admitInitialIdleBody(reference,{preparingWorldBoundary:reference.worldBoundary}),/obsolete|source/);
  const fresh=make({...request,authorityEpoch:'new-restoration-epoch'},'new-restoration-epoch');controls.push(fresh);assert.throws(()=>fresh.admitInitialIdleBody(reference,{preparingWorldBoundary:reference.worldBoundary}),/obsolete|source/);
  for(const change of [{nativeSession:request.nativeSession+1},{sourceSequence:request.requestSequence+1},{sourceAt:request.requestedAt+.01},{phase:15}]){
   const bad=structuredClone(reference);Object.assign(bad.cancellationSource,change);
   assert.throws(()=>c.admitInitialIdleBody(bad,{preparingWorldBoundary:bad.worldBoundary}));assert.equal(lease.isCurrent(),false);
  }
 }finally{controls.forEach(c=>c.dispose());}
}

async function settle(f,promise){let done=false;promise.then(()=>{done=true;},()=>{done=true;});for(let i=0;i<2000&&!done;i++)await f.present();assert(done,'Prepared operation did not settle');return promise;}
async function setup(kind,options={}){
 const {saved,oldBinding}=nativeActionSave({kind,progress:.6}),worker=saved.workers[0];
 saved.workers=[worker];saved.tasks=saved.tasks.filter(t=>t.workerId===worker.id);
 const task=saved.tasks[0],plant=saved.plants.find(p=>p.id===task.targetId);
 Object.assign(plant,createPlant(plant.id,plant.species,plant.x,plant.z,plant.centerId));
 if(kind==='water'){plant.water[0].status='manual';plant.water[1].status='due';plant.growth=plant.water[1].at;}
 saved.plants=[plant];Object.assign(awakeningState(saved),{enabled:true,progress:100});
 const f=await nativeProductionAuthority(saved,options);
 return {f,task,oldBinding,command:{kind:'bless',id:'pending-restored-'+kind,targetId:task.targetId}};
}
function unchanged(f,before,command){const s=f.snapshot();assert.equal(s.awakenings.progress,100);assert.equal(s.plants[0].blessing,undefined);assert.deepEqual(s.workers[0].nativeTaskAction,before.workers[0].nativeTaskAction);assert.equal(s.workers[0].nativeRouteAdmission,'pending-action-resources');assert.equal(s.workers[0].taskId,before.workers[0].taskId);assert(!s.commandIds.includes(command.id));assert(!s.events.some(e=>e.type==='WaterSatisfied'||e.type==='BlessingApplied'));}

for(const kind of ['initial','water'])for(const mode of ['commit','cancel'])test(`${kind}: ${mode} Awakening before restored Action15 first READY preserves source time and body`,async()=>{
 let releaseAction,releaseIdle,releaseRetry,receipt,actionCount=0;
 const actionHeld=new Promise(r=>{releaseAction=r;}),idleHeld=new Promise(r=>{releaseIdle=r;}),retryHeld=new Promise(r=>{releaseRetry=r;});
 const {f,command,oldBinding}=await setup(kind,{onPrepare:r=>{if(r.kind==='task-action')return ++actionCount===1?actionHeld:retryHeld;},onReady:r=>r.kind==='initial-idle-body'?idleHeld:undefined,onCommit:(r,data)=>{if(r.kind==='initial-idle-body')receipt=data.nativeInitialIdleBodyBinding;}});
 let prepared=false;
 try{
  await untilProduction(f,()=>actionCount===1);
  const before=f.snapshot(),first=f.records.find(r=>r.kind==='task-action'),q=first.resources.request;
  assert.equal(q.initialElapsed,before.workers[0].nativeTaskAction.elapsed);assert.notEqual(q.sourceRequest.authorityEpoch,oldBinding.reference.worldBoundary.authorityEpoch);
  assert.equal(f.command({kind:'previewBlessing',targetId:command.targetId}).value.valid,true);
  const preparing=f.authority.prepareNativeStructureCommand(command);preparing.catch(()=>{});
  await f.present();unchanged(f,before,command);releaseAction();
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.packet));
  const idle=f.records.find(r=>r.kind==='initial-idle-body'),reference=idle.resources.nativeInitialIdleBody;
  assert.equal(reference.cancellationSource.phase,6);assert.equal(reference.bodyId,q.bodyId);assert.equal(reference.cancellationSource.sourceSequence,q.sourceRequest.requestSequence);
  if(kind==='initial'&&mode==='commit')declarationIsolation(f,reference,q.sourceRequest);
  for(let i=0;i<4;i++){f.advance(.05);await f.present();unchanged(f,before,command);}
  f.command({kind:'pause',reason:'pending-restored-control'});const paused=f.snapshot().elapsed;f.advance(.4);await f.present();assert.equal(f.snapshot().elapsed,paused);unchanged(f,before,command);f.command({kind:'resume',reason:'pending-restored-control'});
  releaseIdle();await settle(f,preparing);prepared=true;assert.equal(first.committed,false);unchanged(f,before,command);
  if(mode==='commit'){
   const response=await settle(f,f.structureCommand(command));assert.equal(response.value,true,response.rejection);
   const after=JSON.parse(response.snapshot);assert.equal(after.workers[0].nativeRouteAdmission,'native-idle');assert.equal(after.workers[0].nativeTaskAction,undefined);assert.equal(after.workers[0].taskId,null);assert.equal(after.awakenings.progress,0);
   assert.equal(after.events.filter(e=>e.type==='BlessingApplied'&&e.commandId===command.id).length,1);assert.equal(after.events.filter(e=>e.type==='WaterSatisfied').length,0);
   await f.authority.finishNativeStructureCommand(command);prepared=false;await f.present();await idle.packet.presented;
   assert.deepEqual(f.host.inspect().nativeRouteFrame.worldBoundary,receipt.reference.worldBoundary);
   assert.equal(f.command(command).value,false);assert.equal(first.committed,false);assert.equal(f.records.some(r=>r.kind==='task-action'&&r.committed),false);
  }else{
   await f.authority.finishNativeStructureCommand(command);prepared=false;
   await untilProduction(f,()=>actionCount===2);unchanged(f,before,command);assert.equal(idle.committed,false);assert.equal(idle.aborted,true);
   const retry=f.records.findLast(r=>r.kind==='task-action');assert.equal(retry.resources.request.initialElapsed,q.initialElapsed);assert.equal(retry.resources.request.bodyId,q.bodyId);assert.deepEqual(retry.resources.request.sourceRequest,q.sourceRequest);
   releaseRetry();await untilProduction(f,()=>retry.committed);assert.equal(first.committed,false);
   assert.equal(f.snapshot().workers[0].nativeTaskAction.elapsed,q.initialElapsed);f.advance(.1);await f.present();
   assert(f.snapshot().workers[0].nativeTaskAction.elapsed>q.initialElapsed);assert(f.snapshot().workers[0].nativeTaskAction.elapsed<q.initialElapsed+.15);
   assert.equal(f.snapshot().awakenings.progress,100);assert.equal(f.snapshot().events.some(e=>e.type==='BlessingApplied'),false);
  }
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);assert.equal(f.host.inspect().failed,false);
 }finally{releaseAction();releaseIdle();releaseRetry();if(prepared)await f.authority.finishNativeStructureCommand(command);await f.close();}
});
