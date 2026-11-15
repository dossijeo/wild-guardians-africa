// Genuine route-only Home from an actually settled returning worker. The
// existing stationary intent retains its body until this complete candidate
// passes the common native admission. No task, suspension or resume is made.
static bool homeRouteSourceCurrent(const IntentState& s,const PendingNativeMotionDraft& d){
 const auto found=s.activeIntents.find(d.route.actor);
 return found!=s.activeIntents.end()&&nativeSettlementBodyCurrent(s,found->second)&&found->second.home&&
  found->second.settlementBinding==d.stationarySource&&d.stationarySource->actual.header[21]&&
  d.stationarySource->settlementSequence==uint64_t(d.header[21]);
}
static int stageHomeRoute(double actor,double session,double settlementSequence){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(settlementSequence))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));
 if(found==s.activeIntents.end()||!found->second.home||!nativeSettlementBodyCurrent(s,found->second))return -2;
 PendingNativeMotionDraft d;d.stationarySource=found->second.settlementBinding;
 if(double(d.stationarySource->settlementSequence)!=settlementSequence)return -2;
 const auto& h=d.stationarySource->actual.header;if(!h[21])return -2;
 d.body=uint64_t(h[2]);d.slot=uint32_t(s.routeSlots.size());
 for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){d.slot=i;break;}
 d.generation=d.slot<s.routeSlots.size()?s.routeSlots[d.slot].generation:0;
 const int previous=lazy_selected_context();if(previous!=int(h[18]))spatial_select_nav_profile_index(int(h[18]));
 const int count=spatial_world_route_cached(float(h[9]),float(h[10]),float(h[22]),float(h[23]));
 int result=count<0?-6:count==0?0:1;
 if(result==1){const float* points=spatial_world_route_ptr();d.route.points.assign(points,points+size_t(count)*2);
  if(d.route.points[size_t(count)*2-2]!=float(h[22])||d.route.points.back()!=float(h[23]))result=0;
 }
 if(result==1){result=prepareRouteTiming(d.route,uint64_t(actor),h[9],h[10],s.effectiveTime,h[12],2,0,h[16],true);
  if(result==1){d.route.motionOffset[2]=h[13];d.route.motionOffset[3]=h[14];d.route.motionOffset[4]=h[15];}
 }
 d.topology=lazy_route_revision();if(previous!=int(h[18]))spatial_select_nav_profile_index(previous);
 if(result!=1)return result;
 SpatialBodyView body;if(!spatialReadBody(d.body,body))return -3;
 s.reservationResult.fill(0);d.gates=s.gates;
 result=proveGateRouteAdmission(s,found->second,d.route,d.body,body,d.gates,d.boundaries,false,nullptr,d.stationarySource.get());if(result!=1)return result;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=18;captureNativeMotionRows(d);const auto& route=d.route;
 d.header={1,actor,double(d.body),double(d.generation),double(nextGateRouteGeneration(d.generation)),double(route.profile),double(route.motionFlags),route.radius,
  route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,route.distances.back()),route.distances.back(),route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
  double(route.points.size()/2),double(d.rows.size()/16),double(d.slot),settlementSequence,h[17],double(p.intents)};
 p.home=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_stage(double actor,double session,double settlementSequence){return stageHomeRoute(actor,session,settlementSequence);}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;if(!p.pending||p.kind!=18||!p.home)return -1;return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),18);}
EMSCRIPTEN_KEEPALIVE const double* nav_home_route_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==18&&p.home?p.home->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_points(double session,double ticket){const int valid=nav_home_route_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.home->route.points.size()/2):valid;}
EMSCRIPTEN_KEEPALIVE const float* nav_home_route_proposal_points_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==18&&p.home?p.home->route.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_rows(double session,double ticket){const int valid=nav_home_route_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.home->rows.size()/16):valid;}
EMSCRIPTEN_KEEPALIVE const double* nav_home_route_proposal_rows_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==18&&p.home?p.home->rows.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_gates(double session,double ticket){const int valid=nav_home_route_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();s.gateResult.clear();for(uint64_t id:s.barrierProposal.home->route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_gate(double session,double ticket,double gateId){
 const int valid=nav_home_route_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();const auto& d=*s.barrierProposal.home;
 if(!integer(gateId)||std::find(d.route.gateReservations.begin(),d.route.gateReservations.end(),uint64_t(gateId))==d.route.gateReservations.end())return -1;
 const auto gate=d.gates.find(uint64_t(gateId));if(gate==d.gates.end()||!gate->second.mesh)return -2;s.gateResult.clear();return captureNativeGateRouteCurve(s,d.route,gate->second);
}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=18||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=18||!p.home||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.home);clearWorldMutationProposal(p);const int result=stageHomeRoute(old.header[1],session,old.header[21]);if(result!=1)return result;
 auto& next=*p.home;next.previousHome=NativeHomeRouteOrigin{old.header,uint64_t(ticket)};
 const bool same=old.stationarySource==next.stationarySource&&old.slot==next.slot&&old.generation==next.generation;
 next.timeTranslation={2,ticket,double(p.ticket),old.header[10],old.header[11],next.header[10],next.header[11],
  same&&sameNativeMotionDraft(old,next)?1.:0.,sameNativeMotionGates(s,old,next)?1.:0.,
  same&&sameNativeMotionDraft(old,next,true)?1.:0.,sameNativeMotionGates(s,old,next,true)?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_home_route_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==18&&p.home&&session==double(p.session)&&ticket==double(p.ticket)&&p.home->timeTranslation[0]==2?p.home->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=18||!p.home||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,18);if(valid!=1)return valid;
 const auto& d=*p.home;if(!homeRouteSourceCurrent(s,d)||d.slot>s.routeSlots.size()||d.slot<s.routeSlots.size()&&(s.routeSlots[d.slot].active||s.routeSlots[d.slot].generation!=d.generation)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeHomeRouteBinding>();binding->actual={d.header,uint64_t(ticket)};binding->source=d.stationarySource;
 if(preparedTicket==ticket)binding->prepared=binding->actual;
 else if(d.previousHome&&preparedTicket==double(d.previousHome->ticket)&&d.timeTranslation[9]==1&&d.timeTranslation[10]==1)binding->prepared=*d.previousHome;
 else return -9;
 auto draft=std::move(*s.barrierProposal.home);clearWorldMutationProposal(s.barrierProposal);auto& intent=s.activeIntents.at(draft.route.actor);
 const auto owners=s.byTarget.find(intent.target);if(owners!=s.byTarget.end()){owners->second.erase(intent.actor);if(owners->second.empty())s.byTarget.erase(owners);}intent.target=0;
 if(draft.slot==s.routeSlots.size())s.routeSlots.emplace_back();
 publishGateRouteAdmission(s,intent,draft.slot,draft.route,draft.body,draft.gates,draft.boundaries);
 binding->assignmentSequence=intent.assignmentSequence;s.routeSlots[intent.slot].homeBinding=std::move(binding);s.entityRevision++;
 spatialRecordMotionResourceBoundary(session,ticket,time,18);return 1;
}
static const NativeHomeRouteBinding* currentHomeRouteBinding(double actor){const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeHomeBodyCurrent(s,found->second)?s.routeSlots[found->second.slot].homeBinding.get():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_home_route_binding_snapshot(double actor){auto& s=state();auto& out=s.homeBindingResult;out.clear();const auto b=currentHomeRouteBinding(actor);if(!b)return 0;out={1,double(b->assignmentSequence),double(b->prepared.ticket),double(b->actual.ticket)};out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_home_route_binding_ptr(){return state().homeBindingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_home_route_binding_actors(){auto& s=state();auto& out=s.homeBindingResult;out.clear();std::vector<uint64_t> actors;for(const auto& [actor,intent]:s.activeIntents)if(intent.home&&intent.state==PlanningState::RouteActive&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].homeBinding){if(!nativeHomeBodyCurrent(s,intent))return -1;actors.push_back(actor);}std::sort(actors.begin(),actors.end());for(auto id:actors)out.push_back(double(id));return int(actors.size());}
EMSCRIPTEN_KEEPALIVE int nav_home_route_binding_gates(double actor){auto& s=state();s.gateResult.clear();if(!currentHomeRouteBinding(actor))return -1;for(auto id:s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot].gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_home_route_source_snapshot(double actor,double ticket){
 auto& s=state();const NativeTaskSettlementBinding* b=nullptr;
 if(ticket){const auto& p=s.barrierProposal;if(p.pending&&p.kind==18&&p.home&&ticket==double(p.ticket)&&actor==p.home->header[1])b=p.home->stationarySource.get();}
 else if(const auto home=currentHomeRouteBinding(actor);home)b=home->source.get();
 auto& out=s.taskSettlementBindingResult;out.clear();if(!b)return 0;out={1,double(b->settlementSequence),double(b->prepared.ticket),double(b->actual.ticket)};out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_home_execution(double actor){
 auto& s=state();s.homeExecutionResult.fill(0);const auto b=currentHomeRouteBinding(actor);if(!b)return 0;
 const auto& intent=s.activeIntents.at(uint64_t(actor));const auto& route=s.routeSlots[intent.slot];const auto& h=b->source->actual.header;
 const std::array<double,12> header={1,actor,double(route.reservationBody),h[21],double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),s.effectiveTime,h[22],h[23],double(b->source->settlementSequence)};
 std::copy(header.begin(),header.end(),s.homeExecutionResult.begin());std::copy(route.executionPose.begin(),route.executionPose.end(),s.homeExecutionResult.begin()+12);return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_home_execution_ptr(){return state().homeExecutionResult.data();}
