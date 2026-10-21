#include <cmath>
#include <cstdint>
#include <algorithm>

// Persistent visual records: x, centerY, z, radius (Float64).
// Output: three count-sized index ranges, plus three counts. Stable input order.
// Caller owns lifetime and updates records only on population/geometry changes.
extern "C" void wr_lod(const double* records,int count,double x,double y,double z,
 const double* ranges,int levels,uint32_t* indices,uint32_t* counts){
 counts[0]=counts[1]=counts[2]=0;
 for(int i=0;i<count;i++){
  const double* p=records+i*4;
  const double d=std::max(0.0,std::hypot(p[0]-x,p[1]-y,p[2]-z)-p[3]);
  if(d>ranges[2])continue;
  const int level=std::min(d<ranges[0]?0:d<ranges[1]?1:2,levels-1);
  indices[level*count+counts[level]++]=uint32_t(i);
 }
}
