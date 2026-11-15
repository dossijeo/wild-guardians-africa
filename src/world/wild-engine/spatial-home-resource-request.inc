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
EMSCRIPTEN_KEEPALIVE int nav_home_request_snapshot(double actor,double ticket){
 auto& s=state();s.homeRequestResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;return p.pending&&p.kind==18&&p.home&&actor==p.home->header[1]&&ticket==double(p.ticket)&&snapshotHomeRequest(s,p.home->homeRequestSource.get())?1:0;}
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
 const auto& intent=found->second;if(intent.homeRequest)return nativeHomeRequestBodyCurrent(s,intent)&&snapshotHomeRequest(s,intent.homeRequest.get())?1:0;
 return nativeHomeBodyCurrent(s,intent)&&snapshotHomeRequest(s,s.routeSlots[intent.slot].homeBinding->requestSource.get())?1:0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_request_ptr(){return state().homeRequestResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_home_requests_snapshot(){
 auto& s=state();auto& out=s.homeRequestsResult;out.clear();std::vector<uint64_t> actors;
 // Subscriptions may precede physical initialization. Unbound declarations
 // provide no executable source; first binding emits the request's new event.
 for(const auto& [actor,intent]:s.activeIntents)if(intent.homeRequest&&intent.homeRequest->body)actors.push_back(actor);
 std::sort(actors.begin(),actors.end());for(auto actor:actors){if(nav_home_request_snapshot(double(actor),0)!=1){out.clear();return -1;}out.insert(out.end(),s.homeRequestResult.begin(),s.homeRequestResult.end());}return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_requests_ptr(){return state().homeRequestsResult.data();}
