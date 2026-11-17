import assert from 'node:assert/strict';
import {nativeIdleMovingStopGraphicsFixture} from './native-idle-moving-stop-graphics.js';

export async function nativeIdleMovingHomeGraphicsFixture(options={}){
 const f=await nativeIdleMovingStopGraphicsFixture(options);try{
  // Expiry is the game clock reaching a profile end, without changing the
  // pinned contract/worker policy after the physical stop was prepared.
  f.nativeState.time=600;const request=f.planner.requestNativeIdleHome(f.nativeState,f.worker);f.planner.commitNativeCausalClock();f.sync();const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=value=>f.terrain.prepareNativeHomeRouteProposal(value,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);
  return {...f,request,proposal,support:supportFor(proposal),supportFor,commitHome(actual=proposal,previous=proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),previous.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor);return {nativeHomeRouteBinding,resources:{version:1,kind:18,phase:'committed',worldBoundary:nativeHomeRouteBinding.reference.worldBoundary,nativeHomeRouteBinding,presentation:f.planner.captureNativeRoutePresentation(nativeHomeRouteBinding.reference.expectedRouteHandle)}};}};
 }catch(error){f.close();throw error;}
}
