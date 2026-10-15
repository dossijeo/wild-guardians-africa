#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <map>
#include <queue>
#include <set>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

// Experimental incremental read model for direct-service task intentions.
// JS owns the game entities. Only confirmed, ordered deltas enter this index.
// Planning is speculative; commit validates both entity and graph revisions.
extern "C" {
int spatial_world_route_cached(float,float,float,float);
const float* spatial_world_route_ptr();
int spatial_world_route_reason();
uint32_t lazy_route_revision();
int lazy_selected_context();
int spatial_select_nav_profile_index(int);
int lazy_weak_region(int,int);
int lazy_enclosure(int,int);
int lazy_connected(int,int,int,int);
int spatial_local_clear(float,float,float,float);
int spatial_crop_placement_valid(float,float);
float spatial_surface_anywhere(float,float);
float spatial_fluid_surface_level();
int spatial_world_biome();
}

namespace {
constexpr int changeWidth=10,resultWidth=8,maxChangeBatch=4096;
constexpr double maxId=9007199254740991.0;
constexpr double pi=3.14159265358979323846;
struct Worker {uint64_t id,center;double x,z;bool eligible,actionActive;double rank;};
// Target kind: 0 direct, 1 ordinary crop, 2 banana, 3 wall, 4 center.
struct Target {
  uint64_t id;double x,z;bool active;int kind;double yaw,shape;
  double hp=0,maxHp=0;int status=0,material=0;bool damageKnown=false;
  int cropSpecies=0;double cropValue=0;
  double serviceX=0,serviceZ=0;bool serviceKnown=false;
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
struct CropGroup {
  uint64_t id;double value=0,x=0,z=0,minX=0,minZ=0,maxX=0,maxZ=0;
  std::vector<uint64_t> crops;
  std::unordered_map<int,std::pair<uint32_t,int>> protection;
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
  WaitingUnknown=3,WaitingBlocked=4,Cancelled=5};
struct ActiveIntent {
  uint64_t actor=0,task=0,target=0;
  PlanningState state=PlanningState::NeedsPlan;
  uint32_t slot=0,generation=0,topology=0;
  bool animal=false,tacticalPending=false,lease=true;
  int profile=1;
  float routeStartX=0,routeStartZ=0;
  std::vector<uint64_t> blockedCropGroups;
};
struct RouteSlot {std::vector<float> points;uint32_t generation=0;bool active=false;};
struct Change {
  int op,kind;
  uint64_t id,center,target,assigned;
  double x,z,created,rank;
  bool flag;
};
struct IntentState {
  std::unordered_map<uint64_t,Worker> workers;
  std::unordered_map<uint64_t,Target> targets;
  std::unordered_map<uint64_t,Task> tasks;
  std::set<DamageKey,DamageOrder> damagedWalls,damagedCenters;
  std::vector<double> damagedResults;
  std::vector<CropGroup> cropGroups;
  std::vector<double> cropGroupRows,cropGroupMembers;
  uint64_t cropRevision=0;bool cropGroupsDirty=true;
  std::unordered_map<int64_t,std::vector<uint64_t>> cropCells;
  std::unordered_map<uint64_t,PlantSearch> plantSearches;
  std::unordered_map<uint64_t,PlantLease> plantLeases;
  std::array<double,8> plantResult{};
  uint64_t nextPlantLease=1,centerRevision=0;
  std::vector<double> changes,results;
  std::vector<float> routes;
  std::vector<std::pair<uint64_t,uint64_t>> proposals;
  std::unordered_map<uint64_t,ActiveIntent> activeIntents;
  std::unordered_map<uint64_t,std::unordered_set<uint64_t>> byTarget,byTask;
  std::vector<RouteSlot> routeSlots;
  std::vector<float> attackRouteInput;
  std::array<double,10> attackResult{};
  std::vector<double> intentChanges;
  std::array<double,10> intentResult{};
  uint32_t session=0;
  uint64_t invalidations=0;
  std::unordered_map<uint64_t,uint64_t> planningCallsByActor;
  uint64_t sequence=0,entityRevision=0,damageRevision=0,plannedEntityRevision=0;
  uint32_t plannedGraphRevision=0;
  int plannedProfile=-1;
  uint64_t routeQueries=0,candidates=0;
  bool proposalOpen=false;
};
IntentState& state(){static IntentState* value=new IntentState();return *value;}
bool integer(double value,bool allowZero=false){
  return std::isfinite(value)&&value>=double(allowZero?0:1)&&
    value<=maxId&&std::floor(value)==value;
}
bool coordinate(double value){return std::isfinite(value)&&std::abs(value)<2147483000.0;}
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
void emitIntentChange(IntentState& s,const ActiveIntent& intent){
  s.intentChanges.insert(s.intentChanges.end(),{double(intent.actor),
    double(int(intent.state)),double(intent.task),double(intent.target),
    double(s.session),double(intent.slot),double(intent.generation),
    double(intent.topology)});
}
void releaseRoute(IntentState& s,ActiveIntent& intent){
  if(intent.slot<s.routeSlots.size()){
    RouteSlot& route=s.routeSlots[intent.slot];
    if(route.active&&route.generation==intent.generation){
      route.active=false;route.points.clear();route.generation++;
    }
  }
  intent.slot=0;intent.generation=0;
}
void releaseIntent(IntentState& s,uint64_t actor,PlanningState next){
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end())return;
  ActiveIntent& intent=found->second;
  if(intent.target){auto it=s.byTarget.find(intent.target);
    if(it!=s.byTarget.end()){it->second.erase(actor);if(it->second.empty())s.byTarget.erase(it);}}
  if(intent.task){auto it=s.byTask.find(intent.task);
    if(it!=s.byTask.end()){it->second.erase(actor);if(it->second.empty())s.byTask.erase(it);}}
  releaseRoute(s,intent);intent.state=next;
  emitIntentChange(s,intent);
  intent.task=0;intent.target=0;s.invalidations++;
}
void invalidateDependents(IntentState& s,const Change& change){
  if(change.kind==1){
    if(!change.op){
      const auto active=s.activeIntents.find(change.id);
      const uint64_t taskId=active==s.activeIntents.end()?0:active->second.task;
      releaseIntent(s,change.id,PlanningState::Cancelled);
      s.activeIntents.erase(change.id);
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
int cropProtection(const IntentState& s,const CropGroup& group){
  bool open=false,unknown=false;
  for(uint64_t id:group.crops){
    const Target& crop=s.targets.at(id);
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
    if(!found)unknown=true;
  }
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
  const double worker=spatial_world_biome()==5?
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
    const double width=1.09*target.shape+.28+.1,depth=.22+.28+.1;
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
}

extern "C" {
// Reset on a new WASM world/session or before replaying a restored snapshot.
void nav_intent_reset(){
  IntentState& s=state();
  s.session++;
  if(!s.session)s.session=1;
  s.activeIntents.clear();s.byTarget.clear();s.byTask.clear();
  s.routeSlots.clear();s.intentChanges.clear();s.intentResult.fill(0);
  s.attackRouteInput.clear();
  s.invalidations=0;
  s.planningCallsByActor.clear();
  s.workers.clear();s.targets.clear();s.tasks.clear();
  s.damagedWalls.clear();s.damagedCenters.clear();s.damagedResults.clear();
  s.cropGroups.clear();s.cropGroupRows.clear();s.cropGroupMembers.clear();
  s.cropRevision=0;s.cropGroupsDirty=true;
  s.cropCells.clear();s.plantSearches.clear();s.plantLeases.clear();
  s.plantResult.fill(0);s.nextPlantLease=1;s.centerRevision=0;
  s.changes.clear();s.results.clear();s.routes.clear();clearProposal(s);
  s.sequence=0;s.entityRevision=0;s.damageRevision=0;
  s.routeQueries=0;s.candidates=0;
}
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
  bool planningChange=false,damageChange=false,cropChange=false,cropRemoved=false,centerChange=false;
  for(const Change& change:parsed){
    if(change.kind==2||change.kind==4)damageChange=true;
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
  for(const Change& change:parsed){
    invalidateDependents(s,change);
    if(!change.op){
      if(change.kind==1)s.workers.erase(change.id);
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
      s.workers.insert_or_assign(change.id,Worker{change.id,change.center,
        change.x,change.z,change.flag,change.target!=0,change.rank});
    }else if(change.kind==2){
      auto found=s.targets.find(change.id);
      if(found==s.targets.end()){
        auto inserted=s.targets.insert_or_assign(change.id,
          Target{change.id,change.x,change.z,change.flag,
            int(change.center),change.created,change.rank});
        addCropCell(s,inserted.first->second);
      }else{
        Target& target=found->second;
        removeDamage(s,target);removeCropCell(s,target);
        target.x=change.x;target.z=change.z;target.active=change.flag;
        target.kind=int(change.center);target.yaw=change.created;target.shape=change.rank;
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
int nav_intent_crop_groups(){
  IntentState& s=state();rebuildCropGroups(s);
  s.cropGroupRows.clear();s.cropGroupMembers.clear();
  s.cropGroupRows.reserve(s.cropGroups.size()*12);
  const int profile=lazy_selected_context();
  const uint32_t revision=lazy_route_revision();
  for(CropGroup& group:s.cropGroups){
    auto status=group.protection.find(profile);
    if(status==group.protection.end()||status->second.first!=revision){
      const int result=cropProtection(s,group);
      status=group.protection.insert_or_assign(profile,std::make_pair(revision,result)).first;
    }
    const size_t offset=s.cropGroupMembers.size();
    for(uint64_t id:group.crops)s.cropGroupMembers.push_back(double(id));
    s.cropGroupRows.insert(s.cropGroupRows.end(),{double(group.id),group.value,
      group.x,group.z,group.minX,group.minZ,group.maxX,group.maxZ,
      double(status->second.second),double(offset),double(group.crops.size()),
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
     !found->second.active||!found->second.serviceKnown)return -2;
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
      const ServicePoints points=servicePoints(*worker,target,task->kind);
      for(int i=0;i<points.count;i++){
        const Point point=points.values[size_t(i)];
        s.routeQueries++;
        const int count=spatial_world_route_cached(float(worker->x),float(worker->z),
          float(point.x),float(point.z));
        if(count<0){
          unknown=true;unknownReason=spatial_world_route_reason();
          // Watering's live policy defers the worker after an unresolved
          // sector rather than probing every other point around that crop.
          if(task->kind==1)break;
          continue;
        }
        if(!count)continue;
        s.results[at+1]=double(worker->id);s.results[at+2]=1;
        s.results[at+3]=double(s.routes.size()/2);s.results[at+4]=count;
        s.results[at+6]=point.x;s.results[at+7]=point.z;
        const float* path=spatial_world_route_ptr();
        s.routes.insert(s.routes.end(),path,path+count*2);
        s.proposals.push_back({task->id,worker->id});reserved.insert(worker->id);
        break;
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
int nav_intent_commit(){
  IntentState& s=state();
  if(!s.proposalOpen||s.plannedEntityRevision!=s.entityRevision||
    s.plannedGraphRevision!=lazy_route_revision()||
    s.plannedProfile!=lazy_selected_context()){clearProposal(s);return 0;}
  for(const auto& [taskId,workerId]:s.proposals){
    const auto task=s.tasks.find(taskId);
    const auto worker=s.workers.find(workerId);
    if(task==s.tasks.end()||worker==s.workers.end()||task->second.assigned||
      !worker->second.eligible){clearProposal(s);return 0;}
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
    if(existing!=s.activeIntents.end())releaseIntent(s,workerId,PlanningState::Cancelled);
    uint32_t slot=uint32_t(s.routeSlots.size());
    for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){slot=i;break;}
    if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
    RouteSlot& route=s.routeSlots[slot];
    route.points.assign(s.routes.begin()+offset,s.routes.begin()+offset+count);
    route.active=true;route.generation++;
    if(!route.generation)route.generation=1;
    ActiveIntent intent{workerId,taskId,s.tasks.at(taskId).target,
      PlanningState::RouteActive,slot,route.generation,lazy_route_revision()};
    intent.profile=lazy_selected_context();
    s.activeIntents.insert_or_assign(workerId,intent);
    s.byTarget[intent.target].insert(workerId);
    s.byTask[intent.task].insert(workerId);
    emitIntentChange(s,intent);
  }
  if(!s.proposals.empty())s.entityRevision++;
  const int committed=int(s.proposals.size());clearProposal(s);return committed;
}
// Drain only changes caused by confirmed events or a committed task batch.
// Ordinary movement and ticks do not invoke the planner or emit rows.
int nav_intent_change_count(){return int(state().intentChanges.size()/8);}
const double* nav_intent_change_ptr(){return state().intentChanges.data();}
void nav_intent_clear_changes(){state().intentChanges.clear();}
double nav_intent_invalidation_count(){return double(state().invalidations);}
double nav_intent_actor_planning_calls(double actorId){
  if(!integer(actorId))return 0;
  const auto found=state().planningCallsByActor.find(uint64_t(actorId));
  return found==state().planningCallsByActor.end()?0:double(found->second);
}
int nav_intent_actor(double actorId){
  IntentState& s=state();s.intentResult.fill(0);
  if(!integer(actorId))return 0;
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end())return 0;
  const ActiveIntent& intent=found->second;
  s.intentResult={double(intent.actor),double(int(intent.state)),
    double(intent.task),double(intent.target),double(s.session),
    double(intent.slot),double(intent.generation),double(intent.topology),
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
  return route.active&&route.generation==uint32_t(generation)?
    int(route.points.size()/2):-1;
}
const float* nav_intent_route_ptr(double session,double slot,double generation){
  const IntentState& s=state();
  if(!integer(session)||session!=double(s.session)||!integer(slot,true)||
     slot>=s.routeSlots.size()||!integer(generation)||
     generation>double(UINT32_MAX))return nullptr;
  const RouteSlot& route=s.routeSlots[size_t(slot)];
  return route.active&&route.generation==uint32_t(generation)?
    route.points.data():nullptr;
}
// A topological event may be unrelated to an active worker path. Validate the
// pinned polyline against the updated native collision map at this boundary,
// rather than discarding every route merely because the global revision moved.
// The continuous mover still performs its ordinary local collision checks.
bool activeRouteClear(const IntentState& s,const ActiveIntent& intent){
  if(intent.slot>=s.routeSlots.size())return false;
  const RouteSlot& route=s.routeSlots[intent.slot];
  if(!route.active||route.generation!=intent.generation||
     route.points.size()<2||route.points.size()%2)return false;
  const auto worker=s.workers.find(intent.actor);
  if(!intent.animal&&worker==s.workers.end())return false;
  float x=intent.animal?intent.routeStartX:float(worker->second.x);
  float z=intent.animal?intent.routeStartZ:float(worker->second.z);
  for(size_t i=0;i<route.points.size();i+=2){
    const float nextX=route.points[i],nextZ=route.points[i+1];
    if(!spatial_local_clear(x,z,nextX,nextZ))return false;
    x=nextX;z=nextZ;
  }
  return true;
}
int nav_intent_reconcile_topology(){
  IntentState& s=state();const int originalProfile=lazy_selected_context();
  std::vector<std::pair<uint64_t,uint32_t>> affected;
  for(auto& item:s.activeIntents){
    ActiveIntent& intent=item.second;
    if(lazy_selected_context()!=intent.profile)
      spatial_select_nav_profile_index(intent.profile);
    const uint32_t revision=lazy_route_revision();
    if(intent.topology==revision)continue;
    if(intent.state==PlanningState::RouteActive&&activeRouteClear(s,intent)){
      intent.topology=revision;
      continue;
    }
    if(intent.state==PlanningState::RouteActive||
       intent.state==PlanningState::WaitingUnknown||
       intent.state==PlanningState::WaitingBlocked)
      affected.emplace_back(item.first,revision);
  }
  if(lazy_selected_context()!=originalProfile)
    spatial_select_nav_profile_index(originalProfile);
  std::sort(affected.begin(),affected.end());
  for(const auto& [actor,revision]:affected){
    ActiveIntent& intent=s.activeIntents.at(actor);
    if(intent.animal){
      // A wall can invalidate the travel route without invalidating the
      // target or its exclusive lease. The caller supplies the animal's live
      // position at this event boundary for a same-target native reroute.
      releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
      intent.topology=revision;emitIntentChange(s,intent);s.invalidations++;
      continue;
    }
    releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
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
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
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
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)
    if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  const float* points=spatial_world_route_ptr();
  route.points.assign(points,points+size_t(count)*2);
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  intent.slot=slot;intent.generation=route.generation;
  intent.state=PlanningState::RouteActive;
  intent.topology=lazy_route_revision();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  emitIntentChange(s,intent);
  return 1;
}
// Called at an event boundary after the JS authority projects current actor
// positions. The target and reservation survive a route-only invalidation.
int nav_intent_replan_pending_routes(){
  IntentState& s=state();std::vector<uint64_t> actors;
  for(const auto& item:s.activeIntents)
    if(!item.second.animal&&item.second.state==PlanningState::NeedsPlan)
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
    const ServicePoints points=servicePoints(worker->second,target->second,task->second.kind);
    bool unknown=false;
    for(int i=0;i<points.count;i++){
      const Point point=points.values[size_t(i)];s.routeQueries++;
      const int count=spatial_world_route_cached(float(worker->second.x),
        float(worker->second.z),float(point.x),float(point.z));
      if(count<0){unknown=true;if(task->second.kind==1)break;continue;}
      if(!count)continue;
      uint32_t slot=uint32_t(s.routeSlots.size());
      for(uint32_t j=0;j<s.routeSlots.size();j++)if(!s.routeSlots[j].active){slot=j;break;}
      if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
      RouteSlot& route=s.routeSlots[slot];const float* path=spatial_world_route_ptr();
      route.points.assign(path,path+count*2);route.active=true;route.generation++;
      if(!route.generation)route.generation=1;
      intent.slot=slot;intent.generation=route.generation;
      intent.state=PlanningState::RouteActive;intent.topology=lazy_route_revision();
      planned++;break;
    }
    if(intent.state!=PlanningState::RouteActive){
      intent.state=unknown?PlanningState::WaitingUnknown:PlanningState::WaitingBlocked;
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
      found->second.state!=PlanningState::WaitingUnknown&&
      found->second.state!=PlanningState::WaitingBlocked))return 0;
  ActiveIntent& intent=found->second;
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
int nav_intent_register_attack(double actorId,double targetId,
                               double startX,double startZ,int count){
  if(!integer(actorId)||!integer(targetId)||!coordinate(startX)||
     !coordinate(startZ)||count<0||count>4096)return -1;
  IntentState& s=state();
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
    if(!spatial_local_clear(x,z,nextX,nextZ))return -5;
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
    if(!prior->second.animal||prior->second.state==PlanningState::ActionActive)
      return -4;
    releaseIntent(s,actor,PlanningState::Cancelled);
    s.activeIntents.erase(actor);
  }
  uint32_t slot=uint32_t(s.routeSlots.size());
  for(uint32_t i=0;i<s.routeSlots.size();i++)if(!s.routeSlots[i].active){slot=i;break;}
  if(slot==s.routeSlots.size())s.routeSlots.emplace_back();
  RouteSlot& route=s.routeSlots[slot];
  route.points.assign(s.attackRouteInput.begin(),
    s.attackRouteInput.begin()+size_t(count)*2);
  route.active=true;route.generation++;
  if(!route.generation)route.generation=1;
  ActiveIntent intent{actor,0,targetIdValue,PlanningState::RouteActive,
    slot,route.generation,lazy_route_revision(),true,false};
  intent.profile=lazy_selected_context();
  intent.routeStartX=float(startX);intent.routeStartZ=float(startZ);
  s.activeIntents.insert_or_assign(actor,intent);
  s.byTarget[targetIdValue].insert(actor);
  emitIntentChange(s,intent);
  return 1;
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
  intent.blockedCropGroups.clear();
  for(CropGroup& group:s.cropGroups)
    if(attackGroupAccess(s,group,float(radius),x,z)==0)
      intent.blockedCropGroups.push_back(group.id);
  return int(intent.blockedCropGroups.size());
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
int nav_intent_plan_attack_crop(double actorId,double startX,double startZ,
                                double radius,int cropsEligible){
  IntentState& s=state();s.attackResult.fill(0);
  if(!integer(actorId)||!coordinate(startX)||!coordinate(startZ)||
     !std::isfinite(radius)||radius<=0||radius>2||
     (cropsEligible!=0&&cropsEligible!=1)||
     lazy_selected_context()==1)return -1;
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
  if(starts.empty()){s.attackResult[0]=3;return 3;}
  std::sort(starts.begin(),starts.end(),[](const Anchor& a,const Anchor& b){
    if(a.distance!=b.distance)return a.distance<b.distance;
    return a.x!=b.x?a.x<b.x:a.z<b.z;
  });
  const Anchor source=starts.front();
  bool unknown=false,eligible=false;
  int regionQueries=0,routeQueries=0;
  const auto leased=[&](uint64_t cropId){
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
    for(uint64_t cropId:group.crops)if(s.targets.at(cropId).active&&
      !leased(cropId)){eligible=true;break;}
    const AttackSiteCache& cache=attackSitesFor(s,group,float(radius));
    std::unordered_set<uint64_t> located;
    std::vector<const AttackSite*> candidates;
    for(const auto& [region,sites]:cache.byRegion){
      for(const AttackSite& site:sites)located.insert(site.crop);
      const AttackSite& first=sites.front();
      regionQueries++;
      const int connected=lazy_connected(source.x,source.z,first.x,first.z);
      if(connected<0){unknown=true;continue;}
      if(!connected)continue;
      for(const AttackSite& site:sites)candidates.push_back(&site);
    }
    if(located.size()<group.crops.size())unknown=true;
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
    std::unordered_set<uint64_t> preferredTried;
    const auto tryPoint=[&](const Target& crop,float px,float pz){
      routeQueries++;
      const int count=spatial_world_route_cached(float(startX),float(startZ),px,pz);
      if(count<0){unknown=true;return false;}
      if(!count)return false;
      const float* route=spatial_world_route_ptr();
      s.attackRouteInput.assign(route,route+size_t(count)*2);
      if(nav_intent_register_attack(actorId,double(crop.id),startX,startZ,count)!=1)
        return false;
      const ActiveIntent& intent=s.activeIntents.at(actor);
      s.attackResult={1,double(crop.id),double(px),double(pz),
        double(s.session),double(intent.slot),double(intent.generation),
        double(group.id),double(regionQueries),double(routeQueries)};
      return true;
    };
    for(const AttackSite* site:candidates){
      const Target& crop=s.targets.at(site->crop);
      if(!crop.active)continue;
      if(leased(crop.id))continue;
      if(attempted++>=16){unknown=true;break;}
      if(preferredTried.insert(crop.id).second){
        const double angle=std::atan2(startX-crop.x,startZ-crop.z);
        const float px=float(crop.x+std::sin(angle)*(.6+radius));
        const float pz=float(crop.z+std::cos(angle)*(.6+radius));
        const int x=int(std::round(px)),z=int(std::round(pz));
        if(spatial_local_clear(px,pz,float(x),float(z))){
          regionQueries++;
          const int connected=lazy_connected(source.x,source.z,x,z);
          if(connected<0)unknown=true;
          if(connected>0&&tryPoint(crop,px,pz))return 1;
        }
      }
      if(tryPoint(crop,site->px,site->pz))return 1;
    }
    // A connected region with no successful local route is inconclusive,
    // not proof that all other positions in that region are inaccessible.
    if(!candidates.empty())unknown=true;
  }
  s.attackResult[0]=unknown?3:eligible?2:0;
  s.attackResult[8]=regionQueries;s.attackResult[9]=routeQueries;
  return int(s.attackResult[0]);
}
int nav_intent_attack_action_active(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();
  const auto found=s.activeIntents.find(uint64_t(actorId));
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.state!=PlanningState::RouteActive)return 0;
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
  emitIntentChange(s,intent);
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
  emitIntentChange(s,intent);
  return 1;
}
int nav_intent_attack_finished(double actorId){
  if(!integer(actorId))return -1;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.state!=PlanningState::ActionActive)return -1;
  const int tactical=found->second.tacticalPending?1:0;
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  return tactical;
}
int nav_intent_attack_cancel(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);
  if(found==s.activeIntents.end()||!found->second.animal||
     found->second.state==PlanningState::ActionActive)return 0;
  releaseIntent(s,actor,PlanningState::Cancelled);
  s.activeIntents.erase(actor);
  return 1;
}
int nav_intent_action_active(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const auto it=s.activeIntents.find(uint64_t(actorId));
  if(it==s.activeIntents.end()||it->second.state!=PlanningState::RouteActive)return 0;
  it->second.state=PlanningState::ActionActive;emitIntentChange(s,it->second);return 1;
}
int nav_intent_finish(double actorId){
  if(!integer(actorId))return 0;
  IntentState& s=state();const uint64_t actor=uint64_t(actorId);
  const auto found=s.activeIntents.find(actor);if(found==s.activeIntents.end())return 0;
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
