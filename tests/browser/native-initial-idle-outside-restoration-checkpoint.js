// Trusted native source setup BEFORE any graphic world: genuine pending cold
// WALK→failed21 and actual finite retries until the requested saved phase.
// Its later public save carries semantics only, never these acquisitions.
export function prepareNativeInitialIdleOutsideRestorationCheckpoint({state,planner,w,core,commit,mode='rest'}){
 if(!['rest','watch'].includes(mode))throw Error('Invalid saved outside Idle mode');
 const worker=state.workers[0],actor=worker.id,request=planner.nativeIdleStrollRequestReference(actor),rng=state.rng;
 if(!request?.approach||planner.nativeIdleStrollBinding(actor)||Math.hypot(request.pose.x-request.anchor.x,request.pose.z-request.anchor.z)<=request.anchor.radius)throw Error('Outside Idle checkpoint needs its genuine pending outside WALK');
 const wall=core.addWall(request.destination.x,request.destination.z,.4,.4);if(!(wall>0))throw Error('Outside Idle checkpoint destination fault unavailable');
 const tuple=()=>{if(w.nav_intent_barrier_proposal_ticket()!==1)throw Error('Missing outside Idle checkpoint ticket');return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 try{
  for(let step=0;step<64;step++){
   commit(false);const p=planner.prepareNativeIdleCycleProposal(actor),r=p.proposal?.nativeIdleCycle;
   if(p.status!=='proposed'||r.sourceBody.kind!=='native-idle-stroll-failed-source'||w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),p.proposal.ticket.ticket)!==1)throw Error('Outside Idle checkpoint did not acquire its genuine failed21');
   commit(false);if(!planner.projectNativeIdleCycle(state,worker))throw Error('Outside Idle checkpoint lost acquired21');
   const selected=r.initialState.mode===mode&&r.duration>0;state.elapsed=r.worldBoundary.effectiveTime+(selected?Math.min(.1,r.duration/2):r.duration+.01);
   if(planner.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Outside Idle checkpoint phase did not execute');commit(false);const execution=planner.projectNativeIdleCycle(state,worker);
   if(state.rng!==rng||worker.x!==request.pose.x||worker.z!==request.pose.z||planner.nativeInitialIdleBodyBinding(actor)||planner.nativeIdleStrollBinding(actor))throw Error('Outside Idle checkpoint moved, borrowed a body or consumed world RNG');
   if(selected){if(execution.idleState.mode!==mode||!(execution.idleState.elapsed>0))throw Error('Outside Idle checkpoint did not preserve an actual partial phase');return {scope:'Actual native failed21 and retries before GPU; public saved REST/WATCH only, not graphic permission.',request,sourceCycle:execution.binding,execution,phase:{...execution.idleState},attempts:step+1,globalRngUnchanged:true};}
  }
  throw Error('Outside Idle checkpoint did not reach its actual requested phase');
 }finally{if(core.removeWall(wall)!==1)throw Error('Outside Idle checkpoint destination fault did not retire');}
}
