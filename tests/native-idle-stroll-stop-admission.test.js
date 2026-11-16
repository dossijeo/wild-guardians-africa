import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {strollAdmissionProtocol} from './helpers/native-idle-stroll-admission.js';

const flush=()=>new Promise(r=>setImmediate(r));
for(const threaded of [false,true])for(const stale of [false,true])test(`${threaded?'pthread':'standalone'} explicit stroll stop crosses existing resource/control ports (${stale?'clock invalidates':'retained packet commits'})`,async()=>{
 let f,p,proposal,terrain,runtime;
 try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=controlledNativeIdleStroll({core:runtime?.core});
  const {port1,port2}=new MessageChannel(),terrainErrors=[];let commits=0;
  const receiver=createConfirmedTerrainReceiver({port:port2,session:'stop-terrain',confirmedElapsed:f.state.elapsed,retainRevisions:true,autoBootstrap:true,validateRevision:()=>{},residency:{replace(){},remove(){}},onError:e=>terrainErrors.push(e.message),prepareGraphicalBatch:async()=>({valid:()=>true,commit(){return true;},abort(){}}),prepareGraphicalProposal:async(messages,{proposedWorldBoundary})=>{assert.deepEqual(messages,[]);if(stale)f.advance(.01);return {canonicalPropsUnmasked:true,preparedWorldBoundary:proposedWorldBoundary,valid:()=>true,commit(){commits++;return true;},abort(){}};}}),producer=createTerrainPublication({port:port1,session:'stop-terrain',epoch:'stop-world',retainRevisions:true});terrain={receiver,producer};producer.commit(0);for(let i=0;i<100&&!receiver.ready(0);i++)await flush();
  p=await strollAdmissionProtocol(f,{prepareStopResources:request=>{proposal=request.resources;assert.equal(proposal.kind,12);assert.equal(proposal.chunks.length,0);assert.equal(proposal.removed.length,0);assert.equal(proposal.routeEffects.rows.length,26);assert.equal(proposal.gateEffects.rows.length,0);return producer.prepareNativeWorldResources(request);}});
  assert.equal((await p.run()).status,'committed');await p.released;await flush();f.advance(.12);const binding=f.planner.nativeIdleStrollBinding(f.actor),body=f.body(1),rng=f.state.rng;
  const result=await p.stop();for(let i=0;i<20;i++){await flush();if(p.requests.filter(m=>m.type==='IntentMutationRelease').length===2)break;}assert.equal(result.status,stale?'stale':'committed',JSON.stringify(result));assert(proposal);assert.equal(f.state.rng,rng);
  if(stale){assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);assert.equal(p.counters().commits,1);}
  else{
   assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);const held=f.planner.nativeSuspendedGateRoute(f.actor);assert(held);assert.equal(held.resumeHandle.slot,binding.reference.expectedRouteHandle.slot);assert.equal(result.resources.kind,12);assert.deepEqual(result.resources.chunks,[]);assert.deepEqual(result.ids,[]);
   const release=p.requests.filter(m=>m.type==='IntentMutationRelease').at(-1);assert.equal(release.committed,true);assert.equal(release.nativeSuspendedBodies.length,1);assert.equal(release.nativeSuspendedBodies[0].suspendedAt,f.state.elapsed);assert(f.c.admitSuspended(release.nativeSuspendedBodies[0]).isCurrent());producer.commit(1);for(let i=0;i<100&&!receiver.ready(1);i++)await flush();assert(receiver.ready(1));receiver.confirm(1,f.state.elapsed);assert.equal(commits,1);assert.deepEqual(terrainErrors,[]);assert.equal(p.counters().commits,1);
   const peer=f.body(3);f.advance(.1);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);
  }
  assert.deepEqual(p.errors,[]);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{terrain?.producer.dispose();terrain?.receiver.dispose();await p?.close();f?.close();await runtime?.dispose();}
});

test('generic stop entry rejects an unretained packet and a forged source binding',async()=>{
 const f=controlledNativeIdleStroll();let p;
 try{
  p=await strollAdmissionProtocol(f);assert.equal((await p.run()).status,'committed');await p.released;await flush();f.advance(.12);const binding=f.planner.nativeIdleStrollBinding(f.actor),body=f.body(1);
  assert.throws(()=>f.planner.mutateNativeWorldAfterGpuQuiescence({mutation:{type:'stopIdleStroll',binding}}),/retained/);
  const forged=structuredClone(binding);forged.assignmentSequence++;const stale=await f.planner.mutateNativeWorldAfterGpuQuiescence({mutation:{type:'stopIdleStroll',binding:forged},prepareResources:()=>{throw Error('must not prepare');}});assert.equal(stale.status,'stale');
  let aborted=0;const result=await f.planner.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>p.source,mutation:{type:'stopIdleStroll',binding},prepareResources:async()=>({valid:()=>true,abort(){aborted++;}})});assert.equal(result.status,'control-failed');assert.match(result.error,/retained command packet/);assert.equal(aborted,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleStrollBinding(f.actor),binding);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{await p?.close();f.close();}
});
