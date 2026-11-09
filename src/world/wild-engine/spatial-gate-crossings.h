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
    std::vector<GateCrossingBoundary>& boundaries){
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
  if(boundaries.empty()||boundaries.size()>4096)return -2;
  std::sort(boundaries.begin(),boundaries.end(),[](const auto& a,const auto& b){
    return a.distance!=b.distance?a.distance<b.distance:a.gate<b.gate;
  });
  for(const auto& boundary:boundaries){auto& gate=proposed.at(boundary.gate);
    // Existing opening promises are immutable. A stationary closed/partial gate
    // can open at activation ETA. A closing motor needs a piecewise reversal;
    // do not silently replace its intervening motion with a frozen pose.
    if(gate.crossings.empty()&&gate.target!=1){
      const double current=gateOpening(gate,s.effectiveTime);if(current!=gate.target)return -2;
      gate.from=current;gate.target=1;
      const double activation=!candidate.holds.empty()&&candidate.holds.back().distance==boundary.distance?
        candidate.holds.back().from:routeTimeAtDistance(candidate,boundary.distance);
      gate.at=std::max(s.effectiveTime,activation);
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
    if(current!=gate.target){
      gate.from=gate.target=current;gate.at=s.effectiveTime;
      for(const auto& [actor,crossing]:gate.crossings)s.stoppedGateRouteActors.insert(actor);
    }
  }
  s.residencyPinRevision++;
}
