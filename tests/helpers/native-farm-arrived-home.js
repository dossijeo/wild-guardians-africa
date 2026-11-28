import assert from 'node:assert/strict';
import {nativeFarmArrivedTaskFixture} from './native-farm-arrived-task.js';

// Actual completed23 and ordinary Home request/18 on the existing native body.
// Trusted source ABI only; no graphical receipt/controller is manufactured.
export function nativeFarmArrivedHomeFixture(options={}){
 const f=nativeFarmArrivedTaskFixture(options),r=f.farmBinding.reference,h=r.expectedRouteHandle;
 return {...f,
  rawHome({actor=f.actor,session=h.session,sequence=f.farmBinding.assignmentSequence,generation=h.generation,x=f.point(6,0).x,z=f.point(6,0).z}={}){return f.w.nav_intent_farm_arrival_home_request(actor,session,sequence,generation,Number(f.worker.villageId.split('-').at(-1)),x,z);},
  requestHome(){f.state.time=600;return f.planner.requestNativeFarmHome(f.state,f.worker);},
  prepareHome(){const p=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(p.status,'proposed',JSON.stringify(p));return p.proposal;},
  commitHome(p){assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.nativeHomeRouteBinding(f.actor);}
 };
}
