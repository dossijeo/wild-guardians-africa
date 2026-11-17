// Task-free farm arrival is a distinct semantic goal, never a Home, task or
// initial Idle. The native center supplies its existing authored service point.
// Like NavigationAgent3D's target/desired distance, this declares intent only;
// a later prepared route must prove topology, bodies and graphical resources.
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_request_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_request_farm_arrival(double actor,double workerProfile,double yaw,
 double runPhase,double walkPhase,double carryPhase,double runRemaining){
 auto& s=state();if(!integer(actor)||!integer(workerProfile,true)||workerProfile>3)return -1;
 for(double v:{yaw,runPhase,walkPhase,carryPhase,runRemaining})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(runPhase<0||walkPhase<0||carryPhase<0||runRemaining<0)return -1;
 if(s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.workers.find(uint64_t(actor));if(found==s.workers.end())return 0;
 const auto& worker=found->second;const auto center=s.targets.find(worker.center);SpatialBodyView body;
 if(!worker.eligible||worker.actionActive||worker.inactiveSequence||!worker.center||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0||!center->second.serviceKnown)return -2;
 if(worker.bodyBound&&(!worker.body||!spatialReadBody(worker.body,body)||body.kind!=0||!(body.flags&1)||(body.flags&2)||body.x!=worker.x||body.z!=worker.z||body.r<=0||body.r>2||s.reservedBodies.count(worker.body)||s.suspendedBodies.count(worker.body)))return -2;
 if(!worker.bodyBound&&(s.causalClock||s.executionEnabled))return -4;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 if(const auto previous=s.activeIntents.find(uint64_t(actor));previous!=s.activeIntents.end()){
  const auto& intent=previous->second;const auto* r=intent.farmArrivalRequest.get();if(!r||!nativeFarmArrivalRequestCurrent(s,intent))return -2;
  return r->workerProfile==int(workerProfile)&&r->yaw==yaw&&r->runPhase==runPhase&&r->walkPhase==walkPhase&&r->carryPhase==carryPhase&&r->runRemaining==runRemaining?1:-3;
 }
 auto request=std::make_shared<NativeFarmArrivalResourceRequest>();request->actor=uint64_t(actor);request->session=s.session;request->center=worker.center;request->at=s.effectiveTime;
 request->x=worker.x;request->z=worker.z;request->yaw=yaw;request->runPhase=runPhase;request->walkPhase=walkPhase;request->carryPhase=carryPhase;request->runRemaining=runRemaining;request->profile=lazy_selected_context();request->workerProfile=int(workerProfile);
 request->targetX=center->second.serviceX;request->targetZ=center->second.serviceZ;request->centerX=center->second.x;request->centerZ=center->second.z;
 if(worker.bodyBound){request->body=worker.body;request->radius=body.r;request->bodyFlags=body.flags;}
 ActiveIntent intent;intent.actor=request->actor;intent.requiresResources=true;intent.lease=false;intent.state=PlanningState::AwaitingResources;intent.profile=request->profile;intent.farmArrivalRequest=std::move(request);
 auto& stored=s.activeIntents.emplace(intent.actor,std::move(intent)).first->second;stored.farmArrivalRequest->sequence=emitIntentChange(s,stored);s.entityRevision++;return 1;
}
static int snapshotFarmArrivalRequest(IntentState& s,const NativeFarmArrivalResourceRequest& r){
 s.farmArrivalRequestResult={1,double(r.actor),double(r.session),double(r.sequence),r.at,double(r.center),double(r.body),double(r.profile),double(r.bodyFlags),r.x,r.z,r.yaw,r.radius,r.runPhase,r.walkPhase,r.carryPhase,r.runRemaining,double(r.workerProfile),r.targetX,r.targetZ,r.centerX,r.centerZ,2};return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_declaration_snapshot(double actor){
 auto& s=state();s.farmArrivalRequestResult.fill(0);if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeFarmArrivalRequestCurrent(s,found->second)?snapshotFarmArrivalRequest(s,*found->second.farmArrivalRequest):0;
}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_request_snapshot(double actor){
 auto& s=state();s.farmArrivalRequestResult.fill(0);if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeFarmArrivalRequestBodyCurrent(s,found->second)?snapshotFarmArrivalRequest(s,*found->second.farmArrivalRequest):0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_request_ptr(){return state().farmArrivalRequestResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_requests_snapshot(){
 auto& s=state();s.farmArrivalRequestsResult.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.farmArrivalRequest&&intent.farmArrivalRequest->body)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(auto actor:actors){if(nav_farm_arrival_request_snapshot(double(actor))!=1){s.farmArrivalRequestsResult.clear();return -1;}s.farmArrivalRequestsResult.insert(s.farmArrivalRequestsResult.end(),s.farmArrivalRequestResult.begin(),s.farmArrivalRequestResult.end());}return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_requests_ptr(){return state().farmArrivalRequestsResult.data();}
