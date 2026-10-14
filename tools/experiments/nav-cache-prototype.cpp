#define WG_NAV_CACHE_PROTOTYPE 1
#include "../../src/world/hierarchical-wasm/lazy-sectors.cpp"
#include <unordered_map>

// Benchmark-only cache. It is deliberately not part of the game build.
// The native topology epoch invalidates it on sector and portal edits; the
// driver resets it between independently measured runs. This is not a
// production-grade replacement for all JavaScript navigation caches.
namespace {
struct Query { int ax,az,bx,bz;
  bool operator==(const Query& other) const {
    return ax==other.ax&&az==other.az&&bx==other.bx&&bz==other.bz;
  }
};
struct QueryHash { size_t operator()(const Query& q) const {
  uint64_t h=1469598103934665603ULL;
  for(int n:{q.ax,q.az,q.bx,q.bz}){h^=static_cast<uint32_t>(n);h*=1099511628211ULL;}
  return static_cast<size_t>(h);
}};
struct Value { int result,reason;std::vector<int32_t> route; };
struct Cache {int topologyEpoch=-1;std::unordered_map<Query,Value,QueryHash> connected,route;
  uint64_t hits=0,misses=0;};
Cache* caches[navigationProfiles]={};
Cache& cache(){Cache*& ptr=caches[selectedContext];if(!ptr)ptr=new Cache();
  const int revision=active().topologyEpoch;
  if(ptr->topologyEpoch!=revision){ptr->topologyEpoch=revision;ptr->connected.clear();ptr->route.clear();}
  return *ptr;
}
}
extern "C" {
void nav_cache_reset(){for(Cache*& ptr:caches)if(ptr){ptr->connected.clear();ptr->route.clear();ptr->topologyEpoch=-1;}}
void nav_cache_clear_metrics(){for(Cache*& ptr:caches)if(ptr){ptr->hits=0;ptr->misses=0;}}
int nav_cache_entries(){Cache& c=cache();return static_cast<int>(c.connected.size()+c.route.size());}
int nav_cache_hits(){return static_cast<int>(cache().hits);}
int nav_cache_misses(){return static_cast<int>(cache().misses);}
int nav_cache_total_entries(){int n=0;for(const Cache* c:caches)if(c)n+=c->connected.size()+c->route.size();return n;}
int nav_cache_total_hits(){int n=0;for(const Cache* c:caches)if(c)n+=c->hits;return n;}
int nav_cache_total_misses(){int n=0;for(const Cache* c:caches)if(c)n+=c->misses;return n;}
int nav_cached_connected(int ax,int az,int bx,int bz){
  Cache& c=cache();const Query key{ax,az,bx,bz};
  if(const auto it=c.connected.find(key);it!=c.connected.end()){
    c.hits++;connectivityReason=it->second.reason;return it->second.result;
  }
  c.misses++;const int result=lazy_connected(ax,az,bx,bz);
  if(c.connected.size()>=4096)c.connected.clear();
  c.connected.emplace(key,Value{result,connectivityReason,{}});return result;
}
int nav_cached_route(int ax,int az,int bx,int bz){
  Cache& c=cache();const Query key{ax,az,bx,bz};
  if(const auto it=c.route.find(key);it!=c.route.end()){
    c.hits++;connectivityReason=it->second.reason;routePoints=it->second.route;
    return it->second.result;
  }
  c.misses++;const int result=lazy_route(ax,az,bx,bz);
  if(c.route.size()>=1024)c.route.clear();
  c.route.emplace(key,Value{result,connectivityReason,routePoints});return result;
}
}
