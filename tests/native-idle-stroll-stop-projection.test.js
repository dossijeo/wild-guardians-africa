import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {copyNativeIdleStrollStopAttestation,copyNativeIdleStrollStopProjection,copyNativeIdleStrollStoppedBody,NATIVE_STOP_POSE_FIELDS} from '../src/world/native-idle-stroll-stop.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

function fixture(options={}){
 const f=controlledNativeIdleStroll(options);try{
  const walk=f.prepare(),binding=f.commitStroll(walk);f.c.installStrolls(binding.reference.worldBoundary,[binding]);f.advance(.05);const prepared=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(prepared.status,'proposed');
  const selector={kind:'native-idle-stroll-stopped-body',version:1,stop:prepared.proposal.nativeStop,actorId:f.actor};
  return {...f,walk,binding,prepared,selector,acquire(at){f.advance(at-f.state.elapsed);const fresh=f.planner.revalidateNativeIdleStrollStopProposal(prepared.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const p=fresh.proposal,projection={version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects},proof=f.planner.nativeIdleStrollStopBinding(p.nativeStop,prepared.proposal.nativeStop,{projection});assert(proof);return {fresh,projection,proof};}};
 }catch(error){f.close();throw error;}
}

for(const threaded of [false,true])for(const profile of PROFILES)for(const knot of [1,4])test(`${threaded?'pthread':'standalone'} ${profile.id}: final stopped values preserve actual native turn at knot ${knot}`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,core:runtime?.core});assert(f.walk.rows.length>knot*16);const at=f.walk.rows[knot*16],lease=f.c.admitStoppedBody(f.selector,{preparingWorldBoundary:f.prepared.proposal.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.throws(()=>lease.value('yaw'),/obsolete/);
  const {proof,projection}=f.acquire(at),row=proof.projection.routeEffects.rows.slice(8,26),body=f.planner.nativeSuspendedGateRoute(f.actor);assert.equal(body.pose.yaw,row[4]);assert.notEqual(f.prepared.proposal.routeEffects.rows[12],row[4]);assert.equal(lease.isCurrent(),false);f.c.installStrollStops(proof.reference.worldBoundary,[proof]);assert(lease.isCurrent());
  for(const [field,index] of Object.entries(NATIVE_STOP_POSE_FIELDS))assert.equal(lease.value(field),row[index],field);assert.equal(lease.value('age'),at-f.binding.reference.worldBoundary.effectiveTime);assert.equal(lease.bodyReference.suspendedAt,at);assert.equal(lease.reference.stop.worldBoundary.effectiveTime,f.prepared.proposal.worldBoundary.effectiveTime);assert.equal(lease.reference.stop.worldBoundary.effectiveTime<lease.bodyReference.suspendedAt,true);
  projection.routeEffects.rows.fill(-100);assert.throws(()=>proof.projection.routeEffects.rows.fill(-200),TypeError);assert.equal(lease.value('yaw'),row[4]);assert.equal(lease.value('x'),row[0]);assert.equal(f.c.admitStrollStop(f.selector.stop).binding.projection,undefined);assert.throws(()=>lease.value('__proto__'),/field/);const other=f.body(3);f.advance(.1);assert(lease.isCurrent());assert.equal(lease.value('yaw'),row[4]);assert.notDeepEqual(f.body(3),other);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(lease.isCurrent(),false);assert.throws(()=>lease.value('yaw'),/obsolete/);
 }finally{f?.close();await runtime?.dispose();}
});

test('source association rejects altered final pose despite identical resource owners',()=>{
 const f=fixture();try{
  const {fresh,projection,proof}=f.acquire(f.walk.rows[16]);assert(copyNativeIdleStrollStopAttestation(proof).projection);const changed=structuredClone(projection);changed.routeEffects.rows[8]+=.25;assert.equal(f.planner.nativeIdleStrollStopBinding(fresh.proposal.nativeStop,f.prepared.proposal.nativeStop,{projection:changed}),null);assert(f.planner.nativeIdleStrollStopBinding(fresh.proposal.nativeStop,f.prepared.proposal.nativeStop));assert.throws(()=>f.c.admitStoppedBody(f.selector,{preparingWorldBoundary:f.prepared.proposal.worldBoundary}),/obsolete/);
 }finally{f.close();}
});

test('metadata association alone never grants final projection values',()=>{
 const f=fixture();try{
  const {fresh}=f.acquire(f.walk.rows[16]),metadata=f.planner.nativeIdleStrollStopBinding(fresh.proposal.nativeStop,f.prepared.proposal.nativeStop);f.c.installStrollStops(metadata.reference.worldBoundary,[metadata]);assert(f.c.admitStrollStop(f.selector.stop).isCurrent());assert.throws(()=>f.c.admitStoppedBody(f.selector),/final projection/);
 }finally{f.close();}
});

test('projection and selected-body codecs preserve copied data without widening their authority identity',()=>{
 const f=fixture();try{
  const p=f.prepared.proposal,raw={version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects},copy=copyNativeIdleStrollStopProjection(raw,p.nativeStop);raw.routeEffects.rows[8]+=.25;assert.notEqual(copy.routeEffects.rows[8],raw.routeEffects.rows[8]);assert(Object.isFrozen(copyNativeIdleStrollStoppedBody(f.selector)));assert.throws(()=>copyNativeIdleStrollStoppedBody({...f.selector,actorId:999}),/suspended owner/);assert.throws(()=>copyNativeIdleStrollStopProjection({...copy,extra:true},p.nativeStop),/projection/);const changed=structuredClone(copy);changed.routeEffects.rows[0]++;assert.throws(()=>copyNativeIdleStrollStopProjection(changed,p.nativeStop),/owners|source route/);
 }finally{f.close();}
});
