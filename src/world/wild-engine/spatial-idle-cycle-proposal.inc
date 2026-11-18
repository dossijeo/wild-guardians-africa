// The actual23 endpoint supplies the physical source. REST birth is the
// original Game semantic input (seeded private stream, no random draw yet).
// Keep it in the existing provisional21, never in a fictitious20/24 owner.
static std::optional<NativeIdleCycleBodySource> arrivedFarmIdleCycleSource(const IntentState& s,const ActiveIntent& intent,uint64_t sequence,int anchorKind,uint64_t anchor,uint32_t rng,double idleSeconds){
 if(!nativeCompletedFarmArrivalBodyCurrent(s,intent)||intent.assignmentSequence!=sequence)return std::nullopt;
 const auto& route=s.routeSlots[intent.slot];const auto& b=*route.farmArrivalBinding;const auto& p=route.executionPose;const auto& r=*b.requestSource;
 NativeIdleCycleBodySource q;q.kind=23;q.actor=intent.actor;q.body=route.reservationBody;q.session=s.session;q.sequence=sequence;q.at=b.actual.header[11];q.profile=intent.profile;q.workerProfile=r.workerProfile;q.center=r.center;q.bodyFlags=r.bodyFlags;
 q.x=p[0];q.z=p[1];q.yaw=p[4];q.radius=route.radius;q.runPhase=p[9];q.walkPhase=p[10];q.carryPhase=p[11];q.runRemaining=p[14];q.anchorKind=anchorKind;q.anchor=anchor;q.initial={1,0,idleSeconds*2,double(rng),0,0};return q;
}
static bool idleCycleDraftCurrent(const IntentState& s,const PendingBarrierProposal::IdleCycleDraft& d){
 const auto found=s.activeIntents.find(uint64_t(d.header[1]));if(found==s.activeIntents.end())return false;const auto& intent=found->second;
 if(!idleCycleAnchorCurrent(s,d.header))return false;
 if(d.failedRequest){
  const auto source=failedIdleStrollCycleSource(s,intent,uint64_t(d.header[3]));
  return source&&intent.strollRequest==d.failedRequest&&idleCycleBodySourceData(*source)==idleCycleBodySourceData(d.source);
 }
 if(d.farmSource){
  const auto& h=d.header;const auto source=arrivedFarmIdleCycleSource(s,intent,uint64_t(h[3]),int(h[9]),uint64_t(h[10]),uint32_t(d.source.initial[3]),h[14]);
  return source&&s.routeSlots[intent.slot].farmArrivalBinding==d.farmSource&&idleCycleBodySourceData(*source)==idleCycleBodySourceData(d.source);
 }
 if(d.strollSource){
  const auto source=arrivedIdleStrollCycleSource(s,intent,uint64_t(d.header[3]));
  return source&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].idleStrollBinding==d.strollSource&&idleCycleBodySourceData(*source)==idleCycleBodySourceData(d.source);
 }
 return intent.state==PlanningState::StationaryActive&&!intent.task&&!intent.target&&!intent.home&&
  intent.initialIdleBodyBinding==d.body&&intent.idleCycle==d.previousCycle&&
  (d.previousCycle?nativeIdleCycleCurrent(s,intent)&&d.previousCycle->next.status==1&&d.previousCycle->next.state[0]!=3:nativeInitialIdleBodyCurrent(s,intent));
}
static int stageIdleCycle(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds,std::optional<uint32_t> farmRng=std::nullopt,bool failedRest=false){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||!integer(anchorKind)||anchorKind>2||!integer(anchorId))return -1;
 for(double v:{x,z,radius,idleSeconds,alertSeconds})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(std::abs(x)>=2147483000.||std::abs(z)>=2147483000.||radius<=0||radius>8||idleSeconds<=0||idleSeconds>3600||alertSeconds<=0||alertSeconds>3600)return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;const auto& intent=found->second;
 PendingBarrierProposal::IdleCycleDraft draft;uint64_t sourceCycle=0;
 if(failedRest){
  const auto source=failedIdleStrollCycleSource(s,intent,uint64_t(sourceSequence));if(!source)return -2;
  draft.source=*source;draft.failedRequest=intent.strollRequest;const auto& r=*draft.failedRequest;
  if(x!=r.anchorX||z!=r.anchorZ||radius!=r.anchorRadius||idleSeconds!=r.idleSeconds)return -2;
 }else if(farmRng){
  const auto source=arrivedFarmIdleCycleSource(s,intent,uint64_t(sourceSequence),int(anchorKind),uint64_t(anchorId),*farmRng,idleSeconds);if(!source||!idleStrollCycleReleaseClear(s,source->body))return -2;
  draft.source=*source;draft.farmSource=s.routeSlots[intent.slot].farmArrivalBinding;
 }else if(intent.idleCycle){
  if(!nativeIdleCycleCurrent(s,intent)||intent.idleCycle->next.status!=1||intent.idleCycle->next.state[0]==3||double(intent.idleCycle->next.sequence)!=sourceSequence)return -2;
  draft.previousCycle=intent.idleCycle;draft.body=intent.idleCycle->binding->body;draft.source=intent.idleCycle->binding->source;sourceCycle=intent.idleCycle->binding->cycleSequence;
 }else if(nativeInitialIdleBodyCurrent(s,intent)&&intent.state==PlanningState::StationaryActive){
  draft.body=intent.initialIdleBodyBinding;const auto& q=*draft.body->source;if(double(draft.body->bodySequence)!=sourceSequence)return -2;
  auto& v=draft.source;static_cast<NativeWorkerPoseResourceRequest&>(v)=q;v.kind=20;v.sequence=draft.body->bodySequence;v.center=q.center;v.workerProfile=q.workerProfile;v.anchorKind=q.anchorKind;v.anchor=q.anchor;v.initial={double(q.mode),q.elapsed,q.remaining,double(q.rng),q.approachRetry,0};
 }else{
  const auto source=arrivedIdleStrollCycleSource(s,intent,uint64_t(sourceSequence));if(!source)return -2;
  draft.source=*source;draft.strollSource=s.routeSlots[intent.slot].idleStrollBinding;
  const auto& m=draft.strollSource->semantic;
  if(x!=m[12]||z!=m[13]||radius!=m[14]||idleSeconds!=m[17]||!idleStrollCycleReleaseClear(s,source->body))return -2;
 }
 const auto& q=draft.source;
 if(q.anchorKind!=int(anchorKind)||q.anchor!=uint64_t(anchorId)||q.kind!=1&&std::hypot(q.x-x,q.z-z)>radius)return -2;
 const auto initial=draft.previousCycle?draft.previousCycle->next.state:q.initial;
 uint32_t rng=uint32_t(initial[3]);const double watchStart=initial[0]==1?initial[2]:0,watchRng=initial[0]==1?(idleCycleRandom(rng),double(rng)):initial[3],watchDuration=initial[0]==1?alertSeconds*(1+std::floor(watchRng/4294967296.*2)):initial[2],fullDuration=watchStart+watchDuration;
 const double duration=q.kind==1&&std::hypot(q.x-x,q.z-z)>radius?std::min(fullDuration,initial[4]):fullDuration;
 if(duration<0||duration>0&&s.effectiveTime+duration<=s.effectiveTime||!std::isfinite(s.effectiveTime+duration)||!std::isfinite(float(duration)))return -2;
 draft.header={q.kind==1?2.:1.,actor,double(q.body),double(q.sequence),double(sourceCycle),s.effectiveTime,double(s.intentSequence),double(q.profile),double(q.workerProfile),anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds,initial[0],initial[1],initial[2],initial[3],initial[4],watchStart,watchRng,duration};
 if(!idleCycleDraftCurrent(s,draft))return -2;const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
 s.barrierProposal.kind=21;s.barrierProposal.idleCycle=std::move(draft);return 1;
}
// Opt-in native source/horizon ABI. Legacy full-program readers accept only
// header1 and cannot accidentally install a retry program as a full cycle.
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_failed_rest_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_failed_rest_proposal_stage(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds){return stageIdleCycle(actor,session,sourceSequence,anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds,std::nullopt,true);}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_next_approach(double actor){const auto& s=state();if(!integer(actor))return 0;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeIdleCycleCurrent(s,found->second)&&found->second.idleCycle->next.status==1&&found->second.idleCycle->next.approach?1:0;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_stage(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds){return stageIdleCycle(actor,session,sourceSequence,anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds);}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_farm_proposal_stage(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds,double rng){
 if(!integer(rng)||rng>4294967295.)return -1;
 return stageIdleCycle(actor,session,sourceSequence,anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds,uint32_t(rng));
}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),21):-1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle?p.idleCycle->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=21||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=21||!p.idleCycle||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.idleCycle);clearWorldMutationProposal(p);const auto& h=old.header;
 const int result=stageIdleCycle(h[1],session,old.previousCycle?double(old.previousCycle->next.sequence):h[3],h[9],h[10],h[11],h[12],h[13],h[14],h[15],old.farmSource?std::optional<uint32_t>(uint32_t(old.source.initial[3])):std::nullopt,bool(old.failedRequest));if(result!=1)return result;
 auto& next=*p.idleCycle;bool same=old.body==next.body&&old.previousCycle==next.previousCycle&&old.strollSource==next.strollSource&&old.farmSource==next.farmSource&&old.failedRequest==next.failedRequest&&idleCycleBodySourceData(old.source)==idleCycleBodySourceData(next.source);
 for(size_t i=0;i<h.size();i++)if(i!=5&&i!=6&&h[i]!=next.header[i])same=false;
 next.previous=NativeIdleCycleOrigin{h,uint64_t(ticket)};next.timeTranslation={1,ticket,double(p.ticket),h[5],h[5]+h[23],next.header[5],next.header[5]+next.header[23],same?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle&&session==double(p.session)&&ticket==double(p.ticket)&&p.idleCycle->timeTranslation[0]==1?p.idleCycle->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=21||!p.idleCycle||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,21);if(valid!=1)return valid;
 if(!idleCycleDraftCurrent(s,*p.idleCycle)){clearWorldMutationProposal(p);return -2;}
 const auto& d=*p.idleCycle;auto binding=std::make_shared<NativeIdleCycleBinding>();binding->actual={d.header,uint64_t(ticket)};binding->body=d.body;binding->source=d.source;binding->failedRequestSource=d.failedRequest?d.failedRequest:d.previousCycle?d.previousCycle->binding->failedRequestSource:nullptr;
 if(preparedTicket==ticket)binding->prepared=binding->actual;else if(d.previous&&preparedTicket==double(d.previous->ticket)&&d.timeTranslation[7]==1)binding->prepared=*d.previous;else return -9;
 if((d.strollSource||d.farmSource)&&!idleStrollCycleReleaseClear(s,d.source.body)){clearWorldMutationProposal(p);return -2;}
 const bool failedRequest=bool(d.failedRequest),releaseRouteSource=bool(d.strollSource)||bool(d.farmSource);const uint64_t actor=uint64_t(d.header[1]);clearWorldMutationProposal(p);auto& intent=s.activeIntents.at(actor);
 if(failedRequest){intent.strollRequest.reset();intent.state=PlanningState::StationaryActive;}
 if(releaseRouteSource){releaseRoute(s,intent);intent.state=PlanningState::StationaryActive;intent.lease=false;s.workers.at(actor).eligible=true;}
 auto cycle=std::make_shared<NativeIdleCycle>();cycle->binding=binding;intent.idleCycle=cycle;
 binding->cycleSequence=emitIntentChange(s,intent);if(nativeIdleCycleFinished(*cycle,s.effectiveTime))publishNativeIdleCycleDecision(s,intent,chooseNativeIdleCycleNext(s,*cycle));s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,21);return 1;
}
static const NativeIdleCycle* currentIdleCycle(double actor){const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeIdleCycleCurrent(s,found->second)?found->second.idleCycle.get():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_binding_snapshot(double actor){auto& s=state();auto& out=s.idleCycleBindingResult;out.clear();const auto cycle=currentIdleCycle(actor);if(!cycle)return 0;const auto& b=*cycle->binding;out={1,double(b.cycleSequence),double(b.prepared.ticket),double(b.actual.ticket)};out.insert(out.end(),b.prepared.header.begin(),b.prepared.header.end());out.insert(out.end(),b.actual.header.begin(),b.actual.header.end());return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_binding_ptr(){return state().idleCycleBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_binding_actors(){auto& s=state();auto& out=s.idleCycleBindingResult;out.clear();std::vector<uint64_t> actors;for(const auto& [actor,intent]:s.activeIntents)if(intent.idleCycle){if(!nativeIdleCycleBodyCurrent(s,intent))return -1;if(nativeIdleCycleCurrent(s,intent))actors.push_back(actor);}std::sort(actors.begin(),actors.end());for(auto actor:actors)out.push_back(double(actor));return int(actors.size());}
// Source-kind and actual retained pose are separate from the finite cycle's
// header. This keeps legacy initial20 projections closed for a moved body.
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_source_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_source_snapshot(double actor,double ticket){
 auto& s=state();s.idleCycleSourceResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;if(!p.pending||p.kind!=21||!p.idleCycle||double(p.ticket)!=ticket||p.idleCycle->header[1]!=actor||!idleCycleDraftCurrent(s,*p.idleCycle))return 0;s.idleCycleSourceResult=idleCycleBodySourceData(p.idleCycle->source);return 1;}
 const auto cycle=currentIdleCycle(actor);if(!cycle)return 0;s.idleCycleSourceResult=idleCycleBodySourceData(cycle->binding->source);return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_source_ptr(){return state().idleCycleSourceResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_execution(double actor){auto& s=state();s.idleCycleExecutionResult.fill(0);const auto cycle=currentIdleCycle(actor);if(!cycle)return 0;const auto& b=*cycle->binding;const auto phase=sampleNativeIdleCycle(*cycle,s.effectiveTime);s.idleCycleExecutionResult={1,actor,b.actual.header[2],double(b.cycleSequence),s.effectiveTime,phase[0],phase[1],phase[2],phase[3],phase[4],nativeIdleCycleFinished(*cycle,s.effectiveTime)?1.:0.,double(cycle->next.status),double(cycle->next.sequence),nativeIdleCycleEnd(*cycle)};return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_execution_ptr(){return state().idleCycleExecutionResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_next(double actor){auto& s=state();s.idleCycleNextResult.fill(0);const auto cycle=currentIdleCycle(actor);if(!cycle||!cycle->next.status)return 0;const auto& n=cycle->next;s.idleCycleNextResult={1,actor,double(cycle->binding->cycleSequence),double(n.status),double(n.sequence),n.requestedAt,n.state[0],n.state[1],n.state[2],n.state[3],n.state[4],n.x,n.z,double(n.topology)};return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_next_ptr(){return state().idleCycleNextResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_next_points(double actor){const auto cycle=currentIdleCycle(actor);return cycle?int(cycle->next.points.size()/2):0;}
EMSCRIPTEN_KEEPALIVE const float* nav_idle_cycle_next_points_ptr(double actor){const auto cycle=currentIdleCycle(actor);return cycle?cycle->next.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_resolve_next(double actor,double session,double sequence){auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;if(!integer(actor)||!integer(sequence)||session!=double(s.session))return -1;const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!nativeIdleCycleCurrent(s,found->second)||double(found->second.idleCycle->binding->cycleSequence)!=sequence||!nativeIdleCycleFinished(*found->second.idleCycle,s.effectiveTime))return -2;auto& intent=found->second;if(intent.idleCycle->next.status==1)return 1;auto next=chooseNativeIdleCycleNext(s,*intent.idleCycle);const int result=next.status;publishNativeIdleCycleDecision(s,intent,std::move(next));return result;}
