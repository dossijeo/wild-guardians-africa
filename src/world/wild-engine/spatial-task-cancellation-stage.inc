// Source phase: 6 pending restored action, 25 acquired stop, 14 endpoint, 15 acquired action.
// Caller supplies semantic Idle policy; physical identity/pose come from WASM.
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_proposal_stage_cancelled_task(double actor,double session,double phase,
    double sequence,double generation,double profile,double anchorKind,double anchor,double rng,double remaining){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||(phase!=6&&phase!=14&&phase!=15&&phase!=25)||!integer(sequence)||
    !integer(generation,true)||generation>UINT32_MAX||!integer(profile,true)||profile>3||
    !integer(anchorKind)||anchorKind>2||!integer(anchor)||!integer(rng,true)||rng>4294967295.||
    !std::isfinite(remaining)||remaining<=0||remaining>3600)return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 auto source=std::make_shared<NativeTaskCancellationSource>();
 if(!captureTaskCancellationSource(s,found->second,*source))return -2;
 const auto& q=source->values;if(q[1]!=phase||q[6]!=sequence||q[8]!=generation)return -2;
 const auto target=s.targets.find(uint64_t(anchor));const auto worker=s.workers.find(uint64_t(actor));
 if(target==s.targets.end()||!target->second.active||worker==s.workers.end()||
    (anchorKind==1?(target->second.kind!=1&&target->second.kind!=2):target->second.kind!=4||target->second.status!=0))return -2;
 auto idle=std::make_shared<NativeInitialIdleResourceRequest>();
 idle->actor=uint64_t(actor);idle->session=s.session;idle->sequence=uint64_t(sequence);idle->at=s.effectiveTime;
 idle->body=uint64_t(q[9]);idle->bodyFlags=int(q[19]);idle->profile=found->second.profile;
 idle->x=q[11];idle->z=q[12];idle->yaw=q[13];idle->radius=q[14];idle->runPhase=q[15];idle->walkPhase=q[16];idle->carryPhase=q[17];idle->runRemaining=q[18];
 idle->center=worker->second.center;idle->workerProfile=int(profile);idle->mode=1;idle->anchorKind=int(anchorKind);idle->anchor=uint64_t(anchor);idle->rng=uint32_t(rng);idle->remaining=remaining;
 return stageInitialIdleBody(actor,session,sequence,idle,{},0,source);
}
EMSCRIPTEN_KEEPALIVE int nav_initial_idle_body_cancellation_source_snapshot(double actor,double ticket){
 auto& s=state();s.taskCancellationResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=20||ticket!=double(p.ticket)||!p.initialIdleBody||p.initialIdleBody->header[1]!=actor||
     !p.initialIdleBody->cancellationSource||!initialIdleBodySourceCurrent(s,*p.initialIdleBody))return 0;
  s.taskCancellationResult=p.initialIdleBody->cancellationSource->values;return 1;
 }
 const auto found=s.activeIntents.find(uint64_t(actor));
 if(found==s.activeIntents.end()||!nativeInitialIdleBodyCurrent(s,found->second)||!found->second.initialIdleBodyBinding->cancellationSource)return 0;
 s.taskCancellationResult=found->second.initialIdleBodyBinding->cancellationSource->values;return 1;
}
