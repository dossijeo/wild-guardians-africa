#include <algorithm>
#include <cstdint>
#include <unordered_map>
#include <vector>

// Sparse sector/connectivity proof. Unknown sectors are never classified as
// blocked. The movement engine remains responsible for physical motion.
namespace {
constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
int sectorSize=0,updates=0;
std::vector<uint8_t> stagedPass,stagedSteps;
struct Sector {
  int sx,sz,id,components=0;
  std::vector<uint8_t> pass,steps;
  std::vector<int16_t> component;
  std::vector<std::vector<int32_t>> edges;
  std::vector<uint8_t> unknown;
};
std::unordered_map<uint64_t,Sector>* sectors=nullptr;
std::vector<Sector*> byId;
std::vector<int32_t> queueBuffer;
std::vector<uint8_t> visited;
uint64_t key(int sx,int sz){return (static_cast<uint64_t>(static_cast<uint32_t>(sx))<<32)|static_cast<uint32_t>(sz);}
Sector* get(int sx,int sz){const auto it=sectors->find(key(sx,sz));return it==sectors->end()?nullptr:&it->second;}
int floorDiv(int n,int d){return n>=0?n/d:-((-n+d-1)/d);}
int cellIndex(int x,int z){return z*sectorSize+x;}
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
  for(int z=0;z<sectorSize;z++)for(int x=0;x<sectorSize;x++){
    const int at=cellIndex(x,z),component=sector.component[at];
    if(component<0)continue;
    for(int d=0;d<4;d++){
      const int nx=x+dx[d],nz=z+dz[d];
      if(nx>=0&&nz>=0&&nx<sectorSize&&nz<sectorSize)continue;
      if(!(sector.steps[at]&(1<<d)))continue;
      const int neighborX=sector.sx+(nx<0?-1:nx>=sectorSize?1:0);
      const int neighborZ=sector.sz+(nz<0?-1:nz>=sectorSize?1:0);
      const Sector* neighbor=get(neighborX,neighborZ);
      if(!neighbor){sector.unknown[component]=1;continue;}
      const int lx=(nx+sectorSize)%sectorSize,lz=(nz+sectorSize)%sectorSize;
      const int target=neighbor->component[cellIndex(lx,lz)];
      if(target<0)continue;
      const int32_t node=neighbor->id*sectorSize*sectorSize+target;
      auto& edges=sector.edges[component];
      if(std::find(edges.begin(),edges.end(),node)==edges.end())edges.push_back(node);
    }
  }
}
int32_t nodeAt(int worldX,int worldZ){
  const int sx=floorDiv(worldX,sectorSize),sz=floorDiv(worldZ,sectorSize);
  const Sector* sector=get(sx,sz);if(!sector)return -1;
  const int x=worldX-sx*sectorSize,z=worldZ-sz*sectorSize;
  const int component=sector->component[cellIndex(x,z)];
  return component<0?-2:sector->id*sectorSize*sectorSize+component;
}
}

extern "C" {
int lazy_init(int size){
  if(size<2||size>32)return 0;
  sectorSize=size;updates=0;
  if(!sectors)sectors=new std::unordered_map<uint64_t,Sector>();else sectors->clear();
  byId.clear();
  stagedPass.assign(size*size,0);stagedSteps.assign(size*size,0);
  queueBuffer.reserve(size*size);return 1;
}
uint8_t* lazy_pass_ptr(){return stagedPass.data();}
uint8_t* lazy_steps_ptr(){return stagedSteps.data();}
int lazy_commit_sector(int sx,int sz){
  if(!sectorSize)return -1;
  auto [it,inserted]=sectors->try_emplace(key(sx,sz));
  Sector& sector=it->second;
  if(inserted){sector.id=static_cast<int>(byId.size());byId.push_back(&sector);sector.sx=sx;sector.sz=sz;}
  sector.pass=stagedPass;sector.steps=stagedSteps;
  flood(sector);updates++;
  rebuildEdges(sector);
  for(int d=0;d<4;d++)if(Sector* neighbor=get(sx+dx[d],sz+dz[d]))rebuildEdges(*neighbor);
  return sector.id;
}
// 1 reachable, 0 certified disconnected in known sectors, -1 unknown.
int lazy_connected(int fromX,int fromZ,int toX,int toZ){
  if(!sectorSize)return -1;
  const int32_t source=nodeAt(fromX,fromZ),target=nodeAt(toX,toZ);
  if(source==-1||target==-1)return -1;
  if(source<0||target<0)return 0;
  if(source==target)return 1;
  const int maxNodes=static_cast<int>(byId.size())*sectorSize*sectorSize;
  visited.assign(maxNodes,0);queueBuffer.clear();queueBuffer.push_back(source);visited[source]=1;
  bool unknown=false;
  for(size_t q=0;q<queueBuffer.size();q++){
    const int32_t node=queueBuffer[q],sectorId=node/(sectorSize*sectorSize),local=node%(sectorSize*sectorSize);
    const Sector& sector=*byId[sectorId];
    if(sector.unknown[local])unknown=true;
    for(const int32_t next:sector.edges[local]){
      if(next==target)return 1;
      if(!visited[next]){visited[next]=1;queueBuffer.push_back(next);}
    }
  }
  return unknown?-1:0;
}
int lazy_loaded_sectors(){return static_cast<int>(byId.size());}
int lazy_sector_updates(){return updates;}
}
