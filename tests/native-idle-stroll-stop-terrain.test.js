import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {estimateRetainedBytes} from '../src/simulation/retained-size.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await flush();}throw Error('Stop terrain test timed out');}
// Actual source12 and terrain ports. The graphical handle is a deterministic
// double and does not claim final-pose rendering or deferred commit support.
async function fixture({outgoing=m=>m,incoming=m=>m,prepare=()=>{},handle=r=>r,...options}={}){
 const f=controlledNativeIdleStroll(options),{port1,port2}=new MessageChannel();let producer,receiver,prepares=0,aborts=0,commits=0,observed;
 try{
  const walk=f.prepare(),binding=f.commitStroll(walk);f.c.installStrolls(binding.reference.worldBoundary,[binding]);f.advance(.12);const result=f.planner.prepareNativeIdleStrollStopProposal(f.actor);assert.equal(result.status,'proposed');const p=result.proposal;
  const send=port1.postMessage.bind(port1),reply=port2.postMessage.bind(port2);port1.postMessage=m=>send(outgoing(structuredClone(m)));port2.postMessage=m=>reply(incoming(structuredClone(m)));const errors=[];
  receiver=createConfirmedTerrainReceiver({port:port2,session:'stop-terrain',confirmedElapsed:f.state.elapsed,retainRevisions:true,autoBootstrap:true,validateRevision:()=>{},residency:{replace(){},remove(){}},onError:error=>errors.push(error.message),prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),async prepareGraphicalProposal(messages,options){prepares++;assert.deepEqual(messages,[]);observed=options;const lease=f.c.admitStrollStop(options.nativeIdleStrollStopTemplate,{preparingWorldBoundary:options.proposedWorldBoundary});await prepare(f,options);let active=true;return handle({canonicalPropsUnmasked:true,preparedWorldBoundary:options.proposedWorldBoundary,preparedIdleStrollStopTemplate:options.nativeIdleStrollStopTemplate,valid:()=>active&&lease.isPrepared(),commit(){active=false;commits++;return true;},abort(){if(active){active=false;aborts++;}}});}});
  producer=createTerrainPublication({port:port1,session:'stop-terrain',epoch:'stop-world',retainRevisions:true});producer.commit(0);await until(()=>receiver.ready(0));await until(()=>producer.status().window?.batches===0);
  return {...f,proposal:p,producer,receiver,errors,observed:()=>observed,counters:()=>({prepares,aborts,commits}),async close(){producer.dispose();receiver.dispose();f.close();await flush();}};
 }catch(error){producer?.dispose();receiver?.dispose();f.close();throw error;}
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id}: terrain port retains typed stop identity, owned effects and byte reservation`,async()=>{
 let runtime,f,h;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=await fixture({profile:profile.id,core:runtime?.core,prepare:native=>native.advance(.2)});const p=f.proposal,body=f.body(1),reference=p.nativeStop;
  h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:p.worldBoundary,resources:p});assert(h.valid());assert.deepEqual(h.preparedIdleStrollStopTemplate,reference);assert.deepEqual(h.preparedWorldBoundary,p.worldBoundary);assert.notDeepEqual(f.body(1),body);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);
  const observed=f.observed();assert.deepEqual(observed.nativeIdleStrollStopTemplate,reference);assert.notEqual(observed.stopEffects.routeEffects.rows,p.routeEffects.rows);assert.deepEqual(observed.stopEffects.routeEffects.rows,p.routeEffects.rows);assert(f.receiver.status().retainedBytes>=estimateRetainedBytes(reference)+p.routeEffects.rows.byteLength+p.gateEffects.rows.byteLength);
  p.routeEffects.rows.fill(-1);assert(observed.stopEffects.routeEffects.rows[0]>0);assert(Object.isFrozen(h.preparedIdleStrollStopTemplate));h.abort();h=null;await until(()=>f.counters().aborts===1);assert.equal(f.receiver.status().nativeProposal,null);assert.deepEqual(f.errors,[]);
 }finally{h?.abort();await f?.close();await runtime?.dispose();}
});

for(const corrupt of ['omitted','substituted'])test(`terrain rejects ${corrupt} prepared stop identity returned by the graphical owner`,async()=>{
 const f=await fixture({handle(raw){if(corrupt==='omitted')delete raw.preparedIdleStrollStopTemplate;else raw.preparedIdleStrollStopTemplate={...raw.preparedIdleStrollStopTemplate,worldBoundary:{...raw.preparedWorldBoundary,ticket:raw.preparedWorldBoundary.ticket+1}};return raw;}});
 try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:f.proposal.worldBoundary,resources:f.proposal}),/retained stop template/);await until(()=>f.counters().aborts===1);assert.equal(f.counters().commits,0);assert(f.planner.nativeIdleStrollBinding(f.actor));assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

for(const corrupt of ['omitted','substituted'])test(`terrain publisher rejects ${corrupt} stop template in the ready ACK`,async()=>{
 const f=await fixture({incoming(m){if(m.kind==='terrainProposalReady'){if(corrupt==='omitted')delete m.preparedIdleStrollStopTemplate;else m.preparedIdleStrollStopTemplate={...m.preparedIdleStrollStopTemplate,worldBoundary:{...m.worldBoundary,ticket:m.worldBoundary.ticket+1}};}return m;}});
 try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:f.proposal.worldBoundary,resources:f.proposal}),/retained stop template mismatch/);await until(()=>f.counters().aborts===1);assert.equal(f.counters().commits,0);assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('a substituted stop owner or forged byte reservation cannot reach graphical preparation',async()=>{
 for(const corruption of ['owner','bytes']){
  const f=await fixture({outgoing(m){if(m.kind==='terrainProposal'){if(corruption==='owner')m.nativeIdleStrollStopTemplate.routes[0].bodyId++;else m.bytes--;}return m;}});
  try{const rejected=assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:f.proposal.worldBoundary,resources:f.proposal}),/disposed|cancelled/);await until(()=>f.errors.length>0);assert.equal(f.counters().prepares,0);assert.match(f.errors[0],/owners|reservation/);f.producer.dispose();await rejected;}finally{await f.close();}
 }
});

test('typed preparation cannot borrow the old exact-time commit after native revalidation',async()=>{
 const f=await fixture();let h;try{
  const p=f.proposal;h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:p.worldBoundary,resources:p});f.advance(.2);const fresh=f.planner.revalidateNativeIdleStrollStopProposal({kind:'native-idle-stroll-stop-proposal-ticket',authorityEpoch:p.worldBoundary.authorityEpoch,session:p.nativeSession,ticket:p.ticket,sourceRoute:p.nativeStop.sourceRoute});assert.equal(fresh.status,'revalidated');assert.throws(()=>h.commit({worldBoundary:fresh.proposal.worldBoundary,resources:fresh.proposal}),/differs from preparation/);assert.equal(f.counters().commits,0);assert(f.planner.nativeIdleStrollBinding(f.actor));h.abort();h=null;await until(()=>f.counters().aborts===1);assert.deepEqual(f.errors,[]);
 }finally{h?.abort();await f.close();}
});

test('typed stop metadata cannot annotate another family or unrelated effects',async()=>{
 const f=await fixture();try{
  const p=f.proposal,wrong=structuredClone(p);wrong.kind=8;await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:p.worldBoundary,resources:wrong}),/stop proposal/);const owner=structuredClone(p);owner.nativeStop.routes[0].bodyId++;await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:p.worldBoundary,resources:owner}),/owners/);assert.equal(f.counters().prepares,0);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});
