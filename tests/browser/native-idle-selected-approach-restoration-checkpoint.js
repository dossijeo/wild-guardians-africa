// Trusted source-only setup before any graphical world. Start with a genuine
// cold WALK, acquire its failed21 and the actual retry21, then execute selected22.
// Public save/load later removes every permission; none of these are GPU receipts.
export function prepareNativeIdleSelectedApproachRestorationCheckpoint({state,planner,w,core,commit,progress=.2}){
 if(!Number.isFinite(progress)||progress<=0||progress>=1)throw Error('Invalid selected approach checkpoint progress');
 const worker=state.workers[0],actor=worker.id,request=planner.nativeIdleStrollRequestReference(actor),rng=state.rng,cycles=[];
 if(!request?.approach||planner.nativeIdleStrollBinding(actor)||Math.hypot(request.pose.x-request.anchor.x,request.pose.z-request.anchor.z)<=request.anchor.radius)throw Error('Selected checkpoint needs its actual pending outside WALK');
 const tuple=()=>{if(w.nav_intent_barrier_proposal_ticket()!==1)throw Error('Missing selected checkpoint ticket');return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 const wall=core.addWall(request.destination.x,request.destination.z,.4,.4);if(!(wall>0))throw Error('Selected checkpoint destination fault unavailable');
 let next;
 for(let step=0;step<4;step++){
  commit(false);const proposal=planner.prepareNativeIdleCycleProposal(actor);
  if(proposal.status!=='proposed'||w.nav_idle_cycle_proposal_commit_bound(...tuple().slice(0,5),proposal.proposal.ticket.ticket)!==1)throw Error('Selected checkpoint actual21 failed');
  commit(false);if(!planner.projectNativeIdleCycle(state,worker))throw Error('Selected checkpoint lost21 projection');
  if(step===0&&core.removeWall(wall)!==1)throw Error('Selected checkpoint destination repair failed');
  const binding=planner.nativeIdleCycleBinding(actor);state.elapsed=binding.reference.worldBoundary.effectiveTime+binding.reference.duration+.01;
  if(planner.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Selected checkpoint21 did not execute');commit(false);
  if(!planner.projectNativeIdleCycle(state,worker))throw Error('Selected checkpoint lost executed21');next=planner.nativeIdleCycleNextRequest(actor);
  if(!next||next.sourceCycle.cycleSequence!==binding.cycleSequence)throw Error('Selected checkpoint lost actual next');
  cycles.push({binding,next});if(next.approach)break;
 }
 if(!next?.approach||next.idleState.mode!=='walk'||next.idleState.remaining===request.idleSeconds*2)throw Error('Selected checkpoint did not select a distinct WALK remaining');
 const walk=planner.prepareNativeIdleStrollProposal(actor),reference=walk.proposal?.nativeIdleStroll;
 if(walk.status!=='proposed'||reference.version!==2||reference.sourceRequest||reference.sourceCycleSequence!==cycles.at(-1).binding.cycleSequence||reference.walkRemaining!==next.idleState.remaining||w.nav_idle_stroll_proposal_commit_bound(...tuple().slice(0,5),walk.proposal.ticket.ticket)!==1)throw Error('Selected checkpoint actual22 failed');
 if(planner.beginNativeRouteExecution().status!=='started')throw Error('Selected checkpoint22 cohort unavailable');commit(false);const binding=planner.nativeIdleStrollBinding(actor);state.elapsed=binding.reference.worldBoundary.effectiveTime+(binding.reference.endTime-binding.reference.worldBoundary.effectiveTime)*progress;
 if(planner.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Selected checkpoint22 did not execute');commit(false);
 const execution=planner.projectNativeIdleStroll(state,worker);
 if(!execution||execution.arrived||worker.idleState.remaining!==reference.walkRemaining||worker.destinationId!==worker.idleState.anchorId||state.rng!==rng)throw Error('Selected checkpoint lost its executed WALK semantics');
 return {scope:'Actual native failed21/retry21/selected22 before GPU; trusted native commits, not graphical admission.',request,cycles,next,binding,execution,globalRngUnchanged:true};
}
