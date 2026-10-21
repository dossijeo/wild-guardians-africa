#include <cmath>
#include <cstdint>
#include <cstring>
// Inputs: Float32 local matrices/visibility; Float64 transforms, sphere and planes.
// Descriptor: world[16], sphere[4], first, count. Output stays in WASM memory.
extern "C" int wr_pack(const float* input,const float* visibility,const double* desc,int entries,const double* planes,double ox,double oz,float* output,float* outVisibility,int omitZero){
 int written=0;
 for(int e=0;e<entries;e++){
  const double* d=desc+e*22;
  for(int i=int(d[20]);i<int(d[20]+d[21]);i++){
   if(omitZero && visibility[i]<=0)continue;
   const float* a=input+i*16; double m[16];
   for(int c=0;c<4;c++)for(int r=0;r<4;r++)m[c*4+r]=d[r]*a[c*4]+d[4+r]*a[c*4+1]+d[8+r]*a[c*4+2]+d[12+r]*a[c*4+3];
   const double w=1/(m[3]*d[16]+m[7]*d[17]+m[11]*d[18]+m[15]);
   const double x=(m[0]*d[16]+m[4]*d[17]+m[8]*d[18]+m[12])*w;
   const double y=(m[1]*d[16]+m[5]*d[17]+m[9]*d[18]+m[13])*w;
   const double z=(m[2]*d[16]+m[6]*d[17]+m[10]*d[18]+m[14])*w;
   double scale=0;for(int c=0;c<3;c++){double s=m[c*4]*m[c*4]+m[c*4+1]*m[c*4+1]+m[c*4+2]*m[c*4+2];if(s>scale)scale=s;}
   const double radius=d[19]*std::sqrt(scale)+2.5; bool visible=true;
   for(int p=0;p<6;p++){const double* q=planes+p*4;if(q[0]*x+q[1]*y+q[2]*z+q[3]<-radius){visible=false;break;}}
   if(!visible)continue;
   m[12]-=ox;m[14]-=oz;
   for(int k=0;k<16;k++)output[written*16+k]=float(m[k]);
   outVisibility[written++]=visibility[i];
  }
 }
 return written;
}
extern "C" int wr_noop(int n){return n;}

// Persistent scene data: build world matrices and per-LOD spheres only on invalidation.
extern "C" void wr_register(const float* local,const double* world,const double* localSpheres,int n,int levels,double* matrices,double* spheres){
 for(int i=0;i<n;i++){
  const float* a=local+i*16;double* m=matrices+i*16;
  for(int c=0;c<4;c++)for(int r=0;r<4;r++)m[c*4+r]=world[r]*a[c*4]+world[4+r]*a[c*4+1]+world[8+r]*a[c*4+2]+world[12+r]*a[c*4+3];
  double scale=0;for(int c=0;c<3;c++){const double s=m[c*4]*m[c*4]+m[c*4+1]*m[c*4+1]+m[c*4+2]*m[c*4+2];if(s>scale)scale=s;}
  scale=std::sqrt(scale);
  for(int level=0;level<levels;level++){
   const double* d=localSpheres+level*4;double* out=spheres+(level*n+i)*4;
   const double w=1/(m[3]*d[0]+m[7]*d[1]+m[11]*d[2]+m[15]);
   out[0]=(m[0]*d[0]+m[4]*d[1]+m[8]*d[2]+m[12])*w;
   out[1]=(m[1]*d[0]+m[5]*d[1]+m[9]*d[2]+m[13])*w;
   out[2]=(m[2]*d[0]+m[6]*d[1]+m[10]*d[2]+m[14])*w;out[3]=d[3]*scale+2.5;
  }
 }
}
// Each descriptor contains persistent matrix/sphere/order/visibility pointers and count.
template<bool checkChanges> int select_instances(const uint32_t* descriptors,int entries,const double* planes,double ox,double oz,float* output,float* outVisibility,int omitZero,int previousCount){
 int written=0;bool changed=previousCount<0;
 for(int e=0;e<entries;e++){
  const uint32_t* d=descriptors+e*5;
  const double* matrices=reinterpret_cast<const double*>(uintptr_t(d[0]));
  const double* spheres=reinterpret_cast<const double*>(uintptr_t(d[1]));
  const uint32_t* order=reinterpret_cast<const uint32_t*>(uintptr_t(d[2]));
  const float* visibility=reinterpret_cast<const float*>(uintptr_t(d[3]));
  for(uint32_t j=0;j<d[4];j++){
   const uint32_t i=order[j];if(omitZero&&visibility[i]<=0)continue;
   const double* s=spheres+i*4;bool visible=true;
   for(int p=0;p<6;p++){const double* q=planes+p*4;if(q[0]*s[0]+q[1]*s[1]+q[2]*s[2]+q[3]<-s[3]){visible=false;break;}}
   if(!visible)continue;
   const double* m=matrices+i*16;float* out=output+written*16;
   for(int k=0;k<16;k++){
    const float value=float(m[k]-(k==12?ox:k==14?oz:0));
    if constexpr(checkChanges){if(written>=previousCount||std::memcmp(out+k,&value,sizeof(float))!=0)changed=true;}
    out[k]=value;
   }
   if constexpr(checkChanges){if(written>=previousCount||std::memcmp(outVisibility+written,visibility+i,sizeof(float))!=0)changed=true;}
   outVisibility[written++]=visibility[i];
  }
 }
 if constexpr(checkChanges){if(!changed&&written==previousCount)return -written-1;}
 return written;
}

extern "C" int wr_select(const uint32_t* d,int n,const double* p,double x,double z,float* o,float* v,int omit){return select_instances<false>(d,n,p,x,z,o,v,omit,-1);}
// Negative result encodes unchanged output count as -count-1, including empty groups.
extern "C" int wr_select_checked(const uint32_t* d,int n,const double* p,double x,double z,float* o,float* v,int omit,int previous){return select_instances<true>(d,n,p,x,z,o,v,omit,previous);}
