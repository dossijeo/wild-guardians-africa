EMSCRIPTEN_KEEPALIVE int nav_gate_crossing_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_crossing_count(double id){
  const auto& s=state();if(!integer(id)||!s.gates.count(uint64_t(id)))return -1;
  return int(s.gates.at(uint64_t(id)).crossings.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_crossings(double id){
  auto& s=state();s.gateResult.clear();if(!integer(id)||!s.gates.count(uint64_t(id)))return -1;
  for(const auto& [actor,c]:s.gates.at(uint64_t(id)).crossings)
    s.gateResult.insert(s.gateResult.end(),{double(actor),double(c.body),double(c.slot),double(c.generation),c.from,c.until});
  return int(s.gateResult.size()/6);
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_admitted(double session,double slot,double generation){
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  return state().routeSlots[size_t(slot)].gateAdmitted?1:0;
}
// Read-only resource capture for one already admitted assignment. No motor,
// crossing, route, execution clock or physical proof is changed by these reads.
EMSCRIPTEN_KEEPALIVE int nav_gate_route_presentations_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_presentations(double session,double slot,double generation){
  auto& s=state();s.gateResult.clear();if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];
  if(!route.gateAdmitted)return route.gateReservations.empty()?0:-1;
  if(!route.reserved||!route.timingMode||!gateStaticProofCurrent(s))return -1;
  for(uint64_t id:route.gateReservations){const auto found=s.gates.find(id);
    if(found==s.gates.end()||!found->second.mesh)return -2;
    s.gateResult.push_back(double(id));
  }
  return int(s.gateResult.size());
}
static int captureNativeGateRouteCurve(IntentState& s,const RouteSlot& route,const NativeGate& gate){
  const double begin=route.startTime,end=routeTimeAtDistance(route,route.distances.back());
  std::vector<double> times{begin,end};for(double at:gateMotionKnots(gate))if(at>begin&&at<end)times.push_back(at);
  std::sort(times.begin(),times.end());times.erase(std::unique(times.begin(),times.end()),times.end());
  s.gateResult={double(gate.id),double(gate.mechanism),double(gate.mesh->id),gate.hx,gate.hz};
  const auto root=gateRootMatrix(gate);s.gateResult.insert(s.gateResult.end(),root.begin(),root.end());
  for(double at:times)s.gateResult.insert(s.gateResult.end(),{at,gateOpening(gate,at)});
  return int(times.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_presentation(double session,double slot,double generation,double gateId){
  auto& s=state();s.gateResult.clear();if(nav_intent_route_points(session,slot,generation)<0||!integer(gateId))return -1;
  const auto& route=s.routeSlots[size_t(slot)];const uint64_t id=uint64_t(gateId);
  if(!route.gateAdmitted||!route.reserved||!route.timingMode||!gateStaticProofCurrent(s)||
      std::find(route.gateReservations.begin(),route.gateReservations.end(),id)==route.gateReservations.end())return -1;
  const auto found=s.gates.find(id);if(found==s.gates.end()||!found->second.mesh)return -2;
  const auto& gate=found->second;
  return captureNativeGateRouteCurve(s,route,gate);
}

// Opt-in native admission only. It does not publish a GPU clock/permission or
// activate the product runtime. Failure never installs a partial route/motor.
EMSCRIPTEN_KEEPALIVE int nav_gate_admit_route(double session,double slot,double generation,
    double bodyId,double radius,int flags,double runBudget){
  auto& s=state();s.timingRejection=0;s.reservationResult.fill(0);s.gateSweepResult.fill(0);s.gateStaticResult.fill(0);
  if(!integer(bodyId,true)||nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& old=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(old.actor);
  if(found==s.activeIntents.end()||found->second.animal||found->second.slot!=uint32_t(slot)||
     found->second.generation!=uint32_t(generation)||found->second.state!=PlanningState::RouteActive||
     old.reserved||found->second.routeCursor||old.points.empty()||s.effectiveTime!=found->second.assignedAt||
     !gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  const auto worker=s.workers.find(found->first);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||worker->second.body!=uint64_t(bodyId)||
     !(body.flags&1)||body.r!=radius||body.x!=old.originX||body.z!=old.originZ||
     bool(body.flags&2)!=bool(flags&32)||s.reservedBodies.count(uint64_t(bodyId)))return -3;
  const int previous=lazy_selected_context();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(found->second.profile);
  RouteSlot candidate;candidate.points=old.points;
  int result=prepareRouteTiming(candidate,found->first,body.x,body.z,s.effectiveTime,radius,2,flags,runBudget,true);
  const uint32_t topology=lazy_route_revision();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(previous);
  auto proposed=s.gates;std::vector<GateCrossingBoundary> boundaries;
  recordTimingResult(s,result);if(result!=1)return -7;
  result=proveGateRouteAdmission(s,found->second,candidate,uint64_t(bodyId),body,proposed,boundaries);
  if(result!=1)return result;
  found->second.topology=topology;
  publishGateRouteAdmission(s,found->second,uint32_t(slot),candidate,uint64_t(bodyId),proposed,boundaries);
  nav_intent_route_timing(session,slot,double(old.generation));return 1;
}
// Explicit native command events; no polling timer or automatic retry loop.
EMSCRIPTEN_KEEPALIVE int nav_gate_route_suspend_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_suspend_route(double session,double slot,double generation){
  auto& s=state();if(nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& route=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(route.actor);
  if(found==s.activeIntents.end()||found->second.slot!=uint32_t(slot)||found->second.generation!=uint32_t(generation)||
     !suspendRoute(s,found->second))return -2;
  emitIntentChange(s,found->second);return 1;
}
RouteSlot* suspendedGateRoute(double session,double slot,double generation){
  auto& s=state();if(!integer(session)||session!=double(s.session)||!integer(slot,true)||slot>=s.routeSlots.size()||
     !integer(generation)||generation>double(UINT32_MAX))return nullptr;
  auto& route=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(route.actor);
  return found!=s.activeIntents.end()&&found->second.state==PlanningState::WaitingBlocked&&found->second.slot==uint32_t(slot)&&
    found->second.generation==uint32_t(generation)&&intentHasSuspendedRoute(s,found->second)?&route:nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_suspended_route(double actor){
  auto& s=state();s.suspendedRouteResult.fill(0);if(!integer(actor))return 0;
  const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;
  const auto& intent=found->second;if(!intentHasSuspendedRoute(s,intent))return 0;
  const auto& route=s.routeSlots[intent.slot];const auto& pose=route.executionPose;
  auto& out=s.suspendedRouteResult;
  out[0]=actor;out[1]=s.session;out[2]=intent.slot;out[3]=intent.generation;out[4]=route.suspendedAt;
  out[5]=double(route.points.size()/2-size_t(pose[5]));out[6]=double(route.reservationBody);out[7]=route.motionFlags;out[8]=route.radius;
  std::copy(pose.begin(),pose.end(),out.begin()+9);out[9+7]=route.suspendedAt;out[9+15]=out[9+16]=0;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_suspended_route_ptr(){return state().suspendedRouteResult.data();}
EMSCRIPTEN_KEEPALIVE const float* nav_gate_suspended_points_ptr(double session,double slot,double generation){
  const auto route=suspendedGateRoute(session,slot,generation);
  return route?route->points.data()+size_t(route->executionPose[5])*2:nullptr;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_motion_offset_ptr(double session,double slot,double generation){
  return nav_intent_route_points(session,slot,generation)>=0?state().routeSlots[size_t(slot)].motionOffset.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_resumable(double session,double slot,double generation){
  return nav_intent_route_points(session,slot,generation)<0?-1:state().routeSlots[size_t(slot)].resumable?1:0;
}
EMSCRIPTEN_KEEPALIVE double nav_gate_route_suspensions(){return double(state().routeSuspensions);}
EMSCRIPTEN_KEEPALIVE double nav_gate_route_resumptions(){return double(state().routeResumptions);}
// Shared native candidate builder. Preparing a suffix does not publish an
// assignment, release its pinned body, install a gate motor or advance time.
static int prepareNativeGateRouteResume(double session,double slot,double generation,
    RouteSlot& candidate,std::map<uint64_t,NativeGate>& proposed,
    std::vector<GateCrossingBoundary>& boundaries,uint32_t& topology,uint64_t& bodyId){
  auto& s=state();s.timingRejection=0;s.reservationResult.fill(0);s.gateSweepResult.fill(0);s.gateStaticResult.fill(0);
  const auto old=suspendedGateRoute(session,slot,generation);if(!old)return -1;
  if(!gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  const auto found=s.activeIntents.find(old->actor);const auto worker=s.workers.find(old->actor);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||worker->second.body!=old->reservationBody||
     !(body.flags&1)||body.r!=old->radius||body.x!=old->executionPose[0]||body.z!=old->executionPose[1]||
     bool(body.flags&2)!=bool(old->motionFlags&32)||s.reservedBodies.count(old->reservationBody))return -3;
  const int previous=lazy_selected_context();if(previous!=old->profile)spatial_select_nav_profile_index(old->profile);
  candidate.points.assign(old->points.begin()+size_t(old->executionPose[5])*2,old->points.end());
  int result=prepareRouteTiming(candidate,old->actor,body.x,body.z,s.effectiveTime,old->radius,2,old->motionFlags,old->executionPose[14],true);
  topology=lazy_route_revision();if(previous!=old->profile)spatial_select_nav_profile_index(previous);
  recordTimingResult(s,result);if(result!=1)return -7;
  const auto& pose=old->executionPose;candidate.motionOffset={pose[2],pose[3],pose[9],pose[10],pose[11],pose[12],pose[13]};
  proposed=s.gates;
  result=proveGateRouteAdmission(s,found->second,candidate,old->reservationBody,body,proposed,boundaries,false);
  if(result!=1)return result;
  bodyId=old->reservationBody;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_route(double session,double slot,double generation){
  RouteSlot candidate;std::map<uint64_t,NativeGate> proposed;
  std::vector<GateCrossingBoundary> boundaries;uint32_t topology=0;uint64_t bodyId=0;
  const int result=prepareNativeGateRouteResume(session,slot,generation,candidate,proposed,boundaries,topology,bodyId);
  if(result!=1)return result;
  auto& s=state();const auto found=s.activeIntents.find(candidate.actor);found->second.topology=topology;
  publishGateRouteAdmission(s,found->second,uint32_t(slot),candidate,bodyId,proposed,boundaries);s.routeResumptions++;
  nav_intent_route_timing(session,slot,double(s.routeSlots[size_t(slot)].generation));return 1;
}

// The same resume candidate can be prepared without making it executable.
// Its existing transaction ticket expires on any changed native read-set member.
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_stage(double session,double slot,double generation){
  auto& s=state();if(s.barrierProposal.pending||s.worldMutationPreview)return -4;
  PendingNativeResume draft;
  const int result=prepareNativeGateRouteResume(session,slot,generation,draft.route,draft.gates,draft.boundaries,draft.topology,draft.body);
  if(result!=1)return result;
  const int staged=stageWorldMutationBoundary(nullptr,0);if(staged!=1)return staged;
  auto& p=s.barrierProposal;p.kind=13;draft.slot=uint32_t(slot);draft.generation=uint32_t(generation);
  const auto& route=draft.route;std::vector<double> knots{route.startTime};reservationKnots({&route},route.startTime,knots);
  std::sort(knots.begin(),knots.end());knots.erase(std::unique(knots.begin(),knots.end()),knots.end());
  for(size_t i=0;i<knots.size();i++){
    const double at=knots[i];const auto pose=sampleRouteTiming(route,at),right=i+1<knots.size()?sampleRouteTiming(route,at+(knots[i+1]-at)*.5):pose;
    draft.rows.insert(draft.rows.end(),{at,pose[0],pose[1],pose[2],pose[3],right[4],right[5],right[6],pose[9],pose[10],pose[11],pose[12],pose[13],pose[14],right[15],right[16]});
  }
  const auto& intent=s.activeIntents.at(route.actor);const auto& old=s.routeSlots[draft.slot];
  draft.header={1,double(route.actor),double(draft.body),double(draft.generation),double(nextGateRouteGeneration(draft.generation)),double(route.profile),double(route.motionFlags),route.radius,
    route.originX,route.originZ,route.startTime,routeTimeAtDistance(route,route.distances.back()),route.distances.back(),route.speed,route.runDistance,route.runSpeed,route.runBudget,double(route.timingMode),
    double(route.points.size()/2),double(knots.size()),double(draft.slot),double(intent.assignmentSequence),old.suspendedAt,double(p.intents)};
  p.resume=std::move(draft);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_snapshot(double session,double ticket){
  auto& s=state();const auto& p=s.barrierProposal;if(!p.resume||p.kind!=13)return -1;
  return takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),13);
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_resume_proposal_header_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==13&&p.resume?p.resume->header.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_points(double session,double ticket){
  const int valid=nav_gate_resume_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.resume->route.points.size()/2):valid;
}
EMSCRIPTEN_KEEPALIVE const float* nav_gate_resume_proposal_points_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==13&&p.resume?p.resume->route.points.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_rows(double session,double ticket){
  const int valid=nav_gate_resume_proposal_snapshot(session,ticket);return valid==1?int(state().barrierProposal.resume->rows.size()/16):valid;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_resume_proposal_rows_ptr(){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==13&&p.resume?p.resume->rows.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_commit(double session,double ticket,double sequence,double time,double clockSequence){
  auto& s=state();if(!s.barrierProposal.resume)return -1;
  const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,13);if(valid!=1)return valid;
  auto draft=std::move(*s.barrierProposal.resume);clearWorldMutationProposal(s.barrierProposal);
  const auto found=s.activeIntents.find(draft.route.actor);found->second.topology=draft.topology;
  publishGateRouteAdmission(s,found->second,draft.slot,draft.route,draft.body,draft.gates,draft.boundaries);s.routeResumptions++;
  nav_intent_route_timing(session,double(draft.slot),double(s.routeSlots[draft.slot].generation));return 1;
}

EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_gates(double session,double ticket){
  const int valid=nav_gate_resume_proposal_snapshot(session,ticket);if(valid!=1)return valid;
  auto& s=state();s.gateResult.clear();for(uint64_t id:s.barrierProposal.resume->route.gateReservations)s.gateResult.push_back(double(id));return int(s.gateResult.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_gate(double session,double ticket,double gateId){
  const int valid=nav_gate_resume_proposal_snapshot(session,ticket);if(valid!=1)return valid;
  auto& s=state();s.gateResult.clear();if(!integer(gateId))return -1;const auto& draft=*s.barrierProposal.resume;const uint64_t id=uint64_t(gateId);
  if(std::find(draft.route.gateReservations.begin(),draft.route.gateReservations.end(),id)==draft.route.gateReservations.end())return -1;
  const auto found=draft.gates.find(id);if(found==draft.gates.end()||!found->second.mesh)return -2;
  return captureNativeGateRouteCurve(s,draft.route,found->second);
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_cancel(double session,double ticket){
  const auto& p=state().barrierProposal;if(p.kind!=13||!p.resume)return 0;
  return nav_intent_barrier_proposal_cancel(session,ticket);
}

// Compare immutable motion separately from its execution origin. Preserve the
// exact native-double result and report explicit Float32 resource projection
// separately. No epsilon, hash or caller data may grant physical permission.
static double resumeProjectionTime(double value,bool up){
  float projected=float(value);
  if(up?double(projected)<value:double(projected)>value)projected=std::nextafter(projected,up?std::numeric_limits<float>::infinity():-std::numeric_limits<float>::infinity());
  return double(projected);
}
static bool sameNativeResumeMotion(const PendingNativeResume& a,const PendingNativeResume& b,bool projection=false){
  if(a.slot!=b.slot||a.generation!=b.generation||a.body!=b.body||a.route.points!=b.route.points||a.route.gateReservations!=b.route.gateReservations||a.rows.size()!=b.rows.size())return false;
  for(size_t i=0;i<a.header.size();i++)if(i!=10&&i!=11&&i!=23&&a.header[i]!=b.header[i])return false;
  const double oldDuration=a.header[11]-a.header[10],newDuration=b.header[11]-b.header[10];
  if((projection?resumeProjectionTime(oldDuration,false):oldDuration)!=(projection?resumeProjectionTime(newDuration,false):newDuration))return false;
  for(size_t i=0;i<a.rows.size();i++){
    const double oldValue=i%16?a.rows[i]:a.rows[i]-a.route.startTime,newValue=i%16?b.rows[i]:b.rows[i]-b.route.startTime;
    if(projection?(i%16?float(oldValue)!=float(newValue):resumeProjectionTime(oldValue,true)!=resumeProjectionTime(newValue,true)):oldValue!=newValue)return false;
  }
  return true;
}
static bool sameNativeResumeGates(IntentState& s,const PendingNativeResume& a,const PendingNativeResume& b,bool projection=false){
  if(a.route.gateReservations!=b.route.gateReservations)return false;
  for(uint64_t id:a.route.gateReservations){
    const auto old=a.gates.find(id),next=b.gates.find(id);
    if(old==a.gates.end()||next==b.gates.end()||!old->second.mesh||old->second.mesh!=next->second.mesh)return false;
    if(captureNativeGateRouteCurve(s,a.route,old->second)<1)return false;const auto values=s.gateResult;
    if(captureNativeGateRouteCurve(s,b.route,next->second)<1||values.size()!=s.gateResult.size())return false;
    for(size_t i=0;i<values.size();i++){
      const bool time=i>=21&&(i-21)%2==0;
      const double oldValue=time?values[i]-a.route.startTime:values[i],newValue=time?s.gateResult[i]-b.route.startTime:s.gateResult[i];
      if(projection&&i>=21?(time?resumeProjectionTime(oldValue,true)!=resumeProjectionTime(newValue,true):float(oldValue)!=float(newValue)):oldValue!=newValue)return false;
    }
  }
  return true;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_revalidation_version(){return 2;}
EMSCRIPTEN_KEEPALIVE int nav_gate_resume_proposal_revalidate(double session,double ticket){
  auto& s=state();auto& p=s.barrierProposal;
  if(!p.pending||p.kind!=13||!p.resume||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  // This read identifies only the old native draft. Rebuilding below performs
  // the complete current body/world/gate/reservation proof at effectiveTime.
  auto old=std::move(*p.resume);clearWorldMutationProposal(p);
  const int result=nav_gate_resume_proposal_stage(session,double(old.slot),double(old.generation));if(result!=1)return result;
  auto& next=*s.barrierProposal.resume;
  next.timeTranslation={2,ticket,double(s.barrierProposal.ticket),old.header[10],old.header[11],next.header[10],next.header[11],
    sameNativeResumeMotion(old,next)?1.:0.,sameNativeResumeGates(s,old,next)?1.:0.,
    sameNativeResumeMotion(old,next,true)?1.:0.,sameNativeResumeGates(s,old,next,true)?1.:0.};
  return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_resume_proposal_time_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;
  return p.pending&&p.kind==13&&p.resume&&session==double(p.session)&&ticket==double(p.ticket)&&p.resume->timeTranslation[0]==2?p.resume->timeTranslation.data():nullptr;
}
