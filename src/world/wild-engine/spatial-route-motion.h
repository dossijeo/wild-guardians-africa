// Same pinned route and geometry for every intention. No planner or scheduler.
// Worker constants preserve locomotion-calibration.js and moveWorker exactly;
// differential tests make calibration drift explicit during this migration.
constexpr double workerWalkSpeed=.72,workerRunSpeed=1.6,workerTravelMultiplier=1.5;
double routeMotionTimeAtDistance(const RouteSlot& route,double distance){
  const double running=std::min(distance,route.runDistance);
  return (running>0?running/route.runSpeed:0)+
    (distance-running)/route.speed;
}
double routeTimeAtDistance(const RouteSlot& route,double distance){
  const auto next=std::upper_bound(route.holds.begin(),route.holds.end(),distance,
    [](double at,const RouteHold& hold){return at<hold.distance;});
  return route.startTime+routeMotionTimeAtDistance(route,distance)+
    (next==route.holds.begin()?0:std::prev(next)->delay);
}
int routeTimingRepresentable(const RouteSlot& route){
  const double length=route.distances.empty()?0:route.distances.back(),end=routeTimeAtDistance(route,length);
  if(!std::isfinite(end)||length>0&&end<=route.startTime)return -3;
  const double quantum=std::nextafter(end,std::numeric_limits<double>::infinity())-end;
  if(length>0&&4*std::max(route.speed,route.runSpeed)*quantum>1e-8)return -2;
  if(route.runDistance>0&&route.runDistance<length){
    const double change=routeTimeAtDistance(route,route.runDistance);
    if(change<=route.departureTime||change>=end)return -2;
  }
  return 1;
}
int appendRouteGateHold(RouteSlot& route,uint64_t gate,double distance,double until){
  const double length=route.distances.empty()?0:route.distances.back();
  if(!gate||!std::isfinite(distance)||distance<0||distance>length||!std::isfinite(until)||
     !route.holds.empty()&&distance<route.holds.back().distance||route.holds.size()>=4096)return -2;
  const double from=routeTimeAtDistance(route,distance);if(until<=from)return 0;
  if(!route.holds.empty()&&distance==route.holds.back().distance){
    auto& hold=route.holds.back();const double before=hold.delay-(hold.until-hold.from);
    hold.until=until;hold.delay=before+(until-hold.from);hold.gate=gate;
  }else route.holds.push_back({distance,from,until,(route.holds.empty()?0:route.holds.back().delay)+(until-from),gate});
  if(route.holds.front().distance==0){route.departureTime=route.holds.front().until;route.waitGate=route.holds.front().gate;}
  return 1;
}
int prepareRouteTiming(RouteSlot& route,uint64_t actor,double x,double z,
    double time,double radius,int mode,int motionFlags=0,double runBudget=0,
    bool gateCandidate=false){
  if(mode==0)return 1;
  if((mode!=1&&mode!=2)||!std::isfinite(radius)||radius<=0||radius>2||
     motionFlags<0||motionFlags>63||!std::isfinite(runBudget)||runBudget<0||runBudget>1e9||
     mode==1&&(motionFlags||runBudget))return -3;
  if(spatial_execution_profile_kind()!=(mode==2?0:1))return -2;
  route.originX=x;route.originZ=z;route.startTime=time;
  route.departureTime=time;route.gateCandidate=gateCandidate;route.waitGate=0;route.holds.clear();
  route.speed=mode==2?workerWalkSpeed*workerTravelMultiplier:1.5;
  route.radius=radius;route.actor=actor;route.profile=lazy_selected_context();
  route.motionFlags=motionFlags;route.runBudget=runBudget;route.runDistance=0;route.runSpeed=0;
  route.distances.clear();route.distances.reserve(route.points.size()/2);
  double travelled=0;
  const auto clearSegment=[&](double ax,double az,double bx,double bz){
    return gateCandidate?spatialGateCandidateSegmentClear(ax,az,bx,bz,radius):
      spatial_execution_segment_clear(ax,az,bx,bz,radius);};
  if(route.points.empty()){
    const int clear=clearSegment(x,z,x,z);if(clear!=1)return clear;
  }
  for(size_t i=0;i<route.points.size();i+=2){
    const double nx=route.points[i],nz=route.points[i+1];
    const int clear=clearSegment(x,z,nx,nz);if(clear!=1)return clear;
    travelled+=std::hypot(nx-x,nz-z);route.distances.push_back(travelled);x=nx;z=nz;
  }
  if(mode==2){
    const bool urgent=motionFlags&1,flight=motionFlags&2,slow=motionFlags&4,
      carrying=motionFlags&8,recovering=motionFlags&16,incapacitated=motionFlags&32;
    if(!carrying&&(flight||urgent&&!recovering&&!incapacitated&&runBudget>0)){
      route.runDistance=flight?travelled:std::min(travelled,runBudget);
      route.runSpeed=workerRunSpeed*workerTravelMultiplier*(slow?.35:1);
    }
  }
  // Reservation interpolation uses rounded absolute clock knots. Keep their
  // spatial error strictly inside the solver's 1e-7 m rounding enclosure;
  // enormous clocks must fail closed instead of silently merging speed changes.
  const int representable=routeTimingRepresentable(route);if(representable!=1)return representable;
  route.staticProofStamp=executionWorldStamp();route.timingMode=mode;return 1;
}
std::array<double,18> sampleRouteTiming(const RouteSlot& route,double at){
  const auto nextHold=std::upper_bound(route.holds.begin(),route.holds.end(),at,
    [](double time,const RouteHold& hold){return time<hold.from;});
  const RouteHold* hold=nextHold!=route.holds.begin()?&*std::prev(nextHold):
    !route.holds.empty()&&route.holds.front().distance==0?&route.holds.front():nullptr;
  const bool waiting=hold&&at<hold->until;
  const double length=route.distances.empty()?0:route.distances.back(),
    endTime=routeTimeAtDistance(route,length),duration=endTime-route.startTime,
    elapsed=waiting?routeMotionTimeAtDistance(route,hold->distance):
      std::clamp(at-route.startTime-(hold?hold->delay:0),0.0,routeMotionTimeAtDistance(route,length)),
    runSeconds=route.runDistance>0?route.runDistance/route.runSpeed:0,
    runningDistance=std::min(route.runDistance,elapsed*route.runSpeed),
    distance=waiting?hold->distance:at>=endTime?length:
      std::min(length,runningDistance+std::max(0.0,elapsed-runSeconds)*route.speed),
    runDistance=std::min(route.runDistance,distance),walkDistance=distance-runDistance;
  const auto next=std::upper_bound(route.distances.begin(),route.distances.end(),distance);
  const size_t index=size_t(next-route.distances.begin());
  const bool geometricEnd=index==route.distances.size(),arrived=geometricEnd&&(route.holds.empty()||at>=endTime),worker=route.timingMode==2,
    carrying=route.motionFlags&8,running=runDistance<route.runDistance&&!arrived&&!waiting;
  double x=route.originX,z=route.originZ,yaw=0;
  if(!route.points.empty()){
    size_t segment=geometricEnd?route.distances.size()-1:index;
    while(segment>0&&route.distances[segment]==route.distances[segment-1])segment--;
    const double from=segment?route.distances[segment-1]:0,
      ax=segment?route.points[(segment-1)*2]:route.originX,
      az=segment?route.points[(segment-1)*2+1]:route.originZ,
      bx=route.points[segment*2],bz=route.points[segment*2+1],span=route.distances[segment]-from,
      fraction=span>0?std::clamp((distance-from)/span,0.0,1.0):1;
    x=ax+(bx-ax)*fraction;z=az+(bz-az)*fraction;
    if(span>0)yaw=std::atan2(bx-ax,bz-az);
    if(geometricEnd){x=route.points[route.points.size()-2];z=route.points.back();}
  }
  return {x,z,route.motionOffset[0]+distance,route.motionOffset[1]+routeMotionTimeAtDistance(route,distance),yaw,
    double(index),arrived?1.0:0.0,waiting?std::clamp(at,hold->from,hold->until):routeTimeAtDistance(route,distance),duration,
    route.motionOffset[2]+(worker?runDistance/(workerRunSpeed*workerTravelMultiplier):0),
    route.motionOffset[3]+(worker&&!carrying?walkDistance/workerWalkSpeed:0),
    route.motionOffset[4]+(worker&&carrying?walkDistance/workerWalkSpeed:0),
    route.motionOffset[5]+runDistance,route.motionOffset[6]+walkDistance,
    (route.motionFlags&2)?route.runBudget:std::max(0.0,route.runBudget-runDistance),
    running?1.0:0.0,geometricEnd||waiting?0:running?route.runSpeed:route.speed,double(route.timingMode)};
}
