#pragma once
#include <array>
#include <cstdint>
#include <optional>
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
struct SpatialShieldCropRoute {
  double actor,body,slot,generation,assignment,ticket;
  std::optional<std::array<double,3>> protection;
};
struct SpatialShieldCropStop {SpatialShieldCropRoute source;double time,x,z,yaw,phase;bool running;};
struct SpatialWorldProposalInput {
  int kind=0,mode=0;std::vector<float> floats;std::vector<int32_t> integers;
  std::optional<SpatialShieldCropStop> shieldCrop;
};
int spatialIntentStageWorld(const SpatialWorldProposalInput&,const SpatialStaticMutation*,int count,bool requireRetained=false);
void spatialIntentCompleteShieldCropStop(const SpatialShieldCropStop&,int polygon);
bool spatialShieldFootprintMatches(const float* xy,int count,double x,double z,double radius);
bool spatialShieldFootprintCurrent(int polygon,double x,double z,double radius);
bool spatialShieldPolygonAbsent(int polygon);
bool spatialIntentCaptureShieldCropStop(const SpatialShieldCropStop&);
int spatialIntentStageShieldCrop(const SpatialWorldProposalInput&,const SpatialStaticMutation*,const SpatialShieldCropRoute&);
int spatialIntentTakeWorld(double,double,double,double,double,SpatialWorldProposalInput&,bool allowGate=false);
int spatialIntentRevalidateBarrierAddition(double,double,const SpatialStaticMutation*,int,std::array<double,8>&);
int spatialIntentTakeBarrierAddition(double,double,double,double,double,double,SpatialWorldProposalInput&,std::array<double,5>&,bool allowGate=false);
int spatialIntentStageGateAddition(const std::array<double,7>&,int,std::vector<float>&);
int spatialIntentCommitGateAddition(double,double,double,double,double,double,int,SpatialWorldProposalInput&,std::array<double,5>&,int(*)(const SpatialWorldProposalInput&));
int spatialIntentBeginWorldPreview();
void spatialIntentEndWorldPreview();
// Explicit Idle-stroll12/Farm24 stop on the same prepared world transaction; no fake geometry.
int spatialIntentStopWorkerRoute(const SpatialWorldProposalInput&);
int spatialIntentRevalidateWorkerRouteStop(double,double,std::array<double,8>&);
int spatialIntentTakeWorkerRouteStop(double,double,double,double,double,double,SpatialWorldProposalInput&,std::array<double,5>&);

int stageCenterRuin(const SpatialWorldProposalInput&,const SpatialStaticMutation&,double,double,double,double,double,double,double);
int takeCenterRuin(double,double,double,SpatialWorldProposalInput&);
int spatialIntentWorldProposalSnapshot(std::array<double,6>&);
// A committed route changes its resource boundary while retaining every
// terrain allocation. Share the existing canonical revision receipt.
void spatialRecordMotionResourceBoundary(double session,double ticket,double time,int kind);

int spatialIntentStageGateRemoval(double,std::array<int,3>&);
int spatialIntentRevalidateGateRemoval(double,double);
int spatialIntentCommitGateRemoval(double,double,double,double,double,double,SpatialWorldProposalInput&,std::array<double,5>&,int(*)(const SpatialWorldProposalInput&));
