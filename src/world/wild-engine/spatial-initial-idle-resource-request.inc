// Initial Idle has no preceding Carry, task, route or settlement. This is only
// its current semantic resource request in the existing native intent owner.
// Rest/watch state is retained verbatim; it is not an executable Idle policy.
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_request_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_request_initial_idle(double actor,double workerProfile,double mode,double elapsed,double remaining,
 double rng,double anchorKind,double anchor,double approachRetry,double yaw,double runPhase,double walkPhase,double carryPhase,double runRemaining){
 auto& s=state();if(!integer(actor)||!integer(workerProfile,true)||workerProfile>3||!integer(mode,true)||mode>2||!integer(rng,true)||rng>4294967295.||!integer(anchorKind,true)||anchorKind>3||!integer(anchor,true))return -1;
 for(double v:{elapsed,remaining,approachRetry,yaw,runPhase,walkPhase,carryPhase,runRemaining})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(elapsed<0||remaining<0||approachRetry<0||runPhase<0||walkPhase<0||carryPhase<0||runRemaining<0||(!mode&&(elapsed||remaining||rng||anchorKind||anchor||approachRetry))||(mode&&(!anchorKind||!anchor)))return -1;
 const auto found=s.workers.find(uint64_t(actor));if(found==s.workers.end())return 0;
 const auto& worker=found->second;const auto center=s.targets.find(worker.center);SpatialBodyView body;
 if(!worker.eligible||worker.actionActive||worker.inactiveSequence||!worker.center||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0)return -2;
 if(worker.bodyBound&&(!worker.body||!spatialReadBody(worker.body,body)||body.kind!=0||!(body.flags&1)||(body.flags&2)||body.x!=worker.x||body.z!=worker.z||body.r<=0||body.r>2||s.reservedBodies.count(worker.body)||s.suspendedBodies.count(worker.body)))return -2;
 // Cold declarations precede binding. A live causal cohort must never gain
 // an unbound request that would make its already admitted peers incoherent.
 if(!worker.bodyBound&&(s.causalClock||s.executionEnabled))return -4;
 for(const auto& [id,task]:s.tasks)if(task.assigned==uint64_t(actor))return -2;
 if(const auto previous=s.activeIntents.find(uint64_t(actor));previous!=s.activeIntents.end()){
  const auto& intent=previous->second;const auto* r=intent.initialIdleRequest.get();
  if(!r)return -2;
  if(!nativeInitialIdleRequestCurrent(s,intent))return -2;
  return r->workerProfile==int(workerProfile)&&r->mode==int(mode)&&r->elapsed==elapsed&&r->remaining==remaining&&r->rng==uint32_t(rng)&&r->anchorKind==int(anchorKind)&&r->anchor==uint64_t(anchor)&&r->approachRetry==approachRetry&&r->yaw==yaw&&r->runPhase==runPhase&&r->walkPhase==walkPhase&&r->carryPhase==carryPhase&&r->runRemaining==runRemaining?1:-3;
 }
 auto request=std::make_shared<NativeInitialIdleResourceRequest>();request->actor=uint64_t(actor);request->session=s.session;request->center=worker.center;request->at=s.effectiveTime;
 request->x=worker.x;request->z=worker.z;request->yaw=yaw;request->runPhase=runPhase;request->walkPhase=walkPhase;request->carryPhase=carryPhase;request->runRemaining=runRemaining;request->profile=lazy_selected_context();
 request->workerProfile=int(workerProfile);request->mode=int(mode);request->elapsed=elapsed;request->remaining=remaining;request->rng=uint32_t(rng);request->anchorKind=int(anchorKind);request->anchor=uint64_t(anchor);request->approachRetry=approachRetry;
 if(worker.bodyBound){request->body=worker.body;request->radius=body.r;request->bodyFlags=body.flags;}
 ActiveIntent intent;intent.actor=request->actor;intent.requiresResources=true;intent.lease=false;intent.state=PlanningState::AwaitingResources;intent.profile=request->profile;intent.initialIdleRequest=std::move(request);
 auto& stored=s.activeIntents.emplace(intent.actor,std::move(intent)).first->second;stored.initialIdleRequest->sequence=emitIntentChange(s,stored);s.entityRevision++;return 1;
}
static int snapshotInitialIdleRequest(IntentState& s,const NativeInitialIdleResourceRequest& r){
 s.initialIdleRequestResult={1,double(r.actor),double(r.session),double(r.sequence),r.at,double(r.center),double(r.body),double(r.profile),double(r.bodyFlags),r.x,r.z,r.yaw,r.radius,r.runPhase,r.walkPhase,r.carryPhase,r.runRemaining,double(r.workerProfile),double(r.mode),r.elapsed,r.remaining,double(r.rng),double(r.anchorKind),double(r.anchor),r.approachRetry};return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_declaration_snapshot(double actor){
 auto& s=state();s.initialIdleRequestResult.fill(0);if(!integer(actor))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeInitialIdleRequestCurrent(s,found->second)?snapshotInitialIdleRequest(s,*found->second.initialIdleRequest):0;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_request_snapshot(double actor){
 auto& s=state();s.initialIdleRequestResult.fill(0);if(!integer(actor))return 0;
 const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeInitialIdleRequestBodyCurrent(s,found->second)?snapshotInitialIdleRequest(s,*found->second.initialIdleRequest):0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_initial_idle_request_ptr(){return state().initialIdleRequestResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_requests_snapshot(){
 auto& s=state();auto& out=s.initialIdleRequestsResult;out.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.initialIdleRequest&&intent.initialIdleRequest->body)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(auto actor:actors){if(nav_initial_idle_request_snapshot(double(actor))!=1){out.clear();return -1;}out.insert(out.end(),s.initialIdleRequestResult.begin(),s.initialIdleRequestResult.end());}return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_initial_idle_requests_ptr(){return state().initialIdleRequestsResult.data();}
