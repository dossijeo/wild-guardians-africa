// Native kinematic execution on an explicitly admitted, fixed-world cohort.
// The route remains the only timetable, the body registry the physical owner.
// This is not yet gameplay consequence ownership or a graphical clock permit.
bool executionBindingCoherent(const IntentState& s,uint64_t body,uint32_t slot){
  if(slot>=s.routeSlots.size())return false;
  const auto& route=s.routeSlots[slot];const auto active=s.activeIntents.find(route.actor);
  return route.active&&route.reserved&&route.reservationBody==body&&route.timingMode&&
    active!=s.activeIntents.end()&&active->second.state==PlanningState::RouteActive&&
    active->second.slot==slot&&active->second.generation==route.generation&&
    (active->second.animal||s.workers.count(route.actor));
}
void projectExecutedPose(IntentState& s,RouteSlot& route,const std::array<double,18>& pose){
  SpatialBodyView before;spatialReadBody(route.reservationBody,before);
  spatialMoveBodyFromIntent(route.reservationBody,pose[0],pose[1]);
  if(before.x!=pose[0]||before.z!=pose[1])s.executionBodyUpdates++;
  route.executionPose=pose;route.hasExecution=true;
  auto& intent=s.activeIntents.at(route.actor);
  intent.routeStartX=float(pose[0]);intent.routeStartZ=float(pose[1]);
  intent.routeCursor=uint32_t(pose[5]);
  if(!intent.animal){
    auto& worker=s.workers.at(route.actor);worker.x=pose[0];worker.z=pose[1];
    intent.runBudget=pose[14];
  }
  // Keep full inverse spatial subscriptions until a structural event. Advancing
  // a cursor never rescans/reindexes the polyline on ordinary logical steps.
}
int beginRouteExecution(IntentState& s){
  if(s.executionEnabled)return s.executionWorldStamp==executionWorldStamp()?1:-4;
  if(s.reservedBodies.empty())return -2;
  for(const auto& [body,slot]:s.reservedBodies){
    if(!executionBindingCoherent(s,body,slot))return -3;
    const auto& route=s.routeSlots[slot];SpatialBodyView physical;
    if(route.staticProofStamp!=executionWorldStamp())return -4;
    if(route.startTime!=s.effectiveTime||!spatialReadBody(body,physical)||
       physical.x!=route.originX||physical.z!=route.originZ)return -3;
  }
  s.executionWorldStamp=executionWorldStamp();s.executionEnabled=true;
  for(const auto& [body,slot]:s.reservedBodies){
    auto& route=s.routeSlots[slot];s.executionEvaluations++;
    projectExecutedPose(s,route,sampleRouteTiming(route,s.effectiveTime));
  }
  s.entityRevision++;return 1;
}
int advanceRouteExecution(IntentState& s,double at){
  if(!std::isfinite(at)||at<s.effectiveTime)return -1;
  if(!s.executionEnabled)return -2;
  if(at==s.effectiveTime)return 0;
  // A mutation counter check once per cohort, never collision/validity queries
  // for each route. Until pre-mutation world transactions are connected, any
  // changed static world ends this immutable-world lease and fails closed.
  if(s.executionWorldStamp!=executionWorldStamp())return -4;
  struct Move {uint32_t slot;std::array<double,18> pose;};
  std::vector<Move> moves;moves.reserve(s.reservedBodies.size());
  for(const auto& [body,slot]:s.reservedBodies){
    if(!executionBindingCoherent(s,body,slot))return -3;
    const auto& route=s.routeSlots[slot];SpatialBodyView physical;
    if(!spatialReadBody(body,physical))return -3;
    if(route.hasExecution&&route.executionPose[6]==1){moves.push_back({slot,route.executionPose});continue;}
    moves.push_back({slot,sampleRouteTiming(route,at)});
  }
  // All metadata preflight/sampling precedes every physical write. Body moves
  // use a native-only entry point, not JS upserts or per-step contact checks.
  s.effectiveTime=at;s.executionAdvances++;
  const uint64_t updates=s.executionBodyUpdates;
  for(const auto& move:moves){
    auto& route=s.routeSlots[move.slot];
    if(!route.hasExecution||route.executionPose[6]!=1)s.executionEvaluations++;
    projectExecutedPose(s,route,move.pose);
  }
  if(updates!=s.executionBodyUpdates)s.entityRevision++;
  return int(moves.size());
}
