import assert from 'node:assert/strict';
import {controlledNativeFarmArrival} from './native-farm-arrival-control.js';
import {createPlant} from '../../src/simulation/crops.js';

// Real native source/journal/clock/controller, trusted proof installation.
// No retained graphical packet, receipt, drain or hardware witness.
export function controlledNativeFarmIdleCycle({installFarm=true,farmDelay=0,complete=true,...options}={}){
 const f=controlledNativeFarmArrival({peer:true,...options,configureState(state,context){const crop=createPlant('plant-900098','mijo',context.target.x,context.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,context);}});
 try{
  const p=f.prepare(true),farm=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});
  if(farmDelay){f.advance(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket).status,'revalidated');}
  const farmBinding=f.commit(p);if(installFarm)assert.equal(f.c.installFarmArrivals(farmBinding.reference.worldBoundary,[farmBinding]),1);
  f.advance(complete?farmBinding.reference.endTime-f.state.elapsed+.05:.03);const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(source);if(complete)assert(source.arrived);f.events.length=0;
  return {...f,farm,farmBinding,farmPrepared:p,source,
   prepareCycle(){const p=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(p.status,'proposed');return p.proposal;},
   commitCycle(p){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const proof=f.planner.nativeIdleCycleBinding(f.actor);assert(proof);assert(f.planner.projectNativeIdleCycle(f.state,f.worker));return proof;},
   installCycle(proof){return f.c.installIdleCycles(proof.reference.worldBoundary,[proof]);}
  };
 }catch(error){f.close();throw error;}
}
