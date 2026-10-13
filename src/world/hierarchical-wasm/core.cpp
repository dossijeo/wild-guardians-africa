#include <algorithm>
#include <cstdint>
#include <cmath>
#include <limits>
#include <numeric>
#include <queue>
#include <tuple>
#include <vector>

// Independent, bounded-grid proof of the hierarchical navigation core.
// JavaScript supplies a batched physical raster; no JavaScript callback occurs
// while flood filling, constructing the graph, or finding a route.
namespace {
int ox=0,oz=0,width=0,height=0,sectorSize=12,sectorsX=0,sectorsZ=0;
std::vector<uint8_t> passable,steps,diagonals,closed,flatClosed;
std::vector<int32_t> component,head,regionRoot,parent,previousArc,queueBuffer,routeBuffer,portalBuffer,flatParent,flatParentPortal,portalHead,portalNext;
struct Arc {int32_t to,fromCell,toCell,next,portal;};
struct Portal {int32_t fromCell,toCell;};
std::vector<Arc> arcs;
std::vector<Portal> portals;
std::vector<double> costs,flatCosts;
using Item=std::tuple<double,uint32_t,int32_t>;
std::vector<Item> heapBuffer;
int32_t visitedGraph=0,visitedLocal=0,visitedFlat=0,sectorsBuilt=0;
constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1},opposite[4]={1,0,3,2};
constexpr int diagX[4]={1,-1,1,-1},diagZ[4]={1,1,-1,-1};
int index(int x,int z){return z*width+x;}
bool inBounds(int x,int z){return x>=0&&z>=0&&x<width&&z<height;}
void pushOpen(double score,uint32_t order,int32_t cell){
  heapBuffer.emplace_back(score,order,cell);
  std::push_heap(heapBuffer.begin(),heapBuffer.end(),std::greater<Item>{});
}
int popOpen(){
  std::pop_heap(heapBuffer.begin(),heapBuffer.end(),std::greater<Item>{});
  const int cell=std::get<2>(heapBuffer.back());heapBuffer.pop_back();return cell;
}
int sector(int x,int z){return (z/sectorSize)*sectorsX+x/sectorSize;}
int node(int cell){return component[cell];}
int findRegion(int id){
  int root=id;
  while(regionRoot[root]!=root)root=regionRoot[root];
  while(regionRoot[id]!=id){const int next=regionRoot[id];regionRoot[id]=root;id=next;}
  return root;
}
void rebuildSector(int sx,int sz){
  const int x0=sx*sectorSize,z0=sz*sectorSize,x1=std::min(width,x0+sectorSize),z1=std::min(height,z0+sectorSize);
  for(int z=z0;z<z1;z++)for(int x=x0;x<x1;x++)component[index(x,z)]=-1;
  int local=0;
  for(int z=z0;z<z1;z++)for(int x=x0;x<x1;x++){
    const int seed=index(x,z);if(!passable[seed]||component[seed]>=0)continue;
    const int id=(sz*sectorsX+sx)*sectorSize*sectorSize+local++;
    queueBuffer.clear();queueBuffer.push_back(seed);component[seed]=id;
    for(size_t q=0;q<queueBuffer.size();q++){
      const int current=queueBuffer[q],cx=current%width,cz=current/width;
      for(int d=0;d<4;d++){
        const int nx=cx+dx[d],nz=cz+dz[d];if(nx<x0||nx>=x1||nz<z0||nz>=z1)continue;
        const int next=index(nx,nz);
        if(component[next]>=0||!passable[next])continue;
        if(!(steps[current]&(1<<d))&&!(steps[next]&(1<<opposite[d])))continue;
        component[next]=id;queueBuffer.push_back(next);
      }
    }
  }
  sectorsBuilt++;
}
void addArc(int from,int to,int fromCell,int toCell,int portal=-1){
  if(from<0||to<0||from==to)return;
  arcs.push_back({to,fromCell,toCell,head[from],portal});head[from]=static_cast<int>(arcs.size())-1;
  regionRoot[findRegion(to)]=findRegion(from);
}
void rebuildGraph(){
  std::fill(head.begin(),head.end(),-1);arcs.clear();
  std::iota(regionRoot.begin(),regionRoot.end(),0);
  std::fill(portalHead.begin(),portalHead.end(),-1);portalNext.assign(portals.size()*2,-1);
  for(int z=0;z<height;z++)for(int x=0;x<width;x++){
    const int cell=index(x,z),from=node(cell);if(from<0)continue;
    for(int d=0;d<4;d++){
      const int nx=x+dx[d],nz=z+dz[d];if(!inBounds(nx,nz)||sector(x,z)==sector(nx,nz)||!(steps[cell]&(1<<d)))continue;
      const int next=index(nx,nz);if(passable[next])addArc(from,node(next),cell,next);
    }
  }
  for(size_t i=0;i<portals.size();i++){
    const Portal& portal=portals[i];
    if(component[portal.fromCell]<0||component[portal.toCell]<0)continue;
    addArc(node(portal.fromCell),node(portal.toCell),portal.fromCell,portal.toCell,static_cast<int>(i)*2);
    addArc(node(portal.toCell),node(portal.fromCell),portal.toCell,portal.fromCell,static_cast<int>(i)*2+1);
    portalNext[i*2]=portalHead[portal.fromCell];portalHead[portal.fromCell]=static_cast<int>(i)*2;
    portalNext[i*2+1]=portalHead[portal.toCell];portalHead[portal.toCell]=static_cast<int>(i)*2+1;
  }
}
bool localRoute(int from,int to){
  if(from==to)return true;
  if(from<0||to<0||component[from]<0||component[from]!=component[to])return false;
  std::fill(parent.begin(),parent.end(),-1);queueBuffer.clear();queueBuffer.push_back(from);parent[from]=from;
  for(size_t q=0;q<queueBuffer.size();q++){
    const int current=queueBuffer[q];visitedLocal++;
    if(current==to)break;
    const int x=current%width,z=current/width;
    for(int d=0;d<4;d++){
      if(!(steps[current]&(1<<d)))continue;
      const int nx=x+dx[d],nz=z+dz[d];if(!inBounds(nx,nz))continue;
      const int next=index(nx,nz);
      if(component[next]!=component[from]||parent[next]>=0)continue;
      parent[next]=current;queueBuffer.push_back(next);
    }
  }
  if(parent[to]<0)return false;
  queueBuffer.clear();for(int at=to;at!=from;at=parent[at])queueBuffer.push_back(at);
  for(auto it=queueBuffer.rbegin();it!=queueBuffer.rend();++it)routeBuffer.push_back(*it);
  return true;
}
}

extern "C" {
int nav_init(int worldX,int worldZ,int w,int h,int size){
  if(w<1||h<1||size<2||size>32||static_cast<int64_t>(w)*h>1048576)return 0;
  ox=worldX;oz=worldZ;width=w;height=h;sectorSize=size;
  sectorsX=(w+size-1)/size;sectorsZ=(h+size-1)/size;
  const size_t cells=static_cast<size_t>(w)*h,nodes=static_cast<size_t>(sectorsX)*sectorsZ*size*size;
  passable.assign(cells,0);steps.assign(cells,0);diagonals.assign(cells,0);component.assign(cells,-1);
  head.assign(nodes,-1);regionRoot.resize(nodes);parent.assign(cells,-1);costs.resize(nodes);closed.resize(nodes);previousArc.resize(nodes);
  flatParent.resize(cells);flatParentPortal.resize(cells);flatCosts.resize(cells);flatClosed.resize(cells);portalHead.resize(cells);
  queueBuffer.reserve(cells);routeBuffer.reserve(cells);portalBuffer.reserve(nodes);heapBuffer.reserve(cells);arcs.reserve(cells/3);
  portals.clear();sectorsBuilt=visitedGraph=visitedLocal=0;return 1;
}
uint8_t* nav_pass_ptr(){return passable.data();}
uint8_t* nav_steps_ptr(){return steps.data();}
uint8_t* nav_diag_ptr(){return diagonals.data();}
int nav_commit(){
  if(!width)return 0;
  for(int sz=0;sz<sectorsZ;sz++)for(int sx=0;sx<sectorsX;sx++)rebuildSector(sx,sz);
  rebuildGraph();return static_cast<int>(arcs.size());
}
int nav_refresh(int x,int z,int w,int h){
  if(!width||w<1||h<1)return 0;
  const int x0=std::clamp(x-ox,0,width-1),z0=std::clamp(z-oz,0,height-1);
  const int x1=std::clamp(x+w-1-ox,0,width-1),z1=std::clamp(z+h-1-oz,0,height-1);
  for(int sz=z0/sectorSize;sz<=z1/sectorSize;sz++)for(int sx=x0/sectorSize;sx<=x1/sectorSize;sx++)rebuildSector(sx,sz);
  rebuildGraph();return static_cast<int>(arcs.size());
}
void nav_clear_portals(){portals.clear();}
int nav_add_portal(int fromX,int fromZ,int toX,int toZ){
  const int ax=fromX-ox,az=fromZ-oz,bx=toX-ox,bz=toZ-oz;
  if(!inBounds(ax,az)||!inBounds(bx,bz))return -1;
  const int a=index(ax,az),b=index(bx,bz);
  if(!passable[a]||!passable[b])return -1;
  portals.push_back({a,b});return static_cast<int>(portals.size())-1;
}
int nav_commit_portals(){rebuildGraph();return static_cast<int>(arcs.size());}
int nav_component(int worldX,int worldZ){
  const int x=worldX-ox,z=worldZ-oz;
  if(!inBounds(x,z))return -1;
  const int id=component[index(x,z)];return id<0?-1:findRegion(id);
}
int nav_route(int startX,int startZ,int endX,int endZ){
  routeBuffer.clear();visitedGraph=visitedLocal=0;
  const int sx=startX-ox,sz=startZ-oz,tx=endX-ox,tz=endZ-oz;
  if(!inBounds(sx,sz)||!inBounds(tx,tz))return 0;
  const int source=index(sx,sz),target=index(tx,tz),sourceNode=node(source),targetNode=node(target);
  if(sourceNode<0||targetNode<0)return 0;
  if(sourceNode==targetNode)return localRoute(source,target)?static_cast<int>(routeBuffer.size()):0;
  const double infinity=std::numeric_limits<double>::infinity();
  std::fill(costs.begin(),costs.end(),infinity);std::fill(closed.begin(),closed.end(),0);
  std::fill(previousArc.begin(),previousArc.end(),-1);
  heapBuffer.clear();uint32_t order=0;costs[sourceNode]=0;pushOpen(0,order++,sourceNode);
  while(!heapBuffer.empty()&&visitedGraph<16384){
    const int current=popOpen();if(closed[current])continue;
    closed[current]=1;visitedGraph++;if(current==targetNode)break;
    for(int arcIndex=head[current];arcIndex>=0;arcIndex=arcs[arcIndex].next){
      const Arc& arc=arcs[arcIndex];if(closed[arc.to])continue;
      const double nextCost=costs[current]+1;
      if(nextCost>=costs[arc.to])continue;
      costs[arc.to]=nextCost;previousArc[arc.to]=arcIndex;
      const int s1=arc.to/(sectorSize*sectorSize),s2=targetNode/(sectorSize*sectorSize);
      const double heuristic=std::abs(s1%sectorsX-s2%sectorsX)+std::abs(s1/sectorsX-s2/sectorsX);
      pushOpen(nextCost+heuristic,order++,arc.to);
    }
  }
  if(previousArc[targetNode]<0)return 0;
  portalBuffer.clear();
  for(int at=targetNode;at!=sourceNode;){const int arc=previousArc[at];if(arc<0)return 0;portalBuffer.push_back(arc);at=component[arcs[arc].fromCell];}
  int at=source;
  for(auto it=portalBuffer.rbegin();it!=portalBuffer.rend();++it){
    const Arc& arc=arcs[*it];
    if(!localRoute(at,arc.fromCell)){routeBuffer.clear();return 0;}
    if(arc.portal>=0){
      routeBuffer.push_back(-1-arc.portal*2);
      routeBuffer.push_back(-2-arc.portal*2);
    }
    routeBuffer.push_back(arc.toCell);at=arc.toCell;
  }
  if(!localRoute(at,target)){routeBuffer.clear();return 0;}
  return static_cast<int>(routeBuffer.size());
}
// Flat eight-neighbor A*: the old navigator's core search topology, evaluated
// over the exact same physical raster and WASM boundary as the hierarchy.
int nav_route_flat(int startX,int startZ,int endX,int endZ){
  routeBuffer.clear();visitedFlat=0;
  const int sx=startX-ox,sz=startZ-oz,tx=endX-ox,tz=endZ-oz;
  if(!inBounds(sx,sz)||!inBounds(tx,tz))return 0;
  const int source=index(sx,sz),target=index(tx,tz);
  if(!passable[source]||!passable[target]||source==target)return 0;
  const double infinity=std::numeric_limits<double>::infinity();
  std::fill(flatCosts.begin(),flatCosts.end(),infinity);
  std::fill(flatParent.begin(),flatParent.end(),-1);
  std::fill(flatParentPortal.begin(),flatParentPortal.end(),-1);
  std::fill(flatClosed.begin(),flatClosed.end(),0);
  heapBuffer.clear();uint32_t order=0;flatCosts[source]=0;pushOpen(std::hypot(tx-sx,tz-sz),order++,source);
  while(!heapBuffer.empty()&&visitedFlat<12000){
    const int current=popOpen();if(flatClosed[current])continue;
    flatClosed[current]=1;visitedFlat++;if(current==target)break;
    const int x=current%width,z=current/width;
    for(int d=0;d<8;d++){
      const bool diagonal=d>=4;
      if(!(diagonal?diagonals[current]&(1<<(d-4)):steps[current]&(1<<d)))continue;
      const int nx=x+(diagonal?diagX[d-4]:dx[d]),nz=z+(diagonal?diagZ[d-4]:dz[d]);
      if(!inBounds(nx,nz))continue;
      const int next=index(nx,nz);if(flatClosed[next]||!passable[next])continue;
      const double cost=flatCosts[current]+(diagonal?1.4142135623730951:1);
      if(cost>=flatCosts[next])continue;
      flatCosts[next]=cost;flatParent[next]=current;
      pushOpen(cost+std::hypot(tx-nx,tz-nz),order++,next);
    }
    for(int code=portalHead[current];code>=0;code=portalNext[code]){
      const Portal& portal=portals[code/2];
      const int next=(code&1)?portal.fromCell:portal.toCell;
      if(flatClosed[next]||!passable[next])continue;
      const double cost=flatCosts[current]+1;
      if(cost>=flatCosts[next])continue;
      flatCosts[next]=cost;flatParent[next]=current;flatParentPortal[next]=code;
      pushOpen(cost+std::hypot(tx-next%width,tz-next/width),order++,next);
    }
  }
  if(flatParent[target]<0)return 0;
  for(int at=target;at!=source;at=flatParent[at]){
    routeBuffer.push_back(at);
    if(flatParentPortal[at]>=0){
      routeBuffer.push_back(-2-flatParentPortal[at]*2);
      routeBuffer.push_back(-1-flatParentPortal[at]*2);
    }
  }
  std::reverse(routeBuffer.begin(),routeBuffer.end());
  return static_cast<int>(routeBuffer.size());
}
int32_t* nav_route_ptr(){return routeBuffer.data();}
int nav_sectors_built(){return sectorsBuilt;}
int nav_graph_nodes(){return visitedGraph;}
int nav_local_nodes(){return visitedLocal;}
int nav_flat_nodes(){return visitedFlat;}
int nav_arc_count(){return static_cast<int>(arcs.size());}
int nav_cell_count(){return width*height;}
}
