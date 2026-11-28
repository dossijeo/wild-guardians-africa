import assert from 'node:assert/strict';
import {nativeFarmArrivalGraphicsFixture} from './native-farm-arrival-route-graphics.js';
import {requestNativeIdleCurrentTask,nativeIdleCurrentTaskPolicy} from './native-idle-current-task.js';

// Actual completed23, ordinary Task6 and native14, authored assets/terrain.
// Renderer/admission and submitted frame witnesses remain unit-test doubles.
export async function nativeFarmArrivedTaskGraphicsFixture(options={}){
 const f=await nativeFarmArrivalGraphicsFixture(options);let arrival,taskEpoch;
 try{
  arrival=await f.roster.prepareNativeFarmArrivalProposal(f.support,{getPickTime:f.getPickTime});arrival.activate();const farm=f.commitFarm();arrival.finalize(farm);f.sync();f.flush();
  f.advance(Math.max(0,farm.resources.presentation.endTime-f.nativeState.elapsed)+.05);f.sync();
  const source=f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);assert(source.arrived);assert.equal(source.currentSpeed,0);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.nativeActor),null);
  const request=requestNativeIdleCurrentTask(f,f.nativeState);f.sync();
  const prepared=f.planner.prepareNativeTaskStartProposal(request,nativeIdleCurrentTaskPolicy(f));assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeTaskStartProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);
  return {...f,farm,source,request,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   getPickTime(reference,epoch){return reference.kind==='native-task-start-reference'&&taskEpoch!==undefined?epoch+Math.max(0,f.getPickTime()-taskEpoch):f.getPickTime();},
   advance(seconds){f.move(seconds);f.setPickTime(f.nativeState.elapsed);},
   commitTask(p=proposal){assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeTaskStartBinding=f.planner.nativeTaskStartBinding(f.nativeActor),r=nativeTaskStartBinding.reference,nativeRoute={actorId:f.nativeActor,routeHandle:r.expectedRouteHandle,assignmentSequence:nativeTaskStartBinding.assignmentSequence};taskEpoch=r.worldBoundary.effectiveTime;return {nativeTaskStartBinding,resources:{version:1,kind:14,phase:'committed',worldBoundary:r.worldBoundary,nativeRoute,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};},
   close(){arrival?.cancel();f.close();}
  };
 }catch(error){arrival?.cancel();f.close();throw error;}
}
