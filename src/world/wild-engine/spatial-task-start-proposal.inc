// First assignment from a genuine task resource request. Uses the SAME timing,
// gate, body and reservation proof as other native motion, without publishing it.
static bool taskStartBodyCurrent(IntentState& s,const PendingNativeMotionDraft& draft){
  const auto route=pendingTaskRoute(s.session,draft.slot,draft.generation,draft.header[21]);
  if(!route||route->actor!=draft.route.actor)return false;
  const auto& intent=s.activeIntents.at(route->actor);const auto worker=s.workers.find(route->actor);SpatialBodyView body;
  return double(intent.task)==draft.taskIdentity[0]&&double(intent.target)==draft.taskIdentity[1]&&
    worker!=s.workers.end()&&gateBody(worker->second,body)&&worker->second.body==draft.body&&
    (body.flags&1)&&!(body.flags&2)&&!(draft.route.motionFlags&32)&&body.r==draft.route.radius&&
    body.x==draft.route.originX&&body.z==draft.route.originZ&&worker->second.x==body.x&&worker->second.z==body.z&&
    !s.reservedBodies.count(draft.body)&&!s.suspendedBodies.count(draft.body);
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_stage(double session,double slot,double generation,double requestSequence,
    double bodyId,double radius,int flags,double runBudget){
  auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview)return -4;
  if(!integer(bodyId))return -1;
  const auto source=pendingTaskRoute(session,slot,generation,requestSequence);if(!source)return -1;
  if(!gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  const auto& intent=s.activeIntents.at(source->actor);const auto worker=s.workers.find(source->actor);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||worker->second.body!=uint64_t(bodyId)||
     !(body.flags&1)||(body.flags&2)||(flags&32)||body.r!=radius||body.x!=source->originX||body.z!=source->originZ||
     worker->second.x!=body.x||worker->second.z!=body.z||
     s.reservedBodies.count(uint64_t(bodyId))||s.suspendedBodies.count(uint64_t(bodyId)))return -3;
  PendingNativeMotionDraft draft;draft.slot=uint32_t(slot);draft.generation=uint32_t(generation);draft.body=uint64_t(bodyId);
  draft.taskIdentity={double(intent.task),double(intent.target)};draft.route.points=source->points;
  const int previous=lazy_selected_context();if(previous!=intent.profile)spatial_select_nav_profile_index(intent.profile);
  int result=prepareRouteTiming(draft.route,source->actor,body.x,body.z,s.effectiveTime,radius,2,flags,runBudget,true);
  draft.topology=lazy_route_revision();if(previous!=intent.profile)spatial_select_nav_profile_index(previous);
  recordTimingResult(s,result);if(result!=1)return -7;
  draft.gates=s.gates;result=proveGateRouteAdmission(s,intent,draft.route,draft.body,body,draft.gates,draft.boundaries,false);
  if(result!=1)return result;
  const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
  auto& p=s.barrierProposal;p.kind=14;captureNativeMotionRows(draft);const auto& route=draft.route;
  draft.header={1,double(route.actor),double(draft.body),double(draft.generation),double(nextGateRouteGeneration(draft.generation)),double(route.profile),double(route.motionFlags),route.radius,
    route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,route.distances.back()),route.distances.back(),route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
    double(route.points.size()/2),double(draft.rows.size()/16),double(draft.slot),double(intent.resourceRequestSequence),intent.resourceRequestedAt,double(p.intents)};
  p.start=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_snapshot(double session,double ticket){
  const auto& p=state().barrierProposal;if(!p.start||p.kind!=14)return -1;
  return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),14);
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_start_proposal_header_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==14&&p.start?p.start->header.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_start_proposal_task_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==14&&p.start?p.start->taskIdentity.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_points(double session,double ticket){
  const int valid=nav_task_start_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.start->route.points.size()/2):valid;
}
EMSCRIPTEN_KEEPALIVE const float* nav_task_start_proposal_points_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==14&&p.start?p.start->route.points.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_rows(double session,double ticket){
  const int valid=nav_task_start_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.start->rows.size()/16):valid;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_start_proposal_rows_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==14&&p.start?p.start->rows.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_gates(double session,double ticket){
  const int valid=nav_task_start_proposal_snapshot(session,ticket);if(valid!=1)return valid;
  auto& s=state();s.gateResult.clear();for(uint64_t id:s.barrierProposal.start->route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_gate(double session,double ticket,double gateId){
  const int valid=nav_task_start_proposal_snapshot(session,ticket);if(valid!=1)return valid;
  auto& s=state();s.gateResult.clear();if(!integer(gateId))return -1;const auto& draft=*s.barrierProposal.start;const uint64_t id=uint64_t(gateId);
  if(std::find(draft.route.gateReservations.begin(),draft.route.gateReservations.end(),id)==draft.route.gateReservations.end())return -1;
  const auto found=draft.gates.find(id);if(found==draft.gates.end()||!found->second.mesh)return -2;
  return captureNativeGateRouteCurve(s,draft.route,found->second);
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_cancel(double session,double ticket){
  const auto& p=state().barrierProposal;if(p.kind!=14||!p.start)return 0;return nav_intent_barrier_proposal_cancel(session,ticket);
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_commit(double session,double ticket,double sequence,double time,double clockSequence){
  auto& s=state();if(!s.barrierProposal.start)return -1;
  const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,14);if(valid!=1)return valid;
  // Worker/body binding can change without a physical mutation counter. Check
  // that exact source again before making the unpublished candidate executable.
  if(!taskStartBodyCurrent(s,*s.barrierProposal.start)){clearWorldMutationProposal(s.barrierProposal);return -2;}
  auto draft=std::move(*s.barrierProposal.start);clearWorldMutationProposal(s.barrierProposal);
  auto& intent=s.activeIntents.at(draft.route.actor);intent.topology=draft.topology;
  publishGateRouteAdmission(s,intent,draft.slot,draft.route,draft.body,draft.gates,draft.boundaries);
  nav_intent_route_timing(session,double(draft.slot),double(s.routeSlots[draft.slot].generation));return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_revalidate(double session,double ticket){
  auto& s=state();auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=14||!p.start||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  auto old=std::move(*p.start);clearWorldMutationProposal(p);
  const int result=nav_task_start_proposal_stage(session,old.slot,old.generation,old.header[21],double(old.body),old.route.radius,old.route.motionFlags,old.route.runBudget);
  if(result!=1)return result;
  auto& next=*s.barrierProposal.start;
  next.previousStart=NativeTaskStartOrigin{old.header,old.taskIdentity,uint64_t(ticket)};
  next.timeTranslation={2,ticket,double(s.barrierProposal.ticket),old.header[10],old.header[11],next.header[10],next.header[11],
    sameNativeMotionDraft(old,next)?1.:0.,sameNativeMotionGates(s,old,next)?1.:0.,
    sameNativeMotionDraft(old,next,true)?1.:0.,sameNativeMotionGates(s,old,next,true)?1.:0.};
  return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_start_proposal_time_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;
  return p.pending&&p.kind==14&&p.start&&session==double(p.session)&&ticket==double(p.ticket)&&p.start->timeTranslation[0]==2?p.start->timeTranslation.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_binding_version(){return 1;}
// Bind only a CURRENT native draft or the exact previous draft whose resource
// projection was proved compatible. The embedding supplies its retained ticket.
EMSCRIPTEN_KEEPALIVE int nav_task_start_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
  auto& s=state();const auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=14||!p.start||!integer(preparedTicket))return -1;
  const auto& draft=*p.start;auto binding=std::make_shared<NativeTaskStartBinding>();
  binding->actual={draft.header,draft.taskIdentity,p.ticket};
  if(preparedTicket==double(p.ticket))binding->prepared=binding->actual;
  else if(draft.previousStart&&preparedTicket==double(draft.previousStart->ticket)&&draft.timeTranslation[9]==1&&draft.timeTranslation[10]==1)binding->prepared=*draft.previousStart;
  else return -9;
  const uint64_t actor=draft.route.actor;
  const int result=nav_task_start_proposal_commit(session,ticket,sequence,time,clockSequence);if(result!=1)return result;
  const auto& intent=s.activeIntents.at(actor);binding->assignmentSequence=intent.assignmentSequence;
  s.routeSlots[intent.slot].startBinding=std::move(binding);
  spatialRecordMotionResourceBoundary(session,ticket,time,14);return 1;
}
static const NativeTaskStartBinding* currentTaskStartBinding(double actor){
  auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));
  if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive||found->second.slot>=s.routeSlots.size())return nullptr;
  const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];const auto& binding=route.startBinding;
  return route.active&&!route.pendingResources&&!route.suspended&&route.reserved&&binding&&
    route.generation==intent.generation&&double(route.generation)==binding->actual.header[4]&&
    route.reservationBody==uint64_t(binding->actual.header[2])&&route.startTime==binding->actual.header[10]&&
    binding->assignmentSequence==intent.assignmentSequence?binding.get():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_start_binding_snapshot(double actor){
  auto& s=state();s.startBindingResult.clear();const auto binding=currentTaskStartBinding(actor);if(!binding)return 0;
  s.startBindingResult={1,double(binding->assignmentSequence),double(binding->prepared.ticket),double(binding->actual.ticket)};
  s.startBindingResult.insert(s.startBindingResult.end(),binding->prepared.header.begin(),binding->prepared.header.end());
  s.startBindingResult.insert(s.startBindingResult.end(),binding->actual.header.begin(),binding->actual.header.end());
  s.startBindingResult.insert(s.startBindingResult.end(),binding->actual.taskIdentity.begin(),binding->actual.taskIdentity.end());return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_start_binding_snapshot_ptr(){return state().startBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_task_start_binding_gates(double actor){
  auto& s=state();s.gateResult.clear();if(!currentTaskStartBinding(actor))return -1;
  const auto& route=s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot];
  for(uint64_t id:route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());
}
