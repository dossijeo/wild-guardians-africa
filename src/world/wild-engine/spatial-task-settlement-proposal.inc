// A real Carry arrival hands its body to stationary availability or a pending
// genuine Home request. Neither disposition moves before route admission. No
// fabricated task, zero-length route, Home or resumable movement is created.
static bool taskSettlementSourceCurrent(IntentState& s,const PendingTaskSettlementDraft& d){
 const auto& h=d.header;const auto found=s.activeIntents.find(uint64_t(h[1]));
 if(found==s.activeIntents.end()||!nativeDeliveryBodyCurrent(s,found->second))return false;
 const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];
 return route.consequenceBinding==d.source&&route.executionPose[6]==1&&double(intent.assignmentSequence)==h[5]&&
  double(intent.slot)==h[7]&&double(intent.generation)==h[8]&&double(route.reservationBody)==h[2]&&
  double(intent.carriedTarget)==h[3]&&double(intent.target)==h[4]&&route.executionPose[0]==h[9]&&route.executionPose[1]==h[10]&&
  route.executionPose[4]==h[11]&&route.radius==h[12]&&route.executionPose[9]==h[13]&&route.executionPose[10]==h[14]&&
  route.executionPose[11]==h[15]&&route.executionPose[14]==h[16];
}
static int stageTaskSettlement(double actor,double session,double assignment,double village=0,double homeX=0,double homeZ=0){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(assignment)||!integer(village,true)||!coordinate(homeX)||!coordinate(homeZ)||(!village&&(homeX||homeZ)))return -1;
 const auto source=currentTaskConsequenceBinding(actor);if(!source||double(source->assignmentSequence)!=assignment)return -2;
 const auto& intent=s.activeIntents.at(uint64_t(actor));const auto& route=s.routeSlots[intent.slot];SpatialBodyView body;
 if(route.executionPose[6]!=1||!spatialReadBody(route.reservationBody,body))return -2;
 const auto cargoOwners=s.byTarget.find(intent.carriedTarget);if(cargoOwners!=s.byTarget.end()&&!cargoOwners->second.empty())return -2;
 // Releasing an arrived path must not incidentally revoke another mover whose
 // graphical stop has not been prepared by this consequence.
 bool conflicts=false;visitStoppedReservationConflicts(s,route.reservationBody,[](uint64_t){return false;},[&](uint64_t,double){conflicts=true;});if(conflicts)return -2;
 PendingTaskSettlementDraft d;d.source=route.consequenceBinding;d.sourceGates=route.gateReservations;
 d.header={1,actor,double(route.reservationBody),double(intent.carriedTarget),double(intent.target),assignment,double(s.intentSequence),
  double(intent.slot),double(intent.generation),route.executionPose[0],route.executionPose[1],route.executionPose[4],route.radius,
  route.executionPose[9],route.executionPose[10],route.executionPose[11],route.executionPose[14],s.effectiveTime,double(intent.profile),double(body.flags),source->actual.header[11],village,homeX,homeZ};
 if(!taskSettlementSourceCurrent(s,d))return -2;
 const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
 auto& p=s.barrierProposal;p.kind=17;p.settlement=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_stage(double actor,double session,double assignment,double village=0,double homeX=0,double homeZ=0){return stageTaskSettlement(actor,session,assignment);}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_home_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_stage_home(double actor,double session,double assignment,double village,double x,double z){if(!integer(village))return -1;return stageTaskSettlement(actor,session,assignment,village,x,z);}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_snapshot(double session,double ticket){
 const auto& p=state().barrierProposal;if(!p.pending||p.kind!=17||!p.settlement)return -1;
 return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),17);
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_settlement_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==17&&p.settlement?p.settlement->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_cancel(double session,double ticket){
 auto& p=state().barrierProposal;if(!p.pending||p.kind!=17||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=17||!p.settlement||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.settlement);clearWorldMutationProposal(p);
 const int result=stageTaskSettlement(old.header[1],session,old.header[5],old.header[21],old.header[22],old.header[23]);if(result!=1)return result;
 auto& next=*p.settlement;bool same=old.source==next.source&&old.sourceGates==next.sourceGates;
 for(size_t i=0;i<old.header.size();i++)if(i!=6&&i!=17&&old.header[i]!=next.header[i])same=false;
 next.previous=NativeTaskSettlementOrigin{old.header,uint64_t(ticket)};
 next.timeTranslation={1,ticket,double(p.ticket),old.header[17],old.header[17],next.header[17],next.header[17],same?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_settlement_proposal_time_translation_ptr(double session,double ticket){
 const auto& p=state().barrierProposal;return p.pending&&p.kind==17&&p.settlement&&session==double(p.session)&&ticket==double(p.ticket)&&p.settlement->timeTranslation[0]==1?p.settlement->timeTranslation.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=17||!p.settlement||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,17);if(valid!=1)return valid;
 if(!taskSettlementSourceCurrent(s,*p.settlement)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 const auto& d=*p.settlement;auto binding=std::make_shared<NativeTaskSettlementBinding>();binding->actual={d.header,uint64_t(ticket)};
 if(preparedTicket==ticket)binding->prepared=binding->actual;
 else if(d.previous&&preparedTicket==double(d.previous->ticket)&&d.timeTranslation[7]==1)binding->prepared=*d.previous;
 else return -9;
 binding->source=d.source;binding->sourceGates=d.sourceGates;const auto h=d.header;clearWorldMutationProposal(s.barrierProposal);
 const uint64_t actor=uint64_t(h[1]),crate=uint64_t(h[3]),center=uint64_t(h[4]);
 releaseIntent(s,actor,PlanningState::Cancelled,false);s.targets.erase(crate);
 auto& intent=s.activeIntents.at(actor);intent.state=PlanningState::StationaryActive;intent.home=h[21]!=0;intent.approachKnown=intent.home;intent.approachX=float(h[22]);intent.approachZ=float(h[23]);intent.delivery=false;intent.carriedTarget=0;intent.target=center;intent.lease=false;
 intent.settlementBinding=binding;s.byTarget[center].insert(actor);auto& worker=s.workers.at(actor);worker.eligible=!intent.home;worker.actionActive=false;
 binding->settlementSequence=emitIntentChange(s,intent);s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,17);return 1;
}
static const NativeTaskSettlementBinding* currentTaskSettlementBinding(double actor){
 const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));
 return found!=s.activeIntents.end()&&nativeSettlementBodyCurrent(s,found->second)?found->second.settlementBinding.get():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_binding_snapshot(double actor){
 auto& s=state();s.taskSettlementBindingResult.clear();const auto b=currentTaskSettlementBinding(actor);if(!b)return 0;
 auto& out=s.taskSettlementBindingResult;out={1,double(b->settlementSequence),double(b->prepared.ticket),double(b->actual.ticket)};
 out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_settlement_binding_ptr(){return state().taskSettlementBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_binding_actors(){
 auto& s=state();auto& out=s.taskSettlementBindingResult;out.clear();std::vector<uint64_t> actors;
 for(const auto& [actor,intent]:s.activeIntents)if(intent.settlementBinding){if(!nativeSettlementBodyCurrent(s,intent))return -1;actors.push_back(actor);}
 std::sort(actors.begin(),actors.end());for(auto actor:actors)out.push_back(double(actor));return int(actors.size());
}
static const NativeTaskConsequenceBinding* taskSettlementSource(double actor,double ticket,const std::vector<uint64_t>** gates=nullptr){
 const auto& s=state();if(!integer(actor)||!integer(ticket,true))return nullptr;
 if(ticket){const auto& p=s.barrierProposal;if(!p.pending||p.kind!=17||!p.settlement||ticket!=double(p.ticket)||actor!=p.settlement->header[1])return nullptr;if(gates)*gates=&p.settlement->sourceGates;return p.settlement->source.get();}
 const auto b=currentTaskSettlementBinding(actor);if(!b)return nullptr;if(gates)*gates=&b->sourceGates;return b->source.get();
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_source_snapshot(double actor,double ticket){
 auto& s=state();s.taskConsequenceBindingResult.clear();const std::vector<uint64_t>* gates=nullptr;const auto b=taskSettlementSource(actor,ticket,&gates);if(!b)return 0;
 auto& out=s.taskConsequenceBindingResult;out={1,double(b->assignmentSequence),double(b->prepared.ticket),double(b->actual.ticket)};
 out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());out.insert(out.end(),b->actual.effect.begin(),b->actual.effect.end());out.push_back(double(gates->size()));for(auto id:*gates)out.push_back(double(id));return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_action_source_snapshot(double actor,double ticket){auto& s=state();s.taskActionBindingResult.clear();const auto source=taskSettlementSource(actor,ticket);if(!source)return 0;appendTaskActionBindingData(s,*source->actual.source);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_settlement_action_source_restore(double actor,double ticket){
 auto& s=state();s.taskActionRestoreSourceResult.fill(0);const auto source=taskSettlementSource(actor,ticket);if(!source||!source->actual.source->restoredSource)return 0;
 const auto& b=*source->actual.source;const auto& h=b.actual;const auto& r=*b.restoredSource;s.taskActionRestoreSourceResult={1,h[1],h[2],h[3],double(s.session),double(r.requestSequence),h[8],r.initialElapsed};return 1;
}
