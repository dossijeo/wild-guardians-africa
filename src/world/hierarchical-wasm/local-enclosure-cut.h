#pragma once

#include <algorithm>
#include <cstdint>
#include <functional>
#include <queue>
#include <utility>
#include <vector>

// Experimental, read-only local cut. Cell/edge callbacks must read the same
// navigation graph used by actors. An absent cell is unknown, never a wall.
namespace enclosure_cut {
struct CutEdge {int outsideX,outsideZ,insideX,insideZ;};
struct Result {int status=0,flow=0,cells=0;std::vector<CutEdge> edges,boundary;};
struct Edge {int to,reverse,capacity;};
inline Result find(int minX,int minZ,int maxX,int maxZ,
    const std::vector<int32_t>& seeds,int padding,
    const std::function<int(int,int)>& cell,
    const std::function<int(int,int,int,int)>& step){
  Result result;
  const int64_t width=int64_t(maxX)-minX,height=int64_t(maxZ)-minZ;
  if(width<3||height<3||width*height>4096||seeds.empty()||
      seeds.size()%2||seeds.size()>512||padding<0||padding>8){
    result.status=-2;return result;
  }
  const int w=int(width),h=int(height),count=w*h,source=count,sink=count+1;
  std::vector<int8_t> pass(count);
  auto index=[&](int x,int z){return (z-minZ)*w+x-minX;};
  for(int z=minZ;z<maxZ;z++)for(int x=minX;x<maxX;x++){
    const int value=cell(x,z);
    if(value<0){result.status=-1;return result;}
    pass[index(x,z)]=int8_t(value>0);
  }
  std::vector<std::vector<Edge>> graph(count+2);
  constexpr int inf=1000000000;
  // A forbidden cut face remains traversable to animals. It must therefore
  // stay in the graph, but a proposal that needs to block it is unresolved.
  constexpr int forbiddenCutCost=10000;
  const auto add=[&](int a,int b,int capacity){
    const int ai=int(graph[a].size()),bi=int(graph[b].size());
    graph[a].push_back({b,bi,capacity});graph[b].push_back({a,ai,0});
  };
  for(int z=minZ;z<maxZ;z++)for(int x=minX;x<maxX;x++){
    const int at=index(x,z);if(!pass[at])continue;
    result.cells++;
    if(x==minX||z==minZ||x==maxX-1||z==maxZ-1)add(at,sink,inf);
    for(const auto& [dx,dz]:{std::pair{1,0},std::pair{0,1}}){
      const int nx=x+dx,nz=z+dz;
      if(nx>=maxX||nz>=maxZ||!pass[index(nx,nz)])continue;
      const int traversable=step(x,z,nx,nz);
      if(traversable<0){result.status=-1;return result;}
      if(traversable>forbiddenCutCost){result.status=-2;return result;}
      if(traversable){add(at,index(nx,nz),traversable);
        add(index(nx,nz),at,traversable);}
    }
  }
  bool seeded=false;
  for(size_t i=0;i<seeds.size();i+=2){
    const int x=seeds[i],z=seeds[i+1];
    if(x<minX+1||x>=maxX-1||z<minZ+1||z>=maxZ-1){
      result.status=-2;return result;
    }
    for(int dz=-padding;dz<=padding;dz++)for(int dx=-padding;dx<=padding;dx++){
      if(dx*dx+dz*dz>padding*padding)continue;
      const int px=x+dx,pz=z+dz;
      if(px<=minX||px>=maxX-1||pz<=minZ||pz>=maxZ-1)continue;
      const int at=index(px,pz);
      if(pass[at]){add(source,at,inf);seeded=true;}
    }
  }
  if(!seeded){result.status=-2;return result;}
  std::vector<int> level(count+2),cursor(count+2);
  const auto levels=[&](){
    std::fill(level.begin(),level.end(),-1);std::queue<int> queue;
    level[source]=0;queue.push(source);
    while(!queue.empty()){
      const int at=queue.front();queue.pop();
      for(const Edge& edge:graph[at])if(edge.capacity&&level[edge.to]<0){
        level[edge.to]=level[at]+1;queue.push(edge.to);
      }
    }
    return level[sink]>=0;
  };
  std::function<int(int,int)> augment=[&](int at,int amount){
    if(at==sink)return amount;
    for(int& j=cursor[at];j<int(graph[at].size());j++){
      Edge& edge=graph[at][j];
      if(!edge.capacity||level[edge.to]!=level[at]+1)continue;
      const int pushed=augment(edge.to,std::min(amount,edge.capacity));
      if(!pushed)continue;
      edge.capacity-=pushed;graph[edge.to][edge.reverse].capacity+=pushed;
      return pushed;
    }
    return 0;
  };
  while(levels()){
    std::fill(cursor.begin(),cursor.end(),0);
    for(int pushed;(pushed=augment(source,inf))>0;)result.flow+=pushed;
    if(result.flow>=forbiddenCutCost){result.status=-1;return result;}
  }
  // The source side contains the crop. Every crossing is a proposed barrier.
  std::vector<uint8_t> reachable(count+2,0);std::queue<int> queue;
  reachable[source]=1;queue.push(source);
  while(!queue.empty()){
    const int at=queue.front();queue.pop();
    for(const Edge& edge:graph[at])if(edge.capacity&&!reachable[edge.to]){
      reachable[edge.to]=1;queue.push(edge.to);
    }
  }
  for(int z=minZ;z<maxZ;z++)for(int x=minX;x<maxX;x++){
    const int at=index(x,z);if(!pass[at])continue;
    for(const auto& [dx,dz]:{std::pair{1,0},std::pair{0,1}}){
      const int nx=x+dx,nz=z+dz;
      if(nx>=maxX||nz>=maxZ||!pass[index(nx,nz)])continue;
      const int next=index(nx,nz);
      if(reachable[at]==reachable[next]||step(x,z,nx,nz)<=0)continue;
      if(reachable[at])result.edges.push_back({nx,nz,x,z});
      else result.edges.push_back({x,z,nx,nz});
    }
    if(!reachable[at])continue;
    for(const auto& [dx,dz]:{std::pair{1,0},std::pair{-1,0},
        std::pair{0,1},std::pair{0,-1}}){
      const int nx=x+dx,nz=z+dz;
      if(nx<minX||nx>=maxX||nz<minZ||nz>=maxZ){
        result.status=-1;result.boundary.clear();return result;
      }
      if(!pass[index(nx,nz)]||!reachable[index(nx,nz)])
        result.boundary.push_back({nx,nz,x,z});
    }
  }
  result.status=1;return result;
}
}
