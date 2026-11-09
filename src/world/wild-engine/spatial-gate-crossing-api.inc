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
  if(result==1)result=compileGateCrossings(s,candidate,proposed,boundaries);
  if(result==1)for(uint64_t id:candidate.gateReservations){
    result=gateCrossingFixedClear(proposed.at(id),candidate,body);if(result!=1)break;
    if(!gateSweepBodies(s,proposed.at(id),&candidate,uint64_t(bodyId))){result=0;break;}
  }
  recordTimingResult(s,result);if(result!=1)return -7;
  s.reservationChecks++;
  if(!reserveRouteClear(s,found->second,candidate,uint64_t(bodyId),body))return 0;
  const int objects=gateSweepStaticObjects(s,proposed,true);if(objects!=1)return objects;
  // Everything below is publication, after every geometry/traffic proof.
  candidate.active=true;candidate.generation=old.generation+2;
  if(!candidate.generation)candidate.generation=1;
  candidate.gateCandidate=false;candidate.gateAdmitted=true;
  candidate.reserved=true;candidate.reservationBody=uint64_t(bodyId);
  for(const auto& boundary:boundaries){auto& gate=proposed.at(boundary.gate);
    gate.bodySweepCertified=gate.staticSweepCertified=true;
    gate.crossings.emplace(candidate.actor,GateCrossingReservation{uint64_t(bodyId),uint32_t(slot),candidate.generation,
      routeTimeAtDistance(candidate,boundary.distance),routeTimeAtDistance(candidate,boundary.last)});
  }
  releaseRoute(s,found->second);old=std::move(candidate);
  s.reservedBodies.emplace(uint64_t(bodyId),uint32_t(slot));s.residencyPinRevision++;
  auto& intent=found->second;intent.slot=uint32_t(slot);intent.generation=old.generation;intent.topology=topology;
  intent.routeStartX=float(body.x);intent.routeStartZ=float(body.z);intent.routeCursor=0;
  intent.timingMode=2;intent.timingRadius=radius;intent.motionFlags=flags;intent.runBudget=runBudget;
  cancelGateMotionProposal(s);publishGateMotion(s,proposed);
  if(s.executionEnabled){s.executionEvaluations++;projectExecutedPose(s,old,sampleRouteTiming(old,s.effectiveTime));}
  emitIntentChange(s,intent);nav_intent_route_timing(session,slot,double(old.generation));return 1;
}
