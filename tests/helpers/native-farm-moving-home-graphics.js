import assert from 'node:assert/strict';
import {nativeFarmArrivalStopGraphicsFixture} from './native-farm-arrival-stop-graphics.js';

// Actual23/24/Home18, authored actor/banks/terrain. Renderer/admission and
// submitted picking are doubles; original Surface/hardware has its own audit.
export async function nativeFarmMovingHomeGraphicsFixture(options={}){
 const f=await nativeFarmArrivalStopGraphicsFixture(options);try{
  const stopped=await f.prepare();f.advance(.2);f.sync();const proof=f.commitStop();
  for(const part of stopped.parts){part.acceptNativeStopBinding(proof);part.activate();part.attach();const release=part.finalize();release.retire();release.notify();}
  f.projectHeld();f.submit();f.flush();const source=f.source;f.nativeState.time=600;const request=f.planner.requestNativeFarmHome(f.nativeState,f.worker);f.planner.commitNativeCausalClock();f.sync();
  const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeHomeRouteProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);assert(supportFor(proposal)?.valid());
  return {...f,source,request,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},advance(seconds){f.move(seconds);f.submit();},
   commitHome(prepared=proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor),r=nativeHomeRouteBinding.reference;return {nativeHomeRouteBinding,resources:{version:1,kind:18,phase:'committed',worldBoundary:r.worldBoundary,nativeHomeRouteBinding,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};}
  };
 }catch(error){f.close();throw error;}
}
