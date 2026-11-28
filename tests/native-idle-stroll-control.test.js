import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const profile of PROFILES)test(`${profile.id} stroll needs its actual typed acquisition, current watermark and graphical installation`,()=>{
 const f=controlledNativeIdleStroll({profile:profile.id});try{
  const p=f.prepare(),body=f.body(1),peer=f.body(3),oldRecord=f.cycleLease.idleCycleRecord,lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);f.advance(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(lease.isPrepared());
  const renewed=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(renewed.status,'revalidated');const binding=f.commitStroll(p);assert.deepEqual(f.events.at(-1).nativeIdleStroll,binding);assert.equal(f.cycleLease.isCurrent(),false);assert.equal(oldRecord.safeUntil,f.state.elapsed);assert.equal(lease.isCurrent(),false);assert(lease.isPrepared());assert.equal(lease.routeRecord,null);assert.equal(f.c.installStrolls(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,renewed.proposal.startTime);assert.equal(lease.executionEnd,renewed.proposal.endTime);const record=lease.routeRecord;f.advance(.1);assert(lease.isCurrent());assert.equal(lease.routeRecord,record);assert.equal(record.assignmentSequence,binding.assignmentSequence);assert.notDeepEqual(f.body(1),body);
 }finally{f.close();}
});

test('native cycle metadata without admitted presentation cannot prepare or later install a stroll',()=>{
 const f=controlledNativeIdleStroll({installCycle:false});try{
  const p=f.prepare();assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),/obsolete/);const b=f.commitStroll(p);assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b]),/selected source/);assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll),/obsolete/);
 }finally{f.close();}
});

test('the first moving cohort attaches its execution before publishing the stroll acquisition',()=>{
 const f=controlledNativeIdleStroll({peer:false});try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitStroll(p);assert.deepEqual(f.events.at(-1).nativeIdleStroll,b);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());f.advance(.1);assert(f.planner.nativeIdleStrollExecution(f.actor).distance>0);
 }finally{f.close();}
});

test('stroll batches install atomically and reject forged programs, duplicate actors and historical bootstrap',()=>{
 const f=controlledNativeIdleStroll();try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitStroll(p),w=b.reference.worldBoundary;
  for(const mutate of [b=>b.assignmentSequence++,b=>b.reference.worldBoundary.ticket++,b=>b.reference.endTime+=1,b=>b.preparedReference.endTime+=1,b=>{b.reference.pose.yaw+=1;b.preparedReference.pose.yaw+=1;},b=>{b.reference.walkRng=2;b.preparedReference.walkRng=2;}]){const bad=structuredClone(b);mutate(bad);assert.throws(()=>f.c.installStrolls(w,[b,bad]));assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);}
  assert.throws(()=>f.c.installStrolls(w,[b,b]));assert.throws(()=>f.c.installStrolls(w,[b],{bootstrap:true}),/prepared/);assert.throws(()=>f.c.installStrolls({...w,nativeSession:w.nativeSession+1},[b]),/prepared/);assert.equal(f.c.installStrolls(w,[b]),1);const record=lease.routeRecord;assert.throws(()=>f.c.installStrolls(w,[b]));assert.equal(lease.routeRecord,record);
 }finally{f.close();}
});

test('stroll event substitutions and omitted source cannot advance the direct actor cursor',()=>{
 const f=controlledNativeIdleStroll();try{
  const p=f.prepare();f.pauseControl(true);f.pauseClock(true);const b=f.commitStroll(p),event=f.events.at(-1),before=f.c.status().sequence;assert(event.nativeIdleStroll);
  for(const mutate of [e=>{delete e.nativeIdleStroll;},e=>e.nativeIdleStroll.assignmentSequence++,e=>e.nativeIdleStroll.reference.worldBoundary.effectiveTime+=1,e=>e.taskRequest={},e=>e.idleCycleNext={},e=>e.nativeIdleStroll.reference.sourceCycleSequence++,e=>e.state=6,e=>e.targetId=999]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);}
  assert(f.c.accept(event));assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b]));f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);
 }finally{f.close();}
});

test('an issued stroll stays prepared but not drawable until the matching watermark arrives',()=>{
 const f=controlledNativeIdleStroll();try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});f.pauseClock(true);const b=f.commitStroll(p);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b]));f.acceptLastClock();f.pauseClock(false);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('retirement revokes the same admitted stroll record and cannot resurrect its generation',()=>{
 const f=controlledNativeIdleStroll();try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commitStroll(p);f.c.installStrolls(b.reference.worldBoundary,[b]);const record=lease.routeRecord;f.advance(.1);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(record.safeUntil,f.state.elapsed);assert.equal(lease.routeRecord,null);assert.throws(()=>f.c.installStrolls(b.reference.worldBoundary,[b]));assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll));
 }finally{f.close();}
});
