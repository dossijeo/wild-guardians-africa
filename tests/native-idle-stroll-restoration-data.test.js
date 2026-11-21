import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleStroll,nativeIdleStrollRestorationSource} from './helpers/native-idle-stroll-restoration-source.js';
import {copyNativeIdleStrollRequestReference,sameNativeIdleStrollRequestReference} from '../src/world/native-idle-stroll-request-reference.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollResources,nativeIdleStrollContinuesRestoredRequest,nativeIdleStrollContinuesNext} from '../src/world/native-idle-stroll.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const profile of PROFILES)test(`${profile.id} typed restored WALK is copied from the new native source and revalidates/acquires22 without a cycle21`,()=>{
 const saved=savedNativeIdleStroll({profile:profile.id}),f=nativeIdleStrollRestorationSource(saved);try{
  f.worker.nativeRouteAdmission='pending-stroll-resources';const {bridge,actor,w}=f,body=f.body(1),state=structuredClone(f.state),q=bridge.nativeIdleStrollRequestReference(actor);assert(q);assert.notEqual(q.authorityEpoch,saved.reference.worldBoundary.authorityEpoch);assert.equal(q.walkRng,f.worker.idleState.rng);assert.deepEqual(q.destination,saved.reference.destination);assert.deepEqual(bridge.nativeIdleStrollRequestReferences(),[q]);assert(Object.isFrozen(q)&&Object.isFrozen(q.pose)&&Object.isFrozen(q.anchor)&&Object.isFrozen(q.destination));
  assert.equal(bridge.commitNativeCausalClock().status,'committed');const p=bridge.prepareNativeIdleStrollProposal(actor);assert.equal(p.status,'proposed');const r=p.proposal.nativeIdleStroll;assert.equal(r.sourceCycleSequence,0);assert.deepEqual(r.sourceRequest,q);assert(nativeIdleStrollContinuesRestoredRequest(r,q));assert(!nativeIdleStrollContinuesNext(r,{}));assert.deepEqual(f.body(1),body);assert.deepEqual(f.state,state);
  assert.equal(f.advance(f.state.elapsed+.2).status,'advanced');bridge.commitNativeCausalClock();const refreshed=bridge.revalidateNativeIdleStrollProposal(p.proposal.ticket);assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameRelativeProgram);assert.deepEqual(refreshed.proposal.nativeIdleStroll.sourceRequest,q);assert.equal(w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);assert.equal(bridge.beginNativeRouteExecution().status,'started');bridge.commitNativeCausalClock();const binding=bridge.nativeIdleStrollBinding(actor);assert.deepEqual(binding.preparedReference,r);assert.deepEqual(binding.reference.sourceRequest,q);assert.deepEqual(bridge.nativeIdleStrollSourceRequestReference(actor),q);assert.equal(bridge.nativeIdleStrollRequestReference(actor),null);assert.deepEqual(bridge.nativeIdleStrollRequestReferences(),[]);const route={actorId:actor,assignmentSequence:binding.assignmentSequence,routeHandle:binding.reference.expectedRouteHandle},resources=copyNativeIdleStrollResources({version:1,kind:22,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeRoute:route,nativeIdleStrollBinding:binding,presentation:bridge.captureNativeRoutePresentation(route.routeHandle)});assert.deepEqual(resources.nativeIdleStrollBinding,binding);assert.deepEqual(f.body(1),body);assert.equal(bridge.nativeIdleCycleBinding(actor),null);
 }finally{f.close();}
});

test('restored source copies reject malformed fields, injected execution grants and mismatched predecessors',()=>{
 const f=nativeIdleStrollRestorationSource();try{
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor),copy=copyNativeIdleStrollRequestReference(q);assert(sameNativeIdleStrollRequestReference(q,copy));for(const key of ['nativeRoute','ticket','lease','sourceCycle'])assert.throws(()=>copyNativeIdleStrollRequestReference({...q,[key]:{}}),/restored/);
  for(const [key,value] of [['bodyId',0],['bodyFlags',3],['authorityEpoch',''],['nativeSession',0],['requestSequence',0],['walkRng',4294967296],['approachRetry',-1]])assert.throws(()=>copyNativeIdleStrollRequestReference({...q,[key]:value}),/restored/);
  assert.throws(()=>copyNativeIdleStrollRequestReference({...q,pose:{...q.pose,walkPhase:NaN}}),/restored/);assert.throws(()=>copyNativeIdleStrollRequestReference({...q,destination:{x:10000,z:10000}}),/restored/);
  f.bridge.commitNativeCausalClock();const p=f.bridge.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const r=p.proposal.nativeIdleStroll,{sourceRequest,...missing}=r;assert.throws(()=>copyNativeIdleStrollReference(missing),/bounded source/);assert.throws(()=>copyNativeIdleStrollReference({...r,sourceCycleSequence:1}),/bounded source/);for(const mutate of [q=>q.actorId++,q=>q.bodyId++,q=>q.walkRng++,q=>q.requestSequence++,q=>q.pose.walkPhase++,q=>q.anchor.x+=.01,q=>q.destination.x+=.01,q=>q.authorityEpoch+='-old']){const bad=structuredClone(sourceRequest);mutate(bad);assert.throws(()=>copyNativeIdleStrollReference({...r,sourceRequest:bad}));assert(!nativeIdleStrollContinuesRestoredRequest(r,bad));}assert(f.bridge.cancelNativeIdleStrollProposal(p.proposal.ticket));assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);
 }finally{f.close();}
});

test('a restored typed zero-length22 carries its genuine request and unchanged phase source',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleStroll({advance:'arrival'}));try{
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor);f.bridge.commitNativeCausalClock();const p=f.bridge.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');assert.equal(p.proposal.distance,0);assert.equal(p.proposal.startTime,p.proposal.endTime);assert.equal(p.proposal.rows.length,16);assert.deepEqual(p.proposal.nativeIdleStroll.sourceRequest,q);assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();const view=f.bridge.nativeIdleStrollExecution(f.actor);assert(view.arrived);assert.deepEqual(view.binding.reference.sourceRequest,q);assert.equal(view.pose.walkPhase,q.pose.walkPhase);assert(view.desiredRest);assert.equal(f.bridge.nativeIdleCycleBinding(f.actor),null);
 }finally{f.close();}
});

test('changed retained Game semantics reject restored preparation before opening a native candidate',()=>{
 for(const change of [w=>w.x+=.1,w=>w.idleState.rng++,w=>w.idleState.destination.x+=.1,w=>w.walkPhase++,w=>w.contractDay--]){
  const f=nativeIdleStrollRestorationSource();try{f.bridge.commitNativeCausalClock();change(f.worker);assert.equal(f.bridge.prepareNativeIdleStrollProposal(f.actor).status,'unsupported');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
 }
});

test('restored revalidation rejects a changed retained Game pose without changing the held body or issuing a route',()=>{
 const f=nativeIdleStrollRestorationSource();try{
  f.bridge.commitNativeCausalClock();const p=f.bridge.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const body=f.body(1),q=f.bridge.nativeIdleStrollRequestReference(f.actor);f.worker.walkPhase+=1;assert.equal(f.bridge.revalidateNativeIdleStrollProposal(p.proposal.ticket).status,'stale');assert.deepEqual(f.body(1),body);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);assert(f.bridge.cancelNativeIdleStrollProposal(p.proposal.ticket));
 }finally{f.close();}
});
