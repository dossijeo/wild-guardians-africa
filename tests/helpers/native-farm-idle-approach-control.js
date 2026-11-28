import assert from 'node:assert/strict';
import {controlledNativeFarmArrival} from './native-farm-arrival-control.js';
import {createPlant} from '../../src/simulation/crops.js';

// Real source/journal/clock/controller; trusted graphical installation setup.
// This fixture does not attest a retained packet, device receipt or drain.
export function controlledNativeFarmIdleApproach({installFarm=true,farmDelay=0,...options}={}){
 const f=controlledNativeFarmArrival({peer:true,...options,configureState(state,c){const crop=createPlant('plant-900098','mijo',c.target.x-5,c.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,c);}});
 try{const p=f.prepare(true),farm=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});if(farmDelay){f.advance(farmDelay);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket).status,'revalidated');}const farmBinding=f.commit(p);if(installFarm)assert.equal(f.c.installFarmArrivals(farmBinding.reference.worldBoundary,[farmBinding]),1);f.advance(farmBinding.reference.endTime-f.state.elapsed+.05);const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(source.arrived);f.events.length=0;
  return {...f,farm,farmBinding,farmPrepared:p,source,
   prepareApproach(){const result=f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(result.status,'proposed');return result.proposal;},
   commitApproach(p){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const b=f.planner.nativeIdleStrollBinding(f.actor);assert(b);assert(f.planner.projectNativeIdleStroll(f.state,f.worker));return b;},
   installApproach(b){return f.c.installStrolls(b.reference.worldBoundary,[b]);}
  };
 }catch(error){f.close();throw error;}
}
