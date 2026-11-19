// Source-side read projection of the one native execution cache. No sampling,
// copied polyline, body upsert or second controller participates in this view.
EMSCRIPTEN_KEEPALIVE int nav_intent_task_execution_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_game_execution_state(){
 const auto& s=state();if(!s.executionEnabled&&!s.causalClock)return 0;
 // Other movers must gain their own source projection before sharing Game.tick.
 // Their existing native clocks and component consumers remain supported.
 if(!s.gates.empty())return -1;
 // A prepared stopped22/23 keeps its exact body while the rest of the cohort
 // advances. Other suspended classes still need their own Game projection.
 for(const auto& [body,slot]:s.suspendedBodies){
  const auto actor=s.gateBodyActors.find(body);if(actor==s.gateBodyActors.end())return -1;
  const auto found=s.activeIntents.find(actor->second);if(found==s.activeIntents.end()||found->second.slot!=slot||!nativeHeldIdleStrollBodyCurrent(s,found->second,found->second.assignmentSequence,found->second.generation)&&!nativeHeldFarmArrivalBodyCurrent(s,found->second))return -1;
 }
 for(const auto& [actor,intent]:s.activeIntents){
  if(intent.state==PlanningState::Cancelled)continue;
  if(nativeHeldIdleStrollBodyCurrent(s,intent,intent.assignmentSequence,intent.generation)||nativeHeldFarmArrivalBodyCurrent(s,intent))continue;
  if(nativeFarmArrivalBodyCurrent(s,intent))continue;
  if(intent.farmArrivalRequest){if(!nativeFarmArrivalRequestCurrent(s,intent))return -1;continue;}
  if(intent.strollRequest){if(!nativeIdleStrollRequestBodyCurrent(s,intent))return -1;continue;}
  if(intent.state==PlanningState::RouteActive&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].idleStrollBinding){if(!currentIdleStroll(double(actor)))return -1;continue;}
  if(intent.heldIdleTaskSource){if(!nativeHeldIdleTaskBodyCurrent(s,intent))return -1;continue;}
  if(intent.idleCycle){if(!nativeIdleCycleBodyCurrent(s,intent))return -1;continue;}
  if(intent.initialIdleBodyBinding){if(!nativeInitialIdleBodyCurrent(s,intent))return -1;continue;}
  if(intent.initialIdleRequest){if(!nativeInitialIdleRequestBodyCurrent(s,intent))return -1;continue;}
  if(intent.homeRequest){if(!nativeHomeRequestBodyCurrent(s,intent)&&!nativeUnboundFarmHomeCurrent(s,intent))return -1;continue;}
  if(intent.delivery){if(!nativeDeliveryBodyCurrent(s,intent))return -1;continue;}
  if(intent.home&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].homeBinding){if(!nativeHomeBodyCurrent(s,intent))return -1;continue;}
  if(intent.settlementBinding){if(!nativeSettlementBodyCurrent(s,intent))return -1;continue;}
  if(intent.animal||intent.home||intent.retreat||!intent.task||!intent.requiresResources)return -1;
  if(intent.state==PlanningState::ActionActive&&!nativeTaskActionBodyCurrent(s,intent))return -1;
 }
 return 1;
}
static const RouteSlot* executedTaskRoute(const IntentState& s,uint64_t actor){
 const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end())return nullptr;
 const auto& intent=found->second;
 if(intent.animal||intent.home||intent.retreat||!intent.task||!intent.requiresResources||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return nullptr;
 const auto& route=s.routeSlots[intent.slot];SpatialBodyView body;
 if(!s.executionEnabled||!route.hasExecution||!executionBindingCoherent(s,route.reservationBody,intent.slot)||!spatialReadBody(route.reservationBody,body)||body.x!=route.executionPose[0]||body.z!=route.executionPose[1])return nullptr;
 return &route;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_task_execution(double actorId){
 auto& s=state();s.taskExecutionResult.fill(0);if(!integer(actorId))return 0;
 const uint64_t actor=uint64_t(actorId);const auto* route=executedTaskRoute(s,actor);if(!route)return 0;
 const auto& intent=s.activeIntents.at(actor);
 const double x=route->points.empty()?route->originX:route->points[route->points.size()-2],z=route->points.empty()?route->originZ:route->points.back();
 const std::array<double,13> header={1,double(actor),double(intent.task),double(intent.target),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),double(route->reservationBody),s.effectiveTime,1,x,z};
 std::copy(header.begin(),header.end(),s.taskExecutionResult.begin());std::copy(route->executionPose.begin(),route->executionPose.end(),s.taskExecutionResult.begin()+13);return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_task_execution_ptr(){return state().taskExecutionResult.data();}
// Fresh stationary source declaration after loading semantic progress. No
// route slot, polyline, executed arrival or old permission is manufactured.
EMSCRIPTEN_KEEPALIVE int nav_task_action_restore_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_restore_task_action(double actorId,int kind,double duration,double elapsed,double heading,
    double runPhase,double walkPhase,double carryPhase,double runRemaining){
 auto& s=state();if(!integer(actorId)||kind<0||kind>4||!std::isfinite(duration)||duration<0||duration>3600||(kind==4?duration!=0:duration<=0)||!std::isfinite(elapsed)||elapsed<0||elapsed>duration)return -1;
 for(double v:{heading,runPhase,walkPhase,carryPhase,runRemaining})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(runPhase<0||walkPhase<0||carryPhase<0||runRemaining<0)return -1;
 const auto found=s.activeIntents.find(uint64_t(actorId));if(found==s.activeIntents.end())return 0;
 auto& intent=found->second;const auto task=s.tasks.find(intent.task);const auto target=s.targets.find(intent.target);
 if(intent.animal||intent.home||intent.retreat||intent.generation||intent.actionBinding||task==s.tasks.end()||task->second.assigned!=intent.actor||task->second.target!=intent.target||task->second.kind!=(kind==1||kind==2?1:kind==4?2:0)||target==s.targets.end()||!target->second.active)return -2;
 if(intent.restoredActionSource){const auto& r=*intent.restoredActionSource;const auto& q=*intent.actionRequest;return q.kind==kind&&q.duration==duration&&q.heading==heading&&r.initialElapsed==elapsed&&r.runPhase==runPhase&&r.walkPhase==walkPhase&&r.carryPhase==carryPhase&&r.runRemaining==runRemaining?1:-3;}
 if(s.barrierProposal.pending||s.worldMutationPreview)return -4;
 if(intent.state!=PlanningState::NeedsPlan)return -2;
 intent.requiresResources=true;intent.state=PlanningState::AwaitingResources;
 intent.actionRequest=TaskActionResourceRequest{kind,duration,heading,s.effectiveTime};
 intent.restoredActionSource=RestoredTaskActionSource{0,elapsed,runPhase,walkPhase,carryPhase,runRemaining};
 intent.restoredActionSource->requestSequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
static bool taskActionRestoreSourceSnapshot(IntentState& s,const ActiveIntent& intent){
 const RestoredTaskActionSource* source=intent.actionBinding&&intent.actionBinding->restoredSource?&*intent.actionBinding->restoredSource:intent.restoredActionSource?&*intent.restoredActionSource:nullptr;
 if(!source||!source->requestSequence)return false;
 const double requestedAt=intent.actionBinding?intent.actionBinding->actual[8]:intent.actionRequest->requestedAt;
 s.taskActionRestoreSourceResult={1,double(intent.actor),double(intent.task),double(intent.target),double(s.session),double(source->requestSequence),requestedAt,source->initialElapsed};return true;
}
EMSCRIPTEN_KEEPALIVE int nav_task_action_restore_source_snapshot(double actorId){
 auto& s=state();s.taskActionRestoreSourceResult.fill(0);if(!integer(actorId))return 0;const auto found=s.activeIntents.find(uint64_t(actorId));return found!=s.activeIntents.end()&&taskActionRestoreSourceSnapshot(s,found->second)?1:0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_action_restore_source_ptr(){return state().taskActionRestoreSourceResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_task_action_restore_requests_snapshot(){
 auto& s=state();s.taskActionRestoreSourcesResult.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.state==PlanningState::AwaitingResources&&intent.restoredActionSource)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(uint64_t actor:actors)if(taskActionRestoreSourceSnapshot(s,s.activeIntents.at(actor)))s.taskActionRestoreSourcesResult.insert(s.taskActionRestoreSourcesResult.end(),s.taskActionRestoreSourceResult.begin(),s.taskActionRestoreSourceResult.end());return int(s.taskActionRestoreSourcesResult.size()/8);
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_action_restore_requests_ptr(){return state().taskActionRestoreSourcesResult.data();}
// Arrival retains the reservation. This declaration requests preparation; it
// cannot release the body, enter ActionActive or authorize an action effect.
EMSCRIPTEN_KEEPALIVE int nav_intent_task_action_request(double actorId,int kind,double duration,double heading){
 auto& s=state();if(!integer(actorId)||kind<0||kind>4||!std::isfinite(duration)||duration<0||duration>3600||(kind==4?duration!=0:duration<=0)||!std::isfinite(heading))return -1;
 const uint64_t actor=uint64_t(actorId);const auto* route=executedTaskRoute(s,actor);if(!route||route->executionPose[6]!=1)return 0;
 auto& intent=s.activeIntents.at(actor);const auto task=s.tasks.find(intent.task);
 if(task==s.tasks.end()||task->second.assigned!=actor||task->second.target!=intent.target||task->second.kind!=(kind==1||kind==2?1:kind==4?2:0))return -2;
 if(intent.actionRequest){const auto& old=*intent.actionRequest;return old.kind==kind&&old.duration==duration&&old.heading==heading?1:-3;}
 intent.actionRequest=TaskActionResourceRequest{kind,duration,heading,s.effectiveTime};return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_task_action_request_snapshot(double actorId){
 auto& s=state();s.taskActionRequestResult.fill(0);if(!integer(actorId))return 0;const uint64_t actor=uint64_t(actorId);
 const auto restored=s.activeIntents.find(actor);
 if(restored!=s.activeIntents.end()&&restored->second.state==PlanningState::AwaitingResources&&restored->second.restoredActionSource&&restored->second.actionRequest){
  const auto& intent=restored->second;const auto worker=s.workers.find(actor);const auto task=s.tasks.find(intent.task);const auto target=s.targets.find(intent.target);SpatialBodyView body;
  if(worker==s.workers.end()||task==s.tasks.end()||task->second.assigned!=actor||target==s.targets.end()||!target->second.active||!gateBody(worker->second,body)||body.kind!=0||!(body.flags&1)||(body.flags&2)||body.x!=worker->second.x||body.z!=worker->second.z)return 0;
  const auto& q=*intent.actionRequest;s.taskActionRequestResult={1,double(actor),double(intent.task),double(intent.target),double(s.session),0,0,double(intent.restoredActionSource->requestSequence),double(worker->second.body),q.requestedAt,double(q.kind),q.duration,q.heading,s.effectiveTime};return 1;
 }
 const auto* route=executedTaskRoute(s,actor);if(!route)return 0;const auto& intent=s.activeIntents.at(actor);if(!intent.actionRequest)return 0;
 const auto& request=*intent.actionRequest;s.taskActionRequestResult={1,double(actor),double(intent.task),double(intent.target),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),double(route->reservationBody),request.requestedAt,double(request.kind),request.duration,request.heading,s.effectiveTime};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_task_action_request_ptr(){return state().taskActionRequestResult.data();}
