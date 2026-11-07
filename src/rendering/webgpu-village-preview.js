import * as THREE from 'three';
import {createWebGpuAdmittedVillage} from './webgpu-village-admission.js';

export function villagePreviewReconciled(entry,confirmed){
 return !!(entry?.group.visible&&confirmed&&(entry.village?.meshes??entry.group.children).length===confirmed.buildings.length&&(!entry.village||entry.village.upToDate));
}

// Confirmed villages and placement previews use the same authored geometry and
// terrain placement; only the preview material and shadow behavior differ.
export function buildWebGpuVillage(assets,buildings,surface,{material=null,castShadow=true}={}){
 const group=new THREE.Group();
 for(const item of buildings){
  const proto=assets.get(item.key),height=surface(item.x,item.z);if(!proto||height===null)continue;
  const {unit,geometry}=proto,yaw=item.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),cx=(unit.min[0]+unit.max[0])*8,cz=(unit.min[2]+unit.max[2])*8;
  const mesh=new THREE.Mesh(geometry,material??proto.material);mesh.scale.setScalar(16);mesh.rotation.y=yaw;mesh.position.set(item.x-cx*c-cz*s,height-unit.min[1]*16+.018,item.z+cx*s-cz*c);mesh.castShadow=mesh.receiveShadow=castShadow;group.add(mesh);
 }
 return group;
}

let nextVillagePreview=0;
export function createWebGpuVillagePreview({scene,surface,assetsFor,pipelineAdmission,resourceRegistry=null,indicator=null,onError=()=>{},onChange=()=>{}}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!scene?.isScene||typeof surface!=='function'||typeof assetsFor!=='function'||typeof pipelineAdmission?.prepare!=='function'||indicator!==null&&(['show','remove'].some(key=>typeof indicator?.[key]!=='function'))||typeof onError!=='function'||typeof onChange!=='function')throw TypeError('Invalid village preview');
 const material=new THREE.MeshBasicMaterial({color:0xf0e5b9,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide});let lease;try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'village-preview-material',key:String(++nextVillagePreview),dispose:()=>material.dispose()});lease.commit();}}catch(error){if(lease)lease.release();else material.dispose();throw error;}let slot=null,current=null,epoch=0,closed=false;const indicatorId='@village-preview';
 function syncIndicator(){if(!indicator)return;indicator.remove(indicatorId);if(!current||slot?.group.visible||![current.x,current.z].every(Number.isFinite))return;const y=surface(current.x,current.z);if(Number.isFinite(y))indicator.show(indicatorId,{x:current.x,y,z:current.z,width:3,depth:3});}
 function refresh(){
  if(closed||!current)return;const assets=assetsFor(current.culture);
  // Never publish a partial layout or keep an obsolete one visible while a
  // building's geometry or confirmed ground height is unavailable.
  if(!assets||current.buildings.some(item=>!assets.has(item.key)||!Number.isFinite(surface(item.x,item.z)))){if(slot){scene.remove(slot.group);slot.dispose();slot=null;onChange();}syncIndicator();return;}
  material.color.set(current.pending?'#f0e5b9':current.valid?'#d4f3c2':'#f4a198');
  if(!slot){slot=createWebGpuAdmittedVillage({pipelineAdmission,resourceRegistry,onReady:()=>{if(slot){slot.group.visible=slot.upToDate;syncIndicator();onChange();}},onError});slot.group.visible=false;scene.add(slot.group);}
  const key=JSON.stringify([epoch,current.culture,current.buildings.map(item=>[item.key,item.x,item.z,item.yaw??0])]);
  slot.update(key,()=>buildWebGpuVillage(assets,current.buildings,surface,{material,castShadow:false}));slot.group.visible=slot.upToDate;syncIndicator();onChange();
 }
 function clear(){current=null;syncIndicator();if(slot){scene.remove(slot.group);slot.dispose();slot=null;onChange();}}
 return {show(preview){if(closed)throw Error('Village preview closed');if(!preview||typeof preview.culture!=='string'||!Array.isArray(preview.buildings)||preview.buildings.length>1024||preview.buildings.some(item=>typeof item?.key!=='string'||![item.x,item.z,item.yaw??0].every(Number.isFinite)))throw TypeError('Invalid village preview');current=preview;refresh();},clear,assetsReady(culture){if(!closed&&current?.culture===culture)refresh();},terrainChanged(){if(closed)return;epoch++;refresh();},get active(){return current!==null;},get waitingVisible(){return indicator?.has?.(indicatorId)===true;},get visible(){return slot?.group.visible??false;},dispose(){if(closed)return;closed=true;clear();const release=()=>{if(lease)lease.release();else material.dispose();};if(typeof pipelineAdmission.deferCompilations==='function')pipelineAdmission.deferCompilations(release);else release();}};
}
