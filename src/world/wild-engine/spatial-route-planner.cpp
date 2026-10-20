#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <cstring>
#include <queue>
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
struct MobileDetour {
  std::vector<float> bodies,points;
};
MobileDetour& mobileDetour(){static MobileDetour* value=new MobileDetour();return *value;}
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
bool clearMobile(Point a,Point b,float actorRadius,const std::vector<float>& bodies,
                 bool allowEscape=false){
  if(!clearWorld(a,b))return false;
  const float dx=b.x-a.x,dz=b.z-a.z,lengthSquared=dx*dx+dz*dz;
  for(size_t i=0;i<bodies.size();i+=3){
    const float cx=bodies[i],cz=bodies[i+1],required=actorRadius+bodies[i+2];
    const float sx=a.x-cx,sz=a.z-cz,startSquared=sx*sx+sz*sz;
    if(allowEscape&&startSquared<(required-1e-5f)*(required-1e-5f)){
      const float ex=b.x-cx,ez=b.z-cz;
      if(sx*dx+sz*dz>=-1e-6f&&ex*ex+ez*ez>=startSquared-1e-5f)continue;
      return false;
    }
    const float t=lengthSquared>0?
      std::clamp(-(sx*dx+sz*dz)/lengthSquared,0.f,1.f):0.f;
    const float px=sx+t*dx,pz=sz+t*dz;
    if(px*px+pz*pz<(required-1e-5f)*(required-1e-5f))return false;
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
std::array<Anchor,9> anchors(Point point,int& count){
  const int xs[2]={int(std::floor(point.x)),int(std::ceil(point.x))};
  const int zs[2]={int(std::floor(point.z)),int(std::ceil(point.z))};
  std::array<Anchor,9> rows{};count=0;
  for(int xi=0;xi<2;xi++)for(int zi=0;zi<2;zi++){
    if((xi&&xs[xi]==xs[0])||(zi&&zs[zi]==zs[0]))continue;
    const Point anchor{float(xs[xi]),float(zs[zi])};
    rows[count++]={xs[xi],zs[zi],distance(point,anchor)};
  }
  bool hasConnector=false;
  for(int i=0;i<count;i++)if(spatial_walkable(rows[i].x,rows[i].z)&&
    spatial_local_clear(point.x,point.z,float(rows[i].x),float(rows[i].z))){
    hasConnector=true;break;
  }
  // A continuous position can be legal while its four floor/ceil cells are
  // occupied by a nearby wall. Only then examine the adjacent ring; normal
  // routes retain the original connector set and cost.
  if(!hasConnector){
    const int cx=int(std::floor(point.x+0.5f)),cz=int(std::floor(point.z+0.5f));
    for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++){
      const int x=cx+dx,z=cz+dz;
      bool present=false;
      for(int i=0;i<count;i++)if(rows[i].x==x&&rows[i].z==z){present=true;break;}
      if(!present)rows[count++]={x,z,distance(point,{float(x),float(z)})};
    }
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
// A sector path can wrap a building through many grid cells even when one
// validated corner joins the continuous endpoints. Test only the points on
// that already discovered path, and only for a substantial detour.
void shortenOneCorner(Point start,Point end){
  WorldRoute& out=result();
  const float direct=distance(start,end);
  float original=0;Point previous=start;
  for(size_t at=0;at<out.points.size();at+=2){
    const Point next{out.points[at],out.points[at+1]};
    original+=distance(previous,next);previous=next;
  }
  if(original<direct*1.5f||original-direct<2.f)return;
  // A long sector route can have hundreds of grid waypoints. Sweeping both
  // continuous segments for every waypoint makes shortening quadratic in
  // route length, even when a wall prevents every shortcut. Rank by the
  // cheap geometric lower bound, then physically validate a bounded set.
  // Sixteen preserves useful alternate corners beside structures while
  // avoiding a sweep for every grid step of a long route.
  struct Candidate {Point corner;float length;};
  constexpr size_t maxShortcutCandidates=16;
  std::array<Candidate,maxShortcutCandidates> candidates{};
  size_t count=0;
  for(size_t at=0;at+2<out.points.size();at+=2){
    const Point corner{out.points[at],out.points[at+1]};
    const float length=distance(start,corner)+distance(corner,end);
    if(length>=original-0.01f)continue;
    size_t index=0;
    while(index<count&&candidates[index].length<=length)index++;
    if(index==candidates.size())continue;
    if(count<candidates.size())count++;
    for(size_t move=count-1;move>index;move--)
      candidates[move]=candidates[move-1];
    candidates[index]={corner,length};
  }
  for(size_t index=0;index<count;index++){
    const Candidate& choice=candidates[index];
    if(!clearWorld(start,choice.corner)||
       !clearWorld(choice.corner,end))continue;
    out.points={choice.corner.x,choice.corner.z,end.x,end.z};
    return;
  }
}
}

extern "C" {
// Query-only detour around current actor bodies. The selected navigation
// profile supplies the terrain, wall and gate predicates; mobile discs never
// enter the confirmed sector graph or its reusable route cache.
float* spatial_mobile_detour_bodies_ptr(int count){
  if(count<0||count>256)return nullptr;
  auto& bodies=mobileDetour().bodies;
  bodies.resize(size_t(count)*3);
  return bodies.data();
}
int spatial_mobile_detour(float fromX,float fromZ,float toX,float toZ,
                          float actorRadius,int bodyCount){
  auto& state=mobileDetour();state.points.clear();
  const Point start{fromX,fromZ},end{toX,toZ};
  if(!finite(start)||!finite(end)||!std::isfinite(actorRadius)||actorRadius<=0||
     bodyCount<0||bodyCount>256||state.bodies.size()!=size_t(bodyCount)*3)return -1;
  for(int i=0;i<bodyCount;i++){
    const size_t at=size_t(i)*3;
    if(!std::isfinite(state.bodies[at])||!std::isfinite(state.bodies[at+1])||
       !std::isfinite(state.bodies[at+2])||state.bodies[at+2]<=0)return -1;
  }
  if(distance(start,end)>32.f)return -1;
  if(clearMobile(start,end,actorRadius,state.bodies,true)){
    state.points={end.x,end.z};return 1;
  }
  const int minX=int(std::floor(std::min(fromX,toX)))-16;
  const int maxX=int(std::ceil(std::max(fromX,toX)))+16;
  const int minZ=int(std::floor(std::min(fromZ,toZ)))-16;
  const int maxZ=int(std::ceil(std::max(fromZ,toZ)))+16;
  const int width=maxX-minX+1,height=maxZ-minZ+1;
  if(width<1||height<1||int64_t(width)*height>8192)return -1;
  const int count=width*height;
  const auto pointFor=[&](int id){return Point{float(minX+id%width),
    float(minZ+id/width)};};
  struct Candidate {float priority,cost;int id;};
  const auto worse=[](const Candidate& a,const Candidate& b){
    if(a.priority!=b.priority)return a.priority>b.priority;
    if(a.cost!=b.cost)return a.cost>b.cost;
    return a.id>b.id;
  };
  std::priority_queue<Candidate,std::vector<Candidate>,decltype(worse)> open(worse);
  std::vector<float> costs(size_t(count),std::numeric_limits<float>::infinity());
  std::vector<int> parents(size_t(count),-2);
  std::vector<uint8_t> closed(size_t(count),0);
  for(int id=0;id<count;id++){
    const Point point=pointFor(id);
    const float cost=distance(start,point);
    if(cost>1.5f||!clearMobile(start,point,actorRadius,state.bodies,true))continue;
    costs[id]=cost;parents[id]=-1;
    open.push({cost+distance(point,end),cost,id});
  }
  constexpr int offsets[8][2]={{-1,0},{0,-1},{0,1},{1,0},
                                {-1,-1},{-1,1},{1,-1},{1,1}};
  while(!open.empty()){
    const Candidate current=open.top();open.pop();
    if(closed[current.id]||current.cost>costs[current.id]+1e-5f)continue;
    closed[current.id]=1;
    const Point here=pointFor(current.id);
    if(distance(here,end)<=1.5f&&
       clearMobile(here,end,actorRadius,state.bodies)){
      std::vector<Point> reversed;
      for(int id=current.id;id>=0;id=parents[id])reversed.push_back(pointFor(id));
      for(auto at=reversed.rbegin();at!=reversed.rend();++at){
        state.points.push_back(at->x);state.points.push_back(at->z);
      }
      state.points.push_back(end.x);state.points.push_back(end.z);
      return int(state.points.size()/2);
    }
    const int x=current.id%width,z=current.id/width;
    for(const auto& offset:offsets){
      const int nx=x+offset[0],nz=z+offset[1];
      if(nx<0||nx>=width||nz<0||nz>=height)continue;
      const int next=nz*width+nx;
      if(closed[next])continue;
      const float cost=current.cost+std::hypot(float(offset[0]),float(offset[1]));
      if(cost>=costs[next])continue;
      const Point point=pointFor(next);
      if(!clearMobile(here,point,actorRadius,state.bodies))continue;
      costs[next]=cost;parents[next]=current.id;
      open.push({cost+distance(point,end),cost,next});
    }
  }
  // Missing resident terrain and a genuinely blocked local corridor cannot
  // be distinguished by this bounded search. Never certify either as blocked.
  return -1;
}
const float* spatial_mobile_detour_ptr(){return mobileDetour().points.data();}
// Route handles may contain a physically validated long shortcut. Validate
// that segment with the same bounded continuous sweep used when creating it;
// spatial_local_clear alone is intentionally limited to short connectors.
int spatial_world_segment_clear(float fromX,float fromZ,float toX,float toZ){
  const Point from{fromX,fromZ},to{toX,toZ};
  return finite(from)&&finite(to)&&clearWorld(from,to)?1:0;
}
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
  std::vector<float> bestRoute;
  float bestLength=std::numeric_limits<float>::infinity();
  const float acceptable=distance(start,end)*1.5f+2.f;
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
      shortenOneCorner(start,end);
      float length=0;Point previous=start;
      for(size_t at=0;at<out.points.size();at+=2){
        const Point next{out.points[at],out.points[at+1]};
        length+=distance(previous,next);previous=next;
      }
      if(length<bestLength){bestLength=length;bestRoute=out.points;}
      if(bestLength<=acceptable){
        out.points=std::move(bestRoute);out.view=out.points.data();
        return int(out.points.size()/2);
      }
      out.points.clear();
    }
  }
  if(!bestRoute.empty()){
    out.points=std::move(bestRoute);out.view=out.points.data();
    return int(out.points.size()/2);
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
