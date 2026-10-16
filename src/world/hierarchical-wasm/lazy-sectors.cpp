#include <algorithm>
#include <cmath>
#include <cstdint>
#include <unordered_map>
#include <vector>
#include "local-enclosure-cut.h"

extern "C" float spatial_static_object_clearance(float,float,float);
extern "C" float spatial_min_animal_radius();
extern "C" float spatial_fluid_level(float,float);

// Sparse sector/route proof. Unknown sectors are never classified as blocked.
// The movement engine remains responsible for physical motion.
namespace {
constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
struct Arc {int32_t to,fromCell,toCell,portal=-1;};
struct Portal {int fromX,fromZ,toX,toZ;float fromWorldX,fromWorldZ,toWorldX,toWorldZ;};
struct Sector {
  int sx,sz,id,components=0;
  std::vector<uint8_t> pass,steps,inbound;
  std::vector<int16_t> component;
  std::vector<std::vector<Arc>> edges;
  std::vector<uint8_t> unknown,weakUnknown;
};
struct Context {
  int sectorSize=0,updates=0;
  uint32_t routeRevision=1;
  int connectivityReason=0,weakFailure=0;
  std::vector<uint8_t> stagedPass,stagedSteps,stagedInbound;
  std::unordered_map<uint64_t,Sector>* sectors=nullptr;
  std::vector<Sector*> byId;
  std::vector<int> freeIds;
  std::vector<int32_t> queueBuffer;
  std::vector<uint32_t> visited;
  uint32_t visitGeneration=0;
  std::vector<int32_t> previousNode,localParent,routePoints;
  std::vector<int32_t> cutSeeds,cutEdges,cutBoundary;
  int cutFlow=0,cutCells=0;
  std::vector<Arc> previousArc,arcChain;
  std::vector<Portal> portals;
  std::vector<int32_t> weakHead,weakTo,weakNext;
  std::vector<uint8_t> weakOpen;
  std::vector<int32_t> weakRegion;
  std::vector<uint8_t> weakRegionOpen;
  bool weakDirty=true;
};
// Standalone no-entry WASM does not run global C++ constructors. Construct
// each profile on first use instead of relying on zeroed vector internals.
constexpr int navigationProfiles=6;
Context* contexts[navigationProfiles]={};
int selectedContext=0;
Context& active(){
  Context*& context=contexts[selectedContext];
  if(!context)context=new Context();
  return *context;
}
// Keep the existing sector algorithm scoped to the selected movement profile.
#define sectorSize (active().sectorSize)
#define updates (active().updates)
#define stagedPass (active().stagedPass)
#define stagedSteps (active().stagedSteps)
#define stagedInbound (active().stagedInbound)
#define sectors (active().sectors)
#define byId (active().byId)
#define freeIds (active().freeIds)
#define queueBuffer (active().queueBuffer)
#define visited (active().visited)
#define visitGeneration (active().visitGeneration)
#define previousNode (active().previousNode)
#define localParent (active().localParent)
#define routePoints (active().routePoints)
#define cutSeeds (active().cutSeeds)
#define cutEdges (active().cutEdges)
#define cutBoundary (active().cutBoundary)
#define previousArc (active().previousArc)
#define arcChain (active().arcChain)
#define portals (active().portals)
#define weakHead (active().weakHead)
#define weakTo (active().weakTo)
#define weakNext (active().weakNext)
#define weakOpen (active().weakOpen)
#define weakRegion (active().weakRegion)
#define weakRegionOpen (active().weakRegionOpen)
#define weakDirty (active().weakDirty)
#define connectivityReason (active().connectivityReason)
#define weakFailure (active().weakFailure)
uint64_t key(int sx,int sz){return (static_cast<uint64_t>(static_cast<uint32_t>(sx))<<32)|static_cast<uint32_t>(sz);}
Sector* get(int sx,int sz){const auto it=sectors->find(key(sx,sz));return it==sectors->end()?nullptr:&it->second;}
int floorDiv(int n,int d){return n>=0?n/d:-((-n+d-1)/d);}
int cellIndex(int x,int z){return z*sectorSize+x;}
uint32_t beginVisit(int maxNodes){
  visited.resize(maxNodes,0);
  if(++visitGeneration==0){
    std::fill(visited.begin(),visited.end(),0);
    visitGeneration=1;
  }
  return visitGeneration;
}
void flood(Sector& sector){
  const int n=sectorSize*sectorSize;
  sector.component.assign(n,-1);sector.components=0;
  for(int seed=0;seed<n;seed++){
    if(!sector.pass[seed]||sector.component[seed]>=0)continue;
    const int id=sector.components++;
    queueBuffer.clear();queueBuffer.push_back(seed);sector.component[seed]=id;
    for(size_t q=0;q<queueBuffer.size();q++){
      const int at=queueBuffer[q],x=at%sectorSize,z=at/sectorSize;
      for(int d=0;d<4;d++){
        const int nx=x+dx[d],nz=z+dz[d];
        if(nx<0||nz<0||nx>=sectorSize||nz>=sectorSize)continue;
        const int next=cellIndex(nx,nz);
        if(!sector.pass[next]||sector.component[next]>=0)continue;
        if(!(sector.steps[at]&(1<<d))&&!(sector.steps[next]&(1<<(d^1))))continue;
        sector.component[next]=id;queueBuffer.push_back(next);
      }
    }
  }
}
void rebuildEdges(Sector& sector){
  sector.edges.assign(sector.components,{});sector.unknown.assign(sector.components,0);
  sector.weakUnknown.assign(sector.components,0);
  for(int z=0;z<sectorSize;z++)for(int x=0;x<sectorSize;x++){
    const int at=cellIndex(x,z),component=sector.component[at];
    if(component<0)continue;
    for(int d=0;d<4;d++){
      const int nx=x+dx[d],nz=z+dz[d];
      if(nx>=0&&nz>=0&&nx<sectorSize&&nz<sectorSize)continue;
      const bool outbound=sector.steps[at]&(1<<d),inbound=sector.inbound[at]&(1<<d);
      if(!outbound&&!inbound)continue;
      const int neighborX=sector.sx+(nx<0?-1:nx>=sectorSize?1:0);
      const int neighborZ=sector.sz+(nz<0?-1:nz>=sectorSize?1:0);
      const Sector* neighbor=get(neighborX,neighborZ);
      if(!neighbor){
        if(outbound)sector.unknown[component]=1;
        sector.weakUnknown[component]=1;continue;
      }
      if(!outbound)continue;
      const int lx=(nx+sectorSize)%sectorSize,lz=(nz+sectorSize)%sectorSize;
      const int target=neighbor->component[cellIndex(lx,lz)];
      if(target<0)continue;
      const int32_t node=neighbor->id*sectorSize*sectorSize+target;
      auto& edges=sector.edges[component];
      edges.push_back({node,at,cellIndex(lx,lz)});
    }
  }
  for(size_t id=0;id<portals.size();id++){
    const Portal& portal=portals[id];
    for(int direction=0;direction<2;direction++){
      const int fromX=direction?portal.toX:portal.fromX,fromZ=direction?portal.toZ:portal.fromZ;
      const int toX=direction?portal.fromX:portal.toX,toZ=direction?portal.fromZ:portal.toZ;
      if(floorDiv(fromX,sectorSize)!=sector.sx||floorDiv(fromZ,sectorSize)!=sector.sz)continue;
      const Sector* targetSector=get(floorDiv(toX,sectorSize),floorDiv(toZ,sectorSize));
      if(!targetSector)continue;
      const int fromCell=cellIndex(fromX-sector.sx*sectorSize,fromZ-sector.sz*sectorSize);
      const int toCell=cellIndex(toX-targetSector->sx*sectorSize,toZ-targetSector->sz*sectorSize);
      const int fromComponent=sector.component[fromCell],toComponent=targetSector->component[toCell];
      if(fromComponent<0||toComponent<0)continue;
      const int32_t node=targetSector->id*sectorSize*sectorSize+toComponent;
      sector.edges[fromComponent].push_back({node,fromCell,toCell,static_cast<int>(id)*2+direction});
    }
  }
}
void rebuildWeakGraph(){
  const int nodes=static_cast<int>(byId.size())*sectorSize*sectorSize;
  weakHead.assign(nodes,-1);weakOpen.assign(nodes,0);weakTo.clear();weakNext.clear();
  auto add=[&](int from,int to){
    weakTo.push_back(to);weakNext.push_back(weakHead[from]);weakHead[from]=static_cast<int>(weakTo.size())-1;
  };
  for(const Sector* sector:byId){
    if(!sector)continue;
    for(int component=0;component<sector->components;component++){
      const int from=sector->id*sectorSize*sectorSize+component;
      weakOpen[from]=sector->weakUnknown[component];
      for(const Arc& arc:sector->edges[component]){add(from,arc.to);add(arc.to,from);}
    }
  }
  weakRegion.assign(nodes,-1);weakRegionOpen.clear();
  for(const Sector* sector:byId){
    if(!sector)continue;
    for(int component=0;component<sector->components;component++){
      const int seed=sector->id*sectorSize*sectorSize+component;
      if(weakRegion[seed]>=0)continue;
      const int region=static_cast<int>(weakRegionOpen.size());
      weakRegionOpen.push_back(0);queueBuffer.clear();queueBuffer.push_back(seed);
      weakRegion[seed]=region;
      for(size_t q=0;q<queueBuffer.size();q++){
        const int node=queueBuffer[q];
        if(weakOpen[node])weakRegionOpen[region]=1;
        for(int edge=weakHead[node];edge>=0;edge=weakNext[edge]){
          const int next=weakTo[edge];
          if(weakRegion[next]<0){weakRegion[next]=region;queueBuffer.push_back(next);}
        }
      }
    }
  }
  weakDirty=false;
}
bool targetSealed(int source,int target){
  if(weakDirty)rebuildWeakGraph();
  if(weakRegion[target]==weakRegion[source]){weakFailure=1;return false;}
  if(weakRegionOpen[weakRegion[target]]){weakFailure=2;return false;}
  weakFailure=0;return true;
}
// An enclosure is certified only if its weak component cannot reach any
// unloaded frontier. This is independent of the querying animal's position.
int enclosureAt(int target){
  if(target<0)return target==-1?-1:0;
  if(weakDirty)rebuildWeakGraph();
  return weakRegionOpen[weakRegion[target]]?-1:1;
}
int32_t nodeAt(int worldX,int worldZ){
  const int sx=floorDiv(worldX,sectorSize),sz=floorDiv(worldZ,sectorSize);
  const Sector* sector=get(sx,sz);if(!sector)return -1;
  const int x=worldX-sx*sectorSize,z=worldZ-sz*sectorSize;
  const int component=sector->component[cellIndex(x,z)];
  return component<0?-2:sector->id*sectorSize*sectorSize+component;
}
void appendPoint(const Sector& sector,int cell){
  routePoints.push_back(sector.sx*sectorSize+cell%sectorSize);
  routePoints.push_back(sector.sz*sectorSize+cell/sectorSize);
}
bool localPath(const Sector& sector,int from,int to){
  if(from==to)return true;
  if(from<0||to<0||sector.component[from]<0||sector.component[from]!=sector.component[to])return false;
  localParent.assign(sectorSize*sectorSize,-1);
  queueBuffer.clear();queueBuffer.push_back(from);localParent[from]=from;
  for(size_t q=0;q<queueBuffer.size();q++){
    const int at=queueBuffer[q];if(at==to)break;
    const int x=at%sectorSize,z=at/sectorSize;
    for(int d=0;d<4;d++){
      if(!(sector.steps[at]&(1<<d)))continue;
      const int nx=x+dx[d],nz=z+dz[d];
      if(nx<0||nz<0||nx>=sectorSize||nz>=sectorSize)continue;
      const int next=cellIndex(nx,nz);
      if(localParent[next]>=0||sector.component[next]!=sector.component[from])continue;
      localParent[next]=at;queueBuffer.push_back(next);
    }
  }
  if(localParent[to]<0)return false;
  queueBuffer.clear();for(int at=to;at!=from;at=localParent[at])queueBuffer.push_back(at);
  for(auto it=queueBuffer.rbegin();it!=queueBuffer.rend();++it)appendPoint(sector,*it);
  return true;
}
}

extern "C" {
int lazy_select_context(int profile){
  if(profile<0||profile>=navigationProfiles)return 0;
  selectedContext=profile;return 1;
}
int lazy_selected_context(){return selectedContext;}
uint32_t lazy_route_revision(){return active().routeRevision;}
int lazy_init(int size){
  if(size<2||size>32)return 0;
  sectorSize=size;updates=0;
  active().routeRevision++;
  if(!sectors)sectors=new std::unordered_map<uint64_t,Sector>();else sectors->clear();
  byId.clear();freeIds.clear();
  stagedPass.assign(size*size,0);stagedSteps.assign(size*size,0);
  stagedInbound.assign(size*size,0);weakDirty=true;
  portals.clear();
  queueBuffer.reserve(size*size);return 1;
}
uint8_t* lazy_pass_ptr(){return stagedPass.data();}
uint8_t* lazy_steps_ptr(){return stagedSteps.data();}
uint8_t* lazy_inbound_ptr(){return stagedInbound.data();}
int lazy_commit_sector(int sx,int sz){
  if(!sectorSize)return -1;
  auto [it,inserted]=sectors->try_emplace(key(sx,sz));
  Sector& sector=it->second;
  if(inserted){
    if(freeIds.empty()){sector.id=static_cast<int>(byId.size());byId.push_back(&sector);}
    else {sector.id=freeIds.back();freeIds.pop_back();byId[sector.id]=&sector;}
    sector.sx=sx;sector.sz=sz;
  }
  sector.pass=stagedPass;sector.steps=stagedSteps;sector.inbound=stagedInbound;
  flood(sector);updates++;
  active().routeRevision++;
  rebuildEdges(sector);
  for(int d=0;d<4;d++)if(Sector* neighbor=get(sx+dx[d],sz+dz[d]))rebuildEdges(*neighbor);
  for(const Portal& portal:portals){
    const int ax=floorDiv(portal.fromX,sectorSize),az=floorDiv(portal.fromZ,sectorSize);
    const int bx=floorDiv(portal.toX,sectorSize),bz=floorDiv(portal.toZ,sectorSize);
    if(ax==sx&&az==sz){if(Sector* other=get(bx,bz);other&&other!=&sector)rebuildEdges(*other);}
    if(bx==sx&&bz==sz){if(Sector* other=get(ax,az);other&&other!=&sector)rebuildEdges(*other);}
  }
  weakDirty=true;
  return sector.id;
}
int lazy_remove_sector(int sx,int sz){
  if(!sectorSize)return 0;
  const auto it=sectors->find(key(sx,sz));
  if(it==sectors->end())return 0;
  const int id=it->second.id;
  byId[id]=nullptr;freeIds.push_back(id);sectors->erase(it);
  for(int d=0;d<4;d++)if(Sector* neighbor=get(sx+dx[d],sz+dz[d]))rebuildEdges(*neighbor);
  for(const Portal& portal:portals){
    const int ax=floorDiv(portal.fromX,sectorSize),az=floorDiv(portal.fromZ,sectorSize);
    const int bx=floorDiv(portal.toX,sectorSize),bz=floorDiv(portal.toZ,sectorSize);
    if(ax==sx&&az==sz){if(Sector* other=get(bx,bz))rebuildEdges(*other);}
    if(bx==sx&&bz==sz){if(Sector* other=get(ax,az))rebuildEdges(*other);}
  }
  weakDirty=true;updates++;
  active().routeRevision++;
  return 1;
}
void lazy_clear_portals(){portals.clear();}
int lazy_add_portal(int fromX,int fromZ,int toX,int toZ){
  portals.push_back({fromX,fromZ,toX,toZ,float(fromX),float(fromZ),float(toX),float(toZ)});
  return static_cast<int>(portals.size())-1;
}
// World-space gate points are registered once when portals change. Route
// reconstruction can then remain entirely native, including the crossing.
int lazy_add_portal_world(int fromX,int fromZ,int toX,int toZ,
  float fromWorldX,float fromWorldZ,float toWorldX,float toWorldZ){
  portals.push_back({fromX,fromZ,toX,toZ,fromWorldX,fromWorldZ,toWorldX,toWorldZ});
  return static_cast<int>(portals.size())-1;
}
int lazy_portal_world_points(int encoded,float* out){
  if(encoded<0||!out)return 0;
  const int id=encoded/2;
  if(id>=static_cast<int>(portals.size()))return 0;
  const Portal& portal=portals[id];
  if(encoded&1){
    out[0]=portal.toWorldX;out[1]=portal.toWorldZ;
    out[2]=portal.fromWorldX;out[3]=portal.fromWorldZ;
  }else{
    out[0]=portal.fromWorldX;out[1]=portal.fromWorldZ;
    out[2]=portal.toWorldX;out[3]=portal.toWorldZ;
  }
  return 1;
}
int lazy_commit_portals(){
  for(Sector* sector:byId)if(sector)rebuildEdges(*sector);
  weakDirty=true;
  active().routeRevision++;
  return static_cast<int>(portals.size());
}
// Sector-local component identity. Callers must discard it after topology
// changes; -1 means unloaded and -2 means a non-walkable cell.
int lazy_component(int worldX,int worldZ){
  return sectorSize?nodeAt(worldX,worldZ):-1;
}
// 1 connected in the component graph (a local directed route may still fail),
// 0 certified disconnected, -1 unknown because required sectors are unloaded.
int lazy_connected(int fromX,int fromZ,int toX,int toZ){
  connectivityReason=0;
  if(!sectorSize){connectivityReason=1;return -1;}
  const int32_t source=nodeAt(fromX,fromZ),target=nodeAt(toX,toZ);
  if(source==-1||target==-1){connectivityReason=2;return -1;}
  if(source<0||target<0){connectivityReason=3;return 0;}
  if(source==target){connectivityReason=4;return 1;}
  const int maxNodes=static_cast<int>(byId.size())*sectorSize*sectorSize;
  const uint32_t generation=beginVisit(maxNodes);
  queueBuffer.clear();queueBuffer.push_back(source);visited[source]=generation;
  bool unknown=false;
  for(size_t q=0;q<queueBuffer.size();q++){
    const int32_t node=queueBuffer[q],sectorId=node/(sectorSize*sectorSize),local=node%(sectorSize*sectorSize);
    const Sector& sector=*byId[sectorId];
    if(sector.unknown[local])unknown=true;
    for(const Arc& arc:sector.edges[local]){
      const int32_t next=arc.to;
      if(next==target){connectivityReason=5;return 1;}
      if(visited[next]!=generation){visited[next]=generation;queueBuffer.push_back(next);}
    }
  }
  if(!unknown){connectivityReason=6;return 0;}
  if(targetSealed(source,target)){connectivityReason=7;return 0;}
  connectivityReason=weakFailure==1?10:8;return -1;
}
// Codes: 1 uninitialized, 2 endpoint sector missing, 3 blocked endpoint,
// 4 same component, 5 reachable, 6 disconnected with no open source frontier,
// 7 certified sealed target, 8 open frontier, 10 weakly connected source.
int lazy_connected_reason(){return connectivityReason;}
// 1 sealed weak component, -1 open/missing frontier, 0 blocked cell.
int lazy_enclosure(int worldX,int worldZ){
  return sectorSize?enclosureAt(nodeAt(worldX,worldZ)):-1;
}
// Shared weak-region identity for enclosure membership and wall-side probes.
// IDs are valid only until the next sector/topology revision.
int lazy_weak_region(int worldX,int worldZ){
  if(!sectorSize)return -1;
  const int node=nodeAt(worldX,worldZ);
  if(node<0)return node;
  if(weakDirty)rebuildWeakGraph();
  return weakRegion[node];
}
// The five animal profiles form a conservative union graph. An edge traversed
// by any species must be closed. Mixing profiles can overestimate a route, but
// cannot certify an opening as closed. Missing resident sectors stay unknown.
#undef sectors
#undef sectorSize
#undef portals
int32_t* lazy_cut_seeds_ptr(int count){
  if(count<1||count>256)return nullptr;
  cutSeeds.resize(size_t(count)*2);return cutSeeds.data();
}
bool cutFaceCoveredBySolid(int x,int z,int nx,int nz,float radius){
  const float safe=radius-.0001f;
  if(!(safe>0)||!std::isfinite(safe))return false;
  const float middleX=(x+nx)*.5f,middleZ=(z+nz)*.5f;
  const float ax=x!=nx?middleX:middleX-.5f;
  const float az=x!=nx?middleZ-.5f:middleZ;
  const float bx=x!=nx?middleX:middleX+.5f;
  const float bz=x!=nx?middleZ+.5f:middleZ;
  const auto clearance=[&](float px,float pz){
    return spatial_static_object_clearance(px,pz,radius+1);
  };
  const float first=clearance(ax,az),last=clearance(bx,bz);
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
  return covered(covered,ax,az,bx,bz,first,last,0);
}
bool cutFaceFullyFluid(int x,int z,int nx,int nz){
  const float faceX=(x+nx)*.5f,faceZ=(z+nz)*.5f;
  const float tangentX=float(z-nz),tangentZ=float(nx-x);
  const float normalX=float(nx-x),normalZ=float(nz-z);
  for(const float along:{-.5f,-.25f,0.f,.25f,.5f})
    for(const float across:{-.22f,0.f,.22f}){
      const float level=spatial_fluid_level(faceX+tangentX*along+
        normalX*across,faceZ+tangentZ*along+normalZ*across);
      if(!std::isfinite(level)||level==0)return false;
    }
  return true;
}
int runLocalCropCut(int minX,int minZ,int maxX,int maxZ,int seedCount,
    int padding,float conservativeRadius,int fluidPenalty){
  cutEdges.clear();cutBoundary.clear();active().cutFlow=active().cutCells=0;
  if(seedCount<1||size_t(seedCount)*2!=cutSeeds.size())return -2;
  constexpr int profiles[]={0,2,3,4,5};
  for(int profile:profiles)if(!contexts[profile]||
      !contexts[profile]->sectors||
      contexts[profile]->sectorSize!=active().sectorSize)return -1;
  const auto cellFor=[&](const Context& context,int x,int z)->const Sector*{
    const int sx=floorDiv(x,context.sectorSize),sz=floorDiv(z,context.sectorSize);
    const auto it=context.sectors->find(key(sx,sz));
    return it==context.sectors->end()?nullptr:&it->second;
  };
  const auto sample=[&](const Context& context,int x,int z)->int{
    const Sector* sector=cellFor(context,x,z);
    if(!sector)return -1;
    const int local=cellIndex(x-sector->sx*context.sectorSize,
      z-sector->sz*context.sectorSize);
    return sector->pass[local]?1:0;
  };
  const auto cell=[&](int x,int z){
    int any=0;
    for(int profile:profiles){
      const int result=sample(*contexts[profile],x,z);
      if(result<0)return -1;
      any|=result;
    }
    if(conservativeRadius>0)return 1;
    return any;
  };
  const auto step=[&](int x,int z,int nx,int nz){
    if(conservativeRadius>0){
      if(cutFaceCoveredBySolid(x,z,nx,nz,conservativeRadius))return 0;
      return fluidPenalty>1&&cutFaceFullyFluid(x,z,nx,nz)?fluidPenalty:1;
    }
    const int direction=nx>x?0:nx<x?1:nz>z?2:3;
    int any=0;
    for(int profile:profiles){
      const Context& context=*contexts[profile];
      const Sector* first=cellFor(context,x,z),*last=cellFor(context,nx,nz);
      if(!first||!last)return -1;
      const int a=cellIndex(x-first->sx*context.sectorSize,
        z-first->sz*context.sectorSize);
      const int b=cellIndex(nx-last->sx*context.sectorSize,
        nz-last->sz*context.sectorSize);
      if(first->pass[a]&&last->pass[b]&&
          ((first->steps[a]&(1<<direction))||
           (last->steps[b]&(1<<(direction^1)))))any=1;
    }
    return any;
  };
  // The cut prototype does not currently model arbitrary animal portals.
  for(int profile:profiles)if(!contexts[profile]->portals.empty())return -1;
  const auto result=enclosure_cut::find(minX,minZ,maxX,maxZ,cutSeeds,padding,
      cell,step);
  active().cutFlow=result.flow;active().cutCells=result.cells;
  for(const auto& edge:result.edges)cutEdges.insert(cutEdges.end(),
    {edge.outsideX,edge.outsideZ,edge.insideX,edge.insideZ});
  if(result.status>0)for(const auto& edge:result.boundary)
    cutBoundary.insert(cutBoundary.end(),
      {edge.outsideX,edge.outsideZ,edge.insideX,edge.insideZ});
  return result.status<0?result.status:int(result.edges.size());
}
int lazy_local_crop_cut(int minX,int minZ,int maxX,int maxZ,int seedCount,int padding){
  return runLocalCropCut(minX,minZ,maxX,maxZ,seedCount,padding,0,0);
}
int lazy_local_crop_cut_conservative(int minX,int minZ,int maxX,int maxZ,
    int seedCount,int padding){
  const float smallestRadius=spatial_min_animal_radius();
  if(!(smallestRadius>0)||!std::isfinite(smallestRadius))return -1;
  return runLocalCropCut(minX,minZ,maxX,maxZ,seedCount,padding,
    smallestRadius,0);
}
int lazy_local_crop_cut_weighted(int minX,int minZ,int maxX,int maxZ,
    int seedCount,int padding){
  const float smallestRadius=spatial_min_animal_radius();
  if(!(smallestRadius>0)||!std::isfinite(smallestRadius))return -1;
  return runLocalCropCut(minX,minZ,maxX,maxZ,seedCount,padding,
    smallestRadius,1000);
}
const int32_t* lazy_local_crop_cut_ptr(){return cutEdges.data();}
const int32_t* lazy_local_crop_cut_boundary_ptr(){return cutBoundary.data();}
int lazy_local_crop_cut_boundary_count(){return int(cutBoundary.size()/4);}
int lazy_local_crop_cut_flow(){return active().cutFlow;}
int lazy_local_crop_cut_cells(){return active().cutCells;}
#define sectors (active().sectors)
#define sectorSize (active().sectorSize)
#define portals (active().portals)
// -1: unloaded/uncertain; 0: known impossible; positive: coordinate pairs.
int lazy_route(int fromX,int fromZ,int toX,int toZ){
  routePoints.clear();
  connectivityReason=0;
  if(!sectorSize){connectivityReason=1;return -1;}
  const int32_t source=nodeAt(fromX,fromZ),target=nodeAt(toX,toZ);
  if(source==-1||target==-1){connectivityReason=2;return -1;}
  if(source<0||target<0){connectivityReason=3;return 0;}
  const int stride=sectorSize*sectorSize;
  const Sector& first=*byId[source/stride];
  const Sector& last=*byId[target/stride];
  const int firstCell=cellIndex(fromX-first.sx*sectorSize,fromZ-first.sz*sectorSize);
  const int lastCell=cellIndex(toX-last.sx*sectorSize,toZ-last.sz*sectorSize);
  if(source==target){
    const bool found=localPath(first,firstCell,lastCell);
    connectivityReason=found?4:9;
    return found?static_cast<int>(routePoints.size()/2):-1;
  }
  const int maxNodes=static_cast<int>(byId.size())*stride;
  const uint32_t generation=beginVisit(maxNodes);
  previousNode.resize(maxNodes);previousArc.resize(maxNodes);
  queueBuffer.clear();queueBuffer.push_back(source);visited[source]=generation;
  bool unknown=false;
  for(size_t q=0;q<queueBuffer.size()&&visited[target]!=generation;q++){
    const int32_t node=queueBuffer[q],sectorId=node/stride,local=node%stride;
    const Sector& sector=*byId[sectorId];
    if(sector.unknown[local])unknown=true;
    for(const Arc& arc:sector.edges[local]){
      if(visited[arc.to]==generation)continue;
      visited[arc.to]=generation;previousNode[arc.to]=node;previousArc[arc.to]=arc;
      queueBuffer.push_back(arc.to);
    }
  }
  if(visited[target]!=generation){
    if(!unknown){connectivityReason=6;return 0;}
    if(targetSealed(source,target)){connectivityReason=7;return 0;}
    connectivityReason=weakFailure==1?10:8;return -1;
  }
  arcChain.clear();for(int at=target;at!=source;at=previousNode[at])arcChain.push_back(previousArc[at]);
  int currentNode=source,currentCell=firstCell;
  for(auto it=arcChain.rbegin();it!=arcChain.rend();++it){
    const Sector& sector=*byId[currentNode/stride];
    if(!localPath(sector,currentCell,it->fromCell)){
      routePoints.clear();connectivityReason=9;return -1;
    }
    const Sector& next=*byId[it->to/stride];
    if(it->portal>=0){routePoints.push_back(INT32_MIN);routePoints.push_back(it->portal);}
    appendPoint(next,it->toCell);
    currentNode=it->to;currentCell=it->toCell;
  }
  if(!localPath(last,currentCell,lastCell)){
    routePoints.clear();connectivityReason=9;return -1;
  }
  connectivityReason=5;
  return static_cast<int>(routePoints.size()/2);
}
int32_t* lazy_route_ptr(){return routePoints.data();}
int lazy_loaded_sectors(){return sectors?static_cast<int>(sectors->size()):0;}
int lazy_sector_slots(){return static_cast<int>(byId.size());}
int lazy_sector_updates(){return updates;}
}
