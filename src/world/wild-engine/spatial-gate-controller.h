constexpr double nativeGateMoveSeconds=.6;
double gateMotionEnd(const NativeGate& gate){return gate.at+std::abs(gate.target-gate.from)*nativeGateMoveSeconds;}
bool gateHasMotion(const NativeGate& gate){return gate.from!=gate.target||gate.precedingMotor&&gate.precedingFrom!=gate.precedingTarget;}
bool gateMotionPending(const NativeGate& gate,double now){
  return gate.from!=gate.target&&gateMotionEnd(gate)>now||
    gate.precedingMotor&&gate.precedingFrom!=gate.precedingTarget&&gate.precedingAt<gate.at&&
      std::min(gate.at,gate.precedingAt+std::abs(gate.precedingTarget-gate.precedingFrom)*nativeGateMoveSeconds)>now;
}
std::vector<double> gateMotionKnots(const NativeGate& gate){
  std::vector<double> times{gate.at,gateMotionEnd(gate)};
  if(gate.precedingMotor){times.push_back(gate.precedingAt);
    times.push_back(std::min(gate.at,gate.precedingAt+std::abs(gate.precedingTarget-gate.precedingFrom)*nativeGateMoveSeconds));}
  return times;
}
double gateMotorOpening(double from,double target,double at,double now){
  const double amount=std::max(0.0,now-at)/nativeGateMoveSeconds;
  const double value=target>=from?std::min(target,from+amount):std::max(target,from-amount);
  return value>1-1e-9?1:value<1e-9?0:value;
}
double gateOpening(const NativeGate& gate,double now){
  return gate.precedingMotor&&now<gate.at?
    gateMotorOpening(gate.precedingFrom,gate.precedingTarget,gate.precedingAt,now):
    gateMotorOpening(gate.from,gate.target,gate.at,now);
}
std::vector<double> gateLeaf(const NativeGate& gate,double opening){
  const double angle=std::clamp(opening,0.0,1.0)*pi/2,co=std::cos(angle),si=std::sin(angle),c=std::cos(gate.yaw),s=std::sin(gate.yaw);
  std::vector<double> out;out.reserve(gate.local.size());
  for(size_t i=0;i<gate.local.size();i+=2){
    const double x=gate.hx+(gate.local[i]-gate.hx)*co-(gate.local[i+1]-gate.hz)*si,
      z=gate.hz+(gate.local[i]-gate.hx)*si+(gate.local[i+1]-gate.hz)*co;
    out.insert(out.end(),{gate.x+x*gate.sx*c+z*gate.sz*s,gate.z-x*gate.sx*s+z*gate.sz*c});
  }
  return out;
}
void prepareGateGeometry(NativeGate& gate){
  gate.closed=gateLeaf(gate,0);double radius=0;
  for(size_t i=0;i<gate.local.size();i+=2)radius=std::max(radius,std::hypot(gate.local[i]-gate.hx,gate.local[i+1]-gate.hz));
  radius/=std::cos(pi/24);const double c=std::cos(gate.yaw),s=std::sin(gate.yaw);
  const double hx=gate.x+gate.hx*gate.sx*c+gate.hz*gate.sz*s,hz=gate.z-gate.hx*gate.sx*s+gate.hz*gate.sz*c;
  gate.trigger=3.2;gate.unsupported.x=hx;gate.unsupported.z=hz;gate.unsupported.circleRadius=0;
  for(int i=0;i<24;i++){
    const double a=i*pi/12,x=(gate.hx+std::cos(a)*radius)*gate.sx,z=(gate.hz+std::sin(a)*radius)*gate.sz,
      wx=gate.x+x*c+z*s,wz=gate.z-x*s+z*c;
    gate.swing.insert(gate.swing.end(),{wx,wz});gate.trigger=std::max(gate.trigger,std::hypot(wx-gate.x,wz-gate.z)+1.2);
    gate.unsupported.circleRadius=std::max(gate.unsupported.circleRadius,std::hypot(wx-hx,wz-hz));
  }
  auto& b=gate.unsupported;b.minX=hx-b.circleRadius;b.maxX=hx+b.circleRadius;b.minZ=hz-b.circleRadius;b.maxZ=hz+b.circleRadius;
}
bool gateBody(const Worker& worker,SpatialBodyView& body){return worker.bodyBound&&spatialReadBody(worker.body,body)&&body.kind==0;}
bool gateRoutePrefixHits(IntentState& s,const RouteSlot& route,double x,double z,uint32_t cursor,
    double radius,const std::vector<double>& polygon,double ahead){
  double left=ahead;
  for(size_t i=size_t(cursor)*2;i<route.points.size();i+=2){
    const double px=route.points[i],pz=route.points[i+1],length=std::hypot(px-x,pz-z),fraction=length?std::min(1.0,left/length):1,
      nx=x+(px-x)*fraction,nz=z+(pz-z)*fraction;s.gatePrefixSegments++;
    if(spatialNativePolygonDistance(polygon.data(),int(polygon.size()/2),x,z,nx,nz)<radius)return true;
    left-=length;if(left<=0)break;x=px;z=pz;
  }
  return false;
}
bool gateRouteHits(IntentState& s,const Worker& worker,const SpatialBodyView& body,const std::vector<double>& polygon,double ahead){
  const auto found=s.activeIntents.find(worker.id);
  if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)return false;
  const auto& intent=found->second;
  return gateRoutePrefixHits(s,s.routeSlots[intent.slot],body.x,body.z,intent.routeCursor,body.r,polygon,ahead);
}
struct GateFacts {bool requested=false,occupied=false,complete=true;};
GateFacts gateFacts(IntentState& s,const NativeGate& gate){
  GateFacts out;
  struct Nearby {IntentState& s;const NativeGate& gate;GateFacts& facts;};Nearby nearby{s,gate,out};
  spatialVisitBodiesBox(gate.x-gate.trigger,gate.z-gate.trigger,gate.x+gate.trigger,gate.z+gate.trigger,
    [](uint64_t id,const SpatialBodyView& body,void* context){auto& q=*static_cast<Nearby*>(context);
      if(body.kind!=0||!(body.flags&1)||std::hypot(body.x-q.gate.x,body.z-q.gate.z)>q.gate.trigger)return;
      const auto binding=q.s.gateBodyActors.find(id);
      if(binding==q.s.gateBodyActors.end()){q.facts.complete=false;return;}
      const auto worker=q.s.workers.find(binding->second);
      if(worker==q.s.workers.end()||!worker->second.bodyBound||worker->second.body!=id)q.facts.complete=false;
    },&nearby);
  for(const auto& [id,worker]:s.workers){SpatialBodyView body;
    if(!gateBody(worker,body)){if(std::hypot(worker.x-gate.x,worker.z-gate.z)<=gate.trigger)out.complete=false;continue;}
    if(!(body.flags&1)||std::hypot(body.x-gate.x,body.z-gate.z)>gate.trigger)continue;
    s.gateWorkerChecks++;
    out.occupied|=spatialNativePolygonDistance(gate.swing.data(),24,body.x,body.z,body.x,body.z)<body.r;
    out.requested|=gateRouteHits(s,worker,body,gate.closed,gate.trigger+1);
  }
  return out;
}
void acknowledgeGateSupport(IntentState& s,const std::array<uint64_t,3>& before){
  spatialGateSupportChanged();const auto after=executionWorldStamp();
  if(s.gateStaticProofs&&s.gateStaticWorldStamp==before&&after[0]==before[0]&&after[1]==before[1]&&after[2]==before[2]+1)
    s.gateStaticWorldStamp=after;
  if(s.executionEnabled&&s.executionWorldStamp==before&&after[0]==before[0]&&after[1]==before[1]&&after[2]==before[2]+1)
    s.executionWorldStamp=after;
}
