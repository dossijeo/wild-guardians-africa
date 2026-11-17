import assert from 'node:assert/strict';
import {nativeFarmArrivalGameFixture} from './native-farm-arrival-game.js';
import {centerServicePoint} from '../../src/world/centers.js';

// Trusted raw native ABI only. No graphical receipt or Game route projection.
export function nativeFarmArrivalRouteFixture({inside=false,reverse=false,...options}={}){
 const f=nativeFarmArrivalGameFixture({...options,configureState(state,{point}){
  const worker=state.workers[0],center=state.structures.find(c=>c.id===worker.centerId),goal=centerServicePoint(center,state,.8),target=point(reverse?-6:6,0);
  center.x+=target.x-goal.x;center.z+=target.z-goal.z;
  if(reverse)Object.assign(worker,point(6,0));
  if(inside)Object.assign(worker,{x:target.x+(reverse?1:-1),z:target.z});
  // Keep the ordinary Task peer closer to its own genuine target, including
  // zero-distance and reversed arrivals. The real planner still chooses it.
  if(options.peer)Object.assign(state.plants[0],point(-3,6));
  options.configureState?.(state,{point,center,target});
 }}),w=f.w;
 const read=(name,n)=>Array.from(new Float64Array(w.memory.buffer,w[name](),n));
 const tuple=()=>{assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return read('nav_intent_barrier_proposal_ticket_ptr',6);};
 const source=()=>f.planner.nativeFarmArrivalRequestReference(f.actor);
 const snapshot=()=>{const t=tuple(),count=w.nav_farm_arrival_route_proposal_points(...t.slice(0,2)),rows=w.nav_farm_arrival_route_proposal_rows(...t.slice(0,2));assert(count>=0);assert(rows>=1);return {status:1,ticket:t[1],header:read('nav_farm_arrival_route_proposal_header_ptr',24),points:Array.from(new Float32Array(w.memory.buffer,w.nav_farm_arrival_route_proposal_points_ptr(),count*2)),rows:read('nav_farm_arrival_route_proposal_rows_ptr',rows*16)};};
 try{
  const request=source();
  return {...f,requestSource:request,tuple,read,snapshot,
   stage({urgent=false,sequence=request?.requestSequence,session=w.nav_intent_session()}={}){const status=w.nav_farm_arrival_route_proposal_stage(f.actor,session,sequence,urgent?1:0);return status===1?snapshot():{status};},
   commit(prepared){const t=tuple();const status=w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),prepared.ticket);if(status===1){assert.equal(w.nav_intent_execution_begin(),1);assert(w.nav_intent_clock_commit(1,0)>=0);}return status;},
   move(seconds){f.state.elapsed+=seconds;assert(w.nav_intent_execution_advance(f.state.elapsed)>=0);assert(w.nav_intent_clock_commit(1,0)>=0);},
   binding(){return w.nav_farm_arrival_route_binding_snapshot(f.actor)===1?read('nav_farm_arrival_route_binding_ptr',52):null;},
   execution(){return w.nav_intent_farm_arrival_execution(f.actor)===1?read('nav_intent_farm_arrival_execution_ptr',30):null;},
   sourceSnapshot(ticket=0){return w.nav_farm_arrival_route_source_snapshot(f.actor,ticket)===1?read('nav_farm_arrival_request_ptr',23):null;},
  };
 }catch(error){f.close();throw error;}
}
