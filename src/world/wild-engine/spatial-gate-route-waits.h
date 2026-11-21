struct GateRouteRange {double from,to;};
struct GateWaitBoundary {double distance,until;uint64_t gate;};
double gateFirstActivation(IntentState& s,const RouteSlot& route,const std::vector<GateRouteRange>& nearby,
    const std::vector<GateRouteRange>& hits,const std::vector<double>& polygon,double ahead){
  size_t i=0,j=0;
  while(i<nearby.size()&&j<hits.size()){
    const double from=std::max({0.0,nearby[i].from,hits[j].from-ahead}),to=std::min(nearby[i].to,hits[j].to);
    if(from<to)return std::max(0.0,from-1e-8);
    if(from==to){
      // Exact point-only trigger contacts need the existing strict prefix
      // predicate: touching the inflated polygon alone is not a crossing.
      const auto pose=sampleRouteTiming(route,routeTimeAtDistance(route,from));
      if(gateRoutePrefixHits(s,route,pose[0],pose[1],uint32_t(pose[5]),route.radius,polygon,ahead))
        return std::max(0.0,from-1e-8);
    }
    if(nearby[i].to<hits[j].to)i++;else j++;
  }
  return -1;
}
int gateRouteRanges(IntentState& s,const NativeGate& gate,const RouteSlot& candidate,
    std::vector<GateRouteRange>& nearby,std::vector<GateRouteRange>& closed,std::vector<GateRouteRange>& swing){
  double x=candidate.originX,z=candidate.originZ,before=0;
  for(size_t i=0;i<candidate.distances.size();i++){
    const double nx=candidate.points[i*2],nz=candidate.points[i*2+1],span=candidate.distances[i]-before;double range[2];s.gateWaitSegments++;
    const int hit=spatialNativeGateCircleRange(x,z,nx,nz,gate.x,gate.z,gate.trigger,range);if(hit<0)return -2;
    if(hit)nearby.push_back({before+span*range[0],before+span*range[1]});
    before=candidate.distances[i];x=nx;z=nz;
  }
  if(nearby.empty())return 1;
  if(!spatialNativeConvexPolygon(gate.closed.data(),int(gate.closed.size()/2))||
     !spatialNativeConvexPolygon(gate.swing.data(),int(gate.swing.size()/2)))return -2;
  x=candidate.originX;z=candidate.originZ;before=0;
  for(size_t i=0;i<candidate.distances.size();i++){
    const double nx=candidate.points[i*2],nz=candidate.points[i*2+1],span=candidate.distances[i]-before;double range[2];s.gateWaitSegments++;
    int hit=spatialNativeGatePolygonRange(gate.closed.data(),int(gate.closed.size()/2),x,z,nx,nz,candidate.radius,range);if(hit<0)return -2;
    if(hit)closed.push_back({before+span*range[0],before+span*range[1]});
    hit=spatialNativeGatePolygonRange(gate.swing.data(),int(gate.swing.size()/2),x,z,nx,nz,candidate.radius,range);if(hit<0)return -2;
    if(hit)swing.push_back({before+span*range[0],before+span*range[1]});
    before=candidate.distances[i];x=nx;z=nz;
  }
  return 1;
}
int prepareGateRouteWaits(IntentState& s,RouteSlot& candidate){
  if(candidate.distances.empty()||candidate.distances.back()<=0)return -2;
  std::vector<GateWaitBoundary> boundaries;bool relevant=false;
  for(const auto& [id,gate]:s.gates){
    if(gate.status==2)continue;
    std::vector<GateRouteRange> nearby,closed,swing;
    if(gateRouteRanges(s,gate,candidate,nearby,closed,swing)!=1)return -2;
    const double ahead=std::max(4.0,gate.trigger+1),crossing=gateFirstActivation(s,candidate,nearby,closed,gate.closed,ahead),
      swept=gateFirstActivation(s,candidate,nearby,swing,gate.swing,ahead);
    if(crossing<0&&swept<0)continue;
    relevant=true;
    // A candidate cannot invent a future opening request or borrow an
    // uncertified/closing clock. Admission is a separate atomic native API.
    if(!gate.defined||!gate.bodySweepCertified||gate.status!=0||gate.target!=1)return -2;
    if(gateMotionEnd(gate)<=s.effectiveTime)continue;
    const double distance=crossing<0?swept:swept<0?crossing:std::min(crossing,swept);
    boundaries.push_back({distance,gateMotionEnd(gate),id});
  }
  if(!relevant)return -2;
  std::sort(boundaries.begin(),boundaries.end(),[](const auto& a,const auto& b){
    return a.distance!=b.distance?a.distance<b.distance:a.gate<b.gate;
  });
  for(const auto& boundary:boundaries)
    if(appendRouteGateHold(candidate,boundary.gate,boundary.distance,boundary.until)<0)return -2;
  return routeTimingRepresentable(candidate);
}
