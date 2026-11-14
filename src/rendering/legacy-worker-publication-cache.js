// Only confirmed, already adopted workers can leave the frame loop. Lifecycle
// changes invalidate this cache at publication or rig adoption/removal.
export function legacyWorkersForFrame(world,workers,enabled){
 if(!enabled){world.legacyWorkerPublicationCache=null;return {update:workers.filter(worker=>worker.status!=='home'),retained:null,cleanup:world.objects};}
 const revision=world.legacyActorRevision??0,old=world.legacyWorkerPublicationCache;
 if(old&&old.revision===revision)return old;
 const update=[],retained=new Set();for(const worker of workers){if(worker.status==='home')continue;const root=world.objects.get(worker.id);if(root&&world.trackedWorkerVisualYaw(worker.id,root)!==undefined)retained.add(worker.id);else update.push(worker);}
 const cleanup=new Map();for(const [id,root] of world.objects)if(!retained.has(id))cleanup.set(id,root);
 return world.legacyWorkerPublicationCache={revision,update,retained,cleanup};
}
