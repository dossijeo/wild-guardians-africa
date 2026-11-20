import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeSettledIdle} from './helpers/native-settled-idle-control.js';

// Native source preparation is distinct from graphical execution permission.
for(const inside of [true,false])test(`actual17 ${inside?'21':'22'} preparation retains its admitted settlement until actual acquisition`,()=>{
 const f=controlledNativeSettledIdle({inside});try{
  const p=inside?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const proposal=p.proposal,reference=inside?proposal.nativeIdleCycle:proposal.nativeIdleStroll;
  const lease=inside?f.c.admitIdleCycle(reference,{preparingWorldBoundary:proposal.worldBoundary}):f.c.admitStroll(reference,{preparingWorldBoundary:proposal.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());assert(f.source.isCurrent());const body=f.body(1);
  f.advance(.2);assert(lease.isPrepared());assert(f.source.isCurrent());assert.deepEqual(f.body(1),body);const fresh=inside?f.planner.revalidateNativeIdleCycleProposal(proposal.ticket):f.planner.revalidateNativeIdleStrollProposal(proposal.ticket);assert.equal(fresh.status,'revalidated');assert(inside?f.planner.cancelNativeIdleCycleProposal(fresh.proposal.ticket):f.planner.cancelNativeIdleStrollProposal(fresh.proposal.ticket));assert(f.source.isCurrent());assert(!lease.isCurrent());
 }finally{f.close();}
});

for(const inside of [true,false])test(`actual17 ${inside?'21':'22'} requires its issued event, native clock and exact installation`,()=>{
 const f=controlledNativeSettledIdle({inside});try{
  const p=inside?f.planner.prepareNativeIdleCycleProposal(f.actor):f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(p.status,'proposed');const proposal=p.proposal,reference=inside?proposal.nativeIdleCycle:proposal.nativeIdleStroll,lease=inside?f.c.admitIdleCycle(reference,{preparingWorldBoundary:proposal.worldBoundary}):f.c.admitStroll(reference,{preparingWorldBoundary:proposal.worldBoundary});
  const commit=inside?f.w.nav_idle_cycle_proposal_commit_bound:f.w.nav_idle_stroll_proposal_commit_bound;assert.equal(commit(...f.tuple().slice(0,5),proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=inside?f.planner.nativeIdleCycleBinding(f.actor):f.planner.nativeIdleStrollBinding(f.actor);assert(proof);
  const install=()=>inside?f.c.installIdleCycles(proof.reference.worldBoundary,[proof]):f.c.installStrolls(proof.reference.worldBoundary,[proof]);assert.throws(install);assert(!lease.isCurrent());f.sync({withClock:false});assert.throws(install);assert(!f.source.isCurrent());assert(!lease.isCurrent());f.acceptClock();assert(lease.isPrepared());assert.equal(install(),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,proof.reference.worldBoundary.effectiveTime);
 }finally{f.close();}
});

test('first settled Idle preserves its native Idle phase at the actual retimed commit',()=>{
 const f=controlledNativeSettledIdle();try{
  const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');const lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});f.advance(.7);const fresh=f.planner.revalidateNativeIdleCycleProposal(p.proposal.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.proposal.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeIdleCycleBinding(f.actor);assert(proof.reference.worldBoundary.effectiveTime>proof.preparedReference.worldBoundary.effectiveTime);f.sync();assert.equal(f.c.installIdleCycles(proof.reference.worldBoundary,[proof]),1);assert(lease.isCurrent());assert.equal(lease.idleCycleRecord.phaseDelay,proof.reference.worldBoundary.effectiveTime);assert.equal(typeof lease.idleCycleRecord.phaseDelay,'number');
 }finally{f.close();}
});
