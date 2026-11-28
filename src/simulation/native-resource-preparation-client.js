import {copyNativeAnimalCropAttestation,sameNativeAnimalCropReference} from '../world/native-animal-crop-resource.js';
import {centerSource,sameCenter,matchesCenterRuinCommit} from '../world/native-center-ruin-source.js';
import {copyNativeShieldWorld,sameNativeShieldWorld} from '../world/native-shield-world.js';
import {terrainStopProposalProtocol,hasOtherTerrainStopField} from './terrain-stop-reservation.js';
import {nativeResourceAdmissionProfile} from '../world/native-resource-admission-profiles.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyNativeBarrierAdditionAttestation} from '../world/native-barrier-addition.js';
import {matchesNativeGateMotionSubmission} from '../world/native-gate-motion-resources.js';

// The existing retained-resource protocol, shared by presentation coordination
// and the authority's direct preparation connection. No device or scene owner.
export function createNativeResourcePreparationClient({allocateId,pending,postMessage,isRunning,hasDirectControl,timeoutMs=0}){
 function request(id,message){return new Promise((resolve,reject)=>{let timer;const settle=fn=>value=>{clearTimeout(timer);fn(value);};pending.set(id,{resolve:settle(resolve),reject:settle(reject)});if(timeoutMs){timer=setTimeout(()=>{const item=pending.get(id);pending.delete(id);item?.reject(Error('Native resource preparation timed out'));},timeoutMs);timer.unref?.();}try{postMessage(message);}catch(error){const item=pending.get(id);pending.delete(id);item.reject(error);}});}
 function prepareNativeGateResources(resources,options){return prepareNativeResources(resources,options);}
 function prepareNativeBarrierAdditionResources(resources,options={}){if(resources?.kind!=='native-barrier-addition-proposal')return Promise.reject(TypeError('Expected native solid addition proposal'));return prepareNativeResources(resources,{...options,deferredStart:true},'barrier-addition');}
 function prepareNativeResumeResources(resources,options){if(resources?.kind!=='native-route-resume-proposal')return Promise.reject(TypeError('Expected native resume proposal'));return prepareNativeResources(resources,options,'resume');}
 function prepareNativeTaskStartResources(resources,options={}){if(resources?.kind!=='native-task-start-proposal')return Promise.reject(TypeError('Expected first-task proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'task-start');}
 function prepareNativeTaskActionResources(resources,options={}){if(resources?.kind!=='native-task-action-proposal')return Promise.reject(TypeError('Expected native action proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'task-action');}
 function prepareNativeTaskConsequenceResources(resources,options={}){if(resources?.kind!=='native-task-consequence-proposal')return Promise.reject(TypeError('Expected native consequence proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'task-consequence');}
 function prepareNativeHomeArrivalResources(resources,options={}){if(resources?.kind!=='native-home-arrival-proposal')return Promise.reject(TypeError('Expected native Home arrival proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'home-arrival');}
 function prepareNativeAnimalCropRouteResources(resources,options={}){if(resources?.kind!=='native-animal-crop-route-proposal')return Promise.reject(TypeError('Expected native crop route proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'animal-crop-route');}
 function prepareNativeAnimalCropStrikeResources(resources,options={}){if(resources?.kind!=='native-animal-crop-strike-proposal')return Promise.reject(TypeError('Expected native crop strike proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'animal-crop-strike');}
 function prepareNativeFarmArrivalResources(resources,options={}){if(resources?.kind!=='native-farm-arrival-route-proposal')return Promise.reject(TypeError('Expected native farm arrival proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'farm-arrival');}
 function prepareNativeHomeRouteResources(resources,options={}){if(resources?.kind!=='native-home-route-proposal')return Promise.reject(TypeError('Expected native Home route proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'home-route');}
 function prepareNativeTaskSettlementResources(resources,options={}){if(resources?.kind!=='native-task-settlement-proposal')return Promise.reject(TypeError('Expected native settlement proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'task-settlement');}
 function prepareNativeInitialIdleBodyResources(resources,options={}){if(resources?.kind!=='native-initial-idle-body-proposal')return Promise.reject(TypeError('Expected native initial Idle body proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'initial-idle-body');}
 function prepareNativeIdleCycleResources(resources,options={}){if(resources?.kind!=='native-idle-cycle-proposal')return Promise.reject(TypeError('Expected native Idle cycle proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'idle-cycle');}
 function prepareNativeIdleStrollResources(resources,options={}){if(resources?.kind!=='native-idle-stroll-proposal')return Promise.reject(TypeError('Expected native Idle stroll proposal'));return prepareNativeResources(resources,{...options,deferredStart:options.deferredStart??true},'idle-stroll');}
 async function prepareNativeShieldGeometry(source,{signal,minSequence}){
  const shield=copyNativeShieldWorld(source,3,{proposal:true});
  if(!isRunning()||!hasDirectControl()||signal.aborted||!Number.isSafeInteger(minSequence)||minSequence<0)throw Error('Native Shield geometry unavailable');
  const id=allocateId();let active=true;
  function abort(){
   if(!active)return;
   active=false;signal.removeEventListener('abort',abort);
   const item=pending.get(id);pending.delete(id);item?.reject(new DOMException('Shield geometry cancelled','AbortError'));
   postMessage({kind:'abortNativeGateResources',id});
  }
  signal.addEventListener('abort',abort,{once:true});
  try{
   const ack=await request(id,{kind:'prepareNativeShieldGeometry',id,resources:shield,minSequence});
   if(!active||ack?.version!==1||!sameNativeShieldWorld(shield,copyNativeShieldWorld(ack.shieldGeometry,3,{proposal:true})))throw Error('Invalid native Shield geometry receipt');
   return {abort,valid:()=>active&&!signal.aborted,async capture(resources,options){
    if(!active||signal.aborted||resources.kind!==3||!sameNativeShieldWorld(shield,resources.nativeShield))throw Error('Shield geometry belongs to another proposal');
    // Transfer cancellation to the fresh packet on this same request.
    const capturing=prepareNativeResources(resources,options,null,id);
    const handle=await capturing;
    if(!active){handle.abort();throw Error('Shield geometry cancelled during capture');}
    active=false;signal.removeEventListener('abort',abort);return handle;
   }};
  }catch(error){abort();throw error;}
 }
 async function prepareNativeResources(resources,{signal,minSequence=-1,terrainManifest,deferredStart=false,nativeBarrierWallEntities,encounterRetreat,confirmGateMotion=false}={},resourceKind=null,geometryId=null){
  const resumed=resourceKind!==null,stop=resumed?null:terrainStopProposalProtocol(resources);
  const barrier=resourceKind==='barrier-addition';
  const ruin=resources?.kind==='native-center-ruin-proposal';
  const center=ruin?centerSource(resources.nativeCenterRuin):null;
  if(ruin&&(resources.version!==1||resumed||stop||geometryId!==null||!sameNativeWorldBoundary(center.boundary,resources.worldBoundary)))throw Error('Invalid center ruin resource request');
  const profile=stop?null:nativeResourceAdmissionProfile(resourceKind??'resume');
  const same=stop?.codec.sameReference??profile.sameReference,reference=stop?.codec.referenceFromProposal??profile.reference;
  const templateKey=stop?.preparedTemplateField??profile.templateField,preparedStop=stop?reference(resources):null,preparedBarrier=barrier?reference(resources):null;
  const resourceClass={'animal-crop-route':'AnimalCropRoute','animal-crop-strike':'AnimalCropStrike',resume:'Resume','barrier-addition':'BarrierAddition','task-start':'TaskStart','task-action':'TaskAction','task-consequence':'TaskConsequence','task-settlement':'TaskSettlement','initial-idle-body':'InitialIdleBody','idle-cycle':'IdleCycle','idle-stroll':'IdleStroll','farm-arrival':'FarmArrival','home-route':'HomeRoute','home-arrival':'HomeArrival'}[resourceKind??'resume'];
  if(!isRunning()||!hasDirectControl()||signal?.aborted||!Number.isSafeInteger(minSequence)||minSequence< -1)throw Error('Native gate resources require direct draw control');
  if(barrier?!Array.isArray(nativeBarrierWallEntities):nativeBarrierWallEntities!==undefined)throw TypeError('Invalid native wall presentation declaration');
  if(typeof deferredStart!=='boolean'||deferredStart&&!resumed||resumed&&resourceKind!=='resume'&&!deferredStart)throw TypeError('Invalid native deferred start');
  if(encounterRetreat&&(resourceKind!=='animal-crop-route'||resources.reference.purpose!=='retreat'))
    throw Error('Encounter preparation requires a Retreat route');
  if(typeof confirmGateMotion!=='boolean'||confirmGateMotion&&(resumed||stop||geometryId!==null||resources?.kind!==12||
     resources.phase!=='proposal'||!resources.gates?.length))throw Error('Submission confirmation requires a gate motor proposal');
  const id=geometryId??allocateId();let stage='preparing';
  const abort=()=>{if(stage==='committed'||stage==='aborted')return;stage='aborted';signal?.removeEventListener('abort',abort);const request=pending.get(id);pending.delete(id);request?.reject(new DOMException('Native gate preparation cancelled','AbortError'));try{postMessage({kind:'abortNativeGateResources',id});}catch{}};
  signal?.addEventListener('abort',abort,{once:true});
  try{let prepared=await request(id,{kind:geometryId!==null?'captureNativeShieldResources':resumed?`prepareNative${resourceClass}Resources`:'prepareNativeGateResources',id,resources,minSequence,...(resumed?{terrainManifest,...(deferredStart?{deferredStart:true}:{})}: {}),...(barrier?{nativeBarrierWallEntities}:{}),...(encounterRetreat?{encounterRetreat}:{}),...(confirmGateMotion?{confirmGateMotion:true}:{})});
   if(stage==='aborted')throw new DOMException('Native gate preparation cancelled','AbortError');
   if(ruin!==(prepared?.preparedCenterRuin!==undefined)||ruin&&!sameCenter(center,prepared.preparedCenterRuin))throw Error('Invalid center ruin resource receipt');
   if(hasOtherTerrainStopField(prepared,'preparedTemplateField',stop))throw Error('Native stop receipt has another family');if(barrier!==(prepared.preparedBarrierAdditionTemplate!==undefined))throw Error('Native solid addition receipt has another family');if(!prepared.preparedWorldBoundary||!sameNativeWorldBoundary(copyNativeWorldBoundary(prepared.preparedWorldBoundary),copyNativeWorldBoundary(resources.worldBoundary)))throw Error('Native gate lacks its prepared command receipt');stage='ready';if((deferredStart||stop)&&!same(prepared[templateKey],preparedStop??preparedBarrier??reference(resources)))throw Error('Native resume lacks its prepared template receipt');
   if((encounterRetreat||confirmGateMotion)&&(!Number.isSafeInteger(prepared.preparedFrameSequence)||prepared.preparedFrameSequence<1))
     throw Error(confirmGateMotion?'Gate motor READY lacks the consumer packet':'Encounter READY lacks the consumer packet');
   return {...(encounterRetreat||confirmGateMotion?{get preparedFrameSequence(){return prepared.preparedFrameSequence;},async commitAndWaitForSubmission(commit){
    if(!isRunning()||stage!=='ready'||signal?.aborted)throw Error(confirmGateMotion?'Gate motor submission unavailable':'Encounter resource commit unavailable');
    const binding=encounterRetreat&&copyNativeAnimalCropAttestation(commit.nativeAnimalCropRouteBinding,26);
    const boundary=copyNativeWorldBoundary(commit.worldBoundary);
    if(binding?(!sameNativeAnimalCropReference(binding.preparedReference,resources.reference)||
       !sameNativeWorldBoundary(binding.reference.worldBoundary,boundary)||boundary.effectiveTime!==encounterRetreat.source.at):
       !sameNativeWorldBoundary(boundary,resources.worldBoundary))
       throw Error(confirmGateMotion?'Gate motor commit differs from its retained packet':'Encounter commit differs from its retained packet');
    stage='submitting';
    try{
      const value=await request(id,{kind:confirmGateMotion?'commitGateMotionWithSubmission':'commitEncounterRetreatResources',id,commit});
      const sequence=prepared.preparedFrameSequence;
      if(stage!=='submitting'||signal?.aborted||(confirmGateMotion?!matchesNativeGateMotionSubmission(value,resources,sequence):
         value?.version!==1||value.sequence!==sequence||value.assignment!==binding.assignmentSequence||
         !sameNativeWorldBoundary(copyNativeWorldBoundary(value.worldBoundary),boundary)||value.elapsed!==boundary.effectiveTime))
        throw Error(confirmGateMotion?'Invalid gate motor submission receipt':'Invalid encounter submission receipt');
      stage='committed';signal?.removeEventListener('abort',abort);return value;
    }catch(error){abort();throw error;}
   }}:{}),get preparedCenterRuin(){return prepared.preparedCenterRuin;},get [templateKey](){return deferredStart||stop?prepared[templateKey]:undefined;},get preparedWorldBoundary(){return prepared.preparedWorldBoundary;},...(resumed&&!barrier?{invalidate(){if(!isRunning()||stage==='committed'||stage==='aborted'||signal?.aborted)return false;if(stage==='invalidated')return true;if(stage!=='ready')return false;stage='invalidated';postMessage({kind:`invalidateNative${resourceClass}Resources`,id});return true;},async refresh(next,{terrainManifest:manifest=terrainManifest}={}){
    if(!isRunning()||!['ready','invalidated'].includes(stage)||signal?.aborted||next?.kind!==profile.proposalKind)throw Error('Native resume resource refresh unavailable');stage='refreshing';
    try{const result=await request(id,{kind:`refreshNative${resourceClass}Resources`,id,resources:next,terrainManifest:manifest});if(stage==='aborted'||signal?.aborted)throw new DOMException('Native resume refresh cancelled','AbortError');if(hasOtherTerrainStopField(result,'preparedTemplateField'))throw Error('Native stop receipt has another family');if(result.reusable===false){stage='aborted';signal?.removeEventListener('abort',abort);return false;}if(!sameNativeWorldBoundary(copyNativeWorldBoundary(result.preparedWorldBoundary),copyNativeWorldBoundary(next.worldBoundary)))throw Error('Native refreshed packet names another proposal');if(deferredStart&&!same(result[templateKey],reference(next)))throw Error('Native refreshed packet lacks its deferred template');prepared=result;resources=next;terrainManifest=manifest;stage='ready';return true;}catch(error){abort();throw error;}
   }}:{}),valid:()=>isRunning()&&stage==='ready'&&!signal?.aborted,commit(commit){
    if(encounterRetreat||confirmGateMotion||!isRunning()||stage!=='ready'||signal?.aborted)return false;
    if(ruin!==(commit?.nativeCenterRuin!==undefined)||ruin&&!matchesCenterRuinCommit(center,commit))throw Error('Invalid center ruin resource commit');
    if(hasOtherTerrainStopField(commit,'bindingField',stop))throw Error('Native stop resource commit has another family');
    if(stop){const proof=stop.codec.copyAttestation(commit?.[stop.bindingField]);if(!proof.projection||!same(proof.preparedReference,preparedStop)||!sameNativeWorldBoundary(proof.reference.worldBoundary,copyNativeWorldBoundary(commit.worldBoundary)))throw Error('Native stop resource commit differs from retained template');}
    if(barrier!==(commit?.nativeBarrierAdditionBinding!==undefined))throw Error('Native solid addition commit has another family');
    if(barrier){const proof=copyNativeBarrierAdditionAttestation(commit.nativeBarrierAdditionBinding);if(!same(proof.preparedReference,preparedBarrier)||!sameNativeWorldBoundary(proof.reference.worldBoundary,copyNativeWorldBoundary(commit.worldBoundary)))throw Error('Native solid addition commit differs from retained template');}
    postMessage({kind:'commitNativeGateResources',id,commit});stage='committed';signal?.removeEventListener('abort',abort);return true;
   },abort(){abort();signal?.removeEventListener('abort',abort);}};
  }catch(error){abort();signal?.removeEventListener('abort',abort);throw error;}
 }
 return {prepareNativeShieldGeometry,prepareNativeAnimalCropRouteResources,prepareNativeAnimalCropStrikeResources,prepareNativeFarmArrivalResources,prepareNativeIdleStrollResources,prepareNativeHomeArrivalResources,prepareNativeGateResources,prepareNativeBarrierAdditionResources,prepareNativeResumeResources,prepareNativeTaskStartResources,prepareNativeTaskActionResources,prepareNativeTaskConsequenceResources,prepareNativeTaskSettlementResources,prepareNativeInitialIdleBodyResources,prepareNativeIdleCycleResources,prepareNativeHomeRouteResources};
}
