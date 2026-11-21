#pragma once
#include "spatial-static-mutations.h"

bool spatialIntentPropsProtected();
SpatialStaticTicket spatialIntentPropsBefore(const SpatialStaticMutation*,int count,int recipeChunks=0,bool known=true);
void spatialIntentPropsCommitted(const SpatialStaticTicket&,int terrainDelta);
