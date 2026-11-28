// A genuine executed Home endpoint can retire through the same conditioned
// mutation slot. Preparing never releases the body or its route. The result is
// a synchronous historical receipt, not another active intent/body registry.
static bool homeArrivalSourceCurrent(const IntentState& s,const PendingHomeArrivalDraft& d){
 const auto& h=d.header;const auto found=s.activeIntents.find(uint64_t(h[1]));
 if(found==s.activeIntents.end()||!nativeHomeBodyCurrent(s,found->second))return false;
 const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];const auto& pose=route.executionPose;
 return gateCrossingReleaseRetainsMotors(s,route)&&route.homeBinding==d.source&&pose[6]==1&&double(intent.assignmentSequence)==h[4]&&double(intent.slot)==h[6]&&double(intent.generation)==h[7]&&
  double(route.reservationBody)==h[2]&&pose[0]==h[8]&&pose[1]==h[9]&&pose[4]==h[10]&&route.radius==h[11]&&
  pose[9]==h[12]&&pose[10]==h[13]&&pose[11]==h[14]&&pose[14]==h[15]&&pose[0]==double(float(h[17]))&&pose[1]==double(float(h[18]));
}
static int stageHomeArrival(double actor,double session,double assignment){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(assignment))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!nativeHomeBodyCurrent(s,found->second))return -2;
 const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];const auto& pose=route.executionPose;
 if(double(intent.assignmentSequence)!=assignment||pose[6]!=1)return -2;
 const auto source=homeRouteSourceView(route.homeBinding->source.get(),route.homeBinding->requestSource.get());SpatialBodyView body;if(!spatialReadBody(route.reservationBody,body))return -2;
 PendingHomeArrivalDraft d;d.source=route.homeBinding;
 d.header={1,actor,double(route.reservationBody),double(source.village),assignment,double(s.intentSequence),double(intent.slot),double(intent.generation),
  pose[0],pose[1],pose[4],route.radius,pose[9],pose[10],pose[11],pose[14],s.effectiveTime,source.homeX,source.homeZ,double(intent.profile),double(body.flags),route.startTime,routeTimeAtDistance(route,route.distances.back()),double(d.source->actual.ticket)};
 if(!homeArrivalSourceCurrent(s,d))return -2;
 const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
 auto& p=s.barrierProposal;p.kind=19;p.homeArrival=std::move(d);s.homeArrivalResult.fill(0);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_version(){return 2;}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_stage(double actor,double session,double assignment){return stageHomeArrival(actor,session,assignment);}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;if(!p.pending||p.kind!=19||!p.homeArrival)return -1;return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),19);}
EMSCRIPTEN_KEEPALIVE const double* nav_home_arrival_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==19&&p.homeArrival?p.homeArrival->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=19||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=19||!p.homeArrival||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.homeArrival);clearWorldMutationProposal(p);const int result=stageHomeArrival(old.header[1],session,old.header[4]);if(result!=1)return result;
 auto& next=*p.homeArrival;bool same=old.source==next.source;for(size_t i=0;i<old.header.size();i++)if(i!=5&&i!=16&&old.header[i]!=next.header[i])same=false;
 next.previous=old.header;next.previousTicket=uint64_t(ticket);next.timeTranslation={1,ticket,double(p.ticket),old.header[16],old.header[16],next.header[16],next.header[16],same?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_arrival_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==19&&p.homeArrival&&session==double(p.session)&&ticket==double(p.ticket)&&p.homeArrival->timeTranslation[0]==1?p.homeArrival->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_arrival_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=19||!p.homeArrival||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,19);if(valid!=1)return valid;
 if(!homeArrivalSourceCurrent(s,*p.homeArrival)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 const auto& d=*p.homeArrival;std::array<double,24> prepared;
 if(preparedTicket==ticket)prepared=d.header;else if(d.previous&&preparedTicket==double(d.previousTicket)&&d.timeTranslation[7]==1)prepared=*d.previous;else return -9;
 const auto actual=d.header;
 const auto recovery=d.source->requestSource?d.source->requestSource->recoveryHit:0;
 clearWorldMutationProposal(s.barrierProposal);
 // The existing registry removal callback revokes this exact route, releases
 // its reservations/gates, unbinds the worker and removes its active intent.
 if(spatial_body_remove(actual[2])!=1)return -2;
 if(recovery&&s.restoredEncounterWorker&&s.restoredEncounterWorker->hit==recovery)s.restoredEncounterWorker.reset();
 if(recovery&&s.encounterRetreat&&s.encounterRetreat->hit==recovery){
  s.encounterRetreat.reset();
  s.homeEncounterImpact.reset();
 }
 auto& worker=s.workers.at(uint64_t(actual[1]));worker.body=0;worker.inactiveSequence=s.intentSequence;worker.x=actual[17];worker.z=actual[18];s.entityRevision++;auto& out=s.homeArrivalResult;out[0]=1;out[1]=double(s.intentSequence);out[2]=preparedTicket;out[3]=ticket;
 std::copy(prepared.begin(),prepared.end(),out.begin()+4);std::copy(actual.begin(),actual.end(),out.begin()+28);
 spatialRecordMotionResourceBoundary(session,ticket,time,19);return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_arrival_result_ptr(){return state().homeArrivalResult.data();}

// A semantic save may start with workers already inside their village. Declare
// that absence only with an empty physical domain before clock/execution
// admission. Resetting the intent index alone does not empty the body registry.
EMSCRIPTEN_KEEPALIVE int nav_home_inactive_restore_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_restore_home_inactive(double actor,double x,double z){
 auto& s=state();if(!integer(actor)||!std::isfinite(x)||!std::isfinite(z))return -1;
 const auto found=s.workers.find(uint64_t(actor));if(found==s.workers.end())return 0;
 auto& worker=found->second;
 if(s.causalClock||s.executionEnabled||s.bodyDomainActive||s.barrierProposal.pending||s.worldMutationPreview||spatial_body_count()!=0||
    !s.reservedBodies.empty()||!s.suspendedBodies.empty()||worker.eligible||worker.actionActive||worker.bodyBound||worker.body||
    worker.x!=x||worker.z!=z||s.activeIntents.count(uint64_t(actor)))return -2;
 if(worker.inactiveSequence)return 1;
 ActiveIntent absence;absence.actor=uint64_t(actor);absence.state=PlanningState::Cancelled;
 worker.inactiveSequence=emitIntentChange(s,absence);s.entityRevision++;return 1;
}

// Read the existing worker/intent records, not a historical completion map.
EMSCRIPTEN_KEEPALIVE int nav_intent_worker_inactive(double actor){
 const auto& s=state();if(!integer(actor))return 0;const auto w=s.workers.find(uint64_t(actor));
 return w!=s.workers.end()&&w->second.inactiveSequence&&!w->second.eligible&&!w->second.actionActive&&!w->second.bodyBound&&!w->second.body&&!s.activeIntents.count(uint64_t(actor))?1:0;
}

EMSCRIPTEN_KEEPALIVE double nav_intent_restore_refuge_return(double actor,double x,double z,double yaw,
 double run,double walk,double carry,double remaining){
 auto& s=state();
 for(double value:{x,z,yaw,run,walk,carry,remaining})if(!std::isfinite(value)||!std::isfinite(float(value)))return -1;
 if(run<0||walk<0||carry<0||remaining<0||!integer(actor))return -1;
 const int biome=spatial_world_biome();
 if((biome!=0&&biome!=1)||s.causalClock||s.executionEnabled||s.bodyDomainActive||s.proposalOpen||
    s.barrierProposal.pending||s.worldMutationPreview||spatial_body_count()!=0||s.restoredRefugeReturn.actor||
    !s.activeIntents.empty()||nav_intent_worker_inactive(actor)!=1)return -2;
 const auto& worker=s.workers.at(uint64_t(actor));
 if(worker.x!=x||worker.z!=z)return -2;
 s.restoredRefugeReturn={worker.id,worker.inactiveSequence,x,z,yaw,run,walk,carry,remaining};
 return double(worker.inactiveSequence);
}
