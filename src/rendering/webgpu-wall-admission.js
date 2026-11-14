import {NativeWall} from './walls.js';
import {createWebGpuReplacementSlot} from './webgpu-replacement-slot.js';
import {createNativeGateGpuBinding} from './native-gate-gpu-binding.js';

// Keep the current confirmed visual until the actual next topology is ready.
// This owns presentation only; the simulation never waits for admission.
export function createWebGpuAdmittedWall({prototypes,entity,elapsed,pipelineAdmission,resourceRegistry=null,onReady=()=>{},onError=()=>{},setWallPresentation=null,createWall=(assets,value,time,options)=>new NativeWall(assets,value,time,options)}={}){
 if(!prototypes||!entity||typeof createWall!=='function'||setWallPresentation!==null&&typeof setWallPresentation!=='function')throw TypeError('Invalid admitted wall');
 const slot=createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry,onReady,onError,release:wall=>wall.dispose()});let closed=false,gatePreparation=null;
 function update(value,time){
  if(closed)return;
  const base=slot.active??slot.pending;let key=base?.nextConfirmedStageKey(value,time)??null,first=null;
  if(key===null){first=createWall(prototypes,value,time,{previous:null});key=first.stageKey;}
  slot.request(key,previous=>{const wall=first??createWall(prototypes,value,time,{previous});setWallPresentation?.(wall,value);return wall;});
  const selected=slot.active?.stageKey===key?slot.active:slot.pending;
  if(selected!==first)selected?.update(value,undefined,time);if(selected)setWallPresentation?.(selected,value);if(slot.active&&slot.active!==selected)setWallPresentation?.(slot.active,value);
 }
 update(entity,elapsed);
 function prepareNativeGate({presentation,motion,getPickTime,signal}){
  if(closed||signal?.aborted||!slot.upToDate||gatePreparation)throw Error('Native gate wall owner unavailable');
  const wall=slot.active,binding=createNativeGateGpuBinding({wall,presentation,motion,getPickTime});let previous=wall.nativeGpuGate??null;
  let finished=false,activated=false;
  const current=()=>!closed&&!finished&&!signal?.aborted&&gatePreparation===participant&&slot.upToDate&&slot.active===wall&&(activated?binding.current():binding.canActivate());
  const retire=value=>{if(!value)return;const release=()=>value.dispose();if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(wall,release);else release();};
  const participant={request:{object:wall,options:{signal,include:[binding.mesh],materialAlternatives:[{mesh:binding.mesh,material:binding.material}]}},valid:current,
   activate(){if(!current()||activated)throw Error('Native gate preparation became stale');binding.activate();activated=true;},
   finalize(){if(!current()||!activated)throw Error('Native gate not activated');binding.commit();finished=true;gatePreparation=null;retire(previous);previous=null;},
   cancel(){if(finished)return;finished=true;if(gatePreparation===participant)gatePreparation=null;if(activated)binding.rollback();retire(binding);}
  };gatePreparation=participant;return participant;
 }
 return {group:slot.group,update,prepareNativeGate,get nativeGateLease(){return slot.active?.nativeGpuGate?.lease??null;},get ready(){return slot.ready;},get upToDate(){return slot.upToDate;},get parts(){return slot.active?.parts??[];},dispose(){if(closed)return;gatePreparation?.cancel();closed=true;slot.dispose();}};
}
