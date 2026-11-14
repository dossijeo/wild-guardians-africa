using GateMatrix=std::array<double,16>;
struct GatePoint3 {double x,y,z;};
GateMatrix gateRootMatrix(const NativeGate& g){
  const double c=std::cos(g.yaw),s=std::sin(g.yaw);
  return {g.sx*c,0,-g.sx*s,0,0,g.sz,0,0,g.sz*s,0,g.sz*c,0,g.x,g.baseY,g.z,1};
}
GateMatrix gateLeafMatrix(const NativeGate& g,double at){
  const double angle=gateOpening(g,at)*pi/2,c=std::cos(angle),s=std::sin(angle);
  return {c,0,s,0,0,1,0,0,-s,0,c,0,g.hx-g.hx*c+g.hz*s,0,g.hz-g.hx*s-g.hz*c,1};
}
GatePoint3 gateTransform(const GateMatrix& m,GatePoint3 p){
  return {m[0]*p.x+m[4]*p.y+m[8]*p.z+m[12],m[1]*p.x+m[5]*p.y+m[9]*p.z+m[13],m[2]*p.x+m[6]*p.y+m[10]*p.z+m[14]};
}
std::vector<double> gateHull(std::vector<std::pair<double,double>> points){
  std::sort(points.begin(),points.end());points.erase(std::unique(points.begin(),points.end()),points.end());
  if(points.size()<3){std::vector<double> out;for(const auto& [x,z]:points)out.insert(out.end(),{x,z});return out;}
  const auto cross=[](const auto& a,const auto& b,const auto& c){return (b.first-a.first)*(c.second-a.second)-(b.second-a.second)*(c.first-a.first);};
  std::vector<std::pair<double,double>> hull;
  for(const auto& p:points){while(hull.size()>1&&cross(hull[hull.size()-2],hull.back(),p)<=0)hull.pop_back();hull.push_back(p);}
  const size_t lower=hull.size();
  for(auto it=points.rbegin()+1;it!=points.rend();++it){while(hull.size()>lower&&cross(hull[hull.size()-2],hull.back(),*it)<=0)hull.pop_back();hull.push_back(*it);}
  hull.pop_back();std::vector<double> out;for(const auto& [x,z]:hull)out.insert(out.end(),{x,z});return out;
}
std::vector<GatePoint3> gateClipHeight(const std::vector<GatePoint3>& input,double bound,int sign){
  std::vector<GatePoint3> out;
  for(size_t i=0;i<input.size();i++){const auto a=input[i],b=input[(i+1)%input.size()];const double da=(a.y-bound)*sign,db=(b.y-bound)*sign;
    if(da>=0)out.push_back(a);
    if((da>=0)!=(db>=0)){const double t=da/(da-db);out.push_back({a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t});}
  }return out;
}
std::array<std::vector<double>,4> gateMeshParts(const NativeGate& g,double minY,double maxY){
  std::array<std::vector<std::pair<double,double>>,4> points;
  for(int i=0;i<g.mesh->vertices;i+=3){std::vector<GatePoint3> polygon;
    for(int j=0;j<3;j++){const int p=(i+j)*3;polygon.push_back({g.mesh->positions[p],g.mesh->positions[p+1],g.mesh->positions[p+2]});}
    if(std::isfinite(minY))polygon=gateClipHeight(polygon,minY,1);
    if(std::isfinite(maxY))polygon=gateClipHeight(polygon,maxY,-1);
    if(polygon.empty())continue;
    int group=3;
    if(!g.mesh->leaf[i]){double lo=polygon[0].x,hi=lo;for(const auto& p:polygon){lo=std::min(lo,p.x);hi=std::max(hi,p.x);}group=hi<=0?0:lo>=0?1:2;}
    for(const auto& p:polygon)points[group].emplace_back(p.x,p.z);
  }
  std::array<std::vector<double>,4> result;for(int i=0;i<4;i++)result[i]=gateHull(std::move(points[i]));return result;
}
std::vector<double> gatePartWorld(const NativeGate& g,const std::vector<double>& local,bool leaf,double at){
  std::vector<double> out;out.reserve(local.size());const auto root=gateRootMatrix(g),hinge=gateLeafMatrix(g,at);
  for(size_t i=0;i<local.size();i+=2){GatePoint3 p{local[i],0,local[i+1]};if(leaf)p=gateTransform(hinge,p);p=gateTransform(root,p);out.insert(out.end(),{p.x,p.z});}
  return out;
}
std::vector<double> gateCollisionLeaf(const NativeGate& g,double at){
  return g.mesh?gatePartWorld(g,g.physicalLeaf,true,at):gateLeaf(g,gateOpening(g,at));
}
int gateMechanismSegment(const NativeGate& g,const SpatialBodyView& body,double x,double z,double nx,double nz,int& mask,int components=15){
  mask=0;if(!(body.flags&1))return 1;
  const float magnitude=float(std::max({1.0,std::abs(x),std::abs(z),std::abs(nx),std::abs(nz),std::abs(g.x),std::abs(g.z),std::abs(g.baseY)}));
  const double error=std::max(1e-5,4.0*double(std::nextafter(magnitude,std::numeric_limits<float>::infinity())-magnitude));
  if(body.kind==1){
    const double c=std::cos(g.yaw),s=std::sin(g.yaw),hx=1.09*g.sx,hz=.22*g.sz;
    const double local[8]={-hx,-hz,hx,-hz,hx,hz,-hx,hz};std::array<double,8> world;
    for(int i=0;i<4;i++){world[i*2]=g.x+local[i*2]*c+local[i*2+1]*s;world[i*2+1]=g.z-local[i*2]*s+local[i*2+1]*c;}
    if(spatialNativePolygonDistance(world.data(),4,x,z,nx,nz)<=body.r+error)mask=16;
  }
  double terrain[2]={g.supportMin,g.supportMax};
  if(body.kind==0){const int status=spatialGateTerrainRange(std::min(x,nx)-body.r,std::min(z,nz)-body.r,std::max(x,nx)+body.r,std::max(z,nz)+body.r,terrain);if(status!=1)return status;}
  const bool datum=std::abs(terrain[0]-g.supportMin)<1e-6&&std::abs(terrain[1]-g.supportMax)<1e-6;
  std::array<std::vector<double>,4> scratch;
  if(!datum)scratch=gateMeshParts(g,(terrain[0]+.025-g.baseY-error)/g.sz,(terrain[1]+.025+g.mesh->height-g.baseY+error)/g.sz);
  const auto& parts=body.kind==1?g.fullParts:datum?g.workerParts:scratch;
  for(int i=0;i<4;i++)if((components&(1<<i))&&parts[i].size()>=2){const auto polygon=gatePartWorld(g,parts[i],i==3,state().effectiveTime);
    if(spatialNativePolygonDistance(polygon.data(),int(polygon.size()/2),x,z,nx,nz)<=body.r+error)mask|=1<<i;}
  return mask?0:1;
}
bool gateMechanismBodyCanChange(IntentState& s,const SpatialBodyView& body){
  if(!(body.flags&1))return true;
  for(const auto& [id,g]:s.gates)if(g.mesh){const auto& b=g.unsupported;
    if(body.x+body.r<b.minX||body.x-body.r>b.maxX||body.z+body.r<b.minZ||body.z-body.r>b.maxZ)continue;
    if(!gateStaticProofCurrent(s))return false;
    int mask;if(gateMechanismSegment(g,body,body.x,body.z,body.x,body.z,mask)!=1)return false;
  }return true;
}
bool prepareGateMechanismGeometry(NativeGate& g,const NativeGateMeshModel* model){
  if(!model||g.mesh||g.status!=0||!g.defined||g.hx!=model->hx||g.hz!=model->hz||g.local.size()!=size_t(model->policyCount)*2)return false;
  for(size_t i=0;i<g.local.size();i++)if(std::abs(g.local[i]-model->policy[i])>1e-9)return false;
  g.mesh=model;g.fullParts=gateMeshParts(g,-std::numeric_limits<double>::infinity(),std::numeric_limits<double>::infinity());
  g.physicalLeaf=g.fullParts[3];if(g.physicalLeaf.size()<6)return false;
  for(size_t i=0;i<g.physicalLeaf.size();i+=2)g.physicalRadius=std::max(g.physicalRadius,std::hypot(g.physicalLeaf[i]-g.hx,g.physicalLeaf[i+1]-g.hz));
  const auto root=gateRootMatrix(g);auto& bounds=g.unsupported;
  bounds.circleRadius=std::max(bounds.circleRadius,g.physicalRadius*std::max(g.sx,g.sz)/std::cos(pi/24));
  for(int i=0;i<model->vertices;i++){const int at=i*3;const auto p=gateTransform(root,{model->positions[at],model->positions[at+1],model->positions[at+2]});
    if(!model->leaf[i])bounds.circleRadius=std::max(bounds.circleRadius,std::hypot(p.x-bounds.x,p.z-bounds.z));}
  bounds.minX=bounds.x-bounds.circleRadius;bounds.maxX=bounds.x+bounds.circleRadius;bounds.minZ=bounds.z-bounds.circleRadius;bounds.maxZ=bounds.z+bounds.circleRadius;
  return bounds.maxX-bounds.minX<=16&&bounds.maxZ-bounds.minZ<=16;
}
