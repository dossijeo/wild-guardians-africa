EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_version(){return 1;}
// Canonical copies from the ineffective motor proposal, sharing the existing
// geometry and controller. Each row is an affine opening knot, not a JS solver.
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_presentations(double session,double ticket){
  auto& s=state();s.gateResult.clear();const auto& p=s.gateMotionProposal;
  if(!p.pending||!p.causal||session!=double(p.session)||ticket!=double(p.ticket)||!gateMotionProposalCurrent(s))return -1;
  for(const auto& [id,gate]:p.gates){if(!gate.crossings.empty())continue;if(!gate.mesh||gate.status!=0)return -2;s.gateResult.push_back(double(id));}
  return int(s.gateResult.size());
}
EMSCRIPTEN_KEEPALIVE int nav_gate_motion_presentation(double session,double ticket,double id){
  auto& s=state();s.gateResult.clear();const auto& p=s.gateMotionProposal;
  if(!p.pending||!p.causal||session!=double(p.session)||ticket!=double(p.ticket)||!gateMotionProposalCurrent(s)||!integer(id)||!p.gates.count(uint64_t(id)))return -1;
  const auto& gate=p.gates.at(uint64_t(id));if(!gate.mesh||gate.status!=0||!gate.crossings.empty())return -2;
  const double begin=p.at;auto times=gateMotionKnots(gate);times.push_back(begin);
  times.erase(std::remove_if(times.begin(),times.end(),[&](double at){return at<begin;}),times.end());
  std::sort(times.begin(),times.end());times.erase(std::unique(times.begin(),times.end()),times.end());
  s.gateResult={id,double(gate.mechanism),double(gate.mesh->id),gate.hx,gate.hz};const auto root=gateRootMatrix(gate);s.gateResult.insert(s.gateResult.end(),root.begin(),root.end());
  for(double at:times)s.gateResult.insert(s.gateResult.end(),{at,gateOpening(gate,at)});return int(times.size());
}
// Navigation proxies remain in the canonical barrier index. Only the exact
// three immutable proxies of this authored mechanism are self geometry.
static bool gateNavigationProxiesMatch(const IntentState& s,NativeGate& gate,const std::array<int,3>& ids){
 if(ids[0]<=0||ids[1]<=0||ids[2]<=0||ids[0]==ids[1]||ids[0]==ids[2]||ids[1]==ids[2])return false;
 for(const auto& [otherId,other]:s.gates)for(int owned:other.navigationBarriers)if(owned&&std::find(ids.begin(),ids.end(),owned)!=ids.end())return false;
 const auto parts=gateMeshParts(gate,-std::numeric_limits<double>::infinity(),gate.mesh->height/gate.sz);
 const double c=std::cos(gate.yaw),sin=std::sin(gate.yaw);
 for(int side=0;side<2;side++){
  if(parts[side].size()<6)return false;
  double minX=std::numeric_limits<double>::infinity(),minZ=minX,maxX=-minX,maxZ=-minX;
  for(size_t at=0;at<parts[side].size();at+=2){const double x=parts[side][at]*gate.sx,z=parts[side][at+1]*gate.sz;minX=std::min(minX,x);maxX=std::max(maxX,x);minZ=std::min(minZ,z);maxZ=std::max(maxZ,z);}
  const double x=(minX+maxX)/2,z=(minZ+maxZ)/2;
  if(!spatialGateProxyBarrierMatches(ids[side],gate.x+x*c+z*sin,gate.z-x*sin+z*c,(maxX-minX)/2,(maxZ-minZ)/2,gate.yaw,0))return false;
 }
 if(!spatialGateProxyBarrierMatches(ids[2],gate.x,gate.z,1.09*gate.sx,.22*gate.sz,gate.yaw,1))return false;
 gate.navigationBarriers=ids;return true;
}

static int installGateMechanism(double id,int modelId,const std::array<int,3>& proxies={},int direction=1){
  auto& s=state();if(!s.session||!integer(id)||!s.gates.count(uint64_t(id))||s.nextGateMechanism>=uint64_t(maxId))return -4;
  if(!gateStaticProofCurrent(s))return -5;
  NativeGate candidate=s.gates.at(uint64_t(id));
  candidate.openingDirection=direction;
  if(!prepareGateMechanismGeometry(candidate,nativeGateMeshModel(modelId)))return -4;
  if(proxies[0]&&(!gateNavigationProxiesMatch(s,candidate,proxies)||s.causalClock||s.barrierProposal.pending||s.worldMutationPreview||s.executionEnabled))return -4;
  const int proof=proveGateMechanismCandidate(s,candidate);if(proof!=1)return proof;
  auto proposed=s.gates;proposed.at(uint64_t(id))=candidate;
  auto& installed=proposed.at(uint64_t(id));installed.mechanism=++s.nextGateMechanism;installed.bodySweepCertified=installed.staticSweepCertified=true;
  const auto before=executionWorldStamp();cancelGateMotionProposal(s);publishGateMotion(s,proposed);acknowledgeGateSupport(s,before);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_install(double id,int modelId){return installGateMechanism(id,modelId);}
// Additive bootstrap entry point. Existing install ABI and live fences remain.
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_install_owned(double id,int modelId,double left,double right,double envelope){
 if(!integer(left)||!integer(right)||!integer(envelope)||left>2147483647||right>2147483647||envelope>2147483647)return -4;
 return installGateMechanism(id,modelId,{int(left),int(right),int(envelope)});
}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_install_reverse(double id,int modelId,double left,double right,double envelope){
 if(!integer(left)||!integer(right)||!integer(envelope)||left>2147483647||right>2147483647||envelope>2147483647)return -4;
 return installGateMechanism(id,modelId,{int(left),int(right),int(envelope)},-1);
}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_pose(double id){
  auto& s=state();s.gateMechanismPose.fill(0);
  if(!integer(id)||!s.gates.count(uint64_t(id))||!s.gates.at(uint64_t(id)).mesh||!gateStaticProofCurrent(s))return 0;
  const auto& g=s.gates.at(uint64_t(id));const auto root=gateRootMatrix(g),leaf=gateLeafMatrix(g,s.effectiveTime);
  auto& out=s.gateMechanismPose;out[0]=id;out[1]=g.mesh->id;out[2]=double(g.mechanism);out[3]=g.baseY;
  out[4]=g.supportMin;out[5]=g.supportMax;out[6]=s.effectiveTime;out[7]=gateOpening(g,s.effectiveTime);
  std::copy(root.begin(),root.end(),out.begin()+8);std::copy(leaf.begin(),leaf.end(),out.begin()+24);out[40]=g.openingDirection;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_mechanism_pose_ptr(){return state().gateMechanismPose.data();}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_vertices(double id){
  auto& s=state();if(!integer(id)||!s.gates.count(uint64_t(id))||!s.gates.at(uint64_t(id)).mesh)return 0;
  return s.gates.at(uint64_t(id)).mesh->vertices;
}
EMSCRIPTEN_KEEPALIVE const float* nav_gate_mechanism_positions_ptr(double id){
  return nav_gate_mechanism_vertices(id)?state().gates.at(uint64_t(id)).mesh->positions:nullptr;
}
EMSCRIPTEN_KEEPALIVE const unsigned char* nav_gate_mechanism_leaf_ptr(double id){
  return nav_gate_mechanism_vertices(id)?state().gates.at(uint64_t(id)).mesh->leaf:nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_segment(double id,double actorBody,double x,double z,double nx,double nz){
  auto& s=state();s.gateMechanismCollision.fill(0);SpatialBodyView body;
  if(!integer(id)||!integer(actorBody,true)||!coordinate(x)||!coordinate(z)||!coordinate(nx)||!coordinate(nz)||
     !s.gates.count(uint64_t(id))||!s.gates.at(uint64_t(id)).mesh||!spatialReadBody(uint64_t(actorBody),body)||!gateStaticProofCurrent(s))return -1;
  const auto& g=s.gates.at(uint64_t(id));int mask;const int result=gateMechanismSegment(g,body,x,z,nx,nz,mask);
  s.gateMechanismCollision={id,actorBody,double(mask),s.effectiveTime,g.baseY,g.supportMin,g.supportMax,double(g.mechanism)};return result;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_mechanism_collision_ptr(){return state().gateMechanismCollision.data();}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_world_vertices(double id){
  auto& s=state();s.gateMechanismWorld.clear();if(nav_gate_mechanism_pose(id)!=1)return 0;
  const auto& g=s.gates.at(uint64_t(id));const auto root=gateRootMatrix(g),leaf=gateLeafMatrix(g,s.effectiveTime);
  s.gateMechanismWorld.reserve(size_t(g.mesh->vertices)*3);
  for(int i=0;i<g.mesh->vertices;i++){const int at=i*3;GatePoint3 p{g.mesh->positions[at],g.mesh->positions[at+1],g.mesh->positions[at+2]};
    if(g.mesh->leaf[i])p=gateTransform(leaf,p);p=gateTransform(root,p);s.gateMechanismWorld.insert(s.gateMechanismWorld.end(),{p.x,p.y,p.z});}
  return g.mesh->vertices;
}
EMSCRIPTEN_KEEPALIVE const double* nav_gate_mechanism_world_ptr(){return state().gateMechanismWorld.data();}
