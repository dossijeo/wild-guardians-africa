#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <cstring>
#include <vector>

// Experimental whole-world route entry point. The existing sector graph and
// physical predicates remain authoritative; no JavaScript geometry callback is
// made while selecting connectors or reconstructing a route.
extern "C" {
int spatial_walkable(int x,int z);
int spatial_local_clear(float x,float z,float nx,float nz);
int lazy_route(int fromX,int fromZ,int toX,int toZ);
int32_t* lazy_route_ptr();
int lazy_connected_reason();
int lazy_portal_world_points(int encoded,float* out);
int lazy_add_portal_world(int fromX,int fromZ,int toX,int toZ,
  float fromWorldX,float fromWorldZ,float toWorldX,float toWorldZ);
int lazy_selected_context();
uint32_t lazy_route_revision();
}

namespace {
struct Point {float x,z;};
bool finite(Point p);
float distance(Point a,Point b);
struct Anchor {int x,z;float distance;};
struct WorldRoute {
  std::vector<float> points;
  const float* view=nullptr;
  int reason=0,graphReason=0;
};
struct RouteKey {uint32_t x,z,tx,tz,revision;int profile;};
struct CacheEntry {
  RouteKey key{};
  std::vector<float> points;
  int outcome=0,reason=0,graphReason=0;
  bool valid=false;
};
constexpr size_t cacheCapacity=1024;
struct RouteCache {
  std::array<CacheEntry,cacheCapacity> entries;
  uint64_t hits=0,misses=0,evictions=0;
};
RouteCache& cache(){static RouteCache* value=new RouteCache();return *value;}
struct RouteBatch {
  std::vector<float> input,points;
  std::vector<int32_t> rows;
};
RouteBatch& batch(){static RouteBatch* value=new RouteBatch();return *value;}
uint32_t bits(float value){uint32_t result;std::memcpy(&result,&value,sizeof(result));return result;}
uint64_t mix(uint64_t x){
  x^=x>>30;x*=0xbf58476d1ce4e5b9ULL;
  x^=x>>27;x*=0x94d049bb133111ebULL;
  return x^(x>>31);
}
size_t slotFor(const RouteKey& key){
  uint64_t h=mix((uint64_t(key.x)<<32)|key.z);
  h^=mix((uint64_t(key.tx)<<32)|key.tz);
  h^=mix((uint64_t(key.revision)<<32)|uint32_t(key.profile));
  return size_t(h)&(cacheCapacity-1);
}
bool equal(const RouteKey& a,const RouteKey& b){return a.x==b.x&&a.z==b.z&&
  a.tx==b.tx&&a.tz==b.tz&&a.revision==b.revision&&a.profile==b.profile;}
bool clearWorld(Point a,Point b){
  const float length=distance(a,b);
  const int steps=std::max(1,int(std::ceil(length/1.25f)));
  for(int i=0;i<steps;i++){
    const float f=float(i)/steps,g=float(i+1)/steps;
    if(!spatial_local_clear(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,
      a.x+(b.x-a.x)*g,a.z+(b.z-a.z)*g))return false;
  }
  return true;
}
bool gateAnchor(Point point,Point& chosen){
  const int cx=int(std::floor(point.x+0.5f)),cz=int(std::floor(point.z+0.5f));
  float best=std::numeric_limits<float>::infinity();
  bool found=false;
  for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++){
    const Point candidate{float(cx+dx),float(cz+dz)};
    if(!spatial_walkable(int(candidate.x),int(candidate.z))||
       !clearWorld(point,candidate))continue;
    const float d=distance(point,candidate);
    if(!found||d<best||(d==best&&
       (candidate.x<chosen.x||(candidate.x==chosen.x&&candidate.z<chosen.z)))){
      chosen=candidate;best=d;found=true;
    }
  }
  return found;
}
// STANDALONE_WASM does not initialize vector globals before the first export.
WorldRoute& result(){static WorldRoute* value=new WorldRoute();return *value;}
bool finite(Point p){return std::isfinite(p.x)&&std::isfinite(p.z)&&
  std::abs(double(p.x))<2147483000&&std::abs(double(p.z))<2147483000;}
float distance(Point a,Point b){return std::hypot(a.x-b.x,a.z-b.z);}
std::array<Anchor,4> anchors(Point point,int& count){
  const int xs[2]={int(std::floor(point.x)),int(std::ceil(point.x))};
  const int zs[2]={int(std::floor(point.z)),int(std::ceil(point.z))};
  std::array<Anchor,4> rows{};count=0;
  for(int xi=0;xi<2;xi++)for(int zi=0;zi<2;zi++){
    if((xi&&xs[xi]==xs[0])||(zi&&zs[zi]==zs[0]))continue;
    const Point anchor{float(xs[xi]),float(zs[zi])};
    rows[count++]={xs[xi],zs[zi],distance(point,anchor)};
  }
  std::sort(rows.begin(),rows.begin()+count,[](const Anchor& a,const Anchor& b){
    if(a.distance!=b.distance)return a.distance<b.distance;
    if(a.x!=b.x)return a.x<b.x;
    return a.z<b.z;
  });
  return rows;
}
void append(Point p){result().points.push_back(p.x);result().points.push_back(p.z);}
Point last(Point fallback){
  const auto& points=result().points;
  return points.empty()?fallback:Point{points[points.size()-2],points.back()};
}
}

extern "C" {
// One call per confirmed gate; connector search stays in the spatial authority.
int spatial_add_gate_portal(float fromX,float fromZ,float toX,float toZ){
  const Point from{fromX,fromZ},to{toX,toZ};
  if(!finite(from)||!finite(to)||!clearWorld(from,to)||!clearWorld(to,from))return -1;
  Point a{},b{};
  if(!gateAnchor(from,a)||!gateAnchor(to,b))return -1;
  return lazy_add_portal_world(int(a.x),int(a.z),int(b.x),int(b.z),
    fromX,fromZ,toX,toZ);
}
// >0 number of world-space points; 0 blocked; -1 unknown. The route buffer is
// valid until the next route call or a memory-growing topology operation.
int spatial_world_route(float fromX,float fromZ,float toX,float toZ){
  WorldRoute& out=result();out.points.clear();out.view=nullptr;out.reason=0;out.graphReason=0;
  const Point start{fromX,fromZ},end{toX,toZ};
  if(!finite(start)||!finite(end)){out.reason=4;return -1;}
  if(spatial_local_clear(fromX,fromZ,toX,toZ)){
    append(end);out.view=out.points.data();return 1;
  }
  int startCount=0,endCount=0;
  const auto starts=anchors(start,startCount),ends=anchors(end,endCount);
  bool unknown=false,startReachable=false,endReachable=false;
  for(int i=0;i<startCount;i++){
    const Anchor& from=starts[i];
    if(!spatial_walkable(from.x,from.z)||
       !spatial_local_clear(fromX,fromZ,float(from.x),float(from.z)))continue;
    startReachable=true;
    for(int j=0;j<endCount;j++){
      const Anchor& to=ends[j];
      if(!spatial_walkable(to.x,to.z)||
         !spatial_local_clear(toX,toZ,float(to.x),float(to.z)))continue;
      endReachable=true;
      const int count=lazy_route(from.x,from.z,to.x,to.z);
      if(count<0){unknown=true;out.graphReason=lazy_connected_reason();continue;}
      if(!count)continue;
      if(from.distance>1e-6f)append({float(from.x),float(from.z)});
      const int32_t* route=lazy_route_ptr();
      bool valid=true;
      for(int k=0;k<count;k++){
        if(route[k*2]==std::numeric_limits<int32_t>::min()){
          float crossing[4];
          if(!lazy_portal_world_points(route[k*2+1],crossing)){
            valid=false;break;
          }
          append({crossing[0],crossing[1]});append({crossing[2],crossing[3]});
        }else append({float(route[k*2]),float(route[k*2+1])});
      }
      if(!valid){out.points.clear();unknown=true;out.graphReason=11;continue;}
      if(distance(last({float(from.x),float(from.z)}),end)>1e-6f)append(end);
      out.view=out.points.data();return int(out.points.size()/2);
    }
  }
  out.points.clear();
  if(unknown||!startReachable||!endReachable){
    out.reason=!startReachable?1:!endReachable?2:3;
    return -1;
  }
  return 0;
}
const float* spatial_world_route_ptr(){return result().view;}
// 1 start connector, 2 end connector, 3 graph, 4 invalid coordinates.
int spatial_world_route_reason(){return result().reason;}
int spatial_world_route_graph_reason(){return result().graphReason;}
int spatial_world_route_cached(float fromX,float fromZ,float toX,float toZ){
  const RouteKey key{bits(fromX),bits(fromZ),bits(toX),bits(toZ),
    lazy_route_revision(),lazy_selected_context()};
  CacheEntry& entry=cache().entries[slotFor(key)];
  if(entry.valid&&equal(entry.key,key)){
    cache().hits++;
    WorldRoute& out=result();out.view=entry.points.data();
    out.reason=entry.reason;out.graphReason=entry.graphReason;
    return entry.outcome;
  }
  cache().misses++;
  const int outcome=spatial_world_route(fromX,fromZ,toX,toZ);
  // Unknown means incomplete connectivity or an invalid connector. It is
  // deliberately never retained as a negative physical proof.
  if(outcome<0)return outcome;
  if(entry.valid)cache().evictions++;
  entry.key=key;entry.valid=true;entry.outcome=outcome;
  entry.reason=result().reason;entry.graphReason=result().graphReason;
  entry.points=result().points;
  result().view=entry.points.data();
  return outcome;
}
uint64_t spatial_route_cache_hits(){return cache().hits;}
uint64_t spatial_route_cache_misses(){return cache().misses;}
uint64_t spatial_route_cache_evictions(){return cache().evictions;}
void spatial_route_cache_reset_metrics(){cache().hits=cache().misses=cache().evictions=0;}
float* spatial_route_batch_input_ptr(int count){
  if(count<0||count>4096)return nullptr;
  batch().input.resize(size_t(count)*4);
  return batch().input.data();
}
int spatial_world_route_batch(int count){
  RouteBatch& out=batch();
  if(count<0||count>4096||out.input.size()<size_t(count)*4)return -1;
  out.rows.resize(size_t(count)*4);out.points.clear();
  // Four numbers per query and four result fields: count/status, point offset,
  // unknown reason, native graph reason. The contiguous points buffer can be
  // read once by JS without crossing the boundary per route.
  for(int i=0;i<count;i++){
    const int at=i*4;
    const int found=spatial_world_route_cached(out.input[at],out.input[at+1],
      out.input[at+2],out.input[at+3]);
    out.rows[at]=found;out.rows[at+1]=int(out.points.size()/2);
    out.rows[at+2]=result().reason;out.rows[at+3]=result().graphReason;
    if(found>0){
      const float* points=spatial_world_route_ptr();
      out.points.insert(out.points.end(),points,points+found*2);
    }
  }
  return count;
}
const int32_t* spatial_route_batch_rows_ptr(){return batch().rows.data();}
const float* spatial_route_batch_points_ptr(){return batch().points.data();}
int spatial_route_batch_point_count(){return int(batch().points.size()/2);}
}
