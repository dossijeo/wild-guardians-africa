import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './native-initial-idle-game.js';
import {nativeWorkerGraphicsFixture} from './native-task-consequence-graphics.js';

// Initial actors use the common original-asset fixture without any action,
// Carry or settlement history. Admission/renderer here remain test doubles.
export async function nativeInitialIdleBodyGraphicsFixture({mode='rest',profile='youngMale'}={}){
 const native=nativeInitialIdleGameFixture({mode,profile,peer:true});let f;
 try{
  f=await nativeWorkerGraphicsFixture({...native,actor:native.worker.id},{idle:true,alert:true,clips:['Walk_Skip','Idle','Alert'],initialClip:mode==='watch'?'Alert':'Idle'});
  const result=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(native.actor));assert.equal(result.status,'proposed');const proposal=result.proposal,support=f.terrain.prepareNativeInitialIdleBody(proposal.nativeInitialIdleBody);assert(support?.valid());let age=0;
  const tuple=()=>{assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  return {...f,nativeActor:native.actor,proposal,support,tuple,setPickAge:value=>age=value,getPickAge:()=>age,
   sync(){f.state.workers=[structuredClone(f.worker)];f.state.tasks=structuredClone(f.nativeState.tasks);f.state.crates=structuredClone(f.nativeState.crates);f.state.elapsed=f.nativeState.elapsed;f.roster.sync();},
   commit(prepared=proposal){assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),prepared.ticket.ticket),1);f.planner.projectNativeInitialIdleBody(f.nativeState,f.worker);f.planner.commitNativeCausalClock();const binding=f.planner.nativeInitialIdleBodyBinding(native.actor);assert(binding);return {nativeInitialIdleBodyBinding:binding,resources:{version:1,kind:20,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeInitialIdleBodyBinding:binding}};}
  };
 }catch(error){if(f)f.close();else native.close();throw error;}
}
