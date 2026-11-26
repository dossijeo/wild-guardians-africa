// An animal's prepared approach uses the existing route slot, reservation and mutation ticket.
// Preparation cannot move the body or publish an execution assignment.
static bool intactAttackCenter(const Target& target){
 return target.active&&target.kind==4&&target.damageKnown&&target.status==0;
}
static bool animalRouteDestinationCurrent(const IntentState& s,const ActiveIntent& intent,const NativeAnimalRouteRequest& q){
 if(intent.retreat)return !intent.lease&&!intent.target&&!q.target&&!q.center&&intent.approachKnown&&
   intent.approachX==float(q.targetX)&&intent.approachZ==float(q.targetZ);
 const auto target=s.targets.find(q.target),center=s.targets.find(q.center);
 return intent.lease&&target!=s.targets.end()&&target->second.active&&
   (q.attackCenter?(q.target==q.center&&intactAttackCenter(target->second)):target->second.kind<3)&&
   target->second.x==q.targetX&&target->second.z==q.targetZ&&center!=s.targets.end()&&center->second.active&&
   center->second.x==q.centerX&&center->second.z==q.centerZ;
}
static bool animalRouteRequestCurrent(const IntentState& s,const ActiveIntent& intent,bool requireShield=true){
 const auto& q=intent.animalRouteRequest;SpatialBodyView body;
 if(!q||!intent.animal||intent.home||intent.task||!intent.requiresResources||intent.state!=PlanningState::AwaitingResources||intent.slot>=s.routeSlots.size())return false;
 const auto& route=s.routeSlots[intent.slot];
 return route.active&&route.pendingResources&&!route.reserved&&!route.suspended&&route.actor==intent.actor&&route.generation==intent.generation&&
  q->actor==intent.actor&&q->target==intent.target&&q->sequence==intent.resourceRequestSequence&&q->at==intent.resourceRequestedAt&&
  animalRouteDestinationCurrent(s,intent,*q)&&
  (!requireShield||!q->shieldPolygon||spatialShieldFootprintCurrent(q->shieldPolygon,q->shieldX,q->shieldZ,q->shieldRadius))&&
  spatialReadBody(q->body,body)&&body.kind==1&&body.flags==1&&body.x==q->x&&body.z==q->z&&body.r==q->radius&&
  !s.reservedBodies.count(q->body)&&!s.suspendedBodies.count(q->body);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_route_version(){return 2;}
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
 const bool attackCenter=target!=s.targets.end()&&target->first==uint64_t(centerId)&&intactAttackCenter(target->second);
 if(!intent.animal||intent.retreat||intent.home||intent.requiresResources||!intent.lease||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size()||
    target==s.targets.end()||!target->second.active||(!attackCenter&&target->second.kind>=3)||center==s.targets.end()||!center->second.active||
    !(center->second.kind==4&&center->second.status==0||center->first==intent.target)||
    !spatialReadBody(uint64_t(bodyId),body)||body.kind!=1||body.flags!=1||!std::isfinite(body.r)||body.r<=0||body.r>2)return -2;
 if(s.finishedAnimalStrike&&s.finishedAnimalStrike->actor==uint64_t(actor)){
  const auto& h=*s.finishedAnimalStrike;
  if(h.session!=s.session||h.body!=bodyId||body.x!=h.x||body.z!=h.z||body.r!=h.radius||
     heading!=h.yaw||phase!=h.phase||entering!=0)return -2;
 }
 auto& route=s.routeSlots[intent.slot];
 if(!route.active||route.pendingResources||route.reserved||route.suspended||route.actor!=intent.actor||route.generation!=intent.generation||route.originX!=body.x||route.originZ!=body.z||s.reservedBodies.count(uint64_t(bodyId))||s.suspendedBodies.count(uint64_t(bodyId)))return -3;
 auto request=std::make_shared<NativeAnimalRouteRequest>();
 *request={intent.actor,intent.target,uint64_t(bodyId),uint64_t(centerId),0,s.effectiveTime,body.x,body.z,heading,body.r,phase,center->second.x,center->second.z,entering==1,target->second.x,target->second.z,attackCenter};
 intent.animalRouteRequest=request;intent.requiresResources=true;intent.state=PlanningState::AwaitingResources;route.pendingResources=true;intent.resourceRequestedAt=s.effectiveTime;
 request->sequence=emitIntentChange(s,intent);intent.resourceRequestSequence=request->sequence;s.entityRevision++;return 1;
}
// The last acquired source is captured only by a scoped Shield commit.
// No route is assigned while its replacement is being planned or prepared.
extern "C++" bool spatialIntentCaptureShieldCropStop(const SpatialShieldCropStop& stop){
 auto& s=state();const auto& c=stop.source;
 if(c.slot>=s.routeSlots.size()||s.effectiveTime!=stop.time)return false;
 const auto i=s.activeIntents.find(uint64_t(c.actor));
 if(i==s.activeIntents.end())return false;
 auto& intent=i->second;const auto& route=s.routeSlots[size_t(c.slot)];
 const auto& b=route.animalRouteBinding;
 if(s.pendingShieldCropStop||intent.stoppedShieldCrop||intent.slot!=c.slot||intent.generation!=c.generation||
    !b||b->actual.ticket!=c.ticket||b->assignmentSequence!=c.assignment||
    !executionBindingCoherent(s,uint64_t(c.body),intent.slot)||!route.hasExecution||
    route.executionPose[0]!=stop.x||route.executionPose[1]!=stop.z||
    route.executionPose[4]!=stop.yaw||route.executionPose[3]!=stop.phase||
    (route.executionPose[15]==1)!=stop.running)return false;

 s.pendingShieldCropStop=StoppedShieldCrop{stop,0,b->source};return true;
}
static bool stoppedShieldCropCurrent(const IntentState& s,const ActiveIntent& intent,const StoppedShieldCrop& hold){
 const auto& p=hold.stop;const auto& q=*hold.routeSource;SpatialBodyView b;
 return hold.polygon>0&&intent.animal&&intent.lease&&!intent.retreat&&!intent.animalStrike&&
   intent.actor==q.actor&&intent.target==q.target&&intent.assignmentSequence==p.source.assignment&&
   intent.approachKnown&&intent.state==PlanningState::NeedsPlan&&!intent.animalRouteRequest&&
   s.effectiveTime>=p.time&&animalRouteDestinationCurrent(s,intent,q)&&
   !s.reservedBodies.count(q.body)&&!s.suspendedBodies.count(q.body)&&spatialReadBody(q.body,b)&&
   b.kind==1&&b.flags==1&&b.r==q.radius&&b.x==p.x&&b.z==p.z;
}
static int replanStoppedShieldCrop(double actor,double session,double polygon,const std::array<double,5>* contact,
                                   const std::array<double,2>* direct=nullptr){
 // The JS owner selects the ordinary Game service point. This owner verifies
 // the exact installed footprint, radial reach, and swept path of this body.
 auto& s=state();if(!integer(actor)||session!=s.session||!integer(polygon))return -1;
 if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
 const auto i=s.activeIntents.find(uint64_t(actor));if(i==s.activeIntents.end())return -2;
 auto& intent=i->second;auto& hold=intent.stoppedShieldCrop;
 if(!hold||hold->polygon!=polygon||!stoppedShieldCropCurrent(s,intent,*hold))return -2;
 const auto& p=hold->stop;
 float goalX=intent.approachX,goalZ=intent.approachZ;
 if(direct){
  const auto [x,z]=*direct;
  const auto& source=*hold->routeSource;
  if(!hold->stop.source.protection||!spatialShieldPolygonAbsent(hold->polygon)||!coordinate(x)||!coordinate(z)||
     std::abs(std::hypot(x-source.targetX,z-source.targetZ)-(source.radius+.6))>1e-8)return -2;
  goalX=float(x);goalZ=float(z);
 }
 if(contact){
  const auto [x,z,r,px,pz]=*contact;
  const auto& source=*hold->routeSource;
  if(!std::isfinite(px)||!std::isfinite(pz)||!spatialShieldFootprintCurrent(hold->polygon,x,z,r)||
     std::hypot(source.targetX-x,source.targetZ-z)>r||
     std::abs(std::hypot(px-x,pz-z)-(r+source.radius+.1))>1e-8)return -2;
  goalX=float(px);goalZ=float(pz);
 }
 const int previous=lazy_selected_context();
 if(previous!=intent.profile)spatial_select_nav_profile_index(intent.profile);
 const auto w=executionWorldStamp();
 const std::array<uint64_t,4> revision{w[0],w[1],w[2],lazy_route_revision()};
 if(!contact&&!direct&&hold->lastAttempt&&*hold->lastAttempt==revision){
  if(previous!=intent.profile)spatial_select_nav_profile_index(previous);
  return hold->lastResult;
 }
 if(!contact&&!direct)hold->lastAttempt=revision;
 const int count=spatial_world_route_cached(float(p.x),float(p.z),goalX,goalZ);
 s.planningCallsByActor[intent.actor]++;
 std::vector<float> points;int clear=0;
 if(count>0){
  const auto* xy=spatial_world_route_ptr();
  points.assign(xy,xy+count*2);
  if(xy[count*2-2]==goalX&&xy[count*2-1]==goalZ){
   double x=p.x,z=p.z;clear=1;
   for(int k=0;k<count&&clear==1;k++){
    const double nx=xy[k*2],nz=xy[k*2+1];
    clear=spatial_animal_attack_segment_clear(x,z,nx,nz,hold->routeSource->radius);
    x=nx;z=nz;
   }
  }
 }
 if(previous!=intent.profile)spatial_select_nav_profile_index(previous);
 if(count<0||clear==-1)return hold->lastResult=3;
 if(clear!=1)return hold->lastResult=0;
 const auto slot=uint32_t(p.source.slot);
 if(slot>=s.routeSlots.size()||s.routeSlots[slot].active)return -2;
 auto request=std::make_shared<NativeAnimalRouteRequest>(*hold->routeSource);
 request->at=s.effectiveTime;request->x=p.x;request->z=p.z;request->heading=p.yaw;request->phase=p.phase;
 request->entering=p.running;
 if(contact){
  request->shieldPolygon=hold->polygon;
  request->shieldX=(*contact)[0];request->shieldZ=(*contact)[1];request->shieldRadius=(*contact)[2];
  intent.approachX=goalX;intent.approachZ=goalZ;
 }
 if(direct){
  request->shieldPolygon=0;request->shieldX=0;request->shieldZ=0;request->shieldRadius=0;
  intent.approachX=goalX;intent.approachZ=goalZ;
 }
 auto& route=s.routeSlots[slot];
 route.points=std::move(points);route.actor=intent.actor;route.originX=p.x;route.originZ=p.z;
 route.active=true;route.pendingResources=true;route.generation=nextGateRouteGeneration(route.generation);
 intent.slot=slot;intent.generation=route.generation;intent.topology=lazy_route_revision();
 intent.routeStartX=float(p.x);intent.routeStartZ=float(p.z);intent.routeCursor=0;
 intent.state=PlanningState::AwaitingResources;intent.animalRouteRequest=request;
 request->sequence=emitIntentChange(s,intent);s.entityRevision++;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_animal_replan_shield_crop(double actor,double session,double polygon){
 return replanStoppedShieldCrop(actor,session,polygon,nullptr);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_replan_protected_crop(double actor,double session,double polygon,
 double shieldX,double shieldZ,double radius,double approachX,double approachZ){
 const std::array<double,5> contact{shieldX,shieldZ,radius,approachX,approachZ};
 return replanStoppedShieldCrop(actor,session,polygon,&contact);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_replan_expired_shield_crop(double actor,double session,double polygon,
 double approachX,double approachZ){
 const std::array<double,2> direct{approachX,approachZ};
 return replanStoppedShieldCrop(actor,session,polygon,nullptr,&direct);
}
// The expired pending program has no acquired route to revoke. Preserve its
// original stop or completed strike and discard only the uncommitted request.
EMSCRIPTEN_KEEPALIVE int nav_animal_retire_expired_shield_request(double actor,double session,double polygon,double sequence){
 auto& s=state();
 if(!integer(actor)||session!=s.session||!integer(polygon)||polygon>std::numeric_limits<int>::max()||!integer(sequence)||
    s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen||!spatialShieldPolygonAbsent(int(polygon)))return -2;
 const auto i=s.activeIntents.find(uint64_t(actor));
 if(i==s.activeIntents.end())return -2;
 auto& intent=i->second;
 const auto& q=intent.animalRouteRequest;
 if(!q||q->shieldPolygon!=polygon||q->sequence!=sequence||!animalRouteRequestCurrent(s,intent,false))return -2;
 if(!intent.stoppedShieldCrop){
  const auto& h=s.finishedAnimalStrike;
  if(!h||h->session!=s.session||h->actor!=uint64_t(actor)||h->body!=q->body||h->target!=q->target||h->center!=q->center||
     h->at>q->at||!h->covered||h->covered->shieldPolygon!=polygon||h->covered->shieldX!=q->shieldX||
     h->covered->shieldZ!=q->shieldZ||h->covered->shieldRadius!=q->shieldRadius||q->entering||
     h->x!=q->x||h->z!=q->z||h->yaw!=q->heading||h->phase!=q->phase||h->radius!=q->radius)return -2;
  releaseIntent(s,intent.actor,PlanningState::Cancelled);
  s.activeIntents.erase(i);
  s.entityRevision++;
  return 1;
 }
 if(intent.stoppedShieldCrop->polygon!=polygon)return -2;
 auto hold=std::move(*intent.stoppedShieldCrop);
 releaseRoute(s,intent);
 intent.state=PlanningState::NeedsPlan;
 intent.stoppedShieldCrop=std::move(hold);
 if(!stoppedShieldCropCurrent(s,intent,*intent.stoppedShieldCrop))return -2;
 s.entityRevision++;
 return 1;
}
extern "C++" void spatialIntentCompleteShieldCropStop(const SpatialShieldCropStop& stop,int polygon){
 auto& s=state();auto captured=std::exchange(s.pendingShieldCropStop,std::nullopt);
 if(!captured||polygon<=0)return;
 const auto i=s.activeIntents.find(uint64_t(stop.source.actor));
 if(i==s.activeIntents.end())return;
 captured->polygon=polygon;
 if(stoppedShieldCropCurrent(s,i->second,*captured))i->second.stoppedShieldCrop=std::move(captured);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_stopped_shield_crop(double actor){
 auto& s=state();if(!integer(actor))return 0;const auto i=s.activeIntents.find(uint64_t(actor));
 if(i==s.activeIntents.end()||!i->second.stoppedShieldCrop)return 0;
 const auto& stopped=*i->second.stoppedShieldCrop;const auto& p=stopped.stop;
 const auto& intent=i->second;const auto& q=intent.animalRouteRequest;
 const bool request=q&&animalRouteRequestCurrent(s,intent)&&q->body==p.source.body&&q->target==stopped.routeSource->target&&
   q->x==p.x&&q->z==p.z&&q->heading==p.yaw&&q->phase==p.phase;
 if(!request&&!stoppedShieldCropCurrent(s,intent,stopped))return -2;
 s.stoppedShieldCropResult={actor,double(stopped.routeSource->body),double(stopped.routeSource->target),
   double(stopped.polygon),p.time,p.x,p.z,p.yaw,p.phase,p.source.generation,p.source.assignment,p.source.ticket};
 return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_stopped_shield_crop_ptr(){return state().stoppedShieldCropResult.data();}
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
 if(intent.retreat)d.route.runDistance=d.route.distances.empty()?0:d.route.distances.back();
 else{result=animalRunDistance(d.route,*q,d.route.runDistance);if(result!=1)return result;}
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
 if(s.finishedAnimalStrike&&s.finishedAnimalStrike->actor==intent.actor)s.finishedAnimalStrike.reset();
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
   double(ready.ticket),ready.header[10],ready.header[11],q.centerX,q.centerZ,q.radius,q.x,q.z,q.phase,q.heading,q.attackCenter?1.:0.};
 return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_route_binding_ptr(){return state().animalRouteResult.data();}

// The physical registry owns the subject across request, travel and strike.
// Zero denotes a different protocol. A broken acquired source is an error.
EMSCRIPTEN_KEEPALIVE int nav_animal_crop_state(double actor){
 auto& s=state();if(!integer(actor))return 0;
 const auto it=s.activeIntents.find(uint64_t(actor));if(it==s.activeIntents.end())return 0;
 const auto& intent=it->second;
 if(intent.stoppedShieldCrop&&intent.state==PlanningState::NeedsPlan){
  const auto& h=*intent.stoppedShieldCrop;const auto& p=h.stop;const auto& q=*h.routeSource;
  if(!stoppedShieldCropCurrent(s,intent,h))return -1;
  s.animalCropState={1,4,actor,double(q.body),double(q.target),double(q.center),q.centerX,q.centerZ,
   q.radius,p.x,p.z,p.yaw,p.phase,0,0,0,s.effectiveTime,q.targetX,q.targetZ,0};
  return 4;
 }
 if(!intent.animal||intent.slot>=s.routeSlots.size())return 0;
 const auto& route=s.routeSlots[intent.slot];
 const auto binding=route.animalRouteBinding;
 const auto source=intent.animalRouteRequest?intent.animalRouteRequest:binding?binding->source:nullptr;
 if(!source)return 0;
 if(!animalRouteDestinationCurrent(s,intent,*source)||source->actor!=intent.actor||source->target!=intent.target||
    !route.active||route.actor!=intent.actor||route.generation!=intent.generation)return -1;
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
 if(mode==1&&s.finishedAnimalStrike&&s.finishedAnimalStrike->actor==intent.actor){
   s.animalCropState[20]=double(s.finishedAnimalStrike->attack);
   s.animalCropState[21]=double(s.finishedAnimalStrike->ticket);
 }
 s.animalCropState[22]=source->attackCenter?1.:0.;
 s.animalCropState[23]=double(source->shieldPolygon);
 return mode;
}
EMSCRIPTEN_KEEPALIVE const double* nav_animal_crop_state_ptr(){return state().animalCropState.data();}

// Only a current 18 or 26 candidate can request the mixed encounter proof.
// Both other intervals and an arbitrary stop must be safe. Disjoint swept
// boxes are a conservative certificate for the latter, including delayed GO.
static std::array<double,4> encounterBounds(const ReservationPath& path){
 const auto* route=path.route;
 const double x=route?route->originX:path.x,z=route?route->originZ:path.z;
 std::array<double,4> b{x,z,x,z};
 if(route)for(size_t i=0;i<route->points.size();i+=2){
  const double nx=route->points[i],nz=route->points[i+1];
  b[0]=std::min(b[0],nx);b[1]=std::min(b[1],nz);
  b[2]=std::max(b[2],nx);b[3]=std::max(b[3],nz);
 }
 return b;
}
static bool separatedFlightRoutes(const ReservationPath& home,const ReservationPath& crop,double reach){
 const auto h=encounterBounds(home),a=encounterBounds(crop);
 const double x=std::max({0.,a[0]-h[2],h[0]-a[2]}),z=std::max({0.,a[1]-h[3],h[1]-a[3]});
 const double scale=std::max({1.,std::abs(h[0]),std::abs(h[1]),std::abs(h[2]),std::abs(h[3]),
                              std::abs(a[0]),std::abs(a[1]),std::abs(a[2]),std::abs(a[3])});
 return std::hypot(x,z)>reach+1e-7+64*std::numeric_limits<double>::epsilon()*scale;
}
EMSCRIPTEN_KEEPALIVE int nav_flight_crop_proposal_clear(double session,double ticket,double worker,double animal,double event){
 auto& s=state();const auto& p=s.barrierProposal;
 const int biome=spatial_world_biome();
 if(!integer(worker)||!integer(animal)||worker==animal||!integer(event)||event<=0||(biome!=0&&biome!=1)||
    !p.pending||session!=double(s.session)||session!=double(p.session)||ticket!=double(p.ticket)||
    (p.kind!=18&&p.kind!=26)||spatial_body_count()!=2)return -2;
 const auto w=s.activeIntents.find(uint64_t(worker)),a=s.activeIntents.find(uint64_t(animal));
 if(w==s.activeIntents.end()||a==s.activeIntents.end()||!w->second.home||w->second.animal||!a->second.animal||a->second.retreat)return -2;
 const auto& wi=w->second;const auto& ai=a->second;
 const int mode=nav_animal_crop_state(animal);
 if(mode<1||mode>3||s.animalCropState[4]<=0||s.animalCropState[8]!=1.1)return -2;
 const bool center=s.animalCropState[22]==1;
 if(center!=(biome==1))return -2;
 // Home prepares first in the center cohort. Its proof includes the entire
 // declared center corridor even before the animal's own timetable exists.
 const auto& ar=s.routeSlots[ai.slot];ReservationPath crop{mode==1&&!center?nullptr:&ar,s.animalCropState[9],s.animalCropState[10]};
 const RouteSlot* hr=nullptr;auto source=std::shared_ptr<const NativeHomeResourceRequest>(wi.homeRequest);
 if(source){if(!nativeHomeRequestBodyCurrent(s,wi))return -2;}
 else{
  if(!nativeHomeBodyCurrent(s,wi)||wi.slot>=s.routeSlots.size())return -2;
  hr=&s.routeSlots[wi.slot];source=hr->homeBinding->requestSource;
 }
 if(!source||source->actor!=uint64_t(worker)||source->raidSpawnSequence!=uint64_t(event)||double(source->body)==s.animalCropState[3])return -2;
 ReservationPath home{hr,source->x,source->z};
 if(p.kind==18){
  if(!p.home||p.home->homeRequestSource!=source||p.home->route.actor!=wi.actor||p.home->body!=source->body)return -2;
  home.route=&p.home->route;
 }else{
  if(!p.animalRoute||p.animalRoute->animalRouteSource!=ai.animalRouteRequest||p.animalRoute->route.actor!=ai.actor||mode!=1)return -2;
  crop.route=&p.animalRoute->route;
 }
 // Game.updateWorkerEncounters uses the animal radius plus 1.1 metres
 // for a frontal encounter and the worker radius for actual collision.
 return separatedFlightRoutes(home,crop,s.animalCropState[8]+std::max(1.1,source->radius))?1:0;
}

// The spawn must be clear even if the acquired Farm is allowed to finish
// its entire corridor before Stop24 arrives. A pending body remains a point.
static int flightCropOriginClear(double session,double worker,double sequence,double x,double z,double radius,int bodies,int biome=0){
 const auto& s=state();
 if(session!=double(s.session)||!integer(worker)||!integer(sequence)||!std::isfinite(x)||!std::isfinite(z)||
    !std::isfinite(radius)||radius!=1.1||spatial_world_biome()!=biome||spatial_body_count()!=bodies)return -2;
 const auto it=s.activeIntents.find(uint64_t(worker));if(it==s.activeIntents.end())return -2;
 const auto& intent=it->second;ReservationPath path;double wr;
 if(nativeFarmArrivalBodyCurrent(s,intent)){
  const auto& route=s.routeSlots[intent.slot];
  if((biome==0&&!route.workerDrySweep)||intent.assignmentSequence!=uint64_t(sequence))return -2;
  path.route=&route;wr=route.radius;
 }else{
  const auto& h=intent.homeRequest;
  if(!h||!h->raidSpawnSequence||h->sequence!=uint64_t(sequence)||!nativeHomeRequestBodyCurrent(s,intent))return -2;
  path={nullptr,h->x,h->z};wr=h->radius;
 }
 return separatedFlightRoutes(path,{nullptr,x,z},radius+std::max(wr,1.1))?1:0;
}

EMSCRIPTEN_KEEPALIVE int nav_flight_crop_origin_clear(double session,double worker,double sequence,double x,double z,double radius){
 return flightCropOriginClear(session,worker,sequence,x,z,radius,1);
}
EMSCRIPTEN_KEEPALIVE int nav_flight_center_origin_clear(double session,double worker,double sequence,double x,double z,double radius){
 return flightCropOriginClear(session,worker,sequence,x,z,radius,1,1);
}
