#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

// Isolated spatial-authority experiment. The same deterministic functions
// produce render heights, visible props and navigation occupancy. It is not
// connected to production world generation or save files.
extern "C" {
int lazy_init(int size);
uint8_t* lazy_pass_ptr();
uint8_t* lazy_steps_ptr();
uint8_t* lazy_inbound_ptr();
int lazy_commit_sector(int sx,int sz);
int lazy_route(int fromX,int fromZ,int toX,int toZ);
int32_t* lazy_route_ptr();
int lazy_loaded_sectors();
int lazy_sector_updates();
}

namespace {
constexpr int side=48,grid=49,sector=12;
constexpr int pad=4,latticeSpan=grid+pad*2;
constexpr double pi=3.14159265358979323846;
struct Prop {float x,z,y,radius,scale,yaw;int32_t slot;};
struct Wall {int id;float x,z,halfX,halfZ;bool active;};
uint32_t worldSeed=0;
int chunkX=0,chunkZ=0,nextWallId=1;
float radiusNow=.3f;
bool workerNow=true,navReady=false;
std::vector<float> heights,colors;
std::vector<double> lattice;
std::vector<Prop> props;
std::vector<Wall> walls;
std::vector<uint8_t> staticPass,staticSteps;
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
double riverX(double z){return -20+std::sin(z*.035+unit(cellHash(9,7,63))*2*pi)*17;}
double height(double x,double z){
  const double broad=.58*noise(x*.012,z*.012,91)+.28*noise(x*.0243,z*.0243,9194)+.14*noise(x*.0496,z*.0496,29741);
  const double detail=noise(x*.050,z*.050,883);
  const double dry=2.4+broad*12+detail*2.2;
  const double d=std::abs(x-riverX(z));
  const double channel=3.6-.63+blend((d-1.8)/4.2)*.68;
  return channel+(dry-channel)*blend((d-17)/75);
}
double latticeHeight(int x,int z){
  const int ix=x-(chunkX*side-24)+pad,iz=z-(chunkZ*side-24)+pad;
  return ix>=0&&iz>=0&&ix<latticeSpan&&iz<latticeSpan&&!lattice.empty()?lattice[iz*latticeSpan+ix]:height(x,z);
}
double surface(double x,double z){
  const int ix=int(std::floor(x)),iz=int(std::floor(z));
  const double fx=x-ix,fz=z-iz;
  if(fx+fz<=1){const double a=latticeHeight(ix,iz);return a+(latticeHeight(ix+1,iz)-a)*fx+(latticeHeight(ix,iz+1)-a)*fz;}
  const double c=latticeHeight(ix+1,iz+1);
  return c+(latticeHeight(ix,iz+1)-c)*(1-fx)+(latticeHeight(ix+1,iz)-c)*(1-fz);
}
bool fluid(double x,double z){return std::abs(x-riverX(z))<6.1&&surface(x,z)<3.58;}
bool terrainValid(double x,double z,float radius,bool worker){
  (void)worker;
  for(int i=0;i<5;i++){
    const double px=x+(i==1?radius:i==2?-radius:0),pz=z+(i==3?radius:i==4?-radius:0);
    if(fluid(px,pz))return false;
    if(std::hypot(surface(px+.8,pz)-surface(px-.8,pz),surface(px,pz+.8)-surface(px,pz-.8))/1.6>.5)return false;
  }
  return true;
}
bool terrainPropWalkable(int x,int z){
  if(!terrainValid(x,z,radiusNow,workerNow))return false;
  for(const Prop& p:props)if((p.slot<=3||(p.slot>=10&&p.slot<=12)||p.slot>=18)&&std::hypot(p.x-x,p.z-z)<p.radius+radiusNow)return false;
  return true;
}
bool insideChunk(int x,int z){return x>=chunkX*side-24&&x<chunkX*side+24&&z>=chunkZ*side-24&&z<chunkZ*side+24;}
int chunkIndex(int x,int z){return (z-(chunkZ*side-24))*side+x-(chunkX*side-24);}
bool wallClear(double x,double z){
  for(const Wall& w:walls)if(w.active&&std::abs(x-w.x)<w.halfX+radiusNow&&std::abs(z-w.z)<w.halfZ+radiusNow)return false;
  return true;
}
bool walkable(int x,int z){
  const bool base=insideChunk(x,z)&&!staticPass.empty()?staticPass[chunkIndex(x,z)]:terrainPropWalkable(x,z);
  return base&&wallClear(x,z);
}
bool terrainPropEdge(int x,int z,int nx,int nz){
  if(!terrainPropWalkable(x,z)||!terrainPropWalkable(nx,nz))return false;
  for(int i=1;i<4;i++){
    const double t=i/4.0,px=x+(nx-x)*t,pz=z+(nz-z)*t;
    if(!terrainValid(px,pz,radiusNow,workerNow))return false;
    for(const Prop& p:props)if((p.slot<=3||(p.slot>=10&&p.slot<=12)||p.slot>=18)&&std::hypot(p.x-px,p.z-pz)<p.radius+radiusNow)return false;
  }
  return true;
}
bool edge(int x,int z,int nx,int nz){
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  int direction=-1;
  for(int d=0;d<4;d++)if(nx==x+dx[d]&&nz==z+dz[d]){direction=d;break;}
  if(direction<0||!walkable(x,z)||!walkable(nx,nz))return false;
  const bool base=insideChunk(x,z)&&!staticSteps.empty()?
    !!(staticSteps[chunkIndex(x,z)]&(1<<direction)):terrainPropEdge(x,z,nx,nz);
  if(!base)return false;
  for(int i=1;i<4;i++){
    const double t=i/4.0;
    if(!wallClear(x+(nx-x)*t,z+(nz-z)*t))return false;
  }
  return true;
}
void refreshSector(int sx,int sz){
  uint8_t* pass=lazy_pass_ptr(),*steps=lazy_steps_ptr(),*inbound=lazy_inbound_ptr();
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int lz=0;lz<sector;lz++)for(int lx=0;lx<sector;lx++){
    const int i=lz*sector+lx,x=sx*sector+lx,z=sz*sector+lz;
    pass[i]=walkable(x,z);steps[i]=inbound[i]=0;
    if(!pass[i])continue;
    for(int d=0;d<4;d++){
      const int nx=x+dx[d],nz=z+dz[d];
      if(!insideChunk(nx,nz))continue;
      if(edge(x,z,nx,nz))steps[i]|=1<<d;
      if(edge(nx,nz,x,z))inbound[i]|=1<<d;
    }
  }
  lazy_commit_sector(sx,sz);
}
void refreshRect(int minX,int minZ,int maxX,int maxZ){
  if(!navReady)return;
  const int firstX=chunkX*side-24,firstZ=chunkZ*side-24;
  const int a=std::max(0,(minX-firstX)/sector),b=std::min(3,(maxX-firstX)/sector);
  const int c=std::max(0,(minZ-firstZ)/sector),d=std::min(3,(maxZ-firstZ)/sector);
  for(int sz=c;sz<=d;sz++)for(int sx=a;sx<=b;sx++)refreshSector((firstX/sector)+sx,(firstZ/sector)+sz);
}
}

extern "C" {
int spatial_generate(uint32_t seed,int cx,int cz){
  worldSeed=seed;chunkX=cx;chunkZ=cz;navReady=false;walls.clear();props.clear();staticPass.clear();staticSteps.clear();nextWallId=1;
  // The standalone no-entry WASM binary has no startup constructor pass.
  heights.assign(grid*grid,0);colors.assign(grid*grid*3,0);
  const int x0=cx*side-24,z0=cz*side-24;
  lattice.resize(latticeSpan*latticeSpan);
  for(int z=0;z<latticeSpan;z++)for(int x=0;x<latticeSpan;x++)
    lattice[z*latticeSpan+x]=height(x0+x-pad,z0+z-pad);
  for(int z=0;z<grid;z++)for(int x=0;x<grid;x++){
    const int i=z*grid+x,wx=x0+x,wz=z0+z;
    heights[i]=float(latticeHeight(wx,wz));
    const double grain=noise(wx*.041,wz*.041,8913),wet=std::max(0.0,1-std::abs(wx-riverX(wz))/25);
    colors[i*3]=float(.65-.16*grain-.06*wet);
    colors[i*3+1]=float(.46+.19*grain+.09*wet);
    colors[i*3+2]=float(.29+.09*grain+.09*wet);
  }
  constexpr double spacing[6]={13.5,7,2.8,9,10,32};
  constexpr double density[6]={.53,.51,.72,.30,.28,.63};
  constexpr int offsets[6]={0,4,7,10,13,17},counts[6]={4,3,3,3,4,3};
  constexpr float radii[20]={3.8f,3.1f,3.0f,1.7f,1.1f,.9f,1.4f,.45f,.35f,.5f,1.2f,1.7f,1.2f,1.8f,1.3f,1.0f,.9f,1.7f,4.0f,5.0f};
  for(int type=0;type<6;type++){
    const double cell=spacing[type];
    for(int gz=int(std::floor(double(z0)/cell));gz<=int(std::floor(double(z0+47)/cell));gz++)
      for(int gx=int(std::floor(double(x0)/cell));gx<=int(std::floor(double(x0+47)/cell));gx++){
        const uint32_t h=cellHash(gx,gz,301+type*71);
        if(unit(h)>density[type])continue;
        const double x=(gx+.14+unit(cellHash(gx,gz,310+type))*.72)*cell;
        const double z=(gz+.14+unit(cellHash(gx,gz,311+type))*.72)*cell;
        if(x<x0||x>=x0+48||z<z0||z>=z0+48||fluid(x,z))continue;
        const float scale=float(.78+unit(cellHash(gx,gz,312+type))*.43);
        const int slot=offsets[type]+int(cellHash(gx,gz,315+type)%counts[type]);
        const float radius=radii[slot]*scale;
        props.push_back({float(x),float(z),float(surface(x,z)),radius,scale,float(unit(cellHash(gx,gz,317))*2*pi),slot});
      }
  }
  return int(props.size());
}
float* spatial_heights_ptr(){return heights.data();}
float* spatial_colors_ptr(){return colors.data();}
Prop* spatial_props_ptr(){return props.data();}
int spatial_prop_count(){return int(props.size());}
int spatial_build_nav(float radius,int worker){
  radiusNow=radius;workerNow=worker!=0;
  const int firstX=chunkX*side-24,firstZ=chunkZ*side-24;
  staticPass.resize(side*side);staticSteps.resize(side*side);
  for(int z=0;z<side;z++)for(int x=0;x<side;x++)staticPass[z*side+x]=terrainPropWalkable(firstX+x,firstZ+z);
  constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
  for(int z=0;z<side;z++)for(int x=0;x<side;x++){
    const int wx=firstX+x,wz=firstZ+z,i=z*side+x;
    uint8_t mask=0;
    if(staticPass[i])for(int d=0;d<4;d++){
      const int nx=wx+dx[d],nz=wz+dz[d];
      if(insideChunk(nx,nz)&&staticPass[chunkIndex(nx,nz)]&&terrainPropEdge(wx,wz,nx,nz))mask|=1<<d;
    }
    staticSteps[i]=mask;
  }
  if(!lazy_init(sector))return 0;
  navReady=true;
  for(int sz=0;sz<4;sz++)for(int sx=0;sx<4;sx++)refreshSector(firstX/sector+sx,firstZ/sector+sz);
  return lazy_loaded_sectors();
}
int spatial_add_wall(float x,float z,float halfX,float halfZ){
  if(halfX<=0||halfZ<=0)return 0;
  const int id=nextWallId++;walls.push_back({id,x,z,halfX,halfZ,true});
  const int r=int(std::ceil(std::max(radiusNow,1.1f)))+1;
  refreshRect(int(std::floor(x-halfX))-r,int(std::floor(z-halfZ))-r,int(std::ceil(x+halfX))+r,int(std::ceil(z+halfZ))+r);
  return id;
}
int spatial_remove_wall(int id){
  for(Wall& w:walls)if(w.id==id&&w.active){
    w.active=false;const int r=int(std::ceil(std::max(radiusNow,1.1f)))+1;
    refreshRect(int(std::floor(w.x-w.halfX))-r,int(std::floor(w.z-w.halfZ))-r,int(std::ceil(w.x+w.halfX))+r,int(std::ceil(w.z+w.halfZ))+r);
    return 1;
  }
  return 0;
}
int spatial_walkable(int x,int z){return walkable(x,z);}
int spatial_edge(int x,int z,int nx,int nz){return std::abs(x-nx)+std::abs(z-nz)==1&&edge(x,z,nx,nz);}
}
