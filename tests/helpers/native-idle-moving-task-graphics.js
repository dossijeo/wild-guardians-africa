import assert from 'node:assert/strict';
import {nativeIdleMovingStopGraphicsFixture} from './native-idle-moving-stop-graphics.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './native-idle-current-task.js';

// Real prepared stop and Task claim; original GLB/clip banks/roster. Renderer
// and submitted picking remain deterministic doubles, not GPU acceptance.
export async function nativeIdleMovingTaskGraphicsFixture(options={}){
 const f=await nativeIdleMovingStopGraphicsFixture(options);try{
  const request=requestNativeIdleCurrentTask(f,f.nativeState);f.sync();const prepared=f.planner.prepareNativeTaskStartProposal(request,nativeIdleCurrentTaskPolicy(f));assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeTaskStartProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,request,proposal,support:supportFor(proposal),supportFor,
   commitTask(prepared=proposal){assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeTaskStartBinding=f.planner.nativeTaskStartBinding(f.nativeActor),r=nativeTaskStartBinding.reference,nativeRoute={actorId:f.nativeActor,routeHandle:r.expectedRouteHandle,assignmentSequence:nativeTaskStartBinding.assignmentSequence};return {nativeTaskStartBinding,resources:{version:1,kind:14,phase:'committed',worldBoundary:r.worldBoundary,nativeRoute,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};}
  };
 }catch(error){f.close();throw error;}
}
