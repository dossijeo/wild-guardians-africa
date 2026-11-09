#pragma once
#include <array>
#include <cstdint>
#include <vector>

// Temporary views of proposed native geometry, never another obstacle store.
struct SpatialStaticMutation {
  double x=0,z=0,halfX=0,halfZ=0,c=1,s=0,circleRadius=-1;
  double minX=0,minZ=0,maxX=0,maxZ=0;
  const float* xy=nullptr;
  int count=0,passMask=0,affectedMask=3;
};
struct SpatialStaticTicket {
  std::array<uint64_t,3> before{};
  bool allowed=true,executing=false,tracked=false;
  bool gateObjects=false,preview=false;
};
bool spatialStaticMutationBlocks(const SpatialStaticMutation&,double x,double z,
  double nx,double nz,double radius,int kind,bool physical=false);
bool spatialIntentStaticPreflight(const SpatialStaticMutation*,int count);
SpatialStaticTicket spatialIntentStaticBefore(const SpatialStaticMutation*,int count);
void spatialIntentStaticCommitted(const SpatialStaticTicket&);
bool spatialIntentStaticRestorationAllowed();
bool spatialIntentStaticProtectionActive();
// One pending barrier proposal owned by the intent authority. Geometry stays
// in this immutable value until its exact native boundary is committed/cancelled.
struct SpatialBarrierProposalInput {float x,z,halfX,halfZ,yaw;int passMask;};
int spatialIntentStageBarrier(const SpatialBarrierProposalInput&,const SpatialStaticMutation&);
int spatialIntentTakeBarrier(double session,double ticket,double sequence,double time,double clockSequence,SpatialBarrierProposalInput&);
// Bounded, immutable transaction input; transient proposal, not a second world.
struct SpatialWorldProposalInput {int kind=0,mode=0;std::vector<float> floats;std::vector<int32_t> integers;};
int spatialIntentStageWorld(const SpatialWorldProposalInput&,const SpatialStaticMutation*,int count);
int spatialIntentTakeWorld(double,double,double,double,double,SpatialWorldProposalInput&);
int spatialIntentBeginWorldPreview();
void spatialIntentEndWorldPreview();
