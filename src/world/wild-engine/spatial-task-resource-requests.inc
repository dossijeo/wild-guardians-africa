// A committed task claim can wait for graphical resources in its ONE route
// slot. It is a request, not an issued route or a second trajectory registry.
EMSCRIPTEN_KEEPALIVE int nav_intent_task_resource_request_version(){return 1;}
static RouteSlot* pendingTaskRoute(double session,double slot,double generation,double sequence){
  auto& s=state();
  if(!integer(session)||session!=double(s.session)||!integer(slot,true)||slot>=s.routeSlots.size()||
     !integer(generation)||generation>double(UINT32_MAX)||!integer(sequence))return nullptr;
  auto& route=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(route.actor);
  if(!route.active||!route.pendingResources||route.suspended||route.generation!=uint32_t(generation)||
     found==s.activeIntents.end())return nullptr;
  const auto& intent=found->second;const auto task=s.tasks.find(intent.task);const auto target=s.targets.find(intent.target);
  if(intent.animal||intent.home||!intent.requiresResources||intent.state!=PlanningState::AwaitingResources||
     intent.slot!=uint32_t(slot)||intent.generation!=uint32_t(generation)||intent.resourceRequestSequence!=uint64_t(sequence)||
     task==s.tasks.end()||task->second.assigned!=route.actor||task->second.target!=intent.target||
     target==s.targets.end()||!target->second.active)return nullptr;
  return &route;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_pending_task_route(double actor){
  auto& s=state();s.pendingTaskRouteResult.fill(0);if(!integer(actor))return 0;
  const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
  const auto& intent=found->second;
  const auto route=pendingTaskRoute(s.session,intent.slot,intent.generation,double(intent.resourceRequestSequence));
  if(!route)return 0;
  s.pendingTaskRouteResult={1,actor,double(intent.task),double(intent.target),double(s.session),double(intent.slot),
    double(intent.generation),double(intent.resourceRequestSequence),intent.resourceRequestedAt,double(intent.profile),
    route->originX,route->originZ,double(route->points.size()/2)};
  return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_pending_task_route_ptr(){return state().pendingTaskRouteResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_pending_task_route_points(double session,double slot,double generation,double sequence){
  const auto route=pendingTaskRoute(session,slot,generation,sequence);return route?int(route->points.size()/2):-1;
}
EMSCRIPTEN_KEEPALIVE const float* nav_intent_pending_task_route_points_ptr(double session,double slot,double generation,double sequence){
  const auto route=pendingTaskRoute(session,slot,generation,sequence);return route?route->points.data():nullptr;
}
// Restore the saved admission requirement BEFORE the ordinary replan emits any
// route. A live issued assignment cannot be converted through this accessor.
EMSCRIPTEN_KEEPALIVE int nav_intent_require_route_resources(double actor){
  auto& s=state();if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));
  if(found==s.activeIntents.end()||found->second.animal||found->second.home||
     found->second.state!=PlanningState::NeedsPlan)return 0;
  found->second.requiresResources=true;return 1;
}
// Bootstrap projection of pending request identities; no points or permission.
EMSCRIPTEN_KEEPALIVE int nav_intent_task_requests_snapshot(){
  auto& s=state();s.pendingTaskControlSnapshot.clear();std::vector<uint64_t> actors;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.state==PlanningState::AwaitingResources)actors.push_back(actor);
  std::sort(actors.begin(),actors.end());
  for(uint64_t actor:actors){const auto& i=s.activeIntents.at(actor);
    if(pendingTaskRoute(s.session,i.slot,i.generation,double(i.resourceRequestSequence)))
      s.pendingTaskControlSnapshot.insert(s.pendingTaskControlSnapshot.end(),{double(actor),double(i.task),double(i.target),double(i.slot),double(i.generation),double(i.resourceRequestSequence),i.resourceRequestedAt,double(i.profile)});
  }
  return int(s.pendingTaskControlSnapshot.size()/8);
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_task_requests_snapshot_ptr(){return state().pendingTaskControlSnapshot.data();}
