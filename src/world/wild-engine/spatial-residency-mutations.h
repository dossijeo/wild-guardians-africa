#pragma once
#include "spatial-static-mutations.h"

// Bounds supplied by the native world's canonical chunk layout, not by drawing.
struct SpatialResidencyRegion {double minX,minZ,maxX,maxZ;};
// Gradient samples extend by .81 m, enclosing vertices by <1 m and the
// <=1 m sweep-piece bounding box by <=.5 m. Keep a conservative 2.5 m halo.
constexpr double spatialResidencyDependencyPadding=2.5;
bool spatialExecutionResidencyPinRange(double x,double z,double radius,std::array<int64_t,4>& out);
SpatialStaticTicket spatialIntentResidencyBefore(const SpatialResidencyRegion*,int count,bool removing,bool releaseOnly=false);
void spatialIntentResidencyCommitted(const SpatialStaticTicket&,int count);
