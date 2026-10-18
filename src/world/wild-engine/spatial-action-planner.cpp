#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <vector>

// Shadow evaluator for the global task assignment order. This first stage
// accepts already-eligible workers and direct service points; watering and
// repair interaction geometry are not ported and the result is not committed.
extern "C" {
int spatial_world_route_cached(float,float,float,float);
const float* spatial_world_route_ptr();
int spatial_world_route_reason();
}

namespace {
struct TaskBatch {
  std::vector<double> workers,targets,tasks;
  std::vector<int32_t> rows;
  std::vector<float> routes;
};
TaskBatch& batch(){static TaskBatch* value=new TaskBatch();return *value;}
bool id(double value){return std::isfinite(value)&&value>=1&&value<=2147483647&&
  std::floor(value)==value;}
bool validNumber(double value){return std::isfinite(value)&&std::abs(value)<2147483000;}
constexpr int workerWidth=6,targetWidth=3,taskWidth=6,rowWidth=6;
}

extern "C" {
double* nav_task_workers_ptr(int count){
  if(count<0||count>4096)return nullptr;
  batch().workers.resize(size_t(count)*workerWidth);
  return batch().workers.data();
}
double* nav_task_targets_ptr(int count){
  if(count<0||count>16384)return nullptr;
  batch().targets.resize(size_t(count)*targetWidth);
  return batch().targets.data();
}
double* nav_task_tasks_ptr(int count){
  if(count<0||count>16384)return nullptr;
  batch().tasks.resize(size_t(count)*taskWidth);
  return batch().tasks.data();
}
// Status: 0 missing/already owned, 1 assigned, 2 blocked, 3 unknown/pending.
// Rows are indexed by the original task input order, not processing order.
int nav_plan_tasks_shadow(int workerCount,int targetCount,int taskCount){
  TaskBatch& data=batch();
  if(workerCount<0||workerCount>4096||targetCount<0||targetCount>16384||
    taskCount<0||taskCount>16384||
    data.workers.size()<size_t(workerCount)*workerWidth||
    data.targets.size()<size_t(targetCount)*targetWidth||
    data.tasks.size()<size_t(taskCount)*taskWidth)return -1;
  data.rows.assign(size_t(taskCount)*rowWidth,0);data.routes.clear();
  for(int i=0;i<workerCount;i++){
    const double* row=&data.workers[size_t(i)*workerWidth];
    if(!id(row[0])||!id(row[1])||!validNumber(row[2])||!validNumber(row[3])||
      !validNumber(row[4])||!validNumber(row[5]))return -2;
  }
  for(int i=0;i<targetCount;i++){
    const double* row=&data.targets[size_t(i)*targetWidth];
    if(!id(row[0])||!validNumber(row[1])||!validNumber(row[2]))return -2;
  }
  for(int i=0;i<taskCount;i++){
    const double* row=&data.tasks[size_t(i)*taskWidth];
    if(!id(row[0])||!id(row[1])||!id(row[2])||!validNumber(row[3])||
      !validNumber(row[4])||!validNumber(row[5]))return -2;
    data.rows[size_t(i)*rowWidth]=int32_t(row[0]);
  }
  std::vector<int> order(taskCount),available(workerCount,1);
  for(int i=0;i<taskCount;i++)order[i]=i;
  std::sort(order.begin(),order.end(),[&](int a,int b){
    const double* left=&data.tasks[size_t(a)*taskWidth];
    const double* right=&data.tasks[size_t(b)*taskWidth];
    if(left[3]!=right[3])return left[3]<right[3];
    return left[5]<right[5];
  });
  std::vector<int> candidates;
  for(const int index:order){
    const double* task=&data.tasks[size_t(index)*taskWidth];
    if(task[4]!=0)continue;
    const double* target=nullptr;
    for(int i=0;i<targetCount;i++){
      const double* candidate=&data.targets[size_t(i)*targetWidth];
      if(candidate[0]==task[2]){target=candidate;break;}
    }
    if(!target)continue;
    candidates.clear();
    for(int i=0;i<workerCount;i++){
      const double* worker=&data.workers[size_t(i)*workerWidth];
      if(available[i]&&worker[1]==task[1]&&worker[4]!=0)candidates.push_back(i);
    }
    std::sort(candidates.begin(),candidates.end(),[&](int a,int b){
      const double* left=&data.workers[size_t(a)*workerWidth];
      const double* right=&data.workers[size_t(b)*workerWidth];
      const double ld=std::hypot(left[2]-target[1],left[3]-target[2]);
      const double rd=std::hypot(right[2]-target[1],right[3]-target[2]);
      return ld!=rd?ld<rd:left[5]<right[5];
    });
    bool unknown=false;
    for(const int workerIndex:candidates){
      const double* worker=&data.workers[size_t(workerIndex)*workerWidth];
      const int count=spatial_world_route_cached(float(worker[2]),float(worker[3]),
        float(target[1]),float(target[2]));
      if(count<0){unknown=true;continue;}
      if(!count)continue;
      int32_t* result=&data.rows[size_t(index)*rowWidth];
      result[1]=int32_t(worker[0]);result[2]=1;
      result[3]=int32_t(data.routes.size()/2);result[4]=count;
      const float* points=spatial_world_route_ptr();
      data.routes.insert(data.routes.end(),points,points+count*2);
      available[workerIndex]=0;
      break;
    }
    int32_t* result=&data.rows[size_t(index)*rowWidth];
    if(result[2]!=1){result[2]=unknown?3:candidates.empty()?0:2;
      result[5]=unknown?spatial_world_route_reason():0;}
  }
  return taskCount;
}
const int32_t* nav_task_result_ptr(){return batch().rows.data();}
const float* nav_task_route_ptr(){return batch().routes.data();}
int nav_task_route_point_count(){return int(batch().routes.size()/2);}
}
