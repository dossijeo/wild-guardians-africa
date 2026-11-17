import assert from 'node:assert/strict';
import {nativeIdleStrollGraphicsFixture} from './native-idle-stroll-graphics.js';
import {NATIVE_STOP_POSE_FIELDS} from '../../src/world/native-idle-stroll-stop.js';
import {floorFloat32} from '../../src/float32-time.js';

// Original GLB, banks, roster and native source. Renderer and submitted picking
// values are deterministic doubles, not a Surface/hardware acceptance receipt.
export async function nativeIdleMovingHomeGraphicsFixture(options={}){
 const f=await nativeIdleStrollGraphicsFixture(options);let walk,stops=[];try{
  walk=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});walk.activate();const data=f.commitStroll();walk.finalize(data);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();
  f.advance(.12);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();const staged=f.planner.prepareNativeIdleStrollStopProposal(f.nativeActor);assert.equal(staged.status,'proposed');const view={get:(cx,cz)=>(f.residency.getVisible??f.residency.get).call(f.residency,cx,cz),changedKeys:new Set()};let submitted;
  const result=await f.roster.prepareNativeTerrainStops(view,{stopEffects:staged.proposal,boundary:staged.proposal.worldBoundary,nativeIdleStrollStopTemplate:staged.proposal.nativeStop,prepareBodySupport:(reference,pose)=>f.terrain.prepareNativeBody(reference,pose),getPickTime:()=>{throw Error('Moving stop cannot borrow a legacy clock');},getStoppedProjection:()=>submitted});stops=result.parts;
  f.advance(.2);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();const refreshed=f.planner.revalidateNativeIdleStrollStopProposal(staged.ticket);assert.equal(refreshed.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),staged.ticket.ticket),1);f.planner.commitNativeCausalClock();const p=refreshed.proposal,proof=f.planner.nativeIdleStrollStopBinding(p.nativeStop,staged.proposal.nativeStop,{projection:{version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects}});assert(proof);
  for(const part of stops){part.acceptNativeStopBinding(proof);part.activate();part.attach();const release=part.finalize();release.retire();release.notify();}f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();const source=f.planner.nativeIdleStrollHeldExecution(f.nativeActor),row=proof.projection.routeEffects.rows.slice(8,26);
  const setProjection=()=>{submitted={at:f.nativeState.elapsed,relativeTime:floorFloat32(f.nativeState.elapsed-f.proposal.startTime),age:floorFloat32(source.suspendedAt-data.nativeIdleStrollBinding.reference.worldBoundary.effectiveTime),...Object.fromEntries(Object.entries(NATIVE_STOP_POSE_FIELDS).map(([field,index])=>[field,Math.fround(row[index])]))};};setProjection();
  // Expiry is the game clock reaching a profile end, without changing the
  // pinned contract/worker policy after the physical stop was prepared.
  f.nativeState.time=600;const request=f.planner.requestNativeIdleHome(f.nativeState,f.worker);f.planner.commitNativeCausalClock();f.sync();const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=value=>f.terrain.prepareNativeHomeRouteProposal(value,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);
  return {...f,source,stopBinding:proof,request,proposal,support:supportFor(proposal),supportFor,advance(dt){f.advance(dt);setProjection();},commitHome(actual=proposal,previous=proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),previous.ticket.ticket),1);f.planner.beginNativeRouteExecution();f.planner.commitNativeCausalClock();const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor);return {nativeHomeRouteBinding,resources:{version:1,kind:18,phase:'committed',worldBoundary:nativeHomeRouteBinding.reference.worldBoundary,nativeHomeRouteBinding,presentation:f.planner.captureNativeRoutePresentation(nativeHomeRouteBinding.reference.expectedRouteHandle)}};}};
 }catch(error){for(const part of stops.reverse())part.cancel();walk?.cancel();f.close();throw error;}
}
