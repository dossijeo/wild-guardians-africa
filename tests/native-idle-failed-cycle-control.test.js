import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleFailedCycleControl,nativeIdleFailedCycleRemote} from './helpers/native-idle-failed-cycle-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/float32-time.js';
import {cropSpec} from '../src/simulation/rules.js';

const rejected=(c,r)=>assert.throws(()=>c.admitIdleCycle(r,{preparingWorldBoundary:r.worldBoundary}),error=>error.code==='native-idle-cycle-admission-obsolete');
for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} failed WALK prepares21 from its bound request, then requires actual acquisition and resource installation`,async()=>{
 const f=await nativeIdleFailedCycleControl({threaded,profile:profile.id,retry:.25});try{
  const p=f.prepareCycle(),r=p.nativeIdleCycle,lease=f.c.admitIdleCycle(r,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1),worker=structuredClone(f.worker);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.idleCycleRecord,null);assert.equal(r.sourceBody.kind,'native-idle-stroll-failed-source');assert.deepEqual(r.sourceBody.sourceRequest,f.sourceRequest);assert.deepEqual(f.worker,worker);
  const binding=f.commitCycle(p);assert.equal(f.events.at(-1).idleCycle.cycleSequence,binding.cycleSequence);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(f.install(binding),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,binding.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,lease.executionEpoch+r.duration);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);const record=lease.idleCycleRecord;tick(f.state,.1,f.nav);assert.equal(lease.idleCycleRecord,record);assert(lease.isCurrent());assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('source metadata without its exact pending request, or from a different epoch, body or destination, cannot prepare21',async()=>{
 const f=await nativeIdleFailedCycleControl();let empty;try{
  const p=f.prepareCycle(),r=p.nativeIdleCycle,clock=f.c.status().clock;
  empty=createNativeRouteControl({authorityEpoch:r.worldBoundary.authorityEpoch,initialSequence:r.sourceControlSequence,initialTime:r.worldBoundary.effectiveTime});empty.acceptClock(clock,{baseline:true});rejected(empty,r);
  const q=r.sourceBody.sourceRequest;
  for(const change of [
   {sourceBody:{...r.sourceBody,sourceRequest:{...q,destination:{x:q.destination.x+.01,z:q.destination.z},anchor:{...q.anchor,x:q.anchor.x+.01}},idleState:{...r.sourceBody.idleState}},anchor:{...r.anchor,x:r.anchor.x+.01}},
   {actorId:r.actorId+1,sourceBody:{...r.sourceBody,actorId:r.actorId+1,sourceRequest:{...q,actorId:r.actorId+1}}},
   {bodyId:r.bodyId+1,sourceBody:{...r.sourceBody,bodyId:r.bodyId+1,sourceRequest:{...q,bodyId:r.bodyId+1}}},
   {sourceBody:{...r.sourceBody,sourceAt:q.requestedAt+.1,sourceRequest:{...q,requestedAt:q.requestedAt+.1}}}
  ])assert.throws(()=>f.c.admitIdleCycle({...r,...change},{preparingWorldBoundary:r.worldBoundary}));
  const epoch='foreign-epoch';rejected(f.c,{...r,worldBoundary:{...r.worldBoundary,authorityEpoch:epoch},sourceBody:{...r.sourceBody,authorityEpoch:epoch,sourceRequest:{...q,authorityEpoch:epoch}}});
 }finally{empty?.dispose();await f.dispose();}
});

test('control and clock delivery cannot be replaced by source metadata or a native binding alone',async()=>{
 const f=await nativeIdleFailedCycleControl();try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.pauseControl(true);f.pauseClock(true);const binding=f.commitCycle(p);assert.equal(lease.isCurrent(),false);assert.throws(()=>f.install(binding));f.acceptEvents();assert.equal(lease.isCurrent(),false);assert.throws(()=>f.install(binding));f.acceptLastClock();assert.equal(lease.isCurrent(),false);assert.equal(f.install(binding),1);assert(lease.isCurrent());
 }finally{await f.dispose();}
});

test('retimed failed21 uses the same prepared request and actual native epoch, without a fictitious initial owner',async()=>{
 const f=await nativeIdleFailedCycleControl({retry:.25});try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);tick(f.state,.2,f.nav);const translated=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(translated.status,'revalidated');assert.equal(translated.timeTranslation.compatible,true);const binding=f.commitCycle(p);assert.deepEqual(binding.preparedReference,p.nativeIdleCycle);assert(binding.reference.worldBoundary.effectiveTime>p.worldBoundary.effectiveTime);assert.equal(f.install(binding),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,binding.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,lease.executionEpoch+.25);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('cancelling a candidate cannot make it current or reuse it for another issued ticket',async()=>{
 const f=await nativeIdleFailedCycleControl();try{
  const first=f.prepareCycle(),old=f.c.admitIdleCycle(first.nativeIdleCycle,{preparingWorldBoundary:first.worldBoundary}),body=f.body(1);assert.equal(f.planner.cancelNativeIdleCycleProposal(first.ticket),true);assert.equal(old.isCurrent(),false);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),binding=f.commitCycle(p);assert.equal(f.install(binding),1);assert(lease.isCurrent());assert.equal(old.isPrepared(),false);assert.equal(old.isCurrent(),false);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

for(const retry of [0,'rest-end'])test(`REST/WATCH retry continuations require the current installed21 and exact native successor (${retry})`,async()=>{
 const f=await nativeIdleFailedCycleControl({retry,rng:1});try{
  let p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.install(f.commitCycle(p));let sawWatch=false,sawRestAgain=false,previous='rest';const source=JSON.stringify(f.sourceRequest),body=f.body(1),rng=f.state.rng;
  if(!f.planner.nativeIdleCycleExecution(f.actor).finished)f.advanceCycle();
  for(let i=0;i<40&&!sawRestAgain;i++){
   const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert(next);assert.deepEqual(f.c.pendingIdleCycleRequest(f.sourceRequest.actorId),next);p=f.prepareCycle();const current=f.worker.idleState;assert.deepEqual(p.nativeIdleCycle.initialState,next.idleState);assert.equal(JSON.stringify(p.nativeIdleCycle.sourceBody.sourceRequest),source);const candidate=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});assert(candidate.isPrepared());assert.equal(candidate.isCurrent(),false);assert(lease.isCurrent());const binding=f.commitCycle(p);assert.equal(lease.isCurrent(),false);assert.equal(candidate.isCurrent(),false);assert.equal(f.install(binding),1);assert(candidate.isCurrent());lease=candidate;assert.deepEqual(f.worker.idleState,next.idleState);assert.notEqual(f.worker.idleState,current);if(next.idleState.mode==='watch')sawWatch=true;if(previous==='watch'&&next.idleState.mode==='rest')sawRestAgain=true;previous=next.idleState.mode;if(!sawRestAgain)f.advanceCycle();
  }
  assert(sawWatch&&sawRestAgain);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{await f.dispose();}
});

test('a successor cannot prepare from an uninstalled21 association',async()=>{
 const f=await nativeIdleFailedCycleControl({retry:0});try{
  const p=f.prepareCycle();f.commitCycle(p);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert(next);const candidate=f.prepareCycle();rejected(f.c,candidate.nativeIdleCycle);
 }finally{await f.dispose();}
});

for(const daily of [false,true])test(`Home invalidates pending failed-WALK candidacy and cuts an installed body lease (${daily?'installed':'pending'})`,async()=>{
 const f=await nativeIdleFailedCycleControl();try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);if(daily)f.install(f.commitCycle(p));else f.planner.cancelNativeIdleCycleProposal(p.ticket);f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);
  if(daily){assert(lease.isCurrent());assert.equal(lease.executionEnd,home.requestedAt);assert(lease.executionEnd<p.worldBoundary.effectiveTime+p.nativeIdleCycle.duration);tick(f.state,.2,f.nav);assert(lease.isCurrent());assert.equal(lease.executionEnd,home.requestedAt);}
  else{assert.equal(lease.isPrepared(),false);assert.equal(lease.isCurrent(),false);rejected(f.c,p.nativeIdleCycle);}
  rejected(f.c,{...p.nativeIdleCycle,worldBoundary:{...p.worldBoundary,ticket:p.ticket.ticket+1000}});assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('body withdrawal revokes a pending source lease without granting20 or22',async()=>{
 const f=await nativeIdleFailedCycleControl();try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});assert.equal(f.w.spatial_body_remove(f.sourceRequest.bodyId),1);f.planner.commitNativeCausalClock();assert.equal(lease.isPrepared(),false);assert.equal(lease.isCurrent(),false);rejected(f.c,p.nativeIdleCycle);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);
 }finally{await f.dispose();}
});

test('baseline metadata for an already active failed21 cannot bootstrap a current graphical lease',async()=>{
 const f=await nativeIdleFailedCycleControl();let cold;try{
  const p=f.prepareCycle(),proof=f.commitCycle(p),r=proof.reference;f.planner.commitNativeCausalClock();cold=createNativeRouteControl({authorityEpoch:r.worldBoundary.authorityEpoch,initialSequence:f.c.status().sequence,initialTime:f.state.elapsed,nativeIdleCycles:[proof]});cold.acceptClock(f.c.status().clock,{baseline:true});rejected(cold,r);assert.throws(()=>cold.installIdleCycles(r.worldBoundary,[proof]));assert.throws(()=>cold.installIdleCycles(r.worldBoundary,[proof],{bootstrap:true}));
 }finally{cold?.dispose();await f.dispose();}
});

for(const retry of [0,.25])test(`real ports/Host acquire failed21 without a preceding20/22 and retain its bounded submitted clock (${retry})`,async()=>{
 const f=await nativeIdleFailedCycleRemote({retry});try{
  const before=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();const proof=result.nativeIdleCycleBinding,r=proof.reference,prepared=proof.preparedReference;assert.equal(r.version,2);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(before.nativeRouteAdmission,'pending-stroll-resources');tick(f.state,r.duration+.1,f.nav);const view=f.planner.nativeIdleCycleExecution(f.actor),first=await f.draw(),a=captureNativeRoutePickFrame(first),offset=a.getIdleCyclePhaseOffset(prepared,2.5);assert.equal(first.failed,false);assert.equal(a.getIdleCycleElapsed(prepared),floorFloat32(prepared.duration));tick(f.state,1,f.nav);const last=await f.draw(),b=captureNativeRoutePickFrame(last);assert.equal(last.failed,false);assert.equal(b.getIdleCycleElapsed(prepared),floorFloat32(prepared.duration));assert(Math.abs(((b.getIdleCyclePhaseOffset(prepared,2.5)-offset-1+3.75)%2.5)-1.25)<2e-5);assert.deepEqual(f.worker.idleState,view.idleState);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

test('late preparation and quiescence preserve the request and install only at the actual native boundary through both ports',async()=>{
 const f=await nativeIdleFailedCycleRemote({retry:.25,onPrepare:f=>tick(f.state,.1,f.nav),onDrain:f=>tick(f.state,.02,f.nav)});try{
  const body=f.body(1),q=f.sourceRequest,result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();const proof=result.nativeIdleCycleBinding;assert(proof.reference.worldBoundary.effectiveTime>proof.preparedReference.worldBoundary.effectiveTime);assert.deepEqual(proof.reference.sourceBody.sourceRequest,q);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker.idleState,proof.reference.initialState);assert.equal((await f.draw()).failed,false);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

for(const missing of ['capability','decoder'])test(`missing ${missing} rejects the failed21 prepared frame before native acquisition`,async()=>{
 const f=await nativeIdleFailedCycleRemote({...(missing==='capability'?{idleCycleIdlePhaseCapability:false}:{idleCycleDecoderClock:false})});try{
  const body=f.body(1),worker=structuredClone(f.worker),result=await f.run();assert.equal(result.status,'control-failed');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollRequestReference(f.actor),f.sourceRequest);
 }finally{await f.dispose();}
});

test('a pending Home cut freezes the failed21 submitted physical and cosmetic clocks before its retry horizon',async()=>{
 const f=await nativeIdleFailedCycleRemote({retry:1});try{
  const result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();tick(f.state,.125,f.nav);const reference=result.nativeIdleCycleBinding.preparedReference,body=f.body(1),first=captureNativeRoutePickFrame(await f.draw());f.worker.contractDay=f.state.day-1;tick(f.state,.1,f.nav);assert(f.planner.nativeHomeRequestReference(f.actor));const cut=captureNativeRoutePickFrame(await f.draw()),age=cut.getIdleCycleElapsed(reference);assert(age<floorFloat32(reference.duration));tick(f.state,.3,f.nav);const held=captureNativeRoutePickFrame(await f.draw());assert.equal(held.getIdleCycleElapsed(reference),age);assert.equal(held.getIdleCyclePhaseOffset(reference,2.5),0);assert(age>=first.getIdleCycleElapsed(reference));assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

test('a local failed WALK retains its narrow source and full native cycle without an initial20 lease',async()=>{
 const f=await nativeIdleFailedCycleControl({local:true});try{
  const p=f.prepareCycle(),r=p.nativeIdleCycle,body=f.body(1);assert.equal(r.sourceBody.sourceRequest.approach,undefined);assert(r.duration>r.watchStartOffset);const lease=f.c.admitIdleCycle(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());f.install(f.commitCycle(p));assert(lease.isCurrent());assert.equal(lease.executionEnd,lease.executionEpoch+r.duration);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
 }finally{await f.dispose();}
});

test('a genuine Task cuts the installed failed21 body without extending its physical budget',async()=>{
 const f=await nativeIdleFailedCycleControl({local:true});try{
  const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);f.install(f.commitCycle(p));const anchor=f.state.plants.find(p=>p.id===`plant-${f.sourceRequest.anchor.id}`);anchor.growth=cropSpec(anchor.species).growth_seconds;tick(f.state,.1,f.nav);const request=f.planner.pendingTaskRoute(f.actor);assert(request);assert(lease.isCurrent());assert.equal(lease.executionEnd,request.requestedAt);assert(lease.executionEnd<p.worldBoundary.effectiveTime+p.nativeIdleCycle.duration);tick(f.state,.2,f.nav);assert.equal(lease.executionEnd,request.requestedAt);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('both ports install actual REST and WATCH successors on the same original failed source',async()=>{
 const f=await nativeIdleFailedCycleRemote({retry:'rest-end'});try{
  const body=f.body(1),request=f.sourceRequest;let result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();assert.equal(result.nativeIdleCycleBinding.reference.initialState.mode,'rest');f.advanceCycle();result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();assert.equal(result.nativeIdleCycleBinding.reference.initialState.mode,'watch');assert.deepEqual(result.nativeIdleCycleBinding.reference.sourceBody.sourceRequest,request);assert.equal((await f.draw()).failed,false);f.advanceCycle();result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));await f.v.present();assert.equal(result.nativeIdleCycleBinding.reference.initialState.mode,'watch');assert(result.nativeIdleCycleBinding.reference.initialState.elapsed>0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

test('cancellation during prepared-resource work leaves the original WALK, body and native barrier unchanged',async()=>{
 let entered,release;const started=new Promise(r=>{entered=r;}),gate=new Promise(r=>{release=r;});const f=await nativeIdleFailedCycleRemote({onPrepare:async()=>{entered();await gate;}});const controller=new AbortController();try{
  const worker=structuredClone(f.worker),body=f.body(1),running=f.run(controller.signal);await started;assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);controller.abort();release();const result=await running;assert.equal(result.status,'control-failed');assert.match(result.error,/cancel|abort/i);assert.equal(f.v.counters().commits,0);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.planner.nativeIdleStrollRequestReference(f.actor),f.sourceRequest);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{release();await f.dispose();}
});
