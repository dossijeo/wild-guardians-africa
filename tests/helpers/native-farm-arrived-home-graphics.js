import assert from 'node:assert/strict';
import {nativeFarmArrivalGraphicsFixture} from './native-farm-arrival-route-graphics.js';

// Completed23 directly to19/18, authored actor/banks/terrain; no24 or synthetic
// Idle history. Renderer, admission and frame witnesses remain fixture doubles.
export async function nativeFarmArrivedHomeGraphicsFixture({farmDelay=0,...options}={}){
 const f=await nativeFarmArrivalGraphicsFixture(options);let arrival,homeEpoch;
 try{
  arrival=await f.roster.prepareNativeFarmArrivalProposal(f.support,{getPickTime:f.getPickTime});
  if(farmDelay){f.move(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(f.proposal.ticket).status,'revalidated');}
  arrival.activate();const farm=f.commitFarm();arrival.finalize(farm);f.sync();f.flush();
  f.advance(Math.max(0,farm.resources.presentation.endTime-f.nativeState.elapsed)+.05);f.sync();
  const source=f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);assert(source.arrived);assert.equal(source.currentSpeed,0);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.nativeActor),null);
  f.nativeState.time=600;const request=f.planner.requestNativeFarmHome(f.nativeState,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.sync();
  const prepared=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeHomeRouteProposal(p,{terrainManifest:f.manifest});f.setPickTime(proposal.startTime);
  return {...f,farm,source,request,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   getPickTime(reference,epoch){return reference.kind==='native-home-route-reference'&&homeEpoch!==undefined?epoch+Math.max(0,f.getPickTime()-homeEpoch):f.getPickTime();},
   advance(seconds){f.move(seconds);f.setPickTime(f.nativeState.elapsed);},
   commitHome(p=proposal){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeHomeRouteBinding=f.planner.nativeHomeRouteBinding(f.nativeActor),r=nativeHomeRouteBinding.reference;homeEpoch=r.worldBoundary.effectiveTime;return {nativeHomeRouteBinding,resources:{version:1,kind:18,phase:'committed',worldBoundary:r.worldBoundary,nativeHomeRouteBinding,presentation:f.planner.captureNativeRoutePresentation(r.expectedRouteHandle)}};},
   close(){arrival?.cancel();f.close();}
  };
 }catch(error){arrival?.cancel();f.close();throw error;}
}
