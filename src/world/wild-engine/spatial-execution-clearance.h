// Included inside spatial-savanna.cpp's native world namespace. This is a
// one-time, continuous static sweep for route execution, not a second planner.
// Initial scope: actor profiles on resident Desert terrain. Moving bodies,
// gate leaves and other biomes need their own authoritative execution rules.
struct ExecutionPoint {double x,z;};
uint64_t executionClearanceChecks=0,executionSlopeSamples=0;

double executionPointDistance(ExecutionPoint p,ExecutionPoint a,ExecutionPoint b){
  const double dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const double t=length?std::clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/length,0.0,1.0):0;
  return std::hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
double executionCross(ExecutionPoint a,ExecutionPoint b,ExecutionPoint p){
  return (b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
}
double executionEdgeDistance(ExecutionPoint a,ExecutionPoint b,
                             ExecutionPoint c,ExecutionPoint d){
  const double ac=executionCross(a,b,c),ad=executionCross(a,b,d),
    ca=executionCross(c,d,a),cb=executionCross(c,d,b);
  if(((ac<0&&ad>0)||(ac>0&&ad<0))&&((ca<0&&cb>0)||(ca>0&&cb<0)))return 0;
  return std::min({executionPointDistance(a,c,d),executionPointDistance(b,c,d),
    executionPointDistance(c,a,b),executionPointDistance(d,a,b)});
}
template<class Coordinate> bool executionInsideVertices(ExecutionPoint point,const Coordinate* xy,size_t count){
  bool inside=false;
  for(size_t i=0,j=count-1;i<count;j=i++){
    const double ax=xy[i*2],az=xy[i*2+1],bx=xy[j*2],bz=xy[j*2+1];
    if((az>point.z)!=(bz>point.z)&&point.x<(bx-ax)*(point.z-az)/(bz-az)+ax)inside=!inside;
  }
  return inside;
}
bool executionInside(ExecutionPoint point,const PolygonObstacle& polygon){
  return executionInsideVertices(point,polygon.xy.data(),polygon.xy.size()/2);
}
bool executionLattice(int x,int z,double& value){
  int cx=0,cz=0;const auto* sample=residentSample(x,z,&cx,&cz);
  if(!sample||sample->lattice.size()!=size_t(latticeSpan)*latticeSpan)return false;
  const int ix=x-(cx*side-24)+pad,iz=z-(cz*side-24)+pad;
  if(ix<0||iz<0||ix>=latticeSpan||iz>=latticeSpan)return false;
  value=sample->lattice[size_t(iz)*latticeSpan+ix];return std::isfinite(value);
}
bool executionSurface(double x,double z,double& value){
  const int ix=int(std::floor(x)),iz=int(std::floor(z));
  double a,b,c,d;
  if(!executionLattice(ix,iz,a)||!executionLattice(ix+1,iz,b)||
     !executionLattice(ix,iz+1,c)||!executionLattice(ix+1,iz+1,d))return false;
  const double fx=x-ix,fz=z-iz;
  value=fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
  return std::isfinite(value);
}
// The maximum gradient of the actual resident triangles bounds input rounding.
bool executionGradient(ExecutionPoint a,ExecutionPoint b,double radius,
                       double& gradient,double& height){
  const int minX=int(std::floor(std::min(a.x,b.x)-radius-.81)),
    maxX=int(std::ceil(std::max(a.x,b.x)+radius+.81)),
    minZ=int(std::floor(std::min(a.z,b.z)-radius-.81)),
    maxZ=int(std::ceil(std::max(a.z,b.z)+radius+.81));
  gradient=0;height=1;
  for(int z=minZ;z<maxZ;z++)for(int x=minX;x<maxX;x++){
    double h00,h10,h01,h11;
    if(!executionLattice(x,z,h00)||!executionLattice(x+1,z,h10)||
       !executionLattice(x,z+1,h01)||!executionLattice(x+1,z+1,h11))return false;
    gradient=std::max({gradient,std::hypot(h10-h00,h01-h00),
      std::hypot(h11-h01,h11-h10)});
    height=std::max({height,std::abs(h00),std::abs(h10),std::abs(h01),std::abs(h11)});
  }
  return true;
}
void executionCrossings(std::vector<double>& knots,double start,double end){
  const double delta=end-start;if(delta==0)return;
  const int low=int(std::floor(std::min(start,end)))+1,
    high=int(std::ceil(std::max(start,end)));
  for(int cell=low;cell<high;cell++){
    const double t=(cell-start)/delta;if(t>0&&t<1)knots.push_back(t);
  }
}
int executionTerrain(ExecutionPoint a,ExecutionPoint b,double radius,double coordinateError){
  double gradient=0,maxHeight=0;
  if(!executionGradient(a,b,radius+coordinateError*2,gradient,maxHeight))return -1;
  const float height32=float(maxHeight);
  if(!std::isfinite(height32))return -2;
  const double outputError=std::nextafter(height32,std::numeric_limits<float>::infinity())-height32;
  // Legacy JS calls float-input/output terrain exports. Bound their coordinate
  // and height rounding instead of assuming double and float predicates agree.
  const double error=gradient*coordinateError*2+outputError+maxHeight*1e-12,
    slopeError=2*std::sqrt(2.0)*error/1.6;
  std::vector<double> knots{0,1};knots.reserve(160);
  const double footX[5]={0,radius,-radius,0,0},footZ[5]={0,0,0,radius,-radius};
  const double sx[5]={0,.8,-.8,0,0},sz[5]={0,0,0,.8,-.8};
  for(int foot=0;foot<5;foot++)for(int sample=0;sample<5;sample++){
    const double ox=footX[foot]+sx[sample],oz=footZ[foot]+sz[sample];
    executionCrossings(knots,a.x+ox,b.x+ox);
    executionCrossings(knots,a.z+oz,b.z+oz);
    executionCrossings(knots,a.x+a.z+ox+oz,b.x+b.z+ox+oz);
  }
  std::sort(knots.begin(),knots.end());knots.erase(std::unique(knots.begin(),knots.end()),knots.end());
  // Between successive knots all four shifted surface samples are affine.
  // Their finite-difference vector is affine too; its norm is convex, so the
  // maximum occurs at an endpoint. No fixed-distance terrain sampling gaps.
  for(double t:knots)for(int foot=0;foot<5;foot++){
    const double x=a.x+(b.x-a.x)*t+footX[foot],z=a.z+(b.z-a.z)*t+footZ[foot];
    double east,west,north,south;executionSlopeSamples++;
    if(!executionSurface(x+.8,z,east)||!executionSurface(x-.8,z,west)||
       !executionSurface(x,z+.8,north)||!executionSurface(x,z-.8,south))return -1;
    if(std::hypot(east-west,north-south)/1.6+slopeError>.5)return 0;
  }
  return 1;
}
int executionSolids(ExecutionPoint a,ExecutionPoint b,double radius){
  const int minCx=int(std::floor((std::min(a.x,b.x)-radius+24)/side)),
    maxCx=int(std::floor((std::max(a.x,b.x)+radius+24)/side)),
    minCz=int(std::floor((std::min(a.z,b.z)-radius+24)/side)),
    maxCz=int(std::floor((std::max(a.z,b.z)+radius+24)/side));
  std::unordered_set<PropKey,PropKeyHash> seen;
  for(int cz=minCz;cz<=maxCz;cz++)for(int cx=minCx;cx<=maxCx;cx++){
    const auto found=residentSolidProps().find(chunkKey(cx,cz));
    if(found==residentSolidProps().end())return -1;
    for(const auto& prop:found->second){
      if(!seen.insert({prop.group,prop.gx,prop.gz}).second)continue;
      if(executionPointDistance({prop.x,prop.z},a,b)<prop.radius+radius)return 0;
    }
  }
  if(!wallSegmentClear(a.x,a.z,b.x,b.z,nullptr,0,radius))return 0;
  // Worker-passable barriers may be automatic gates whose leaves still live
  // outside this static world. Never certify their passage before native gate
  // timing/geometry is connected. Other ordinary worker connectors are supported.
  if(workerNow&&!wallSegmentClear(a.x,a.z,b.x,b.z,nullptr,0,radius,true))return -2;
  const int minX=int(std::floor(std::min(a.x,b.x)/barrierBucketWidth)),
    maxX=int(std::floor(std::max(a.x,b.x)/barrierBucketWidth)),
    minZ=int(std::floor(std::min(a.z,b.z)/barrierBucketWidth)),
    maxZ=int(std::floor(std::max(a.z,b.z)/barrierBucketWidth));
  std::unordered_set<int> polygons;
  for(int z=minZ;z<=maxZ;z++)for(int x=minX;x<=maxX;x++){
    const auto found=polygonIndex().buckets.find(barrierKey(x,z));
    if(found==polygonIndex().buckets.end())continue;
    for(int id:found->second){
      if(!polygons.insert(id).second)continue;
      const auto& polygon=polygonIndex().byId.at(id);
      const bool passable=polygon.passMask&(workerNow?1:2);
      if(passable&&!workerNow)continue;
      if(executionInside(a,polygon)||executionInside(b,polygon))return passable?-2:0;
      const size_t count=polygon.xy.size()/2;
      for(size_t i=0,j=count-1;i<count;j=i++)
        if(executionEdgeDistance(a,b,{polygon.xy[i*2],polygon.xy[i*2+1]},
             {polygon.xy[j*2],polygon.xy[j*2+1]})<radius)return passable?-2:0;
    }
  }
  return 1;
}
// 1 continuous static clearance, 0 blocked/unproven, -1 missing resident data,
// -2 unsupported execution class, -3 invalid request. Never authorizes traffic.
int executionSegmentClear(double x,double z,double nx,double nz,double radius,bool gateCandidate=false){
  executionClearanceChecks++;
  if(!navReady||!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(nx)||!std::isfinite(nz)||
     std::max({std::abs(x),std::abs(z),std::abs(nx),std::abs(nz)})>=2147483000.0||
     !std::isfinite(radius)||radius<=0||radius>2||std::abs(radius-radiusNow)>1e-6)return -3;
  if(worldBiome!=1)return -2;
  if(!gateCandidate&&spatialIntentGateUnsupported(x,z,nx,nz,radius))return -2;
  const double length=std::hypot(nx-x,nz-z);if(length>10000)return -2;
  const float coordinate=float(std::max({1.0,std::abs(x),std::abs(z),std::abs(nx),std::abs(nz)})+radius+3);
  const double rounding=std::max(1e-7,double(std::nextafter(coordinate,std::numeric_limits<float>::infinity())-coordinate)),
    effectiveRadius=std::max(radius,double(radiusNow))+2*rounding+1e-8;
  if(effectiveRadius>=maxIndexedRadius)return -2;
  const int pieces=std::max(1,int(std::ceil(length)));
  for(int i=0;i<pieces;i++){
    const double from=double(i)/pieces,to=double(i+1)/pieces;
    const ExecutionPoint a{x+(nx-x)*from,z+(nz-z)*from},b{x+(nx-x)*to,z+(nz-z)*to};
    const int solid=executionSolids(a,b,effectiveRadius);if(solid!=1)return solid;
    const int terrain=executionTerrain(a,b,radius,rounding);if(terrain!=1)return terrain;
  }
  return 1;
}
