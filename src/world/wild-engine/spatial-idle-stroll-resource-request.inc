// Cold semantic WALK declaration. Like dtCrowd::addAgent/requestMoveTarget,
// registration and a requested target do not restore an executable corridor.
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_restore_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_restore_idle_stroll(double actor,double workerProfile,double anchorKind,double anchor,
 double anchorX,double anchorZ,double anchorRadius,double idleSeconds,double rng,double approachRetry,double destinationX,double destinationZ,
 double yaw,double runPhase,double walkPhase,double carryPhase,double runRemaining){
 auto& s=state();if(!integer(actor)||!integer(workerProfile,true)||workerProfile>3||!integer(anchorKind)||anchorKind>2||!integer(anchor)||!integer(rng,true)||rng>4294967295.)return -1;
 for(double v:{anchorX,anchorZ,anchorRadius,idleSeconds,approachRetry,destinationX,destinationZ,yaw,runPhase,walkPhase,carryPhase,runRemaining})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(!coordinate(anchorX)||!coordinate(anchorZ)||!coordinate(destinationX)||!coordinate(destinationZ)||anchorRadius<=0||anchorRadius>8||idleSeconds<=0||idleSeconds>3600||approachRetry<0||runPhase<0||walkPhase<0||carryPhase<0||runRemaining<0||std::hypot(destinationX-anchorX,destinationZ-anchorZ)>anchorRadius+1e-9)return -1;
 const auto worker=s.workers.find(uint64_t(actor));if(worker==s.workers.end())return 0;const auto& w=worker->second;const auto center=s.targets.find(w.center);
 if(!w.eligible||w.actionActive||w.inactiveSequence||!w.center||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0||std::hypot(w.x-anchorX,w.z-anchorZ)>anchorRadius)return -2;
 for(const auto& [id,t]:s.tasks)if(t.assigned==uint64_t(actor))return -2;
 if(const auto found=s.activeIntents.find(uint64_t(actor));found!=s.activeIntents.end()){
  const auto& intent=found->second;const auto r=intent.strollRequest;
  if(!r||!nativeIdleStrollRequestCurrent(s,intent))return -2;
  return r->workerProfile==int(workerProfile)&&r->anchorKind==int(anchorKind)&&r->anchor==uint64_t(anchor)&&r->anchorX==anchorX&&r->anchorZ==anchorZ&&r->anchorRadius==anchorRadius&&r->idleSeconds==idleSeconds&&r->rng==uint32_t(rng)&&r->approachRetry==approachRetry&&r->destinationX==destinationX&&r->destinationZ==destinationZ&&r->yaw==yaw&&r->runPhase==runPhase&&r->walkPhase==walkPhase&&r->carryPhase==carryPhase&&r->runRemaining==runRemaining?1:-3;
 }
 // A restored declaration precedes the first binding/clock. It cannot replace
 // a live body or disturb an already admitted native cohort.
 if(w.bodyBound||s.causalClock||s.executionEnabled)return -4;
 auto r=std::make_shared<NativeIdleStrollResourceRequest>();r->actor=uint64_t(actor);r->session=s.session;r->at=s.effectiveTime;r->center=w.center;r->x=w.x;r->z=w.z;r->profile=lazy_selected_context();
 r->workerProfile=int(workerProfile);r->anchorKind=int(anchorKind);r->anchor=uint64_t(anchor);r->anchorX=anchorX;r->anchorZ=anchorZ;r->anchorRadius=anchorRadius;r->idleSeconds=idleSeconds;r->rng=uint32_t(rng);r->approachRetry=approachRetry;r->destinationX=destinationX;r->destinationZ=destinationZ;
 r->yaw=yaw;r->runPhase=runPhase;r->walkPhase=walkPhase;r->carryPhase=carryPhase;r->runRemaining=runRemaining;
 ActiveIntent intent;intent.actor=r->actor;intent.requiresResources=true;intent.lease=false;intent.state=PlanningState::AwaitingResources;intent.profile=r->profile;intent.strollRequest=std::move(r);
 if(!nativeIdleStrollRequestAnchorCurrent(s,*intent.strollRequest))return -2;
 auto& stored=s.activeIntents.emplace(intent.actor,std::move(intent)).first->second;stored.strollRequest->sequence=emitIntentChange(s,stored);s.entityRevision++;return 1;
}
static int snapshotIdleStrollRequest(IntentState& s,const NativeIdleStrollResourceRequest& r){
 s.strollRequestResult={1,double(r.actor),double(r.session),double(r.sequence),r.at,double(r.center),double(r.body),double(r.profile),double(r.bodyFlags),r.x,r.z,r.yaw,r.radius,r.runPhase,r.walkPhase,r.carryPhase,r.runRemaining,double(r.workerProfile),double(r.anchorKind),double(r.anchor),r.anchorX,r.anchorZ,r.anchorRadius,r.idleSeconds,double(r.rng),r.approachRetry,r.destinationX,r.destinationZ};return 1;
}
// A cold declaration is observable for Game's hold, without a usable body
// reference or an executable resource grant. Binding emits a fresh birth.
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_restore_declaration_snapshot(double actor){
 auto& s=state();s.strollRequestResult.fill(0);if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeIdleStrollRequestCurrent(s,found->second)?snapshotIdleStrollRequest(s,*found->second.strollRequest):0;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_restored_idle_stroll_home_request(double actor,double session,double sourceSequence,double village,double homeX,double homeZ){
 auto& s=state();if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||!integer(village)||!coordinate(homeX)||!coordinate(homeZ))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;auto& intent=found->second;const auto worker=s.workers.find(uint64_t(actor));if(worker==s.workers.end())return -2;
 if(intent.homeRequest){const auto& r=*intent.homeRequest;
  const bool current=r.body?nativeHomeRequestBodyCurrent(s,intent):intent.home&&intent.state==PlanningState::AwaitingResources&&!intent.task&&!intent.target&&!intent.generation&&intent.requiresResources&&!intent.lease&&r.actor==intent.actor&&r.session==s.session&&r.sequence==intent.resourceRequestSequence&&!worker->second.bodyBound&&!worker->second.body&&!worker->second.eligible&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.x==r.x&&worker->second.z==r.z;
  if(!current||r.strollRequestSourceSequence!=uint64_t(sourceSequence))return -2;return r.village==uint64_t(village)&&r.homeX==homeX&&r.homeZ==homeZ?1:-3;
 }
 if(!nativeIdleStrollRequestCurrent(s,intent)||intent.strollRequest->sequence!=uint64_t(sourceSequence))return -2;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 auto request=std::make_shared<NativeHomeResourceRequest>();static_cast<NativeWorkerPoseResourceRequest&>(*request)=*intent.strollRequest;request->strollRequestSourceSequence=uint64_t(sourceSequence);request->village=uint64_t(village);request->homeX=homeX;request->homeZ=homeZ;request->at=s.effectiveTime;
 intent.strollRequest.reset();intent.homeRequest=std::move(request);intent.home=true;intent.state=PlanningState::AwaitingResources;intent.approachKnown=true;intent.approachX=float(homeX);intent.approachZ=float(homeZ);worker->second.eligible=false;
 intent.homeRequest->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_restore_request_snapshot(double actor){
 auto& s=state();s.strollRequestResult.fill(0);if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeIdleStrollRequestBodyCurrent(s,found->second)?snapshotIdleStrollRequest(s,*found->second.strollRequest):0;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_restore_source_snapshot(double actor){
 auto& s=state();s.strollRequestResult.fill(0);if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
 const auto& intent=found->second;if(intent.strollRequest)return nativeIdleStrollRequestBodyCurrent(s,intent)?snapshotIdleStrollRequest(s,*intent.strollRequest):0;
 const auto active=currentIdleStroll(actor),held=active?nullptr:currentHeldIdleStroll(actor);const auto b=active?active:held;return b&&b->requestSource?snapshotIdleStrollRequest(s,*b->requestSource):0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_restore_request_ptr(){return state().strollRequestResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_restore_requests_snapshot(){
 auto& s=state();s.strollRequestsResult.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.strollRequest&&intent.strollRequest->body)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(auto actor:actors){if(nav_idle_stroll_restore_request_snapshot(double(actor))!=1){s.strollRequestsResult.clear();return -1;}s.strollRequestsResult.insert(s.strollRequestsResult.end(),s.strollRequestResult.begin(),s.strollRequestResult.end());}return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_restore_requests_ptr(){return state().strollRequestsResult.data();}
