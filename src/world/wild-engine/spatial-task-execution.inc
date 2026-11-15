// Source-side read projection of the one native execution cache. No sampling,
// copied polyline, body upsert or second controller participates in this view.
EMSCRIPTEN_KEEPALIVE int nav_intent_task_execution_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_game_execution_state(){
 const auto& s=state();if(!s.executionEnabled&&!s.causalClock)return 0;
 // Other movers must gain their own source projection before sharing Game.tick.
 // Their existing native clocks and component consumers remain supported.
 if(!s.gates.empty()||!s.suspendedBodies.empty())return -1;
 for(const auto& [actor,intent]:s.activeIntents){
  if(intent.state==PlanningState::Cancelled)continue;
  if(intent.animal||intent.home||intent.retreat||!intent.task||!intent.requiresResources||intent.state==PlanningState::ActionActive)return -1;
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
 const auto* route=executedTaskRoute(s,actor);if(!route)return 0;const auto& intent=s.activeIntents.at(actor);if(!intent.actionRequest)return 0;
 const auto& request=*intent.actionRequest;s.taskActionRequestResult={1,double(actor),double(intent.task),double(intent.target),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),double(route->reservationBody),request.requestedAt,double(request.kind),request.duration,request.heading,s.effectiveTime};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_task_action_request_ptr(){return state().taskActionRequestResult.data();}
