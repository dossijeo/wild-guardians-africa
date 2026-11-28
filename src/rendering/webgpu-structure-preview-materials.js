import * as THREE from 'three';

let nextPreviewMaterial=0;

// Requested when a construction tool is selected, not on the first draw.
// The admission objects are never attached to the visible scene.
export function createWebGpuStructurePreviewMaterials({pipelineAdmission=null,resourceRegistry=null,signal}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function')throw TypeError('Invalid preview admission');
 const materials=new Map(),leases=new Map(),requests=new Map();let closed=false;
 function material(kind,side=THREE.DoubleSide){
  if(closed)throw Error('Structure preview materials disposed');const key=kind+':'+side;let value=materials.get(key);if(value)return value;
  if(kind==='center')value=new THREE.MeshBasicMaterial({color:0xc9e6bc,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});
  else if(kind==='wall')value=new THREE.MeshBasicMaterial({color:0x9cb67b,transparent:true,opacity:.5,depthWrite:false,side,toneMapped:false});
  else throw TypeError('Invalid structure preview material');if(resourceRegistry){let lease;try{lease=resourceRegistry.adopt({namespace:'structure-preview-material',key:String(++nextPreviewMaterial),dispose:()=>value.dispose()});lease.commit();leases.set(value,lease);}catch(error){if(lease)lease.release();else value.dispose();throw error;}}materials.set(key,value);return value;
 }
 function prepare(kind,key,assets){
  if(closed)return Promise.reject(Error('Structure preview materials disposed'));if(!['center','wall'].includes(kind)||typeof key!=='string'||!key||!assets)return Promise.reject(TypeError('Invalid structure preview request'));
  const id=kind+':'+key,existing=requests.get(id);if(existing)return existing.promise;
  const group=new THREE.Group(),temporary=[];
  try{
   if(kind==='center'){const clone=assets.group.clone(true),paint=material('center');clone.traverse(node=>{if(node.isMesh)node.material=paint;});group.add(clone);}
   else for(const suffix of ['intacto','puerta']){const prototype=assets[key+'_'+suffix];if(!prototype?.isMesh)continue;const mesh=new THREE.InstancedMesh(prototype.geometry,material('wall',prototype.material.side),1);group.add(mesh);temporary.push(mesh);}
   if(!group.children.length)throw Error('Missing structure preview geometry');
  }catch(error){for(const mesh of temporary)mesh.dispose();return Promise.reject(error);}
  const entry={ready:false,promise:null};requests.set(id,entry);
  const release=()=>{for(const mesh of temporary)mesh.dispose();group.clear();};
  entry.promise=Promise.resolve().then(()=>{if(closed||signal?.aborted)throw new DOMException('Structure preview cancelled','AbortError');return pipelineAdmission?.prepare(group,{signal});}).then(()=>{if(closed||signal?.aborted)throw new DOMException('Structure preview cancelled','AbortError');entry.ready=true;}).catch(error=>{if(requests.get(id)===entry)requests.delete(id);throw error;}).finally(()=>{if(typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(group,release);else release();});return entry.promise;
 }
 return {prepare,ready(kind,key){return requests.get(kind+':'+key)?.ready===true;},center(){return material('center');},wall(prototype){return material('wall',prototype.material.side);},dispose(){if(closed)return;closed=true;requests.clear();const owned=[...materials.values()];materials.clear();const release=()=>{for(const value of owned){const lease=leases.get(value);if(lease){leases.delete(value);lease.release();}else value.dispose();}};if(typeof pipelineAdmission?.deferCompilations==='function')pipelineAdmission.deferCompilations(release);else release();}};
}
