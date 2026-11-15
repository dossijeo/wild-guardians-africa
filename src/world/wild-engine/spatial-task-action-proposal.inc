// An arrived task declares a stationary action in the SAME mutation slot.
// This is preparation data only: no action state, route release or effects.
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_version(){return 1;}
static int stageTaskActionProposal(double actorId,double session,double slot,double generation,
    double assignment,double taskId,double targetId,double bodyId,double requestedAt,
    int kind,double duration,double heading){
  auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview)return -4;
  if(!integer(actorId)||!integer(session)||session!=double(s.session)||!integer(slot,true)||
     !integer(generation)||!integer(assignment)||!integer(taskId)||!integer(targetId)||!integer(bodyId)||
     !std::isfinite(requestedAt)||!std::isfinite(duration)||!std::isfinite(heading))return -1;
  const uint64_t actor=uint64_t(actorId);const auto* route=executedTaskRoute(s,actor);
  if(!route||route->executionPose[6]!=1)return -1;
  const auto& intent=s.activeIntents.at(actor);
  if(double(intent.slot)!=slot||double(intent.generation)!=generation||double(intent.assignmentSequence)!=assignment||
     double(intent.task)!=taskId||double(intent.target)!=targetId||double(route->reservationBody)!=bodyId||!intent.actionRequest)return -1;
  const auto& request=*intent.actionRequest;
  if(request.requestedAt!=requestedAt||request.kind!=kind||request.duration!=duration||request.heading!=heading)return -1;
  const auto worker=s.workers.find(actor);const auto task=s.tasks.find(intent.task);const auto target=s.targets.find(intent.target);SpatialBodyView body;
  if(worker==s.workers.end()||task==s.tasks.end()||task->second.assigned!=actor||task->second.target!=intent.target||
     task->second.kind!=(kind==1||kind==2?1:kind==4?2:0)||target==s.targets.end()||!target->second.active)return -1;
  if(!gateBody(worker->second,body)||worker->second.body!=route->reservationBody||!(body.flags&1)||(body.flags&2)||
     body.r!=route->radius||body.x!=route->executionPose[0]||body.z!=route->executionPose[1]||
     worker->second.x!=body.x||worker->second.z!=body.z)return -3;
  const double end=s.effectiveTime+duration;if(!std::isfinite(end)||end<s.effectiveTime||duration>0&&end==s.effectiveTime)return -2;
  for(double value:{duration,heading,body.x,body.z,body.r,route->executionPose[9],route->executionPose[10],route->executionPose[11],route->executionPose[14]})if(!std::isfinite(float(value)))return -2;
  const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
  auto& p=s.barrierProposal;p.kind=15;p.action.emplace();
  p.action->header={1,actorId,taskId,targetId,bodyId,slot,generation,assignment,requestedAt,double(kind),duration,heading,
    body.x,body.z,body.r,p.at,end,route->executionPose[9],route->executionPose[10],route->executionPose[11],
    route->executionPose[14],double(p.intents),double(route->profile),double(route->motionFlags)};
  return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_stage(double actorId,double session,double slot,double generation,
    double assignment,double taskId,double targetId,double bodyId,double requestedAt,int kind,double duration,double heading){
  return stageTaskActionProposal(actorId,session,slot,generation,assignment,taskId,targetId,bodyId,requestedAt,kind,duration,heading);
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_snapshot(double session,double ticket){
  const auto& p=state().barrierProposal;if(p.kind!=15||!p.action)return -1;
  return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),15);
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_action_proposal_header_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==15&&p.action?p.action->header.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_cancel(double session,double ticket){
  const auto& p=state().barrierProposal;if(p.kind!=15||!p.action)return 0;
  return nav_intent_barrier_proposal_cancel(session,ticket);
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_revalidate(double session,double ticket){
  auto& s=state();auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=15||!p.action||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  const auto h=p.action->header;clearWorldMutationProposal(p);
  // Re-read only the native-owned source. Never replace it with a caller's
  // newer task/handle or infer an action from a changed JS status.
  const int result=stageTaskActionProposal(h[1],session,h[5],h[6],h[7],h[2],h[3],h[4],h[8],int(h[9]),h[10],h[11]);
  if(result!=1)return result;
  const auto& next=p.action->header;bool same=true;
  for(size_t i=0;i<h.size();i++)if(i!=15&&i!=16&&i!=21&&h[i]!=next[i])same=false;
  // Identity/pose/phase equality is NOT a Float32 shader compatibility proof.
  p.action->previousHeader=h;p.action->previousTicket=uint64_t(ticket);
  p.action->timeTranslation={1,ticket,double(p.ticket),h[15],h[16],next[15],next[16],same?1.:0.};return 1;
}
// Trusted source ABI, like other conditioned native mutations. The embedding
// must obtain its exact direct-consumer drain and retained packet before use.
// Only an issued native transition can become an action identity.
EMSCRIPTEN_KEEPALIVE int nav_task_action_binding_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_action_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
  auto& s=state();const auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=15||!p.action||!integer(preparedTicket))return -1;
  const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,15);if(valid!=1)return valid;
  const auto draft=*p.action;const auto& h=draft.header;const uint64_t actor=uint64_t(h[1]);
  const auto* route=executedTaskRoute(s,actor);SpatialBodyView body;
  if(!route||route->executionPose[6]!=1||double(route->reservationBody)!=h[4]||!spatialReadBody(route->reservationBody,body)||body.x!=h[12]||body.z!=h[13]||body.r!=h[14]){clearWorldMutationProposal(s.barrierProposal);return -2;}
  auto binding=std::make_shared<NativeTaskActionBinding>();binding->actual=h;binding->actualTicket=uint64_t(ticket);binding->preparedTicket=uint64_t(preparedTicket);binding->bodyFlags=body.flags;
  if(preparedTicket==ticket)binding->prepared=h;
  else if(draft.previousHeader&&preparedTicket==double(draft.previousTicket)&&draft.timeTranslation[7]==1)binding->prepared=*draft.previousHeader;
  else return -9;
  clearWorldMutationProposal(s.barrierProposal);auto& intent=s.activeIntents.at(actor);
  releaseRoute(s,intent);intent.state=PlanningState::ActionActive;intent.actionBinding=binding;
  binding->actionSequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
static void appendTaskActionBinding(IntentState& s,const ActiveIntent& intent){
  const auto& b=*intent.actionBinding;auto& out=s.taskActionBindingResult;
  out.insert(out.end(),{1,double(b.actionSequence),double(s.session),double(b.preparedTicket),double(b.actualTicket),s.effectiveTime});
  out.insert(out.end(),b.prepared.begin(),b.prepared.end());out.insert(out.end(),b.actual.begin(),b.actual.end());
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_binding_snapshot(double actorId){
  auto& s=state();s.taskActionBindingResult.clear();if(!integer(actorId))return 0;
  const auto found=s.activeIntents.find(uint64_t(actorId));if(found==s.activeIntents.end()||!found->second.actionBinding)return 0;
  if(!nativeTaskActionBodyCurrent(s,found->second))return -1;
  appendTaskActionBinding(s,found->second);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_bindings_snapshot(){
  auto& s=state();s.taskActionBindingResult.clear();std::vector<uint64_t> actors;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.actionBinding){if(!nativeTaskActionBodyCurrent(s,intent))return -1;actors.push_back(actor);}
  std::sort(actors.begin(),actors.end());for(uint64_t actor:actors)appendTaskActionBinding(s,s.activeIntents.at(actor));return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_action_binding_snapshot_ptr(){return state().taskActionBindingResult.data();}
EMSCRIPTEN_KEEPALIVE const double* nav_task_action_proposal_time_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;
  return p.pending&&p.kind==15&&p.action&&session==double(p.session)&&ticket==double(p.ticket)&&p.action->timeTranslation[0]==1?p.action->timeTranslation.data():nullptr;
}
