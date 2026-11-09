#pragma once
#include "spatial-static-mutations.h"
using SpatialTerrainProbe=bool (*)(double,double,double,double,double,int,void*);
bool spatialIntentTerrainProtected();
SpatialStaticTicket spatialIntentTerrainBefore(const SpatialStaticMutation*,int,SpatialTerrainProbe,void*,int recipes,bool known=true);
void spatialIntentTerrainCommitted(const SpatialStaticTicket&);
