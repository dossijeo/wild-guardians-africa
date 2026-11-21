// Initial stationary presentation residency on the existing body owner. This
// does not execute rest/watch policy, consume RNG or manufacture a task/route.
static bool completedIdleActionCurrent(const IntentState& s,const ActiveIntent& intent,const NativeTaskActionBinding& action,int repairTargetKind){
 if(intent.actionBinding.get()!=&action||!nativeTaskActionBodyCurrent(s,intent))return false;
 const auto& h=action.actual;
 const auto target=s.targets.find(intent.target),center=s.targets.find(s.workers.at(intent.actor).center);
 if(s.effectiveTime<h[16]||target==s.targets.end()||!target->second.active||
    center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0)return false;
 if(repairTargetKind)return h[9]==4&&target->second.kind==repairTargetKind&&target->second.status==0&&
  (repairTargetKind!=3||(target->second.damageKnown&&target->second.hp>0));
 return (h[9]==1||h[9]==2)&&(target->second.kind==1||target->second.kind==2);
}
static bool initialIdleBodySourceCurrent(const IntentState& s,const PendingBarrierProposal::InitialIdleBodyDraft& d){
 const auto& h=d.header;const auto found=s.activeIntents.find(uint64_t(h[1]));
 if(found==s.activeIntents.end())return false;
 const auto& intent=found->second;const auto& r=*d.source;
 const bool current=d.actionSource?completedIdleActionCurrent(s,intent,*d.actionSource,d.repairTargetKind)&&
   s.workers.at(intent.actor).center==r.center:nativeInitialIdleRequestBodyCurrent(s,intent)&&intent.initialIdleRequest==d.source;
 return current&&r.mode>=1&&r.mode<=2&&h[2]==double(r.body)&&h[3]==double(r.sequence)&&h[4]==r.at&&h[7]==double(r.profile);
}
static int stageInitialIdleBody(double actor,double session,double requestSequence,
    std::shared_ptr<const NativeInitialIdleResourceRequest> actionIdle={},std::shared_ptr<const NativeTaskActionBinding> action={},int repairTargetKind=0){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(requestSequence))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 const auto source=action?actionIdle:found->second.initialIdleRequest;
 if(!source||source->sequence!=uint64_t(requestSequence))return -2;
 PendingBarrierProposal::InitialIdleBodyDraft d;d.source=source;d.actionSource=action;d.repairTargetKind=repairTargetKind;
 d.header={1,actor,double(source->body),double(source->sequence),source->at,s.effectiveTime,double(s.intentSequence),double(source->profile)};
 if(!initialIdleBodySourceCurrent(s,d))return -2;
 const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
 auto& p=s.barrierProposal;p.kind=20;p.initialIdleBody=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_stage(double actor,double session,double requestSequence){return stageInitialIdleBody(actor,session,requestSequence);}
static int stageCompletedActionIdle(double actor,double session,double actionSequence,double profile,double anchorKind,double anchor,double rng,double remaining,int repairTargetKind){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(actionSequence)||!integer(profile,true)||profile>3||
    !integer(anchorKind)||anchorKind>2||!integer(anchor)||!integer(rng)||rng>4294967295.||
    !std::isfinite(remaining)||remaining<=0||remaining>3600)return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 const auto action=found->second.actionBinding;
 if(!action||action->actionSequence!=uint64_t(actionSequence)||!completedIdleActionCurrent(s,found->second,*action,repairTargetKind))return -2;
 const auto anchorTarget=s.targets.find(uint64_t(anchor));
 if(anchorTarget==s.targets.end()||!anchorTarget->second.active||
    (anchorKind==1?(anchorTarget->second.kind!=1&&anchorTarget->second.kind!=2):anchorTarget->second.kind!=4))return -2;
 const auto& h=action->actual;
 auto idle=std::make_shared<NativeInitialIdleResourceRequest>();
 idle->actor=uint64_t(actor);idle->session=s.session;idle->sequence=action->actionSequence;idle->at=h[16];
 idle->body=uint64_t(h[4]);idle->bodyFlags=action->bodyFlags;idle->profile=int(h[22]);
 idle->x=h[12];idle->z=h[13];idle->yaw=h[11];idle->radius=h[14];
 idle->runPhase=h[17];idle->walkPhase=h[18];idle->carryPhase=h[19];idle->runRemaining=h[20];
 idle->center=s.workers.at(idle->actor).center;idle->workerProfile=int(profile);
 idle->mode=1;idle->anchorKind=int(anchorKind);idle->anchor=uint64_t(anchor);idle->rng=uint32_t(rng);idle->remaining=remaining;
 return stageInitialIdleBody(actor,session,actionSequence,idle,action,repairTargetKind);
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_stage_watering(double actor,double session,double sequence,double profile,double anchorKind,double anchor,double rng,double remaining){
 return stageCompletedActionIdle(actor,session,sequence,profile,anchorKind,anchor,rng,remaining,0);
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_stage_center_repair(double actor,double session,double sequence,double profile,double anchorKind,double anchor,double rng,double remaining){
 return stageCompletedActionIdle(actor,session,sequence,profile,anchorKind,anchor,rng,remaining,4);
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_stage_wall_repair(double actor,double session,double sequence,double profile,double anchorKind,double anchor,double rng,double remaining){
 return stageCompletedActionIdle(actor,session,sequence,profile,anchorKind,anchor,rng,remaining,3);
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_snapshot(double session,double ticket){
 const auto& p=state().barrierProposal;if(!p.pending||p.kind!=20||!p.initialIdleBody)return -1;
 return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),20);
}
EMSCRIPTEN_KEEPALIVE const double* nav_initial_idle_body_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==20&&p.initialIdleBody?p.initialIdleBody->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_cancel(double session,double ticket){
 auto& p=state().barrierProposal;if(!p.pending||p.kind!=20||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=20||!p.initialIdleBody||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.initialIdleBody);clearWorldMutationProposal(p);
 const int result=stageInitialIdleBody(old.header[1],session,old.header[3],old.source,old.actionSource,old.repairTargetKind);if(result!=1)return result;
 auto& next=*p.initialIdleBody;bool same=old.source==next.source;
 for(size_t i=0;i<old.header.size();i++)if(i!=5&&i!=6&&old.header[i]!=next.header[i])same=false;
 next.previous=NativeInitialIdleBodyOrigin{old.header,uint64_t(ticket)};
 next.timeTranslation={1,ticket,double(p.ticket),old.header[5],old.header[5],next.header[5],next.header[5],same?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_initial_idle_body_proposal_time_translation_ptr(double session,double ticket){
 const auto& p=state().barrierProposal;return p.pending&&p.kind==20&&p.initialIdleBody&&session==double(p.session)&&ticket==double(p.ticket)&&p.initialIdleBody->timeTranslation[0]==1?p.initialIdleBody->timeTranslation.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=20||!p.initialIdleBody||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,20);if(valid!=1)return valid;
 if(!initialIdleBodySourceCurrent(s,*p.initialIdleBody)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 const auto& d=*p.initialIdleBody;auto binding=std::make_shared<NativeInitialIdleBodyBinding>();binding->source=d.source;binding->actionSource=d.actionSource;binding->repairTargetKind=d.repairTargetKind;binding->actual={d.header,uint64_t(ticket)};
 if(preparedTicket==ticket)binding->prepared=binding->actual;
 else if(d.previous&&preparedTicket==double(d.previous->ticket)&&d.timeTranslation[7]==1)binding->prepared=*d.previous;
 else return -9;
 const uint64_t actor=uint64_t(d.header[1]);clearWorldMutationProposal(s.barrierProposal);auto& intent=s.activeIntents.at(actor);
 if(binding->actionSource){releaseIntent(s,actor,PlanningState::Cancelled,false);intent.lease=false;}
 intent.initialIdleRequest.reset();intent.initialIdleBodyBinding=binding;intent.state=PlanningState::StationaryActive;
 auto& worker=s.workers.at(actor);worker.eligible=true;worker.actionActive=false;
 binding->bodySequence=emitIntentChange(s,intent);s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,20);return 1;
}
static const NativeInitialIdleBodyBinding* currentInitialIdleBodyBinding(double actor){
 const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeInitialIdleBodyCurrent(s,found->second)?found->second.initialIdleBodyBinding.get():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_binding_snapshot(double actor){
 auto& s=state();auto& out=s.initialIdleBodyBindingResult;out.clear();const auto b=currentInitialIdleBodyBinding(actor);if(!b)return 0;
 out={1,double(b->bodySequence),double(b->prepared.ticket),double(b->actual.ticket)};out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_initial_idle_body_binding_ptr(){return state().initialIdleBodyBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_binding_actors(){
 auto& s=state();auto& out=s.initialIdleBodyBindingResult;out.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.initialIdleBodyBinding){if(!nativeInitialIdleBodyCurrent(s,intent))return -1;actors.push_back(actor);}
 std::sort(actors.begin(),actors.end());for(auto actor:actors)out.push_back(double(actor));return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_source_snapshot(double actor,double ticket){
 auto& s=state();s.initialIdleRequestResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;if(p.pending&&p.kind==20&&p.initialIdleBody&&ticket==double(p.ticket)&&actor==p.initialIdleBody->header[1]&&initialIdleBodySourceCurrent(s,*p.initialIdleBody))return snapshotInitialIdleRequest(s,*p.initialIdleBody->source);return 0;}
 const auto binding=currentInitialIdleBodyBinding(actor);return binding?snapshotInitialIdleRequest(s,*binding->source):0;
}
static int snapshotInitialIdleAction(double actor,double ticket,int repairTargetKind){
 auto& s=state();s.taskActionBindingResult.clear();s.taskActionRestoreSourceResult.fill(0);
 if(!integer(actor)||!integer(ticket,true))return 0;
 const NativeTaskActionBinding* source=nullptr;
 if(ticket){
  const auto& p=s.barrierProposal;
  if(p.pending&&p.kind==20&&p.initialIdleBody&&ticket==double(p.ticket)&&actor==p.initialIdleBody->header[1]&&
     p.initialIdleBody->repairTargetKind==repairTargetKind&&initialIdleBodySourceCurrent(s,*p.initialIdleBody))source=p.initialIdleBody->actionSource.get();
 }else if(const auto binding=currentInitialIdleBodyBinding(actor);binding&&binding->repairTargetKind==repairTargetKind)source=binding->actionSource.get();
 if(!source)return 0;
 appendTaskActionBindingData(s,*source);
 if(source->restoredSource){const auto& h=source->actual;const auto& r=*source->restoredSource;
  s.taskActionRestoreSourceResult={1,h[1],h[2],h[3],double(s.session),double(r.requestSequence),h[8],r.initialElapsed};}
 return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_watering_source_snapshot(double actor,double ticket){return snapshotInitialIdleAction(actor,ticket,0);}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_center_repair_source_snapshot(double actor,double ticket){return snapshotInitialIdleAction(actor,ticket,4);}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_wall_repair_source_snapshot(double actor,double ticket){return snapshotInitialIdleAction(actor,ticket,3);}
