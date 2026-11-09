// Structural route-to-gate activation intervals, never another route planner.
bool spatialNativeConvexPolygon(const double* xy,int count){
  if(!xy||count<3||count>64)return false;double area=0,scale=1;
  for(int i=0,j=count-1;i<count;j=i++){
    if(!std::isfinite(xy[i*2])||!std::isfinite(xy[i*2+1]))return false;
    area+=(xy[j*2]-xy[0])*(xy[i*2+1]-xy[1])-(xy[i*2]-xy[0])*(xy[j*2+1]-xy[1]);
    scale=std::max(scale,std::hypot(xy[i*2]-xy[0],xy[i*2+1]-xy[1]));
  }
  if(!std::isfinite(area)||std::abs(area)<1e-12)return false;
  const double sign=area>0?1:-1,error=1e-12*scale*scale;
  for(int i=0,j=count-1;i<count;j=i++)for(int k=0;k<count;k++)
    if(sign*executionCross({xy[j*2],xy[j*2+1]},{xy[i*2],xy[i*2+1]},{xy[k*2],xy[k*2+1]}) < -error)return false;
  return true;
}
bool gateRangeClip(double value,double delta,double low,double high,double& from,double& to){
  if(delta==0)return value>=low&&value<=high;
  double a=(low-value)/delta,b=(high-value)/delta;if(a>b)std::swap(a,b);
  from=std::max(from,a);to=std::min(to,b);return from<=to;
}
int gateCircleRange(double ax,double az,double bx,double bz,double x,double z,double radius,double* range,bool strict){
  if(!std::isfinite(radius)||radius<=0)return -1;
  const double dx=bx-ax,dz=bz-az,length=std::hypot(dx,dz);
  if(!std::isfinite(length))return -1;
  const double boundaryError=1e-9*std::max(1.0,radius);
  if(length==0){const double d=std::hypot(ax-x,az-z);
    if(std::abs(d-radius)<=boundaryError)return -1;
    if(strict?d>=radius:d>radius)return 0;range[0]=range[1]=0;return 1;}
  const double ux=dx/length,uz=dz/length,rx=x-ax,rz=z-az,
    projection=rx*ux+rz*uz,perpendicular=std::abs(rx*uz-rz*ux);
  // Near-tangent roots are ill-conditioned. Leave the old protected route
  // untouched instead of inventing a timing boundary from rounding noise.
  if(std::abs(perpendicular-radius)<=boundaryError)return -1;
  if(strict?perpendicular>=radius:perpendicular>radius)return 0;
  const double inset=std::sqrt(std::max(0.0,(radius-perpendicular)*(radius+perpendicular))),
    from=std::max(0.0,(projection-inset)/length),to=std::min(1.0,(projection+inset)/length);
  if(strict?from>=to:from>to)return 0;range[0]=from;range[1]=to;return 1;
}
int spatialNativeGateCircleRange(double ax,double az,double bx,double bz,double x,double z,double radius,double* range){
  return gateCircleRange(ax,az,bx,bz,x,z,radius,range,false);
}
int spatialNativeGatePolygonRange(const double* xy,int count,double ax,double az,double bx,double bz,double radius,double* range){
  if(!xy||count<3||count>64||!std::isfinite(radius)||radius<=0)return -1;
  if(ax==bx&&az==bz){if(spatialNativePolygonDistance(xy,count,ax,az,bx,bz)>=radius)return 0;
    range[0]=range[1]=0;return 1;}
  double first=1,last=0,area=0;
  const auto add=[&](double from,double to){first=std::min(first,from);last=std::max(last,to);};
  for(int i=0,j=count-1;i<count;j=i++)area+=(xy[j*2]-xy[0])*(xy[i*2+1]-xy[1])-(xy[i*2]-xy[0])*(xy[j*2+1]-xy[1]);
  const double sign=area>0?1:-1,dx=bx-ax,dz=bz-az;
  double insideFrom=0,insideTo=1;
  for(int i=0,j=count-1;i<count;j=i++){
    const double x=xy[j*2],z=xy[j*2+1],ex=xy[i*2]-x,ez=xy[i*2+1]-z,length=std::hypot(ex,ez);
    const double side=sign*(ex*(az-z)-ez*(ax-x)),change=sign*(ex*dz-ez*dx);
    if(change==0){if(side<0)insideFrom=2;}
    else if(change>0)insideFrom=std::max(insideFrom,-side/change);
    else insideTo=std::min(insideTo,-side/change);
    double circle[2];const int hit=gateCircleRange(ax,az,bx,bz,x,z,radius,circle,true);
    if(hit<0)return -1;if(hit)add(circle[0],circle[1]);
    if(length==0)continue;
    const double ux=ex/length,uz=ez/length,u=(ax-x)*ux+(az-z)*uz,v=-(ax-x)*uz+(az-z)*ux,
      du=dx*ux+dz*uz,dv=-dx*uz+dz*ux;
    if(dv==0&&std::abs(v)>=radius)continue;
    double from=0,to=1;
    if(gateRangeClip(u,du,0,length,from,to)&&gateRangeClip(v,dv,-radius,radius,from,to)&&from<to)add(from,to);
  }
  if(insideFrom<=insideTo&&insideFrom<=1&&insideTo>=0)add(std::max(0.0,insideFrom),std::min(1.0,insideTo));
  if(first>last)return 0;range[0]=first;range[1]=last;return 1;
}
