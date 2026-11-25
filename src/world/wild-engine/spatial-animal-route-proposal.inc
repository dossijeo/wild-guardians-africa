// AttackCrops uses the existing route slot, reservation and mutation ticket.
// Preparation cannot move the body or publish an execution assignment.
static bool animalRouteRequestCurrent(const IntentState& s,const ActiveIntent& intent){
 const auto& q=intent.animalRouteRequest;SpatialBodyView body;
 if(!q||!intent.animal||intent.retreat||intent.home||intent.task||!intent.lease||!intent.requiresResources||intent.state!=PlanningState::AwaitingResources||intent.slot>=s.routeSlots.size())return false;
 const auto& route=s.routeSlots[intent.slot];const auto target=s.targets.find(intent.target),center=s.targets.find(q->center);
 return route.active&&route.pendingResources&&!route.reserved&&!route.suspended&&route.actor==intent.actor&&route.generation==intent.generation&&
  q->actor==intent.actor&&q->target==intent.target&&q->sequence==intent.resourceRequestSequence&&q->at==intent.resourceRequestedAt&&
  target!=s.targets.end()&&target->second.active&&target->second.kind<3&&target->second.x==q->targetX&&target->second.z==q->targetZ&&center!=s.targets.end()&&center->second.active&&center->second.x==q->centerX&&center->second.z==q->centerZ&&
  spatialReadBody(q->body,body)&&body.kind==1&&body.flags==1&&body.x==q->x&&body.z==q->z&&body.r==q->radius&&
  !s.reservedBodies.count(q->body)&&!s.suspendedBodies.count(q->body);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_request(double actor,double bodyId,double centerId,double entering,double heading,double phase){
 auto& s=state();if(!integer(actor)||!integer(bodyId)||!integer(centerId)||(entering!=0&&entering!=1)||!std::isfinite(heading)||!std::isfinite(phase)||phase<0)return -1;
 if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
 auto& intent=found->second;const auto center=s.targets.find(uint64_t(centerId)),target=s.targets.find(intent.target);SpatialBodyView body;
 if(intent.animalRouteRequest){
  const auto& request=*intent.animalRouteRequest;
  return animalRouteRequestCurrent(s,intent)&&bodyId==double(request.body)&&centerId==double(request.center)&&
    (entering==1)==request.entering&&heading==request.heading&&phase==request.phase?1:-2;
 }
 if(!intent.animal||intent.retreat||intent.home||intent.requiresResources||!intent.lease||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size()||
    target==s.targets.end()||!target->second.active||target->second.kind>=3||center==s.targets.end()||!center->second.active||
    !(center->second.kind==4&&center->second.status==0||center->first==intent.target)||
    !spatialReadBody(uint64_t(bodyId),body)||body.kind!=1||body.flags!=1||!std::isfinite(body.r)||body.r<=0||body.r>2)return -2;
 auto& route=s.routeSlots[intent.slot];
 if(!route.active||route.pendingResources||route.reserved||route.suspended||route.actor!=intent.actor||route.generation!=intent.generation||route.originX!=body.x||route.originZ!=body.z||s.reservedBodies.count(uint64_t(bodyId))||s.suspendedBodies.count(uint64_t(bodyId)))return -3;
 auto request=std::make_shared<NativeAnimalRouteRequest>();
 *request={intent.actor,intent.target,uint64_t(bodyId),uint64_t(centerId),0,s.effectiveTime,body.x,body.z,heading,body.r,phase,center->second.x,center->second.z,entering==1,target->second.x,target->second.z};
 intent.animalRouteRequest=request;intent.requiresResources=true;intent.state=PlanningState::AwaitingResources;route.pendingResources=true;intent.resourceRequestedAt=s.effectiveTime;
 request->sequence=emitIntentChange(s,intent);intent.resourceRequestSequence=request->sequence;s.entityRevision++;return 1;
}
// The strict 25m rule belongs to the animal's semantic declaration. Gate
// activation is closed and conservative, so use its finite range only after
// proving a non-tangent open intersection. No per-frame geometry queries.
static int animalRunDistance(const RouteSlot& route,const NativeAnimalRouteRequest& q,double& distance){
 distance=0;if(!q.entering||std::hypot(q.x-q.centerX,q.z-q.centerZ)<25)return 1;
 double x=q.x,z=q.z,travelled=0;
 for(size_t i=0;i<route.points.size();i+=2){const double nx=route.points[i],nz=route.points[i+1],dx=nx-x,dz=nz-z,length=std::hypot(dx,dz);
  if(length>0){
   const long double vx=dx,vz=dz,rx=(long double)q.centerX-x,rz=(long double)q.centerZ-z;
   const long double cross=rx*vz-rz*vx,quadratic=(vx*vx+vz*vz)*625-cross*cross;
   if(quadratic>0){double range[2];const int hit=spatialNativeGateCircleRange(x,z,nx,nz,q.centerX,q.centerZ,25,range);
    if(hit<0)return -6;
    if(hit&&range[0]<range[1]){distance=travelled+length*range[0];return 1;}
   }
  }
  travelled+=length;x=nx;z=nz;
 }
 distance=travelled;return 1;
}
static int stageAnimalRoute(double actor,double session,double requestSequence){
 auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 if(!integer(actor)||session!=double(s.session)||!integer(requestSequence))return -1;
 const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end()||!animalRouteRequestCurrent(s,found->second))return -2;
 const auto& intent=found->second;const auto q=intent.animalRouteRequest;if(q->sequence!=uint64_t(requestSequence))return -2;
 PendingNativeMotionDraft d;d.animalRouteSource=q;d.body=q->body;d.slot=intent.slot;d.generation=intent.generation;d.route.points=s.routeSlots[intent.slot].points;
 const int previous=lazy_selected_context();if(previous!=intent.profile)spatial_select_nav_profile_index(intent.profile);
 int result=prepareRouteTiming(d.route,intent.actor,q->x,q->z,s.effectiveTime,q->radius,1,0,0,false,true);d.topology=lazy_route_revision();
 if(previous!=intent.profile)spatial_select_nav_profile_index(previous);recordTimingResult(s,result);if(result!=1)return -7;
 d.route.originYaw=q->heading;d.route.motionOffset[1]=q->phase;
 result=animalRunDistance(d.route,*q,d.route.runDistance);if(result!=1)return result;
 d.route.runSpeed=d.route.runDistance>0?3.8:0;result=routeTimingRepresentable(d.route);if(result!=1){recordTimingResult(s,result);return -7;}
 SpatialBodyView body;if(!spatialReadBody(q->body,body))return -3;
 s.reservationChecks++;if(!reserveRouteClear(s,intent,d.route,q->body,body))return 0;
 result=stageWorldMutationBoundary(nullptr,0);if(result!=1)return result;
 auto& p=s.barrierProposal;p.kind=26;captureNativeMotionRows(d);const auto& r=d.route;
 const double length=r.distances.empty()?0:r.distances.back();
 d.header={1,double(r.actor),double(d.body),double(d.generation),double(nextGateRouteGeneration(d.generation)),double(r.profile),0,r.radius,r.originX,r.originZ,r.startTime,routeTimeAtDistance(r,length),length,r.speed,r.runDistance,r.runSpeed,0,1,double(r.points.size()/2),double(d.rows.size()/16),double(d.slot),double(q->sequence),q->at,double(p.intents)};
 p.animalRoute=std::move(d);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_stage(double actor,double session,double sequence){return stageAnimalRoute(actor,session,sequence);}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_snapshot(double session,double ticket){const auto& p=state().barrierProposal;return p.animalRoute&&p.kind==26?takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),26):-1;}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_route_proposal_header_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==26&&p.animalRoute?p.animalRoute->header.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_rows(double session,double ticket){const int v=nav_animal_route_proposal_snapshot(session,ticket);return v==1?int(state().barrierProposal.animalRoute->rows.size()/16):v;}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_route_proposal_rows_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==26&&p.animalRoute?p.animalRoute->rows.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_points(double session,double ticket){const int v=nav_animal_route_proposal_snapshot(session,ticket);return v==1?int(state().barrierProposal.animalRoute->route.points.size()/2):v;}
EMSCRIPTEN_KEEPALIVE const float* nav_animal_route_proposal_points_ptr(){const auto& p=state().barrierProposal;return p.pending&&p.kind==26&&p.animalRoute?p.animalRoute->route.points.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_cancel(double session,double ticket){const auto& p=state().barrierProposal;return p.kind==26&&p.animalRoute?nav_intent_barrier_proposal_cancel(session,ticket):0;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_revalidate(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;if(!p.pending||p.kind!=26||!p.animalRoute||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 auto old=std::move(*p.animalRoute);clearWorldMutationProposal(p);const int result=stageAnimalRoute(double(old.route.actor),session,double(old.animalRouteSource->sequence));if(result!=1)return result;
 auto& next=*p.animalRoute;if(next.animalRouteSource!=old.animalRouteSource){clearWorldMutationProposal(p);return -2;}
 next.previousAnimal=NativeAnimalRouteOrigin{old.header,uint64_t(ticket)};
 next.timeTranslation={2,ticket,double(p.ticket),old.header[10],old.header[11],next.header[10],next.header[11],sameNativeMotionDraft(old,next)?1.:0.,1,sameNativeMotionDraft(old,next,true)?1.:0.,1};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_route_proposal_time_translation_ptr(double session,double ticket){const auto& p=state().barrierProposal;return p.pending&&p.kind==26&&p.animalRoute&&session==double(p.session)&&ticket==double(p.ticket)&&p.animalRoute->timeTranslation[0]==2?p.animalRoute->timeTranslation.data():nullptr;}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_proposal_commit_bound(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket){
 auto& s=state();if(!integer(preparedTicket)||!s.barrierProposal.animalRoute)return -1;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,26);if(valid!=1)return valid;
 auto& pending=*s.barrierProposal.animalRoute;const auto found=s.activeIntents.find(pending.route.actor);
 if(found==s.activeIntents.end()||found->second.animalRouteRequest!=pending.animalRouteSource||!animalRouteRequestCurrent(s,found->second)){clearWorldMutationProposal(s.barrierProposal);return -2;}
 auto binding=std::make_shared<NativeAnimalRouteBinding>();binding->actual={pending.header,uint64_t(ticket)};binding->source=pending.animalRouteSource;
 if(preparedTicket==ticket)binding->prepared=binding->actual;
 else if(pending.previousAnimal&&preparedTicket==double(pending.previousAnimal->ticket)&&pending.timeTranslation[9]==1)binding->prepared=*pending.previousAnimal;
 else return -9;
 auto d=std::move(pending);clearWorldMutationProposal(s.barrierProposal);auto& intent=found->second;
 d.route.active=true;d.route.generation=nextGateRouteGeneration(d.generation);d.route.reserved=true;d.route.reservationBody=d.body;
 releaseRoute(s,intent);s.routeSlots[d.slot]=std::move(d.route);s.reservedBodies.emplace(d.body,d.slot);s.residencyPinRevision++;
 auto& route=s.routeSlots[d.slot];intent.slot=d.slot;intent.generation=route.generation;intent.state=PlanningState::RouteActive;intent.topology=d.topology;intent.timingMode=1;intent.timingRadius=route.radius;intent.routeCursor=0;intent.routeStartX=float(route.originX);intent.routeStartZ=float(route.originZ);
 if(s.executionEnabled){s.executionEvaluations++;projectExecutedPose(s,route,sampleRouteTiming(route,s.effectiveTime));}
 binding->assignmentSequence=emitIntentChange(s,intent);route.animalRouteBinding=std::move(binding);intent.animalRouteRequest.reset();spatialRecordMotionResourceBoundary(session,ticket,time,26);return 1;
}

// Return the acquired source only through its current route generation. A
// prepared ticket or a freed/reassigned slot must never identify a live body.
EMSCRIPTEN_KEEPALIVE int nav_animal_route_binding(double session,double slot,double generation){
 auto& s=state();
 if(session!=double(s.session)||!integer(slot,true)||slot>=s.routeSlots.size()||!integer(generation))return 0;
 const auto& route=s.routeSlots[size_t(slot)];
 const auto& binding=route.animalRouteBinding;
 if(!binding||route.generation!=generation||!executionBindingCoherent(s,route.reservationBody,uint32_t(slot)))return 0;
 const auto& q=*binding->source;
 if(q.actor!=route.actor||q.body!=route.reservationBody||q.target!=s.activeIntents.at(q.actor).target)return 0;
 const auto& actual=binding->actual;
 const auto& ready=binding->prepared;
 s.animalRouteResult={1,session,slot,generation,double(q.actor),double(q.body),double(q.target),double(q.center),
   double(q.sequence),q.at,double(binding->assignmentSequence),double(actual.ticket),actual.header[10],actual.header[11],
   double(ready.ticket),ready.header[10],ready.header[11],q.centerX,q.centerZ,q.radius,q.x,q.z,q.phase,q.heading};
 return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_route_binding_ptr(){return state().animalRouteResult.data();}

// The physical registry owns the subject across request, travel and strike.
// Zero denotes a different protocol. A broken acquired source is an error.
EMSCRIPTEN_KEEPALIVE int nav_animal_crop_state(double actor){
 auto& s=state();if(!integer(actor))return 0;
 const auto it=s.activeIntents.find(uint64_t(actor));if(it==s.activeIntents.end())return 0;
 const auto& intent=it->second;if(!intent.animal||intent.slot>=s.routeSlots.size())return 0;
 const auto& route=s.routeSlots[intent.slot];
 const auto binding=route.animalRouteBinding;
 const auto source=intent.animalRouteRequest?intent.animalRouteRequest:binding?binding->source:nullptr;
 if(!source)return 0;
 if(!intent.lease||source->actor!=intent.actor||source->target!=intent.target||
    !route.active||route.actor!=intent.actor||route.generation!=intent.generation)return -1;
 const auto center=s.targets.find(source->center),target=s.targets.find(source->target);
 if(center==s.targets.end()||!center->second.active||center->second.x!=source->centerX||center->second.z!=source->centerZ||
    target==s.targets.end()||!target->second.active||target->second.x!=source->targetX||target->second.z!=source->targetZ)return -1;
 const int mode=intent.animalRouteRequest?1:intent.animalStrike?3:2;
 SpatialBodyView body;if(!spatialReadBody(source->body,body)||body.kind!=1||body.flags!=1||body.r!=source->radius)return -1;
 if(mode==1){if(!animalRouteRequestCurrent(s,intent))return -1;}
 else if(!binding||!route.hasExecution||!executionBindingCoherent(s,source->body,intent.slot)||
         body.x!=route.executionPose[0]||body.z!=route.executionPose[1])return -1;
 const auto& pose=route.executionPose;
 s.animalCropState={1,double(mode),actor,double(source->body),double(source->target),double(source->center),
   source->centerX,source->centerZ,body.r,body.x,body.z,mode==1?source->heading:pose[4],
   mode==1?source->phase:pose[3],mode==1?0:pose[6],mode==1?0:pose[15],mode==1?0:pose[16],
   s.effectiveTime,source->targetX,source->targetZ,double(source->sequence)};
 return mode;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_crop_state_ptr(){return state().animalCropState.data();}
