#pragma once
#include <cstdint>

// Native read access to the existing physical registry. No second body store.
struct SpatialBodyView {double x,z,r;int kind,flags;};
bool spatialReadBody(uint64_t id,SpatialBodyView& out);
// Non-resetting mutation stamp of this same registry. Read-only fences use it
// to reject asynchronous proposals, not to revalidate routes on ordinary ticks.
uint64_t spatialBodiesMutationRevision();
// Native intent executor only; not exported to JS. Updates this same registry
// after the whole cohort transaction has passed its metadata preflight.
bool spatialMoveBodyFromIntent(uint64_t id,double x,double z);
bool spatialBodiesParticipate(const SpatialBodyView& actor,const SpatialBodyView& other);
using SpatialBodyVisitor=void (*)(uint64_t,const SpatialBodyView&,void*);
void spatialVisitBodiesBox(double minX,double minZ,double maxX,double maxZ,
  SpatialBodyVisitor visitor,void* context);

// Opt-in reservation fences run before physical mutation. Legacy sessions with
// no reservations retain their existing behavior and contact/escape policies.
bool spatialIntentBodyCanChange(uint64_t id,const SpatialBodyView& proposed);
void spatialIntentBodyRemoving(uint64_t id);
void spatialIntentBodiesResetting();
