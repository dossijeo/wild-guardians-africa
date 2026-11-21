// Shared proof for bootstrap and prepared kind2 gate acquisition.
int proveGateMechanismCandidate(IntentState& s,NativeGate& candidate,std::set<uint64_t>* inspectedRoutes=nullptr){
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
  if(!bodies.clear)return -5;
  std::set<uint64_t> affected;uint64_t candidates=0,segments=0;
  if(!mutationAffectedRoutes(s,&b,1,0,candidates,segments,affected,true)||(!inspectedRoutes&&!affected.empty()))return -5;
  // Inspect the held pose of precisely the routes that must be stopped, not
  // their incompatible future passage through the candidate leaf. This is no
  // acquisition proof: stage/revalidate still require no affected route.
  if(!gateSweepBodies(s,candidate,nullptr,0,inspectedRoutes?&affected:nullptr))return -5;
  auto proposed=s.gates;proposed.insert_or_assign(candidate.id,candidate);
  const int objects=gateSweepStaticObjects(s,proposed,true);if(objects!=1)return objects==-6?-1:objects==-7?-2:-5;
  // Inspection may report affected routes, but never admits their old motion.
  // The committing caller still requires this set to be empty.
  if(inspectedRoutes)*inspectedRoutes=std::move(affected);
  return 1;
}
// Included in the existing intent authority, after gate/static proof helpers.
// One prepared gate node lives inside its kind2 draft, never in a second registry.
std::vector<float> gateAdditionProxies(const NativeGate& gate){
 const auto parts=gateMeshParts(gate,-std::numeric_limits<double>::infinity(),gate.mesh->height/gate.sz);
 std::vector<float> out;out.reserve(18);const double c=std::cos(gate.yaw),s=std::sin(gate.yaw);
 for(int side=0;side<2;side++){
  if(parts[side].size()<6)return {};
  double minX=std::numeric_limits<double>::infinity(),minZ=minX,maxX=-minX,maxZ=-minX;
  for(size_t i=0;i<parts[side].size();i+=2){const double x=parts[side][i]*gate.sx,z=parts[side][i+1]*gate.sz;minX=std::min(minX,x);maxX=std::max(maxX,x);minZ=std::min(minZ,z);maxZ=std::max(maxZ,z);}
  const double x=(minX+maxX)/2,z=(minZ+maxZ)/2;
  out.insert(out.end(),{float(gate.x+x*c+z*s),float(gate.z-x*s+z*c),float((maxX-minX)/2),float((maxZ-minZ)/2),float(gate.yaw),0});
 }
 out.insert(out.end(),{float(gate.x),float(gate.z),float(1.09*gate.sx),float(.22*gate.sz),float(gate.yaw),1});return out;
}
std::vector<SpatialStaticMutation> gateAdditionShapes(const std::vector<float>& values){
 std::vector<SpatialStaticMutation> shapes;
 for(size_t i=0;i<values.size();i+=6){SpatialStaticMutation shape;shape.x=values[i];shape.z=values[i+1];shape.halfX=values[i+2];shape.halfZ=values[i+3];shape.c=std::cos(values[i+4]);shape.s=std::sin(values[i+4]);shape.passMask=int(values[i+5]);
  const double dx=std::abs(shape.c)*shape.halfX+std::abs(shape.s)*shape.halfZ,dz=std::abs(shape.s)*shape.halfX+std::abs(shape.c)*shape.halfZ;
  shape.minX=shape.x-dx;shape.maxX=shape.x+dx;shape.minZ=shape.z-dz;shape.maxZ=shape.z+dz;shapes.push_back(shape);
 }return shapes;
}
