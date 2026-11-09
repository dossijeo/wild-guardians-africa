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
  std::set<uint64_t> affected;uint64_t candidates=0,segments=0;
  if(!mutationAffectedRoutes(s,&gate.unsupported,1,0,candidates,segments,affected,true)||!affected.empty())return 0;
  const auto before=executionWorldStamp();s.gates.emplace(gate.id,std::move(gate));acknowledgeGateSupport(s,before);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_remove(double id){auto& s=state();if(!integer(id)||!s.gates.count(uint64_t(id)))return 0;
  const auto before=executionWorldStamp();s.gates.erase(uint64_t(id));acknowledgeGateSupport(s,before);return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_bind_worker(double actor,double id){
  auto& s=state();if(!integer(actor)||!integer(id,true))return 0;
  const auto found=s.workers.find(uint64_t(actor));SpatialBodyView body;
  if(found==s.workers.end()||!spatialReadBody(uint64_t(id),body)||body.kind!=0)return 0;
  const auto old=s.gateBodyActors.find(uint64_t(id));if(old!=s.gateBodyActors.end()&&old->second!=uint64_t(actor))return 0;
  auto& worker=found->second;if(worker.bodyBound)s.gateBodyActors.erase(worker.body);
  worker.bodyBound=true;worker.body=uint64_t(id);s.gateBodyActors.insert_or_assign(worker.body,worker.id);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_reconcile(int enabled){
  auto& s=state();if(enabled!=0&&enabled!=1)return -1;
  std::map<uint64_t,GateFacts> facts;
  if(enabled)for(const auto& [id,gate]:s.gates)if(gate.status==0){auto value=gateFacts(s,gate);
    if(!value.complete){
      // Uncertainty cannot leave a previous closing/opening target running.
      // Freeze the whole boundary at its current pose before reporting failure.
      for(auto& [otherId,other]:s.gates){other.from=other.target=gateOpening(other,s.effectiveTime);other.at=s.effectiveTime;}
      return -2;
    }facts.emplace(id,value);}
  s.gateBoundaries++;
  for(auto& [id,gate]:s.gates){
    double current=gateOpening(gate,s.effectiveTime);
    if(!enabled){gate.from=gate.target=current;gate.at=s.effectiveTime;continue;}
    if(gate.status==2){gate.from=gate.target=0;gate.defined=true;gate.at=s.effectiveTime;continue;}
    if(gate.status!=0){gate.from=gate.target=current;gate.at=s.effectiveTime;continue;}
    const auto value=facts.at(id);gate.requested=value.requested;gate.occupied=value.occupied;
    if(!gate.defined)current=value.occupied?1:0;
    gate.defined=true;gate.from=current;gate.target=value.requested||value.occupied?1:0;gate.at=s.effectiveTime;
  }
  return int(s.gates.size());
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
