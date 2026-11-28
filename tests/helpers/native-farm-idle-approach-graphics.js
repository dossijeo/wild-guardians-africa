import assert from 'node:assert/strict';
import {nativeFarmArrivalGraphicsFixture} from './native-farm-arrival-route-graphics.js';
import {createPlant} from '../../src/simulation/crops.js';

// Actual23 ->22 on the resident actor; original models/banks/native/terrain.
// Renderer, admission and submitted picking clock are doubles, no GPU receipt.
export async function nativeFarmIdleApproachGraphicsFixture({farmDelay=0,...options}={}){
 const f=await nativeFarmArrivalGraphicsFixture({idleCycle:true,...options,configureState(state,c){const crop=createPlant('plant-900098','mijo',c.target.x-5,c.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,c);}});let arrival;
 try{arrival=await f.roster.prepareNativeFarmArrivalProposal(f.support,{getPickTime:f.getPickTime});if(farmDelay){f.move(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(f.proposal.ticket).status,'revalidated');}arrival.activate();const farm=f.commitFarm();arrival.finalize(farm);f.sync();f.flush();f.advance(farm.nativeFarmArrivalBinding.reference.endTime-f.nativeState.elapsed+.05);f.setPickTime(f.nativeState.elapsed);f.sync();const source=f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);assert(source.arrived);const prepared=f.planner.prepareNativeIdleStrollProposal(f.nativeActor);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeIdleStrollProposal(p,{terrainManifest:f.manifest});
  return {...f,farm,source,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   advance(seconds){f.move(seconds);f.setPickTime(f.nativeState.elapsed);if(f.planner.nativeIdleCycleExecution(f.nativeActor))f.planner.projectNativeIdleCycle(f.nativeState,f.worker);else if(f.planner.nativeIdleStrollExecution(f.nativeActor))f.planner.projectNativeIdleStroll(f.nativeState,f.worker);else f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);},
   projectStroll(){assert(f.planner.projectNativeIdleStroll(f.nativeState,f.worker));},
   commitStroll(p=proposal){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeIdleStrollBinding=f.planner.nativeIdleStrollBinding(f.nativeActor),nativeRoute={actorId:f.nativeActor,routeHandle:nativeIdleStrollBinding.reference.expectedRouteHandle,assignmentSequence:nativeIdleStrollBinding.assignmentSequence},worldBoundary=nativeIdleStrollBinding.reference.worldBoundary;return {worldBoundary,nativeIdleStrollBinding,resources:{version:1,kind:22,phase:'committed',worldBoundary,nativeRoute,nativeIdleStrollBinding,presentation:f.planner.captureNativeRoutePresentation(nativeRoute.routeHandle)}};},
   close(){arrival?.cancel();f.close();}
  };
 }catch(error){arrival?.cancel();f.close();throw error;}
}
