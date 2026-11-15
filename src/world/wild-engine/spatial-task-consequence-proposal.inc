// A completed action keeps its body until the same native proposal admits the
// consequence and its complete delivery route. No Home or dummy task is used.
static bool taskConsequenceSourceCurrent(const IntentState& s,const PendingTaskConsequenceDraft& draft){
 const auto found=s.activeIntents.find(draft.motion.route.actor);
 if(found==s.activeIntents.end()||!nativeTaskActionBodyCurrent(s,found->second)||found->second.actionBinding!=draft.source)return false;
 const auto& h=draft.source->actual;const auto& e=draft.effect;
 const auto target=s.targets.find(uint64_t(e[2])),center=s.targets.find(uint64_t(e[4]));
 const auto worker=s.workers.find(found->first);
 if(h[9]!=0||s.effectiveTime<h[16]||h[2]!=e[1]||h[3]!=e[2]||double(draft.source->actionSequence)!=e[7]||
    target==s.targets.end()||!target->second.active||(target->second.kind!=1&&target->second.kind!=2)||
    center==s.targets.end()||center->second.kind!=4||!center->second.active||center->second.status!=0||
    worker==s.workers.end()||double(worker->second.center)!=e[4]||s.targets.count(uint64_t(e[3]))||s.tasks.count(uint64_t(e[3]))||s.workers.count(uint64_t(e[3])))return false;
 // Other target leases require their own prepared stop participants. Until that
 // class is admitted, never revoke another moving actor as an incidental effect.
 const auto owners=s.byTarget.find(uint64_t(e[2]));
 if(owners!=s.byTarget.end())for(uint64_t actor:owners->second)if(actor!=found->first)return false;
 return true;
}
static int stageTaskConsequence(double actorId,double session,double actionSequence,double crateId,double centerId,double x,double z){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actorId)||session!=double(s.session)||!integer(actionSequence)||!integer(crateId)||!integer(centerId)||!coordinate(x)||!coordinate(z))return -1;
 const auto found=s.activeIntents.find(uint64_t(actorId));if(found==s.activeIntents.end()||!found->second.actionBinding)return -1;
 PendingTaskConsequenceDraft draft;draft.source=found->second.actionBinding;const auto& h=draft.source->actual;
 draft.motion.route.actor=uint64_t(actorId);draft.effect={1,h[2],h[3],crateId,centerId,x,z,actionSequence};
 if(!taskConsequenceSourceCurrent(s,draft))return -2;
 auto& motion=draft.motion;motion.body=uint64_t(h[4]);motion.slot=uint32_t(s.routeSlots.size());
 for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){motion.slot=i;break;}
 motion.generation=motion.slot<s.routeSlots.size()?s.routeSlots[motion.slot].generation:0;
 const int previous=lazy_selected_context();if(previous!=int(h[22]))spatial_select_nav_profile_index(int(h[22]));
 const int count=spatial_world_route_cached(float(h[12]),float(h[13]),float(x),float(z));
 int result=count<0?-6:count==0?0:1;
 if(result==1){const auto points=spatial_world_route_ptr();motion.route.points.assign(points,points+size_t(count)*2);
  // A consequence cannot trade the requested destination for a partial route.
  if(std::hypot(double(motion.route.points[count*2-2])-x,double(motion.route.points[count*2-1])-z)>.00001)result=0;
 }
 if(result==1){result=prepareRouteTiming(motion.route,uint64_t(actorId),h[12],h[13],s.effectiveTime,h[14],2,8,h[20],true);
  if(result==1){motion.route.motionOffset[2]=h[17];motion.route.motionOffset[3]=h[18];motion.route.motionOffset[4]=h[19];}
 }
 motion.topology=lazy_route_revision();if(previous!=int(h[22]))spatial_select_nav_profile_index(previous);
 if(result!=1)return result;
 SpatialBodyView body;if(!spatialReadBody(motion.body,body))return -3;
 s.reservationResult.fill(0);motion.gates=s.gates;result=proveGateRouteAdmission(s,found->second,motion.route,motion.body,body,motion.gates,motion.boundaries,false,draft.source.get());if(result!=1)return result;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=16;captureNativeMotionRows(motion);const auto& route=motion.route;
 motion.header={1,actorId,double(motion.body),double(motion.generation),double(nextGateRouteGeneration(motion.generation)),double(route.profile),double(route.motionFlags),route.radius,
  route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,route.distances.back()),route.distances.back(),route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
  double(route.points.size()/2),double(motion.rows.size()/16),double(motion.slot),actionSequence,h[16],double(p.intents)};
 p.consequence=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_stage(double actor,double session,double actionSequence,double crate,double center,double x,double z){return stageTaskConsequence(actor,session,actionSequence,crate,center,x,z);}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_snapshot(double session,double ticket){
 auto& s=state();if(!s.barrierProposal.consequence||s.barrierProposal.kind!=16)return -1;
 return takeWorldMutationBoundary(session,ticket,double(s.barrierProposal.intents),s.barrierProposal.at,double(s.barrierProposal.clock),16);
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_consequence_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==16&&p.consequence?p.consequence->motion.header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE const double* nav_task_consequence_proposal_effect_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==16&&p.consequence?p.consequence->effect.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_points(double session,double ticket){const int valid=nav_task_consequence_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.consequence->motion.route.points.size()/2):valid;}
EMSCRIPTEN_KEEPALIVE const float* nav_task_consequence_proposal_points_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==16&&p.consequence?p.consequence->motion.route.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_rows(double session,double ticket){const int valid=nav_task_consequence_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.consequence->motion.rows.size()/16):valid;}
EMSCRIPTEN_KEEPALIVE const double* nav_task_consequence_proposal_rows_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==16&&p.consequence?p.consequence->motion.rows.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_gates(double session,double ticket){const int valid=nav_task_consequence_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();s.gateResult.clear();for(uint64_t id:s.barrierProposal.consequence->motion.route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_gate(double session,double ticket,double gateId){
 const int valid=nav_task_consequence_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();const auto& d=s.barrierProposal.consequence->motion;
 if(!integer(gateId)||std::find(d.route.gateReservations.begin(),d.route.gateReservations.end(),uint64_t(gateId))==d.route.gateReservations.end())return -1;
 const auto found=d.gates.find(uint64_t(gateId));if(found==d.gates.end()||!found->second.mesh)return -2;
 s.gateResult.clear();return captureNativeGateRouteCurve(s,d.route,found->second);
}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=16||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=16||!p.consequence||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.consequence);clearWorldMutationProposal(p);const auto& e=old.effect;
 const int result=stageTaskConsequence(old.motion.header[1],session,e[7],e[3],e[4],e[5],e[6]);if(result!=1)return result;
 auto& next=*p.consequence;next.previous=NativeTaskConsequenceOrigin{old.motion.header,old.effect,old.source,uint64_t(ticket)};
 const bool source=old.source==next.source&&old.effect==next.effect;
 next.motion.timeTranslation={2,ticket,double(p.ticket),old.motion.header[10],old.motion.header[11],next.motion.header[10],next.motion.header[11],
  source&&sameNativeMotionDraft(old.motion,next.motion)?1.:0.,sameNativeMotionGates(s,old.motion,next.motion)?1.:0.,
  source&&old.motion.slot==next.motion.slot&&old.motion.generation==next.motion.generation&&sameNativeMotionDraft(old.motion,next.motion,true)?1.:0.,sameNativeMotionGates(s,old.motion,next.motion,true)?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_consequence_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==16&&p.consequence&&session==double(p.session)&&ticket==double(p.ticket)&&p.consequence->motion.timeTranslation[0]==2?p.consequence->motion.timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=16||!p.consequence||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,16);if(valid!=1)return valid;
 const auto& d=*p.consequence;const auto& m=d.motion;
 if(!taskConsequenceSourceCurrent(s,d)||m.slot>s.routeSlots.size()||m.slot<s.routeSlots.size()&&(s.routeSlots[m.slot].active||s.routeSlots[m.slot].generation!=m.generation)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeTaskConsequenceBinding>();binding->actual={m.header,d.effect,d.source,uint64_t(ticket)};
 if(preparedTicket==ticket)binding->prepared=binding->actual;
 else if(d.previous&&preparedTicket==double(d.previous->ticket)&&m.timeTranslation[9]==1&&m.timeTranslation[10]==1)binding->prepared=*d.previous;
 else return -9;
 auto draft=std::move(*s.barrierProposal.consequence);clearWorldMutationProposal(s.barrierProposal);
 const uint64_t actor=uint64_t(draft.motion.header[1]),task=uint64_t(draft.effect[1]),target=uint64_t(draft.effect[2]),crate=uint64_t(draft.effect[3]),center=uint64_t(draft.effect[4]);
 // From here every read set has passed; publish the semantic result and the
 // next physical owner synchronously, without a taskless/unreserved gap.
 releaseIntent(s,actor,PlanningState::Cancelled,false);s.tasks.erase(task);
 auto& crop=s.targets.at(target);removeCropCell(s,crop);crop.active=false;s.cropProtection.erase(target);s.cropRevision++;s.cropGroupsDirty=true;
 s.targets.emplace(crate,Target{crate,draft.motion.route.originX,draft.motion.route.originZ,false,0,0,0});
 auto& worker=s.workers.at(actor);worker.eligible=worker.actionActive=false;
 ActiveIntent delivery;delivery.actor=actor;delivery.target=center;delivery.profile=draft.motion.route.profile;delivery.lease=false;delivery.requiresResources=true;delivery.delivery=true;delivery.carriedTarget=crate;
 delivery.approachKnown=true;delivery.approachX=float(draft.effect[5]);delivery.approachZ=float(draft.effect[6]);s.activeIntents.insert_or_assign(actor,delivery);s.byTarget[center].insert(actor);
 if(draft.motion.slot==s.routeSlots.size())s.routeSlots.emplace_back();
 if(!s.executionEnabled){s.executionWorldStamp=executionWorldStamp();s.executionEnabled=s.bodyDomainActive=true;s.residencyPinRevision++;}
 auto& intent=s.activeIntents.at(actor);publishGateRouteAdmission(s,intent,draft.motion.slot,draft.motion.route,draft.motion.body,draft.motion.gates,draft.motion.boundaries);
 binding->assignmentSequence=intent.assignmentSequence;s.routeSlots[intent.slot].consequenceBinding=std::move(binding);s.entityRevision++;
 spatialRecordMotionResourceBoundary(session,ticket,time,16);return 1;
}
static const NativeTaskConsequenceBinding* currentTaskConsequenceBinding(double actor){
 auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));
 if(found==s.activeIntents.end()||!nativeDeliveryBodyCurrent(s,found->second))return nullptr;
 const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];const auto& binding=route.consequenceBinding;
 return route.active&&route.reserved&&route.hasExecution&&binding&&executionBindingCoherent(s,route.reservationBody,intent.slot)&&
  route.generation==uint32_t(binding->actual.header[4])&&route.reservationBody==uint64_t(binding->actual.header[2])&&
  intent.carriedTarget==uint64_t(binding->actual.effect[3])&&intent.target==uint64_t(binding->actual.effect[4])&&intent.assignmentSequence==binding->assignmentSequence?binding.get():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_binding_snapshot(double actor){
 auto& s=state();s.taskConsequenceBindingResult.clear();const auto b=currentTaskConsequenceBinding(actor);if(!b)return 0;
 auto& out=s.taskConsequenceBindingResult;out={1,double(b->assignmentSequence),double(b->prepared.ticket),double(b->actual.ticket)};
 out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());out.insert(out.end(),b->actual.effect.begin(),b->actual.effect.end());
 const auto& route=s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot];out.push_back(double(route.gateReservations.size()));for(uint64_t gate:route.gateReservations)out.push_back(double(gate));return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_task_consequence_binding_ptr(){return state().taskConsequenceBindingResult.data();}
static const NativeTaskActionBinding* taskConsequenceSource(double actor,double ticket){
 auto& s=state();if(!integer(actor)||!integer(ticket,true))return nullptr;
 if(ticket){const auto& p=s.barrierProposal;return p.pending&&p.kind==16&&p.consequence&&ticket==double(p.ticket)&&actor==p.consequence->motion.header[1]?p.consequence->source.get():nullptr;}
 const auto binding=currentTaskConsequenceBinding(actor);return binding?binding->actual.source.get():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_source_snapshot(double actor,double ticket){
 auto& s=state();s.taskActionBindingResult.clear();const auto source=taskConsequenceSource(actor,ticket);if(!source)return 0;appendTaskActionBindingData(s,*source);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_task_consequence_source_restore(double actor,double ticket){
 auto& s=state();s.taskActionRestoreSourceResult.fill(0);const auto source=taskConsequenceSource(actor,ticket);if(!source||!source->restoredSource)return 0;
 const auto& h=source->actual;const auto& r=*source->restoredSource;s.taskActionRestoreSourceResult={1,h[1],h[2],h[3],double(s.session),double(r.requestSequence),h[8],r.initialElapsed};return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_delivery_execution(double actor){
 auto& s=state();s.deliveryExecutionResult.fill(0);const auto b=currentTaskConsequenceBinding(actor);if(!b)return 0;
 const auto& intent=s.activeIntents.at(uint64_t(actor));const auto& route=s.routeSlots[intent.slot];
 const auto crate=s.targets.find(intent.carriedTarget),center=s.targets.find(intent.target);
 if(crate==s.targets.end()||center==s.targets.end()||!center->second.active||center->second.status!=0||crate->second.x!=route.executionPose[0]||crate->second.z!=route.executionPose[1])return -1;
 const std::array<double,12> header={1,actor,double(route.reservationBody),double(intent.carriedTarget),double(intent.target),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),s.effectiveTime,b->actual.effect[1],b->actual.effect[2]};
 std::copy(header.begin(),header.end(),s.deliveryExecutionResult.begin());std::copy(route.executionPose.begin(),route.executionPose.end(),s.deliveryExecutionResult.begin()+12);return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_delivery_execution_ptr(){return state().deliveryExecutionResult.data();}
