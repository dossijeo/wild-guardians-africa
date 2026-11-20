// Loading a moving Home declares a current, task-free request. It restores
// semantic pose and destination, never an old corridor or settlement history.
EMSCRIPTEN_KEEPALIVE int nav_home_request_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_restore_home_request(double actor,double village,double homeX,double homeZ,double yaw,
    double runPhase,double walkPhase,double carryPhase,double runRemaining){
 auto& s=state();if(!integer(actor)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 for(double v:{yaw,runPhase,walkPhase,carryPhase,runRemaining})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(runPhase<0||walkPhase<0||carryPhase<0||runRemaining<0)return -1;
 const auto worker=s.workers.find(uint64_t(actor));if(worker==s.workers.end())return 0;
 if(s.causalClock||s.executionEnabled||s.bodyDomainActive||spatial_body_count()!=0||s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(worker->second.eligible||worker->second.actionActive||worker->second.bodyBound||worker->second.body||worker->second.inactiveSequence||s.activeIntents.count(uint64_t(actor)))return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 auto request=std::make_shared<NativeHomeResourceRequest>();request->actor=uint64_t(actor);request->session=s.session;request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;
 request->at=s.effectiveTime;request->x=worker->second.x;request->z=worker->second.z;request->yaw=yaw;request->runPhase=runPhase;request->walkPhase=walkPhase;request->carryPhase=carryPhase;request->runRemaining=runRemaining;request->profile=lazy_selected_context();
 ActiveIntent intent;intent.actor=request->actor;intent.home=true;intent.requiresResources=true;intent.lease=false;intent.state=PlanningState::AwaitingResources;intent.profile=request->profile;
 intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);intent.homeRequest=std::move(request);
 auto& stored=s.activeIntents.emplace(intent.actor,std::move(intent)).first->second;stored.homeRequest->sequence=emitIntentChange(s,stored);s.entityRevision++;return 1;
}
static bool snapshotHomeRequest(IntentState& s,const NativeHomeResourceRequest* r){
 s.homeRequestResult.fill(0);if(!r||!r->body||r->session!=s.session)return false;
 s.homeRequestResult={1,double(r->actor),double(r->session),double(r->sequence),r->at,double(r->village),r->homeX,r->homeZ,r->x,r->z,r->yaw,r->runPhase,r->walkPhase,r->carryPhase,r->runRemaining,double(r->profile),double(r->body),r->radius,double(r->bodyFlags)};return true;
}
// Retarget a genuine live Idle. The immutable preceding settlement keeps its
// body association while the new semantic request awaits prepared resources.
// Its historical home flag is never rewritten and no body/route is recreated.
EMSCRIPTEN_KEEPALIVE int nav_intent_idle_home_request(double actor,double session,double settlementSequence,double village,double homeX,double homeZ){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(settlementSequence)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;
 if(!intent.settlementBinding||intent.settlementBinding->settlementSequence!=uint64_t(settlementSequence)||!nativeSettlementBodyCurrent(s,intent))return -2;
 const auto& h=intent.settlementBinding->actual.header;
 if(h[21]||intent.task||intent.generation||intent.animal||intent.retreat||intent.delivery)return -2;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;return nativeHomeRequestBodyCurrent(s,intent)&&r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;}
 if(intent.home||intent.state!=PlanningState::StationaryActive)return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 auto& worker=s.workers.at(uint64_t(actor));if(worker.actionActive)return -2;
 auto request=std::make_shared<NativeHomeResourceRequest>();request->actor=uint64_t(actor);request->session=s.session;request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;
 request->body=worker.body;request->radius=h[12];request->bodyFlags=int(h[19]);request->profile=int(h[18]);request->at=s.effectiveTime;
 request->x=h[9];request->z=h[10];request->yaw=h[11];request->runPhase=h[13];request->walkPhase=h[14];request->carryPhase=h[15];request->runRemaining=h[16];
 const auto owners=s.byTarget.find(intent.target);if(owners!=s.byTarget.end()){owners->second.erase(intent.actor);if(owners->second.empty())s.byTarget.erase(owners);}
 intent.target=0;intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);intent.homeRequest=std::move(request);worker.eligible=false;
 intent.homeRequest->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
// Retarget the actual finite stationary cycle, including a body moved by Idle.
// This replaces only the semantic goal. The same body and current cycle remain
// retained until the existing prepared Home route acquires its real boundary.
EMSCRIPTEN_KEEPALIVE int nav_intent_idle_cycle_home_request(double actor,double session,double cycleSequence,double village,double homeX,double homeZ){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(cycleSequence)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;if(r.idleCycleSourceSequence!=uint64_t(cycleSequence)||!nativeHomeRequestBodyCurrent(s,intent))return -2;return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;}
 if(!nativeIdleCycleCurrent(s,intent)||intent.idleCycle->binding->cycleSequence!=uint64_t(cycleSequence))return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 const auto& cycle=*intent.idleCycle->binding;auto request=std::make_shared<NativeHomeResourceRequest>();static_cast<NativeWorkerPoseResourceRequest&>(*request)=cycle.source;
 request->idleCycleSourceSequence=cycle.cycleSequence;request->initialIdleSourceSequence=cycle.body?cycle.body->bodySequence:0;
 request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;request->at=s.effectiveTime;
 intent.homeRequest=std::move(request);intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);s.workers.at(intent.actor).eligible=false;
 intent.homeRequest->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
// The existing prepared suspension has already revoked moving22/23. Retarget
// its held native pose without creating a rest cycle or releasing its slot.
static int requestHeldWorkerHome(double actor,double session,double assignmentSequence,double generation,double village,double homeX,double homeZ,bool farm){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(assignmentSequence)||!integer(generation)||generation>double(UINT32_MAX)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 const auto& pending=s.barrierProposal;
 const bool farmContinuation=farm&&pending.pending&&pending.kind==23&&pending.farmArrivalRoute&&pending.farmArrivalRoute->header[1]==actor&&pending.farmArrivalRoute->farmArrivalHeldBinding;
 if(pending.pending&&!farmContinuation||s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;
 // A completed route owns a final pose, not a synthetic suspension. Its same
 // request remains idempotent after the executable corridor has been released.
 if(intent.homeRequest&&(farm?intent.homeRequest->completedFarmArrival:intent.homeRequest->completedIdleStroll)){const auto& r=*intent.homeRequest;if((farm?r.farmArrivalSourceSequence:r.idleStrollSourceSequence)!=uint64_t(assignmentSequence)||(farm?r.farmArrivalSourceGeneration:r.idleStrollSourceGeneration)!=uint32_t(generation)||!nativeHomeRequestBodyCurrent(s,intent))return -2;return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;}
 const bool completed=farm?nativeCompletedFarmArrivalBodyCurrent(s,intent):nativeCompletedIdleStrollBodyCurrent(s,intent);
 if(intent.assignmentSequence!=uint64_t(assignmentSequence)||intent.generation!=uint32_t(generation)||!(farm?nativeHeldFarmArrivalBodyCurrent(s,intent):nativeHeldIdleStrollBodyCurrent(s,intent,uint64_t(assignmentSequence),uint32_t(generation)))&&!completed)return -2;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;if(!nativeHomeRequestBodyCurrent(s,intent))return -2;return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;}
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 const auto& route=s.routeSlots[intent.slot];
 if(completed&&!farm&&!idleStrollCycleReleaseClear(s,route.reservationBody))return 0;
 // Only the exact retained Farm source can obsolete its own prepared successor.
 // Keep every other proposal and all source/body checks unchanged.
 if(farmContinuation){if(pending.farmArrivalRoute->farmArrivalHeldBinding!=route.farmArrivalBinding)return -4;clearWorldMutationProposal(s.barrierProposal);}
 const auto& pose=route.executionPose;SpatialBodyView body;if(!spatialReadBody(route.reservationBody,body))return -2;
 auto request=std::make_shared<NativeHomeResourceRequest>();request->actor=intent.actor;request->session=s.session;request->body=route.reservationBody;request->profile=intent.profile;request->bodyFlags=body.flags;request->radius=route.radius;request->at=s.effectiveTime;
 request->x=pose[0];request->z=pose[1];request->yaw=pose[4];request->runPhase=pose[9];request->walkPhase=pose[10];request->carryPhase=pose[11];request->runRemaining=pose[14];request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;
 if(farm){request->farmArrivalSourceSequence=uint64_t(assignmentSequence);request->farmArrivalSourceGeneration=uint32_t(generation);}else{request->idleStrollSourceSequence=uint64_t(assignmentSequence);request->idleStrollSourceGeneration=uint32_t(generation);}
 request->completedFarmArrival=completed&&farm;request->completedIdleStroll=completed&&!farm;
 if(completed)releaseIntent(s,intent.actor,PlanningState::Cancelled,false);
 intent.homeRequest=std::move(request);intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);
 // publish has no intervening intent event. The copied pose must already be
 // current when emit drains the old motor's stopped reservation.
 s.workers.at(intent.actor).eligible=false;intent.homeRequest->sequence=s.intentSequence+1;emitIntentChange(s,intent);s.entityRevision++;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_idle_stroll_home_request(double actor,double session,double assignmentSequence,double generation,double village,double homeX,double homeZ){return requestHeldWorkerHome(actor,session,assignmentSequence,generation,village,homeX,homeZ,false);}
EMSCRIPTEN_KEEPALIVE int nav_intent_farm_arrival_home_request(double actor,double session,double assignmentSequence,double generation,double village,double homeX,double homeZ){return requestHeldWorkerHome(actor,session,assignmentSequence,generation,village,homeX,homeZ,true);}
// A pending13 owns an intent and possibly its first body, not a Farm corridor.
// Retarget that exact source as for a restored WALK, without inventing Idle.
EMSCRIPTEN_KEEPALIVE int nav_intent_pending_farm_home_request(double actor,double session,double sourceSequence,double village,double homeX,double homeZ){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;const auto worker=s.workers.find(uint64_t(actor));if(worker==s.workers.end())return -2;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;
  const bool current=r.body?nativeHomeRequestBodyCurrent(s,intent):intent.home&&intent.state==PlanningState::AwaitingResources&&!intent.task&&!intent.target&&!intent.generation&&intent.requiresResources&&!intent.lease&&r.actor==intent.actor&&r.session==s.session&&r.sequence==intent.resourceRequestSequence&&!worker->second.bodyBound&&!worker->second.body&&!worker->second.eligible&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.x==r.x&&worker->second.z==r.z;
  if(!current||r.farmRequestSourceSequence!=uint64_t(sourceSequence))return -2;return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;
 }
 if(!nativeFarmArrivalRequestCurrent(s,intent)||intent.farmArrivalRequest->sequence!=uint64_t(sourceSequence))return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 if(s.worldMutationPreview||s.proposalOpen)return -4;
 if(s.barrierProposal.pending){const auto& p=s.barrierProposal;
  if(p.kind!=23||!p.farmArrivalRoute||p.farmArrivalRoute->farmArrivalHeldSource||p.farmArrivalRoute->farmArrivalRequestSource!=intent.farmArrivalRequest)return -4;
  clearWorldMutationProposal(s.barrierProposal);
 }
 auto request=std::make_shared<NativeHomeResourceRequest>();static_cast<NativeWorkerPoseResourceRequest&>(*request)=*intent.farmArrivalRequest;
 request->farmRequestSourceSequence=uint64_t(sourceSequence);request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;request->at=s.effectiveTime;
 intent.farmArrivalRequest.reset();intent.homeRequest=std::move(request);intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);worker->second.eligible=false;
 intent.homeRequest->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
// A genuine initial Idle may expire before graphics, or even its first body,
// have been admitted. Retarget that semantic source on the same intent owner.
EMSCRIPTEN_KEEPALIVE int nav_intent_initial_idle_home_request(double actor,double session,double sourceSequence,double village,double homeX,double homeZ){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;
 const auto worker=s.workers.find(uint64_t(actor));if(worker==s.workers.end())return -2;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;
  const bool current=r.body?nativeHomeRequestBodyCurrent(s,intent):intent.home&&intent.state==PlanningState::AwaitingResources&&!intent.task&&!intent.target&&!intent.generation&&intent.requiresResources&&!intent.lease&&r.actor==intent.actor&&r.session==s.session&&r.sequence==intent.resourceRequestSequence&&!worker->second.bodyBound&&!worker->second.body&&!worker->second.eligible&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.x==r.x&&worker->second.z==r.z;
  if(!current||r.initialIdleSourceSequence!=uint64_t(sourceSequence))return -2;
  return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;
 }
 const NativeWorkerPoseResourceRequest* held=nullptr;
 if(nativeInitialIdleRequestCurrent(s,intent)&&intent.initialIdleRequest->sequence==uint64_t(sourceSequence))held=intent.initialIdleRequest.get();
 else if(nativeInitialIdleBodyCurrent(s,intent)&&intent.state==PlanningState::StationaryActive&&intent.initialIdleBodyBinding->bodySequence==uint64_t(sourceSequence))held=intent.initialIdleBodyBinding->source.get();
 if(!held)return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 auto request=std::make_shared<NativeHomeResourceRequest>();static_cast<NativeWorkerPoseResourceRequest&>(*request)=*held;
 request->initialIdleSourceSequence=uint64_t(sourceSequence);request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;request->at=s.effectiveTime;
 intent.initialIdleRequest.reset();intent.homeRequest=std::move(request);intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);worker->second.eligible=false;
 intent.homeRequest->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_home_request_snapshot(double actor,double ticket){
 auto& s=state();s.homeRequestResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;return p.pending&&p.kind==18&&p.home&&actor==p.home->header[1]&&ticket==double(p.ticket)&&snapshotHomeRequest(s,p.home->homeRequestSource.get())?1:0;}
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
 const auto& intent=found->second;if(intent.homeRequest)return nativeHomeRequestBodyCurrent(s,intent)&&snapshotHomeRequest(s,intent.homeRequest.get())?1:0;
 return nativeHomeBodyCurrent(s,intent)&&snapshotHomeRequest(s,s.routeSlots[intent.slot].homeBinding->requestSource.get())?1:0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_request_ptr(){return state().homeRequestResult.data();}
// Bodyless Farm-origin Home is observable but is never an executable request.
EMSCRIPTEN_KEEPALIVE int nav_home_declaration_snapshot(double actor){
 auto& s=state();s.homeRequestResult.fill(0);if(!integer(actor))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!nativeUnboundFarmHomeCurrent(s,found->second))return 0;
 const auto& r=*found->second.homeRequest;
 s.homeRequestResult={1,double(r.actor),double(r.session),double(r.sequence),r.at,double(r.village),r.homeX,r.homeZ,r.x,r.z,r.yaw,r.runPhase,r.walkPhase,r.carryPhase,r.runRemaining,double(r.profile),0,0,0};return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_home_requests_snapshot(){
 auto& s=state();auto& out=s.homeRequestsResult;out.clear();std::vector<uint64_t> actors;
 // Subscriptions may precede physical initialization. Unbound declarations
 // provide no executable source; first binding emits the request's new event.
 for(const auto& [actor,intent]:s.activeIntents)if(intent.homeRequest&&intent.homeRequest->body)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(auto actor:actors){if(nav_home_request_snapshot(double(actor),0)!=1){out.clear();return -1;}out.insert(out.end(),s.homeRequestResult.begin(),s.homeRequestResult.end());}return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_requests_ptr(){return state().homeRequestsResult.data();}
