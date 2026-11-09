#pragma once
double spatialNativePolygonDistance(const double*,int,double,double,double,double);
void spatialGateSupportChanged();
bool spatialIntentGateUnsupported(double,double,double,double,double);
// Internal, unadmitted gate-candidate proof. Still checks all static world
// geometry, including any worker-passable overlay without modelled ownership.
int spatialGateCandidateSegmentClear(double,double,double,double,double);
