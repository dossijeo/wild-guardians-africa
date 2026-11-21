import assert from 'node:assert/strict';
import {nativeFarmArrivedIdleCycleFixture} from './native-farm-arrived-idle-cycle.js';
import {createPlant} from '../../src/simulation/crops.js';

// Real terminal23, authored distant original anchor, trusted native22 ABI.
// No graphical proof/20/24 is installed by this source fixture.
export function nativeFarmIdleApproachFixture({offset=5,...options}={}){
 const f=nativeFarmArrivedIdleCycleFixture({...options,anchor:false,configureState(state,c){const crop=createPlant('plant-900098','mijo',c.target.x-offset,c.target.z,state.workers[0].centerId);crop.water[0].status='manual';state.plants.push(crop);options.configureState?.(state,c);}});
 return {...f,
  prepareApproach(){const result=f.planner.prepareNativeIdleStrollProposal(f.actor);assert.equal(result.status,'proposed',JSON.stringify(result));return result.proposal;},
  rawApproach(change={}){const a={actor:f.actor,session:f.w.nav_intent_session(),sequence:f.farmBinding.assignmentSequence,kind:1,id:900098,x:f.idleAnchor.x,z:f.idleAnchor.z,radius:f.idleAnchor.idleRadius,idleSeconds:f.calibration.idleSeconds,rng:f.birth.rng,...change};return f.w.nav_idle_stroll_farm_proposal_stage(a.actor,a.session,a.sequence,a.kind,a.id,a.x,a.z,a.radius,a.idleSeconds,a.rng);},
  commitApproach(p){assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeIdleStrollBinding(f.actor);assert(binding);assert(f.planner.projectNativeIdleStroll(f.state,f.worker));return binding;},
  advance(dt){f.move(dt);if(f.planner.nativeIdleCycleExecution(f.actor))f.planner.projectNativeIdleCycle(f.state,f.worker);else if(f.planner.nativeIdleStrollExecution(f.actor)||f.planner.nativeIdleStrollHeldExecution(f.actor))f.planner.projectNativeIdleStroll(f.state,f.worker);else f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);const peer=f.state.workers[1];if(peer)f.planner.projectNativeTaskExecution(f.state,peer);}
 };
}
