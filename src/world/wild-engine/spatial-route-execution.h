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
 const int expectedFlags=homeMotionFlags(b->requestSource.get());
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
 if(route.radius!=source[3]||h[8]!=source[0]||h[9]!=source[1]||h[16]!=source[7])return false;
 if(b->coldGateCut){
  // The cold native proposal already proved the current request pose by
  // sampling the reconstructed original program. Keep its two origins distinct.
  if(origin||route.startTime>=h[10]||h[10]!=r.at)return false;
 }else if(route.startTime!=h[10]||route.originX!=source[0]||route.originZ!=source[1]||route.originYaw!=source[2]||
    route.motionOffset[2]!=source[4]||route.motionOffset[3]!=source[5]||route.motionOffset[4]!=source[6]||route.runBudget!=source[7])return false;
 const double endX=route.points.empty()?route.originX:route.points[route.points.size()-2],endZ=route.points.empty()?route.originZ:route.points.back();
 uint32_t resumed=uint32_t(h[4])+1;if(!resumed)resumed=1;
 const auto suspended=s.suspendedBodies.find(r.body);
 const bool owned=held?route.active&&route.suspended&&route.resumable&&!route.reserved&&route.generation==resumed&&intent.generation==resumed&&route.actor==intent.actor&&route.profile==intent.profile&&!route.pendingResources&&
  suspended!=s.suspendedBodies.end()&&suspended->second==intent.slot&&!s.reservedBodies.count(r.body)&&route.executionPose[6]==0&&route.suspendedAt>=h[10]&&route.suspendedAt<h[11]:
  double(route.generation)==h[4]&&executionBindingCoherent(s,route.reservationBody,intent.slot);
 // Like Stroll, task availability can end before the prepared Home stop.
 // Keep the exact physical owner; an existing Home request stays ineligible.
 return r.actor==intent.actor&&r.session==s.session&&double(r.sequence)==h[21]&&r.at==h[22]&&r.profile==route.profile&&
  b->assignmentSequence==intent.assignmentSequence&&owned&&double(intent.slot)==h[20]&&double(route.motionFlags)==h[6]&&
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
    const auto& farm=route.farmArrivalBinding;
    const bool cold=farm&&farm->coldGateCut;
    const double start=cold?farm->actual.header[10]:route.startTime;
    const double x=cold?farm->actual.header[8]:route.originX,z=cold?farm->actual.header[9]:route.originZ;
    if(start!=s.effectiveTime||!spatialReadBody(body,physical)||physical.x!=x||physical.z!=z)return -3;
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

static bool homeEncounterImpactSources(const IntentState& s,const HomeEncounterImpact& q){
 const auto w=s.activeIntents.find(q.worker),a=s.activeIntents.find(q.animal);
 if(w==s.activeIntents.end()||a==s.activeIntents.end()||!nativeHomeBodyCurrent(s,w->second))return false;
 const auto& worker=w->second;const auto& animal=a->second;
 if(worker.slot!=q.workerSlot||worker.generation!=q.workerGeneration||worker.assignmentSequence!=q.workerAssignment||
    animal.slot!=q.animalSlot||animal.generation!=q.animalGeneration||animal.assignmentSequence!=q.animalAssignment||
    !animal.animal||animal.retreat||animal.state!=PlanningState::RouteActive||
    !executionBindingCoherent(s,q.animalBody,q.animalSlot))return false;
 const auto& home=s.routeSlots[q.workerSlot];const auto& crop=s.routeSlots[q.animalSlot];
 return home.homeBinding->requestSource&&home.homeBinding->requestSource->raidSpawnSequence==q.spawn&&
   home.reservationBody==q.workerBody&&home.gateReservations.empty()&&crop.animalRouteBinding&&crop.hasExecution&&
   !home.executionPose[6]&&!crop.executionPose[6]&&home.executionPose==q.pose;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_home_encounter_impact_prepare(double session,double worker,double animal,double workerAssignment,
    double animalAssignment,double spawn,double at,double x,double z,double resultX,double resultZ){
 auto& s=state();
 if(!integer(worker)||!integer(animal)||worker==animal||!integer(spawn)||!integer(workerAssignment)||!integer(animalAssignment)||
    s.session!=session||!coordinate(resultX)||!coordinate(resultZ)||!std::isfinite(at)||at<=s.effectiveTime||at-s.effectiveTime>.021)return -1;
 if(s.homeEncounterImpact||s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!s.causalClock||s.clockPaused||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence)return -2;
 const auto w=s.activeIntents.find(uint64_t(worker)),a=s.activeIntents.find(uint64_t(animal));
 if(w==s.activeIntents.end()||a==s.activeIntents.end()||w->second.slot>=s.routeSlots.size()||a->second.slot>=s.routeSlots.size())return -2;
 const auto& wi=w->second;const auto& ai=a->second;
 const auto& home=s.routeSlots[wi.slot];const auto& crop=s.routeSlots[ai.slot];
 HomeEncounterImpact proof{wi.actor,ai.actor,home.reservationBody,crop.reservationBody,uint64_t(workerAssignment),uint64_t(animalAssignment),uint64_t(spawn),
   wi.slot,wi.generation,ai.slot,ai.generation,s.effectiveTime,at,home.executionPose,resultX,resultZ};
 if(!homeEncounterImpactSources(s,proof)||proof.pose[0]!=x||proof.pose[1]!=z)return -2;

 if((x!=resultX||z!=resultZ)&&spatial_execution_segment_clear(x,z,resultX,resultZ,home.radius)!=1)return -3;
 proof.priorHome=home.homeBinding->requestSource;
 s.homeEncounterImpact=proof;return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_home_encounter_impact_consume(double session,double worker,double animal,double spawn,double at,double x,double z,double resultX,double resultZ){
 auto& s=state();const auto& q=s.homeEncounterImpact;
 if(!q||q->consumed||session!=double(s.session)||worker!=double(q->worker)||animal!=double(q->animal)||spawn!=double(q->spawn)||
    s.effectiveTime!=q->at||s.clockThrough!=q->from||at!=q->at||x!=q->pose[0]||z!=q->pose[1]||resultX!=q->resultX||resultZ!=q->resultZ||!homeEncounterImpactSources(s,*q))return -2;

 auto& intent=s.activeIntents.at(q->worker);
 auto& route=s.routeSlots[intent.slot];
 if(x!=resultX||z!=resultZ){
  if(spatial_execution_segment_clear(x,z,resultX,resultZ,route.radius)!=1)return -3;
  auto posed=q->pose;posed[0]=resultX;posed[1]=resultZ;projectExecutedPose(s,route,posed);
 }
 releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;s.homeEncounterImpact->consumed=true;emitIntentChange(s,intent);
 s.entityRevision++;return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_home_encounter_impact_current(double worker,double animal,double spawn){
 const auto& s=state();const auto& q=s.homeEncounterImpact;
 if(!q||!q->consumed||worker!=double(q->worker)||animal!=double(q->animal)||spawn!=double(q->spawn))return 0;
 const auto w=s.activeIntents.find(q->worker);SpatialBodyView body;
 return w!=s.activeIntents.end()&&w->second.state==PlanningState::NeedsPlan&&!w->second.generation&&
  !s.reservedBodies.count(q->workerBody)&&!s.suspendedBodies.count(q->workerBody)&&
  spatialReadBody(q->workerBody,body)&&body.kind==0&&body.x==q->resultX&&body.z==q->resultZ?1:-2;
}

extern "C" EMSCRIPTEN_KEEPALIVE int nav_worker_finish_encounter_recovery(double session,double worker,double animal,double spawn,
    double at,double fromX,double fromZ,double toX,double toZ,double yaw){
 auto& s=state();auto& q=s.homeEncounterImpact;
 if(!q||q->recovered||!q->priorHome||session!=double(s.session)||s.effectiveTime!=at||
    s.clockThrough>=at||at-s.clockThrough>.021||fromX!=q->resultX||fromZ!=q->resultZ||yaw!=q->pose[4]||
    !coordinate(toX)||!coordinate(toZ)||nav_home_encounter_impact_current(worker,animal,spawn)!=1)return -2;
 SpatialBodyView before;
 if(!spatialReadBody(q->workerBody,before)||
    ((fromX!=toX||fromZ!=toZ)&&spatial_execution_segment_clear(fromX,fromZ,toX,toZ,before.r)!=1))return -3;
 const auto& peer=s.activeIntents.find(q->animal);
 const auto& cut=s.encounterRetreat;SpatialBodyView removed;
 const bool departed=cut&&cut->departed&&cut->worker==q->worker&&cut->animal==q->animal&&
    cut->animalBody==q->animalBody&&cut->spawn==q->spawn&&peer==s.activeIntents.end()&&!spatialReadBody(q->animalBody,removed);
 if(!departed&&(peer==s.activeIntents.end()||peer->second.assignmentSequence!=q->animalAssignment||
    peer->second.generation!=q->animalGeneration||!executionBindingCoherent(s,q->animalBody,q->animalSlot)))return -2;
 if(!spatialMoveBodyFromIntent(q->workerBody,toX,toZ))return -2;
 SpatialBodyView after=before;after.x=toX;after.z=toZ;updateResidencyPinRevision(s,&before,&after);
 auto& bound=s.workers.at(q->worker);bound.x=toX;bound.z=toZ;
 q->resultX=toX;q->resultZ=toZ;q->recovered=true;s.entityRevision++;
 return 1;
}

extern "C" EMSCRIPTEN_KEEPALIVE int nav_restored_encounter_worker_current(double actor,double hit){
 const auto& s=state();const auto& source=s.restoredEncounterWorker;
 if(!source||actor!=double(source->actor)||hit!=double(source->hit))return 0;
 const auto worker=s.workers.find(source->actor);SpatialBodyView body;
 return worker!=s.workers.end()&&!s.activeIntents.count(source->actor)&&
   !s.reservedBodies.count(source->body)&&!s.suspendedBodies.count(source->body)&&
   spatialReadBody(source->body,body)&&body.flags==1&&body.kind==0&&
   body.x==source->x&&body.z==source->z?1:-2;
}

extern "C" EMSCRIPTEN_KEEPALIVE int nav_restore_encounter_worker(double session,double actor,double bodyId,double hit,
    double x,double z,double yaw,double run,double walk,double carry,double budget){
 auto& s=state();SpatialBodyView body;
 if(session!=double(s.session)||!integer(actor)||!integer(bodyId)||!integer(hit)||
    !coordinate(x)||!coordinate(z)||!std::isfinite(yaw))return -1;
 for(double phase:{run,walk,carry,budget})if(!std::isfinite(float(phase))||phase<0)return -1;
 const uint64_t worker=uint64_t(actor),id=uint64_t(bodyId);
 if(s.restoredEncounterWorker||s.homeEncounterImpact||s.encounterRetreat||s.executionEnabled||s.causalClock||
    s.barrierProposal.pending||s.proposalOpen||s.worldMutationPreview||s.workers.size()!=1||
    !s.workers.count(worker)||s.activeIntents.count(worker)||s.reservedBodies.count(id)||s.suspendedBodies.count(id)||
    !spatialReadBody(id,body)||body.flags!=1||body.kind!=0||body.x!=x||body.z!=z||
    spatial_execution_segment_clear(x,z,x,z,body.r)!=1)return -2;
 s.restoredEncounterWorker=RestoredEncounterWorker{worker,id,uint64_t(hit),x,z,yaw,run,walk,carry,budget};
 return 1;
}

extern "C" EMSCRIPTEN_KEEPALIVE int nav_finish_restored_encounter_worker(double session,double actor,double hit,
    double at,double fromX,double fromZ,double toX,double toZ,double yaw){
 auto& s=state();auto& source=s.restoredEncounterWorker;
 const auto& cut=s.encounterRetreat;
 if(!source||source->recovered||source->approach&&(!cut||!cut->hit||!cut->departed||
    cut->worker!=source->actor||cut->workerBody!=source->body||cut->spawn!=source->spawn)||
    session!=double(s.session)||s.effectiveTime!=at||
    s.clockThrough>=at||at-s.clockThrough>.021||fromX!=source->x||fromZ!=source->z||yaw!=source->yaw||
    !coordinate(toX)||!coordinate(toZ)||nav_restored_encounter_worker_current(actor,hit)!=1)return -2;
 SpatialBodyView before;
 if(!spatialReadBody(source->body,before)||
    ((fromX!=toX||fromZ!=toZ)&&spatial_execution_segment_clear(fromX,fromZ,toX,toZ,before.r)!=1))return -3;
 if(!spatialMoveBodyFromIntent(source->body,toX,toZ))return -2;
 SpatialBodyView after=before;after.x=toX;after.z=toZ;updateResidencyPinRevision(s,&before,&after);
 auto& worker=s.workers.at(source->actor);worker.x=toX;worker.z=toZ;
 source->x=toX;source->z=toZ;source->recovered=true;s.entityRevision++;
 return 1;
}
static bool centerEncounterExecuted(const IntentState& s,const CenterEncounterPermit& c,
    const ActiveIntent& animal,const RouteSlot& route){
 const auto w=s.activeIntents.find(c.worker);
 if(animal.actor!=c.animal||route.reservationBody!=c.animalBody||!route.animalRouteBinding||
    route.animalRouteBinding->source->sequence!=c.request||w==s.activeIntents.end()||
    w->second.assignmentSequence!=c.homeAssignment||w->second.slot!=c.homeSlot||w->second.generation!=c.homeGeneration||
    !nativeHomeBodyCurrent(s,w->second))return false;
 const auto& home=s.routeSlots[c.homeSlot];
 return home.reservationBody==c.workerBody&&home.homeBinding->requestSource->raidSpawnSequence==c.spawn&&
   home.homeBinding->centerFlight.animal==route.animalRouteBinding->source;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_center_encounter_active(double actor){
 const auto& s=state();
 if(!integer(actor))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));
 if(found==s.activeIntents.end()||found->second.slot>=s.routeSlots.size())return 0;
 const auto& route=s.routeSlots[found->second.slot];
 return route.centerEncounter&&route.generation==found->second.generation&&
   executionBindingCoherent(s,route.reservationBody,found->second.slot)?1:0;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_center_encounter_step(double session,double worker,double animal,double event,double at,double impact){
 auto& s=state();
 if(session!=double(s.session)||!integer(worker)||!integer(animal)||!integer(event)||
    !std::isfinite(at)||at<=s.effectiveTime||at-s.effectiveTime>.021||(impact!=0&&impact!=1))return -1;
 if(s.centerEncounterStep)return -4;
 const auto found=s.activeIntents.find(uint64_t(animal));
 if(found==s.activeIntents.end()||found->second.slot>=s.routeSlots.size())return -2;
 const auto& route=s.routeSlots[found->second.slot];const auto& context=route.centerEncounter;
 if(!context||context->worker!=uint64_t(worker)||context->spawn!=uint64_t(event)||
    s.clockPaused||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence||
    !centerEncounterExecuted(s,*context,found->second,route))return -2;
 const auto& q=s.homeEncounterImpact;
 if(impact!=double(bool(q&&!q->consumed&&q->worker==context->worker&&q->animal==context->animal&&q->at==at)))return -2;
 s.centerEncounterStep=CenterEncounterStep{found->second.assignmentSequence,context->workerBody,context->animalBody,
    s.intentSequence,s.clockSequence,executionWorldStamp(),s.effectiveTime,at,impact==1};return 1;
}

static bool restoredEncounterApproachCurrent(const IntentState& s,const NativeAnimalRouteRequest& request){
 const auto& source=s.restoredEncounterWorker;
 return source&&source->approach.get()==&request&&source->spawn&&
    nav_restored_encounter_worker_current(double(source->actor),double(source->hit))==1;
}
static bool encounterRetreatWorkerCurrent(const IntentState& s,const EncounterRetreatCut& c){
 const auto& impact=s.homeEncounterImpact;
 if(impact&&impact->consumed&&impact->worker==c.worker&&impact->workerBody==c.workerBody&&
    impact->animal==c.animal&&impact->animalBody==c.animalBody&&impact->spawn==c.spawn&&
    impact->animalAssignment==c.assignment)
   return nav_home_encounter_impact_current(double(c.worker),double(c.animal),double(c.spawn))==1;
 const auto& source=s.restoredEncounterWorker;
 return source&&source->approach&&source->actor==c.worker&&source->body==c.workerBody&&source->spawn==c.spawn&&
    source->approach->actor==c.animal&&source->approach->body==c.animalBody&&
    restoredEncounterApproachCurrent(s,*source->approach);
}
static bool encounterRetreatCutCurrent(const IntentState& s,const EncounterRetreatCut& c){
 const auto animal=s.activeIntents.find(c.animal);
 if(!encounterRetreatWorkerCurrent(s,c)||animal==s.activeIntents.end()||animal->second.state!=PlanningState::RouteActive||
    animal->second.slot!=c.slot||animal->second.generation!=c.generation||animal->second.assignmentSequence!=c.assignment||
    animal->second.animalStrike||!executionBindingCoherent(s,c.animalBody,c.slot))return false;
 const auto& route=s.routeSlots[c.slot];const auto& binding=route.animalRouteBinding;
 if(!binding||!binding->source->attackCenter||!route.hasExecution||
    route.executionPose!=c.origin||c.origin[6]||c.origin[7]!=c.from)return false;
 return route.centerEncounter||restoredEncounterApproachCurrent(s,*binding->source);
}
static int previewEncounterRetreatStep(IntentState& s,const ActiveIntent& intent,EncounterRetreatCut& cut){
  SpatialBodyView body;
  if(s.reservedBodies.size()!=1||!spatialReadBody(cut.animalBody,body)||body.kind!=1||body.flags!=1||
     body.x!=cut.origin[0]||body.z!=cut.origin[1])return -2;
  cut.profile=intent.profile;
  const int previous=lazy_selected_context();
  if(previous!=cut.profile)spatial_select_nav_profile_index(cut.profile);
  RouteSlot candidate;
  const int count=spatial_world_route_cached(float(body.x),float(body.z),float(cut.exitX),float(cut.exitZ));
  int status=count<=0?(count<0?3:0):-3;
  if(count>0&&count<=4096){
    const float* points=spatial_world_route_ptr();
    if(points[count*2-2]==float(cut.exitX)&&points[count*2-1]==float(cut.exitZ)){
      candidate.points.assign(points,points+size_t(count)*2);
      status=prepareRouteTiming(candidate,cut.animal,body.x,body.z,cut.from,body.r,1,0,0,false,true);
    }
  }
  if(previous!=cut.profile)spatial_select_nav_profile_index(previous);
  if(status!=1)return status<0?-3:status;
  candidate.originYaw=cut.origin[4];candidate.motionOffset[1]=cut.origin[3];
  candidate.runDistance=candidate.distances.back();candidate.runSpeed=3.8;
  if(routeTimingRepresentable(candidate)!=1)return -3;
  s.reservationResult.fill(0);
  if(!reserveRouteClear(s,intent,candidate,cut.animalBody,body,true))return -3;
  cut.first=sampleRouteTiming(candidate,cut.at);
  if(cut.first[6]||cut.first[2]<=0)return -3;
  const auto cursor=size_t(cut.first[5])*2;
  cut.remaining.assign(candidate.points.begin()+cursor,candidate.points.end());
  cut.world=executionWorldStamp();cut.bodies=spatialBodiesMutationRevision();
  return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_encounter_exhaust_pose(double session,double animal,double hit){
  const auto& s=state();const auto& cut=s.encounterRetreat;
  return cut&&session==double(s.session)&&animal==double(cut->animal)&&hit==double(cut->hit)?cut->first.data():nullptr;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_encounter_exhaust_prepare(double session,double worker,double animal,double spawn,
    double assignment,double at,double x,double z,double yaw,double phase,double exitX,double exitZ){
 auto& s=state();
 if(session!=double(s.session)||!integer(worker)||!integer(animal)||!integer(spawn)||!integer(assignment)||
    !std::isfinite(at)||at<=s.effectiveTime||at-s.effectiveTime>.021||!coordinate(exitX)||!coordinate(exitZ))return -1;
 if(s.encounterRetreat||s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!s.causalClock||s.clockPaused||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence)return -2;
 const auto& impact=s.homeEncounterImpact;const auto& source=s.restoredEncounterWorker;
 const uint64_t workerBody=impact?impact->workerBody:source&&source->approach?source->body:0;
 const auto found=s.activeIntents.find(uint64_t(animal));
 if(!workerBody||found==s.activeIntents.end()||found->second.slot>=s.routeSlots.size())return -2;
 const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];
 EncounterRetreatCut cut{uint64_t(worker),workerBody,uint64_t(animal),route.reservationBody,uint64_t(assignment),uint64_t(spawn),0,0,
    intent.slot,intent.generation,s.effectiveTime,at,exitX,exitZ,route.executionPose,false};
 if(!encounterRetreatCutCurrent(s,cut)||cut.origin[0]!=x||cut.origin[1]!=z||cut.origin[4]!=yaw||cut.origin[3]!=phase)return -2;
 const int step=previewEncounterRetreatStep(s,intent,cut);
 if(step!=1)return step;
 s.encounterRetreat=std::move(cut);return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_encounter_exhaust_consume(double session,double worker,double animal,double spawn,
    double assignment,double at,double hit){
 auto& s=state();auto& cut=s.encounterRetreat;
 const auto& restored=s.restoredEncounterWorker;
 if(!cut||cut->hit||!integer(hit)||hit<=spawn||restored&&restored->approach&&hit<=double(restored->hit)||
    session!=double(s.session)||worker!=double(cut->worker)||animal!=double(cut->animal)||
    spawn!=double(cut->spawn)||assignment!=double(cut->assignment)||at!=cut->at||s.effectiveTime!=cut->at||
    s.clockThrough!=cut->from||!encounterRetreatCutCurrent(s,*cut))return -2;

 if(cut->world!=executionWorldStamp()||cut->bodies!=spatialBodiesMutationRevision())return -3;
 SpatialBodyView before;
 if(!spatialReadBody(cut->animalBody,before)||!spatialMoveBodyFromIntent(cut->animalBody,cut->first[0],cut->first[1]))return -3;
 SpatialBodyView after=before;after.x=cut->first[0];after.z=cut->first[1];
 updateResidencyPinRevision(s,&before,&after);s.executionBodyUpdates++;
 cut->hit=uint64_t(hit);releaseIntent(s,cut->animal,PlanningState::NeedsPlan);s.activeIntents.erase(cut->animal);
 s.entityRevision++;return 1;
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
    if(const auto& encounter=route.centerEncounter;encounter){
      const auto& permit=*encounter;const auto& step=s.centerEncounterStep;
      const auto& impact=s.homeEncounterImpact;
      const auto& animal=s.activeIntents.at(route.actor);
      const bool consumed=impact&&impact->consumed&&impact->workerBody==permit.workerBody&&impact->animalBody==permit.animalBody&&
        impact->animalAssignment==animal.assignmentSequence&&impact->animalSlot==slot&&impact->animalGeneration==route.generation;
      if(!consumed&&(!step||step->animalAssignment!=animal.assignmentSequence||step->workerBody!=permit.workerBody||
         step->animalBody!=permit.animalBody||step->intents!=s.intentSequence||step->clock!=s.clockSequence||
         step->worldStamp!=executionWorldStamp()||step->from!=s.effectiveTime||step->to!=at||!centerEncounterExecuted(s,permit,animal,route)))return -6;
    }
    if(route.hasExecution&&route.executionPose[6]==1){moves.push_back({slot,route.executionPose});continue;}

    if(s.homeEncounterImpact&&!s.homeEncounterImpact->consumed&&body==s.homeEncounterImpact->workerBody){
      const auto& impact=*s.homeEncounterImpact;
      if(at!=impact.at||s.effectiveTime!=impact.from||!homeEncounterImpactSources(s,impact))return -6;
      continue;
    }

    if(const auto& cut=s.encounterRetreat;cut&&!cut->hit&&cut->animalBody==body){
      if(at!=cut->at||s.effectiveTime!=cut->from||!encounterRetreatCutCurrent(s,*cut))return -6;
      continue;
    }
    moves.push_back({slot,sampleRouteTiming(route,at)});
  }
  // All metadata preflight/sampling precedes every physical write. Body moves
  // use a native-only entry point, not JS upserts or per-step contact checks.
  std::vector<std::pair<uint64_t,NativeIdleCycleDecision>> idleDecisions;
  for(const auto& [actor,intent]:s.activeIntents)if(nativeIdleCycleCurrent(s,intent)&&!intent.idleCycle->next.status&&nativeIdleCycleFinished(*intent.idleCycle,at))
    idleDecisions.emplace_back(actor,chooseNativeIdleCycleNext(s,*intent.idleCycle));
  s.centerEncounterStep.reset();s.effectiveTime=at;s.executionAdvances++;
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
