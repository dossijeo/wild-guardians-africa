// Genuine arrival corridor from the exact pending farm request. Reuse the
// native route query, circle interval, motion, gate and reservation kernels.
static NativeFarmArrivalHeldSource captureFarmArrivalHeldSource(const ActiveIntent& intent,const RouteSlot& route){
 const auto& p=route.executionPose;return {intent.assignmentSequence,intent.generation,route.suspendedAt,{p[0],p[1],p[4],route.radius,p[9],p[10],p[11],p[14]}};
}
static bool farmArrivalRouteSourceCurrent(const IntentState& s,const PendingNativeMotionDraft& d){
 const auto found=s.activeIntents.find(d.route.actor);const auto& r=d.farmArrivalRequestSource;
 if(!r||found==s.activeIntents.end()||double(r->sequence)!=d.header[21]||r->at!=d.header[22])return false;
 if(d.farmArrivalHeldSource){
  const auto& intent=found->second;if(!nativeHeldFarmArrivalBodyCurrent(s,intent)||s.workers.at(intent.actor).eligible==false)return false;
  const auto& route=s.routeSlots[intent.slot];const auto actual=captureFarmArrivalHeldSource(intent,route);const auto& expected=*d.farmArrivalHeldSource;
  return route.farmArrivalBinding==d.farmArrivalHeldBinding&&route.farmArrivalBinding->requestSource==r&&actual.sequence==expected.sequence&&actual.generation==expected.generation&&actual.at==expected.at&&actual.pose==expected.pose;
 }
 return found->second.farmArrivalRequest==r&&nativeFarmArrivalRequestBodyCurrent(s,found->second);
}
constexpr double farmArrivalRadius=2;
static bool farmArrivalApproachClear(const NativeFarmArrivalResourceRequest& r,double x,double z,bool savannaWorker){
 if(std::hypot(x-r.targetX,z-r.targetZ)>farmArrivalRadius)return false;
 return (savannaWorker?spatialWorkerFlightSegmentClear:spatial_execution_segment_clear)(x,z,r.targetX,r.targetZ,r.radius)==1;
}
static int trimFarmArrivalApproach(RouteSlot& route,const NativeFarmArrivalResourceRequest& r,bool savannaWorker){
 // The original nearEntrance rule needs a clear tail to the service point.
 // Already in that zone: preserve the exact double pose and orientation.
 if(farmArrivalApproachClear(r,r.x,r.z,savannaWorker)){route.points.clear();return 1;}
 double x=r.x,z=r.z;
 for(size_t i=0;i<route.points.size();i+=2){const float bx=route.points[i],bz=route.points[i+1];double range[2];
  const int hit=spatialNativeGateCircleRange(x,z,bx,bz,r.targetX,r.targetZ,farmArrivalRadius,range);if(hit<0)return -6;
  if(hit){float endX=float(x+(double(bx)-x)*range[0]),endZ=float(z+(double(bz)-z)*range[0]);
   // Float32 endpoint storage may round an exact circle entry outward. Move
   // by at most two representable coordinates toward this same segment end;
   // the final point and full retained segments must still pass native proofs.
   for(int n=0;n<2&&std::hypot(double(endX)-r.targetX,double(endZ)-r.targetZ)>farmArrivalRadius;n++){
    endX=std::nextafter(endX,bx);endZ=std::nextafter(endZ,bz);
   }
   if(farmArrivalApproachClear(r,endX,endZ,savannaWorker)){route.points.resize(i+2);route.points[i]=endX;route.points[i+1]=endZ;return 1;}
   if(farmArrivalApproachClear(r,bx,bz,savannaWorker)){route.points.resize(i+2);return 1;}
  }
  x=bx;z=bz;
 }
 return 0;
}
static int timeFarmArrival(RouteSlot& route,const NativeFarmArrivalResourceRequest& r,double at,int urgent,bool savannaWorker){
 const int result=prepareRouteTiming(route,r.actor,r.x,r.z,at,r.radius,2,urgent,r.runRemaining,true,false,savannaWorker);
 if(result==1){route.originYaw=r.yaw;route.motionOffset[2]=r.runPhase;route.motionOffset[3]=r.walkPhase;route.motionOffset[4]=r.carryPhase;}
 return result;
}
static int planFarmArrival(RouteSlot& route,const NativeFarmArrivalResourceRequest& r,double at,int urgent,bool savannaWorker,uint32_t& topology){
 const int previous=lazy_selected_context();if(previous!=r.profile)spatial_select_nav_profile_index(r.profile);
 int result=1;
 if(!farmArrivalApproachClear(r,r.x,r.z,savannaWorker)){
  const int count=spatial_world_route_cached(float(r.x),float(r.z),float(r.targetX),float(r.targetZ));result=count<0?-6:count==0?0:1;
  if(result==1){const float* points=spatial_world_route_ptr();route.points.assign(points,points+size_t(count)*2);
   if(route.points[size_t(count)*2-2]!=float(r.targetX)||route.points.back()!=float(r.targetZ))result=0;
  }
 }
 if(result==1)result=trimFarmArrivalApproach(route,r,savannaWorker);
 if(result==1)result=timeFarmArrival(route,r,at,urgent,savannaWorker);
 topology=lazy_route_revision();if(previous!=r.profile)spatial_select_nav_profile_index(previous);
 return result;
}
static double farmGateSide(const NativeGate& gate,double x,double z){
 return (x-gate.x)*std::sin(gate.yaw)+(z-gate.z)*std::cos(gate.yaw);
}
static bool proveFarmArrivalAlternative(IntentState& s,const ActiveIntent& intent,PendingNativeMotionDraft& draft,const SpatialBodyView& body,std::vector<float> points){
 const auto& r=*draft.farmArrivalRequestSource;
 RouteSlot next;next.points=std::move(points);
 if(timeFarmArrival(next,r,s.effectiveTime,draft.route.motionFlags,draft.route.workerDrySweep)!=1)return false;
 auto gates=s.gates;std::vector<GateCrossingBoundary> boundaries;s.reservationResult.fill(0);
 if(proveGateRouteAdmission(s,intent,next,r.body,body,gates,boundaries,false,nullptr,nullptr,nullptr,nullptr,nullptr,&r)!=1||
    next.gateReservations!=draft.route.gateReservations)return false;
 draft.route=std::move(next);draft.gates=std::move(gates);draft.boundaries=std::move(boundaries);return true;
}
static bool detourFarmGateApproach(IntentState& s,const ActiveIntent& intent,PendingNativeMotionDraft& draft,const SpatialBodyView& body){
 const auto witness=s.reservationResult;
 const auto& route=draft.route;
 if(witness[0]!=1||route.gateReservations.empty()||route.points.size()<2)return false;
 const auto blockerId=uint64_t(witness[1]);SpatialBodyView blocker;
 if(s.reservedBodies.count(blockerId)||s.suspendedBodies.count(blockerId)||!spatialReadBody(blockerId,blocker)||blocker.kind!=0||!reservationParticipates(body,blocker))return false;
 const auto& r=*draft.farmArrivalRequestSource;const auto& gate=s.gates.at(route.gateReservations.front());
 const double length=route.distances.front(),side=farmGateSide(gate,r.x,r.z);
 if(length<=0||side*farmGateSide(gate,blocker.x,blocker.z)<=0||side*farmGateSide(gate,route.points[route.points.size()-2],route.points.back())>=0||
    sampleRouteTiming(route,witness[3])[2]>=length)return false;
 const double ux=(route.points[0]-r.x)/length,uz=(route.points[1]-r.z)/length,
   along=(blocker.x-r.x)*ux+(blocker.z-r.z)*uz;
 if(along<=0||along>=length)return false;

 // Rejoin the original first edge beyond the stationary disc, before the
 // gate. The local body detour is only a candidate for full route admission.
 const int rejection=s.timingRejection,previous=lazy_selected_context();
 if(previous!=r.profile)spatial_select_nav_profile_index(r.profile);
 bool admitted=false;
 for(double clearance:{.08,.20,.32,.44}){
  const double join=std::min(length,along+r.radius+blocker.r+clearance);
  const float x=join==length?route.points[0]:float(r.x+join*ux),z=join==length?route.points[1]:float(r.z+join*uz);
  if(side*farmGateSide(gate,x,z)<=0)break;
  const int count=spatial_body_detour(double(r.body),x,z,-1);
  if(count>0&&route.points.size()+2*size_t(count)<=8192){
   const auto points=spatial_bodies_result_ptr();
   std::vector<float> path(points,points+2*count);
   const bool first=path[path.size()-2]==route.points[0]&&path.back()==route.points[1];
   path.insert(path.end(),route.points.begin()+(first?2:0),route.points.end());
   if(proveFarmArrivalAlternative(s,intent,draft,body,std::move(path))){admitted=true;break;}
  }
  if(join==length)break;
 }
 if(previous!=r.profile)spatial_select_nav_profile_index(previous);
 if(!admitted){s.reservationResult=witness;s.timingRejection=rejection;}
 return admitted;
}
static void clearOpposedFarmEgress(IntentState& s,const ActiveIntent& intent,PendingNativeMotionDraft& draft,const SpatialBodyView& body){
 const auto& r=*draft.farmArrivalRequestSource;
 const auto& route=draft.route;
 if(route.gateReservations.empty()||route.points.size()>=8192)return;
 const double endX=route.points[route.points.size()-2],endZ=route.points.back();
 std::vector<RouteSlot> opposed;
 for(const auto& [actor,other]:s.activeIntents){
  if(actor==r.actor||!nativeFarmArrivalRequestBodyCurrent(s,other))continue;
  const auto& peer=*other.farmArrivalRequest;
  const auto direction=[&](uint64_t id){const auto& gate=s.gates.at(id);
   const double from=farmGateSide(gate,r.x,r.z),incoming=farmGateSide(gate,peer.x,peer.z);
   return from*incoming<0&&from*farmGateSide(gate,endX,endZ)<0&&incoming*farmGateSide(gate,peer.targetX,peer.targetZ)<0;
  };
  if(std::none_of(route.gateReservations.begin(),route.gateReservations.end(),direction))continue;
  RouteSlot reverse;uint32_t revision;SpatialBodyView peerBody;
  if(!spatialReadBody(peer.body,peerBody)||!reservationParticipates(body,peerBody)||planFarmArrival(reverse,peer,s.effectiveTime,0,route.workerDrySweep,revision)!=1)continue;
  auto gates=s.gates;std::vector<GateCrossingBoundary> boundaries;
  if(compileGateCrossings(s,reverse,gates,boundaries)!=1||std::none_of(reverse.gateReservations.begin(),reverse.gateReservations.end(),[&](uint64_t id){
    if(std::find(route.gateReservations.begin(),route.gateReservations.end(),id)==route.gateReservations.end()||!direction(id))return false;
    const auto& gate=gates.at(id);
    return farmGateSide(gate,peer.x,peer.z)*farmGateSide(gate,reverse.points[reverse.points.size()-2],reverse.points.back())<0&&gateCrossingFixedClear(gate,reverse,peerBody)==1;
  }))continue;
  opposed.push_back(std::move(reverse));
 }
 // Only a stationary endpoint that obstructs an actual opposite request
 // justifies changing the normal first entrance of the arrival circle.
 const auto blocks=[&](const RouteSlot& reverse,double x,double z){double at;return reservationConflict({&reverse},{nullptr,x,z},r.radius+reverse.radius,s.effectiveTime,at);};
 if(std::none_of(opposed.begin(),opposed.end(),[&](const auto& reverse){return blocks(reverse,endX,endZ);}))return;
 const auto reservation=s.reservationResult;const int rejection=s.timingRejection;
 const int previous=lazy_selected_context();if(previous!=r.profile)spatial_select_nav_profile_index(r.profile);
 const double angle=std::atan2(endZ-r.targetZ,endX-r.targetX);
 for(int degrees:{20,-20,35,-35,50,-50,65,-65,80,-80}){
  const double a=angle+degrees*std::acos(-1.)/180;
  const float x=float(r.targetX+(farmArrivalRadius-.01)*std::cos(a)),z=float(r.targetZ+(farmArrivalRadius-.01)*std::sin(a));
  if(std::any_of(route.gateReservations.begin(),route.gateReservations.end(),[&](uint64_t id){const auto& gate=s.gates.at(id);const double side=farmGateSide(gate,endX,endZ);
    return side*farmGateSide(gate,r.x,r.z)<0&&side*farmGateSide(gate,x,z)<=0;
  }))continue;
  if(!farmArrivalApproachClear(r,x,z,route.workerDrySweep)||std::any_of(opposed.begin(),opposed.end(),[&](const auto& reverse){return blocks(reverse,x,z);}))continue;
  auto path=route.points;path.insert(path.end(),{x,z});
  if(proveFarmArrivalAlternative(s,intent,draft,body,std::move(path)))break;
 }
 if(previous!=r.profile)spatial_select_nav_profile_index(previous);
 s.reservationResult=reservation;s.timingRejection=rejection;
}
static int stageFarmArrivalRoute(double actor,double session,double sourceSequence,double urgent,bool savannaWorker=false){
 if(savannaWorker&&spatial_world_biome()!=0)return -2;
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(sourceSequence)||(urgent!=0&&urgent!=1))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return -2;
 const bool held=nativeHeldFarmArrivalBodyCurrent(s,found->second);
 if(!held&&!nativeFarmArrivalRequestBodyCurrent(s,found->second))return -2;
 if(urgent&&found->second.farmArrivalRequest&&found->second.farmArrivalRequest->refugeSequence)return -2;
 PendingNativeMotionDraft d;
 if(held){
  const auto& old=s.routeSlots[found->second.slot];if(!s.workers.at(uint64_t(actor)).eligible||urgent!=double(old.motionFlags))return -2;
  d.farmArrivalHeldBinding=old.farmArrivalBinding;d.farmArrivalHeldSource=captureFarmArrivalHeldSource(found->second,old);d.farmArrivalRequestSource=old.farmArrivalBinding->requestSource;
 }else d.farmArrivalRequestSource=found->second.farmArrivalRequest;
 auto origin=*d.farmArrivalRequestSource;
 if(held){const auto& p=d.farmArrivalHeldSource->pose;origin.x=p[0];origin.z=p[1];origin.yaw=p[2];origin.radius=p[3];origin.runPhase=p[4];origin.walkPhase=p[5];origin.carryPhase=p[6];origin.runRemaining=p[7];}
 const auto& r=origin;
 if(double(r.sequence)!=sourceSequence)return -2;
 d.body=r.body;d.slot=held?found->second.slot:uint32_t(s.routeSlots.size());if(!held)for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){d.slot=i;break;}
 d.generation=d.slot<s.routeSlots.size()?s.routeSlots[d.slot].generation:0;
 int result=planFarmArrival(d.route,r,s.effectiveTime,int(urgent),savannaWorker,d.topology);if(result!=1)return result;
 SpatialBodyView body;if(!spatialReadBody(d.body,body))return -3;s.reservationResult.fill(0);d.gates=s.gates;
 result=proveGateRouteAdmission(s,found->second,d.route,d.body,body,d.gates,d.boundaries,false,nullptr,nullptr,nullptr,nullptr,nullptr,held?nullptr:d.farmArrivalRequestSource.get(),d.farmArrivalHeldBinding.get());
 if(result==1){if(!held)clearOpposedFarmEgress(s,found->second,d,body);}
 else if(result!=0||held||!detourFarmGateApproach(s,found->second,d,body))return result;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=23;captureNativeMotionRows(d);const auto& route=d.route;const double length=route.distances.empty()?0:route.distances.back();
 d.header={1,actor,double(d.body),double(d.generation),double(nextGateRouteGeneration(d.generation)),double(route.profile),double(route.motionFlags),route.radius,
  route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,length),length,route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
  double(route.points.size()/2),double(d.rows.size()/16),double(d.slot),sourceSequence,r.at,double(p.intents)};
 p.farmArrivalRoute=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_stage(double actor,double session,double sourceSequence,double urgent){return stageFarmArrivalRoute(actor,session,sourceSequence,urgent);}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_stage_savanna(double actor,double session,double sourceSequence,double urgent){return stageFarmArrivalRoute(actor,session,sourceSequence,urgent,true);}
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
 auto old=std::move(*p.farmArrivalRoute);clearWorldMutationProposal(p);if(!farmArrivalRouteSourceCurrent(s,old))return -2;const int result=stageFarmArrivalRoute(old.header[1],session,old.header[21],old.header[6],old.route.workerDrySweep);if(result!=1)return result;
 auto& next=*p.farmArrivalRoute;next.previousFarmArrival=NativeFarmArrivalRouteOrigin{old.header,uint64_t(ticket)};
 const bool same=old.farmArrivalRequestSource==next.farmArrivalRequestSource&&old.farmArrivalHeldBinding==next.farmArrivalHeldBinding&&old.slot==next.slot&&old.generation==next.generation;
 next.timeTranslation={2,ticket,double(p.ticket),old.header[10],old.header[11],next.header[10],next.header[11],same&&sameNativeMotionDraft(old,next)?1.:0.,sameNativeMotionGates(s,old,next)?1.:0.,same&&sameNativeMotionDraft(old,next,true)?1.:0.,sameNativeMotionGates(s,old,next,true)?1.:0.};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_route_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==23&&p.farmArrivalRoute&&session==double(p.session)&&ticket==double(p.ticket)&&p.farmArrivalRoute->timeTranslation[0]==2?p.farmArrivalRoute->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();const auto& p=s.barrierProposal;if(!p.pending||p.kind!=23||!p.farmArrivalRoute||!integer(preparedTicket))return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,23);if(valid!=1)return valid;const auto& d=*p.farmArrivalRoute;
 if(!farmArrivalRouteSourceCurrent(s,d)||d.slot>s.routeSlots.size()||d.slot<s.routeSlots.size()&&(s.routeSlots[d.slot].active&&!d.farmArrivalHeldSource||s.routeSlots[d.slot].generation!=d.generation)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeFarmArrivalRouteBinding>();binding->actual={d.header,uint64_t(ticket)};binding->requestSource=d.farmArrivalRequestSource;binding->heldSource=d.farmArrivalHeldSource;
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
// The existing scratch returns one flat origin for a candidate or current binding.
EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_route_held_origin_snapshot(double actor,double ticket){
 auto& s=state();auto& out=s.farmArrivalExecutionResult;out.fill(0);const NativeFarmArrivalHeldSource* source=nullptr;
 if(ticket){const auto& p=s.barrierProposal;if(p.pending&&p.kind==23&&p.farmArrivalRoute&&actor==p.farmArrivalRoute->header[1]&&ticket==double(p.ticket)&&p.farmArrivalRoute->farmArrivalHeldSource)source=&*p.farmArrivalRoute->farmArrivalHeldSource;}
 else {const auto b=currentFarmArrivalRoute(actor)?currentFarmArrivalRoute(actor):currentHeldFarmArrivalRoute(actor);if(b&&b->heldSource)source=&*b->heldSource;}
 if(!source)return 0;out[0]=1;out[1]=double(source->sequence);out[2]=double(source->generation);out[3]=source->at;std::copy(source->pose.begin(),source->pose.end(),out.begin()+4);return 1;
}
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
