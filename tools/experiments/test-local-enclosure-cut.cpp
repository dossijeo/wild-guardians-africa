#include "../../src/world/wild-engine/local-enclosure-cut.h"
#include <cassert>
#include <iostream>
#include <set>

int main(){
  constexpr int side=21;
  std::set<std::pair<int,int>> natural;
  for(int z=6;z<=14;z++)natural.insert({7,z});
  const auto cell=[&](int x,int z){return natural.count({x,z})?0:1;};
  const auto step=[&](int x,int z,int nx,int nz){
    return cell(x,z)&&cell(nx,nz)?1:0;
  };
  const std::vector<int32_t> crops={9,9,11,9,11,11};
  const auto first=enclosure_cut::find(0,0,side,side,crops,2,cell,step);
  const auto plain=enclosure_cut::find(0,0,side,side,crops,2,
    [](int,int){return 1;},[](int,int,int,int){return 1;});
  const auto repeat=enclosure_cut::find(0,0,side,side,crops,2,cell,step);
  assert(first.status==1&&first.flow>0&&!first.edges.empty());
  assert(plain.status==1&&first.edges.size()<plain.edges.size());
  const auto weighted=enclosure_cut::find(0,0,side,side,crops,2,
    [](int,int){return 1;},[](int x,int,int nx,int){return x==nx?1:3;});
  assert(weighted.status==1&&weighted.flow>=int(weighted.edges.size()));
  const auto forbidden=enclosure_cut::find(0,0,side,side,crops,2,
    [](int,int){return 1;},[](int,int,int,int){return 10000;},10000);
  assert(forbidden.status==-1&&forbidden.edges.empty());
  const auto detourEdge=plain.edges.front();
  const auto detour=enclosure_cut::find(0,0,side,side,crops,2,
    [](int,int){return 1;},[&](int x,int z,int nx,int nz){
      const bool same=(x==detourEdge.outsideX&&z==detourEdge.outsideZ&&
        nx==detourEdge.insideX&&nz==detourEdge.insideZ)||
        (nx==detourEdge.outsideX&&nz==detourEdge.outsideZ&&
        x==detourEdge.insideX&&z==detourEdge.insideZ);
      return same?10000:1;
    },10000);
  assert(detour.status==1&&detour.flow<10000);
  assert(std::none_of(detour.edges.begin(),detour.edges.end(),
    [&](const enclosure_cut::CutEdge& edge){
      return edge.outsideX==detourEdge.outsideX&&
        edge.outsideZ==detourEdge.outsideZ&&
        edge.insideX==detourEdge.insideX&&
        edge.insideZ==detourEdge.insideZ;
    }));
  assert(first.flow==int(first.edges.size()));
  assert(first.edges.size()==repeat.edges.size());
  assert(first.boundary.size()>first.edges.size());
  assert(first.boundary.size()==repeat.boundary.size());
  for(size_t i=0;i<first.edges.size();i++){
    const auto& a=first.edges[i],&b=repeat.edges[i];
    assert(a.outsideX==b.outsideX&&a.outsideZ==b.outsideZ&&
      a.insideX==b.insideX&&a.insideZ==b.insideZ);
    assert(cell(a.outsideX,a.outsideZ)&&cell(a.insideX,a.insideZ));
    assert(std::any_of(first.boundary.begin(),first.boundary.end(),
      [&](const enclosure_cut::CutEdge& edge){return edge.outsideX==a.outsideX&&
        edge.outsideZ==a.outsideZ&&edge.insideX==a.insideX&&
        edge.insideZ==a.insideZ;}));
  }
  const auto unknown=[&](int x,int z){return x==8&&z==8?-1:cell(x,z);};
  assert(enclosure_cut::find(0,0,side,side,crops,2,unknown,step).status==-1);
  const auto impossible=enclosure_cut::find(0,0,side,side,{0,0},2,cell,step);
  assert(impossible.status==-2);
  std::cout<<"cut_edges="<<first.edges.size()<<" flow="<<first.flow
    <<" cells="<<first.cells<<"\n";
}
