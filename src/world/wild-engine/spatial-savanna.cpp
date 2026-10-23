#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
#ifdef __EMSCRIPTEN_PTHREADS__
#include <atomic>
#include <memory>
#include <pthread.h>
#include <emscripten/threading.h>
#include <emscripten/emscripten.h>
#define WILD_SAMPLING_LOCAL thread_local
#else
#define WILD_SAMPLING_LOCAL
#endif
#ifdef WILD_SPATIAL_PROFILE
#include <emscripten/emscripten.h>
namespace { WILD_SAMPLING_LOCAL double spatialProfileTimes[14]{}; }
extern "C" EMSCRIPTEN_KEEPALIVE void spatial_profile_reset(){std::fill_n(spatialProfileTimes,14,0.0);}
extern "C" EMSCRIPTEN_KEEPALIVE double spatial_profile_ms(int index){return index>=0&&index<14?spatialProfileTimes[index]:-1;}
#define SPATIAL_TICK(name) const double name=emscripten_get_now()
#define SPATIAL_TOCK(index,name) spatialProfileTimes[index]+=emscripten_get_now()-name
#else
#define SPATIAL_TICK(name)
#define SPATIAL_TOCK(index,name)
#endif

// Isolated spatial-authority experiment. The same deterministic functions
// produce render heights, visible props and navigation occupancy. It is not
// connected to production world generation or save files.
extern "C" {
int lazy_init(int size);
int lazy_select_context(int profile);
uint8_t* lazy_pass_ptr();
uint8_t* lazy_steps_ptr();
uint8_t* lazy_inbound_ptr();
int lazy_commit_sector(int sx,int sz);
int lazy_remove_sector(int sx,int sz);
int lazy_route(int fromX,int fromZ,int toX,int toZ);
int lazy_component(int worldX,int worldZ);
int32_t* lazy_route_ptr();
int lazy_loaded_sectors();
int lazy_sector_slots();
int lazy_sector_updates();
int lazy_portal_count();
int lazy_portal_world_points(int encoded,float* out);
int lazy_grid_edge(int x,int z,int nx,int nz);
}

namespace {
constexpr int side=48,grid=49,sector=12;
constexpr int pad=4,latticeSpan=grid+pad*2;
constexpr int propBucketWidth=8,propBucketSide=8;
constexpr double maxIndexedRadius=2.0;
constexpr double pi=3.14159265358979323846;
struct Prop {float x,z,y,radius,scale,yaw;int32_t slot,group,gx,gz;};
static_assert(sizeof(Prop)==40);
struct PropKey {int32_t group,gx,gz;bool operator==(const PropKey& other)const{
  return group==other.group&&gx==other.gx&&gz==other.gz;
}};
struct PropKeyHash {size_t operator()(const PropKey& key)const{
  const uint64_t a=uint32_t(key.group)*0x9e3779b185ebca87ULL;
  const uint64_t b=uint32_t(key.gx)*0xc2b2ae3d27d4eb4fULL;
  const uint64_t c=uint32_t(key.gz)*0x165667b19e3779f9ULL;
  return size_t(a^b^c);
}};
struct Pond {double x,z,radius,level;};
struct ChunkSpatialSample {std::vector<double> lattice;std::vector<Pond> ponds;};
struct WaterPoint {double x,z;};
struct Barrier {int id;float x,z,halfX,halfZ,yaw,c,s;uint8_t passMask;};
struct BarrierStateRecord {int32_t id;float x,z,halfX,halfZ,yaw;int32_t passMask;};
static_assert(sizeof(BarrierStateRecord)==28);
constexpr int maxPolygonVertices=64;
struct PolygonObstacle {int id;uint8_t passMask;float minX,minZ,maxX,maxZ;std::vector<float> xy;};
struct PolygonStateRecord {int32_t id,count,passMask,reserved;float xy[maxPolygonVertices*2];};
static_assert(sizeof(PolygonStateRecord)==528);
struct SettlementStateRecord {float x,z,hx,hz;};
static_assert(sizeof(SettlementStateRecord)==16);
struct BarrierIndex {
  std::unordered_map<int,Barrier> byId;
  std::unordered_map<uint64_t,std::vector<int>> buckets;
};
struct Settlement {bool active=false;double x=0,z=0,y=0,hx=0,hz=0,clearRadius=0,softRadius=0,haloRadius=0;};
struct ChunkRaster {int cx,cz;std::vector<uint8_t> pass,steps,inbound;};
struct NavProfile {float radius=0;bool worker=false,ready=false;std::unordered_map<uint64_t,ChunkRaster> rasters;};
WILD_SAMPLING_LOCAL uint32_t worldSeed=0;
WILD_SAMPLING_LOCAL int worldBiome=0; // 0: savanna, 1: desert, 2: grand river, 3: volcanoes, 4: mangrove, 5: canyons.
WILD_SAMPLING_LOCAL bool canyonOpenRight=false; // Experimental biome variant 6: one west wall and a traversable east plateau.
WILD_SAMPLING_LOCAL int chunkX=0,chunkZ=0;
int nextBarrierId=1;
int nextPolygonId=1;
WILD_SAMPLING_LOCAL float radiusNow=.3f;
WILD_SAMPLING_LOCAL bool workerNow=true;
bool navReady=false;
WILD_SAMPLING_LOCAL std::vector<float> heights,colors;
std::vector<float> groundQueryInput,groundQueryOutput;
std::vector<float> horizonTerrain,horizonWater;
WILD_SAMPLING_LOCAL std::vector<uint8_t> water;
WILD_SAMPLING_LOCAL std::vector<uint8_t> groundMask;
WILD_SAMPLING_LOCAL std::vector<float> waterLevels;
WILD_SAMPLING_LOCAL std::vector<float> waterTriangles;
WILD_SAMPLING_LOCAL std::vector<double> lattice;
WILD_SAMPLING_LOCAL std::vector<Pond> ponds;
WILD_SAMPLING_LOCAL std::unordered_map<uint64_t,ChunkSpatialSample>* residentSpatialRegistry=nullptr;
std::unordered_map<uint64_t,ChunkSpatialSample>& residentSpatial(){
  if(!residentSpatialRegistry)residentSpatialRegistry=new std::unordered_map<uint64_t,ChunkSpatialSample>();
  return *residentSpatialRegistry;
}
WILD_SAMPLING_LOCAL std::vector<Prop> props;
WILD_SAMPLING_LOCAL std::vector<Prop> solidProps;
std::unordered_map<uint64_t,std::vector<Prop>>* residentPropRegistry=nullptr;
std::unordered_map<uint64_t,std::vector<Prop>>& residentSolidProps(){
  if(!residentPropRegistry)residentPropRegistry=new std::unordered_map<uint64_t,std::vector<Prop>>();
  return *residentPropRegistry;
}
std::unordered_map<uint64_t,std::vector<Prop>>* residentVisiblePropRegistry=nullptr;
std::unordered_map<uint64_t,std::vector<Prop>>& residentVisibleProps(){
  if(!residentVisiblePropRegistry)
    residentVisiblePropRegistry=new std::unordered_map<uint64_t,std::vector<Prop>>();
  return *residentVisiblePropRegistry;
}
WILD_SAMPLING_LOCAL std::unordered_set<PropKey,PropKeyHash>* removedPropRegistry=nullptr;
// Geometry retained only for a prop that was resident when suppressed. This
// lets a preview restore that exact local footprint without rebuilding every
// loaded sector. Settlement regeneration clears these witnesses.
std::unordered_map<PropKey,Prop,PropKeyHash>* removedPropGeometryRegistry=nullptr;
std::unordered_map<PropKey,Prop,PropKeyHash>& removedPropGeometry(){
  if(!removedPropGeometryRegistry)
    removedPropGeometryRegistry=new std::unordered_map<PropKey,Prop,PropKeyHash>();
  return *removedPropGeometryRegistry;
}
std::vector<int32_t> removedPropState;
std::unordered_set<PropKey,PropKeyHash>& removedProps(){
  if(!removedPropRegistry)removedPropRegistry=new std::unordered_set<PropKey,PropKeyHash>();
  return *removedPropRegistry;
}
WILD_SAMPLING_LOCAL std::array<std::vector<int>,propBucketSide*propBucketSide> propBuckets;
WILD_SAMPLING_LOCAL int haloPropCount=0;
BarrierIndex* barrierRegistry=nullptr;
BarrierIndex& barrierIndex(){
  if(!barrierRegistry)barrierRegistry=new BarrierIndex();
  return *barrierRegistry;
}
struct PolygonIndex {
  std::unordered_map<int,PolygonObstacle> byId;
  std::unordered_map<uint64_t,std::vector<int>> buckets;
};
PolygonIndex* polygonRegistry=nullptr;
PolygonIndex& polygonIndex(){
  if(!polygonRegistry)polygonRegistry=new PolygonIndex();
  return *polygonRegistry;
}
std::vector<float> polygonInput;
std::vector<float> regionBatchInput;
std::vector<int32_t> regionBatchOutput;
std::vector<PolygonStateRecord> polygonState;
WILD_SAMPLING_LOCAL std::vector<Settlement> settlements;
std::vector<int32_t> changedSettlementChunks;
WILD_SAMPLING_LOCAL std::vector<size_t> nearbySettlements;
// No-entry WASM does not initialize C++ globals; construct profiles lazily.
constexpr int navigationProfiles=6;
NavProfile* navProfiles[navigationProfiles]={};
NavProfile& navProfile(int index){
  NavProfile*& profile=navProfiles[index];
  if(!profile)profile=new NavProfile();
  return *profile;
}
float maxBuiltRadius(){
  float result=0;
  for(int i=0;i<navigationProfiles;i++)if(navProfiles[i]&&navProfiles[i]->ready)
    result=std::max(result,navProfiles[i]->radius);
  return result;
}
int activeProfile=0;
std::unordered_map<uint64_t,ChunkRaster>* chunkRasters=nullptr;
std::vector<std::pair<int,int>> loadedChunks;
std::vector<float> barrierBatch;
std::vector<int> barrierBatchIds;
std::vector<int> barrierRemovalIds;
std::vector<Barrier> deferredBarrierRefresh;
bool batchingBarriers=false;
std::vector<BarrierStateRecord> barrierState;
std::vector<SettlementStateRecord> settlementState;
void saveProfile(){
  NavProfile& profile=navProfile(activeProfile);
  profile.radius=radiusNow;profile.worker=workerNow;profile.ready=navReady;
}
void selectProfile(int index){
  saveProfile();activeProfile=index;
  const NavProfile& profile=navProfile(index);
  radiusNow=profile.radius;workerNow=profile.worker;navReady=profile.ready;
  chunkRasters=&navProfile(index).rasters;
  lazy_select_context(index);
}
uint64_t chunkKey(int cx,int cz){return (uint64_t(uint32_t(cx))<<32)|uint32_t(cz);}
const ChunkSpatialSample* residentSample(double x,double z,int* outCx=nullptr,int* outCz=nullptr){
  const int cx=int(std::floor((x+24)/side)),cz=int(std::floor((z+24)/side));
  const int candidatesX[2]={cx,cx-1},candidatesZ[2]={cz,cz-1};
  for(int iz=0;iz<(z==cz*side-24?2:1);iz++)
    for(int ix=0;ix<(x==cx*side-24?2:1);ix++){
      const int px=candidatesX[ix],pz=candidatesZ[iz];
      const auto found=residentSpatial().find(chunkKey(px,pz));
      if(found==residentSpatial().end())continue;
      if(outCx)*outCx=px;if(outCz)*outCz=pz;
      return &found->second;
    }
  return nullptr;
}
constexpr int barrierBucketWidth=8;
uint64_t barrierKey(int bx,int bz){return chunkKey(bx,bz);}
float barrierExtentX(const Barrier& barrier){return std::abs(barrier.c)*barrier.halfX+std::abs(barrier.s)*barrier.halfZ;}
float barrierExtentZ(const Barrier& barrier){return std::abs(barrier.s)*barrier.halfX+std::abs(barrier.c)*barrier.halfZ;}
void indexBarrier(const Barrier& barrier,bool add){
  const float extentX=barrierExtentX(barrier),extentZ=barrierExtentZ(barrier);
  const int minX=int(std::floor((barrier.x-extentX-maxIndexedRadius)/barrierBucketWidth));
  const int maxX=int(std::floor((barrier.x+extentX+maxIndexedRadius)/barrierBucketWidth));
  const int minZ=int(std::floor((barrier.z-extentZ-maxIndexedRadius)/barrierBucketWidth));
  const int maxZ=int(std::floor((barrier.z+extentZ+maxIndexedRadius)/barrierBucketWidth));
  auto& buckets=barrierIndex().buckets;
  for(int bz=minZ;bz<=maxZ;bz++)for(int bx=minX;bx<=maxX;bx++){
    const auto key=barrierKey(bx,bz);
    if(add)buckets[key].push_back(barrier.id);
    else if(auto it=buckets.find(key);it!=buckets.end()){
      auto& ids=it->second;
      ids.erase(std::remove(ids.begin(),ids.end(),barrier.id),ids.end());
      if(ids.empty())buckets.erase(it);
    }
  }
}
void indexPolygon(const PolygonObstacle& polygon,bool add){
  const int minX=int(std::floor((polygon.minX-maxIndexedRadius)/barrierBucketWidth));
  const int maxX=int(std::floor((polygon.maxX+maxIndexedRadius)/barrierBucketWidth));
  const int minZ=int(std::floor((polygon.minZ-maxIndexedRadius)/barrierBucketWidth));
  const int maxZ=int(std::floor((polygon.maxZ+maxIndexedRadius)/barrierBucketWidth));
  for(int bz=minZ;bz<=maxZ;bz++)for(int bx=minX;bx<=maxX;bx++){
    const auto key=barrierKey(bx,bz);
    if(add)polygonIndex().buckets[key].push_back(polygon.id);
    else if(auto it=polygonIndex().buckets.find(key);it!=polygonIndex().buckets.end()){
      auto& ids=it->second;
      ids.erase(std::remove(ids.begin(),ids.end(),polygon.id),ids.end());
      if(ids.empty())polygonIndex().buckets.erase(it);
    }
  }
}
int floorDiv(int n,int d){return n>=0?n/d:-((-n+d-1)/d);}
const ChunkRaster* rasterAt(int x,int z){
  if(!chunkRasters)return nullptr;
  const auto it=chunkRasters->find(chunkKey(floorDiv(x+24,side),floorDiv(z+24,side)));
  return it==chunkRasters->end()?nullptr:&it->second;
}
int rasterIndex(const ChunkRaster& chunk,int x,int z){
  return (z-(chunk.cz*side-24))*side+x-(chunk.cx*side-24);
}
uint32_t hash(uint32_t a){a^=a>>16;a*=0x7feb352du;a^=a>>15;a*=0x846ca68bu;return a^(a>>16);}
uint32_t cellHash(int x,int z,uint32_t salt){return hash(worldSeed^uint32_t(x)*0x9e3779b1u^uint32_t(z)*0x85ebca77u^salt);}
double unit(uint32_t v){return double(v)/4294967296.0;}
double blend(double t){t=std::clamp(t,0.0,1.0);return t*t*(3-2*t);}
double noise(double x,double z,uint32_t salt){
  const int ix=int(std::floor(x)),iz=int(std::floor(z));
  const double u=blend(x-ix),v=blend(z-iz);
  const double a=unit(cellHash(ix,iz,salt)),b=unit(cellHash(ix+1,iz,salt));
  const double c=unit(cellHash(ix,iz+1,salt)),d=unit(cellHash(ix+1,iz+1,salt));
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
double riverX(double z){
  const double phase=unit(cellHash(9,7,63))*2*pi;
  return worldBiome==5?-20+std::sin(z*.012+phase)*22+
    std::sin(z*.027+phase*.71)*8:
    -20+std::sin(z*.035+phase)*17;
}
double canyonWaterHalf(double z){return 5.8+noise(z*.009,14,5901)*1.8;}
double mainRiverLevel(){return worldBiome==5?3.28:3.6;}
double mainRiverReach(double z){return worldBiome==5?canyonWaterHalf(z)+.6:6.1;}
double settlementBlend(const Settlement& site,double x,double z);
double wetlandMask(double x,double z){
  const double phase=unit(cellHash(9,7,63))*2*pi;
  const double warp=(noise(x*.065,z*.065,9201)-.5)*3.5;
  const double channelA=1-blend((std::abs(x-(-10+18*std::sin(z*.034+phase)+
    4.0*std::sin(z*.13+phase*.47)+warp))-1.3)/4.2);
  const double channelB=1-blend((std::abs(z-(4+16*std::sin(x*.027+phase*.71)+
    3.5*std::sin(x*.11-phase*.63)-warp))-1.2)/4.0);
  const double basin=blend((noise(x*.014,z*.014,9211)-.67)/.23);
  double mask=std::max({channelA,channelB*.96,basin*.92});
  // Movement queries can inspect any resident chunk while another chunk is
  // selected for rendering. Wetness must depend on the queried position,
  // never on the selected chunk's settlement shortlist.
  for(const Settlement& site:settlements){
    if(std::abs(x-site.x)>=site.hx+6||std::abs(z-site.z)>=site.hz+6)continue;
    mask*=1-settlementBlend(site,x,z);
  }
  return std::clamp(mask,0.0,1.0);
}
struct DesertSample {double height,dune,swale,gravel;};
DesertSample desertSample(double x,double z){
  const double wind=(unit(cellHash(3,9,7193))-.5)*1.30;
  const double co=std::cos(wind),si=std::sin(wind);
  const double u=x*co+z*si,v=-x*si+z*co;
  const double phase=unit(cellHash(9,7,63))*2*pi;
  const double bend=11*std::sin(v*.024+phase)+5*std::sin(v*.057+phase*.41)
    +(noise(u*.007,v*.013,7101)-.5)*15;
  const double wave=(u+bend)/74+(noise(u*.004,v*.006,7103)-.5)*.42;
  const double q=wave-std::floor(wave),crest=.70;
  const double dune=q<crest?std::pow(blend(q/crest),1.12):
    std::pow(1-blend((q-crest)/(1-crest)),.96);
  const double pocket=blend((noise(u*.010+31,v*.012-17,7111)-.48)/.28);
  const double swale=1-blend((dune-.06)/.49),gravel=pocket*swale;
  const double amplitude=8.8+noise(u*.006,v*.009,7121)*4.2;
  const double secondary=std::pow(.5+.5*std::sin(u*.054+v*.011+phase),3)*2;
  const double height=4+noise(x*.003,z*.003,7127)*2.2+
    dune*amplitude*(1-gravel*.3)+secondary;
  return {height,dune,swale,gravel};
}
double baseHeight(double x,double z){
  if(worldBiome==1)return desertSample(x,z).height;
  if(worldBiome==4)return 3.32;
  if(worldBiome==5){
    const double dx=x-riverX(z),d=std::abs(dx),side=dx<0?-1:1;
    const double waterHalf=canyonWaterHalf(z),wallStart=17.8+noise(z*.014,side*17,2803)*5.5;
    const double level=3.28;
    if(d<=waterHalf+.6)
      return level-.92+1.05*blend((d-1.7)/(waterHalf+.6-1.7));
    const double floor=level+.13+blend((d-(waterHalf+.6))/(wallStart-(waterHalf+.6)))*.68+
      (noise(x*.13,z*.13,9513)-.5)*.18;
    if(canyonOpenRight&&side>0)return floor;
    const double flute=(noise(z*.095,side*9,6721)-.5)*2+
      (noise(z*.034,side*13,6517)-.5)*1.8;
    const double edge=wallStart+flute;
    const double rise=.54*blend((d-edge)/4.3)+
      .32*blend((d-edge-6.2)/3.5)+.14*blend((d-edge-12)/4);
    const double wallHeight=23+noise(z*.012,side*37,1483)*13;
    const double top=(noise(x*.027,z*.027,8432)-.5)*1.8*
      blend((d-edge-15)/15);
    return floor+rise*wallHeight+top;
  }
  const double broad=.58*noise(x*.012,z*.012,91)+.28*noise(x*.0243,z*.0243,9194)+.14*noise(x*.0496,z*.0496,29741);
  const double detail=noise(x*.050,z*.050,883);
  const double dry=2.4+broad*12+detail*2.2;
  const double d=std::abs(x-riverX(z));
  const double channel=3.6-.63+blend((d-1.8)/4.2)*.68;
  return channel+(dry-channel)*blend((d-17)/75);
}
double settlementBlend(const Settlement& site,double x,double z){
  const double edge=std::max(std::abs(x-site.x)-site.hx,
    std::abs(z-site.z)-site.hz);
  return 1-blend(edge/6);
}
bool settlementNearChunk(const Settlement& site,int cx,int cz){
  const double minX=cx*side-24,maxX=minX+side,minZ=cz*side-24,maxZ=minZ+side;
  const double px=std::clamp(site.x,minX,maxX),pz=std::clamp(site.z,minZ,maxZ);
  // Ponds can be generated from up to 20 m outside the chunk, then cleared
  // by a settlement another radius plus 11 m away from their center.
  return std::hypot(site.x-px,site.z-pz)<site.haloRadius+32;
}
void selectNearbySettlements(int cx,int cz){
  nearbySettlements.clear();
  for(size_t i=0;i<settlements.size();i++)
    if(settlementNearChunk(settlements[i],cx,cz))nearbySettlements.push_back(i);
}
void preparePonds(int cx,int cz){
  ponds.clear();
  if(worldBiome==1||worldBiome==4||worldBiome==5)return;
  constexpr double cell=64,halo=20;
  const double x0=cx*side-24,z0=cz*side-24;
  for(int tz=int(std::floor((z0-halo)/cell));tz<=int(std::floor((z0+side+halo)/cell));tz++)
  for(int tx=int(std::floor((x0-halo)/cell));tx<=int(std::floor((x0+side+halo)/cell));tx++){
    if(unit(cellHash(tx,tz,7201))>.68)continue;
    double x=(tx+.5+(unit(cellHash(tx,tz,7202))-.5)*.55)*cell;
    const double z=(tz+.5+(unit(cellHash(tx,tz,7203))-.5)*.55)*cell;
    const double river=riverX(z);
    if(std::abs(x-river)<24)x=river+(x<river?-24:24);
    const double radius=6+unit(cellHash(tx,tz,7204))*3.4;
    if(std::any_of(nearbySettlements.begin(),nearbySettlements.end(),[&](size_t i){
      const Settlement& site=settlements[i];
      return std::hypot(x-site.x,z-site.z)<site.clearRadius+radius+11;
    }))continue;
    const double reach=radius*1.4;
    if(x+reach<x0||x-reach>x0+side||z+reach<z0||z-reach>z0+side)continue;
    ponds.push_back({x,z,radius,baseHeight(x,z)-.4});
  }
}
double height(double x,double z){
  double h=baseHeight(x,z);
  for(const Pond& p:ponds){
    const double d=std::hypot(x-p.x,z-p.z)/p.radius;
    if(d>=1.35)continue;
    const double basin=p.level-.75+1.1*blend((d-.50)/.85);
    h=std::min(h,basin);
  }
  double weight=0,level=h;
  for(const size_t i:nearbySettlements){
    const Settlement& site=settlements[i];
    const double influence=settlementBlend(site,x,z);
    if(influence>weight){weight=influence;level=site.y;}
  }
  if(worldBiome==5&&std::abs(x-riverX(z))<mainRiverReach(z))return h;
  return h+(level-h)*weight;
}
double latticeHeight(int x,int z){
  const int ix=x-(chunkX*side-24)+pad,iz=z-(chunkZ*side-24)+pad;
  if(ix>=0&&iz>=0&&ix<latticeSpan&&iz<latticeSpan&&!lattice.empty())return lattice[iz*latticeSpan+ix];
  int cx=0,cz=0;
  if(const ChunkSpatialSample* sample=residentSample(x,z,&cx,&cz)){
    const int lx=x-(cx*side-24)+pad,lz=z-(cz*side-24)+pad;
    if(lx>=0&&lz>=0&&lx<latticeSpan&&lz<latticeSpan)
      return sample->lattice[lz*latticeSpan+lx];
  }
  return height(x,z);
}
double surface(double x,double z){
  const int ix=int(std::floor(x)),iz=int(std::floor(z));
  const double fx=x-ix,fz=z-iz;
  // All four interpolation corners normally belong to the same generated
  // lattice (including its halo). Resolve that lattice once instead of doing
  // a resident-chunk lookup for each corner during every swept route sample.
  const std::vector<double>* heights=&lattice;
  int lx=ix-(chunkX*side-24)+pad,lz=iz-(chunkZ*side-24)+pad;
  if(heights->empty()||lx<0||lz<0||lx+1>=latticeSpan||lz+1>=latticeSpan){
    int cx=0,cz=0;
    const ChunkSpatialSample* resident=residentSample(x,z,&cx,&cz);
    if(resident){
      heights=&resident->lattice;
      lx=ix-(cx*side-24)+pad;lz=iz-(cz*side-24)+pad;
    }
  }
  if(!heights->empty()&&lx>=0&&lz>=0&&
     lx+1<latticeSpan&&lz+1<latticeSpan){
    const double a=(*heights)[lz*latticeSpan+lx];
    const double b=(*heights)[lz*latticeSpan+lx+1];
    const double d=(*heights)[(lz+1)*latticeSpan+lx];
    const double c=(*heights)[(lz+1)*latticeSpan+lx+1];
    if(fx+fz<=1)return a+(b-a)*fx+(d-a)*fz;
    return c+(d-c)*(1-fx)+(b-c)*(1-fz);
  }
  if(fx+fz<=1){const double a=latticeHeight(ix,iz);return a+(latticeHeight(ix+1,iz)-a)*fx+(latticeHeight(ix,iz+1)-a)*fz;}
  const double c=latticeHeight(ix+1,iz+1);
  return c+(latticeHeight(ix,iz+1)-c)*(1-fx)+(latticeHeight(ix+1,iz)-c)*(1-fz);
}
double fluidLevelFor(double x,double z,const std::vector<Pond>& localPonds){
  if(worldBiome==1)return 0;
  if(worldBiome==4)return wetlandMask(x,z)>.61?3.34:0;
  if(worldBiome==5)return std::abs(x-riverX(z))<mainRiverReach(z)&&
    surface(x,z)<3.275?3.28:0;
  if(std::abs(x-riverX(z))<6.1&&surface(x,z)<3.58)return 3.6;
  for(const Pond& p:localPonds)if(std::hypot(x-p.x,z-p.z)<p.radius*.82&&surface(x,z)<p.level-.02)return p.level;
  return 0;
}
double fluidLevel(double x,double z){return fluidLevelFor(x,z,ponds);}
bool fluid(double x,double z){return fluidLevel(x,z)!=0;}
double waterShore(double x,double z,const std::vector<Pond>& localPonds){
  if(worldBiome==1)return std::numeric_limits<double>::infinity();
  if(worldBiome==4)return std::min(42.0,std::abs(wetlandMask(x,z)-.61)*52);
  double shore=std::abs(std::abs(x-riverX(z))-mainRiverReach(z));
  for(const Pond& p:localPonds)
    shore=std::min(shore,std::abs(std::hypot(x-p.x,z-p.z)-p.radius*.82));
  return shore;
}
double riverWetEdge(double z,int direction){
  const double center=riverX(z);
  if(fluidLevel(center,z)!=mainRiverLevel())return center;
  double wet=0,dry=mainRiverReach(z);
  for(int i=0;i<8;i++){
    const double middle=(wet+dry)*.5;
    if(fluidLevel(center+direction*middle,z)==mainRiverLevel())wet=middle;
    else dry=middle;
  }
  return center+direction*wet;
}
void buildGroundMask(int cx,int cz){
  // RGBA8 channels match the game's ground material contract: vegetation
  // cover, broad variation, moisture, settlement wear.
  groundMask.resize(35*35*4);
  const int x0=cx*side-24,z0=cz*side-24;
  for(int iz=0;iz<35;iz++)for(int ix=0;ix<35;ix++){
    const double x=x0+(ix-1)*1.5,z=z0+(iz-1)*1.5;
    const double vegetation=noise(x*.045,z*.045,3*7781);
    const double meso=std::clamp(noise(x*.030,z*.030,97103)*.64+
      noise(x*.115,z*.115,97109)*.36,0.0,1.0);
    const double broad=.58*noise(x*.027,z*.027,4916)
      +.28*noise(x*.0548,z*.0548,4916^9271)
      +.14*noise(x*.1115,z*.1115,4916^29714);
    const double shore=std::abs(x-riverX(z));
    const double moisture=worldBiome==1?0:worldBiome==4?
      std::clamp(.52+broad*.18+wetlandMask(x,z)*.32,0.0,1.0):
      std::clamp(.2+broad*.55+(1-blend((shore-6)/17))*.35,0.0,1.0);
    const double cover=worldBiome==1?
      blend((vegetation*.57+meso*.28-.52)/.44)*.18:
      worldBiome==2||worldBiome==4?blend((vegetation*.57+meso*.28+moisture*.20-.22)/.42)*.96:
      worldBiome==5?blend((vegetation*.57+meso*.28+moisture*.15-.28)/.44)*.42:
      blend((vegetation*.57+meso*.28+moisture*.15-.28)/.44)*(worldBiome==3?.55:.96);
    const int at=(iz*35+ix)*4;
    groundMask[at]=uint8_t(std::lround(cover*255));
    groundMask[at+1]=uint8_t(std::lround(meso*255));
    groundMask[at+2]=uint8_t(std::lround(moisture*255));
    double wear=0;
    for(const size_t i:nearbySettlements){
      const Settlement& site=settlements[i];
      const double dx=x-site.x,dz=z-site.z,d=std::hypot(dx,dz);
      if(d<site.haloRadius+4){
        const double core=1-blend((d-site.clearRadius*.48)/
          (site.clearRadius+2.3+(meso-.5)*3-site.clearRadius*.48));
        const double warp=(noise(x*.055,z*.055,97137)-.5)*1.05;
        const double line=std::min(std::abs(dx+warp),std::abs(dz-warp));
        const double path=(1-blend((line-1.05)/2.05))*
          (1-blend((d-(site.softRadius-2))/(site.haloRadius-site.softRadius+3)));
        wear=std::max(wear,std::clamp(std::max(core*(.81+.19*meso),path*.74),0.0,1.0));
      }
    }
    groundMask[at+3]=uint8_t(std::lround(wear*255));
  }
}
void waterTriangle(const WaterPoint& a,const WaterPoint& b,const WaterPoint& c,double y){
  for(const WaterPoint& p:{a,b,c}){
    waterTriangles.push_back(float(p.x));waterTriangles.push_back(float(y));waterTriangles.push_back(float(p.z));
  }
}
std::vector<WaterPoint> clipWaterPolygon(const std::vector<WaterPoint>& source,bool alongX,double limit,bool greater){
  std::vector<WaterPoint> result;
  if(source.empty())return result;
  WaterPoint previous=source.back();
  auto coordinate=[alongX](const WaterPoint& p){return alongX?p.x:p.z;};
  bool wasInside=greater?coordinate(previous)>=limit:coordinate(previous)<=limit;
  for(const WaterPoint& current:source){
    const bool inside=greater?coordinate(current)>=limit:coordinate(current)<=limit;
    if(inside!=wasInside){
      const double t=(limit-coordinate(previous))/(coordinate(current)-coordinate(previous));
      result.push_back({previous.x+(current.x-previous.x)*t,previous.z+(current.z-previous.z)*t});
    }
    if(inside)result.push_back(current);
    previous=current;wasInside=inside;
  }
  return result;
}
bool riverTriangleWet(const WaterPoint& a,const WaterPoint& b,const WaterPoint& c){
  return fluidLevel((a.x+b.x+c.x)/3,(a.z+b.z+c.z)/3)==mainRiverLevel();
}
struct RiverEdgeCache {
  double minZ,minX,maxX;
  std::array<std::pair<double,double>,side*8+1> edges{};
  std::array<bool,side*8+1> ready{};
  const std::pair<double,double>& at(double z){
    const int i=std::clamp(int(std::lround((z-minZ)*8)),0,side*8);
    if(!ready[i]){
      edges[i]={std::clamp(riverWetEdge(z,-1),minX,maxX),
        std::clamp(riverWetEdge(z,1),minX,maxX)};
      ready[i]=true;
    }
    return edges[i];
  }
};
void buildRiverStrip(double z0,double z1,RiverEdgeCache& cache,int depth,bool nearSettlement){
  const auto [left0,right0]=cache.at(z0);
  const auto [left1,right1]=cache.at(z1);
  if(right0<=left0&&right1<=left1)return;
  const double middle=(z0+z1)*.5;
  const auto [middleLeft,middleRight]=cache.at(middle);
  if(depth<3&&(std::abs(middleLeft-(left0+left1)*.5)>.04||
               std::abs(middleRight-(right0+right1)*.5)>.04)){
    buildRiverStrip(z0,middle,cache,depth+1,nearSettlement);
    buildRiverStrip(middle,z1,cache,depth+1,nearSettlement);
    return;
  }
  if(nearSettlement){
    constexpr int slices=13;
    for(int i=0;i<slices;i++){
      const double t0=double(i)/slices,t1=double(i+1)/slices;
      const WaterPoint a{left0+(right0-left0)*t0,z0};
      const WaterPoint b{left0+(right0-left0)*t1,z0};
      const WaterPoint c{left1+(right1-left1)*t1,z1};
      const WaterPoint d{left1+(right1-left1)*t0,z1};
      if(riverTriangleWet(a,d,b))waterTriangle(a,d,b,mainRiverLevel());
      if(riverTriangleWet(b,d,c))waterTriangle(b,d,c,mainRiverLevel());
    }
    return;
  }
  const WaterPoint a{left0,z0},b{right0,z0},c{right1,z1},d{left1,z1};
  const bool first=riverTriangleWet(a,d,b),second=riverTriangleWet(b,d,c);
  if(first&&second){waterTriangle(a,d,b,mainRiverLevel());waterTriangle(b,d,c,mainRiverLevel());return;}
  if(depth<3){
    buildRiverStrip(z0,middle,cache,depth+1,false);
    buildRiverStrip(middle,z1,cache,depth+1,false);
  }else{
    if(first)waterTriangle(a,d,b,mainRiverLevel());
    if(second)waterTriangle(b,d,c,mainRiverLevel());
  }
}
void buildWaterMesh(int cx,int cz){
  waterTriangles.clear();
  if(worldBiome==1)return;
  const double minX=cx*side-24,maxX=minX+side,minZ=cz*side-24,maxZ=minZ+side;
  if(worldBiome==4){
    // Clip each terrain triangle against the same inundation threshold used
    // for navigation. A shared vertex mask keeps adjacent chunks seamless.
    std::array<float,(side+1)*(side+1)> mask{};
    for(int z=0;z<=side;z++)for(int x=0;x<=side;x++)
      mask[z*(side+1)+x]=float(wetlandMask(minX+x,minZ+z));
    struct WetVertex {WaterPoint point;double mask;};
    auto emit=[&](WetVertex a,WetVertex b,WetVertex c){
      std::array<WetVertex,6> input{a,b,c},output{};
      int count=3,next=0;
      for(int i=0;i<count;i++){
        const WetVertex& from=input[i],& to=input[(i+1)%count];
        const bool inside=from.mask>.61,enter=to.mask>.61;
        if(inside)output[next++]=from;
        if(inside!=enter){
          const double t=(.61-from.mask)/(to.mask-from.mask);
          output[next++]={{from.point.x+(to.point.x-from.point.x)*t,
            from.point.z+(to.point.z-from.point.z)*t},.61};
        }
      }
      for(int i=1;i+1<next;i++){
        const auto& a=output[0].point,& b=output[i].point,& c=output[i+1].point;
        if(wetlandMask((a.x+b.x+c.x)/3,(a.z+b.z+c.z)/3)>.61)
          waterTriangle(a,b,c,3.34);
      }
    };
    for(int z=0;z<side;z++)for(int x=0;x<side;x++){
      const double wx=minX+x,wz=minZ+z;
      const WetVertex a{{wx,wz},mask[z*(side+1)+x]};
      const WetVertex b{{wx+1,wz},mask[z*(side+1)+x+1]};
      const WetVertex d{{wx,wz+1},mask[(z+1)*(side+1)+x]};
      const WetVertex c{{wx+1,wz+1},mask[(z+1)*(side+1)+x+1]};
      emit(a,d,b);emit(b,d,c);
    }
    return;
  }
  RiverEdgeCache riverEdges{minZ,minX,maxX};
  for(int z=int(minZ);z<int(maxZ);z++){
    const bool nearSettlement=std::any_of(nearbySettlements.begin(),nearbySettlements.end(),[&](size_t i){
      const Settlement& site=settlements[i];
      return z+1>=site.z-site.hz-6&&z<=site.z+site.hz+6&&
        riverX(z)+mainRiverReach(z)>=site.x-site.hx-6&&
        riverX(z)-mainRiverReach(z)<=site.x+site.hx+6;
    });
    buildRiverStrip(z,z+1,riverEdges,0,nearSettlement);
  }
  for(const Pond& p:ponds){
    std::vector<WaterPoint> outline;outline.reserve(48);
    for(int i=0;i<48;i++){
      const double angle=2*pi*i/48;
      outline.push_back({p.x+std::cos(angle)*p.radius*.82,p.z+std::sin(angle)*p.radius*.82});
    }
    outline=clipWaterPolygon(outline,true,minX,true);
    outline=clipWaterPolygon(outline,true,maxX,false);
    outline=clipWaterPolygon(outline,false,minZ,true);
    outline=clipWaterPolygon(outline,false,maxZ,false);
    for(size_t i=1;i+1<outline.size();i++)waterTriangle(outline[0],outline[i+1],outline[i],p.level);
  }
}
bool terrainValid(double x,double z,float radius,bool worker){
  auto travelSurface=[&](double px,double pz){
    const double ground=surface(px,pz);
    return worldBiome==5&&worker?std::max(ground,3.28):ground;
  };
  for(int i=0;i<5;i++){
    const double px=x+(i==1?radius:i==2?-radius:0),pz=z+(i==3?radius:i==4?-radius:0);
    if(!(worldBiome==5&&worker)&&fluid(px,pz))return false;
    if(std::hypot(travelSurface(px+.8,pz)-travelSurface(px-.8,pz),
      travelSurface(px,pz+.8)-travelSurface(px,pz-.8))/1.6>.5)return false;
  }
  return true;
}
bool propBlocked(double x,double z){
  const int x0=chunkX*side-24-8,z0=chunkZ*side-24-8;
  const int bx=int(std::floor((x-x0)/propBucketWidth)),bz=int(std::floor((z-z0)/propBucketWidth));
  if(bx<0||bz<0||bx>=propBucketSide||bz>=propBucketSide){
    for(const Prop& p:solidProps){
      const double dx=p.x-x,dz=p.z-z,r=p.radius+radiusNow;
      if(dx*dx+dz*dz<r*r)return true;
    }
    return false;
  }
  for(const int index:propBuckets[bz*propBucketSide+bx]){
    const Prop& p=solidProps[index];
    const double dx=p.x-x,dz=p.z-z,r=p.radius+radiusNow;
    if(dx*dx+dz*dz<r*r)return true;
  }
  return false;
}
bool residentPropBlocked(double x,double z,int cx,int cz){
  if(cx==chunkX&&cz==chunkZ)return propBlocked(x,z);
  const auto found=residentSolidProps().find(chunkKey(cx,cz));
  if(found==residentSolidProps().end())return true; // Unloaded terrain is never certified clear.
  for(const Prop& p:found->second){
    const double dx=p.x-x,dz=p.z-z,r=p.radius+radiusNow;
    if(dx*dx+dz*dz<r*r)return true;
  }
  return false;
}
void indexSolidProps(){
  for(auto& bucket:propBuckets)bucket.clear();
  const int x0=chunkX*side-24-8,z0=chunkZ*side-24-8;
  for(int i=0;i<int(solidProps.size());i++){
    const Prop& p=solidProps[i];
    const double r=p.radius+maxIndexedRadius;
    const int a=std::max(0,int(std::floor((p.x-r-x0)/propBucketWidth)));
    const int b=std::min(propBucketSide-1,int(std::floor((p.x+r-x0)/propBucketWidth)));
    const int c=std::max(0,int(std::floor((p.z-r-z0)/propBucketWidth)));
    const int d=std::min(propBucketSide-1,int(std::floor((p.z+r-z0)/propBucketWidth)));
    for(int z=c;z<=d;z++)for(int x=a;x<=b;x++)propBuckets[z*propBucketSide+x].push_back(i);
  }
}
bool terrainPropWalkable(int x,int z){
  if(!terrainValid(x,z,radiusNow,workerNow))return false;
  return !propBlocked(x,z);
}
bool polygonBlocks(const PolygonObstacle& p,double x,double z,uint8_t profileBit){
  if(p.passMask&profileBit||x<p.minX-radiusNow||x>p.maxX+radiusNow||
     z<p.minZ-radiusNow||z>p.maxZ+radiusNow)return false;
  bool inside=false;
  double nearest=std::numeric_limits<double>::infinity();
  const int count=int(p.xy.size()/2);
  for(int i=0,j=count-1;i<count;j=i++){
    const double ax=p.xy[i*2],az=p.xy[i*2+1],bx=p.xy[j*2],bz=p.xy[j*2+1];
    if((az>z)!=(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    const double dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
    const double t=length?std::clamp(((x-ax)*dx+(z-az)*dz)/length,0.0,1.0):0;
    nearest=std::min(nearest,std::hypot(x-ax-dx*t,z-az-dz*t));
  }
  return inside||nearest<radiusNow;
}
bool barrierClear(double x,double z,const int* ignored=nullptr,int ignoredCount=0){
  const uint8_t profileBit=workerNow?1:2;
  const int bx=int(std::floor(x/barrierBucketWidth)),bz=int(std::floor(z/barrierBucketWidth));
  const auto key=barrierKey(bx,bz);
  const auto& index=barrierIndex();
  if(const auto bucket=index.buckets.find(key);bucket!=index.buckets.end()){
    for(const int id:bucket->second){
      if(ignored&&std::find(ignored,ignored+ignoredCount,id)!=ignored+ignoredCount)continue;
      const Barrier& w=index.byId.at(id);
      if(w.passMask&profileBit)continue;
      const double dx=x-w.x,dz=z-w.z;
      if(std::abs(dx*w.c-dz*w.s)<w.halfX+radiusNow&&
         std::abs(dx*w.s+dz*w.c)<w.halfZ+radiusNow)return false;
    }
  }
  if(polygonRegistry&&!polygonRegistry->byId.empty()){
    const auto& polygons=*polygonRegistry;
    if(const auto bucket=polygons.buckets.find(key);bucket!=polygons.buckets.end())
    for(const int id:bucket->second){
      const PolygonObstacle& p=polygons.byId.at(id);
      if(polygonBlocks(p,x,z,profileBit))return false;
    }
  }
  return true;
}
// The grid samples wall edges every 0.2 m. A diagonal module can intersect
// the swept centre line only between those samples, even though both grid
// endpoints are clear. Test the exact segment against the same expanded
// rectangles used by barrierClear, so planning and continuous motion agree.
bool wallSegmentClear(double x,double z,double nx,double nz,
  const int* ignored=nullptr,int ignoredCount=0){
  const uint8_t profileBit=workerNow?1:2;
  const auto& index=barrierIndex();
  const int minBx=int(std::floor(std::min(x,nx)/barrierBucketWidth));
  const int maxBx=int(std::floor(std::max(x,nx)/barrierBucketWidth));
  const int minBz=int(std::floor(std::min(z,nz)/barrierBucketWidth));
  const int maxBz=int(std::floor(std::max(z,nz)/barrierBucketWidth));
  for(int bz=minBz;bz<=maxBz;bz++)for(int bx=minBx;bx<=maxBx;bx++){
    const auto bucket=index.buckets.find(barrierKey(bx,bz));
    if(bucket==index.buckets.end())continue;
    for(const int id:bucket->second){
      if(ignored&&std::find(ignored,ignored+ignoredCount,id)!=ignored+ignoredCount)continue;
      const Barrier& wall=index.byId.at(id);
      if(wall.passMask&profileBit)continue;
      const double dx=x-wall.x,dz=z-wall.z,ex=nx-wall.x,ez=nz-wall.z;
      const double a[2]={dx*wall.c-dz*wall.s,dx*wall.s+dz*wall.c};
      const double b[2]={ex*wall.c-ez*wall.s,ex*wall.s+ez*wall.c};
      const double half[2]={wall.halfX+radiusNow,wall.halfZ+radiusNow};
      double entry=0,exit=1;
      bool possible=true;
      for(int axis=0;axis<2;axis++){
        const double delta=b[axis]-a[axis];
        if(std::abs(delta)<1e-12){
          if(std::abs(a[axis])>=half[axis]){possible=false;break;}
          continue;
        }
        const double t0=(-half[axis]-a[axis])/delta;
        const double t1=(half[axis]-a[axis])/delta;
        entry=std::max(entry,std::min(t0,t1));
        exit=std::min(exit,std::max(t0,t1));
      }
      if(possible&&entry<=exit){
        const double t=(entry+exit)*.5;
        if(std::abs(a[0]+(b[0]-a[0])*t)<half[0]&&
           std::abs(a[1]+(b[1]-a[1])*t)<half[1])return false;
      }
    }
  }
  return true;
}
bool walkable(int x,int z){
  const ChunkRaster* chunk=rasterAt(x,z);
  return chunk&&chunk->pass[rasterIndex(*chunk,x,z)]&&barrierClear(x,z);
}
bool terrainPropSegment(int x,int z,int nx,int nz){
  // Match spatial_local_clear's 0.2 m samples on a one-metre grid edge.
  // Otherwise the abstract graph can admit an edge that continuous motion
  // immediately rejects, leaving an exhausted raider unable to retreat.
  for(int i=1;i<5;i++){
    const double t=i/5.0,px=x+(nx-x)*t,pz=z+(nz-z)*t;
    if(!terrainValid(px,pz,radiusNow,workerNow))return false;
    if(propBlocked(px,pz))return false;
  }
  return true;
}
bool terrainPropEdge(int x,int z,int nx,int nz){
  return terrainPropWalkable(x,z)&&terrainPropWalkable(nx,nz)&&terrainPropSegment(x,z,nx,nz);
}
bool wallEdgeClear(int x,int z,int nx,int nz){
  if(!wallSegmentClear(x,z,nx,nz))return false;
  if(!barrierClear(x,z)||!barrierClear(nx,nz))return false;
  for(int i=1;i<5;i++){
    const double t=i/5.0;
    if(!barrierClear(x+(nx-x)*t,z+(nz-z)*t))return false;
  }
  return true;
}
bool edge(int x,int z,int nx,int nz){
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  int direction=-1;
  for(int d=0;d<4;d++)if(nx==x+dx[d]&&nz==z+dz[d]){direction=d;break;}
  if(direction<0||!walkable(x,z)||!walkable(nx,nz))return false;
  const ChunkRaster* chunk=rasterAt(x,z);
  const bool base=chunk&&!!(chunk->steps[rasterIndex(*chunk,x,z)]&(1<<direction));
  return base&&wallEdgeClear(x,z,nx,nz);
}
void prepareSectorOverlay(int sx,int sz,uint8_t* pass,uint8_t* steps,uint8_t* inbound){
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int lz=0;lz<sector;lz++)for(int lx=0;lx<sector;lx++){
    const int i=lz*sector+lx,x=sx*sector+lx,z=sz*sector+lz;
    pass[i]=walkable(x,z);steps[i]=inbound[i]=0;
    if(!pass[i])continue;
    for(int d=0;d<4;d++){
      const int nx=x+dx[d],nz=z+dz[d];
      if(!rasterAt(nx,nz)){
        const ChunkRaster* chunk=rasterAt(x,z);
        const int at=rasterIndex(*chunk,x,z);
        if((chunk->steps[at]&(1<<d))&&wallEdgeClear(x,z,nx,nz))steps[i]|=1<<d;
        if((chunk->inbound[at]&(1<<d))&&wallEdgeClear(nx,nz,x,z))inbound[i]|=1<<d;
        continue;
      }
      if(edge(x,z,nx,nz))steps[i]|=1<<d;
      if(edge(nx,nz,x,z))inbound[i]|=1<<d;
    }
  }
}
void refreshSector(int sx,int sz){
  SPATIAL_TICK(sectorFillStarted);
  prepareSectorOverlay(sx,sz,lazy_pass_ptr(),lazy_steps_ptr(),lazy_inbound_ptr());
  SPATIAL_TOCK(12,sectorFillStarted);SPATIAL_TICK(sectorGraphStarted);
  lazy_commit_sector(sx,sz);
  SPATIAL_TOCK(13,sectorGraphStarted);
}
template<class F> void forEachRectSector(int minX,int minZ,int maxX,int maxZ,F visit){
  if(!navReady)return;
  for(int cz=floorDiv(minZ+24,side);cz<=floorDiv(maxZ+24,side);cz++)
  for(int cx=floorDiv(minX+24,side);cx<=floorDiv(maxX+24,side);cx++){
    if(!chunkRasters->count(chunkKey(cx,cz)))continue;
    const int firstX=cx*side-24,firstZ=cz*side-24;
    if(maxX<firstX||minX>=firstX+side||maxZ<firstZ||minZ>=firstZ+side)continue;
    const int a=std::max(0,floorDiv(minX-firstX,sector)),b=std::min(3,floorDiv(maxX-firstX,sector));
    const int c=std::max(0,floorDiv(minZ-firstZ,sector)),d=std::min(3,floorDiv(maxZ-firstZ,sector));
    for(int sz=c;sz<=d;sz++)for(int sx=a;sx<=b;sx++)visit(firstX/sector+sx,firstZ/sector+sz);
  }
}
void refreshRect(int minX,int minZ,int maxX,int maxZ){
  forEachRectSector(minX,minZ,maxX,maxZ,[](int sx,int sz){refreshSector(sx,sz);});
}
void groundColorAt(double wx,double wz,float* output){
  if(worldBiome==1){
    const DesertSample sand=desertSample(wx,wz);
    const double fine=noise(wx*.057,wz*.057,7139);
    const double grass=.27+sand.dune*.37+fine*.14;
    const double gravel=sand.gravel*.20,shade=.96+noise(wx*.15,wz*.15,7151)*.055;
    constexpr double soil[3]={211.0/255,148.0/255,86.0/255};
    constexpr double light[3]={228.0/255,184.0/255,117.0/255};
    constexpr double rock[3]={183.0/255,118.0/255,77.0/255};
    for(int k=0;k<3;k++){
      const double base=soil[k]+(light[k]-soil[k])*grass;
      output[k]=float(std::clamp((base+(rock[k]-base)*gravel)*shade,0.0,1.0));
    }
    return;
  }
  const double patch=.58*noise(wx*.041,wz*.041,8913)
    +.28*noise(wx*.0832,wz*.0832,8913^9271)
    +.14*noise(wx*.1693,wz*.1693,8913^29714);
  const double grass=worldBiome==2||worldBiome==4?blend((patch-.20)/.39):blend((patch-.28)/.44);
  const double slope=std::hypot(latticeHeight(wx+1,wz)-latticeHeight(wx-1,wz),
    latticeHeight(wx,wz+1)-latticeHeight(wx,wz-1))*.5;
  const double rock=blend((slope-.42)/.98)*.62;
  const double bank=(1-blend((std::abs(wx-riverX(wz))-6)/4))*.58;
  const double shade=.94+noise(wx*.11,wz*.11,1181)*.12;
  constexpr double savannaSoil[3]={174.0/255,120.0/255,80.0/255};
  constexpr double savannaFoliage[3]={182.0/255,178.0/255,103.0/255};
  constexpr double savannaStone[3]={148.0/255,123.0/255,96.0/255};
  constexpr double riverSoil[3]={138.0/255,121.0/255,79.0/255};
  constexpr double riverFoliage[3]={127.0/255,156.0/255,76.0/255};
  constexpr double riverStone[3]={139.0/255,146.0/255,130.0/255};
  constexpr double volcanoSoil[3]={81.0/255,72.0/255,73.0/255};
  constexpr double volcanoFoliage[3]={121.0/255,114.0/255,72.0/255};
  constexpr double volcanoStone[3]={68.0/255,68.0/255,72.0/255};
  constexpr double mangroveSoil[3]={165.0/255,138.0/255,101.0/255};
  constexpr double mangroveFoliage[3]={148.0/255,155.0/255,102.0/255};
  constexpr double mangroveStone[3]={140.0/255,134.0/255,119.0/255};
  constexpr double canyonSoil[3]={185.0/255,116.0/255,67.0/255};
  constexpr double canyonFoliage[3]={173.0/255,152.0/255,96.0/255};
  constexpr double canyonStone[3]={189.0/255,101.0/255,64.0/255};
  constexpr double sand[3]={210.0/255,186.0/255,135.0/255};
  for(int k=0;k<3;k++){
    const double soil=worldBiome==5?canyonSoil[k]:worldBiome==4?mangroveSoil[k]:worldBiome==3?volcanoSoil[k]:worldBiome==2?riverSoil[k]:savannaSoil[k];
    const double foliage=worldBiome==5?canyonFoliage[k]:worldBiome==4?mangroveFoliage[k]:worldBiome==3?volcanoFoliage[k]:worldBiome==2?riverFoliage[k]:savannaFoliage[k];
    const double stone=worldBiome==5?canyonStone[k]:worldBiome==4?mangroveStone[k]:worldBiome==3?volcanoStone[k]:worldBiome==2?riverStone[k]:savannaStone[k];
    double color=soil+(foliage-soil)*grass;
    color+=(stone-color)*rock;
    const double riverBank=worldBiome==3?soil+(volcanoStone[k]-soil)*.35:soil+(sand[k]-soil)*.34;
    color+=(riverBank-color)*(worldBiome==4?wetlandMask(wx,wz)*.17:bank);
    output[k]=float(std::clamp(color*shade,0.0,1.0));
  }
}
// Selected scratch only. Resident ownership is published by populateChunk below.
// This still reads the live generation inputs; it is not safe on a worker yet.
double proceduralPropSpacing(int type){
  constexpr double savannaSpacing[6]={13.5,7,2.8,9,10,32};
  constexpr double desertSpacing[6]={19,11,4.6,15,23,54};
  constexpr double canyonSpacing[6]={13,5.2,3.5,9,19,31};
  return worldBiome==1?desertSpacing[type]:worldBiome==5?canyonSpacing[type]:savannaSpacing[type];
}
void prepareSelectedChunk(int cx,int cz,bool visual){
  SPATIAL_TICK(populateStarted);SPATIAL_TICK(setupStarted);
  chunkX=cx;chunkZ=cz;props.clear();solidProps.clear();haloPropCount=0;
  selectNearbySettlements(cx,cz);
  // The standalone no-entry WASM binary has no startup constructor pass.
  preparePonds(cx,cz);
  if(visual){
    heights.assign(grid*grid,0);colors.assign(grid*grid*3,0);
    water.assign(side*side,0);waterLevels.assign(side*side,0);
  }
  SPATIAL_TOCK(5,setupStarted);SPATIAL_TICK(latticeStarted);
  const int x0=cx*side-24,z0=cz*side-24;
  lattice.resize(latticeSpan*latticeSpan);
  for(int z=0;z<latticeSpan;z++)for(int x=0;x<latticeSpan;x++)
    lattice[z*latticeSpan+x]=height(x0+x-pad,z0+z-pad);
  SPATIAL_TOCK(6,latticeStarted);
  if(visual){
  SPATIAL_TICK(colorStarted);
  for(int z=0;z<grid;z++)for(int x=0;x<grid;x++){
    const int i=z*grid+x,wx=x0+x,wz=z0+z;
    heights[i]=float(latticeHeight(wx,wz));
    // Biome-specific colors come from this C++ world, not a second JS recipe.
    groundColorAt(wx,wz,colors.data()+i*3);
  }
  SPATIAL_TOCK(7,colorStarted);SPATIAL_TICK(waterStarted);
  for(int z=0;z<side;z++)for(int x=0;x<side;x++){
    const double level=fluidLevel(x0+x+.5,z0+z+.5);
    water[z*side+x]=level!=0;waterLevels[z*side+x]=float(level);
  }
  SPATIAL_TOCK(8,waterStarted);SPATIAL_TICK(maskStarted);
  buildGroundMask(cx,cz);
  SPATIAL_TOCK(9,maskStarted);SPATIAL_TICK(meshStarted);
  buildWaterMesh(cx,cz);
  SPATIAL_TOCK(10,meshStarted);
  }
  SPATIAL_TICK(propsStarted);
  constexpr double savannaDensity[6]={.53,.51,.72,.30,.28,.63};
  constexpr double desertDensity[6]={.30,.22,.035,.17,.10,.12};
  constexpr double riverDensity[6]={.62,.63,.64,.28,.26,.57};
  constexpr double volcanoDensity[6]={.39,.44,.53,.52,.24,.60};
  constexpr double mangroveDensity[6]={.64,.72,1.0,.24,.18,.44};
  constexpr double canyonDensity[6]={.36,.40,.42,.55,.16,.40};
  constexpr int savannaOffsets[6]={0,4,7,10,13,17},savannaCounts[6]={4,3,3,3,4,2};
  constexpr int desertOffsets[6]={0,4,6,10,15,17},desertCounts[6]={4,2,4,5,2,3};
  constexpr int canyonOffsets[6]={0,5,7,10,15,2},canyonCounts[6]={2,2,3,5,2,3};
  // Generic scatter uses SLOTS radii; desert scatter uses authored bounds.
  // Keep the same distinction so long branches do not close generic corridors.
  constexpr float radii[20]={3.8f,3.1f,3.0f,1.7f,1.1f,.9f,1.4f,.45f,.35f,.5f,1.2f,1.7f,1.2f,1.8f,1.3f,1.0f,.9f,1.7f,4.0f,5.0f};
  constexpr float desertRadii[20]={3.6568f,2.4170f,2.3057f,2.4988f,.8174f,.7033f,.7061f,.6348f,.5378f,.6449f,1.4225f,2.2645f,1.05f,1.7903f,1.9822f,.85f,1.35f,5.2349f,5.9548f,2.4f};
  constexpr float canyonRadii[20]={4.2725f,2.9148f,11.9575f,8.5710f,11.2582f,.7518f,.9655f,.5382f,.6040f,.5602f,1.7548f,3.4760f,1.2f,1.8f,1.45f,.9f,1.2369f,1.3973f,6.1408f,3.25f};
  for(int type=0;type<6;type++){
    const double cell=proceduralPropSpacing(type);
    // A neighbor owns and renders a prop whose footprint crosses our edge.
    // Generate its collision record from the same global cells, without
    // duplicating the visible instance in this chunk.
    constexpr double halo=10;
    for(int gz=int(std::floor((double(z0)-halo)/cell));gz<=int(std::floor((double(z0+48)+halo)/cell));gz++)
      for(int gx=int(std::floor((double(x0)-halo)/cell));gx<=int(std::floor((double(x0+48)+halo)/cell));gx++){
        const uint32_t h=cellHash(gx,gz,301+type*71);
        if(unit(h)>(worldBiome==1?desertDensity[type]:worldBiome==2?riverDensity[type]:worldBiome==3?volcanoDensity[type]:worldBiome==4?mangroveDensity[type]:worldBiome==5?canyonDensity[type]:savannaDensity[type]))continue;
        const double x=(gx+.14+unit(cellHash(gx,gz,310+type))*.72)*cell;
        const double z=(gz+.14+unit(cellHash(gx,gz,311+type))*.72)*cell;
        if(x<x0-halo||x>=x0+48+halo||z<z0-halo||z>=z0+48+halo)continue;
        const float scale=worldBiome==5&&type==5?
          float(.64+unit(cellHash(gx,gz,312+type))*.23):
          float(.78+unit(cellHash(gx,gz,312+type))*.43);
        const int slot=(worldBiome==1?desertOffsets[type]:worldBiome==5?canyonOffsets[type]:savannaOffsets[type])+
          int(cellHash(gx,gz,315+type)%(worldBiome==1?desertCounts[type]:worldBiome==5?canyonCounts[type]:savannaCounts[type]));
        if(removedProps().count({type,gx,gz}))continue;
        const double waterLevel=fluidLevel(x,z);
        const bool mangroveHabitat=worldBiome==4&&(slot==0||slot==1||slot==4);
        if(mangroveHabitat){if(wetlandMask(x,z)<.56)continue;}
        else if((worldBiome==2&&slot==9)?waterLevel==0:waterLevel!=0)continue;
        if(worldBiome==2&&(slot==7||slot==17)&&
           std::abs(std::abs(x-riverX(z))-6.1)>15)continue;
        const float radius=(worldBiome==1?desertRadii[slot]:worldBiome==5?canyonRadii[slot]:radii[slot])*scale;
        if(worldBiome==5){
          const double distance=std::abs(x-riverX(z));
          const int side=x<riverX(z)?-1:1;
          if(canyonOpenRight&&side>0&&type==5)continue;
          const double wallStart=17.8+noise(z*.014,side*17,2803)*5.5;
          // Keep one continuous dry ingress on each bank for the largest
          // animal. Solid procedural props otherwise seal short canyon pockets
          // even where the terrain itself leaves a traversable corridor.
          const bool solid=slot<=3||(slot>=10&&slot<=12)||slot>=18;
          const double lane=mainRiverReach(z)+4.2;
          if(solid&&std::abs(distance-lane)<radius+1.55+1.0)continue;
          if(distance-radius<mainRiverReach(z)+.3)continue;
          if(type==0&&distance>wallStart-1.1)continue;
          if((type==1||type==2||type==4)&&
             distance>wallStart-1.1&&distance<wallStart+18)continue;
          if(type==5&&(distance<wallStart+12||distance>74))continue;
          if(type!=3&&type!=5&&std::hypot(surface(x+.8,z)-surface(x-.8,z),
             surface(x,z+.8)-surface(x,z-.8))/1.6>.36)continue;
        }
        if(std::any_of(nearbySettlements.begin(),nearbySettlements.end(),[&](size_t i){
          const Settlement& site=settlements[i];
          return std::hypot(x-site.x,z-site.z)<site.clearRadius+radius+4;
        }))continue;
        const Prop prop={float(x),float(z),float(waterLevel!=0?waterLevel:surface(x,z)),radius,scale,
          float(unit(cellHash(gx,gz,317))*2*pi),slot,type,gx,gz};
        const bool owned=x>=x0&&x<x0+48&&z>=z0&&z<z0+48;
        if(owned)props.push_back(prop);
        if((slot<=3||(slot>=10&&slot<=12)||slot>=18)&&
           x+radius+maxIndexedRadius>=x0&&x-radius-maxIndexedRadius<x0+48&&
           z+radius+maxIndexedRadius>=z0&&z-radius-maxIndexedRadius<z0+48){
          solidProps.push_back(prop);
          if(!owned)haloPropCount++;
        }
      }
  }
  for(const Pond& p:ponds){
    const bool owned=p.x>=x0&&p.x<x0+side&&p.z>=z0&&p.z<z0+side;
    const Prop prop={float(p.x),float(p.z),float(p.level),float(p.radius),float(p.radius/4),0,19,6,
      int(std::lround(p.x)),int(std::lround(p.z))};
    if(owned)props.push_back(prop);
    if(p.x+p.radius+maxIndexedRadius>=x0&&p.x-p.radius-maxIndexedRadius<x0+side&&
       p.z+p.radius+maxIndexedRadius>=z0&&p.z-p.radius-maxIndexedRadius<z0+side){
      solidProps.push_back(prop);if(!owned)haloPropCount++;
    }
  }
  indexSolidProps();
  SPATIAL_TOCK(11,propsStarted);SPATIAL_TOCK(0,populateStarted);
}
// A completed job owns every output buffer. Moving it to the publication
// thread transfers ownership, not procedural work or a second live world.
struct PreparedChunkData {
  int cx=0,cz=0,halo=0;
  std::vector<float> heights,colors,waterLevels,waterTriangles;
  std::vector<uint8_t> water,groundMask;
  std::vector<double> lattice;
  std::vector<Pond> ponds;
  std::vector<Prop> props,solidProps;
  std::array<std::vector<int>,propBucketSide*propBucketSide> propBuckets;
  std::vector<size_t> nearbySettlements;
};
PreparedChunkData takePreparedChunkData(){
  return {chunkX,chunkZ,haloPropCount,std::move(heights),std::move(colors),
    std::move(waterLevels),std::move(waterTriangles),std::move(water),
    std::move(groundMask),std::move(lattice),std::move(ponds),std::move(props),
    std::move(solidProps),std::move(propBuckets),std::move(nearbySettlements)};
}
void selectPreparedChunkData(PreparedChunkData data){
  chunkX=data.cx;chunkZ=data.cz;haloPropCount=data.halo;
  heights=std::move(data.heights);colors=std::move(data.colors);
  waterLevels=std::move(data.waterLevels);waterTriangles=std::move(data.waterTriangles);
  water=std::move(data.water);groundMask=std::move(data.groundMask);
  lattice=std::move(data.lattice);ponds=std::move(data.ponds);
  props=std::move(data.props);solidProps=std::move(data.solidProps);
  propBuckets=std::move(data.propBuckets);nearbySettlements=std::move(data.nearbySettlements);
}
void publishSelectedChunk(){
  const auto key=chunkKey(chunkX,chunkZ);
  // Settlement changes invalidate relief explicitly; ordinary selection keeps it.
  if(!residentSpatial().count(key))residentSpatial()[key]={lattice,ponds};
  residentSolidProps()[key]=solidProps;
  residentVisibleProps()[key]=props;
}
void populateChunk(int cx,int cz,bool visual=true){
  prepareSelectedChunk(cx,cz,visual);
  auto prepared=takePreparedChunkData();
  selectPreparedChunkData(std::move(prepared));
  publishSelectedChunk();
}
// Preparation owns its output; live navigation is not modified until installation.
ChunkRaster prepareActiveRaster(){
  ChunkRaster result{chunkX,chunkZ,{},{},{}};
  auto& staticPass=result.pass;auto& staticSteps=result.steps;auto& staticInbound=result.inbound;
  const int firstX=chunkX*side-24,firstZ=chunkZ*side-24;
  staticPass.resize(side*side);staticSteps.assign(side*side,0);staticInbound.resize(side*side);
  for(int z=0;z<side;z++)for(int x=0;x<side;x++)staticPass[z*side+x]=terrainPropWalkable(firstX+x,firstZ+z);
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int z=0;z<side;z++)for(int x=0;x<side;x++){
    const int wx=firstX+x,wz=firstZ+z,i=z*side+x;
    if(!staticPass[i])continue;
    // Interior edges are symmetric: the endpoint passability was already
    // sampled, so test the three interior points once for both directions.
    for(const int d:{0,2}){
      const int nx=wx+dx[d],nz=wz+dz[d];
      const int localX=x+dx[d],localZ=z+dz[d];
      if(localX<side&&localZ<side){
        const int next=localZ*side+localX;
        if(staticPass[next]&&terrainPropSegment(wx,wz,nx,nz)){
          staticSteps[i]|=1<<d;staticSteps[next]|=1<<(d^1);
        }
      }else if(terrainPropEdge(wx,wz,nx,nz))staticSteps[i]|=1<<d;
    }
    for(const int d:{1,3})if((d==1&&x==0)||(d==3&&z==0))
      if(terrainPropEdge(wx,wz,wx+dx[d],wz+dz[d]))staticSteps[i]|=1<<d;
  }
  staticInbound=staticSteps;
  return result;
}
void installPreparedRaster(ChunkRaster raster){
  const auto key=chunkKey(raster.cx,raster.cz);
  chunkRasters->insert_or_assign(key,std::move(raster));
}
void buildActiveRaster(){installPreparedRaster(prepareActiveRaster());}
#ifdef __EMSCRIPTEN_PTHREADS__
#include "spatial-preparation-worker.inc"
#endif
void patchActiveRaster(const Prop& changed){
  const auto it=chunkRasters->find(chunkKey(chunkX,chunkZ));
  if(it==chunkRasters->end())return;
  ChunkRaster& raster=it->second;
  const int firstX=chunkX*side-24,firstZ=chunkZ*side-24;
  // An edge can change when either endpoint or an interior sample touches
  // the removed footprint. Two extra cells cover both sides of that edge.
  const double reach=changed.radius+radiusNow+2;
  const int minX=std::max(firstX,int(std::floor(changed.x-reach)));
  const int maxX=std::min(firstX+side-1,int(std::ceil(changed.x+reach)));
  const int minZ=std::max(firstZ,int(std::floor(changed.z-reach)));
  const int maxZ=std::min(firstZ+side-1,int(std::ceil(changed.z+reach)));
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int z=minZ;z<=maxZ;z++)for(int x=minX;x<=maxX;x++){
    const int i=(z-firstZ)*side+x-firstX;
    raster.pass[i]=terrainPropWalkable(x,z);
    raster.steps[i]=raster.inbound[i]=0;
    if(!raster.pass[i])continue;
    for(int d=0;d<4;d++){
      if(terrainPropEdge(x,z,x+dx[d],z+dz[d]))raster.steps[i]|=1<<d;
      if(terrainPropEdge(x+dx[d],z+dz[d],x,z))raster.inbound[i]|=1<<d;
    }
  }
}
void commitActiveSectors(){
  const int firstX=chunkX*side-24,firstZ=chunkZ*side-24;
  for(int sz=0;sz<4;sz++)for(int sx=0;sx<4;sx++)refreshSector(firstX/sector+sx,firstZ/sector+sz);
}
void refreshNeighborBorders(int cx,int cz){
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int direction=0;direction<4;direction++){
    const int nx=cx+dx[direction],nz=cz+dz[direction];
    if(!chunkRasters->count(chunkKey(nx,nz)))continue;
    const int firstX=(nx*side-24)/sector,firstZ=(nz*side-24)/sector;
    for(int i=0;i<4;i++){
      const int sx=firstX+(direction==0?0:direction==1?3:i);
      const int sz=firstZ+(direction==2?0:direction==3?3:i);
      refreshSector(sx,sz);
    }
  }
}
Settlement makeSettlement(double x,double z,double hx,double hz){
  const double samples[5]={baseHeight(x-hx,z-hz),baseHeight(x+hx,z-hz),
    baseHeight(x,z),baseHeight(x-hx,z+hz),baseHeight(x+hx,z+hz)};
  std::array<double,5> sorted;std::copy(samples,samples+5,sorted.begin());
  std::sort(sorted.begin(),sorted.end());
  const double clear=std::max(19.0,std::hypot(hx,hz));
  return {true,x,z,sorted[2],hx,hz,clear,clear+6,clear+13};
}
void refreshSettlementChunks(const std::vector<Settlement>& changed){
  removedPropGeometry().clear();
  const int selectedX=chunkX,selectedZ=chunkZ,previous=activeProfile;
  changedSettlementChunks.clear();
  bool touched=false;
  for(const auto& [cx,cz]:loadedChunks){
    const int chunkCx=cx,chunkCz=cz;
    if(!std::any_of(changed.begin(),changed.end(),[&](const Settlement& site){
      return settlementNearChunk(site,chunkCx,chunkCz);
    }))continue;
    touched=true;
    changedSettlementChunks.push_back(cx);
    changedSettlementChunks.push_back(cz);
    residentSpatial().erase(chunkKey(cx,cz));
    populateChunk(cx,cz);
    for(int profile=0;profile<navigationProfiles;profile++){
      selectProfile(profile);
      if(!navReady)continue;
      buildActiveRaster();commitActiveSectors();refreshNeighborBorders(cx,cz);
    }
  }
  selectProfile(previous);
  if(touched)populateChunk(selectedX,selectedZ);
}
void refreshBarrier(const Barrier& barrier){
  if(batchingBarriers){deferredBarrierRefresh.push_back(barrier);return;}
  const float maxRadius=maxBuiltRadius();
  const int r=int(std::ceil(maxRadius))+1,previous=activeProfile;
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    const float extentX=barrierExtentX(barrier),extentZ=barrierExtentZ(barrier);
    refreshRect(int(std::floor(barrier.x-extentX))-r,
      int(std::floor(barrier.z-extentZ))-r,
      int(std::ceil(barrier.x+extentX))+r,
      int(std::ceil(barrier.z+extentZ))+r);
  }
  selectProfile(previous);
}
void refreshPolygon(const PolygonObstacle& polygon){
  const int r=int(std::ceil(maxBuiltRadius()))+1,previous=activeProfile;
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(navReady)refreshRect(int(std::floor(polygon.minX))-r,
      int(std::floor(polygon.minZ))-r,int(std::ceil(polygon.maxX))+r,
      int(std::ceil(polygon.maxZ))+r);
  }
  selectProfile(previous);
}
void refreshRemovedPropChunks(const Prop* changed){
  const int selectedX=chunkX,selectedZ=chunkZ,previous=activeProfile;
  std::vector<std::pair<int,int>> affected;
  for(const auto& [cx,cz]:loadedChunks){
    const int firstX=cx*side-24,firstZ=cz*side-24;
    if(changed&&(
      changed->x+changed->radius+maxIndexedRadius<firstX||
      changed->x-changed->radius-maxIndexedRadius>=firstX+side||
      changed->z+changed->radius+maxIndexedRadius<firstZ||
      changed->z-changed->radius-maxIndexedRadius>=firstZ+side))continue;
    affected.emplace_back(cx,cz);
  }
  // The generated relief and props do not depend on the movement profile.
  // Populate each affected chunk once, then update its per-profile raster.
  for(const auto& [cx,cz]:affected){
    populateChunk(cx,cz,false);
    for(int profile=0;profile<navigationProfiles;profile++){
      selectProfile(profile);
      if(!navReady)continue;
      if(changed)patchActiveRaster(*changed);
      else buildActiveRaster();
    }
  }
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    if(changed){
      const double reach=changed->radius+radiusNow+2;
      refreshRect(int(std::floor(changed->x-reach)),int(std::floor(changed->z-reach)),
        int(std::ceil(changed->x+reach)),int(std::ceil(changed->z+reach)));
    }else{
      for(const auto& [cx,cz]:affected){
        chunkX=cx;chunkZ=cz;
        commitActiveSectors();refreshNeighborBorders(cx,cz);
      }
    }
  }
  selectProfile(previous);
  if(!loadedChunks.empty()&&(chunkX!=selectedX||chunkZ!=selectedZ))
    populateChunk(selectedX,selectedZ);
}
void refreshRemovedPropChunksBatch(const std::vector<Prop>& changed){
  if(changed.empty())return;
  if(changed.size()==1){refreshRemovedPropChunks(&changed.front());return;}
  const int selectedX=chunkX,selectedZ=chunkZ,previous=activeProfile;
  std::vector<std::pair<int,int>> affected;
  for(const auto& [cx,cz]:loadedChunks){
    const int firstX=cx*side-24,firstZ=cz*side-24;
    if(std::none_of(changed.begin(),changed.end(),[&](const Prop& prop){
      return prop.x+prop.radius+maxIndexedRadius>=firstX&&
        prop.x-prop.radius-maxIndexedRadius<firstX+side&&
        prop.z+prop.radius+maxIndexedRadius>=firstZ&&
        prop.z-prop.radius-maxIndexedRadius<firstZ+side;
    }))continue;
    affected.emplace_back(cx,cz);
  }
  std::sort(affected.begin(),affected.end());
  // All removals are already committed. Generate each changed chunk once;
  // only its raster and sector graph vary with the unit profile.
  for(const auto& [cx,cz]:affected){
    populateChunk(cx,cz,false);
    for(int profile=0;profile<navigationProfiles;profile++){
      selectProfile(profile);
      if(!navReady)continue;
      for(const Prop& prop:changed)patchActiveRaster(prop);
    }
  }
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    std::unordered_set<uint64_t> sectors;
    for(const Prop& prop:changed){
      const double reach=prop.radius+radiusNow+2;
      forEachRectSector(int(std::floor(prop.x-reach)),int(std::floor(prop.z-reach)),
        int(std::ceil(prop.x+reach)),int(std::ceil(prop.z+reach)),
        [&](int sx,int sz){sectors.insert(chunkKey(sx,sz));});
    }
    std::vector<uint64_t> ordered(sectors.begin(),sectors.end());
    std::sort(ordered.begin(),ordered.end());
    for(uint64_t key:ordered)refreshSector(int(int32_t(key>>32)),int(int32_t(key)));
  }
  selectProfile(previous);
  if(!loadedChunks.empty()&&(chunkX!=selectedX||chunkZ!=selectedZ))
    populateChunk(selectedX,selectedZ);
}
void flushBarrierBatch(){
  const float maxRadius=maxBuiltRadius();
  const int r=int(std::ceil(maxRadius))+1,previous=activeProfile;
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    std::unordered_set<uint64_t> sectors;
    for(const Barrier& barrier:deferredBarrierRefresh){
      const float extentX=barrierExtentX(barrier),extentZ=barrierExtentZ(barrier);
      forEachRectSector(int(std::floor(barrier.x-extentX))-r,
        int(std::floor(barrier.z-extentZ))-r,
        int(std::ceil(barrier.x+extentX))+r,
        int(std::ceil(barrier.z+extentZ))+r,
        [&](int sx,int sz){sectors.insert(chunkKey(sx,sz));});
    }
    // Stable order keeps the graph update deterministic across runtimes.
    std::vector<uint64_t> ordered(sectors.begin(),sectors.end());
    std::sort(ordered.begin(),ordered.end());
    for(uint64_t key:ordered)refreshSector(int(int32_t(key>>32)),int(int32_t(key)));
  }
  selectProfile(previous);
  deferredBarrierRefresh.clear();
}
int addBarrier(float x,float z,float halfX,float halfZ,int passMask,float yaw=0){
  if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(halfX)||!std::isfinite(halfZ)||
     !std::isfinite(yaw)||halfX<=0||halfZ<=0||halfX>100||halfZ>100||passMask<0||passMask>3||
     nextBarrierId==std::numeric_limits<int>::max())return 0;
  const Barrier barrier={nextBarrierId++,x,z,halfX,halfZ,yaw,float(std::cos(yaw)),float(std::sin(yaw)),uint8_t(passMask)};
  barrierIndex().byId.emplace(barrier.id,barrier);
  indexBarrier(barrier,true);
  refreshBarrier(barrier);
  return barrier.id;
}
// Far-field presentation queries use the same deterministic C++ recipe without
// making an offscreen chunk resident or disturbing the selected actor graph.
// Height/fluid sampling reads the selected pond and settlement neighborhood.
struct ScopedTerrainSample {
  int previousX,previousZ;
  std::vector<double> previousLattice;
  std::vector<Pond> previousPonds;
  std::vector<size_t> previousSettlements;
  ScopedTerrainSample(double x,double z):previousX(chunkX),previousZ(chunkZ){
    previousLattice.swap(lattice);
    previousPonds.swap(ponds);
    previousSettlements.swap(nearbySettlements);
    chunkX=int(std::floor((x+24)/side));
    chunkZ=int(std::floor((z+24)/side));
    selectNearbySettlements(chunkX,chunkZ);
    preparePonds(chunkX,chunkZ);
  }
  ~ScopedTerrainSample(){
    chunkX=previousX;chunkZ=previousZ;
    previousLattice.swap(lattice);
    previousPonds.swap(ponds);
    previousSettlements.swap(nearbySettlements);
  }
};
struct HorizonPoint {float x,y,z;};
struct HorizonColor {float r,g,b;};
struct HorizonSampler {
  std::optional<ScopedTerrainSample> context;
  int cx=std::numeric_limits<int>::min(),cz=std::numeric_limits<int>::min();
  void select(double x,double z){
    const int nextX=int(std::floor((x+24)/side)),nextZ=int(std::floor((z+24)/side));
    if(cx==nextX&&cz==nextZ)return;
    context.reset();context.emplace(x,z);cx=nextX;cz=nextZ;
  }
  HorizonPoint point(double x,double z,int ox,int oz){
    select(x,z);return {float(x-ox),float(surface(x,z)),float(z-oz)};
  }
  HorizonColor color(double x,double z){
    select(x,z);float result[3];groundColorAt(x,z,result);
    return {result[0],result[1],result[2]};
  }
  float riverEdge(double z,int direction){
    const double center=riverX(z);select(center,z);
    return float(riverWetEdge(z,direction));
  }
};
void horizonTri(std::vector<float>& out,const HorizonPoint& a,const HorizonPoint& b,
                const HorizonPoint& c,const HorizonColor& ca,const HorizonColor& cb,
                const HorizonColor& cc){
  const double ux=double(b.x)-a.x,uy=double(b.y)-a.y,uz=double(b.z)-a.z;
  const double vx=double(c.x)-a.x,vy=double(c.y)-a.y,vz=double(c.z)-a.z;
  double nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const double length=std::hypot(nx,ny,nz);
  if(length>0){nx/=length;ny/=length;nz/=length;}else{nx=ny=nz=0;}
  for(const auto& vertex:std::array<std::pair<HorizonPoint,HorizonColor>,3>{{{a,ca},{b,cb},{c,cc}}}){
    const auto& p=vertex.first;const auto& color=vertex.second;
    out.insert(out.end(),{p.x,p.y,p.z,float(nx),float(ny),float(nz),color.r,color.g,color.b});
  }
}
void horizonDesertNormals(HorizonSampler& sampler,int ox,int oz){
  std::unordered_map<uint64_t,std::array<float,3>> normals;
  normals.reserve(25000);
  for(size_t i=0;i<horizonTerrain.size();i+=9){
    const float lx=horizonTerrain[i],lz=horizonTerrain[i+2];
    uint32_t xb,zb;std::memcpy(&xb,&lx,sizeof(xb));std::memcpy(&zb,&lz,sizeof(zb));
    const uint64_t key=(uint64_t(xb)<<32)|zb;
    auto found=normals.find(key);
    if(found==normals.end()){
      const double x=ox+double(lx),z=oz+double(lz);
      const double nx=sampler.point(x-.5,z,ox,oz).y-sampler.point(x+.5,z,ox,oz).y;
      const double nz=sampler.point(x,z-.5,ox,oz).y-sampler.point(x,z+.5,ox,oz).y;
      const double length=std::hypot(nx,1.0,nz);
      found=normals.emplace(key,std::array<float,3>{float(nx/length),float(1/length),float(nz/length)}).first;
    }
    horizonTerrain[i+3]=found->second[0];
    horizonTerrain[i+4]=found->second[1];
    horizonTerrain[i+5]=found->second[2];
  }
}
}

extern "C" {
int spatial_generate_biome(uint32_t seed,int biome,int cx,int cz){
  if(biome<0||biome>6)return -1;
  worldSeed=seed;canyonOpenRight=biome==6;worldBiome=canyonOpenRight?5:biome;barrierIndex().byId.clear();barrierIndex().buckets.clear();
  polygonIndex().byId.clear();polygonIndex().buckets.clear();polygonInput.clear();polygonState.clear();nextPolygonId=1;
  removedProps().clear();removedPropState.clear();removedPropGeometry().clear();
  batchingBarriers=false;deferredBarrierRefresh.clear();barrierBatch.clear();barrierBatchIds.clear();barrierRemovalIds.clear();
  barrierState.clear();settlementState.clear();
  settlements.clear();nearbySettlements.clear();changedSettlementChunks.clear();
  for(int profile=0;profile<navigationProfiles;profile++){
    NavProfile& state=navProfile(profile);
    state.rasters.clear();state.ready=false;
    state.radius=0;state.worker=profile==1;
    lazy_select_context(profile);lazy_init(sector);
  }
  activeProfile=0;radiusNow=.3f;workerNow=false;navReady=false;
  chunkRasters=&navProfile(0).rasters;lazy_select_context(0);
  loadedChunks.clear();nextBarrierId=1;
  residentSpatial().clear();
  residentSolidProps().clear();
  residentVisibleProps().clear();
  populateChunk(cx,cz);loadedChunks.emplace_back(cx,cz);
  return int(props.size());
}
int spatial_generate(uint32_t seed,int cx,int cz){return spatial_generate_biome(seed,0,cx,cz);}
int spatial_add_chunk(int cx,int cz){
  if(!chunkRasters)return -1;
  if(chunkRasters->count(chunkKey(cx,cz)))return 0;
  for(const auto& [x,z]:loadedChunks)if(x==cx&&z==cz)return 0;
  SPATIAL_TICK(totalStarted);
  populateChunk(cx,cz);loadedChunks.emplace_back(cx,cz);
  const int previous=activeProfile;
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    // Both radii rasterize the same freshly generated terrain and props.
    SPATIAL_TICK(rasterStarted);buildActiveRaster();SPATIAL_TOCK(1,rasterStarted);
    SPATIAL_TICK(commitStarted);commitActiveSectors();SPATIAL_TOCK(2,commitStarted);
    SPATIAL_TICK(borderStarted);refreshNeighborBorders(cx,cz);SPATIAL_TOCK(3,borderStarted);
  }
  selectProfile(previous);
  SPATIAL_TOCK(4,totalStarted);
  return int(props.size())+1;
}
int spatial_select_chunk(int cx,int cz){
  if(std::find(loadedChunks.begin(),loadedChunks.end(),std::pair<int,int>{cx,cz})==loadedChunks.end())return 0;
  populateChunk(cx,cz);
  return int(props.size())+1;
}
int spatial_remove_chunk(int cx,int cz){
  const auto it=std::find(loadedChunks.begin(),loadedChunks.end(),std::pair<int,int>{cx,cz});
  if(it==loadedChunks.end())return 0;
  loadedChunks.erase(it);
  residentSpatial().erase(chunkKey(cx,cz));
  residentSolidProps().erase(chunkKey(cx,cz));
  residentVisibleProps().erase(chunkKey(cx,cz));
  const int previous=activeProfile;
  for(int profile=0;profile<navigationProfiles;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    chunkRasters->erase(chunkKey(cx,cz));
    const int firstX=(cx*side-24)/sector,firstZ=(cz*side-24)/sector;
    for(int sz=0;sz<4;sz++)for(int sx=0;sx<4;sx++)lazy_remove_sector(firstX+sx,firstZ+sz);
    refreshNeighborBorders(cx,cz);
  }
  selectProfile(previous);
  if(chunkX==cx&&chunkZ==cz){
    if(!loadedChunks.empty())populateChunk(loadedChunks.back().first,loadedChunks.back().second);
    else {props.clear();solidProps.clear();ponds.clear();heights.clear();colors.clear();water.clear();groundMask.clear();waterLevels.clear();waterTriangles.clear();}
  }
  return 1;
}
int spatial_chunk_count(){return int(loadedChunks.size());}
int spatial_resident_prop_count(){
  int count=0;
  for(const auto& [key,records]:residentSolidProps())count+=int(records.size());
  return count;
}
int spatial_resident_visible_prop_count(){
  int count=0;
  for(const auto& [key,records]:residentVisibleProps())count+=int(records.size());
  return count;
}
int spatial_changed_chunk_count(){return int(changedSettlementChunks.size()/2);}
int32_t* spatial_changed_chunks_ptr(){return changedSettlementChunks.data();}
float spatial_set_settlement(float x,float z,float hx,float hz){
  if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(hx)||!std::isfinite(hz)||
     hx<=0||hz<=0||hx>100||hz>100)return -1;
  std::vector<Settlement> changed=settlements;
  const Settlement site=makeSettlement(x,z,hx,hz);
  settlements.assign(1,site);changed.push_back(site);
  refreshSettlementChunks(changed);
  return float(site.y);
}
float spatial_add_settlement(float x,float z,float hx,float hz){
  if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(hx)||!std::isfinite(hz)||
     hx<=0||hz<=0||hx>100||hz>100)return -1;
  const Settlement site=makeSettlement(x,z,hx,hz);
  settlements.push_back(site);
  refreshSettlementChunks({site});
  return float(site.y);
}
int spatial_remove_prop(int group,int gx,int gz){
  if(group<0||group>5||removedProps().count({group,gx,gz}))return 0;
  const Prop* found=nullptr;
  for(const auto& [key,visible]:residentVisibleProps()){
    const auto it=std::find_if(visible.begin(),visible.end(),[&](const Prop& prop){
      return prop.group==group&&prop.gx==gx&&prop.gz==gz;
    });
    if(it!=visible.end()){found=&*it;break;}
  }
  if(!found)return 0;
  const Prop changed=*found;
  removedPropGeometry().insert_or_assign({group,gx,gz},changed);
  removedProps().insert({group,gx,gz});
  refreshRemovedPropChunks(&changed);
  return 1;
}
int spatial_removed_prop_count(){return int(removedProps().size());}
int32_t* spatial_removed_prop_state_ptr(){
  std::vector<PropKey> ordered(removedProps().begin(),removedProps().end());
  std::sort(ordered.begin(),ordered.end(),[](const PropKey& a,const PropKey& b){
    if(a.group!=b.group)return a.group<b.group;
    if(a.gx!=b.gx)return a.gx<b.gx;
    return a.gz<b.gz;
  });
  removedPropState.clear();removedPropState.reserve(ordered.size()*3);
  for(const PropKey& key:ordered){
    removedPropState.push_back(key.group);
    removedPropState.push_back(key.gx);
    removedPropState.push_back(key.gz);
  }
  return removedPropState.data();
}
int32_t* spatial_removed_prop_restore_ptr(int count){
  if(count<0||count>100000)return nullptr;
  removedPropState.resize(size_t(count)*3);
  return removedPropState.data();
}
int spatial_restore_removed_props(int count){
  if(count<0||count>100000||removedPropState.size()<size_t(count)*3)return 0;
  std::unordered_set<PropKey,PropKeyHash> replacement;
  for(int i=0;i<count;i++){
    const PropKey key={removedPropState[i*3],removedPropState[i*3+1],removedPropState[i*3+2]};
    if(key.group<0||key.group>5||!replacement.insert(key).second)return 0;
  }
  if(replacement==removedProps())return 1;
  std::vector<Prop> changed;
  std::vector<PropKey> restored;
  bool local=true;
  const auto visible=[](const PropKey& key)->const Prop*{
    for(const auto& [chunk,props]:residentVisibleProps()){
      const auto found=std::find_if(props.begin(),props.end(),[&](const Prop& prop){
        return prop.group==key.group&&prop.gx==key.gx&&prop.gz==key.gz;
      });
      if(found!=props.end())return &*found;
    }
    return nullptr;
  };
  for(const PropKey& key:replacement)if(!removedProps().count(key)){
    if(const Prop* prop=visible(key)){
      changed.push_back(*prop);
      removedPropGeometry().insert_or_assign(key,*prop);
    }else local=false;
  }
  for(const PropKey& key:removedProps())if(!replacement.count(key)){
    const auto found=removedPropGeometry().find(key);
    if(found!=removedPropGeometry().end())changed.push_back(found->second);
    else local=false;
    restored.push_back(key);
  }
  removedProps().swap(replacement);
  if(local&&changed.size()<=64){
    std::sort(changed.begin(),changed.end(),[](const Prop& a,const Prop& b){
      if(a.group!=b.group)return a.group<b.group;
      if(a.gx!=b.gx)return a.gx<b.gx;
      return a.gz<b.gz;
    });
    refreshRemovedPropChunksBatch(changed);
  }else refreshRemovedPropChunks(nullptr);
  for(const PropKey& key:restored)removedPropGeometry().erase(key);
  return 1;
}
int spatial_sector_slots(){return lazy_sector_slots();}
float spatial_surface(float x,float z){
  if(!std::isfinite(x)||!std::isfinite(z)||!residentSample(x,z))
    return std::numeric_limits<float>::quiet_NaN();
  return float(surface(x,z));
}
float spatial_surface_anywhere(float x,float z){
  if(!chunkRasters||!std::isfinite(x)||!std::isfinite(z))
    return std::numeric_limits<float>::quiet_NaN();
  if(residentSample(x,z))return float(surface(x,z));
  const ScopedTerrainSample context(x,z);
  return float(surface(x,z));
}
float spatial_fluid_level(float x,float z){
  if(!std::isfinite(x)||!std::isfinite(z))
    return std::numeric_limits<float>::quiet_NaN();
  const ChunkSpatialSample* sample=residentSample(x,z);
  return sample?float(fluidLevelFor(x,z,sample->ponds)):
    std::numeric_limits<float>::quiet_NaN();
}
float spatial_fluid_level_anywhere(float x,float z){
  if(!chunkRasters||!std::isfinite(x)||!std::isfinite(z))
    return std::numeric_limits<float>::quiet_NaN();
  if(const ChunkSpatialSample* sample=residentSample(x,z))
    return float(fluidLevelFor(x,z,sample->ponds));
  const ScopedTerrainSample context(x,z);
  return float(fluidLevel(x,z));
}
float spatial_water_shore_anywhere(float x,float z){
  if(!chunkRasters||!std::isfinite(x)||!std::isfinite(z))
    return std::numeric_limits<float>::quiet_NaN();
  if(const ChunkSpatialSample* sample=residentSample(x,z))
    return float(waterShore(x,z,sample->ponds));
  const ScopedTerrainSample context(x,z);
  return float(waterShore(x,z,ponds));
}
float spatial_river_center(float z){
  if(!chunkRasters||!std::isfinite(z)||worldBiome==1||worldBiome==4)
    return std::numeric_limits<float>::quiet_NaN();
  return float(riverX(z));
}
float spatial_river_edge(float z,int direction){
  if(!chunkRasters||!std::isfinite(z)||(direction!=-1&&direction!=1)||
     worldBiome==1||worldBiome==4)
    return std::numeric_limits<float>::quiet_NaN();
  const double center=riverX(z);
  const ScopedTerrainSample context(center,z);
  return float(riverWetEdge(z,direction));
}
float spatial_river_level(){
  return chunkRasters&&worldBiome!=1&&worldBiome!=4?float(mainRiverLevel()):
    std::numeric_limits<float>::quiet_NaN();
}
float spatial_fluid_surface_level(){
  if(!chunkRasters)return std::numeric_limits<float>::quiet_NaN();
  return worldBiome==1?0:worldBiome==4?3.34f:float(mainRiverLevel());
}
float spatial_wetland_mask_anywhere(float x,float z){
  if(!chunkRasters||worldBiome!=4||!std::isfinite(x)||!std::isfinite(z))
    return std::numeric_limits<float>::quiet_NaN();
  const ScopedTerrainSample context(x,z);
  return float(wetlandMask(x,z));
}
float spatial_wetland_mask_resident(float x,float z){
  if(!chunkRasters||worldBiome!=4||!std::isfinite(x)||!std::isfinite(z)||
      !residentSample(x,z))return std::numeric_limits<float>::quiet_NaN();
  return float(wetlandMask(x,z));
}
float spatial_wetland_mask_lipschitz(){
  if(worldBiome!=4)return std::numeric_limits<float>::quiet_NaN();
  // noise() has slope <= 1.5 per coordinate. The steepest channel in
  // wetlandMask() is < 0.72 per metre; each settlement clearing adds <= .25.
  return float(1.0+.25*settlements.size());
}
// Certify an entire one-metre cut face from the same continuous terrain used
// by movement. The river bound uses the analytic maximum derivative of
// riverX() (0.48 m/m) and canyonWaterHalf() (0.0243 m/m). The height test is
// exact for the piecewise-linear terrain mesh: each triangle is a convex
// combination of its lattice vertices. A wet midpoint alone is not proof.
int spatial_canyon_river_face(int x,int z,int nx,int nz){
  if(worldBiome!=5||std::abs(x-nx)+std::abs(z-nz)!=1)return 0;
  const double mx=(x+nx)*.5,mz=(z+nz)*.5;
  const double ax=x!=nx?mx:mx-.5,az=x!=nx?mz-.5:mz;
  const double bx=x!=nx?mx:mx+.5,bz=x!=nx?mz+.5:mz;
  if(!residentSample(ax,az)||!residentSample(bx,bz)||
     !residentSample(mx,mz))return -1;
  const double lateral=std::abs(mx-riverX(mz));
  if(lateral+.5*1.01>=mainRiverReach(mz)-.5*.0243-.02)return 0;
  const int minX=int(std::floor(std::min(ax,bx)));
  const int maxX=int(std::ceil(std::max(ax,bx)));
  const int minZ=int(std::floor(std::min(az,bz)));
  const int maxZ=int(std::ceil(std::max(az,bz)));
  for(int zz=minZ;zz<=maxZ;zz++)for(int xx=minX;xx<=maxX;xx++){
    if(!residentSample(xx,zz)||latticeHeight(xx,zz)>=3.274)return 0;
  }
  return 1;
}
// A cliff is certified only where the *whole* face fails the real terrain
// slope predicate. Bound surface variation from the actual resident lattice
// triangles, then bisect uncertain intervals. This is a local proof, not a
// grid-centre or finite angular sample.
int spatial_canyon_cliff_face(int x,int z,int nx,int nz){
  if(worldBiome!=5||std::abs(x-nx)+std::abs(z-nz)!=1)return 0;
  const double mx=(x+nx)*.5,mz=(z+nz)*.5;
  const double ax=x!=nx?mx:mx-.5,az=x!=nx?mz-.5:mz;
  const double bx=x!=nx?mx:mx+.5,bz=x!=nx?mz+.5:mz;
  if(!residentSample(ax,az)||!residentSample(bx,bz))return -1;
  const int minX=int(std::floor(std::min(ax,bx)-.8))-1;
  const int maxX=int(std::ceil(std::max(ax,bx)+.8))+1;
  const int minZ=int(std::floor(std::min(az,bz)-.8))-1;
  const int maxZ=int(std::ceil(std::max(az,bz)+.8))+1;
  double gradient=0;
  for(int zz=minZ;zz<maxZ;zz++)for(int xx=minX;xx<maxX;xx++){
    if(!residentSample(xx,zz)||!residentSample(xx+1,zz+1))return -1;
    const double a=latticeHeight(xx,zz),b=latticeHeight(xx+1,zz);
    const double c=latticeHeight(xx,zz+1),d=latticeHeight(xx+1,zz+1);
    gradient=std::max({gradient,std::hypot(b-a,c-a),
      std::hypot(d-c,d-b)});
  }
  const auto blocked=[&](auto&& self,double px,double pz,double qx,
      double qz,int depth)->bool{
    const double cx=(px+qx)*.5,cz=(pz+qz)*.5;
    const double half=std::hypot(qx-px,qz-pz)*.5;
    const double sx=std::abs(surface(cx+.8,cz)-surface(cx-.8,cz));
    const double sz=std::abs(surface(cx,cz+.8)-surface(cx,cz-.8));
    if(std::max(sx,sz)>.8001+2*gradient*half)return true;
    if(depth>=12)return false;
    return self(self,px,pz,cx,cz,depth+1)&&
      self(self,cx,cz,qx,qz,depth+1);
  };
  return blocked(blocked,ax,az,bx,bz,0)?1:0;
}
float* spatial_ground_color_input_ptr(int count){
  if(count<=0||count>50000)return nullptr;
  groundQueryInput.resize(size_t(count)*2);
  groundQueryOutput.resize(size_t(count)*3);
  return groundQueryInput.data();
}
int spatial_ground_color_batch(int count){
  if(!chunkRasters||count<=0||count>50000||
     groundQueryInput.size()<size_t(count)*2||groundQueryOutput.size()<size_t(count)*3)
    return 0;
  for(int i=0;i<count;i++){
    const float x=groundQueryInput[i*2],z=groundQueryInput[i*2+1];
    if(!std::isfinite(x)||!std::isfinite(z)||std::floor(x)!=x||std::floor(z)!=z||
       std::abs(x)>1.0e8f||std::abs(z)>1.0e8f)return 0;
  }
  std::optional<ScopedTerrainSample> context;
  int previousCx=std::numeric_limits<int>::min(),previousCz=previousCx;
  for(int i=0;i<count;i++){
    const float x=groundQueryInput[i*2],z=groundQueryInput[i*2+1];
    const int cx=int(std::floor((x+24)/side)),cz=int(std::floor((z+24)/side));
    if(cx!=previousCx||cz!=previousCz){
      context.reset();context.emplace(x,z);
      previousCx=cx;previousCz=cz;
    }
    groundColorAt(x,z,groundQueryOutput.data()+i*3);
  }
  return count;
}
float* spatial_ground_color_result_ptr(){return groundQueryOutput.data();}
int spatial_build_horizon(int cx,int cz,int minX,int minZ,int maxX,int maxZ,
                          int river,float waterR,float waterG,float waterB){
  if(!chunkRasters||(worldBiome!=1&&worldBiome!=5)||minX>=maxX||minZ>=maxZ||
     std::abs(cx)>1000000||std::abs(cz)>1000000)return 0;
  const bool canyon=worldBiome==5;
  const int radius=canyon?384:576,dx=canyon?4:8,dz=8;
  const int cols=radius*2/dx,rows=radius*2/dz;
  const int ox=cx*side,oz=cz*side;
  std::vector<HorizonPoint> points;
  std::vector<HorizonColor> colors;
  points.reserve((cols+1)*(rows+1));colors.reserve(points.capacity());
  horizonTerrain.clear();horizonWater.clear();
  horizonTerrain.reserve((canyon?103212:128016)*9);
  HorizonSampler sampler;
  for(int j=0;j<=rows;j++)for(int i=0;i<=cols;i++){
    const int x=ox-radius+i*dx,z=oz-radius+j*dz;
    points.push_back(sampler.point(x,z,ox,oz));colors.push_back(sampler.color(x,z));
  }
  for(int j=0;j<rows;j++)for(int i=0;i<cols;i++){
    const int x=ox-radius+i*dx,z=oz-radius+j*dz;
    if(x>=minX&&z>=minZ&&x+dx<=maxX&&z+dz<=maxZ)continue;
    const int a=j*(cols+1)+i,b=a+1,d=a+cols+1,c=d+1;
    const bool touches=((x+dx==minX||x==maxX)&&z>=minZ&&z+dz<=maxZ)||
      ((z+dz==minZ||z==maxZ)&&x>=minX&&x+dx<=maxX);
    if(!touches){
      horizonTri(horizonTerrain,points[a],points[d],points[b],colors[a],colors[d],colors[b]);
      horizonTri(horizonTerrain,points[b],points[d],points[c],colors[b],colors[d],colors[c]);
      continue;
    }
    const std::array<std::array<int,2>,4> corners={{{x,z},{x,z+dz},{x+dx,z+dz},{x+dx,z}}};
    std::vector<std::array<int,2>> ring;
    ring.reserve(2*(dx+dz));
    for(int k=0;k<4;k++){
      const auto& p=corners[k];const auto& q=corners[(k+1)%4];
      const bool edge=(p[0]==q[0]&&(p[0]==minX||p[0]==maxX)&&p[1]>=minZ&&q[1]>=minZ&&p[1]<=maxZ&&q[1]<=maxZ)||
        (p[1]==q[1]&&(p[1]==minZ||p[1]==maxZ)&&p[0]>=minX&&q[0]>=minX&&p[0]<=maxX&&q[0]<=maxX);
      const int steps=edge?std::abs(p[0]-q[0])+std::abs(p[1]-q[1]):1;
      for(int t=0;t<steps;t++)ring.push_back({p[0]+(q[0]-p[0])*t/steps,p[1]+(q[1]-p[1])*t/steps});
    }
    const auto center=sampler.point(x+dx*.5,z+dz*.5,ox,oz);
    const auto centerColor=sampler.color(x+dx*.5,z+dz*.5);
    for(size_t k=0;k<ring.size();k++){
      const auto& p=ring[k];const auto& q=ring[(k+1)%ring.size()];
      horizonTri(horizonTerrain,center,sampler.point(p[0],p[1],ox,oz),
        sampler.point(q[0],q[1],ox,oz),centerColor,sampler.color(p[0],p[1]),sampler.color(q[0],q[1]));
    }
  }
  if(canyon&&river){
    const float level=float(mainRiverLevel());
    const HorizonColor color={waterR,waterG,waterB};
    for(int z=oz-radius;z<oz+radius;z++){
      const float left=sampler.riverEdge(z,-1)-1.2f,right=sampler.riverEdge(z,1)+1.2f;
      const float nextLeft=sampler.riverEdge(z+1,-1)-1.2f,nextRight=sampler.riverEdge(z+1,1)+1.2f;
      const HorizonPoint a={left-ox,level,float(z-oz)},b={right-ox,level,float(z-oz)};
      const HorizonPoint d={nextLeft-ox,level,float(z+1-oz)},c={nextRight-ox,level,float(z+1-oz)};
      horizonTri(horizonWater,a,d,b,color,color,color);
      horizonTri(horizonWater,b,d,c,color,color,color);
    }
  }
  if(!canyon){
    const auto apron=[&](int axis,int value,int from,int to){
      const auto p=[&](int t,double offset){
        const double x=axis==0?value+offset:t,z=axis==0?t:value+offset;
        auto result=sampler.point(x,z,ox,oz);result.y-=.012f;return result;
      };
      for(int t=from;t<to;t++){
        const auto a=p(t,-.10),b=p(t,.10),c=p(t+1,.10),d=p(t+1,-.10);
        const auto color=sampler.color(axis==0?value:t,axis==0?t:value);
        horizonTri(horizonTerrain,a,b,d,color,color,color);
        horizonTri(horizonTerrain,b,c,d,color,color,color);
      }
    };
    apron(0,minX,minZ,maxZ);apron(0,maxX,minZ,maxZ);
    apron(1,minZ,minX,maxX);apron(1,maxZ,minX,maxX);
    horizonDesertNormals(sampler,ox,oz);
  }
  return int(horizonTerrain.size()/9);
}
float* spatial_horizon_terrain_ptr(){return horizonTerrain.data();}
int spatial_horizon_water_count(){return int(horizonWater.size()/9);}
float* spatial_horizon_water_ptr(){return horizonWater.data();}
float* spatial_heights_ptr(){return heights.data();}
float* spatial_colors_ptr(){return colors.data();}
uint8_t* spatial_water_ptr(){return water.data();}
uint8_t* spatial_ground_mask_ptr(){return groundMask.data();}
float* spatial_water_levels_ptr(){return waterLevels.data();}
float* spatial_water_triangles_ptr(){return waterTriangles.data();}
int spatial_water_vertex_count(){return int(waterTriangles.size()/3);}
Prop* spatial_props_ptr(){return props.data();}
int spatial_prop_count(){return int(props.size());}
int spatial_halo_prop_count(){return haloPropCount;}
int spatial_build_nav_profile(int index,float radius,int worker){
  if(index<0||index>=navigationProfiles||(index==1)!=(worker!=0))return 0;
  if(loadedChunks.empty()||!chunkRasters||radius<=0||radius>maxIndexedRadius)return 0;
  selectProfile(index);
  if(navReady&&radiusNow==radius)return lazy_loaded_sectors();
  radiusNow=radius;workerNow=worker!=0;
  if(!lazy_init(sector))return 0;
  const int selectedX=chunkX,selectedZ=chunkZ;
  chunkRasters->clear();
  for(const auto& [cx,cz]:loadedChunks){
    populateChunk(cx,cz,false);buildActiveRaster();commitActiveSectors();refreshNeighborBorders(cx,cz);
  }
  if(chunkX!=selectedX||chunkZ!=selectedZ)populateChunk(selectedX,selectedZ);
  navReady=true;
  saveProfile();
  return lazy_loaded_sectors();
}
int spatial_build_nav(float radius,int worker){return spatial_build_nav_profile(worker?1:0,radius,worker);}
int spatial_select_nav_profile_index(int index){
  if(index<0||index>=navigationProfiles)return 0;
  selectProfile(index);
  return navReady?lazy_loaded_sectors():0;
}
float spatial_min_animal_radius(){
  saveProfile();
  float radius=std::numeric_limits<float>::infinity();
  for(const int profile:{0,2,3,4,5}){
    if(!navProfiles[profile]||!navProfiles[profile]->ready||
        !(navProfiles[profile]->radius>0))
      return std::numeric_limits<float>::quiet_NaN();
    radius=std::min(radius,navProfiles[profile]->radius);
  }
  return radius;
}
int spatial_select_nav_profile(int worker){
  return spatial_select_nav_profile_index(worker?1:0);
}
int spatial_add_wall(float x,float z,float halfX,float halfZ){
  return addBarrier(x,z,halfX,halfZ,0);
}
int spatial_remove_wall(int id){
  auto& index=barrierIndex();
  const auto it=index.byId.find(id);
  if(it==index.byId.end())return 0;
  const Barrier barrier=it->second;
  indexBarrier(barrier,false);
  index.byId.erase(it);
  refreshBarrier(barrier);
  return 1;
}
int spatial_remove_barrier(int id){return spatial_remove_wall(id);}
float* spatial_polygon_input_ptr(int count){
  if(count<3||count>maxPolygonVertices)return nullptr;
  polygonInput.resize(size_t(count)*2);
  return polygonInput.data();
}
int spatial_add_polygon(int count,int passMask){
  if(count<3||count>maxPolygonVertices||polygonInput.size()<size_t(count)*2||
     passMask<0||passMask>3||nextPolygonId==std::numeric_limits<int>::max())return 0;
  float minX=std::numeric_limits<float>::infinity(),minZ=minX;
  float maxX=-minX,maxZ=-minX;
  double area=0;
  for(int i=0;i<count;i++){
    const float x=polygonInput[i*2],z=polygonInput[i*2+1];
    const int next=(i+1)%count;
    constexpr float limit=2147483000.0f;
    if(!std::isfinite(x)||!std::isfinite(z)||std::abs(x)>limit||std::abs(z)>limit)return 0;
    minX=std::min(minX,x);maxX=std::max(maxX,x);
    minZ=std::min(minZ,z);maxZ=std::max(maxZ,z);
    area+=double(x)*polygonInput[next*2+1]-double(z)*polygonInput[next*2];
  }
  if(maxX-minX>100||maxZ-minZ>100||!std::isfinite(area)||std::abs(area)<1e-4)return 0;
  PolygonObstacle polygon={nextPolygonId++,uint8_t(passMask),minX,minZ,maxX,maxZ,
    std::vector<float>(polygonInput.begin(),polygonInput.begin()+count*2)};
  polygonIndex().byId.emplace(polygon.id,polygon);
  indexPolygon(polygon,true);refreshPolygon(polygon);
  return polygon.id;
}
int spatial_remove_polygon(int id){
  auto& index=polygonIndex();
  const auto it=index.byId.find(id);
  if(it==index.byId.end())return 0;
  const PolygonObstacle polygon=it->second;
  indexPolygon(polygon,false);index.byId.erase(it);refreshPolygon(polygon);
  return 1;
}
int spatial_add_barrier(float x,float z,float halfX,float halfZ,int passMask){
  return addBarrier(x,z,halfX,halfZ,passMask);
}
int spatial_add_oriented_barrier(float x,float z,float halfX,float halfZ,float yaw,int passMask){
  return addBarrier(x,z,halfX,halfZ,passMask,yaw);
}
float* spatial_barrier_batch_ptr(int count){
  if(count<1||count>1024)return nullptr;
  barrierBatch.resize(size_t(count)*6);
  return barrierBatch.data();
}
int* spatial_barrier_batch_ids_ptr(){return barrierBatchIds.data();}
int spatial_add_barriers_batch(int count){
  if(count<1||count>1024||barrierBatch.size()<size_t(count)*6||
     count>std::numeric_limits<int>::max()-nextBarrierId)return 0;
  for(int i=0;i<count;i++){
    const float x=barrierBatch[i*6],z=barrierBatch[i*6+1];
    const float halfX=barrierBatch[i*6+2],halfZ=barrierBatch[i*6+3];
    const float yaw=barrierBatch[i*6+4],passMask=barrierBatch[i*6+5];
    if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(halfX)||!std::isfinite(halfZ)||
       !std::isfinite(yaw)||
       halfX<=0||halfZ<=0||halfX>100||halfZ>100||
       !std::isfinite(passMask)||passMask<0||passMask>3||std::floor(passMask)!=passMask)return 0;
  }
  barrierBatchIds.resize(count);
  batchingBarriers=true;
  for(int i=0;i<count;i++)barrierBatchIds[i]=addBarrier(
    barrierBatch[i*6],barrierBatch[i*6+1],barrierBatch[i*6+2],barrierBatch[i*6+3],
    int(barrierBatch[i*6+5]),barrierBatch[i*6+4]);
  batchingBarriers=false;
  flushBarrierBatch();
  return count;
}
int* spatial_barrier_removal_ptr(int count){
  if(count<1||count>1024)return nullptr;
  barrierRemovalIds.resize(count);
  return barrierRemovalIds.data();
}
// Retire and add authorized rigid pieces as one local sector refresh. This is
// needed when the game converts an existing wall into an automatic gate.
int spatial_apply_barrier_batch(int removeCount,int addCount){
  if(removeCount<0||removeCount>1024||addCount<0||addCount>1024||
     removeCount+addCount==0||barrierRemovalIds.size()<size_t(removeCount)||
     barrierBatch.size()<size_t(addCount)*6||
     addCount>std::numeric_limits<int>::max()-nextBarrierId)return 0;
  std::unordered_set<int> unique;
  for(int i=0;i<removeCount;i++){
    const int id=barrierRemovalIds[i];
    if(!unique.insert(id).second||!barrierIndex().byId.count(id))return 0;
  }
  for(int i=0;i<addCount;i++){
    const float x=barrierBatch[i*6],z=barrierBatch[i*6+1];
    const float halfX=barrierBatch[i*6+2],halfZ=barrierBatch[i*6+3];
    const float yaw=barrierBatch[i*6+4],passMask=barrierBatch[i*6+5];
    if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(halfX)||!std::isfinite(halfZ)||
       !std::isfinite(yaw)||halfX<=0||halfZ<=0||halfX>100||halfZ>100||
       !std::isfinite(passMask)||passMask<0||passMask>3||std::floor(passMask)!=passMask)return 0;
  }
  barrierBatchIds.resize(addCount);
  batchingBarriers=true;
  for(int i=0;i<removeCount;i++)spatial_remove_barrier(barrierRemovalIds[i]);
  for(int i=0;i<addCount;i++)barrierBatchIds[i]=addBarrier(
    barrierBatch[i*6],barrierBatch[i*6+1],barrierBatch[i*6+2],barrierBatch[i*6+3],
    int(barrierBatch[i*6+5]),barrierBatch[i*6+4]);
  batchingBarriers=false;
  flushBarrierBatch();
  return 1;
}
uint32_t spatial_world_seed(){return worldSeed;}
int spatial_world_biome(){return worldBiome;}
int spatial_next_barrier_id(){return nextBarrierId;}
int spatial_settlement_state_count(){return int(settlements.size());}
SettlementStateRecord* spatial_settlement_state_ptr(){
  settlementState.clear();settlementState.reserve(settlements.size());
  for(const Settlement& site:settlements)settlementState.push_back({float(site.x),float(site.z),float(site.hx),float(site.hz)});
  return settlementState.data();
}
int spatial_barrier_state_count(){return int(barrierIndex().byId.size());}
BarrierStateRecord* spatial_barrier_state_ptr(){
  barrierState.clear();barrierState.reserve(barrierIndex().byId.size());
  for(const auto& [id,barrier]:barrierIndex().byId)
    barrierState.push_back({id,barrier.x,barrier.z,barrier.halfX,barrier.halfZ,barrier.yaw,int(barrier.passMask)});
  std::sort(barrierState.begin(),barrierState.end(),[](const auto& a,const auto& b){return a.id<b.id;});
  return barrierState.data();
}
BarrierStateRecord* spatial_barrier_restore_ptr(int count){
  if(count<0||count>100000)return nullptr;
  barrierState.resize(count);
  return barrierState.data();
}
int spatial_restore_barriers(int count,int nextId){
  if(count<0||count>100000||barrierState.size()!=size_t(count)||
     nextId<1||!barrierIndex().byId.empty())return 0;
  int previousId=0;
  for(const BarrierStateRecord& item:barrierState){
    if(item.id<=previousId||item.id>=nextId||item.passMask<0||item.passMask>3||
       !std::isfinite(item.x)||!std::isfinite(item.z)||
       !std::isfinite(item.halfX)||!std::isfinite(item.halfZ)||!std::isfinite(item.yaw)||
       item.halfX<=0||item.halfZ<=0||item.halfX>100||item.halfZ>100)return 0;
    previousId=item.id;
  }
  batchingBarriers=true;
  for(const BarrierStateRecord& item:barrierState){
    const Barrier barrier={item.id,item.x,item.z,item.halfX,item.halfZ,item.yaw,
      float(std::cos(item.yaw)),float(std::sin(item.yaw)),uint8_t(item.passMask)};
    barrierIndex().byId.emplace(item.id,barrier);
    indexBarrier(barrier,true);
    refreshBarrier(barrier);
  }
  batchingBarriers=false;
  nextBarrierId=nextId;
  flushBarrierBatch();
  return 1;
}
int spatial_next_polygon_id(){return nextPolygonId;}
int spatial_polygon_state_count(){return int(polygonIndex().byId.size());}
PolygonStateRecord* spatial_polygon_state_ptr(){
  polygonState.clear();polygonState.reserve(polygonIndex().byId.size());
  for(const auto& [id,polygon]:polygonIndex().byId){
    PolygonStateRecord item{};
    item.id=id;item.count=int(polygon.xy.size()/2);item.passMask=polygon.passMask;
    std::copy(polygon.xy.begin(),polygon.xy.end(),item.xy);
    polygonState.push_back(item);
  }
  std::sort(polygonState.begin(),polygonState.end(),[](const auto& a,const auto& b){return a.id<b.id;});
  return polygonState.data();
}
PolygonStateRecord* spatial_polygon_restore_ptr(int count){
  if(count<0||count>100000)return nullptr;
  polygonState.resize(count);
  return polygonState.data();
}
int spatial_restore_polygons(int count,int nextId){
  if(count<0||count>100000||polygonState.size()!=size_t(count)||
     nextId<1||!polygonIndex().byId.empty())return 0;
  int previousId=0;
  for(const PolygonStateRecord& item:polygonState){
    if(item.id<=previousId||item.id>=nextId||item.count<3||
       item.count>maxPolygonVertices||item.passMask<0||item.passMask>3)return 0;
    float minX=std::numeric_limits<float>::infinity(),minZ=minX,maxX=-minX,maxZ=-minX;
    double area=0;
    for(int i=0;i<item.count;i++){
      const float x=item.xy[i*2],z=item.xy[i*2+1];
      if(!std::isfinite(x)||!std::isfinite(z))return 0;
      minX=std::min(minX,x);maxX=std::max(maxX,x);
      minZ=std::min(minZ,z);maxZ=std::max(maxZ,z);
      const int next=(i+1)%item.count;
      area+=double(x)*item.xy[next*2+1]-double(z)*item.xy[next*2];
    }
    if(maxX-minX>100||maxZ-minZ>100||!std::isfinite(area)||std::abs(area)<1e-4)return 0;
    previousId=item.id;
  }
  for(const PolygonStateRecord& item:polygonState){
    PolygonObstacle polygon={item.id,uint8_t(item.passMask),
      std::numeric_limits<float>::infinity(),std::numeric_limits<float>::infinity(),
      -std::numeric_limits<float>::infinity(),-std::numeric_limits<float>::infinity(),
      std::vector<float>(item.xy,item.xy+item.count*2)};
    for(int i=0;i<item.count;i++){
      polygon.minX=std::min(polygon.minX,item.xy[i*2]);
      polygon.maxX=std::max(polygon.maxX,item.xy[i*2]);
      polygon.minZ=std::min(polygon.minZ,item.xy[i*2+1]);
      polygon.maxZ=std::max(polygon.maxZ,item.xy[i*2+1]);
    }
    polygonIndex().byId.emplace(item.id,polygon);
    indexPolygon(polygon,true);refreshPolygon(polygon);
  }
  nextPolygonId=nextId;
  return 1;
}
int spatial_set_barrier_passability(int id,int passMask){
  if(passMask<0||passMask>3)return 0;
  auto& index=barrierIndex();
  const auto it=index.byId.find(id);
  if(it==index.byId.end())return 0;
  Barrier& barrier=it->second;
  if(barrier.passMask!=passMask){
    barrier.passMask=uint8_t(passMask);
    refreshBarrier(barrier);
  }
  return 1;
}
int spatial_walkable(int x,int z){return walkable(x,z);}
int spatial_edge(int x,int z,int nx,int nz){return std::abs(x-nx)+std::abs(z-nz)==1&&edge(x,z,nx,nz);}
// A short continuous connector from an actor to the discrete graph (or back).
// The same terrain, prop and barrier predicates used to rasterize navigation
// validate the actual swept segment. Longer routes belong to the sector graph.
int spatial_local_clear_except(float x,float z,float nx,float nz,int ignore0,int ignore1,int ignore2,int ignore3){
  if(!navReady||!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(nx)||!std::isfinite(nz))return 0;
  const int ignored[]={ignore0,ignore1,ignore2,ignore3};
  const double distance=std::hypot(double(nx)-x,double(nz)-z);
  if(distance>1.5)return 0;
  if(!wallSegmentClear(x,z,nx,nz,ignored,4))return 0;
  const int steps=std::max(1,int(std::ceil(distance/.2)));
  for(int i=0;i<=steps;i++){
    const double t=double(i)/steps,px=x+(nx-x)*t,pz=z+(nz-z)*t;
    const int cx=int(std::floor((px+24)/side)),cz=int(std::floor((pz+24)/side));
    if(!rasterAt(int(std::round(px)),int(std::round(pz)))||
       !terrainValid(px,pz,radiusNow,workerNow)||residentPropBlocked(px,pz,cx,cz)||
       !barrierClear(px,pz,ignored,4))return 0;
  }
  return 1;
}
int spatial_local_clear(float x,float z,float nx,float nz){
  return spatial_local_clear_except(x,z,nx,nz,0,0,0,0);
}
// Read-only local physical query for a hypothetical wall stroke or gate.
// Existing barriers named in the removal buffer are ignored and proposed
// barriers are tested without changing occupancy, sectors or graph revisions.
// -1 means the query is unavailable and the caller must use its full proof.
std::vector<int32_t> overlayRemovedProps;
constexpr int overlayPolygonStride=2+maxPolygonVertices*2;
std::vector<float> overlayPolygonInput;
float* spatial_overlay_polygon_ptr(int count){
  if(count<0||count>32)return nullptr;
  overlayPolygonInput.resize(size_t(count)*overlayPolygonStride);
  return overlayPolygonInput.data();
}
bool prepareOverlayPolygons(int count,std::vector<PolygonObstacle>& polygons){
  if(count<0||count>32||overlayPolygonInput.size()<size_t(count)*overlayPolygonStride)
    return false;
  polygons.clear();polygons.reserve(count);
  for(int i=0;i<count;i++){
    const float* input=overlayPolygonInput.data()+i*overlayPolygonStride;
    if(!std::isfinite(input[0])||!std::isfinite(input[1]))return false;
    const int vertices=int(input[0]),mask=int(input[1]);
    if(
       vertices<3||vertices>maxPolygonVertices||input[0]!=vertices||
       mask<0||mask>3||input[1]!=mask)return false;
    PolygonObstacle polygon{};
    polygon.passMask=uint8_t(mask);
    polygon.minX=polygon.minZ=std::numeric_limits<float>::infinity();
    polygon.maxX=polygon.maxZ=-std::numeric_limits<float>::infinity();
    polygon.xy.reserve(size_t(vertices)*2);
    for(int j=0;j<vertices;j++){
      const float x=input[2+j*2],z=input[3+j*2];
      if(!std::isfinite(x)||!std::isfinite(z))return false;
      polygon.xy.push_back(x);polygon.xy.push_back(z);
      polygon.minX=std::min(polygon.minX,x);
      polygon.minZ=std::min(polygon.minZ,z);
      polygon.maxX=std::max(polygon.maxX,x);
      polygon.maxZ=std::max(polygon.maxZ,z);
    }
    polygons.push_back(std::move(polygon));
  }
  return true;
}
int32_t* spatial_overlay_prop_ptr(int count){
  if(count<0||count>128)return nullptr;
  overlayRemovedProps.resize(size_t(count)*3);
  return overlayRemovedProps.data();
}
bool overlayPropBlocked(double x,double z,int cx,int cz,int propCount){
  if(!propCount)return residentPropBlocked(x,z,cx,cz);
  const auto& resident=residentSolidProps();
  const auto found=resident.find(chunkKey(cx,cz));
  if(found==resident.end())return true;
  for(const Prop& p:found->second){
    bool removed=false;
    for(int i=0;i<propCount;i++)if(p.group==overlayRemovedProps[i*3]&&
       p.gx==overlayRemovedProps[i*3+1]&&p.gz==overlayRemovedProps[i*3+2]){
      removed=true;break;
    }
    if(removed)continue;
    const double dx=p.x-x,dz=p.z-z,r=p.radius+radiusNow;
    if(dx*dx+dz*dz<r*r)return true;
  }
  return false;
}
bool prepareOverlayBarriers(int addCount,std::array<Barrier,128>& proposed){
  for(int i=0;i<addCount;i++){
    const float* b=barrierBatch.data()+i*6;
    if(!std::isfinite(b[0])||!std::isfinite(b[1])||!std::isfinite(b[2])||
       !std::isfinite(b[3])||!std::isfinite(b[4])||!std::isfinite(b[5])||
       b[2]<=0||b[3]<=0||b[5]<0||b[5]>3||std::floor(b[5])!=b[5])return false;
    proposed[i]={0,b[0],b[1],b[2],b[3],b[4],float(std::cos(b[4])),
      float(std::sin(b[4])),uint8_t(b[5])};
  }
  return true;
}
using OverlayBarrierBuckets=std::unordered_map<uint64_t,std::vector<int>>;
static OverlayBarrierBuckets indexOverlayBarriers(const std::array<Barrier,128>& proposed,int count){
  OverlayBarrierBuckets buckets;
  buckets.reserve(size_t(count)*3);
  for(int i=0;i<count;i++){
    const Barrier& barrier=proposed[i];
    const float extentX=barrierExtentX(barrier),extentZ=barrierExtentZ(barrier);
    const int minX=int(std::floor((barrier.x-extentX-maxIndexedRadius)/barrierBucketWidth));
    const int maxX=int(std::floor((barrier.x+extentX+maxIndexedRadius)/barrierBucketWidth));
    const int minZ=int(std::floor((barrier.z-extentZ-maxIndexedRadius)/barrierBucketWidth));
    const int maxZ=int(std::floor((barrier.z+extentZ+maxIndexedRadius)/barrierBucketWidth));
    for(int bz=minZ;bz<=maxZ;bz++)for(int bx=minX;bx<=maxX;bx++)
      buckets[barrierKey(bx,bz)].push_back(i);
  }
  return buckets;
}
int overlaySegmentClear(float x,float z,float nx,float nz,int removeCount,int addCount,
  int propCount,const std::array<Barrier,128>& proposed,
  const std::vector<PolygonObstacle>& overlayPolygons,
  const OverlayBarrierBuckets& proposedBuckets){
  if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(nx)||!std::isfinite(nz))return -1;
  const double distance=std::hypot(double(nx)-x,double(nz)-z);
  if(distance>32)return -1;
  const int segments=std::max(1,int(std::ceil(distance/1.25)));
  const uint8_t profileBit=workerNow?1:2;
  for(int segment=0;segment<segments;segment++){
    const double ax=x+(nx-x)*double(segment)/segments,
      az=z+(nz-z)*double(segment)/segments;
    const double bx=x+(nx-x)*double(segment+1)/segments,
      bz=z+(nz-z)*double(segment+1)/segments;
    const int steps=std::max(1,int(std::ceil(std::hypot(bx-ax,bz-az)/.2)));
    for(int i=0;i<=steps;i++){
      const double t=double(i)/steps,px=ax+(bx-ax)*t,pz=az+(bz-az)*t;
      const int cx=int(std::floor((px+24)/side)),cz=int(std::floor((pz+24)/side));
      if(!rasterAt(int(std::round(px)),int(std::round(pz))))return -1;
      if(!terrainValid(px,pz,radiusNow,workerNow)||overlayPropBlocked(px,pz,cx,cz,propCount)||
         !barrierClear(px,pz,barrierRemovalIds.data(),removeCount))return 0;
      for(const auto& polygon:overlayPolygons)
        if(polygonBlocks(polygon,px,pz,profileBit))return 0;
      const int bucketX=int(std::floor(px/barrierBucketWidth));
      const int bucketZ=int(std::floor(pz/barrierBucketWidth));
      if(const auto candidates=proposedBuckets.find(barrierKey(bucketX,bucketZ));
         candidates!=proposedBuckets.end())
        for(const int j:candidates->second){
          const Barrier& b=proposed[j];
          if(b.passMask&profileBit)continue;
          const double dx=px-b.x,dz=pz-b.z;
          if(std::abs(dx*b.c-dz*b.s)<b.halfX+radiusNow&&
             std::abs(dx*b.s+dz*b.c)<b.halfZ+radiusNow)return 0;
        }
    }
  }
  return 1;
}
int spatial_overlay_local_clear(float x,float z,float nx,float nz,int removeCount,int addCount,
  int propCount,int polygonCount){
  if(!navReady||removeCount<0||removeCount>4||addCount<0||addCount>128||
     propCount<0||propCount>128||overlayRemovedProps.size()<size_t(propCount)*3||
     barrierRemovalIds.size()<size_t(removeCount)||barrierBatch.size()<size_t(addCount)*6)
    return -1;
  for(int i=0;i<removeCount;i++)if(!barrierIndex().byId.count(barrierRemovalIds[i]))return -1;
  std::array<Barrier,128> proposed;
  std::vector<PolygonObstacle> polygons;
  if(!prepareOverlayBarriers(addCount,proposed)||
     !prepareOverlayPolygons(polygonCount,polygons))return -1;
  const auto buckets=indexOverlayBarriers(proposed,addCount);
  return overlaySegmentClear(x,z,nx,nz,removeCount,addCount,propCount,
    proposed,polygons,buckets);
}
// Positive-only reachability proof for several worker witnesses of one
// village. The confirmed sector graph and barrier index are never modified.
// An unresolved target remains -1 (unknown), including a bounded search that
// exhausts its local window; callers must never interpret it as blocked.
std::vector<float> overlayReachInput;
std::vector<float> overlayReachPortals;
std::vector<int32_t> overlayReachOutput;
std::vector<float> overlayReachCosts;
float* spatial_overlay_reach_input_ptr(int count){
  if(count<1||count>256)return nullptr;
  overlayReachInput.resize(size_t(count)*2);
  return overlayReachInput.data();
}
int32_t* spatial_overlay_reach_result_ptr(){return overlayReachOutput.data();}
float* spatial_overlay_reach_cost_ptr(){return overlayReachCosts.data();}
float* spatial_overlay_reach_portal_ptr(int count){
  if(count<0||count>128)return nullptr;
  overlayReachPortals.resize(size_t(count)*4);
  return overlayReachPortals.data();
}
int spatial_overlay_reach_batch(float x,float z,int count,int removeCount,
  int addCount,int propCount,int portalCount,int reverse,int margin,int polygonCount,
  int recordCost){
  if(!navReady||!std::isfinite(x)||!std::isfinite(z)||count<1||count>256||
     overlayReachInput.size()<size_t(count)*2||removeCount<0||removeCount>4||
     addCount<0||addCount>128||propCount<0||propCount>128||
     portalCount<0||portalCount>128||
     overlayReachPortals.size()<size_t(portalCount)*4||
     (reverse!=0&&reverse!=1)||(recordCost!=0&&recordCost!=1)||
     margin<0||margin>48)
    return -1;
  std::array<Barrier,128> proposed;
  std::vector<PolygonObstacle> polygons;
  if(barrierRemovalIds.size()<size_t(removeCount)||
     barrierBatch.size()<size_t(addCount)*6||
     overlayRemovedProps.size()<size_t(propCount)*3||
     !prepareOverlayBarriers(addCount,proposed)||
     !prepareOverlayPolygons(polygonCount,polygons))return -1;
  for(int i=0;i<removeCount;i++)if(!barrierIndex().byId.count(barrierRemovalIds[i]))return -1;
  const auto buckets=indexOverlayBarriers(proposed,addCount);
  std::array<Barrier,128> removed;
  for(int i=0;i<removeCount;i++)removed[i]=barrierIndex().byId.at(barrierRemovalIds[i]);
  const auto removedBuckets=indexOverlayBarriers(removed,removeCount);
  std::vector<Prop> removedFootprints;
  if(propCount){
    for(const auto& [key,props]:residentSolidProps())for(const Prop& prop:props)
      for(int i=0;i<propCount;i++)if(prop.group==overlayRemovedProps[i*3]&&
        prop.gx==overlayRemovedProps[i*3+1]&&prop.gz==overlayRemovedProps[i*3+2]){
        removedFootprints.push_back(prop);break;
      }
  }
  const auto probe=[&](float ax,float az,float bx,float bz){
    return overlaySegmentClear(ax,az,bx,bz,removeCount,addCount,propCount,
      proposed,polygons,buckets);
  };
  const auto gridEdge=[&](int ax,int az,int bx,int bz){
    const auto nearby=[&](const OverlayBarrierBuckets& index,int px,int pz){
      return index.count(barrierKey(int(std::floor(double(px)/barrierBucketWidth)),
        int(std::floor(double(pz)/barrierBucketWidth))))!=0;
    };
    // A removed wall changes only edges near its former swept footprint.
    // The bucket padding covers the largest physical profile and a grid edge.
    bool changed=nearby(removedBuckets,ax,az)||nearby(removedBuckets,bx,bz)||
      nearby(buckets,ax,az)||nearby(buckets,bx,bz);
    if(!changed)for(const auto& polygon:polygons)
      if(std::max(ax,bx)>=polygon.minX-radiusNow&&
         std::min(ax,bx)<=polygon.maxX+radiusNow&&
         std::max(az,bz)>=polygon.minZ-radiusNow&&
         std::min(az,bz)<=polygon.maxZ+radiusNow){changed=true;break;}
    if(!changed)for(const Prop& prop:removedFootprints){
      const double reach=prop.radius+radiusNow+2;
      if(std::hypot(double(ax)-prop.x,double(az)-prop.z)<reach||
         std::hypot(double(bx)-prop.x,double(bz)-prop.z)<reach){changed=true;break;}
    }
    if(!changed)return lazy_grid_edge(ax,az,bx,bz);
    return probe(float(ax),float(az),float(bx),float(bz));
  };
  overlayReachOutput.assign(size_t(count),-1);
  if(recordCost)overlayReachCosts.assign(size_t(count),-1.f);
  double minX=x,maxX=x,minZ=z,maxZ=z;
  for(int i=0;i<count;i++){
    const float tx=overlayReachInput[i*2],tz=overlayReachInput[i*2+1];
    if(!std::isfinite(tx)||!std::isfinite(tz))return -1;
    minX=std::min(minX,double(tx));maxX=std::max(maxX,double(tx));
    minZ=std::min(minZ,double(tz));maxZ=std::max(maxZ,double(tz));
  }
  const int loX=int(std::floor(minX))-margin,hiX=int(std::ceil(maxX))+margin;
  const int loZ=int(std::floor(minZ))-margin,hiZ=int(std::ceil(maxZ))+margin;
  const int width=hiX-loX+1,height=hiZ-loZ+1;
  if(width<1||height<1||width>256||height>256||
     uint64_t(width)*height>65536)return -1;
  const auto index=[&](int px,int pz){return (pz-loZ)*width+px-loX;};
  std::unordered_map<int,std::vector<int>> targetsByCell;
  for(int i=0;i<count;i++){
    const float tx=overlayReachInput[i*2],tz=overlayReachInput[i*2+1];
    for(int cz=int(std::floor(tz))-1;cz<=int(std::ceil(tz))+1;cz++)
      for(int cx=int(std::floor(tx))-1;cx<=int(std::ceil(tx))+1;cx++){
        if(cx<loX||cx>hiX||cz<loZ||cz>hiZ||
           std::hypot(double(cx)-tx,double(cz)-tz)>1.5)continue;
        targetsByCell[index(cx,cz)].push_back(i);
      }
  }
  struct Crossing {float fromX,fromZ,toX,toZ;};
  std::vector<Crossing> crossings;
  std::unordered_map<int,std::vector<int>> crossingsByCell;
  const int nativePortalCount=lazy_portal_count();
  for(int id=0;id<nativePortalCount+portalCount;id++)for(int direction=0;direction<2;direction++){
    float points[4];
    if(id<nativePortalCount){
      if(!lazy_portal_world_points(id*2+direction,points))continue;
    }else{
      const float* proposed=overlayReachPortals.data()+(id-nativePortalCount)*4;
      for(int j=0;j<4;j++)points[j]=proposed[j];
      if(direction){std::swap(points[0],points[2]);std::swap(points[1],points[3]);}
    }
    if(!std::isfinite(points[0])||!std::isfinite(points[1])||
       !std::isfinite(points[2])||!std::isfinite(points[3]))return -1;
    if(reverse){std::swap(points[0],points[2]);std::swap(points[1],points[3]);}
    const int crossing=int(crossings.size());
    crossings.push_back({points[0],points[1],points[2],points[3]});
    for(int cz=int(std::floor(points[1]))-1;cz<=int(std::ceil(points[1]))+1;cz++)
      for(int cx=int(std::floor(points[0]))-1;cx<=int(std::ceil(points[0]))+1;cx++){
        if(cx<loX||cx>hiX||cz<loZ||cz>hiZ||
           std::hypot(double(cx)-points[0],double(cz)-points[1])>1.5)continue;
        crossingsByCell[index(cx,cz)].push_back(crossing);
      }
  }
  std::vector<uint8_t> seen(size_t(width)*height,0);
  std::vector<float> reachCost;
  if(recordCost)reachCost.assign(size_t(width)*height,0.f);
  std::vector<int> queue;
  queue.reserve(std::min(width*height,8192));
  for(int cz=int(std::floor(z))-1;cz<=int(std::ceil(z))+1;cz++)
    for(int cx=int(std::floor(x))-1;cx<=int(std::ceil(x))+1;cx++){
      if(cx<loX||cx>hiX||cz<loZ||cz>hiZ||
         std::hypot(double(cx)-x,double(cz)-z)>1.5)continue;
      const int cell=index(cx,cz);
      if(seen[cell])continue;
      const int clear=reverse?
        probe(float(cx),float(cz),x,z):
        probe(x,z,float(cx),float(cz));
      if(clear==1){seen[cell]=1;
        if(recordCost)reachCost[cell]=std::hypot(float(cx)-x,float(cz)-z);
        queue.push_back(cell);}
    }
  int found=0;
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(size_t head=0;head<queue.size()&&head<50000&&found<count;head++){
    const int cell=queue[head],cx=loX+cell%width,cz=loZ+cell/width;
    if(const auto it=targetsByCell.find(cell);it!=targetsByCell.end())
      for(const int target:it->second){
        if(overlayReachOutput[target]==1)continue;
        const float tx=overlayReachInput[target*2],tz=overlayReachInput[target*2+1];
        const int clear=reverse?
          probe(tx,tz,float(cx),float(cz)):
          probe(float(cx),float(cz),tx,tz);
        if(clear==1){overlayReachOutput[target]=1;
          if(recordCost)overlayReachCosts[target]=reachCost[cell]+
            std::hypot(float(cx)-tx,float(cz)-tz);
          found++;}
      }
    if(const auto it=crossingsByCell.find(cell);it!=crossingsByCell.end())
      for(const int crossingId:it->second){
        const Crossing& crossing=crossings[crossingId];
        const int entry=reverse?
          probe(crossing.fromX,crossing.fromZ,float(cx),float(cz)):
          probe(float(cx),float(cz),crossing.fromX,crossing.fromZ);
        if(entry!=1)continue;
        const int through=reverse?
          probe(crossing.toX,crossing.toZ,crossing.fromX,crossing.fromZ):
          probe(crossing.fromX,crossing.fromZ,crossing.toX,crossing.toZ);
        if(through!=1)continue;
        for(int pz=int(std::floor(crossing.toZ))-1;pz<=int(std::ceil(crossing.toZ))+1;pz++)
          for(int px=int(std::floor(crossing.toX))-1;px<=int(std::ceil(crossing.toX))+1;px++){
            if(px<loX||px>hiX||pz<loZ||pz>hiZ||
               std::hypot(double(px)-crossing.toX,double(pz)-crossing.toZ)>1.5)continue;
            const int destination=index(px,pz);
            if(seen[destination])continue;
            const int exit=reverse?
              probe(float(px),float(pz),crossing.toX,crossing.toZ):
              probe(crossing.toX,crossing.toZ,float(px),float(pz));
            if(exit==1){seen[destination]=1;
              if(recordCost)reachCost[destination]=reachCost[cell]+
                std::hypot(float(cx)-crossing.fromX,float(cz)-crossing.fromZ)+
                std::hypot(crossing.fromX-crossing.toX,
                  crossing.fromZ-crossing.toZ)+
                std::hypot(float(px)-crossing.toX,float(pz)-crossing.toZ);
              queue.push_back(destination);}
          }
      }
    for(int d=0;d<4;d++){
      const int nx=cx+dx[d],nz=cz+dz[d];
      if(nx<loX||nx>hiX||nz<loZ||nz>hiZ)continue;
      const int next=index(nx,nz);
      if(seen[next])continue;
      const int clear=reverse?
        gridEdge(nx,nz,cx,cz):gridEdge(cx,cz,nx,nz);
      if(clear==1){seen[next]=1;
        if(recordCost)reachCost[next]=reachCost[cell]+1.f;
        queue.push_back(next);}
    }
  }
  return found;
}
// Crop placement advice is separate from movement passability: a worker may
// cross an automatic gate, but a seed cannot be placed on that wall. -1 means
// the resident prop/terrain data is missing; callers must not claim no space.
int spatial_crop_placement_valid(float x,float z){
  if(!navReady||!std::isfinite(x)||!std::isfinite(z))return -1;
  const ChunkSpatialSample* sample=residentSample(x,z);
  if(!sample)return -1;
  constexpr double cropRadius=.4;
  const auto surfaceAt=[&](double px,double pz){
    const double ground=spatial_surface_anywhere(float(px),float(pz));
    return worldBiome==5?std::max(ground,double(spatial_fluid_surface_level())):ground;
  };
  for(int i=0;i<5;i++){
    const double px=x+(i==1?cropRadius:i==2?-cropRadius:0);
    const double pz=z+(i==3?cropRadius:i==4?-cropRadius:0);
    const double slope=std::hypot(surfaceAt(px+.8,pz)-surfaceAt(px-.8,pz),
      surfaceAt(px,pz+.8)-surfaceAt(px,pz-.8))/1.6;
    if(!std::isfinite(slope)||slope>.5||
       spatial_fluid_level_anywhere(float(px),float(pz))!=0)return 0;
  }
  const int minCx=int(std::floor((x-4.4+24)/side));
  const int maxCx=int(std::floor((x+4.4+24)/side));
  const int minCz=int(std::floor((z-4.4+24)/side));
  const int maxCz=int(std::floor((z+4.4+24)/side));
  for(int cz=minCz;cz<=maxCz;cz++)for(int cx=minCx;cx<=maxCx;cx++){
    const auto props=residentSolidProps().find(chunkKey(cx,cz));
    if(props==residentSolidProps().end())return -1;
    for(const Prop& prop:props->second)
      if(std::hypot(double(x)-prop.x,double(z)-prop.z)<prop.radius+cropRadius)
        return 0;
  }
  const int bx=int(std::floor(x/barrierBucketWidth));
  const int bz=int(std::floor(z/barrierBucketWidth));
  const auto key=barrierKey(bx,bz);
  const auto& barriers=barrierIndex();
  if(const auto bucket=barriers.buckets.find(key);bucket!=barriers.buckets.end())
    for(int id:bucket->second){
      const Barrier& wall=barriers.byId.at(id);
      if(std::hypot(double(x)-wall.x,double(z)-wall.z)<1.1)return 0;
    }
  if(polygonRegistry){
    const auto& polygons=*polygonRegistry;
    if(const auto bucket=polygons.buckets.find(key);bucket!=polygons.buckets.end())
      for(int id:bucket->second){
        const PolygonObstacle& polygon=polygons.byId.at(id);
        if(x<polygon.minX-cropRadius||x>polygon.maxX+cropRadius||
           z<polygon.minZ-cropRadius||z>polygon.maxZ+cropRadius)continue;
        bool inside=false;
        double nearest=std::numeric_limits<double>::infinity();
        const int count=int(polygon.xy.size()/2);
        for(int i=0,j=count-1;i<count;j=i++){
          const double ax=polygon.xy[i*2],az=polygon.xy[i*2+1];
          const double bx=polygon.xy[j*2],bz=polygon.xy[j*2+1];
          if((az>z)!=(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
          const double dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
          const double t=length?std::clamp(((x-ax)*dx+(z-az)*dz)/length,0.0,1.0):0;
          nearest=std::min(nearest,std::hypot(x-ax-dx*t,z-az-dz*t));
        }
        if(inside||nearest<cropRadius)return 0;
      }
  }
  return 1;
}
// One JS->WASM call classifies many actor/crop positions. Each output row is
// [unknown, component0..3]; -1 denotes an unused component slot. Keep every
// reachable anchor: a fractional position may straddle two components.
float* spatial_region_batch_input_ptr(int count){
  if(count<1||count>4096)return nullptr;
  regionBatchInput.resize(size_t(count)*2);
  return regionBatchInput.data();
}
int32_t* spatial_region_batch_output_ptr(){return regionBatchOutput.data();}
int spatial_region_batch(int count){
  if(count<1||count>4096||regionBatchInput.size()<size_t(count)*2)return 0;
  regionBatchOutput.assign(size_t(count)*5,-1);
  for(int i=0;i<count;i++){
    const float x=regionBatchInput[i*2],z=regionBatchInput[i*2+1];
    if(!std::isfinite(x)||!std::isfinite(z))return 0;
    const int xs[2]={int(std::floor(x)),int(std::ceil(x))};
    const int zs[2]={int(std::floor(z)),int(std::ceil(z))};
    int found=0;
    regionBatchOutput[i*5]=0;
    for(int xi=0;xi<2;xi++)for(int zi=0;zi<2;zi++){
      if((xi&&xs[xi]==xs[0])||(zi&&zs[zi]==zs[0]))continue;
      const int ax=xs[xi],az=zs[zi],component=lazy_component(ax,az);
      if(component==-1){regionBatchOutput[i*5]=1;continue;}
      if(component<0)continue;
      bool duplicate=false;
      for(int slot=0;slot<found;slot++)if(regionBatchOutput[i*5+1+slot]==component){duplicate=true;break;}
      if(duplicate||!spatial_local_clear(x,z,float(ax),float(az)))continue;
      regionBatchOutput[i*5+1+found++]=component;
    }
    std::sort(regionBatchOutput.begin()+i*5+1,regionBatchOutput.begin()+i*5+1+found);
  }
  return count;
}
int spatial_prop_blocked(float x,float z){return propBlocked(x,z);}
// Read-only exact clearance to the existing animal-solid object surfaces.
// The resident prop list includes a halo; barriers and polygons use the same
// indexed geometry as movement. Terrain/water is deliberately excluded, so a
// distant-object answer never certifies a natural-border join on its own.
float staticObjectClearance(float x,float z,float limit,int removeCount,
  int addCount,int propCount,const std::array<Barrier,128>* proposed){
  if(!std::isfinite(x)||!std::isfinite(z)||!std::isfinite(limit)||
     limit<=0||limit>8)return std::numeric_limits<float>::quiet_NaN();
  int cx=0,cz=0;
  if(!residentSample(x,z,&cx,&cz))return std::numeric_limits<float>::quiet_NaN();
  const auto props=residentSolidProps().find(chunkKey(cx,cz));
  if(props==residentSolidProps().end())return std::numeric_limits<float>::quiet_NaN();
  double best=double(limit)+1;
  for(const Prop& prop:props->second){
    bool removed=false;
    for(int i=0;i<propCount;i++)if(prop.group==overlayRemovedProps[i*3]&&
       prop.gx==overlayRemovedProps[i*3+1]&&
       prop.gz==overlayRemovedProps[i*3+2]){removed=true;break;}
    if(removed)continue;
    const double distance=std::max(0.0,std::hypot(double(x)-prop.x,
      double(z)-prop.z)-prop.radius);
    best=std::min(best,distance);
  }
  const int bx0=int(std::floor((x-limit)/barrierBucketWidth));
  const int bx1=int(std::floor((x+limit)/barrierBucketWidth));
  const int bz0=int(std::floor((z-limit)/barrierBucketWidth));
  const int bz1=int(std::floor((z+limit)/barrierBucketWidth));
  std::unordered_set<int> seenBarriers,seenPolygons;
  const auto& barriers=barrierIndex();
  for(int bz=bz0;bz<=bz1;bz++)for(int bx=bx0;bx<=bx1;bx++){
    const auto key=barrierKey(bx,bz);
    if(const auto bucket=barriers.buckets.find(key);bucket!=barriers.buckets.end())
      for(const int id:bucket->second){
        if(!seenBarriers.insert(id).second)continue;
        if(std::find(barrierRemovalIds.begin(),
          barrierRemovalIds.begin()+removeCount,id)!=
          barrierRemovalIds.begin()+removeCount)continue;
        const Barrier& solid=barriers.byId.at(id);
        if(solid.passMask&2)continue;
        const double dx=x-solid.x,dz=z-solid.z;
        const double u=dx*solid.c-dz*solid.s;
        const double v=dx*solid.s+dz*solid.c;
        best=std::min(best,std::hypot(std::max(0.0,std::abs(u)-solid.halfX),
          std::max(0.0,std::abs(v)-solid.halfZ)));
      }
    if(!polygonRegistry)continue;
    const auto& polygons=*polygonRegistry;
    if(const auto bucket=polygons.buckets.find(key);bucket!=polygons.buckets.end())
      for(const int id:bucket->second){
        if(!seenPolygons.insert(id).second)continue;
        const PolygonObstacle& solid=polygons.byId.at(id);
        if(solid.passMask&2||x<solid.minX-limit||x>solid.maxX+limit||
           z<solid.minZ-limit||z>solid.maxZ+limit)continue;
        bool inside=false;
        double nearest=std::numeric_limits<double>::infinity();
        const int count=int(solid.xy.size()/2);
        for(int i=0,j=count-1;i<count;j=i++){
          const double ax=solid.xy[i*2],az=solid.xy[i*2+1];
          const double ex=solid.xy[j*2],ez=solid.xy[j*2+1];
          if((az>z)!=(ez>z)&&x<(ex-ax)*(z-az)/(ez-az)+ax)inside=!inside;
          const double dx=ex-ax,dz=ez-az,length=dx*dx+dz*dz;
          const double t=length?std::clamp(((x-ax)*dx+(z-az)*dz)/length,0.0,1.0):0;
          nearest=std::min(nearest,std::hypot(x-ax-dx*t,z-az-dz*t));
        }
        best=std::min(best,inside?0.0:nearest);
      }
  }
  if(proposed)for(int i=0;i<addCount;i++){
    const Barrier& solid=(*proposed)[i];
    if(solid.passMask&2)continue;
    const double dx=x-solid.x,dz=z-solid.z;
    const double u=dx*solid.c-dz*solid.s;
    const double v=dx*solid.s+dz*solid.c;
    best=std::min(best,std::hypot(std::max(0.0,std::abs(u)-solid.halfX),
      std::max(0.0,std::abs(v)-solid.halfZ)));
  }
  return float(std::min(best,double(limit)+1));
}
float spatial_static_object_clearance(float x,float z,float limit){
  return staticObjectClearance(x,z,limit,0,0,0,nullptr);
}
float spatial_overlay_static_object_clearance(float x,float z,float limit,
  int removeCount,int addCount,int propCount){
  if(removeCount<0||removeCount>4||addCount<0||addCount>128||
     propCount<0||propCount>128||barrierRemovalIds.size()<size_t(removeCount)||
     barrierBatch.size()<size_t(addCount)*6||
     overlayRemovedProps.size()<size_t(propCount)*3)
    return std::numeric_limits<float>::quiet_NaN();
  for(int i=0;i<removeCount;i++)if(!barrierIndex().byId.count(barrierRemovalIds[i]))
    return std::numeric_limits<float>::quiet_NaN();
  std::array<Barrier,128> proposed;
  if(!prepareOverlayBarriers(addCount,proposed))
    return std::numeric_limits<float>::quiet_NaN();
  return staticObjectClearance(x,z,limit,removeCount,addCount,propCount,&proposed);
}
std::vector<int32_t> overlayCutFaces;
std::vector<uint8_t> overlayCutResults;
int32_t* spatial_overlay_cut_face_ptr(int count){
  if(count<1||count>4096)return nullptr;
  overlayCutFaces.resize(size_t(count)*4);
  return overlayCutFaces.data();
}
uint8_t* spatial_overlay_cut_result_ptr(){return overlayCutResults.data();}
int spatial_overlay_cut_solid_faces(int count,int removeCount,int addCount,
  int propCount,float radius){
  if(count<1||count>4096||overlayCutFaces.size()<size_t(count)*4||
     removeCount<0||removeCount>4||addCount<0||addCount>128||
     propCount<0||propCount>128||barrierRemovalIds.size()<size_t(removeCount)||
     barrierBatch.size()<size_t(addCount)*6||
     overlayRemovedProps.size()<size_t(propCount)*3||
     !(radius>.0001f)||radius+1>8||!std::isfinite(radius))return -1;
  for(int i=0;i<removeCount;i++)if(!barrierIndex().byId.count(barrierRemovalIds[i]))
    return -1;
  std::array<Barrier,128> proposed;
  if(!prepareOverlayBarriers(addCount,proposed))return -1;
  overlayCutResults.assign(size_t(count),0);
  const float safe=radius-.0001f;
  for(int face=0;face<count;face++){
    const int32_t* edge=overlayCutFaces.data()+face*4;
    const int x=edge[0],z=edge[1],nx=edge[2],nz=edge[3];
    if(std::abs(x-nx)+std::abs(z-nz)!=1)return -1;
    const float middleX=(x+nx)*.5f,middleZ=(z+nz)*.5f;
    const float ax=x!=nx?middleX:middleX-.5f;
    const float az=x!=nx?middleZ-.5f:middleZ;
    const float bx=x!=nx?middleX:middleX+.5f;
    const float bz=x!=nx?middleZ+.5f:middleZ;
    const auto clearance=[&](float px,float pz){
      return staticObjectClearance(px,pz,radius+1,removeCount,addCount,
        propCount,&proposed);
    };
    const auto covered=[&](auto&& self,float px,float pz,float qx,float qz,
      float a,float b,int depth)->bool{
      if(!std::isfinite(a)||!std::isfinite(b)||a<0||b<0||
         a>=safe||b>=safe)return false;
      const float length=std::hypot(qx-px,qz-pz);
      if((a+b+length)*.5f<safe)return true;
      if(depth>=12)return false;
      const float mx=(px+qx)*.5f,mz=(pz+qz)*.5f;
      const float mid=clearance(mx,mz);
      return self(self,px,pz,mx,mz,a,mid,depth+1)&&
        self(self,mx,mz,qx,qz,mid,b,depth+1);
    };
    overlayCutResults[face]=covered(covered,ax,az,bx,bz,
      clearance(ax,az),clearance(bx,bz),0)?1:0;
  }
  return count;
}
}
