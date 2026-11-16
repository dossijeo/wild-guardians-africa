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
static bool idleStrollCycleReleaseClear(IntentState& s,uint64_t body){
 // Same prepared-stop condition as Carry settlement: releasing this endpoint
 // must not incidentally revoke a peer whose stop has not been prepared.
 bool conflicts=false;visitStoppedReservationConflicts(s,body,[](uint64_t){return false;},[&](uint64_t,double){conflicts=true;});return !conflicts;
}
