// Current physical source shared by walking execution and its prepared
// stationary successor. Included in the existing native authority namespace.
static const NativeIdleStrollBinding* currentIdleStroll(double actor){
 const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return nullptr;const auto& intent=found->second;
 if(intent.task||intent.target||intent.home||intent.delivery||intent.animal||intent.retreat||!intent.requiresResources||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return nullptr;
 const auto& route=s.routeSlots[intent.slot];const auto& b=route.idleStrollBinding;const auto worker=s.workers.find(intent.actor);SpatialBodyView body;
 if(!b||!route.hasExecution||route.motionFlags||b->assignmentSequence!=intent.assignmentSequence||double(route.generation)!=b->actual.header[4]||double(intent.slot)!=b->actual.header[20]||route.startTime!=b->actual.header[10]||!executionBindingCoherent(s,route.reservationBody,intent.slot)||worker==s.workers.end()||!worker->second.bodyBound||worker->second.body!=route.reservationBody||double(worker->second.center)!=b->semantic[3]||
  !spatialReadBody(route.reservationBody,body)||body.kind!=0||double(body.flags)!=b->semantic[4]||body.r!=route.radius||body.x!=route.executionPose[0]||body.z!=route.executionPose[1]||worker->second.x!=body.x||worker->second.z!=body.z)return nullptr;
 return b.get();
}
// A logical held source is distinct from the executable route association.
// Reuse the exact slot/body checks already required by its Home request.
static const NativeIdleStrollBinding* currentHeldIdleStroll(double actor){
 const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return nullptr;const auto& intent=found->second;
 return nativeHeldIdleStrollBodyCurrent(s,intent,intent.assignmentSequence,intent.generation)?s.routeSlots[intent.slot].idleStrollBinding.get():nullptr;
}
static std::array<double,6> idleStrollRestState(const NativeIdleStrollBinding& b,double at){
 const auto& h=b.actual.header;const auto& m=b.semantic;uint32_t rng=uint32_t(m[15]);const double age=std::clamp(at-h[10],0.,h[11]-h[10]);
 return {1,0,m[17]*(2+std::floor(idleCycleRandom(rng)*3)),double(rng),std::max(0.,m[16]-age),0};
}
static std::optional<NativeIdleCycleBodySource> arrivedIdleStrollCycleSource(const IntentState& s,const ActiveIntent& intent,uint64_t sequence){
 const auto b=currentIdleStroll(double(intent.actor));if(!b||b->assignmentSequence!=sequence||intent.slot>=s.routeSlots.size())return std::nullopt;
 const auto& route=s.routeSlots[intent.slot];if(route.executionPose[6]!=1)return std::nullopt;const auto& pose=route.executionPose;const auto& h=b->actual.header;const auto& m=b->semantic;
 const auto center=s.targets.find(uint64_t(m[3]));if(center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0)return std::nullopt;
 NativeIdleCycleBodySource v;v.kind=22;v.actor=intent.actor;v.body=route.reservationBody;v.session=s.session;v.sequence=sequence;v.at=h[11];v.profile=intent.profile;v.workerProfile=int(m[2]);v.center=uint64_t(m[3]);v.bodyFlags=int(m[4]);
 v.x=pose[0];v.z=pose[1];v.yaw=pose[4];v.radius=route.radius;v.runPhase=pose[9];v.walkPhase=pose[10];v.carryPhase=pose[11];v.runRemaining=pose[14];v.anchorKind=int(m[10]);v.anchor=uint64_t(m[11]);v.initial=idleStrollRestState(*b,s.effectiveTime);return v;
}
static bool reanchorArrivedIdleStroll(const IntentState& s,NativeIdleCycleBodySource& source,int kind,uint64_t anchor,uint32_t rng,double idleSeconds){
 if(source.anchorKind!=1||source.anchor==anchor||(kind==2&&anchor!=source.center)||!rng)return false;
 const auto old=s.targets.find(source.anchor);
 if(old!=s.targets.end()&&(old->second.active||(old->second.kind!=1&&old->second.kind!=2)))return false;
 source.kind=idleStrollReanchorSourceKind;source.anchorKind=kind;source.anchor=anchor;
 source.initial={1,0,idleSeconds*2,double(rng),0,0};
 return true;
}
static bool idleStrollCycleReleaseClear(IntentState& s,uint64_t body){
 // Same prepared-stop condition as Carry settlement: releasing this endpoint
 // must not incidentally revoke a peer whose stop has not been prepared.
 bool conflicts=false;visitStoppedReservationConflicts(s,body,[](uint64_t){return false;},[&](uint64_t,double){conflicts=true;});return !conflicts;
}

// Match spatial-navigation-movement.js's known-empty endpoint test using the
// same native component/connector query. Missing components remain unknown;
// no path outcome is a reservation conflict or an executable motion grant.
static int idleStrollPathOutcome(int count,float x,float z,float tx,float tz){
 if(count>=0)return count?1:-7;
 auto* input=spatial_region_batch_input_ptr(2);if(!input)return -6;
 input[0]=x;input[1]=z;input[2]=tx;input[3]=tz;
 if(spatial_region_batch(2)!=2)return -6;const auto* rows=spatial_region_batch_output_ptr();
 for(int i=0;i<2;i++)if(rows[i*5]==0&&rows[i*5+1]<0)return -7;
 return -6;
}
// The cold request uses the same finite endpoint and local-radius checks
// for both admission and the failed REST blueprint. A physical detour outside
// the original anchor is not a permitted local stroll.
static int idleStrollRequestPathOutcome(int count,const NativeIdleStrollResourceRequest& r){
 const int status=idleStrollPathOutcome(count,float(r.x),float(r.z),float(r.destinationX),float(r.destinationZ));if(status!=1)return status;
 const auto* points=spatial_world_route_ptr();if(!points||points[(count-1)*2]!=float(r.destinationX)||points[(count-1)*2+1]!=float(r.destinationZ))return -7;
 for(int i=0;!r.approach&&i<count;i++)if(std::hypot(double(points[i*2])-r.anchorX,double(points[i*2+1])-r.anchorZ)>r.anchorRadius)return -7;
 return 1;
}
// Failure source shares the pending request's bound pose and exact path
// classification. The copied private stream is installed only by commit21.
static std::optional<NativeIdleCycleBodySource> failedIdleStrollCycleSource(const IntentState& s,const ActiveIntent& intent,uint64_t sequence){
 if(!nativeIdleStrollRequestBodyCurrent(s,intent)||intent.strollRequest->sequence!=sequence)return std::nullopt;
 const auto& r=*intent.strollRequest;const int previous=lazy_selected_context();if(previous!=r.profile)spatial_select_nav_profile_index(r.profile);
 const int count=spatial_world_route_cached(float(r.x),float(r.z),float(r.destinationX),float(r.destinationZ)),status=idleStrollRequestPathOutcome(count,r);
 if(previous!=r.profile)spatial_select_nav_profile_index(previous);if(status!=-7)return std::nullopt;
 NativeIdleCycleBodySource q;static_cast<NativeWorkerPoseResourceRequest&>(q)=r;q.kind=1;q.center=r.center;q.workerProfile=r.workerProfile;q.anchorKind=r.anchorKind;q.anchor=r.anchor;
 uint32_t rng=r.rng;q.initial={1,0,r.idleSeconds*(2+std::floor(idleCycleRandom(rng)*3)),double(rng),r.approachRetry,0};return q;
}
