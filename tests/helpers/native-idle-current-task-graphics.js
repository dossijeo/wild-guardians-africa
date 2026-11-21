import assert from 'node:assert/strict';
import {nativeIdleArrivalGraphicsFixture} from './native-idle-arrival-graphics.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './native-idle-current-task.js';

// Actual arrived22/acquired21, original GLB/clip banks and roster; GPU is a double.
export async function nativeIdleCurrentTaskGraphicsFixture(options={}){
 const f=await nativeIdleArrivalGraphicsFixture(options);let idle;try{
  idle=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});idle.activate();const idleData=f.commit(f.proposal);idle.finalize(idleData);f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();
  const request=requestNativeIdleCurrentTask(f,f.nativeState);f.sync();const prepared=f.planner.prepareNativeTaskStartProposal(request,nativeIdleCurrentTaskPolicy(f));assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeTaskStartProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,idleData,request,proposal,support:supportFor(proposal),supportFor,
   commitTask(prepared=proposal){assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeTaskStartBinding=f.planner.nativeTaskStartBinding(f.nativeActor),r=nativeTaskStartBinding.reference,nativeRoute={actorId:f.nativeActor,routeHandle:r.expectedRouteHandle,assignmentSequence:nativeTaskStartBinding.assignmentSequence};return {nativeTaskStartBinding,resources:{version:1,kind:14,phase:'committed',worldBoundary:r.worldBoundary,nativeRoute,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};}
  };
 }catch(error){idle?.cancel();f.close();throw error;}
}
