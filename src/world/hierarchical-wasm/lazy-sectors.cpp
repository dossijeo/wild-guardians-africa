#include <algorithm>
#include <cstdint>
#include <unordered_map>
#include <vector>

// Sparse sector/route proof. Unknown sectors are never classified as blocked.
// The movement engine remains responsible for physical motion.
namespace {
constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
int sectorSize=0,updates=0;
std::vector<uint8_t> stagedPass,stagedSteps;
struct Arc {int32_t to,fromCell,toCell,portal=-1;};
struct Portal {int fromX,fromZ,toX,toZ;};
struct Sector {
  int sx,sz,id,components=0;
  std::vector<uint8_t> pass,steps;
  std::vector<int16_t> component;
  std::vector<std::vector<Arc>> edges;
  std::vector<uint8_t> unknown;
};
std::unordered_map<uint64_t,Sector>* sectors=nullptr;
std::vector<Sector*> byId;
std::vector<int32_t> queueBuffer;
std::vector<uint8_t> visited;
std::vector<int32_t> previousNode,localParent,routePoints;
std::vector<Arc> previousArc,arcChain;
std::vector<Portal> portals;
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
int lazy_init(int size){
  if(size<2||size>32)return 0;
  sectorSize=size;updates=0;
  if(!sectors)sectors=new std::unordered_map<uint64_t,Sector>();else sectors->clear();
  byId.clear();
  stagedPass.assign(size*size,0);stagedSteps.assign(size*size,0);
  portals.clear();
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
  for(const Portal& portal:portals){
    const int ax=floorDiv(portal.fromX,sectorSize),az=floorDiv(portal.fromZ,sectorSize);
    const int bx=floorDiv(portal.toX,sectorSize),bz=floorDiv(portal.toZ,sectorSize);
    if(ax==sx&&az==sz){if(Sector* other=get(bx,bz);other&&other!=&sector)rebuildEdges(*other);}
    if(bx==sx&&bz==sz){if(Sector* other=get(ax,az);other&&other!=&sector)rebuildEdges(*other);}
  }
  return sector.id;
}
void lazy_clear_portals(){portals.clear();}
int lazy_add_portal(int fromX,int fromZ,int toX,int toZ){
  portals.push_back({fromX,fromZ,toX,toZ});return static_cast<int>(portals.size())-1;
}
int lazy_commit_portals(){
  for(Sector* sector:byId)rebuildEdges(*sector);
  return static_cast<int>(portals.size());
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
    for(const Arc& arc:sector.edges[local]){
      const int32_t next=arc.to;
      if(next==target)return 1;
      if(!visited[next]){visited[next]=1;queueBuffer.push_back(next);}
    }
  }
  return unknown?-1:0;
}
// -1: unloaded/uncertain; 0: known impossible; positive: coordinate pairs.
int lazy_route(int fromX,int fromZ,int toX,int toZ){
  routePoints.clear();
  if(!sectorSize)return -1;
  const int32_t source=nodeAt(fromX,fromZ),target=nodeAt(toX,toZ);
  if(source==-1||target==-1)return -1;
  if(source<0||target<0)return 0;
  const int stride=sectorSize*sectorSize;
  const Sector& first=*byId[source/stride];
  const Sector& last=*byId[target/stride];
  const int firstCell=cellIndex(fromX-first.sx*sectorSize,fromZ-first.sz*sectorSize);
  const int lastCell=cellIndex(toX-last.sx*sectorSize,toZ-last.sz*sectorSize);
  if(source==target)return localPath(first,firstCell,lastCell)?static_cast<int>(routePoints.size()/2):-1;
  const int maxNodes=static_cast<int>(byId.size())*stride;
  visited.assign(maxNodes,0);previousNode.assign(maxNodes,-1);previousArc.resize(maxNodes);
  queueBuffer.clear();queueBuffer.push_back(source);visited[source]=1;
  bool unknown=false;
  for(size_t q=0;q<queueBuffer.size()&&!visited[target];q++){
    const int32_t node=queueBuffer[q],sectorId=node/stride,local=node%stride;
    const Sector& sector=*byId[sectorId];
    if(sector.unknown[local])unknown=true;
    for(const Arc& arc:sector.edges[local]){
      if(visited[arc.to])continue;
      visited[arc.to]=1;previousNode[arc.to]=node;previousArc[arc.to]=arc;
      queueBuffer.push_back(arc.to);
    }
  }
  if(!visited[target])return unknown?-1:0;
  arcChain.clear();for(int at=target;at!=source;at=previousNode[at])arcChain.push_back(previousArc[at]);
  int currentNode=source,currentCell=firstCell;
  for(auto it=arcChain.rbegin();it!=arcChain.rend();++it){
    const Sector& sector=*byId[currentNode/stride];
    if(!localPath(sector,currentCell,it->fromCell)){routePoints.clear();return -1;}
    const Sector& next=*byId[it->to/stride];
    if(it->portal>=0){routePoints.push_back(INT32_MIN);routePoints.push_back(it->portal);}
    appendPoint(next,it->toCell);
    currentNode=it->to;currentCell=it->toCell;
  }
  if(!localPath(last,currentCell,lastCell)){routePoints.clear();return -1;}
  return static_cast<int>(routePoints.size()/2);
}
int32_t* lazy_route_ptr(){return routePoints.data();}
int lazy_loaded_sectors(){return static_cast<int>(byId.size());}
int lazy_sector_updates(){return updates;}
}
