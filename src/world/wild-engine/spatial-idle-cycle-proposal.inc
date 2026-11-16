static bool idleCycleDraftCurrent(const IntentState& s,const PendingBarrierProposal::IdleCycleDraft& d){
 const auto found=s.activeIntents.find(uint64_t(d.header[1]));if(found==s.activeIntents.end())return false;const auto& intent=found->second;
 return intent.state==PlanningState::StationaryActive&&!intent.task&&!intent.target&&!intent.home&&nativeInitialIdleBodyCurrent(s,intent)&&
  intent.initialIdleBodyBinding==d.body&&intent.idleCycle==d.previousCycle&&
  (!d.previousCycle||nativeIdleCycleCurrent(s,intent)&&d.previousCycle->next.status==1&&d.previousCycle->next.state[0]==1)&&idleCycleAnchorCurrent(s,d.header);
}
static int stageIdleCycle(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||!integer(anchorKind)||anchorKind>2||!integer(anchorId))return -1;
 for(double v:{x,z,radius,idleSeconds,alertSeconds})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(std::abs(x)>=2147483000.||std::abs(z)>=2147483000.||radius<=0||radius>8||idleSeconds<=0||idleSeconds>3600||alertSeconds<=0||alertSeconds>3600)return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;const auto& intent=found->second;
 if(intent.state!=PlanningState::StationaryActive||intent.task||intent.home||!nativeInitialIdleBodyCurrent(s,intent))return -2;
 const auto body=intent.initialIdleBodyBinding;const auto& q=*body->source;
 if(q.anchorKind!=int(anchorKind)||q.anchor!=uint64_t(anchorId)||std::hypot(q.x-x,q.z-z)>radius)return -2;
 std::array<double,6> initial{double(q.mode),q.elapsed,q.remaining,double(q.rng),q.approachRetry,0};
 uint64_t sourceCycle=0;if(intent.idleCycle){
  if(!nativeIdleCycleCurrent(s,intent)||intent.idleCycle->next.status!=1||intent.idleCycle->next.state[0]!=1||double(intent.idleCycle->next.sequence)!=sourceSequence)return -2;
  initial=intent.idleCycle->next.state;sourceCycle=intent.idleCycle->binding->cycleSequence;
 }else if(double(body->bodySequence)!=sourceSequence)return -2;
 uint32_t rng=uint32_t(initial[3]);const double watchStart=initial[0]==1?initial[2]:0,watchRng=initial[0]==1?(idleCycleRandom(rng),double(rng)):initial[3],watchDuration=initial[0]==1?alertSeconds*(1+std::floor(watchRng/4294967296.*2)):initial[2],duration=watchStart+watchDuration;
 if(duration<0||duration>0&&s.effectiveTime+duration<=s.effectiveTime||!std::isfinite(s.effectiveTime+duration)||!std::isfinite(float(duration)))return -2;
 PendingBarrierProposal::IdleCycleDraft draft;draft.body=body;draft.previousCycle=intent.idleCycle;
 draft.header={1,actor,double(q.body),double(body->bodySequence),double(sourceCycle),s.effectiveTime,double(s.intentSequence),double(q.profile),double(q.workerProfile),anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds,initial[0],initial[1],initial[2],initial[3],initial[4],watchStart,watchRng,duration};
 if(!idleCycleDraftCurrent(s,draft))return -2;const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
 s.barrierProposal.kind=21;s.barrierProposal.idleCycle=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_stage(double actor,double session,double sourceSequence,double anchorKind,double anchorId,double x,double z,double radius,double idleSeconds,double alertSeconds){return stageIdleCycle(actor,session,sourceSequence,anchorKind,anchorId,x,z,radius,idleSeconds,alertSeconds);}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),21):-1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle?p.idleCycle->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=21||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=21||!p.idleCycle||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.idleCycle);clearWorldMutationProposal(p);const auto& h=old.header;
 const int result=stageIdleCycle(h[1],session,old.previousCycle?double(old.previousCycle->next.sequence):h[3],h[9],h[10],h[11],h[12],h[13],h[14],h[15]);if(result!=1)return result;
 auto& next=*p.idleCycle;bool same=old.body==next.body&&old.previousCycle==next.previousCycle;
 for(size_t i=0;i<h.size();i++)if(i!=5&&i!=6&&h[i]!=next.header[i])same=false;
 next.previous=NativeIdleCycleOrigin{h,uint64_t(ticket)};next.timeTranslation={1,ticket,double(p.ticket),h[5],h[5]+h[23],next.header[5],next.header[5]+next.header[23],same?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==21&&p.idleCycle&&session==double(p.session)&&ticket==double(p.ticket)&&p.idleCycle->timeTranslation[0]==1?p.idleCycle->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=21||!p.idleCycle||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,21);if(valid!=1)return valid;
 if(!idleCycleDraftCurrent(s,*p.idleCycle)){clearWorldMutationProposal(p);return -2;}
 const auto& d=*p.idleCycle;auto binding=std::make_shared<NativeIdleCycleBinding>();binding->actual={d.header,uint64_t(ticket)};binding->body=d.body;
 if(preparedTicket==ticket)binding->prepared=binding->actual;else if(d.previous&&preparedTicket==double(d.previous->ticket)&&d.timeTranslation[7]==1)binding->prepared=*d.previous;else return -9;
 const uint64_t actor=uint64_t(d.header[1]);clearWorldMutationProposal(p);auto& intent=s.activeIntents.at(actor);auto cycle=std::make_shared<NativeIdleCycle>();cycle->binding=binding;intent.idleCycle=cycle;
 binding->cycleSequence=emitIntentChange(s,intent);if(nativeIdleCycleFinished(*cycle,s.effectiveTime))publishNativeIdleCycleDecision(s,intent,chooseNativeIdleCycleNext(s,*cycle));s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,21);return 1;
}
static const NativeIdleCycle* currentIdleCycle(double actor){const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeIdleCycleCurrent(s,found->second)?found->second.idleCycle.get():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_binding_snapshot(double actor){auto& s=state();auto& out=s.idleCycleBindingResult;out.clear();const auto cycle=currentIdleCycle(actor);if(!cycle)return 0;const auto& b=*cycle->binding;out={1,double(b.cycleSequence),double(b.prepared.ticket),double(b.actual.ticket)};out.insert(out.end(),b.prepared.header.begin(),b.prepared.header.end());out.insert(out.end(),b.actual.header.begin(),b.actual.header.end());return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_binding_ptr(){return state().idleCycleBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_execution(double actor){auto& s=state();s.idleCycleExecutionResult.fill(0);const auto cycle=currentIdleCycle(actor);if(!cycle)return 0;const auto& b=*cycle->binding;const auto phase=sampleNativeIdleCycle(*cycle,s.effectiveTime);s.idleCycleExecutionResult={1,actor,b.actual.header[2],double(b.cycleSequence),s.effectiveTime,phase[0],phase[1],phase[2],phase[3],phase[4],nativeIdleCycleFinished(*cycle,s.effectiveTime)?1.:0.,double(cycle->next.status),double(cycle->next.sequence),nativeIdleCycleEnd(*cycle)};return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_execution_ptr(){return state().idleCycleExecutionResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_next(double actor){auto& s=state();s.idleCycleNextResult.fill(0);const auto cycle=currentIdleCycle(actor);if(!cycle||!cycle->next.status)return 0;const auto& n=cycle->next;s.idleCycleNextResult={1,actor,double(cycle->binding->cycleSequence),double(n.status),double(n.sequence),n.requestedAt,n.state[0],n.state[1],n.state[2],n.state[3],n.state[4],n.x,n.z,double(n.topology)};return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_cycle_next_ptr(){return state().idleCycleNextResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_next_points(double actor){const auto cycle=currentIdleCycle(actor);return cycle?int(cycle->next.points.size()/2):0;}
EMSCRIPTEN_KEEPALIVE const float* nav_idle_cycle_next_points_ptr(double actor){const auto cycle=currentIdleCycle(actor);return cycle?cycle->next.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_cycle_resolve_next(double actor,double session,double sequence){auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;if(!integer(actor)||!integer(sequence)||session!=double(s.session))return -1;const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!nativeIdleCycleCurrent(s,found->second)||double(found->second.idleCycle->binding->cycleSequence)!=sequence||!nativeIdleCycleFinished(*found->second.idleCycle,s.effectiveTime))return -2;auto& intent=found->second;if(intent.idleCycle->next.status==1)return 1;auto next=chooseNativeIdleCycleNext(s,*intent.idleCycle);const int result=next.status;publishNativeIdleCycleDecision(s,intent,std::move(next));return result;}
