// Included in the existing intent authority namespace. Reservations reference
// its pinned RouteSlots and sector subscribers; there is no second planner,
// trajectory scheduler or body registry. Initial admission is deliberately
// conservative: current physical discs remain occupied as well as trajectories.
struct ReservationPath {
  const RouteSlot* route=nullptr;
  double x=0,z=0;
};
std::pair<double,double> reservationPosition(const ReservationPath& path,double at){
  if(!path.route)return {path.x,path.z};
  const auto pose=sampleRouteTiming(*path.route,at);return {pose[0],pose[1]};
}
void reservationKnots(const ReservationPath& path,double now,std::vector<double>& times){
  if(!path.route)return;
  const auto& route=*path.route;
  if(route.startTime>now)times.push_back(route.startTime);
  for(double distance:route.distances){
    const double at=routeTimeAtDistance(route,distance);
    if(at>now)times.push_back(at);
  }
  // A budget exhaustion can change speed in the middle of a geometric edge.
  const double change=routeTimeAtDistance(route,route.runDistance);
  if(route.runDistance>0&&change>now)times.push_back(change);
}
// Relative motion is affine on the union of both native timetables' knots.
// Solve minimum separation on each interval analytically, including the held
// destination for unbounded time. This is not time/distance sampling.
bool reservationConflict(const ReservationPath& a,const ReservationPath& b,
    double radius,double now,double& at){
  std::vector<double> times{now};reservationKnots(a,now,times);reservationKnots(b,now,times);
  std::sort(times.begin(),times.end());times.erase(std::unique(times.begin(),times.end()),times.end());
  auto pa=reservationPosition(a,now),pb=reservationPosition(b,now);
  for(size_t i=0;i<times.size();i++){
    const double x=pa.first-pb.first,z=pa.second-pb.second,
      scale=std::max({1.0,std::abs(pa.first),std::abs(pa.second),std::abs(pb.first),std::abs(pb.second)}),
      // Conservative rounding enclosure, including exact tangency. Overlap
      // escape is not an ordinary reservation: existing exceptional guards stay.
      required=radius+1e-7+64*std::numeric_limits<double>::epsilon()*scale;
    if(std::hypot(x,z)<=required){at=times[i];return true;}
    if(i+1==times.size())break;
    const auto qa=reservationPosition(a,times[i+1]),qb=reservationPosition(b,times[i+1]);
    const double dx=(qa.first-pa.first)-(qb.first-pb.first),
      dz=(qa.second-pa.second)-(qb.second-pb.second),length=std::hypot(dx,dz);
    if(length>0){
      const double ux=dx/length,uz=dz/length,projection=-(x*ux+z*uz),
        closest=std::clamp(projection,0.0,length),
        separation=std::hypot(x+ux*closest,z+uz*closest);
      if(separation<=required){
        const double perpendicular=std::hypot(x+ux*projection,z+uz*projection),
          inset=std::sqrt(std::max(0.0,(required-perpendicular)*(required+perpendicular))),
          entry=(projection-inset)/length,
          fraction=std::isfinite(entry)?std::clamp(entry,0.0,1.0):0;
        at=times[i]+(times[i+1]-times[i])*fraction;return true;
      }
    }
    pa=qa;pb=qb;
  }
  return false;
}
bool reservationParticipates(const SpatialBodyView& a,const SpatialBodyView& b){
  return (a.flags&1)&&(b.flags&1)&&
    (spatialBodiesParticipate(a,b)||spatialBodiesParticipate(b,a));
}
void reservationWitness(IntentState& s,int reason,uint64_t body,uint64_t actor,
    double at,uint32_t slot=0,uint32_t generation=0){
  auto& out=s.reservationResult;
  if(!out[0]||at<out[3]||at==out[3]&&
     std::make_pair(body,reason)<std::make_pair(uint64_t(out[1]),int(out[0])))
    out={double(reason),double(body),double(actor),at,double(slot),double(generation)};
}
std::set<uint64_t> reservationCandidates(const IntentState& s,const ActiveIntent& intent){
  std::set<uint64_t> actors;
  for(const auto& [x,z]:intent.routeSectors)for(int profile=0;profile<6;profile++){
    const auto found=s.routeSubscribers.find({profile,x,z});
    if(found!=s.routeSubscribers.end())actors.insert(found->second.begin(),found->second.end());
  }
  return actors;
}
std::set<uint64_t> reservationBodyCandidates(const IntentState& s,const SpatialBodyView& body){
  std::set<uint64_t> actors;if(s.reservedBodies.empty())return actors;
  const double size=lazy_sector_size(),
    minX=std::floor((body.x-body.r)/size),maxX=std::floor((body.x+body.r)/size),
    minZ=std::floor((body.z-body.r)/size),maxZ=std::floor((body.z+body.r)/size);
  if(size<=0||!std::isfinite(minX)||!std::isfinite(maxX)||!std::isfinite(minZ)||!std::isfinite(maxZ)||
     minX<std::numeric_limits<int>::min()||maxX>std::numeric_limits<int>::max()||
     minZ<std::numeric_limits<int>::min()||maxZ>std::numeric_limits<int>::max()||
     (maxX-minX+1)*(maxZ-minZ+1)>4096){
    // Huge exceptional bodies cannot overflow a cell range or hide a route.
    for(const auto& [id,slot]:s.reservedBodies)actors.insert(s.routeSlots[slot].actor);
    return actors;
  }
  for(int64_t x=int64_t(minX);x<=int64_t(maxX);x++)
    for(int64_t z=int64_t(minZ);z<=int64_t(maxZ);z++)for(int profile=0;profile<6;profile++){
      const auto found=s.routeSubscribers.find({profile,int(x),int(z)});
      if(found!=s.routeSubscribers.end())actors.insert(found->second.begin(),found->second.end());
    }
  return actors;
}
bool reserveRouteClear(IntentState& s,const ActiveIntent& intent,const RouteSlot& route,
    uint64_t body,const SpatialBodyView& physical){
  const ReservationPath path{&route};
  for(uint64_t actor:reservationCandidates(s,intent)){
    if(actor==route.actor)continue;
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& other=s.routeSlots[found->second.slot];
    if(!other.reserved)continue;
    SpatialBodyView b;
    if(!spatialReadBody(other.reservationBody,b)||!reservationParticipates(physical,b))continue;
    s.reservationPairs++;double at;
    if(reservationConflict(path,{&other},route.radius+other.radius,s.effectiveTime,at))
      reservationWitness(s,2,other.reservationBody,other.actor,at,found->second.slot,other.generation);
  }
  double minX=route.originX,maxX=route.originX,minZ=route.originZ,maxZ=route.originZ;
  for(size_t i=0;i<route.points.size();i+=2){
    minX=std::min(minX,double(route.points[i]));maxX=std::max(maxX,double(route.points[i]));
    minZ=std::min(minZ,double(route.points[i+1]));maxZ=std::max(maxZ,double(route.points[i+1]));
  }
  struct Query {IntentState& s;const RouteSlot& route;uint64_t body;const SpatialBodyView& physical;};
  Query query{s,route,body,physical};
  spatialVisitBodiesBox(minX-route.radius,minZ-route.radius,maxX+route.radius,maxZ+route.radius,
    [](uint64_t id,const SpatialBodyView& b,void* context){
      auto& q=*static_cast<Query*>(context);
      if(id==q.body||!reservationParticipates(q.physical,b))return;
      q.s.reservationBodyChecks++;double at;
      if(reservationConflict({&q.route},{nullptr,b.x,b.z},q.route.radius+b.r,q.s.effectiveTime,at))
        reservationWitness(q.s,1,id,0,at);
    },&query);
  return !s.reservationResult[0];
}
bool reservationBodyCanChange(IntentState& s,uint64_t id,const SpatialBodyView& proposed){
  if(s.reservedBodies.empty())return true;
  SpatialBodyView before;
  if(spatialReadBody(id,before)&&before.x==proposed.x&&before.z==proposed.z&&
     before.r==proposed.r&&before.kind==proposed.kind&&before.flags==proposed.flags)return true;
  s.reservationResult.fill(0);
  const auto own=s.reservedBodies.find(id);
  if(own!=s.reservedBodies.end()){
    const auto& route=s.routeSlots[own->second];
    reservationWitness(s,3,id,route.actor,s.effectiveTime,own->second,route.generation);
    return false; // No silent detour, speed, radius or participation change.
  }
  for(uint64_t actor:reservationBodyCandidates(s,proposed)){
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& route=s.routeSlots[found->second.slot];if(!route.reserved)continue;
    s.reservationMutationCandidates++;SpatialBodyView physical;
    if(!spatialReadBody(route.reservationBody,physical)||!reservationParticipates(physical,proposed))continue;
    double at;
    if(reservationConflict({&route},{nullptr,proposed.x,proposed.z},
        route.radius+proposed.r,s.effectiveTime,at))
      reservationWitness(s,1,id,actor,at,found->second.slot,route.generation);
  }
  return !s.reservationResult[0];
}
void reservationBodyRemoving(IntentState& s,uint64_t id){
  const auto found=s.reservedBodies.find(id);if(found==s.reservedBodies.end())return;
  const auto actor=s.routeSlots[found->second].actor;
  releaseIntent(s,actor,PlanningState::Cancelled);s.activeIntents.erase(actor);
}
