import assert from 'node:assert/strict';
import {nativeIdleArrivalFixture,acquireNativeIdleArrivalStroll} from './native-idle-arrival.js';

// Actual arrived22 -> acquired21, Game projection and direct control. Graphical
// installation is represented by the existing component permission API here.
export function nativeIdleCurrentHomeFixture(options={}){
 return finish(nativeIdleArrivalFixture({...options,configureState(state,context){const worker=state.workers[0],village=state.villages.find(v=>v.id===worker.villageId);village.entry=context.point(6,-4);options.configureState?.(state,context);}}));
}
export function acquireNativeIdleCurrentHome(source){return finish(acquireNativeIdleArrivalStroll(source));}
function finish(f){
 try{
  f.arrive();const rest=f.prepareRest(),idleLease=f.c.admitIdleCycle(rest.nativeIdleCycle,{preparingWorldBoundary:rest.worldBoundary}),idleBinding=f.commitRest(rest);
  return {...f,idleLease,idleBinding,
   requestHome({clock=true}={}){f.worker.contractDay=f.state.day-1;const request=f.planner.requestNativeIdleHome(f.state,f.worker);if(clock)assert.equal(f.planner.commitNativeCausalClock().status,'committed');return request;},
   prepareHome(){const p=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(p.status,'proposed');return p.proposal;},
   commitHome(proposal,{install=true,project=true,prepared=proposal}={}){
    assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),prepared.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');const binding=f.planner.nativeHomeRouteBinding(f.actor);if(install)f.c.installHomes(binding.reference.worldBoundary,[binding]);if(project)f.planner.projectNativeHomeExecution(f.state,f.worker);return binding;
   }
  };
 }catch(error){f.close();throw error;}
}
