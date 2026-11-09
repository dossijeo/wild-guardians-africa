// Continuous body-clearance proof for a rotating authored polygon. This does
// not grant passage or yet replace gate/frame/leaf physical contacts in product.
double gateLeafSpeedBound(const NativeGate& gate){
  double radius=0;
  for(size_t i=0;i<gate.local.size();i+=2)
    radius=std::max(radius,std::hypot(gate.local[i]-gate.hx,gate.local[i+1]-gate.hz));
  return radius*std::max(gate.sx,gate.sz)*(pi/2)/nativeGateMoveSeconds*(1+1e-12);
}
struct GateSweepAnswer {bool clear=true;int reason=0;double from=0,to=0;};
GateSweepAnswer gateSweepPair(IntentState& s,const NativeGate& gate,const ReservationPath& path,double radius,double begin,double end){
  s.gateSweepPairs++;
  if(!std::isfinite(radius)||radius<0||!std::isfinite(begin)||!std::isfinite(end)||end<begin)
    return {false,2,begin,end};
  const double bodySpeed=path.route?std::max(path.route->speed,path.route->runSpeed):0,
    speed=(gate.from==gate.target?0:gateLeafSpeedBound(gate))+bodySpeed;
  std::vector<double> times{begin,end};reservationKnots(path,begin,times);
  const double finish=gate.at+std::abs(gate.target-gate.from)*nativeGateMoveSeconds;
  if(finish>begin&&finish<end)times.push_back(finish);
  times.erase(std::remove_if(times.begin(),times.end(),[&](double at){return at<begin||at>end;}),times.end());
  std::sort(times.begin(),times.end());times.erase(std::unique(times.begin(),times.end()),times.end());
  uint64_t budget=32768;
  const auto gap=[&](double at){
    const auto point=reservationPosition(path,at);const auto leaf=gateLeaf(gate,gateOpening(gate,at));s.gateSweepEvaluations++;
    const double scale=std::max({1.0,std::abs(gate.x),std::abs(gate.z),std::abs(point.first),std::abs(point.second)}),
      // Covers trig arithmetic and the legacy 1e-9 endpoint snap in opening.
      error=1e-7+256*std::numeric_limits<double>::epsilon()*scale+gateLeafSpeedBound(gate)*nativeGateMoveSeconds*1e-9;
    return spatialNativePolygonDistance(leaf.data(),int(leaf.size()/2),point.first,point.second,point.first,point.second)-radius-error;
  };
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
bool gateSweepBodies(IntentState& s,const NativeGate& proposal){
  std::set<uint64_t> bodies;
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
    if(!path.route&&(std::abs(body.x-bounds.x)>bounds.circleRadius+body.r+1e-6||
       std::abs(body.z-bounds.z)>bounds.circleRadius+body.r+1e-6))continue;
    const auto answer=gateSweepPair(s,proposal,path,body.r,s.effectiveTime,
      proposal.at+std::abs(proposal.target-proposal.from)*nativeGateMoveSeconds);
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
    const double finish=std::max(s.effectiveTime,gate.at+std::abs(gate.target-gate.from)*nativeGateMoveSeconds);
    const auto answer=gateSweepPair(s,gate,{nullptr,body.x,body.z},body.r,s.effectiveTime,finish);
    if(!answer.clear){s.gateSweepRejected++;s.gateSweepResult={double(id),0,answer.from,answer.to,double(answer.reason),0};return false;}
  }
  return true;
}
