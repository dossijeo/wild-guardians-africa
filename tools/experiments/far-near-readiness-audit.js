// QA-only: audit all nearby representations, independently of the chosen path tree.
export function createNearReadinessAudit({distance=40,maxDrops=64}={}){
 const previous=new Map(),stats={observations:0,readyObservations:0,drops:[],omissions:[]};
 return {stats,sample(adapters,camera,age){
  const current=new Map();
  for(const adapter of adapters)for(const tree of adapter.layer.current?.trees??[]){
   const range=Math.hypot(tree.x-camera.x,tree.z-camera.z);if(range>distance)continue;
   const ready=adapter.layer.current.prototype.treeState(tree.id)?.ready??0,entry={x:tree.x,z:tree.z,ready};
   current.set(tree.id,entry);stats.observations++;if(ready===1)stats.readyObservations++;
   const old=previous.get(tree.id);if(old&&ready+.05<old.ready&&stats.drops.length<maxDrops)stats.drops.push({id:tree.id,age,range,from:old.ready,to:ready,diagnosis:adapter.readinessDiagnosis(tree.id)});
  }
  for(const [id,old] of previous)if(!current.has(id)&&Math.hypot(old.x-camera.x,old.z-camera.z)<=distance&&stats.omissions.length<maxDrops)stats.omissions.push({id,age});
  previous.clear();for(const [id,entry]of current)previous.set(id,entry);
 }};
}
