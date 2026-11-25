// Native kinematic execution on a cohort with versioned static proofs.
// The route remains the only timetable, the body registry the physical owner.
// This is not yet gameplay consequence ownership or a graphical clock permit.
bool executionBindingCoherent(const IntentState& s,uint64_t body,uint32_t slot){
  if(slot>=s.routeSlots.size())return false;
  const auto& route=s.routeSlots[slot];const auto active=s.activeIntents.find(route.actor);
   return route.active&&!route.suspended&&route.reserved&&!route.gateCandidate&&route.reservationBody==body&&route.timingMode&&
    active!=s.activeIntents.end()&&(active->second.state==PlanningState::RouteActive||
      (active->second.state==PlanningState::ActionActive&&active->second.animalStrike&&route.animalRouteBinding==active->second.animalStrike->route&&route.hasExecution&&route.executionPose[6]==1))&&
     active->second.slot==slot&&active->second.generation==route.generation&&
     (!route.gateAdmitted||gateRouteBindingsCoherent(s,route,slot))&&
    (active->second.animal||s.workers.count(route.actor));
}
bool nativeDeliveryBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.delivery||!intent.requiresResources||intent.animal||intent.home||intent.retreat||intent.task||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return false;
 const auto& route=s.routeSlots[intent.slot];const auto& binding=route.consequenceBinding;const auto worker=s.workers.find(intent.actor);
 const auto cargo=s.targets.find(intent.carriedTarget),center=s.targets.find(intent.target);SpatialBodyView body;
 return binding&&binding->assignmentSequence==intent.assignmentSequence&&binding->actual.effect[3]==double(intent.carriedTarget)&&binding->actual.effect[4]==double(intent.target)&&
  route.hasExecution&&(route.motionFlags&8)&&executionBindingCoherent(s,route.reservationBody,intent.slot)&&
  worker!=s.workers.end()&&worker->second.bodyBound&&worker->second.body==route.reservationBody&&worker->second.center==intent.target&&
  spatialReadBody(route.reservationBody,body)&&body.kind==0&&(body.flags&1)&&!(body.flags&2)&&body.x==route.executionPose[0]&&body.z==route.executionPose[1]&&body.r==route.radius&&
  worker->second.x==body.x&&worker->second.z==body.z&&cargo!=s.targets.end()&&!cargo->second.active&&cargo->second.x==body.x&&cargo->second.z==body.z&&
  center!=s.targets.end()&&center->second.kind==4&&center->second.active&&center->second.status==0;
}
bool nativeHomeBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.home||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.task||intent.lease||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return false;
 const auto& route=s.routeSlots[intent.slot];const auto& b=route.homeBinding;const auto worker=s.workers.find(intent.actor);SpatialBodyView body;
 if(!b||!route.hasExecution||worker==s.workers.end())return false;
 const int expectedFlags=b->requestSource&&b->requestSource->raidSpawnSequence?2:0;
 if(route.motionFlags!=expectedFlags||b->actual.header[6]!=expectedFlags)return false;
 const auto source=homeRouteSourceView(b->source.get(),b->requestSource.get());if(!source.village||source.actor!=intent.actor)return false;const auto& h=b->actual.header;
 return b->assignmentSequence==intent.assignmentSequence&&double(route.generation)==h[4]&&double(intent.slot)==h[20]&&route.startTime==h[10]&&
  intent.approachKnown&&intent.approachX==float(source.homeX)&&intent.approachZ==float(source.homeZ)&&worker->second.bodyBound&&!worker->second.eligible&&
  worker->second.body==route.reservationBody&&double(route.reservationBody)==h[2]&&executionBindingCoherent(s,route.reservationBody,intent.slot)&&
  spatialReadBody(route.reservationBody,body)&&body.kind==0&&body.flags==source.bodyFlags&&body.x==route.executionPose[0]&&body.z==route.executionPose[1]&&body.r==route.radius&&
  worker->second.x==body.x&&worker->second.z==body.z;
}
static bool farmArrivalBodyCurrent(const IntentState& s,const ActiveIntent& intent,bool held){
 const bool home=held&&intent.home&&intent.homeRequest&&intent.state==PlanningState::AwaitingResources;
 if((intent.home&&!home)||intent.task||intent.target||intent.lease||intent.delivery||intent.animal||intent.retreat||!intent.requiresResources||intent.state!=(home?PlanningState::AwaitingResources:held?PlanningState::WaitingBlocked:PlanningState::RouteActive)||intent.slot>=s.routeSlots.size()||intent.farmArrivalRequest)return false;
 const auto& route=s.routeSlots[intent.slot];const auto& b=route.farmArrivalBinding;const auto worker=s.workers.find(intent.actor);SpatialBodyView body;
 if(!b||!b->requestSource||!route.hasExecution||route.motionFlags>1||worker==s.workers.end())return false;
 const auto& r=*b->requestSource;const auto& h=b->actual.header;const auto center=s.targets.find(r.center);
 if(home){const auto& q=*intent.homeRequest;const auto& p=route.executionPose;if(q.initialIdleSourceSequence||q.idleCycleSourceSequence||q.idleStrollSourceSequence||q.idleStrollSourceGeneration||q.farmArrivalSourceSequence!=b->assignmentSequence||q.farmArrivalSourceGeneration!=intent.generation||q.body!=route.reservationBody||q.profile!=intent.profile||q.bodyFlags!=r.bodyFlags||q.radius!=route.radius||q.at<route.suspendedAt||q.sequence<=b->assignmentSequence||q.x!=p[0]||q.z!=p[1]||q.yaw!=p[4]||q.runPhase!=p[9]||q.walkPhase!=p[10]||q.carryPhase!=p[11]||q.runRemaining!=p[14])return false;}
 const auto& origin=b->heldSource;
 const std::array<double,8> source=origin?origin->pose:std::array<double,8>{r.x,r.z,r.yaw,r.radius,r.runPhase,r.walkPhase,r.carryPhase,r.runRemaining};
 if(origin){uint32_t next=origin->generation+2;if(!next)next=1;
  if(origin->sequence<=r.sequence||origin->sequence>=b->assignmentSequence||origin->at<r.at||origin->at>h[10]||double(next)!=h[4])return false;}
 if(route.originX!=source[0]||route.originZ!=source[1]||route.originYaw!=source[2]||route.radius!=source[3]||route.motionOffset[2]!=source[4]||route.motionOffset[3]!=source[5]||route.motionOffset[4]!=source[6]||route.runBudget!=source[7]||h[8]!=source[0]||h[9]!=source[1]||h[16]!=source[7])return false;
 const double endX=route.points.empty()?route.originX:route.points[route.points.size()-2],endZ=route.points.empty()?route.originZ:route.points.back();
 uint32_t resumed=uint32_t(h[4])+1;if(!resumed)resumed=1;
 const auto suspended=s.suspendedBodies.find(r.body);
 const bool owned=held?route.active&&route.suspended&&route.resumable&&!route.reserved&&route.generation==resumed&&intent.generation==resumed&&route.actor==intent.actor&&route.profile==intent.profile&&!route.pendingResources&&
  suspended!=s.suspendedBodies.end()&&suspended->second==intent.slot&&!s.reservedBodies.count(r.body)&&route.executionPose[6]==0&&route.suspendedAt>=h[10]&&route.suspendedAt<h[11]:
  double(route.generation)==h[4]&&executionBindingCoherent(s,route.reservationBody,intent.slot);
 // Like Stroll, task availability can end before the prepared Home stop.
 // Keep the exact physical owner; an existing Home request stays ineligible.
 return r.actor==intent.actor&&r.session==s.session&&double(r.sequence)==h[21]&&r.at==h[22]&&r.profile==route.profile&&
  b->assignmentSequence==intent.assignmentSequence&&owned&&double(intent.slot)==h[20]&&route.startTime==h[10]&&double(route.motionFlags)==h[6]&&
  (!home||!worker->second.eligible)&&!worker->second.actionActive&&worker->second.bodyBound&&!worker->second.inactiveSequence&&worker->second.center==r.center&&worker->second.body==r.body&&r.body==route.reservationBody&&
  center!=s.targets.end()&&center->second.kind==4&&center->second.active&&center->second.status==0&&center->second.serviceKnown&&center->second.serviceX==r.targetX&&center->second.serviceZ==r.targetZ&&center->second.x==r.centerX&&center->second.z==r.centerZ&&
  intent.approachKnown&&intent.approachX==float(home?intent.homeRequest->homeX:r.targetX)&&intent.approachZ==float(home?intent.homeRequest->homeZ:r.targetZ)&&intent.approachRadius==2&&std::hypot(endX-r.targetX,endZ-r.targetZ)<=2&&
  spatialReadBody(r.body,body)&&body.kind==0&&body.flags==r.bodyFlags&&body.r==route.radius&&body.r==r.radius&&
  body.x==route.executionPose[0]&&body.z==route.executionPose[1]&&worker->second.x==body.x&&worker->second.z==body.z;
}
bool nativeFarmArrivalBodyCurrent(const IntentState& s,const ActiveIntent& intent){return farmArrivalBodyCurrent(s,intent,false);}
bool nativeHeldFarmArrivalBodyCurrent(const IntentState& s,const ActiveIntent& intent){return farmArrivalBodyCurrent(s,intent,true);}
void projectExecutedPose(IntentState& s,RouteSlot& route,const std::array<double,18>& pose){
  SpatialBodyView before;spatialReadBody(route.reservationBody,before);
  spatialMoveBodyFromIntent(route.reservationBody,pose[0],pose[1]);
  SpatialBodyView after=before;after.x=pose[0];after.z=pose[1];updateResidencyPinRevision(s,&before,&after);
  if(before.x!=pose[0]||before.z!=pose[1])s.executionBodyUpdates++;
  route.executionPose=pose;route.hasExecution=true;
  auto& intent=s.activeIntents.at(route.actor);
  intent.routeStartX=float(pose[0]);intent.routeStartZ=float(pose[1]);
  intent.routeCursor=uint32_t(pose[5]);
  if(!intent.animal){
    auto& worker=s.workers.at(route.actor);worker.x=pose[0];worker.z=pose[1];
    intent.runBudget=pose[14];
    if(intent.delivery&&intent.carriedTarget){auto crate=s.targets.find(intent.carriedTarget);if(crate!=s.targets.end()){crate->second.x=pose[0];crate->second.z=pose[1];}}
  }
  // Keep full inverse spatial subscriptions until a structural event. Advancing
  // a cursor never rescans/reindexes the polyline on ordinary logical steps.
}
int beginRouteExecution(IntentState& s){
  if(!gateStaticProofCurrent(s))return -4;
  if(s.executionEnabled)return s.executionWorldStamp==executionWorldStamp()?1:-4;
  if(s.reservedBodies.empty())return -2;
  for(const auto& [body,slot]:s.reservedBodies){
    if(!executionBindingCoherent(s,body,slot))return -3;
    const auto& route=s.routeSlots[slot];SpatialBodyView physical;
    if(route.staticProofStamp!=executionWorldStamp())return -4;
    if(route.startTime!=s.effectiveTime||!spatialReadBody(body,physical)||
       physical.x!=route.originX||physical.z!=route.originZ)return -3;
  }
  s.executionWorldStamp=executionWorldStamp();s.executionEnabled=s.bodyDomainActive=true;s.residencyPinRevision++;
  for(const auto& [body,slot]:s.reservedBodies){
    auto& route=s.routeSlots[slot];s.executionEvaluations++;
    projectExecutedPose(s,route,sampleRouteTiming(route,s.effectiveTime));
  }
  s.entityRevision++;return 1;
}
// Only a coherent native execution cohort may authorize presentation time.
// Check structural membership at intent events; ordinary execution already
// checks its bindings and mutation stamp, without revalidating route geometry.
bool causalClockCohortReady(IntentState& s){
  if(!nativeTaskActionsCoherent(s))return false;
  if(!gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp()||
     !s.reservedBodies.empty()&&!s.executionEnabled)return false;
  if(s.clockProofSequence==s.intentSequence)return true;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.state==PlanningState::RouteActive){
    if(intent.slot>=s.routeSlots.size())return false;
    const auto& route=s.routeSlots[intent.slot];
    if(!route.reserved||!route.hasExecution||!executionBindingCoherent(s,route.reservationBody,intent.slot))return false;
  }
  s.clockProofSequence=s.intentSequence;return true;
}
int advanceRouteExecution(IntentState& s,double at){
  if(!std::isfinite(at)||at<s.effectiveTime)return -1;
  if(!nativeTaskActionsCoherent(s))return -3;
  // The world's native motors outlive their requesting actors. An empty,
  // coherent causal cohort still advances on the same authority transaction;
  // it cannot use set_time or a presentation/resource lease to bypass pause.
  if(!s.executionEnabled){
    if(!s.causalClock||!s.reservedBodies.empty())return -2;
    if(!causalClockCohortReady(s))return -3;
  }
  if(at==s.effectiveTime)return 0;
  if(s.causalClock&&s.clockPaused)return -5;
  // Known overlay/residency transactions extend the surviving cohort's proof.
  // Untracked terrain edits and whole-world resets still fail closed: one
  // mutation-counter check per cohort, never route collision/validity queries.
  if(s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp()||!gateStaticProofCurrent(s))return -4;
  struct Move {uint32_t slot;std::array<double,18> pose;};
  std::vector<Move> moves;moves.reserve(s.reservedBodies.size());
  for(const auto& [body,slot]:s.reservedBodies){
    if(!executionBindingCoherent(s,body,slot))return -3;
    const auto& route=s.routeSlots[slot];SpatialBodyView physical;
    if(!spatialReadBody(body,physical))return -3;
    if(route.hasExecution&&route.executionPose[6]==1){moves.push_back({slot,route.executionPose});continue;}
    moves.push_back({slot,sampleRouteTiming(route,at)});
  }
  // All metadata preflight/sampling precedes every physical write. Body moves
  // use a native-only entry point, not JS upserts or per-step contact checks.
  std::vector<std::pair<uint64_t,NativeIdleCycleDecision>> idleDecisions;
  for(const auto& [actor,intent]:s.activeIntents)if(nativeIdleCycleCurrent(s,intent)&&!intent.idleCycle->next.status&&nativeIdleCycleFinished(*intent.idleCycle,at))
    idleDecisions.emplace_back(actor,chooseNativeIdleCycleNext(s,*intent.idleCycle));
  s.effectiveTime=at;s.executionAdvances++;
  const uint64_t updates=s.executionBodyUpdates;
  for(const auto& move:moves){
    auto& route=s.routeSlots[move.slot];
    if(!route.hasExecution||route.executionPose[6]!=1)s.executionEvaluations++;
    projectExecutedPose(s,route,move.pose);
  }
  if(updates!=s.executionBodyUpdates)s.entityRevision++;
  for(auto& [actor,next]:idleDecisions)publishNativeIdleCycleDecision(s,s.activeIntents.at(actor),std::move(next));
  return int(moves.size());
}
