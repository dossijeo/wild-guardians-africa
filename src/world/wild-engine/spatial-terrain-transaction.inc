struct TerrainProposal {
  std::vector<std::pair<int,int>> affected;
  PreparedTerrainNavigation navigation;
  std::unordered_map<uint64_t,ChunkSpatialSample> samples;
  std::unordered_set<uint64_t> changed;
  std::vector<PreparedChunkData> chunks;
  std::vector<SpatialStaticMutation> bounds,solids;
};
struct ScopedTerrainRecipeView {
  std::vector<Settlement>& proposed;
  std::unordered_map<uint64_t,ChunkSpatialSample>* previous;
  ScopedVisualQueryChunk selected;
  ScopedTerrainRecipeView(std::vector<Settlement>& sites,TerrainProposal& plan):proposed(sites),previous(residentSpatialRegistry){
    settlements.swap(proposed);residentSpatialRegistry=&plan.samples;
  }
  ~ScopedTerrainRecipeView(){residentSpatialRegistry=previous;settlements.swap(proposed);}
};
bool terrainProposalClear(double x,double z,double nx,double nz,double radius,int kind,void* context){
  const auto& plan=*static_cast<TerrainProposal*>(context);
  if(!std::isfinite(radius)||radius<0||radius>2||
     !std::isfinite(x)||!std::isfinite(z)||!std::isfinite(nx)||!std::isfinite(nz)||
     std::max({std::abs(x),std::abs(z),std::abs(nx),std::abs(nz)})>=2147482000.0)return false;
  const float coordinate=float(std::max({1.0,std::abs(x),std::abs(z),std::abs(nx),std::abs(nz)})+radius+3);
  if(!std::isfinite(coordinate))return false;
  const double error=std::max(1e-7,double(std::nextafter(coordinate,std::numeric_limits<float>::infinity())-coordinate)),
    r=radius+spatialResidencyDependencyPadding+2*error+1e-8;
  const int pieces=std::max(1,int(std::ceil(std::hypot(nx-x,nz-z))));
  for(int i=0;i<pieces;i++){
    const double a=double(i)/pieces,b=double(i+1)/pieces,
      ax=x+(nx-x)*a,az=z+(nz-z)*a,bx=x+(nx-x)*b,bz=z+(nz-z)*b;
    const int minX=int(std::floor(std::min(ax,bx)-r)),maxX=int(std::ceil(std::max(ax,bx)+r)),
      minZ=int(std::floor(std::min(az,bz)-r)),maxZ=int(std::ceil(std::max(az,bz)+r));
    for(int iz=minZ;iz<=maxZ;iz++)for(int ix=minX;ix<=maxX;ix++)
      if(plan.changed.count(chunkKey(ix,iz)))return false;
  }
  for(const auto& shape:plan.solids)if(spatialStaticMutationBlocks(shape,x,z,nx,nz,radius,kind))return false;
  return true;
}
bool applyProtectedTerrain(std::vector<Settlement>& proposed,const std::vector<Settlement>& changedSites){
  if(worldBiome!=1){spatialIntentTerrainBefore(nullptr,0,nullptr,nullptr,0,false);return false;}
  for(const auto& site:proposed)if(std::abs(site.x)+site.hx+64>=2147482000.0||std::abs(site.z)+site.hz+64>=2147482000.0){
    spatialIntentTerrainBefore(nullptr,0,nullptr,nullptr,0,false);return false;}
  const auto* prepared=worldResourcePreviewApplying;
  TerrainProposal local;auto& plan=prepared&&prepared->terrainChange?*prepared->terrainChange:local;
  const bool cached=&plan!=&local;
  auto& affected=plan.affected;
  if(!cached){
  const auto& original=residentSpatial();
  for(const auto& cell:loadedChunks){const int cx=cell.first,cz=cell.second;
    if(!std::any_of(changedSites.begin(),changedSites.end(),[&](const Settlement& site){return settlementNearChunk(site,cx,cz);}))continue;
    const auto found=original.find(chunkKey(cx,cz));
    if(found==original.end()||found->second.lattice.size()!=size_t(latticeSpan)*latticeSpan){
      spatialIntentTerrainBefore(nullptr,0,nullptr,nullptr,0,false);return false;}
    affected.emplace_back(cx,cz);
  }
  std::sort(affected.begin(),affected.end());
  plan.samples=original;
  std::unordered_map<PropKey,Prop,PropKeyHash> oldSolids,newSolids;
  for(const auto& [key,records]:residentSolidProps())for(const auto& p:records)oldSolids.insert_or_assign({p.group,p.gx,p.gz},p);
  {
    ScopedTerrainRecipeView scratch(proposed,plan);
    // All proposed lattices precede prop generation: halos cannot see a mixture
    // of old and new neighboring relief. No scratch data is published.
    for(const auto& [cx,cz]:affected){
      chunkX=cx;chunkZ=cz;selectNearbySettlements(cx,cz);preparePonds(cx,cz);
      const int x0=cx*side-24,z0=cz*side-24;lattice.resize(latticeSpan*latticeSpan);
      SpatialStaticMutation box;bool different=false;
      box.minX=box.minZ=std::numeric_limits<double>::infinity();box.maxX=box.maxZ=-box.minX;
      const auto& old=original.at(chunkKey(cx,cz));
      for(int iz=0;iz<latticeSpan;iz++)for(int ix=0;ix<latticeSpan;ix++){
        const int wx=x0+ix-pad,wz=z0+iz-pad;const size_t at=size_t(iz)*latticeSpan+ix;
        const double value=height(wx,wz);lattice[at]=value;
        if(value!=old.lattice[at]){different=true;plan.changed.insert(chunkKey(wx,wz));
          box.minX=std::min(box.minX,double(wx));box.maxX=std::max(box.maxX,double(wx));
          box.minZ=std::min(box.minZ,double(wz));box.maxZ=std::max(box.maxZ,double(wz));}
      }
      if(different)plan.bounds.push_back(box);
      plan.samples.insert_or_assign(chunkKey(cx,cz),ChunkSpatialSample{lattice,ponds});
    }
    for(const auto& [cx,cz]:affected){
      prepareSelectedChunk(cx,cz,false);
      for(const auto& p:solidProps){const PropKey key{p.group,p.gx,p.gz};const auto old=oldSolids.find(key);
        if(old==oldSolids.end()||old->second.x!=p.x||old->second.z!=p.z||old->second.radius!=p.radius)newSolids.insert_or_assign(key,p);}
      plan.chunks.push_back(takePreparedChunkData());
    }
  }
  std::vector<Prop> ordered;for(const auto& [key,p]:newSolids)ordered.push_back(p);std::sort(ordered.begin(),ordered.end(),propKeyLess);
  for(const auto& p:ordered){const auto shape=propMutation(p);plan.solids.push_back(shape);plan.bounds.push_back(shape);}
  }
  const auto ticket=spatialIntentTerrainBefore(plan.bounds.data(),int(plan.bounds.size()),terrainProposalClear,&plan,cached?0:int(affected.size()));
  if(!ticket.allowed)return false;
  if(ticket.preview){
    if(worldResourcePreviewCapture){
      {ScopedTerrainRecipeView scratch(proposed,plan);
        for(auto& data:plan.chunks){selectPreparedChunkData(std::move(data));ensureSelectedVisual();captureWorldResourcePreview(takePreparedChunkData());}
        plan.navigation=prepareTerrainNavigation(worldResourcePreviewCapture->chunks);
      }
      plan.chunks.clear();
      // The commit and its probe only need affected samples. Do not retain a
      // copy of all resident terrain across asynchronous graphical preparation.
      std::unordered_set<uint64_t> keys;for(const auto& [cx,cz]:affected)keys.insert(chunkKey(cx,cz));
      for(auto it=plan.samples.begin();it!=plan.samples.end();)if(!keys.count(it->first))it=plan.samples.erase(it);else ++it;
      worldResourcePreviewCapture->terrainChange=std::make_shared<TerrainProposal>(std::move(plan));
    }
    return true;
  }
  const int selectedX=chunkX,selectedZ=chunkZ,previous=activeProfile;
  settlements=std::move(proposed);++terrainInputRevision;removedPropGeometry().clear();changedSettlementChunks.clear();
  // Publish the approved complete candidate data before rebuilding any profile.
  for(size_t index=0;index<affected.size();index++){
    auto data=cached?prepared->chunks.at(affected[index]):std::move(plan.chunks[index]);const auto key=chunkKey(data.cx,data.cz);
    residentSpatial().insert_or_assign(key,std::move(plan.samples.at(key)));
    changedSettlementChunks.push_back(data.cx);changedSettlementChunks.push_back(data.cz);
    selectPreparedChunkData(std::move(data));publishSelectedChunk();}
  for(size_t index=0;index<affected.size();index++){const auto [cx,cz]=affected[index];
    selectResidentAfterEviction(cx,cz);
    for(int profile=0;profile<navigationProfiles;profile++){selectProfile(profile);if(!navReady)continue;
      if(cached){auto& step=plan.navigation.chunks[index];installPreparedRaster(std::move(*step.rasters[profile]));installPreparedSectors(step.sectors[profile]);}
      else {buildActiveRaster();commitActiveSectors();refreshNeighborBorders(cx,cz);}}
  }
  selectProfile(previous);
  if(residentSpatial().count(chunkKey(selectedX,selectedZ)))selectResidentAfterEviction(selectedX,selectedZ);
  spatialIntentTerrainCommitted(ticket);return true;
}
