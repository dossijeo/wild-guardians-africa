#include <cmath>
#include <cstdint>
#include <cstddef>

// Versioned adapter for Engine's existing 40-byte prop export. No Engine
// pointers, allocator or navigation implementation are shared by this module.
struct PackedProp {
 float x,z,y,radius,scale,yaw;
 int32_t slot,group,gx,gz;
};
static_assert(sizeof(PackedProp)==40);
static_assert(offsetof(PackedProp,slot)==24);

extern "C" int wr_props(const PackedProp* props,int count,int slot,
 const int32_t* suppressed,int suppressedCount,double ox,double oz,
 float* matrices,uint32_t* indices){
 int written=0;
 for(int i=0;i<count;i++){
  const auto& p=props[i];if(p.slot!=slot)continue;
  bool hidden=false;
  for(int j=0;j<suppressedCount;j++){
   const auto* id=suppressed+j*3;
   if(id[0]==p.group&&id[1]==p.gx&&id[2]==p.gz){hidden=true;break;}
  }
  if(hidden)continue;
  // Match Object3D's Euler -> quaternion -> matrix path before Float32 packing.
  const double y=std::sin(double(p.yaw)*.5),w=std::cos(double(p.yaw)*.5);
  const double yy=y*(y+y),wy=w*(y+y),s=p.scale;
  float* m=matrices+written*16;
  for(int k=0;k<16;k++)m[k]=0;
  m[0]=float((1-yy)*s);m[2]=float(-wy*s);m[5]=float(s);
  m[8]=float(wy*s);m[10]=float((1-yy)*s);
  m[12]=float(double(p.x)-ox);m[13]=p.y;m[14]=float(double(p.z)-oz);m[15]=1;
  indices[written++]=uint32_t(i);
 }
 return written;
}

// Reuse filtered Engine indices produced at registration; geometry supplies visual extents.
extern "C" void wr_lod_props(const PackedProp* props,const uint32_t* indices,int count,double width,double depth,double centerY,double* output){
 for(int i=0;i<count;i++){const auto& p=props[indices[i]];double* o=output+i*4;
  o[0]=p.x;o[1]=double(p.y)+centerY*p.scale;o[2]=p.z;
  o[3]=std::fmax(width*p.scale,depth*p.scale)*.25;
 }
}
