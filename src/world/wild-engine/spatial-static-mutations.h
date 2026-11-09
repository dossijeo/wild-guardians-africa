#pragma once
#include <array>
#include <cstdint>

// Temporary views of proposed native geometry, never another obstacle store.
struct SpatialStaticMutation {
  double x=0,z=0,halfX=0,halfZ=0,c=1,s=0;
  double minX=0,minZ=0,maxX=0,maxZ=0;
  const float* xy=nullptr;
  int count=0,passMask=0,affectedMask=3;
};
struct SpatialStaticTicket {
  std::array<uint64_t,3> before{};
  bool allowed=true,executing=false,tracked=false;
};
bool spatialStaticMutationBlocks(const SpatialStaticMutation&,double x,double z,
  double nx,double nz,double radius,int kind,bool physical=false);
bool spatialIntentStaticPreflight(const SpatialStaticMutation*,int count);
SpatialStaticTicket spatialIntentStaticBefore(const SpatialStaticMutation*,int count);
void spatialIntentStaticCommitted(const SpatialStaticTicket&);
bool spatialIntentStaticRestorationAllowed();
bool spatialIntentStaticExecutionActive();
