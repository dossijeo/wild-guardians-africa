import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {createPlant} from '../../src/simulation/crops.js';
import {LOCOMOTION} from '../../src/simulation/locomotion-calibration.js';

// Trusted source ABI fixture, not a graphical21 permission or ordinary Game
// producer. An actual initial20 body precedes the finite native policy cycle.
export function nativeIdleCycleFixture({mode='rest',profile='youngMale',rng=0xfabcde98,remaining=2.3,peer=false,core=null,beforeBodyCommit=null}={}){
 const f=nativeInitialIdleRequestFixture({mode,profile,peer,core,configureState(state){
  const worker=state.workers[0];worker.idleState.anchorId='farm-plant-900098';worker.idleState.rng=rng;worker.idleState.remaining=remaining;
  state.plants.push(createPlant('plant-900098','mijo',worker.x,worker.z,worker.centerId));
 }});
 try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker);assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));
  const source=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(f.actor));assert.equal(source.status,'proposed');
  const tuple=()=>{assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  beforeBodyCommit?.(f,source.proposal);
  assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),source.proposal.ticket.ticket),1);f.planner.projectNativeInitialIdleBody(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const bodyBinding=f.planner.nativeInitialIdleBodyBinding(f.actor),calibration=LOCOMOTION.sources.find(s=>s.profile===profile),anchor={id:'farm-plant-900098',x:f.worker.x,z:f.worker.z,idleRadius:3};
  const header=()=>Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_proposal_header_ptr(),24));
  function propose(sequence=bodyBinding.bodySequence,overrides={}){
   const options={kind:1,id:900098,x:anchor.x,z:anchor.z,radius:3,idleSeconds:calibration.idleSeconds,alertSeconds:calibration.alertSeconds,...overrides};
   const status=f.w.nav_idle_cycle_proposal_stage(f.actor,f.w.nav_intent_session(),sequence,options.kind,options.id,options.x,options.z,options.radius,options.idleSeconds,options.alertSeconds);
   return status===1?{status,header:header(),ticket:tuple()[1]}:{status};
  }
  return {...f,tuple,header,bodyBinding,calibration,anchor,propose,
   commit(prepared){const t=tuple();assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...t.slice(0,5),prepared?.ticket??t[1]),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return binding();},
   execution(){if(f.w.nav_idle_cycle_execution(f.actor)!==1)return null;return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_execution_ptr(),14));},
   next(){if(f.w.nav_idle_cycle_next(f.actor)!==1)return null;const data=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_next_ptr(),14)),count=f.w.nav_idle_cycle_next_points(f.actor);return {data,points:Array.from(new Float32Array(f.w.memory.buffer,f.w.nav_idle_cycle_next_points_ptr(f.actor),count*2))};},
   oracleNavigation:{path(start,end){const count=f.w.spatial_world_route_cached(start.x,start.z,end.x,end.z);if(count<0)throw Error('Oracle route terrain unavailable');if(!count)return null;const points=Array.from(new Float32Array(f.w.memory.buffer,f.w.spatial_world_route_ptr(),count*2));return Array.from({length:count},(_,i)=>({x:points[i*2],z:points[i*2+1]}));}},
   binding
  };
  function binding(){if(f.w.nav_idle_cycle_binding_snapshot(f.actor)!==1)return null;return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_cycle_binding_ptr(),52));}
 }catch(error){f.close();throw error;}
}
