import assert from 'node:assert/strict';
import {nativeIdleArrivalGraphicsFixture} from './native-idle-arrival-graphics.js';

// Original GLB/clip banks and actual22->21 source/Game; renderer is a double.
export async function nativeIdleCurrentHomeGraphicsFixture(options={}){
 const f=await nativeIdleArrivalGraphicsFixture(options);let idle;try{
  idle=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});idle.activate();const idleData=f.commit(f.proposal);idle.finalize(idleData);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();
  f.worker.contractDay=f.nativeState.day-1;const request=f.planner.requestNativeIdleHome(f.nativeState,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.sync();const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeHomeRouteProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,idleData,request,proposal,support:supportFor(proposal),supportFor,
   commitHome(proposal=prepared.proposal,previous=prepared.proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),previous.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor);return {nativeHomeRouteBinding,resources:{version:1,kind:18,phase:'committed',worldBoundary:nativeHomeRouteBinding.reference.worldBoundary,nativeHomeRouteBinding,presentation:f.planner.captureNativeRoutePresentation(nativeHomeRouteBinding.reference.expectedRouteHandle)}};}
  };
 }catch(error){idle?.cancel();f.close();throw error;}
}
