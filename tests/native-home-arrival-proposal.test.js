import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeHomeArrivalFixture} from './helpers/native-home-arrival.js';
import {copyNativeHomeArrivalProposal,copyNativeHomeArrivalReference} from '../src/world/native-home-arrival.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

test('a Home endpoint stays physically owned during arrival preparation and cancellation',()=>{
 const f=nativeHomeArrivalFixture();try{const body=f.body(1),ledger=JSON.stringify(f.state.ledger),sequence=f.w.nav_intent_transition_sequence(),p=f.prepareArrival();assert.equal(p.status,'proposed');assert.deepEqual(copyNativeHomeArrivalProposal(p.proposal),p.proposal);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(JSON.stringify(f.state.ledger),ledger);assert.equal(f.worker.status,'returning');const t=f.tuple();assert.equal(f.planner.cancelNativeHomeArrivalProposal(p.proposal.ticket),true);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_home_arrival_proposal_commit_bound(...t.slice(0,5),p.proposal.ticket.ticket),-1);assert.equal(f.planner.prepareNativeHomeArrivalProposal(f.homeSource).status,'proposed');
 }finally{f.close();}
});

for(const threaded of [false,true])test(`Home arrival removes only its arrived body and publishes direct revocation (${threaded?'pthread':'standalone'})`,async()=>{
 let runtime,f;try{if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=nativeHomeArrivalFixture(runtime?{core:runtime.core}:{});const peer=f.body(3),count=f.w.spatial_body_count(),source=f.homeSource,p=f.prepareArrival();assert.equal(p.status,'proposed');const old=f.w.nav_intent_transition_sequence(),t=f.tuple();assert.equal(f.commitArrival(p.proposal),1);assert.equal(f.w.spatial_body_count(),count-1);assert.equal(f.body(1),null);assert.deepEqual(f.body(3),peer);assert.equal(f.w.nav_intent_transition_sequence(),old+1);assert.equal(f.w.nav_intent_actor(source.reference.actorId),0);assert.equal(f.w.nav_intent_worker_inactive(source.reference.actorId),1);assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.nativeHomeRouteExecution(f.actor),null);assert.equal(f.planner.sampleNativeRoute(source.reference.expectedRouteHandle,f.state.elapsed),null);const a=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_home_arrival_result_ptr(),52));assert.deepEqual(a.slice(0,4),[1,old+1,p.proposal.ticket.ticket,p.proposal.ticket.ticket]);assert.equal(a[5],source.reference.actorId);assert.equal(a[6],source.reference.bodyId);assert.equal(f.w.nav_home_arrival_proposal_commit_bound(...t.slice(0,5),p.proposal.ticket.ticket),-1);
 }finally{f?.close();await runtime?.dispose();}
});

test('arrival rejects an unfinished Home, changed body revision, retired owner and foreign source',()=>{
 const moving=nativeHomeArrivalFixture({arrived:false});try{const body=moving.body(1);assert.equal(moving.prepareArrival().status,'unsupported');assert.deepEqual(moving.body(1),body);}finally{moving.close();}
 for(const mode of ['revision','retired','foreign']){const f=nativeHomeArrivalFixture();try{const p=f.prepareArrival();assert.equal(p.status,'proposed');const body=f.body(1);if(mode==='revision'){assert.equal(f.w.spatial_body_upsert(77,body[1]+25,body[2]+25,.28,0,1),1);assert.equal(f.commitArrival(p.proposal),-2);assert.deepEqual(f.body(1),body);}else if(mode==='retired'){assert.equal(f.w.nav_intent_retire_actor(f.held.reference.actorId),1);assert.equal(f.commitArrival(p.proposal),-2);assert.deepEqual(f.body(1),body);}else{assert.equal(f.planner.cancelNativeHomeArrivalProposal(p.proposal.ticket),true);const foreign=structuredClone(f.homeSource);foreign.reference.sourceSettlement.reference.home.x++;assert.throws(()=>f.planner.prepareNativeHomeArrivalProposal(foreign),/prepared|stationary|Home/);assert.deepEqual(f.body(1),body);}}
  finally{f.close();}}
});

test('late arrival revalidation holds its endpoint and binds the original prepared origin',()=>{
 const f=nativeHomeArrivalFixture();try{const p=f.prepareArrival().proposal,body=f.body(1);f.advance(.4);const next=f.planner.revalidateNativeHomeArrivalProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameSourceState);assert(next.proposal.worldBoundary.effectiveTime>p.worldBoundary.effectiveTime);assert.deepEqual(f.body(1),body);assert.equal(f.commitArrival(next.proposal,p),1);const a=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_home_arrival_result_ptr(),52));assert.equal(a[2],p.ticket.ticket);assert.equal(a[3],next.proposal.ticket.ticket);assert.equal(a[20],p.worldBoundary.effectiveTime);assert.equal(a[44],next.proposal.worldBoundary.effectiveTime);
 }finally{f.close();}
});

test('arrival transport rejects altered endpoint, physical phases, source identity and movement aliases',()=>{
 const f=nativeHomeArrivalFixture();try{const p=f.prepareArrival().proposal;for(const change of [r=>{r.pose.x+=1;},r=>{r.pose.runPhase=-1;},r=>{r.bodyId++;},r=>{r.worldBoundary.effectiveTime=r.sourceHome.reference.endTime-1;},r=>{r.nativeResume={};},r=>{r.bodyFlags=3;}]){const r=structuredClone(p.nativeHomeArrival);change(r);assert.throws(()=>copyNativeHomeArrivalReference(r),/Home/);}}
 finally{f.close();}
});

test('both canonical modules expose the complete prepared Home arrival ABI',async()=>{
 const names=['version','stage','snapshot','header_ptr','cancel','revalidate','time_translation_ptr','commit_bound'].map(x=>'nav_home_arrival_proposal_'+x).concat('nav_home_arrival_result_ptr','nav_intent_worker_inactive'),exports=new Set(WebAssembly.Module.exports(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'))).map(e=>e.name));for(const n of names)assert(exports.has(n),n);const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);try{for(const n of names)assert.equal(typeof runtime.core.wasm[n],'function',n);}finally{await runtime.dispose();}
});


test('a foreign preparation ticket or an incorrect drain boundary cannot retire the arrived Home body',()=>{
 for(const mode of ['template','boundary']){const f=nativeHomeArrivalFixture();try{const p=f.prepareArrival().proposal,t=f.tuple(),body=f.body(1),sequence=f.w.nav_intent_transition_sequence();if(mode==='template'){assert.equal(f.w.nav_home_arrival_proposal_commit_bound(...t.slice(0,5),p.ticket.ticket+123),-9);assert.deepEqual(f.body(1),body);assert.equal(f.commitArrival(p),1);}else{t[2]--;assert.equal(f.w.nav_home_arrival_proposal_commit_bound(...t.slice(0,5),p.ticket.ticket),-3);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);}}
 finally{f.close();}}
});
