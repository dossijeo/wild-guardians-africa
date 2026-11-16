import assert from 'node:assert/strict';
import {nativeIdleCycleGraphicsFixture} from './native-idle-cycle-graphics.js';

// Actual20/21, native WALK decision, authored actor/clip banks and roster.
// Renderer/admission are doubles; this does not issue a hardware receipt.
export async function nativeIdleStrollGraphicsFixture({profile='youngMale'}={}){
 const f=await nativeIdleCycleGraphicsFixture({mode:'watch',profile,remaining:.03,rng:1});let cycle;
 try{
  cycle=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});cycle.activate();const cycleData=f.commit();cycle.finalize(cycleData);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();
  f.advance(cycleData.nativeIdleCycleBinding.reference.duration);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.setPickAge(cycleData.nativeIdleCycleBinding.reference.duration);f.sync();assert.equal(f.planner.nativeIdleCycleNextRequest(f.nativeActor).idleState.mode,'walk');
  const prepared=f.planner.prepareNativeIdleStrollProposal(f.nativeActor);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=value=>f.terrain.prepareNativeIdleStrollProposal(value,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,cycleData,proposal,support:supportFor(proposal),supportFor,commitStroll(prepared=proposal){
   assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   const nativeIdleStrollBinding=f.planner.nativeIdleStrollBinding(f.nativeActor),nativeRoute={actorId:f.nativeActor,routeHandle:nativeIdleStrollBinding.reference.expectedRouteHandle,assignmentSequence:nativeIdleStrollBinding.assignmentSequence},worldBoundary=nativeIdleStrollBinding.reference.worldBoundary;
   return {worldBoundary,nativeIdleStrollBinding,resources:{version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)}};
  }};
 }catch(error){cycle?.cancel();f.close();throw error;}
}
