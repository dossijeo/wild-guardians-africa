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

export function createWebGpuVillagePreview({scene,surface,assetsFor,pipelineAdmission,onError=()=>{},onChange=()=>{}}={}){
 if(!scene?.isScene||typeof surface!=='function'||typeof assetsFor!=='function'||typeof pipelineAdmission?.prepare!=='function'||typeof onError!=='function'||typeof onChange!=='function')throw TypeError('Invalid village preview');
 const material=new THREE.MeshBasicMaterial({color:0xf0e5b9,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide});let slot=null,current=null,epoch=0,closed=false;
 function refresh(){
  if(closed||!current)return;const assets=assetsFor(current.culture);if(!assets)return;
  material.color.set(current.pending?'#f0e5b9':current.valid?'#d4f3c2':'#f4a198');
  if(!slot){slot=createWebGpuAdmittedVillage({pipelineAdmission,onReady:()=>{if(slot){slot.group.visible=slot.upToDate;onChange();}},onError});slot.group.visible=false;scene.add(slot.group);}
  const key=JSON.stringify([epoch,current.culture,current.buildings.map(item=>[item.key,item.x,item.z,item.yaw??0])]);
  slot.update(key,()=>buildWebGpuVillage(assets,current.buildings,surface,{material,castShadow:false}));slot.group.visible=slot.upToDate;onChange();
 }
 function clear(){current=null;if(slot){scene.remove(slot.group);slot.dispose();slot=null;onChange();}}
 return {show(preview){if(closed)throw Error('Village preview closed');if(!preview||typeof preview.culture!=='string'||!Array.isArray(preview.buildings)||preview.buildings.length>1024||preview.buildings.some(item=>typeof item?.key!=='string'||![item.x,item.z,item.yaw??0].every(Number.isFinite)))throw TypeError('Invalid village preview');current=preview;refresh();},clear,terrainChanged(){if(closed)return;epoch++;refresh();},get visible(){return slot?.group.visible??false;},dispose(){if(closed)return;closed=true;clear();material.dispose();}};
}
