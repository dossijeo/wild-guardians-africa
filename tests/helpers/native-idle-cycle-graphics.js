import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './native-initial-idle-request.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';
import {createPlant} from '../../src/simulation/crops.js';

// Real source + original GLB/clip banks + roster. Renderer/admission are test
// doubles. Genuine20 physical/graphical admission precedes every first21.
export async function nativeIdleCycleGraphicsFixture({mode='rest',profile='youngMale',remaining=2.3,rng=0x12345678}={}){
 const native=nativeInitialIdleRequestFixture({mode,profile,peer:true,configureState(state,{point}){
  const a=state.workers[0];Object.assign(a.idleState,{anchorId:'farm-plant-900098',remaining,rng});state.plants.push(createPlant('plant-900098','mijo',a.x,a.z,a.centerId));state.villages.find(v=>v.id===a.villageId).entry=point(6,0);
 }});let f;
 try{
  native.planner.requestNativeInitialIdleResources(native.state,native.worker);native.planner.commitNativeCausalClock();
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id},{idle:true,alert:true,clips:['Walk_Skip','Idle','Alert'],initialClip:mode==='watch'?'Alert':'Idle'});
  const tuple=()=>{assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  const sync=()=>{f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();};
  const p=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(native.actor));assert.equal(p.status,'proposed');const initial=await f.roster.prepareNativeInitialIdleBodyProposal(f.terrain.prepareNativeInitialIdleBody(p.proposal.nativeInitialIdleBody),{getPickAge:()=>0});initial.activate();assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),p.proposal.ticket.ticket),1);
  f.planner.projectNativeInitialIdleBody(f.nativeState,f.worker);f.planner.commitNativeCausalClock();const bodyBinding=f.planner.nativeInitialIdleBodyBinding(native.actor),bodyData={nativeInitialIdleBodyBinding:bodyBinding};initial.finalize(bodyData);sync();f.flush();
  function prepare(){const p=f.planner.prepareNativeIdleCycleProposal(native.actor);assert.equal(p.status,'proposed');const proposal=p.proposal,support=f.terrain.prepareNativeIdleCycle(proposal.nativeIdleCycle);assert(support?.valid());return {proposal,support};}
  const first=prepare();let age=0;
  return {...f,...first,bodyBinding,bodyData,nativeActor:native.actor,tuple,sync,prepare,setPickAge:value=>age=value,getPickAge:()=>age,
   commit(prepared=first.proposal){assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),prepared.ticket.ticket),1);f.planner.commitNativeCausalClock();const binding=f.planner.nativeIdleCycleBinding(native.actor);assert(binding);return {worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding,resources:{version:1,kind:21,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding}};}
  };
 }catch(error){if(f)f.close();else native.close();throw error;}
}
