// QA-only: audit all nearby representations, independently of the chosen path tree.
export function createNearReadinessAudit({distance=40,maxDrops=64}={}){
 const previous=new Map(),stats={observations:0,readyObservations:0,descents:0,offscreenBoundsDescents:0,potentiallyVisibleDescents:0,unknownDescents:0,drops:[],nonOffscreenDrops:[],omissions:[]};
 return {stats,sample(adapters,camera,age){
  const current=new Map();
  for(const adapter of adapters)for(const tree of adapter.layer.current?.trees??[]){
   const range=Math.hypot(tree.x-camera.x,tree.z-camera.z);if(range>distance)continue;
   const ready=adapter.layer.current.prototype.treeState(tree.id)?.ready??0,entry={x:tree.x,z:tree.z,ready};
   current.set(tree.id,entry);stats.observations++;if(ready===1)stats.readyObservations++;
   const old=previous.get(tree.id);if(old&&ready+.05<old.ready){
    const diagnosis=adapter.readinessDiagnosis(tree.id),physical=diagnosis?.physical??[],classification=physical.length&&physical.every(p=>p.frustum===false)?'offscreen-bounds':physical.some(p=>p.frustum===true)?'potentially-visible':'unknown',drop={id:tree.id,age,range,from:old.ready,to:ready,classification,diagnosis};
    stats.descents++;if(classification==='offscreen-bounds')stats.offscreenBoundsDescents++;else if(classification==='potentially-visible')stats.potentiallyVisibleDescents++;else stats.unknownDescents++;
    if(stats.drops.length<maxDrops)stats.drops.push(drop);if(classification!=='offscreen-bounds'&&stats.nonOffscreenDrops.length<maxDrops)stats.nonOffscreenDrops.push(drop);
   }
  }
  for(const [id,old] of previous)if(!current.has(id)&&Math.hypot(old.x-camera.x,old.z-camera.z)<=distance&&stats.omissions.length<maxDrops)stats.omissions.push({id,age});
  previous.clear();for(const [id,entry]of current)previous.set(id,entry);
 }};
}
