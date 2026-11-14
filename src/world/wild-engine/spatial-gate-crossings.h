// Admission at an intent event. The route stays in its existing slot and each
// gate stores only references/intervals into that slot. No per-tick gate planner.
struct GateCrossingBoundary {uint64_t gate;double distance,last;};
bool gateRouteBindingsCoherent(const IntentState& s,const RouteSlot& route,uint32_t slot){
  if(route.gateReservations.empty())return false;
  for(uint64_t id:route.gateReservations){const auto found=s.gates.find(id);
    if(found==s.gates.end()||!found->second.mesh||found->second.status!=0)return false;
    const auto lease=found->second.crossings.find(route.actor);
    if(lease==found->second.crossings.end()||lease->second.body!=route.reservationBody||
       lease->second.slot!=slot||lease->second.generation!=route.generation||found->second.target!=1)return false;
  }
  return true;
}
int compileGateCrossings(IntentState& s,RouteSlot& candidate,std::map<uint64_t,NativeGate>& proposed,
    std::vector<GateCrossingBoundary>& boundaries,bool requireGate=true){
  for(const auto& [id,gate]:proposed){
    if(gate.status==2)continue;
    bool relevant=false;double x=candidate.originX,z=candidate.originZ,before=0,last=0;
    for(size_t i=0;i<candidate.points.size();i+=2){
      const double nx=candidate.points[i],nz=candidate.points[i+1],span=candidate.distances[i/2]-before;double range[2];
      const auto& b=gate.unsupported;
      const int hit=spatialNativeGateCircleRange(x,z,nx,nz,b.x,b.z,b.circleRadius+candidate.radius+.001,range);
      if(hit<0)return -2;
      if(hit){relevant=true;last=std::max(last,before+span*range[1]);}
      before=candidate.distances[i/2];x=nx;z=nz;
    }
    if(!relevant)continue;
    if(!gate.mesh||!gate.defined||gate.status!=0||!gate.staticSweepCertified||gate.crossings.size()>=4096)return -2;
    std::vector<GateRouteRange> nearby,closed,swing;
    if(gateRouteRanges(s,gate,candidate,nearby,closed,swing)!=1)return -2;
    const double ahead=std::max(4.0,gate.trigger+1),crossing=gateFirstActivation(s,candidate,nearby,closed,gate.closed,ahead),
      swept=gateFirstActivation(s,candidate,nearby,swing,gate.swing,ahead);
    if(crossing<0&&swept<0)return -2;
    const double distance=crossing<0?swept:swept<0?crossing:std::min(crossing,swept);
    last=std::max(last,distance);
    boundaries.push_back({id,distance,last});
  }
  if(requireGate&&boundaries.empty()||boundaries.size()>4096)return -2;
  std::sort(boundaries.begin(),boundaries.end(),[](const auto& a,const auto& b){
    return a.distance!=b.distance?a.distance<b.distance:a.gate<b.gate;
  });
  for(const auto& boundary:boundaries){auto& gate=proposed.at(boundary.gate);
    // Existing opening promises are immutable. Keep an already-authorized close
    // until activation ETA, then reverse continuously at its predicted pose.
    if(gate.crossings.empty()&&gate.target!=1){
      const double activation=!candidate.holds.empty()&&candidate.holds.back().distance==boundary.distance?
        candidate.holds.back().from:routeTimeAtDistance(candidate,boundary.distance);
      const double at=std::max(s.effectiveTime,activation),opening=gateOpening(gate,at),current=gateOpening(gate,s.effectiveTime);
      gate.precedingMotor=at>s.effectiveTime&&current!=gate.target;
      gate.precedingFrom=gate.from;gate.precedingTarget=gate.target;gate.precedingAt=gate.at;
      gate.from=opening;gate.target=1;gate.at=at;
    }
    if(gate.target!=1)return -2;
    if(appendRouteGateHold(candidate,boundary.gate,boundary.distance,gateMotionEnd(gate))<0)return -2;
    gate.requested=true;candidate.gateReservations.push_back(boundary.gate);
  }
  return routeTimingRepresentable(candidate);
}
int gateCrossingFixedClear(const NativeGate& gate,const RouteSlot& route,const SpatialBodyView& physical){
  // Restrict the terrain/body-height query to this gate's native dependency
  // region; distant route edges need not fit a gate-sized terrain query.
  const auto& b=gate.unsupported;double x=route.originX,z=route.originZ;
  for(size_t i=0;i<route.points.size();i+=2){const double nx=route.points[i],nz=route.points[i+1];double range[2];
    const int hit=spatialNativeGateCircleRange(x,z,nx,nz,b.x,b.z,b.circleRadius+route.radius+.001,range);
    if(hit<0)return -2;
    if(hit){int mask;const int clear=gateMechanismSegment(gate,physical,x+(nx-x)*range[0],z+(nz-z)*range[0],
        x+(nx-x)*range[1],z+(nz-z)*range[1],mask,7);
      if(clear!=1)return clear;
    }
    x=nx;z=nz;
  }
  return 1;
}
int proveGateRouteAdmission(IntentState& s,const ActiveIntent& intent,RouteSlot& candidate,
    uint64_t bodyId,const SpatialBodyView& body,std::map<uint64_t,NativeGate>& proposed,
    std::vector<GateCrossingBoundary>& boundaries,bool requireGate=true){
  int result=compileGateCrossings(s,candidate,proposed,boundaries,requireGate);
  if(result==1)for(uint64_t id:candidate.gateReservations){
    result=gateCrossingFixedClear(proposed.at(id),candidate,body);if(result!=1)break;
    if(!gateSweepBodies(s,proposed.at(id),&candidate,bodyId)){result=0;break;}
  }
  recordTimingResult(s,result);if(result!=1)return -7;
  s.reservationChecks++;
  if(!reserveRouteClear(s,intent,candidate,bodyId,body,!requireGate))return 0;
  const int objects=gateSweepStaticObjects(s,proposed,true);return objects==1?1:objects;
}
void publishGateRouteAdmission(IntentState& s,ActiveIntent& intent,uint32_t slot,RouteSlot& candidate,
    uint64_t bodyId,std::map<uint64_t,NativeGate>& proposed,const std::vector<GateCrossingBoundary>& boundaries){
  auto& old=s.routeSlots[slot];
  candidate.active=true;candidate.generation=old.generation+2;
  if(!candidate.generation)candidate.generation=1;
  candidate.gateCandidate=false;candidate.gateAdmitted=!boundaries.empty();candidate.resumable=true;
  candidate.reserved=true;candidate.reservationBody=bodyId;
  for(const auto& boundary:boundaries){auto& gate=proposed.at(boundary.gate);
    gate.bodySweepCertified=gate.staticSweepCertified=true;
    gate.crossings.emplace(candidate.actor,GateCrossingReservation{bodyId,slot,candidate.generation,
      routeTimeAtDistance(candidate,boundary.distance),routeTimeAtDistance(candidate,boundary.last)});
  }
  releaseRoute(s,intent);old=std::move(candidate);
  s.reservedBodies.emplace(bodyId,slot);s.residencyPinRevision++;
  intent.slot=slot;intent.generation=old.generation;intent.state=PlanningState::RouteActive;
  intent.routeStartX=float(old.originX);intent.routeStartZ=float(old.originZ);intent.routeCursor=0;
  intent.timingMode=2;intent.timingRadius=old.radius;intent.motionFlags=old.motionFlags;intent.runBudget=old.runBudget;
  cancelGateMotionProposal(s);publishGateMotion(s,proposed);
  if(s.executionEnabled){s.executionEvaluations++;projectExecutedPose(s,old,sampleRouteTiming(old,s.effectiveTime));}
  emitIntentChange(s,intent);
}
void releaseGateCrossings(IntentState& s,const RouteSlot& route){
  if(route.gateReservations.empty())return;
  cancelGateMotionProposal(s);
  for(uint64_t id:route.gateReservations){const auto found=s.gates.find(id);if(found==s.gates.end())continue;
    auto& gate=found->second;const auto lease=gate.crossings.find(route.actor);
    if(lease==gate.crossings.end()||lease->second.generation!=route.generation)continue;
    gate.crossings.erase(lease);
    const double current=gateOpening(gate,s.effectiveTime);
    // A stopped body must not inherit the motor proof for its former moving
    // trajectory. Freezing is a subset of the certified motion and cannot sweep
    // over it. Revoke other promises affected by this clock change iteratively.
    if(current!=gate.target||gateMotionPending(gate,s.effectiveTime)){
      gate.from=gate.target=current;gate.at=s.effectiveTime;gate.precedingMotor=false;
      for(const auto& [actor,crossing]:gate.crossings)s.stoppedGateRouteActors.insert(actor);
    }
  }
  s.residencyPinRevision++;
}
