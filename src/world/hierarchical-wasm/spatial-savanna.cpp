#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <unordered_map>
#include <vector>

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
int32_t* lazy_route_ptr();
int lazy_loaded_sectors();
int lazy_sector_slots();
int lazy_sector_updates();
}

namespace {
constexpr int side=48,grid=49,sector=12;
constexpr int pad=4,latticeSpan=grid+pad*2;
constexpr int propBucketWidth=8,propBucketSide=8;
constexpr double maxIndexedRadius=2.0;
constexpr double pi=3.14159265358979323846;
struct Prop {float x,z,y,radius,scale,yaw;int32_t slot;};
struct Pond {double x,z,radius,level;};
struct WaterPoint {double x,z;};
struct Wall {int id;float x,z,halfX,halfZ;bool active;};
struct ChunkRaster {int cx,cz;std::vector<uint8_t> pass,steps,inbound;};
struct NavProfile {float radius=0;bool worker=false,ready=false;std::unordered_map<uint64_t,ChunkRaster> rasters;};
uint32_t worldSeed=0;
int chunkX=0,chunkZ=0,nextWallId=1;
float radiusNow=.3f;
bool workerNow=true,navReady=false;
std::vector<float> heights,colors;
std::vector<uint8_t> water;
std::vector<uint8_t> groundMask;
std::vector<float> waterLevels;
std::vector<float> waterTriangles;
std::vector<double> lattice;
std::vector<Pond> ponds;
std::vector<Prop> props;
std::vector<Prop> solidProps;
std::array<std::vector<int>,propBucketSide*propBucketSide> propBuckets;
int haloPropCount=0;
std::vector<Wall> walls;
std::vector<uint8_t> staticPass,staticSteps,staticInbound;
// No-entry WASM does not initialize C++ globals; construct profiles lazily.
NavProfile* navProfiles[2]={nullptr,nullptr};
NavProfile& navProfile(int index){
  NavProfile*& profile=navProfiles[index];
  if(!profile)profile=new NavProfile();
  return *profile;
}
int activeProfile=0;
std::unordered_map<uint64_t,ChunkRaster>* chunkRasters=nullptr;
std::vector<std::pair<int,int>> loadedChunks;
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
double riverX(double z){return -20+std::sin(z*.035+unit(cellHash(9,7,63))*2*pi)*17;}
double baseHeight(double x,double z){
  const double broad=.58*noise(x*.012,z*.012,91)+.28*noise(x*.0243,z*.0243,9194)+.14*noise(x*.0496,z*.0496,29741);
  const double detail=noise(x*.050,z*.050,883);
  const double dry=2.4+broad*12+detail*2.2;
  const double d=std::abs(x-riverX(z));
  const double channel=3.6-.63+blend((d-1.8)/4.2)*.68;
  return channel+(dry-channel)*blend((d-17)/75);
}
void preparePonds(int cx,int cz){
  ponds.clear();
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
  return h;
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
double fluidLevel(double x,double z){
  if(std::abs(x-riverX(z))<6.1&&surface(x,z)<3.58)return 3.6;
  for(const Pond& p:ponds)if(std::hypot(x-p.x,z-p.z)<p.radius*.82&&surface(x,z)<p.level-.02)return p.level;
  return 0;
}
bool fluid(double x,double z){return fluidLevel(x,z)!=0;}
void buildGroundMask(int cx,int cz){
  // RGBA8 channels match the game's ground material contract: vegetation
  // cover, broad variation, moisture, settlement wear. This prototype has
  // no settlement site, so wear remains zero until that geometry is owned here.
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
    const double moisture=std::clamp(.2+broad*.55+
      (1-blend((shore-6)/17))*.35,0.0,1.0);
    const double cover=blend((vegetation*.57+meso*.28+moisture*.15-.28)/.44)*.96;
    const int at=(iz*35+ix)*4;
    groundMask[at]=uint8_t(std::lround(cover*255));
    groundMask[at+1]=uint8_t(std::lround(meso*255));
    groundMask[at+2]=uint8_t(std::lround(moisture*255));
    groundMask[at+3]=0;
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
void buildWaterMesh(int cx,int cz){
  waterTriangles.clear();
  const double minX=cx*side-24,maxX=minX+side,minZ=cz*side-24,maxZ=minZ+side;
  for(int z=int(minZ);z<int(maxZ);z++){
    const double left0=std::clamp(riverX(z)-6.1,minX,maxX),right0=std::clamp(riverX(z)+6.1,minX,maxX);
    const double left1=std::clamp(riverX(z+1)-6.1,minX,maxX),right1=std::clamp(riverX(z+1)+6.1,minX,maxX);
    if(right0<=left0&&right1<=left1)continue;
    const WaterPoint a{left0,double(z)},b{right0,double(z)},c{right1,double(z+1)},d{left1,double(z+1)};
    waterTriangle(a,d,b,3.6);waterTriangle(b,d,c,3.6);
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
  (void)worker;
  for(int i=0;i<5;i++){
    const double px=x+(i==1?radius:i==2?-radius:0),pz=z+(i==3?radius:i==4?-radius:0);
    if(fluid(px,pz))return false;
    if(std::hypot(surface(px+.8,pz)-surface(px-.8,pz),surface(px,pz+.8)-surface(px,pz-.8))/1.6>.5)return false;
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
bool wallClear(double x,double z){
  for(const Wall& w:walls)if(w.active&&std::abs(x-w.x)<w.halfX+radiusNow&&std::abs(z-w.z)<w.halfZ+radiusNow)return false;
  return true;
}
bool walkable(int x,int z){
  const ChunkRaster* chunk=rasterAt(x,z);
  return chunk&&chunk->pass[rasterIndex(*chunk,x,z)]&&wallClear(x,z);
}
bool terrainPropSegment(int x,int z,int nx,int nz){
  for(int i=1;i<4;i++){
    const double t=i/4.0,px=x+(nx-x)*t,pz=z+(nz-z)*t;
    if(!terrainValid(px,pz,radiusNow,workerNow))return false;
    if(propBlocked(px,pz))return false;
  }
  return true;
}
bool terrainPropEdge(int x,int z,int nx,int nz){
  return terrainPropWalkable(x,z)&&terrainPropWalkable(nx,nz)&&terrainPropSegment(x,z,nx,nz);
}
bool wallEdgeClear(int x,int z,int nx,int nz){
  if(!wallClear(x,z)||!wallClear(nx,nz))return false;
  for(int i=1;i<4;i++){
    const double t=i/4.0;
    if(!wallClear(x+(nx-x)*t,z+(nz-z)*t))return false;
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
void refreshSector(int sx,int sz){
  uint8_t* pass=lazy_pass_ptr(),*steps=lazy_steps_ptr(),*inbound=lazy_inbound_ptr();
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
  lazy_commit_sector(sx,sz);
}
void refreshRect(int minX,int minZ,int maxX,int maxZ){
  if(!navReady)return;
  for(int cz=floorDiv(minZ+24,side);cz<=floorDiv(maxZ+24,side);cz++)
  for(int cx=floorDiv(minX+24,side);cx<=floorDiv(maxX+24,side);cx++){
    if(!chunkRasters->count(chunkKey(cx,cz)))continue;
    const int firstX=cx*side-24,firstZ=cz*side-24;
    if(maxX<firstX||minX>=firstX+side||maxZ<firstZ||minZ>=firstZ+side)continue;
    const int a=std::max(0,floorDiv(minX-firstX,sector)),b=std::min(3,floorDiv(maxX-firstX,sector));
    const int c=std::max(0,floorDiv(minZ-firstZ,sector)),d=std::min(3,floorDiv(maxZ-firstZ,sector));
    for(int sz=c;sz<=d;sz++)for(int sx=a;sx<=b;sx++)refreshSector(firstX/sector+sx,firstZ/sector+sz);
  }
}
void populateChunk(int cx,int cz){
  chunkX=cx;chunkZ=cz;props.clear();solidProps.clear();staticPass.clear();staticSteps.clear();staticInbound.clear();haloPropCount=0;
  // The standalone no-entry WASM binary has no startup constructor pass.
  preparePonds(cx,cz);
  heights.assign(grid*grid,0);colors.assign(grid*grid*3,0);water.assign(side*side,0);waterLevels.assign(side*side,0);
  const int x0=cx*side-24,z0=cz*side-24;
  lattice.resize(latticeSpan*latticeSpan);
  for(int z=0;z<latticeSpan;z++)for(int x=0;x<latticeSpan;x++)
    lattice[z*latticeSpan+x]=height(x0+x-pad,z0+z-pad);
  for(int z=0;z<grid;z++)for(int x=0;x<grid;x++){
    const int i=z*grid+x,wx=x0+x,wz=z0+z;
    heights[i]=float(latticeHeight(wx,wz));
    // The palette is the existing Sabana biome's soil/grass/rock palette.
    // Color still comes from this C++ world, not from a second JS generator.
    const double patch=.58*noise(wx*.041,wz*.041,8913)
      +.28*noise(wx*.0832,wz*.0832,8913^9271)
      +.14*noise(wx*.1693,wz*.1693,8913^29714);
    const double grass=blend((patch-.28)/.44);
    const double slope=std::hypot(latticeHeight(wx+1,wz)-latticeHeight(wx-1,wz),
      latticeHeight(wx,wz+1)-latticeHeight(wx,wz-1))*.5;
    const double rock=blend((slope-.42)/.98)*.62;
    const double bank=(1-blend((std::abs(wx-riverX(wz))-6)/4))*.58;
    const double shade=.94+noise(wx*.11,wz*.11,1181)*.12;
    constexpr double soil[3]={174.0/255,120.0/255,80.0/255};
    constexpr double foliage[3]={182.0/255,178.0/255,103.0/255};
    constexpr double stone[3]={148.0/255,123.0/255,96.0/255};
    constexpr double sand[3]={210.0/255,186.0/255,135.0/255};
    for(int k=0;k<3;k++){
      double color=soil[k]+(foliage[k]-soil[k])*grass;
      color+=(stone[k]-color)*rock;
      const double riverBank=soil[k]+(sand[k]-soil[k])*.34;
      color+=(riverBank-color)*bank;
      colors[i*3+k]=float(std::clamp(color*shade,0.0,1.0));
    }
  }
  for(int z=0;z<side;z++)for(int x=0;x<side;x++){
    const double level=fluidLevel(x0+x+.5,z0+z+.5);
    water[z*side+x]=level!=0;waterLevels[z*side+x]=float(level);
  }
  buildGroundMask(cx,cz);
  buildWaterMesh(cx,cz);
  constexpr double spacing[6]={13.5,7,2.8,9,10,32};
  constexpr double density[6]={.53,.51,.72,.30,.28,.63};
  constexpr int offsets[6]={0,4,7,10,13,17},counts[6]={4,3,3,3,4,2};
  constexpr float radii[20]={3.8f,3.1f,3.0f,1.7f,1.1f,.9f,1.4f,.45f,.35f,.5f,1.2f,1.7f,1.2f,1.8f,1.3f,1.0f,.9f,1.7f,4.0f,5.0f};
  for(int type=0;type<6;type++){
    const double cell=spacing[type];
    // A neighbor owns and renders a prop whose footprint crosses our edge.
    // Generate its collision record from the same global cells, without
    // duplicating the visible instance in this chunk.
    constexpr double halo=10;
    for(int gz=int(std::floor((double(z0)-halo)/cell));gz<=int(std::floor((double(z0+48)+halo)/cell));gz++)
      for(int gx=int(std::floor((double(x0)-halo)/cell));gx<=int(std::floor((double(x0+48)+halo)/cell));gx++){
        const uint32_t h=cellHash(gx,gz,301+type*71);
        if(unit(h)>density[type])continue;
        const double x=(gx+.14+unit(cellHash(gx,gz,310+type))*.72)*cell;
        const double z=(gz+.14+unit(cellHash(gx,gz,311+type))*.72)*cell;
        if(x<x0-halo||x>=x0+48+halo||z<z0-halo||z>=z0+48+halo||fluid(x,z))continue;
        const float scale=float(.78+unit(cellHash(gx,gz,312+type))*.43);
        const int slot=offsets[type]+int(cellHash(gx,gz,315+type)%counts[type]);
        const float radius=radii[slot]*scale;
        const Prop prop={float(x),float(z),float(surface(x,z)),radius,scale,float(unit(cellHash(gx,gz,317))*2*pi),slot};
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
    const Prop prop={float(p.x),float(p.z),float(p.level),float(p.radius),float(p.radius/4),0,19};
    if(owned)props.push_back(prop);
    if(p.x+p.radius+maxIndexedRadius>=x0&&p.x-p.radius-maxIndexedRadius<x0+side&&
       p.z+p.radius+maxIndexedRadius>=z0&&p.z-p.radius-maxIndexedRadius<z0+side){
      solidProps.push_back(prop);if(!owned)haloPropCount++;
    }
  }
  indexSolidProps();
}
void buildActiveRaster(){
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
  chunkRasters->insert_or_assign(chunkKey(chunkX,chunkZ),ChunkRaster{chunkX,chunkZ,staticPass,staticSteps,staticInbound});
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
}

extern "C" {
int spatial_generate(uint32_t seed,int cx,int cz){
  worldSeed=seed;walls.clear();
  for(int profile=0;profile<2;profile++){
    NavProfile& state=navProfile(profile);
    state.rasters.clear();state.ready=false;
    state.radius=0;state.worker=profile==1;
    lazy_select_context(profile);lazy_init(sector);
  }
  activeProfile=0;radiusNow=.3f;workerNow=false;navReady=false;
  chunkRasters=&navProfile(0).rasters;lazy_select_context(0);
  loadedChunks.clear();nextWallId=1;
  populateChunk(cx,cz);loadedChunks.emplace_back(cx,cz);
  return int(props.size());
}
int spatial_add_chunk(int cx,int cz){
  if(!chunkRasters)return -1;
  if(chunkRasters->count(chunkKey(cx,cz)))return 0;
  for(const auto& [x,z]:loadedChunks)if(x==cx&&z==cz)return 0;
  populateChunk(cx,cz);loadedChunks.emplace_back(cx,cz);
  const int previous=activeProfile;
  for(int profile=0;profile<2;profile++){
    selectProfile(profile);
    if(!navReady)continue;
    // Both radii rasterize the same freshly generated terrain and props.
    buildActiveRaster();commitActiveSectors();refreshNeighborBorders(cx,cz);
  }
  selectProfile(previous);
  return int(props.size())+1;
}
int spatial_remove_chunk(int cx,int cz){
  const auto it=std::find(loadedChunks.begin(),loadedChunks.end(),std::pair<int,int>{cx,cz});
  if(it==loadedChunks.end())return 0;
  loadedChunks.erase(it);
  const int previous=activeProfile;
  for(int profile=0;profile<2;profile++){
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
int spatial_sector_slots(){return lazy_sector_slots();}
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
int spatial_build_nav(float radius,int worker){
  if(loadedChunks.empty()||!chunkRasters||radius<=0||radius>maxIndexedRadius)return 0;
  selectProfile(worker?1:0);
  if(navReady&&radiusNow==radius)return lazy_loaded_sectors();
  radiusNow=radius;workerNow=worker!=0;
  if(!lazy_init(sector))return 0;
  const int selectedX=chunkX,selectedZ=chunkZ;
  chunkRasters->clear();
  for(const auto& [cx,cz]:loadedChunks){
    populateChunk(cx,cz);buildActiveRaster();commitActiveSectors();refreshNeighborBorders(cx,cz);
  }
  if(chunkX!=selectedX||chunkZ!=selectedZ)populateChunk(selectedX,selectedZ);
  navReady=true;
  saveProfile();
  return lazy_loaded_sectors();
}
int spatial_select_nav_profile(int worker){
  selectProfile(worker?1:0);
  return navReady?lazy_loaded_sectors():0;
}
int spatial_add_wall(float x,float z,float halfX,float halfZ){
  if(halfX<=0||halfZ<=0)return 0;
  const int id=nextWallId++;walls.push_back({id,x,z,halfX,halfZ,true});
  const float maxRadius=std::max(navProfile(0).radius,navProfile(1).radius);
  const int r=int(std::ceil(maxRadius))+1;
  const int previous=activeProfile;
  for(int profile=0;profile<2;profile++){
    selectProfile(profile);
    refreshRect(int(std::floor(x-halfX))-r,int(std::floor(z-halfZ))-r,int(std::ceil(x+halfX))+r,int(std::ceil(z+halfZ))+r);
  }
  selectProfile(previous);
  return id;
}
int spatial_remove_wall(int id){
  for(Wall& w:walls)if(w.id==id&&w.active){
    w.active=false;
    const float maxRadius=std::max(navProfile(0).radius,navProfile(1).radius);
    const int r=int(std::ceil(maxRadius))+1;
    const int previous=activeProfile;
    for(int profile=0;profile<2;profile++){
      selectProfile(profile);
      refreshRect(int(std::floor(w.x-w.halfX))-r,int(std::floor(w.z-w.halfZ))-r,int(std::ceil(w.x+w.halfX))+r,int(std::ceil(w.z+w.halfZ))+r);
    }
    selectProfile(previous);
    return 1;
  }
  return 0;
}
int spatial_walkable(int x,int z){return walkable(x,z);}
int spatial_edge(int x,int z,int nx,int nz){return std::abs(x-nx)+std::abs(z-nz)==1&&edge(x,z,nx,nz);}
int spatial_prop_blocked(float x,float z){return propBlocked(x,z);}
}
