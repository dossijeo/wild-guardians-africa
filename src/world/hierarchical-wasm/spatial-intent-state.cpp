#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <set>
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
float spatial_surface_anywhere(float,float);
float spatial_fluid_surface_level();
int spatial_world_biome();
}

namespace {
constexpr int changeWidth=10,resultWidth=8,maxChangeBatch=4096;
constexpr double maxId=9007199254740991.0;
constexpr double pi=3.14159265358979323846;
struct Worker {uint64_t id,center;double x,z;bool eligible;double rank;};
// Target kind: 0 direct, 1 ordinary crop, 2 banana, 3 wall, 4 center.
struct Target {
  uint64_t id;double x,z;bool active;int kind;double yaw,shape;
  double hp=0,maxHp=0;int status=0,material=0;bool damageKnown=false;
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
  std::vector<double> changes,results;
  std::vector<float> routes;
  std::vector<std::pair<uint64_t,uint64_t>> proposals;
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
  if(!integer(row[0],true)||row[0]>1||!integer(row[1])||row[1]>4||
    !integer(row[2]))return false;
  change.op=int(row[0]);change.kind=int(row[1]);change.id=uint64_t(row[2]);
  if(!change.op)return true;
  if(!integer(row[3],true)||!coordinate(row[4])||!coordinate(row[5])||
    !integer(row[6],true)||!integer(row[7],true)||
    !std::isfinite(row[8])||!std::isfinite(row[9]))return false;
  change.center=uint64_t(row[3]);change.x=row[4];change.z=row[5];
  change.assigned=uint64_t(row[6]);change.flag=row[6]!=0;
  change.target=uint64_t(row[7]);change.created=row[8];change.rank=row[9];
  if(change.kind==1)return change.center>0&&row[6]<=1;
  if(change.kind==2)return change.center<=4&&row[6]<=1&&change.rank>=0;
  if(change.kind==4)return (change.center==3||change.center==4)&&
    row[4]>=0&&row[5]>0&&row[4]<=row[5]&&row[6]<=2&&row[7]<=5;
  return change.center>0&&change.target>0&&integer(row[4],true)&&row[4]<=2;
}
void clearProposal(IntentState& s){s.proposals.clear();s.proposalOpen=false;}
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
  s.workers.clear();s.targets.clear();s.tasks.clear();
  s.damagedWalls.clear();s.damagedCenters.clear();s.damagedResults.clear();
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
    if(change.kind!=4||!change.op)continue;
    const auto pending=touchedTargetKinds.find(change.id);
    const int current=pending!=touchedTargetKinds.end()?pending->second:
      s.targets.count(change.id)?s.targets.at(change.id).kind:0;
    if(current!=int(change.center))return 0;
  }
  bool planningChange=false,damageChange=false;
  for(const Change& change:parsed){
    if(change.kind==2||change.kind==4)damageChange=true;
    if(change.kind!=4){planningChange=true;continue;}
    if(!change.op){planningChange=true;continue;}
    const auto found=s.targets.find(change.id);
    if(found!=s.targets.end()&&found->second.damageKnown&&
       found->second.status!=int(change.assigned))planningChange=true;
  }
  for(const Change& change:parsed){
    if(!change.op){
      if(change.kind==1)s.workers.erase(change.id);
      else if(change.kind==2){
        const auto found=s.targets.find(change.id);
        if(found!=s.targets.end()){removeDamage(s,found->second);s.targets.erase(found);}
      }else if(change.kind==3)s.tasks.erase(change.id);
      else if(const auto found=s.targets.find(change.id);found!=s.targets.end()){
        removeDamage(s,found->second);found->second.damageKnown=false;
      }
    }else if(change.kind==1){
      s.workers.insert_or_assign(change.id,Worker{change.id,change.center,
        change.x,change.z,change.flag,change.rank});
    }else if(change.kind==2){
      auto found=s.targets.find(change.id);
      if(found==s.targets.end())s.targets.insert_or_assign(change.id,
        Target{change.id,change.x,change.z,change.flag,
          int(change.center),change.created,change.rank});
      else{
        Target& target=found->second;
        removeDamage(s,target);
        target.x=change.x;target.z=change.z;target.active=change.flag;
        target.kind=int(change.center);target.yaw=change.created;target.shape=change.rank;
        addDamage(s,target);
      }
    }else if(change.kind==4){
      const auto found=s.targets.find(change.id);
      if(found==s.targets.end()||found->second.kind!=int(change.center))continue;
      Target& target=found->second;
      removeDamage(s,target);
      target.hp=change.x;target.maxHp=change.z;target.status=int(change.assigned);
      target.material=int(change.target);target.damageKnown=true;
      addDamage(s,target);
    }else{
      s.tasks.insert_or_assign(change.id,Task{change.id,change.center,
        change.target,change.assigned,change.created,change.rank,int(change.x)});
    }
  }
  s.sequence++;
  if(damageChange)s.damageRevision++;
  if(planningChange){s.entityRevision++;clearProposal(s);}
  return 1;
}
double nav_intent_last_sequence(){return double(state().sequence);}
double nav_intent_entity_revision(){return double(state().entityRevision);}
double nav_intent_damage_revision(){return double(state().damageRevision);}
double nav_intent_topology_revision(){return double(lazy_route_revision());}
int nav_intent_worker_count(){return int(state().workers.size());}
int nav_intent_target_count(){return int(state().targets.size());}
int nav_intent_task_count(){return int(state().tasks.size());}
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
      s.candidates++;
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
  }
  if(!s.proposals.empty())s.entityRevision++;
  const int committed=int(s.proposals.size());clearProposal(s);return committed;
}
}
