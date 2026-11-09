// Continuous body-clearance proof for a rotating authored polygon. This does
// not grant passage or yet replace gate/frame/leaf physical contacts in product.
double gateLeafSpeedBound(const NativeGate& gate){
  double radius=0;
  for(size_t i=0;i<gate.local.size();i+=2)
    radius=std::max(radius,std::hypot(gate.local[i]-gate.hx,gate.local[i+1]-gate.hz));
  return std::max(radius,gate.physicalRadius)*std::max(gate.sx,gate.sz)*(pi/2)/nativeGateMoveSeconds*(1+1e-12);
}
struct GateSweepAnswer {bool clear=true;int reason=0;double from=0,to=0;};
// One interval proof kernel for bodies, canonical static objects and leaf pairs.
template<class Gap> GateSweepAnswer gateSweepIntervals(std::vector<double> times,
    double begin,double end,double speed,Gap gap){
  if(!std::isfinite(begin)||!std::isfinite(end)||end<begin||!std::isfinite(speed)||speed<0)
    return {false,2,begin,end};
  times.push_back(begin);times.push_back(end);
  times.erase(std::remove_if(times.begin(),times.end(),[&](double at){return at<begin||at>end;}),times.end());
  std::sort(times.begin(),times.end());times.erase(std::unique(times.begin(),times.end()),times.end());
  uint64_t budget=32768;
  struct Interval {double a,b;int depth;};std::vector<Interval> pending;
  for(double at:times){const double value=gap(at);
    if(!std::isfinite(value)||value<=0)return {false,std::isfinite(value)?1:2,at,at};}
  if(times.size()==1)return {};
  for(size_t i=times.size()-1;i>0;i--)pending.push_back({times[i-1],times[i],0});
  while(!pending.empty()){
    const auto interval=pending.back();pending.pop_back();const double mid=interval.a+(interval.b-interval.a)*.5;
    if(!budget--)return {false,2,interval.a,interval.b};
    const double value=gap(mid);
    if(!std::isfinite(value))return {false,2,interval.a,interval.b};
    if(value<=0)return {false,1,interval.a,interval.b};
    // Distance is Lipschitz under polygon Hausdorff displacement plus body
    // displacement. A midpoint and a proven speed bound cover the WHOLE interval.
    if(value>speed*(interval.b-interval.a)*.5)continue;
    if(interval.depth>=32||mid<=interval.a||mid>=interval.b||interval.b-interval.a<1e-9)
      return {false,2,interval.a,interval.b};
    pending.push_back({mid,interval.b,interval.depth+1});pending.push_back({interval.a,mid,interval.depth+1});
  }
  return {};
}
GateSweepAnswer gateSweepPair(IntentState& s,const NativeGate& gate,const ReservationPath& path,double radius,double begin,double end){
  s.gateSweepPairs++;
  if(!std::isfinite(radius)||radius<0)return {false,2,begin,end};
  const double bodySpeed=path.route?std::max(path.route->speed,path.route->runSpeed):0,
    speed=(gate.from==gate.target?0:gateLeafSpeedBound(gate))+bodySpeed;
  std::vector<double> times;reservationKnots(path,begin,times);
  const auto motor=gateMotionKnots(gate);times.insert(times.end(),motor.begin(),motor.end());
  return gateSweepIntervals(std::move(times),begin,end,speed,[&](double at){
    const auto point=reservationPosition(path,at);const auto leaf=gateCollisionLeaf(gate,at);s.gateSweepEvaluations++;
    const double scale=std::max({1.0,std::abs(gate.x),std::abs(gate.z),std::abs(point.first),std::abs(point.second)}),
      // Enclose arithmetic and snapping at both the sampled pose and any
      // interval pose, including the legacy 1e-9 opening endpoint snap.
      error=1e-7+256*std::numeric_limits<double>::epsilon()*scale+2*gateLeafSpeedBound(gate)*nativeGateMoveSeconds*1e-9;
    return spatialNativePolygonDistance(leaf.data(),int(leaf.size()/2),point.first,point.second,point.first,point.second)-radius-error;
  });
}
bool gateSweepBodies(IntentState& s,const NativeGate& proposal,const RouteSlot* replacement=nullptr,uint64_t replacementBody=0){
  std::set<uint64_t> bodies;
  if(replacement)bodies.insert(replacementBody);
  const auto& bounds=proposal.unsupported;
  spatialVisitBodiesBox(bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ,
    [](uint64_t id,const SpatialBodyView& body,void* opaque){if(body.flags&1)static_cast<std::set<uint64_t>*>(opaque)->insert(id);},&bodies);
  for(uint64_t actor:reservationBoxCandidates(s,bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ)){
    const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& route=s.routeSlots[found->second.slot];if(route.reserved)bodies.insert(route.reservationBody);
  }
  for(uint64_t id:bodies){SpatialBodyView body;if(!spatialReadBody(id,body)||!(body.flags&1))continue;
    ReservationPath path{nullptr,body.x,body.z};const auto found=s.reservedBodies.find(id);
    if(found!=s.reservedBodies.end())path.route=&s.routeSlots[found->second];
    if(replacement&&id==replacementBody)path.route=replacement;
    if(!path.route&&(std::abs(body.x-bounds.x)>bounds.circleRadius+body.r+1e-6||
       std::abs(body.z-bounds.z)>bounds.circleRadius+body.r+1e-6))continue;
    const double finish=std::max({s.effectiveTime,gateMotionEnd(proposal),
      path.route?routeTimeAtDistance(*path.route,path.route->distances.back()):s.effectiveTime});
    const auto answer=gateSweepPair(s,proposal,path,body.r,s.effectiveTime,finish);
    if(!answer.clear){s.gateSweepResult={double(proposal.id),double(id),answer.from,answer.to,double(answer.reason),0};return false;}
  }
  return true;
}
bool gateMotionBodyCanChange(IntentState& s,const SpatialBodyView& body){
  if(!(body.flags&1))return true;
  for(const auto& [id,gate]:s.gates){
    if(!gate.bodySweepCertified)continue;
    const auto& b=gate.unsupported;
    if(std::abs(body.x-b.x)>b.circleRadius+body.r+1e-6||std::abs(body.z-b.z)>b.circleRadius+body.r+1e-6)continue;
    const double finish=std::max(s.effectiveTime,gateMotionEnd(gate));
    const auto answer=gateSweepPair(s,gate,{nullptr,body.x,body.z},body.r,s.effectiveTime,finish);
    if(!answer.clear){s.gateSweepRejected++;s.gateSweepResult={double(id),0,answer.from,answer.to,double(answer.reason),0};return false;}
  }
  return true;
}
