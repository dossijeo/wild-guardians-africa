EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_install(double id,int modelId){
  auto& s=state();if(!s.session||!integer(id)||!s.gates.count(uint64_t(id))||s.nextGateMechanism>=uint64_t(maxId))return -4;
  if(!gateStaticProofCurrent(s))return -5;
  NativeGate candidate=s.gates.at(uint64_t(id));
  if(!prepareGateMechanismGeometry(candidate,nativeGateMeshModel(modelId)))return -4;
  const auto& b=candidate.unsupported;double support[3];
  const int mounted=spatialGateMountSupport(candidate.x,candidate.z,b.minX,b.minZ,b.maxX,b.maxZ,support);
  if(mounted!=1)return mounted==0?-3:mounted;
  candidate.baseY=support[0];candidate.supportMin=support[1];candidate.supportMax=support[2];
  candidate.workerParts=gateMeshParts(candidate,(candidate.supportMin+.025-candidate.baseY-1e-5)/candidate.sz,
    (candidate.supportMax+.025+candidate.mesh->height-candidate.baseY+1e-5)/candidate.sz);
  struct Bodies {const NativeGate& gate;bool clear=true;};Bodies bodies{candidate};
  spatialVisitBodiesBox(b.minX,b.minZ,b.maxX,b.maxZ,[](uint64_t,const SpatialBodyView& body,void* opaque){auto& q=*static_cast<Bodies*>(opaque);
    if(!q.clear||!(body.flags&1))return;const auto& bounds=q.gate.unsupported;
    if(body.x+body.r<bounds.minX||body.x-body.r>bounds.maxX||body.z+body.r<bounds.minZ||body.z-body.r>bounds.maxZ)return;
    int mask;if(gateMechanismSegment(q.gate,body,body.x,body.z,body.x,body.z,mask)!=1)q.clear=false;
  },&bodies);
  if(!bodies.clear||!gateSweepBodies(s,candidate))return -5;
  std::set<uint64_t> affected;uint64_t candidates=0,segments=0;
  if(!mutationAffectedRoutes(s,&b,1,0,candidates,segments,affected,true)||!affected.empty())return -5;
  auto proposed=s.gates;proposed.at(uint64_t(id))=candidate;
  const int objects=gateSweepStaticObjects(s,proposed,true);if(objects!=1)return objects==-6?-1:objects==-7?-2:-5;
  auto& installed=proposed.at(uint64_t(id));installed.mechanism=++s.nextGateMechanism;installed.bodySweepCertified=installed.staticSweepCertified=true;
  const auto before=executionWorldStamp();cancelGateMotionProposal(s);publishGateMotion(s,proposed);acknowledgeGateSupport(s,before);return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_gate_mechanism_pose(double id){
  auto& s=state();s.gateMechanismPose.fill(0);
  if(!integer(id)||!s.gates.count(uint64_t(id))||!s.gates.at(uint64_t(id)).mesh||!gateStaticProofCurrent(s))return 0;
  const auto& g=s.gates.at(uint64_t(id));const auto root=gateRootMatrix(g),leaf=gateLeafMatrix(g,s.effectiveTime);
  auto& out=s.gateMechanismPose;out[0]=id;out[1]=g.mesh->id;out[2]=double(g.mechanism);out[3]=g.baseY;
  out[4]=g.supportMin;out[5]=g.supportMax;out[6]=s.effectiveTime;out[7]=gateOpening(g,s.effectiveTime);
  std::copy(root.begin(),root.end(),out.begin()+8);std::copy(leaf.begin(),leaf.end(),out.begin()+24);return 1;
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
