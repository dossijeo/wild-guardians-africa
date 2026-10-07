// Share one discrete chunk scan across species. Camera/LOD/visibility changes
// do not change physical residency and must not rebuild this index each frame.
const cache=new WeakMap();
export function nativeTreePresence(world){
 const previous=cache.get(world),revision=world.chunkRevision;
 if(revision!==undefined&&previous?.chunks===world.chunks&&previous.revision===revision)return previous.ids;
 const ids=new Set();
 for(const group of world.chunks.values())for(const batch of group.userData.lodBatches??[])for(const tree of batch.instances)ids.add(tree.id);
 cache.set(world,{chunks:world.chunks,revision,ids});return ids;
}
