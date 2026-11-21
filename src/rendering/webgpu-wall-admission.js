import {NativeWall} from './walls.js';
import {createWebGpuReplacementSlot} from './webgpu-replacement-slot.js';
import {createNativeGateGpuBinding} from './native-gate-gpu-binding.js';

// Keep the current confirmed visual until the actual next topology is ready.
// This owns presentation only; the simulation never waits for admission.
export function createWebGpuAdmittedWall({prototypes,entity,elapsed,pipelineAdmission,renderer=null,resourceRegistry=null,onReady=()=>{},onError=()=>{},setWallPresentation=null,prepareInitial=false,presentationClock=null,getPresentationTime=null,createWall=(assets,value,time,options)=>new NativeWall(assets,value,time,options)}={}){
 if(!prototypes||!entity||typeof prepareInitial!=='boolean'||typeof createWall!=='function'||setWallPresentation!==null&&typeof setWallPresentation!=='function')throw TypeError('Invalid admitted wall');
 const inherited=new WeakSet();
 const slot=createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry,onReady:()=>{
  const binding=slot.active?.nativeGpuGate;if(binding&&inherited.has(binding)){binding.commit();inherited.delete(binding);}onReady();
 },onError,release:wall=>wall.dispose()});let closed=false,gatePreparation=null;
 function update(value,time){
  if(closed)return;
  const base=slot.active??slot.pending;let key=base?.nextConfirmedStageKey(value,time)??null,first=null;
  if(key===null){first=createWall(prototypes,value,time,{previous:null,renderer});key=first.stageKey;}
  slot.request(key,previous=>{
   const wall=first??createWall(prototypes,value,time,{previous,renderer});
   try{
    setWallPresentation?.(wall,value);
    if(previous?.nativeGpuGate){
     // Same slot/root; the old shape remains visible through admission. Attach
     // the hidden candidate before checking the native mechanism transform.
     wall.visible=false;slot.group.add(wall);
     inherited.add(previous.nativeGpuGate.prepareReplacement(wall));
    }
    return wall;
   }catch(error){slot.group.remove(wall);wall.dispose();throw error;}
  });
  const selected=slot.active?.stageKey===key?slot.active:slot.pending;
  if(selected!==first)selected?.update(value,undefined,time);if(selected)setWallPresentation?.(selected,value);if(slot.active&&slot.active!==selected)setWallPresentation?.(slot.active,value);
 }
 let initialParticipant=null;
 if(prepareInitial){
  const wall=createWall(prototypes,entity,elapsed,{previous:null,renderer});let handed=false;
  try{
   setWallPresentation?.(wall,entity);
   initialParticipant=slot.prepareParticipant(wall.stageKey,()=>{handed=true;return wall;},{initial:true});
  }catch(error){if(!handed)wall.dispose();throw error;}
 }else update(entity,elapsed);
 function prepareNativeGate({presentation,motion,getPickTime,signal}){
  if(closed||signal?.aborted||!slot.upToDate||gatePreparation)throw Error('Native gate wall owner unavailable');
  const wall=slot.active,binding=createNativeGateGpuBinding({wall,presentation,motion,getPickTime,presentationClock,getPresentationTime});let previous=wall.nativeGpuGate??null;
  let finished=false,activated=false;
  const current=()=>!closed&&!finished&&!signal?.aborted&&gatePreparation===participant&&slot.upToDate&&slot.active===wall&&(activated?binding.current():binding.canActivate());
  const retire=value=>{if(!value)return;const release=()=>value.dispose();if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(wall,release);else release();};
  const participant={request:{object:wall,options:{signal,include:binding.materialAlternatives.map(r=>r.mesh),materialAlternatives:binding.materialAlternatives}},valid:current,
   rollback(){if(!current())throw Error('Native gate rollback unavailable');if(activated){binding.rollback();activated=false;}},
   retarget(presentation,options){if(!current()||activated)throw Error('Native gate retarget unavailable');return binding.retarget(presentation,options);},
   activate(){if(!current()||activated)throw Error('Native gate preparation became stale');binding.activate();activated=true;},
   finalize(){if(!current()||!activated)throw Error('Native gate not activated');binding.commit();finished=true;gatePreparation=null;retire(previous);previous=null;},
   cancel(){if(finished)return;finished=true;if(gatePreparation===participant)gatePreparation=null;if(activated)binding.rollback();retire(binding);}
  };
  participant.chunkParticipant=()=>{
   if(!signal||!current())throw Error('Native gate chunk preparation unavailable');let active=true,armed=false,finalized=false;
   const valid=()=>active&&current(),check=()=>{if(!valid())throw Error('Native gate chunk changed');};
   return {object:wall,signal,include:binding.materialAlternatives.map(r=>r.mesh),materialAlternatives:participant.request.options.materialAlternatives,valid,eventRoots:()=>[wall],presentation:()=>({show:[],hide:[]}),capturePresentation:record=>{check();return binding.capturePresentation(record);},
    activate(){check();if(armed)throw Error('Native gate chunk already armed');armed=true;return true;},attach(){check();if(!armed)throw Error('Native gate chunk not armed');participant.activate();},
    rollback(){if(activated){binding.rollback();activated=false;}},finalize(){check();if(!activated||finalized)throw Error('Native gate chunk not attached');finalized=true;return {retire(){check();participant.finalize();active=false;},notify(){}};},rollbackFinalized(){finalized=false;},cancel(){if(!active)return false;active=false;participant.cancel();return true;}};
  };gatePreparation=participant;return participant;
 }
 return {group:slot.group,initialParticipant,update,prepareNativeGate,get nativeGateLease(){return slot.active?.nativeGpuGate?.lease??null;},get ready(){return slot.ready;},get upToDate(){return slot.upToDate;},get parts(){return slot.active?.parts??[];},dispose(){if(closed)return;gatePreparation?.cancel();closed=true;slot.dispose();}};
}
