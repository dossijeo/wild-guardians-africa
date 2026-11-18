// Prepared ambient walking uses the existing route slot, reservation proof,
// phase kernel and body registry. Choosing a path alone never moves the body.
static bool idleStrollSourceCurrent(const IntentState& s,const PendingNativeMotionDraft& d){
 const auto found=s.activeIntents.find(d.route.actor);if(found==s.activeIntents.end())return false;
 if(d.strollFarmSource){
  const auto& m=d.idleStrollSemantic;const auto source=arrivedFarmIdleCycleSource(s,found->second,uint64_t(d.header[21]),int(m[10]),uint64_t(m[11]),uint32_t(m[15]),m[17]);
  std::array<double,24> h{};h[9]=m[10];h[10]=m[11];h[11]=m[12];h[12]=m[13];
  return source&&d.strollFarmPose&&s.routeSlots[found->second.slot].farmArrivalBinding==d.strollFarmSource&&idleCycleBodySourceData(*source)==idleCycleBodySourceData(*d.strollFarmPose)&&idleCycleAnchorCurrent(s,h);
 }
 if(d.strollRequestSource){const auto& r=*d.strollRequestSource;return found->second.strollRequest==d.strollRequestSource&&nativeIdleStrollRequestBodyCurrent(s,found->second)&&double(r.sequence)==d.header[21]&&r.at==d.header[22]&&d.idleStrollSemantic[1]==0;}
 if(!nativeIdleCycleCurrent(s,found->second)||found->second.idleCycle!=d.idleCycleSource)return false;
 const auto& cycle=*d.idleCycleSource;const auto& next=cycle.next;
 return idleCycleAnchorCurrent(s,cycle.binding->actual.header)&&nativeIdleCycleFinished(cycle,s.effectiveTime)&&next.status==1&&next.state[0]==3&&
  double(cycle.binding->cycleSequence)==d.idleStrollSemantic[1]&&double(next.sequence)==d.header[21]&&
  next.requestedAt==d.header[22]&&next.x==d.idleStrollSemantic[18]&&next.z==d.idleStrollSemantic[19]&&next.state[3]==d.idleStrollSemantic[15];
}
static int stageIdleStroll(double actor,double session,double sourceSequence,const std::optional<NativeIdleCycleBodySource>& farm=std::nullopt,const std::array<double,4>& farmAnchor={}){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 PendingNativeMotionDraft d;NativeIdleCycleBodySource q;std::array<double,24> h{};NativeIdleCycleDecision restoredNext;const NativeIdleCycleDecision* nextSource=nullptr;uint64_t sourceCycle=0;
 if(farm){
  const auto source=arrivedFarmIdleCycleSource(s,found->second,uint64_t(sourceSequence),farm->anchorKind,farm->anchor,uint32_t(farm->initial[3]),farm->initial[2]/2);
  if(!source||idleCycleBodySourceData(*source)!=idleCycleBodySourceData(*farm)||std::hypot(source->x-farmAnchor[0],source->z-farmAnchor[1])<=farmAnchor[2])return -2;
  q=*source;d.strollFarmPose=q;d.strollFarmSource=s.routeSlots[found->second.slot].farmArrivalBinding;
  h[9]=q.anchorKind;h[10]=double(q.anchor);h[11]=farmAnchor[0];h[12]=farmAnchor[1];h[13]=farmAnchor[2];h[14]=farmAnchor[3];
  if(!idleCycleAnchorCurrent(s,h))return -2;
  restoredNext.sequence=q.sequence;restoredNext.requestedAt=q.at;restoredNext.x=farmAnchor[0];restoredNext.z=farmAnchor[1];restoredNext.state={3,0,q.initial[2],q.initial[3],1,0};nextSource=&restoredNext;
 }else if(found->second.strollRequest){
  if(!nativeIdleStrollRequestBodyCurrent(s,found->second)||double(found->second.strollRequest->sequence)!=sourceSequence)return -2;
  d.strollRequestSource=found->second.strollRequest;const auto& r=*d.strollRequestSource;static_cast<NativeWorkerPoseResourceRequest&>(q)=r;q.center=r.center;q.workerProfile=r.workerProfile;
  h[9]=r.anchorKind;h[10]=double(r.anchor);h[11]=r.anchorX;h[12]=r.anchorZ;h[13]=r.anchorRadius;h[14]=r.idleSeconds;
  restoredNext.sequence=r.sequence;restoredNext.requestedAt=r.at;restoredNext.x=r.destinationX;restoredNext.z=r.destinationZ;restoredNext.state={3,0,0,double(r.rng),r.approachRetry,0};nextSource=&restoredNext;
 }else{
  if(!nativeIdleCycleCurrent(s,found->second))return -2;d.idleCycleSource=found->second.idleCycle;const auto& cycle=*d.idleCycleSource;const auto& next=cycle.next;nextSource=&next;
  if(!idleCycleAnchorCurrent(s,cycle.binding->actual.header)||!nativeIdleCycleFinished(cycle,s.effectiveTime)||next.status!=1||next.state[0]!=3||double(next.sequence)!=sourceSequence)return -2;
  q=cycle.binding->source;h=cycle.binding->actual.header;sourceCycle=cycle.binding->cycleSequence;
 }
 const auto& next=*nextSource;
 d.body=q.body;d.slot=uint32_t(s.routeSlots.size());for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){d.slot=i;break;}
 d.generation=d.slot<s.routeSlots.size()?s.routeSlots[d.slot].generation:0;
 const int previous=lazy_selected_context();if(previous!=q.profile)spatial_select_nav_profile_index(q.profile);
 int result=1;
 // Like NavigationAgent3D's query cache, a map revision invalidates the
 // derived path, not the already selected target or cosmetic RNG stream.
 if(next.topology==lazy_route_revision())d.route.points=next.points;
 else{const int count=spatial_world_route_cached(float(q.x),float(q.z),float(next.x),float(next.z));result=count<0?-6:count==0?0:1;if(result==1){const float* points=spatial_world_route_ptr();d.route.points.assign(points,points+size_t(count)*2);}}
 if(result==1){
  if(d.route.points.empty()||d.route.points[d.route.points.size()-2]!=float(next.x)||d.route.points.back()!=float(next.z))result=0;
  for(size_t i=0;!d.strollFarmSource&&result==1&&i<d.route.points.size();i+=2)if(std::hypot(double(d.route.points[i])-h[11],double(d.route.points[i+1])-h[12])>h[13])result=0;
 }
 if(result==1){result=prepareRouteTiming(d.route,uint64_t(actor),q.x,q.z,s.effectiveTime,q.radius,2,0,q.runRemaining,true);if(result==1){d.route.motionOffset[2]=q.runPhase;d.route.motionOffset[3]=q.walkPhase;d.route.motionOffset[4]=q.carryPhase;}}
 d.topology=lazy_route_revision();if(previous!=q.profile)spatial_select_nav_profile_index(previous);if(result!=1)return result;
 SpatialBodyView body;if(!spatialReadBody(d.body,body))return -3;d.gates=s.gates;s.reservationResult.fill(0);
 result=proveGateRouteAdmission(s,found->second,d.route,d.body,body,d.gates,d.boundaries,false,nullptr,nullptr,nullptr,d.idleCycleSource?d.idleCycleSource->binding->body.get():nullptr,d.idleCycleSource?d.idleCycleSource->binding.get():nullptr,d.strollRequestSource.get());if(result!=1)return result;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=22;captureNativeMotionRows(d);const auto& route=d.route;
 d.header={1,actor,double(d.body),double(d.generation),double(nextGateRouteGeneration(d.generation)),double(route.profile),double(route.motionFlags),route.radius,
  route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,route.distances.back()),route.distances.back(),route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
  double(route.points.size()/2),double(d.rows.size()/16),double(d.slot),sourceSequence,next.requestedAt,double(p.intents)};
 d.idleStrollSemantic={1,double(sourceCycle),double(q.workerProfile),double(q.center),double(q.bodyFlags),q.yaw,q.runPhase,q.walkPhase,q.carryPhase,q.runRemaining,h[9],h[10],h[11],h[12],h[13],next.state[3],next.state[4],h[14],next.x,next.z};
 p.idleStroll=std::move(d);return 1;
}
// Live approach is an existing22 draft with an actual23 origin. It never
// registers a cold/restored WALK or consumes a private random draw.
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_farm_proposal_stage(double actor,double session,double sourceSequence,double anchorKind,double anchor,double x,double z,double radius,double idleSeconds,double rng){
 if(!integer(actor)||!integer(sourceSequence)||session!=double(state().session)||!integer(anchorKind)||anchorKind>2||!integer(anchor)||!integer(rng)||rng>4294967295.)return -1;
 for(double v:{x,z,radius,idleSeconds})if(!std::isfinite(v)||!std::isfinite(float(v)))return -1;
 if(std::abs(x)>=2147483000.||std::abs(z)>=2147483000.||radius<=0||radius>8||idleSeconds<=0||idleSeconds>3600)return -1;
 const auto found=state().activeIntents.find(uint64_t(actor));if(found==state().activeIntents.end())return -2;
 const auto q=arrivedFarmIdleCycleSource(state(),found->second,uint64_t(sourceSequence),int(anchorKind),uint64_t(anchor),uint32_t(rng),idleSeconds);if(!q)return -2;
 if(anchorKind==2){const auto& r=*state().routeSlots[found->second.slot].farmArrivalBinding->requestSource;if(anchor!=double(r.center)||x!=r.targetX||z!=r.targetZ)return -2;}
 return stageIdleStroll(actor,session,sourceSequence,q,{x,z,radius,idleSeconds});
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_farm_source_snapshot(double actor,double ticket){
 auto& s=state();s.idleCycleSourceResult.fill(0);if(!integer(actor)||!integer(ticket,true))return 0;
 if(ticket){const auto& p=s.barrierProposal;if(!p.pending||p.kind!=22||!p.idleStroll||double(p.ticket)!=ticket||p.idleStroll->header[1]!=actor||!p.idleStroll->strollFarmPose||!idleStrollSourceCurrent(s,*p.idleStroll))return 0;s.idleCycleSourceResult=idleCycleBodySourceData(*p.idleStroll->strollFarmPose);return 1;}
 const auto active=currentIdleStroll(actor),b=active?active:currentHeldIdleStroll(actor);if(!b||!b->farmSource)return 0;s.idleCycleSourceResult=idleCycleBodySourceData(*b->farmSource);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_stage(double actor,double session,double sourceSequence){return stageIdleStroll(actor,session,sourceSequence);}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),22):-1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll?p.idleStroll->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_proposal_semantic_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll?p.idleStroll->idleStrollSemantic.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_points(double session,double ticket){const int valid=nav_idle_stroll_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.idleStroll->route.points.size()/2):valid;}
EMSCRIPTEN_KEEPALIVE const float* nav_idle_stroll_proposal_points_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll?p.idleStroll->route.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_rows(double session,double ticket){const int valid=nav_idle_stroll_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.idleStroll->rows.size()/16):valid;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_proposal_rows_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll?p.idleStroll->rows.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_gates(double session,double ticket){const int valid=nav_idle_stroll_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();s.gateResult.clear();for(auto id:s.barrierProposal.idleStroll->route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_gate(double session,double ticket,double gateId){
 const int valid=nav_idle_stroll_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();const auto& d=*s.barrierProposal.idleStroll;
 if(!integer(gateId)||std::find(d.route.gateReservations.begin(),d.route.gateReservations.end(),uint64_t(gateId))==d.route.gateReservations.end())return -1;
 const auto gate=d.gates.find(uint64_t(gateId));if(gate==d.gates.end()||!gate->second.mesh)return -2;s.gateResult.clear();return captureNativeGateRouteCurve(s,d.route,gate->second);
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=22||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=22||!p.idleStroll||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.idleStroll);clearWorldMutationProposal(p);const int result=stageIdleStroll(old.header[1],session,old.header[21],old.strollFarmPose,{old.idleStrollSemantic[12],old.idleStrollSemantic[13],old.idleStrollSemantic[14],old.idleStrollSemantic[17]});if(result!=1)return result;
 auto& next=*p.idleStroll;next.previousStroll=NativeIdleStrollOrigin{old.header,uint64_t(ticket)};const bool same=old.idleCycleSource==next.idleCycleSource&&old.strollRequestSource==next.strollRequestSource&&old.strollFarmSource==next.strollFarmSource&&old.idleStrollSemantic==next.idleStrollSemantic&&old.slot==next.slot&&old.generation==next.generation;
 next.timeTranslation={2,ticket,double(p.ticket),old.header[10],old.header[11],next.header[10],next.header[11],same&&sameNativeMotionDraft(old,next)?1.:0.,sameNativeMotionGates(s,old,next)?1.:0.,same&&sameNativeMotionDraft(old,next,true)?1.:0.,sameNativeMotionGates(s,old,next,true)?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==22&&p.idleStroll&&session==double(p.session)&&ticket==double(p.ticket)&&p.idleStroll->timeTranslation[0]==2?p.idleStroll->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=22||!p.idleStroll||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,22);if(valid!=1)return valid;const auto& d=*p.idleStroll;
 if(!idleStrollSourceCurrent(s,d)||d.slot>s.routeSlots.size()||d.slot<s.routeSlots.size()&&(s.routeSlots[d.slot].active||s.routeSlots[d.slot].generation!=d.generation)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeIdleStrollBinding>();binding->actual={d.header,uint64_t(ticket)};binding->semantic=d.idleStrollSemantic;binding->requestSource=d.strollRequestSource;binding->farmSource=d.strollFarmPose;
 if(preparedTicket==ticket)binding->prepared=binding->actual;else if(d.previousStroll&&preparedTicket==double(d.previousStroll->ticket)&&d.timeTranslation[9]==1&&d.timeTranslation[10]==1)binding->prepared=*d.previousStroll;else return -9;
 auto draft=std::move(*s.barrierProposal.idleStroll);clearWorldMutationProposal(s.barrierProposal);auto& intent=s.activeIntents.at(draft.route.actor);
 if(draft.slot==s.routeSlots.size())s.routeSlots.emplace_back();publishGateRouteAdmission(s,intent,draft.slot,draft.route,draft.body,draft.gates,draft.boundaries);
 binding->assignmentSequence=intent.assignmentSequence;s.routeSlots[intent.slot].idleStrollBinding=std::move(binding);s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,22);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_binding_snapshot(double actor){auto& s=state();auto& out=s.idleStrollBindingResult;out.clear();const auto b=currentIdleStroll(actor);if(!b)return 0;out={1,double(b->assignmentSequence),double(b->prepared.ticket),double(b->actual.ticket)};out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());out.insert(out.end(),b->semantic.begin(),b->semantic.end());return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_binding_ptr(){return state().idleStrollBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_binding_actors(){auto& s=state();auto& out=s.idleStrollBindingResult;out.clear();std::vector<uint64_t> actors;for(const auto& [actor,intent]:s.activeIntents)if(intent.state==PlanningState::RouteActive&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].idleStrollBinding){if(!currentIdleStroll(double(actor)))return -1;actors.push_back(actor);}std::sort(actors.begin(),actors.end());for(auto id:actors)out.push_back(double(id));return int(actors.size());}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_binding_gates(double actor){auto& s=state();s.gateResult.clear();if(!currentIdleStroll(actor))return -1;for(auto id:s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot].gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
static int idleStrollExecutionSnapshot(double actor,bool held){
 auto& s=state();auto& out=s.idleStrollExecutionResult;out.fill(0);const auto b=held?currentHeldIdleStroll(actor):currentIdleStroll(actor);if(!b)return 0;
 const auto& intent=s.activeIntents.at(uint64_t(actor));const auto& route=s.routeSlots[intent.slot];const auto& h=b->actual.header;const auto& m=b->semantic;
 const std::array<double,12> header={1,actor,double(route.reservationBody),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),s.effectiveTime,m[1],h[21],m[3],m[2]};
 std::copy(header.begin(),header.end(),out.begin());std::copy(route.executionPose.begin(),route.executionPose.end(),out.begin()+12);
 if(held){out[19]=route.suspendedAt;out[27]=out[28]=0;out[29]=2;}
 const double age=std::clamp((held?route.suspendedAt:s.effectiveTime)-h[10],0.,h[11]-h[10]),retry=std::max(0.,m[16]-age);
 const std::array<double,6> phase={3,0,b->farmSource?b->farmSource->initial[2]:0,m[15],retry,age};std::copy(phase.begin(),phase.end(),out.begin()+30);
 // Pure original cancelWalk blueprint, observable only after actual arrival.
 // It has no new intent sequence/permission and cannot start resting by itself.
 if(route.executionPose[6]==1){const auto rest=idleStrollRestState(*b,s.effectiveTime);std::copy(rest.begin(),rest.end(),out.begin()+36);}
 return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_execution(double actor){return idleStrollExecutionSnapshot(actor,false);}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_held_execution(double actor){return idleStrollExecutionSnapshot(actor,true);}
EMSCRIPTEN_KEEPALIVE int nav_idle_stroll_held_source_snapshot(double actor){
 auto& out=state().idleStrollBindingResult;out.clear();const auto b=currentHeldIdleStroll(actor);if(!b)return 0;
 // Actual source metadata only, never a reconstructed graphical attestation.
 out={1,double(b->assignmentSequence),double(b->actual.ticket)};out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());out.insert(out.end(),b->semantic.begin(),b->semantic.end());return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_execution_ptr(){return state().idleStrollExecutionResult.data();}
