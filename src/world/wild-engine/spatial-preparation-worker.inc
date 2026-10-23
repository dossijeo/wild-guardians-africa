// Included inside spatial-savanna.cpp's anonymous namespace, pthread builds only.
// Preparation API is not yet connected to publication or the game stream.
// Live registries and navigation remain main-thread owned. The worker receives
// bounded sampling inputs and produces an owned result in the same WASM memory.
struct PreparationProfile {int index;float radius;bool worker;};
struct PreparationJob {
  uint32_t seed=0;
  int biome=0,cx=0,cz=0,id=0;
  bool canyon=false,ranOnWorker=false,cancelled=false;
  double computeMs=0;
  std::vector<Settlement> sites;
  std::unordered_set<PropKey,PropKeyHash> removed;
  std::unordered_map<uint64_t,ChunkSpatialSample> samples;
  std::vector<PreparationProfile> profiles;
  PreparedChunkData data;
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
    worldSeed=job.seed;worldBiome=job.biome;canyonOpenRight=job.canyon;
    settlements=std::move(job.sites);
    removedPropRegistry=&job.removed;residentSpatialRegistry=&job.samples;
    if(!preparationCancel.load(std::memory_order_acquire)){
      prepareSelectedChunk(job.cx,job.cz,true);
      for(const auto& profile:job.profiles){
        if(preparationCancel.load(std::memory_order_acquire)||preparationStop.load(std::memory_order_acquire))break;
        radiusNow=profile.radius;workerNow=profile.worker;
        job.rasters[profile.index]=prepareActiveRaster();
      }
      job.data=takePreparedChunkData();
    }
    // Detach borrowed input addresses before the main thread may release them.
    removedPropRegistry=nullptr;residentSpatialRegistry=nullptr;
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
  job->id=++preparationSerial;job->seed=worldSeed;job->biome=worldBiome;
  job->canyon=canyonOpenRight;job->cx=cx;job->cz=cz;
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
  for(int i=0;i<navigationProfiles;i++)if(navProfiles[i]&&navProfiles[i]->ready)
    job->profiles.push_back({i,navProfiles[i]->radius,navProfiles[i]->worker});
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
bool preparationReadable(){return preparationState.load(std::memory_order_acquire)==3&&preparationJob&&!preparationJob->cancelled&&!preparationCancel.load(std::memory_order_acquire);}
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
  return -1;
}
std::pair<void*,size_t> preparationBuffer(int field){
  if(!preparationReadable())return {nullptr,0};
  auto& d=preparationJob->data;
  switch(field){
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
