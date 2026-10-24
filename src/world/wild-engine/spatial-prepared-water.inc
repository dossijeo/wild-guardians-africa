// Optional renderer payload, built only by the chunk worker. No GPU or live
// navigation access. Float conversions mirror the existing WASM/JS ABI.
struct PreparedWaterBed {
  std::array<double,8> metadata{};
  std::vector<uint8_t> bytes;
};
PreparedWaterBed prepareWaterBed(int cx,int cz){
  PreparedWaterBed out;
  if(worldBiome!=4||waterTriangles.empty())return out;
  struct Point {double x,z;};
  struct Edge {Point a,b;int count=1;};
  std::vector<Point> points;points.reserve(waterTriangles.size()/3);
  double minX=INFINITY,minZ=INFINITY,maxX=-INFINITY,maxZ=-INFINITY;
  for(size_t i=0;i<waterTriangles.size();i+=3){
    const double x=float(double(waterTriangles[i])-cx*48),z=float(double(waterTriangles[i+2])-cz*48);
    minX=std::min(minX,x);maxX=std::max(maxX,x);minZ=std::min(minZ,z);maxZ=std::max(maxZ,z);
    points.push_back({x+cx*48,z+cz*48});
  }
  const double width=maxX-minX+1,height=maxZ-minZ+1;
  minX+=cx*48-.5;minZ+=cz*48-.5;
  const int nx=std::min(513,int(std::ceil(width*2))+1),nz=std::min(513,int(std::ceil(height*2))+1);
  auto coordinate=[](double value){const auto q=std::llround(value*10000);return q==0&&value<0?std::string("-0"):std::to_string(q);};
  auto pointKey=[&](Point p){return coordinate(p.x)+","+coordinate(p.z);};
  std::unordered_map<std::string,size_t> edgeKeys;
  std::vector<Edge> edges;edges.reserve(points.size());
  for(size_t i=0;i+2<points.size();i+=3)for(int j=0;j<3;j++){
    const auto a=points[i+j],b=points[i+(j+1)%3];const auto ka=pointKey(a),kb=pointKey(b);
    const auto key=ka<kb?ka+"|"+kb:kb+"|"+ka;
    auto found=edgeKeys.find(key);
    if(found!=edgeKeys.end())edges[found->second].count++;
    else{edgeKeys.emplace(key,edges.size());edges.push_back({a,b,1});}
  }
  std::unordered_map<uint64_t,std::vector<size_t>> bins;
  for(size_t i=0;i<edges.size();i++){
    const auto& edge=edges[i];const auto a=edge.a,b=edge.b;if(edge.count!=1)continue;
    if((std::abs(a.x-b.x)<1e-4&&std::abs(std::abs(a.x-cx*48)-24)<1e-4)||
       (std::abs(a.z-b.z)<1e-4&&std::abs(std::abs(a.z-cz*48)-24)<1e-4))continue;
    for(int z=int(std::floor((std::min(a.z,b.z)-4)/4));z<=int(std::floor((std::max(a.z,b.z)+4)/4));z++)
      for(int x=int(std::floor((std::min(a.x,b.x)-4)/4));x<=int(std::floor((std::max(a.x,b.x)+4)/4));x++)bins[chunkKey(x,z)].push_back(i);
  }
  auto distance=[&](double x,double z){
    double squared=16;auto found=bins.find(chunkKey(int(std::floor(x/4)),int(std::floor(z/4))));
    if(found!=bins.end())for(const auto index:found->second){
      const auto a=edges[index].a,b=edges[index].b;const double dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
      const double t=std::clamp(((x-a.x)*dx+(z-a.z)*dz)/(den==0?1:den),0.0,1.0),rx=x-a.x-t*dx,rz=z-a.z-t*dz;
      squared=std::min(squared,rx*rx+rz*rz);
    }
    return std::sqrt(squared);
  };
  std::vector<float> samples(nx*nz);double lo=INFINITY,hi=-INFINITY;
  for(int z=0;z<nz;z++)for(int x=0;x<nx;x++){
    const double px=minX+double(x)/(nx-1)*width,pz=minZ+double(z)/(nz-1)*height;
    const double h=double(3.34f)-std::max(0.0,double(float(wetlandMask(float(px),float(pz))))-.61)*3;
    samples[z*nx+x]=float(h);lo=std::min(lo,h);hi=std::max(hi,h);
  }
  const double span=std::max(.001,hi-lo);out.bytes.resize(nx*nz*4);
  for(int i=0;i<nx*nz;i++){
    const int h=int(std::floor((samples[i]-lo)/span*65535+.5));
    out.bytes[i*4]=uint8_t(h>>8);out.bytes[i*4+1]=uint8_t(h&255);
    out.bytes[i*4+2]=uint8_t(std::floor(distance(minX+double(i%nx)/(nx-1)*width,minZ+double(i/nx)/(nz-1)*height)/4*255+.5));out.bytes[i*4+3]=255;
  }
  out.metadata={double(nx),double(nz),minX,minZ,width,height,lo,span};return out;
}
