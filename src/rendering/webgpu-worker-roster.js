import {attachNativeSourcePresentation} from './native-source-presentation.js';
import {terrainStopWireProtocol} from '../simulation/terrain-stop-reservation.js';
import {copyNativeFarmArrivalHeldExecution,nativeFarmArrivalContinuesHeld,nativeFarmArrivalSourcePose} from '../world/native-farm-arrival-route.js';
import {nativeIdleStrollLiveState,nativeIdleStrollSavedState} from '../world/native-idle-stroll-state.js';
import {isNativeIdleStrollArrivalSource,nativeIdleCycleBodyState,nativeSettledIdleSourceMatches} from '../world/native-idle-cycle-body-source.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleAttestation,nativeIdleCycleAttestationCovers,sameNativeIdleCycleAttestation,sameNativeIdleCycleReference} from '../world/native-idle-cycle.js';
import {copyNativeIdleStrollProposal,copyNativeIdleStrollAttestation,copyNativeIdleStrollHeldExecution,copyNativeIdleStrollResources,sameNativeIdleStrollAttestation,nativeIdleStrollPresentationMatches,nativeIdleStrollArrivalSourceMatches,nativeIdleStrollWalkRemaining,nativeIdleStrollApproachesAnchor} from '../world/native-idle-stroll.js';
import {createNativeIdleStrollGpuMotion} from './native-gpu-motion.js';
import {createNativeIdleCycleGpuMotion} from './native-idle-cycle-gpu-motion.js';
import {copyNativeHomeArrivalProposal,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference,nativeHomeArrivalSuccessor,nativeHomeArrivalPresentationMatches} from '../world/native-home-arrival.js';
import {copyNativeFarmArrivalRouteProposal,copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteAttestation,nativeFarmArrivalRoutePresentationMatches} from '../world/native-farm-arrival-route.js';
import {nativeFarmArrivalState,nativeFarmArrivalHeldState,nativeFarmArrivalBoundState,nativeFarmFlightState} from '../world/native-farm-arrival-state.js';
import {nativeWorkerRouteRecoveryProfile,woundedHomeExecutionAtEndpoint} from '../world/native-worker-route-recovery.js';
import {createNativeFarmArrivalGpuMotion} from './native-gpu-motion.js';
import {copyNativeHomeRouteProposal,copyNativeHomeRouteAttestation,sameNativeHomeRouteReference,nativeHomeRoutePresentationMatches,nativeHomeRouteSource} from '../world/native-home-route.js';
import {createNativeHomeRouteGpuMotion} from './native-gpu-motion.js';
import {nativeHomeRequestContinuesIdle,nativeHomeRequestContinuesRepairAction} from '../world/native-home-request-reference.js';
import {nativeHomeWorkerStatus} from '../world/native-home-request-reference.js';
import {RECOVERY_EXIT_SECONDS,woundedHomeSourceCurrent,workerRecoveryExitRemaining} from '../simulation/worker-recovery.js';
import {copyNativeTaskConsequenceProposal,copyNativeTaskConsequenceAttestation,nativeTaskConsequencePresentationMatches,nativeDeliveryProjectionMatches} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementAttestation,nativeTaskSettlementAttestationCovers,nativeTaskSettlementProjectionMatches,sameNativeTaskSettlementReference} from '../world/native-task-settlement.js';
import {createNativeTaskSettlementGpuMotion} from './native-task-settlement-gpu-motion.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyAttestation,nativeInitialIdleBodyAttestationCovers,sameNativeInitialIdleBodyReference,nativeInitialIdleActionSource,nativeTaskCancellationMatchesAction,nativeTaskCancellationMatchesTerminalRoute,nativeTaskCancellationMatchesHeldRoute} from '../world/native-initial-idle-body.js';
import {createNativeInitialIdleBodyGpuMotion} from './native-initial-idle-body-gpu-motion.js';
import {nativeHomeRequestContinuesInitialIdle,nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesHeldWorker} from '../world/native-home-request-reference.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {sameNativeRouteReference as sameNativeReference} from '../world/native-route-reference.js';
import {createNativeTaskConsequenceGpuMotion} from './native-gpu-motion.js';
import {nativeTaskStartPresentationMatches} from '../world/native-task-start-attestation.js';
import {nativeTaskActionActor,copyNativeTaskActionReference,sameNativeTaskActionReference} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionAttestation,nativeTaskActionAttestationCovers,nativeTaskActionProjectionMatches,sameNativeTaskActionAttestation} from '../world/native-task-action-attestation.js';
import {createNativeTaskActionGpuMotion} from './native-task-action-gpu-motion.js';
import {copyNativeTaskStartAttestation} from '../world/native-task-start-attestation.js';
import {copyNativeTaskStartProposal} from '../world/native-task-start-presentation.js';
import {nativeResumePresentationMatches} from '../world/native-resume-attestation.js';
import {copyNativeWorldStopEffects,nativeSuspendedBodiesFromProposal} from '../world/native-suspended-body-reference.js';
import {copyNativeGatePresentation} from '../world/native-gate-presentation.js';
import {copyNativeResumeProposal} from '../world/native-resume-presentation.js';
import {copyNativeRoutePresentation} from '../world/native-route-presentation.js';
import {sameNativeGatePresentations} from '../world/native-gate-presentation.js';
import {createRecoveredStoppedWorkerGpuMotion,createRecoveredWorkerRouteGpuMotion,createNativeGpuMotion,createNativeResumeGpuMotion,createNativeTaskStartGpuMotion} from './native-gpu-motion.js';
import {isWorkerIncapacitatedPresentation,isWorkerWaitingWoundedHome} from './worker-incapacitated-presentation.js';
import {createBakedWalkRetry} from './baked-walk-retry.js';
import {admitRosterActor,disposePendingRosterActor,releaseRosterActor,releaseRosterMotion} from './webgpu-roster-admission.js';
import {bindWebGpuActorMotion} from './webgpu-actor-motion-binding.js';
import {createConfirmedGpuMotion} from './confirmed-gpu-motion.js';
import {createConfirmedGpuAnimationPhase} from './confirmed-gpu-animation-phase.js';
import {confirmedWalkingSamples,confirmedWorkerRunningSamples,confirmedWorkerCarrySamples,confirmedWorkerFleeIdleSamples} from './confirmed-animation-samples.js';
import {confirmedMotionYaw} from './confirmed-motion-yaw.js';
import {confirmedHistoricalParticipant} from './confirmed-historical-participant.js';
import {Group,Quaternion,Vector3} from 'three';
import {createWebGpuConfirmedWorker} from './webgpu-confirmed-worker.js';
import {isWorkerGateIdle} from './worker-gate-idle.js';
import {isWorkerFleeIdle} from './worker-flee-idle.js';
import {isWorkerPlantPhase,isWorkerWaterPhase} from './worker-plant-phase.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';

// Reconcile only from confirmed publications and release obsolete async work.
// A held22/23 pose is provenance for the prepared Task successor, never an old
// executable corridor. Keep the check pure so suspended activation can use it.
function taskStartContinuesHeldWorker(packet,source){
 const r=packet?.nativeStart,p=source?.pose,h=source?.resumeHandle,profile=source?.kind==='native-farm-arrival-held-execution'?source.sourceReference.sourceRequest.profile:source?.kind==='native-idle-stroll-held-execution'?source.sourceReference.profile:null;
 return !!r&&!!p&&profile!==null&&r.actorId===source.actorId&&r.bodyId===source.bodyId&&packet.profile===profile&&r.worldBoundary.authorityEpoch===h.authorityEpoch&&r.worldBoundary.nativeSession===h.session&&r.requestSequence>source.assignmentSequence&&r.requestedAt>=source.suspendedAt&&packet.radius===p.radius&&packet.origin.x===p.x&&packet.origin.z===p.z&&[8,9,10,13].every((index,i)=>packet.rows[index]===[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i]);
}
// Match only the native terminal row of an installed23. Task/Home requests may
// replace semantic destination fields; contract, profile and all other policy
// remain those of the original actor. This never samples a new JS trajectory.
const farmTaskChangedFields=new Set(['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining','running','gateWaiting','status','nativeRouteAdmission','idleState','destinationId','taskId','taskApproach','pathVersion']);
function farmTaskPolicy(entity){return JSON.stringify(Object.fromEntries(Object.entries(entity).filter(([key])=>!farmTaskChangedFields.has(key))));}
// A newborn native actor has no earlier JS path/cache to inherit. The installed
// native binding and terminal row below prove its source. Present conflicting
// legacy metadata still rejects the handoff; absence does not invent history.
// A refugee becomes task-eligible only at the certified Farm endpoint.
function completedFarmPolicy(entity,source){
 if(source.version!==2)return farmTaskPolicy(entity);
 const {nativeRefugeSequence,...fields}=entity;
 return farmTaskPolicy({...fields,raidReturn:false});
}
function confirmedFlightSpawn(state,match){
 const raid=state.raid,animal=raid?.animals?.[0];
 return raid?.daytime===true&&raid.animals.length===1&&animal?.species==='warthog'?state.events?.findLast(e=>
  e.type==='RaidSpawned'&&match(e)&&e.raidFacts?.id===raid.id&&e.raidFacts.day===state.day&&e.raidFacts.daytime===true&&
  e.raidFacts.elapsed===e.simulationTime&&e.raidFacts.actors?.length===1&&e.raidFacts.actors[0].id===animal.id&&
  e.raidFacts.actors[0].species===animal.species):null;
}
function farmPathMetadataCurrent(entity){return entity.taskApproach==null&&(entity.pathVersion===undefined||Number.isFinite(entity.pathVersion));}
function taskStartContinuesCompletedFarm(packet,previous,entity,at){
 const r=packet.nativeStart,b=previous?.nativeFarmArrivalBinding,s=b?.reference,p=previous?.packet,a=p?.rows,i=(a?.length??0)-16;
 return !!s&&i>=0&&previous.farmTaskPolicy===farmTaskPolicy(entity)
  &&entity.nativeRouteAdmission==='pending-resources'&&entity.idleState===null&&entity.destinationId===null&&farmPathMetadataCurrent(entity)&&entity.path===null&&entity.running===false&&entity.gateWaiting===false&&!entity.nativeTaskAction
  &&at>=s.endTime&&r.requestedAt>=s.endTime&&a[i]===s.endTime&&a[i+7]===1&&a[i+14]===0&&a[i+15]===0
  &&r.actorId===s.actorId&&r.bodyId===s.bodyId&&r.requestSequence>b.assignmentSequence&&r.worldBoundary.authorityEpoch===s.worldBoundary.authorityEpoch&&r.worldBoundary.nativeSession===s.worldBoundary.nativeSession
  &&packet.profile===p.profile&&packet.radius===p.radius&&packet.origin.x===a[i+1]&&packet.origin.z===a[i+2]&&entity.x===a[i+1]&&entity.z===a[i+2]&&entity.heading===a[i+5]
  &&[8,9,10,13].every((index,j)=>packet.rows[index]===a[i+index]&&entity[['runPhase','walkPhase','carryPhase','runRemaining'][j]]===a[i+index])&&previous.motion.valid();
}
function homeRequestContinuesCompletedTask(request,previous,entity,at){
 const b=previous?.nativeTaskStartBinding,r=b?.reference,p=previous?.packet,a=p?.rows,i=(a?.length??0)-16,v=request?.pose;
 // Only an acquired14 owns this endpoint. A pending/expired25 cannot grant
 // it, and the unchanged rig policy must survive the semantic Task release.
 return !!r&&!!v&&i>=0&&previous.taskHomePolicy===farmTaskPolicy(entity)
  &&entity.idleState===null&&entity.destinationId===null&&!entity.nativeTaskAction
  &&at>=r.endTime&&request.requestedAt>=r.endTime&&a[i]===p.endTime&&a[i+7]===1&&a[i+14]===0&&a[i+15]===0
  &&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.profile===p.profile&&request.requestSequence>b.assignmentSequence
  &&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession
  &&v.radius===p.radius&&v.x===a[i+1]&&v.z===a[i+2]&&v.yaw===a[i+5]
  &&[8,9,10,13].every((index,j)=>v[['runPhase','walkPhase','carryPhase','runRemaining'][j]]===a[i+index])&&previous.motion.valid();
}
function homeRequestContinuesCompletedFarm(request,previous,entity,at){
 const b=previous?.nativeFarmArrivalBinding,s=b?.reference,q=s?.sourceRequest,p=previous?.packet,a=p?.rows,i=(a?.length??0)-16,v=request?.pose;
 // Rows retain the prepared epoch; the installed attestation supplies the
 // actual finite execution end. Never reinterpret this endpoint as a24 stop.
 return !!q&&!!v&&i>=0&&previous.farmTaskPolicy===farmTaskPolicy(entity)
  &&entity.idleState===null&&entity.destinationId===null&&farmPathMetadataCurrent(entity)&&!entity.nativeTaskAction
  &&at>=s.endTime&&request.requestedAt>=s.endTime&&a[i]===p.endTime&&a[i+7]===1&&a[i+14]===0&&a[i+15]===0
  &&request.actorId===s.actorId&&request.bodyId===s.bodyId&&request.bodyFlags===q.bodyFlags&&request.profile===p.profile&&request.requestSequence>b.assignmentSequence
  &&request.authorityEpoch===s.worldBoundary.authorityEpoch&&request.nativeSession===s.worldBoundary.nativeSession
  &&v.radius===p.radius&&v.x===a[i+1]&&v.z===a[i+2]&&v.yaw===a[i+5]
  &&[8,9,10,13].every((index,j)=>v[['runPhase','walkPhase','carryPhase','runRemaining'][j]]===a[i+index])&&previous.motion.valid();
}
function homeRequestContinuesCompletedStroll(request,previous,entity,at){
 const b=previous?.nativeIdleStrollBinding,r=b?.reference,p=previous?.packet,a=p?.rows,i=(a?.length??0)-16,v=request?.pose;
 // The actual binding owns the execution end; the retained row still uses
 // its prepared epoch. This is an arrived22, never a suspended12 or REST.
 return !!r&&!!v&&i>=0&&previous.strollHomePolicy===farmTaskPolicy(entity)
  &&entity.idleState===null&&entity.destinationId===null&&!entity.nativeTaskAction
  &&at>=r.endTime&&request.requestedAt>=r.endTime&&a[i]===p.endTime&&a[i+7]===1&&a[i+14]===0&&a[i+15]===0
  &&request.actorId===r.actorId&&request.bodyId===r.bodyId&&request.bodyFlags===r.bodyFlags&&request.profile===p.profile&&request.requestSequence>b.assignmentSequence
  &&request.authorityEpoch===r.worldBoundary.authorityEpoch&&request.nativeSession===r.worldBoundary.nativeSession
  &&v.radius===p.radius&&v.x===a[i+1]&&v.z===a[i+2]&&v.yaw===a[i+5]
  &&[8,9,10,13].every((index,j)=>v[['runPhase','walkPhase','carryPhase','runRemaining'][j]]===a[i+index])&&previous.motion.valid();
}
function idleCycleContinuesCompletedFarm(source,previous,entity,at){
 const b=previous?.nativeFarmArrivalBinding,r=b?.reference,q=r?.sourceRequest,p=previous?.packet,a=p?.rows,i=(a?.length??0)-16,v=source?.pose;
 // The immutable row keeps its prepared epoch; the installed binding owns
 // the real finite end. Compare native values, never resample a trajectory.
 return !!q&&!!v&&!!entity&&i>=0&&previous.farmTaskPolicy===farmTaskPolicy(entity)
  &&at>=r.endTime&&source.sourceAt===r.endTime&&a[i]===p.endTime&&a[i+7]===1&&a[i+14]===0&&a[i+15]===0
  &&source.actorId===r.actorId&&source.bodyId===r.bodyId&&source.profile===p.profile&&source.workerProfile===q.workerProfile&&source.centerId===q.centerId&&source.bodyFlags===q.bodyFlags&&source.sourceSequence===b.assignmentSequence
  &&source.authorityEpoch===r.worldBoundary.authorityEpoch&&source.nativeSession===r.worldBoundary.nativeSession
  &&v.radius===p.radius&&v.x===a[i+1]&&v.z===a[i+2]&&v.yaw===a[i+5]
  &&[8,9,10,13].every((index,j)=>v[['runPhase','walkPhase','carryPhase','runRemaining'][j]]===a[i+index])&&previous.motion.valid();
}
// A failed WALK and a cold22 share the same still-pending semantic owner.
// This is a source check only; control and the native receipt grant execution.
function pendingIdleStrollMatches(state,e,q){
 try{const {pose,idleState:i}=nativeIdleStrollSavedState(state,e);return e.nativeRouteAdmission==='pending-stroll-resources'&&e.profile===q.workerProfile&&nativeEntityNumericId(e.centerId)===q.centerId&&Object.keys(pose).every(k=>pose[k]===q.pose[k])&&(q.approach===true)===(i.destination.id===i.anchorId)&&i.anchorId===`${q.anchor.kind===1?'farm-plant':'farm-structure'}-${q.anchor.id}`&&i.remaining===(q.version===2?q.walkRemaining:q.approach?q.idleSeconds*2:0)&&i.rng===q.walkRng&&i.approachRetry===q.approachRetry&&i.destination.x===q.destination.x&&i.destination.z===q.destination.z;}catch{return false;}
}
export function createWebGpuWorkerRoster({scene,residency,state,assetBank,renderer=null,resourceRegistry=null,bakedWalkBank=null,bakedRunBank=null,bakedHarvestBank=null,bakedIdleBank=null,bakedAlertBank=null,bakedWaterBank=null,bakedPlantBank=null,bakedCarryBank=null,bakedFallBank=null,bakedGetUpBank=null,ownsAssetBank=true,walkRetryDelay=5000,pipelineAdmission=null,presentationWorkerHeadings=null,confirmedClock=null,experimentalHistoricalMotion=null,onError=()=>{},onBakedWalkError=()=>{},onReady=()=>{},onSelectableChange=()=>{},onNativeHomeImpact=()=>{},createWorker=createWebGpuConfirmedWorker}={}){
 if(!Number.isFinite(walkRetryDelay)||walkRetryDelay<0||resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!scene||!residency||!state||!assetBank||typeof ownsAssetBank!=='boolean'||pipelineAdmission!==null&&typeof pipelineAdmission.prepare!=='function'||bakedWalkBank!==null&&(typeof bakedWalkBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedRunBank!==null&&(typeof bakedRunBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedHarvestBank!==null&&(typeof bakedHarvestBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedIdleBank!==null&&(typeof bakedIdleBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedAlertBank!==null&&(typeof bakedAlertBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedWaterBank!==null&&(typeof bakedWaterBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedPlantBank!==null&&(typeof bakedPlantBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedCarryBank!==null&&(typeof bakedCarryBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedFallBank!==null&&(typeof bakedFallBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||bakedGetUpBank!==null&&(typeof bakedGetUpBank.get!=='function'||!pipelineAdmission||!renderer?.backend?.isWebGPUBackend)||presentationWorkerHeadings!==null&&!(presentationWorkerHeadings instanceof Map)||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed))||typeof onError!=='function'||typeof onBakedWalkError!=='function'||typeof onReady!=='function'||typeof onSelectableChange!=='function'||typeof createWorker!=='function')throw TypeError('Invalid worker roster');
 const ids=[...(experimentalHistoricalMotion?.actorIds??[])];if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||experimentalHistoricalMotion&&(!experimentalHistoricalMotion.clock?.motionNode?.isNode||!pipelineAdmission||!bakedWalkBank))throw TypeError('Invalid historical worker selection');
 const selected=new Set(ids),entries=new Map();let closed=false,tasks=new Map(),historyRun=null;
 const walkRetries=createBakedWalkRetry({delay:walkRetryDelay,retry(id,entry){if(entries.get(id)!==entry||!entry.bakeFailed||entry.bakeInstalled)return;entry.bakeFailed=false;requestBakedWalk(id,entry);}});
 const actionRequests={run:requestBakedRun,harvest:requestBakedHarvest,idle:requestBakedIdle,alert:requestBakedAlert,water:requestBakedWater,plant:requestBakedPlant,carry:requestBakedCarry};
 const actionRetries=createBakedWalkRetry({delay:walkRetryDelay,retry(_key,token){const {id,entry,kind,attemptState}=token;if(closed||entries.get(id)!==entry||entry[kind+'Installed'])return;if(kind==='fall'||kind==='getUp'){const entity=entry.entity,key=kind==='fall'?entity?.fallRemaining>0&&!entity.recovery:!!entity?.recovery&&!(entity.fallRemaining>0)&&JSON.stringify([entity.recovery.fraction,entity.recovery.duration,entity.recovery.heading])===attemptState;if(!key||!entry[kind+'Attempted'])return;entry[kind+'Attempted']=false;(kind==='fall'?requestBakedFall:requestBakedGetUp)(id,entry);return;}if(!entry[kind+'Failed']||entry[kind+'FailedKey']!==attemptState||entry[token.stateKey]!==attemptState)return;entry[kind+'Failed']=false;actionRequests[kind](id,entry);}});
 function actionToken(id,entry,kind,stateKey,attemptState){entry.actionTokens??=new Map();let token=entry.actionTokens.get(kind);if(!token){token={id,entry,kind,stateKey,attemptState};entry.actionTokens.set(kind,token);}if(token.attemptState!==attemptState)actionRetries.reset(token,token);token.attemptState=attemptState;return token;}
 function resetActionRetry(entry,kind){const token=entry.actionTokens?.get(kind);if(token)actionRetries.reset(token,token);}
 function loadBakedAction(id,entry,kind,stateKey,attemptState,bank){const token=actionToken(id,entry,kind,stateKey,attemptState);return Promise.resolve().then(()=>bank.get(entry.profile)).then(bake=>{actionRetries.reset(token,token);return bake;}).catch(error=>{if(error?.name!=='AbortError'&&!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&entry[stateKey]===attemptState)actionRetries.enqueue(token,token);throw error;});}
 function loadBakedRecovery(id,entry,kind,attemptState,bank){const token=actionToken(id,entry,kind,null,attemptState);return Promise.resolve().then(()=>bank.get(entry.profile)).then(bake=>{actionRetries.reset(token,token);return bake;}).catch(error=>{const entity=entry.entity,current=kind==='fall'?entity?.fallRemaining>0&&!entity.recovery:!!entity?.recovery&&!(entity.fallRemaining>0)&&JSON.stringify([entity.recovery.fraction,entity.recovery.duration,entity.recovery.heading])===attemptState;if(error?.name!=='AbortError'&&!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&current)actionRetries.enqueue(token,token);throw error;});}

 function activeBakedAction(actor,kind){if(actor?.isBakedRunning?.()===true||actor?.isBakedCarrying?.()===true)return true;if(kind!=='stationary')return false;return actor?.isBakedHarvesting?.()===true||actor?.isBakedIdle?.()===true||actor?.isBakedAlert?.()===true||actor?.isBakedWatering?.()===true||actor?.isBakedPlanting?.()===true||actor?.isBakedFalling?.()===true||actor?.isBakedRecovering?.()===true;}
 function requestBakedGetUp(id,entry){const entity=entry.entity;if(!bakedGetUpBank||entry.getUpInstalled||entry.getUpPending||entry.fallPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.alertPending||entry.waterPending||entry.plantPending||entry.carryPending||historyRun||entry.motionPreparing||!entry.actor||(!Number.isFinite(entity?.recovery?.fraction)||entity.recovery.fraction<0||entity.recovery.fraction>1)||entity.fallRemaining>0||entry.getUpAttempted)return;entry.getUpPending=true;entry.getUpAttempted=true;entry.getUpAttemptKey=JSON.stringify([entity.recovery.fraction,entity.recovery.duration,entity.recovery.heading]);const expectedFraction=entity.recovery.fraction,expectedDuration=entity.recovery.duration,expectedHeading=entity.recovery.heading,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;loadBakedRecovery(id,entry,'getUp',entry.getUpAttemptKey,bakedGetUpBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&entry.entity?.recovery?.fraction===expectedFraction&&entry.entity.recovery.duration===expectedDuration&&entry.entity.recovery.heading===expectedHeading&&!(entry.entity.fallRemaining>0);if(!safe())throw new DOMException('Baked recovery deferred','AbortError');if(await entry.actor.installBakedGetUp(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.getUpInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){if(error?.name==='AbortError')entry.getUpDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.getUpPending=false;if(current()&&entry.bakeResource)requestBakedWalk(id,entry);if(current())requestBakedGetUp(id,entry);prepareLateHistoricalMotion(id,entry);});}
 function requestBakedFall(id,entry){const entity=entry.entity;if(!bakedFallBank||entry.fallInstalled||entry.getUpPending||entry.fallPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.alertPending||entry.waterPending||entry.plantPending||entry.carryPending||historyRun||entry.motionPreparing||!entry.actor||!(entity?.fallRemaining>0)||entity.recovery||entry.fallAttempted)return;entry.fallPending=true;entry.fallAttempted=true;const current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;loadBakedRecovery(id,entry,'fall',null,bakedFallBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&entry.entity?.fallRemaining>0&&!entry.entity.recovery;if(!safe())throw new DOMException('Baked fall deferred','AbortError');if(await entry.actor.installBakedFall(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.fallInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){if(error?.name==='AbortError')entry.fallDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.fallPending=false;if(current()&&entry.bakeResource)requestBakedWalk(id,entry);if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function carryingConfirmed(entity){return entity?.status==='carrying'&&typeof entity.crateId==='string'&&!!entity.crateId&&(state.crates??[]).some(crate=>crate.id===entity.crateId&&crate.carrierId===entity.id&&!crate.delivered);}
 function requestBakedAlert(id,entry){if(entry.alertFailed&&entry.alertFailedKey===entry.lastIdleKey||!bakedAlertBank||entry.alertInstalled||entry.alertPending||entry.getUpPending||entry.fallPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||historyRun?.entries.has(id)||!entry.actor||!['idle','waiting'].includes(entry.entity?.status)||entry.entity?.idleState?.mode!=='watch'||entry.entity?.gateWaiting)return;entry.alertPending=true;entry.alertFailed=false;entry.alertDeferred=false;const attemptState=entry.lastIdleKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;entry.alertRequestPromise=loadBakedAction(id,entry,'alert','lastIdleKey',attemptState,bakedAlertBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&['idle','waiting'].includes(entry.entity?.status)&&entry.entity?.idleState?.mode==='watch'&&!entry.entity?.gateWaiting;if(!safe())throw new DOMException('Baked alert deferred','AbortError');if(await entry.actor.installBakedAlert(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.alertInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.alertFailed=true;entry.alertFailedKey=attemptState;if(error?.name==='AbortError')entry.alertDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.alertPending=false;if(current()&&entry.alertFailed&&entry.lastIdleKey!==attemptState)requestBakedAlert(id,entry);if(current()){requestBakedWalk(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);requestBakedPlant(id,entry);requestBakedCarry(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedCarry(id,entry){if(entry.carryFailed&&entry.carryFailedKey===entry.lastCarryKey||!bakedCarryBank||entry.carryInstalled||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||historyRun?.entries.has(id)||!entry.actor||!carryingConfirmed(entry.entity))return;entry.carryPending=true;entry.carryFailed=false;entry.carryDeferred=false;const expected=entry.entity.crateId,attemptState=entry.lastCarryKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;entry.carryRequestPromise=loadBakedAction(id,entry,'carry','lastCarryKey',attemptState,bakedCarryBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&carryingConfirmed(entry.entity)&&entry.entity.crateId===expected;if(!safe())throw new DOMException('Baked carry deferred','AbortError');if(await entry.actor.installBakedCarry(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.carryInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.carryFailed=true;entry.carryFailedKey=attemptState;if(error?.name==='AbortError')entry.carryDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.carryPending=false;if(current()&&entry.carryFailed&&entry.lastCarryKey!==attemptState)requestBakedCarry(id,entry);if(current()){requestBakedWalk(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);requestBakedPlant(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedPlant(id,entry){const task=tasks.get(entry.entity?.taskId);if(entry.plantFailed&&entry.plantFailedKey===entry.lastPlantKey||!bakedPlantBank||entry.plantInstalled||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||historyRun?.entries.has(id)||!entry.actor||!isWorkerPlantPhase(entry.entity,task))return;entry.plantPending=true;entry.plantFailed=false;entry.plantDeferred=false;const expectedTarget=task.targetId,attemptState=entry.lastPlantKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;loadBakedAction(id,entry,'plant','lastPlantKey',attemptState,bakedPlantBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&isWorkerPlantPhase(entry.entity,tasks.get(task.id))&&entry.entity.taskId===task.id&&tasks.get(task.id)?.targetId===expectedTarget;if(!safe())throw new DOMException('Baked plant deferred','AbortError');if(await entry.actor.installBakedPlant(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.plantInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.plantFailed=true;entry.plantFailedKey=attemptState;if(error?.name==='AbortError')entry.plantDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.plantPending=false;if(current()&&entry.plantFailed&&entry.lastPlantKey!==attemptState)requestBakedPlant(id,entry);if(current()){requestBakedWalk(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);}if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedWater(id,entry){const task=tasks.get(entry.entity?.taskId);if(entry.waterFailed&&entry.waterFailedKey===entry.lastWaterKey||!bakedWaterBank||entry.waterInstalled||entry.waterPending||entry.bakePending||entry.runPending||entry.harvestPending||entry.idlePending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||historyRun?.entries.has(id)||!entry.actor||!isWorkerWaterPhase(entry.entity,task))return;entry.waterPending=true;entry.waterFailed=false;entry.waterDeferred=false;const expectedTarget=task.targetId,attemptState=entry.lastWaterKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;loadBakedAction(id,entry,'water','lastWaterKey',attemptState,bakedWaterBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding&&isWorkerWaterPhase(entry.entity,tasks.get(task.id))&&entry.entity.taskId===task.id&&tasks.get(task.id)?.targetId===expectedTarget;if(!safe())throw new DOMException('Baked water deferred','AbortError');if(await entry.actor.installBakedWater(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.waterInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.waterFailed=true;entry.waterFailedKey=attemptState;if(error?.name==='AbortError')entry.waterDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.waterPending=false;if(current()&&entry.waterFailed&&entry.lastWaterKey!==attemptState)requestBakedWater(id,entry);if(current()){requestBakedWalk(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);}if(current())requestBakedPlant(id,entry);if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedIdle(id,entry){const woundedHome=isWorkerWaitingWoundedHome(entry.entity);if(woundedHome&&entry.motionPreparing||entry.idleFailed&&entry.idleFailedKey===entry.lastIdleKey||!bakedIdleBank||entry.idleInstalled||entry.idlePending||entry.bakePending||entry.runPending||entry.harvestPending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||historyRun?.entries.has(id)||!entry.actor||!(woundedHome||isWorkerGateIdle(entry.entity)||isWorkerFleeIdle(entry.entity)||isWorkerIncapacitatedPresentation(entry.entity)&&entry.entity.running===false||['idle','waiting'].includes(entry.entity?.status)&&(!entry.entity?.idleState||entry.entity.idleState.mode==='rest')&&!entry.entity?.gateWaiting))return;entry.idlePending=true;entry.idleFailed=false;entry.idleDeferred=false;const attemptState=entry.lastIdleKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;entry.idleRequestPromise=loadBakedAction(id,entry,'idle','lastIdleKey',attemptState,bakedIdleBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding;if(!safe())throw new DOMException('Baked idle deferred','AbortError');if(await entry.actor.installBakedIdle(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.idleInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.idleFailed=true;entry.idleFailedKey=attemptState;if(error?.name==='AbortError')entry.idleDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.idlePending=false;if(current()&&entry.idleFailed&&entry.lastIdleKey!==attemptState)requestBakedIdle(id,entry);if(current()){requestBakedWalk(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedWater(id,entry);}if(current())requestBakedPlant(id,entry);if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedRun(id,entry){if(entry.runFailed&&entry.runFailedKey===entry.lastRunKey||!bakedRunBank||entry.runInstalled||entry.runPending||entry.bakePending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||historyRun?.entries.has(id)||!entry.actor||!(['walking','arriving','returning','fleeing'].includes(entry.entity?.status)||isWorkerIncapacitatedPresentation(entry.entity))||!entry.entity.running)return;entry.runPending=true;entry.runFailed=false;entry.runDeferred=false;const attemptState=entry.lastRunKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;entry.runRequestPromise=loadBakedAction(id,entry,'run','lastRunKey',attemptState,bakedRunBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding;if(!safe())throw new DOMException('Baked running deferred','AbortError');if(await entry.actor.installBakedRun(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.runInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.runFailed=true;entry.runFailedKey=attemptState;if(error?.name==='AbortError')entry.runDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.runPending=false;if(current()&&entry.bakeResource)requestBakedWalk(id,entry);if(current()&&entry.runFailed&&entry.lastRunKey!==attemptState)requestBakedRun(id,entry);if(current()){requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);}if(current())requestBakedPlant(id,entry);if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function requestBakedHarvest(id,entry){const task=tasks.get(entry.entity?.taskId);if(entry.harvestFailed&&entry.harvestFailedKey===entry.lastHarvestKey||!bakedHarvestBank||entry.harvestInstalled||entry.harvestPending||entry.bakePending||entry.runPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||historyRun?.entries.has(id)||!entry.actor||entry.entity?.status!=='acting'||!['harvest','crate'].includes(task?.kind))return;entry.harvestPending=true;entry.harvestFailed=false;entry.harvestDeferred=false;const attemptState=entry.lastHarvestKey,current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;loadBakedAction(id,entry,'harvest','lastHarvestKey',attemptState,bakedHarvestBank).then(async bake=>{if(!current())return;const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding;if(!safe())throw new DOMException('Baked harvest deferred','AbortError');if(await entry.actor.installBakedHarvest(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.harvestInstalled=true;onSelectableChange();}}).catch(error=>{if(current()){entry.harvestFailed=true;entry.harvestFailedKey=attemptState;if(error?.name==='AbortError')entry.harvestDeferred=true;else onBakedWalkError(entry.profile,error);}}).finally(()=>{entry.harvestPending=false;if(current()&&entry.bakeResource)requestBakedWalk(id,entry);if(current()&&entry.harvestFailed&&entry.lastHarvestKey!==attemptState)requestBakedHarvest(id,entry);if(current()){requestBakedRun(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);}if(current())requestBakedPlant(id,entry);if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});}
 function resumeBakedWalk(id,entry){
  if(!historyRun&&!entry.motionPreparing&&!entry.bakePending&&!entry.bakeLoading&&entry.bakeDeferred){entry.bakeDeferred=false;entry.bakeFailed=false;}
  requestBakedWalk(id,entry);
 }
 function requestBakedWalk(id,entry){
  if(entry.bakeFailed&&entry.bakeFailedStatus===entry.lastStatus||!bakedWalkBank||!hasBakedWorkerWalk(entry.profile)||entry.bakeInstalled||entry.bakePending||entry.bakeLoading)return;
  const current=()=>!closed&&entries.get(id)===entry&&!entry.controller.signal.aborted&&!!entry.actor;
  if(!entry.bakeResource){entry.bakeLoading=true;entry.bakeFailed=false;entry.bakeDeferred=false;const attemptStatus=entry.lastStatus;entry.bakeResourcePromise=Promise.resolve().then(()=>bakedWalkBank.get(entry.profile)).then(bake=>{if(current()){entry.bakeResource=bake;walkRetries.reset(id,entry);}}).catch(error=>{if(current()){entry.bakeFailed=true;entry.bakeFailedStatus=attemptStatus;if(error?.name==='AbortError')entry.bakeDeferred=true;else{walkRetries.enqueue(id,entry);onBakedWalkError(entry.profile,error);}}}).finally(()=>{entry.bakeLoading=false;if(!current())return;if(entry.bakeResource||entry.bakeFailed&&entry.lastStatus!==attemptStatus)requestBakedWalk(id,entry);});return;}
  if(entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.motionPreparing||historyRun?.entries.has(id))return;
  entry.bakePending=true;entry.bakeFailed=false;entry.bakeDeferred=false;const attemptStatus=entry.lastStatus,bake=entry.bakeResource;
  entry.bakeRequestPromise=Promise.resolve().then(async()=>{if(!current())return;if(typeof entry.actor.installBakedWalk!=='function')throw Error('Worker cannot install baked walking');const binding=entry.motionBinding??null,safe=()=>current()&&!historyRun&&!entry.motionPreparing&&(entry.motionBinding??null)===binding;if(!safe())throw new DOMException('Baked walking deferred','AbortError');if(await entry.actor.installBakedWalk(bake,{pipelineAdmission,signal:entry.controller.signal,motionBinding:binding,isCurrent:safe})!==true)throw new DOMException('Baked candidate was not published','AbortError');if(current()){entry.bakeInstalled=true;entry.bakeResource=null;onSelectableChange();}}).catch(error=>{if(current()){entry.bakeFailed=true;entry.bakeFailedStatus=attemptStatus;if(error?.name==='AbortError')entry.bakeDeferred=true;else{entry.bakeResource=null;onBakedWalkError(entry.profile,error);}}}).finally(()=>{entry.bakePending=false;if(current()&&entry.bakeFailed&&entry.lastStatus!==attemptStatus)requestBakedWalk(id,entry);if(current()){requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);}if(current())requestBakedPlant(id,entry);if(current()){requestBakedCarry(id,entry);requestBakedAlert(id,entry);}if(current()){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}prepareLateHistoricalMotion(id,entry);});
 }
 async function prepareHistorical(id,entry,actor){
  if(!selected.has(id)||actor.root?.visible!==true)return actor;
  // Keep the not-yet-admitted rig out of the live scene while binding motion.
  const parent=actor.root?.parent,staging=new Group();if(parent)staging.add(actor.root);
  try{
   if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return actor;
   actor.root.updateWorldMatrix(true,true);const point=actor.root.getWorldPosition(new Vector3()),motion=createConfirmedGpuMotion({actorId:id,clock:experimentalHistoricalMotion.clock,resourceRegistry});motion.bootstrap({at:experimentalHistoricalMotion.clock.elapsed,x:point.x,y:point.y,z:point.z});
   try{entry.motionBinding=bindWebGpuActorMotion({root:actor.root,renderer,motion,actorId:id,getPickTime:()=>experimentalHistoricalMotion.clock.elapsed,resourceRegistry});entry.motion=motion;motion.reset();}catch(error){motion.dispose();throw error;}
  }catch(error){if(!entry.controller.signal.aborted)onBakedWalkError(entry.profile,error);}finally{if(parent&&actor.root.parent===staging){parent.add(actor.root);actor.root.visible=false;}}return actor;
 }
 // Prepare the alternate materials on the existing rig. Its mixer, bones and
 // expressions remain owned by the published actor throughout the wait.
 function prepareLateHistoricalMotion(id,entry){
  if(!experimentalHistoricalMotion||!pipelineAdmission?.prepareAndPublish||closed||historyRun||!selected.has(id)||entries.get(id)!==entry||!entry.actor||!entry.actor.root?.visible||entry.motion||entry.bakePending||entry.bakeLoading||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.motionPreparing||entry.nativePending)return;
  const actor=entry.actor,controller=new AbortController(),pending={controller};entry.motionPreparing=pending;
  const current=()=>!closed&&!historyRun&&selected.has(id)&&entries.get(id)===entry&&entry.actor===actor&&entry.motionPreparing===pending&&!controller.signal.aborted;
  let motion=null,binding=null,adopted=false;
  try{actor.root.updateWorldMatrix(true,true);const point=actor.root.getWorldPosition(new Vector3());motion=createConfirmedGpuMotion({actorId:id,clock:experimentalHistoricalMotion.clock,resourceRegistry});motion.bootstrap({at:experimentalHistoricalMotion.clock.elapsed,x:point.x,y:point.y,z:point.z});binding=bindWebGpuActorMotion({root:actor.root,renderer,motion,actorId:id,getPickTime:()=>experimentalHistoricalMotion.clock.elapsed,staged:true,resourceRegistry});motion.reset();}
  catch(error){binding?.dispose();motion?.dispose();entry.motionPreparing=null;onBakedWalkError(entry.profile,error);return;}
  pending.ready=Promise.resolve().then(()=>pipelineAdmission.prepareAndPublish(actor.root,{signal:controller.signal,include:actor.admissionObjects?.()??[],materialAlternatives:binding.materialAlternatives()},()=>{if(!current())return;binding.activate();entry.motion=motion;entry.motionBinding=binding;entry.motionPreparing=null;adopted=true;})).then(()=>{if(adopted)onSelectableChange();}).catch(error=>{if(current())onBakedWalkError(entry.profile,error);}).finally(()=>{
   if(entry.motionPreparing===pending)entry.motionPreparing=null;
   if(!closed&&entries.get(id)===entry){
    requestBakedFall(id,entry);
    requestBakedGetUp(id,entry);
    if(isWorkerWaitingWoundedHome(entry.entity))requestBakedIdle(id,entry);
    if(entry.bakeResource)resumeBakedWalk(id,entry);
   }
   if(!adopted){const release=()=>{binding.dispose();motion.dispose();};if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(actor.root,release);else release();}
  });
 }
 function retireHistoricalMotion(actor,binding,motion){
  // The acquired scoped binding owns its selected meshes. Restore the other
  // CPU sources now, while the previous material objects remain pinned for Draw.
  binding?.detach();
  const release=()=>{binding?.dispose();motion?.dispose();};
  if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(actor.root,release);else release();
 }
 function retireNative(value,cancelledCarry=null){
  for(const participant of value.gateParticipants??[])participant.cancel();
  const proof=value.nativeIdleCycleBinding??value.nativeIdleStrollBinding??value.nativeFarmArrivalBinding??value.nativeHomeRouteBinding,materialOwner=cancelledCarry?.entry??(proof?entries.get(`worker-${proof.reference.actorId}`):null),kind=cancelledCarry?'carry':value.nativeIdleCycleBinding?'idle':'finiteRoute';
  const actionOwner=value.nativeActionBinding&&entries.get(`worker-${nativeTaskActionActor(value.nativeActionBinding.reference.request)}`),carryMaterials=actionOwner?.retainedNativeMaterials?.carry;
  if(carryMaterials)actionOwner.retainedNativeMaterials.carry=null;
  if(value.reusableIdleCycle&&materialOwner?.nativeState?.nativeIdleCycleBinding&&materialOwner.nativeState!==value&&value.variant.canReuse()){retainIdleGraph(value,materialOwner);return;}
   const release=()=>{carryMaterials?.();value.binding.dispose({retainMaterials:materialOwner?releaseMaterials=>{
   // Keep only the latest materials in each actor slot. A cancelled Carry
   // keeps compiled stages available for its retry after losing its binding.
   // Binding/clock ownership is gone; motion data still retires below.
   if(closed||entries.get(materialOwner.entity?.id)!==materialOwner||cancelledCarry&&materialOwner.nativeState!==cancelledCarry.source){releaseMaterials();return;}
   const retained=materialOwner.retainedNativeMaterials??={idle:null,finiteRoute:null};retained[kind]?.();retained[kind]=releaseMaterials;
  }:null});value.variant.dispose();value.motion.dispose();};
  if(typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(value.actor.root,release);else release();
 }
  function retainIdleGraph(value,entry){
   const retained=entry.retainedNativeMaterials??={idle:null,finiteRoute:null};let available=false,released=false,taken=false,settle;const ready=new Promise(resolve=>settle=resolve),dispose=()=>{value.binding.dispose();value.variant.dispose();value.motion.dispose();};
   const release=()=>{if(released||taken)return;released=true;if(available){dispose();release.idleCycle=null;if(retained.idle===release)retained.idle=null;}};
   release.idleCycle=value;release.ready=ready;release.take=()=>{if(!available||released||taken)return null;taken=true;release.idleCycle=null;return value;};
   const old=retained.idle;retained.idle=release;old?.();
   const retire=()=>{if(released||closed||entries.get(entry.entity?.id)!==entry||!value.variant.canReuse()){released=true;dispose();release.idleCycle=null;if(retained.idle===release)retained.idle=null;settle(false);return;}try{value.binding.suspend();value.variant.suspend();available=true;settle(true);}catch(error){released=true;dispose();release.idleCycle=null;if(retained.idle===release)retained.idle=null;settle(false);throw error;}};
   if(typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(value.actor.root,retire);else retire();
  }
  async function takeIdleGraph(entry,support,clipBakes,signal){
   const slot=entry.retainedNativeMaterials?.idle,value=slot?.idleCycle;if(!value)return null;
   let abort;try{await Promise.race([slot.ready,new Promise((_,reject)=>{abort=()=>reject(new DOMException('Idle graph reuse cancelled','AbortError'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();})]);}finally{signal.removeEventListener('abort',abort);}
   if(signal.aborted)throw new DOMException('Idle graph reuse cancelled','AbortError');if(entry.retainedNativeMaterials?.idle!==slot||!slot.idleCycle)return null;if(!value.motion.canReuseNativeIdleCycle(support)||!value.variant.canReuse()||value.clipBakes.length!==clipBakes.length||value.clipBakes.some((bake,i)=>bake!==clipBakes[i])){slot();return null;}entry.retainedNativeMaterials.idle=null;return slot.take();
  }
 function nativeLocomotionEntity(entry,carrying,allowGateWait=false){const entity=entry.entity;return entity&&!entity.recovery&&!entity.recoveryExitRemaining&&!entity.fallRemaining&&!entity.incapacitated&&(!entity.gateWaiting||allowGateWait)&&(carrying?carryingConfirmed(entity):!entity.crateId&&['walking','arriving','returning'].includes(entity.status));}
 function homeExitPhases(motion,getPickTime,{recoveryExit=RECOVERY_EXIT_SECONDS}){
  return {
   resolveExit:(_fallback,seconds)=>motion.timeNode.negate().add(recoveryExit).div(seconds).clamp(0,1),
   sampleExit:()=>workerRecoveryExitRemaining(motion.sample(getPickTime()).relativeTime,recoveryExit),
   status:()=>({exit:true})
  };
 }

    function prepareNativeRoute(actorId,support,options){return prepareWorkerRoute(actorId,support,options,null);}
    function prepareRecoveredWorkerRoute(source,options){
      const profile=nativeWorkerRouteRecoveryProfile(source?.resources?.kind),farm=profile.kind===23,home=profile.kind===18,task=profile.kind===14,carry=profile.kind===16;
      const resources=profile.copyResources(source.resources,source.recoveryCut),b=resources[profile.bindingField],r=b.reference;
      const actorId='worker-'+r.actorId,entry=entries.get(actorId);
      if(!entry||entry.nativePending||entry.nativeState||b.gateIds.length>profile.maxGates||
         typeof options.isCurrent!=='function')throw Error('Recovery requires a fresh worker');
      const current=()=>{try{
        const worker=entry.entity,e=source.execution;
        const endpoint=home&&state.workers.length===1&&woundedHomeExecutionAtEndpoint(state,worker,e);
        if(e.kind!==profile.executionKind||e.arrived&&!endpoint||e.actorId!==r.actorId||e.bodyId!==r.bodyId||
           !profile.sameAttestation(e.binding,b)||state.elapsed!==e.executedThrough||
           !home&&!task&&!carry&&entry.profile!==(farm?r.sourceRequest.workerProfile:r.workerProfile)||
           worker.nativeRouteAdmission!==profile.admission)return false;
        if(carry){
          const crate=state.crates.find(crate=>crate.id===worker.crateId),center=state.structures.find(center=>center.id===worker.centerId);
          return nativeLocomotionEntity(entry,true,b.gateIds.length>0)&&nativeDeliveryProjectionMatches(e,worker,crate,center,state.elapsed);
        }
        if(task){
          const job=tasks.get(worker.taskId);
          return nativeLocomotionEntity(entry,false,b.gateIds.length>0)&&worker.status==='walking'&&
            job?.workerId===worker.id&&nativeEntityNumericId(job.id)===r.taskId&&
            nativeEntityNumericId(job.targetId)===r.targetId&&e.taskId===r.taskId&&e.targetId===r.targetId&&
            Array.isArray(worker.path)&&worker.path.length===0&&worker.heading===e.yaw&&worker.running===e.running&&
            worker.gateWaiting===(e.currentSpeed===0)&&
            ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===e[key]);
        }
        if(home){
          const sourceHome=nativeHomeRouteSource(r),destination=sourceHome.home;
          const village=state.villages.find(row=>nativeEntityNumericId(row.id)===destination.villageId),arrival=village?.entry??village;
          const flight=Boolean(sourceHome.raidSpawnSequence),validWorker=sourceHome.recoveryHit?
            b.gateIds.length===0&&!worker.crateId&&woundedHomeSourceCurrent(state,worker,sourceHome,
              e.executedThrough-r.worldBoundary.effectiveTime):flight?
            !!source.recoveryCut&&worker.status==='fleeing'&&!worker.crateId&&!worker.recovery&&!worker.recoveryExitRemaining&&
              !worker.fallRemaining&&!worker.incapacitated&&(!worker.gateWaiting||b.gateIds.length>0):
            nativeLocomotionEntity(entry,false,b.gateIds.length>0)&&worker.status==='returning';
          return validWorker&&
            !worker.taskId&&!worker.raidReturn&&worker.path===null&&nativeEntityNumericId(worker.villageId)===destination.villageId&&
            e.villageId===destination.villageId&&arrival?.x===destination.x&&arrival.z===destination.z&&
            worker.heading===e.yaw&&worker.running===e.running&&worker.gateWaiting===(!e.arrived&&e.currentSpeed===0)&&
            ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===e[key]);
        }
        if(farm){
          const {pose,goal,centerId}=nativeFarmArrivalBoundState(state,worker);
          const request=r.sourceRequest,refugeMatches=request.version===2?
            worker.raidReturn===true&&worker.nativeRefugeSequence===request.refugeSequence:
            !worker.raidReturn&&worker.nativeRefugeSequence===undefined;
          return refugeMatches&&centerId===request.centerId&&Object.keys(goal).every(k=>goal[k]===request.goal[k])&&
            (worker.radius===undefined||worker.radius===request.pose.radius)&&
            Object.keys(pose).every(k=>pose[k]===e[k])&&worker.running===e.running&&
            worker.gateWaiting===(e.currentSpeed===0);
        }
        const {pose,idleState}=nativeIdleStrollLiveState(state,worker);
        return Object.keys(pose).every(k=>pose[k]===e.pose[k])&&idleState.rng===e.walkState.rng&&
          idleState.approachRetry===e.walkState.approachRetry&&idleState.remaining===nativeIdleStrollWalkRemaining(r)&&
          idleState.destination.x===r.destination.x&&idleState.destination.z===r.destination.z&&
          entry.entity.centerId==='structure-'+r.centerId&&idleState.anchorId==='farm-'+(r.anchor.kind===1?'plant':'structure')+'-'+r.anchor.id;
      }catch{return false;}};
      if(!current())throw Error('Recovery pose or committed owner differs');
      const support=source.terrain.prepareNativeRoute(resources.presentation,{terrainManifest:source.terrainManifest});
      const proofField=carry?'nativeConsequenceBinding':profile.bindingField;
      return prepareWorkerRoute(actorId,support,options,{resources,current,recoveryCut:source.recoveryCut,
        binding:{[proofField]:b,[profile.clockField]:r,...(home||carry?{}:farm?
          {farmTaskPolicy:completedFarmPolicy(entry.entity,r.sourceRequest)}:task?
          {taskHomePolicy:farmTaskPolicy(entry.entity)}:{strollHomePolicy:farmTaskPolicy(entry.entity)})}});
    }
    function prepareRecoveredStoppedWorker({resources,execution,terrain,terrainManifest},options){
      const profile=nativeWorkerRouteRecoveryProfile(resources.kind),validated=profile.copyResources(resources),
        proof=validated[profile.bindingField],ref=proof.reference,farm=proof.farm,stroll=proof.stroll,
        pendingTask=farm??stroll,q=farm?.reference.sourceRequest??stroll?.reference;
      const actorId='worker-'+ref.actorId,entry=entries.get(actorId),pose=pendingTask?execution.pose:proof.held.pose;
      const current=()=>{
        const worker=entry?.entity,task=tasks.get(worker?.taskId);
        return !!worker&&options.isCurrent()&&execution.executedThrough===state.elapsed&&worker.nativeRouteAdmission===profile.admission&&
          !worker.crateId&&!worker.recovery&&!worker.incapacitated&&!worker.raidReturn&&worker.path===null&&worker.running===false&&worker.gateWaiting===false&&
          worker.heading===pose.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===pose[key])&&
          (pendingTask?worker.status==='waiting-task'&&worker.profile===q.workerProfile&&worker.centerId==='structure-'+q.centerId&&
            task?.workerId===actorId&&task.id==='task-'+proof.request.taskId&&nativeEntityNumericId(task.targetId)===proof.request.targetId:
            worker.status==='returning'&&!worker.taskId&&worker.villageId==='village-'+proof.request.home.villageId);
      };
      if(!current()||entry.nativePending||entry.nativeState)throw Error('Recovered stop differs from the confirmed worker');
      const support=farm?terrain.prepareNativeFarmArrivalProposal(validated.farmTemplate,{terrainManifest}):
        stroll?terrain.prepareNativeIdleStrollProposal(validated.strollTemplate,{terrainManifest}):
        terrain.prepareNativeTaskStartProposal(validated.taskTemplate,{terrainManifest});
      const foot=terrain.prepareNativeBody(proof.bodyReference,Float64Array.from(proof.proof.projection.routeEffects.rows.slice(8,26)));
      if(!support?.valid()||!foot?.valid())throw Error('Recovered stop source terrain is unavailable');
      let held=proof.held;
      if(pendingTask){
        const sourceReference=pendingTask.reference,{suspendedAt,resumeGeneration,nativeRoute}=proof.bodyReference;
        const source={version:1,actorId:ref.actorId,bodyId:ref.bodyId,sourceReference,assignmentSequence:pendingTask.assignmentSequence,
          resumeHandle:{...nativeRoute.routeHandle,generation:resumeGeneration},suspendedAt,executedThrough:execution.executedThrough,pose};
        if(farm)held=copyNativeFarmArrivalHeldExecution({kind:'native-farm-arrival-held-execution',...source});
        else{
          const age=suspendedAt-sourceReference.worldBoundary.effectiveTime;
          held=copyNativeIdleStrollHeldExecution({kind:'native-idle-stroll-held-execution',...source,walkState:{mode:'walk',
            rng:q.walkRng,approachRetry:Math.max(0,q.approachRetry-age),age,...(q.version===2?{remaining:q.walkRemaining}:{})}});
        }
      }
      const routeSupport={...support,valid:()=>support.valid()&&foot.valid(),presentation:{...support.presentation,kind:'native-route-presentation',
        version:1,nativeRoute:proof.bodyReference.nativeRoute,executionScope:'canonical-native',nativeCrossingAdmitted:false,gates:[]}};
      return prepareWorkerRoute(actorId,routeSupport,{...options,getPickTime:()=>options.getProjection(ref.selector,ref.epoch).at},
        {resources:validated,current,stopped:{support,foot,gateCount:farm?proof.proof.reference.gates.length:0,
          getProjection:()=>options.getProjection(ref.selector,ref.epoch)},
        binding:{[farm?'nativeHeldFarmArrival':stroll?'nativeHeldIdleStroll':'nativeHeldTaskRoute']:held,nativeStopped:ref.selector,suspended:proof.bodyReference}});
    }
    function recoveredStoppedWorkerCurrent(actorId,ref,profile){
      const value=entries.get(actorId)?.nativeState;
      return !!value?.nativeStopped&&profile.sameReference(value.nativeStopped,ref)&&
        value.suspended?.bodyId===ref.bodyId&&value.motion.valid()&&value.variant.current();
    }
    async function prepareWorkerRoute(actorId,support,{getPickTime,getPickIdleOffset,signal,isCurrent=()=>true,prepareGateParticipants=null}={},recovery){
  const entry=entries.get(actorId),packet=copyNativeRoutePresentation(support?.presentation),carrying=(packet.motionFlags&8)!==0,crateId=carrying?entry?.entity?.crateId:null;
  const woundedHome=!!recovery?.binding.nativeHome?.sourceRequest?.recoveryHit;
  if(entry?.nativePending?.nativeAction)throw Error('Native action preparation is in progress');
  if(closed||!entry||historyRun||typeof getPickTime!=='function'||typeof isCurrent!=='function'||typeof pipelineAdmission?.prepareAndPublish!=='function'||packet?.motionMode!=='worker'||support.valid?.()!==true||signal?.aborted||isCurrent()!==true||!(recovery?recovery.current():nativeLocomotionEntity(entry,carrying,packet.nativeCrossingAdmitted))||!!(packet.motionFlags&48)&&!woundedHome)throw Error('Native worker preparation unavailable');
  // Running/walking phases and their boundary belong to the native table.
  let requiresRun=false,requiresIdle=!!recovery||!carrying&&packet.rows.length===16;for(let i=0;i+16<packet.rows.length;i+=16){if(packet.rows[i+15]<=0&&!carrying)requiresIdle=true;if(packet.rows[i+14]!==0)requiresRun=true;}
  if(carrying&&requiresRun)throw Error('Native carrying route cannot use running poses');
  const previous=entry.nativeState;if(previous&&!previous.suspended&&sameNativeReference(previous.nativeRoute,packet.nativeRoute)&&previous.motion.valid()&&previous.variant.current()){const prior=previous.packet;if(!sameNativeGatePresentations(prior.gates,packet.gates)||previous.crateId!==crateId||['motionMode','motionFlags','profile','radius','executionScope','nativeCrossingAdmitted','startTime','endTime'].some(key=>prior[key]!==packet[key])||prior.rows.length!==packet.rows.length||prior.rows.some((value,index)=>!Object.is(value,packet.rows[index])))throw Error('Native assignment resource changed without a new identity');return {actorId,nativeRoute:previous.nativeRoute,start:previous.start,end:previous.end,reused:true};}
  entry.nativePending?.controller.abort();const controller=new AbortController(),pending={controller,stage:'loading',nativeRoute:packet.nativeRoute};entry.nativePending=pending;
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  let candidate=null,adopted=false;
  const current=()=>!closed&&!controller.signal.aborted&&entries.get(actorId)===entry&&entry.nativePending===pending&&(recovery?recovery.current():nativeLocomotionEntity(entry,carrying,packet.nativeCrossingAdmitted))&&(!carrying||entry.entity.crateId===crateId)&&support.valid()===true&&isCurrent()===true;
  function check(){if(!current())throw new DOMException('Native worker assignment changed','AbortError');}
  try{
   await entry.ready;check();
   // A replayed publication may already own an admission for this original rig.
   // nativePending prevents another historical binding from being started here.
   if(recovery&&entry.motionPreparing?.ready){await entry.motionPreparing.ready;check();}
   await entry.runRequestPromise;check();requestBakedWalk(actorId,entry);await entry.bakeResourcePromise;check();requestBakedWalk(actorId,entry);await entry.bakeRequestPromise;check();await entry.idleRequestPromise;check();requestBakedWalk(actorId,entry);await entry.bakeRequestPromise;check();
   if(carrying){requestBakedCarry(actorId,entry);await entry.carryRequestPromise;check();requestBakedWalk(actorId,entry);await entry.bakeRequestPromise;check();}
   if((carrying?!entry.actor?.hasBakedCarrying?.():!(entry.actor?.isBakedWalking?.()||entry.actor?.isBakedRunning?.()||entry.actor?.isBakedIdle?.()||(entry.nativeState||recovery)&&entry.actor?.hasBakedWalking?.()))||entry.motionPreparing||entry.bakePending||entry.bakeLoading||entry.runPending||entry.carryPending||entry.idlePending)throw Error('Native worker locomotion materials not ready');
   const needsRunning=!carrying&&(requiresRun||entry.actor.isBakedRunning?.()||previous?.preparedRun),needsIdle=!carrying&&(requiresIdle||entry.actor.isBakedIdle?.()||previous?.preparedIdle);if(needsIdle&&!bakedIdleBank)throw Error('Native worker idle resource unavailable');if(needsRunning&&!bakedRunBank)throw Error('Native worker running resource unavailable');
   const clipBakes=carrying?[]:await Promise.all([bakedWalkBank.get(entry.profile),...(needsRunning?[bakedRunBank.get(entry.profile)]:[]),...(needsIdle?[bakedIdleBank.get(entry.profile)]:[])]);check();
   pending.stage='preparing';entry.motionPreparing=pending;
   const actor=entry.actor,anchor=actor.root.getWorldPosition(new Vector3()),yaw=new Quaternion();actor.root.getWorldQuaternion(yaw);
   // The root remains where its original rig was admitted, also on a suffix
   // replacement. C++'s next route origin is a separate world-space position.
   const heading=Math.atan2(2*(yaw.w*yaw.y+yaw.x*yaw.z),1-2*(yaw.y*yaw.y+yaw.z*yaw.z)),motionOptions={actorId,support,anchorPosition:anchor,anchorYaw:heading,heightOffset:.025,resourceRegistry},motion=recovery?.stopped?createRecoveredStoppedWorkerGpuMotion({...motionOptions,support:recovery.stopped.support,height:recovery.stopped.foot.point.height,resources:recovery.resources,getProjection:recovery.stopped.getProjection}):recovery?createRecoveredWorkerRouteGpuMotion({...motionOptions,resources:recovery.resources,recoveryCut:recovery.recoveryCut}):createNativeGpuMotion(motionOptions);
   let variant,binding;
   try{
    const phases={runningNode:motion.runningNode,idleNode:motion.idleNode,resolve:(fallback,clip,duration)=>motion.resolve(fallback,clip,duration),sampleClip(){if(carrying)return 'Carry_Crate';const pose=motion.sample(getPickTime());return needsIdle&&pose.currentSpeed<=0?'Idle':pose.running?'Run':'Walk_Skip';},sampleForClip:(clip,duration)=>motion.sampleForClip(getPickTime(),clip,duration,recovery&&clip==="Idle"?getPickIdleOffset?.(duration):undefined)};
    if(woundedHome)Object.assign(phases,homeExitPhases(motion,getPickTime,recovery.binding.nativeHome.sourceRequest));
    variant=actor.prepareNativeMotionVariant(phases,{clipBakes,clip:carrying?'Carry_Crate':actor.isBakedIdle?.()?'Idle':!(actor.isBakedWalking?.()||actor.isBakedRunning?.())?'Walk_Skip':null});
    const options={motion,getPickTime,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)};
    binding=entry.motionBinding?entry.motionBinding.prepareReplacement(options):bindWebGpuActorMotion({root:actor.root,renderer,actorId,resourceRegistry,staged:true,...options});
    candidate={actor,motion,variant,binding,packet,support,crateId,...recovery?.binding,preparedRun:needsRunning,preparedIdle:needsIdle,nativeRoute:packet.nativeRoute,start:recovery?.stopped?recovery.binding.suspended.suspendedAt:packet.startTime,end:recovery?.stopped?Number.MAX_SAFE_INTEGER:packet.endTime};
   }catch(error){binding?.dispose();variant?.dispose();motion.dispose();throw error;}
   candidate.gateParticipants=[];
   const gateCount=recovery?.stopped?.gateCount??packet.gates.length;
   if(gateCount){if(typeof prepareGateParticipants!=='function'||typeof pipelineAdmission.prepareManyAndPublish!=='function')throw Error('Native gate resource admission unavailable');candidate.gateParticipants=prepareGateParticipants({packet,motion,getPickTime,signal:controller.signal});check();if(!Array.isArray(candidate.gateParticipants)||candidate.gateParticipants.length!==gateCount)throw Error('Incomplete native gate resource preparation');}
   const options={signal:controller.signal,include:variant.materialAlternatives.map(item=>item.mesh),materialAlternatives:binding.materialAlternatives()};
   const publish=()=>{
    check();if(!variant.valid()||!binding.canActivate())throw new DOMException('Native worker materials changed','AbortError');
    if(candidate.gateParticipants.some(participant=>!participant.valid()))throw new DOMException('Native gate materials changed','AbortError');
    const previous=entry.nativeState,oldMotion=entry.motion,oldBinding=entry.motionBinding;
    for(const participant of candidate.gateParticipants)participant.activate();variant.activate();binding.activate();if(previous)oldBinding?.detach();entry.motionBinding=binding;entry.motion=motion;entry.nativeState=candidate;entry.nativePending=null;entry.motionPreparing=null;adopted=true;
    for(const participant of candidate.gateParticipants)participant.finalize();
    if(previous)retireNative(previous);else if(oldBinding||oldMotion)retireHistoricalMotion(actor,oldBinding,oldMotion);
   };
   if(candidate.gateParticipants.length)await pipelineAdmission.prepareManyAndPublish([{object:actor.root,options},...candidate.gateParticipants.map(participant=>participant.request)],publish);
   else await pipelineAdmission.prepareAndPublish(actor.root,options,publish);
   if(!adopted)throw Error('Native worker preparation was not published');onSelectableChange();return {actorId,nativeRoute:candidate.nativeRoute,start:candidate.start,end:candidate.end};
  }finally{
   signal?.removeEventListener('abort',abort);if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;
   if(!adopted&&candidate)retireNative(candidate);
  }
 }
 async function prepareNativeResumeProposal(support,options){return prepareNativeMotionProposal(support,options);}
 async function prepareNativeFarmArrivalProposal(support,options){return prepareNativeMotionProposal(support,options,'farm-arrival');}
 async function prepareNativeHomeRouteProposal(support,options){return prepareNativeMotionProposal(support,options,'home');}
 async function prepareNativeIdleStrollProposal(support,options){return prepareNativeMotionProposal(support,options,'stroll');}
 async function prepareNativeTaskStartProposal(support,options){return prepareNativeMotionProposal(support,options,true);}
 async function prepareNativeTaskConsequenceProposal(support,options){return prepareNativeMotionProposal(support,options,'consequence');}
 async function prepareNativeHomeArrivalProposal(value,{signal}={}){
  let packet=copyNativeHomeArrivalProposal(value),ref=packet.nativeHomeArrival;const id=`worker-${ref.actorId}`,entry=entries.get(id),previous=entry?.nativeState;
  const entityCurrent=()=>{const e=entry?.entity,source=nativeHomeRouteSource(ref.sourceHome.reference),home=source.home;return !!e&&e.status===nativeHomeWorkerStatus(source)&&e.nativeRouteAdmission==='native-home'&&e.running===false&&e.gateWaiting===false&&e.heading===ref.pose.yaw&&!e.taskId&&!e.crateId&&(source.recoveryHit?e.incapacitated&&e.hits===2:!e.incapacitated)&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.raidReturn&&!e.path?.length&&e.villageId===`village-${home.villageId}`&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===ref.pose[k]);};
  const sourceCurrent=()=>!!previous?.nativeHomeRouteBinding&&JSON.stringify(previous.nativeHomeRouteBinding)===JSON.stringify(ref.sourceHome)&&previous.motion.valid()&&previous.variant.current()&&previous.binding.current();
  if(closed||!entry||historyRun||entry.nativePending||!pipelineAdmission||signal?.aborted||!entityCurrent()||!sourceCurrent())throw Error('Native Home arrival has no matching resident endpoint');
  const stamp=JSON.stringify(entry.entity),controller=new AbortController(),abort=()=>controller.abort(),pending={controller,stage:'loading',nativeHomeArrival:ref};entry.nativePending=pending;signal?.addEventListener('abort',abort,{once:true});let activated=false,captured=false,finished=false,committed=false,retired=false,actor=null,wasVisible=null;
  const current=()=>!closed&&!finished&&!controller.signal.aborted&&entries.get(id)===entry&&entry.nativePending===pending&&entry.nativeState===previous&&JSON.stringify(entry.entity)===stamp&&entityCurrent()&&sourceCurrent();
  const check=()=>{if(!current())throw new DOMException('Native Home arrival worker changed','AbortError');};
  function restore(){if(activated){actor.root.visible=wasVisible;activated=captured=false;onSelectableChange();}}
  function cancel(){if(finished)return false;restore();finished=true;controller.abort();if(entry.nativePending===pending)entry.nativePending=null;signal?.removeEventListener('abort',abort);return true;}
  try{
   await entry.ready;await entry.bakeResourcePromise;await entry.bakeRequestPromise;check();actor=entry.actor;if(!actor?.root)throw Error('Native Home arrival actor unavailable');wasVisible=actor.root.visible;
   const valid=()=>current()&&actor.root.visible===(activated&&!captured?false:wasVisible);
   function validateCommit(data){const proof=copyNativeHomeArrivalAttestation(data?.nativeHomeArrivalBinding);if(!valid()||!activated||!captured||!sameNativeHomeArrivalReference(proof.preparedReference,ref)||!nativeHomeArrivalPresentationMatches(packet,data.resources,proof))throw Error('Native Home absence differs from its issued retirement');return proof;}
   pending.stage='preparing';pending.cancel=cancel;
   // An absence needs no replacement material, route texture or pipeline.
   // Keep the old Home owner until the retained absent frame is presented.
   return {retainedGatePresentations:previous.packet.gates,requests:[],valid,validateCommit,cancel,
    rollback(){check();restore();},
    retarget(next){check();if(activated)throw Error('Native Home absence must be rolled back before retargeting');next=copyNativeHomeArrivalProposal(next);if(!nativeHomeArrivalSuccessor(ref,next.nativeHomeArrival))return false;packet=next;ref=next.nativeHomeArrival;pending.nativeHomeArrival=ref;return true;},
    activate(){if(!valid()||activated)throw Error('Native Home absence activation unavailable');actor.root.visible=false;activated=true;},
    afterCapture(){if(!valid()||!activated||captured)throw Error('Native Home absence capture unavailable');actor.root.visible=wasVisible;captured=true;},
    finalize(data){validateCommit(data);actor.root.visible=false;committed=true;finished=true;pending.stage='adopting';signal?.removeEventListener('abort',abort);onSelectableChange();},
    retire(){if(!committed||retired)return false;retired=true;if(entries.get(id)===entry&&entry.nativeState===previous){entry.nativeState=null;entry.motionBinding=null;entry.motion=null;retireNative(previous);}return true;}
   };
  }catch(error){cancel();throw error;}
 }
 function prepareNativeInitialIdleBodyProposal(support,options){return prepareNativeStationaryIdleProposal(support,options,false);}
 function prepareNativeIdleCycleProposal(support,options){return prepareNativeStationaryIdleProposal(support,options,true);}
 async function prepareRecoveredIdleCycle(source,support,options){
  const resources=nativeWorkerRouteRecoveryProfile(21).copyResources(source.resources),proof=resources.nativeIdleCycleBinding;
  const execution=source.execution,r=proof.reference;
  if(!execution||execution.kind!=='native-idle-cycle-execution'||execution.nextStatus!==(execution.finished?1:0)||
     execution.actorId!==r.actorId||execution.bodyId!==r.bodyId||!sameNativeIdleCycleAttestation(proof,execution.binding)||
     !sameNativeIdleCycleReference(r,support?.reference)||typeof options.isCurrent!=='function')throw Error('Idle cycle recovery needs its acquired program');
  const part=await prepareNativeStationaryIdleProposal(support,options,true,execution);
  try{
   await pipelineAdmission.prepareAndPublish(part.request.object,part.request.options,()=>{
    part.activate();part.finalize({nativeIdleCycleBinding:proof});
   });
   if(!recoveredIdleCycleCurrent('worker-'+r.actorId,r))throw Error('Recovered Idle materials were not published');
  }catch(error){part.cancel();throw error;}
 }
 async function prepareNativeStationaryIdleProposal(support,{getPickAge,getPickPhaseOffset=null,reuseClock=null,signal,isCurrent}={},cycle=false,recovered=null){
  const copyRef=cycle?copyNativeIdleCycleReference:copyNativeInitialIdleBodyReference,copyProof=cycle?copyNativeIdleCycleAttestation:copyNativeInitialIdleBodyAttestation,covers=cycle?nativeIdleCycleAttestationCovers:nativeInitialIdleBodyAttestationCovers,key=cycle?'nativeIdleCycle':'nativeInitialIdleBody',bindingKey=cycle?'nativeIdleCycleBinding':'nativeInitialIdleBodyBinding';
  let ref=copyRef(support?.reference);const id=`worker-${ref.actorId}`,entry=entries.get(id),previous=entry?.nativeState,q=cycle?nativeIdleCycleBodyState(ref.sourceBody):ref.sourceRequest,fromFailed=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-idle-stroll-failed-source',fromStroll=cycle&&ref.sourceCycleSequence===0&&isNativeIdleStrollArrivalSource(q),fromFarm=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-farm-arrival-idle-source',fromSettlement=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-settled-worker-idle-source';
  const completedAction=cycle?null:nativeInitialIdleActionSource(ref);
  const cancellation=cycle?null:ref.cancellationSource,cancelsAction=cancellation?.phase===15,cancelsPendingAction=cancellation?.phase===6;
  const sourceCurrent=()=>{
   if(recovered)return !previous&&isCurrent();
   if(cancelsPendingAction)return !previous;
   if(cancelsAction)return nativeTaskCancellationMatchesAction(cancellation,previous?.nativeActionBinding)&&previous.motion.valid();
   if(cancellation?.phase===25)return nativeTaskCancellationMatchesHeldRoute(cancellation,previous?.nativeHeldTaskRoute,previous?.suspended?.resumeGeneration)&&previous.motion.valid();
   if(cancellation?.phase===14){
    const packet=previous?.packet,rows=packet?.rows,i=(rows?.length??0)-16,p=cancellation.pose;
    return nativeTaskCancellationMatchesTerminalRoute(cancellation,previous?.nativeTaskStartBinding)&&i>=0&&rows[i]===packet.endTime&&rows[i+7]===1&&rows[i+14]===0&&rows[i+15]===0&&
      packet.radius===p.radius&&['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].every((key,j)=>p[key]===rows[i+[1,2,5,8,9,10,13][j]])&&previous.motion.valid();
   }
   if(completedAction){const source=previous?.nativeActionBinding;return !!source&&previous.motion.valid()&&source.actionSequence===completedAction.actionSequence&&
    sameNativeTaskActionReference(source.reference,completedAction.reference)&&sameNativeTaskActionReference(source.preparedReference,completedAction.preparedReference);}
   return !cycle||fromFailed?!previous:!!previous&&previous.motion.valid()&&(ref.sourceCycleSequence?previous.nativeIdleCycleBinding?.cycleSequence===ref.sourceCycleSequence&&JSON.stringify(previous.nativeIdleCycleBinding.reference.sourceBody)===JSON.stringify(ref.sourceBody):fromSettlement?nativeSettledIdleSourceMatches(q,previous.nativeSettlementBinding):fromFarm?idleCycleContinuesCompletedFarm(q,previous,entry.entity,state.elapsed):fromStroll?nativeIdleStrollArrivalSourceMatches(ref.sourceBody,previous.nativeIdleStrollBinding):JSON.stringify(previous.nativeInitialIdleBodyBinding)===JSON.stringify(ref.sourceBody));
  };
  const entityCurrent=()=>{const e=entry?.entity,idle=e?.idleState,stroll=previous?.nativeIdleStrollBinding?.reference;
   if(recovered)return !!e&&e.status==='idle'&&e.nativeRouteAdmission==='native-idle'&&e.profile===q.workerProfile&&
    nativeEntityNumericId(e.centerId)===q.centerId&&e.path===null&&!e.taskId&&!e.crateId&&!e.incapacitated&&!e.recovery&&
    !e.recoveryExitRemaining&&!e.fallRemaining&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&
    state.elapsed===recovered.executedThrough&&JSON.stringify(idle)===JSON.stringify(recovered.idleState)&&
    e.heading===q.pose.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===q.pose[k]);
   if(fromFailed)return pendingIdleStrollMatches(state,e,q.sourceRequest);
   if(cancelsPendingAction){
    const task=state.tasks?.find(t=>t.id===e?.taskId),a=e?.nativeTaskAction,p=cancellation.pose;
    return !!e&&e.status==='waiting-task'&&e.nativeRouteAdmission==='pending-action-resources'&&e.path===null&&
     !e.crateId&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&!e.running&&!e.gateWaiting&&
     e.profile===q.workerProfile&&nativeEntityNumericId(e.centerId)===q.centerId&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k])&&
     a?.version===1&&['initial','water'].includes(a.kind)&&Number.isFinite(a.duration)&&a.duration>0&&Number.isFinite(a.elapsed)&&a.elapsed>=0&&a.elapsed<=a.duration&&
     task?.id===`task-${cancellation.taskId}`&&task.workerId===id&&task.kind===a.kind&&task.targetId===`plant-${cancellation.targetId}`;
   }
   if(completedAction||cancelsAction){const action=(completedAction??previous?.nativeActionBinding)?.reference.request,task=state.tasks?.find(t=>t.id===e?.taskId),p=q.pose;
    if(!action)return false;
    const targetKind=action.actionKind==='repair'?'structure':'plant';
    return !!e&&e.status==='acting'&&e.nativeRouteAdmission==='native-action'&&!e.crateId&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&
     e.profile===q.workerProfile&&nativeEntityNumericId(e.centerId)===q.centerId&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k])&&
     (cancelsAction?e.nativeTaskAction?.elapsed>=0&&e.nativeTaskAction.elapsed<=action.duration:e.nativeTaskAction?.elapsed===action.duration)&&e.nativeTaskAction?.duration===action.duration&&e.nativeTaskAction?.kind===action.actionKind&&
     task?.id===`task-${action.taskId}`&&task.workerId===id&&task.kind===action.actionKind&&task.targetId===`${targetKind}-${action.targetId}`;
   }
   if(cancellation){
    const task=state.tasks?.find(t=>t.id===e?.taskId),p=cancellation.pose;
    return !!e&&e.status==='walking'&&e.nativeRouteAdmission==='native-task'&&!e.crateId&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&!e.nativeTaskAction&&
      e.profile===q.workerProfile&&nativeEntityNumericId(e.centerId)===q.centerId&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k])&&
      task?.id===`task-${cancellation.taskId}`&&task.workerId===id&&['initial','water'].includes(task.kind)&&task.targetId===`plant-${cancellation.targetId}`;
   }
   const reanchored=q.kind==='native-idle-stroll-reanchor-source'&&stroll;
   const strollAnchor=reanchored?'farm-plant-'+stroll.anchor.id:q.idleState.anchorId;
   const strollRetry=reanchored?Math.max(0,stroll.approachRetry-(stroll.endTime-stroll.worldBoundary.effectiveTime)):q.idleState.approachRetry;
   const sourcePhase=fromSettlement?idle===null&&!e.nativeTaskAction:fromFarm?idle===null&&e.destinationId===null&&farmPathMetadataCurrent(e)&&!e.nativeTaskAction:fromStroll?!!stroll&&!!idle&&Object.keys(idle).every(k=>['anchorId','mode','elapsed','remaining','rng','approachRetry','destination'].includes(k))&&idle.mode==='walk'&&idle.elapsed===0&&idle.remaining===nativeIdleStrollWalkRemaining(stroll)&&idle.anchorId===strollAnchor&&idle.rng===stroll.walkRng&&idle.approachRetry===strollRetry&&e.destinationId===(nativeIdleStrollApproachesAnchor(stroll)?strollAnchor:`idle-${id}`)&&idle.destination?.id===e.destinationId&&idle.destination.x===stroll.destination.x&&idle.destination.z===stroll.destination.z:cycle?!!idle&&['rest','watch'].includes(idle.mode)&&(!ref.sourceCycleSequence?JSON.stringify(idle)===JSON.stringify(ref.initialState):true):JSON.stringify(idle)===JSON.stringify(q.idleState);
   return !!e&&e.profile===q.workerProfile&&nativeEntityNumericId(e.centerId)===q.centerId&&e.status===(fromFarm?'arriving':'idle')&&e.nativeRouteAdmission===(fromSettlement?undefined:fromFarm?'native-farm-arrival':fromStroll?'native-idle-stroll':cycle?'native-idle':'pending-idle-resources')&&e.path===null&&!e.taskId&&!e.crateId&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&e.heading===q.pose.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===q.pose[k])&&sourcePhase;
  };
  const historicalReady=(!cycle||recovered)&&!previous?entry?.motionPreparing?.ready:null;
  if(closed||!entry||historyRun||entry.nativePending||entry.motionPreparing&&!historicalReady||!sourceCurrent()||cycle&&!!previous&&!previous.variant.current()||!pipelineAdmission||!bakedIdleBank||!bakedAlertBank||support?.kind!==(cycle?'native-idle-cycle-terrain-support':'native-initial-idle-body-terrain-support')||support.valid?.()!==true||typeof getPickAge!=='function'||signal?.aborted||!entityCurrent())throw Error('Native initial Idle body has no matching pending worker');
  const entityStamp=()=>{
   if(!cancelsAction)return JSON.stringify(entry.entity);
   const {nativeTaskAction,actionRemaining,...owned}=entry.entity;
   return JSON.stringify({...owned,kind:nativeTaskAction?.kind,duration:nativeTaskAction?.duration});
  };
  const stamp=entityStamp(),controller=new AbortController(),abort=()=>controller.abort(),pending={controller,stage:'loading',[key]:ref};entry.nativePending=pending;signal?.addEventListener('abort',abort,{once:true});let candidate=null,activated=false,finished=false,locked=false;
  const current=()=>!closed&&!finished&&!controller.signal.aborted&&entries.get(id)===entry&&entry.nativePending===pending&&(!locked||entry.motionPreparing===pending)&&entityStamp()===stamp&&entityCurrent()&&support.valid()===true&&sourceCurrent()&&entry.nativeState===(activated?candidate:previous);
  const check=()=>{if(!current()||historicalReady&&historyRun)throw new DOMException('Native initial Idle worker changed','AbortError');};
  try{
   // The native reservation blocks new preparation while the original rig
   // finishes its current binding. Take the replacement source after that handoff.
   if(historicalReady){
    let cancelWait;
    try{await Promise.race([historicalReady,new Promise((_,reject)=>{cancelWait=()=>reject(new DOMException('Native initial Idle preparation cancelled','AbortError'));controller.signal.addEventListener('abort',cancelWait,{once:true});})]);}
    finally{controller.signal.removeEventListener('abort',cancelWait);}
    check();
   }
   const oldMotion=entry.motion,oldBinding=entry.motionBinding;
   await entry.ready;check();
   requestBakedWalk(id,entry);await entry.bakeResourcePromise;check();
   // Download readiness is not installation readiness. An already-started
   // Idle/Alert install owns the material slot and can defer Walk's request.
   // Join that owner before requesting/awaiting the existing Walk installer.
   await entry.idleRequestPromise;check();await entry.alertRequestPromise;check();
   requestBakedWalk(id,entry);await entry.bakeRequestPromise;check();
   if(!entry.actor?.hasBakedWalking?.())throw Error('Native initial Idle body resource unavailable');
   // Reuse the roster's existing preparation lock after initial Walk is ready.
   // Deferred ordinary clip installs cannot replace this candidate's materials.
   entry.motionPreparing=pending;locked=true;
   const clipBakes=await Promise.all([bakedIdleBank.get(entry.profile),bakedAlertBank.get(entry.profile)]);check();
   const actor=entry.actor;let picking={reference:ref,getPickAge,getPickPhaseOffset},motion,variant,binding,reused=false;const pickAge=()=>picking.getPickAge(picking.reference);
   try{
    const cached=cycle&&typeof reuseClock==='function'?await takeIdleGraph(entry,support,clipBakes,controller.signal):null;
    if(cached){motion=cached.motion;variant=cached.variant;binding=cached.binding;picking=cached.picking;picking.reference=ref;picking.getPickAge=getPickAge;picking.getPickPhaseOffset=getPickPhaseOffset;check();if(!motion.reuseNativeIdleCycle(support,{retagClock:reuseClock}))throw Error('Retired Idle graph is incompatible');variant.prepareReuse();binding.prepareReuse(oldBinding,pickAge);reused=true;}
    else{const anchor=actor.root.getWorldPosition(new Vector3()),yaw=new Quaternion();actor.root.getWorldQuaternion(yaw);const heading=Math.atan2(2*(yaw.w*yaw.y+yaw.x*yaw.z),1-2*(yaw.y*yaw.y+yaw.z*yaw.z));motion=(cycle?createNativeIdleCycleGpuMotion:createNativeInitialIdleBodyGpuMotion)({actorId:id,support,anchorPosition:anchor,anchorYaw:heading,heightOffset:.025});
     const phases={clipNames:motion.clipNames,clipNode:motion.clipNode,resolve:motion.resolve,sampleClip:()=>motion.sampleClip(pickAge()),sampleForClip:(clip,duration)=>motion.sampleForClip(pickAge(),clip,duration,cycle&&picking.getPickPhaseOffset?picking.getPickPhaseOffset(picking.reference,duration):undefined)};variant=actor.prepareNativeMotionVariant(phases,{clipBakes,clip:actor.isBakedAlert?.()?'Alert':actor.isBakedIdle?.()?'Idle':'Walk_Skip'});const options={motion,getPickTime:pickAge,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)};binding=oldBinding?oldBinding.prepareReplacement(options):bindWebGpuActorMotion({root:actor.root,renderer,actorId:id,resourceRegistry,staged:true,...options});
    }
    candidate={actor,motion,variant,binding,support,picking,clipBakes,reusableIdleCycle:cycle&&typeof reuseClock==='function'&&variant.canReuse(),[key]:ref,nativeRoute:null,start:ref.worldBoundary.effectiveTime,end:Number.MAX_SAFE_INTEGER,gateParticipants:[]};
   }catch(error){binding?.dispose();variant?.dispose();motion?.dispose();throw error;}
   const valid=()=>current()&&(activated?variant.current()&&binding.current():variant.valid()&&binding.canActivate());
   function restore(){if(activated){if(oldBinding)binding.rollbackActivation();else binding.detach();variant.rollbackActivation();entry.nativeState=previous;entry.motion=oldMotion;entry.motionBinding=oldBinding;activated=false;}}
   function cancel(){if(finished)return false;restore();finished=true;controller.abort();if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;signal?.removeEventListener('abort',abort);retireNative(candidate);return true;}
   function validateCommit(data){const proof=copyProof(data?.[bindingKey]);if(!valid()||!activated||!covers(proof,ref))throw Error('Native initial Idle body differs from its issued source');return proof;}
   pending.stage='preparing';pending.cancel=cancel;pending.candidate=candidate;const part={reused,request:{object:actor.root,options:{signal:controller.signal,include:variant.materialAlternatives.map(item=>item.mesh),materialAlternatives:binding.materialAlternatives()}},valid,validateCommit,rollback(){check();restore();},cancel,
    retarget(nextSupport,options){check();if(activated)throw Error('Native initial Idle body must be rolled back before retargeting');const result=(cycle?motion.retargetNativeIdleCycle:motion.retargetNativeInitialIdleBody)(nextSupport,options);if(!result)return false;ref=copyRef(nextSupport.reference);picking.reference=ref;support=nextSupport;pending[key]=ref;candidate[key]=ref;candidate.support=support;candidate.start=ref.worldBoundary.effectiveTime;return true;},
    activate(){if(!valid()||activated)throw Error('Native initial Idle activation unavailable');variant.activate();try{binding.activate();}catch(error){variant.rollbackActivation();throw error;}entry.nativeState=candidate;entry.motion=motion;entry.motionBinding=binding;activated=true;},
    finalize(data){const proof=validateCommit(data);candidate[bindingKey]=proof;candidate.start=proof.reference.worldBoundary.effectiveTime;motion.setExecutionEpoch(candidate.start);motion.seal();entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;finished=true;signal?.removeEventListener('abort',abort);if(previous)retireNative(previous);else if(oldBinding||oldMotion)retireHistoricalMotion(actor,oldBinding,oldMotion);onSelectableChange();}
   };
   if(previous)attachNativeSourcePresentation(part,()=>activated);
   return part;
  }catch(error){if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;controller.abort();signal?.removeEventListener('abort',abort);if(candidate)retireNative(candidate);throw error;}
 }
 function releaseNativeIdleCycle(actorId,value){
  const proof=copyNativeIdleCycleAttestation(value),entry=entries.get(actorId),held=entry?.nativeState;
  if(!held?.nativeIdleCycleBinding||held.nativeIdleCycleBinding.cycleSequence!==proof.cycleSequence||!sameNativeIdleCycleReference(held.nativeIdleCycleBinding.reference,proof.reference))return false;
  entry.nativePending?.cancel?.();entry.nativePending?.controller.abort();entry.nativePending=null;entry.nativeState=null;entry.motionBinding=null;entry.motion=null;held.binding.detach();held.variant.deactivate();retireNative(held);entry.actor.update();onSelectableChange();return true;
 }
 function releaseNativeInitialIdleBody(actorId,value){
  const proof=copyNativeInitialIdleBodyAttestation(value),entry=entries.get(actorId),held=entry?.nativeState;if(!held?.nativeInitialIdleBodyBinding||held.nativeInitialIdleBodyBinding.bodySequence!==proof.bodySequence||!sameNativeInitialIdleBodyReference(held.nativeInitialIdleBodyBinding.reference,proof.reference))return false;
  entry.nativePending?.cancel?.();entry.nativePending?.controller.abort();entry.nativePending=null;entry.nativeState=null;entry.motionBinding=null;entry.motion=null;held.binding.detach();held.variant.deactivate();retireNative(held);entry.actor.update();onSelectableChange();return true;
 }
 async function prepareRecoveredTaskSettlement({execution,resources},support,options){
  const profile=nativeWorkerRouteRecoveryProfile(17),proof=profile.copyResources(resources).nativeTaskSettlementBinding;
  const ref=proof.reference,id=`worker-${ref.actorId}`,entry=entries.get(id);
  if(!entry||!profile.sameAttestation(execution?.binding,proof)||!profile.sameReference(ref,support?.reference)||
     typeof options.isCurrent!=='function')throw Error('Settlement recovery needs its acquired body');
  const recoveryCurrent=()=>options.isCurrent()&&nativeTaskSettlementProjectionMatches(execution,entry.entity,
    state.crates.find(crate=>crate.id===`crate-${ref.crateId}`),state.structures.find(center=>center.id===entry.entity?.centerId),state.elapsed);
  const part=await prepareNativeTaskSettlementProposal(support,{...options,recoveryCurrent});
  try{
   await pipelineAdmission.prepareAndPublish(part.request.object,part.request.options,()=>{
    part.activate();part.finalize({nativeTaskSettlementBinding:proof});
   });
   if(!recoveredTaskSettlementCurrent(id,ref))throw Error('Recovered settlement materials were not published');
  }catch(error){part.cancel();throw error;}
 }
 function recoveredTaskSettlementCurrent(id,ref){
  const settled=entries.get(id)?.nativeState;
  return !!settled?.nativeSettlementBinding&&sameNativeTaskSettlementReference(settled.nativeSettlementBinding.reference,ref)&&
    settled.motion.valid()&&settled.variant.current();
 }
 async function prepareNativeTaskSettlementProposal(support,{getPickAge,signal,recoveryCurrent=null}={}){
  let ref=copyNativeTaskSettlementReference(support?.reference);const id=`worker-${ref.actorId}`,entry=entries.get(id),previous=entry?.nativeState;
  let oldMotion=entry?.motion,oldBinding=entry?.motionBinding;
  const entityCurrent=recoveryCurrent??(()=>carryingConfirmed(entry?.entity)&&entry.entity.crateId===`crate-${ref.crateId}`&&!entry.entity.recovery&&!entry.entity.recoveryExitRemaining&&!entry.entity.fallRemaining&&!entry.entity.incapacitated&&!entry.entity.gateWaiting);
  const sourceCurrent=()=>recoveryCurrent?!previous:!!previous?.nativeConsequenceBinding&&JSON.stringify(previous.nativeConsequenceBinding)===JSON.stringify(ref.sourceCarry)&&previous.motion.valid();
  if(closed||!entry||historyRun||entry.nativePending||!pipelineAdmission||!bakedIdleBank||support?.kind!=='native-task-settlement-terrain-support'||support.valid?.()!==true||typeof getPickAge!=='function'||signal?.aborted||!entityCurrent()||!sourceCurrent()||!recoveryCurrent&&!previous.variant.current())throw Error('Native settlement has no matching source worker');
  const stamp=JSON.stringify(entry.entity),controller=new AbortController(),abort=()=>controller.abort(),pending={controller,stage:'loading',nativeSettlement:ref};entry.nativePending=pending;signal?.addEventListener('abort',abort,{once:true});let candidate=null,activated=false,finished=false,locked=false;
  const current=()=>!closed&&!finished&&!controller.signal.aborted&&entries.get(id)===entry&&entry.nativePending===pending&&(!locked||entry.motionPreparing===pending)&&JSON.stringify(entry.entity)===stamp&&entityCurrent()&&sourceCurrent()&&support.valid()===true&&entry.nativeState===(activated?candidate:previous);
  const releasePreparation=()=>{if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;signal?.removeEventListener('abort',abort);};
  const check=()=>{if(!current())throw new DOMException('Native settlement worker changed','AbortError');};
  try{
   await entry.ready;check();
   if(recoveryCurrent&&entry.motionPreparing?.ready){await entry.motionPreparing.ready;check();}
   await entry.bakeResourcePromise;await entry.bakeRequestPromise;check();if(!entry.actor?.hasBakedWalking?.())throw Error('Native settlement body resource unavailable');
   if(recoveryCurrent){
    if(historyRun||entry.motionPreparing)throw Error('Native settlement recovery rig is still owned');
    entry.motionPreparing=pending;locked=true;oldMotion=entry.motion;oldBinding=entry.motionBinding;
   }
   const idle=await bakedIdleBank.get(entry.profile);check();const actor=entry.actor,anchor=actor.root.getWorldPosition(new Vector3()),yaw=new Quaternion();actor.root.getWorldQuaternion(yaw);const heading=Math.atan2(2*(yaw.w*yaw.y+yaw.x*yaw.z),1-2*(yaw.y*yaw.y+yaw.z*yaw.z)),motion=createNativeTaskSettlementGpuMotion({actorId:id,support,anchorPosition:anchor,anchorYaw:heading,heightOffset:.025});let variant,binding;const pickAge=()=>getPickAge(ref);
   try{const phases={clipNames:motion.clipNames,clipNode:motion.clipNode,resolve:motion.resolve,sampleClip:()=>motion.sampleClip(pickAge()),sampleForClip:(clip,duration)=>motion.sampleForClip(pickAge(),clip,duration)};variant=actor.prepareNativeMotionVariant(phases,{clipBakes:[idle],clip:recoveryCurrent&&actor.isBakedIdle?.()?'Idle':'Walk_Skip'});
    const options={motion,getPickTime:pickAge,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)};
    binding=oldBinding?oldBinding.prepareReplacement(options):bindWebGpuActorMotion({root:actor.root,renderer,actorId:id,resourceRegistry,staged:true,...options});
    // This is resident graph coverage, as for an already pinned native body.
    // The direct consumer's association/clock alone grants actual draw time.
    candidate={actor,motion,variant,binding,support,nativeSettlement:ref,nativeRoute:null,start:ref.worldBoundary.effectiveTime,end:Number.MAX_SAFE_INTEGER,gateParticipants:[]};
   }catch(error){binding?.dispose();variant?.dispose();motion.dispose();throw error;}
   const valid=()=>current()&&(activated?variant.current()&&binding.current():(!previous||previous.variant.current())&&variant.valid()&&binding.canActivate());
   function restore(){if(activated){if(oldBinding)binding.rollbackActivation();else binding.detach();variant.rollbackActivation();entry.nativeState=previous;entry.motion=oldMotion;entry.motionBinding=oldBinding;activated=false;}}
   function cancel(){if(finished)return false;restore();finished=true;controller.abort();releasePreparation();retireNative(candidate);return true;}
   function validateCommit(data){const proof=copyNativeTaskSettlementAttestation(data?.nativeTaskSettlementBinding);if(!valid()||!activated||!nativeTaskSettlementAttestationCovers(proof,ref))throw Error('Native settlement differs from its issued source');return proof;}
   pending.stage='preparing';pending.cancel=cancel;return {request:{object:actor.root,options:{signal:controller.signal,include:variant.materialAlternatives.map(item=>item.mesh),materialAlternatives:binding.materialAlternatives()}},retainedGatePresentations:previous?.packet.gates??[],valid,validateCommit,rollback(){check();restore();},cancel,
    retarget(nextSupport,options){check();if(activated)throw Error('Native settlement must be rolled back before retargeting');const result=motion.retargetNativeTaskSettlement(nextSupport,options);if(!result)return false;ref=copyNativeTaskSettlementReference(nextSupport.reference);support=nextSupport;pending.nativeSettlement=ref;candidate.nativeSettlement=ref;candidate.support=support;candidate.start=ref.worldBoundary.effectiveTime;return true;},
    activate(){if(!valid()||activated)throw Error('Native settlement activation unavailable');variant.activate();try{binding.activate();}catch(error){variant.rollbackActivation();throw error;}entry.nativeState=candidate;entry.motion=motion;entry.motionBinding=binding;activated=true;},
    finalize(data){const proof=validateCommit(data);candidate.nativeSettlementBinding=proof;candidate.start=proof.reference.worldBoundary.effectiveTime;motion.setExecutionEpoch(candidate.start);motion.seal();releasePreparation();finished=true;if(previous)retireNative(previous);else if(oldBinding||oldMotion)retireHistoricalMotion(actor,oldBinding,oldMotion);onSelectableChange();}
   };
  }catch(error){releasePreparation();controller.abort();if(candidate)retireNative(candidate);throw error;}
 }
 function releaseNativeTaskSettlement(actorId,value){
  const proof=copyNativeTaskSettlementAttestation(value),entry=entries.get(actorId),settled=entry?.nativeState;if(!settled?.nativeSettlementBinding||settled.nativeSettlementBinding.settlementSequence!==proof.settlementSequence||!sameNativeTaskSettlementReference(settled.nativeSettlementBinding.reference,proof.reference))return false;
  entry.nativePending?.cancel?.();entry.nativePending?.controller.abort();entry.nativePending=null;entry.nativeState=null;entry.motionBinding=null;entry.motion=null;settled.binding.detach();settled.variant.deactivate();retireNative(settled);entry.actor.update();onSelectableChange();return true;
 }
 async function prepareRecoveredTaskAction({execution,resources},support,options){
  const profile=nativeWorkerRouteRecoveryProfile(15),proof=profile.copyResources(resources).nativeTaskActionBinding;
  const ref=proof.reference,q=ref.request,id=`worker-${nativeTaskActionActor(q)}`,entry=entries.get(id);
  if(!entry||execution?.actorId!==nativeTaskActionActor(q)||execution.bodyId!==q.bodyId||
     !profile.sameAttestation(execution.binding,proof)||!profile.sameReference(ref,support?.reference)||
     typeof options.isCurrent!=='function')throw Error('Action recovery needs its acquired program');
  const recoveryCurrent=()=>options.isCurrent()&&nativeTaskActionProjectionMatches(execution,entry.entity,tasks.get(entry.entity?.taskId),state.elapsed);
  const part=await prepareNativeTaskActionProposal(support,{...options,nativeTaskActionBinding:proof,recoveryCurrent});
  try{
   await pipelineAdmission.prepareAndPublish(part.request.object,part.request.options,()=>{
    part.activate();part.finalize({nativeTaskActionBinding:proof});
   });
   if(!recoveredTaskActionCurrent(id,ref))throw Error('Recovered action materials were not published');
  }catch(error){part.cancel();throw error;}
 }
 function recoveredTaskActionCurrent(id,ref){
  const action=entries.get(id)?.nativeState;
  return !!action?.nativeActionBinding&&sameNativeTaskActionReference(action.nativeActionBinding.reference,ref)&&
    action.motion.valid()&&action.variant.current();
 }
 async function prepareNativeTaskActionProposal(support,{getPickAge,signal,nativeTaskActionBinding=null,recoveryCurrent=null}={}){
  let ref=copyNativeTaskActionReference(support?.reference);const q=ref.request,id=`worker-${nativeTaskActionActor(q)}`,entry=entries.get(id),previous=entry?.nativeState,bootstrap=nativeTaskActionBinding===null?null:copyNativeTaskActionAttestation(nativeTaskActionBinding);
  let oldMotion=entry?.motion,oldBinding=entry?.motionBinding;
  const entityCurrent=()=>{if(recoveryCurrent)return recoveryCurrent();const e=entry?.entity,t=state.tasks?.find(t=>t.id===e?.taskId);return !!e&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.crateId&&(['walking','arriving','acting'].includes(e.status)||q.sourceRequest&&e.status==='waiting-task')&&(!q.sourceRequest||bootstrap||e.nativeRouteAdmission==='pending-action-resources'&&e.nativeTaskAction?.kind===q.actionKind&&e.nativeTaskAction.duration===q.duration&&e.nativeTaskAction.elapsed===q.initialElapsed)&&e.taskId===`task-${q.taskId}`&&t?.workerId===id&&t.kind===q.actionKind&&t.targetId?.endsWith(`-${q.targetId}`);};
  const routeCurrent=()=>q.sourceRequest?!previous:previous&&!previous.nativeAction&&!previous.suspended&&sameNativeReference(previous.nativeRoute,q.nativeRoute)&&previous.motion.valid()&&previous.variant.current();
  if(closed||!entry||historyRun||entry.nativePending||!pipelineAdmission||support?.kind!=='native-task-action-terrain-support'||support.valid?.()!==true||typeof getPickAge!=='function'||signal?.aborted||!entityCurrent()||ref.motionFlags&56||(bootstrap?!!previous||!nativeTaskActionAttestationCovers(bootstrap,ref):!routeCurrent()))throw Error('Native action has no matching source worker');
  const stamp=JSON.stringify(entry.entity),controller=new AbortController(),abort=()=>controller.abort(),pending={controller,stage:'loading',nativeAction:ref};entry.nativePending=pending;signal?.addEventListener('abort',abort,{once:true});let candidate=null,activated=false,finished=false,locked=false;
  const current=()=>!closed&&!finished&&!controller.signal.aborted&&entries.get(id)===entry&&entry.nativePending===pending&&(!locked||entry.motionPreparing===pending)&&JSON.stringify(entry.entity)===stamp&&entityCurrent()&&support.valid()===true&&entry.nativeState===(activated?candidate:previous);
  const releasePreparation=()=>{if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;signal?.removeEventListener('abort',abort);};
  const check=()=>{if(!current())throw new DOMException('Native action worker changed','AbortError');};
  try{
   await entry.ready;check();
   if(recoveryCurrent&&entry.motionPreparing?.ready){await entry.motionPreparing.ready;check();}
   await entry.bakeResourcePromise;await entry.bakeRequestPromise;check();if(!entry.actor?.hasBakedWalking?.())throw Error('Native action body resource unavailable');
   if(recoveryCurrent){
    if(historyRun||entry.motionPreparing)throw Error('Native action recovery rig is still owned');
    // A replay can already be installing the ordinary clip on this rig.
    // Reserve its materials before capturing the replacement shader inputs.
    entry.motionPreparing=pending;locked=true;oldMotion=entry.motion;oldBinding=entry.motionBinding;
   }
   const banks={Harvest:bakedHarvestBank,Plant:bakedPlantBank,Water:bakedWaterBank,Idle:bakedIdleBank},names=q.actionKind==='initial'?['Plant','Water']:q.actionKind==='water'?['Water']:q.actionKind==='repair'?['Idle']:['Harvest'];
   const clipBakes=await Promise.all(names.map(name=>{if(!banks[name])throw Error(`Native action ${name} bake unavailable`);return banks[name].get(entry.profile);}));check();
   const actor=entry.actor,anchor=actor.root.getWorldPosition(new Vector3()),yaw=new Quaternion();actor.root.getWorldQuaternion(yaw);const heading=Math.atan2(2*(yaw.w*yaw.y+yaw.x*yaw.z),1-2*(yaw.y*yaw.y+yaw.z*yaw.z)),motion=createNativeTaskActionGpuMotion({actorId:id,support,anchorPosition:anchor,anchorYaw:heading,heightOffset:.025});let variant,binding;
   const pickAge=()=>getPickAge(ref);
   try{const phases={clipNames:motion.clipNames,clipNode:motion.clipNode,resolve:motion.resolve,sampleClip:()=>motion.sampleClip(pickAge()),sampleForClip:(clip,duration)=>motion.sampleForClip(pickAge(),clip,duration)};variant=actor.prepareNativeMotionVariant(phases,{clipBakes,replaceConfirmedAction:!!recoveryCurrent,clip:actor.isBakedRunning?.()?'Run':actor.isBakedIdle?.()?'Idle':'Walk_Skip'});const options={motion,getPickTime:pickAge,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)};binding=oldBinding?oldBinding.prepareReplacement(options):bindWebGpuActorMotion({root:actor.root,renderer,actorId:id,resourceRegistry,staged:true,...options});candidate={actor,motion,variant,binding,support,nativeAction:ref,nativeRoute:null,start:ref.startTime,end:ref.endTime,gateParticipants:[]};}catch(error){binding?.dispose();variant?.dispose();motion.dispose();throw error;}
   const valid=()=>current()&&(activated?variant.current()&&binding.current():(!previous||routeCurrent())&&variant.valid()&&binding.canActivate());
   function restore(){if(activated){if(oldBinding)binding.rollbackActivation();else binding.detach();variant.rollbackActivation();entry.nativeState=previous;entry.motion=oldMotion;entry.motionBinding=oldBinding;activated=false;}}
   function rollback(){check();restore();}
   function cancel(){if(finished)return false;restore();finished=true;controller.abort();releasePreparation();retireNative(candidate);return true;}
   function validateCommit(data){const proof=copyNativeTaskActionAttestation(data?.nativeTaskActionBinding);if(!valid()||!activated||!nativeTaskActionAttestationCovers(proof,ref)||bootstrap&&!sameNativeTaskActionAttestation(proof,bootstrap))throw Error('Native action differs from its issued source');return proof;}
   pending.stage='preparing';pending.cancel=cancel;return {request:{object:actor.root,options:{signal:controller.signal,include:variant.materialAlternatives.map(item=>item.mesh),materialAlternatives:binding.materialAlternatives()}},valid,validateCommit,rollback,cancel,
    retarget(nextSupport,options){check();if(activated||bootstrap)throw Error('Native action candidate cannot be retargeted');const result=motion.retargetNativeTaskAction(nextSupport,options);if(!result)return false;ref=copyNativeTaskActionReference(nextSupport.reference);support=nextSupport;pending.nativeAction=ref;candidate.nativeAction=ref;candidate.support=support;candidate.start=ref.startTime;candidate.end=ref.endTime;return true;},
    activate(){if(!valid()||activated)throw Error('Native action activation unavailable');variant.activate();try{binding.activate();}catch(error){variant.rollbackActivation();throw error;}entry.nativeState=candidate;entry.motion=motion;entry.motionBinding=binding;activated=true;},
    finalize(data){const proof=validateCommit(data);candidate.nativeActionBinding=proof;candidate.start=proof.reference.startTime;candidate.end=proof.reference.endTime;motion.seal();releasePreparation();finished=true;if(previous)retireNative(previous);else if(oldBinding||oldMotion)retireHistoricalMotion(actor,oldBinding,oldMotion);onSelectableChange();}
   };
  }catch(error){releasePreparation();controller.abort();if(candidate)retireNative(candidate);throw error;}
 }
 function releaseNativeTaskAction(actorId,value){
  const proof=copyNativeTaskActionAttestation(value),entry=entries.get(actorId),action=entry?.nativeState;if(!action?.nativeActionBinding||action.nativeActionBinding.actionSequence!==proof.actionSequence||!sameNativeTaskActionReference(action.nativeActionBinding.reference,proof.reference))return false;
  entry.nativePending?.controller.abort();entry.nativePending=null;entry.nativeState=null;entry.motionBinding=null;entry.motion=null;action.binding.detach();action.variant.deactivate();retireNative(action);entry.actor.update();onSelectableChange();return true;
 }
 async function prepareNativeMotionProposal(support,{getPickTime,getPickIdleOffset,signal}={},mode=false){
  const farm=mode==='farm-arrival',stroll=mode==='stroll',home=mode==='home',consequence=mode==='consequence',starting=mode===true,copy=farm?copyNativeFarmArrivalRouteProposal:stroll?copyNativeIdleStrollProposal:home?copyNativeHomeRouteProposal:consequence?copyNativeTaskConsequenceProposal:starting?copyNativeTaskStartProposal:copyNativeResumeProposal,key=farm?'nativeFarmArrival':stroll?'nativeIdleStroll':home?'nativeHome':consequence?'nativeConsequence':starting?'nativeStart':'nativeResume',bindingKey=farm?'nativeFarmArrivalBinding':stroll?'nativeIdleStrollBinding':home?'nativeHomeRouteBinding':consequence?'nativeTaskConsequenceBinding':starting?'nativeTaskStartBinding':'nativeResumeBinding',matches=farm?nativeFarmArrivalRoutePresentationMatches:stroll?nativeIdleStrollPresentationMatches:home?nativeHomeRoutePresentationMatches:consequence?nativeTaskConsequencePresentationMatches:starting?nativeTaskStartPresentationMatches:nativeResumePresentationMatches;
  let packet=copy(support?.presentation),ref=packet[key];const id=`worker-${ref.actorId}`,prior=entries.get(id);
  // Finish the existing historical admission before capturing its published
  // motion/binding. A valid pending owner is a prerequisite, not a stale source.
  if(prior?.motionPreparing?.ready&&!prior.nativePending)await prior.motionPreparing.ready;
  const entry=entries.get(id),previous=entry?.nativeState,held=previous?.suspended,source=ref.sourceResumeHandle,oldMotion=entry?.motion,oldBinding=entry?.motionBinding;
  const pendingEntity=()=>{const e=entry?.entity,task=state.tasks?.find(value=>value.id===e?.taskId);return !!e&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.crateId&&e.status==='waiting-task'&&e.taskId===`task-${ref.taskId}`&&task?.workerId===id&&task.targetId?.endsWith(`-${ref.targetId}`);};
  const actionEntity=()=>{const e=entry?.entity,q=ref.sourceAction?.reference.request,t=state.tasks?.find(value=>value.id===e?.taskId);return !!q&&!!e&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.crateId&&e.status==='acting'&&e.taskId===`task-${q.taskId}`&&t?.workerId===id&&t.kind==='harvest'&&t.targetId===`plant-${q.targetId}`;},actionProofCurrent=()=>!!previous?.nativeActionBinding&&previous.nativeActionBinding.actionSequence===ref.sourceAction.actionSequence&&sameNativeTaskActionReference(previous.nativeActionBinding.reference,ref.sourceAction.reference)&&sameNativeTaskActionReference(previous.nativeActionBinding.preparedReference,ref.sourceAction.preparedReference)&&previous.motion.valid();
  const homeEntity=()=>{const e=entry?.entity,r=home&&nativeHomeRouteSource(ref),p=r?.pose;return !!e&&e.status===nativeHomeWorkerStatus(r)&&!e.taskId&&!e.crateId&&(ref.sourceRequest?e.nativeRouteAdmission===(r.raidSpawnSequence?'pending-raid-flight-resources':'pending-home-resources')&&e.path===null&&e.running===false&&e.gateWaiting===false&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k]):!e.nativeRouteAdmission)&&!e.recovery&&!e.fallRemaining&&!e.raidReturn&&(r.recoveryHit?woundedHomeSourceCurrent(state,e,r,0):!e.incapacitated&&!e.recoveryExitRemaining)&&e.villageId===`village-${r.home.villageId}`;},homeProofCurrent=()=>{if(ref.sourceRequest)return !previous||(previous.nativeHeldTaskRoute||previous.nativeHeldIdleStroll||previous.nativeHeldFarmArrival?nativeHomeRequestContinuesHeldWorker(ref.sourceRequest,previous.nativeHeldTaskRoute??previous.nativeHeldIdleStroll??previous.nativeHeldFarmArrival):previous.nativeActionBinding?nativeHomeRequestContinuesRepairAction(ref.sourceRequest,previous.nativeActionBinding):previous.nativeTaskStartBinding?homeRequestContinuesCompletedTask(ref.sourceRequest,previous,entry.entity,state.elapsed):previous.nativeIdleStrollBinding?homeRequestContinuesCompletedStroll(ref.sourceRequest,previous,entry.entity,state.elapsed):previous.nativeFarmArrivalBinding?homeRequestContinuesCompletedFarm(ref.sourceRequest,previous,entry.entity,state.elapsed):previous.nativeIdleCycleBinding?nativeHomeRequestContinuesIdleCycle(ref.sourceRequest,previous.nativeIdleCycleBinding):previous.nativeInitialIdleBodyBinding?nativeHomeRequestContinuesInitialIdle(ref.sourceRequest,previous.nativeInitialIdleBodyBinding.reference.sourceRequest):nativeHomeRequestContinuesIdle(ref.sourceRequest,previous.nativeSettlementBinding))&&previous.motion.valid();const b=previous?.nativeSettlementBinding,s=ref.sourceSettlement;return !!b&&b.settlementSequence===s.settlementSequence&&sameNativeTaskSettlementReference(b.reference,s.reference)&&sameNativeTaskSettlementReference(b.preparedReference,s.preparedReference)&&previous.motion.valid();};
  const settledStartCurrent=()=>{const proof=previous?.nativeSettlementBinding,r=proof?.reference,p=r?.pose,w=ref.worldBoundary;return !!r&&!r.home&&entry.entity?.nativeRouteAdmission==='pending-resources'&&r.actorId===ref.actorId&&r.bodyId===ref.bodyId&&r.profile===packet.profile&&r.worldBoundary.authorityEpoch===w.authorityEpoch&&r.worldBoundary.nativeSession===w.nativeSession&&ref.requestSequence>proof.settlementSequence&&ref.requestedAt>=r.worldBoundary.effectiveTime&&packet.radius===p.radius&&packet.origin.x===p.x&&packet.origin.z===p.z&&[8,9,10,13].every((index,i)=>packet.rows[index]===[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])&&previous.motion.valid();};
  const initialStartCurrent=()=>{const proof=previous?.nativeInitialIdleBodyBinding,r=proof?.reference,p=r?.sourceRequest.pose,w=ref.worldBoundary;return !!r&&entry.entity?.nativeRouteAdmission==='pending-resources'&&r.actorId===ref.actorId&&r.bodyId===ref.bodyId&&r.profile===packet.profile&&r.worldBoundary.authorityEpoch===w.authorityEpoch&&r.worldBoundary.nativeSession===w.nativeSession&&ref.requestSequence>proof.bodySequence&&ref.requestedAt>=r.worldBoundary.effectiveTime&&packet.radius===p.radius&&packet.origin.x===p.x&&packet.origin.z===p.z&&[8,9,10,13].every((index,i)=>packet.rows[index]===[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])&&previous.motion.valid();};
  const cycleStartCurrent=()=>{const proof=previous?.nativeIdleCycleBinding,r=proof?.reference,p=r&&nativeIdleCycleBodyState(r.sourceBody).pose,w=ref.worldBoundary;return !!r&&entry.entity?.nativeRouteAdmission==='pending-resources'&&r.actorId===ref.actorId&&r.bodyId===ref.bodyId&&r.profile===packet.profile&&r.worldBoundary.authorityEpoch===w.authorityEpoch&&r.worldBoundary.nativeSession===w.nativeSession&&ref.requestSequence>proof.cycleSequence&&ref.requestedAt>=r.worldBoundary.effectiveTime&&packet.radius===p.radius&&packet.origin.x===p.x&&packet.origin.z===p.z&&[8,9,10,13].every((index,i)=>packet.rows[index]===[p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining][i])&&previous.motion.valid();};
  const heldStartCurrent=()=>entry.entity?.nativeRouteAdmission==='pending-resources'&&taskStartContinuesHeldWorker(packet,previous?.nativeHeldIdleStroll??previous?.nativeHeldFarmArrival)&&previous.motion.valid();
  const completedFarmStartCurrent=()=>taskStartContinuesCompletedFarm(packet,previous,entry.entity,state.elapsed);
  const strollSourceCurrent=()=>{if(ref.sourceSettlement)return !!previous&&previous.motion.valid()&&nativeSettledIdleSourceMatches(ref.sourceSettlement,previous.nativeSettlementBinding);if(ref.sourceFarm)return idleCycleContinuesCompletedFarm(ref.sourceFarm,previous,entry.entity,state.elapsed);if(ref.sourceRequest)return !previous;const proof=previous?.nativeIdleCycleBinding,r=proof?.reference,q=r&&nativeIdleCycleBodyState(r.sourceBody),a=r?.anchor,w=ref.worldBoundary;return !!q&&proof.cycleSequence===ref.sourceCycleSequence&&ref.requestedAt>=r.worldBoundary.effectiveTime+r.duration-1e-9&&q.actorId===ref.actorId&&q.bodyId===ref.bodyId&&q.centerId===ref.centerId&&q.profile===ref.profile&&q.workerProfile===ref.workerProfile&&q.bodyFlags===ref.bodyFlags&&r.worldBoundary.authorityEpoch===w.authorityEpoch&&r.worldBoundary.nativeSession===w.nativeSession&&['x','z','yaw','radius','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>q.pose[k]===ref.pose[k])&&a.id===`${ref.anchor.kind===1?'farm-plant':'farm-structure'}-${ref.anchor.id}`&&['x','z','radius'].every(k=>a[k]===ref.anchor[k])&&previous.motion.valid();};
  const farmEntity=()=>{try{const e=entry?.entity,q=ref.sourceRequest,p=nativeFarmArrivalSourcePose(ref),continuing=!!ref.sourceHeld,semantic=continuing?nativeFarmArrivalHeldState(state,e):e?.nativeRouteAdmission==='pending-farm-flight-restore'?nativeFarmFlightState(state,e):nativeFarmArrivalState(state,e,{canonical:true});return (continuing?nativeFarmArrivalContinuesHeld(ref,previous?.nativeHeldFarmArrival)&&previous.motion.valid():!previous)&&e.nativeRefugeSequence===q.refugeSequence&&(!q.refugeSequence||e.raidReturn===true)&&e.profile===q.workerProfile&&semantic.centerId===q.centerId&&q.requestedAt<=state.elapsed&&(e.radius===undefined||e.radius===p.radius)&&Object.keys(semantic.pose).every(k=>semantic.pose[k]===p[k])&&Object.keys(semantic.goal).every(k=>semantic.goal[k]===q.goal[k]);}catch{return false;}};
  const strollEntity=()=>{const e=entry?.entity,p=ref.pose,idle=e?.idleState,phase=ref.version===2?!!idle&&['rest','watch'].includes(idle.mode)&&idle.remaining===ref.walkRemaining&&idle.rng===ref.walkRng&&idle.approachRetry===0&&idle.anchorId===`${ref.anchor.kind===1?'farm-plant':'farm-structure'}-${ref.anchor.id}`&&e.destinationId===null&&Object.keys(idle).every(k=>['anchorId','mode','elapsed','remaining','rng','approachRetry'].includes(k)):idle?.mode==='watch'&&idle.remaining<=1e-9;if(ref.sourceSettlement)return !!e&&e.status==='idle'&&e.nativeRouteAdmission===undefined&&e.idleState===null&&!e.nativeTaskAction&&e.profile===ref.workerProfile&&nativeEntityNumericId(e.centerId)===ref.centerId&&!e.taskId&&!e.crateId&&e.path===null&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k]);if(ref.sourceFarm)return !!e&&e.status==='arriving'&&e.nativeRouteAdmission==='native-farm-arrival'&&e.idleState===null&&e.destinationId===null&&farmPathMetadataCurrent(e)&&!e.nativeTaskAction&&e.profile===ref.workerProfile&&nativeEntityNumericId(e.centerId)===ref.centerId&&!e.taskId&&!e.crateId&&e.path===null&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k]);if(ref.sourceRequest)return pendingIdleStrollMatches(state,e,ref.sourceRequest);return !!e&&e.profile===ref.workerProfile&&nativeEntityNumericId(e.centerId)===ref.centerId&&e.status==='idle'&&e.nativeRouteAdmission==='native-idle'&&!e.taskId&&!e.crateId&&e.path===null&&phase&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k]);};
  if(closed||!entry||historyRun||entry.nativePending||entry.motionPreparing||support.valid?.()!==true||typeof getPickTime!=='function'||signal?.aborted||(farm?!farmEntity()||!!previous&&!previous.variant.current():stroll?!strollEntity()||!strollSourceCurrent()||!!previous&&!previous.variant.current():home?!homeEntity()||!homeProofCurrent()||!!previous&&!previous.variant.current():consequence?!actionEntity()||!actionProofCurrent()||!previous.variant.current():starting?!pendingEntity()||!!previous&&(!(settledStartCurrent()||initialStartCurrent()||cycleStartCurrent()||heldStartCurrent()||completedFarmStartCurrent())||!previous.variant.current()):!previous||!held||held.bodyId!==ref.bodyId||held.nativeRoute.actorId!==ref.actorId||held.nativeRoute.assignmentSequence!==ref.sourceAssignmentSequence||held.suspendedAt!==ref.suspendedAt||held.resumeGeneration!==source.generation||['authorityEpoch','session','slot'].some(key=>held.nativeRoute.routeHandle[key]!==source[key])||!previous.motion.valid()||!previous.variant.current())||!!(packet.motionFlags&48)&&!(home&&ref.sourceRequest?.recoveryHit)||starting&&!!(packet.motionFlags&8))throw Error('Native motion has no matching source worker');
  const restoringFarm=farm&&entry.entity.nativeRouteAdmission==='pending-farm-flight-restore';
  const restoredSpawn=()=>confirmedFlightSpawn(state,e=>e.simulationTime<=state.elapsed);
  const spawn=restoringFarm?restoredSpawn():null;
  if(restoringFarm&&(!spawn||ref.worldBoundary.effectiveTime!==state.elapsed||ref.sourceRequest.requestedAt!==state.elapsed))
   throw Error('Restored Farm motion has no matching confirmed raid birth');
  const farmFlightBirth=spawn?{id:spawn.id,at:spawn.simulationTime,raid:spawn.raidFacts.id,animal:spawn.raidFacts.actors[0].id}:null;
  const matchesFarmFlightBirth=e=>e?.id===farmFlightBirth?.id&&e?.simulationTime===farmFlightBirth?.at&&
   e?.raidFacts.id===farmFlightBirth?.raid&&e?.raidFacts.actors[0].id===farmFlightBirth?.animal;
  const entity=entry.entity,stamp=JSON.stringify(entity),carrying=!!(packet.motionFlags&8),crateId=consequence?`crate-${ref.crateId}`:carrying?entity.crateId:null,controller=new AbortController(),abort=()=>controller.abort(),pending={controller,stage:'loading',[key]:ref};entry.nativePending=pending;signal?.addEventListener('abort',abort,{once:true});
  let candidate=null,activated=false,finished=false,locked=false,carryReady=false;
  const current=()=>!closed&&!finished&&!controller.signal.aborted&&entries.get(id)===entry&&entry.nativePending===pending&&(!locked||entry.motionPreparing===pending)&&JSON.stringify(entry.entity)===stamp&&(farm?farmEntity()&&(!farmFlightBirth||state.elapsed===ref.sourceRequest.requestedAt&&matchesFarmFlightBirth(restoredSpawn())):stroll?strollEntity()&&strollSourceCurrent():home?homeEntity()&&homeProofCurrent():consequence?actionEntity()&&actionProofCurrent():starting?pendingEntity()&&(!previous||settledStartCurrent()||initialStartCurrent()||cycleStartCurrent()||heldStartCurrent()||completedFarmStartCurrent()):nativeLocomotionEntity(entry,carrying,true)&&crateId===previous.crateId)&&support.valid()===true&&entry.nativeState===(activated?candidate:previous);
  const check=()=>{if(!current())throw new DOMException('Native resumed worker changed','AbortError');};
  try{
   await entry.ready;await entry.bakeResourcePromise;await entry.bakeRequestPromise;check();
   // A cold fleeing worker can admit its stationary Idle clip while Walk downloads.
   // Join that installation before asking the same rig to install Walk.
   if((home||farm&&entity.nativeRouteAdmission==='pending-farm-flight-restore')&&!entry.actor?.hasBakedWalking?.()&&entry.idlePending){
    await entry.idleRequestPromise;check();
    resumeBakedWalk(id,entry);await entry.bakeResourcePromise;check();
    await entry.bakeRequestPromise;check();
   }
   if((farm||stroll||home||starting)&&!entry.actor?.hasBakedWalking?.())throw Error('Native task locomotion source unavailable');
   // Share the existing material-preparation lock with stationary native bodies.
   // Deferred ordinary clip/history installs must not replace this candidate.
   entry.motionPreparing=pending;locked=true;
   let needsRun=!!previous?.preparedRun,needsIdle=!!previous?.preparedIdle;for(let i=0;i<packet.rows.length;i+=16){needsRun||=packet.rows[i+14]!==0;needsIdle||=!carrying&&packet.rows[i+15]<=0;}
   if(carrying&&needsRun)throw Error('Native carrying resume cannot use running poses');
   const actor=entry.actor;
   if(consequence&&!actor.hasBakedCarrying?.()){if(!bakedCarryBank)throw Error('Native consequence Carry bake unavailable');const bake=await bakedCarryBank.get(entry.profile);check();if(await actor.installBakedCarry(bake,{pipelineAdmission,signal:controller.signal,motionBinding:oldBinding,isCurrent:current})!==true&&!actor.hasBakedCarrying?.())throw Error('Native consequence Carry presentation unavailable');check();entry.carryInstalled=true;}
   const clipBakes=carrying?[]:await Promise.all([bakedWalkBank.get(entry.profile),...(needsRun?[bakedRunBank?.get(entry.profile)??Promise.reject(Error('Native resume Run bake unavailable'))]:[]),...(needsIdle?[bakedIdleBank?.get(entry.profile)??Promise.reject(Error('Native resume Idle bake unavailable'))]:[])]);check();
   const anchor=actor.root.getWorldPosition(new Vector3()),yaw=new Quaternion();actor.root.getWorldQuaternion(yaw);const heading=Math.atan2(2*(yaw.w*yaw.y+yaw.x*yaw.z),1-2*(yaw.y*yaw.y+yaw.z*yaw.z)),motion=(farm?createNativeFarmArrivalGpuMotion:stroll?createNativeIdleStrollGpuMotion:home?createNativeHomeRouteGpuMotion:consequence?createNativeTaskConsequenceGpuMotion:starting?createNativeTaskStartGpuMotion:createNativeResumeGpuMotion)({actorId:id,support,anchorPosition:anchor,anchorYaw:heading,heightOffset:.025,resourceRegistry});let variant,binding;
   const pickTime=()=>getPickTime(ref,packet.startTime);
   try{const phases={runningNode:motion.runningNode,idleNode:motion.idleNode,resolve:(fallback,clip,duration)=>motion.resolve(fallback,clip,duration),sampleClip(){const pose=motion.sample(pickTime());return carrying?'Carry_Crate':needsIdle&&pose.currentSpeed<=0?'Idle':pose.running?'Run':'Walk_Skip';},sampleForClip:(clip,duration)=>motion.sampleForClip(pickTime(),clip,duration,(farm||stroll)&&clip==='Idle'&&getPickIdleOffset?getPickIdleOffset(ref,packet.startTime,duration):undefined)};
    if(home&&ref.sourceRequest?.recoveryHit)Object.assign(phases,homeExitPhases(motion,pickTime,ref.sourceRequest));
    variant=actor.prepareNativeMotionVariant(phases,{clipBakes,clip:carrying?'Carry_Crate':actor.isBakedIdle?.()?'Idle':farm||starting||home||stroll?'Walk_Skip':null});const options={motion,getPickTime:pickTime,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)};binding=oldBinding?oldBinding.prepareReplacement(options):bindWebGpuActorMotion({root:actor.root,renderer,actorId:id,resourceRegistry,staged:true,...options});
    candidate={actor,motion,variant,binding,packet,support,crateId,...(starting?{taskHomePolicy:farmTaskPolicy(entity)}:farm?{farmTaskPolicy:completedFarmPolicy(entity,ref.sourceRequest),farmFlightBirth}:stroll?{strollHomePolicy:farmTaskPolicy(entity)}:{}),preparedRun:needsRun,preparedIdle:needsIdle,[key]:ref,nativeRoute:null,start:packet.startTime,end:packet.endTime,gateParticipants:[]};pending.candidate=candidate;
   }catch(error){binding?.dispose();variant?.dispose();motion.dispose();throw error;}
   const options={signal:controller.signal,include:variant.materialAlternatives.map(item=>item.mesh),materialAlternatives:binding.materialAlternatives()},valid=()=>current()&&(activated?variant.current()&&binding.current():(!previous||previous.motion.valid()&&previous.variant.current())&&variant.valid()&&binding.canActivate());
   function restore(){if(activated){if(oldBinding)binding.rollbackActivation();else binding.detach();variant.rollbackActivation();entry.nativeState=previous;entry.motion=oldMotion;entry.motionBinding=oldBinding;activated=false;}}
   function cancel(){if(finished)return false;restore();finished=true;controller.abort();if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;signal?.removeEventListener('abort',abort);retireNative(candidate,carryReady?{entry,source:previous}:null);return true;}
   function validateCommit(data){
    const confirmed=farm?copyNativeFarmArrivalRouteResources(data?.resources):stroll?copyNativeIdleStrollResources(data?.resources):null,actual=confirmed?.presentation??copyNativeRoutePresentation(data?.resources?.presentation),route=actual.nativeRoute,proof=data[bindingKey],sameMotion=proof?matches(packet,actual,proof):!farm&&!stroll&&!consequence&&!home&&!starting&&actual.startTime===packet.startTime&&actual.endTime===packet.endTime&&actual.rows.length===packet.rows.length&&actual.rows.every((value,index)=>Object.is(value,packet.rows[index]));
    if(farm&&!sameNativeFarmArrivalRouteAttestation(proof,confirmed.nativeFarmArrivalBinding))throw Error('Native farm arrival resource receipt differs from its bound association');
    if(stroll&&!sameNativeIdleStrollAttestation(proof,confirmed.nativeIdleStrollBinding))throw Error('Native Idle stroll resource receipt differs from its bound association');
    if(!valid()||!activated||data.resources.kind!==(farm?23:stroll?22:home?18:consequence?16:starting?14:13)||data.resources.phase!=='committed'||route.actorId!==ref.actorId||route.assignmentSequence<=ref.sourceControlSequence||['authorityEpoch','session','slot','generation'].some(key=>route.routeHandle[key]!==ref.expectedRouteHandle[key])||!sameMotion||!farm&&!stroll&&!consequence&&!home&&!starting&&!sameNativeGatePresentations(actual.gates,packet.gates))throw Error('Native resumed worker differs from its committed resources');
    return actual;
   }
   pending.stage='preparing';pending.cancel=cancel;const part={request:{object:actor.root,options},valid,validateCommit,
    ...(consequence?{markReady(){if(!valid()||!activated)throw Error('Carry frame is unavailable');carryReady=true;}}:{}),
    rollback(){check();restore();},
    retarget(nextSupport,options){check();if(activated)throw Error('Native resume must be rolled back before replacing data');const next=copy(nextSupport?.presentation);const result=(farm?motion.retargetNativeFarmArrival:stroll?motion.retargetNativeIdleStroll:home?motion.retargetNativeHomeRoute:consequence?motion.retargetNativeTaskConsequence:starting?motion.retargetNativeTaskStart:motion.retargetNativeResume)(nextSupport,options);if(!result)return false;packet=next;ref=next[key];support=nextSupport;pending[key]=ref;candidate.packet=next;candidate[key]=ref;candidate.support=nextSupport;candidate.start=next.startTime;candidate.end=next.endTime;return true;},activate(){if(!valid()||activated)throw Error('Native resume activation unavailable');variant.activate();try{binding.activate();}catch(error){variant.rollbackActivation();throw error;}entry.nativeState=candidate;entry.motion=motion;entry.motionBinding=binding;activated=true;},finalize(data){const actual=validateCommit(data);candidate.packet=actual;candidate.nativeRoute=actual.nativeRoute;if(starting)candidate.nativeTaskStartBinding=copyNativeTaskStartAttestation(data[bindingKey]);if(farm)candidate.nativeFarmArrivalBinding=copyNativeFarmArrivalRouteAttestation(data[bindingKey]);if(stroll)candidate.nativeIdleStrollBinding=copyNativeIdleStrollAttestation(data[bindingKey]);if(home)candidate.nativeHomeRouteBinding=copyNativeHomeRouteAttestation(data[bindingKey]);if(consequence)candidate.nativeConsequenceBinding=copyNativeTaskConsequenceAttestation(data[bindingKey]);candidate.start=actual.startTime;candidate.end=actual.endTime;candidate.motion.setExecutionEpoch(actual.startTime);candidate.motion.seal();entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;finished=true;signal?.removeEventListener('abort',abort);if(previous)retireNative(previous);else if(oldBinding||oldMotion)retireHistoricalMotion(actor,oldBinding,oldMotion);onSelectableChange();},cancel};
   if(previous)attachNativeSourcePresentation(part,()=>activated);
   return part;
  }catch(error){if(entry.nativePending===pending)entry.nativePending=null;if(entry.motionPreparing===pending)entry.motionPreparing=null;controller.abort();signal?.removeEventListener('abort',abort);if(candidate)retireNative(candidate);throw error;}
 }
 function releaseNativeRoute(actorId,nativeRoute){
  const entry=entries.get(actorId),value=entry?.nativeState,pending=entry?.nativePending;
  if(pending&&sameNativeReference(pending.nativeRoute,nativeRoute)){pending.controller.abort();entry.nativePending=null;}
  // A delayed old removal must not detach a replacement being prepared.
  if(!value||value.suspended||!sameNativeReference(value.nativeRoute,nativeRoute)||pending&&!sameNativeReference(pending.nativeRoute,nativeRoute))return false;
  entry.nativeState=null;entry.motionBinding=null;entry.motion=null;
  value.binding.detach();value.variant.deactivate();retireNative(value);entry.actor.update();onSelectableChange();return true;
 }

 // Retain an admitted assignment only when the native proposal preserves it
 // and every full-route terrain dependency retains its geometry and epoch.
 function prepareNativeTerrainRetention(view,{exclude=new Set()}={}){
  if(closed||!view||!(view.changedKeys instanceof Set)||[...entries.values()].some(entry=>entry.nativePending))throw Error('Native terrain assignment retention unavailable');
  const parts=[];
  for(const [id,entry] of entries){const value=entry.nativeState;if(!value||exclude.has(id))continue;let active=true;
   const valid=()=>active&&!closed&&entries.get(id)===entry&&entry.nativeState===value&&!entry.nativePending&&value.motion.valid()&&value.variant.current()&&value.support.unchangedBy?.(view)===true;
   if(!valid())throw Error('Native terrain changes an admitted route support');
   const check=()=>{if(!valid())throw Error('Native retained assignment became stale');};
   parts.push({object:value.actor.root,signal:entry.controller.signal,valid,...(value.suspended?{nativeBodyTerrainSupport:{entity:entry.entity,support:value.support,reference:value.support.reference}}:{}),eventRoots:()=>[value.actor.root],presentation:()=>({show:[],hide:[]}),activate(){check();return true;},attach:check,rollback(){},finalize(){check();return {retire(){active=false;},notify(){}};},rollbackFinalized(){},cancel(){active=false;}});
  }
  return parts;
 }
 // The terrain transaction owns staging and capture. No root/rig/geometry is
 // rebuilt; the old binding stays live until all owners commit synchronously.
 async function prepareNativeTerrainStops(view,{stopEffects,boundary,prepareBodySupport,getPickTime,nativeIdleStrollStopTemplate,nativeFarmArrivalStopTemplate,nativeTaskRouteStopTemplate,getStoppedProjection=null,retainNativeGate=null,prepareStoppedGate=null}={}){
  const templates={nativeIdleStrollStopTemplate:nativeIdleStrollStopTemplate??undefined,nativeFarmArrivalStopTemplate:nativeFarmArrivalStopTemplate??undefined,nativeTaskRouteStopTemplate:nativeTaskRouteStopTemplate??undefined};
  const stop=terrainStopWireProtocol(templates,'Native stop mixes source families'),codec=stop?.codec;
  const template=codec?codec.copyReference(templates[stop.wireTemplateField]):null,farm=codec?.kind===24,task=codec?.kind===25;
  if(template?.gates.length&&(!farm||typeof prepareStoppedGate!=='function'))throw Error('Native moving stop gate projection requires its prepared motor uniforms');
  if(template&&typeof getStoppedProjection!=='function')throw Error('Native moving stop requires its submitted projection reader');
  const effects=copyNativeWorldStopEffects(stopEffects,boundary),references=effects?nativeSuspendedBodiesFromProposal(effects,boundary):[],parts=[],gates=new Map(),retainedGates=new Set(),exclude=new Set();
  if(!effects||effects.routeEffects.rows.length!==references.length*26||typeof prepareBodySupport!=='function'||typeof getPickTime!=='function')throw Error('Native stopped terrain requires pinned projected workers');
  for(const reference of references){const id=`worker-${reference.nativeRoute.actorId}`,entry=entries.get(id);if(!entry?.nativeState||entry.nativeState.suspended||!sameNativeReference(entry.nativeState.nativeRoute,reference.nativeRoute))throw Error('Native stop has no matching admitted worker');exclude.add(id);}
  if(farm){const source=entries.get(`worker-${template.sourceRoute.actorId}`)?.nativeState;if(!source?.nativeFarmArrivalBinding||!sameNativeReference(source.nativeRoute,template.sourceRoute))throw Error('Native Farm stop lacks its original admitted source');}
  if(task){
   const entry=entries.get(`worker-${template.sourceRoute.actorId}`),source=entry?.nativeState;
   const route=source?.nativeStart??source?.nativeResume,owner=template.routes.find(row=>row.nativeRoute.actorId===template.sourceRoute.actorId);
   const worker=entry?.entity,walking=worker?.nativeRouteAdmission==='native-task'&&worker.status==='walking'&&worker.taskId,
     fleeing=worker?.nativeRouteAdmission==='pending-task-flight-stop'&&worker.status==='fleeing'&&!worker.taskId&&source?.nativeTaskStartBinding;
   if(!route||!walking&&!fleeing||route.bodyId!==owner?.bodyId||!sameNativeReference(source.nativeRoute,template.sourceRoute))
    throw Error('Native Task stop lacks its original admitted source');
  }
  try{
   for(let i=0;i<references.length;i++){
    const reference=references[i],id=`worker-${reference.nativeRoute.actorId}`,entry=entries.get(id),previous=entry.nativeState,entity=entry.entity,entityTime=entry.entityTime,stamp=JSON.stringify(entity),row=effects.routeEffects.rows.subarray(i*26,(i+1)*26),pose=row.slice(8),foot=prepareBodySupport(reference,pose),carrying=!!previous.crateId;
    if(!foot?.valid()||foot.unchangedBy(view)!==true||!previous.motion.valid()||!previous.variant.current())throw Error('Native stop changes its pinned body support');
    const clipBakes=carrying?[]:await Promise.all([bakedWalkBank.get(entry.profile),...(previous.preparedRun?[bakedRunBank.get(entry.profile)]:[]),bakedIdleBank?.get(entry.profile)??Promise.reject(Error('Native stopped worker Idle bake unavailable'))]);
    let candidate=null,active=true,activated=false,attached=false,capturing=false,finalized=false;
    // Only native execution fields may advance while the same source prepares. Intention,
    // private RNG, destination, contract and all other policy fields stay pinned.
    let finalFoot=null,finalAt=null;
    const executionFields=new Set(['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining']),strollSource=previous.nativeIdleStrollBinding?.reference,farmSource=previous.nativeFarmArrivalBinding?.reference;
    const taskRoot=task&&previous.nativeRoute.actorId===template.sourceRoute.actorId;
    if(taskRoot){executionFields.add('running');executionFields.add('gateWaiting');}
    // RaidSpawned cancels the Game goal before the acquired route can stop.
    // The same actor and exact native pose must survive that handoff.
    const taskSource=taskRoot?previous.nativeTaskStartBinding?.reference:null;
    const flightSource=farm?farmSource:taskRoot?taskSource:strollSource,
      flightMarker=farm?'pending-farm-flight-stop':taskRoot?'pending-task-flight-stop':'pending-idle-flight-stop',
      flightSampleKey=farm?'nativeFarmFlightSample':taskRoot?'nativeTaskFlightSample':'nativeIdleFlightSample';
    const flightStop=!!flightSource&&!!template&&sameNativeReference(previous.nativeRoute,template.sourceRoute)&&
      reference.bodyId===flightSource.bodyId&&entity.nativeRouteAdmission===flightMarker;
    const {[flightSampleKey]:initialSample,...initialPolicy}=flightStop?entity:{};
    const spawn=flightStop&&(taskRoot||
      (farm?previous.farmTaskPolicy:previous.strollHomePolicy)===farmTaskPolicy(initialPolicy))?confirmedFlightSpawn(state,e=>
      initialSample?e.id==='event-'+initialSample.eventId&&e.simulationTime===initialSample.spawnTime:e.simulationTime===entityTime):null;
    const farmBirth=farm?previous.farmFlightBirth:null;
    const restoredBirth=!!spawn&&!!farmBirth&&spawn.id===farmBirth.id&&spawn.simulationTime===farmBirth.at&&
      spawn.raidFacts.id===farmBirth.raid&&spawn.raidFacts.actors[0].id===farmBirth.animal;
    let idlePolicy=null,validatingFarmSource=null,validatingTaskSource=null,validatingStrollSource=null;
    const policy=(value,at=entry.entityTime)=>{
     // Ordinary Task assignment cancels only these semantic fields. Both
     // stopped families retain their acquired final pose and all other policy.
     const stoppedTask=candidate?.nativeHeldTaskRoute??validatingTaskSource;
     const source=stoppedTask??candidate?.nativeHeldIdleStroll??candidate?.nativeHeldFarmArrival,p=source?.pose;
     if(flightStop){
      const pending=value.nativeRouteAdmission===flightMarker,requested=value.nativeRouteAdmission==='pending-raid-flight-resources';
      const held=(farm?candidate?.nativeHeldFarmArrival??validatingFarmSource:taskRoot?stoppedTask:candidate?.nativeHeldIdleStroll??validatingStrollSource)?.pose;
      const workerSource=farm?flightSource.sourceRequest:flightSource;
      const animal=state.raid?.animals?.[0];
      if(!spawn||state.day!==spawn.raidFacts.day||state.raid?.id!==spawn.raidFacts.id||state.raid.daytime!==true||state.raid.animals.length!==1||
         animal.id!==spawn.raidFacts.actors[0].id||animal.species!=='warthog'||state.workers.length!==1||
         state.workers[0].id!==id||value.status!=='fleeing'||(!pending&&!requested)||!farmPathMetadataCurrent(value)||
         value.taskId||value.crateId||value.idleState!==null||value.destinationId!==null||value.path!==null||
         value.recovery||value.incapacitated||value.fallRemaining||value.recoveryExitRemaining||value.raidReturn||
         (taskRoot?value.profile!==entry.profile||value.taskApproach!==null:
          value.profile!==workerSource.workerProfile||nativeEntityNumericId(value.centerId)!==workerSource.centerId))return null;
      // The confirmed request may arrive before the direct acquisition proof.
      // Its final pose must match the attested stop.
      if(requested&&(!held||value.running!==false||value.gateWaiting!==false))return null;
      const fields=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
      const indices=[0,1,4,9,10,11,14];
      if(!Number.isFinite(at)||(farmBirth?!restoredBirth:spawn.simulationTime<flightSource.worldBoundary.effectiveTime)||spawn.simulationTime>at||spawn.simulationTime>reference.suspendedAt)return null;
      const sample=value[flightSampleKey];
      if(pending&&sample){
       if(sample.at!==at||spawn.id!=='event-'+sample.eventId||sample.spawnTime!==spawn.simulationTime||
          sample.bodyId!==reference.bodyId||!sameNativeReference(sample.nativeRoute,previous.nativeRoute)||
          !sample.pose||!['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining','running','gateWaiting']
            .every(k=>Object.hasOwn(sample.pose,k)&&sample.pose[k]===value[k]))return null;
      }else if(pending){
       if(sample!==undefined||at!==spawn.simulationTime||at!==reference.suspendedAt)return null;
      }else if(sample!==undefined)return null;
      // Compare a row only at its own instant.
      if((requested||at===reference.suspendedAt)&&fields.some((k,i)=>value[k==='yaw'?'heading':k]!==(requested?held[k]:pose[indices[i]])))return null;
      return JSON.stringify({...Object.fromEntries(Object.entries(value).filter(([key])=>key!==flightSampleKey&&!executionFields.has(key))),
       nativeRouteAdmission:flightMarker,running:false,gateWaiting:false});
     }
     const task=source&&state.tasks?.find(t=>t.id===value.taskId);
     if(task&&task.workerId===id&&value.status==='waiting-task'&&value.nativeRouteAdmission==='pending-resources'&&value.idleState===null&&value.destinationId===null&&value.taskApproach===null&&Number.isFinite(value.pathVersion)&&value.path===null&&value.running===false&&value.gateWaiting===false&&!value.nativeTaskAction&&value.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>value[k]===p[k])){
      const normalized=Object.fromEntries(Object.entries(value).filter(([key])=>!executionFields.has(key)));
      for(const key of ['status','nativeRouteAdmission','idleState','destinationId','taskId','taskApproach','pathVersion']){if(Object.hasOwn(idlePolicy,key))normalized[key]=idlePolicy[key];else delete normalized[key];}
      return JSON.stringify(normalized);
     }
     // Confirmed Home intent may replace the stopped goal while the physical source stays
     // suspended. Normalize only its exact semantic cancellation fields; all
     // other policy and the acquired final pose remain pinned.
     if(source&&value.status==='returning'&&value.nativeRouteAdmission==='pending-home-resources'&&value.idleState===null&&value.destinationId===null&&value.path===null&&value.running===false&&value.gateWaiting===false&&value.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>value[k]===p[k])){
      if(stoppedTask){
       if(value.taskId!==null||value.taskApproach!==null)return null;
       const normalized=Object.fromEntries(Object.entries(value).filter(([key])=>!executionFields.has(key)));
       for(const key of ['status','nativeRouteAdmission','idleState','destinationId','path','taskId','taskApproach']){
        if(Object.hasOwn(idlePolicy,key))normalized[key]=idlePolicy[key];else delete normalized[key];
       }
       if(Object.keys(normalized).some(key=>!Object.hasOwn(idlePolicy,key)))return null;
       return JSON.stringify(Object.fromEntries(Object.keys(idlePolicy).map(key=>[key,normalized[key]])));
      }
      return JSON.stringify({...Object.fromEntries(Object.entries(value).filter(([key])=>!executionFields.has(key))),status:idlePolicy.status,nativeRouteAdmission:idlePolicy.nativeRouteAdmission,idleState:idlePolicy.idleState,destinationId:idlePolicy.destinationId});
     }
     if(farmSource){
      // A held Farm stays arriving. Only the exact final native pose can
      // normalize its held marker; unsupported policy changes revoke this part.
      const p=(candidate?.nativeHeldFarmArrival??validatingFarmSource)?.pose,held=value.nativeRouteAdmission==='native-farm-arrival-held';
      if(held&&(!p||value.running!==false||value.gateWaiting!==false||value.heading!==p.yaw||!['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>value[k]===p[k])))return null;
      if(typeof value.running!=='boolean'||typeof value.gateWaiting!=='boolean'||!held&&value.nativeRouteAdmission!=='native-farm-arrival')return null;
      return JSON.stringify({...Object.fromEntries(Object.entries(value).filter(([key])=>!executionFields.has(key))),nativeRouteAdmission:'native-farm-arrival',running:false,gateWaiting:false});
     }
     let idle=value.idleState;
     if(strollSource){const at=Math.min(state.workers.includes(value)?state.elapsed:entry.entityTime,finalAt??Infinity),age=Math.max(0,Math.min(strollSource.endTime-strollSource.worldBoundary.effectiveTime,at-strollSource.worldBoundary.effectiveTime));
      if(!Number.isFinite(at)||idle?.approachRetry!==Math.max(0,strollSource.approachRetry-age))return null;
      idle={...idle,approachRetry:strollSource.approachRetry};}
     return JSON.stringify({...Object.fromEntries(Object.entries(value).filter(([key])=>!executionFields.has(key))),...(strollSource?{idleState:idle}:{})});
    },policyStamp=template?policy(entity,entityTime):null;
    if(policyStamp!==null)idlePolicy=JSON.parse(policyStamp);
    const bodyOwnerCurrent=()=>!closed&&entries.get(id)===entry&&(template?policyStamp!==null&&policy(entry.entity)===policyStamp:JSON.stringify(entry.entity)===stamp)&&(finalFoot??foot).valid()&&(finalFoot??foot).unchangedBy(view)===true&&(!template||previous.support.valid()&&previous.support.unchangedBy(view)===true),ownerCurrent=()=>bodyOwnerCurrent()&&!entry.nativePending;
    if(!ownerCurrent()||entry.nativeState!==previous||!previous.motion.valid()||!previous.variant.current())throw Error('Native stopped worker changed during preparation');
    const selector=template?{kind:codec.stoppedBodyKind,version:1,stop:template,actorId:reference.nativeRoute.actorId}:null;
    const handingOff=()=>{
     const pending=entry.nativePending;
     return !!pending&&entry.nativeState===pending.candidate&&(
      nativeHomeRequestContinuesHeldWorker(pending.nativeHome?.sourceRequest,candidate?.nativeHeldTaskRoute??candidate?.nativeHeldIdleStroll??candidate?.nativeHeldFarmArrival)||
      taskStartContinuesHeldWorker(pending.candidate?.packet,candidate?.nativeHeldIdleStroll??candidate?.nativeHeldFarmArrival)||
      nativeFarmArrivalContinuesHeld(pending.nativeFarmArrival,candidate?.nativeHeldFarmArrival)||
      nativeTaskCancellationMatchesHeldRoute(pending.nativeInitialIdleBody?.cancellationSource,candidate?.nativeHeldTaskRoute,candidate?.suspended?.resumeGeneration));
    };
    const motion=(template?previous.motion.prepareStopped:previous.motion.prepareSuspended)({reference:selector??reference,nativePose:pose,height:foot.point.height,isCurrent:()=>bodyOwnerCurrent()&&(entry.nativeState===previous||entry.nativeState===candidate||handingOff()),...(template?{getProjection:()=>getStoppedProjection(selector,previous.motion.clockEpoch)}:{})});let variant,binding;
    try{const pickTime=()=>template?getStoppedProjection(selector,motion.clockEpoch).at:getPickTime(reference,motion.clockEpoch),phases={runningNode:motion.runningNode,idleNode:motion.idleNode,resolve:(fallback,clip,duration)=>motion.resolve(fallback,clip,duration),sampleClip:()=>carrying?'Carry_Crate':'Idle',sampleForClip:(clip,duration)=>motion.sampleForClip(pickTime(),clip,duration)};
     variant=entry.actor.prepareNativeMotionVariant(phases,{clipBakes,clip:carrying?'Carry_Crate':entry.actor.isBakedIdle?.()?'Idle':null});binding=previous.binding.prepareReplacement({motion,getPickTime:pickTime,materialAlternatives:variant.materialAlternatives,replicaSources:variant.replicaSources,meshes:variant.materialAlternatives.map(item=>item.mesh)});
     candidate={...previous,motion,variant,binding,support:foot,...(template?{nativeStopped:selector}:{}),suspended:reference,start:reference.suspendedAt,end:Number.MAX_SAFE_INTEGER,preparedIdle:!carrying,gateParticipants:[]};
    }catch(error){binding?.dispose();variant?.dispose();motion.dispose();throw error;}
    const alternatives=binding.materialAlternatives(),valid=()=>active&&ownerCurrent()&&entry.nativeState===(attached?candidate:previous)&&(activated||capturing||previous.motion.valid())&&(attached?variant.current()&&binding.current():variant.valid()&&(capturing||binding.canActivate()));
    const check=()=>{if(!valid())throw Error('Native stopped worker presentation became stale');};
    function rollback(){if(!attached)return;binding.rollbackActivation();variant.rollbackActivation();entry.nativeState=previous;entry.motion=previous.motion;entry.motionBinding=previous.binding;attached=false;}
    const part={object:entry.actor.root,signal:entry.controller.signal,include:alternatives.map(item=>item.mesh),materialAlternatives:alternatives,valid,nativeBodyTerrainSupport:{entity,support:foot,reference:foot.reference},eventRoots:()=>[entry.actor.root],presentation:()=>({show:[],hide:[]}),
     capturePresentation(record){capturing=true;try{check();return binding.capturePresentation(record);}finally{capturing=false;}},
     activate(){if(activated)throw Error('Native stop already activated');activated=true;try{check();return true;}catch(error){activated=false;throw error;}},
     attach(){check();variant.activate();try{binding.activate();}catch(error){variant.rollbackActivation();throw error;}entry.nativeState=candidate;entry.motion=motion;entry.motionBinding=binding;attached=true;},rollback,
     finalize(){check();if(!attached||finalized)throw Error('Native stop not attached');finalized=true;return {retire(){check();active=false;retireNative(previous);},notify(){onSelectableChange();}};},
     rollbackFinalized(){finalized=false;},cancel(){if(!active)return false;if(finalized)throw Error('Native stopped worker already finalized');rollback();active=false;retireNative(candidate);return true;}};
    if(template)part.acceptNativeStopBinding=input=>{
     if(!farm&&!taskRoot&&!flightStop)check();const proof=codec.copyAttestation(input),r=proof.reference,owner=r.routes.find(v=>v.nativeRoute.actorId===reference.nativeRoute.actorId),index=r.routes.indexOf(owner);
     if(!proof.projection||!codec.sameReference(proof.preparedReference,template)||!owner||owner.state!==4)throw Error('Native stopped worker lacks its final source');
     const actual={...reference,worldBoundary:r.worldBoundary,suspendedAt:r.worldBoundary.effectiveTime},actualPose=Float64Array.from(proof.projection.routeEffects.rows.slice(index*26+8,(index+1)*26)),support=prepareBodySupport(actual,actualPose);
     const farmHeld=farmSource?copyNativeFarmArrivalHeldExecution({kind:'native-farm-arrival-held-execution',version:1,actorId:farmSource.actorId,bodyId:farmSource.bodyId,sourceReference:farmSource,assignmentSequence:previous.nativeFarmArrivalBinding.assignmentSequence,resumeHandle:{...actual.nativeRoute.routeHandle,generation:actual.resumeGeneration},suspendedAt:actual.suspendedAt,executedThrough:actual.suspendedAt,pose:{x:actualPose[0],z:actualPose[1],yaw:actualPose[4],radius:farmSource.sourceRequest.pose.radius,runPhase:actualPose[9],walkPhase:actualPose[10],carryPhase:actualPose[11],runRemaining:actualPose[14]}}):null;
     const taskHeld=taskRoot?Object.freeze({kind:'native-task-route-held-execution',nativeRoute:owner.nativeRoute,bodyId:owner.bodyId,
      profile:previous.packet.profile,suspendedAt:actual.suspendedAt,
      pose:Object.freeze({x:actualPose[0],z:actualPose[1],yaw:actualPose[4],radius:previous.packet.radius,
       runPhase:actualPose[9],walkPhase:actualPose[10],carryPhase:actualPose[11],runRemaining:actualPose[14]})}):null;
     // The confirmed state receiver applies its held mirror before this receipt.
     // Permit normalization only while checking this already validated proof.
     if(farm){validatingFarmSource=farmHeld;try{check();}finally{validatingFarmSource=null;}}
     if(taskHeld){validatingTaskSource=taskHeld;try{check();}finally{validatingTaskSource=null;}}
     let strollHeld=null;
     if(strollSource){const age=actual.suspendedAt-strollSource.worldBoundary.effectiveTime;strollHeld=copyNativeIdleStrollHeldExecution({kind:'native-idle-stroll-held-execution',version:1,actorId:strollSource.actorId,bodyId:strollSource.bodyId,sourceReference:strollSource,assignmentSequence:previous.nativeIdleStrollBinding.assignmentSequence,resumeHandle:{...actual.nativeRoute.routeHandle,generation:actual.resumeGeneration},suspendedAt:actual.suspendedAt,executedThrough:actual.suspendedAt,pose:{x:actualPose[0],z:actualPose[1],yaw:actualPose[4],radius:strollSource.pose.radius,runPhase:actualPose[9],walkPhase:actualPose[10],carryPhase:actualPose[11],runRemaining:actualPose[14]},walkState:{mode:'walk',rng:strollSource.walkRng,age,approachRetry:Math.max(0,strollSource.approachRetry-age),...(strollSource.version===2?{remaining:strollSource.walkRemaining}:{})}});}
     if(flightStop&&strollHeld){validatingStrollSource=strollHeld;try{check();}finally{validatingStrollSource=null;}}
     if(!support?.valid()||support.unchangedBy(view)!==true)throw Error('Native stopped worker changed final support');finalAt=actual.suspendedAt;finalFoot=support;candidate.support=support;candidate.suspended=actual;candidate.start=actual.suspendedAt;
     if(strollHeld)candidate.nativeHeldIdleStroll=strollHeld;
     if(farmHeld)candidate.nativeHeldFarmArrival=farmHeld;
     if(taskHeld)candidate.nativeHeldTaskRoute=taskHeld;
     return true;
    };
    parts.push(part);
    for(const original of previous.packet.gates){let at=-1;for(let j=0;j<effects.gateEffects.rows.length;j+=3)if(effects.gateEffects.rows[j]===original.gateId){at=j;break;}if(at<0&&farm&&typeof retainNativeGate==='function'){
     if(!retainedGates.has(original.gateId)){
      const retained=retainNativeGate(original,{template,stopEffects:effects,boundary});
      if(!retained||typeof retained.valid!=='function'||!retained.valid()){retained?.cancel?.();throw Error('Native stopped gate retention unavailable');}
      parts.push(retained);retainedGates.add(original.gateId);
     }
     continue;
    }
    if(at<0||effects.gateEffects.rows[at+1]!==original.mechanism)throw Error('Native stopped gate lacks its projected physical pose');const {nativeRoute,...shape}=original,presentation=copyNativeGatePresentation({...shape,worldBoundary:boundary,startTime:reference.suspendedAt,endTime:reference.suspendedAt,rows:Float64Array.from([reference.suspendedAt,effects.gateEffects.rows[at+2]])},{worldBoundary:boundary,startTime:reference.suspendedAt,endTime:reference.suspendedAt});if(!gates.has(presentation.gateId)){if(template?.gates.length){const part=prepareStoppedGate(presentation,{template});if(!part?.valid?.()){part?.cancel?.();throw Error('Native stopped motor preparation unavailable');}parts.push(part);}gates.set(presentation.gateId,presentation);}}
   }
   if(gates.size*3!==effects.gateEffects.rows.length)throw Error('Native stop includes an unowned gate motor');
   parts.push(...prepareNativeTerrainRetention(view,{exclude}));return {parts,gates:template?.gates.length?[]:[...gates.values()]};
  }catch(error){for(const part of parts.reverse())part.cancel();throw error;}
 }
 function nativeRouteCurrent(actorId,ref){const entry=entries.get(actorId),value=entry?.nativeState;return !!value&&!value.suspended&&sameNativeReference(value.nativeRoute,ref)&&value.motion.valid()&&value.variant.current();}
 function recoveredIdleCycleCurrent(actorId,ref){const value=entries.get(actorId)?.nativeState;return sameNativeIdleCycleReference(value?.nativeIdleCycleBinding?.reference,ref)&&value.motion.valid()&&value.variant.current();}
 function nativeRouteLease(){const live=[...entries.values()].map(entry=>entry.nativeState).filter(Boolean);return live.length?{start:Math.max(...live.map(value=>value.start)),end:Math.max(...live.map(value=>value.nativeFarmArrival&&!value.suspended?Number.MAX_SAFE_INTEGER:value.end))}:null;}

 function remove(id,entry){entry.nativePending?.cancel?.();entry.nativePending?.controller.abort();entry.nativePending=null;const native=entry.nativeState;entry.nativeState=null;if(native){entry.motionBinding=null;entry.motion=null;retireNative(native);}if(entry.retainedNativeMaterials){const retained=entry.retainedNativeMaterials;entry.retainedNativeMaterials=null;const release=()=>{for(const retire of Object.values(retained))retire?.();};if(typeof pipelineAdmission?.deferRelease==='function')pipelineAdmission.deferRelease(entry.actor.root,release);else release();}walkRetries.cancel(id);for(const token of entry.actionTokens?.values()??[])actionRetries.cancel(token);entry.motionPreparing?.controller.abort();if(historyRun?.entries.has(id))historyRun.invalid=true;onSelectableChange();entries.delete(id);entry.entity=null;entry.controller.abort();releaseRosterMotion(entry,pipelineAdmission);releaseRosterActor(entry.actor,pipelineAdmission);disposePendingRosterActor(entry,pipelineAdmission);}
 function adoptHomeImpact(entry,entity){
  const prior=entry.nativeState,home=prior?.nativeHomeRouteBinding;
  if(!home||entity.nativeRouteAdmission!==undefined||entity.hits!==1||entity.status!=='fleeing'||!(entity.fallRemaining>0))return;
  const event=state.events?.findLast(row=>row.type==='WorkerHit'&&row.targetId===entity.id&&row.nativeHomeImpact);
  if(!event)return;
  const impact=event.nativeHomeImpact,source=copyNativeHomeRouteAttestation(impact.home);
  if(impact.version!==1||event.id!=='event-'+impact.event||event.simulationTime!==impact.at||impact.at>state.elapsed||
     !source.reference.sourceRequest?.raidSpawnSequence||source.assignmentSequence!==home.assignmentSequence||
     !sameNativeHomeRouteReference(source.reference,home.reference)||!sameNativeHomeRouteReference(source.preparedReference,home.preparedReference)||
     impact.x!==entity.x||impact.z!==entity.z||impact.heading!==entity.downHeading||
     !releaseNativeRoute(entity.id,prior.nativeRoute))throw Error('Home impact differs from the acquired worker');
  onNativeHomeImpact();
 }
 function sync(){if(closed)return;const desired=new Map(),nextTasks=new Map();for(const task of state.tasks??[])if(!nextTasks.has(task?.id))nextTasks.set(task?.id,task);for(const entity of state.workers??[]){if(entity.status==='home')continue;if(typeof entity.id!=='string'||!entity.id||desired.has(entity.id))throw Error('Invalid confirmed worker roster');desired.set(entity.id,entity);}tasks=nextTasks;
  for(const [id,entry] of entries){const entity=desired.get(id);if(!entity||entity.profile!==entry.profile)remove(id,entry);}
  for(const [id,entity] of desired){let entry=entries.get(id);if(entry){const statusChanged=entry.lastStatus!==entity.status,runKey=entity.status+":"+!!entity.running,runChanged=entry.lastRunKey!==runKey,harvestKey=entity.status+":"+(nextTasks.get(entity.taskId)?.kind??""),harvestChanged=entry.lastHarvestKey!==harvestKey,idleKey=entity.status+":"+(entity.idleState?.mode??"")+":"+!!entity.gateWaiting+":"+String(entity.running),idleChanged=entry.lastIdleKey!==idleKey,waterKey=JSON.stringify([entity.status,entity.taskId,nextTasks.get(entity.taskId)?.kind,nextTasks.get(entity.taskId)?.targetId,isWorkerWaterPhase(entity,nextTasks.get(entity.taskId))]),waterChanged=entry.lastWaterKey!==waterKey,plantKey=waterKey+":"+isWorkerPlantPhase(entity,nextTasks.get(entity.taskId)),plantChanged=entry.lastPlantKey!==plantKey,carryKey=JSON.stringify([entity.status,entity.crateId??null,carryingConfirmed(entity)]),carryChanged=entry.lastCarryKey!==carryKey;entry.lastCarryKey=carryKey;entry.lastPlantKey=plantKey;entry.lastWaterKey=waterKey;entry.lastIdleKey=idleKey;entry.lastHarvestKey=harvestKey;entry.lastStatus=entity.status;entry.lastRunKey=runKey;entry.entity=entity;entry.entityTime=state.elapsed;adoptHomeImpact(entry,entity);if(entry.nativeState||['preparing','adopting'].includes(entry.nativePending?.stage))continue;if(statusChanged){walkRetries.reset(id,entry);entry.bakeFailed=false;}for(const [kind,changed] of [['run',runChanged],['harvest',harvestChanged],['idle',idleChanged],['alert',idleChanged],['water',waterChanged],['plant',plantChanged],['carry',carryChanged]])if(changed){resetActionRetry(entry,kind);entry[kind+'Failed']=false;}if(!historyRun&&!entry.motionPreparing){for(const kind of ['run','harvest','idle','alert','water','plant','carry'])if(entry[kind+'Deferred']&&!entry[kind+'Pending']){entry[kind+'Deferred']=false;entry[kind+'Failed']=false;}if(entry.fallDeferred&&!entry.fallPending){entry.fallDeferred=false;entry.fallAttempted=false;}if(entry.getUpDeferred&&!entry.getUpPending){entry.getUpDeferred=false;entry.getUpAttempted=false;}}if(!(entity.fallRemaining>0)||entity.recovery){resetActionRetry(entry,'fall');entry.fallAttempted=false;}if(!entity.recovery||entity.fallRemaining>0||entry.getUpAttemptKey!==JSON.stringify([entity.recovery.fraction,entity.recovery.duration,entity.recovery.heading])){resetActionRetry(entry,'getUp');entry.getUpAttempted=false;}if(!historyRun?.entries.has(id))entry.actor?.update();if(entry.actor){requestBakedFall(id,entry);requestBakedGetUp(id,entry);}if(entry.actor)resumeBakedWalk(id,entry);if((runChanged||!entry.runFailed)&&entry.actor)requestBakedRun(id,entry);if((harvestChanged||!entry.harvestFailed)&&entry.actor)requestBakedHarvest(id,entry);if((idleChanged||!entry.idleFailed)&&entry.actor)requestBakedIdle(id,entry);if((waterChanged||!entry.waterFailed)&&entry.actor)requestBakedWater(id,entry);if((plantChanged||!entry.plantFailed)&&entry.actor)requestBakedPlant(id,entry);if((carryChanged||!entry.carryFailed)&&entry.actor)requestBakedCarry(id,entry);if((idleChanged||!entry.alertFailed)&&entry.actor)requestBakedAlert(id,entry);prepareLateHistoricalMotion(id,entry);continue;}entry={profile:entity.profile,entity,entityTime:state.elapsed,lastStatus:entity.status,lastRunKey:entity.status+":"+!!entity.running,lastHarvestKey:entity.status+":"+(nextTasks.get(entity.taskId)?.kind??""),lastIdleKey:entity.status+":"+(entity.idleState?.mode??"")+":"+!!entity.gateWaiting+":"+String(entity.running),lastWaterKey:JSON.stringify([entity.status,entity.taskId,nextTasks.get(entity.taskId)?.kind,nextTasks.get(entity.taskId)?.targetId,isWorkerWaterPhase(entity,nextTasks.get(entity.taskId))]),lastCarryKey:JSON.stringify([entity.status,entity.crateId??null,carryingConfirmed(entity)]),lastPlantKey:JSON.stringify([entity.status,entity.taskId,nextTasks.get(entity.taskId)?.kind,nextTasks.get(entity.taskId)?.targetId,isWorkerWaterPhase(entity,nextTasks.get(entity.taskId))])+":"+isWorkerPlantPhase(entity,nextTasks.get(entity.taskId)),controller:new AbortController(),actor:null};if(experimentalHistoricalMotion)entry.phase=createConfirmedGpuAnimationPhase({clock:experimentalHistoricalMotion.clock,resourceRegistry});entries.set(id,entry);entry.ready=Promise.resolve().then(()=>createWorker({scene,residency,state,actorId:id,assetBank,renderer,presentationWorkerHeadings,confirmedClock:experimentalHistoricalMotion?.clock??confirmedClock,phaseSource:entry.phase??null,resourceRegistry,getEntity:()=>entry.entity,getTask:taskId=>tasks.get(taskId),signal:entry.controller.signal})).then(actor=>prepareHistorical(id,entry,actor)).then(actor=>admitRosterActor({actor,entry,isCurrent:()=>!closed&&entries.get(id)===entry,pipelineAdmission,onReady:()=>{onSelectableChange();onReady(id);requestBakedWalk(id,entry);if(selected.has(id))prepareLateHistoricalMotion(id,entry);requestBakedRun(id,entry);requestBakedHarvest(id,entry);requestBakedIdle(id,entry);requestBakedWater(id,entry);requestBakedPlant(id,entry);requestBakedCarry(id,entry);requestBakedAlert(id,entry);requestBakedFall(id,entry);requestBakedGetUp(id,entry);}})).catch(error=>{if(closed||entries.get(id)!==entry||entry.controller.signal.aborted)return;entries.delete(id);entry.entity=null;releaseRosterMotion(entry,pipelineAdmission);onError(error);});}
 }
 const preparedTokens=new WeakMap();
 function addExitSamples(samples,preview,id,entity){if(!(entity.recoveryExitRemaining>0))return samples;const record=preview.trace.actorTickStates.actors.find(value=>value.actorId===id);if(!samples||!record||samples.length!==record.samples.length)return null;return samples.map((sample,i)=>({...sample,exitRemaining:record.samples[i].recoveryExitRemaining}));}
 function prepareHistoricalMotion(preview,support){
  const paths=preview?.trace?.actors,grounds=support?.actors;
  if(closed||historyRun)return {ok:false,reason:'roster-busy'};if([...entries.values()].some(entry=>entry.nativeState||entry.nativePending))return {ok:false,reason:'native-owner'};
  if(preview?.sequence!==support?.sequence||typeof support?.valid!=='function'||!support.valid()||!Array.isArray(paths)||!Array.isArray(grounds))return {ok:false,reason:'support-unavailable'};
  const prepared=[];for(const id of ids){const entry=entries.get(id),entity=state.workers?.find(value=>value.id===id),matches=paths.filter(p=>p.actorId===id),heights=grounds.filter(g=>g.actorId===id),path=matches[0],ground=heights[0],kind=confirmedHistoricalParticipant(preview,id,entity,'worker',state.tasks??[]);
   if(kind==='hidden'){if(entry)return {ok:false,reason:'worker-hidden-visible',actorId:id};prepared.push({id,entity,kind});continue;}
   if(!kind||matches.length!==1||heights.length!==1||!entry?.actor||entry.bakePending||entry.bakeLoading&&!activeBakedAction(entry.actor,kind)||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.motionPreparing||entry.entity!==entity||entry.actor.root?.visible!==true||!Array.isArray(ground.segments)||!ground.segments.length)return {ok:false,reason:'worker-not-ready',actorId:id};
   if(entity.status==='carrying'&&!carryingConfirmed(entity))return {ok:false,reason:'worker-crate',actorId:id};const root=entry.actor.root.getWorldPosition(new Vector3());if(root.x!==path.start.x||root.z!==path.start.z||Math.abs(root.y-ground.startHeight-.025)>1e-6)return {ok:false,reason:'worker-anchor',actorId:id};
   if(kind==='stationary'){let phaseSamples=null;const recovering=entry.actor.isBakedRecovering?.()===true,falling=entry.actor.isBakedFalling?.()===true,carrying=entry.actor.isBakedCarrying?.()===true,planting=entry.actor.isBakedPlanting?.()===true,watering=entry.actor.isBakedWatering?.()===true,harvesting=entry.actor.isBakedHarvesting?.()===true,idling=entry.actor.isBakedIdle?.()===true,alerting=entry.actor.isBakedAlert?.()===true,running=entry.actor.isBakedRunning?.()===true,baked=entry.actor.isBakedWalking?.()===true||running||harvesting||idling||alerting||watering||planting||carrying||falling||recovering;if(entity.recovery&&!recovering||entity.fallRemaining>0&&!falling||entity.status==='acting'&&!harvesting&&!watering&&!planting||entity.status==='carrying'&&!carrying)return {ok:false,reason:'worker-animation',actorId:id};if(baked){const record=preview.trace.actorTickStates.actors.find(value=>value.actorId===id),phase=carrying?entity.carryPhase:running?entity.runPhase:entity.walkPhase;if(!entry.phase||!record)return {ok:false,reason:'worker-animation',actorId:id};if(recovering){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.getUpPhase?.(sample)}));if(!entity.recovery||phaseSamples[0]?.phase!==entity.recovery.elapsed||phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-recovery-animation',actorId:id};}else if(falling){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.fallPhase?.(sample)}));if(!Number.isFinite(entity.fallRemaining)||record.samples[0]?.fallRemaining!==entity.fallRemaining||phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-fall-animation',actorId:id};}else if(planting){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.plantPhase?.(sample)}));if(phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-animation',actorId:id};}else if(watering){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.waterPhase?.(sample)}));if(phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-animation',actorId:id};}else if(alerting){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.alertPhase?.(sample)}));const first=entity.idleState?.elapsed;if(!Number.isFinite(first)||phaseSamples[0]?.phase!==first||phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-animation',actorId:id};}else if(idling){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.idlePhase?.(sample)}));const first=isWorkerGateIdle(entity)||isWorkerFleeIdle(entity)||isWorkerIncapacitatedPresentation(entity)?preview.start:entity.idleState?entity.idleState.elapsed:preview.start;if(!Number.isFinite(first)||phaseSamples[0]?.phase!==first||phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-animation',actorId:id};}else if(harvesting){phaseSamples=record.samples.map(sample=>({at:sample.at,phase:entry.actor.harvestPhase?.(sample)}));if(phaseSamples.some((sample,index)=>!Number.isFinite(sample.phase)||sample.phase<0||index&&sample.phase<phaseSamples[index-1].phase))return {ok:false,reason:'worker-animation',actorId:id};}else{if(!Number.isFinite(phase)||phase<0)return {ok:false,reason:'worker-animation',actorId:id};phaseSamples=record.samples.map(sample=>({at:sample.at,phase}));}if(entity.recoveryExitRemaining>0){if(!baked||(!entry.actor.isBakedWalking?.()&&!running&&!idling))return {ok:false,reason:'worker-exit-animation',actorId:id};phaseSamples=addExitSamples(phaseSamples,preview,id,entity);if(!phaseSamples)return {ok:false,reason:'worker-exit-animation',actorId:id};}}prepared.push({id,entry,entity,kind,baked,running,harvesting,harvestWork:harvesting&&tasks.get(entity.taskId)?.kind==='harvest',idling,alerting,watering,planting,carrying,falling,recovering,phaseSamples,position:root.toArray(),orientation:entry.actor.root.getWorldQuaternion(new Quaternion()).toArray(),scale:entry.actor.root.getWorldScale(new Vector3()).toArray()});continue;}
   if(!entry.motion)return {ok:false,reason:'worker-not-ready',actorId:id};
   const yawSamples=confirmedMotionYaw(preview,id,entry.actor.root),carrying=entry.actor.isBakedCarrying?.()===true,running=entry.actor.isBakedRunning?.()===true,idling=entry.actor.isBakedIdle?.()===true,baked=entry.actor.isBakedWalking?.()===true||running||carrying||idling,phaseSamples=baked?(carrying?confirmedWorkerCarrySamples(preview,id,entry.entity):running?confirmedWorkerRunningSamples(preview,id,entry.entity):idling?confirmedWorkerFleeIdleSamples(preview,id,entry.entity):confirmedWalkingSamples(preview,id,'worker',entry.entity)):null;if(entity.status==='carrying'&&!carrying)return {ok:false,reason:'worker-animation',actorId:id};if(!yawSamples||baked&&(!phaseSamples||!entry.phase)||entity.recoveryExitRemaining>0&&(!baked||carrying))return {ok:false,reason:'worker-animation',actorId:id};const synchronizedPhases=addExitSamples(phaseSamples,preview,id,entity);if(baked&&!synchronizedPhases)return {ok:false,reason:'worker-exit-animation',actorId:id};
   prepared.push({id,entry,entity:entry.entity,kind,baked,running,idling,carrying,phaseSamples:synchronizedPhases,trace:{actorId:id,continuous:true,timed:true,start:{...path.start,y:ground.startHeight+.025},end:{...path.end,y:ground.endHeight+.025},segments:ground.segments.map(segment=>({...segment,y0:segment.y0+.025,y1:segment.y1+.025})),yawSamples}});
  }
  const token={};preparedTokens.set(token,{preview,support,prepared,ids:[...ids],trace:JSON.stringify(preview.trace),grounds:JSON.stringify(support.actors)});return {ok:true,token,remoteAutonomous:prepared.every(value=>value.kind==='hidden'||value.kind!=='physical'&&value.baked===true&&Array.isArray(value.phaseSamples)&&value.phaseSamples.length>0)};
 }
 function validHistoricalParticipant(value,preview){const entity=state.workers?.find(item=>item.id===value.id),entry=entries.get(value.id);if(entity!==value.entity)return false;if(value.kind==='hidden')return !entry&&confirmedHistoricalParticipant(preview,value.id,entity,'worker',state.tasks??[])==='hidden';const root=entry?.actor?.root;if(entry!==value.entry||entry.bakePending||entry.bakeLoading&&!activeBakedAction(entry.actor,value.kind)||entry.runPending||entry.harvestPending||entry.idlePending||entry.waterPending||entry.plantPending||entry.carryPending||entry.alertPending||entry.getUpPending||entry.fallPending||entry.motionPreparing||entry.entity!==entity||!root?.visible)return false;if(entity.status==='carrying'&&!carryingConfirmed(entity))return false;const position=root.getWorldPosition(new Vector3()),sameBake=((entry.actor.isBakedWalking?.()===true||entry.actor.isBakedRunning?.()===true||entry.actor.isBakedHarvesting?.()===true||entry.actor.isBakedIdle?.()===true||entry.actor.isBakedAlert?.()===true||entry.actor.isBakedWatering?.()===true||entry.actor.isBakedPlanting?.()===true||entry.actor.isBakedCarrying?.()===true||entry.actor.isBakedFalling?.()===true||entry.actor.isBakedRecovering?.()===true)===value.baked)&&((entry.actor.isBakedRunning?.()===true)===(value.running===true))&&((entry.actor.isBakedHarvesting?.()===true)===(value.harvesting===true))&&((entry.actor.isBakedIdle?.()===true)===(value.idling===true))&&((entry.actor.isBakedAlert?.()===true)===(value.alerting===true))&&((entry.actor.isBakedWatering?.()===true)===(value.watering===true))&&((entry.actor.isBakedPlanting?.()===true)===(value.planting===true))&&((entry.actor.isBakedCarrying?.()===true)===(value.carrying===true))&&((entry.actor.isBakedFalling?.()===true)===(value.falling===true))&&((entry.actor.isBakedRecovering?.()===true)===(value.recovering===true));if(value.kind==='stationary')return sameBake&&confirmedHistoricalParticipant(preview,value.id,entity,'worker',state.tasks??[])==='stationary'&&position.toArray().every((n,i)=>n===value.position[i])&&root.getWorldQuaternion(new Quaternion()).toArray().every((n,i)=>n===value.orientation[i])&&root.getWorldScale(new Vector3()).toArray().every((n,i)=>n===value.scale[i]);return sameBake&&confirmedHistoricalParticipant(preview,value.id,entity,'worker',state.tasks??[])==='moving'&&position.x===value.trace.start.x&&Math.abs(position.y-value.trace.start.y)<=1e-6&&position.z===value.trace.start.z&&!!confirmedMotionYaw(preview,value.id,root);}
 function startHistoricalMotion(preview,support,token=null){
  const proof=preview?.certificates;
  if(preview?.safeForAutonomousPlayback!==true||!proof||proof.sequence!==preview.sequence||!Array.isArray(proof.actorIds)||ids.some(id=>!proof.actorIds.includes(id))||proof.animationSynchronized!==true||proof.otherActorsSynchronized!==true||proof.effectsSynchronized!==true||proof.continuousCollision!==true||proof.inputSynchronized!==true)return false;
  const checked=token===null?prepareHistoricalMotion(preview,support):{ok:true,token};if(!checked.ok)return false;const pending=preparedTokens.get(checked.token);preparedTokens.delete(checked.token);
  if(!pending||pending.preview!==preview||pending.support!==support||closed||historyRun||support.valid()!==true||pending.trace!==JSON.stringify(preview.trace)||pending.grounds!==JSON.stringify(support.actors)||ids.length!==pending.ids.length||ids.some((id,index)=>id!==pending.ids[index])||pending.prepared.some(value=>!validHistoricalParticipant(value,preview)))return false;
  const prepared=pending.prepared;if(prepared.some(value=>value.watering)&&proof.wateringSynchronized!==true||prepared.some(value=>value.planting||value.harvestWork)&&proof.workSynchronized!==true)return false;
  const installed=[];try{for(const value of prepared){if(value.kind!=='moving'&&!value.phaseSamples)continue;installed.push(value);if(value.phaseSamples)value.entry.phase.install(value.phaseSamples,preview);if(value.kind==='moving')value.entry.motion.install(value.trace,preview.sequence);}}catch{for(const value of installed){if(value.phaseSamples)value.entry.phase.reset();if(value.kind==='moving')value.entry.motion.cancelAtStart();}return false;}
  historyRun={sequence:preview.sequence,entries:new Map(prepared.filter(value=>value.entry).map(value=>[value.id,value.entry])),participants:prepared,installed,moving:installed.filter(value=>value.kind==='moving'),support,invalid:false};return true;
 }
 function historicalMotionCurrent(preview){if(!historyRun||historyRun.invalid||historyRun.sequence!==preview?.sequence||closed||historyRun.support.valid()!==true)return false;return historyRun.participants.every(value=>validHistoricalParticipant(value,preview));}
 function stationaryContinuation(value,preview){return {start:preview.start,end:preview.end,x:value.position[0],y:value.position[1],z:value.position[2]};}
 function canFinishHistoricalMotion(preview,{continuation=false}={}){if(!historicalMotionCurrent(preview))return false;return !continuation||historyRun.participants.every(value=>['moving','starting'].includes(value.kind)?value.entry.motion.canFinishSegment():value.kind!=='stationary'||!value.entry.motion||value.entry.motion.canExtendStationary(stationaryContinuation(value,preview),preview.sequence));}
 function finishHistoricalMotion(preview,{continuation=false}={}){if(!historicalMotionCurrent(preview))throw Error('Historical worker motion is no longer current');for(const value of historyRun.installed){if(value.kind==='moving'){if(continuation)value.entry.motion.finishSegment();else value.entry.motion.reset();}if(value.phaseSamples)value.entry.phase.reset();}for(const value of historyRun.participants)if(value.kind==='stationary'&&value.entry.motion){if(continuation)value.entry.motion.extendStationary(stationaryContinuation(value,preview),preview.sequence);else value.entry.motion.reset();}const completed=historyRun;historyRun=null;for(const [id,entry] of completed.entries)if(entry.bakeResource)resumeBakedWalk(id,entry);}
 function abortHistoricalMotion(){if(!historyRun)return;if(!experimentalHistoricalMotion.clock.status().active){cancelHistoricalMotion();return;}const run=historyRun;run.invalid=true;for(const value of run.installed)if(value.phaseSamples)try{value.entry.phase.hold();}catch{}for(const {entry} of run.moving)try{entry.motion.hold(experimentalHistoricalMotion.clock.elapsed);}catch{}}
 function cancelHistoricalMotion(){if(!historyRun)return;for(const value of historyRun.installed){if(value.kind==='moving')value.entry.motion.cancelAtStart();if(value.phaseSamples)value.entry.phase.reset();}const completed=historyRun;historyRun=null;for(const [id,entry] of completed.entries)if(entry.bakeResource)resumeBakedWalk(id,entry);}
 function setHistoricalActors(next){if(closed||historyRun)throw Error('Historical selection is busy');if(!Array.isArray(next)||next.some(id=>typeof id!=='string'||!id)||new Set(next).size!==next.length)throw TypeError('Invalid historical worker selection');ids.splice(0,ids.length,...next);selected.clear();for(const id of next)selected.add(id);for(const [id,entry] of entries){if(!selected.has(id))entry.motionPreparing?.controller.abort();else prepareLateHistoricalMotion(id,entry);}}
 return {sync,prepareRecoveredStoppedWorker,recoveredStoppedWorkerCurrent,prepareRecoveredWorkerRoute,prepareRecoveredTaskAction,recoveredTaskActionCurrent,prepareRecoveredTaskSettlement,recoveredTaskSettlementCurrent,prepareRecoveredIdleCycle,recoveredIdleCycleCurrent,prepareNativeIdleStrollProposal,prepareNativeHomeArrivalProposal,prepareNativeRoute,prepareNativeResumeProposal,prepareNativeFarmArrivalProposal,prepareNativeHomeRouteProposal,prepareNativeTaskStartProposal,prepareNativeTaskConsequenceProposal,prepareNativeTaskActionProposal,prepareNativeTaskSettlementProposal,prepareNativeInitialIdleBodyProposal,prepareNativeIdleCycleProposal,releaseNativeIdleCycle,releaseNativeInitialIdleBody,releaseNativeTaskAction,releaseNativeTaskSettlement,releaseNativeRoute,prepareNativeTerrainRetention,prepareNativeTerrainStops,nativeRouteLease,nativeRouteCurrent,...(experimentalHistoricalMotion?{setHistoricalActors,historicalActorIds:()=>[...ids],prepareHistoricalMotion,startHistoricalMotion,historicalMotionCurrent,canFinishHistoricalMotion,finishHistoricalMotion,abortHistoricalMotion,cancelHistoricalMotion}:{}),...(import.meta.env?.DEV?{bindMotion(actorId,motion,renderer,getPickTime){const entry=entries.get(actorId);if(closed||!entry?.actor||entry.motionBinding)throw Error('Actor motion binding unavailable');const binding=bindWebGpuActorMotion({root:entry.actor.root,renderer,motion,actorId,getPickTime});entry.motionBinding=binding;return {dispose(){if(entry.motionBinding===binding)entry.motionBinding=null;binding.dispose();}};}}:{}),tick(now){assetBank.tick?.(now);},get(id){return entries.get(id)?.actor??null;},status(){let ready=0;for(const entry of entries.values())if(entry.actor)ready++;return {closed,count:entries.size,ready,pending:entries.size-ready,native: [...entries.values()].filter(entry=>entry.nativeState).length,nativePreparing:[...entries.values()].filter(entry=>entry.nativePending).length,assets:assetBank.status?.()??null};},dispose(){if(closed)return;closed=true;walkRetries.dispose();actionRetries.dispose();for(const [id,entry] of entries)remove(id,entry);if(ownsAssetBank)assetBank.dispose();}};
}
