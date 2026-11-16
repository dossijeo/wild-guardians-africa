// Original private xorshift32 stream. Like idle.js, return the NEW state;
// Unity.Mathematics uses the same shifts but a different output convention.
static double idleCycleRandom(uint32_t& rng){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return double(rng)/4294967296.;}
static bool nativeIdleCycleCurrent(const IntentState& s,const ActiveIntent& intent){
 return intent.idleCycle&&intent.idleCycle->binding&&intent.state==PlanningState::StationaryActive&&
  !intent.task&&!intent.target&&!intent.home&&intent.idleCycle->binding->body==intent.initialIdleBodyBinding&&
  nativeInitialIdleBodyCurrent(s,intent);
}
static double nativeIdleCycleEnd(const NativeIdleCycle& cycle){const auto& h=cycle.binding->actual.header;return h[5]+h[23];}
// Preserve idle.js's explicit remaining>1e-9 boundary, including accumulated
// .1-step rounding. This is a semantic deadline, not a new simulation clock.
static bool nativeIdleCycleFinished(const NativeIdleCycle& cycle,double at){return nativeIdleCycleEnd(cycle)-at<=1e-9;}
// mode, elapsed, remaining, RNG, approachRetry. An upper-bound phase selection
// makes a prepared rest->watch transition right-continuous at its native knot.
static std::array<double,6> sampleNativeIdleCycle(const NativeIdleCycle& cycle,double at){
 const auto& h=cycle.binding->actual.header;const double age=nativeIdleCycleFinished(cycle,at)?h[23]:std::clamp(at-h[5],0.,h[23]);
 const bool watch=h[16]==2||(h[5]+h[21])-at<=1e-9;const double local=watch?std::max(0.,age-h[21]):age;
 const double elapsed=(watch?(h[16]==2?h[17]:0):h[17])+local;
 return {watch?2.:1.,elapsed,std::max(0.,(watch?h[23]-h[21]:h[18])-local),watch?h[22]:h[19],std::max(0.,h[20]-age),age};
}
static bool idleCycleAnchorCurrent(const IntentState& s,const std::array<double,24>& h){
 const auto found=s.targets.find(uint64_t(h[10]));if(found==s.targets.end())return false;const auto& a=found->second;
 return h[9]==1?(a.kind==1||a.kind==2)&&a.active&&a.x==h[11]&&a.z==h[12]:h[9]==2&&a.kind==4&&a.active&&a.status==0;
}
static NativeIdleCycleDecision chooseNativeIdleCycleNext(const IntentState& s,const NativeIdleCycle& cycle){
 NativeIdleCycleDecision next;const auto& h=cycle.binding->actual.header;const auto& q=*cycle.binding->body->source;
 if(!idleCycleAnchorCurrent(s,h)){next.status=-2;return next;}
 auto state=sampleNativeIdleCycle(cycle,nativeIdleCycleEnd(cycle));uint32_t rng=uint32_t(state[3]);
 if(idleCycleRandom(rng)<1./3.&&std::hypot(q.x-h[11],q.z-h[12])<=h[13]){
  const int previous=lazy_selected_context();if(previous!=int(h[7]))spatial_select_nav_profile_index(int(h[7]));
  for(int attempt=0;attempt<12;attempt++){
   const double angle=idleCycleRandom(rng)*(std::acos(-1.)*2),radius=std::min(2.,h[13])+idleCycleRandom(rng)*std::max(0.,h[13]-2.);
   const double x=h[11]+std::sin(angle)*radius,z=h[12]+std::cos(angle)*radius;
   const int count=spatial_world_route_cached(float(q.x),float(q.z),float(x),float(z));
   // Unknown terrain cannot consume the cosmetic stream or become a route.
   // The existing world/event owner may explicitly resolve this request later.
   if(count<0){if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);next.status=-6;return next;}
   if(count==0)continue;const float* points=spatial_world_route_ptr();bool local=true;
   for(int i=0;i<count;i++)if(std::hypot(double(points[i*2])-h[11],double(points[i*2+1])-h[12])>h[13]){local=false;break;}
   if(!local||std::hypot(q.x-x,q.z-z)<.75)continue;
   next.points.assign(points,points+size_t(count)*2);next.x=x;next.z=z;next.topology=lazy_route_revision();next.state={3,0,state[2],double(rng),state[4],0};next.status=1;
   if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);return next;
  }
  if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);
 }
 next.state={1,0,h[14]*(2+std::floor(idleCycleRandom(rng)*3)),double(rng),state[4],0};next.status=1;return next;
}
static void publishNativeIdleCycleDecision(IntentState& s,ActiveIntent& intent,NativeIdleCycleDecision next){
 if(next.status==1){next.requestedAt=s.effectiveTime;next.sequence=emitIntentChange(s,intent);}
 intent.idleCycle->next=std::move(next);
}
