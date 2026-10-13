#include <cstdio>
#include <cstdint>

extern "C" {
int spatial_generate(uint32_t seed,int cx,int cz);
int spatial_build_nav(float radius,int worker);
int spatial_add_chunk(int cx,int cz);
int lazy_route(int fromX,int fromZ,int toX,int toZ);
}

int main(){
  const int props=spatial_generate(712,0,0);
  const int sectors=spatial_build_nav(.28f,1);
  const int neighborProps=spatial_add_chunk(1,0);
  const int route=lazy_route(10,0,35,0);
  std::printf("props=%d sectors=%d neighbor_props=%d route=%d\n",props,sectors,neighborProps,route);
  return props>0&&sectors==16&&neighborProps>0&&route>0?0:1;
}
