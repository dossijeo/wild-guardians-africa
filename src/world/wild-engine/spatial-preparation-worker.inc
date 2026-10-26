// Included inside spatial-savanna.cpp's anonymous namespace, pthread builds only.
// Preparation/publication API supplies the authoritative game stream.
#include "spatial-prepared-water.inc"
// Live registries and navigation remain main-thread owned. The worker receives
// bounded sampling inputs and produces an owned result in the same WASM memory.
struct PreparationProfile {int index;float radius;bool worker;};
struct PreparedSector {
  int x,z;
  std::array<uint8_t,sector*sector> pass{},steps{},inbound{};
};
struct PreparationJob {
  uint32_t seed=0;
  uint64_t terrainRevision=0,residentRevision=0,obstacleRevision=0;
  int biome=0,cx=0,cz=0,id=0;
  bool canyon=false,channels=false,network=false,ranOnWorker=false,cancelled=false,published=false;
  double computeMs=0,publishMs=0;
  std::vector<Settlement> sites;
  std::unordered_set<PropKey,PropKeyHash> removed;
  std::unordered_map<uint64_t,ChunkSpatialSample> samples;
  std::vector<PreparationProfile> profiles;
  BarrierIndex barriers;
  PolygonIndex polygons;
  std::array<std::unordered_map<uint64_t,ChunkRaster>,navigationProfiles> neighbors;
  std::array<std::vector<PreparedSector>,navigationProfiles> sectors;
  PreparedChunkData data;
  bool waterBedRequested=false,waterShoreRequested=false;
  PreparedWaterBed waterBed;
  std::array<std::optional<ChunkRaster>,navigationProfiles> rasters;
};
// 0 idle, 1 queued, 2 running, 3 result owned by caller,
// 5 thread has finished touching job data. Only the worker waits on this word.
alignas(4) std::atomic<int32_t> preparationState{0};
std::atomic<bool> preparationCancel{false},preparationStop{false};
std::unique_ptr<PreparationJob> preparationJob;
pthread_t preparationThread;
bool preparationStarted=false;
int preparationSerial=0;
int preparationVisualOptions=0;
extern "C" EMSCRIPTEN_KEEPALIVE void spatial_prepare_visual_options(int flags){preparationVisualOptions=flags&3;}
void wakePreparation(){emscripten_futex_wake(&preparationState,1);}
void* preparationLoop(void*){
  while(!preparationStop.load(std::memory_order_acquire)){
    int32_t expected=1;
    if(!preparationState.compare_exchange_strong(expected,2,std::memory_order_acquire)){
      emscripten_futex_wait(&preparationState,expected,100);
      continue;
    }
    auto& job=*preparationJob;
    const double started=emscripten_get_now();
    job.ranOnWorker=!emscripten_is_main_runtime_thread();
    worldSeed=job.seed;worldBiome=job.biome;canyonOpenRight=job.canyon;mangroveChannels=job.channels;mangroveNetwork=job.network;
    settlements=std::move(job.sites);
    removedPropRegistry=&job.removed;residentSpatialRegistry=&job.samples;
    if(!preparationCancel.load(std::memory_order_acquire)){
      prepareSelectedChunk(job.cx,job.cz,true);
      for(const auto& profile:job.profiles){
        if(preparationCancel.load(std::memory_order_acquire)||preparationStop.load(std::memory_order_acquire))break;
        radiusNow=profile.radius;workerNow=profile.worker;
        auto& local=job.neighbors[profile.index];
        local.insert_or_assign(chunkKey(job.cx,job.cz),prepareActiveRaster());
        chunkRasters=&local;barrierRegistry=&job.barriers;polygonRegistry=&job.polygons;
        auto& sectors=job.sectors[profile.index];
        auto prepare=[&](int x,int z){
          sectors.push_back({x,z});auto& out=sectors.back();
          prepareSectorOverlay(x,z,out.pass.data(),out.steps.data(),out.inbound.data());
        };
        const int firstX=(job.cx*side-24)/sector,firstZ=(job.cz*side-24)/sector;
        for(int z=0;z<4;z++)for(int x=0;x<4;x++)prepare(firstX+x,firstZ+z);
        constexpr int dx[4]={1,-1,0,0},dz[4]={0,0,1,-1};
        for(int d=0;d<4;d++){
          const int nx=job.cx+dx[d],nz=job.cz+dz[d];
          if(!local.count(chunkKey(nx,nz)))continue;
          const int x0=(nx*side-24)/sector,z0=(nz*side-24)/sector;
          for(int i=0;i<4;i++)prepare(x0+(d==0?0:d==1?3:i),z0+(d==2?0:d==3?3:i));
        }
        job.rasters[profile.index]=std::move(local.at(chunkKey(job.cx,job.cz)));
      }
      if(job.waterBedRequested&&!preparationCancel.load(std::memory_order_acquire))job.waterBed=prepareWaterBed(job.cx,job.cz,job.waterShoreRequested);
      job.data=takePreparedChunkData();
    }
    // Detach borrowed input addresses before the main thread may release them.
    removedPropRegistry=nullptr;residentSpatialRegistry=nullptr;
    chunkRasters=nullptr;barrierRegistry=nullptr;polygonRegistry=nullptr;
    job.sites=std::move(settlements);
    job.cancelled=preparationCancel.load(std::memory_order_acquire)||preparationStop.load(std::memory_order_acquire);
    job.computeMs=emscripten_get_now()-started;
    preparationState.store(3,std::memory_order_release);
  }
  preparationState.store(5,std::memory_order_release);
  return nullptr;
}
extern "C" EMSCRIPTEN_KEEPALIVE int spatial_prepare_start(int cx,int cz){
  if(preparationStop.load()||preparationState.load(std::memory_order_acquire)!=0||!chunkRasters)return 0;
  if(!preparationStarted){
    if(pthread_create(&preparationThread,nullptr,preparationLoop,nullptr))return -1;
    pthread_detach(preparationThread);preparationStarted=true;
  }
  auto job=std::make_unique<PreparationJob>();
  job->waterBedRequested=(preparationVisualOptions&1)!=0;
  job->waterShoreRequested=(preparationVisualOptions&2)!=0;
  job->id=++preparationSerial;job->seed=worldSeed;job->biome=worldBiome;
  job->canyon=canyonOpenRight;job->channels=mangroveChannels;job->network=mangroveNetwork;job->cx=cx;job->cz=cz;
  job->terrainRevision=terrainInputRevision;job->residentRevision=residencyRevision;job->obstacleRevision=overlayRevision;
  for(const auto& site:settlements)if(settlementNearChunk(site,cx,cz))job->sites.push_back(site);
  // Reproduce the procedural cell bounds, querying the authoritative suppression
  // set only for cells this job can visit; never clone the entire removal history.
  for(int type=0;type<6;type++){
    const double cell=proceduralPropSpacing(type),x0=cx*side-24,z0=cz*side-24;
    for(int z=int(std::floor((z0-10)/cell));z<=int(std::floor((z0+side+10)/cell));z++)
    for(int x=int(std::floor((x0-10)/cell));x<=int(std::floor((x0+side+10)/cell));x++){
      const PropKey key{type,x,z};if(removedProps().count(key))job->removed.insert(key);
    }
  }
  // Prop halos can sample neighboring relief. Copy only the nine relevant
  // immutable samples so deletion/replacement of live chunks cannot race reads.
  for(int z=cz-1;z<=cz+1;z++)for(int x=cx-1;x<=cx+1;x++){
    const auto it=residentSpatial().find(chunkKey(x,z));
    if(it!=residentSpatial().end())job->samples.emplace(it->first,it->second);
  }
  // Index buckets already include obstacle extents and the maximum actor radius.
  // Query footprint includes the neighboring sector strips and their edge samples.
  auto capture=[&](const auto& source,auto& target){
    const int x0=cx*side-24,z0=cz*side-24;
    for(int z=floorDiv(z0-sector-2,barrierBucketWidth);z<=floorDiv(z0+side+sector+2,barrierBucketWidth);z++)
    for(int x=floorDiv(x0-sector-2,barrierBucketWidth);x<=floorDiv(x0+side+sector+2,barrierBucketWidth);x++){
      auto it=source.buckets.find(barrierKey(x,z));if(it==source.buckets.end())continue;
      target.buckets.emplace(it->first,it->second);
      for(int id:it->second)target.byId.emplace(id,source.byId.at(id));
    }
  };
  capture(barrierIndex(),job->barriers);capture(polygonIndex(),job->polygons);
  for(int i=0;i<navigationProfiles;i++)if(navProfiles[i]&&navProfiles[i]->ready){
    job->profiles.push_back({i,navProfiles[i]->radius,navProfiles[i]->worker});
    for(int z=cz-1;z<=cz+1;z++)for(int x=cx-1;x<=cx+1;x++){
      auto it=navProfiles[i]->rasters.find(chunkKey(x,z));
      if(it!=navProfiles[i]->rasters.end())job->neighbors[i].emplace(it->first,it->second);
    }
  }
  preparationJob=std::move(job);preparationCancel.store(false);
  const int id=preparationJob->id;
  preparationState.store(1,std::memory_order_release);wakePreparation();return id;
}
extern "C" EMSCRIPTEN_KEEPALIVE int spatial_prepare_status(){return preparationState.load(std::memory_order_acquire);}
extern "C" EMSCRIPTEN_KEEPALIVE void spatial_prepare_cancel(){preparationCancel.store(true,std::memory_order_release);}
extern "C" EMSCRIPTEN_KEEPALIVE int spatial_prepare_release(){
  const int status=preparationState.load(std::memory_order_acquire);
  if(status!=3&&status!=5)return 0;
  preparationJob.reset();
  if(status==3&&!preparationStop.load(std::memory_order_acquire)){preparationState.store(0,std::memory_order_release);wakePreparation();}
  return 1;
}
extern "C" EMSCRIPTEN_KEEPALIVE void spatial_prepare_shutdown(){
  preparationStop.store(true,std::memory_order_release);preparationCancel.store(true,std::memory_order_release);
  if(!preparationStarted)preparationState.store(5,std::memory_order_release);
  wakePreparation();
}
bool preparationReadable(){return preparationState.load(std::memory_order_acquire)==3&&preparationJob&&!preparationJob->published&&!preparationJob->cancelled&&!preparationCancel.load(std::memory_order_acquire);}
extern "C" EMSCRIPTEN_KEEPALIVE double spatial_prepare_metric(int field){
  if(preparationState.load(std::memory_order_acquire)!=3||!preparationJob)return -1;
  const auto& job=*preparationJob;
  if(field==0)return job.ranOnWorker;
  if(field==1)return job.computeMs;
  if(field==2)return job.cancelled||preparationCancel.load(std::memory_order_acquire);
  if(field==3)return job.id;
  if(field==4)return job.samples.size();
  if(field==5)return job.sites.size();
  if(field==6)return job.removed.size();
  if(field==7)return job.publishMs;
  if(field==8)return job.published;
  return -1;
}
std::pair<void*,size_t> preparationBuffer(int field){
  if(!preparationReadable())return {nullptr,0};
  auto& d=preparationJob->data;
  switch(field){
    case 9:return {preparationJob->waterBed.shore.data(),preparationJob->waterBed.shore.size()*sizeof(float)};
    case 7:return {preparationJob->waterBed.bytes.data(),preparationJob->waterBed.bytes.size()};
    case 8:return {preparationJob->waterBed.metadata.data(),preparationJob->waterBed.bytes.empty()?0:sizeof(preparationJob->waterBed.metadata)};
    case 0:return {d.heights.data(),d.heights.size()*sizeof(float)};
    case 1:return {d.colors.data(),d.colors.size()*sizeof(float)};
    case 2:return {d.groundMask.data(),d.groundMask.size()};
    case 3:return {d.water.data(),d.water.size()};
    case 4:return {d.waterLevels.data(),d.waterLevels.size()*sizeof(float)};
    case 5:return {d.waterTriangles.data(),d.waterTriangles.size()*sizeof(float)};
    case 6:return {d.props.data(),d.props.size()*sizeof(Prop)};
  }
  if(field<10||field>=10+navigationProfiles*3)return {nullptr,0};
  const int profile=(field-10)/3,part=(field-10)%3;
  if(!preparationJob->rasters[profile])return {nullptr,0};
  auto& r=*preparationJob->rasters[profile];
  auto& a=part==0?r.pass:part==1?r.steps:r.inbound;return {a.data(),a.size()};
}
extern "C" EMSCRIPTEN_KEEPALIVE void* spatial_prepare_buffer_ptr(int field){return preparationBuffer(field).first;}
extern "C" EMSCRIPTEN_KEEPALIVE int spatial_prepare_buffer_bytes(int field){return int(preparationBuffer(field).second);}
// Read-only differential-test view; never changes the selected navigation profile.
extern "C" EMSCRIPTEN_KEEPALIVE void* spatial_prepare_reference_raster_ptr(int profile,int cx,int cz,int part){
  if(profile<0||profile>=navigationProfiles||!navProfiles[profile])return nullptr;
  auto it=navProfiles[profile]->rasters.find(chunkKey(cx,cz));
  if(it==navProfiles[profile]->rasters.end())return nullptr;
  auto& r=it->second;return part==0?r.pass.data():part==1?r.steps.data():r.inbound.data();
}

void commitActiveSectors();
void refreshNeighborBorders(int cx,int cz);
// Positive result is visible prop count + 1; -1 means not ready/wrong id,
// -2 means stale inputs/profiles, -3 means already resident. No wait or regeneration.
extern "C" EMSCRIPTEN_KEEPALIVE int spatial_prepare_publish(int id){
  if(!preparationReadable()||preparationJob->id!=id)return -1;
  auto& job=*preparationJob;
  if(job.terrainRevision!=terrainInputRevision||job.residentRevision!=residencyRevision||job.obstacleRevision!=overlayRevision)return -2;
  for(int i=0;i<navigationProfiles;i++){
    const auto found=std::find_if(job.profiles.begin(),job.profiles.end(),[i](const auto& p){return p.index==i;});
    const bool live=navProfiles[i]&&navProfiles[i]->ready;
    if(live!=(found!=job.profiles.end()))return -2;
    if(live&&(found->radius!=navProfiles[i]->radius||found->worker!=navProfiles[i]->worker||!job.rasters[i]))return -2;
  }
  if(std::find(loadedChunks.begin(),loadedChunks.end(),std::pair<int,int>{job.cx,job.cz})!=loadedChunks.end())return -3;
  const double started=emscripten_get_now();
  selectPreparedChunkData(std::move(job.data));
  // The worker's indices belong to its filtered site snapshot, not this vector.
  selectNearbySettlements(job.cx,job.cz);
  publishSelectedChunk();loadedChunks.emplace_back(job.cx,job.cz);
  const int previous=activeProfile;
  for(const auto& profile:job.profiles){
    selectProfile(profile.index);installPreparedRaster(std::move(*job.rasters[profile.index]));
    for(const auto& sector:job.sectors[profile.index]){
      std::copy(sector.pass.begin(),sector.pass.end(),lazy_pass_ptr());
      std::copy(sector.steps.begin(),sector.steps.end(),lazy_steps_ptr());
      std::copy(sector.inbound.begin(),sector.inbound.end(),lazy_inbound_ptr());
      lazy_commit_sector(sector.x,sector.z);
    }
  }
  selectProfile(previous);++residencyRevision;job.published=true;
  job.publishMs=emscripten_get_now()-started;
  return int(props.size())+1;
}
