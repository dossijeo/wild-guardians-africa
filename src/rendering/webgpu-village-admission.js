import {createWebGpuReplacementSlot} from './webgpu-replacement-slot.js';

// Candidate groups contain the actual confirmed layout and share their banks'
// geometry and materials. Only the container is owned here.
export function createWebGpuAdmittedVillage({pipelineAdmission,resourceRegistry=null,onReady=()=>{},onError=()=>{}}={}){
 const slot=createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry,onReady,onError,release:object=>object.clear()});let closed=false;
 function update(key,build){
  if(closed)return;if(typeof key!=='string'||typeof build!=='function')throw TypeError('Invalid village layout');
  slot.request(key,()=>{const object=build();if(!object?.isGroup)throw TypeError('Village layout must be a group');return object;});
 }
 return {group:slot.group,update,get ready(){return slot.ready;},get upToDate(){return slot.upToDate;},get meshes(){return slot.active?.children??[];},dispose(){if(closed)return;closed=true;slot.dispose();}};
}
