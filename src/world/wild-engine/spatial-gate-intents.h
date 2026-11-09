#pragma once
#include "spatial-static-mutations.h"
double spatialNativePolygonDistance(const double*,int,double,double,double,double);
double spatialNativePolygonPairDistance(const double*,int,const double*,int);
double spatialGateShapeDistance(const double*,int,const SpatialStaticMutation&);
struct SpatialGateStaticObject {
  SpatialStaticMutation shape;
  int kind=0,id=0,gx=0,gz=0; // 1 barrier, 2 polygon, 3 canonical prop.
};
using SpatialGateStaticVisitor=bool (*)(const SpatialGateStaticObject&,void*);
// Synchronous views of the existing canonical registries. No geometry cache.
// 1 complete, 0 visitor stopped, -1 missing resident data, -2 unsupported.
int spatialVisitGateStaticObjects(double,double,double,double,SpatialGateStaticVisitor,void*);
bool spatialNativeConvexPolygon(const double*,int);
int spatialNativeGateCircleRange(double,double,double,double,double,double,double,double*);
// Convex authored polygon, point swept with a positive physical radius. Returns
// 1 hit interval, 0 no hit, -1 unsupported. Native timing preparation only.
int spatialNativeGatePolygonRange(const double*,int,double,double,double,double,double,double*);
// Native resident triangle support, never a renderer height callback.
int spatialGateTerrainRange(double,double,double,double,double*);
int spatialGateMountSupport(double,double,double,double,double,double,double*);
void spatialGateSupportChanged();
bool spatialIntentGateUnsupported(double,double,double,double,double);
// Internal, unadmitted gate-candidate proof. Still checks all static world
// geometry, including any worker-passable overlay without modelled ownership.
int spatialGateCandidateSegmentClear(double,double,double,double,double);
