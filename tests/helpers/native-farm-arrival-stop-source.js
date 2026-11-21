import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './native-farm-arrival-route.js';

const split=n=>[Number(BigInt(n)&0xffffffffn)|0,Math.floor(n/4294967296)];
// Trusted native ABI, actual Farm23 and independent genuine Task14. No Game
// handoff, GPU receipt or graphical stop consumer is manufactured here.
export function nativeFarmArrivalStopSourceFixture(options={}){
 const f=nativeFarmArrivalRouteFixture({peer:true,...options});try{
  const arrival=f.stage({urgent:true});assert.equal(arrival.status,1);assert.equal(f.commit(arrival),1);f.move(.12);
  const binding=f.planner.nativeFarmArrivalRouteBinding(f.actor),handle=binding.reference.expectedRouteHandle,w=f.w;
  function capture(){const tuple=f.tuple(),count=w.nav_intent_world_proposal_route_effects(...tuple.slice(0,2)),motors=w.nav_intent_world_proposal_gate_effects(...tuple.slice(0,2));assert(count>=0&&motors>=0);return {status:1,tuple,rows:Array.from(new Float64Array(w.memory.buffer,w.nav_intent_world_proposal_route_effects_ptr(),count*26)),gates:Array.from(new Float64Array(w.memory.buffer,w.nav_intent_world_proposal_gate_effects_ptr(),motors*3)),header:Array.from(new Float64Array(w.memory.buffer,w.spatial_world_proposal_resource_header_ptr(),9))};}
  function stop(overrides={}){const v={kind:24,mode:0,session:handle.session,actor:f.actor,slot:handle.slot,generation:handle.generation,assignment:binding.assignmentSequence,...overrides},input=[...split(v.session),...split(v.actor),v.slot|0,v.generation|0,...split(v.assignment)];w.spatial_world_proposal_float_ptr(0);new Int32Array(w.memory.buffer,w.spatial_world_proposal_int_ptr(input.length),input.length).set(input);const status=w.spatial_world_proposal_stage_resources(v.kind,v.mode,0,input.length);return status===1?capture():{status};}
  return {...f,arrival,binding,handle,stop,capture,
   refresh:p=>w.spatial_world_proposal_revalidate_stop(...p.tuple.slice(0,2)),
   translation(){const t=f.tuple(),pointer=w.nav_farm_arrival_stop_proposal_translation_ptr(...t.slice(0,2));return pointer?Array.from(new Float64Array(w.memory.buffer,pointer,8)):null;},
   cancel:p=>w.nav_intent_barrier_proposal_cancel(...p.tuple.slice(0,2)),
   commitStop:(p,preparedTicket=p.tuple[1])=>w.spatial_world_proposal_stop_commit_bound(...p.tuple.slice(0,5),preparedTicket)
  };
 }catch(error){f.close();throw error;}
}
