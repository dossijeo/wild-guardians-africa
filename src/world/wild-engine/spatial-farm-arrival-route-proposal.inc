// Genuine arrival corridor from the exact pending farm request. Reuse the
// native route query, circle interval, motion, gate and reservation kernels.
static bool farmArrivalRouteSourceCurrent(const IntentState& s,const PendingNativeMotionDraft& d){
 const auto found=s.activeIntents.find(d.route.actor);const auto& r=d.farmArrivalRequestSource;
 return r&&found!=s.activeIntents.end()&&found->second.farmArrivalRequest==r&&nativeFarmArrivalRequestBodyCurrent(s,found->second)&&double(r->sequence)==d.header[21]&&r->at==d.header[22];
}
static bool farmArrivalApproachClear(const NativeFarmArrivalResourceRequest& r,double x,double z){
 return std::hypot(x-r.targetX,z-r.targetZ)<=2&&spatial_execution_segment_clear(x,z,r.targetX,r.targetZ,r.radius)==1;
}
static int trimFarmArrivalApproach(RouteSlot& route,const NativeFarmArrivalResourceRequest& r){
 // The original nearEntrance rule needs a clear tail to the service point.
 // Already in that zone: preserve the exact double pose and orientation.
 if(farmArrivalApproachClear(r,r.x,r.z)){route.points.clear();return 1;}
 double x=r.x,z=r.z;
 for(size_t i=0;i<route.points.size();i+=2){const float bx=route.points[i],bz=route.points[i+1];double range[2];
  const int hit=spatialNativeGateCircleRange(x,z,bx,bz,r.targetX,r.targetZ,2,range);if(hit<0)return -6;
  if(hit){float endX=float(x+(double(bx)-x)*range[0]),endZ=float(z+(double(bz)-z)*range[0]);
   // Float32 endpoint storage may round an exact circle entry outward. Move
   // by at most two representable coordinates toward this same segment end;
   // the final point and full retained segments must still pass native proofs.
   for(int n=0;n<2&&std::hypot(double(endX)-r.targetX,double(endZ)-r.targetZ)>2;n++){
    endX=std::nextafter(endX,bx);endZ=std::nextafter(endZ,bz);
   }
   if(farmArrivalApproachClear(r,endX,endZ)){route.points.resize(i+2);route.points[i]=endX;route.points[i+1]=endZ;return 1;}
   if(farmArrivalApproachClear(r,bx,bz)){route.points.resize(i+2);return 1;}
  }
  x=bx;z=bz;
 }
 return 0;
}
static int stageFarmArrivalRoute(double actor,double session,double sourceSequence,double urgent){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||(urgent!=0&&urgent!=1))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!nativeFarmArrivalRequestBodyCurrent(s,found->second))return -2;
 PendingNativeMotionDraft d;d.farmArrivalRequestSource=found->second.farmArrivalRequest;const auto& r=*d.farmArrivalRequestSource;
 if(double(r.sequence)!=sourceSequence)return -2;
 d.body=r.body;d.slot=uint32_t(s.routeSlots.size());for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){d.slot=i;break;}
 d.generation=d.slot<s.routeSlots.size()?s.routeSlots[d.slot].generation:0;
 const int previous=lazy_selected_context();if(previous!=r.profile)spatial_select_nav_profile_index(r.profile);
 int result=1;
 if(!farmArrivalApproachClear(r,r.x,r.z)){
  const int count=spatial_world_route_cached(float(r.x),float(r.z),float(r.targetX),float(r.targetZ));result=count<0?-6:count==0?0:1;
  if(result==1){const float* points=spatial_world_route_ptr();d.route.points.assign(points,points+size_t(count)*2);
   if(d.route.points[size_t(count)*2-2]!=float(r.targetX)||d.route.points.back()!=float(r.targetZ))result=0;
  }
 }
 if(result==1)result=trimFarmArrivalApproach(d.route,r);
 if(result==1){result=prepareRouteTiming(d.route,uint64_t(actor),r.x,r.z,s.effectiveTime,r.radius,2,int(urgent),r.runRemaining,true);
  if(result==1){d.route.originYaw=r.yaw;d.route.motionOffset[2]=r.runPhase;d.route.motionOffset[3]=r.walkPhase;d.route.motionOffset[4]=r.carryPhase;}
 }
 d.topology=lazy_route_revision();if(previous!=r.profile)spatial_select_nav_profile_index(previous);if(result!=1)return result;
 SpatialBodyView body;if(!spatialReadBody(d.body,body))return -3;s.reservationResult.fill(0);d.gates=s.gates;
 result=proveGateRouteAdmission(s,found->second,d.route,d.body,body,d.gates,d.boundaries,false,nullptr,nullptr,nullptr,nullptr,nullptr,d.farmArrivalRequestSource.get());if(result!=1)return result;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=23;captureNativeMotionRows(d);const auto& route=d.route;const double length=route.distances.empty()?0:route.distances.back();
 d.header={1,actor,double(d.body),double(d.generation),double(nextGateRouteGeneration(d.generation)),double(route.profile),double(route.motionFlags),route.radius,
  route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,length),length,route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
  double(route.points.size()/2),double(d.rows.size()/16),double(d.slot),sourceSequence,r.at,double(p.intents)};
 p.farmArrivalRoute=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_stage(double actor,double session,double sourceSequence,double urgent){return stageFarmArrivalRoute(actor,session,sourceSequence,urgent);}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),23):-1;}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_route_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute?p.farmArrivalRoute->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_points(double session,double ticket){const int valid=nav_farm_arrival_route_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.farmArrivalRoute->route.points.size()/2):valid;}
EMSCRIPTEN_KEEPALIVE const float* nav_farm_arrival_route_proposal_points_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute?p.farmArrivalRoute->route.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_rows(double session,double ticket){const int valid=nav_farm_arrival_route_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.farmArrivalRoute->rows.size()/16):valid;}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_route_proposal_rows_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute?p.farmArrivalRoute->rows.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_gates(double session,double ticket){const int valid=nav_farm_arrival_route_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();s.gateResult.clear();for(auto id:s.barrierProposal.farmArrivalRoute->route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_gate(double session,double ticket,double gateId){
 const int valid=nav_farm_arrival_route_proposal_snapshot(session,ticket);if(valid!=1)return valid;auto& s=state();const auto& d=*s.barrierProposal.farmArrivalRoute;
 if(!integer(gateId)||std::find(d.route.gateReservations.begin(),d.route.gateReservations.end(),uint64_t(gateId))==d.route.gateReservations.end())return -1;
 const auto gate=d.gates.find(uint64_t(gateId));if(gate==d.gates.end()||!gate->second.mesh)return -2;s.gateResult.clear();return captureNativeGateRouteCurve(s,d.route,gate->second);
}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_cancel(double session,double ticket){auto& p=state().barrierProposal;if(!p.pending||p.kind!=23||session!=double(p.session)||ticket!=double(p.ticket))return 0;clearWorldMutationProposal(p);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=23||!p.farmArrivalRoute||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.farmArrivalRoute);clearWorldMutationProposal(p);const int result=stageFarmArrivalRoute(old.header[1],session,old.header[21],old.header[6]);if(result!=1)return result;
 auto& next=*p.farmArrivalRoute;next.previousFarmArrival=NativeFarmArrivalRouteOrigin{old.header,uint64_t(ticket)};
 const bool same=old.farmArrivalRequestSource==next.farmArrivalRequestSource&&old.slot==next.slot&&old.generation==next.generation;
 next.timeTranslation={2,ticket,double(p.ticket),old.header[10],old.header[11],next.header[10],next.header[11],same&&sameNativeMotionDraft(old,next)?1.:0.,sameNativeMotionGates(s,old,next)?1.:0.,same&&sameNativeMotionDraft(old,next,true)?1.:0.,sameNativeMotionGates(s,old,next,true)?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_route_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute&&session==double(p.session)&&ticket==double(p.ticket)&&p.farmArrivalRoute->timeTranslation[0]==2?p.farmArrivalRoute->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=23||!p.farmArrivalRoute||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,23);if(valid!=1)return valid;const auto& d=*p.farmArrivalRoute;
 if(!farmArrivalRouteSourceCurrent(s,d)||d.slot>s.routeSlots.size()||d.slot<s.routeSlots.size()&&(s.routeSlots[d.slot].active||s.routeSlots[d.slot].generation!=d.generation)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeFarmArrivalRouteBinding>();binding->actual={d.header,uint64_t(ticket)};binding->requestSource=d.farmArrivalRequestSource;
 if(preparedTicket==ticket)binding->prepared=binding->actual;else if(d.previousFarmArrival&&preparedTicket==double(d.previousFarmArrival->ticket)&&d.timeTranslation[9]==1&&d.timeTranslation[10]==1)binding->prepared=*d.previousFarmArrival;else return -9;
 auto draft=std::move(*s.barrierProposal.farmArrivalRoute);clearWorldMutationProposal(s.barrierProposal);auto& intent=s.activeIntents.at(draft.route.actor);const auto& r=*draft.farmArrivalRequestSource;
 intent.approachKnown=true;intent.approachX=float(r.targetX);intent.approachZ=float(r.targetZ);intent.approachRadius=2;
 if(draft.slot==s.routeSlots.size())s.routeSlots.emplace_back();publishGateRouteAdmission(s,intent,draft.slot,draft.route,draft.body,draft.gates,draft.boundaries);intent.farmArrivalRequest.reset();
 binding->assignmentSequence=intent.assignmentSequence;s.routeSlots[intent.slot].farmArrivalBinding=std::move(binding);s.entityRevision++;spatialRecordMotionResourceBoundary(session,ticket,time,23);return 1;
}
static const NativeFarmArrivalRouteBinding* currentFarmArrivalRoute(double actor){const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeFarmArrivalBodyCurrent(s,found->second)?s.routeSlots[found->second.slot].farmArrivalBinding.get():nullptr;}
static const NativeFarmArrivalRouteBinding* currentHeldFarmArrivalRoute(double actor){const auto& s=state();if(!integer(actor))return nullptr;const auto found=s.activeIntents.find(uint64_t(actor));return found!=s.activeIntents.end()&&nativeHeldFarmArrivalBodyCurrent(s,found->second)?s.routeSlots[found->second.slot].farmArrivalBinding.get():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_binding_snapshot(double actor){auto& s=state();auto& out=s.farmArrivalRouteBindingResult;out.clear();const auto b=currentFarmArrivalRoute(actor);if(!b)return 0;out={1,double(b->assignmentSequence),double(b->prepared.ticket),double(b->actual.ticket)};out.insert(out.end(),b->prepared.header.begin(),b->prepared.header.end());out.insert(out.end(),b->actual.header.begin(),b->actual.header.end());return 1;}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_route_binding_ptr(){return state().farmArrivalRouteBindingResult.data();}
// Bounded metadata from the same route owner. Reuse execution scratch so typed
// execution reads never copy a whole corridor or maintain an endpoint registry.
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_destination_snapshot(double actor){
 auto& s=state();auto& out=s.farmArrivalExecutionResult;out.fill(0);if(!currentFarmArrivalRoute(actor))return 0;
 const auto& route=s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot];out[0]=1;out[1]=route.points.empty()?route.originX:route.points[route.points.size()-2];out[2]=route.points.empty()?route.originZ:route.points.back();out[3]=double(route.points.size()/2);return 1;
}
static int farmArrivalBindingActors(bool held){auto& s=state();auto& out=s.farmArrivalRouteBindingResult;out.clear();std::vector<uint64_t> actors;for(const auto& [actor,intent]:s.activeIntents)if(intent.state==(held?PlanningState::WaitingBlocked:PlanningState::RouteActive)&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].farmArrivalBinding){if(!(held?currentHeldFarmArrivalRoute(double(actor)):currentFarmArrivalRoute(double(actor))))return -1;actors.push_back(actor);}std::sort(actors.begin(),actors.end());for(auto id:actors)out.push_back(double(id));return int(actors.size());}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_binding_actors(){return farmArrivalBindingActors(false);}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_held_actors(){return farmArrivalBindingActors(true);}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_binding_gates(double actor){auto& s=state();s.gateResult.clear();if(!currentFarmArrivalRoute(actor))return -1;for(auto id:s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot].gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_source_snapshot(double actor,double ticket){
 auto& s=state();s.farmArrivalRequestResult.fill(0);const NativeFarmArrivalResourceRequest* r=nullptr;
 if(ticket){const auto& p=s.barrierProposal;if(p.pending&&p.kind==23&&p.farmArrivalRoute&&actor==p.farmArrivalRoute->header[1]&&ticket==double(p.ticket))r=p.farmArrivalRoute->farmArrivalRequestSource.get();}
 else if(const auto b=currentFarmArrivalRoute(actor);b)r=b->requestSource.get();
 return r?snapshotFarmArrivalRequest(s,*r):0;
}
static int farmArrivalExecutionSnapshot(double actor,bool held){
 auto& s=state();auto& out=s.farmArrivalExecutionResult;out.fill(0);const auto b=held?currentHeldFarmArrivalRoute(actor):currentFarmArrivalRoute(actor);if(!b)return 0;
 const auto& intent=s.activeIntents.at(uint64_t(actor));const auto& route=s.routeSlots[intent.slot];const auto& r=*b->requestSource;
 const std::array<double,12> header={1,actor,double(r.body),double(r.center),double(s.session),double(intent.slot),double(intent.generation),double(intent.assignmentSequence),s.effectiveTime,r.targetX,r.targetZ,double(r.sequence)};
 std::copy(header.begin(),header.end(),out.begin());std::copy(route.executionPose.begin(),route.executionPose.end(),out.begin()+12);
 if(held){out[19]=route.suspendedAt;out[27]=out[28]=0;out[29]=2;}return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_farm_arrival_execution(double actor){return farmArrivalExecutionSnapshot(actor,false);}
EMSCRIPTEN_KEEPALIVE int nav_intent_farm_arrival_held_execution(double actor){return farmArrivalExecutionSnapshot(actor,true);}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_held_source_snapshot(double actor){
 auto& s=state();auto& out=s.farmArrivalRouteBindingResult;out.clear();const auto b=currentHeldFarmArrivalRoute(actor);if(!b)return 0;
 const auto& route=s.routeSlots[s.activeIntents.at(uint64_t(actor)).slot];out.resize(29);out[0]=1;out[1]=double(b->assignmentSequence);out[2]=double(b->actual.ticket);
 std::copy(b->actual.header.begin(),b->actual.header.end(),out.begin()+3);out[27]=route.points.empty()?route.originX:route.points[route.points.size()-2];out[28]=route.points.empty()?route.originZ:route.points.back();
 return snapshotFarmArrivalRequest(s,*b->requestSource);
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_farm_arrival_execution_ptr(){return state().farmArrivalExecutionResult.data();}
