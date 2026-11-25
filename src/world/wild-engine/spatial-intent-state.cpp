#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <map>
#include <memory>
#include <optional>
#include <queue>
#include <set>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
#include "spatial-dynamic-bodies.h"
#include "spatial-static-mutations.h"
#include "spatial-residency-mutations.h"
#include "spatial-prop-mutations.h"
#include "spatial-terrain-mutations.h"
#include "spatial-gate-intents.h"
#include "spatial-gate-mechanisms-native.h"
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

// Experimental incremental read model for direct-service task intentions.
// JS owns the game entities. Only confirmed, ordered deltas enter this index.
// Planning is speculative; commit validates both entity and graph revisions.
extern "C" {
int spatial_body_remove(double);
int spatial_body_count();
int spatial_world_route_cached(float,float,float,float);
const float* spatial_world_route_ptr();
int spatial_world_route_reason();
float* spatial_region_batch_input_ptr(int);
int spatial_region_batch(int);
int32_t* spatial_region_batch_output_ptr();
int spatial_world_segment_clear(float,float,float,float);
int spatial_execution_segment_clear(double,double,double,double,double);
int spatial_execution_profile_kind();
int spatialWorkerFlightSegmentClear(double,double,double,double,double);
int spatial_animal_attack_segment_clear(double,double,double,double,double);
uint64_t spatial_execution_revision(int);
uint32_t lazy_route_revision();
int lazy_selected_context();
int lazy_sector_size();
int spatial_select_nav_profile_index(int);
int lazy_weak_region(int,int);
int lazy_enclosure(int,int);
int lazy_connected(int,int,int,int);
int lazy_connected_reason();
int lazy_connected_frontier_valid();
int lazy_connected_frontier_x();
int lazy_connected_frontier_z();
int spatial_local_clear(float,float,float,float);
int spatial_crop_placement_valid(float,float);
float spatial_surface_anywhere(float,float);
float spatial_fluid_surface_level();
int spatial_world_biome();
}

namespace {
constexpr int changeWidth=10,resultWidth=8,maxChangeBatch=4096;
constexpr int intentProtocolVersion=2,intentChangeWidth=15;
enum class IntentEvent:int {RouteAssigned=1,RouteInvalidated=2,RouteReplaced=3,
  IntentChanged=4,RouteCompleted=5};
constexpr double maxId=9007199254740991.0;
constexpr double pi=3.14159265358979323846;
struct Worker {uint64_t id,center;double x,z;bool eligible,actionActive;double rank;bool bodyBound=false;uint64_t body=0,inactiveSequence=0;};
#include "spatial-gate-state.h"
// Target kind: 0 direct, 1 ordinary crop, 2 banana, 3 wall, 4 center.
struct Target {
  uint64_t id;double x,z;bool active;int kind;double yaw,shape;
  double hp=0,maxHp=0;int status=0,material=0;bool damageKnown=false;
  int cropSpecies=0;double cropValue=0;
  double serviceX=0,serviceZ=0;bool serviceKnown=false;
  double wallDepthScale=1;
};
struct PlantCandidate {int x,z;double distance2;};
struct PlantOrder {
  bool operator()(const PlantCandidate& a,const PlantCandidate& b)const{
    if(a.distance2!=b.distance2)return a.distance2>b.distance2;
    if(a.z!=b.z)return a.z>b.z;
    return a.x>b.x;
  }
};
struct PlantSearch {
  std::priority_queue<PlantCandidate,std::vector<PlantCandidate>,PlantOrder> pending;
  std::unordered_set<int64_t> visited;
  double minX=0,minZ=0,maxX=0,maxZ=0;
  uint32_t topology=0;
  uint64_t centerRevision=0;
  int validTerrain=0,blockedPaths=0;
};
struct PlantLease {uint64_t center;double x,z;uint32_t topology;};
struct AttackSite {uint64_t crop;int region,x,z;float px,pz;};
struct AttackSiteCache {
  uint32_t topology=0;float radius=0;
  std::map<int,std::vector<AttackSite>> byRegion;
};
struct WallPortalCache {
  uint32_t topology=0;uint64_t walls=0;double radius=0;bool built=false;
  std::vector<double> rows;
};
struct CropProtectionStatus {
  uint32_t topology=0;float radius=0;int result=-1;bool valid=false;
};
struct CropGroup {
  uint64_t id;double value=0,x=0,z=0,minX=0,minZ=0,maxX=0,maxZ=0;
  std::vector<uint64_t> crops;
  std::unordered_map<int,CropProtectionStatus> protection;
  std::unordered_map<int,AttackSiteCache> attackSites;
};
struct DamageKey {double ratio;uint64_t id;};
struct DamageOrder {
  bool operator()(const DamageKey& a,const DamageKey& b)const{
    if(a.ratio!=b.ratio)return a.ratio>b.ratio;
    return a.id<b.id;
  }
};
// Task kind: 0 direct, 1 water/initial, 2 repair.
struct Task {uint64_t id,center,target,assigned;double created,rank;int kind;};
// A committed route belongs to the native session. It remains pinned while an
// actor uses it; speculative task batches never acquire a route handle.
enum class PlanningState:int {NeedsPlan=0,RouteActive=1,ActionActive=2,
  WaitingUnknown=3,WaitingBlocked=4,Cancelled=5,AwaitingResources=6,StationaryActive=7};
struct TaskActionResourceRequest {int kind=0;double duration=0,heading=0,requestedAt=0;};
struct RestoredTaskActionSource {
  uint64_t requestSequence=0;double initialElapsed=0;
  double runPhase=0,walkPhase=0,carryPhase=0,runRemaining=0;
};
struct NativeTaskActionBinding {
  std::array<double,24> prepared{},actual{};
  uint64_t preparedTicket=0,actualTicket=0,actionSequence=0;
  int bodyFlags=0;
  std::optional<RestoredTaskActionSource> restoredSource;
};
struct NativeTaskConsequenceOrigin {
  std::array<double,24> header{};
  // version, source task/target, created crate, delivery center, destination X/Z,
  // source action sequence. Semantic effects are committed with the handoff.
  std::array<double,8> effect{};
  std::shared_ptr<const NativeTaskActionBinding> source;
  uint64_t ticket=0;
};
struct NativeTaskConsequenceBinding {
  NativeTaskConsequenceOrigin prepared,actual;uint64_t assignmentSequence=0;
};
// Stationary ownership after an actual Carry arrival. This is immutable
// association metadata in the same intent, not another body/route registry.
struct NativeTaskSettlementOrigin {std::array<double,24> header{};uint64_t ticket=0;};
struct NativeTaskSettlementBinding {
  NativeTaskSettlementOrigin prepared,actual;uint64_t settlementSequence=0;
  std::shared_ptr<const NativeTaskConsequenceBinding> source;
  std::vector<uint64_t> sourceGates;
};
// Shared pose metadata in the existing intent owner, never a body registry.
struct NativeWorkerPoseResourceRequest {
 uint64_t actor=0,session=0,sequence=0,body=0;
 double at=0,x=0,z=0,yaw=0,runPhase=0,walkPhase=0,carryPhase=0,runRemaining=0,radius=0;
 int profile=1,bodyFlags=0;
};
// Binding the first physical body completes the request; it grants no route.
struct NativeHomeResourceRequest:NativeWorkerPoseResourceRequest {
 uint64_t raidSpawnSequence=0;
 uint64_t village=0,initialIdleSourceSequence=0,idleCycleSourceSequence=0,idleStrollSourceSequence=0;
 uint64_t strollRequestSourceSequence=0,farmRequestSourceSequence=0,farmArrivalSourceSequence=0;uint32_t idleStrollSourceGeneration=0,farmArrivalSourceGeneration=0;double homeX=0,homeZ=0;
 uint64_t completedTaskSourceSequence=0;
 uint32_t completedTaskSourceGeneration=0;
 uint64_t stoppedTaskSourceSequence=0;
 uint32_t stoppedTaskSourceGeneration=0;
 bool completedFarmArrival=false,completedIdleStroll=false;
};
// Semantic arrival goal on the existing owner; no route or Idle history.
struct NativeFarmArrivalResourceRequest:NativeWorkerPoseResourceRequest {
 uint64_t refugeSequence=0;
 uint64_t center=0;int workerProfile=0;double targetX=0,targetZ=0,centerX=0,centerZ=0;
};
struct NativeInitialIdleResourceRequest:NativeWorkerPoseResourceRequest {
 uint64_t center=0,anchor=0;int workerProfile=0,mode=0,anchorKind=0;
 double elapsed=0,remaining=0,approachRetry=0;uint32_t rng=0;
};
// One restored WALK intention. Its saved target/pose are semantic values;
// the new authority must bind a body and prepare a fresh22 before execution.
struct NativeIdleStrollResourceRequest:NativeWorkerPoseResourceRequest {
 uint64_t center=0,anchor=0;int workerProfile=0,anchorKind=0;uint32_t rng=0;bool approach=false;
 double anchorX=0,anchorZ=0,anchorRadius=0,idleSeconds=0,approachRetry=0,destinationX=0,destinationZ=0;std::optional<double> walkRemaining;
};
// Prepared residency of an actual initial stationary body. No task, route,
// duration or autonomous Idle policy is manufactured by this association.
struct NativeInitialIdleBodyOrigin {std::array<double,8> header{};uint64_t ticket=0;};
struct NativeTaskCancellationSource {std::array<double,20> values{};};
struct NativeInitialIdleBodyBinding {
 NativeInitialIdleBodyOrigin prepared,actual;uint64_t bodySequence=0;
 std::shared_ptr<const NativeTaskCancellationSource> cancellationSource;
 std::shared_ptr<const NativeInitialIdleResourceRequest> source;
 std::shared_ptr<const NativeTaskActionBinding> actionSource;
 int repairTargetKind=0;
};
// One finite original rest/watch cycle on the existing stationary body. Future
// phase data is immutable; the stochastic next request is resolved once at its
// native deadline and never grants a walking route by itself.
// Bounded stationary source metadata. A completed stroll supplies its actual
// endpoint; it never masquerades as an initial body or retains route ancestry.
struct NativeIdleCycleBodySource:NativeWorkerPoseResourceRequest {
 uint64_t center=0,anchor=0;int kind=0,workerProfile=0,anchorKind=0;
 std::array<double,6> initial{};
};
struct NativeIdleStrollBinding;
struct NativeIdleCycleOrigin {std::array<double,24> header{};uint64_t ticket=0;};
struct NativeIdleCycleBinding {
 NativeIdleCycleOrigin prepared,actual;uint64_t cycleSequence=0;
  std::shared_ptr<const NativeIdleStrollResourceRequest> failedRequestSource;
 std::shared_ptr<const NativeInitialIdleBodyBinding> body;
 NativeIdleCycleBodySource source;
};
struct NativeIdleCycleDecision {
 int status=0;bool approach=false;std::array<double,6> state{};double x=0,z=0;
 uint64_t topology=0,sequence=0;double requestedAt=0;
 std::vector<float> points;
};
struct NativeIdleCycle {
 std::shared_ptr<const NativeIdleCycleBinding> binding;
 NativeIdleCycleDecision next;
};
struct NativeHomeRouteSourceView {
 uint64_t actor=0,body=0,sequence=0,village=0;
 double at=0,x=0,z=0,yaw=0,radius=0,runPhase=0,walkPhase=0,carryPhase=0,runRemaining=0,homeX=0,homeZ=0;
 int profile=1,bodyFlags=0;
};
NativeHomeRouteSourceView homeRouteSourceView(const NativeTaskSettlementBinding* settled,const NativeHomeResourceRequest* request){
 NativeHomeRouteSourceView v;if(bool(settled)==bool(request))return v;
 if(request){v.actor=request->actor;v.body=request->body;v.sequence=request->sequence;v.village=request->village;v.at=request->at;
  v.x=request->x;v.z=request->z;v.yaw=request->yaw;v.radius=request->radius;v.runPhase=request->runPhase;v.walkPhase=request->walkPhase;v.carryPhase=request->carryPhase;v.runRemaining=request->runRemaining;
  v.homeX=request->homeX;v.homeZ=request->homeZ;v.profile=request->profile;v.bodyFlags=request->bodyFlags;
 }else{const auto& h=settled->actual.header;v.actor=uint64_t(h[1]);v.body=uint64_t(h[2]);v.sequence=settled->settlementSequence;v.village=uint64_t(h[21]);v.at=h[17];
  v.x=h[9];v.z=h[10];v.yaw=h[11];v.radius=h[12];v.runPhase=h[13];v.walkPhase=h[14];v.carryPhase=h[15];v.runRemaining=h[16];v.profile=int(h[18]);v.bodyFlags=int(h[19]);v.homeX=h[22];v.homeZ=h[23];
 }return v;
}
struct NativeHomeRouteOrigin {std::array<double,24> header{};uint64_t ticket=0;};
struct NativeHomeRouteBinding {
  NativeHomeRouteOrigin prepared,actual;uint64_t assignmentSequence=0;
  std::shared_ptr<const NativeTaskSettlementBinding> source;
  std::shared_ptr<const NativeHomeResourceRequest> requestSource;
};
// Bounded causal source: the preceding cycle/decision are named by sequence,
// not retained as an ever-growing chain of movement/Idle histories.
struct NativeIdleStrollOrigin {std::array<double,24> header{};uint64_t ticket=0;};
struct NativeIdleStrollBinding {
 NativeIdleStrollOrigin prepared,actual;uint64_t assignmentSequence=0;
 std::array<double,21> semantic{};
 std::shared_ptr<const NativeIdleStrollResourceRequest> requestSource;
 std::optional<NativeIdleCycleBodySource> farmSource,settlementSource;
};
struct NativeFarmArrivalRouteOrigin {std::array<double,24> header{};uint64_t ticket=0;};
// One bounded physical source, not a linked history of former trajectories.
struct NativeFarmArrivalHeldSource {uint64_t sequence=0;uint32_t generation=0;double at=0;std::array<double,8> pose{};};
struct NativeFarmArrivalRouteBinding {
 NativeFarmArrivalRouteOrigin prepared,actual;uint64_t assignmentSequence=0;
 std::optional<NativeFarmArrivalHeldSource> heldSource;
 std::shared_ptr<const NativeFarmArrivalResourceRequest> requestSource;
};
struct NativeAnimalRouteRequest {
 uint64_t actor=0,target=0,body=0,center=0,sequence=0;
 double at=0,x=0,z=0,heading=0,radius=0,phase=0,centerX=0,centerZ=0;bool entering=false;double targetX=0,targetZ=0;
 bool attackCenter=false;
};
struct NativeAnimalRouteOrigin {std::array<double,24> header{};uint64_t ticket=0;};
struct NativeAnimalRouteBinding {NativeAnimalRouteOrigin prepared,actual;uint64_t assignmentSequence=0;std::shared_ptr<const NativeAnimalRouteRequest> source;};
struct NativeAnimalStrike {
 std::shared_ptr<const NativeAnimalRouteBinding> route;
 std::array<double,19> header{};
 std::optional<std::array<double,19>> prepared;
 uint64_t attackId=0;
};
struct ActiveIntent {
  uint64_t actor=0,task=0,target=0;
  PlanningState state=PlanningState::NeedsPlan;
  uint32_t slot=0,generation=0,topology=0;
  bool animal=false,tacticalPending=false,lease=true,retreat=false,home=false;
  int profile=1;
  float routeStartX=0,routeStartZ=0;
  uint32_t routeCursor=0;
  float approachX=0,approachZ=0,approachRadius=0;
  bool approachKnown=false;
  std::vector<uint64_t> blockedCropGroups;
  // A release must name the old handle even after the slot is reclaimed. This
  // is transition metadata, never another copy of the navigation state.
  uint32_t revokedSlot=0,revokedGeneration=0;
  int dependencyProfile=-1;
  std::set<std::pair<int,int>> routeSectors;
  bool requiresResources=false;uint64_t resourceRequestSequence=0;double resourceRequestedAt=0;
  std::optional<std::array<double,16>> pendingTaskCancellation;
  uint64_t assignmentSequence=0;
  double assignedAt=0;
  int timingMode=0;
  double timingRadius=0;
  int motionFlags=0;double runBudget=0;
  std::shared_ptr<NativeAnimalRouteRequest> animalRouteRequest;
  std::shared_ptr<const NativeAnimalStrike> animalStrike;
  std::optional<TaskActionResourceRequest> actionRequest;
  std::optional<RestoredTaskActionSource> restoredActionSource;
  std::shared_ptr<NativeHomeResourceRequest> homeRequest;
  std::shared_ptr<NativeInitialIdleResourceRequest> initialIdleRequest;
  std::shared_ptr<NativeFarmArrivalResourceRequest> farmArrivalRequest;
  std::shared_ptr<NativeIdleStrollResourceRequest> strollRequest;
  std::shared_ptr<const NativeInitialIdleBodyBinding> initialIdleBodyBinding;
  std::shared_ptr<NativeIdleCycle> idleCycle;
  // Final executed values from a prepared22 suspension, not its old corridor.
  std::shared_ptr<const NativeWorkerPoseResourceRequest> heldIdleTaskSource;
  std::shared_ptr<const NativeTaskActionBinding> actionBinding;
  bool delivery=false;uint64_t carriedTarget=0;
  std::shared_ptr<const NativeTaskSettlementBinding> settlementBinding;
};
struct RouteHold {
  double distance=0,from=0,until=0,delay=0;
  uint64_t gate=0;
};
// Immutable association metadata owned by the current native route version.
// No geometry, trajectory or second body registry is retained here.
struct NativeTaskStartOrigin {
  std::array<double,24> header{};
  std::array<double,2> taskIdentity{};
  uint64_t ticket=0;
};
struct NativeTaskStartBinding {
  NativeTaskStartOrigin prepared,actual;
  uint64_t assignmentSequence=0;
};
struct RouteSlot {
  std::shared_ptr<const NativeAnimalRouteBinding> animalRouteBinding;
  std::shared_ptr<const NativeFarmArrivalRouteBinding> farmArrivalBinding;
  std::shared_ptr<const NativeIdleStrollBinding> idleStrollBinding;
  std::shared_ptr<const NativeHomeRouteBinding> homeBinding;
  std::shared_ptr<const NativeTaskStartBinding> startBinding;
  std::shared_ptr<const NativeTaskConsequenceBinding> consequenceBinding;
  std::vector<float> points;
  // Execution timing belongs to this same versioned route, not another plan.
  // Modes 1 (animal walk) / 2 (worker rules) are static candidates, not autonomy.
  std::vector<double> distances;
  std::vector<RouteHold> holds;
  double originX=0,originZ=0,originYaw=0,startTime=0,speed=0,radius=0;
  double departureTime=0;uint64_t waitGate=0;bool gateCandidate=false,workerDrySweep=false;
  bool gateAdmitted=false;
  bool resumable=false,suspended=false;
  double suspendedAt=0;
  bool stoppedTaskForHome=false;
  // Cumulative distance, motion time, run/walk/carry phases and distances.
  // The suffix has local timing/distances; these offsets never advance at rest.
  std::array<double,7> motionOffset{};
  std::vector<uint64_t> gateReservations;
  uint64_t actor=0;
  int timingMode=0,profile=0;
  int motionFlags=0;double runDistance=0,runSpeed=0,runBudget=0;
  uint32_t generation=0;bool active=false,pendingResources=false;
  // Admission fence in the existing slot, not a duplicate trajectory store.
  bool reserved=false;uint64_t reservationBody=0;
  bool hasExecution=false;
  std::array<double,18> executionPose{};
  std::array<uint64_t,3> staticProofStamp{};
};
struct Change {
  int op,kind;
  uint64_t id,center,target,assigned;
  double x,z,created,rank;
  bool flag;
};
struct GateCrossingBoundary {uint64_t gate;double distance,last;};
// A single pending replacement in the existing mutation reservation. It owns
// only an unpublished motion candidate, never another IntentState/world.
struct PendingNativeMotionDraft {
  std::shared_ptr<const NativeAnimalRouteRequest> animalRouteSource;
  std::optional<NativeAnimalRouteOrigin> previousAnimal;
  RouteSlot route;
  std::map<uint64_t,NativeGate> gates;
  std::vector<GateCrossingBoundary> boundaries;
  std::vector<double> rows;
  std::array<double,24> header{};
  std::array<double,2> taskIdentity{};
  std::array<double,3> taskPhaseSeed{};
  std::optional<NativeTaskStartOrigin> previousStart;
  std::optional<NativeHomeRouteOrigin> previousHome;
  std::optional<NativeFarmArrivalRouteOrigin> previousFarmArrival;
  std::optional<NativeIdleStrollOrigin> previousStroll;
  std::shared_ptr<NativeIdleCycle> idleCycleSource;
  std::array<double,21> idleStrollSemantic{};
  std::shared_ptr<const NativeTaskSettlementBinding> stationarySource;
  std::shared_ptr<const NativeInitialIdleBodyBinding> initialIdleBodySource;
  std::shared_ptr<const NativeWorkerPoseResourceRequest> heldIdleTaskSource;
  std::shared_ptr<const NativeIdleStrollResourceRequest> strollRequestSource;
  std::shared_ptr<const NativeFarmArrivalRouteBinding> strollFarmSource;
  std::optional<NativeIdleCycleBodySource> strollFarmPose,strollSettlementPose;
  std::shared_ptr<const NativeTaskSettlementBinding> strollSettlementSource;
  std::shared_ptr<const NativeHomeResourceRequest> homeRequestSource;
  std::shared_ptr<const NativeFarmArrivalResourceRequest> farmArrivalRequestSource;
  std::shared_ptr<const NativeFarmArrivalRouteBinding> farmArrivalHeldBinding;
  std::optional<NativeFarmArrivalHeldSource> farmArrivalHeldSource;
  // Evidence about the previous native-owned draft, never an execution grant.
  // Kept only in the one current proposal; cancelling it drops the evidence.
  std::array<double,11> timeTranslation{};
  uint32_t slot=0,generation=0,topology=0;
  uint64_t body=0;
};
struct PendingTaskActionDraft {
  std::array<double,24> header{};
  std::optional<RestoredTaskActionSource> restoredSource;
  std::array<double,8> timeTranslation{};
  std::optional<std::array<double,24>> previousHeader;
  uint64_t previousTicket=0;
};
struct PendingTaskConsequenceDraft {
  PendingNativeMotionDraft motion;
  std::array<double,8> effect{};
  std::shared_ptr<const NativeTaskActionBinding> source;
  std::optional<NativeTaskConsequenceOrigin> previous;
};
struct PendingTaskSettlementDraft {
  std::array<double,24> header{};
  std::shared_ptr<const NativeTaskConsequenceBinding> source;
  std::vector<uint64_t> sourceGates;
  std::optional<NativeTaskSettlementOrigin> previous;
  std::array<double,8> timeTranslation{};
};
struct PendingHomeArrivalDraft {
  std::array<double,24> header{};
  std::shared_ptr<const NativeHomeRouteBinding> source;
  std::optional<std::array<double,24>> previous;
  uint64_t previousTicket=0;
  std::array<double,8> timeTranslation{};
};
struct PendingBarrierProposal {
  std::optional<NativeAnimalStrike> animalStrike;
  std::optional<PendingNativeMotionDraft> resume,start,home,farmArrivalRoute,animalRoute;
  std::optional<PendingTaskActionDraft> action;
  std::optional<PendingTaskConsequenceDraft> consequence;
  std::optional<PendingTaskSettlementDraft> settlement;
  std::optional<PendingHomeArrivalDraft> homeArrival;
  struct InitialIdleBodyDraft {
   std::shared_ptr<const NativeTaskCancellationSource> cancellationSource;
   std::array<double,8> header{};std::shared_ptr<const NativeInitialIdleResourceRequest> source;
   std::shared_ptr<const NativeTaskActionBinding> actionSource;
   int repairTargetKind=0;
   std::optional<NativeInitialIdleBodyOrigin> previous;std::array<double,8> timeTranslation{};
  };
  std::optional<InitialIdleBodyDraft> initialIdleBody;
  struct IdleCycleDraft {
   std::array<double,24> header{};std::shared_ptr<const NativeInitialIdleBodyBinding> body;
   std::shared_ptr<NativeIdleCycle> previousCycle;
   std::shared_ptr<const NativeIdleStrollBinding> strollSource;
   std::shared_ptr<const NativeIdleStrollResourceRequest> failedRequest;
   std::shared_ptr<const NativeFarmArrivalRouteBinding> farmSource;
   std::shared_ptr<const NativeTaskSettlementBinding> settlementSource;NativeIdleCycleBodySource source;
   std::optional<NativeIdleCycleOrigin> previous;std::array<double,8> timeTranslation{};
  };
  std::optional<IdleCycleDraft> idleCycle;
  std::optional<PendingNativeMotionDraft> idleStroll;
  struct WorkerRouteStopDraft {
    uint64_t preparedTicket=0;double preparedAt=0;
    std::vector<double> preparedRoutes,preparedGates;
    std::array<double,8> translation{};
  };
  std::optional<WorkerRouteStopDraft> workerRouteStop;
  struct BarrierAdditionDraft {uint64_t preparedTicket=0;double preparedAt=0;std::array<double,8> translation{};uint64_t gateId=0;std::map<uint64_t,NativeGate> gate;bool removal=false;};
  std::optional<BarrierAdditionDraft> barrierAddition;
  bool retainsRoutes=false;
  std::vector<double> routeEffects,gateEffects;
  bool pending=false;uint32_t session=0;uint64_t ticket=0;
  double at=0;uint64_t bodies=0,entities=0,facts=0,intents=0,reservations=0,clock=0,gates=0;
  std::array<uint64_t,3> world{};
  SpatialBarrierProposalInput input{};
  SpatialWorldProposalInput worldInput;
  int kind=0;
};
struct FinishedAnimalStrike {
  uint64_t session,actor,body,target,center,attack,ticket;
  double x,z,radius,phase,yaw,at;
};
struct IntentState {
  std::unordered_map<uint64_t,Worker> workers;
  std::unordered_map<uint64_t,Target> targets;
  std::unordered_map<uint64_t,Task> tasks;
  std::set<DamageKey,DamageOrder> damagedWalls,damagedCenters;
  std::vector<double> damagedResults;
  std::vector<CropGroup> cropGroups;
  std::vector<double> cropGroupRows,cropGroupMembers;
  // A crop's physical enclosure verdict is independent of other crops.
  // Group membership may change without invalidating unchanged crop probes.
  std::unordered_map<uint64_t,std::array<CropProtectionStatus,6>> cropProtection;
  uint64_t cropRevision=0;bool cropGroupsDirty=true;
  std::unordered_map<int64_t,std::vector<uint64_t>> cropCells;
  std::unordered_map<uint64_t,PlantSearch> plantSearches;
  std::unordered_map<uint64_t,PlantLease> plantLeases;
  std::array<double,8> plantResult{};
  uint64_t nextPlantLease=1,centerRevision=0;
  std::vector<double> changes,results;
  std::array<double,13> pendingTaskRouteResult{};
  std::vector<double> pendingTaskControlSnapshot,startBindingResult;
  std::vector<float> routes;
  std::vector<std::pair<uint64_t,uint64_t>> proposals;
  std::unordered_map<uint64_t,ActiveIntent> activeIntents;
  // Inverse references to existing intents/route slots, not another nav model.
  std::map<std::tuple<int,int,int>,std::set<uint64_t>> routeSubscribers;
  std::array<std::set<uint64_t>,6> profileParticipants,waitingSubscribers;
  std::set<uint64_t> changedRouteActors;
  uint64_t routeValidations=0,routeValidationSegments=0,reconcileCandidates=0;
#ifdef WILD_DECLARATIVE_ATTACK
  // Experimental high-level intent survives loss of its current route/target.
  // Never used by the production binary.
  struct AttackDeclaration {double radius;int profile;bool dirty;
    bool waiting=false;double since=0,next=0;int attempts=0;
    bool blockedApproach=false;};
  std::unordered_map<uint64_t,AttackDeclaration> attackDeclarations;
  std::set<std::pair<double,uint64_t>> attackDeadlines;
#ifdef WILD_DECLARATIVE_STATS
  uint64_t attackWakeEvents=0,attackWakeVisits=0,attackWakeIdle=0,attackWakeTransitions=0;
#endif
#endif
  std::unordered_map<uint64_t,std::unordered_set<uint64_t>> byTarget,byTask;
  std::unordered_map<uint64_t,std::unordered_set<uint64_t>> byBlockedCropGroup;
  std::vector<double> wallOpportunityActors;
  std::vector<RouteSlot> routeSlots;
  std::vector<float> attackRouteInput;
  std::vector<float> routeProgressInput;
  // Transient mobile-body snapshot supplied once at an attack planning event.
  // It never becomes a topological cache or invalidates a committed route.
  std::vector<double> attackBlockers;
  // JS retains a crop lease between committed strikes even after the native
  // attack action has finished. Project those live leases for this request.
  std::vector<double> attackReservedTargets;
  std::array<double,13> attackResult{};
  std::array<double,10> wallAttackResult{};
  // Experimental wall-side graph for comparing native enclosure choices with
  // the current raid selector. Each directed row is wall, from, to, x, z.
  std::unordered_map<int,WallPortalCache> wallPortalCaches;
  uint64_t wallRevision=0,wallPortalBuilds=0;
  std::vector<double> perimeterRows;
  std::vector<double> intentChanges;
  std::vector<double> controlSnapshot;
  std::array<double,10> intentResult{};
  std::array<double,20> timingResult{};
  std::array<double,3> holdResult{};
  std::vector<double> routeHoldResult,routeKnotResult;
  std::array<double,18> sampleResult{};
  uint64_t routeTimeSamples=0;
  int timingRejection=0;
  std::map<uint64_t,uint32_t> reservedBodies;
  std::map<uint64_t,uint32_t> suspendedBodies;
  uint64_t routeSuspensions=0,routeResumptions=0;
  std::array<double,27> suspendedRouteResult{};
  std::array<double,6> reservationResult{};
  uint64_t reservationChecks=0,reservationPairs=0,reservationBodyChecks=0,
    reservationMutationCandidates=0;
  bool executionEnabled=false,bodyDomainActive=false,drainingStops=false,resettingBodies=false;
  std::array<uint64_t,3> executionWorldStamp{};
  std::array<double,18> executionResult{};
  std::array<double,31> taskExecutionResult{};
  std::array<double,14> taskActionRequestResult{};
  std::array<double,8> taskActionRestoreSourceResult{};
  std::vector<double> taskActionRestoreSourcesResult;
  std::vector<double> taskActionBindingResult;
  std::vector<double> taskConsequenceBindingResult;
  std::array<double,30> deliveryExecutionResult{};
  std::vector<double> taskSettlementBindingResult,homeBindingResult,farmArrivalRouteBindingResult;
  std::array<double,30> farmArrivalExecutionResult{};
  std::vector<double> initialIdleBodyBindingResult;
  std::array<double,20> taskCancellationResult{};
  std::array<double,16> pendingTaskCancellationResult{};
  std::vector<double> idleCycleBindingResult;
  std::array<double,14> idleCycleExecutionResult{};
  std::array<double,14> idleCycleNextResult{};
  std::array<double,26> idleCycleSourceResult{};
  std::vector<double> idleStrollBindingResult;
  std::array<double,42> idleStrollExecutionResult{};
  std::array<double,30> homeExecutionResult{};
  std::array<double,52> homeArrivalResult{};
  std::array<double,19> homeRequestResult{};
  std::vector<double> homeRequestsResult;
  std::array<double,24> farmArrivalRequestResult{};std::vector<double> farmArrivalRequestsResult;
  std::array<double,25> initialIdleRequestResult{};
  std::array<double,30> strollRequestResult{};std::vector<double> strollRequestsResult;
  std::array<double,9> strollFailedRestResult{};
  std::vector<double> initialIdleRequestsResult;
  std::set<uint64_t> stoppedReservationBodies,removingBodies;
  std::set<uint64_t> stoppedGateRouteActors;
  uint64_t executionAdvances=0,executionEvaluations=0,executionBodyUpdates=0,executionStopInvalidations=0;
  uint64_t staticMutationCandidates=0,staticMutationSegments=0,staticMutationBodyChecks=0,
    staticMutationRevocations=0,staticMutationRejected=0,staticMutationCommits=0;
  uint64_t residencyCandidates=0,residencySegments=0,residencyBodyChecks=0,
    residencyRevocations=0,residencyRejected=0,residencyCommits=0,residencyPinRevision=0;
  uint64_t propMutationCandidates=0,propMutationSegments=0,propMutationBodyChecks=0,
    propMutationRevocations=0,propMutationRejected=0,propMutationCommits=0,propMutationRecipeChunks=0;
  uint64_t terrainCandidates=0,terrainSegments=0,terrainBodyChecks=0,terrainRevocations=0,
    terrainRejected=0,terrainCommits=0,terrainRecipeChunks=0;
  std::map<uint64_t,NativeGate> gates;
  std::unordered_map<uint64_t,uint64_t> gateBodyActors;
  std::vector<double> gateInput,gateResult;
  uint64_t gateBoundaries=0,gateWorkerChecks=0,gatePrefixSegments=0;
  uint64_t gateWaitSegments=0;
  uint64_t gateSweepPairs=0,gateSweepEvaluations=0,gateSweepRejected=0;
  std::array<double,6> gateSweepResult{};
  NativeGateMotionProposal gateMotionProposal;
  uint64_t nextGateMotionTicket=0;
  uint64_t gateRevision=0,nextBarrierProposal=0;
  PendingBarrierProposal barrierProposal;
  std::array<double,25> animalStrikeResult{};
  std::array<double,25> animalRouteResult{};
  // Only the completed native attack attests this stationary body's handoff.
  // Keep the small terminal receipt after revoking the old route and bindings.
  std::optional<FinishedAnimalStrike> finishedAnimalStrike;
  std::array<double,23> animalCropState{};
  bool worldMutationPreview=false,worldPreviewRetainsRoutes=true;
  std::set<uint64_t> worldPreviewStoppedRoutes;
  std::array<double,6> barrierProposalResult{};
  std::array<double,5> gateMotionResult{};
  uint64_t gateStaticPairs=0,gateStaticEvaluations=0,gateStaticRejected=0;
  std::array<double,8> gateStaticResult{};
  uint64_t nextGateMechanism=0;
  std::array<double,40> gateMechanismPose{};
  std::array<double,8> gateMechanismCollision{};
  std::vector<double> gateMechanismWorld;
  int gateStaticProofs=0;
  std::array<uint64_t,3> gateStaticWorldStamp{};
  uint32_t session=0;
  uint64_t invalidations=0;
  std::unordered_map<uint64_t,uint64_t> planningCallsByActor;
  uint64_t sequence=0,entityRevision=0,damageRevision=0,plannedEntityRevision=0;
  uint64_t intentSequence=0;
  double effectiveTime=0;
  // Finite presentation watermark of THIS native execution authority. It is
  // committed after execution/commands, never a prepared route's future clock.
  bool causalClock=false,clockPaused=false,clockReanchor=true;
  double clockThrough=0,clockRate=1;
  uint64_t clockSequence=0,clockIntentSequence=0,clockProofSequence=UINT64_MAX;
  std::array<double,8> clockResult{};
  uint32_t plannedGraphRevision=0;
  int plannedProfile=-1;
  uint64_t routeQueries=0,candidates=0;
  bool proposalOpen=false;
};
IntentState& state(){static IntentState* value=new IntentState();return *value;}
#ifdef WILD_DECLARATIVE_ATTACK
void clearAttackDeadline(IntentState& s,uint64_t actor){
  const auto found=s.attackDeclarations.find(actor);
  if(found==s.attackDeclarations.end()||!found->second.waiting)return;
  s.attackDeadlines.erase({found->second.next,actor});found->second.waiting=false;
}
#endif
bool integer(double value,bool allowZero=false){
  return std::isfinite(value)&&value>=double(allowZero?0:1)&&
    value<=maxId&&std::floor(value)==value;
}
bool coordinate(double value){return std::isfinite(value)&&std::abs(value)<2147483000.0;}
bool nativeTaskActionBodyCurrent(const IntentState& s,const ActiveIntent& intent){
  if(!intent.actionBinding||intent.state!=PlanningState::ActionActive||intent.animal||intent.home||intent.retreat||!intent.requiresResources)return false;
  const auto& binding=*intent.actionBinding;const auto& h=binding.actual;
  const auto worker=s.workers.find(intent.actor);const auto task=s.tasks.find(intent.task);SpatialBodyView body;
  return binding.actionSequence&&double(intent.actor)==h[1]&&double(intent.task)==h[2]&&double(intent.target)==h[3]&&
    worker!=s.workers.end()&&worker->second.bodyBound&&double(worker->second.body)==h[4]&&
    task!=s.tasks.end()&&task->second.assigned==intent.actor&&task->second.target==intent.target&&
    spatialReadBody(worker->second.body,body)&&body.kind==0&&body.flags==binding.bodyFlags&&body.x==h[12]&&body.z==h[13]&&body.r==h[14]&&
    worker->second.x==body.x&&worker->second.z==body.z&&!s.reservedBodies.count(worker->second.body)&&!s.suspendedBodies.count(worker->second.body);
}
bool nativeSettlementBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 const bool pendingHome=intent.home&&intent.homeRequest&&!intent.task&&!intent.target&&!intent.generation&&intent.state==PlanningState::AwaitingResources;
 if(!intent.settlementBinding||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||
    (intent.state!=PlanningState::StationaryActive&&intent.state!=PlanningState::AwaitingResources)||
    (intent.state==PlanningState::StationaryActive&&intent.task)||(intent.state==PlanningState::AwaitingResources&&!pendingHome&&(!intent.task||intent.slot>=s.routeSlots.size()||!s.routeSlots[intent.slot].pendingResources||s.routeSlots[intent.slot].generation!=intent.generation)))return false;
 const auto& b=*intent.settlementBinding;const auto& h=b.actual.header;const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(uint64_t(h[4]));SpatialBodyView body;
 return worker!=s.workers.end()&&(h[21]?intent.home&&!intent.task&&intent.state==PlanningState::StationaryActive&&intent.approachKnown&&intent.approachX==float(h[22])&&intent.approachZ==float(h[23])&&!worker->second.eligible:!intent.home||pendingHome&&!worker->second.eligible)&&b.settlementSequence&&double(intent.actor)==h[1]&&worker!=s.workers.end()&&worker->second.bodyBound&&double(worker->second.body)==h[2]&&double(worker->second.center)==h[4]&&
  spatialReadBody(worker->second.body,body)&&body.kind==0&&body.flags==int(h[19])&&body.x==h[9]&&body.z==h[10]&&body.r==h[12]&&worker->second.x==body.x&&worker->second.z==body.z&&
  !s.reservedBodies.count(worker->second.body)&&!s.suspendedBodies.count(worker->second.body)&&center!=s.targets.end()&&center->second.active&&center->second.kind==4&&center->second.status==0;
}
bool nativeDeliveryBodyCurrent(const IntentState&,const ActiveIntent&);
static bool nativeIdleCycleBodyCurrent(const IntentState&,const ActiveIntent&);
static bool nativeIdleCycleCurrent(const IntentState&,const ActiveIntent&);
bool nativeHomeBodyCurrent(const IntentState&,const ActiveIntent&);
bool nativeFarmArrivalBodyCurrent(const IntentState&,const ActiveIntent&);
bool nativeInitialIdleBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.initialIdleBodyBinding||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleRequest)return false;
 const auto& b=*intent.initialIdleBodyBinding;if(!b.source||!b.bodySequence)return false;const auto& r=*b.source;const auto& h=b.actual.header;
 const bool idle=intent.state==PlanningState::StationaryActive&&!intent.task&&!intent.target&&!intent.home&&!intent.generation&&!intent.lease;
 const bool task=intent.state==PlanningState::AwaitingResources&&intent.task&&!intent.home&&!intent.homeRequest&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].pendingResources&&s.routeSlots[intent.slot].generation==intent.generation;
 const bool home=intent.state==PlanningState::AwaitingResources&&intent.home&&intent.homeRequest&&!intent.task&&!intent.target&&!intent.generation&&!intent.lease&&intent.homeRequest->initialIdleSourceSequence==b.bodySequence;
 if(!idle&&!task&&!home)return false;
 const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(r.center);SpatialBodyView body;
 return h[0]==1&&h[1]==double(intent.actor)&&h[2]==double(r.body)&&h[3]==double(r.sequence)&&h[4]==r.at&&h[7]==double(r.profile)&&r.actor==intent.actor&&r.session==s.session&&r.body&&r.mode>=1&&r.mode<=2&&
  intent.profile==r.profile&&worker!=s.workers.end()&&worker->second.center==r.center&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.bodyBound&&worker->second.body==r.body&&worker->second.x==r.x&&worker->second.z==r.z&&
  spatialReadBody(r.body,body)&&body.kind==0&&body.flags==r.bodyFlags&&body.x==r.x&&body.z==r.z&&body.r==r.radius&&!s.reservedBodies.count(r.body)&&!s.suspendedBodies.count(r.body)&&
  center!=s.targets.end()&&center->second.active&&center->second.kind==4&&center->second.status==0;
}
// A suspended stroll retains the ONE original slot and its executed pose. Home
// may consume that held owner; it must not manufacture an arrived21/initial20.
static bool nativeHeldIdleStrollBodyCurrent(const IntentState& s,const ActiveIntent& intent,uint64_t sequence,uint32_t generation){
 const bool held=intent.state==PlanningState::WaitingBlocked&&!intent.home&&!intent.homeRequest;
 const bool home=intent.state==PlanningState::AwaitingResources&&intent.home&&intent.homeRequest&&intent.homeRequest->idleStrollSourceSequence==sequence&&intent.homeRequest->idleStrollSourceGeneration==generation;
 if((!held&&!home)||!intent.requiresResources||intent.task||intent.target||intent.lease||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleRequest||intent.initialIdleBodyBinding||intent.idleCycle||!generation||intent.generation!=generation||intent.slot>=s.routeSlots.size())return false;
 const auto& route=s.routeSlots[intent.slot];const auto& b=route.idleStrollBinding;const auto& p=route.executionPose;const auto worker=s.workers.find(intent.actor);SpatialBodyView body;
 if(!b||!route.active||!route.suspended||!route.resumable||route.reserved||route.pendingResources||!route.hasExecution||route.actor!=intent.actor||route.generation!=generation||p[6]||b->assignmentSequence!=sequence||intent.assignmentSequence!=sequence||route.reservationBody!=uint64_t(b->actual.header[2])||route.startTime!=b->actual.header[10]||route.suspendedAt<route.startTime||route.suspendedAt>=b->actual.header[11]||route.profile!=intent.profile||worker==s.workers.end()||(home&&worker->second.eligible)||worker->second.actionActive||worker->second.inactiveSequence||!worker->second.bodyBound||worker->second.body!=route.reservationBody||double(worker->second.center)!=b->semantic[3])return false;
 const auto suspended=s.suspendedBodies.find(route.reservationBody);
 if(suspended==s.suspendedBodies.end()||suspended->second!=intent.slot||s.reservedBodies.count(route.reservationBody)||!spatialReadBody(route.reservationBody,body)||body.kind!=0||double(body.flags)!=b->semantic[4]||body.r!=route.radius||body.x!=p[0]||body.z!=p[1]||worker->second.x!=body.x||worker->second.z!=body.z)return false;
 if(home){const auto& r=*intent.homeRequest;if(r.initialIdleSourceSequence||r.idleCycleSourceSequence||r.farmArrivalSourceSequence||r.farmArrivalSourceGeneration||r.body!=route.reservationBody||r.profile!=intent.profile||r.bodyFlags!=body.flags||r.radius!=body.r||r.at<route.suspendedAt||r.sequence<=sequence||r.x!=p[0]||r.z!=p[1]||r.yaw!=p[4]||r.runPhase!=p[9]||r.walkPhase!=p[10]||r.carryPhase!=p[11]||r.runRemaining!=p[14])return false;}
 return true;
}
// A task claim retains executed/restored pose values. Its ONE route
// slot owns the new unpublished request; the former corridor is discarded.
static bool nativeHeldIdleTaskBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.heldIdleTaskSource||!intent.requiresResources||!intent.lease||intent.state!=PlanningState::AwaitingResources||!intent.task||!intent.target||intent.animal||intent.home||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleRequest||intent.initialIdleBodyBinding||intent.idleCycle||intent.homeRequest||intent.slot>=s.routeSlots.size())return false;
 const auto& r=*intent.heldIdleTaskSource;const auto& route=s.routeSlots[intent.slot];const auto worker=s.workers.find(intent.actor);const auto task=s.tasks.find(intent.task);const auto target=s.targets.find(intent.target);SpatialBodyView body;
 if(!(r.actor==intent.actor&&r.session==s.session&&r.sequence&&r.sequence<intent.resourceRequestSequence&&r.at<=intent.resourceRequestedAt&&r.profile==intent.profile&&route.active&&route.pendingResources&&!route.suspended&&route.actor==intent.actor&&route.generation==intent.generation&&route.originX==r.x&&route.originZ==r.z&&
  worker!=s.workers.end()&&!worker->second.eligible&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.x==r.x&&worker->second.z==r.z&&task!=s.tasks.end()&&task->second.assigned==intent.actor&&task->second.target==intent.target&&task->second.center==worker->second.center&&target!=s.targets.end()&&target->second.active))return false;
 if(!r.body)return !worker->second.bodyBound&&!worker->second.body;
 return worker->second.bodyBound&&worker->second.body==r.body&&spatialReadBody(r.body,body)&&body.kind==0&&body.flags==r.bodyFlags&&body.r==r.radius&&body.x==r.x&&body.z==r.z&&!s.reservedBodies.count(r.body)&&!s.suspendedBodies.count(r.body);
}
static const NativeIdleStrollBinding* currentIdleStroll(double actor);
static bool nativeCompletedIdleStrollBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 const auto* binding=currentIdleStroll(double(intent.actor));if(!binding)return false;
 const auto& route=s.routeSlots[intent.slot];
 return route.executionPose[6]==1&&route.executionPose[15]==0&&route.executionPose[16]==0&&s.effectiveTime>=binding->actual.header[11];
}
static bool nativeCompletedFarmArrivalBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!nativeFarmArrivalBodyCurrent(s,intent))return false;
 const auto& route=s.routeSlots[intent.slot];
 return route.hasExecution&&route.executionPose[6]==1&&route.executionPose[15]==0&&route.executionPose[16]==0&&s.effectiveTime>=route.farmArrivalBinding->actual.header[11];
}
static std::shared_ptr<const NativeWorkerPoseResourceRequest> captureHeldWorkerTaskSource(const IntentState& s,const ActiveIntent& intent){
 const auto& route=s.routeSlots[intent.slot];const auto& p=route.executionPose;auto r=std::make_shared<NativeWorkerPoseResourceRequest>();
 r->actor=intent.actor;r->session=s.session;r->sequence=intent.assignmentSequence;r->body=route.reservationBody;r->at=route.suspended?route.suspendedAt:route.farmArrivalBinding->actual.header[11];r->profile=intent.profile;r->bodyFlags=route.farmArrivalBinding?route.farmArrivalBinding->requestSource->bodyFlags:int(route.idleStrollBinding->semantic[4]);r->radius=route.radius;
 r->x=p[0];r->z=p[1];r->yaw=p[4];r->runPhase=p[9];r->walkPhase=p[10];r->carryPhase=p[11];r->runRemaining=p[14];return r;
}
bool nativeHeldFarmArrivalBodyCurrent(const IntentState& s,const ActiveIntent& intent);
static const RouteSlot* stoppedTaskHomeSource(const IntentState& s,const ActiveIntent& intent,
    uint64_t assignment,uint32_t generation,SpatialBodyView& body){
  if(!assignment||!generation||intent.assignmentSequence!=assignment||intent.generation!=generation||
     intent.slot>=s.routeSlots.size()||!intent.requiresResources||intent.animal||intent.delivery||intent.retreat||
     intent.actionBinding||intent.restoredActionSource)return nullptr;
  const auto& route=s.routeSlots[intent.slot];
  if(!route.stoppedTaskForHome||!route.active||!route.suspended||!route.resumable||route.reserved||
     route.pendingResources||!route.hasExecution||route.actor!=intent.actor||route.generation!=generation||
     route.profile!=intent.profile||route.executionPose[6]||route.suspendedAt>s.effectiveTime)return nullptr;

  const auto worker=s.workers.find(intent.actor);
  const auto held=s.suspendedBodies.find(route.reservationBody);
  const auto& pose=route.executionPose;
  if(worker==s.workers.end()||!worker->second.bodyBound||worker->second.body!=route.reservationBody||
     worker->second.actionActive||worker->second.inactiveSequence||
     held==s.suspendedBodies.end()||held->second!=intent.slot||s.reservedBodies.count(route.reservationBody)||
     !spatialReadBody(route.reservationBody,body)||body.kind!=0||body.r!=route.radius||
     body.x!=pose[0]||body.z!=pose[1]||worker->second.x!=body.x||worker->second.z!=body.z)return nullptr;
  return &route;
}
static bool stoppedTaskHomeRequestCurrent(const IntentState& s,const ActiveIntent& intent,
    const NativeHomeResourceRequest& request){
  SpatialBodyView body;
  const auto* route=stoppedTaskHomeSource(s,intent,request.stoppedTaskSourceSequence,request.stoppedTaskSourceGeneration,body);
  if(!route||request.initialIdleSourceSequence||request.idleCycleSourceSequence||
     request.idleStrollSourceSequence||request.farmArrivalSourceSequence||
     request.strollRequestSourceSequence||request.farmRequestSourceSequence||
     request.at<route->suspendedAt||request.sequence<=intent.assignmentSequence)return false;
  const auto& pose=route->executionPose;
  return request.body==route->reservationBody&&request.profile==route->profile&&
    request.x==pose[0]&&request.z==pose[1]&&request.yaw==pose[4]&&request.runPhase==pose[9]&&
    request.walkPhase==pose[10]&&request.carryPhase==pose[11]&&request.runRemaining==pose[14];
}
bool nativeHomeRequestBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.homeRequest||!intent.home||!intent.requiresResources||intent.task||intent.target||intent.lease||intent.animal||intent.retreat||intent.delivery||intent.state!=PlanningState::AwaitingResources)return false;
 const auto& r=*intent.homeRequest;const bool stroll=r.idleStrollSourceSequence&&(r.completedIdleStroll?!intent.generation&&!s.suspendedBodies.count(r.body)&&r.idleStrollSourceGeneration&&r.idleStrollSourceSequence==intent.assignmentSequence&&r.idleStrollSourceSequence<r.sequence&&!r.initialIdleSourceSequence&&!r.idleCycleSourceSequence&&!r.farmArrivalSourceSequence&&!r.farmArrivalSourceGeneration:nativeHeldIdleStrollBodyCurrent(s,intent,r.idleStrollSourceSequence,r.idleStrollSourceGeneration)),farm=r.farmArrivalSourceSequence&&(r.completedFarmArrival?!intent.generation&&!s.suspendedBodies.count(r.body)&&r.farmArrivalSourceGeneration&&r.farmArrivalSourceSequence==intent.assignmentSequence&&r.farmArrivalSourceSequence<r.sequence&&!r.initialIdleSourceSequence&&!r.idleCycleSourceSequence&&!r.idleStrollSourceSequence&&!r.idleStrollSourceGeneration:nativeHeldFarmArrivalBodyCurrent(s,intent));
 if(r.completedFarmArrival&&!farm||r.completedIdleStroll&&!stroll||r.completedFarmArrival&&r.completedIdleStroll)return false;
 if(r.completedTaskSourceSequence&&(!r.completedTaskSourceGeneration||intent.generation||s.suspendedBodies.count(r.body)||
    r.completedTaskSourceSequence!=intent.assignmentSequence||r.completedTaskSourceSequence>=r.sequence||
    r.initialIdleSourceSequence||r.idleCycleSourceSequence||r.idleStrollSourceSequence||r.farmArrivalSourceSequence||
    r.strollRequestSourceSequence||r.farmRequestSourceSequence||r.stoppedTaskSourceSequence||r.completedFarmArrival||r.completedIdleStroll))return false;
 const bool taskStop=r.stoppedTaskSourceSequence&&stoppedTaskHomeRequestCurrent(s,intent,r);
 if((r.stoppedTaskSourceSequence&&!taskStop)||(r.idleStrollSourceSequence&&r.farmArrivalSourceSequence)||
    (r.idleStrollSourceSequence?!stroll:r.farmArrivalSourceSequence?!farm:!taskStop&&intent.generation!=0))return false;
 if(intent.settlementBinding&&(!nativeSettlementBodyCurrent(s,intent)||intent.settlementBinding->actual.header[21]))return false;
 if(intent.initialIdleBodyBinding&&!nativeInitialIdleBodyCurrent(s,intent))return false;
 if(intent.homeRequest->idleCycleSourceSequence&&(!intent.idleCycle||intent.idleCycle->binding->cycleSequence!=intent.homeRequest->idleCycleSourceSequence||!nativeIdleCycleBodyCurrent(s,intent)))return false;
 const auto worker=s.workers.find(intent.actor);SpatialBodyView body;
 return r.actor==intent.actor&&r.session==s.session&&r.sequence==intent.resourceRequestSequence&&r.body&&worker!=s.workers.end()&&!worker->second.eligible&&!worker->second.actionActive&&worker->second.bodyBound&&worker->second.body==r.body&&
  worker->second.x==r.x&&worker->second.z==r.z&&spatialReadBody(r.body,body)&&body.x==r.x&&body.z==r.z&&body.r==r.radius&&body.kind==0&&body.flags==r.bodyFlags&&
  !s.reservedBodies.count(r.body)&&(stroll||farm||taskStop||!s.suspendedBodies.count(r.body));
}
bool nativeFarmArrivalRequestCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.farmArrivalRequest||intent.home||intent.task||intent.target||intent.lease||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleRequest||intent.initialIdleBodyBinding||intent.idleCycle||intent.strollRequest||intent.homeRequest||intent.heldIdleTaskSource||intent.state!=PlanningState::AwaitingResources||intent.generation)return false;
 const auto& r=*intent.farmArrivalRequest;const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(r.center);SpatialBodyView body;
 if(r.actor!=intent.actor||r.session!=s.session||r.sequence!=intent.resourceRequestSequence||r.profile!=intent.profile||worker==s.workers.end()||worker->second.center!=r.center||worker->second.eligible==bool(r.refugeSequence)||worker->second.actionActive||worker->second.inactiveSequence||worker->second.x!=r.x||worker->second.z!=r.z||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0||!center->second.serviceKnown||center->second.serviceX!=r.targetX||center->second.serviceZ!=r.targetZ||center->second.x!=r.centerX||center->second.z!=r.centerZ)return false;
 if(!r.body)return !worker->second.bodyBound&&!worker->second.body;
 return worker->second.bodyBound&&worker->second.body==r.body&&spatialReadBody(r.body,body)&&body.x==r.x&&body.z==r.z&&body.r==r.radius&&body.kind==0&&body.flags==r.bodyFlags&&!s.reservedBodies.count(r.body)&&!s.suspendedBodies.count(r.body);
}
bool nativeFarmArrivalRequestBodyCurrent(const IntentState& s,const ActiveIntent& intent){return intent.farmArrivalRequest&&intent.farmArrivalRequest->body&&nativeFarmArrivalRequestCurrent(s,intent);}
// A Farm contract can expire while its first physical admission is blocked.
// This is only that retained semantic source, never a body or route proof.
bool nativeUnboundFarmHomeCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.homeRequest||!intent.home||intent.state!=PlanningState::AwaitingResources||!intent.requiresResources||intent.lease||intent.task||intent.target||intent.generation||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleBodyBinding||intent.idleCycle||intent.farmArrivalRequest||intent.initialIdleRequest||intent.strollRequest||intent.heldIdleTaskSource)return false;
 const auto& r=*intent.homeRequest;const auto worker=s.workers.find(intent.actor);
 return !r.body&&r.farmRequestSourceSequence&&r.farmRequestSourceSequence<r.sequence&&!r.farmArrivalSourceSequence&&!r.idleStrollSourceSequence&&!r.initialIdleSourceSequence&&!r.idleCycleSourceSequence&&r.actor==intent.actor&&r.session==s.session&&r.sequence==intent.resourceRequestSequence&&worker!=s.workers.end()&&!worker->second.bodyBound&&!worker->second.body&&!worker->second.eligible&&!worker->second.actionActive&&!worker->second.inactiveSequence&&worker->second.x==r.x&&worker->second.z==r.z;
}
bool nativeInitialIdleRequestCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.initialIdleRequest||intent.home||intent.task||intent.target||intent.lease||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleBodyBinding||intent.homeRequest||intent.state!=PlanningState::AwaitingResources||intent.generation)return false;
 const auto& r=*intent.initialIdleRequest;const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(r.center);SpatialBodyView body;
 if(r.actor!=intent.actor||r.session!=s.session||r.sequence!=intent.resourceRequestSequence||worker==s.workers.end()||worker->second.center!=r.center||worker->second.actionActive||worker->second.inactiveSequence||worker->second.x!=r.x||worker->second.z!=r.z||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0)return false;
 if(!r.body)return !worker->second.bodyBound&&!worker->second.body;
 return worker->second.bodyBound&&worker->second.body==r.body&&spatialReadBody(r.body,body)&&body.x==r.x&&body.z==r.z&&body.r==r.radius&&body.kind==0&&body.flags==r.bodyFlags&&!s.reservedBodies.count(r.body)&&!s.suspendedBodies.count(r.body);
}
bool nativeInitialIdleRequestBodyCurrent(const IntentState& s,const ActiveIntent& intent){
 return intent.initialIdleRequest&&intent.initialIdleRequest->body&&nativeInitialIdleRequestCurrent(s,intent);
}
static bool nativeIdleStrollRequestAnchorCurrent(const IntentState& s,const NativeIdleStrollResourceRequest& r){
 const auto found=s.targets.find(r.anchor);if(found==s.targets.end())return false;const auto& a=found->second;
 return r.anchorKind==1?(a.kind==1||a.kind==2)&&a.active&&a.x==r.anchorX&&a.z==r.anchorZ:r.anchorKind==2&&a.kind==4&&a.active&&a.status==0;
}
static bool nativeIdleStrollRequestCurrent(const IntentState& s,const ActiveIntent& intent){
 if(!intent.strollRequest||intent.home||intent.task||intent.target||intent.lease||!intent.requiresResources||intent.animal||intent.retreat||intent.delivery||intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.initialIdleRequest||intent.initialIdleBodyBinding||intent.idleCycle||intent.homeRequest||intent.heldIdleTaskSource||intent.state!=PlanningState::AwaitingResources||intent.generation)return false;
 const auto& r=*intent.strollRequest;const auto worker=s.workers.find(intent.actor);const auto center=s.targets.find(r.center);SpatialBodyView body;
 if(r.actor!=intent.actor||r.session!=s.session||r.sequence!=intent.resourceRequestSequence||r.profile!=intent.profile||worker==s.workers.end()||worker->second.center!=r.center||!worker->second.eligible||worker->second.actionActive||worker->second.inactiveSequence||worker->second.x!=r.x||worker->second.z!=r.z||center==s.targets.end()||!center->second.active||center->second.kind!=4||center->second.status!=0||!nativeIdleStrollRequestAnchorCurrent(s,r))return false;
 if(!r.body)return !worker->second.bodyBound&&!worker->second.body;
 return worker->second.bodyBound&&worker->second.body==r.body&&spatialReadBody(r.body,body)&&body.x==r.x&&body.z==r.z&&body.r==r.radius&&body.kind==0&&body.flags==r.bodyFlags&&!s.reservedBodies.count(r.body)&&!s.suspendedBodies.count(r.body);
}
static bool nativeIdleStrollRequestBodyCurrent(const IntentState& s,const ActiveIntent& intent){return intent.strollRequest&&intent.strollRequest->body&&nativeIdleStrollRequestCurrent(s,intent);}
bool nativeTaskActionsCoherent(const IntentState& s){
  for(const auto& [actor,intent]:s.activeIntents)if(intent.strollRequest&&!nativeIdleStrollRequestBodyCurrent(s,intent))return false;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.heldIdleTaskSource&&!nativeHeldIdleTaskBodyCurrent(s,intent))return false;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.initialIdleBodyBinding&&!nativeInitialIdleBodyCurrent(s,intent)||intent.idleCycle&&!nativeIdleCycleBodyCurrent(s,intent))return false;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.farmArrivalRequest&&!nativeFarmArrivalRequestCurrent(s,intent))return false;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.initialIdleRequest&&!nativeInitialIdleRequestBodyCurrent(s,intent))return false;
   for(const auto& [actor,intent]:s.activeIntents)if(intent.homeRequest&&!nativeHomeRequestBodyCurrent(s,intent)&&!nativeUnboundFarmHomeCurrent(s,intent))return false;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.actionBinding&&!nativeTaskActionBodyCurrent(s,intent)||intent.delivery&&!nativeDeliveryBodyCurrent(s,intent)||intent.settlementBinding&&!nativeSettlementBodyCurrent(s,intent)||intent.home&&intent.state==PlanningState::RouteActive&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].homeBinding&&!nativeHomeBodyCurrent(s,intent)||intent.state==PlanningState::RouteActive&&intent.slot<s.routeSlots.size()&&s.routeSlots[intent.slot].farmArrivalBinding&&!nativeFarmArrivalBodyCurrent(s,intent))return false;
  return true;
}
const ActiveIntent* nativeTaskActionForBody(const IntentState& s,uint64_t id){
  const auto owner=s.gateBodyActors.find(id);if(owner==s.gateBodyActors.end())return nullptr;
  const auto intent=s.activeIntents.find(owner->second);
  return intent!=s.activeIntents.end()&&(intent->second.actionBinding||intent->second.restoredActionSource||intent->second.settlementBinding||intent->second.homeRequest||intent->second.farmArrivalRequest||intent->second.initialIdleRequest||intent->second.initialIdleBodyBinding||intent->second.idleCycle||intent->second.heldIdleTaskSource||intent->second.strollRequest)?&intent->second:nullptr;
}
bool nativeTaskActionBodyCanChange(const IntentState& s,uint64_t id,const SpatialBodyView& proposed){
  const auto* intent=nativeTaskActionForBody(s,id);if(!intent)return true;
  if(intent->settlementBinding){const auto& h=intent->settlementBinding->actual.header;return proposed.kind==0&&proposed.flags==int(h[19])&&proposed.x==h[9]&&proposed.z==h[10]&&proposed.r==h[12];}
  if(!intent->actionBinding){SpatialBodyView current;return spatialReadBody(id,current)&&proposed.kind==current.kind&&proposed.flags==current.flags&&proposed.x==current.x&&proposed.z==current.z&&proposed.r==current.r;}
  const auto& binding=*intent->actionBinding;const auto& h=binding.actual;
  return proposed.kind==0&&proposed.flags==binding.bodyFlags&&proposed.x==h[12]&&proposed.z==h[13]&&proposed.r==h[14];
}
std::array<uint64_t,3> executionWorldStamp(){
  return {spatial_execution_revision(0),spatial_execution_revision(1),spatial_execution_revision(2)};
}
#include "spatial-route-motion.h"
void updateResidencyPinRevision(IntentState& s,const SpatialBodyView* before,const SpatialBodyView* after){
  if(!s.bodyDomainActive)return;
  const bool activeBefore=before&&(before->flags&1),activeAfter=after&&(after->flags&1);
  if(activeBefore!=activeAfter){s.residencyPinRevision++;return;}
  if(!activeBefore)return;
  if(before->x==after->x&&before->z==after->z&&before->r==after->r)return;
  std::array<int64_t,4> oldRange{},newRange{};
  if(!spatialExecutionResidencyPinRange(before->x,before->z,before->r,oldRange)||
     !spatialExecutionResidencyPinRange(after->x,after->z,after->r,newRange)||oldRange!=newRange)
    s.residencyPinRevision++;
}
void recordTimingResult(IntentState& s,int result){
  s.timingRejection=result==1?0:result==0?1:result==-1?2:result==-2?3:4;
}
#ifdef WILD_DECLARATIVE_ATTACK
bool validAttackTransients(const IntentState& s,int blockers,int reserved){
  if(blockers<0||blockers>100000||reserved<0||reserved>100000||
     s.attackBlockers.size()!=size_t(blockers)*3||
     s.attackReservedTargets.size()!=size_t(reserved))return false;
  for(int i=0;i<blockers;i++){
    const size_t at=size_t(i)*3;
    if(!coordinate(s.attackBlockers[at])||!coordinate(s.attackBlockers[at+1])||
       !std::isfinite(s.attackBlockers[at+2])||s.attackBlockers[at+2]<=0||
       s.attackBlockers[at+2]>2)return false;
  }
  for(double id:s.attackReservedTargets)if(!integer(id))return false;
  return true;
}
#endif
bool parse(const double* row,Change& change){
  if(!integer(row[0],true)||row[0]>1||!integer(row[1])||row[1]>6||
    !integer(row[2]))return false;
  change.op=int(row[0]);change.kind=int(row[1]);change.id=uint64_t(row[2]);
  if(!change.op)return true;
  if(!integer(row[3],true)||!coordinate(row[4])||!coordinate(row[5])||
    !integer(row[6],true)||!integer(row[7],true)||
    !std::isfinite(row[8])||!std::isfinite(row[9]))return false;
  change.center=uint64_t(row[3]);change.x=row[4];change.z=row[5];
  change.assigned=uint64_t(row[6]);change.flag=row[6]!=0;
  change.target=uint64_t(row[7]);change.created=row[8];change.rank=row[9];
  if(change.kind==1)return (change.center>0||row[6]==0)&&
    row[6]<=1&&row[7]<=1;
  if(change.kind==2)return change.center<=4&&row[6]<=1&&change.rank>=0;
  if(change.kind==4)return (change.center==3||change.center==4)&&
    row[4]>=0&&row[5]>0&&row[4]<=row[5]&&row[6]<=2&&row[7]<=5;
  if(change.kind==5)return change.center>=1&&change.center<=8&&
    change.x>=0&&row[6]==0&&row[7]==0;
  if(change.kind==6)return change.center==4&&row[6]==0&&row[7]==0;
  return change.center>0&&change.target>0&&integer(row[4],true)&&row[4]<=2;
}
void clearProposal(IntentState& s){s.proposals.clear();s.proposalOpen=false;}
void clearRouteDependencies(IntentState& s,ActiveIntent& intent){
  const int profile=intent.dependencyProfile;
  if(profile<0)return;
  for(const auto& [x,z]:intent.routeSectors){
    const auto key=std::make_tuple(profile,x,z);
    auto found=s.routeSubscribers.find(key);
    if(found!=s.routeSubscribers.end()){
      found->second.erase(intent.actor);
      if(found->second.empty())s.routeSubscribers.erase(found);
    }
  }
  s.profileParticipants[profile].erase(intent.actor);
  s.waitingSubscribers[profile].erase(intent.actor);
  intent.routeSectors.clear();intent.dependencyProfile=-1;
}
void subscribeRouteSegment(IntentState& s,ActiveIntent& intent,
    double x,double z,double endX,double endZ){
  const int size=lazy_sector_size();
  if(size<=0)return;
  // Cover the entire swept connector, including fractional endpoints and the
  // largest supported body. Subdivision bounds the cells per diagonal segment.
  // Include footprint, +/-0.8 m slope samples and their enclosing mesh corners.
  constexpr double margin=5;
  const int steps=std::max(1,int(std::ceil(std::hypot(endX-x,endZ-z)/(size*.5))));
  const double startX=x,startZ=z;
  for(int i=1;i<=steps;i++){
    const double nextX=startX+(endX-startX)*i/steps,
      nextZ=startZ+(endZ-startZ)*i/steps;
    const int minX=int(std::floor((std::min(x,nextX)-margin)/size)),
      maxX=int(std::floor((std::max(x,nextX)+margin)/size)),
      minZ=int(std::floor((std::min(z,nextZ)-margin)/size)),
      maxZ=int(std::floor((std::max(z,nextZ)+margin)/size));
    for(int sx=minX;sx<=maxX;sx++)for(int sz=minZ;sz<=maxZ;sz++)
      if(intent.routeSectors.emplace(sx,sz).second)
        s.routeSubscribers[{intent.profile,sx,sz}].insert(intent.actor);
    x=nextX;z=nextZ;
  }
}
void indexRouteDependencies(IntentState& s,ActiveIntent& intent){
  clearRouteDependencies(s,intent);
  if(intent.profile<0||intent.profile>=6)return;
  if(intent.state!=PlanningState::RouteActive&&intent.state!=PlanningState::AwaitingResources&&
     intent.state!=PlanningState::WaitingUnknown&&
     intent.state!=PlanningState::WaitingBlocked)return;
  intent.dependencyProfile=intent.profile;
  s.profileParticipants[intent.profile].insert(intent.actor);
  if(intent.state!=PlanningState::RouteActive&&intent.state!=PlanningState::AwaitingResources){
    s.waitingSubscribers[intent.profile].insert(intent.actor);return;
  }
  if(intent.slot>=s.routeSlots.size())return;
  const auto& route=s.routeSlots[intent.slot];
  if(!route.active||route.generation!=intent.generation)return;
  const int original=lazy_selected_context();
  if(original!=intent.profile)spatial_select_nav_profile_index(intent.profile);
  const auto worker=s.workers.find(intent.actor);
  double x=intent.animal?intent.routeStartX:
    worker!=s.workers.end()?worker->second.x:intent.routeStartX;
  double z=intent.animal?intent.routeStartZ:
    worker!=s.workers.end()?worker->second.z:intent.routeStartZ;
  for(size_t i=size_t(intent.routeCursor)*2;i+1<route.points.size();i+=2){
    subscribeRouteSegment(s,intent,x,z,route.points[i],route.points[i+1]);
    x=route.points[i];z=route.points[i+1];
  }
  if(original!=intent.profile)spatial_select_nav_profile_index(original);
}
void drainStoppedReservations(IntentState& s);
bool intentHasSuspendedRoute(const IntentState& s,const ActiveIntent& intent){
  if(intent.slot>=s.routeSlots.size())return false;
  const auto& route=s.routeSlots[intent.slot];
  return route.active&&route.suspended&&route.actor==intent.actor&&route.generation==intent.generation;
}
uint64_t emitIntentChange(IntentState& s,ActiveIntent& intent){
  intent.pendingTaskCancellation.reset();
  indexRouteDependencies(s,intent);
  const IntentEvent event=intent.state==PlanningState::RouteActive?
    (intent.revokedGeneration?IntentEvent::RouteReplaced:IntentEvent::RouteAssigned):
    intent.revokedGeneration?
      ((intent.state==PlanningState::ActionActive||intent.state==PlanningState::StationaryActive)?IntentEvent::RouteCompleted:
        IntentEvent::RouteInvalidated):IntentEvent::IntentChanged;
  const uint64_t transitionSequence=++s.intentSequence;
  if(intent.state==PlanningState::AwaitingResources){intent.resourceRequestSequence=transitionSequence;intent.resourceRequestedAt=s.effectiveTime;if(intent.restoredActionSource){intent.restoredActionSource->requestSequence=transitionSequence;if(intent.actionRequest)intent.actionRequest->requestedAt=s.effectiveTime;}}
  if(event==IntentEvent::RouteAssigned||event==IntentEvent::RouteReplaced){
    intent.actionRequest.reset();
    intent.assignmentSequence=transitionSequence;intent.assignedAt=s.effectiveTime;
  }
  s.intentChanges.insert(s.intentChanges.end(),{double(intent.actor),
    double(int(intent.state)),double(intent.task),double(intent.target),
    double(s.session),intent.state==PlanningState::RouteActive?double(intent.slot):0,
    intent.state==PlanningState::RouteActive?double(intent.generation):0,
    double(intent.topology),double(transitionSequence),s.effectiveTime,
    intent.revokedGeneration?double(s.session):0,double(intent.revokedSlot),
    double(intent.revokedGeneration),double(int(event)),double(intentProtocolVersion)});
  intent.revokedSlot=0;intent.revokedGeneration=0;
  drainStoppedReservations(s);
  return transitionSequence;
}
void releaseGateCrossings(IntentState&,const RouteSlot&);
void releaseRoute(IntentState& s,ActiveIntent& intent){
  intent.animalStrike.reset();intent.animalRouteRequest.reset();
  intent.pendingTaskCancellation.reset();
  intent.actionRequest.reset();
  intent.restoredActionSource.reset();
  intent.actionBinding.reset();
  intent.settlementBinding.reset();
  intent.initialIdleBodyBinding.reset();
  intent.idleCycle.reset();
  intent.heldIdleTaskSource.reset();
  intent.strollRequest.reset();
  intent.farmArrivalRequest.reset();
  clearRouteDependencies(s,intent);
  if(intent.slot<s.routeSlots.size()){
    RouteSlot& route=s.routeSlots[intent.slot];
    if(route.active&&route.generation==intent.generation){
      if(!route.suspended&&!route.pendingResources){intent.revokedSlot=intent.slot;intent.revokedGeneration=intent.generation;}
      releaseGateCrossings(s,route);
      if(route.reserved){
        s.residencyPinRevision++;
        if(s.executionEnabled&&!s.resettingBodies&&!s.removingBodies.count(route.reservationBody))
          s.stoppedReservationBodies.insert(route.reservationBody);
        s.reservedBodies.erase(route.reservationBody);route.reserved=false;
      }
      if(route.suspended)s.suspendedBodies.erase(route.reservationBody);
      route.suspended=route.resumable=false;route.motionOffset.fill(0);route.suspendedAt=0;route.stoppedTaskForHome=false;
      route.animalRouteBinding.reset();route.startBinding.reset();route.consequenceBinding.reset();route.homeBinding.reset();route.idleStrollBinding.reset();route.farmArrivalBinding.reset();route.active=route.pendingResources=false;route.points.clear();route.distances.clear();route.timingMode=0;
      route.holds.clear();route.waitGate=0;route.gateCandidate=false;route.departureTime=0;
      route.gateReservations.clear();route.gateAdmitted=false;
      route.generation++;
    }
  }
  intent.slot=0;intent.generation=0;
}
// Suspension retains the ONE allocated slot, but revokes its executable handle.
// Cancel/target changes still use releaseRoute and permanently discard it.
bool routeCanSuspend(const IntentState& s,const ActiveIntent& intent){
  if(s.resettingBodies||intent.state!=PlanningState::RouteActive||intent.animal||intent.slot>=s.routeSlots.size())return false;
  const auto& route=s.routeSlots[intent.slot];
  if(!route.active||route.suspended||!route.resumable||!route.reserved||route.generation!=intent.generation)return false;
  const auto pose=route.hasExecution?route.executionPose:sampleRouteTiming(route,route.startTime);
  SpatialBodyView body;
  return !pose[6]&&spatialReadBody(route.reservationBody,body)&&body.x==pose[0]&&body.z==pose[1];
}
bool suspendRoute(IntentState& s,ActiveIntent& intent){
  if(!routeCanSuspend(s,intent))return false;
  auto& route=s.routeSlots[intent.slot];
  const auto pose=route.hasExecution?route.executionPose:sampleRouteTiming(route,route.startTime);
  intent.revokedSlot=intent.slot;intent.revokedGeneration=intent.generation;
  clearRouteDependencies(s,intent);releaseGateCrossings(s,route);
  s.reservedBodies.erase(route.reservationBody);route.reserved=false;
  s.suspendedBodies.emplace(route.reservationBody,intent.slot);
  if(s.executionEnabled)s.stoppedReservationBodies.insert(route.reservationBody);
  route.gateReservations.clear();route.gateAdmitted=false;
  route.executionPose=pose;route.hasExecution=true;route.suspended=true;route.suspendedAt=s.effectiveTime;
  if(!++route.generation)route.generation=1;
  intent.generation=route.generation;intent.state=PlanningState::WaitingBlocked;
  intent.runBudget=pose[14];s.bodyDomainActive=true;s.residencyPinRevision++;s.routeSuspensions++;return true;
}
void stopRouteForEvent(IntentState& s,ActiveIntent& intent){
  if(suspendRoute(s,intent))return;
  releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
}
void releaseIntent(IntentState& s,uint64_t actor,PlanningState next,bool notify=true){
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end())return;
  ActiveIntent& intent=found->second;
  if(intent.target){auto it=s.byTarget.find(intent.target);
    if(it!=s.byTarget.end()){it->second.erase(actor);if(it->second.empty())s.byTarget.erase(it);}}
  if(intent.task){auto it=s.byTask.find(intent.task);
    if(it!=s.byTask.end()){it->second.erase(actor);if(it->second.empty())s.byTask.erase(it);}}
  for(uint64_t group:intent.blockedCropGroups){
    auto it=s.byBlockedCropGroup.find(group);
    if(it!=s.byBlockedCropGroup.end()){
      it->second.erase(actor);
      if(it->second.empty())s.byBlockedCropGroup.erase(it);
    }
  }
  intent.blockedCropGroups.clear();
  releaseRoute(s,intent);intent.state=next;
  if(notify)emitIntentChange(s,intent);
  intent.task=0;intent.target=0;if(notify)s.invalidations++;
}
#include "spatial-route-reservations.h"
bool gateStaticProofCurrent(const IntentState&);
bool gateRouteBindingsCoherent(const IntentState&,const RouteSlot&,uint32_t);
#include "spatial-idle-cycle.h"
#include "spatial-route-execution.h"
#include "spatial-gate-controller.h"
#include "spatial-gate-mechanism.h"
#include "spatial-gate-sweep.h"
#include "spatial-gate-static-sweep.h"
#include "spatial-gate-static-fences.h"
#include "spatial-gate-route-waits.h"
#include "spatial-static-mutation-state.h"
#include "spatial-residency-mutation-state.h"
#include "spatial-prop-mutation-state.h"
#include "spatial-terrain-mutation-state.h"
#include "spatial-gate-transactions.h"
#include "spatial-gate-addition.h"
#include "spatial-gate-crossings.h"
#include "spatial-idle-stroll-source.h"
void invalidateDependents(IntentState& s,const Change& change){
  if(change.kind==1){
    if(!change.op){
      const auto active=s.activeIntents.find(change.id);
      const uint64_t taskId=active==s.activeIntents.end()?0:active->second.task;
      releaseIntent(s,change.id,PlanningState::Cancelled);
      s.activeIntents.erase(change.id);
      s.planningCallsByActor.erase(change.id);
      const auto task=s.tasks.find(taskId);
      if(task!=s.tasks.end()&&task->second.assigned==change.id)task->second.assigned=0;
    }else{
      const auto current=s.workers.find(change.id);
      if(current!=s.workers.end()&&current->second.center!=change.center){
        const auto active=s.activeIntents.find(change.id);
        const uint64_t taskId=active==s.activeIntents.end()?0:active->second.task;
        releaseIntent(s,change.id,PlanningState::Cancelled);
        s.activeIntents.erase(change.id);
        const auto task=s.tasks.find(taskId);
        if(task!=s.tasks.end()&&task->second.assigned==change.id)task->second.assigned=0;
      }
    }
    return;
  }
  if(change.kind==4&&change.op&&change.assigned!=0){
    const auto target=s.targets.find(change.id);
    if(target==s.targets.end()||!target->second.damageKnown||
       target->second.status!=0)return;
    const auto owners=s.byTarget.find(change.id);
    if(owners==s.byTarget.end())return;
    std::vector<uint64_t> actors(owners->second.begin(),owners->second.end());
    std::sort(actors.begin(),actors.end());
    for(uint64_t actor:actors){
      const auto active=s.activeIntents.find(actor);
      if(active==s.activeIntents.end()||!active->second.animal)continue;
      if(active->second.state==PlanningState::ActionActive){
        // A committed clip completes at its original logical damage frame.
        active->second.tacticalPending=true;
        active->second.lease=false;
      }else{
        releaseIntent(s,actor,PlanningState::Cancelled);
        s.activeIntents.erase(actor);
      }
    }
    return;
  }
  if(change.kind!=2&&change.kind!=3)return;
  const auto& index=change.kind==2?s.byTarget:s.byTask;
  const auto found=index.find(change.id);
  if(found==index.end())return;
  const auto oldTarget=change.kind==2?s.targets.find(change.id):s.targets.end();
  const auto oldTask=change.kind==3?s.tasks.find(change.id):s.tasks.end();
  const bool invalid=!change.op||change.kind==2&&!change.flag||
    change.kind==3&&(change.assigned==0||
      oldTask!=s.tasks.end()&&(oldTask->second.target!=change.target||
        oldTask->second.center!=change.center||
        oldTask->second.assigned!=change.assigned||
        oldTask->second.kind!=int(change.x)));
  const bool moved=change.kind==2&&change.op&&change.flag&&
    oldTarget!=s.targets.end()&&
    (oldTarget->second.x!=change.x||oldTarget->second.z!=change.z);
  if(!invalid&&!moved)return;
  std::vector<uint64_t> actors(found->second.begin(),found->second.end());
  std::sort(actors.begin(),actors.end());
  for(uint64_t actor:actors){
    const auto active=s.activeIntents.find(actor);
    if(active==s.activeIntents.end())continue;
    if(active->second.animal){
#ifdef WILD_DECLARATIVE_ATTACK
      const auto declaration=s.attackDeclarations.find(actor);
      if(declaration!=s.attackDeclarations.end()){
        clearAttackDeadline(s,actor);declaration->second.dirty=true;
        declaration->second.blockedApproach=false;
      }
#endif
      if(active->second.state==PlanningState::ActionActive){
        // A committed strike resolves against its original target ID at the
        // animation's damage frame. Its lease becomes stale, but the hit is
        // never moved, refunded, or applied early by this invalidation.
        active->second.tacticalPending=true;
        active->second.lease=false;
      }else{
        releaseIntent(s,actor,PlanningState::Cancelled);
        s.activeIntents.erase(actor);
      }
      continue;
    }
    if(moved&&!invalid){
      ActiveIntent& intent=active->second;
      releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
      emitIntentChange(s,intent);s.invalidations++;
      continue;
    }
    const uint64_t task=active->second.task;
    releaseIntent(s,actor,PlanningState::NeedsPlan);
    s.activeIntents.erase(actor);
    const auto worker=s.workers.find(actor);
    if(worker!=s.workers.end())worker->second.eligible=true;
    const auto pending=s.tasks.find(task);
    if(pending!=s.tasks.end()&&pending->second.assigned==actor)
      pending->second.assigned=0;
  }
}
bool damaged(const Target& target){
  return target.damageKnown&&target.hp<target.maxHp&&
    (target.kind==3||target.kind==4);
}
DamageKey damageKey(const Target& target){
  return {(target.maxHp-target.hp)/target.maxHp,target.id};
}
void removeDamage(IntentState& s,const Target& target){
  if(!damaged(target))return;
  (target.kind==3?s.damagedWalls:s.damagedCenters).erase(damageKey(target));
}
void addDamage(IntentState& s,const Target& target){
  if(!damaged(target))return;
  (target.kind==3?s.damagedWalls:s.damagedCenters).insert(damageKey(target));
}
int64_t cropCell(int x,int z){
  return int64_t((uint64_t(uint32_t(x))<<32)^uint32_t(z));
}
int64_t cropBucket(double x,double z){
  return cropCell(int(std::floor(x/1.5)),int(std::floor(z/1.5)));
}
void removeCropCell(IntentState& s,const Target& target){
  if(!target.active||(target.kind!=1&&target.kind!=2))return;
  const int64_t key=cropBucket(target.x,target.z);
  const auto found=s.cropCells.find(key);if(found==s.cropCells.end())return;
  auto& ids=found->second;
  ids.erase(std::remove(ids.begin(),ids.end(),target.id),ids.end());
  if(ids.empty())s.cropCells.erase(found);
}
void addCropCell(IntentState& s,const Target& target){
  if(target.active&&(target.kind==1||target.kind==2))
    s.cropCells[cropBucket(target.x,target.z)].push_back(target.id);
}
bool cropOccupied(const IntentState& s,double x,double z){
  const int cx=int(std::floor(x/1.5)),cz=int(std::floor(z/1.5));
  for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++){
    const auto found=s.cropCells.find(cropCell(cx+dx,cz+dz));
    if(found==s.cropCells.end())continue;
    for(uint64_t id:found->second){
      const Target& crop=s.targets.at(id);
      if(std::hypot(crop.x-x,crop.z-z)<1.1)return true;
    }
  }
  for(const auto& entry:s.plantLeases)
    if(std::hypot(entry.second.x-x,entry.second.z-z)<1.1)return true;
  return false;
}
void rebuildCropGroups(IntentState& s){
  if(!s.cropGroupsDirty)return;
  s.cropGroups.clear();
  std::vector<const Target*> crops;
  for(const auto& entry:s.targets)if(entry.second.active&&
    (entry.second.kind==1||entry.second.kind==2))crops.push_back(&entry.second);
  std::sort(crops.begin(),crops.end(),[](const Target* a,const Target* b){return a->id<b->id;});
  constexpr double reach=1.7;
  std::unordered_map<int64_t,std::vector<size_t>> cells;
  cells.reserve(crops.size()*2);
  for(size_t i=0;i<crops.size();i++)cells[cropCell(int(std::floor(crops[i]->x/reach)),
    int(std::floor(crops[i]->z/reach)))].push_back(i);
  std::vector<uint8_t> seen(crops.size(),0);
  for(size_t seed=0;seed<crops.size();seed++){
    if(seen[seed])continue;
    CropGroup group{};group.id=crops[seed]->id;
    group.minX=group.maxX=crops[seed]->x;
    group.minZ=group.maxZ=crops[seed]->z;
    std::vector<size_t> queue{seed};seen[seed]=1;
    for(size_t head=0;head<queue.size();head++){
      const Target& crop=*crops[queue[head]];
      group.crops.push_back(crop.id);group.value+=crop.cropValue;
      group.x+=crop.x;group.z+=crop.z;
      group.minX=std::min(group.minX,crop.x);group.minZ=std::min(group.minZ,crop.z);
      group.maxX=std::max(group.maxX,crop.x);group.maxZ=std::max(group.maxZ,crop.z);
      const int cx=int(std::floor(crop.x/reach)),cz=int(std::floor(crop.z/reach));
      std::vector<size_t> near;
      for(int dz=-2;dz<=2;dz++)for(int dx=-2;dx<=2;dx++){
        const auto found=cells.find(cropCell(cx+dx,cz+dz));
        if(found!=cells.end())near.insert(near.end(),found->second.begin(),found->second.end());
      }
      std::sort(near.begin(),near.end());
      for(size_t next:near)if(!seen[next]&&
        crops[next]->cropSpecies==crop.cropSpecies&&
        std::hypot(crops[next]->x-crop.x,crops[next]->z-crop.z)<=reach){
        seen[next]=1;queue.push_back(next);
      }
    }
    group.x/=group.crops.size();group.z/=group.crops.size();
    std::sort(group.crops.begin(),group.crops.end());
    s.cropGroups.push_back(std::move(group));
  }
  std::sort(s.cropGroups.begin(),s.cropGroups.end(),[](const CropGroup& a,const CropGroup& b){
    return a.value!=b.value?a.value>b.value:a.id<b.id;
  });
  s.cropGroupsDirty=false;
}
int cropProtection(const Target& crop,float radius){
  bool open=false,unknown=false;
  const int xs[2]={int(std::floor(crop.x)),int(std::ceil(crop.x))};
  const int zs[2]={int(std::floor(crop.z)),int(std::ceil(crop.z))};
  bool found=false;
  for(int x:xs)for(int z:zs){
    if(!spatial_local_clear(float(crop.x),float(crop.z),float(x),float(z)))continue;
    const int region=lazy_weak_region(x,z);
    if(region==-1){unknown=true;continue;}
    if(region<0)continue;
    found=true;
    if(lazy_enclosure(x,z)!=1)open=true;
  }
  if(!found){
    // A crop beside a center may have no clear floor/ceil connector, while
    // the animal can still attack it from a nearby interaction site. Use
    // the same twelve local sites as attackSitesFor before calling the
    // whole group unknown. This work runs only for unresolved crops when
    // the selected profile's topology changes, never per animal or tick.
    constexpr int directions=12;
    for(int sample=0;sample<directions;sample++){
      const double angle=2*pi*sample/directions;
      const float px=float(crop.x+std::sin(angle)*(.6+radius));
      const float pz=float(crop.z+std::cos(angle)*(.6+radius));
      const int x=int(std::round(px)),z=int(std::round(pz));
      if(!spatial_local_clear(px,pz,float(x),float(z)))continue;
      const int region=lazy_weak_region(x,z);
      if(region==-1){unknown=true;continue;}
      if(region<0)continue;
      found=true;
      if(lazy_enclosure(x,z)!=1)open=true;
    }
  }
  if(!found)unknown=true;
  return open?0:unknown?-1:1;
}
// The crop-group index is already maintained for spatial advice. Attach one
// species-specific set of interaction regions to each group, rebuilding it
// only when that profile's topology or collision radius changes. Sites on
// different sides of a narrow barrier remain separate, even for one crop.
const AttackSiteCache& attackSitesFor(IntentState& s,CropGroup& group,float radius){
  const int profile=lazy_selected_context();
  const uint32_t topology=lazy_route_revision();
  AttackSiteCache& cache=group.attackSites[profile];
  if(cache.topology==topology&&cache.radius==radius)return cache;
  cache.topology=topology;cache.radius=radius;cache.byRegion.clear();
  constexpr int directions=12;
  for(uint64_t id:group.crops){
    const Target& crop=s.targets.at(id);
    std::set<std::tuple<int,int,int>> seen;
    for(int sample=0;sample<directions;sample++){
      const double angle=2*pi*sample/directions;
      const float px=float(crop.x+std::sin(angle)*(.6+radius));
      const float pz=float(crop.z+std::cos(angle)*(.6+radius));
      const int x=int(std::round(px)),z=int(std::round(pz));
      if(!spatial_local_clear(px,pz,float(x),float(z)))continue;
      const int region=lazy_weak_region(x,z);
      if(region<0||!seen.emplace(region,x,z).second)continue;
      cache.byRegion[region].push_back({id,region,x,z,px,pz});
    }
  }
  return cache;
}
bool attackSourceAnchor(double startX,double startZ,int& outX,int& outZ){
  double best=std::numeric_limits<double>::infinity();
  bool found=false;
  for(int x:{int(std::floor(startX)),int(std::ceil(startX))})
    for(int z:{int(std::floor(startZ)),int(std::ceil(startZ))}){
      const double distance=std::hypot(startX-x,startZ-z);
      if(distance>=best||
         !spatial_local_clear(float(startX),float(startZ),float(x),float(z))||
         lazy_weak_region(x,z)<0)continue;
      best=distance;outX=x;outZ=z;found=true;
    }
  return found;
}
// A single connectivity verdict represents the crop group's interaction
// regions. Missing sectors remain unknown; only all-proven-disconnected is
// a certified blocked group.
int attackGroupAccess(IntentState& s,CropGroup& group,float radius,int x,int z){
  const AttackSiteCache& sites=attackSitesFor(s,group,radius);
  if(sites.byRegion.empty())return -1;
  bool unknown=false;
  for(const auto& [region,candidates]:sites.byRegion){
    const AttackSite& first=candidates.front();
    const int connected=lazy_connected(x,z,first.x,first.z);
    if(connected>0)return 1;
    if(connected<0)unknown=true;
  }
  return unknown?-1:0;
}
struct Point {double x,z;};
struct ServicePoints {
  std::array<Point,16> values{};
  int count=0;
  void add(Point point){values[size_t(count++)]=point;}
};
bool waterHeight(const Target& target,Point point){
  const double ground=spatial_surface_anywhere(float(point.x),float(point.z));
  const double crop=spatial_surface_anywhere(float(target.x),float(target.z));
  const int biome=spatial_world_biome();
  const double worker=(biome==4||biome==5||biome==6||biome==7||biome==8)?
    std::max(ground,double(spatial_fluid_surface_level())):ground;
  return std::isfinite(worker)&&std::isfinite(crop)&&std::abs(worker-crop)<=.5;
}
ServicePoints servicePoints(const Worker& worker,const Target& target,int taskKind){
  ServicePoints points;
  if(taskKind==0){points.add({target.x,target.z});return points;}
  const double angle=std::atan2(worker.x-target.x,worker.z-target.z);
  if(taskKind==1){
    if(target.kind!=1&&target.kind!=2)return points;
    const double standOff=(target.kind==2?.65:.45)+.28+.1;
    for(const int offset:{0,1,-1,2,-2,3,-3,4}){
      const double yaw=angle+offset*pi/4;
      const Point point={target.x+std::sin(yaw)*standOff,
        target.z+std::cos(yaw)*standOff};
      if(waterHeight(target,point))points.add(point);
    }
  }else if(taskKind==2&&target.kind==4){
    for(int i=0;i<16;i++){
      const double offset=i==0?0:std::ceil(double(i)/2)*(i%2?1:-1)*pi/8;
      const double radius=target.shape+.28+.1;
      points.add({target.x+std::sin(angle+offset)*radius,
        target.z+std::cos(angle+offset)*radius});
    }
  }else if(taskKind==2&&target.kind==3){
    const double width=1.09*target.shape+.28+.1,
      depth=.22*target.wallDepthScale+.28+.1;
    const double c=std::cos(target.yaw),s=std::sin(target.yaw);
    for(const Point local:std::array<Point,4>{{{0,depth},{0,-depth},{width,0},{-width,0}}})
      points.add({target.x+local.x*c+local.z*s,
        target.z-local.x*s+local.z*c});
    std::stable_sort(points.values.begin(),points.values.begin()+points.count,[&](Point a,Point b){
      return std::hypot(a.x-worker.x,a.z-worker.z)<
        std::hypot(b.x-worker.x,b.z-worker.z);
    });
  }
  return points;
}
struct ServiceRoute {
  std::vector<float> points;
  Point approach{};
  bool unknown=false;
  int unknownReason=0;
  int queries=0;
};
// The first reachable side of a crop can require a long detour around a
// building or wall while another side is directly accessible. Probe the
// remaining service points only for a clearly circuitous route. This keeps
// the usual one-query path and avoids making workers walk around an entire
// enclosure to water a crop beside them.
ServiceRoute findServiceRoute(const Worker& worker,const Target& target,int kind){
  ServiceRoute best;
  const ServicePoints points=servicePoints(worker,target,kind);
  double bestLength=std::numeric_limits<double>::infinity();
  for(int i=0;i<points.count;i++){
    const Point point=points.values[size_t(i)];best.queries++;
    const int count=spatial_world_route_cached(float(worker.x),float(worker.z),
      float(point.x),float(point.z));
    if(count<0){
      best.unknown=true;best.unknownReason=spatial_world_route_reason();
      // An unresolved route to one side of a crop does not prove the other
      // bounded interaction sites are unresolved too.
      continue;
    }
    if(!count)continue;
    const float* path=spatial_world_route_ptr();
    double length=0,fromX=worker.x,fromZ=worker.z;
    for(int step=0;step<count;step++){
      const double x=path[step*2],z=path[step*2+1];
      length+=std::hypot(x-fromX,z-fromZ);fromX=x;fromZ=z;
    }
    if(length<bestLength){
      bestLength=length;best.approach=point;
      best.points.assign(path,path+count*2);
    }
    const double direct=std::hypot(worker.x-point.x,worker.z-point.z);
    if(kind!=1||bestLength<=direct*1.5+2)break;
  }
  return best;
}

// The execution reader and explicit Task stop use the same native owner proof.
static const RouteSlot* executedTaskRoute(const IntentState& s,uint64_t actor){
 const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end())return nullptr;
 const auto& intent=found->second;
 if(intent.animal||intent.home||intent.retreat||!intent.task||!intent.requiresResources||intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())return nullptr;
 const auto& route=s.routeSlots[intent.slot];SpatialBodyView body;
 if(!s.executionEnabled||!route.hasExecution||!executionBindingCoherent(s,route.reservationBody,intent.slot)||!spatialReadBody(route.reservationBody,body)||body.x!=route.executionPose[0]||body.z!=route.executionPose[1])return nullptr;
 return &route;
}

}

bool spatialIntentStaticProtectionActive(){return state().bodyDomainActive||state().gateStaticProofs;}
int spatialIntentBeginWorldPreview(){
  auto& s=state();if(s.worldMutationPreview||s.barrierProposal.pending)return -4;
  if(!s.session||!s.causalClock||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence||
     !gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  if(s.nextBarrierProposal>=uint64_t(maxId)||spatialBodiesMutationRevision()==std::numeric_limits<uint64_t>::max())return -5;
  s.worldPreviewRetainsRoutes=true;s.worldPreviewStoppedRoutes.clear();s.worldMutationPreview=true;return 1;
}
void spatialIntentEndWorldPreview(){state().worldMutationPreview=false;}
int spatialIntentStopWorkerRoute(const SpatialWorldProposalInput& input){
 if((input.kind!=12&&input.kind!=24&&input.kind!=25)||input.mode||!input.floats.empty()||input.integers.size()!=8)return -1;
 const auto& ids=input.integers;
 for(int i:{1,3,7})if(ids[i]<0||ids[i]>0x1fffff)return -1;
 const auto id=[&](int offset){return uint64_t(uint32_t(ids[offset]))|(uint64_t(uint32_t(ids[offset+1]))<<32);};
 auto& s=state();const uint64_t session=id(0),actor=id(2),assignment=id(6);const uint32_t slot=uint32_t(ids[4]),generation=uint32_t(ids[5]);
 if(!session||!actor||!assignment||!generation)return -1;
 if(session!=s.session)return 0;
 const auto found=s.activeIntents.find(actor);
 if(found==s.activeIntents.end()||(input.kind==24?!nativeFarmArrivalBodyCurrent(s,found->second):input.kind==12?!currentIdleStroll(double(actor)):!executedTaskRoute(s,actor))||found->second.assignmentSequence!=assignment||found->second.slot!=slot||found->second.generation!=generation||!routeCanSuspend(s,found->second))return 0;
 // The existing world preflight expands the same held-disc/gate stop closure.
 // Neither preview nor resource capture mutates this actor or its trajectory.
 if(s.worldMutationPreview){s.worldPreviewStoppedRoutes.insert(actor);s.worldPreviewRetainsRoutes=false;return 1;}
 if(!suspendRoute(s,found->second))return 0;
 s.routeSlots[found->second.slot].stoppedTaskForHome=input.kind==25;
 emitIntentChange(s,found->second);drainStoppedReservations(s);s.entityRevision++;return 1;
}
// Transient consequence rows on the existing proposal, never another world or
// route store. Expand the same held-disc/gate closure using shared predicates.
// Rows describe actors by old assignment identity; they do not predict control
// sequence numbers, publish handles or grant execution/presentation time.
bool projectWorldRouteStops(const IntentState& s,const std::set<uint64_t>& seeds,
    std::vector<double>& rows,std::vector<double>& gates){
  std::set<uint64_t> pending=seeds,stopped=seeds,processed,frozen;
  while(!pending.empty()){
    const uint64_t actor=*pending.begin();pending.erase(actor);
    if(!processed.insert(actor).second)continue;
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)return false;
    const auto& intent=found->second;if(intent.slot>=s.routeSlots.size())return false;
    const auto& route=s.routeSlots[intent.slot];SpatialBodyView body;
    if(!route.active||!route.reserved||route.generation!=intent.generation||
       !spatialReadBody(route.reservationBody,body))return false;
    auto pose=route.hasExecution?route.executionPose:sampleRouteTiming(route,s.effectiveTime);
    if(body.x!=pose[0]||body.z!=pose[1])return false;
    const bool suspend=routeCanSuspend(s,intent);uint32_t next=suspend?route.generation+1:0;if(suspend&&!next)next=1;
    rows.insert(rows.end(),{double(actor),double(intent.assignmentSequence),double(intent.slot),double(route.generation),
      double(route.reservationBody),double(int(suspend?PlanningState::WaitingBlocked:PlanningState::NeedsPlan)),s.effectiveTime,double(next)});
    pose[15]=pose[16]=0;rows.insert(rows.end(),pose.begin(),pose.end());
    for(uint64_t id:route.gateReservations){const auto gate=s.gates.find(id);
      if(gate==s.gates.end()||frozen.count(id)||!gateCrossingReleaseStopsOthers(gate->second,route,s.effectiveTime))continue;
      frozen.insert(id);gates.insert(gates.end(),{double(id),double(gate->second.mechanism),gateOpening(gate->second,s.effectiveTime)});
      for(const auto& [other,crossing]:gate->second.crossings)if(stopped.insert(other).second)pending.insert(other);
    }
    if(s.executionEnabled&&(suspend||!s.resettingBodies&&!s.removingBodies.count(route.reservationBody)))
      visitStoppedReservationConflicts(s,route.reservationBody,[&](uint64_t other){return stopped.count(other)>0;},
        [&](uint64_t other,double){if(stopped.insert(other).second)pending.insert(other);});
  }
  return true;
}
int stageWorldMutationBoundary(const SpatialStaticMutation* shapes,int count){
  auto& s=state();if(s.barrierProposal.pending)return -4;
  if(!s.session||!s.causalClock||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence||
     !gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  if(s.nextBarrierProposal>=uint64_t(maxId)||spatialBodiesMutationRevision()==std::numeric_limits<uint64_t>::max())return -5;
  // This is read-only preflight. No route, slot, world index, ID, or clock is
  // released or published while the graphics receipt is outstanding.
  if(count>=0&&!staticMutationPreflight(s,shapes,count))return 0;
  std::set<uint64_t> affected;uint64_t candidates=0,segments=0;
  if(count>=0&&s.executionEnabled&&!mutationAffectedRoutes(s,shapes,count,0,candidates,segments,affected))return -2;
  std::vector<double> routes,gates;if(!projectWorldRouteStops(s,count<0?s.worldPreviewStoppedRoutes:affected,routes,gates))return -2;
  auto& p=s.barrierProposal;p.routeEffects=std::move(routes);p.gateEffects=std::move(gates);p.pending=true;p.session=s.session;p.ticket=++s.nextBarrierProposal;p.at=s.effectiveTime;
  p.bodies=spatialBodiesMutationRevision();p.entities=s.entityRevision;p.facts=s.sequence;p.intents=s.intentSequence;
  p.reservations=s.residencyPinRevision;p.clock=s.clockSequence;p.gates=s.gateRevision;p.world=executionWorldStamp();
  p.retainsRoutes=count<0?s.worldPreviewRetainsRoutes:affected.empty();
  return 1;
}
int spatialIntentStageBarrier(const SpatialBarrierProposalInput& input,const SpatialStaticMutation& shape){
  const int result=stageWorldMutationBoundary(&shape,1);if(result!=1)return result;
  auto& p=state().barrierProposal;p.kind=1;p.input=input;return 1;
}
void clearWorldMutationProposal(PendingBarrierProposal&);
int spatialIntentStageWorld(const SpatialWorldProposalInput& input,const SpatialStaticMutation* shapes,int count,bool requireRetained){
  if(input.kind<2)return -1;
  const int result=stageWorldMutationBoundary(shapes,count);if(result!=1)return result;
  auto& p=state().barrierProposal;
  if(requireRetained&&(!p.retainsRoutes||!p.routeEffects.empty()||!p.gateEffects.empty())){clearWorldMutationProposal(p);return 0;}
  p.kind=input.kind;p.worldInput=input;
  if(requireRetained)p.barrierAddition=PendingBarrierProposal::BarrierAdditionDraft{p.ticket,p.at,{}};
  if(input.kind==12||input.kind==24||input.kind==25)p.workerRouteStop=PendingBarrierProposal::WorkerRouteStopDraft{p.ticket,p.at,p.routeEffects,p.gateEffects,{}};
  return 1;
}
void clearWorldMutationProposal(PendingBarrierProposal& p){
  p.pending=false;p.kind=0;p.animalStrike.reset();p.animalRoute.reset();p.farmArrivalRoute.reset();p.resume.reset();p.start.reset();p.home.reset();p.action.reset();p.consequence.reset();p.settlement.reset();p.homeArrival.reset();p.initialIdleBody.reset();p.idleCycle.reset();p.idleStroll.reset();p.workerRouteStop.reset();p.barrierAddition.reset();p.worldInput=SpatialWorldProposalInput{};p.routeEffects.clear();p.gateEffects.clear();
}
int takeWorldMutationBoundary(double session,double ticket,double sequence,double time,double clockSequence,int kind){
  auto& s=state();const auto& p=s.barrierProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||session!=double(p.session)||ticket!=double(p.ticket)||
     (kind==1?p.kind!=1:(kind>=13&&kind<=27)?p.kind!=kind:p.kind<2||(p.kind>12&&p.kind!=24&&p.kind!=25)))return -1;
  const bool current=p.session==s.session&&p.at==s.effectiveTime&&p.bodies==spatialBodiesMutationRevision()&&
    p.bodies!=std::numeric_limits<uint64_t>::max()&&p.entities==s.entityRevision&&p.facts==s.sequence&&
    p.intents==s.intentSequence&&p.reservations==s.residencyPinRevision&&p.clock==s.clockSequence&&
    p.gates==s.gateRevision&&p.world==executionWorldStamp()&&gateStaticProofCurrent(s)&&
    s.causalClock&&s.clockThrough==s.effectiveTime&&s.clockIntentSequence==s.intentSequence;
  if(!current){clearWorldMutationProposal(s.barrierProposal);return -2;}
  if(!integer(sequence,true)||sequence!=double(p.intents)||!std::isfinite(time)||time!=p.at||
     !integer(clockSequence)||clockSequence!=double(p.clock)){clearWorldMutationProposal(s.barrierProposal);return -3;}
  return 1;
}
int spatialIntentTakeBarrier(double session,double ticket,double sequence,double time,double clockSequence,SpatialBarrierProposalInput& out){
  const int result=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,1);if(result!=1)return result;
  auto& p=state().barrierProposal;out=p.input;clearWorldMutationProposal(p);return 1;
}
// Revalidate a prepared solid addition on the existing pending world owner.
// Immutable geometry and route owners survive elapsed execution; a changed
// native fact, intent, gate or world cannot borrow this preparation.
int spatialIntentRevalidateBarrierAddition(double session,double ticket,const SpatialStaticMutation* shapes,int count,std::array<double,8>& translation){
  auto& s=state();auto& p=s.barrierProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||p.kind!=2||!p.barrierAddition||p.barrierAddition->removal||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  if(p.session!=s.session||p.facts!=s.sequence||p.intents!=s.intentSequence||p.gates!=s.gateRevision||p.world!=executionWorldStamp()){
    clearWorldMutationProposal(p);return -2;
  }
  auto origin=*p.barrierAddition;const auto input=std::move(p.worldInput);clearWorldMutationProposal(p);
  if(origin.gateId){auto& gate=origin.gate.at(origin.gateId);gate.at=s.effectiveTime;const int proof=proveGateMechanismCandidate(s,gate);if(proof!=1)return proof;}
  const int result=spatialIntentStageWorld(input,shapes,count,true);if(result!=1)return result;
  origin.translation={1,double(origin.preparedTicket),double(p.ticket),origin.preparedAt,p.at,1,double(count),0};
  translation=origin.translation;p.barrierAddition=origin;return 1;
}
int spatialIntentTakeBarrierAddition(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,SpatialWorldProposalInput& out,std::array<double,5>& receipt,bool allowGate){
  const auto& p=state().barrierProposal;
  if(!integer(preparedTicket)||!p.pending||p.kind!=2||!p.barrierAddition||!p.retainsRoutes||!p.routeEffects.empty()||!p.gateEffects.empty())return -1;
  const auto& origin=*p.barrierAddition;if(origin.gateId&&!allowGate)return -1;
  if(preparedTicket!=double(p.ticket)&&(preparedTicket!=double(origin.preparedTicket)||origin.translation[0]!=1||origin.translation[5]!=1))return -9;
  const std::array<double,5> proof{1,preparedTicket,preparedTicket==double(p.ticket)?p.at:origin.preparedAt,double(p.ticket),p.at};
  const int result=spatialIntentTakeWorld(session,ticket,sequence,time,clockSequence,out,allowGate);if(result==1)receipt=proof;return result;
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_barrier_addition_proposal_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==2&&p.barrierAddition&&session==double(p.session)&&ticket==double(p.ticket)&&p.barrierAddition->translation[0]==1?p.barrierAddition->translation.data():nullptr;
}
// Shared by explicit source families12/24/25. Refresh only the final stop frontier; immutable route/gate owners must still
// match the original preparation. Keep one bounded origin, never a chain.
// A prepared Farm motor can finish naturally while READY is retained. It no
// longer needs a mutation, but its already-prepared scalar still needs a final
// native projection. The caller has rechecked the original world/gate/intent
// revisions and exact stopped route owners. Never add a new motor or borrow a
// different mechanism; only preserve a completed original, still-owned curve.
static bool retainCompletedFarmStopMotorProjection(const IntentState& s,const std::vector<double>& prepared,const std::vector<double>& routes,std::vector<double>& gates){
 std::map<uint64_t,std::array<double,3>> pending;
 for(size_t i=0;i<gates.size();i+=3)if(!pending.emplace(uint64_t(gates[i]),std::array<double,3>{gates[i],gates[i+1],gates[i+2]}).second)return false;
 std::vector<double> projected;projected.reserve(prepared.size());
 for(size_t i=0;i<prepared.size();i+=3){const auto id=uint64_t(prepared[i]),mechanism=uint64_t(prepared[i+1]);const auto changed=pending.find(id);
  if(changed!=pending.end()){if(changed->second[1]!=double(mechanism))return false;projected.insert(projected.end(),changed->second.begin(),changed->second.end());pending.erase(changed);continue;}
  const auto found=s.gates.find(id);if(found==s.gates.end())return false;const auto& gate=found->second;
  if(!gate.mesh||gate.status!=0||gate.mechanism!=mechanism||gateMotionPending(gate,s.effectiveTime)||gateMotionEnd(gate)>s.effectiveTime||gateOpening(gate,s.effectiveTime)!=gate.target)return false;
  bool owned=false;
  for(size_t j=0;j<routes.size();j+=26){const auto lease=gate.crossings.find(uint64_t(routes[j]));const auto slot=size_t(routes[j+2]);
   if(lease==gate.crossings.end()||slot>=s.routeSlots.size())continue;const auto& route=s.routeSlots[slot];
   if(lease->second.slot==slot&&lease->second.generation==uint32_t(routes[j+3])&&lease->second.body==uint64_t(routes[j+4])&&std::find(route.gateReservations.begin(),route.gateReservations.end(),id)!=route.gateReservations.end()){owned=true;break;}
  }
  if(!owned)return false;
  projected.insert(projected.end(),{double(id),double(mechanism),gate.target});
 }
 if(!pending.empty())return false;
 gates=std::move(projected);return true;
}
int spatialIntentRevalidateWorkerRouteStop(double session,double ticket,std::array<double,8>& translation){
  auto& s=state();auto& p=s.barrierProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||(p.kind!=12&&p.kind!=24&&p.kind!=25)||!p.workerRouteStop||session!=double(p.session)||ticket!=double(p.ticket))return -1;
  if(p.session!=s.session||p.facts!=s.sequence||p.intents!=s.intentSequence||p.gates!=s.gateRevision||p.world!=executionWorldStamp()){
    clearWorldMutationProposal(p);return -2;
  }
  // Entity/body revisions advance on execution ticks. Reprove the current
  // bodies and original source instead of treating movement as stale assets.
  auto origin=std::move(*p.workerRouteStop);const auto input=std::move(p.worldInput);clearWorldMutationProposal(p);
  int result=spatialIntentBeginWorldPreview();if(result!=1)return result;
  result=spatialIntentStopWorkerRoute(input);spatialIntentEndWorldPreview();if(result!=1)return result;
  result=spatialIntentStageWorld(input,nullptr,-1);if(result!=1)return result;
  const auto& routes=p.routeEffects;auto& gates=p.gateEffects;
  bool same=routes.size()==origin.preparedRoutes.size();
  for(size_t i=0;same&&i<routes.size();i+=26)for(size_t j=0;j<8;j++)if(j!=6&&routes[i+j]!=origin.preparedRoutes[i+j]){same=false;break;}
  if(same&&input.kind==24)same=retainCompletedFarmStopMotorProjection(s,origin.preparedGates,routes,gates);
  else same=same&&gates.size()==origin.preparedGates.size();
  for(size_t i=0;same&&i<gates.size();i+=3)if(gates[i]!=origin.preparedGates[i]||gates[i+1]!=origin.preparedGates[i+1])same=false;
  origin.translation={1,double(origin.preparedTicket),double(p.ticket),origin.preparedAt,p.at,same?1.:0.,double(routes.size()/26),double(gates.size()/3)};
  translation=origin.translation;p.workerRouteStop=std::move(origin);return 1;
}
int spatialIntentTakeWorkerRouteStop(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,SpatialWorldProposalInput& out,std::array<double,5>& receipt){
  const auto& p=state().barrierProposal;
  if(!integer(preparedTicket)||!p.pending||(p.kind!=12&&p.kind!=24&&p.kind!=25)||!p.workerRouteStop)return -1;
  const auto& origin=*p.workerRouteStop;
  if(preparedTicket!=double(p.ticket)&&(preparedTicket!=double(origin.preparedTicket)||origin.translation[0]!=1||origin.translation[5]!=1))return -9;
  const std::array<double,5> proof{1,preparedTicket,preparedTicket==double(p.ticket)?p.at:origin.preparedAt,double(p.ticket),p.at};
  const int result=spatialIntentTakeWorld(session,ticket,sequence,time,clockSequence,out);if(result==1)receipt=proof;return result;
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_idle_stroll_stop_proposal_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==12&&p.workerRouteStop&&session==double(p.session)&&ticket==double(p.ticket)&&p.workerRouteStop->translation[0]==1?p.workerRouteStop->translation.data():nullptr;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_farm_arrival_stop_proposal_version(){return 1;}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_farm_arrival_stop_proposal_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==24&&p.workerRouteStop&&session==double(p.session)&&ticket==double(p.ticket)&&p.workerRouteStop->translation[0]==1?p.workerRouteStop->translation.data():nullptr;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_task_route_stop_proposal_version(){return 1;}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_task_route_stop_proposal_source_matches(double session,double ticket,double actor,double slot,double generation,double assignment){
  const auto& p=state().barrierProposal;
  if(!p.pending||p.kind!=25||!p.workerRouteStop||session!=double(p.session)||ticket!=double(p.ticket))return 0;
  const auto& ids=p.worldInput.integers;
  if(ids.size()!=8)return 0;
  const auto id=[&](int offset){return uint64_t(uint32_t(ids[offset]))|(uint64_t(uint32_t(ids[offset+1]))<<32);};
  return session==double(id(0))&&actor==double(id(2))&&slot==double(uint32_t(ids[4]))&&
         generation==double(uint32_t(ids[5]))&&assignment==double(id(6));
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_task_route_stop_proposal_translation_ptr(double session,double ticket){
  const auto& p=state().barrierProposal;return p.pending&&p.kind==25&&p.workerRouteStop&&session==double(p.session)&&ticket==double(p.ticket)&&p.workerRouteStop->translation[0]==1?p.workerRouteStop->translation.data():nullptr;
}

int spatialIntentTakeWorld(double session,double ticket,double sequence,double time,double clockSequence,SpatialWorldProposalInput& out,bool allowGate){
  const auto& draft=state().barrierProposal.barrierAddition;if(draft&&draft->gateId&&!allowGate)return -1;
  const int result=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,2);if(result!=1)return result;
  auto& p=state().barrierProposal;out=std::move(p.worldInput);clearWorldMutationProposal(p);return 1;
}
// Global C++ bridge: resource preview and canonical barriers remain in spatial-savanna.
static int prepareGateAdditionCandidate(IntentState& s,const std::array<double,7>& value,NativeGate& gate,std::set<uint64_t>* inspectedRoutes=nullptr){
 const double id=value[0],modelId=value[1],x=value[2],z=value[3],yaw=value[4],sx=value[5],sz=value[6];
 if(!s.session||!integer(id)||!integer(modelId)||modelId>3||!coordinate(x)||!coordinate(z)||!std::isfinite(yaw)||!std::isfinite(sx)||!std::isfinite(sz)||sx<=0||sz<=0||sx>100||sz>100||s.gates.count(uint64_t(id))||s.nextGateMechanism>=uint64_t(maxId))return -1;
 if(!gateStaticProofCurrent(s))return -2;
 const auto* model=nativeGateMeshModel(int(modelId));if(!model)return -1;
 gate.id=uint64_t(id);gate.x=x;gate.z=z;gate.yaw=yaw;gate.sx=sx;gate.sz=sz;gate.hx=model->hx;gate.hz=model->hz;gate.at=s.effectiveTime;gate.local.assign(model->policy,model->policy+model->policyCount*2);prepareGateGeometry(gate);
 const auto facts=gateFacts(s,gate);if(!facts.complete)return -2;
 gate.from=gate.target=facts.occupied?1:0;gate.defined=true;gate.occupied=facts.occupied;gate.requested=facts.requested;
 if(!gateStaticRegistrationClear(s,gate)||!prepareGateMechanismGeometry(gate,model))return 0;
 const int proof=proveGateMechanismCandidate(s,gate,inspectedRoutes);if(proof!=1)return proof;
 return 1;
}
// Read-only impact query on the same original mechanism and native route index.
// Reuse the gate service scratch output; no proposal, handle, ID or clock is issued.
extern "C" EMSCRIPTEN_KEEPALIVE int nav_gate_addition_stop_query_version(){return 1;}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_gate_addition_inspect_stops(double id,int model,double x,double z,double yaw,double sx,double sz){
 auto& s=state();s.gateResult.clear();if(s.barrierProposal.pending)return -4;
 if(!s.session||!s.causalClock||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence||
    !gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
 NativeGate gate;std::set<uint64_t> affected;
 const int proof=prepareGateAdditionCandidate(s,{id,double(model),x,z,yaw,sx,sz},gate,&affected);
 if(proof!=1)return proof==0?-5:proof;
 // Include the existing held-disc/gate closure before any actor is stopped.
 std::vector<double> rows,gates;if(!projectWorldRouteStops(s,affected,rows,gates))return -2;
 s.gateResult.clear();for(size_t i=0;i<rows.size();i+=26)s.gateResult.push_back(rows[i]);
 return int(s.gateResult.size());
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_gate_addition_stop_actors_ptr(){return state().gateResult.data();}
int spatialIntentStageGateAddition(const std::array<double,7>& value,int firstBarrier,std::vector<float>& proxies){
 auto& s=state();if(s.barrierProposal.pending)return -4;
 if(firstBarrier<1||firstBarrier>std::numeric_limits<int>::max()-3)return -1;
 NativeGate gate;gate.navigationBarriers={firstBarrier,firstBarrier+1,firstBarrier+2};
 const int proof=prepareGateAdditionCandidate(s,value,gate);if(proof!=1)return proof;
 gate.mechanism=s.nextGateMechanism+1;gate.bodySweepCertified=gate.staticSweepCertified=true;
 proxies=gateAdditionProxies(gate);if(proxies.size()!=18)return -1;
 auto shapes=gateAdditionShapes(proxies);const SpatialWorldProposalInput input{2,0,proxies,{}};
 const int staged=spatialIntentStageWorld(input,shapes.data(),int(shapes.size()),true);if(staged!=1)return staged;
 auto& draft=*s.barrierProposal.barrierAddition;draft.gateId=gate.id;draft.gate.emplace(gate.id,std::move(gate));return 1;
}

int spatialIntentCommitGateAddition(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,int firstBarrier,SpatialWorldProposalInput& input,std::array<double,5>& receipt,int(*apply)(const SpatialWorldProposalInput&)){
 auto& s=state();auto& p=s.barrierProposal;
 if(!p.pending||p.kind!=2||!p.barrierAddition||p.barrierAddition->removal||!p.barrierAddition->gateId||p.barrierAddition->gate.size()!=1||!apply)return -1;
 const auto& draft=*p.barrierAddition;const auto& gate=draft.gate.begin()->second;
 if(s.gates.count(gate.id)||gate.navigationBarriers[0]!=firstBarrier||gate.mechanism!=s.nextGateMechanism+1)return -2;
 // Validate the receipt before transferring the prepared node. A foreign
 // prepared ticket leaves the original proposal available, as for solid walls.
 if(!integer(preparedTicket)||!p.retainsRoutes||!p.routeEffects.empty()||!p.gateEffects.empty())return -1;
 if(preparedTicket!=double(p.ticket)&&(preparedTicket!=double(draft.preparedTicket)||draft.translation[0]!=1||draft.translation[5]!=1))return -9;
 const int valid=takeWorldMutationBoundary(session,ticket,sequence,time,clockSequence,2);if(valid!=1)return valid;
 auto node=p.barrierAddition->gate.extract(gate.id);
 const int taken=spatialIntentTakeBarrierAddition(session,ticket,sequence,time,clockSequence,preparedTicket,input,receipt,true);if(taken!=1)return taken;
 // apply is the original barrier batch. All expected geometric rejection and
 // allocation of the gate node precede the first published mutation.
 if(apply(input)!=1)return -6;
 const auto before=executionWorldStamp();s.nextGateMechanism=node.mapped().mechanism;s.gates.insert(std::move(node));s.gateRevision++;
 cancelGateMotionProposal(s);updateGateStaticDomain(s);acknowledgeGateSupport(s,before);return 1;
}
// A removal is another kind2 batch on the existing world owner. The query
// collects every executable owner of this mechanism, including historical
// route dependencies. Only the normal stop transaction may release them.
bool spatialIntentGateCandidateOwnsEnvelope(int);
int gateRemovalActors(IntentState& s,uint64_t id,std::set<uint64_t>& actors){
 const auto found=s.gates.find(id);if(found==s.gates.end())return -1;
 const auto& gate=found->second;
 if(!gate.mesh||!gate.mechanism||gate.status!=0||!gateStaticProofCurrent(s)||!spatialIntentGateCandidateOwnsEnvelope(gate.navigationBarriers[2]))return -2;
 const auto proxies=gateAdditionProxies(gate);if(proxies.size()!=18)return -2;
 for(int i=0;i<3;i++){const auto* p=proxies.data()+i*6;if(!spatialGateProxyBarrierMatches(gate.navigationBarriers[i],p[0],p[1],p[2],p[3],p[4],int(p[5])))return -2;}
 for(const auto& [actor,crossing]:gate.crossings)actors.insert(actor);
 for(const auto& [actor,intent]:s.activeIntents){
  if(intent.state!=PlanningState::RouteActive||intent.slot>=s.routeSlots.size())continue;
  const auto& route=s.routeSlots[intent.slot];
  if(std::find(route.gateReservations.begin(),route.gateReservations.end(),id)!=route.gateReservations.end())actors.insert(actor);
 }
 return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_gate_removal_inspect_stops(double id){
 auto& s=state();s.gateResult.clear();if(!integer(id))return -1;if(s.barrierProposal.pending||s.gateMotionProposal.pending)return -4;
 if(!s.causalClock||s.clockThrough!=s.effectiveTime||s.clockIntentSequence!=s.intentSequence||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
 std::set<uint64_t> actors;const int valid=gateRemovalActors(s,uint64_t(id),actors);if(valid!=1)return valid;
 std::vector<double> rows,gates;if(!projectWorldRouteStops(s,actors,rows,gates))return -2;
 for(size_t i=0;i<rows.size();i+=26)s.gateResult.push_back(rows[i]);return int(s.gateResult.size());
}
int spatialIntentStageGateRemoval(double id,std::array<int,3>& ids){
 auto& s=state();if(!integer(id))return -1;if(s.barrierProposal.pending||s.gateMotionProposal.pending)return -4;
 std::set<uint64_t> actors;const int valid=gateRemovalActors(s,uint64_t(id),actors);if(valid!=1)return valid;if(!actors.empty())return 0;
 const auto& gate=s.gates.at(uint64_t(id));ids=gate.navigationBarriers;
 SpatialWorldProposalInput input;input.kind=2;input.mode=3;input.integers.assign(ids.begin(),ids.end());
 const int result=spatialIntentStageWorld(input,nullptr,0,true);if(result!=1)return result;
 auto& draft=*s.barrierProposal.barrierAddition;draft.gateId=gate.id;draft.removal=true;draft.gate.emplace(gate.id,gate);return 1;
}
int spatialIntentRevalidateGateRemoval(double session,double ticket){
 auto& s=state();auto& p=s.barrierProposal;
 if(!integer(session)||!integer(ticket)||!p.pending||p.kind!=2||!p.barrierAddition||!p.barrierAddition->removal||session!=double(p.session)||ticket!=double(p.ticket))return -1;
 if(p.session!=s.session||p.facts!=s.sequence||p.intents!=s.intentSequence||p.gates!=s.gateRevision||p.world!=executionWorldStamp()){clearWorldMutationProposal(p);return -2;}
 const auto origin=*p.barrierAddition;clearWorldMutationProposal(p);std::array<int,3> ids{};
 const int result=spatialIntentStageGateRemoval(double(origin.gateId),ids);if(result!=1)return result;
 auto& next=*p.barrierAddition;
 if(next.gate.at(origin.gateId).mechanism!=origin.gate.at(origin.gateId).mechanism||ids!=origin.gate.at(origin.gateId).navigationBarriers){clearWorldMutationProposal(p);return -2;}
 next.preparedTicket=origin.preparedTicket;next.preparedAt=origin.preparedAt;
 next.translation={1,double(origin.preparedTicket),double(p.ticket),origin.preparedAt,p.at,1,3,0};return 1;
}
int spatialIntentCommitGateRemoval(double session,double ticket,double sequence,double time,double clockSequence,double preparedTicket,SpatialWorldProposalInput& input,std::array<double,5>& receipt,int(*apply)(const SpatialWorldProposalInput&)){
 auto& s=state();auto& p=s.barrierProposal;
 if(!p.pending||p.kind!=2||!p.barrierAddition||!p.barrierAddition->removal||!apply)return -1;
 const auto& d=*p.barrierAddition;const auto found=s.gates.find(d.gateId);std::set<uint64_t> actors;
 if(found==s.gates.end()||gateRemovalActors(s,d.gateId,actors)!=1||!actors.empty()||found->second.mechanism!=d.gate.at(d.gateId).mechanism||found->second.navigationBarriers!=d.gate.at(d.gateId).navigationBarriers)return -2;
 const auto id=d.gateId;
 const int taken=spatialIntentTakeBarrierAddition(session,ticket,sequence,time,clockSequence,preparedTicket,input,receipt,true);if(taken!=1)return taken;
 // The batch validates the entire triplet before changing its index. Extract
 // only inside this synchronous commit so the ordinary proxy guard stays strict.
 auto node=s.gates.extract(id);
 if(apply(input)!=1){s.gates.insert(std::move(node));return -6;}
 const auto before=executionWorldStamp();s.gateRevision++;cancelGateMotionProposal(s);updateGateStaticDomain(s);acknowledgeGateSupport(s,before);return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_gate_addition_proposal_pose(double session,double ticket){
 auto& s=state();s.gateMechanismPose.fill(0);std::array<double,6> boundary{};
 if(spatialIntentWorldProposalSnapshot(boundary)!=1||boundary[0]!=session||boundary[1]!=ticket||!s.barrierProposal.barrierAddition||s.barrierProposal.barrierAddition->removal||s.barrierProposal.barrierAddition->gate.size()!=1)return 0;
 const auto& gate=s.barrierProposal.barrierAddition->gate.begin()->second;const auto root=gateRootMatrix(gate),leaf=gateLeafMatrix(gate,s.effectiveTime);auto& out=s.gateMechanismPose;
 out[0]=double(gate.id);out[1]=gate.mesh->id;out[2]=double(gate.mechanism);out[3]=gate.baseY;out[4]=gate.supportMin;out[5]=gate.supportMax;out[6]=s.effectiveTime;out[7]=gateOpening(gate,s.effectiveTime);
 std::copy(root.begin(),root.end(),out.begin()+8);std::copy(leaf.begin(),leaf.end(),out.begin()+24);return 1;
}

int spatialIntentWorldProposalSnapshot(std::array<double,6>& out){
  auto& p=state().barrierProposal;if(!p.pending||p.kind<2)return 0;
  const int valid=takeWorldMutationBoundary(double(p.session),double(p.ticket),double(p.intents),p.at,double(p.clock),2);
  if(valid!=1)return valid;
  out={double(p.session),double(p.ticket),double(p.intents),p.at,double(p.clock),double(p.kind)};return 1;
}
// A read-only consequence of the existing complete native mutation preflight.
// No direct stop means no held-disc/gate stop closure can be introduced by it.
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_world_proposal_retains_routes(double session,double ticket){
  auto& s=state();const auto& p=s.barrierProposal;
  const int current=takeWorldMutationBoundary(session,ticket,double(p.intents),p.at,double(p.clock),p.kind==1?1:2);
  return current==1?(p.retainsRoutes?1:0):current;
}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_world_proposal_effects_version(){return 1;}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_world_proposal_route_effects(double session,double ticket){
  const int valid=nav_intent_world_proposal_retains_routes(session,ticket);return valid<0?valid:int(state().barrierProposal.routeEffects.size()/26);
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_intent_world_proposal_route_effects_ptr(){return state().barrierProposal.routeEffects.data();}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_world_proposal_gate_effects(double session,double ticket){
  const int valid=nav_intent_world_proposal_retains_routes(session,ticket);return valid<0?valid:int(state().barrierProposal.gateEffects.size()/3);
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_intent_world_proposal_gate_effects_ptr(){return state().barrierProposal.gateEffects.data();}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_barrier_proposal_version(){return 1;}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_barrier_proposal_ticket(){
  auto& s=state();s.barrierProposalResult.fill(0);const auto& p=s.barrierProposal;if(!p.pending)return 0;
  s.barrierProposalResult={double(p.session),double(p.ticket),double(p.intents),p.at,double(p.clock),double(p.kind)};return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE const double* nav_intent_barrier_proposal_ticket_ptr(){return state().barrierProposalResult.data();}
extern "C" EMSCRIPTEN_KEEPALIVE int nav_intent_barrier_proposal_cancel(double session,double ticket){
  auto& s=state();const auto& p=s.barrierProposal;
  if(!integer(session)||!integer(ticket)||!p.pending||session!=double(p.session)||ticket!=double(p.ticket))return 0;
  clearWorldMutationProposal(s.barrierProposal);return 1;
}
bool spatialIntentGateUnsupported(double x,double z,double nx,double nz,double radius){
  const auto& s=state();for(const auto& [id,gate]:s.gates)
    if(gate.status!=2&&spatialStaticMutationBlocks(gate.unsupported,x,z,nx,nz,radius,0,true))return true;
  return false;
}
bool spatialIntentPropsProtected(){const auto& s=state();return s.worldMutationPreview||s.bodyDomainActive||!s.reservedBodies.empty()||s.gateStaticProofs;}
bool spatialIntentTerrainProtected(){return spatialIntentPropsProtected();}
SpatialStaticTicket spatialIntentTerrainBefore(const SpatialStaticMutation* boxes,int count,
    SpatialTerrainProbe probe,void* context,int recipes,bool known){
  return terrainMutationBefore(state(),boxes,count,probe,context,recipes,known);
}
void spatialIntentTerrainCommitted(const SpatialStaticTicket& ticket){terrainMutationCommitted(state(),ticket);}
SpatialStaticTicket spatialIntentPropsBefore(const SpatialStaticMutation* shapes,int count,int recipes,bool known){
  return propMutationBefore(state(),shapes,count,recipes,known);
}
void spatialIntentPropsCommitted(const SpatialStaticTicket& ticket,int terrainDelta){propMutationCommitted(state(),ticket,terrainDelta);}
SpatialStaticTicket spatialIntentResidencyBefore(const SpatialResidencyRegion* regions,int count,bool removing,bool releaseOnly){
  return residencyMutationBefore(state(),regions,count,removing,releaseOnly);
}
void spatialIntentResidencyCommitted(const SpatialStaticTicket& ticket,int count){residencyMutationCommitted(state(),ticket,count);}

bool spatialIntentGateCandidateOwnsEnvelope(int id){
 const auto& s=state();if(id<=0||!s.session||!gateStaticProofCurrent(s))return false;
 const NativeGate* owner=nullptr;
 for(const auto& [gateId,gate]:s.gates){
  if(gate.navigationBarriers[2]!=id)continue;
  const auto& ids=gate.navigationBarriers;
  if(owner||gate.id!=gateId||!gate.defined||!gate.mesh||!gate.mechanism||gate.status!=0||
     !gate.staticSweepCertified||!gate.bodySweepCertified||ids[0]<=0||ids[1]<=0||
     ids[0]==ids[1]||ids[0]==id||ids[1]==id)return false;
  owner=&gate;
 }
 // Installation/commit validates the full triplet against the authored mesh;
 // its canonical barrier IDs cannot be removed while that mechanism is live.
 return owner!=nullptr;
}
bool spatialIntentGatePlanningClear(double x,double z,double nx,double nz,double radius){
 const auto& s=state();
 for(const auto& [id,gate]:s.gates){
  if(!gate.mesh||!gate.navigationBarriers[2])continue;
  const auto& b=gate.unsupported;
  if(std::max(x,nx)+radius<b.minX||std::min(x,nx)-radius>b.maxX||
     std::max(z,nz)+radius<b.minZ||std::min(z,nz)-radius>b.maxZ)continue;
  if(!spatialIntentGateCandidateOwnsEnvelope(gate.navigationBarriers[2]))return false;
  const float magnitude=float(std::max({1.0,std::abs(x),std::abs(z),std::abs(nx),std::abs(nz)}));
  const double error=std::max(1e-5,4.0*double(std::nextafter(magnitude,std::numeric_limits<float>::infinity())-magnitude));
  // Reuse the mounted worker frame and the SAME full leaf as the timed sweep.
  // Actual route terrain/height and continuous motor proof remain at admission.
  for(int part=0;part<4;part++){
   const auto& local=part==3?gate.physicalLeaf:gate.workerParts[part];if(local.size()<6)continue;
   const auto polygon=gatePartWorld(gate,local,part==3,s.effectiveTime,1);
   if(spatialNativePolygonDistance(polygon.data(),int(polygon.size()/2),x,z,nx,nz)<=radius+error)return false;
  }
 }
 return true;
}
bool spatialIntentGateProxyRetirementAllowed(int id){
 for(const auto& [gateId,gate]:state().gates)if(gate.mesh&&std::find(gate.navigationBarriers.begin(),gate.navigationBarriers.end(),id)!=gate.navigationBarriers.end())return false;
 return true;
}
bool spatialIntentStaticRestorationAllowed(){return !state().bodyDomainActive&&!state().gateStaticProofs;}
bool spatialIntentStaticPreflight(const SpatialStaticMutation* shapes,int count){
  return staticMutationPreflight(state(),shapes,count);
}
SpatialStaticTicket spatialIntentStaticBefore(const SpatialStaticMutation* shapes,int count){
  return staticMutationBefore(state(),shapes,count);
}
void spatialIntentStaticCommitted(const SpatialStaticTicket& ticket){staticMutationCommitted(state(),ticket);}
bool spatialIntentBodyCanChange(uint64_t id,const SpatialBodyView& proposed){
  auto& s=state();if(!nativeTaskActionBodyCanChange(s,id,proposed)||!gateMechanismBodyCanChange(s,proposed)||!gateMotionBodyCanChange(s,proposed)||!reservationBodyCanChange(s,id,proposed))return false;
  if(s.bodyDomainActive){SpatialBodyView previous;const bool exists=spatialReadBody(id,previous);
    updateResidencyPinRevision(s,exists?&previous:nullptr,&proposed);}
  return true;
}
void spatialIntentBodyRemoving(uint64_t id){
  auto& s=state();SpatialBodyView previous;
  if(const auto binding=s.gateBodyActors.find(id);binding!=s.gateBodyActors.end()){
    const auto intent=s.activeIntents.find(binding->second);
    if(intent!=s.activeIntents.end()&&(intent->second.actionBinding||intent->second.restoredActionSource||intent->second.homeRequest||intent->second.farmArrivalRequest||intent->second.initialIdleRequest||intent->second.initialIdleBodyBinding||intent->second.idleCycle||intent->second.heldIdleTaskSource||intent->second.strollRequest)){releaseIntent(s,intent->first,PlanningState::Cancelled);s.activeIntents.erase(intent);}
    if(const auto worker=s.workers.find(binding->second);worker!=s.workers.end())worker->second.bodyBound=false;
    s.gateBodyActors.erase(binding);
  }
  if(s.bodyDomainActive&&spatialReadBody(id,previous))updateResidencyPinRevision(s,&previous,nullptr);
  reservationBodyRemoving(s,id);
}
void spatialIntentBodiesResetting(){
  auto& s=state();
  std::vector<uint64_t> actions;for(const auto& [actor,intent]:s.activeIntents)if(intent.actionBinding||intent.restoredActionSource||intent.settlementBinding||intent.homeRequest||intent.farmArrivalRequest||intent.initialIdleRequest||intent.initialIdleBodyBinding||intent.idleCycle||intent.heldIdleTaskSource||intent.strollRequest)actions.push_back(actor);
  std::sort(actions.begin(),actions.end());for(uint64_t actor:actions){releaseIntent(s,actor,PlanningState::Cancelled);s.activeIntents.erase(actor);}
  for(auto& [id,worker]:s.workers)worker.bodyBound=false;s.gateBodyActors.clear();
  s.resettingBodies=true;
  while(!s.reservedBodies.empty())reservationBodyRemoving(s,s.reservedBodies.begin()->first);
  while(!s.suspendedBodies.empty())reservationBodyRemoving(s,s.suspendedBodies.begin()->first);
  s.resettingBodies=false;
  if(s.bodyDomainActive){s.bodyDomainActive=false;s.residencyPinRevision++;}
}

extern "C" {
// Native graph mutation notifications only enqueue inverse dependents. Physical
// validation runs after the graph transaction is coherent, never from a draw or
// actor tick. Global init remains conservatively scoped to its movement profile.
void nav_intent_sector_changed(int profile,int sx,int sz,int global){
  if(profile<0||profile>=6)return;
  IntentState& s=state();
  if(global){
    const auto& actors=s.profileParticipants[profile];
    s.changedRouteActors.insert(actors.begin(),actors.end());
  }else{
    const auto found=s.routeSubscribers.find({profile,sx,sz});
    if(found!=s.routeSubscribers.end())
      s.changedRouteActors.insert(found->second.begin(),found->second.end());
    // Waiting routes do not yet have a usable spatial corridor. Wake them on
    // profile changes until native frontier dependencies are represented.
    const auto& waiting=s.waitingSubscribers[profile];
    s.changedRouteActors.insert(waiting.begin(),waiting.end());
  }
}
// Reset on a new WASM world/session or before replaying a restored snapshot.
void nav_intent_reset(){
  IntentState& s=state();
  if(!s.gates.empty())spatialGateSupportChanged();
  s.gates.clear();s.gateBodyActors.clear();s.gateInput.clear();s.gateResult.clear();
  cancelGateMotionProposal(s);s.gateMotionResult.fill(0);
  s.barrierProposal=PendingBarrierProposal{};s.barrierProposalResult.fill(0);s.homeArrivalResult.fill(0);s.gateRevision=0;s.worldMutationPreview=false;s.worldPreviewRetainsRoutes=true;s.worldPreviewStoppedRoutes.clear();
  s.farmArrivalRequestResult.fill(0);s.farmArrivalRequestsResult.clear();s.farmArrivalRouteBindingResult.clear();s.farmArrivalExecutionResult.fill(0);
  s.homeRequestResult.fill(0);s.homeRequestsResult.clear();s.strollRequestResult.fill(0);s.strollRequestsResult.clear();s.strollFailedRestResult.fill(0);s.initialIdleRequestResult.fill(0);s.initialIdleRequestsResult.clear();s.initialIdleBodyBindingResult.clear();
  s.routeHoldResult.clear();s.routeKnotResult.clear();s.gateWaitSegments=0;
  s.gateStaticPairs=s.gateStaticEvaluations=s.gateStaticRejected=0;s.gateStaticResult.fill(0);
  s.gateStaticProofs=0;s.gateStaticWorldStamp.fill(0);
  s.gateBoundaries=s.gateWorkerChecks=s.gatePrefixSegments=0;
  s.gateSweepPairs=s.gateSweepEvaluations=s.gateSweepRejected=0;s.gateSweepResult.fill(0);
  s.session++;
  if(!s.session)s.session=1;
  s.finishedAnimalStrike.reset();s.activeIntents.clear();s.byTarget.clear();s.byTask.clear();
  s.routeSubscribers.clear();s.changedRouteActors.clear();
  for(auto& actors:s.profileParticipants)actors.clear();
  for(auto& actors:s.waitingSubscribers)actors.clear();
  s.routeValidations=s.routeValidationSegments=s.reconcileCandidates=0;
#ifdef WILD_DECLARATIVE_ATTACK
  s.attackDeclarations.clear();s.attackDeadlines.clear();
#ifdef WILD_DECLARATIVE_STATS
  s.attackWakeEvents=s.attackWakeVisits=s.attackWakeIdle=s.attackWakeTransitions=0;
#endif
#endif
  s.byBlockedCropGroup.clear();s.wallOpportunityActors.clear();
  s.routeSlots.clear();s.intentChanges.clear();s.controlSnapshot.clear();s.taskActionBindingResult.clear();s.intentResult.fill(0);
  s.timingResult.fill(0);s.sampleResult.fill(0);s.routeTimeSamples=0;s.timingRejection=0;
  s.reservedBodies.clear();s.suspendedBodies.clear();s.reservationResult.fill(0);
  s.routeSuspensions=s.routeResumptions=0;s.suspendedRouteResult.fill(0);
  s.reservationChecks=s.reservationPairs=s.reservationBodyChecks=s.reservationMutationCandidates=0;
  s.executionEnabled=s.bodyDomainActive=s.drainingStops=s.resettingBodies=false;
  s.executionWorldStamp.fill(0);s.executionResult.fill(0);
  s.causalClock=s.clockPaused=false;s.clockReanchor=true;s.clockThrough=0;s.clockRate=1;
  s.clockSequence=s.clockIntentSequence=0;s.clockProofSequence=UINT64_MAX;s.clockResult.fill(0);
  s.stoppedReservationBodies.clear();s.stoppedGateRouteActors.clear();s.removingBodies.clear();
  s.executionAdvances=s.executionEvaluations=s.executionBodyUpdates=s.executionStopInvalidations=0;
  s.staticMutationCandidates=s.staticMutationSegments=s.staticMutationBodyChecks=0;
  s.staticMutationRevocations=s.staticMutationRejected=s.staticMutationCommits=0;
  s.residencyCandidates=s.residencySegments=s.residencyBodyChecks=0;
  s.residencyRevocations=s.residencyRejected=s.residencyCommits=s.residencyPinRevision=0;
  s.propMutationCandidates=s.propMutationSegments=s.propMutationBodyChecks=s.propMutationRevocations=0;
  s.propMutationRejected=s.propMutationCommits=s.propMutationRecipeChunks=0;
  s.terrainCandidates=s.terrainSegments=s.terrainBodyChecks=s.terrainRevocations=0;
  s.terrainRejected=s.terrainCommits=s.terrainRecipeChunks=0;
  s.attackRouteInput.clear();s.attackBlockers.clear();
  s.attackReservedTargets.clear();s.attackResult.fill(0);
  s.wallAttackResult.fill(0);
  s.invalidations=0;
  s.planningCallsByActor.clear();
  s.workers.clear();s.targets.clear();s.tasks.clear();
  s.damagedWalls.clear();s.damagedCenters.clear();s.damagedResults.clear();
  s.cropGroups.clear();s.cropGroupRows.clear();s.cropGroupMembers.clear();
  s.cropProtection.clear();
  s.cropRevision=0;s.cropGroupsDirty=true;
  s.cropCells.clear();s.plantSearches.clear();s.plantLeases.clear();
  s.plantResult.fill(0);s.nextPlantLease=1;s.centerRevision=0;
  s.changes.clear();s.results.clear();s.routes.clear();clearProposal(s);
  s.wallPortalCaches.clear();s.wallRevision=0;s.wallPortalBuilds=0;
  s.perimeterRows.clear();
  s.sequence=0;s.entityRevision=0;s.damageRevision=0;
  s.intentSequence=0;s.effectiveTime=0;
  s.routeQueries=0;s.candidates=0;
}
// Diagnostic prototype: project physical wall faces into the same weak-region
// graph used for crop enclosure classification. No target is selected and no
// reservation or intention is changed here. A missing sector leaves the edge
// unknown, never a certified wall separating two regions.
int nav_intent_wall_portals(double radius){
  IntentState& s=state();
  if(!std::isfinite(radius)||radius<=0||radius>2||
     lazy_selected_context()==1)return -1;
  WallPortalCache& cache=s.wallPortalCaches[lazy_selected_context()];
  if(cache.built&&cache.topology==lazy_route_revision()&&
     cache.walls==s.wallRevision&&cache.radius==radius)
    return int(cache.rows.size()/5);
  cache.rows.clear();cache.built=false;
  s.wallPortalBuilds++;
  std::vector<const Target*> walls;
  for(const auto& [id,target]:s.targets)
    if(target.kind==3&&target.active&&target.status!=2)
      walls.push_back(&target);
  std::sort(walls.begin(),walls.end(),[](const Target* a,const Target* b){
    return a->id<b->id;
  });
  const auto regions=[](double x,double z){
    std::set<int> ids;bool unknown=false;
    for(int ax:{int(std::floor(x)),int(std::ceil(x))})
      for(int az:{int(std::floor(z)),int(std::ceil(z))}){
        if(!spatial_local_clear(float(x),float(z),float(ax),float(az)))continue;
        const int id=lazy_weak_region(ax,az);
        if(id==-1)unknown=true;
        else if(id>=0)ids.insert(id);
      }
    return std::pair<std::set<int>,bool>{std::move(ids),unknown};
  };
  for(const Target* wall:walls){
    const double c=std::cos(wall->yaw),sn=std::sin(wall->yaw);
    const double width=1.09*wall->shape;
    const double offset=.22*wall->wallDepthScale+radius+.6;
    for(double along:{0.0,-.6,.6}){
      const double cx=wall->x+c*width*along;
      const double cz=wall->z-sn*width*along;
      const double ax=cx+sn*offset,az=cz+c*offset;
      const double bx=cx-sn*offset,bz=cz-c*offset;
      const auto a=regions(ax,az),b=regions(bx,bz);
      if(a.second||b.second||a.first.empty()||b.first.empty())continue;
      bool distinct=false;
      for(int from:a.first)for(int to:b.first)if(from!=to){
        cache.rows.insert(cache.rows.end(),
          {double(wall->id),double(from),double(to),ax,az});
        cache.rows.insert(cache.rows.end(),
          {double(wall->id),double(to),double(from),bx,bz});
        distinct=true;
      }
      if(distinct)break;
    }
  }
  cache.topology=lazy_route_revision();cache.walls=s.wallRevision;
  cache.radius=radius;cache.built=true;
  return int(cache.rows.size()/5);
}
const double* nav_intent_wall_portals_ptr(){
  const auto found=state().wallPortalCaches.find(lazy_selected_context());
  return found==state().wallPortalCaches.end()?nullptr:found->second.rows.data();
}
double nav_intent_wall_portal_builds(){return double(state().wallPortalBuilds);}
// Return only the first wall crossing from the animal's weak region toward a
// sealed crop group. This is a read-only candidate query; the physical route,
// approach lease and target priority still need validation before adoption.
// 1 = candidates, 0 = already inside, -1 = unresolved, -2 = invalid request.
int nav_intent_perimeter_walls(double startX,double startZ,double radius,
                               double groupId){
  IntentState& s=state();s.perimeterRows.clear();
  if(!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2||!integer(groupId)||
     lazy_selected_context()==1)return -2;
  rebuildCropGroups(s);
  auto group=std::find_if(s.cropGroups.begin(),s.cropGroups.end(),
    [groupId](const CropGroup& value){return value.id==uint64_t(groupId);});
  if(group==s.cropGroups.end())return -2;
  std::set<int> origins;
  for(int x:{int(std::floor(startX)),int(std::ceil(startX))})
    for(int z:{int(std::floor(startZ)),int(std::ceil(startZ))}){
      if(!spatial_local_clear(float(startX),float(startZ),float(x),float(z)))
        continue;
      const int region=lazy_weak_region(x,z);
      if(region>=0)origins.insert(region);
    }
  if(origins.empty())return -1;
  const AttackSiteCache& sites=attackSitesFor(s,*group,float(radius));
  if(sites.byRegion.empty())return -1;
  std::set<int> destinations;
  for(const auto& [region,points]:sites.byRegion){
    const AttackSite& first=points.front();
    if(lazy_enclosure(first.x,first.z)!=1)return -1;
    if(origins.count(region))return 0;
    destinations.insert(region);
  }
  const int count=nav_intent_wall_portals(radius);
  if(count<0)return -2;
  const auto& portals=s.wallPortalCaches.at(lazy_selected_context()).rows;
  std::map<int,std::vector<std::array<double,5>>> graph;
  for(int index=0;index<count;index++){
    const size_t offset=size_t(index)*5;
    std::array<double,5> edge{};
    std::copy_n(portals.begin()+offset,5,edge.begin());
    graph[int(edge[1])].push_back(edge);
  }
  std::map<int,int> distance;
  std::queue<int> pending;
  for(int region:destinations){distance[region]=0;pending.push(region);}
  while(!pending.empty()){
    const int region=pending.front();pending.pop();
    for(const auto& edge:graph[region]){
      const int next=int(edge[2]);
      if(distance.count(next))continue;
      distance[next]=distance[region]+1;pending.push(next);
    }
  }
  int best=std::numeric_limits<int>::max();
  for(int region:origins){
    const auto found=distance.find(region);
    if(found!=distance.end())best=std::min(best,found->second);
  }
  if(best==std::numeric_limits<int>::max())return -1;
  for(int region:origins){
    const auto found=distance.find(region);
    if(found==distance.end()||found->second!=best)continue;
    for(const auto& edge:graph[region])
      if(distance.count(int(edge[2]))&&distance[int(edge[2])]==best-1)
        s.perimeterRows.insert(s.perimeterRows.end(),
          {edge[0],edge[3],edge[4]});
  }
  std::vector<std::array<double,3>> unique;
  for(size_t index=0;index<s.perimeterRows.size();index+=3)
    unique.push_back({s.perimeterRows[index],s.perimeterRows[index+1],
      s.perimeterRows[index+2]});
  std::sort(unique.begin(),unique.end(),[](const auto& a,const auto& b){
    return a[0]!=b[0]?a[0]<b[0]:a[1]!=b[1]?a[1]<b[1]:a[2]<b[2];
  });
  unique.erase(std::unique(unique.begin(),unique.end(),[](const auto& a,
    const auto& b){return a==b;}),unique.end());
  s.perimeterRows.clear();
  for(const auto& row:unique)s.perimeterRows.insert(s.perimeterRows.end(),
    row.begin(),row.end());
  return s.perimeterRows.empty()?-1:1;
}
int nav_intent_perimeter_wall_count(){return int(state().perimeterRows.size()/3);}
const double* nav_intent_perimeter_walls_ptr(){return state().perimeterRows.data();}
double* nav_intent_changes_ptr(int count){
  if(count<0||count>maxChangeBatch)return nullptr;
  IntentState& s=state();s.changes.resize(size_t(count)*changeWidth);
  return s.changes.data();
}
// Sequence must be exactly previous+1. Invalid batches change nothing.
int nav_intent_apply_changes(double sequence,int count){
  IntentState& s=state();
  if(!integer(sequence)||uint64_t(sequence)!=s.sequence+1||
    count<0||count>maxChangeBatch||
    s.changes.size()<size_t(count)*changeWidth)return 0;
  std::vector<Change> parsed(static_cast<size_t>(count));
  for(int i=0;i<count;i++)
    if(!parse(s.changes.data()+size_t(i)*changeWidth,parsed[size_t(i)]))return 0;
  for(const auto& change:parsed)if(change.kind==1&&change.op){const auto active=s.activeIntents.find(change.id);if(active!=s.activeIntents.end()&&active->second.actionBinding){const auto& h=active->second.actionBinding->actual;if(change.x!=h[12]||change.z!=h[13])return 0;}}
  if(s.executionEnabled)for(const auto& change:parsed){
    if(change.kind!=1||!change.op)continue;
    const auto active=s.activeIntents.find(change.id);
    if(active==s.activeIntents.end()||active->second.state!=PlanningState::RouteActive)continue;
    const auto& route=s.routeSlots[active->second.slot];if(!route.reserved||!route.hasExecution)continue;
    if(change.x!=route.executionPose[0]||change.z!=route.executionPose[1]||
       change.target&&route.executionPose[6]!=1)return 0;
  }
  std::unordered_map<uint64_t,int> touchedTargetKinds;
  for(const Change& change:parsed){
    if(change.kind==2)touchedTargetKinds[change.id]=change.op?int(change.center):0;
    if((change.kind!=4&&change.kind!=5&&change.kind!=6)||!change.op)continue;
    const auto pending=touchedTargetKinds.find(change.id);
    const int current=pending!=touchedTargetKinds.end()?pending->second:
      s.targets.count(change.id)?s.targets.at(change.id).kind:0;
    if(change.kind==4&&current!=int(change.center))return 0;
    if(change.kind==5&&current!=1&&current!=2)return 0;
    if(change.kind==6&&current!=4)return 0;
  }
  bool planningChange=false,damageChange=false,cropChange=false,cropRemoved=false,
    centerChange=false,wallChange=false;
  std::unordered_set<uint64_t> invalidPlantCenters;
  for(const Change& change:parsed){
    const auto prior=s.targets.find(change.id);
    if(change.kind==2&&prior!=s.targets.end()&&prior->second.kind==4&&
       (!change.op||change.center!=4||prior->second.x!=change.x||
        prior->second.z!=change.z||prior->second.yaw!=change.created||
        prior->second.shape!=change.rank||prior->second.active!=change.flag))
      invalidPlantCenters.insert(change.id);
    if(change.kind==6&&prior!=s.targets.end()&&prior->second.kind==4&&
       (!change.op||!prior->second.serviceKnown||
        prior->second.serviceX!=change.x||prior->second.serviceZ!=change.z))
      invalidPlantCenters.insert(change.id);
    if(change.kind==4&&prior!=s.targets.end()&&prior->second.kind==4&&
       (!change.op||change.assigned!=0))
      invalidPlantCenters.insert(change.id);
    if(change.kind==2||change.kind==4)damageChange=true;
    if(change.kind==2&&
       (change.op&&change.center==3||
        s.targets.count(change.id)&&s.targets.at(change.id).kind==3))
      wallChange=true;
    if(change.kind==4&&s.targets.count(change.id)&&
       s.targets.at(change.id).kind==3&&
       (!change.op||!s.targets.at(change.id).damageKnown||
        s.targets.at(change.id).status!=int(change.assigned)))
      wallChange=true;
    if(change.kind==5||change.kind==2&&
      (change.op&&change.center<=2||
       s.targets.count(change.id)&&s.targets.at(change.id).kind>=1&&
       s.targets.at(change.id).kind<=2))cropChange=true;
    if(change.kind==2&&s.targets.count(change.id)&&
       s.targets.at(change.id).active&&
       (s.targets.at(change.id).kind==1||s.targets.at(change.id).kind==2)&&
       (!change.op||!change.flag||
        s.targets.at(change.id).x!=change.x||s.targets.at(change.id).z!=change.z))cropRemoved=true;
    if(change.kind==6||change.kind==2&&
      (change.op&&change.center==4||
       s.targets.count(change.id)&&s.targets.at(change.id).kind==4))centerChange=true;
    if(change.kind==5||change.kind==6)continue;
    if(change.kind!=4){planningChange=true;continue;}
    if(!change.op){planningChange=true;continue;}
    const auto found=s.targets.find(change.id);
    if(found!=s.targets.end()&&found->second.damageKnown&&
       found->second.status!=int(change.assigned))planningChange=true;
  }
  if(wallChange)s.wallRevision++;
  for(const Change& change:parsed){
    if(change.kind==2||change.kind==5)s.cropProtection.erase(change.id);
    invalidateDependents(s,change);
#ifdef WILD_DECLARATIVE_ATTACK
    if(change.kind==2||change.kind==5){
#ifdef WILD_DECLARATIVE_STATS
      s.attackWakeEvents++;
#endif
      for(auto& [actor,declaration]:s.attackDeclarations){
#ifdef WILD_DECLARATIVE_STATS
        s.attackWakeVisits++;
#endif
        if(!s.activeIntents.count(actor)){
#ifdef WILD_DECLARATIVE_STATS
          s.attackWakeIdle++;if(!declaration.dirty)s.attackWakeTransitions++;
#endif
          declaration.dirty=true;
        }
      }
    }
#endif
    if(!change.op){
      if(change.kind==1){const auto worker=s.workers.find(change.id);
        if(worker!=s.workers.end()&&worker->second.bodyBound)s.gateBodyActors.erase(worker->second.body);s.workers.erase(change.id);}
      else if(change.kind==2){
        const auto found=s.targets.find(change.id);
        if(found!=s.targets.end()){
          removeDamage(s,found->second);removeCropCell(s,found->second);
          s.targets.erase(found);
        }
      }else if(change.kind==3)s.tasks.erase(change.id);
      else if(const auto found=s.targets.find(change.id);found!=s.targets.end()){
        removeDamage(s,found->second);found->second.damageKnown=false;
      }
    }else if(change.kind==1){
      Worker next{change.id,change.center,change.x,change.z,change.flag,change.target!=0,change.rank};
      if(const auto old=s.workers.find(change.id);old!=s.workers.end()){
        next.bodyBound=old->second.bodyBound;next.body=old->second.body;
        if(!next.eligible&&!next.actionActive&&!next.bodyBound&&!next.body&&next.x==old->second.x&&next.z==old->second.z)next.inactiveSequence=old->second.inactiveSequence;}
      s.workers.insert_or_assign(change.id,next);
    }else if(change.kind==2){
      auto found=s.targets.find(change.id);
      if(found==s.targets.end()){
        auto inserted=s.targets.insert_or_assign(change.id,
          Target{change.id,change.x,change.z,change.flag,
            int(change.center),change.created,change.rank});
        if(int(change.center)==3)
          inserted.first->second.wallDepthScale=change.target?
            double(change.target)/100:1;
        addCropCell(s,inserted.first->second);
      }else{
        Target& target=found->second;
        removeDamage(s,target);removeCropCell(s,target);
        target.x=change.x;target.z=change.z;target.active=change.flag;
        target.kind=int(change.center);target.yaw=change.created;target.shape=change.rank;
        if(target.kind==3)target.wallDepthScale=change.target?
          double(change.target)/100:1;
        addDamage(s,target);addCropCell(s,target);
      }
    }else if(change.kind==4){
      const auto found=s.targets.find(change.id);
      if(found==s.targets.end()||found->second.kind!=int(change.center))continue;
      Target& target=found->second;
      removeDamage(s,target);
      target.hp=change.x;target.maxHp=change.z;target.status=int(change.assigned);
      target.material=int(change.target);target.damageKnown=true;
      addDamage(s,target);
    }else if(change.kind==5){
      const auto found=s.targets.find(change.id);
      if(found==s.targets.end()||found->second.kind>2)continue;
      found->second.cropSpecies=int(change.center);
      found->second.cropValue=change.x;
    }else if(change.kind==6){
      const auto found=s.targets.find(change.id);
      if(found==s.targets.end()||found->second.kind!=4)continue;
      found->second.serviceX=change.x;
      found->second.serviceZ=change.z;
      found->second.serviceKnown=true;
    }else{
      s.tasks.insert_or_assign(change.id,Task{change.id,change.center,
        change.target,change.assigned,change.created,change.rank,int(change.x)});
    }
  }
  s.sequence++;
  if(damageChange)s.damageRevision++;
  if(cropChange){s.cropRevision++;s.cropGroupsDirty=true;}
  if(!invalidPlantCenters.empty()){
    for(auto it=s.plantLeases.begin();it!=s.plantLeases.end();)
      if(invalidPlantCenters.count(it->second.center))it=s.plantLeases.erase(it);
      else ++it;
    centerChange=true;
  }
  if(cropRemoved||centerChange){s.plantSearches.clear();s.centerRevision++;}
  if(planningChange){s.entityRevision++;clearProposal(s);}
  return 1;
}
double nav_intent_last_sequence(){return double(state().sequence);}
double nav_intent_entity_revision(){return double(state().entityRevision);}
double nav_intent_damage_revision(){return double(state().damageRevision);}
double nav_intent_crop_revision(){return double(state().cropRevision);}
double nav_intent_topology_revision(){return double(lazy_route_revision());}
int nav_intent_worker_count(){return int(state().workers.size());}
int nav_intent_target_count(){return int(state().targets.size());}
int nav_intent_task_count(){return int(state().tasks.size());}
// Reconstruct only logical assignments after a saved game has projected its
// confirmed workers, targets and tasks. Route handles belong to the new
// session and are generated afterwards from current physical positions.
int nav_intent_restore_assigned_tasks(){
  IntentState& s=state();
  if(!s.reservedBodies.empty())return -3;
  if(!s.activeIntents.empty()||s.proposalOpen)return -1;
  std::vector<const Task*> assigned;
  assigned.reserve(s.tasks.size());
  std::unordered_set<uint64_t> actors;
  for(const auto& item:s.tasks){
    const Task& task=item.second;
    if(!task.assigned)continue;
    const auto worker=s.workers.find(task.assigned);
    const auto target=s.targets.find(task.target);
    if(worker==s.workers.end()||target==s.targets.end()||
       !target->second.active||worker->second.center!=task.center||
       !actors.insert(task.assigned).second)return -2;
    assigned.push_back(&task);
  }
  std::sort(assigned.begin(),assigned.end(),[](const Task* a,const Task* b){
    return a->id<b->id;
  });
  for(const Task* task:assigned){
    const Worker& worker=s.workers.at(task->assigned);
    const PlanningState mode=worker.actionActive?
      PlanningState::ActionActive:PlanningState::NeedsPlan;
    ActiveIntent intent{worker.id,task->id,task->target,mode,0,0,
      lazy_route_revision()};
    intent.profile=lazy_selected_context();
    s.activeIntents.insert_or_assign(worker.id,intent);
    s.byTarget[task->target].insert(worker.id);
    s.byTask[task->id].insert(worker.id);
  }
  return int(assigned.size());
}
// Sorted incrementally as structure HP events arrive. Queries copy only the
// requested result rows; they never rescan live crops, walls or navigation.
int nav_intent_damaged_structures(int kind){
  IntentState& s=state();s.damagedResults.clear();
  if(kind!=3&&kind!=4)return -1;
  const auto& index=kind==3?s.damagedWalls:s.damagedCenters;
  s.damagedResults.reserve(index.size()*8);
  for(const DamageKey& key:index){
    const auto found=s.targets.find(key.id);
    if(found==s.targets.end())continue;
    const Target& target=found->second;
    s.damagedResults.insert(s.damagedResults.end(),{
      double(target.id),target.hp,target.maxHp,key.ratio,double(target.status),
      double(target.material),double(s.damageRevision),target.active?1.0:0.0});
  }
  return int(s.damagedResults.size()/8);
}
const double* nav_intent_damaged_ptr(){return state().damagedResults.data();}
// The selected Wild Engine animal profile owns the protection verdict. Clients
// combine verdicts across relevant species; -1 is never certified protected.
int nav_intent_crop_groups(float radius){
  IntentState& s=state();rebuildCropGroups(s);
  s.cropGroupRows.clear();s.cropGroupMembers.clear();
  s.cropGroupRows.reserve(s.cropGroups.size()*12);
  const int profile=lazy_selected_context();
  if(profile<0||profile>=6)return -1;
  const uint32_t revision=lazy_route_revision();
  for(CropGroup& group:s.cropGroups){
    auto status=group.protection.find(profile);
    if(status==group.protection.end()||!status->second.valid||
       status->second.topology!=revision||status->second.radius!=radius){
      bool open=false,unknown=false;
      for(uint64_t id:group.crops){
        CropProtectionStatus& crop=s.cropProtection[id][profile];
        if(!crop.valid||crop.topology!=revision||crop.radius!=radius){
          crop={revision,radius,cropProtection(s.targets.at(id),radius),true};
        }
        open|=crop.result==0;unknown|=crop.result<0;
      }
      const int result=open?0:unknown?-1:1;
      status=group.protection.insert_or_assign(profile,
        CropProtectionStatus{revision,radius,result,true}).first;
    }
    const size_t offset=s.cropGroupMembers.size();
    for(uint64_t id:group.crops)s.cropGroupMembers.push_back(double(id));
    s.cropGroupRows.insert(s.cropGroupRows.end(),{double(group.id),group.value,
      group.x,group.z,group.minX,group.minZ,group.maxX,group.maxZ,
      double(status->second.result),double(offset),double(group.crops.size()),
      double(s.cropRevision)});
  }
  return int(s.cropGroups.size());
}
const double* nav_intent_crop_groups_ptr(){return state().cropGroupRows.data();}
const double* nav_intent_crop_members_ptr(){return state().cropGroupMembers.data();}

// A nearest-first lattice search over the currently resident farm window.
// The heap and visited cells persist across bounded calls. All geometry and
// bidirectional routes are checked by the authoritative native world.
int nav_intent_find_planting_site(double centerId,double minX,double minZ,
    double maxX,double maxZ,int budget,int reserve){
  IntentState& s=state();s.plantResult.fill(0);
  if(!integer(centerId)||!coordinate(minX)||!coordinate(minZ)||
     !coordinate(maxX)||!coordinate(maxZ)||minX>maxX||minZ>maxZ||
     budget<1||budget>4096||(reserve!=0&&reserve!=1))return -2;
  const uint64_t id=uint64_t(centerId);
  const auto found=s.targets.find(id);
  if(found==s.targets.end()||found->second.kind!=4||
     !found->second.active||!found->second.serviceKnown||
     !found->second.damageKnown||found->second.status!=0)return -2;
  const Target& center=found->second;
  const uint32_t revision=lazy_route_revision();
  for(auto it=s.plantLeases.begin();it!=s.plantLeases.end();)
    if(it->second.topology!=revision)it=s.plantLeases.erase(it);
    else ++it;
  PlantSearch& search=s.plantSearches[id];
  if(search.visited.empty()||search.topology!=revision||
     search.centerRevision!=s.centerRevision||
     search.minX!=minX||search.minZ!=minZ||
     search.maxX!=maxX||search.maxZ!=maxZ){
    search=PlantSearch{};
    search.minX=minX;search.minZ=minZ;search.maxX=maxX;search.maxZ=maxZ;
    search.topology=revision;search.centerRevision=s.centerRevision;
    const int loX=int(std::ceil(minX/1.5)),hiX=int(std::floor(maxX/1.5));
    const int loZ=int(std::ceil(minZ/1.5)),hiZ=int(std::floor(maxZ/1.5));
    if(loX>hiX||loZ>hiZ){s.plantResult[0]=0;return 0;}
    // Workers enter and leave through the service point. Ordering sites from
    // the building centroid can seed the far side first despite valid routes.
    const int sx=std::clamp(int(std::round(center.serviceX/1.5)),loX,hiX);
    const int sz=std::clamp(int(std::round(center.serviceZ/1.5)),loZ,hiZ);
    const double dx=sx*1.5-center.serviceX,dz=sz*1.5-center.serviceZ;
    search.pending.push({sx,sz,dx*dx+dz*dz});
    search.visited.insert(cropCell(sx,sz));
  }
  const int loX=int(std::ceil(minX/1.5)),hiX=int(std::floor(maxX/1.5));
  const int loZ=int(std::ceil(minZ/1.5)),hiZ=int(std::floor(maxZ/1.5));
  int examined=0;
  auto enqueue=[&](int x,int z){
    if(x<loX||x>hiX||z<loZ||z>hiZ)return;
    if(!search.visited.insert(cropCell(x,z)).second)return;
    const double dx=x*1.5-center.serviceX,dz=z*1.5-center.serviceZ;
    search.pending.push({x,z,dx*dx+dz*dz});
  };
  while(examined<budget&&!search.pending.empty()){
    const PlantCandidate candidate=search.pending.top();search.pending.pop();
    enqueue(candidate.x-1,candidate.z);enqueue(candidate.x+1,candidate.z);
    enqueue(candidate.x,candidate.z-1);enqueue(candidate.x,candidate.z+1);
    examined++;
    const double x=candidate.x*1.5,z=candidate.z*1.5;
    if(cropOccupied(s,x,z))continue;
    const int placement=spatial_crop_placement_valid(float(x),float(z));
    if(placement<0){
      search.pending.push(candidate);
      s.plantResult={-1,x,z,0,double(examined),double(s.cropRevision),
        double(revision),1};
      return -1;
    }
    if(!placement)continue;
    search.validTerrain++;
    const int outward=spatial_world_route_cached(float(center.serviceX),
      float(center.serviceZ),float(x),float(z));
    if(outward<0){
      search.pending.push(candidate);
      s.plantResult={-1,x,z,0,double(examined),double(s.cropRevision),
        double(revision),2};
      return -1;
    }
    if(!outward){search.blockedPaths++;continue;}
    const int returning=spatial_world_route_cached(float(x),float(z),
      float(center.serviceX),float(center.serviceZ));
    if(returning<0){
      search.pending.push(candidate);
      s.plantResult={-1,x,z,0,double(examined),double(s.cropRevision),
        double(revision),3};
      return -1;
    }
    if(!returning){search.blockedPaths++;continue;}
    uint64_t lease=0;
    if(reserve){
      lease=s.nextPlantLease++;
      s.plantLeases.emplace(lease,PlantLease{id,x,z,revision});
    }else search.pending.push(candidate);
    s.plantResult={1,x,z,double(lease),double(examined),double(s.cropRevision),
      double(revision),0};
    return 1;
  }
  const int status=search.pending.empty()?(search.validTerrain&&search.blockedPaths?3:0):2;
  s.plantResult={double(status),0,0,0,double(examined),double(s.cropRevision),
    double(revision),double(search.blockedPaths)};
  return status;
}
const double* nav_intent_planting_site_ptr(){return state().plantResult.data();}
int nav_intent_release_planting_site(double reservationId,int committed){
  if(!integer(reservationId)||(committed!=0&&committed!=1))return 0;
  IntentState& s=state();
  const auto found=s.plantLeases.find(uint64_t(reservationId));
  if(found==s.plantLeases.end())return 0;
  const uint64_t center=found->second.center;
  s.plantLeases.erase(found);
  if(!committed)s.plantSearches.erase(center);
  return 1;
}

// All eligible direct tasks are planned together in global FIFO order. Rows:
// task ID, worker ID, status (0 no candidate, 1 found, 2 blocked, 3 unknown),
// point offset, point count, unknown cause, approach X/Z. No lease changes until commit.
int nav_intent_plan_tasks(){
  IntentState& s=state();
  s.results.clear();s.routes.clear();s.proposals.clear();
  s.routeQueries=0;s.candidates=0;s.proposalOpen=true;
  s.plannedEntityRevision=s.entityRevision;
  s.plannedProfile=lazy_selected_context();
  std::vector<const Task*> tasks;
  tasks.reserve(s.tasks.size());
  for(const auto& item:s.tasks)if(!item.second.assigned)tasks.push_back(&item.second);
  std::sort(tasks.begin(),tasks.end(),[](const Task* a,const Task* b){
    if(a->created!=b->created)return a->created<b->created;
    if(a->rank!=b->rank)return a->rank<b->rank;
    return a->id<b->id;
  });
  std::unordered_set<uint64_t> reserved;
  std::vector<const Worker*> workers;
  for(const Task* task:tasks){
    const auto targetIt=s.targets.find(task->target);
    if(targetIt==s.targets.end()||!targetIt->second.active)continue;
    const Target& target=targetIt->second;
    if(task->kind==1&&(target.kind!=1&&target.kind!=2)||
       task->kind==2&&(target.kind!=3&&target.kind!=4)){
      s.results.clear();s.routes.clear();clearProposal(s);return -2;
    }
    const size_t at=s.results.size();
    s.results.insert(s.results.end(),{double(task->id),0,0,0,0,0,0,0});
    workers.clear();
    for(const auto& item:s.workers){
      const Worker& worker=item.second;
      if(worker.eligible&&worker.center==task->center&&!reserved.count(worker.id))
        workers.push_back(&worker);
    }
    std::sort(workers.begin(),workers.end(),[&](const Worker* a,const Worker* b){
      const double da=std::hypot(a->x-target.x,a->z-target.z);
      const double db=std::hypot(b->x-target.x,b->z-target.z);
      if(da!=db)return da<db;
      if(a->rank!=b->rank)return a->rank<b->rank;
      return a->id<b->id;
    });
    bool unknown=false;int unknownReason=0;
    for(const Worker* worker:workers){
      s.candidates++;s.planningCallsByActor[worker->id]++;
      const ServiceRoute route=findServiceRoute(*worker,target,task->kind);
      s.routeQueries+=route.queries;
      unknown|=route.unknown;
      if(route.unknown)unknownReason=route.unknownReason;
      if(!route.points.empty()){
        s.results[at+1]=double(worker->id);s.results[at+2]=1;
        s.results[at+3]=double(s.routes.size()/2);
        s.results[at+4]=double(route.points.size()/2);
        s.results[at+6]=route.approach.x;s.results[at+7]=route.approach.z;
        s.routes.insert(s.routes.end(),route.points.begin(),route.points.end());
        s.proposals.push_back({task->id,worker->id});reserved.insert(worker->id);
      }
      if(s.results[at+2]==1)break;
    }
    if(s.results[at+2]!=1){
      s.results[at+2]=unknown?3:workers.empty()?0:2;
      s.results[at+5]=unknown?unknownReason:0;
    }
  }
  // Route queries may materialize sectors. Bind the proposal to the resulting
  // graph revision, so only subsequent topology changes invalidate its lease.
  s.plannedGraphRevision=lazy_route_revision();
  return int(s.results.size()/resultWidth);
}
const double* nav_intent_results_ptr(){return state().results.data();}
const float* nav_intent_routes_ptr(){return state().routes.data();}
int nav_intent_route_point_count(){return int(state().routes.size()/2);}
double nav_intent_route_queries(){return double(state().routeQueries);}
double nav_intent_candidate_count(){return double(state().candidates);}
int nav_intent_discard(){clearProposal(state());return 1;}
// A proposal is stale after any entity delta, topology/portal/sector mutation
// or movement-profile change. JS commits the same assignments only on success.
static int commitTaskProposal(bool pendingResources){
  IntentState& s=state();
  if(!s.proposalOpen||s.plannedEntityRevision!=s.entityRevision||
    s.plannedGraphRevision!=lazy_route_revision()||
    s.plannedProfile!=lazy_selected_context()){clearProposal(s);return 0;}
  for(const auto& [taskId,workerId]:s.proposals){
    const auto task=s.tasks.find(taskId);
    const auto worker=s.workers.find(workerId);
    if(task==s.tasks.end()||worker==s.workers.end()||task->second.assigned||
      !worker->second.eligible){clearProposal(s);return 0;}
    const auto old=s.activeIntents.find(workerId);if(old!=s.activeIntents.end()&&old->second.farmArrivalRequest&&(!pendingResources||!nativeFarmArrivalRequestCurrent(s,old->second))){clearProposal(s);return 0;}if(old!=s.activeIntents.end()&&old->second.strollRequest&&(!pendingResources||!nativeIdleStrollRequestCurrent(s,old->second))){clearProposal(s);return 0;}if(old!=s.activeIntents.end()&&old->second.settlementBinding&&(!pendingResources||!nativeSettlementBodyCurrent(s,old->second))){clearProposal(s);return 0;}
    if(old!=s.activeIntents.end()&&old->second.initialIdleRequest&&(!pendingResources||!nativeInitialIdleRequestCurrent(s,old->second))){clearProposal(s);return 0;}
    if(old!=s.activeIntents.end()&&old->second.initialIdleBodyBinding&&(!pendingResources||!nativeInitialIdleBodyCurrent(s,old->second))){clearProposal(s);return 0;}
    const auto* ownedRoute=old!=s.activeIntents.end()&&old->second.slot<s.routeSlots.size()&&s.routeSlots[old->second.slot].active&&s.routeSlots[old->second.slot].actor==workerId&&s.routeSlots[old->second.slot].generation==old->second.generation?&s.routeSlots[old->second.slot]:nullptr;
    if(ownedRoute&&ownedRoute->idleStrollBinding&&(!pendingResources||old->second.profile!=lazy_selected_context()||!nativeHeldIdleStrollBodyCurrent(s,old->second,old->second.assignmentSequence,old->second.generation))){clearProposal(s);return 0;}
    // Farm keeps its physical endpoint through the unpublished Task request.
    // A completed23 needs no artificial24 suspension. Geometric arrival alone
    // cannot end a remaining native turn: require the actual terminal boundary.
    if(ownedRoute&&ownedRoute->farmArrivalBinding){
      const bool arrived=nativeCompletedFarmArrivalBodyCurrent(s,old->second);
      if(!pendingResources||old->second.profile!=lazy_selected_context()||!nativeHeldFarmArrivalBodyCurrent(s,old->second)&&!arrived){clearProposal(s);return 0;}
    }
    // A moved stationary body retains its actual cycle through the pending
    // task request. Only prepared TaskStart may acquire its next trajectory.
    if(old!=s.activeIntents.end()&&old->second.idleCycle&&(!pendingResources||!nativeIdleCycleCurrent(s,old->second))){clearProposal(s);return 0;}
  }
  for(const auto& [taskId,workerId]:s.proposals){
    s.tasks.at(taskId).assigned=workerId;s.workers.at(workerId).eligible=false;
    size_t at=0;
    while(at<s.results.size()&&s.results[at]!=double(taskId))at+=resultWidth;
    if(at==s.results.size())continue;
    if(at+4>=s.results.size()||s.results[at+2]!=1)continue;
    const size_t offset=size_t(s.results[at+3])*2;
    const size_t count=size_t(s.results[at+4])*2;
    if(offset+count>s.routes.size())continue;
    const auto existing=s.activeIntents.find(workerId);
    // The same pose-only transfer also retains a pending farm arrival. No
    // Idle/route history is fabricated; only prepared TaskStart may move it.
    const auto* ownedRoute=existing!=s.activeIntents.end()&&existing->second.slot<s.routeSlots.size()&&s.routeSlots[existing->second.slot].active&&s.routeSlots[existing->second.slot].actor==workerId&&s.routeSlots[existing->second.slot].generation==existing->second.generation?&s.routeSlots[existing->second.slot]:nullptr;
    const auto heldIdle=existing!=s.activeIntents.end()&&existing->second.farmArrivalRequest?std::static_pointer_cast<const NativeWorkerPoseResourceRequest>(existing->second.farmArrivalRequest):existing!=s.activeIntents.end()&&existing->second.strollRequest?std::static_pointer_cast<const NativeWorkerPoseResourceRequest>(existing->second.strollRequest):ownedRoute&&(ownedRoute->idleStrollBinding||ownedRoute->farmArrivalBinding)?captureHeldWorkerTaskSource(s,existing->second):nullptr;
    const auto stationary=existing!=s.activeIntents.end()?existing->second.settlementBinding:nullptr;
    const auto initialIdleBody=existing!=s.activeIntents.end()?existing->second.initialIdleBodyBinding:nullptr;
    const auto cycle=existing!=s.activeIntents.end()?existing->second.idleCycle:nullptr;
    if(existing!=s.activeIntents.end()){
      if(heldIdle)releaseIntent(s,workerId,PlanningState::Cancelled,false);
      else if(!stationary&&!initialIdleBody&&!cycle)releaseIntent(s,workerId,PlanningState::Cancelled);
      else {auto owners=s.byTarget.find(existing->second.target);if(owners!=s.byTarget.end()){owners->second.erase(workerId);if(owners->second.empty())s.byTarget.erase(owners);}clearRouteDependencies(s,existing->second);}
    }
    uint32_t slot=uint32_t(s.routeSlots.size());
    for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){slot=i;break;}
    if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
    RouteSlot& route=s.routeSlots[slot];
    route.points.assign(s.routes.begin()+offset,s.routes.begin()+offset+count);
    route.actor=workerId;route.originX=s.workers.at(workerId).x;route.originZ=s.workers.at(workerId).z;
    route.active=true;route.pendingResources=pendingResources;route.generation++;
    if(!route.generation)route.generation=1;
    ActiveIntent intent{workerId,taskId,s.tasks.at(taskId).target,
      pendingResources?PlanningState::AwaitingResources:PlanningState::RouteActive,slot,route.generation,lazy_route_revision()};
    intent.requiresResources=pendingResources;intent.profile=lazy_selected_context();intent.settlementBinding=stationary;intent.initialIdleBodyBinding=initialIdleBody;intent.idleCycle=cycle;intent.heldIdleTaskSource=heldIdle;
    // The completed moving source still needs its exact revocation in this
    // same request event; a previously suspended source was already revoked.
    if(heldIdle&&existing!=s.activeIntents.end()){intent.revokedSlot=existing->second.revokedSlot;intent.revokedGeneration=existing->second.revokedGeneration;}
    s.activeIntents.insert_or_assign(workerId,intent);
    s.byTarget[intent.target].insert(workerId);
    s.byTask[intent.task].insert(workerId);
    emitIntentChange(s,s.activeIntents.at(workerId));
  }
  if(!s.proposals.empty())s.entityRevision++;
  const int committed=int(s.proposals.size());clearProposal(s);return committed;
}
int nav_intent_commit(){return commitTaskProposal(false);}
// Claim the SAME global task batch without issuing an executable route.
// The allocated slot is the sole native draft; no second route registry.
EMSCRIPTEN_KEEPALIVE int nav_intent_commit_resource_requests(){return commitTaskProposal(true);}
#include "spatial-task-resource-requests.inc"
// Drain only changes caused by confirmed events or a committed task batch.
// Ordinary movement and ticks do not invoke the planner or emit rows.
EMSCRIPTEN_KEEPALIVE int nav_intent_protocol_version(){return intentProtocolVersion;}
int nav_intent_route_points(double,double,double);
int nav_intent_route_timing(double,double,double);
#include "spatial-gate-api.inc"
EMSCRIPTEN_KEEPALIVE int nav_intent_change_width(){return intentChangeWidth;}
EMSCRIPTEN_KEEPALIVE uint32_t nav_intent_session(){return state().session;}
EMSCRIPTEN_KEEPALIVE double nav_intent_transition_sequence(){return double(state().intentSequence);}
EMSCRIPTEN_KEEPALIVE double nav_intent_effective_time(){return state().effectiveTime;}
#include "spatial-causal-clock-api.inc"
// A structural bootstrap/recovery read, not another route registry or planner.
// Rows: actor, session, slot, generation, original assignment sequence/time.
// Reading this does not drain the ordered changes needed by the legacy mover.
EMSCRIPTEN_KEEPALIVE int nav_intent_control_snapshot(){
  IntentState& s=state();s.controlSnapshot.clear();
  std::vector<uint64_t> actors;
  for(const auto& [actor,intent]:s.activeIntents){
    if(intent.state!=PlanningState::RouteActive)continue;
    if(!intent.generation||intent.slot>=s.routeSlots.size()||
       !s.routeSlots[intent.slot].active||
       s.routeSlots[intent.slot].generation!=intent.generation||
       !intent.assignmentSequence)return -1;
    actors.push_back(actor);
  }
  std::sort(actors.begin(),actors.end());
  for(uint64_t actor:actors){
    const ActiveIntent& intent=s.activeIntents.at(actor);
    s.controlSnapshot.insert(s.controlSnapshot.end(),{double(actor),double(s.session),
      double(intent.slot),double(intent.generation),double(intent.assignmentSequence),
      intent.assignedAt});
  }
  return int(actors.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_control_snapshot_ptr(){return state().controlSnapshot.data();}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_validation_count(){return double(state().routeValidations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_validation_segments(){return double(state().routeValidationSegments);}
EMSCRIPTEN_KEEPALIVE double nav_intent_reconcile_candidate_count(){return double(state().reconcileCandidates);}
// The simulation supplies its clock at the command/event boundary, never at
// graphical preparation/drain time. A restore starts a new native session.
EMSCRIPTEN_KEEPALIVE int nav_intent_set_time(double elapsed){
  IntentState& s=state();
  if(!std::isfinite(elapsed)||elapsed<s.effectiveTime)return 0;
  if(s.causalClock&&elapsed!=s.effectiveTime)return 0;
  if(s.executionEnabled&&elapsed!=s.effectiveTime)return 0;
  if(elapsed!=s.effectiveTime&&!gateStaticProofCurrent(s))return 0;
  s.effectiveTime=elapsed;return 1;
}
int nav_intent_change_count(){return int(state().intentChanges.size()/intentChangeWidth);}
const double* nav_intent_change_ptr(){return state().intentChanges.data();}
void nav_intent_clear_changes(){state().intentChanges.clear();}
double nav_intent_invalidation_count(){return double(state().invalidations);}
double nav_intent_actor_planning_calls(double actorId){
  if(!integer(actorId))return 0;
  const auto found=state().planningCallsByActor.find(uint64_t(actorId));
  return found==state().planningCallsByActor.end()?0:double(found->second);
}
int nav_intent_retire_actor(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
#ifdef WILD_DECLARATIVE_ATTACK
  clearAttackDeadline(s,actor);s.attackDeclarations.erase(actor);
#endif
  const auto active=s.activeIntents.find(actor);
  if(active!=s.activeIntents.end()){
    // The caller has already removed this actor from the confirmed game.
    // Retirement must revoke a published route; a late graphical load may
    // retain this actor's handle. Keep this transition in the same ordered log.
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  s.planningCallsByActor.erase(actor);
  return 1;
}
// A read-only fingerprint of the route just stopped on the existing slot.
// No event-history lookup or retained registry of old assignments is needed.
EMSCRIPTEN_KEEPALIVE int nav_intent_stopped_route_matches(double actor,double session,double slot,double generation,double assignment,double body,double expectedState,double at){
  const auto& s=state();if(!integer(actor)||!integer(session)||!integer(slot,true)||slot>double(UINT32_MAX)||!integer(generation)||generation>double(UINT32_MAX)||!integer(assignment)||!integer(body)||!std::isfinite(at)||at<0||session!=double(s.session)||slot>=s.routeSlots.size()||(expectedState!=0&&expectedState!=4))return 0;
  const auto found=s.activeIntents.find(uint64_t(actor));if(found==s.activeIntents.end())return 0;const auto& intent=found->second;const auto& route=s.routeSlots[size_t(slot)];
  if(double(intent.state)!=expectedState||double(intent.assignmentSequence)!=assignment||route.actor!=uint64_t(actor)||route.reservationBody!=uint64_t(body))return 0;
  if(expectedState==4){uint32_t next=uint32_t(generation)+1;if(!next)next=1;return intentHasSuspendedRoute(s,intent)&&intent.slot==uint32_t(slot)&&route.generation==next&&route.suspendedAt==at;}
  return !route.active&&!route.suspended&&!intent.generation&&route.generation==uint32_t(uint32_t(generation)+1);
}
int nav_intent_actor(double actorId){
  IntentState& s=state();s.intentResult.fill(0);
  if(!integer(actorId))return 0;
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end())return 0;
  const ActiveIntent& intent=found->second;
  s.intentResult={double(intent.actor),double(int(intent.state)),
    double(intent.task),double(intent.target),double(s.session),
    intent.state==PlanningState::RouteActive?double(intent.slot):0,
    intent.state==PlanningState::RouteActive?double(intent.generation):0,double(intent.topology),
    double(s.entityRevision),double(lazy_route_revision())};
  return 1;
}
const double* nav_intent_actor_ptr(){return state().intentResult.data();}
int nav_intent_route_points(double session,double slot,double generation){
  const IntentState& s=state();
  if(!integer(session)||!integer(slot,true)||!integer(generation)||
    session!=double(s.session)||slot>=s.routeSlots.size()||
    generation>double(UINT32_MAX))return -1;
  const RouteSlot& route=s.routeSlots[size_t(slot)];
  return route.active&&!route.suspended&&!route.pendingResources&&route.generation==uint32_t(generation)?
    int(route.points.size()/2):-1;
}
const float* nav_intent_route_ptr(double session,double slot,double generation){
  const IntentState& s=state();
  if(!integer(session)||session!=double(s.session)||!integer(slot,true)||
     slot>=s.routeSlots.size()||!integer(generation)||
     generation>double(UINT32_MAX))return nullptr;
  const RouteSlot& route=s.routeSlots[size_t(slot)];
  return route.active&&!route.suspended&&!route.pendingResources&&route.generation==uint32_t(generation)?
    route.points.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_timing(double session,double slot,double generation){
  IntentState& s=state();s.timingResult.fill(0);
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const RouteSlot& route=s.routeSlots[size_t(slot)];
  if(!route.timingMode)return 0;
  const auto intent=s.activeIntents.find(route.actor);
  if(intent==s.activeIntents.end()||intent->second.slot!=uint32_t(slot)||
     intent->second.generation!=uint32_t(generation))return -1;
  const double distance=route.distances.empty()?0:route.distances.back();
  s.timingResult={1,double(route.actor),route.startTime,routeTimeAtDistance(route,distance),
    route.speed,route.radius,route.originX,route.originZ,distance,double(route.distances.size()),
    double(route.timingMode),double(intent->second.assignmentSequence),double(route.profile),session,slot,generation,
    route.runDistance,route.runSpeed,route.runBudget,double(route.motionFlags)};
  return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_timing_ptr(){return state().timingResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_hold_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_initial_hold(double session,double slot,double generation){
  auto& s=state();s.holdResult.fill(0);if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];if(!route.timingMode||!route.waitGate)return 0;
  s.holdResult={double(route.waitGate),route.startTime,route.departureTime};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_initial_hold_ptr(){return state().holdResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_holds_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_gate_candidate(double session,double slot,double generation){
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  return state().routeSlots[size_t(slot)].gateCandidate?1:0;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_holds(double session,double slot,double generation){
  auto& s=state();s.routeHoldResult.clear();if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];if(!route.timingMode)return -1;
  for(const auto& hold:route.holds)s.routeHoldResult.insert(s.routeHoldResult.end(),{double(hold.gate),hold.distance,hold.from,hold.until});
  return int(route.holds.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_holds_ptr(){return state().routeHoldResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_time_knots(double session,double slot,double generation){
  auto& s=state();s.routeKnotResult.clear();if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];if(!route.timingMode)return -1;
  s.routeKnotResult.push_back(route.startTime);reservationKnots({&route},route.startTime,s.routeKnotResult);
  std::sort(s.routeKnotResult.begin(),s.routeKnotResult.end());
  s.routeKnotResult.erase(std::unique(s.routeKnotResult.begin(),s.routeKnotResult.end()),s.routeKnotResult.end());
  return int(s.routeKnotResult.size());
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_time_knots_ptr(){return state().routeKnotResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_timing_width(){return 20;}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_sample_width(){return 18;}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_distances_ptr(double session,double slot,double generation){
  const IntentState& s=state();
  if(nav_intent_route_points(session,slot,generation)<0)return nullptr;
  const RouteSlot& route=s.routeSlots[size_t(slot)];return route.timingMode?route.distances.data():nullptr;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_sample(double session,double slot,double generation,double at){
  IntentState& s=state();s.sampleResult.fill(0);
  if(!std::isfinite(at)||at<0)return -3;
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const RouteSlot& route=s.routeSlots[size_t(slot)];if(!route.timingMode)return 0;
  s.sampleResult=sampleRouteTiming(route,at);s.routeTimeSamples++;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_sample_ptr(){return state().sampleResult.data();}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_time_samples(){return double(state().routeTimeSamples);}
EMSCRIPTEN_KEEPALIVE int nav_intent_timing_rejection(){return state().timingRejection;}

// Prepare the route already selected by any worker intention, not another route
// request. Policy facts are supplied only at this boundary; speed/phase rules
// and the entire timetable are native. A successful change revokes the old
// generation atomically; a failed proof leaves it untouched.
EMSCRIPTEN_KEEPALIVE int nav_intent_route_prepare_motion(double session,double slot,
    double generation,double radius,int flags,double runBudget){
  IntentState& s=state();s.timingRejection=0;
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& old=s.routeSlots[size_t(slot)];
  const auto intent=s.activeIntents.find(old.actor);
  if(intent==s.activeIntents.end()||intent->second.slot!=uint32_t(slot)||
     intent->second.generation!=uint32_t(generation)||intent->second.state!=PlanningState::RouteActive||
     old.reserved||intent->second.routeCursor||old.points.empty()||
     s.effectiveTime!=intent->second.assignedAt)return -2;
  // Before native logical execution owns current position/budget, a late
  // upgrade must not restart an old route from its original position.
  const int mode=intent->second.animal?1:2;
  // Entering/retreat speed transitions are not yet represented by mode 1.
  if(mode==1&&old.timingMode!=1)return -2;
  double x=old.originX,z=old.originZ;
  const int previous=lazy_selected_context();
  if(previous!=intent->second.profile)spatial_select_nav_profile_index(intent->second.profile);
  RouteSlot candidate;candidate.points=old.points;
  const int result=prepareRouteTiming(candidate,intent->first,x,z,s.effectiveTime,radius,mode,flags,runBudget);
  const uint32_t topology=lazy_route_revision();
  if(previous!=intent->second.profile)spatial_select_nav_profile_index(previous);
  recordTimingResult(s,result);if(result!=1)return -7;
  releaseRoute(s,intent->second);
  candidate.active=true;candidate.generation=old.generation+1;
  if(!candidate.generation)candidate.generation=1;
  old=std::move(candidate);
  auto& active=intent->second;active.slot=uint32_t(slot);active.generation=old.generation;
  active.routeStartX=float(x);active.routeStartZ=float(z);active.routeCursor=0;active.topology=topology;
  active.timingMode=mode;active.timingRadius=radius;active.motionFlags=flags;active.runBudget=runBudget;
  emitIntentChange(s,active);
  nav_intent_route_timing(session,slot,double(old.generation));return 1;
}

EMSCRIPTEN_KEEPALIVE int nav_intent_route_reserve(double session,double slot,double generation,double body){
  IntentState& s=state();s.reservationResult.fill(0);
  if(!integer(body,true)||nav_intent_route_points(session,slot,generation)<0)return -1;
  auto& route=s.routeSlots[size_t(slot)];
  const auto found=s.activeIntents.find(route.actor);
  if(!route.timingMode||route.gateCandidate||found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive||
     found->second.slot!=uint32_t(slot)||found->second.generation!=uint32_t(generation))return -2;
  if(route.reserved)return route.reservationBody==uint64_t(body)?1:-3;
  if(s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp())return -2;
  if(route.startTime!=s.effectiveTime||route.points.empty()||found->second.routeCursor)return -2;
  const int previous=lazy_selected_context();
  if(previous!=route.profile)spatial_select_nav_profile_index(route.profile);
  const bool topology=found->second.topology==lazy_route_revision();
  if(previous!=route.profile)spatial_select_nav_profile_index(previous);
  if(!topology||route.staticProofStamp!=executionWorldStamp())return -2;
  SpatialBodyView physical;
  if(!spatialReadBody(uint64_t(body),physical)||physical.kind!=(found->second.animal?1:0)||!(physical.flags&1)||
     (found->second.animal&&(physical.flags&6))||
     (!found->second.animal&&bool(physical.flags&2)!=bool(route.motionFlags&32))||
     physical.x!=route.originX||physical.z!=route.originZ||
     physical.r!=route.radius||s.reservedBodies.count(uint64_t(body)))return -3;
  s.reservationChecks++;
  if(!reserveRouteClear(s,found->second,route,uint64_t(body),physical))return 0;
  route.reserved=true;route.reservationBody=uint64_t(body);
  s.reservedBodies.emplace(uint64_t(body),uint32_t(slot));
  s.residencyPinRevision++;
  if(s.executionEnabled){s.executionEvaluations++;projectExecutedPose(s,route,sampleRouteTiming(route,s.effectiveTime));}
  return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_reservation_result_ptr(){return state().reservationResult.data();}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_reservation_count(){return int(state().reservedBodies.size());}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_reservation_checks(){return double(state().reservationChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_reservation_pairs(){return double(state().reservationPairs);}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_reservation_body_checks(){return double(state().reservationBodyChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_route_reservation_mutation_candidates(){return double(state().reservationMutationCandidates);}

EMSCRIPTEN_KEEPALIVE int nav_intent_execution_begin(){return beginRouteExecution(state());}
EMSCRIPTEN_KEEPALIVE int nav_intent_execution_advance(double at){return advanceRouteExecution(state(),at);}
EMSCRIPTEN_KEEPALIVE int nav_intent_execution_stop(){
  auto& s=state();const int count=int(s.reservedBodies.size());
  for(const auto& [body,slot]:s.reservedBodies)if(!executionBindingCoherent(s,body,slot))return -3;
  while(!s.reservedBodies.empty()){
    const auto actor=s.routeSlots[s.reservedBodies.begin()->second].actor;
    auto& intent=s.activeIntents.at(actor);releaseRoute(s,intent);
    intent.state=PlanningState::NeedsPlan;emitIntentChange(s,intent);s.invalidations++;
  }
  s.executionEnabled=false;return count;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_route_execution(double session,double slot,double generation){
  auto& s=state();s.executionResult.fill(0);
  if(nav_intent_route_points(session,slot,generation)<0)return -1;
  const auto& route=s.routeSlots[size_t(slot)];
  if(!s.executionEnabled||!route.reserved||!route.hasExecution)return 0;
  s.executionResult=route.executionPose;return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_route_execution_ptr(){return state().executionResult.data();}
#include "spatial-task-cancellation-source.inc"
int nav_animal_crop_state(double actor);
#include "spatial-task-execution.inc"
#include "spatial-task-action-proposal.inc"
#include "spatial-task-consequence-proposal.inc"
#include "spatial-task-settlement-proposal.inc"
#include "spatial-home-resource-request.inc"
#include "spatial-initial-idle-resource-request.inc"
#include "spatial-farm-arrival-resource-request.inc"
#include "spatial-initial-idle-body-proposal.inc"
#include "spatial-idle-cycle-proposal.inc"
#include "spatial-idle-stroll-resource-request.inc"
#include "spatial-idle-stroll-proposal.inc"
#include "spatial-home-route-proposal.inc"
#include "spatial-farm-arrival-route-proposal.inc"
#include "spatial-home-arrival-proposal.inc"
#include "spatial-animal-route-proposal.inc"
#include "spatial-animal-strike-proposal.inc"
EMSCRIPTEN_KEEPALIVE double nav_intent_execution_advances(){return double(state().executionAdvances);}
EMSCRIPTEN_KEEPALIVE double nav_intent_execution_evaluations(){return double(state().executionEvaluations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_execution_body_updates(){return double(state().executionBodyUpdates);}
EMSCRIPTEN_KEEPALIVE double nav_intent_execution_stop_invalidations(){return double(state().executionStopInvalidations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_candidates(){return double(state().staticMutationCandidates);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_segments(){return double(state().staticMutationSegments);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_body_checks(){return double(state().staticMutationBodyChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_revocations(){return double(state().staticMutationRevocations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_rejected(){return double(state().staticMutationRejected);}
EMSCRIPTEN_KEEPALIVE double nav_intent_static_mutation_commits(){return double(state().staticMutationCommits);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_candidates(){return double(state().residencyCandidates);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_segments(){return double(state().residencySegments);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_body_checks(){return double(state().residencyBodyChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_revocations(){return double(state().residencyRevocations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_rejected(){return double(state().residencyRejected);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_commits(){return double(state().residencyCommits);}
EMSCRIPTEN_KEEPALIVE double nav_intent_residency_pin_revision(){return double(state().residencyPinRevision);}
EMSCRIPTEN_KEEPALIVE int nav_intent_props_mutation_version(){return 1;}
EMSCRIPTEN_KEEPALIVE int nav_intent_terrain_mutation_version(){return 1;}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_candidates(){return double(state().terrainCandidates);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_segments(){return double(state().terrainSegments);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_body_checks(){return double(state().terrainBodyChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_revocations(){return double(state().terrainRevocations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_rejected(){return double(state().terrainRejected);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_commits(){return double(state().terrainCommits);}
EMSCRIPTEN_KEEPALIVE double nav_intent_terrain_recipe_chunks(){return double(state().terrainRecipeChunks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_candidates(){return double(state().propMutationCandidates);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_segments(){return double(state().propMutationSegments);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_body_checks(){return double(state().propMutationBodyChecks);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_revocations(){return double(state().propMutationRevocations);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_rejected(){return double(state().propMutationRejected);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_commits(){return double(state().propMutationCommits);}
EMSCRIPTEN_KEEPALIVE double nav_intent_props_mutation_recipe_chunks(){return double(state().propMutationRecipeChunks);}

// A topological event may be unrelated to an active worker path. Validate the
// pinned polyline against the updated native collision map at this boundary,
// rather than discarding every route merely because the global revision moved.
// The continuous mover still performs its ordinary local collision checks.
bool activeRouteClear(IntentState& s,const ActiveIntent& intent){
  s.routeValidations++;
  if(intent.slot>=s.routeSlots.size())return false;
  const RouteSlot& route=s.routeSlots[intent.slot];
  if(!route.active||route.generation!=intent.generation||
     route.points.size()<2||route.points.size()%2)return false;
  const auto worker=s.workers.find(intent.actor);
  if(!intent.animal&&worker==s.workers.end())return false;
  double x=intent.animal?intent.routeStartX:worker->second.x;
  double z=intent.animal?intent.routeStartZ:worker->second.z;
  if(route.reserved&&route.hasExecution){x=route.executionPose[0];z=route.executionPose[1];}
  if(intent.routeCursor>route.points.size()/2||
     !spatial_local_clear(x,z,x,z))return false;
  for(size_t i=size_t(intent.routeCursor)*2;i<route.points.size();i+=2){
    s.routeValidationSegments++;
    const float nextX=route.points[i],nextZ=route.points[i+1];
    // The local predicate accepts only short connector segments. World routes
    // may contain validated shortcuts spanning several cells.
    if(route.timingMode){
      const int clear=route.workerDrySweep?spatialWorkerFlightSegmentClear(x,z,nextX,nextZ,route.radius):route.gateAdmitted?spatialGateCandidateSegmentClear(x,z,nextX,nextZ,route.radius):
        spatial_execution_segment_clear(x,z,nextX,nextZ,route.radius);
      if(clear!=1)return false;
    }else if(!spatial_world_segment_clear(x,z,nextX,nextZ))return false;
    x=nextX;z=nextZ;
  }
  return true;
}
#ifdef WILD_SECTOR_CHANGE_TRACE
// Diagnostic only: inspect the real pinned route/cursor without mutating it.
int nav_intent_debug_route_clear(double actorId){
  if(!integer(actorId))return -1;
  IntentState& s=state();const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)return -1;
  const int previous=lazy_selected_context();
  if(previous!=found->second.profile)spatial_select_nav_profile_index(found->second.profile);
  const bool clear=activeRouteClear(s,found->second);
  if(previous!=found->second.profile)spatial_select_nav_profile_index(previous);
  return clear?1:0;
}
#endif
// JS movement consumes a suffix of the pinned native route. At a topology
// event, accept that progress only when every remaining point exactly matches
// the native suffix. An unmatched JS path forces a conservative reroute at
// this event boundary; ordinary movement ticks never call this entry point.
float* nav_intent_route_progress_input_ptr(int count){
  if(count<0||count>4096)return nullptr;
  IntentState& s=state();s.routeProgressInput.resize(size_t(count)*2);
  return s.routeProgressInput.data();
}
int nav_intent_route_progress(double actorId,double x,double z,int count){
  if(!integer(actorId)||!coordinate(x)||!coordinate(z)||
     count<0||count>4096)return -1;
  IntentState& s=state();const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||
     found->second.state!=PlanningState::RouteActive)return 0;
  ActiveIntent& intent=found->second;
  if(intent.slot>=s.routeSlots.size())return 0;
  const RouteSlot& route=s.routeSlots[intent.slot];
  if(!route.active||route.generation!=intent.generation)return 0;
  // A reservation must not silently adopt a JS detour/cursor. Logical native
  // execution will advance it; until connected, release explicitly first.
  if(route.reserved)return 0;
  cancelGateMotionProposal(s);
  const auto reject=[&](){
    intent.routeCursor=uint32_t(route.points.size()/2+1);
    s.changedRouteActors.insert(intent.actor);
    return 0;
  };
  if(route.points.size()%2||size_t(count)*2>route.points.size()||
     s.routeProgressInput.size()!=size_t(count)*2)return reject();
  const size_t cursor=route.points.size()/2-size_t(count);
  if(cursor<intent.routeCursor)return reject();
  for(size_t i=0;i<size_t(count)*2;i++)
    if(route.points[cursor*2+i]!=s.routeProgressInput[i])return reject();
  if(!count&&route.points.size()>=2&&
     std::hypot(double(x)-route.points[route.points.size()-2],
                double(z)-route.points.back())>.1)return reject();
  intent.routeCursor=uint32_t(cursor);
  // Transitional JS motion can arrive from a local detour rather than from the
  // original route corridor. At this event boundary add its current connector
  // and validate it even if the changed sector had no old subscriber there.
  if(count){
    const size_t before=intent.routeSectors.size();
    const int original=lazy_selected_context();
    if(original!=intent.profile)spatial_select_nav_profile_index(intent.profile);
    subscribeRouteSegment(s,intent,x,z,route.points[cursor*2],route.points[cursor*2+1]);
    if(original!=intent.profile)spatial_select_nav_profile_index(original);
    if(intent.routeSectors.size()!=before)s.changedRouteActors.insert(intent.actor);
  }
  if(intent.animal){intent.routeStartX=float(x);intent.routeStartZ=float(z);}
  return 1;
}
int nav_intent_reconcile_topology(){
  IntentState& s=state();const int originalProfile=lazy_selected_context();
  // Synchronize each participating native profile once. Sector commits enqueue
  // only subscribers, so an unrelated wall no longer walks all live polylines.
  for(int profile=0;profile<6;profile++)
    if(!s.profileParticipants[profile].empty()&&lazy_selected_context()!=profile)
      spatial_select_nav_profile_index(profile);
  std::set<uint64_t> candidates;
  candidates.swap(s.changedRouteActors);
  s.reconcileCandidates+=candidates.size();
  std::vector<std::pair<uint64_t,uint32_t>> affected;
  for(uint64_t actor:candidates){
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end())continue;
    ActiveIntent& intent=found->second;
    // Retained suffixes are re-proved by an explicit native resume event, not
    // converted into generic planner requests by an unrelated sector update.
    if(intentHasSuspendedRoute(s,intent))continue;
    if(lazy_selected_context()!=intent.profile)
      spatial_select_nav_profile_index(intent.profile);
    const uint32_t revision=lazy_route_revision();
    if(intent.topology==revision)continue;
    if((intent.state==PlanningState::RouteActive||intent.state==PlanningState::AwaitingResources)&&activeRouteClear(s,intent)){
      intent.topology=revision;
      continue;
    }
    if(intent.state==PlanningState::RouteActive||intent.state==PlanningState::AwaitingResources||
       intent.state==PlanningState::WaitingUnknown||
       intent.state==PlanningState::WaitingBlocked)
      affected.emplace_back(actor,revision);
  }
  if(lazy_selected_context()!=originalProfile)
    spatial_select_nav_profile_index(originalProfile);
  std::sort(affected.begin(),affected.end());
  for(const auto& [actor,revision]:affected){
    ActiveIntent& intent=s.activeIntents.at(actor);
    if(intent.animal){
#ifdef WILD_DECLARATIVE_ATTACK
      const auto declaration=s.attackDeclarations.find(actor);
      if(declaration!=s.attackDeclarations.end())declaration->second.dirty=true;
#endif
      // A wall can invalidate the travel route without invalidating the
      // target or its exclusive lease. The caller supplies the animal's live
      // position at this event boundary for a same-target native reroute.
      releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
      intent.topology=revision;emitIntentChange(s,intent);s.invalidations++;
      continue;
    }
    stopRouteForEvent(s,intent);
    intent.topology=revision;emitIntentChange(s,intent);s.invalidations++;
  }
  return int(affected.size());
}
// Replan an invalidated animal route from its confirmed continuous position.
// A failed route to one interaction point cannot certify the target blocked:
// another side may remain reachable, so keep the lease and report unknown.
int nav_intent_replan_attack_route(double actorId,double startX,double startZ,
                                   double approachX,double approachZ){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !coordinate(approachX)||!coordinate(approachZ))return -1;
  IntentState& s=state();s.timingRejection=0;const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.state!=PlanningState::NeedsPlan)return -2;
  ActiveIntent& intent=found->second;
  const auto target=s.targets.find(intent.target);
  if(target==s.targets.end()||!target->second.active){
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);return -3;
  }
  s.planningCallsByActor[actor]++;
  const int count=spatial_world_route_cached(float(startX),float(startZ),
    float(approachX),float(approachZ));
  if(count<=0){
    intent.state=PlanningState::WaitingUnknown;
    intent.topology=lazy_route_revision();
    emitIntentChange(s,intent);
    return 3;
  }
  const float* points=spatial_world_route_ptr();
  RouteSlot candidate;
  if(intent.timingMode){
    candidate.points.assign(points,points+size_t(count)*2);
    const int timing=prepareRouteTiming(candidate,actor,startX,startZ,s.effectiveTime,
      intent.timingRadius,intent.timingMode);
    recordTimingResult(s,timing);
    if(timing!=1){
      intent.state=PlanningState::WaitingUnknown;intent.topology=lazy_route_revision();
      emitIntentChange(s,intent);return 3;
    }
  }
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)
    if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  if(intent.timingMode){candidate.generation=route.generation;route=std::move(candidate);}
  else route.points.assign(points,points+size_t(count)*2);
  route.actor=actor;route.originX=startX;route.originZ=startZ;
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  intent.slot=slot;intent.generation=route.generation;
  intent.state=PlanningState::RouteActive;
  intent.topology=lazy_route_revision();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  intent.routeCursor=0;
  emitIntentChange(s,intent);
  return 1;
}
// Called at an event boundary after the JS authority projects current actor
// positions. The target and reservation survive a route-only invalidation.
int nav_intent_replan_pending_routes(){
  IntentState& s=state();std::vector<uint64_t> actors;
  for(const auto& item:s.activeIntents)
    if(!item.second.animal&&!item.second.home&&
       item.second.state==PlanningState::NeedsPlan)
      actors.push_back(item.first);
  std::sort(actors.begin(),actors.end());
  int planned=0;
  for(uint64_t actor:actors){
    ActiveIntent& intent=s.activeIntents.at(actor);
    const auto worker=s.workers.find(actor);
    const auto task=s.tasks.find(intent.task);
    const auto target=s.targets.find(intent.target);
    if(worker==s.workers.end()||task==s.tasks.end()||
       target==s.targets.end()||!target->second.active||
       task->second.assigned!=actor){
      releaseIntent(s,actor,PlanningState::Cancelled);continue;
    }
    const ServiceRoute service=findServiceRoute(worker->second,target->second,
      task->second.kind);
    s.routeQueries+=service.queries;
    if(!service.points.empty()){
      uint32_t slot=uint32_t(s.routeSlots.size());
      for(uint32_t j=0;j<s.routeSlots.size();j++)if(!s.routeSlots[j].active){slot=j;break;}
      if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
      RouteSlot& route=s.routeSlots[slot];
      route.points=service.points;route.actor=actor;
      route.originX=worker->second.x;route.originZ=worker->second.z;
      // Replanning must not silently reuse a possibly spent worker run budget.
      // The next motion-preparation event supplies current policy facts again.
      route.timingMode=0;intent.timingMode=0;
      route.active=true;route.pendingResources=intent.requiresResources;route.generation++;
      if(!route.generation)route.generation=1;
      intent.slot=slot;intent.generation=route.generation;
      intent.routeCursor=0;
      intent.state=intent.requiresResources?PlanningState::AwaitingResources:PlanningState::RouteActive;intent.topology=lazy_route_revision();
      planned++;
    }
    if(intent.state!=PlanningState::RouteActive&&intent.state!=PlanningState::AwaitingResources){
      intent.state=service.unknown?PlanningState::WaitingUnknown:PlanningState::WaitingBlocked;
      intent.topology=lazy_route_revision();
    }
  }
  // One actor may materialize a sector used by a later query in this same
  // deterministic batch. Bind all surviving proposals to the final graph
  // revision; otherwise the next event boundary would replan an older actor
  // merely because another actor loaded a sector afterwards.
  const uint32_t finalRevision=lazy_route_revision();
  for(uint64_t actor:actors){
    const auto found=s.activeIntents.find(actor);
    if(found!=s.activeIntents.end()&&
       (found->second.state==PlanningState::RouteActive||
        found->second.state==PlanningState::AwaitingResources||
        found->second.state==PlanningState::WaitingUnknown||
        found->second.state==PlanningState::WaitingBlocked)){
      found->second.topology=finalRevision;
      emitIntentChange(s,found->second);
    }
  }
  return planned;
}
// An exceptional movement failure is an explicit event, not a tick poll.
// Keep the task and target; the caller projects the actor's current position
// before requesting this same-intention route replacement.
int nav_intent_request_reroute(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||
     (found->second.state!=PlanningState::RouteActive&&
      found->second.state!=PlanningState::AwaitingResources&&
      found->second.state!=PlanningState::WaitingUnknown&&
      found->second.state!=PlanningState::WaitingBlocked))return 0;
  ActiveIntent& intent=found->second;
#ifdef WILD_DECLARATIVE_ATTACK
  const auto declaration=s.attackDeclarations.find(uint64_t(actorId));
  if(declaration!=s.attackDeclarations.end())declaration->second.dirty=true;
#endif
  releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
  intent.topology=lazy_route_revision();
  emitIntentChange(s,intent);s.invalidations++;
  return 1;
}
// Transitional animal-intent lease. The JS raid selector still supplies its
// confirmed physical route; no native attack policy is inferred from it.
float* nav_intent_attack_route_input_ptr(int count){
  if(count<0||count>4096)return nullptr;
  IntentState& s=state();s.attackRouteInput.resize(size_t(count)*2);
  return s.attackRouteInput.data();
}
static int registerAttackRoute(double actorId,double targetId,
                               double startX,double startZ,int count,int timingMode,
                               double timingRadius,bool publish){
  if(!integer(actorId)||!integer(targetId)||!coordinate(startX)||
     !coordinate(startZ)||count<0||count>4096||(timingMode!=0&&timingMode!=1)||
     timingMode==1&&(!std::isfinite(timingRadius)||timingRadius<=0||timingRadius>2))return -1;
  IntentState& s=state();s.timingRejection=0;
  if(s.attackRouteInput.size()<size_t(count)*2)return -1;
  const uint64_t actor=uint64_t(actorId),targetIdValue=uint64_t(targetId);
  const auto target=s.targets.find(targetIdValue);
  if(target==s.targets.end()||!target->second.active||
     target->second.kind>=3&&target->second.damageKnown&&
     target->second.status!=0)return -2;
  float x=float(startX),z=float(startZ);
  for(int i=0;i<count;i++){
    const float nextX=s.attackRouteInput[size_t(i)*2],
      nextZ=s.attackRouteInput[size_t(i)*2+1];
    if(!std::isfinite(nextX)||!std::isfinite(nextZ)||
       !coordinate(nextX)||!coordinate(nextZ))return -1;
    if(!spatial_world_segment_clear(x,z,nextX,nextZ))return -5;
    x=nextX;z=nextZ;
  }
  const auto owners=s.byTarget.find(targetIdValue);
  if(target->second.kind!=4&&owners!=s.byTarget.end())
    for(uint64_t owner:owners->second){
      const auto old=s.activeIntents.find(owner);
      if(owner!=actor&&old!=s.activeIntents.end()&&old->second.animal&&
         old->second.lease)
        return -3;
    }
  const auto prior=s.activeIntents.find(actor);
  if(prior!=s.activeIntents.end()){
    if(!prior->second.animal||prior->second.requiresResources||prior->second.state==PlanningState::ActionActive)
      return -4;
  }
  RouteSlot candidate;
  if(timingMode){
    candidate.points.assign(s.attackRouteInput.begin(),s.attackRouteInput.begin()+size_t(count)*2);
    const int timing=prepareRouteTiming(candidate,actor,startX,startZ,s.effectiveTime,timingRadius,timingMode);
    recordTimingResult(s,timing);if(timing!=1)return -7;
  }
  if(prior!=s.activeIntents.end()){
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  if(timingMode){candidate.generation=route.generation;route=std::move(candidate);}
  else route.points.assign(s.attackRouteInput.begin(),
    s.attackRouteInput.begin()+size_t(count)*2);
  route.actor=actor;route.originX=startX;route.originZ=startZ;
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  ActiveIntent intent{actor,0,targetIdValue,PlanningState::RouteActive,
    slot,route.generation,lazy_route_revision(),true,false};
  intent.profile=lazy_selected_context();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  intent.timingMode=timingMode;intent.timingRadius=timingMode?timingRadius:0;
  s.activeIntents.insert_or_assign(actor,intent);
  s.byTarget[targetIdValue].insert(actor);
  if(publish)emitIntentChange(s,s.activeIntents.at(actor));
  return 1;
}
int nav_intent_register_attack(double actorId,double targetId,
                               double startX,double startZ,int count,int timingMode=0,
                               double timingRadius=0){
  return registerAttackRoute(actorId,targetId,startX,startZ,count,timingMode,timingRadius,true);
}
// The raid controller has already committed the retreat transition. Pin a
// physical route to its confirmed exit without acquiring an attack lease.
// A missing or unresolved route leaves JS's existing exit recovery available.
static int planAnimalRetreat(const FinishedAnimalStrike* source,double actorId,double startX,double startZ,
                            double exitX,double exitZ){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !coordinate(exitX)||!coordinate(exitZ))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  if(!source&&s.finishedAnimalStrike&&s.finishedAnimalStrike->actor==actor)return -2;
  const auto prior=s.activeIntents.find(actor);
  if(prior!=s.activeIntents.end()){
    if(source||prior->second.requiresResources||!prior->second.animal||prior->second.state==PlanningState::ActionActive)
      return -2;
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  s.planningCallsByActor[actor]++;
  const int count=spatial_world_route_cached(float(startX),float(startZ),
    float(exitX),float(exitZ));
  if(count<=0)return count<0?3:0;
  const float* points=spatial_world_route_ptr();
  if(source){
    if(points[2*count-2]!=float(exitX)||points[2*count-1]!=float(exitZ))return 0;
    double x=startX,z=startZ;
    for(int i=0;i<count;i++){
      const double nx=points[2*i],nz=points[2*i+1];
      const int clear=spatial_animal_attack_segment_clear(x,z,nx,nz,source->radius);
      if(clear!=1)return clear==-1?3:0;
      x=nx;z=nz;
    }
  }
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)
    if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  route.points.assign(points,points+size_t(count)*2);
  route.actor=actor;route.originX=startX;route.originZ=startZ;
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  ActiveIntent intent{actor,0,0,PlanningState::RouteActive,
    slot,route.generation,lazy_route_revision(),true,false};
  intent.retreat=true;intent.lease=false;
  intent.profile=lazy_selected_context();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  intent.approachX=float(exitX);intent.approachZ=float(exitZ);
  intent.approachKnown=true;
  if(source){
    auto request=std::make_shared<NativeAnimalRouteRequest>();
    request->actor=actor;request->body=source->body;request->at=s.effectiveTime;
    request->x=startX;request->z=startZ;request->heading=source->yaw;
    request->phase=source->phase;request->radius=source->radius;
    request->targetX=exitX;request->targetZ=exitZ;
    intent.requiresResources=true;route.pendingResources=true;
    intent.state=PlanningState::AwaitingResources;intent.resourceRequestedAt=s.effectiveTime;
    intent.animalRouteRequest=request;
    auto& installed=s.activeIntents.insert_or_assign(actor,intent).first->second;
    request->sequence=emitIntentChange(s,installed);installed.resourceRequestSequence=request->sequence;
  }else{
    s.activeIntents.insert_or_assign(actor,intent);
    emitIntentChange(s,s.activeIntents.at(actor));
  }
  return 1;
}

int nav_intent_plan_retreat(double actor,double x,double z,double exitX,double exitZ){
  return planAnimalRetreat(nullptr,actor,x,z,exitX,exitZ);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_plan_finished_retreat(double actor,double attack,double exitX,double exitZ){
  auto& s=state();
  if(s.proposalOpen||s.barrierProposal.pending||s.worldMutationPreview||
     nav_animal_finished_strike_snapshot(actor)!=1||s.finishedAnimalStrike->attack!=attack)return -2;
  const auto& source=*s.finishedAnimalStrike;
  return planAnimalRetreat(&source,actor,source.x,source.z,exitX,exitZ);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_finish_retreat(double actor,double assignment){
  if(nav_animal_crop_state(actor)!=2)return 0;
  auto& s=state();const auto& intent=s.activeIntents.at(uint64_t(actor));
  const auto& route=s.routeSlots[intent.slot];const auto& binding=route.animalRouteBinding;
  if(!intent.retreat||!binding||binding->assignmentSequence!=assignment||route.executionPose[6]!=1||
     route.executionPose[0]!=float(binding->source->targetX)||route.executionPose[1]!=float(binding->source->targetZ))return 0;
  releaseIntent(s,intent.actor,PlanningState::Cancelled);s.activeIntents.erase(uint64_t(actor));
  return 1;
}
// Restore a saved continuous route verbatim when its remaining points are
// still physically valid. Handles from the previous session are never reused.
int nav_intent_restore_retreat(double actorId,double startX,double startZ,
                               double exitX,double exitZ,int count){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !coordinate(exitX)||!coordinate(exitZ)||count<=0||count>4096)return -1;
  IntentState& s=state();
  if(s.finishedAnimalStrike&&s.finishedAnimalStrike->actor==uint64_t(actorId))return -2;
  if(s.attackRouteInput.size()<size_t(count)*2)return -1;
  float x=float(startX),z=float(startZ);
  for(int i=0;i<count;i++){
    const float nextX=s.attackRouteInput[size_t(i)*2],
      nextZ=s.attackRouteInput[size_t(i)*2+1];
    if(!coordinate(nextX)||!coordinate(nextZ)||
       !spatial_world_segment_clear(x,z,nextX,nextZ))return 0;
    x=nextX;z=nextZ;
  }
  if(std::hypot(double(x)-exitX,double(z)-exitZ)>.1)return 0;
  const uint64_t actor=uint64_t(actorId);
  const auto prior=s.activeIntents.find(actor);
  if(prior!=s.activeIntents.end()){
    if(prior->second.requiresResources||!prior->second.animal||prior->second.state==PlanningState::ActionActive)
      return -2;
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)
    if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  route.points.assign(s.attackRouteInput.begin(),
    s.attackRouteInput.begin()+size_t(count)*2);
  route.actor=actor;route.originX=startX;route.originZ=startZ;
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  ActiveIntent intent{actor,0,0,PlanningState::RouteActive,
    slot,route.generation,lazy_route_revision(),true,false};
  intent.retreat=true;intent.lease=false;
  intent.profile=lazy_selected_context();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  intent.approachX=float(exitX);intent.approachZ=float(exitZ);
  intent.approachKnown=true;
  s.activeIntents.insert_or_assign(actor,intent);
  emitIntentChange(s,s.activeIntents.at(actor));
  return 1;
}
// A worker's confirmed return/flight to its village is a route-only
// intention. It does not claim a task or make the worker eligible for one.
// The caller may supply a saved remaining suffix, which is accepted only
// after every segment passes the current native static collision check.
int workerHomeRoute(double actorId,double startX,double startZ,
                    double homeX,double homeZ,int savedCount){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !coordinate(homeX)||!coordinate(homeZ)||savedCount<0||savedCount>4096)
    return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  if(s.workers.find(actor)==s.workers.end())return -2;
  if(savedCount){
    if(s.attackRouteInput.size()<size_t(savedCount)*2)return -1;
    float x=float(startX),z=float(startZ);
    for(int i=0;i<savedCount;i++){
      const float nextX=s.attackRouteInput[size_t(i)*2],
        nextZ=s.attackRouteInput[size_t(i)*2+1];
      if(!coordinate(nextX)||!coordinate(nextZ)||
         !spatial_world_segment_clear(x,z,nextX,nextZ))return 0;
      x=nextX;z=nextZ;
    }
    if(std::hypot(double(x)-homeX,double(z)-homeZ)>.1)return 0;
  }
  const auto prior=s.activeIntents.find(actor);
  if(prior!=s.activeIntents.end()){
    if(prior->second.requiresResources||prior->second.animal||prior->second.state==PlanningState::ActionActive)
      return -2;
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  if(!savedCount)s.planningCallsByActor[actor]++;
  const int count=savedCount?savedCount:spatial_world_route_cached(
    float(startX),float(startZ),float(homeX),float(homeZ));
  if(count<=0)return count<0?3:0;
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)
    if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  const float* points=savedCount?s.attackRouteInput.data():
    spatial_world_route_ptr();
  route.points.assign(points,points+size_t(count)*2);
  route.actor=actor;route.originX=startX;route.originZ=startZ;
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  ActiveIntent intent{actor,0,0,PlanningState::RouteActive,
    slot,route.generation,lazy_route_revision(),false,false};
  intent.home=true;intent.lease=false;
  intent.profile=lazy_selected_context();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  intent.approachX=float(homeX);intent.approachZ=float(homeZ);
  intent.approachKnown=true;
  s.activeIntents.insert_or_assign(actor,intent);
  emitIntentChange(s,s.activeIntents.at(actor));
  return 1;
}
int nav_intent_plan_home(double actorId,double startX,double startZ,
                         double homeX,double homeZ){
  return workerHomeRoute(actorId,startX,startZ,homeX,homeZ,0);
}
int nav_intent_restore_home(double actorId,double startX,double startZ,
                            double homeX,double homeZ,int count){
  if(count<=0)return -1;
  return workerHomeRoute(actorId,startX,startZ,homeX,homeZ,count);
}
int nav_intent_cancel_home(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.home||found->second.requiresResources)return 0;
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  return 1;
}
// An attack site is a dynamic lease, separate from the reusable geometric
// route. Reject overlapping sites before replacing an existing intention.
static int registerAttackSite(double actorId,double targetId,
                                    double startX,double startZ,int count,
                                    double approachX,double approachZ,
                                    double radius,int timingMode,bool publish){
  if(!integer(actorId)||!coordinate(approachX)||!coordinate(approachZ)||
      !std::isfinite(radius)||radius<=0||radius>2||(timingMode!=0&&timingMode!=1))return -1;
  IntentState& s=state();
  for(const auto& [owner,intent]:s.activeIntents){
    // A retreat route records its exit as an approach coordinate, but has no
    // attack-site lease. Only committed attack leases exclude another site.
    if(owner==uint64_t(actorId)||!intent.animal||!intent.lease||
       !intent.approachKnown||
       intent.state==PlanningState::Cancelled)continue;
    const double distance=std::hypot(double(intent.approachX)-approachX,
                                     double(intent.approachZ)-approachZ);
    if(distance<double(intent.approachRadius)+radius+0.1)return -6;
  }
  const int result=registerAttackRoute(actorId,targetId,startX,startZ,count,timingMode,radius,publish);
  if(result!=1)return result;
  ActiveIntent& intent=s.activeIntents.at(uint64_t(actorId));
  intent.approachX=float(approachX);intent.approachZ=float(approachZ);
  intent.approachRadius=float(radius);intent.approachKnown=true;
  return result;
}
int nav_intent_register_attack_site(double actorId,double targetId,
                                    double startX,double startZ,int count,
                                    double approachX,double approachZ,
                                    double radius,int timingMode=0){
  return registerAttackSite(actorId,targetId,startX,startZ,count,approachX,approachZ,radius,timingMode,true);
}
// A center can survive a strike. Its next action starts at the same validated
// site, with a fresh preparation and the previous action's same physical body.
EMSCRIPTEN_KEEPALIVE int nav_animal_plan_finished_center(double actorId,double attackId,double targetId,double approachX,double approachZ){
  auto& s=state();
  if(!integer(actorId)||!integer(attackId)||!integer(targetId)||
     !coordinate(approachX)||!coordinate(approachZ))return -1;
  if(s.barrierProposal.pending||s.worldMutationPreview||s.proposalOpen)return -4;
  if(nav_animal_finished_strike_snapshot(actorId)!=1)return 0;
  const auto& finished=*s.finishedAnimalStrike;
  const auto target=s.targets.find(finished.target);
  if(finished.attack!=attackId||finished.target!=targetId||finished.target!=finished.center||
     target==s.targets.end()||!intactAttackCenter(target->second)||
     finished.x!=float(approachX)||finished.z!=float(approachZ))return -2;
  const int site=registerAttackSite(actorId,targetId,finished.x,finished.z,0,
    approachX,approachZ,finished.radius,0,false);
  if(site!=1)return site;
  const int request=nav_animal_route_request(actorId,double(finished.body),targetId,0,finished.yaw,finished.phase);
  if(request!=1){
    releaseIntent(s,finished.actor,PlanningState::Cancelled,false);
    s.activeIntents.erase(finished.actor);
  }
  return request;
}
// Capture only crop groups whose interaction regions were proven unreachable
// when this wall intention began. A later topology event can then ask whether
// the animal gained a new agricultural opportunity without probing crops on
// ordinary ticks or treating unknown sectors as a sealed enclosure.
int nav_intent_track_wall_opportunities(double actorId,double startX,
                                        double startZ,double radius){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2)return -1;
  IntentState& s=state();const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.profile!=lazy_selected_context())return -2;
  const auto target=s.targets.find(found->second.target);
  if(target==s.targets.end()||target->second.kind!=3)return -2;
  int x=0,z=0;
  if(!attackSourceAnchor(startX,startZ,x,z))return -1;
  rebuildCropGroups(s);
  ActiveIntent& intent=found->second;
  for(uint64_t group:intent.blockedCropGroups){
    auto it=s.byBlockedCropGroup.find(group);
    if(it!=s.byBlockedCropGroup.end()){
      it->second.erase(intent.actor);
      if(it->second.empty())s.byBlockedCropGroup.erase(it);
    }
  }
  intent.blockedCropGroups.clear();
  for(CropGroup& group:s.cropGroups)
    if(attackGroupAccess(s,group,float(radius),x,z)==0){
      intent.blockedCropGroups.push_back(group.id);
      s.byBlockedCropGroup[group.id].insert(intent.actor);
    }
  return int(intent.blockedCropGroups.size());
}
// Return only wall intentions that depended on a proven blocked crop group.
// The caller supplies current continuous positions for this small candidate
// set; no all-animal scan is needed when a barrier changes.
int nav_intent_wall_opportunity_candidates(){
  IntentState& s=state();std::set<uint64_t> actors;
  for(const auto& [group,dependents]:s.byBlockedCropGroup)
    actors.insert(dependents.begin(),dependents.end());
  s.wallOpportunityActors.assign(actors.begin(),actors.end());
  return int(s.wallOpportunityActors.size());
}
const double* nav_intent_wall_opportunity_candidates_ptr(){
  return state().wallOpportunityActors.data();
}
// Called only after a confirmed barrier/topology event. A newly reachable
// group is a reason to reconsider a wall target; this is not a crop route or
// a speculative change to the active reservation.
int nav_intent_reconsider_wall_opportunity(double actorId,double startX,
                                           double startZ,double radius){
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2)return -1;
  IntentState& s=state();const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.profile!=lazy_selected_context())return -2;
  ActiveIntent& intent=found->second;
  if(intent.tacticalPending)return 1;
  if(intent.blockedCropGroups.empty())return 0;
  int x=0,z=0;
  if(!attackSourceAnchor(startX,startZ,x,z))return -1;
  rebuildCropGroups(s);
  for(CropGroup& group:s.cropGroups)
    if(std::find(intent.blockedCropGroups.begin(),
                 intent.blockedCropGroups.end(),group.id)!=
       intent.blockedCropGroups.end()&&
       attackGroupAccess(s,group,float(radius),x,z)==1){
      intent.tacticalPending=true;
      return 1;
    }
  return 0;
}
// One event-triggered crop intention: group value -> reachable interaction
// region -> individual crop -> native route and lease. No tick-time polling or
// per-crop graph searches are needed for a sealed group. Ambiguous geometry
// returns unknown so the established selector can handle it during migration.
const double* nav_intent_attack_result_ptr(){return state().attackResult.data();}
const double* nav_intent_wall_attack_result_ptr(){
  return state().wallAttackResult.data();
}
double* nav_intent_attack_blockers_ptr(int count){
  if(count<0||count>100000)return nullptr;
  IntentState& s=state();s.attackBlockers.resize(size_t(count)*3);
  return s.attackBlockers.data();
}
double* nav_intent_attack_reserved_targets_ptr(int count){
  if(count<0||count>100000)return nullptr;
  IntentState& s=state();s.attackReservedTargets.resize(size_t(count));
  return s.attackReservedTargets.data();
}
struct AnimalCropStart { double body, center, yaw, phase; bool entering; };
static int planAttackCrop(double actorId,double startX,double startZ,
                                double radius,int cropsEligible,int blockerCount,
                                int reservedTargetCount,int timingMode,const AnimalCropStart* start){
  IntentState& s=state();s.attackResult.fill(0);s.timingRejection=0;
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2||
     (cropsEligible!=0&&cropsEligible!=1)||
     blockerCount<0||blockerCount>100000||
     s.attackBlockers.size()!=size_t(blockerCount)*3||
     reservedTargetCount<0||reservedTargetCount>100000||
     s.attackReservedTargets.size()!=size_t(reservedTargetCount)||
      lazy_selected_context()==1||(timingMode!=0&&timingMode!=1))return -1;
  for(int i=0;i<blockerCount;i++){
    const size_t offset=size_t(i)*3;
    if(!coordinate(s.attackBlockers[offset])||
       !coordinate(s.attackBlockers[offset+1])||
       !std::isfinite(s.attackBlockers[offset+2])||
       s.attackBlockers[offset+2]<=0||s.attackBlockers[offset+2]>2)return -1;
  }
  std::unordered_set<uint64_t> transientLeases;
  transientLeases.reserve(size_t(reservedTargetCount));
  for(int i=0;i<reservedTargetCount;i++){
    const double id=s.attackReservedTargets[size_t(i)];
    if(!integer(id))return -1;
    transientLeases.insert(uint64_t(id));
  }
  const uint64_t actor=uint64_t(actorId);
  if(s.activeIntents.count(actor))return -2;
  s.planningCallsByActor[actor]++;
  if(!cropsEligible)return 0;
  rebuildCropGroups(s);
  if(s.cropGroups.empty())return 0;
  struct Anchor {int x,z;double distance;};
  std::vector<Anchor> starts;
  for(int x:{int(std::floor(startX)),int(std::ceil(startX))})
    for(int z:{int(std::floor(startZ)),int(std::ceil(startZ))})
      if(spatial_local_clear(float(startX),float(startZ),float(x),float(z))&&
         lazy_weak_region(x,z)>=0)
        starts.push_back({x,z,std::hypot(startX-x,startZ-z)});
  if(starts.empty()){
    s.attackResult[0]=3;s.attackResult[7]=1;return 3;
  }
  std::sort(starts.begin(),starts.end(),[](const Anchor& a,const Anchor& b){
    if(a.distance!=b.distance)return a.distance<b.distance;
    return a.x!=b.x?a.x<b.x:a.z<b.z;
  });
  const Anchor source=starts.front();
  bool unknown=false,eligible=false,occupied=false;
  // Diagnostic bits only; they do not change the planner's tri-state result.
  // 1 source connector, 2 region connectivity, 4 crop sites, 8 route,
  // 16 connected candidates whose bounded local search did not finish.
  int unknownCauses=0;
  int regionQueries=0,routeQueries=0,preferredTrials=0,siteTrials=0;
  int lastRouteCount=std::numeric_limits<int>::min();
  int lastPreferredRouteCount=std::numeric_limits<int>::min();
  int lastRegisterResult=std::numeric_limits<int>::min();
  uint64_t firstCandidateCrop=0;
  const auto leased=[&](uint64_t cropId){
    if(transientLeases.count(cropId))return true;
    const auto owners=s.byTarget.find(cropId);
    if(owners==s.byTarget.end())return false;
    for(uint64_t owner:owners->second){
      const auto active=s.activeIntents.find(owner);
      if(active!=s.activeIntents.end()&&active->second.animal&&
         active->second.lease)return true;
    }
    return false;
  };
  for(CropGroup& group:s.cropGroups){
    for(uint64_t cropId:group.crops)if(s.targets.at(cropId).active){
      if(leased(cropId))occupied=true;
      else eligible=true;
    }
    const AttackSiteCache& cache=attackSitesFor(s,group,float(radius));
    std::unordered_set<uint64_t> located;
    std::vector<const AttackSite*> candidates;
    for(const auto& [region,sites]:cache.byRegion){
      for(const AttackSite& site:sites)located.insert(site.crop);
      const AttackSite& first=sites.front();
      regionQueries++;
      const int connected=lazy_connected(source.x,source.z,first.x,first.z);
      if(connected<0){
        unknown=true;unknownCauses|=2;
        // Preserve every native connectivity reason encountered across groups.
        // Reasons are 0..10; bits 8..18 are reserved for this diagnostic.
        const int reason=lazy_connected_reason();
        if(reason>=0&&reason<=10)unknownCauses|=1<<(8+reason);
        if(reason==8&&!s.attackResult[12]&&
           lazy_connected_frontier_valid()){
          s.attackResult[10]=lazy_connected_frontier_x();
          s.attackResult[11]=lazy_connected_frontier_z();
          s.attackResult[12]=1;
        }
        continue;
      }
      if(!connected)continue;
      for(const AttackSite& site:sites)candidates.push_back(&site);
    }
    if(located.size()<group.crops.size()){
      unknown=true;unknownCauses|=4;
    }
    std::sort(candidates.begin(),candidates.end(),[&](const AttackSite* a,
                                                       const AttackSite* b){
      const Target& left=s.targets.at(a->crop),&right=s.targets.at(b->crop);
      const double dl=std::hypot(left.x-startX,left.z-startZ);
      const double dr=std::hypot(right.x-startX,right.z-startZ);
      if(dl!=dr)return dl<dr;
      if(a->crop!=b->crop)return a->crop<b->crop;
      const double al=std::hypot(a->px-startX,a->pz-startZ);
      const double ar=std::hypot(b->px-startX,b->pz-startZ);
      return al!=ar?al<ar:a->region<b->region;
    });
    int attempted=0;
    bool groupRouteAttempted=false;
    std::unordered_set<uint64_t> preferredTried;
    const auto tryPoint=[&](const Target& crop,float px,float pz){
      for(int i=0;i<blockerCount;i++){
        const size_t offset=size_t(i)*3;
        if(std::hypot(s.attackBlockers[offset]-double(px),
                      s.attackBlockers[offset+1]-double(pz))<
           radius+s.attackBlockers[offset+2]-1e-8){
          occupied=true;return false;
        }
      }
      for(const auto& [owner,intent]:s.activeIntents){
        if(owner==actor||!intent.animal||!intent.approachKnown||
           intent.state==PlanningState::Cancelled)continue;
        if(std::hypot(double(intent.approachX)-px,
                      double(intent.approachZ)-pz)<
           double(intent.approachRadius)+radius+0.1){
          occupied=true;return false;
        }
      }
      groupRouteAttempted=true;
      routeQueries++;
      const int count=spatial_world_route_cached(float(startX),float(startZ),px,pz);
      lastRouteCount=count;
      if(count<0){unknown=true;unknownCauses|=8;return false;}
      if(!count)return false;
      const float* route=spatial_world_route_ptr();
      s.attackRouteInput.assign(route,route+size_t(count)*2);
      lastRegisterResult=registerAttackSite(actorId,double(crop.id),
        startX,startZ,count,px,pz,radius,timingMode,!start);
      if(lastRegisterResult!=1)
        return false;
      if(start){
        // This actor has no executable assignment until the renderer is ready.
        // Publish only the resource request, after both leases have been attached.
        const double center=start->center?start->center:double(crop.id);
        lastRegisterResult=nav_animal_route_request(actorId,start->body,center,start->entering, start->yaw,start->phase);
        if(lastRegisterResult!=1){
          releaseIntent(s,actor,PlanningState::Cancelled,false);
          s.activeIntents.erase(actor);
          return false;
        }
      }
      const ActiveIntent& intent=s.activeIntents.at(actor);
      s.attackResult={1,double(crop.id),double(px),double(pz),
        double(s.session),double(intent.slot),double(intent.generation),
        double(group.id),double(regionQueries),double(routeQueries)};
      return true;
    };
    for(const AttackSite* site:candidates){
      const Target& crop=s.targets.at(site->crop);
      if(!crop.active)continue;
      if(leased(crop.id)){occupied=true;continue;}
      if(attempted++>=16){
        // The bounded local search has learned no new topology if every
        // candidate was already leased by another active attacker.
        if(groupRouteAttempted){unknown=true;unknownCauses|=16;}
        else occupied=true;
        break;
      }
      if(!firstCandidateCrop)firstCandidateCrop=crop.id;
      if(preferredTried.insert(crop.id).second){
        const double angle=std::atan2(startX-crop.x,startZ-crop.z);
        const float px=float(crop.x+std::sin(angle)*(.6+radius));
        const float pz=float(crop.z+std::cos(angle)*(.6+radius));
        // The group is already known to have a reachable interaction region.
        // A fractional point may use another grid connector, or even a
        // physically clear direct segment, when its rounded cell appears
        // disconnected beside a newly opened wall corner. Let the native
        // route planner validate this one preferred point itself.
        preferredTrials++;
        const bool found=tryPoint(crop,px,pz);
        lastPreferredRouteCount=lastRouteCount;
        if(found)return 1;
      }
      siteTrials++;
      if(tryPoint(crop,site->px,site->pz))return 1;
    }
    // A connected region with no successful local route is inconclusive,
    // not proof that all other positions in that region are inaccessible.
    if(!candidates.empty()&&groupRouteAttempted){
      unknown=true;unknownCauses|=16;
    }
  }
  // A temporarily leased approach is an occupancy wait, never proof that
  // a sector is missing or that the crop group is physically sealed.
  s.attackResult[0]=unknown?3:occupied?4:eligible?2:0;
  s.attackResult[1]=double(firstCandidateCrop);
  s.attackResult[2]=preferredTrials;
  s.attackResult[3]=lastPreferredRouteCount;
  s.attackResult[4]=siteTrials;
  s.attackResult[5]=lastRouteCount;
  s.attackResult[6]=lastRegisterResult;
  s.attackResult[7]=unknownCauses;
  s.attackResult[8]=regionQueries;s.attackResult[9]=routeQueries;
  return int(s.attackResult[0]);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_plan_finished_crop(double actor,double x,double z,double radius,
                                int cropsEligible,int blockers,int reserved,int timed){
  if(nav_animal_finished_strike_snapshot(actor)!=1)return -2;
  const auto& finished=*state().finishedAnimalStrike;
  if(x!=finished.x||z!=finished.z||radius!=finished.radius||timed!=0)return -2;
  const AnimalCropStart start{double(finished.body),finished.center==finished.target?0.:double(finished.center),finished.yaw,finished.phase,false};
  return planAttackCrop(actor,x,z,radius,cropsEligible,blockers,reserved,0,&start);
}
EMSCRIPTEN_KEEPALIVE int nav_animal_plan_flight_crop(double actor,double x,double z,double radius,
 int cropsEligible,int blockers,int reserved,int timed,double session,double worker,double seq,double body,double center,double yaw,double phase){
  SpatialBodyView v;
  if(timed!=0||!integer(actor)||actor==worker||!integer(body)||!integer(center)||!std::isfinite(yaw)||!std::isfinite(phase)||phase<0||
     !spatialReadBody(uint64_t(body),v)||v.kind!=1||v.flags!=1||v.x!=x||v.z!=z||v.r!=radius||
     state().finishedAnimalStrike||state().activeIntents.size()!=1||
     flightCropOriginClear(session,worker,seq,x,z,radius,2)!=1)return -2;
  const AnimalCropStart start{body,center,yaw,phase,true};
  return planAttackCrop(actor,x,z,radius,cropsEligible,blockers,reserved,0,&start);
}
int nav_intent_plan_attack_crop(double actorId,double startX,double startZ,
                                double radius,int cropsEligible,int blockerCount,
                                int reservedTargetCount,int timingMode=0){
  return planAttackCrop(actorId,startX,startZ,radius,cropsEligible,blockerCount,reservedTargetCount,timingMode,nullptr);
}
#ifdef WILD_DECLARATIVE_ATTACK
#ifdef WILD_DECLARATIVE_STATS
void nav_declarative_attack_wake_reset(){auto& s=state();s.attackWakeEvents=s.attackWakeVisits=s.attackWakeIdle=s.attackWakeTransitions=0;}
double nav_declarative_attack_wake_events(){return double(state().attackWakeEvents);}
double nav_declarative_attack_wake_visits(){return double(state().attackWakeVisits);}
double nav_declarative_attack_wake_idle(){return double(state().attackWakeIdle);}
double nav_declarative_attack_wake_transitions(){return double(state().attackWakeTransitions);}
#endif
// The embedding supplies current actor position and the existing transient
// collision/lease facts at an event boundary. No movement policy is replaced.
int nav_declarative_attack_declare(double actorId,double x,double z,double radius,
                                   int eligible,int blockers,int reserved){
  IntentState& s=state();
  if(!integer(actorId)||s.attackDeclarations.count(uint64_t(actorId)))return -2;
  const int profile=lazy_selected_context();
  const int result=nav_intent_plan_attack_crop(actorId,x,z,radius,eligible,blockers,reserved);
  if(result>=0)s.attackDeclarations.emplace(uint64_t(actorId),
    IntentState::AttackDeclaration{radius,profile,false});
  return result;
}
int nav_declarative_attack_present(double actorId){
  return integer(actorId)&&state().attackDeclarations.count(uint64_t(actorId))?1:0;
}
// Adopt an already restored crop route without changing its lease or route.
int nav_declarative_attack_adopt(double actorId,double radius){
  if(!integer(actorId)||!std::isfinite(radius)||radius<=0||radius>2)return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  if(s.attackDeclarations.count(actor))return 0;
  const auto active=s.activeIntents.find(actor);
  if(active==s.activeIntents.end()||!active->second.animal||
     active->second.state!=PlanningState::RouteActive)return -2;
  const auto target=s.targets.find(active->second.target);
  if(target==s.targets.end()||!target->second.active||
     (target->second.kind!=1&&target->second.kind!=2))return -3;
  s.attackDeclarations.emplace(actor,IntentState::AttackDeclaration{
    radius,active->second.profile,false});return 1;
}
int nav_declarative_attack_reconcile(double actorId,double x,double z,
                                     int eligible,int blockers,int reserved){
  if(!integer(actorId)||!coordinate(x)||!coordinate(z)||
     (eligible!=0&&eligible!=1)||blockers<0||blockers>100000||
     reserved<0||reserved>100000)return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto declaration=s.attackDeclarations.find(actor);
  if(declaration==s.attackDeclarations.end())return -2;
  if(!declaration->second.dirty)return 5;
  if(lazy_selected_context()!=declaration->second.profile)return -3;
  if(!validAttackTransients(s,blockers,reserved))return -1;
  const auto active=s.activeIntents.find(actor);
  if(active!=s.activeIntents.end()){
    if(active->second.state==PlanningState::ActionActive)return 6;
    if(active->second.state!=PlanningState::NeedsPlan)return 7;
    const int result=nav_intent_replan_attack_route(actorId,x,z,
      active->second.approachX,active->second.approachZ);
    if(result==3&&spatial_world_route_reason()==0){
      // Preserve the existing raid ordering: release at this actor's action
      // boundary and choose a replacement at a later selection boundary.
      clearAttackDeadline(s,actor);
      declaration->second.blockedApproach=true;
      declaration->second.dirty=false;return 8;
    }
    if(result==1)clearAttackDeadline(s,actor);
    if(result>=0)declaration->second.dirty=false;
    return result;
  }
  const int result=nav_intent_plan_attack_crop(actorId,x,z,
    declaration->second.radius,eligible,blockers,reserved);
  if(result>=0)declaration->second.dirty=false;
  return result;
}
// Apply the blocked-approach transition at the same ordered actor boundary as
// the current raid policy. The high-level goal is retained for selection at
// the next boundary; other actors may claim their own reservations in between.
int nav_declarative_attack_release_blocked(double actorId){
  if(!integer(actorId))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto declaration=s.attackDeclarations.find(actor);
  if(declaration==s.attackDeclarations.end()||!declaration->second.blockedApproach)return 0;
  const auto active=s.activeIntents.find(actor);
  if(active==s.activeIntents.end()||active->second.state==PlanningState::ActionActive)return -2;
  clearAttackDeadline(s,actor);releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);declaration->second.blockedApproach=false;
  declaration->second.dirty=true;return 1;
}
int nav_declarative_attack_cancel(double actorId){
  if(!integer(actorId))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto declaration=s.attackDeclarations.find(actor);
  if(declaration==s.attackDeclarations.end())return 0;
  const auto active=s.activeIntents.find(actor);
  if(active!=s.activeIntents.end()&&active->second.state==PlanningState::ActionActive)return -2;
  if(active!=s.activeIntents.end()){
    releaseIntent(s,actor,PlanningState::Cancelled);s.activeIntents.erase(actor);
  }
  clearAttackDeadline(s,actor);s.attackDeclarations.erase(actor);return 1;
}
// A scheduler can sleep until this single world-level deadline. It must
// service all due actors in ascending deadline/ID order at the boundary.
double nav_declarative_attack_next_deadline(){
  const auto& deadlines=state().attackDeadlines;
  return deadlines.empty()?std::numeric_limits<double>::infinity():deadlines.begin()->first;
}
double nav_declarative_attack_next_due(double now){
  if(!std::isfinite(now))return -1;
  const auto& deadlines=state().attackDeadlines;
  return deadlines.empty()||deadlines.begin()->first>now?0:double(deadlines.begin()->second);
}
int nav_declarative_attack_begin_wait(double actorId,double now){
  if(!integer(actorId)||!std::isfinite(now)||now<0||!std::isfinite(now+90))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto declaration=s.attackDeclarations.find(actor);
  const auto active=s.activeIntents.find(actor);
  if(declaration==s.attackDeclarations.end()||active==s.activeIntents.end()||
     active->second.state!=PlanningState::WaitingUnknown)return -2;
  if(declaration->second.waiting)return 0;
  auto& wait=declaration->second;wait.waiting=true;wait.since=now;wait.next=now+8;wait.attempts=0;
  s.attackDeadlines.insert({wait.next,actor});return 1;
}
// 8 requests an ordered blocked-approach transition. 9 means the bounded wait
// expired; the caller retains authority for the established retreat policy.
int nav_declarative_attack_service_wait(double actorId,double now,double x,double z,
                                        int eligible,int blockers,int reserved){
  if(!integer(actorId)||!std::isfinite(now)||!coordinate(x)||!coordinate(z)||
     (eligible!=0&&eligible!=1))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.attackDeclarations.find(actor);
  if(found==s.attackDeclarations.end()||!found->second.waiting)return -2;
  auto& wait=found->second;
  if(now<wait.since)return -1;
  if(now<wait.next)return 5;
  if(s.attackDeadlines.empty()||s.attackDeadlines.begin()->second!=actor)return -5;
  if(now-wait.since>=90){clearAttackDeadline(s,actor);return 9;}
  if(lazy_selected_context()!=wait.profile)return -3;
  if(!validAttackTransients(s,blockers,reserved))return -1;
  if(nav_intent_request_reroute(actorId)!=1)return -4;
  wait.dirty=true;
  const int result=nav_declarative_attack_reconcile(actorId,x,z,eligible,blockers,reserved);
  if(result==1)return 1;
  if(result==8)return 8;
  if(!s.activeIntents.count(actor)){clearAttackDeadline(s,actor);return result;}
  if(result!=3)return result;
  s.attackDeadlines.erase({wait.next,actor});wait.attempts++;
  wait.next=std::min(wait.since+90,now+8*(1<<std::min(wait.attempts,3)));
  s.attackDeadlines.insert({wait.next,actor});return 3;
}
#endif
// Experimental complete wall proposal. Crop groups nominate only first
// crossings of certified enclosures; the native route and attack-site lease
// then confirm one physically reachable, unreserved wall in the same call.
// This is opt-in until its priorities and campaign outcomes are compared.
int nav_intent_plan_attack_wall(double actorId,double startX,double startZ,
                                double radius){
  IntentState& s=state();s.wallAttackResult.fill(0);
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2||
     lazy_selected_context()==1)return -1;
  if(s.activeIntents.count(uint64_t(actorId)))return -2;
  s.planningCallsByActor[uint64_t(actorId)]++;
  rebuildCropGroups(s);
  struct Candidate {uint64_t id,group;double x,z,distance;};
  std::vector<Candidate> candidates;
  bool unknown=false,occupied=false;
  for(CropGroup& group:s.cropGroups){
    const int status=nav_intent_perimeter_walls(startX,startZ,radius,
      double(group.id));
    if(status<0){unknown=true;continue;}
    if(status!=1)continue;
    for(size_t index=0;index<s.perimeterRows.size();index+=3){
      const uint64_t id=uint64_t(s.perimeterRows[index]);
      const auto wall=s.targets.find(id);
      if(wall==s.targets.end()||!wall->second.active||
         wall->second.kind!=3||wall->second.status!=0)continue;
      candidates.push_back({id,group.id,s.perimeterRows[index+1],
        s.perimeterRows[index+2],std::hypot(wall->second.x-startX,
        wall->second.z-startZ)});
    }
  }
  std::sort(candidates.begin(),candidates.end(),[](const Candidate& a,
    const Candidate& b){
    if(a.distance!=b.distance)return a.distance<b.distance;
    if(a.id!=b.id)return a.id<b.id;
    if(a.x!=b.x)return a.x<b.x;
    return a.z<b.z;
  });
  std::set<uint64_t> transientLeases;
  for(double id:s.attackReservedTargets)
    if(integer(id))transientLeases.insert(uint64_t(id));
  int examined=0,routes=0;
  for(const Candidate& candidate:candidates){
    examined++;
    if(transientLeases.count(candidate.id)){occupied=true;continue;}
    bool blocked=false;
    for(size_t index=0;index+2<s.attackBlockers.size();index+=3)
      if(std::hypot(candidate.x-s.attackBlockers[index],
                    candidate.z-s.attackBlockers[index+1])<
         radius+s.attackBlockers[index+2]-1e-8){
        blocked=true;break;
      }
    if(blocked){occupied=true;continue;}
    routes++;
    const int count=spatial_world_route_cached(float(startX),float(startZ),
      float(candidate.x),float(candidate.z));
    if(count<0||count>4096){unknown=true;continue;}
    if(!count)continue;
    const float* route=spatial_world_route_ptr();
    s.attackRouteInput.assign(route,route+size_t(count)*2);
    const int committed=nav_intent_register_attack_site(actorId,
      double(candidate.id),startX,startZ,count,candidate.x,candidate.z,radius);
    if(committed==-3||committed==-6){occupied=true;continue;}
    if(committed!=1){unknown=true;continue;}
    const ActiveIntent& intent=s.activeIntents.at(uint64_t(actorId));
    s.wallAttackResult={1,double(candidate.id),candidate.x,candidate.z,
      double(s.session),double(intent.slot),double(intent.generation),
      double(candidate.group),double(examined),double(routes)};
    return 1;
  }
  s.wallAttackResult[0]=unknown?3:occupied?4:candidates.empty()?0:2;
  s.wallAttackResult[8]=examined;s.wallAttackResult[9]=routes;
  return int(s.wallAttackResult[0]);
}
int nav_intent_attack_action_active(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||!found->second.animal||
      found->second.state!=PlanningState::RouteActive)return 0;
  const auto& route=s.routeSlots[found->second.slot];
  if(s.executionEnabled&&route.reserved&&route.hasExecution&&route.executionPose[6]!=1)return 0;
  if(route.animalRouteBinding)return 0;
  releaseRoute(s,found->second);
  found->second.state=PlanningState::ActionActive;
  emitIntentChange(s,found->second);
  return 1;
}
// A saved committed strike has no travel route to restore. Reconstruct only
// its logical target; JS remains the authority for its remaining clip time,
// spent hits, and the actual damage frame.
int nav_intent_restore_attack_action(double actorId,double targetId,int hasLease){
  if(!integer(actorId)||!integer(targetId)||hasLease<0||hasLease>1)return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  if(s.activeIntents.count(actor))return 0;
  ActiveIntent intent{actor,0,uint64_t(targetId),PlanningState::ActionActive,
    0,0,lazy_route_revision(),true,false};
  intent.profile=lazy_selected_context();
  intent.lease=hasLease!=0;
  s.activeIntents.emplace(actor,intent);
  s.byTarget[intent.target].insert(actor);
  emitIntentChange(s,s.activeIntents.at(actor));
  return 1;
}
// Saved travel with no usable path keeps its logical target and lease. The
// current session will issue one fresh route request from the restored pose.
int nav_intent_restore_attack_pending(double actorId,double targetId,int hasLease){
  if(!integer(actorId)||!integer(targetId)||hasLease<0||hasLease>1)return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId),id=uint64_t(targetId);
  if(s.activeIntents.count(actor))return 0;
  const auto target=s.targets.find(id);
  if(target==s.targets.end()||!target->second.active||
     target->second.kind>=3&&target->second.damageKnown&&
     target->second.status!=0)return 0;
  const auto owners=s.byTarget.find(id);
  if(hasLease&&target->second.kind!=4&&owners!=s.byTarget.end())
    for(uint64_t owner:owners->second){
      const auto active=s.activeIntents.find(owner);
      if(active!=s.activeIntents.end()&&active->second.animal&&
         active->second.lease)return 0;
    }
  ActiveIntent intent{actor,0,id,PlanningState::NeedsPlan,
    0,0,lazy_route_revision(),true,false};
  intent.profile=lazy_selected_context();intent.lease=hasLease!=0;
  s.activeIntents.emplace(actor,intent);
  s.byTarget[id].insert(actor);
  emitIntentChange(s,s.activeIntents.at(actor));
  return 1;
}
// Restore the already-confirmed JS approach lease after an action or pending
// route is reconstructed; route handles themselves never survive a session.
int nav_intent_restore_attack_site(double actorId,double approachX,
                                   double approachZ,double radius){
  if(!integer(actorId)||!coordinate(approachX)||!coordinate(approachZ)||
     !std::isfinite(radius)||radius<=0||radius>2)return 0;
  IntentState& s=state();
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||!found->second.animal)return 0;
  ActiveIntent& intent=found->second;
  intent.approachX=float(approachX);intent.approachZ=float(approachZ);
  intent.approachRadius=float(radius);intent.approachKnown=true;
  return 1;
}
int nav_intent_attack_finished(double actorId){
  if(!integer(actorId))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.state!=PlanningState::ActionActive)return -1;
  if(found->second.animalStrike){
    const auto& strike=*found->second.animalStrike;
    const auto& h=strike.header;
    const auto& source=*strike.route->source;
    if(s.effectiveTime<h[16]||nav_animal_strike_snapshot(actorId)!=1)return -1;
    s.finishedAnimalStrike=FinishedAnimalStrike{s.session,actor,source.body,source.target,source.center,
      strike.attackId,uint64_t(h[17]),h[11],h[12],source.radius,h[13],h[14],s.effectiveTime};
  }
  const int tactical=found->second.tacticalPending?1:0;
#ifdef WILD_DECLARATIVE_ATTACK
  const auto declaration=s.attackDeclarations.find(actor);
  if(declaration!=s.attackDeclarations.end()){
    clearAttackDeadline(s,actor);declaration->second.dirty=true;
  }
#endif
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  return tactical;
}
int nav_intent_attack_cancel(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.animal||
     (found->second.retreat&&found->second.requiresResources)||found->second.state==PlanningState::ActionActive)return 0;
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  return 1;
}
int nav_intent_action_active(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const auto it=s.activeIntents.find(uint64_t(actorId));
  if(it==s.activeIntents.end()||it->second.state!=PlanningState::RouteActive)return 0;
  if(it->second.requiresResources)return 0;
  const auto& route=s.routeSlots[it->second.slot];
  if(route.resumable&&route.reserved&&(!route.hasExecution||route.executionPose[6]!=1))return 0;
  if(s.executionEnabled&&route.reserved&&route.hasExecution&&route.executionPose[6]!=1)return 0;
  releaseRoute(s,it->second);
  it->second.state=PlanningState::ActionActive;emitIntentChange(s,it->second);return 1;
}
int nav_intent_finish(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end())return 0;
  if(found->second.requiresResources)return 0;
  const uint64_t taskId=found->second.task;
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  const auto task=s.tasks.find(taskId);
  if(task!=s.tasks.end()&&task->second.assigned==actor)s.tasks.erase(task);
  const auto worker=s.workers.find(actor);
  if(worker!=s.workers.end())worker->second.eligible=true;
  s.entityRevision++;
  return 1;
}
}
