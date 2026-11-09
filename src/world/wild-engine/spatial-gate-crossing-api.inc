EMSCRIPTEN_KEEPALIVE int nav_gate_crossing_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_crossing_count(double id){
  const auto& s=state();if(!integer(id)||!s.gates.count(uint64_t(id)))return -1;
  return int(s.gates.at(uint64_t(id)).crossings.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_crossings(double id){
  auto& s=state();s.gateResult.clear();if(!integer(id)||!s.gates.count(uint64_t(id)))return -1;
  for(const auto& [actor,c]:s.gates.at(uint64_t(id)).crossings)
    s.gateResult.insert(s.gateResult.end(),{double(actor),double(c.body),double(c.slot),double(c.generation),c.from,c.until});
  return int(s.gateResult.size()/6);
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_admitted(double session,double slot,double generation){
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  return state().routeSlots[size_t(slot)].gateAdmitted?1:0;
}
// Opt-in native admission only. It does not publish a GPU clock/permission or
// activate the product runtime. Failure never installs a partial route/motor.
EMSCRIPTEN_KEEPALIVE int nav_gate_admit_route(double session,double slot,double generation,
    double bodyId,double radius,int flags,double runBudget){
  auto& s=state();s.timingRejection=0;s.reservationResult.fill(0);s.gateSweepResult.fill(0);s.gateStaticResult.fill(0);
  if(!integer(bodyId,true)||nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& old=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(old.actor);
  if(found==s.activeIntents.end()||found->second.animal||found->second.slot!=uint32_t(slot)||
     found->second.generation!=uint32_t(generation)||found->second.state!=PlanningState::RouteActive||
     old.reserved||found->second.routeCursor||old.points.empty()||s.effectiveTime!=found->second.assignedAt||
     !gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  const auto worker=s.workers.find(found->first);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||worker->second.body!=uint64_t(bodyId)||
     !(body.flags&1)||body.r!=radius||body.x!=old.originX||body.z!=old.originZ||
     bool(body.flags&2)!=bool(flags&32)||s.reservedBodies.count(uint64_t(bodyId)))return -3;
  const int previous=lazy_selected_context();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(found->second.profile);
  RouteSlot candidate;candidate.points=old.points;
  int result=prepareRouteTiming(candidate,found->first,body.x,body.z,s.effectiveTime,radius,2,flags,runBudget,true);
  const uint32_t topology=lazy_route_revision();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(previous);
  auto proposed=s.gates;std::vector<GateCrossingBoundary> boundaries;
  recordTimingResult(s,result);if(result!=1)return -7;
  result=proveGateRouteAdmission(s,found->second,candidate,uint64_t(bodyId),body,proposed,boundaries);
  if(result!=1)return result;
  found->second.topology=topology;
  publishGateRouteAdmission(s,found->second,uint32_t(slot),candidate,uint64_t(bodyId),proposed,boundaries);
  nav_intent_route_timing(session,slot,double(old.generation));return 1;
}
// Explicit native command events; no polling timer or automatic retry loop.
EMSCRIPTEN_KEEPALIVE int nav_gate_route_suspend_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_suspend_route(double session,double slot,double generation){
  auto& s=state();if(nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& route=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(route.actor);
  if(found==s.activeIntents.end()||found->second.slot!=uint32_t(slot)||found->second.generation!=uint32_t(generation)||
     !suspendRoute(s,found->second))return -2;
  emitIntentChange(s,found->second);return 1;
}
RouteSlot* suspendedGateRoute(double session,double slot,double generation){
  auto& s=state();if(!integer(session)||session!=double(s.session)||!integer(slot,true)||slot>=s.routeSlots.size()||
     !integer(generation)||generation>double(UINT32_MAX))return nullptr;
  auto& route=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(route.actor);
  return found!=s.activeIntents.end()&&found->second.state==PlanningState::WaitingBlocked&&found->second.slot==uint32_t(slot)&&
    found->second.generation==uint32_t(generation)&&intentHasSuspendedRoute(s,found->second)?&route:nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_suspended_route(double actor){
  auto& s=state();s.suspendedRouteResult.fill(0);if(!integer(actor))return 0;
  const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
  const auto& intent=found->second;if(!intentHasSuspendedRoute(s,intent))return 0;
  const auto& route=s.routeSlots[intent.slot];const auto& pose=route.executionPose;
  auto& out=s.suspendedRouteResult;
  out[0]=actor;out[1]=s.session;out[2]=intent.slot;out[3]=intent.generation;out[4]=route.suspendedAt;
  out[5]=double(route.points.size()/2-size_t(pose[5]));out[6]=double(route.reservationBody);out[7]=route.motionFlags;out[8]=route.radius;
  std::copy(pose.begin(),pose.end(),out.begin()+9);out[9+7]=route.suspendedAt;out[9+15]=out[9+16]=0;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_suspended_route_ptr(){return state().suspendedRouteResult.data();}
EMSCRIPTEN_KEEPALIVE const float* nav_gate_suspended_points_ptr(double session,double slot,double generation){
  const auto route=suspendedGateRoute(session,slot,generation);
  return route?route->points.data()+size_t(route->executionPose[5])*2:nullptr;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_motion_offset_ptr(double session,double slot,double generation){
  return nav_intent_route_points(session,slot,generation)>=0?state().routeSlots[size_t(slot)].motionOffset.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_resumable(double session,double slot,double generation){
  return nav_intent_route_points(session,slot,generation)<0?-1:state().routeSlots[size_t(slot)].resumable?1:0;
}
EMSCRIPTEN_KEEPALIVE double nav_gate_route_suspensions(){return double(state().routeSuspensions);}
EMSCRIPTEN_KEEPALIVE double nav_gate_route_resumptions(){return double(state().routeResumptions);}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_route(double session,double slot,double generation){
  auto& s=state();s.timingRejection=0;s.reservationResult.fill(0);s.gateSweepResult.fill(0);s.gateStaticResult.fill(0);
  const auto old=suspendedGateRoute(session,slot,generation);if(!old)return -1;
  if(!gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  const auto found=s.activeIntents.find(old->actor);const auto worker=s.workers.find(old->actor);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||worker->second.body!=old->reservationBody||
     !(body.flags&1)||body.r!=old->radius||body.x!=old->executionPose[0]||body.z!=old->executionPose[1]||
     bool(body.flags&2)!=bool(old->motionFlags&32)||s.reservedBodies.count(old->reservationBody))return -3;
  const int previous=lazy_selected_context();if(previous!=old->profile)spatial_select_nav_profile_index(old->profile);
  RouteSlot candidate;candidate.points.assign(old->points.begin()+size_t(old->executionPose[5])*2,old->points.end());
  int result=prepareRouteTiming(candidate,old->actor,body.x,body.z,s.effectiveTime,old->radius,2,old->motionFlags,old->executionPose[14],true);
  const uint32_t topology=lazy_route_revision();if(previous!=old->profile)spatial_select_nav_profile_index(previous);
  recordTimingResult(s,result);if(result!=1)return -7;
  const auto& pose=old->executionPose;candidate.motionOffset={pose[2],pose[3],pose[9],pose[10],pose[11],pose[12],pose[13]};
  auto proposed=s.gates;std::vector<GateCrossingBoundary> boundaries;
  result=proveGateRouteAdmission(s,found->second,candidate,old->reservationBody,body,proposed,boundaries,false);
  if(result!=1)return result;
  const uint64_t bodyId=old->reservationBody;found->second.topology=topology;
  publishGateRouteAdmission(s,found->second,uint32_t(slot),candidate,bodyId,proposed,boundaries);s.routeResumptions++;
  nav_intent_route_timing(session,slot,double(s.routeSlots[size_t(slot)].generation));return 1;
}
