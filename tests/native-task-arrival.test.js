import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createPlant} from '../src/simulation/crops.js';
import {tick} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {nativeHomeRouteReferenceFromProposal} from '../src/world/native-home-route.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('completed Task Home rejects a moving/stale source, keeps the same body and leaves its peer untouched',()=>{
 const f=createNativeTaskGameFixture();try{
  const worker=f.state.workers[0],peer=f.state.workers[1],source=f.planner.nativeTaskExecution(worker.id),h=source.nativeRoute.routeHandle;
  const village=f.state.villages.find(v=>v.id===worker.villageId);village.entry=f.point(-8,0);
  const goal=[Number(village.id.split('-').at(-1)),village.entry.x,village.entry.z],args=[source.nativeRoute.actorId,h.session,source.nativeRoute.assignmentSequence,h.generation,...goal];
  assert.equal(f.w.nav_intent_completed_task_home_request(...args),-2);const assigned=worker.taskId;
  tick(f.state,f.proposals[0].endTime-f.state.elapsed+.02,f.nav);const completed=f.planner.nativeTaskExecution(worker.id),body=f.body(1),other=f.body(3),peerTask=peer.taskId;
  assert(completed.arrived);assert.equal(completed.currentSpeed,0);
  assert.throws(()=>f.planner.requestNativeCompletedTaskHome(f.state,worker),/finished contract/);
  assert.equal(f.w.nav_intent_completed_task_home_request(args[0],h.session,args[2]+1,h.generation,...goal),-2);
  f.state.time=250;const request=f.planner.requestNativeCompletedTaskHome(f.state,worker);
  assert.equal(request.bodyId,source.bodyId);assert.equal(worker.taskId,null);assert.equal(f.state.tasks.find(t=>t.id===assigned).workerId,null);
  assert.equal(worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.planner.nativeTaskExecution(worker.id),null);
  assert.equal(f.planner.nativeSuspendedGateRoute(source.nativeRoute.actorId),null);
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.body(3),other);assert.equal(peer.taskId,peerTask);
  for(const key of ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(request.pose[key],completed[key]);
  assert.equal(f.w.nav_intent_completed_task_home_request(...args),1);
  assert.equal(f.w.nav_intent_completed_task_home_request(...args.slice(0,5),goal[1]+1,goal[2]),-3);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.planner.nativeGameExecutionState(),1);
  assert.equal(f.planner.prepareNativeHomeRouteProposal(request).status,'proposed');
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id}: completion in the shift-ending tick requests Home without Task25 or new action`,()=>{
 const f=createNativeTaskGameFixture({profile:profile.id});try{
  const worker=f.state.workers[0];
  // Advance the genuine route while still in shift, then put the calendar
  // boundary in the same final native execution interval (not the pose).
  const end=f.proposals[0].endTime;tick(f.state,end-f.state.elapsed-.025,f.nav);
  f.state.time=profile.end-.025;const task=worker.taskId,bodyId=f.planner.nativeTaskExecution(worker.id).bodyId;
  tick(f.state,.03,f.nav);
  assert.equal(worker.status,'returning');assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(worker.taskId,null);assert.equal(f.state.tasks.find(t=>t.id===task).workerId,null);
  assert.equal(f.planner.nativeHomeRequestReference(worker.id).bodyId,bodyId);
  assert.equal(f.planner.nativeTaskActionRequest(worker.id),null);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

for(const hold of ['preparer','reply'])test(`late READY25 (${hold}) after real arrival is cancelled; Task becomes Home18 without a fabricated stop or Harvest`,async()=>{
 const seed=nativeIdleCycleGameFixture({mode:'rest',remaining:5,profile:'olderFemale',peer:false}),stop=deferred();let f,ready=false,lateReply,receive;
 try{
  const state=structuredClone(seed.state),worker=state.workers[0];state.time=299.45;
  const point=seed.point(-4,6),target=createPlant(`plant-${state.nextId++}`,'mijo',point.x,point.z,worker.centerId);target.growth=999999;for(const slot of target.water)slot.status='manual';state.plants.push(target);
  state.villages.find(v=>v.id===worker.villageId).entry=seed.point(-3,6);
  f=await nativeProductionAuthority(state,{async onReady(record){if(hold==='preparer'&&record.kind==='task-route-stop'){ready=true;await stop.promise;}}});
  if(hold==='reply'){receive=f.resourcePort.onmessage;f.resourcePort.onmessage=e=>{if(e.data.kind==='nativeGateResourcesResult'&&e.data.result?.preparedTaskRouteStopTemplate){lateReply=e;ready=true;return;}receive(e);};}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));assert.equal(f.command({kind:'harvest',id:'arrival-race',targetId:target.id}).value,true);
  for(let i=0;i<4&&!f.records.some(r=>r.kind==='task-start'&&r.committed);i++){f.advance();await f.present();}await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const start=f.records.find(r=>r.kind==='task-start'),assigned=f.snapshot().workers[0].taskId;
  for(let i=0;i<16&&!ready;i++){f.advance();await f.present();}await untilProduction(f,()=>ready);
  const endpoint=start.resources.endTime;let latest=f.snapshot();
  while(latest.elapsed<endpoint+.1){latest=f.advance(.1);await f.present();if(latest.elapsed<endpoint){assert.equal(latest.workers[0].taskId,assigned);assert.equal(latest.workers[0].nativeRouteAdmission,'native-task');}}
  assert.equal(f.records.some(r=>r.kind==='task-route-stop'&&r.committed),false);
  assert.equal(f.records.some(r=>r.kind==='task-action'),false);
  stop.resolve();
  for(let i=0;i<100&&!f.records.some(r=>r.kind==='home-route'&&r.committed);i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));
  if(hold==='reply'){assert(lateReply);receive(lateReply);await f.present();assert.equal(f.records.find(r=>r.kind==='task-route-stop').committed,false);}
  const home=f.records.find(r=>r.kind==='home-route');assert.equal(home.resources.bodyId,start.resources.bodyId);
  for(let i=0;i<100&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));
  const after=f.snapshot();assert.equal(after.workers[0].status,'home');assert.equal(after.crates.length,0);assert(after.plants.some(p=>p.id===target.id&&p.alive));
  assert.equal(after.tasks.find(t=>t.id===assigned).workerId,null);
  assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.kind),['initial-idle-body','task-start','home-route','home-arrival']);
  assert.equal(f.records.find(r=>r.kind==='task-route-stop').committed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{stop.resolve();await f?.close();seed.close();}
});

test('only the causal Home of the acquired Task body retains its terminal presentation',()=>{
 const f=createNativeTaskGameFixture();let detach;
 try{
  const messages=[];let baseline;
  detach=f.planner.observeNativeIntentControl({onBaseline:b=>{baseline=structuredClone(b);},onChanges:events=>messages.push(...events.map(event=>({event:structuredClone(event)}))),onClock:clock=>messages.push({clock:structuredClone(clock)})});
  const actor=f.state.workers[0],end=f.proposals[0].endTime;tick(f.state,end-f.state.elapsed+.02,f.nav);f.state.time=250;
  const v=f.state.villages.find(v=>v.id===actor.villageId);v.entry=f.point(-8,0);
  f.planner.requestNativeCompletedTaskHome(f.state,actor);f.planner.commitNativeCausalClock();f.planner.flushNativeIntentControl();
  const homeProposal=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(actor.id));assert.equal(homeProposal.status,'proposed');
  const homeReference=nativeHomeRouteReferenceFromProposal(homeProposal.proposal),homeOptions={preparingWorldBoundary:homeReference.worldBoundary};
  assert(messages.some(m=>m.event?.homeRequest));
  for(const mode of ['valid','body','session','premature','revocation']){
   const c=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes});
   c.acceptClock({...baseline.clock,anchorAbsoluteMs:1000,anchorLogicalTime:baseline.clock.committedThrough},{baseline:true});c.installStartedRoutes(baseline.worldBoundary,baseline.nativeStartedRoutes,{bootstrap:true});
   const reference=baseline.nativeStartedRoutes.find(b=>b.reference.actorId===Number(actor.id.split('-').at(-1))).reference,lease=c.admitStart(reference);
   let rejected=false;
   try{for(const input of messages){const m=structuredClone(input);if(m.event){if(m.event.homeRequest){if(mode==='body')m.event.homeRequest.bodyId++;if(mode==='session')m.event.homeRequest.nativeSession++;if(mode==='premature')m.event.homeRequest.requestedAt=reference.endTime-.1;if(mode==='revocation')m.event.revokedRouteHandle=null;}c.accept(m.event);}else{const prior=c.status().clock;c.acceptClock({...m.clock,anchorAbsoluteMs:1000,anchorLogicalTime:m.clock.reanchor?m.clock.committedThrough:prior.anchorLogicalTime});}}}catch{rejected=true;}
   if(mode==='valid'){
    assert.equal(rejected,false);assert(lease.isCurrent());assert.equal(lease.executionEnd,reference.endTime);assert.equal(lease.routeRecord.safeUntil,reference.endTime);
    assert(c.admitHome(homeReference,homeOptions).isPrepared());
    const falsePose=structuredClone(homeReference);falsePose.sourceRequest.pose.x+=.25;
    assert.throws(()=>c.admitHome(falsePose,homeOptions),/Home|source|pose|origin/);
    const falseBody=structuredClone(homeReference);falseBody.bodyId++;falseBody.sourceRequest.bodyId++;
    assert.throws(()=>c.admitHome(falseBody,homeOptions),/Home|source|body/);
   }
   else assert.equal(rejected,true,mode+' must not acquire terminal ownership');
   c.dispose();
  }
 }finally{detach?.();f.close();}
});
