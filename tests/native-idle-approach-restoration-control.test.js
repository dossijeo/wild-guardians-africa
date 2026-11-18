import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {controlledRestoredNativeIdleStroll} from './helpers/native-idle-stroll-restoration-control.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const profile of PROFILES)test(`${profile.id} restored approach kind survives the existing native control, late22 installation and REST21`,()=>{
 const f=controlledRestoredNativeIdleStroll({saved:savedNativeIdleApproach({profile:profile.id,position:'inside'})});try{
  const source=f.c.pendingIdleStrollRequest(f.actor),body=f.body(1);assert(source.approach);assert.equal(f.c.status().active,0);const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());
  // This pose is inside the radius. A local-looking DTO could pass shape
  // checks, but cannot strip the kind of the actual pending native source.
  const stripped=structuredClone(p.nativeIdleStroll);delete stripped.sourceRequest.approach;assert.throws(()=>f.c.admitStroll(stripped,{preparingWorldBoundary:p.worldBoundary}));
  f.advance(.2);assert.deepEqual(f.body(1),body);assert.equal(f.planner.revalidateNativeIdleStrollProposal(p.ticket).status,'revalidated');f.pauseClock(true);const binding=f.commit(p);assert.deepEqual(binding.reference.sourceRequest,source);assert(!lease.isCurrent());assert.throws(()=>f.c.installStrolls(binding.reference.worldBoundary,[binding]));f.acceptLastClock();f.pauseClock(false);assert.equal(f.c.installStrolls(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());
  f.advance(.1);assert.notDeepEqual(f.body(1),body);assert.equal(f.worker.destinationId,f.worker.idleState.anchorId);assert.equal(f.worker.idleState.remaining,source.idleSeconds*2);
  f.advance(binding.reference.endTime-f.state.elapsed+.05);const rest=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(rest.status,'proposed');const r=rest.proposal,next=f.c.admitIdleCycle(r.nativeIdleCycle,{preparingWorldBoundary:r.worldBoundary});assert(next.isPrepared());assert(lease.isCurrent());assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),r.ticket.ticket),1);f.planner.commitNativeCausalClock();assert(!lease.isCurrent());const proof=f.planner.nativeIdleCycleBinding(f.actor);assert.equal(f.c.installIdleCycles(proof.reference.worldBoundary,[proof]),1);assert(next.isCurrent());
 }finally{f.close();}
});
