import assert from 'node:assert/strict';
import {controlledNativeFarmArrivedTask} from './native-farm-arrived-task-control.js';

// Real completed23 and ordered native control. Proof installation is trusted
// unit setup, not a retained GPU packet, admission receipt or hardware fence.
export function controlledNativeFarmArrivedHome(options={}){
 const f=controlledNativeFarmArrivedTask(options);return {...f,
  requestHome(){f.state.time=600;const request=f.planner.requestNativeFarmHome(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return request;},
  prepareHome(){const p=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
  commitHome(p){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeHomeRouteBinding(f.actor);}
 };
}
