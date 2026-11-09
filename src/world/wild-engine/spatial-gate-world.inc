// Read-only native object queries over the SAME barrier, polygon and canonical
// resident prop stores. Never grants terrain, hinge-contact or passage clearance.
template<class Coordinate> double gatePolygonPairDistance(const double* leaf,int count,
    const Coordinate* other,int otherCount){
  if(count<1||otherCount<1||!leaf||!other)return std::numeric_limits<double>::quiet_NaN();
  if(executionInsideVertices({leaf[0],leaf[1]},other,size_t(otherCount))||
     executionInsideVertices({double(other[0]),double(other[1])},leaf,size_t(count)))return 0;
  double best=std::numeric_limits<double>::infinity();
  for(int i=0,j=count-1;i<count;j=i++)for(int k=0,l=otherCount-1;k<otherCount;l=k++)
    best=std::min(best,executionEdgeDistance({leaf[i*2],leaf[i*2+1]},{leaf[j*2],leaf[j*2+1]},
      {double(other[k*2]),double(other[k*2+1])},{double(other[l*2]),double(other[l*2+1])}));
  return best;
}
double spatialNativePolygonPairDistance(const double* a,int count,const double* b,int otherCount){
  return gatePolygonPairDistance(a,count,b,otherCount);
}
double spatialGateShapeDistance(const double* leaf,int count,const SpatialStaticMutation& shape){
  if(shape.circleRadius>=0)return std::max(0.0,
    spatialNativePolygonDistance(leaf,count,shape.x,shape.z,shape.x,shape.z)-shape.circleRadius);
  if(shape.count)return gatePolygonPairDistance(leaf,count,shape.xy,shape.count);
  const double norm=shape.c*shape.c+shape.s*shape.s;
  if(!std::isfinite(norm)||norm<.99||norm>1.01||shape.halfX<0||shape.halfZ<0)
    return std::numeric_limits<double>::quiet_NaN();
  // The canonical wall predicate transforms by stored float c/s. Invert that
  // exact matrix, rather than assuming its rounded columns have unit length.
  std::array<double,8> xy;
  const double u[4]={-shape.halfX,shape.halfX,shape.halfX,-shape.halfX},
    v[4]={-shape.halfZ,-shape.halfZ,shape.halfZ,shape.halfZ};
  for(int i=0;i<4;i++){
    xy[i*2]=shape.x+(u[i]*shape.c+v[i]*shape.s)/norm;
    xy[i*2+1]=shape.z+(-u[i]*shape.s+v[i]*shape.c)/norm;
  }
  return gatePolygonPairDistance(leaf,count,xy.data(),4);
}
int spatialVisitGateStaticObjects(double minX,double minZ,double maxX,double maxZ,
    SpatialGateStaticVisitor visit,void* context){
  // This object-only proof initially shares the resident Desert domain. Bound
  // coordinates/size to keep float-built broadphase buckets conservative and
  // avoid oversized/overflowing cell loops. Uncertainty never means empty.
  if(worldBiome!=1||!std::isfinite(minX)||!std::isfinite(minZ)||!std::isfinite(maxX)||!std::isfinite(maxZ)||
     minX>maxX||minZ>maxZ||maxX-minX>16||maxZ-minZ>16||
     std::max({std::abs(minX),std::abs(minZ),std::abs(maxX),std::abs(maxZ)})>=1000000)return -2;
  constexpr double pad=.001;
  const int cx0=int(std::floor((minX-pad+24)/side)),cx1=int(std::floor((maxX+pad+24)/side)),
    cz0=int(std::floor((minZ-pad+24)/side)),cz1=int(std::floor((maxZ+pad+24)/side));
  for(int cz=cz0;cz<=cz1;cz++)for(int cx=cx0;cx<=cx1;cx++)
    if(!residentSpatial().count(chunkKey(cx,cz))||!residentSolidProps().count(chunkKey(cx,cz)))return -1;
  const int bx0=int(std::floor((minX-pad)/barrierBucketWidth)),bx1=int(std::floor((maxX+pad)/barrierBucketWidth)),
    bz0=int(std::floor((minZ-pad)/barrierBucketWidth)),bz1=int(std::floor((maxZ+pad)/barrierBucketWidth));
  std::set<int> barriers,polygons;
  for(int bz=bz0;bz<=bz1;bz++)for(int bx=bx0;bx<=bx1;bx++){
    const auto key=barrierKey(bx,bz);
    if(const auto found=barrierIndex().buckets.find(key);found!=barrierIndex().buckets.end())
      barriers.insert(found->second.begin(),found->second.end());
    if(const auto found=polygonIndex().buckets.find(key);found!=polygonIndex().buckets.end())
      polygons.insert(found->second.begin(),found->second.end());
  }
  const auto relevant=[&](const SpatialStaticMutation& b){return b.maxX+pad>=minX&&b.minX-pad<=maxX&&b.maxZ+pad>=minZ&&b.minZ-pad<=maxZ;};
  for(int id:barriers){const auto shape=barrierMutation(barrierIndex().byId.at(id));
    if(relevant(shape)&&!visit({shape,1,id},context))return 0;}
  for(int id:polygons){const auto shape=polygonMutation(polygonIndex().byId.at(id));
    if(relevant(shape)&&!visit({shape,2,id},context))return 0;}
  std::map<std::tuple<int,int,int>,const Prop*> canonical;
  for(int cz=cz0;cz<=cz1;cz++)for(int cx=cx0;cx<=cx1;cx++)
    for(const auto& prop:residentSolidProps().at(chunkKey(cx,cz)))
      if(relevant(propMutation(prop)))canonical.emplace(std::make_tuple(prop.group,prop.gx,prop.gz),&prop);
  for(const auto& [key,prop]:canonical)
    if(!visit({propMutation(*prop),3,prop->group,prop->gx,prop->gz},context))return 0;
  return 1;
}
