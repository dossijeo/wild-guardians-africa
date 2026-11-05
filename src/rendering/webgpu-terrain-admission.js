// Keep confirmed terrain state independent from its graphical admission. The
// previous visible revision remains until the replacement has been prepared.
export function createTerrainAdmission({scene,admission,onError=()=>{},onPublished=()=>{}}){
 if(!scene?.isScene||typeof admission?.prepare!=='function'||typeof onError!=='function'||typeof onPublished!=='function')throw TypeError('Invalid terrain admission');
 const pending=new Map(),visible=new Map(),unavailable=new Set();let closed=false;
 function release(record){
  if(!record||record.released)return;record.released=true;record.controller.abort();
  if(record.published)for(const mesh of record.meshes)mesh.removeFromParent();
  const dispose=()=>{for(const mesh of record.meshes)mesh.removeFromParent();record.dispose();};
  if(typeof admission.deferRelease==='function')admission.deferRelease(record.group,dispose);else dispose();
 }
 function publish(key,group,meshes,dispose){
  if(closed)throw Error('Terrain admission closed');
  const previous=pending.get(key);if(previous){pending.delete(key);release(previous);}
  const controller=new AbortController(),record={group,meshes,dispose,controller,released:false};pending.set(key,record);unavailable.add(key);
  Promise.resolve().then(()=>admission.prepare(group,{signal:controller.signal})).then(()=>{
   if(closed||pending.get(key)!==record||controller.signal.aborted)return;
   pending.delete(key);const old=visible.get(key);for(const mesh of meshes)scene.add(mesh);record.published=true;visible.set(key,record);unavailable.delete(key);release(old);onPublished(key);
  }).catch(error=>{if(closed||pending.get(key)!==record||controller.signal.aborted)return;pending.delete(key);release(record);onError(error);});
 }
 function remove(key){const item=pending.get(key);pending.delete(key);release(item);const old=visible.get(key);visible.delete(key);release(old);unavailable.delete(key);}
 return {publish,remove,isReady(){return !closed&&unavailable.size===0;},isVisible(key,mesh){return visible.get(key)?.meshes[0]===mesh;},dispose(){if(closed)return;closed=true;for(const key of new Set([...pending.keys(),...visible.keys(),...unavailable]))remove(key);}};
}
