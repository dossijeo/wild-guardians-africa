// Replace only affected asset slots. Terrain and chunk-water meshes retain
// their geometry, identity and streaming ownership; logical sources stay whole
// so a restored suppression set can also bring props back after loading.
export function refreshResidentProps(chunks,suppressed,buildSlot){
  const stats={chunks:0,slots:0};
  for(const group of chunks.values()){
    let changed=false;
    for(const [slot,source] of (group.userData.propSources??[]).entries()){
      const previous=group.userData.contactInstances[slot],instances=source.filter(p=>!suppressed.has(p.id));
      if(previous.length===instances.length&&previous.every((p,i)=>p===instances[i]))continue;
      const batches=(group.userData.lodBatches??[]).filter(b=>b.slot===slot);
      const meshes=group.children.filter(m=>batches.includes(m.userData.nativeLodBatch)||m.userData.nativePropSlot===slot);
      buildSlot(group,slot,instances);
      for(const batch of batches)batch.shadow?.dispose();
      for(const mesh of meshes){
        mesh.removeFromParent();mesh.dispose();
        if(mesh.geometry.userData.obstruction||mesh.geometry.userData.nativeChunkClip)mesh.geometry.dispose();
        if(mesh.userData.nativeFluid==='asset')mesh.material.dispose();
      }
      group.userData.lodBatches=(group.userData.lodBatches??[]).filter(b=>!batches.includes(b));
      group.userData.contactInstances[slot]=instances;stats.slots++;changed=true;
    }
    if(changed){delete group.userData.nativeAssetBounds;stats.chunks++;}
  }
  return stats;
}

export function sameSuppressions(previous,next){
  return !!previous&&previous.size===next.size&&[...next].every(id=>previous.has(id));
}
