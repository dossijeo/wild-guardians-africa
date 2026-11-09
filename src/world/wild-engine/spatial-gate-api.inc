EMSCRIPTEN_KEEPALIVE int nav_gate_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_state_width(){return 14;}
EMSCRIPTEN_KEEPALIVE double* nav_gate_input_ptr(int count){if(count<3||count>64)return nullptr;auto& s=state();s.gateInput.resize(size_t(count)*2);return s.gateInput.data();}
EMSCRIPTEN_KEEPALIVE int nav_gate_register(double id,double x,double z,double yaw,double sx,double sz,
    double hx,double hz,double opening,int status,int count){
  auto& s=state();
  if(!integer(id)||!coordinate(x)||!coordinate(z)||!std::isfinite(yaw)||!std::isfinite(sx)||!std::isfinite(sz)||
     sx<=0||sz<=0||sx>100||sz>100||!std::isfinite(hx)||!std::isfinite(hz)||status<0||status>2||count<3||count>64||
     s.gateInput.size()!=size_t(count)*2||(!std::isnan(opening)&&(!std::isfinite(opening)||opening<0||opening>1))||s.gates.count(uint64_t(id)))return 0;
  for(double v:s.gateInput)if(!std::isfinite(v)||std::abs(v)>1000)return 0;
  NativeGate gate;gate.id=uint64_t(id);gate.x=x;gate.z=z;gate.yaw=yaw;gate.sx=sx;gate.sz=sz;gate.hx=hx;gate.hz=hz;
  gate.status=status;gate.defined=!std::isnan(opening);gate.from=gate.target=gate.defined?opening:0;gate.at=s.effectiveTime;gate.local=s.gateInput;
  prepareGateGeometry(gate);
  if(!gateStaticRegistrationClear(s,gate))return 0;
  std::set<uint64_t> affected;uint64_t candidates=0,segments=0;
  if(!mutationAffectedRoutes(s,&gate.unsupported,1,0,candidates,segments,affected,true)||!affected.empty())return 0;
  cancelGateMotionProposal(s);
  const auto before=executionWorldStamp();s.gates.emplace(gate.id,std::move(gate));acknowledgeGateSupport(s,before);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_remove(double id){auto& s=state();if(!integer(id)||!s.gates.count(uint64_t(id)))return 0;
  if(!gateStaticProofCurrent(s))return 0;
  cancelGateMotionProposal(s);const auto before=executionWorldStamp();s.gates.erase(uint64_t(id));
  updateGateStaticDomain(s);acknowledgeGateSupport(s,before);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_bind_worker(double actor,double id){
  auto& s=state();if(!integer(actor)||!integer(id,true))return 0;
  const auto found=s.workers.find(uint64_t(actor));SpatialBodyView body;
  if(found==s.workers.end()||!spatialReadBody(uint64_t(id),body)||body.kind!=0)return 0;
  const auto old=s.gateBodyActors.find(uint64_t(id));if(old!=s.gateBodyActors.end()&&old->second!=uint64_t(actor))return 0;
  auto& worker=found->second;if(worker.bodyBound&&worker.body==uint64_t(id))return 1;
  cancelGateMotionProposal(s);if(worker.bodyBound)s.gateBodyActors.erase(worker.body);
  worker.bodyBound=true;worker.body=uint64_t(id);s.gateBodyActors.insert_or_assign(worker.body,worker.id);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_reconcile(int enabled){
  auto& s=state();if(enabled!=0&&enabled!=1)return -1;
  std::map<uint64_t,GateFacts> facts;
  if(enabled)for(const auto& [id,gate]:s.gates)if(gate.status==0){auto value=gateFacts(s,gate);
    if(!value.complete){
      // Uncertainty cannot leave a previous closing/opening target running.
      // Freeze the whole boundary at its current pose before reporting failure.
      cancelGateMotionProposal(s);
      for(auto& [otherId,other]:s.gates){other.from=other.target=gateOpening(other,s.effectiveTime);other.at=s.effectiveTime;other.bodySweepCertified=false;other.staticSweepCertified=false;}
      updateGateStaticDomain(s);
      return -2;
    }facts.emplace(id,value);}
  cancelGateMotionProposal(s);s.gateBoundaries++;
  for(auto& [id,gate]:s.gates){
    double current=gateOpening(gate,s.effectiveTime);gate.bodySweepCertified=false;gate.staticSweepCertified=false;
    if(!enabled){gate.from=gate.target=current;gate.at=s.effectiveTime;continue;}
    if(gate.status==2){gate.from=gate.target=0;gate.defined=true;gate.at=s.effectiveTime;continue;}
    if(gate.status!=0){gate.from=gate.target=current;gate.at=s.effectiveTime;continue;}
    const auto value=facts.at(id);gate.requested=value.requested;gate.occupied=value.occupied;
    if(!gate.defined)current=value.occupied?1:0;
    gate.defined=true;gate.from=current;gate.target=value.requested||value.occupied?1:0;gate.at=s.effectiveTime;
  }
  updateGateStaticDomain(s);return int(s.gates.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_state(double id){auto& s=state();s.gateResult.clear();if(!integer(id)||!s.gates.count(uint64_t(id)))return 0;
  const auto& gate=s.gates.at(uint64_t(id));s.gateResult={id,gateOpening(gate,s.effectiveTime),gate.target,gate.at,
    gate.at+std::abs(gate.target-gate.from)*nativeGateMoveSeconds,gate.requested?1.0:0,gate.occupied?1.0:0,
    double(gate.status),gate.trigger,gate.defined?1.0:0,1,gate.from,s.effectiveTime,0};return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_polygon(double id,int kind){auto& s=state();s.gateResult.clear();if(!integer(id)||!s.gates.count(uint64_t(id))||kind<0||kind>2)return 0;
  const auto& gate=s.gates.at(uint64_t(id));s.gateResult=kind==1?gate.swing:kind==2?gate.closed:gateLeaf(gate,gateOpening(gate,s.effectiveTime));
  return int(s.gateResult.size()/2);}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_result_ptr(){return state().gateResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_gate_worker_waiting(double actor){
  auto& s=state();if(!integer(actor)||!s.workers.count(uint64_t(actor)))return -1;
  const auto& worker=s.workers.at(uint64_t(actor));SpatialBodyView body;if(!gateBody(worker,body))return -1;if(!(body.flags&1))return 0;
  for(const auto& [id,gate]:s.gates){if(gate.status==2||std::hypot(body.x-gate.x,body.z-gate.z)>gate.trigger)continue;
    const double opening=gateOpening(gate,s.effectiveTime),ahead=std::max(4.0,gate.trigger+1);
    if((gateRouteHits(s,worker,body,gate.closed,ahead)&&(gate.status!=0||opening<1))||
       (opening>0&&opening<1&&gateRouteHits(s,worker,body,gate.swing,ahead)))return 1;
  }return 0;
}
EMSCRIPTEN_KEEPALIVE double nav_gate_boundaries(){return double(state().gateBoundaries);}
EMSCRIPTEN_KEEPALIVE double nav_gate_worker_checks(){return double(state().gateWorkerChecks);}
EMSCRIPTEN_KEEPALIVE double nav_gate_prefix_segments(){return double(state().gatePrefixSegments);}
EMSCRIPTEN_KEEPALIVE int nav_gate_sweep_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_prepare_motion(int enabled){
  auto& s=state();std::map<uint64_t,NativeGate> proposed;
  const int result=proposeGateMotion(s,enabled,proposed);if(result<0)return result;
  cancelGateMotionProposal(s);
  publishGateMotion(s,proposed);return int(s.gates.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_static_object_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_prepare_object_motion(int enabled){
  auto& s=state();std::map<uint64_t,NativeGate> proposed;
  const int result=proposeGateMotion(s,enabled,proposed,true);if(result<0)return result;
  cancelGateMotionProposal(s);publishGateMotion(s,proposed);return int(s.gates.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_static_objects_certified(double id){
  auto& s=state();return integer(id)&&s.gates.count(uint64_t(id))&&s.gates.at(uint64_t(id)).staticSweepCertified&&gateStaticProofCurrent(s)?1:0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_static_result_ptr(){return state().gateStaticResult.data();}
EMSCRIPTEN_KEEPALIVE double nav_gate_static_pairs(){return double(state().gateStaticPairs);}
EMSCRIPTEN_KEEPALIVE double nav_gate_static_evaluations(){return double(state().gateStaticEvaluations);}
EMSCRIPTEN_KEEPALIVE double nav_gate_static_rejected(){return double(state().gateStaticRejected);}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_transaction_version(){return 1;}
int stageGateMotion(int enabled,bool staticObjects){
  auto& s=state();if(!s.session)return -1;if(s.gateMotionProposal.pending)return -4;
  if(s.nextGateMotionTicket>=uint64_t(maxId)||spatialBodiesMutationRevision()==std::numeric_limits<uint64_t>::max())return -5;
  if(s.gates.empty())return -2;
  std::map<uint64_t,NativeGate> proposed;const int result=proposeGateMotion(s,enabled,proposed,staticObjects);if(result<0)return result;
  auto& p=s.gateMotionProposal;p.pending=true;p.session=s.session;p.ticket=++s.nextGateMotionTicket;
  p.at=s.effectiveTime;p.bodies=spatialBodiesMutationRevision();p.entities=s.entityRevision;
  p.factsSequence=s.sequence;p.intents=s.intentSequence;p.reservations=s.residencyPinRevision;
  p.world=executionWorldStamp();p.gates.swap(proposed);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_stage(int enabled){return stageGateMotion(enabled,false);}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_stage_objects(int enabled){return stageGateMotion(enabled,true);}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_ticket(){
  auto& s=state();s.gateMotionResult.fill(0);const auto& p=s.gateMotionProposal;if(!p.pending)return 0;
  s.gateMotionResult={double(p.session),double(p.ticket),double(p.intents),p.at,double(p.gates.size())};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_motion_ticket_ptr(){return state().gateMotionResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_cancel(double session,double ticket){
  auto& s=state();const auto& p=s.gateMotionProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||session!=double(p.session)||ticket!=double(p.ticket))return 0;
  cancelGateMotionProposal(s);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_commit(double session,double ticket,double sequence,double time){
  auto& s=state();const auto& p=s.gateMotionProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  if(!gateMotionProposalCurrent(s)){cancelGateMotionProposal(s);return -2;}
  // The authority bridge supplies these only after a fresh receipt from the
  // still-current draw connection. Native metadata is necessary, not evidence
  // of a transport receipt by itself and not a crossing/world-clearance permit.
  if(!integer(sequence,true)||sequence!=double(p.intents)||!std::isfinite(time)||time!=p.at){cancelGateMotionProposal(s);return -3;}
  publishGateMotion(s,s.gateMotionProposal.gates);cancelGateMotionProposal(s);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_body_sweep_certified(double id){
  auto& s=state();return integer(id)&&s.gates.count(uint64_t(id))&&s.gates.at(uint64_t(id)).bodySweepCertified?1:0;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_route_sweep(double id,double session,double slot,double generation,double target){
  auto& s=state();s.gateSweepResult.fill(0);
  if(!integer(id)||!s.gates.count(uint64_t(id))||!std::isfinite(target)||target<0||target>1||
     nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];if(!route.timingMode)return -1;
  auto proposal=s.gates.at(uint64_t(id));proposal.from=gateOpening(proposal,s.effectiveTime);proposal.target=target;proposal.at=s.effectiveTime;
  const auto answer=gateSweepPair(s,proposal,{&route},route.radius,s.effectiveTime,
    s.effectiveTime+std::abs(target-proposal.from)*nativeGateMoveSeconds);
  if(!answer.clear)s.gateSweepResult={id,0,answer.from,answer.to,double(answer.reason),0};return answer.clear?1:0;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_sweep_result_ptr(){return state().gateSweepResult.data();}
EMSCRIPTEN_KEEPALIVE double nav_gate_sweep_pairs(){return double(state().gateSweepPairs);}
EMSCRIPTEN_KEEPALIVE double nav_gate_sweep_evaluations(){return double(state().gateSweepEvaluations);}
EMSCRIPTEN_KEEPALIVE double nav_gate_sweep_rejected(){return double(state().gateSweepRejected);}

// Gate waits on the SAME route/timetable. Native activation intervals and
// certified opening clocks choose holds, never JS route tests or a scheduler.
// This is deliberately an unadmitted candidate: frame/world contacts and crossing
// leases must be implemented before it can be reserved or executed.
EMSCRIPTEN_KEEPALIVE int nav_gate_prepare_waiting_route(double session,double slot,
    double generation,double radius,int flags,double runBudget){
  auto& s=state();s.timingRejection=0;
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& old=s.routeSlots[size_t(slot)];const auto found=s.activeIntents.find(old.actor);
  if(found==s.activeIntents.end()||found->second.animal||found->second.slot!=uint32_t(slot)||
     found->second.generation!=uint32_t(generation)||found->second.state!=PlanningState::RouteActive||
     old.reserved||found->second.routeCursor||old.points.empty()||s.effectiveTime!=found->second.assignedAt)return -2;
  const auto worker=s.workers.find(found->first);SpatialBodyView body;
  if(worker==s.workers.end()||!gateBody(worker->second,body)||!(body.flags&1)||body.r!=radius||
     body.x!=old.originX||body.z!=old.originZ||bool(body.flags&2)!=bool(flags&32))return -2;
  const int previous=lazy_selected_context();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(found->second.profile);
  RouteSlot candidate;candidate.points=old.points;
  int result=prepareRouteTiming(candidate,found->first,body.x,body.z,s.effectiveTime,
    radius,2,flags,runBudget,true);
  if(result==1)result=prepareGateRouteWaits(s,candidate);
  const uint32_t topology=lazy_route_revision();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(previous);
  recordTimingResult(s,result);if(result!=1)return -7;
  releaseRoute(s,found->second);candidate.active=true;candidate.generation=old.generation+1;
  if(!candidate.generation)candidate.generation=1;
  old=std::move(candidate);auto& intent=found->second;
  intent.slot=uint32_t(slot);intent.generation=old.generation;intent.topology=topology;
  intent.routeStartX=float(body.x);intent.routeStartZ=float(body.z);intent.routeCursor=0;
  intent.timingMode=2;intent.timingRadius=radius;intent.motionFlags=flags;intent.runBudget=runBudget;
  emitIntentChange(s,intent);nav_intent_route_timing(session,slot,double(old.generation));return 1;
}
EMSCRIPTEN_KEEPALIVE double nav_gate_wait_segments(){return double(state().gateWaitSegments);}
