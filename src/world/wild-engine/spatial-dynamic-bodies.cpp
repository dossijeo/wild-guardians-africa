// Persistent dynamic bodies for native movement. IDs are session-local safe integers;
// callers must publish confirmed changes in simulation order.
#include <cmath>
#include <cstdint>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <algorithm>
#include <limits>
#include <array>
#include <cstring>
#include "spatial-dynamic-bodies.h"
extern "C" int spatial_local_clear(float,float,float,float);
extern "C" uint32_t lazy_route_revision();
extern "C" int lazy_selected_context();
extern "C" int spatial_select_nav_profile_index(int);
namespace {
struct Body {double x,z,r; int kind,flags;uint64_t revision;};
std::unordered_map<uint64_t,Body> bodies;
uint64_t nextBodyRevision=1,lastSegmentBlocker=0;
uint64_t bodyMutationRevision=1;
void bodyMutationCommitted(){if(bodyMutationRevision!=std::numeric_limits<uint64_t>::max())bodyMutationRevision++;}
bool lastSegmentBlocked=false;
// Centre-cell index is persistent across simulation ticks. The largest radius
// is conservative until reset, so an updated/removed large body may cost extra
// candidates but can never make a collision disappear from a query.
struct Cell {int32_t x,z;bool operator==(const Cell& b)const{return x==b.x&&z==b.z;}};
struct CellHash {size_t operator()(const Cell& c)const{return size_t(uint32_t(c.x))*0x9e3779b1u^size_t(uint32_t(c.z));}};
std::unordered_map<Cell,std::unordered_set<uint64_t>,CellHash> cells;
std::unordered_set<uint64_t> unindexed;
double maxRadius=0;
bool indexed=false;
bool cellOf(double x,double z,Cell& out){
 constexpr double low=double(std::numeric_limits<int32_t>::min()),high=double(std::numeric_limits<int32_t>::max());
 double a=std::floor(x/8),b=std::floor(z/8);if(!std::isfinite(a)||!std::isfinite(b)||a<low||a>high||b<low||b>high)return false;
 out={int32_t(a),int32_t(b)};return true;
}
void indexRemove(uint64_t id,const Body& body){
 Cell c;if(!cellOf(body.x,body.z,c)){unindexed.erase(id);return;}auto it=cells.find(c);if(it==cells.end())return;
 it->second.erase(id);if(it->second.empty())cells.erase(it);
}
void indexAdd(uint64_t id,const Body& body){Cell c;if(cellOf(body.x,body.z,c))cells[c].insert(id);else unindexed.insert(id);maxRadius=std::max(maxRadius,body.r);}
// Visitors return true to stop early. Huge ranges and unrepresentable cell
// coordinates fall back to a full scan, preserving behavior for all finite inputs.
template<class Visitor> bool visitBox(double minX,double minZ,double maxX,double maxZ,Visitor visitor){
 Cell low,high;const auto all=[&](){for(const auto& [id,body]:bodies)if(visitor(id,body))return true;return false;};
 if(!indexed)return all();
 if(!cellOf(minX,minZ,low)||!cellOf(maxX,maxZ,high))return all();
 const int64_t width=int64_t(high.x)-low.x+1,height=int64_t(high.z)-low.z+1;
 if(width<=0||height<=0||double(width)*double(height)>std::max(64.0,double(bodies.size())*2))return all();
 for(const auto id:unindexed){const auto it=bodies.find(id);if(it!=bodies.end()&&visitor(id,it->second))return true;}
 for(int64_t z=low.z;z<=high.z;z++)for(int64_t x=low.x;x<=high.x;x++){
  auto bucket=cells.find({int32_t(x),int32_t(z)});if(bucket==cells.end())continue;
  for(const auto id:bucket->second){const auto it=bodies.find(id);if(it!=bodies.end()&&visitor(id,it->second))return true;}
 }
 return false;
}
std::vector<double> result;
#ifdef WILD_CENTRAL_MOBILITY
std::vector<double> mobilityInput,mobilityOutput;
#endif
// Terrain edges are independent of moving bodies. Each native profile owns a
// bounded exact-coordinate cache invalidated by its topology revision. Dynamic
// collision tests still run for every graph edge; this never caches a route or
// a decision about another actor.
struct TerrainEdge {std::array<uint64_t,4> coordinates;bool operator==(const TerrainEdge& b)const{return coordinates==b.coordinates;}};
struct TerrainEdgeHash {size_t operator()(const TerrainEdge& edge)const{uint64_t h=1469598103934665603ull;for(auto x:edge.coordinates){h^=x;h*=1099511628211ull;}return size_t(h^(h>>32));}};
struct TerrainEdges {uint32_t revision=0;bool initialized=false;std::unordered_map<TerrainEdge,bool,TerrainEdgeHash> values;};
std::array<TerrainEdges,6> terrainEdges;
uint64_t terrainCacheHits=0,terrainCacheMisses=0;
uint64_t bits(double value){uint64_t out;std::memcpy(&out,&value,sizeof(out));return out;}
struct BlockedEdge {uint64_t actor,revision;std::array<uint64_t,4> coordinates;int mask;bool operator==(const BlockedEdge& b)const{return actor==b.actor&&revision==b.revision&&coordinates==b.coordinates&&mask==b.mask;}};
struct BlockedEdgeHash {size_t operator()(const BlockedEdge& edge)const{uint64_t h=edge.actor^(edge.revision*0x9e3779b97f4a7c15ull)^uint32_t(edge.mask);for(auto x:edge.coordinates){h^=x;h*=1099511628211ull;}return size_t(h^(h>>32));}};
struct BlockedWitness {uint64_t id,revision;};
std::unordered_map<BlockedEdge,BlockedWitness,BlockedEdgeHash> blockedEdges;
uint64_t blockedEdgeHits=0,blockedEdgeRechecks=0,blockedEdgeMisses=0;
bool terrainSegment(double ax,double az,double bx,double bz){
 const int count=std::max(1,int(std::ceil(std::hypot(bx-ax,bz-az)/1.25)));double x=ax,z=az;
 for(int i=1;i<=count;i++){const double nx=ax+(bx-ax)*i/count,nz=az+(bz-az)*i/count;if(!spatial_local_clear(float(x),float(z),float(nx),float(nz)))return false;x=nx;z=nz;}
 return true;
}
bool cachedTerrainSegment(double ax,double az,double bx,double bz){
 const int context=lazy_selected_context();if(context<0||context>=int(terrainEdges.size()))return terrainSegment(ax,az,bx,bz);
 auto& cache=terrainEdges[context];const uint32_t revision=lazy_route_revision();
 if(!cache.initialized||cache.revision!=revision){cache.values.clear();cache.revision=revision;cache.initialized=true;}
 const TerrainEdge key{{bits(ax),bits(az),bits(bx),bits(bz)}};auto found=cache.values.find(key);
 if(found!=cache.values.end()){terrainCacheHits++;return found->second;}
 terrainCacheMisses++;const bool clear=terrainSegment(ax,az,bx,bz);if(cache.values.size()>=8192)cache.values.clear();cache.values.emplace(key,clear);return clear;
}
constexpr double maxId=9007199254740991.0;
bool validId(double id){return std::isfinite(id)&&id>=0&&id<=maxId&&std::floor(id)==id;}
// Negative mask selects the simulation's actor-specific blocking policy.
bool participates(const Body& actor,const Body& other,int mask){
 if(mask>=0)return (other.flags&mask)!=0;
 if(!(other.flags&1))return false;
 if(actor.kind==0&&other.kind==1&&!(actor.flags&2)&&!(other.flags&4)&&(other.flags&8))return false;
 if(actor.kind==1&&other.kind==0&&!(other.flags&2)&&!(actor.flags&4)&&(actor.flags&8))return false;
 return true;
}
// A blocked edge can be reused as long as one specific body still blocks it.
// Recheck that witness after its own state changes; other movements cannot
// make an edge clear while this witness remains a collision.
bool witnessBlocks(const Body& actor,const Body& b,double ax,double az,double bx,double bz,int mask){
 if(!participates(actor,b,mask))return false;
 const double required=actor.r+b.r,minX=std::min(ax,bx),maxX=std::max(ax,bx),minZ=std::min(az,bz),maxZ=std::max(az,bz);
 if(b.x<minX-required||b.x>maxX+required||b.z<minZ-required||b.z>maxZ+required)return false;
 const double dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,before=std::hypot(ax-b.x,az-b.z);
 if(before<required-1e-8)return std::hypot(ax-actor.x,az-actor.z)>1e-9||(ax-b.x)*dx+(az-b.z)*dz < -1e-10||std::hypot(bx-b.x,bz-b.z)<before-1e-8;
 const double t=len2?std::clamp(((b.x-ax)*dx+(b.z-az)*dz)/len2,0.0,1.0):0;
 return std::hypot(ax+dx*t-b.x,az+dz*t-b.z)<required-1e-8;
}
// Keep the indexed search out of the short-population function. A single large
// visitor previously forced WASM to spill the hot linear scan's arguments.
__attribute__((noinline)) int indexedSegment(uint64_t id,const Body& actor,double ax,double az,double bx,double bz,int mask){
 const double dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,minX=std::min(ax,bx),maxX=std::max(ax,bx),minZ=std::min(az,bz),maxZ=std::max(az,bz),bound=actor.r+maxRadius;
 const bool blocked=visitBox(minX-bound,minZ-bound,maxX+bound,maxZ+bound,[&](uint64_t otherId,const Body& b){
  if(otherId==id||!participates(actor,b,mask))return false;
  const double required=actor.r+b.r;
  if(b.x<minX-required||b.x>maxX+required||b.z<minZ-required||b.z>maxZ+required)return false;
  const double before=std::hypot(ax-b.x,az-b.z);
  if(before<required-1e-8){
   if(std::hypot(ax-actor.x,az-actor.z)>1e-9){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return true;}
   if((ax-b.x)*dx+(az-b.z)*dz < -1e-10||std::hypot(bx-b.x,bz-b.z)<before-1e-8){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return true;}
  }else{
   const double t=len2?std::clamp(((b.x-ax)*dx+(b.z-az)*dz)/len2,0.0,1.0):0;
   if(std::hypot(ax+dx*t-b.x,az+dz*t-b.z)<required-1e-8){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return true;}
  }
  return false;
 });
 return blocked?0:1;
}
}
extern "C" {
void spatial_bodies_reset(){spatialIntentBodiesResetting();bodyMutationCommitted();bodies.clear();cells.clear();unindexed.clear();maxRadius=0;indexed=false;result.clear();for(auto& cache:terrainEdges){cache.values.clear();cache.initialized=false;}terrainCacheHits=terrainCacheMisses=0;blockedEdges.clear();blockedEdgeHits=blockedEdgeRechecks=blockedEdgeMisses=0;nextBodyRevision=1;lastSegmentBlocked=false;
#ifdef WILD_CENTRAL_MOBILITY
 mobilityInput.clear();mobilityOutput.clear();
#endif
}
double spatial_body_terrain_cache_hits(){return double(terrainCacheHits);}
double spatial_body_terrain_cache_misses(){return double(terrainCacheMisses);}
int spatial_body_terrain_cache_entries(){size_t count=0;for(const auto& cache:terrainEdges)count+=cache.values.size();return int(count);}
double spatial_body_blocked_edge_hits(){return double(blockedEdgeHits);}
double spatial_body_blocked_edge_rechecks(){return double(blockedEdgeRechecks);}
double spatial_body_blocked_edge_misses(){return double(blockedEdgeMisses);}
int spatial_body_blocked_edge_entries(){return int(blockedEdges.size());}
int spatial_body_upsert(double id,double x,double z,double radius,int kind,int flags){
  if(!validId(id)||!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(radius)||radius<0||(kind!=0&&kind!=1))return 0;
  if(!spatialIntentBodyCanChange(uint64_t(id),{x,z,radius,kind,flags}))return 0;
 const uint64_t key=uint64_t(id);const auto prior=bodies.find(key);const bool unchanged=prior!=bodies.end()&&bits(prior->second.x)==bits(x)&&bits(prior->second.z)==bits(z)&&bits(prior->second.r)==bits(radius)&&prior->second.kind==kind&&prior->second.flags==flags;const Body body{x,z,radius,kind,flags,unchanged?prior->second.revision:nextBodyRevision++};
 if(!unchanged)bodyMutationCommitted();
 if(!indexed){
  bodies[key]=body;maxRadius=std::max(maxRadius,radius);
  if(bodies.size()>=64){indexed=true;for(const auto& [otherId,other]:bodies)indexAdd(otherId,other);}
  return 1;
 }
 auto [it,inserted]=bodies.try_emplace(key,body);if(!inserted){indexRemove(key,it->second);it->second=body;}
 indexAdd(key,body);
 return 1;
}
int spatial_body_remove(double id){if(!validId(id))return 0;auto it=bodies.find(uint64_t(id));if(it==bodies.end())return 0;spatialIntentBodyRemoving(it->first);if(indexed)indexRemove(it->first,it->second);bodies.erase(it);bodyMutationCommitted();if(indexed&&bodies.size()<32){cells.clear();unindexed.clear();indexed=false;}return 1;}
int spatial_body_count(){return int(bodies.size());}
// A negative range asks for all participating bodies; otherwise the same
// conservative square as actorBlockers is used, including both radii.
int spatial_body_has_blockers(double id,double range){
 if(!validId(id)||!std::isfinite(range))return -1;
 auto found=bodies.find(uint64_t(id));if(found==bodies.end())return -1;
 const Body& actor=found->second;
 const double bound=range<0?std::numeric_limits<double>::infinity():range+actor.r+maxRadius;
 return visitBox(actor.x-bound,actor.z-bound,actor.x+bound,actor.z+bound,[&](uint64_t otherId,const Body& b){
  if(otherId==uint64_t(id)||!participates(actor,b,-1))return false;
  const double reach=range+actor.r+b.r;return range<0||(std::abs(actor.x-b.x)<=reach&&std::abs(actor.z-b.z)<=reach);
 })?1:0;
}
} // extern "C"
bool spatialReadBody(uint64_t id,SpatialBodyView& out){
  const auto found=bodies.find(id);if(found==bodies.end())return false;
  const auto& b=found->second;out={b.x,b.z,b.r,b.kind,b.flags};return true;
}
uint64_t spatialBodiesMutationRevision(){return bodyMutationRevision;}
bool spatialMoveBodyFromIntent(uint64_t id,double x,double z){
  auto found=bodies.find(id);
  if(found==bodies.end()||!std::isfinite(x)||!std::isfinite(z))return false;
  if(found->second.x==x&&found->second.z==z)return true;
  if(indexed)indexRemove(id,found->second);
  found->second.x=x;found->second.z=z;found->second.revision=nextBodyRevision++;
  bodyMutationCommitted();
  if(indexed)indexAdd(id,found->second);
  return true;
}
bool spatialBodiesParticipate(const SpatialBodyView& actor,const SpatialBodyView& other){
  return participates({actor.x,actor.z,actor.r,actor.kind,actor.flags,0},
    {other.x,other.z,other.r,other.kind,other.flags,0},-1);
}
void spatialVisitBodiesBox(double minX,double minZ,double maxX,double maxZ,
    SpatialBodyVisitor visitor,void* context){
  visitBox(minX-maxRadius,minZ-maxRadius,maxX+maxRadius,maxZ+maxRadius,
    [&](uint64_t id,const Body& b){visitor(id,{b.x,b.z,b.r,b.kind,b.flags},context);return false;});
}
extern "C" {
// Conservative square query, deterministically ordered by ID. A caller can
// compare the exact current state without round-tripping the entire registry.
int spatial_bodies_near(double x,double z,double reach){
 result.clear();if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(reach)||reach<0)return -1;
 std::vector<uint64_t> ids;const double bound=reach+maxRadius;visitBox(x-bound,z-bound,x+bound,z+bound,[&](uint64_t id,const Body& b){if(std::abs(b.x-x)<=reach+b.r&&std::abs(b.z-z)<=reach+b.r)ids.push_back(id);return false;});
 std::sort(ids.begin(),ids.end());for(auto id:ids){const auto& b=bodies.at(id);result.insert(result.end(),{double(id),b.x,b.z,b.r,double(b.kind),double(b.flags)});}return int(ids.size());
}
const double* spatial_bodies_result_ptr(){return result.data();}
// Flags mask selects bodies participating in this query. Overlapping discs may
// only escape monotonically, matching the existing swept-disc movement rule.
int spatial_body_segment_clear(double id,double ax,double az,double bx,double bz,int mask){
 lastSegmentBlocked=false;
 if(!validId(id)||!std::isfinite(ax)||!std::isfinite(az)||!std::isfinite(bx)||!std::isfinite(bz))return -1;
 auto found=bodies.find(uint64_t(id));if(found==bodies.end())return -1;
 const Body& actor=found->second;if(indexed)return indexedSegment(uint64_t(id),actor,ax,az,bx,bz,mask);
 const double dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,minX=std::min(ax,bx),maxX=std::max(ax,bx),minZ=std::min(az,bz),maxZ=std::max(az,bz);
 for(const auto& [otherId,b]:bodies){
  if(otherId==uint64_t(id)||!participates(actor,b,mask))continue;
  const double required=actor.r+b.r;
  if(b.x<minX-required||b.x>maxX+required||b.z<minZ-required||b.z>maxZ+required)continue;
  const double before=std::hypot(ax-b.x,az-b.z);
  if(before<required-1e-8){
   if(std::hypot(ax-actor.x,az-actor.z)>1e-9){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return 0;}
   if((ax-b.x)*dx+(az-b.z)*dz < -1e-10||std::hypot(bx-b.x,bz-b.z)<before-1e-8){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return 0;}
  }else{
   const double t=len2?std::clamp(((b.x-ax)*dx+(b.z-az)*dz)/len2,0.0,1.0):0;
   if(std::hypot(ax+dx*t-b.x,az+dz*t-b.z)<required-1e-8){lastSegmentBlocked=true;lastSegmentBlocker=otherId;return 0;}
  }
 }
 return 1;
}
#ifdef WILD_CENTRAL_MOBILITY
// Experimental ordered single-segment batch. It is not a path planner,
// traffic coordinator, authoritative game state or production entry point.
// Input rows: body ID, target X/Z, maximum distance, navigation profile.
// Output rows: ID, status (0 blocked, 1 advanced, 2 arrived), X/Z, distance.
double* spatial_mobility_input_ptr(int count){
 if(count<0||count>4096)return nullptr;
 mobilityInput.resize(size_t(count)*5);return mobilityInput.data();
}
const double* spatial_mobility_output_ptr(){return mobilityOutput.data();}
int spatial_mobility_step(int count){
 mobilityOutput.clear();
 if(count<0||count>4096||mobilityInput.size()!=size_t(count)*5)return -1;
 std::unordered_set<uint64_t> seen;
 for(int i=0;i<count;i++){
  const size_t at=size_t(i)*5;const double id=mobilityInput[at],x=mobilityInput[at+1],z=mobilityInput[at+2],distance=mobilityInput[at+3],profile=mobilityInput[at+4];
  if(!validId(id)||!std::isfinite(x)||!std::isfinite(z)||std::abs(x)>2147483000.0||std::abs(z)>2147483000.0||!std::isfinite(distance)||distance<0||distance>1000000||!std::isfinite(profile)||std::floor(profile)!=profile||profile<0||profile>=6||!bodies.count(uint64_t(id))||!seen.insert(uint64_t(id)).second)return -1;
 }
 const int previous=lazy_selected_context();
 for(int i=0;i<count;i++)if(spatial_select_nav_profile_index(int(mobilityInput[size_t(i)*5+4]))<=0){spatial_select_nav_profile_index(previous);return -2;}
 mobilityOutput.reserve(size_t(count)*5);
 for(int i=0;i<count;i++){
  const size_t at=size_t(i)*5;const double id=mobilityInput[at],gx=mobilityInput[at+1],gz=mobilityInput[at+2],budget=mobilityInput[at+3];
  spatial_select_nav_profile_index(int(mobilityInput[at+4]));const Body body=bodies.at(uint64_t(id));
  const double dx=gx-body.x,dz=gz-body.z,length=std::hypot(dx,dz),travel=std::min(length,budget);
  if(budget==0){mobilityOutput.insert(mobilityOutput.end(),{id,1,body.x,body.z,0});continue;}
  const double nx=length?body.x+dx*(travel/length):body.x,nz=length?body.z+dz*(travel/length):body.z;
  const bool clear=terrainSegment(body.x,body.z,nx,nz)&&spatial_body_segment_clear(id,body.x,body.z,nx,nz,-1)==1;
  if(clear&&travel>0)spatial_body_upsert(id,nx,nz,body.r,body.kind,body.flags);
  mobilityOutput.insert(mobilityOutput.end(),{id,clear?(travel>=length?2.0:1.0):0.0,clear?nx:body.x,clear?nz:body.z,clear?travel:0.0});
 }
 spatial_select_nav_profile_index(previous);return count;
}
#endif
// Experimental local detour; callers select the appropriate native navigation
// profile before invoking it. Returns -1 for invalid inputs, 0 when no route
// exists, otherwise the number of point pairs exposed through the result ptr.
int spatial_body_detour(double id,double gx,double gz,int mask){
 if(!validId(id)||!std::isfinite(gx)||!std::isfinite(gz))return -1;
 auto found=bodies.find(uint64_t(id));if(found==bodies.end())return -1;
 const Body actor=found->second;struct Point{double x,z;};
 std::vector<Point> nodes{{actor.x,actor.z},{gx,gz}};
 constexpr double pi=3.14159265358979323846;
 const auto clear=[&](Point a,Point b){
  const BlockedEdge key{uint64_t(id),actor.revision,{bits(a.x),bits(a.z),bits(b.x),bits(b.z)},mask};auto cached=blockedEdges.find(key);
  if(cached!=blockedEdges.end()){
   auto witness=bodies.find(cached->second.id);
   if(witness!=bodies.end()&&(witness->second.revision==cached->second.revision||(blockedEdgeRechecks++,witnessBlocks(actor,witness->second,a.x,a.z,b.x,b.z,mask)))){cached->second.revision=witness->second.revision;blockedEdgeHits++;return false;}
   blockedEdges.erase(cached);
  }
  blockedEdgeMisses++;const bool clear=spatial_body_segment_clear(id,a.x,a.z,b.x,b.z,mask)==1;
  if(!clear&&lastSegmentBlocked){if(blockedEdges.size()>=32768)blockedEdges.clear();const auto witness=bodies.find(lastSegmentBlocker);if(witness!=bodies.end())blockedEdges.emplace(key,BlockedWitness{lastSegmentBlocker,witness->second.revision});}
  return clear;
 };
 const auto terrain=[](Point a,Point b){return cachedTerrainSegment(a.x,a.z,b.x,b.z);};
 const double dx=gx-actor.x,dz=gz-actor.z,len2=dx*dx+dz*dz;
 std::vector<uint64_t> ordered;const double bound=actor.r+maxRadius+.1;visitBox(std::min(actor.x,gx)-bound,std::min(actor.z,gz)-bound,std::max(actor.x,gx)+bound,std::max(actor.z,gz)+bound,[&](uint64_t otherId,const Body&){ordered.push_back(otherId);return false;});std::sort(ordered.begin(),ordered.end());
 for(const auto otherId:ordered){const auto& b=bodies.at(otherId);
  if(otherId==uint64_t(id)||!participates(actor,b,mask))continue;
  const double t=len2?std::clamp(((b.x-actor.x)*dx+(b.z-actor.z)*dz)/len2,0.,1.):0.;
  if(std::hypot(actor.x+t*dx-b.x,actor.z+t*dz-b.z)>=actor.r+b.r+.1)continue;
  const double r=(actor.r+b.r+.02)/std::cos(pi/16);
  for(int i=0;i<16;i++){const double angle=i*pi/8;Point p{b.x+std::sin(angle)*r,b.z+std::cos(angle)*r};if(clear(p,p)&&terrain(p,p))nodes.push_back(p);}
 }
 const size_t n=nodes.size();std::vector<double> cost(n,std::numeric_limits<double>::infinity());std::vector<int> previous(n,-1);std::vector<bool> closed(n,false);cost[0]=0;
 auto distance=[](Point a,Point b){return std::hypot(a.x-b.x,a.z-b.z);};
 for(size_t count=0;count<n;count++){
  int best=-1;for(size_t i=0;i<n;i++)if(!closed[i]&&(best<0||cost[i]+distance(nodes[i],nodes[1])<cost[best]+distance(nodes[best],nodes[1])))best=int(i);
  if(best<0||!std::isfinite(cost[best]))break;
  if(best==1){std::vector<Point> route;for(int i=1;i!=0;i=previous[i]){if(i<0)return 0;route.push_back(nodes[i]);}result.clear();for(auto it=route.rbegin();it!=route.rend();it++){result.push_back(it->x);result.push_back(it->z);}return int(route.size());}
  closed[best]=true;
  for(size_t j=1;j<n;j++)if(!closed[j]){double candidate=cost[best]+distance(nodes[best],nodes[j]);if(candidate<cost[j]&&clear(nodes[best],nodes[j])&&terrain(nodes[best],nodes[j])){cost[j]=candidate;previous[j]=best;}}
 }
 result.clear();return 0;
}

}
