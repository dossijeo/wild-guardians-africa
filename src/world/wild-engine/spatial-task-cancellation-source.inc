// One immutable source witness for the existing prepared Idle20 handoff.
// No semantic effect is committed here and no running route is stopped here.
static bool captureTaskCancellationSource(const IntentState& s,const ActiveIntent& intent,
    NativeTaskCancellationSource& out){
 if(!s.session||!intent.requiresResources||intent.animal||intent.home||intent.retreat||intent.delivery||
    !intent.task||!intent.target||!intent.lease)return false;
 const auto worker=s.workers.find(intent.actor);const auto task=s.tasks.find(intent.task);
 if(worker==s.workers.end()||task==s.tasks.end()||task->second.assigned!=intent.actor||
    task->second.target!=intent.target||task->second.center!=worker->second.center||
    !worker->second.bodyBound||worker->second.inactiveSequence)return false;
 SpatialBodyView body;if(!spatialReadBody(worker->second.body,body)||body.kind!=0||!(body.flags&1))return false;
 double phase=0,sequence=0,slot=0,generation=0,at=0;std::array<double,8> pose{};
 if(intent.actionBinding){
  if(!nativeTaskActionBodyCurrent(s,intent))return false;
  const auto& b=*intent.actionBinding;const auto& h=b.actual;
  phase=15;sequence=double(b.actionSequence);at=h[15];
  pose={h[12],h[13],h[11],h[14],h[17],h[18],h[19],h[20]};
 }else{
  const auto* route=stoppedTaskHomeSource(s,intent,intent.assignmentSequence,intent.generation,body);
  if(route){if(intent.state!=PlanningState::WaitingBlocked)return false;phase=25;at=route->suspendedAt;}
  else{
   route=executedTaskRoute(s,intent.actor);
   if(!route||route->suspended||!route->reserved||route->pendingResources||!route->startBinding||
      route->executionPose[6]!=1||route->executionPose[15]!=0||route->executionPose[16]!=0)return false;
   phase=14;at=routeTimeAtDistance(*route,route->distances.empty()?0:route->distances.back());
  }
  sequence=double(intent.assignmentSequence);slot=double(intent.slot);generation=double(intent.generation);
  const auto& p=route->executionPose;pose={p[0],p[1],p[4],route->radius,p[9],p[10],p[11],p[14]};
 }
 if(worker->second.x!=body.x||worker->second.z!=body.z||body.x!=pose[0]||body.z!=pose[1]||body.r!=pose[3])return false;
 out.values={1,phase,double(intent.actor),double(intent.task),double(intent.target),double(s.session),
  sequence,slot,generation,double(worker->second.body),at,pose[0],pose[1],pose[2],pose[3],pose[4],pose[5],pose[6],pose[7],double(body.flags)};
 return true;
}
static bool taskCancellationSourceCurrent(const IntentState& s,const ActiveIntent& intent,const NativeTaskCancellationSource& expected){
 NativeTaskCancellationSource actual;return captureTaskCancellationSource(s,intent,actual)&&actual.values==expected.values;
}
EMSCRIPTEN_KEEPALIVE int nav_task_cancellation_source_snapshot(double actor){
 auto& s=state();s.taskCancellationResult.fill(0);if(!integer(actor))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));NativeTaskCancellationSource q;
 if(found==s.activeIntents.end()||!captureTaskCancellationSource(s,found->second,q))return 0;
 s.taskCancellationResult=q.values;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_cancellation_source_ptr(){return state().taskCancellationResult.data();}
// A provisional14 has no executable successor. Restore only its still-owned
// stationary20/21, never recreate a body or erase another actor's proposal.
EMSCRIPTEN_KEEPALIVE int nav_intent_pending_task_cancel(double actor,double session,double requestSequence){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(requestSequence))return -1;
 if(s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 auto& intent=found->second;
 if(intent.state!=PlanningState::AwaitingResources||intent.resourceRequestSequence!=uint64_t(requestSequence)||
    !intent.task||!intent.target||!intent.lease||intent.home||intent.animal||intent.actionBinding||
    intent.slot>=s.routeSlots.size()||!s.routeSlots[intent.slot].active||!s.routeSlots[intent.slot].pendingResources||
    s.routeSlots[intent.slot].actor!=intent.actor||s.routeSlots[intent.slot].generation!=intent.generation)return -2;
 const auto body=intent.initialIdleBodyBinding;const auto cycle=intent.idleCycle;
 if(!(cycle?nativeIdleCycleBodyCurrent(s,intent):body&&nativeInitialIdleBodyCurrent(s,intent)))return -2;
 const auto task=s.tasks.find(intent.task);if(task==s.tasks.end()||task->second.assigned!=intent.actor)return -2;
 const auto& p=s.barrierProposal;
 if(p.pending&&!(p.kind==14&&p.start&&p.start->route.actor==intent.actor))return -4;
 if(p.pending)clearWorldMutationProposal(s.barrierProposal);
 // The receipt describes the ACTUAL retained owner, not a new grant. Original
 // finite21 time is unchanged even when the request is cancelled after its end.
 std::array<double,16> receipt={1,double(s.session),actor,double(intent.task),double(intent.target),
  requestSequence,double(intent.slot),double(intent.generation),intent.resourceRequestedAt,
  cycle?21.:20.,cycle?double(cycle->binding->cycleSequence):double(body->bodySequence),
  cycle?double(cycle->binding->actual.ticket):double(body->actual.ticket),
  cycle?double(cycle->binding->source.body):body->actual.header[2],0,s.effectiveTime,
  cycle?nativeIdleCycleEnd(*cycle):0.};
 const uint64_t taskId=intent.task;releaseIntent(s,intent.actor,PlanningState::Cancelled,false);
 intent.initialIdleBodyBinding=body;intent.idleCycle=cycle;intent.lease=false;intent.state=PlanningState::StationaryActive;
 s.tasks.at(taskId).assigned=0;auto& worker=s.workers.at(intent.actor);worker.eligible=true;worker.actionActive=false;
 receipt[13]=double(emitIntentChange(s,intent));intent.pendingTaskCancellation=receipt;s.entityRevision++;return 1;
}
// One current transition receipt, retired at the next event/release of this
// actor. Queued stale notifications cannot recover permission from a new owner.
EMSCRIPTEN_KEEPALIVE int nav_intent_pending_task_cancellation_snapshot(double actor,double sequence){
 auto& s=state();s.pendingTaskCancellationResult.fill(0);
 if(!integer(actor)||!integer(sequence))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));
 if(found==s.activeIntents.end()||!found->second.pendingTaskCancellation)return 0;
 const auto& intent=found->second;const auto& q=*intent.pendingTaskCancellation;
 if(q[13]!=sequence||q[1]!=double(s.session)||intent.task||intent.target||intent.generation||
    intent.state!=PlanningState::StationaryActive)return 0;
 if(q[9]==21){
  if(!nativeIdleCycleCurrent(s,intent))return 0;
  const auto& b=*intent.idleCycle->binding;
  if(q[10]!=double(b.cycleSequence)||q[11]!=double(b.actual.ticket)||q[12]!=double(b.source.body)||
     q[15]!=nativeIdleCycleEnd(*intent.idleCycle))return 0;
 }else{
  if(intent.idleCycle||!nativeInitialIdleBodyCurrent(s,intent))return 0;
  const auto& b=*intent.initialIdleBodyBinding;
  if(q[10]!=double(b.bodySequence)||q[11]!=double(b.actual.ticket)||q[12]!=b.actual.header[2])return 0;
 }
 s.pendingTaskCancellationResult=q;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_pending_task_cancellation_ptr(){return state().pendingTaskCancellationResult.data();}
