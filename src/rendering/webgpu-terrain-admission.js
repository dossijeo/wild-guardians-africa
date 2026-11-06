// Keep confirmed terrain state independent from its graphical admission. The
// previous visible revision remains until the replacement has been prepared.
export function createTerrainAdmission({scene,admission,onError=()=>{},onPublished=()=>{}}){
 if(!scene?.isScene||typeof admission?.prepare!=='function'||typeof onError!=='function'||typeof onPublished!=='function')throw TypeError('Invalid terrain admission');
 const pending=new Map(),visible=new Map(),unavailable=new Set();let closed=false;
 function release(record){
  if(!record||record.released)return;record.released=true;record.controller.abort();
  // Part of a failed publication may already have reached the scene. Keep
  // meshes still inside the compilation group intact until deferred release.
  for(const mesh of record.meshes)if(record.published||mesh.parent===scene)mesh.removeFromParent();
  const dispose=()=>{for(const mesh of record.meshes)mesh.removeFromParent();record.dispose();};
  if(typeof admission.deferRelease==='function')admission.deferRelease(record.group,dispose);else dispose();
 }
 function publish(key,group,meshes,dispose){
  if(closed)throw Error('Terrain admission closed');
  const previous=pending.get(key);if(previous){pending.delete(key);release(previous);}
  const controller=new AbortController(),record={group,meshes,dispose,controller,released:false};pending.set(key,record);unavailable.add(key);
  const commit=()=>{
   if(closed||pending.get(key)!==record||controller.signal.aborted)return;
   // Keep the pending owner until every mesh is attached. If attachment
   // fails, the rejection path removes any partial additions and preserves
   // the previous visible revision.
   const old=visible.get(key);for(const mesh of meshes)scene.add(mesh);record.published=true;visible.set(key,record);pending.delete(key);unavailable.delete(key);
   try{release(old);onPublished(key);}catch(error){onError(error);}
  };
  Promise.resolve().then(()=>typeof admission.prepareAndPublish==='function'?admission.prepareAndPublish(group,{signal:controller.signal},commit):Promise.resolve(admission.prepare(group,{signal:controller.signal})).then(commit)).catch(error=>{if(closed||pending.get(key)!==record||controller.signal.aborted)return;pending.delete(key);release(record);onError(error);});
 }
 function remove(key){const item=pending.get(key);pending.delete(key);release(item);const old=visible.get(key);visible.delete(key);release(old);unavailable.delete(key);}
 function isRayReady(ray,limit=Infinity){
  if(closed||!ray?.origin||!ray?.direction||![ray.origin.x,ray.origin.z,ray.direction.x,ray.direction.z].every(Number.isFinite)||typeof limit!=='number'||Number.isNaN(limit)||limit<0)return false;
  for(const key of unavailable){const [cx,cz]=key.split(',').map(Number);let low=0,high=limit;
   for(const [origin,direction,min,max] of [[ray.origin.x,ray.direction.x,cx*48-24,cx*48+24],[ray.origin.z,ray.direction.z,cz*48-24,cz*48+24]]){
    if(direction===0){if(origin<min||origin>max){high=-1;break;}continue;}
    const a=(min-origin)/direction,b=(max-origin)/direction;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));if(low>high)break;
   }
   if(low<=high)return false;
  }
  return true;
 }
 return {publish,remove,isReady(){return !closed&&unavailable.size===0;},isRayReady,isVisible(key,mesh){return visible.get(key)?.meshes[0]===mesh;},dispose(){if(closed)return;closed=true;for(const key of new Set([...pending.keys(),...visible.keys(),...unavailable]))remove(key);}};
}
