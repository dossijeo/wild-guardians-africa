// Original private xorshift32 stream. Like idle.js, return the NEW state;
// Unity.Mathematics uses the same shifts but a different output convention.
static double idleCycleRandom(uint32_t& rng){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return double(rng)/4294967296.;}
static std::array<double,26> idleCycleBodySourceData(const NativeIdleCycleBodySource& q){
 return {1,double(q.kind),double(q.actor),double(q.body),double(q.session),double(q.sequence),q.at,double(q.profile),double(q.workerProfile),double(q.center),double(q.bodyFlags),q.x,q.z,q.yaw,q.radius,q.runPhase,q.walkPhase,q.carryPhase,q.runRemaining,double(q.anchorKind),double(q.anchor),q.initial[0],q.initial[1],q.initial[2],q.initial[3],q.initial[4]};
}
static bool nativeIdleCycleBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.idleCycle||!intent.idleCycle->binding)return false;const auto& b=*intent.idleCycle->binding;const auto& q=b.source;
 if(b.body)return q.kind==20&&b.body==intent.initialIdleBodyBinding&&nativeInitialIdleBodyCurrent(s,intent);
 const bool pendingHome=intent.home&&intent.homeRequest&&!intent.task&&!intent.target&&!intent.generation&&intent.state==PlanningState::AwaitingResources&&intent.homeRequest->idleCycleSourceSequence==b.cycleSequence;
 const bool pendingTask=intent.task&&intent.target&&!intent.home&&!intent.homeRequest&&intent.generation&&intent.state==PlanningState::AwaitingResources&&intent.resourceRequestSequence>b.cycleSequence&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].active&&s.routeSlots[intent.slot].pendingResources&&!s.routeSlots[intent.slot].suspended&&s.routeSlots[intent.slot].actor==intent.actor&&s.routeSlots[intent.slot].generation==intent.generation&&s.routeSlots[intent.slot].originX==q.x&&s.routeSlots[intent.slot].originZ==q.z;
 const bool idle=!intent.home&&!intent.homeRequest&&!intent.task&&!intent.target&&!intent.generation&&intent.state==PlanningState::StationaryActive;
 if((q.kind!=1&&q.kind!=22&&q.kind!=23)||intent.initialIdleBodyBinding||intent.initialIdleRequest||intent.settlementBinding||intent.actionBinding||intent.restoredActionSource||intent.animal||intent.retreat||intent.delivery||(intent.lease&&!pendingTask)||!intent.requiresResources||(!idle&&!pendingHome&&!pendingTask))return false;
 const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(q.center);SpatialBodyView body;
 return q.actor==intent.actor&&q.session==s.session&&q.sequence&&q.body&&intent.profile==q.profile&&worker!=s.workers.end()&&worker->second.center==q.center&&worker->second.eligible==idle&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.bodyBound&&worker->second.body==q.body&&worker->second.x==q.x&&worker->second.z==q.z&&
  spatialReadBody(q.body,body)&&body.kind==0&&body.flags==q.bodyFlags&&body.x==q.x&&body.z==q.z&&body.r==q.radius&&!s.reservedBodies.count(q.body)&&!s.suspendedBodies.count(q.body)&&center!=s.targets.end()&&center->second.active&&center->second.kind==4&&center->second.status==0;
}
static bool nativeIdleCycleCurrent(const IntentState& s,const ActiveIntent& intent){
 return intent.state==PlanningState::StationaryActive&&!intent.task&&!intent.target&&!intent.home&&nativeIdleCycleBodyCurrent(s,intent);
}
static const NativeIdleStrollBinding* currentIdleStroll(double actor);
static std::optional<NativeIdleCycleBodySource> arrivedIdleStrollCycleSource(const IntentState&,const ActiveIntent&,uint64_t);
static bool idleStrollCycleReleaseClear(IntentState&,uint64_t);
static std::optional<NativeIdleCycleBodySource> failedIdleStrollCycleSource(const IntentState&,const ActiveIntent&,uint64_t);
static int idleStrollPathOutcome(int,float,float,float,float);
static bool idleCycleOutsideAnchor(const NativeIdleCycleBodySource& q,const std::array<double,24>& h){return std::hypot(q.x-h[11],q.z-h[12])>h[13];}
static double idleCycleFullDuration(const std::array<double,24>& h){return h[21]+(h[16]==1?h[15]*(1+std::floor(h[22]/4294967296.*2)):h[18]);}
static double nativeIdleCycleEnd(const NativeIdleCycle& cycle){const auto& h=cycle.binding->actual.header;return h[5]+h[23];}
// Preserve idle.js's explicit remaining>1e-9 boundary, including accumulated
// .1-step rounding. This is a semantic deadline, not a new simulation clock.
static bool nativeIdleCycleFinished(const NativeIdleCycle& cycle,double at){
 const auto& h=cycle.binding->actual.header;
 // idle.js uses remaining>1e-9 for phase ends, but approachRetry===0.
 // A retry-owned horizon cannot borrow the phase's early-finish tolerance.
 const bool retry=h[0]==2&&idleCycleOutsideAnchor(cycle.binding->source,h)&&h[20]<=idleCycleFullDuration(h);
 return nativeIdleCycleEnd(cycle)-at<=(retry?0.:1e-9);
}
// mode, elapsed, remaining, RNG, approachRetry. An upper-bound phase selection
// makes a prepared rest->watch transition right-continuous at its native knot.
static std::array<double,6> sampleNativeIdleCycle(const NativeIdleCycle& cycle,double at){
 const auto& h=cycle.binding->actual.header;const double age=nativeIdleCycleFinished(cycle,at)?h[23]:std::clamp(at-h[5],0.,h[23]);
 // A retry owns its deadline before a coincident REST->WATCH transition,
 // just as updateIdle attempts the approach before advancing the phase. Once
 // held at a retry horizon, later observations cannot cross the future knot.
 const bool retryRest=h[0]==2&&h[16]==1&&idleCycleOutsideAnchor(cycle.binding->source,h)&&h[20]<=h[23]&&h[23]<=h[21];
 const bool watch=h[16]==2||!retryRest&&(h[5]+h[21])-(h[5]+age)<=1e-9;const double local=watch?std::max(0.,age-h[21]):age;
 const double elapsed=(watch?(h[16]==2?h[17]:0):h[17])+local;
 return {watch?2.:1.,elapsed,std::max(0.,(watch?idleCycleFullDuration(h)-h[21]:h[18])-local),watch?h[22]:h[19],std::max(0.,h[20]-age),age};
}
static bool idleCycleAnchorCurrent(const IntentState& s,const std::array<double,24>& h){
 const auto found=s.targets.find(uint64_t(h[10]));if(found==s.targets.end())return false;const auto& a=found->second;
 return h[9]==1?(a.kind==1||a.kind==2)&&a.active&&a.x==h[11]&&a.z==h[12]:h[9]==2&&a.kind==4&&a.active&&a.status==0;
}
static NativeIdleCycleDecision chooseNativeIdleCycleNext(const IntentState& s,const NativeIdleCycle& cycle){
 NativeIdleCycleDecision next;const auto& h=cycle.binding->actual.header;const auto& q=cycle.binding->source;
 if(!idleCycleAnchorCurrent(s,h)){next.status=-2;return next;}
 auto phase=sampleNativeIdleCycle(cycle,nativeIdleCycleEnd(cycle));uint32_t rng=uint32_t(phase[3]);
 if(h[0]==2&&idleCycleOutsideAnchor(q,h)&&phase[4]==0){
  const int previous=lazy_selected_context();if(previous!=int(h[7]))spatial_select_nav_profile_index(int(h[7]));
  const int count=spatial_world_route_cached(float(q.x),float(q.z),float(h[11]),float(h[12]));
  int status=idleStrollPathOutcome(count,float(q.x),float(q.z),float(h[11]),float(h[12]));
  const auto* points=status==1?spatial_world_route_ptr():nullptr;
  if(status==1&&(!points||points[(count-1)*2]!=float(h[11])||points[(count-1)*2+1]!=float(h[12])))status=-7;
  if(status==1){next.points.assign(points,points+size_t(count)*2);next.topology=lazy_route_revision();}
  if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);
  if(status==-6){next.status=-6;return next;}
  phase[4]=1;
  if(status==1){next.approach=true;next.x=h[11];next.z=h[12];next.state={3,0,phase[2],phase[3],1,0};next.status=1;return next;}
 }
 if(phase[2]>1e-9){next.state=phase;next.status=1;return next;}
 if(phase[0]==1){next.state={2,0,h[15]*(1+std::floor(idleCycleRandom(rng)*2)),double(rng),phase[4],0};next.status=1;return next;}
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
   next.points.assign(points,points+size_t(count)*2);next.x=x;next.z=z;next.topology=lazy_route_revision();next.state={3,0,phase[2],double(rng),phase[4],0};next.status=1;
   if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);return next;
  }
  if(previous!=int(h[7]))spatial_select_nav_profile_index(previous);
 }
 next.state={1,0,h[14]*(2+std::floor(idleCycleRandom(rng)*3)),double(rng),phase[4],0};next.status=1;return next;
}
static void publishNativeIdleCycleDecision(IntentState& s,ActiveIntent& intent,NativeIdleCycleDecision next){
 if(next.status==1){next.requestedAt=s.effectiveTime;next.sequence=emitIntentChange(s,intent);}
 intent.idleCycle->next=std::move(next);
}
