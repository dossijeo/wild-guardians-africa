import {createPreparedRuinedWallRepair,createRestoredSolidWallRepair} from './webgpu-wall-repair.js';
import {copyNativeHomeArrivalProposal,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference,nativeHomeArrivalSuccessor} from '../world/native-home-arrival.js';
import {copyNativeTaskSettlementProposal,copyNativeTaskSettlementAttestation,sameNativeTaskSettlementReference,nativeTaskSettlementSuccessor} from '../world/native-task-settlement.js';
import {nativeGateStopCodec} from '../world/native-worker-route-stop-codec.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyNativeWorldStopEffects} from '../world/native-suspended-body-reference.js';
import {NativeWall} from './walls.js';
import {createWebGpuReplacementSlot} from './webgpu-replacement-slot.js';
import {createNativeGateGpuBinding,bindRestoredGateRepair} from './native-gate-gpu-binding.js';

// Keep the current confirmed visual until the actual next topology is ready.
// This owns presentation only; the simulation never waits for admission.
export function createWebGpuAdmittedWall({prototypes,entity,elapsed,pipelineAdmission,renderer=null,resourceRegistry=null,onReady=()=>{},onError=()=>{},setWallPresentation=null,prepareInitial=false,presentationClock=null,getPresentationTime=null,getRepairAge=null,createWall=(assets,value,time,options)=>new NativeWall(assets,value,time,options)}={}){
 if(!prototypes||!entity||typeof prepareInitial!=='boolean'||typeof createWall!=='function'||setWallPresentation!==null&&typeof setWallPresentation!=='function')throw TypeError('Invalid admitted wall');
 const inherited=new WeakSet();
 const slot=createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry,onReady:()=>{
  const binding=slot.active?.nativeGpuGate;if(binding&&inherited.has(binding)){binding.commit();inherited.delete(binding);}onReady();
 },onError,release:wall=>wall.dispose()});let closed=false,gatePreparation=null;
 function makeWall(value,time,previous){
  const saved=value.wallPresentation;
  if(!previous&&!value.gate&&value.status==='intact'&&value.hp===value.maxHp&&saved&&saved.from>=0&&saved.from<1&&saved.to===1&&Number.isFinite(time)&&time>=saved.at&&time<saved.at+.48)
   return createRestoredSolidWallRepair({prototypes,entity:value,elapsed:time,renderer,presentationClock,getPresentationTime,getRepairAge});
  const p=value.wallPresentation,restore=!previous&&value.gate===true&&value.status==='intact'&&value.hp===value.maxHp&&p&&p.from>0&&p.from<1&&p.to===1&&Number.isFinite(time)&&time>=p.at&&time<p.at+.48;
  const source=restore?{...value,hp:p.from*value.maxHp,wallPresentation:null}:value;
  const wall=createWall(prototypes,source,time,{previous,renderer});
  if(restore)try{bindRestoredGateRepair({wall,entity:value,elapsed:time,presentationClock,getPresentationTime});}catch(error){wall.dispose();throw error;}
  return wall;
 }
 function update(value,time){
  if(closed)return;
  const base=slot.active??slot.pending;let key=base?.nextConfirmedStageKey(value,time)??null,first=null;
  if(key===null){first=makeWall(value,time,null);key=first.stageKey;}
  slot.request(key,previous=>{
   const wall=first??makeWall(value,time,previous);
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
  const wall=makeWall(entity,elapsed,null);let handed=false;
  try{
   setWallPresentation?.(wall,entity);
   initialParticipant=slot.prepareParticipant(wall.stageKey,()=>{handed=true;return wall;},{initial:true});
  }catch(error){if(!handed)wall.dispose();throw error;}
 }else update(entity,elapsed);
 // This participates in the existing terrain/body transaction without changing
 // material, clock, geometry or ownership. A complete native journal is required.
 function prepareNativeGateRetention({presentation,template,stopEffects,boundary,signal}){
  const codec=nativeGateStopCodec(template);
  if(!codec)throw Error('Native retained gate has no motion family');
  const reference=codec.copyReference(template),effects=copyNativeWorldStopEffects(stopEffects,boundary);
  if(!sameNativeWorldBoundary(reference.worldBoundary,boundary)||!effects||reference.gates.some(g=>g.gateId===presentation.gateId)||effects.gateEffects.rows.some((v,i)=>i%3===0&&v===presentation.gateId))
   throw Error(`Native retained gate requires an unchanged ${codec.kind===24?'Farm':'Task'} stop motor journal`);
  codec.copyProjection({version:1,routeEffects:effects.routeEffects,gateEffects:effects.gateEffects},reference);
  if(closed||!signal||signal.aborted||!slot.upToDate||gatePreparation)throw Error('Native gate wall owner unavailable');
  const wall=slot.active,binding=wall.nativeGpuGate;
  if(!binding)throw Error('Native stopped gate has no resident motor');
  const retained=binding.captureRetention(presentation,boundary);
  let active=true,armed=false,attached=false,finalized=false,accepted=false;
  const valid=()=>active&&!closed&&!signal.aborted&&gatePreparation===part&&slot.upToDate&&slot.active===wall&&retained();
  const check=()=>{if(!valid())throw Error('Native retained gate became stale');};
  const finish=()=>{active=false;if(gatePreparation===part)gatePreparation=null;};
  const part={object:wall,signal,valid,eventRoots:()=>[wall],presentation:()=>({show:[],hide:[]}),
   acceptNativeStopBinding(input){
    check();const proof=codec.copyAttestation(input);
    if(!proof.projection||!codec.sameReference(proof.preparedReference,reference)||proof.reference.gates.some(g=>g.gateId===presentation.gateId)||proof.projection.gateEffects.rows.some((v,i)=>i%3===0&&v===presentation.gateId))
     throw Error('Native retained gate lost its unchanged stop proof');
    accepted=true;return true;
   },
   capturePresentation(record){check();const result=record();check();return result;},
   activate(){check();if(armed)throw Error('Native retained gate already armed');armed=true;return true;},
   attach(){check();if(!armed||attached)throw Error('Native retained gate not armed');attached=true;},
   rollback(){attached=false;armed=false;},
   finalize(){check();if(!accepted||!attached||finalized)throw Error('Native retained gate lacks its final stop receipt');finalized=true;return {retire(){check();finish();},notify(){}};},
   rollbackFinalized(){finalized=false;},
   cancel(){if(!active)return false;finish();return true;}
  };
  gatePreparation=part;return part;
 }

 // The v2 native terminal contract permits publication only if removing its
 // reservation leaves all motors unchanged, rechecked at the source commit.
 function prepareNativeTerminalGateRetention({presentation,resources,signal}){
  const home=resources?.kind==='native-home-arrival-proposal',copy=home?copyNativeHomeArrivalProposal:copyNativeTaskSettlementProposal,
   copyProof=home?copyNativeHomeArrivalAttestation:copyNativeTaskSettlementAttestation,
   same=home?sameNativeHomeArrivalReference:sameNativeTaskSettlementReference,
   successor=home?nativeHomeArrivalSuccessor:nativeTaskSettlementSuccessor,
   key=home?'nativeHomeArrival':'nativeSettlement',proofKey=home?'nativeHomeArrivalBinding':'nativeTaskSettlementBinding';
  let reference=copy(resources)[key];
  if(!(reference.sourceHome??reference.sourceCarry).gateIds.includes(presentation.gateId))throw Error('Native terminal does not own its historical gate');
  if(closed||!signal||signal.aborted||!slot.upToDate||gatePreparation)throw Error('Native gate wall owner unavailable');
  const wall=slot.active,binding=wall.nativeGpuGate;
  if(!binding)throw Error('Native terminal gate has no resident motor');
  const retained=binding.captureRetention(presentation,reference.worldBoundary);let active=true,activated=false;
  const valid=()=>active&&!closed&&!signal.aborted&&gatePreparation===part&&slot.upToDate&&slot.active===wall&&retained();
  const check=()=>{if(!valid())throw Error('Native terminal gate became stale');};
  const finish=()=>{active=false;if(gatePreparation===part)gatePreparation=null;};
  function validateCommit(data){
   check();const proof=copyProof(data?.[proofKey]);
   if(!activated||!same(proof.preparedReference,reference)||!sameNativeWorldBoundary(proof.reference.worldBoundary,data.worldBoundary))throw Error('Native terminal gate differs from its final source');
   return proof;
  }
  // No new shader/material needs admission. The retained frame and Host must
  // still contain and pin the independent motor clock for every source gate.
  const part={requests:[],valid,validateCommit,
   activate(){check();if(activated)throw Error('Native terminal gate already activated');activated=true;},
   rollback(){check();activated=false;},
   retarget(value){
    check();if(activated)throw Error('Native terminal gate must roll back before refresh');
    const next=copy(value);if(!successor(reference,next[key]))return false;
    // valid() pins the same immutable owner; successor() keeps the world
    // monotone. Neither its canonical shape nor its clock changed here.
    reference=next[key];return true;
   },
   finalize(data){validateCommit(data);finish();},
   cancel(){if(!active)return false;finish();return true;}
  };
  gatePreparation=part;return part;
 }

 function prepareNativeRepair({entity,elapsed,signal,template}){
  if(closed||signal?.aborted||gatePreparation||!slot.upToDate||slot.active.gate||slot.active.lastStatus!=='ruined'||slot.active.visual!==0)throw Error('Native Repair wall owner unavailable');
  const wall=createPreparedRuinedWallRepair({prototypes,entity,elapsed,renderer,presentationClock,getPresentationTime,getRepairAge,template});let handed=false;
  try{setWallPresentation?.(wall,entity);const part=slot.prepareParticipant(wall.stageKey,()=>{handed=true;return wall;});return {...part,valid:()=>part.valid()&&wall.nativeGpuRepair?.current()===true};}catch(error){if(!handed)wall.dispose();throw error;}
 }
 function captureNativeRemoval(reference){
  if(closed||gatePreparation||!slot.upToDate||!reference.removal)throw Error('Native gate removal owner unavailable');
  const wall=slot.active,binding=wall.nativeGpuGate??null;
  if(wall.entityId!==reference.removal.entityId||!wall.gate)throw Error('Native gate removal identity mismatch');
  const current=binding?.captureRemoval(reference)??(()=>wall.nativeGpuGate==null);
  return ()=>!closed&&!gatePreparation&&slot.upToDate&&slot.active===wall&&(wall.nativeGpuGate??null)===binding&&current();
 }
 function recoveredStoppedGateCurrent(presentation,opening){
  const wall=slot.active,part=wall?.parts[0],mesh=part?.mesh;
  if(closed||!slot.upToDate||!wall?.gate||wall.entityId!==presentation.entityId||
     wall.lastStatus!=='intact'||wall.visual!==1||wall.gateOpen!==opening||
     wall.parts.length!==1||!mesh?.visible||!wall.visible||
     presentation.modelId!==({zarzas:1,empalizada:2,reforzado:3}[wall.nativeGateMaterial])||
     presentation.positions.length!==part.bridge.pos.length||presentation.leafFlags.length!==part.bridge.leafFlags?.length||
     presentation.positions.some((value,i)=>Math.abs(value-part.bridge.pos[i])>1e-6)||
     presentation.leafFlags.some((value,i)=>value!==part.bridge.leafFlags[i]))return false;
  mesh.updateWorldMatrix(true,false);
  return mesh.matrixWorld.elements.every((value,i)=>Math.abs(value-presentation.rootMatrix[i])<=1e-5);
 }
 function prepareNativeGate({presentation,motion,getPickTime,signal,recoveredStop=false}){
  if(closed||signal?.aborted||!slot.upToDate||gatePreparation)throw Error('Native gate wall owner unavailable');
  const resident=slot.active?.nativeGpuGate;
  if(recoveredStop){
   if(resident||!motion.stoppedSelector||!motion.readyToCommit()||!recoveredStoppedGateCurrent(presentation,presentation.rows[1]))
     throw Error('Recovered stopped gate has no exact replayed wall');
  }else if(motion.stoppedSelector){
   if(!resident)throw Error('Native stopped gate has no resident source');
   resident.captureRetention(presentation,presentation.worldBoundary);
  }
  const wall=slot.active,binding=createNativeGateGpuBinding({wall,presentation,motion,getPickTime,presentationClock,getPresentationTime});let previous=wall.nativeGpuGate??wall.nativeGpuRepair??null;
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
    ...(motion.stoppedSelector?{acceptNativeStopBinding(input){check();return motion.acceptStopProof(input);}}:{}),
    activate(){check();if(armed)throw Error('Native gate chunk already armed');armed=true;return true;},attach(){check();if(!armed)throw Error('Native gate chunk not armed');participant.activate();},
    rollback(){if(activated){binding.rollback();activated=false;}},finalize(){check();if(!activated||finalized)throw Error('Native gate chunk not attached');if(motion.stoppedSelector&&!motion.readyToCommit())throw Error('Native stopped gate lacks its final receipt');finalized=true;return {retire(){check();participant.finalize();active=false;},notify(){}};},rollbackFinalized(){finalized=false;},cancel(){if(!active)return false;active=false;participant.cancel();return true;}};
  };gatePreparation=participant;return participant;
 }
 return {group:slot.group,initialParticipant,update,prepareNativeRepair,captureNativeRemoval,prepareNativeGate,prepareNativeGateRetention,prepareNativeTerminalGateRetention,recoveredStoppedGateCurrent,get nativeGateLease(){return slot.active?.nativeGpuGate?.lease??null;},get ready(){return slot.ready;},get upToDate(){return slot.upToDate;},get parts(){return slot.active?.parts??[];},dispose(){if(closed)return;gatePreparation?.cancel();closed=true;slot.dispose();}};
}
