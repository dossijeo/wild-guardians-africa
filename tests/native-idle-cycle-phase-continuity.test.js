import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleCyclePhaseContinuity as fixture} from './helpers/native-idle-cycle-phase-continuity.js';
import {nativeIdleFailedCycleControl} from './helpers/native-idle-failed-cycle-control.js';
import {nativeIdleCyclePhaseOffset} from '../src/rendering/native-farm-idle-phase.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

const error=(a,b,period)=>Math.abs(((a-b+period*1.5)%period)-period*.5);
for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} real ports preserve ${mode} GLB phase through repeated same-clip retry21 waits`,async(t)=>{
 const f=await fixture({profile:profile.id,mode});try{
  let proof=await f.run();if(mode==='watch'){f.advanceCycle();proof=await f.run();}const actor=f.graphicsActor,root=actor.root,body=f.body(1),rng=f.nativeState.rng,clip=mode==='rest'?'Idle':'Alert',period=f.bakes.get(clip).meta.duration;let carry=0;const records=[];
  for(const wait of [.7,period*2+.3]){
   f.advanceCycle();f.advance(wait);await f.draw();const oldPhase=f.phase(clip),before=f.vertices(),previous=proof,at=f.nativeState.elapsed,held=structuredClone(f.worker.idleState);assert.equal(f.frame.getIdleCycleElapsed(proof.preparedReference),floorFloat32(proof.reference.duration));
   proof=await f.run();const after=f.vertices(),phase=f.phase(clip);carry+=at-previous.reference.worldBoundary.effectiveTime-previous.reference.duration;records.push({wait,period,oldPhase,phase,phaseError:error(phase,oldPhase,period),vertices:before.length,maximumVertexJump:Math.max(...before.map((p,i)=>p.distanceTo(after[i]))),physicalRelative:f.frame.getIdleCycleElapsed(proof.preparedReference),phaseOffset:f.frame.getIdleCyclePhaseOffset(proof.preparedReference,period)});
   assert(error(phase,oldPhase,period)<2e-5,`phase jumped ${oldPhase} -> ${phase}`);assert.equal(before.length,after.length);assert(before.length>30);assert(Math.max(...before.map((p,i)=>p.distanceTo(after[i])))<2e-5);assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);assert.equal(f.worker.idleState.elapsed,held.elapsed);assert.equal(f.worker.idleState.remaining,held.remaining);assert.equal(f.frame.getIdleCycleElapsed(proof.preparedReference),0);assert(error(f.frame.getIdleCyclePhaseOffset(proof.preparedReference,period),carry%period,period)<2e-5);
  }assert.deepEqual(f.v.errors,[]);assert.deepEqual(f.errors,[]);t.diagnostic(JSON.stringify({profile:profile.id,mode,records}));
 }finally{await f.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'normal'} installed control retains only one scalar phase delay across zero and positive retry horizons`,async()=>{
 const f=await nativeIdleFailedCycleControl({threaded,retry:0});try{
  let p=f.prepareCycle(),proof=f.commitCycle(p);f.install(proof);assert.equal(f.c.admitIdleCycle(proof.reference).idleCycleRecord.phaseDelay,0);let accumulated=0;
  for(const wait of [.7,2.3,.125]){f.advanceCycle();const at=f.state.elapsed;f.state.elapsed+=wait;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');f.planner.commitNativeCausalClock();p=f.prepareCycle();const previous=proof;proof=f.commitCycle(p);f.install(proof);accumulated+=proof.reference.worldBoundary.effectiveTime-previous.reference.worldBoundary.effectiveTime-previous.reference.duration;const record=f.c.admitIdleCycle(proof.reference).idleCycleRecord;assert(Math.abs(record.phaseDelay-accumulated)<1e-8);assert.equal(record.phaseUntil,proof.reference.worldBoundary.effectiveTime+proof.reference.duration);assert.equal(typeof record.phaseDelay,'number');assert(!Object.values(record).some(v=>v&&typeof v==='object'));assert(f.state.elapsed>=at);}
  assert(accumulated>3);
  assert.deepEqual(f.c.idleCycleRecoveryPhases(),[{version:1,actorId:proof.reference.actorId,bodyId:proof.reference.bodyId,
   cycleSequence:proof.cycleSequence,worldBoundary:proof.reference.worldBoundary,phaseDelay:accumulated}]);
 }finally{await f.dispose();}
});

test('phase delay uses modulo independently of physical progress and rejects invalid accumulated clocks',()=>{
 const base={elapsed:12,executionEpoch:10,relativeTime:2,duration:3,period:2.5,phaseDelay:7.7};assert(error(nativeIdleCyclePhaseOffset(base),.2,2.5)<1e-6);
 assert(error(nativeIdleCyclePhaseOffset({...base,elapsed:14.25,relativeTime:3}),1.45,2.5)<1e-6);
 for(const phaseDelay of [-1,NaN,Infinity])assert.throws(()=>nativeIdleCyclePhaseOffset({...base,phaseDelay}));
});

test('a genuine native phase change resets the retained same-clip wait',async()=>{
 const f=await fixture({mode:'rest'});try{
  let proof=await f.run();f.advanceCycle();f.advance(.7);proof=await f.run();const period=f.periods[0];assert(f.frame.getIdleCyclePhaseOffset(proof.preparedReference,period)>.6);
  // Follow actual one-second retry frontiers until native policy chooses WATCH.
  for(let i=0;i<20;i++){const next=f.advanceCycle();if(next.idleState.mode==='watch'){proof=await f.run();assert.equal(proof.reference.initialState.mode,'watch');assert(f.frame.getIdleCyclePhaseOffset(proof.preparedReference,f.periods[1])<2e-5);assert(error(f.phase('Alert'),proof.reference.initialState.elapsed,f.periods[1])<2e-5);assert.deepEqual(f.v.errors,[]);return;}proof=await f.run();}
  assert.fail('Actual native REST never selected WATCH');
 }finally{await f.dispose();}
});

test('preparation and GPU quiescence waits are inherited at the actual retimed native boundary',async()=>{
 const f=await fixture({onPrepare:f=>{if(f.planner.nativeIdleCycleBinding(f.actor))f.advance(.2);},onDrain:f=>{if(f.planner.nativeIdleCycleBinding(f.actor))f.advance(.3);}});try{
  await f.run();f.advanceCycle();f.advance(.7);await f.draw();const old=f.phase(),body=f.body(1),proof=await f.run();assert(proof.reference.worldBoundary.effectiveTime>proof.preparedReference.worldBoundary.effectiveTime);assert(error(f.phase(),old+.5,f.periods[0])<2e-5);assert.equal(f.frame.getIdleCycleElapsed(proof.preparedReference),0);assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

test('pthread at a large absolute epoch retains submitted phase without advancing the held native body',async()=>{
 const f=await fixture({threaded:true,epoch:2**34});try{
  await f.run();f.advanceCycle();f.advance(.7);await f.draw();const before=f.phase(),body=f.body(1);await f.run();assert(error(f.phase(),before,f.periods[0])<2e-5);assert.deepEqual(f.body(1),body);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});

test('picking rejects altered delay, phase time or offset instead of accepting a second animation clock',async()=>{
 const f=await fixture();try{
  await f.run();f.advanceCycle();f.advance(.7);await f.run();const {inspect}=await f.draw();
  for(const change of [b=>b.phaseDelay+=.1,b=>b.phaseDelay=-1,b=>b.phaseTime=Infinity,b=>b.phaseOffset+=.1]){const bad=structuredClone(inspect),binding=bad.nativeRouteFrame.bindings.find(b=>b.semantic==='idle-offset');assert(binding);change(binding);assert.throws(()=>captureNativeRoutePickFrame(bad));}
 }finally{await f.dispose();}
});

test('cancelling a successor candidate cannot change the installed phase delay or its finite budget',async()=>{
 const f=await nativeIdleFailedCycleControl({retry:.25});try{
  let p=f.prepareCycle(),proof=f.commitCycle(p);f.install(proof);f.advanceCycle();f.state.elapsed+=.7;assert.equal(f.planner.advanceNativeRouteExecution(f.state.elapsed).status,'advanced');f.planner.commitNativeCausalClock();p=f.prepareCycle();proof=f.commitCycle(p);f.install(proof);f.advanceCycle();const lease=f.c.admitIdleCycle(proof.reference),record=lease.idleCycleRecord,delay=record.phaseDelay,end=lease.executionEnd;p=f.prepareCycle();assert(f.planner.cancelNativeIdleCycleProposal(p.ticket));assert.equal(lease.idleCycleRecord,record);assert.equal(record.phaseDelay,delay);assert.equal(lease.executionEnd,end);assert(lease.isCurrent());
 }finally{await f.dispose();}
});

test('Home freezes an inherited cosmetic offset while preserving its finite physical cutoff',async()=>{
 const f=await fixture();try{
  await f.run();f.advanceCycle();f.advance(.7);const proof=await f.run();f.advance(.125);await f.draw();f.worker.contractDay=f.nativeState.day-1;f.advance(.1);assert(f.planner.nativeHomeRequestReference(f.actor));await f.draw();const age=f.frame.getIdleCycleElapsed(proof.preparedReference),offset=f.frame.getIdleCyclePhaseOffset(proof.preparedReference,f.periods[0]);assert(age<floorFloat32(proof.reference.duration));assert(offset>.6);f.advance(.3);await f.draw();assert.equal(f.frame.getIdleCycleElapsed(proof.preparedReference),age);assert.equal(f.frame.getIdleCyclePhaseOffset(proof.preparedReference,f.periods[0]),offset);assert.deepEqual(f.v.errors,[]);
 }finally{await f.dispose();}
});
