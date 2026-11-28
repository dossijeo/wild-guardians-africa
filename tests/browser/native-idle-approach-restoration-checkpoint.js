// Trusted source-only fixture before any graphical world exists. Every23/22
// is really committed/executed; the later save contains no old permission.
export function prepareNativeIdleApproachCheckpoint({state,planner,w,commit,arrived=false,progress=.8}){
 if(!Number.isFinite(progress)||progress<=0||progress>=1)throw Error('Invalid executed approach checkpoint progress');
 const worker=state.workers[0],actor=worker.id,tuple=()=>{if(w.nav_intent_barrier_proposal_ticket()!==1)throw Error('Missing approach checkpoint ticket');return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));};
 commit(false);const source=planner.nativeFarmArrivalRequestReference(actor),farm=planner.prepareNativeFarmArrivalRouteProposal(source,{urgent:true});
 if(farm.status!=='proposed'||w.nav_farm_arrival_route_proposal_commit_bound(...tuple().slice(0,5),farm.proposal.ticket.ticket)!==1||planner.beginNativeRouteExecution().status!=='started')throw Error('Approach checkpoint Farm23 failed');
 commit(false);const issued=planner.nativeFarmArrivalRouteBinding(actor);state.elapsed=issued.reference.endTime+.03;if(planner.advanceNativeRouteExecution(state.elapsed).status!=='advanced'||!planner.projectNativeFarmArrivalExecution(state,worker)?.arrived)throw Error('Approach checkpoint Farm did not arrive');commit(false);
 const walk=planner.prepareNativeIdleStrollProposal(actor);if(walk.status!=='proposed'||!walk.proposal.nativeIdleStroll.sourceFarm||w.nav_idle_stroll_proposal_commit_bound(...tuple().slice(0,5),walk.proposal.ticket.ticket)!==1)throw Error('Approach checkpoint real22 failed '+JSON.stringify({status:walk.status}));
 commit(false);const binding=planner.nativeIdleStrollBinding(actor),r=binding.reference;state.elapsed=arrived?r.endTime+.01:r.worldBoundary.effectiveTime+(r.endTime-r.worldBoundary.effectiveTime)*progress;
 if(planner.advanceNativeRouteExecution(state.elapsed).status!=='advanced'||!planner.projectNativeIdleStroll(state,worker))throw Error('Approach checkpoint motion failed');commit(false);
 if(worker.destinationId!==worker.idleState.anchorId||worker.idleState.remaining!==r.idleSeconds*2||planner.nativeInitialIdleBodyBinding(actor)||planner.nativeIdleCycleBinding(actor)||planner.nativeFarmArrivalHeldExecution(actor))throw Error('Approach checkpoint fabricated or lost its birth');
}
