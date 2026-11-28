import assert from 'node:assert/strict';
import {nativeFarmArrivalGraphicsFixture} from './native-farm-arrival-route-graphics.js';
import {createPlant} from '../../src/simulation/crops.js';

// Actual completed23 to21 on authored actor/banks/terrain. Renderer, pipeline
// admission and submitted picking clocks are doubles; no GPU receipt here.
export async function nativeFarmArrivedIdleCycleGraphicsFixture({farmDelay=0,...options}={}){
 const f=await nativeFarmArrivalGraphicsFixture({idleCycle:true,...options,configureState(state,context){const crop=createPlant('plant-900098','mijo',context.target.x,context.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,context);}});let arrival,cycleEpoch;
 try{
  arrival=await f.roster.prepareNativeFarmArrivalProposal(f.support,{getPickTime:f.getPickTime});if(farmDelay){f.move(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(f.proposal.ticket).status,'revalidated');}
  arrival.activate();const farm=f.commitFarm();arrival.finalize(farm);f.sync();f.flush();f.advance(farm.nativeFarmArrivalBinding.reference.endTime-f.nativeState.elapsed+.05);f.setPickTime(f.nativeState.elapsed);f.sync();
  const source=f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);assert(source.arrived);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.nativeActor),null);const prepared=f.planner.prepareNativeIdleCycleProposal(f.nativeActor);assert.equal(prepared.status,'proposed');const proposal=prepared.proposal,supportFor=p=>f.terrain.prepareNativeIdleCycle(p.nativeIdleCycle);
  return {...f,farm,source,proposal,support:supportFor(proposal),supportFor,get acquires(){return f.acquires;},
   getPickAge:()=>Math.fround(Math.max(0,f.nativeState.elapsed-(cycleEpoch??proposal.worldBoundary.effectiveTime))),
   advance(seconds){f.move(seconds);f.setPickTime(f.nativeState.elapsed);if(f.planner.nativeIdleCycleExecution(f.nativeActor))f.planner.projectNativeIdleCycle(f.nativeState,f.worker);else f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker);},
   projectIdle(){assert(f.planner.projectNativeIdleCycle(f.nativeState,f.worker));},
   commitCycle(p=proposal){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const nativeIdleCycleBinding=f.planner.nativeIdleCycleBinding(f.nativeActor);assert(nativeIdleCycleBinding);cycleEpoch=nativeIdleCycleBinding.reference.worldBoundary.effectiveTime;return {nativeIdleCycleBinding,resources:{version:1,kind:21,phase:'committed',worldBoundary:nativeIdleCycleBinding.reference.worldBoundary,nativeIdleCycleBinding}};},
   close(){arrival?.cancel();f.close();}
  };
 }catch(error){arrival?.cancel();f.close();throw error;}
}
