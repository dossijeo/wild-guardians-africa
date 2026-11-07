import {NativeWall} from './walls.js';
import {createWebGpuReplacementSlot} from './webgpu-replacement-slot.js';

// Keep the current confirmed visual until the actual next topology is ready.
// This owns presentation only; the simulation never waits for admission.
export function createWebGpuAdmittedWall({prototypes,entity,elapsed,pipelineAdmission,resourceRegistry=null,onReady=()=>{},onError=()=>{},createWall=(assets,value,time,options)=>new NativeWall(assets,value,time,options)}={}){
 if(!prototypes||!entity||typeof createWall!=='function')throw TypeError('Invalid admitted wall');
 const slot=createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry,onReady,onError,release:wall=>wall.dispose()});let closed=false;
 function update(value,time){
  if(closed)return;
  const base=slot.active??slot.pending;let key=base?.nextConfirmedStageKey(value,time)??null,first=null;
  if(key===null){first=createWall(prototypes,value,time,{previous:null});key=first.stageKey;}
  slot.request(key,previous=>first??createWall(prototypes,value,time,{previous}));
  const selected=slot.active?.stageKey===key?slot.active:slot.pending;
  if(selected!==first)selected?.update(value,undefined,time);
 }
 update(entity,elapsed);
 return {group:slot.group,update,get ready(){return slot.ready;},get upToDate(){return slot.upToDate;},get parts(){return slot.active?.parts??[];},dispose(){if(closed)return;closed=true;slot.dispose();}};
}
