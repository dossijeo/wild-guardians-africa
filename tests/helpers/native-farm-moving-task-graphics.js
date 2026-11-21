import assert from 'node:assert/strict';
import {nativeFarmArrivalStopGraphicsFixture} from './native-farm-arrival-stop-graphics.js';
import {requestNativeIdleCurrentTask as requestOrdinaryTask,nativeIdleCurrentTaskPolicy as taskPolicy} from './native-idle-current-task.js';

// Real Farm23, stop24 and ordinary Task claim, authored GLB/banks and roster.
// Renderer, admission and submitted picking are doubles, not GPU acceptance.
export async function nativeFarmMovingTaskGraphicsFixture(options={}){
 const f=await nativeFarmArrivalStopGraphicsFixture(options);try{
  const stopped=await f.prepare();f.advance(.2);f.sync();const proof=f.commitStop();
  for(const part of stopped.parts){part.acceptNativeStopBinding(proof);part.activate();part.attach();const release=part.finalize();release.retire();release.notify();}
  f.projectHeld();f.submit();f.flush();const source=f.source,request=requestOrdinaryTask(f,f.nativeState);f.sync();
  const prepared=f.planner.prepareNativeTaskStartProposal(request,taskPolicy(f));assert.equal(prepared.status,'proposed');
  const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeTaskStartProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,source,request,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   advance(seconds){f.move(seconds);f.submit();},
   commitTask(prepared=proposal){assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeTaskStartBinding=f.planner.nativeTaskStartBinding(f.nativeActor),r=nativeTaskStartBinding.reference,nativeRoute={actorId:f.nativeActor,routeHandle:r.expectedRouteHandle,assignmentSequence:nativeTaskStartBinding.assignmentSequence};return {nativeTaskStartBinding,resources:{version:1,kind:14,phase:'committed',worldBoundary:r.worldBoundary,nativeRoute,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};}
  };
 }catch(error){f.close();throw error;}
}
