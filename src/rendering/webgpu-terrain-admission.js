// Keep confirmed terrain state independent from its graphical admission. The
// previous visible revision remains until the replacement has been prepared.
export function createTerrainAdmission({scene,admission,coordinator=null,onError=()=>{},onPublished=()=>{}}){
 if(!scene?.isScene||typeof admission?.prepare!=='function'||coordinator!==null&&typeof coordinator?.offer!=='function'||typeof onError!=='function'||typeof onPublished!=='function')throw TypeError('Invalid terrain admission');
 const pending=new Map(),visible=new Map(),unavailable=new Set();let closed=false;
 function release(record){
  if(!record||record.released)return;record.released=true;record.controller.abort();let notificationFailure=null;try{record.withdraw?.();}catch(error){try{onError(error);}catch(failure){notificationFailure=failure;}}record.withdraw=null;
  // Keep the compiled subtree intact until outstanding GPU work completes,
  // even after the visible revision has been retired.
  record.group.removeFromParent();
  const dispose=()=>{for(const mesh of record.meshes)mesh.removeFromParent();record.dispose();};
  if(typeof admission.deferRelease==='function')admission.deferRelease(record.group,dispose);else dispose();if(notificationFailure)throw notificationFailure;
 }
 // Keep scene attachment separate from replacing ownership. A joint chunk
 // publication can later attach all participants before retiring either old
 // revision; a failed attachment leaves the old visible owner untouched.
 function rollback(record){if(record.group.parent===scene)record.group.removeFromParent();}
 function attach(record){try{scene.add(record.group);}catch(error){rollback(record);throw error;}}
 function finalize(key,record){const old=visible.get(key);record.published=true;record.withdraw=null;visible.set(key,record);pending.delete(key);unavailable.delete(key);let notified=false;return ()=>{if(notified)return;notified=true;try{release(old);}catch(error){try{onError(error);}catch{}}try{onPublished(key);}catch(error){try{onError(error);}catch{}}};}
 function publish(key,group,meshes,dispose,{revision=null,epoch=null,publicationOrder=undefined}={}){
  if(closed)throw Error('Terrain admission closed');
  if(coordinator&&(!Number.isSafeInteger(revision)||revision<0||epoch!==null&&(typeof epoch!=='string'||!epoch)||publicationOrder!==undefined&&(!Number.isSafeInteger(publicationOrder)||publicationOrder<1)))throw TypeError('Invalid coordinated terrain identity');
  const previous=pending.get(key);if(previous){pending.delete(key);release(previous);}
  const controller=new AbortController(),record={group,meshes,dispose,controller,released:false};pending.set(key,record);unavailable.add(key);
  const commit=()=>{
   if(closed||pending.get(key)!==record||controller.signal.aborted)return;
   // Keep the pending owner until every mesh is attached. If attachment
   // fails, the rejection path removes any partial additions and preserves
   // the previous visible revision.
   attach(record);finalize(key,record)();
  };
  const fail=error=>{if(closed||pending.get(key)!==record||controller.signal.aborted)return;pending.delete(key);release(record);onError(error);};
  const current=()=>!closed&&pending.get(key)===record&&!controller.signal.aborted;
  const assertCurrent=()=>{if(!current())throw new DOMException('Terrain admission cancelled','AbortError');};
  if(coordinator){let attached=false;const participant={key,revision,epoch,publicationOrder,side:'terrain',object:group,signal:controller.signal,attach(){assertCurrent();if(attached)throw Error('Terrain already attached');try{attach(record);attached=true;assertCurrent();}catch(error){rollback(record);attached=false;throw error;}},rollback(){if(attached&&!record.published){rollback(record);attached=false;}},finalize(){assertCurrent();if(!attached)throw Error('Terrain not attached');return finalize(key,record);},onError:fail};try{const withdraw=coordinator.offer(participant);if(typeof withdraw!=='function')throw TypeError('Invalid terrain withdrawal');if(record.released)withdraw();else if(!record.published)record.withdraw=withdraw;}catch(error){fail(error);}}
  else Promise.resolve().then(()=>typeof admission.prepareAndPublish==='function'?admission.prepareAndPublish(group,{signal:controller.signal},commit):Promise.resolve(admission.prepare(group,{signal:controller.signal})).then(commit)).catch(fail);
  // A coordinator can reject synchronously. Tell the owner not to install a
  // logical revision for an object that was already discarded.
  return !record.released;
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
 return {publish,remove,isReady(){return !closed&&unavailable.size===0;},isRayReady,visibleMesh(key){return visible.get(key)?.meshes[0]??null;},isVisible(key,mesh){return visible.get(key)?.meshes[0]===mesh;},dispose(){if(closed)return;closed=true;for(const key of new Set([...pending.keys(),...visible.keys(),...unavailable]))remove(key);}};
}
