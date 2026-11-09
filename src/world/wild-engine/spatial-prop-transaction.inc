// Included in the canonical world's namespace after its recipe/refresh helpers.
// A proposed suppression set only changes a thread-local recipe view. It never
// publishes scratch chunks, swaps the live set or changes the graph speculatively.
struct ScopedPropRecipeView {
  std::unordered_set<PropKey,PropKeyHash>* previous;
  ScopedVisualQueryChunk selected;
  explicit ScopedPropRecipeView(std::unordered_set<PropKey,PropKeyHash>& proposed):previous(removedPropRegistry){
    removedPropRegistry=&proposed;
  }
  ~ScopedPropRecipeView(){removedPropRegistry=previous;}
};
SpatialStaticMutation propMutation(const Prop& prop){
  SpatialStaticMutation shape;shape.x=prop.x;shape.z=prop.z;shape.circleRadius=prop.radius;
  shape.minX=double(prop.x)-prop.radius;shape.maxX=double(prop.x)+prop.radius;
  shape.minZ=double(prop.z)-prop.radius;shape.maxZ=double(prop.z)+prop.radius;return shape;
}
bool propKeyLess(const Prop& a,const Prop& b){
  if(a.group!=b.group)return a.group<b.group;
  if(a.gx!=b.gx)return a.gx<b.gx;return a.gz<b.gz;
}
int restoreProtectedProps(std::unordered_set<PropKey,PropKeyHash>& replacement){
  std::unordered_set<PropKey,PropKeyHash> suppressed,restored;
  for(const auto& key:replacement)if(!removedProps().count(key))suppressed.insert(key);
  for(const auto& key:removedProps())if(!replacement.count(key))restored.insert(key);
  std::set<std::pair<int,int>> touched;
  const auto collect=[&](const PropKey& key){
    const auto [x,z]=proceduralPropPosition(key.group,key.gx,key.gz,proceduralPropSpacing(key.group));
    // Avoid undefined integer conversion/generation for unsupported world cells.
    if(!std::isfinite(x)||!std::isfinite(z)||std::abs(x)>=2147482000.0||std::abs(z)>=2147482000.0)return false;
    const int cx=int(std::floor((x+24)/side)),cz=int(std::floor((z+24)/side));
    for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++){
      const int nx=cx+dx,nz=cz+dz;const double firstX=double(nx)*side-24,firstZ=double(nz)*side-24;
      // The canonical recipe visits a 10 m prop halo, even when its owner is absent.
      if(x<firstX-10||x>=firstX+side+10||z<firstZ-10||z>=firstZ+side+10)continue;
      if(residentSpatial().count(chunkKey(nx,nz)))touched.emplace(nx,nz);
    }
    return true;
  };
  for(const auto& key:suppressed)if(!collect(key)){spatialIntentPropsBefore(nullptr,0,0,false);return 0;}
  for(const auto& key:restored)if(!collect(key)){spatialIntentPropsBefore(nullptr,0,0,false);return 0;}
  std::unordered_map<PropKey,Prop,PropKeyHash> changed,cacheUpdates,introduced;
  const auto captureSuppressed=[&](const std::vector<Prop>& records){
    for(const auto& prop:records){const PropKey key{prop.group,prop.gx,prop.gz};
      if(suppressed.count(key)){changed.insert_or_assign(key,prop);cacheUpdates.insert_or_assign(key,prop);}}
  };
  for(const auto& [cx,cz]:touched){
    const auto key=chunkKey(cx,cz);
    if(const auto it=residentVisibleProps().find(key);it!=residentVisibleProps().end())captureSuppressed(it->second);
    if(const auto it=residentSolidProps().find(key);it!=residentSolidProps().end())captureSuppressed(it->second);
  }
  int recipes=0;
  if(!restored.empty()){
    ScopedPropRecipeView scratch(replacement);
    for(const auto& [cx,cz]:touched){
      prepareSelectedChunk(cx,cz,false);recipes++;
      for(const auto& prop:props){const PropKey key{prop.group,prop.gx,prop.gz};
        if(restored.count(key))changed.insert_or_assign(key,prop);}
      for(const auto& prop:solidProps){const PropKey key{prop.group,prop.gx,prop.gz};
        if(restored.count(key)){changed.insert_or_assign(key,prop);introduced.insert_or_assign(key,prop);}}
    }
  }
  std::vector<Prop> ordered;ordered.reserve(changed.size());
  for(const auto& [key,prop]:changed)ordered.push_back(prop);
  std::sort(ordered.begin(),ordered.end(),propKeyLess);
  std::vector<Prop> additions;additions.reserve(introduced.size());
  for(const auto& [key,prop]:introduced)additions.push_back(prop);
  std::sort(additions.begin(),additions.end(),propKeyLess);
  std::vector<SpatialStaticMutation> shapes;shapes.reserve(additions.size());
  for(const auto& prop:additions)shapes.push_back(propMutation(prop));
  const auto ticket=spatialIntentPropsBefore(shapes.data(),int(shapes.size()),recipes);
  if(!ticket.allowed)return 0;
  // Only now may identities, witnesses, resident data and graph become effective.
  removedProps().swap(replacement);
  for(const auto& [key,prop]:cacheUpdates)removedPropGeometry().insert_or_assign(key,prop);
  // Include every canonical candidate halo, not just bounds recomputed from
  // rounded visible records; a later read must not discover an uncommitted prop.
  refreshRemovedPropChunksBatch(ordered,&touched);
  for(const auto& key:restored)removedPropGeometry().erase(key);
  // Preserve the existing single-item batch's two input-revision increments.
  spatialIntentPropsCommitted(ticket,ordered.size()==1?2:1);return 1;
}
