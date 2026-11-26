import {classifyWorkerEncounter,prepareWorkerEncounter} from '../../simulation/encounters.js';
import {copyNativeRecoveryGroup,copyRecoveredEncounterPose,matchesNativeRefugeRecovery,nativeRecoveryCovers,nativeWorkerRouteRecoveryProfile,sameRecoveredEncounter,woundedHomeExecutionAtEndpoint} from '../native-worker-route-recovery.js';
import {sameNativeFarmArrivalRouteReference} from '../native-farm-arrival-route.js';
import {centerSource,verifiesCenter} from '../native-center-ruin-source.js';
import {centerFootprint} from '../centers.js';
import {copyNativeAnimalCropAttestation,copyNativeAnimalCropProposal,sameNativeAnimalCropReference,nativeAnimalCropSuccessor,sameRestoredAnimalStrike} from '../native-animal-crop-resource.js';
import {nativeMotionPresentationMatches} from '../native-motion-presentation-match.js';
import {copyNativeShieldWorld,nativeShieldWorldKind,shieldCropStopFromProposal,copyNativeShieldCropExpiry} from '../native-shield-world.js';
import {spatialShieldFootprint} from './spatial-shield-mirror.js';
import {canAttackCrop,nativeCenterAttackCohort,nativeCropRouteSubject,nativeCropCohortCurrent,nativeRetreatSubject,reachableApproach,raidTarget,previewRaidStrike,projectAcquiredRaidStrike,savedRaidStrike} from '../../simulation/raids.js';
import {nativeEncounterCheckpointActors} from '../../simulation/native-encounter-checkpoint.js';
import {captureRestoredWallRepairs} from '../restored-wall-repair-reference.js';
import {copyNativeBarrierAdditions,copyNativeBarrierAdditionProposal,copyNativeBarrierAdditionAttestation,copyNativeBarrierAdditionResources,nativeBarrierAdditionSuccessor} from '../native-barrier-addition.js';
import {copyNativeIdleStrollFailedRestReference} from '../native-idle-stroll-failed-rest-reference.js';
import {copyNativeIdleStrollRequestReference,copyNativeIdleStrollDeclarationReference,sameNativeIdleStrollRequestReference} from '../native-idle-stroll-request-reference.js';
import {copyNativeFarmArrivalRequestReference,copyNativeFarmArrivalDeclarationReference} from '../native-farm-arrival-request-reference.js';
import {copyNativeFarmArrivalRouteProposal,copyNativeFarmArrivalRouteReference,copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,copyNativeFarmArrivalHeldExecution,sameNativeFarmArrivalRouteAttestation} from '../native-farm-arrival-route.js';
import {sameNativeFarmArrivalRequestReference} from '../native-farm-arrival-request-reference.js';
import {nativeFarmArrivalState,nativeFarmArrivalRetainedPendingState,nativeFarmArrivalExecutionState,nativeFarmArrivalHeldState,nativeFarmArrivalTerminalState,nativeFarmArrivalBoundState} from '../native-farm-arrival-state.js';
import {LOCOMOTION} from '../../simulation/locomotion-calibration.js';
import {copyNativeRouteReference} from '../native-route-reference.js';
import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec,nativeTaskRouteStopCodec} from '../native-worker-route-stop-codec.js';
import {copyNativeIdleStrollStopReference,copyNativeIdleStrollStopProposal,copyNativeIdleStrollStopTicket,nativeIdleStrollStopTicketFromProposal,copyNativeIdleStrollStopAttestation,copyNativeIdleStrollStopProjection} from '../native-idle-stroll-stop.js';
import {copyNativeIdleCycleBodySource,isNativeIdleStrollArrivalSource,nativeIdleCycleBodyState} from '../native-idle-cycle-body-source.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollProposal,copyNativeIdleStrollAttestation,copyNativeIdleStrollHeldExecution,sameNativeIdleStrollAttestation,sameNativeIdleStrollReference,nativeIdleStrollContinuesNext,nativeIdleStrollContinuesRestoredRequest,nativeIdleStrollWalkRemaining,nativeIdleStrollApproachesAnchor} from '../native-idle-stroll.js';
import {copyNativeHomeArrivalReference,copyNativeHomeArrivalProposal,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../native-home-arrival.js';
import {createNativeResourceAdmission} from '../native-resource-admission.js';
import {nativeTaskStartReferenceFromProposal} from '../native-task-start-reference.js';
import {copyNativeTaskRequestReference} from '../native-task-request-reference.js';
import {copyNativeTaskActionRestoreReference} from '../native-task-action-restore-reference.js';
import {copyNativeTaskActionProgress,nativeTaskActionActor,copyNativeTaskActionRequest,copyNativeTaskActionProposal,nativeTaskActionReferenceFromProposal,sameNativeTaskActionRequest,NATIVE_TASK_ACTION_KINDS} from '../native-task-action-presentation.js';
import {copyNativeTaskActionAttestation} from '../native-task-action-attestation.js';
import {copyNativeTaskStartAttestation} from '../native-task-start-attestation.js';
import {copyNativeTaskConsequenceProposal,copyNativeTaskConsequenceAttestation,copyNativeTaskConsequenceReference} from '../native-task-consequence.js';
import {copyNativeHomeRouteProposal,copyNativeHomeRouteReference,copyNativeHomeRouteAttestation,nativeHomeRouteSource,nativeHomeRouteSourceSequence} from '../native-home-route.js';
import {copyNativeHomeRequestReference,copyNativeHomeDeclarationReference,sameNativeHomeRequestReference,nativeHomeRequestContinuesIdle,nativeHomeRequestContinuesInitialIdle,nativeHomeRequestContinuesFarmRequest,nativeHomeRequestContinuesIdleCycle,nativeHomeRequestContinuesHeldIdleStroll,nativeHomeRequestContinuesHeldFarmArrival,nativeHomeRequestContinuesCompletedFarmArrival,nativeHomeRequestContinuesCompletedIdleStroll} from '../native-home-request-reference.js';
import {nativeHomeWorkerStatus} from '../native-home-request-reference.js';
import {RECOVERY_EXIT_SECONDS,woundedHomeSourceCurrent} from '../../simulation/worker-recovery.js';
import {copyNativeInitialIdleRequestReference,copyNativeInitialIdleDeclarationReference,copyNativeInitialIdleState} from '../native-initial-idle-request-reference.js';
import {copyNativeInitialIdleBodyReference,copyNativeInitialIdleBodyProposal,copyNativeInitialIdleBodyAttestation,copyNativeTaskCancellationSource,sameNativeTaskCancellationSource} from '../native-initial-idle-body.js';
import {readNativePendingTaskCancellation} from '../native-pending-task-cancellation.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleProposal,copyNativeIdleCycleAttestation,copyNativeIdleCycleNextRequest,sameNativeIdleCycleNextRequest} from '../native-idle-cycle.js';
import {nativeInitialIdleDeclaration,nativeInitialIdleInitialization,nativeInitialIdleRetainedState,nativeInitialIdleSavedState} from '../native-initial-idle-state.js';
import {cancelIdle,createIdleState} from '../../simulation/idle.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementProposal,copyNativeTaskSettlementAttestation} from '../native-task-settlement.js';
import {nativeEntityNumericId as numericId} from '../native-entity-id.js';
import {copyNativeGatePresentation} from '../native-gate-presentation.js';
import {centerGeometry,centerServicePoint,centerDeliveryPoint} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';
import {observeGameEvents,idleFarmAnchor,repairCost,prepareHarvestConsequence,harvestConsequenceCurrent,projectNativeHarvestConsequence,prepareNativeStationaryTaskConsequence,projectNativeStationaryTaskConsequence,prepareCrateDeliveryConsequence,crateDeliveryConsequenceCurrent,projectNativeCrateDeliveryConsequence,projectNativeHomeRouteExecution,projectNativeFarmArrivalRouteExecution} from '../../simulation/game.js';
import {nativeIdleStrollLiveState,nativeIdleStrollSavedState} from '../native-idle-stroll-state.js';
import {BALANCE} from '../../simulation/balance.js';
import {activeCrops} from '../../simulation/active-crops.js';
import {workerEntityLookup} from '../../simulation/worker-entity-lookup.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {targetReservationKey} from '../../simulation/raid-target-reservations.js';
import {actorBlockers} from '../../simulation/actor-motion.js';
import {wallCollisionFrame} from '../wall-collision-frame.js';
import {readNativeGateStaticWitness} from './spatial-gate-intents.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../native-world-boundary.js';
import {NATIVE_ROUTE_PRESENTATION_VERSION,NATIVE_ROUTE_PRESENTATION_WIDTH} from '../native-route-presentation.js';
import {applyConfirmedTaskAssignments,notifyWorkerPlanningChange,
  observeTaskChanges,releaseTask,replaceTasks} from '../../simulation/tasks.js';

// Event-fed bridge. Game.tick uses its worker task gate when the opt-in native
// intent planner is attached; animal attack selection remains in raids.js.
const width=10,maxBatch=4096;
const profileEnd=new Map(PROFILES.map(profile=>[profile.id,profile.end]));
const materialCodes=new Map(BALANCE.walls.map((wall,index)=>[wall.id,index+1]));
const cropCodes=new Map(BALANCE.crops.map((crop,index)=>[crop.id,index+1]));
const cropValues=new Map(BALANCE.crops.map(crop=>[crop.id,crop.base_harvest_value]));
const structureStatus={intact:0,collapsing:1,ruined:2};
const lexicalRank=id=>Number(`0.${/-(\d+)$/.exec(id)[1]}`);
const workerRow=(worker,state)=>[1,1,numericId(worker.id),
  worker.centerId?numericId(worker.centerId):0,worker.x,worker.z,
  !!worker.centerId&&(worker.status==='idle'||
    worker.status==='arriving'&&!worker.raidReturn)&&
    !worker.taskId&&!worker.incapacitated&&
    !contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0)?1:0,
  worker.status==='acting'?1:0,0,lexicalRank(worker.id)];
const targetRow=(entity,state)=>{
  if('alive' in entity)return [1,2,numericId(entity.id),
    entity.species==='platano'?2:1,entity.x,entity.z,entity.alive?1:0,0,0,0];
  if(entity.kind==='wall'){
    const frame=wallCollisionFrame(entity);
    return [1,2,numericId(entity.id),3,entity.x,entity.z,1,
      Math.round(frame.depth/.22*100),frame.yaw,frame.width/1.09];
  }
  if(entity.kind==='center')return [1,2,numericId(entity.id),4,
    entity.x,entity.z,1,0,entity.yaw??0,centerGeometry(entity,state).radius];
  return [1,2,numericId(entity.id),0,entity.x,entity.z,
    entity.delivered||entity.carrierId?0:1,0,0,0];
};
const taskRow=task=>[1,3,numericId(task.id),numericId(task.centerId),
  task.kind==='initial'||task.kind==='water'?1:task.kind==='repair'?2:0,
  0,task.workerId?numericId(task.workerId):0,numericId(task.targetId),
  task.created,lexicalRank(task.id)];
const structureMetaRow=structure=>{
  const material=structure.kind==='wall'?materialCodes.get(structure.material):0;
  if(material===undefined||structureStatus[structure.status]===undefined)
    throw TypeError(`Unsupported structure metadata: ${structure.id}`);
  return [1,4,numericId(structure.id),structure.kind==='wall'?3:4,
    structure.hp,structure.maxHp,structureStatus[structure.status],material,0,0];
};
const cropMetaRow=plant=>{
  const species=cropCodes.get(plant.species),value=cropValues.get(plant.species);
  if(!species||!Number.isFinite(value))throw TypeError(`Unsupported crop: ${plant.id}`);
  return [1,5,numericId(plant.id),species,value,0,0,0,0,0];
};
const centerAccessRow=(center,state)=>{
  const point=centerServicePoint(center,state,.8);
  return [1,6,numericId(center.id),4,point.x,point.z,0,0,0,0];
};
const taskTargetLookup=state=>{
  const plant=workerEntityLookup(()=>activeCrops(state.plants),
    {reuse:true,appendOnly:true});
  const crate=workerEntityLookup(()=>state.crates,{reuse:true,appendOnly:true});
  const structure=workerEntityLookup(()=>state.structures,{reuse:true});
  return id=>id.startsWith('plant-')?plant(id):
    id.startsWith('crate-')?crate(id):structure(id);
};

function inactiveHomeEntry(state,worker,legacyCropHome=false,woundedHome=false){
  if(!worker||worker.status!=='home'||worker.taskId||worker.crateId||worker.nativeRouteAdmission!==undefined||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||worker.path?.length||worker.incapacitated&&!(woundedHome&&worker.hits===2)||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining>0||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false&&!(legacyCropHome&&worker.gateWaiting===undefined))return null;
  const village=state.villages.find(v=>v.id===worker.villageId),entry=village?.entry??village;
  return entry&&Number.isFinite(entry.x)&&Number.isFinite(entry.z)&&worker.x===entry.x&&worker.z===entry.z?entry:null;
}

function idleReanchorAfterCrop(state,worker,anchorId){
  const old=/^farm-(plant-[1-9]\d*)$/.exec(anchorId)?.[1];
  if(!old)return null;
  const crops=activeCrops(state.plants);
  if(crops.some(crop=>crop.id===old))return null;
  const center=state.structures.find(c=>c.id===worker.centerId);
  return idleFarmAnchor(state,worker,center,crops);
}
function restoredStrollGameState(state,worker){
  const semantic=nativeIdleStrollSavedState(state,worker),idle=semantic.idleState,approach=idle.destination.id===idle.anchorId,center=state.structures.find(c=>c.id===worker.centerId),match=/^farm-(plant|structure)-(\d+)$/.exec(idle.anchorId);
  const plant=match?.[1]==='plant'?state.plants.find(p=>p.id===`plant-${match[2]}`&&p.centerId===worker.centerId&&p.alive):null;
  if(!match||match[1]==='plant'&&!plant||match[1]==='structure'&&center.id!==`structure-${match[2]}`)throw Error('Invalid saved native stroll anchor');
  // Reuse the original policy with the SAVED anchor ID. Re-evaluating the
  // nearest crop here would change the selected WALK target after loading.
  const a=idleFarmAnchor(state,worker,center,plant?[plant]:[]),anchor={kind:plant?1:2,id:Number(match[2]),x:a.x,z:a.z,radius:a.idleRadius},calibration=LOCOMOTION.sources.find(c=>c.profile===worker.profile);
  if(a.id!==idle.anchorId||!calibration||!['x','z','radius'].every(k=>Number.isFinite(anchor[k]))||anchor.radius<=0||anchor.radius>8||!approach&&Math.hypot(worker.x-anchor.x,worker.z-anchor.z)>anchor.radius||(approach?idle.destination.x!==anchor.x||idle.destination.z!==anchor.z:Math.hypot(idle.destination.x-anchor.x,idle.destination.z-anchor.z)>anchor.radius+1e-9))throw Error('Invalid saved native stroll geometry');
  return {...semantic,anchor,calibration,approach};
}
function restoredStrollMatchesWorker(state,worker,request){
  if(!worker||request.actorId!==numericId(worker.id)||request.requestedAt>state.elapsed||worker.profile!==request.workerProfile||numericId(worker.centerId)!==request.centerId)return false;
  try{const {pose,idleState:i,anchor:a,approach}=restoredStrollGameState(state,worker);return (request.approach===true)===approach&&Object.keys(pose).every(k=>pose[k]===request.pose[k])&&['kind','id','x','z','radius'].every(k=>a[k]===request.anchor[k])&&i.remaining===(request.version===2?request.walkRemaining:request.approach?request.idleSeconds*2:0)&&i.rng===request.walkRng&&i.approachRetry===request.approachRetry&&i.destination.x===request.destination.x&&i.destination.z===request.destination.z;}catch{return false;}
}
function normalizeNativeIntentRestoration(state,wasm){
  const farmArrivals=state.workers.filter(w=>['pending-farm-arrival-resources','native-farm-arrival','native-farm-arrival-held'].includes(w.nativeRouteAdmission));
  if(farmArrivals.length&&(wasm.nav_farm_arrival_request_version?.()!==1||wasm.spatial_body_count()!==0))throw Error('Native farm arrival restoration requires a fresh supported world');
  for(const worker of farmArrivals)if(worker.nativeRouteAdmission==='native-farm-arrival-held')nativeFarmArrivalHeldState(state,worker);else if(worker.nativeRouteAdmission==='native-farm-arrival')nativeFarmArrivalExecutionState(state,worker);else nativeFarmArrivalState(state,worker,{canonical:true});
  // Only an already-held semantic Farm pose can retarget Home on cold restore.
  // Moving expired corridors were rejected above; no saved execution is resumed.
  const farmHomes=farmArrivals.filter(w=>w.nativeRouteAdmission==='native-farm-arrival-held'&&(contractExpired(w,state)||state.time>=profileEnd.get(w.profile))).map(worker=>({worker,home:{...worker,status:'returning',path:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false}}));
  const initialIdles=state.workers.filter(w=>['pending-idle-resources','native-idle'].includes(w.nativeRouteAdmission));
  if(initialIdles.length&&(wasm.nav_initial_idle_request_version?.()!==1||typeof wasm.nav_intent_request_initial_idle!=='function'))throw Error('Rebuild native initial Idle restoration');
  if(initialIdles.length&&wasm.spatial_body_count()!==0)throw Error('Native initial Idle restoration requires a fresh physical world');
  if(initialIdles.some(w=>w.nativeRouteAdmission==='native-idle')&&wasm.nav_initial_idle_body_proposal_version?.()!==1)throw Error('Rebuild native initial Idle body restoration');
  for(const worker of initialIdles)nativeInitialIdleSavedState(state,worker,{canonical:true});
  const strollers=state.workers.filter(w=>w.nativeRouteAdmission==='native-idle-stroll'||w.nativeRouteAdmission==='pending-stroll-resources');
  if(strollers.length&&(wasm.nav_idle_stroll_restore_version?.()!==2||typeof wasm.nav_intent_restore_idle_stroll!=='function'||typeof wasm.nav_intent_restore_idle_approach!=='function'||typeof wasm.nav_idle_stroll_restore_declaration_snapshot!=='function'||typeof wasm.nav_intent_restored_idle_stroll_home_request!=='function'))throw Error('Rebuild native stroll restoration');
  if(strollers.some(w=>w.idleState?.destination?.id===w.idleState?.anchorId&&w.idleState.remaining!==LOCOMOTION.sources.find(c=>c.profile===w.profile)?.idleSeconds*2)&&(wasm.nav_idle_stroll_restore_state_version?.()!==1||typeof wasm.nav_intent_restore_idle_approach_state!=='function'||typeof wasm.nav_idle_stroll_restore_state_requests_snapshot!=='function'))throw Error('Rebuild native stroll remaining restoration');
  if(strollers.length&&wasm.spatial_body_count()!==0)throw Error('Native stroll restoration requires a fresh physical world');
  const strolls=strollers.map(worker=>{
    nativeIdleStrollSavedState(state,worker);
    if(contractExpired(worker,state)||state.time>=profileEnd.get(worker.profile)){const home={...worker};cancelIdle(home);Object.assign(home,{status:'returning',path:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false});return {worker,home};}
    restoredStrollGameState(state,worker);return {worker};
  });
  const homeWorkers=[...state.workers.filter(w=>['native-home','pending-home-resources'].includes(w.nativeRouteAdmission)),...strolls.filter(p=>p.home).map(p=>p.home),...farmHomes.map(p=>p.home)];
  if(homeWorkers.length&&(wasm.nav_home_request_version?.()!==1||typeof wasm.nav_intent_restore_home_request!=='function'))throw Error('Rebuild native Home restoration');
  if(homeWorkers.length&&wasm.spatial_body_count()!==0)throw Error('Native Home restoration requires a fresh physical world');
  const homes=homeWorkers.map(worker=>{
    const village=state.villages.find(v=>v.id===worker.villageId),home=village?.entry??village;
    if(!home||!numericId(village.id)||worker.status!=='returning'||worker.taskId||worker.crateId||state.tasks.some(t=>t.workerId===worker.id)||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||worker.path!==null||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false||!['x','z'].every(k=>Number.isFinite(home[k])&&Math.abs(home[k])<2147483000&&Math.abs(worker[k])<2147483000)||!['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>Number.isFinite(worker[k])&&Number.isFinite(Math.fround(worker[k])))||['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]<0))throw Error('Invalid native Home restoration state');
    return worker;
  });
  if(state.workers.some(w=>w.nativeRouteAdmission==='native-delivery'||w.nativeDelivery!==undefined))throw Error('Native delivery restoration requires fresh consequence resource admission');
  const workers=state.workers.filter(w=>['native-action','pending-action-resources'].includes(w.nativeRouteAdmission));
  if(workers.length&&wasm.nav_task_action_restore_version?.()!==1)throw Error('Rebuild native task action restoration');
  const prepared=workers.map(worker=>{const action=copyNativeTaskActionProgress(worker.nativeTaskAction),task=state.tasks.find(t=>t.id===worker.taskId),pending=worker.nativeRouteAdmission==='pending-action-resources';
    if(!task||task.workerId!==worker.id||task.kind!==action.kind||worker.status!==(pending?'waiting-task':'acting')||(pending?worker.path!==null:!Array.isArray(worker.path)||worker.path.length)||worker.actionRemaining!==action.duration-action.elapsed||worker.running!==false||worker.gateWaiting!==false||![worker.x,worker.z,worker.heading].every(Number.isFinite))throw Error('Invalid native action restoration state');
    return {worker,action};});
  for(const {worker,action} of prepared){worker.nativeTaskAction=action;worker.nativeRouteAdmission='pending-action-resources';worker.status='waiting-task';worker.path=null;worker.taskApproach=null;worker.running=false;worker.gateWaiting=false;}
  for(const worker of homes){worker.nativeRouteAdmission='pending-home-resources';worker.running=false;worker.gateWaiting=false;}
  for(const worker of farmArrivals)if(['native-farm-arrival','native-farm-arrival-held'].includes(worker.nativeRouteAdmission))Object.assign(worker,{nativeRouteAdmission:'pending-farm-arrival-resources',running:false,gateWaiting:false});
  for(const {worker,home} of farmHomes)Object.assign(worker,home);
  for(const worker of initialIdles)worker.nativeRouteAdmission='pending-idle-resources';
  for(const {worker,home} of strolls)if(home)Object.assign(worker,home);else worker.nativeRouteAdmission='pending-stroll-resources';
}

export function createSpatialIntentBridge(session,{qualifyFarmFlee=false,qualifyRaidEncounter=false,authorityEpoch=globalThis.crypto.randomUUID(),onNativeWorldResources=null}={}){
  if(onNativeWorldResources!==null&&typeof onNativeWorldResources!=='function')throw TypeError('Invalid native world resource observer');
  if(typeof authorityEpoch!=='string'||!authorityEpoch||authorityEpoch.length>256)
    throw TypeError('Expected an authority epoch for native route handles');
  const wasm=session?.core?.wasm;
  const animalRouteV2=wasm?.nav_animal_route_version?.()>=2;
  for(const name of ['nav_intent_reset','nav_intent_changes_ptr',
    'nav_intent_protocol_version','nav_intent_change_width','nav_intent_set_time',
    'nav_intent_session','nav_intent_transition_sequence','nav_intent_effective_time',
    'nav_intent_control_snapshot','nav_intent_control_snapshot_ptr',
    'nav_intent_route_timing','nav_intent_route_timing_ptr','nav_intent_route_distances_ptr',
    'nav_intent_route_sample','nav_intent_route_sample_ptr',
    'nav_intent_timing_rejection',
    'nav_intent_route_reserve','nav_intent_route_reservation_result_ptr',
    'nav_intent_route_prepare_motion','nav_intent_route_timing_width','nav_intent_route_sample_width',
    'nav_intent_execution_begin','nav_intent_execution_advance','nav_intent_execution_stop',
    'nav_intent_route_execution','nav_intent_route_execution_ptr',
    'nav_intent_residency_pin_revision',
    'spatial_release_chunk','spatial_release_chunks',
    'nav_intent_props_mutation_version',
    'nav_intent_terrain_mutation_version',
    'nav_intent_apply_changes','nav_intent_plan_tasks','nav_intent_results_ptr',
    'nav_intent_restore_assigned_tasks',
    'nav_intent_discard','nav_intent_commit','nav_intent_damaged_structures',
    'nav_intent_damaged_ptr','nav_intent_crop_groups',
    'nav_intent_crop_groups_ptr','nav_intent_crop_members_ptr',
    'nav_intent_find_planting_site','nav_intent_planting_site_ptr',
    'nav_intent_release_planting_site','nav_intent_change_count',
    'nav_intent_change_ptr','nav_intent_clear_changes',
    'nav_intent_route_points','nav_intent_route_ptr',
    'nav_intent_route_progress_input_ptr','nav_intent_route_progress',
    'nav_intent_reconcile_topology','nav_intent_replan_attack_route',
    'spatial_world_route_reason',
    'nav_intent_replan_pending_routes',
    'nav_intent_request_reroute',
    'nav_intent_attack_route_input_ptr','nav_intent_register_attack',
    'nav_intent_plan_retreat','nav_intent_restore_retreat',
    'nav_intent_plan_home','nav_intent_restore_home',
    'nav_intent_cancel_home',
    'nav_intent_register_attack_site',
    'nav_intent_track_wall_opportunities',
    'nav_intent_wall_opportunity_candidates',
    'nav_intent_wall_opportunity_candidates_ptr',
    'nav_intent_reconsider_wall_opportunity',
    'nav_intent_attack_blockers_ptr','nav_intent_attack_reserved_targets_ptr',
    'nav_intent_plan_attack_crop',
    'nav_intent_attack_result_ptr',
    'nav_intent_plan_attack_wall','nav_intent_wall_attack_result_ptr',
    'nav_intent_attack_action_active','nav_intent_restore_attack_action',
    'nav_intent_restore_attack_pending','nav_intent_restore_attack_site',
    'nav_intent_attack_finished',
    'nav_intent_attack_cancel',
    'nav_intent_action_active','nav_intent_finish',
    'nav_intent_actor_planning_calls','nav_intent_retire_actor',
    'nav_intent_routes_ptr',
    'nav_intent_route_point_count'])
    if(typeof wasm?.[name]!=='function')throw TypeError(`Missing ${name}`);
  if(wasm.nav_intent_protocol_version()!==2||wasm.nav_intent_change_width()!==15)
    throw Error('Unsupported native intent protocol; rebuild Wild Engine');
  if(wasm.nav_intent_route_timing_width()!==20||wasm.nav_intent_route_sample_width()!==18)
    throw Error('Unsupported native motion layout; rebuild Wild Engine');
  if(wasm.nav_intent_props_mutation_version()!==1)
    throw Error('Unsupported native prop mutation service; rebuild Wild Engine');
  if(wasm.nav_intent_terrain_mutation_version()!==1)
    throw Error('Unsupported native terrain mutation service; rebuild Wild Engine');
  let raidFlight=null,refuge=null;
  let sequence=0,initialized=false,owningState=null,legacyCropHomes=false,lastIntentSequence=0,restoredWallRepairs=[];
  const controlObservers=new Set();
  // Retention is independent of the event subscription: closing a port or
  // stopping an observer does not prove its device stopped executing work.
  const controlConsumers=new Map();
  let committedWorldBoundary=null,activeAnimalRoute=null,activeAnimalStrike=null,committedCenterRuin=null;
  const nativeWorldBoundary=()=>committedWorldBoundary?.authorityEpoch===epoch()?committedWorldBoundary:null;
  const nativeWorldResourceBoundary=()=>{
    const boundary=nativeWorldBoundary();
    if(boundary&&wasm.spatial_world_resource_snapshot?.()!==1)throw Error('Native world changed outside its committed resource boundary');
    return boundary;
  };
  const pruneDrainedConsumers=()=>{
    for(const [publication] of controlConsumers)if(publication.status?.().drained)controlConsumers.delete(publication);
  };
  const coversGpuConsumers=source=>{
    pruneDrainedConsumers();
    return controlConsumers.size>0&&[...controlConsumers].every(([consumer,owner])=>owner===source&&source.ownsGpuConsumer?.(consumer)===true);
  };
  const epoch=()=>`${authorityEpoch}/${wasm.nav_intent_session()}`;
  // Native counters are instance-local and can repeat in another WASM Worker.
  // Scope every externally visible handle before it crosses an async boundary.
  // This identity is ephemeral transport metadata, never saved game/RNG state.
  const routeHandle=(session,slot,generation)=>Object.freeze({
    authorityEpoch:epoch(),session,slot,generation});
  const closeControlObservers=reason=>{
    for(const observer of [...controlObservers]){
      controlObservers.delete(observer);
      try{observer.onClosed(reason);}catch{}
    }
  };
  const syncBoundaryTime=()=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(wasm.nav_intent_set_time(owningState.elapsed)!==1)
      throw Error('Native intent time regressed; restore into a new session');
  };
  const structuresById=new Map();
  const cropsById=new Map();
  const cropObjects=new Map();
  const apply=rows=>{
    if(!initialized)throw Error('Reset the native intent session first');
    for(let offset=0;offset<rows.length;offset+=maxBatch){
      const batch=rows.slice(offset,offset+maxBatch),ptr=wasm.nav_intent_changes_ptr(batch.length);
      if(!ptr)throw Error('Native intent change allocation failed');
      new Float64Array(wasm.memory.buffer,ptr,batch.length*width).set(batch.flat());
      if(wasm.nav_intent_apply_changes(sequence+1,batch.length)!==1)
        throw Error('Native intent delta was rejected; rebuild from a saved state');
      sequence++;
    }
    return sequence;
  };
  const resetFromState=state=>{
    normalizeNativeIntentRestoration(state,wasm);
    closeControlObservers('native-reset');
    wasm.nav_intent_reset();sequence=0;lastIntentSequence=0;
    shieldCropRequest=null;issuedShieldCropStop=null;
    initialized=true;owningState=state;restoredWallRepairs=captureRestoredWallRepairs(state,epoch());
    try{
      syncBoundaryTime();
      const workers=[...state.workers].sort((a,b)=>a.id.localeCompare(b.id));
      const tasks=[...state.tasks].sort((a,b)=>
        a.created-b.created||a.id.localeCompare(b.id));
      const rows=[...workers.map(worker=>workerRow(worker,state)),
        ...state.plants.filter(plant=>plant.alive).map(plant=>targetRow(plant,state)),
        ...state.plants.filter(plant=>plant.alive).map(cropMetaRow),
        ...state.crates.filter(crate=>!crate.delivered).map(crate=>targetRow(crate,state)),
        ...state.structures.map(structure=>targetRow(structure,state)),
        ...state.structures.map(structure=>structureMetaRow(structure)),
        ...state.structures.filter(item=>item.kind==='center')
          .map(center=>centerAccessRow(center,state)),
        ...tasks.map(task=>taskRow(task))];
      apply(rows);
      // Initial semantic absence grants no route or body permission. A reused
      // core can retain old bodies after nav_intent_reset; never bless those
      // as inactive merely because their new JS row says home.
      raidFlight=null;refuge=null;
      legacyCropHomes=!!wasm.nav_animal_crop_state&&wasm.spatial_body_count()===0&&state.biome!=='desierto'&&!!state.raid?.animals[0]&&
        !state.structures.some(v=>v.gate&&v.status!=='ruined')&&
        !!(nativeCropRouteSubject(state,state.raid.animals[0])||
          wasm.nav_animal_restore_retreat_request&&nativeRetreatSubject(state,state.raid.animals[0]));
      if(wasm.spatial_body_count()===0)for(const worker of workers){
        const entry=inactiveHomeEntry(state,worker,legacyCropHomes,qualifyRaidEncounter);if(!entry)continue;
        if(wasm.nav_home_inactive_restore_version?.()!==1)throw Error('Rebuild native inactive Home restoration');
        if(wasm.nav_intent_restore_home_inactive(numericId(worker.id),entry.x,entry.z)!==1)throw Error('Native inactive Home declaration rejected');
      }
      structuresById.clear();
      cropsById.clear();
      cropObjects.clear();
      for(const structure of state.structures)
        structuresById.set(numericId(structure.id),{...structure});
      for(const crop of state.plants)if(crop.alive){
        cropsById.set(numericId(crop.id),crop.id);
        cropObjects.set(numericId(crop.id),crop);
      }
    }
    catch(error){
      wasm.nav_intent_reset();sequence=0;initialized=false;
      throw error;
    }
    return {sequence,workers:wasm.nav_intent_worker_count(),
      targets:wasm.nav_intent_target_count(),tasks:wasm.nav_intent_task_count()};
  };
  // Call only for committed game events, not every tick or actor position.
  // A moving worker needs an update when a new action is requested.
  const applyEvents=(state,events)=>{
    const rows=[];
    for(const event of events){
      if(event.type==='worker')rows.push(event.remove?
        [0,1,numericId(event.id),0,0,0,0,0,0,0]:
        workerRow(event.entity,state));
      else if(event.type==='target')rows.push(event.remove?
        [0,2,numericId(event.id),0,0,0,0,0,0,0]:
        targetRow(event.entity,state));
      else if(event.type==='structureDamage')
        rows.push(structureMetaRow(event.entity));
      else if(event.type==='task')rows.push(event.remove?
        [0,3,numericId(event.id),0,0,0,0,0,0,0]:
        taskRow(event.entity));
      else throw TypeError(`Unsupported intent event: ${event.type}`);
      if(event.type==='target'&&!event.remove&&
        (event.entity.kind==='wall'||event.entity.kind==='center'))
        rows.push(structureMetaRow(event.entity));
      if(event.type==='target'&&!event.remove&&event.entity.kind==='center')
        rows.push(centerAccessRow(event.entity,state));
      if(event.type==='target'&&!event.remove&&'alive' in event.entity)
        rows.push(cropMetaRow(event.entity));
    }
    try{
      const result=apply(rows);
      for(const event of events){
        if(event.type==='structureDamage'||event.type==='target'){
          const id=numericId(event.remove?event.id:event.entity.id);
          if(event.remove)structuresById.delete(id);
          else if(event.entity.kind==='wall'||event.entity.kind==='center')
            structuresById.set(id,{...event.entity});
        }
        if(event.type==='target'){
          const id=numericId(event.remove?event.id:event.entity.id);
          if(event.remove||'alive' in event.entity&&!event.entity.alive){
            cropsById.delete(id);cropObjects.delete(id);
          }else if('alive' in event.entity){
            cropsById.set(id,event.entity.id);cropObjects.set(id,event.entity);
          }
        }
      }
      return result;
    }
    catch(error){
      // A multi-batch event may have partially reached WASM. JS remains the
      // authority, so rebuild the derived read model before surfacing failure.
      resetFromState(state);
      throw error;
    }
  };
  // Translate only confirmed simulation events. A restored game uses
  // resetFromState(); this incremental projection never owns game rules.
  const applyCommittedEvents=(state,events)=>{
    const changes=[];
    let structures=null,plants=null,crates=null;
    const structureFor=id=>state.structures.at(-1)?.id===id?state.structures.at(-1):
      (structures??=new Map(state.structures.map(item=>[item.id,item]))).get(id);
    const plantFor=id=>state.plants.at(-1)?.id===id?state.plants.at(-1):
      (plants??=new Map(state.plants.filter(item=>item.alive)
        .map(item=>[item.id,item]))).get(id);
    const crateFor=id=>state.crates.at(-1)?.id===id?state.crates.at(-1):
      (crates??=new Map(state.crates.map(item=>[item.id,item]))).get(id);
    for(const event of events){
      if(event.type==='CropPlaced'){
        const entity=plantFor(event.targetId);
        if(entity)changes.push({type:'target',entity});
      }else if(event.type==='CropDestroyed'||event.type==='CropPicked'){
        changes.push({type:'target',remove:true,id:event.targetId});
        if(event.type==='CropPicked'&&event.crateId){
          const crate=crateFor(event.crateId);
          if(crate&&!crate.delivered)changes.push({type:'target',entity:crate});
        }
      }else if(event.type==='CrateDropped'){
        const crate=crateFor(event.targetId);
        if(crate&&!crate.delivered)changes.push({type:'target',entity:crate});
      }else if(event.type==='CrateDelivered')
        changes.push({type:'target',remove:true,id:event.targetId});
      else if(event.type==='PlacementCommitted'&&
        (event.kind==='center'||event.kind==='wall')){
        const entity=structureFor(event.targetId);
        if(entity)changes.push({type:'target',entity});
      }else if(event.type==='WallChainBuilt'){
        const first=numericId(event.targetId),latest=state.structures.slice(-event.count);
        for(let offset=0;offset<event.count;offset++){
          const id=`structure-${first+offset}`;
          const entity=latest[offset]?.id===id?latest[offset]:structureFor(id);
          if(entity)changes.push({type:'target',entity});
        }
      }else if(event.type==='WallRemoved')
        changes.push({type:'target',remove:true,id:event.targetId});
      else if(['StructureHit','StructureRuined','RepairApplied'].includes(event.type)){
        const entity=structureFor(event.targetId);
        if(entity)changes.push({type:'structureDamage',entity});
      }
    }
    if(changes.length)applyEvents(state,changes);
    return changes.length;
  };
  const planTasks=()=>{
    if(!initialized)throw Error('Reset the native intent session first');
    session.actorSectorRevision({worker:true});
    const count=wasm.nav_intent_plan_tasks();
    if(count<0)throw Error(`Native intent planning failed: ${count}`);
    const pointer=wasm.nav_intent_results_ptr();
    const data=Array.from(new Float64Array(wasm.memory.buffer,pointer,count*8));
    return Array.from({length:count},(_,index)=>{
      const at=index*8;
      return {taskId:data[at],workerId:data[at+1]||null,status:data[at+2],
        routeOffset:data[at+3],routeCount:data[at+4],cause:data[at+5],
        approach:{x:data[at+6],z:data[at+7]}};
    });
  };
  const restoreAssignedTasks=state=>{
    if(!initialized)throw Error('Reset the native intent session first');
    const workers=new Map(state.workers.map(worker=>[worker.id,worker]));
    for(const task of state.tasks)if(task.workerId){
      const worker=workers.get(task.workerId);
      if(!worker||worker.taskId!==task.id||worker.centerId!==task.centerId)
        throw Error(`Inconsistent saved task assignment: ${task.id}`);
    }
    session.actorSectorRevision({worker:true});
    const restored=wasm.nav_intent_restore_assigned_tasks();
    if(restored<0)throw Error(`Native assigned-task restoration failed: ${restored}`);
    for(const worker of state.workers)if(worker.nativeRouteAdmission==='pending-resources'||worker.nativeRouteAdmission==='native-task'){
      if(wasm.nav_intent_require_route_resources?.(numericId(worker.id))!==1)throw Error('Native saved resource request could not be restored');
      // A save contains the executed position/phases, never a reusable native
      // route or permission. Re-admission starts from that position on load.
      if(worker.nativeRouteAdmission==='native-task'){worker.nativeRouteAdmission='pending-resources';worker.status='waiting-task';worker.path=null;worker.running=false;worker.gateWaiting=false;worker.taskApproach=null;}
    }
    for(const worker of state.workers)if(worker.nativeRouteAdmission==='pending-action-resources'){
      const action=copyNativeTaskActionProgress(worker.nativeTaskAction);
      if(wasm.nav_intent_restore_task_action(numericId(worker.id),NATIVE_TASK_ACTION_KINDS.indexOf(action.kind),action.duration,action.elapsed,worker.heading,worker.runPhase??0,worker.walkPhase??0,worker.carryPhase??0,worker.runRemaining??0)!==1)throw Error('Native restored action declaration rejected');
    }
    const routed=restored?wasm.nav_intent_replan_pending_routes():0;
    return {restored,routed};
  };
  const pendingTaskRoute=actorId=>{
    if(wasm.nav_intent_task_resource_request_version?.()!==1)throw Error('Rebuild native task resource requests');
    if(wasm.nav_intent_pending_task_route(Number.isSafeInteger(actorId)&&actorId>0?actorId:numericId(actorId))!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_pending_task_route_ptr(),13));
    const count=wasm.nav_intent_pending_task_route_points(a[4],a[5],a[6],a[7]);
    if(count!==a[12]||!Number.isSafeInteger(count)||count<1)throw Error('Invalid native task resource request');
    return Object.freeze({kind:'native-task-route-request',version:1,actorId:a[1],taskId:a[2],targetId:a[3],requestHandle:Object.freeze({kind:'native-task-route-request-handle',authorityEpoch:epoch(),session:a[4],slot:a[5],generation:a[6]}),requestSequence:a[7],requestedAt:a[8],profile:a[9],origin:Object.freeze({x:a[10],z:a[11]}),points:Float32Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_pending_task_route_points_ptr(a[4],a[5],a[6],a[7]),count*2)),authorizedAutonomy:false});
  };
  const taskRequestReference=(a,session)=>copyNativeTaskRequestReference({kind:'native-task-route-request-reference',version:1,actorId:a[0],taskId:a[1],targetId:a[2],requestHandle:{kind:'native-task-route-request-handle',authorityEpoch:epoch(),session,slot:a[3],generation:a[4]},requestSequence:a[5],requestedAt:a[6]});
  const nativeTaskRequestReferences=()=>{
    if(typeof wasm.nav_intent_task_requests_snapshot!=='function')return [];
    const count=wasm.nav_intent_task_requests_snapshot();if(count<0||count>32768)throw Error('Invalid native task request snapshot');
    const rows=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_task_requests_snapshot_ptr(),count*8)),session=wasm.nav_intent_session();
    return Array.from({length:count},(_,i)=>taskRequestReference(rows.slice(i*8,i*8+8),session));
  };
  const nativeTaskStartBinding=actorId=>{
    if(wasm.nav_task_start_binding_version?.()!==1)return null;
    const actor=Number.isSafeInteger(actorId)&&actorId>0?actorId:numericId(actorId);if(wasm.nav_task_start_binding_snapshot(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_start_binding_snapshot_ptr(),54)),session=wasm.nav_intent_session();
    if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native start binding snapshot');
    const ref=(h,ticket)=>({kind:'native-task-start-reference',version:1,actorId:h[1],bodyId:h[2],taskId:a[52],targetId:a[53],requestSequence:h[21],requestedAt:h[22],sourceControlSequence:h[23],endTime:h[11],sourceRequestHandle:{kind:'native-task-route-request-handle',...routeHandle(session,h[20],h[3])},expectedRouteHandle:routeHandle(session,h[20],h[4]),worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:session,ticket,effectiveTime:h[10]}});
    const count=wasm.nav_task_start_binding_gates(actor);if(count<0||count>1024)throw Error('Invalid native start binding gates');
    return copyNativeTaskStartAttestation({reference:ref(a.slice(28,52),a[3]),preparedReference:ref(a.slice(4,28),a[2]),assignmentSequence:a[1],projectionVersion:1,gateIds:Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count))});
  };
  const proposalRoute=row=>{
    const {routeOffset,routeCount}=row,total=wasm.nav_intent_route_point_count();
    if(!Number.isInteger(routeOffset)||!Number.isInteger(routeCount)||routeCount<1||
      routeOffset<0||routeOffset+routeCount>total)
      throw Error('Invalid native task route range');
    const points=new Float32Array(wasm.memory.buffer,
      wasm.nav_intent_routes_ptr()+routeOffset*8,routeCount*2);
    return Array.from({length:routeCount},(_,index)=>
      ({x:points[index*2],z:points[index*2+1]}));
  };
  const getDamaged=kind=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(kind!=='wall'&&kind!=='center')throw TypeError('Unknown structure kind');
    const count=wasm.nav_intent_damaged_structures(kind==='wall'?3:4);
    if(count<0)throw Error('Native damage query failed');
    const data=new Float64Array(wasm.memory.buffer,wasm.nav_intent_damaged_ptr(),count*8);
    return Array.from({length:count},(_,index)=>{
      const offset=index*8,id=data[offset],structure=structuresById.get(id);
      if(!structure)throw Error(`Missing authoritative structure ${id}`);
      const cost=repairCost(structure),numerator=BigInt(cost.n),denominator=BigInt(cost.d);
      return {id:structure.id,hp:data[offset+1],maxHp:data[offset+2],
        damageRatio:data[offset+3],status:structure.status,material:structure.material??null,
        gate:!!structure.gate,
        enclosureId:structure.defenseEnclosureId??null,
        plannedGroupId:structure.defenseGroupId??null,
        cost,paidCoins:Number((numerator+denominator-1n)/denominator),
        revision:data[offset+6],kind};
    });
  };
  const getUnprotectedCropGroups=({includeProtected=false}={})=>{
    if(!initialized)throw Error('Reset the native intent session first');
    const groups=new Map();
    const revisions=[];
    for(const [species,profile] of Object.entries(ANIMAL_SPATIAL_PROFILES)){
      session.actorSectorRevision({worker:false,species});
      const count=wasm.nav_intent_crop_groups(profile.radius);
      if(count<0)throw Error('Native crop group query failed');
      const rows=Array.from(new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_crop_groups_ptr(),count*12));
      const memberCount=rows.reduce((max,_,index)=>index%12===0?
        Math.max(max,rows[index+9]+rows[index+10]):max,0);
      const members=Array.from(new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_crop_members_ptr(),memberCount));
      revisions.push({species,topology:wasm.nav_intent_topology_revision()});
      for(let index=0;index<count;index++){
        const at=index*12,id=rows[at],status=rows[at+8];
        let group=groups.get(id);
        if(!group){
          const ids=members.slice(rows[at+9],rows[at+9]+rows[at+10]);
          const centerIds=[...new Set(ids.map(item=>cropObjects.get(item)?.centerId)
            .filter(Boolean))].sort();
          group={id:`crop:${cropsById.get(id)??id}`,cropIds:ids.map(item=>cropsById.get(item)??item),
            associatedCenterIds:centerIds,
            value:rows[at+1],position:{x:rows[at+2],z:rows[at+3]},
            bounds:{minX:rows[at+4],minZ:rows[at+5],maxX:rows[at+6],maxZ:rows[at+7]},
            protection:'protected',profiles:{},revision:{crops:rows[at+11],topology:revisions}};
          groups.set(id,group);
        }
        group.profiles[species]=status===1?'protected':status===0?'unprotected':'unknown';
        if(status===0)group.protection='unprotected';
        else if(status<0&&group.protection==='protected')group.protection='unknown';
      }
    }
    return [...groups.values()].filter(group=>includeProtected||
      group.protection!=='protected').sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  };
  const findPlantingSite=(centerId,{budget=64,reserve=true}={})=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(!Number.isInteger(budget)||budget<1||budget>4096)
      throw RangeError('Plant search budget must be 1â€“4096');
    const center=structuresById.get(numericId(centerId));
    if(center?.kind!=='center'||center.status!=='intact')
      throw TypeError(`Unknown operational center: ${centerId}`);
    session.actorSectorRevision({worker:true});
    const resident=[...session.stream.loaded().keys()].map(key=>key.split(',').map(Number))
      .filter(([cx,cz])=>Number.isInteger(cx)&&Number.isInteger(cz));
    if(!resident.length)return {status:'unknown',reason:'no-resident-sectors'};
    const bounds=resident.reduce((b,[cx,cz])=>[
      Math.min(b[0],cx*48-24),Math.min(b[1],cz*48-24),
      Math.max(b[2],cx*48+24),Math.max(b[3],cz*48+24)],
    [Infinity,Infinity,-Infinity,-Infinity]);
    const status=wasm.nav_intent_find_planting_site(numericId(centerId),
      ...bounds,budget,reserve?1:0);
    if(status===-2)throw Error('Native planting-site query rejected');
    const row=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_planting_site_ptr(),8));
    return {status:status===1?'found':status===2?'pending':
      status===3?'blocked':status===0?'no-space':'unknown',
      point:status===1||status===-1?{x:row[1],z:row[2]}:null,
      reservationId:row[3]||null,examined:row[4],
      revision:{crops:row[5],topology:row[6]},reason:row[7],bounds};
  };
  const releasePlantingSite=(reservationId,{committed=false}={})=>
    wasm.nav_intent_release_planting_site(reservationId,committed?1:0)===1;
  const readIntentChanges=after=>{
    const count=wasm.nav_intent_change_count();
    if(!count)return [];
    const first=new Float64Array(wasm.memory.buffer,wasm.nav_intent_change_ptr(),15)[8];
    if(after<first-1)throw Error('Native intent control history has a gap');
    const offset=Math.max(0,after-first+1),remaining=count-offset;
    if(remaining<=0)return [];
    const data=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_change_ptr()+offset*15*8,remaining*15));
    // Query only actors with a new assigned route. Empty reads neither scan
    // the cohort nor copy paths; baseline bootstrap remains closed for farm23.
    const farmArrivalBindings=new Map();for(let i=0;i<data.length;i+=15)if(data[i+1]===1){const binding=nativeFarmArrivalRouteBinding(data[i]);if(binding?.assignmentSequence===data[i+8])farmArrivalBindings.set(data[i],binding);}
    const requestsChanged=data.some((value,i)=>i%15===1&&value===6),requestReferences=new Map((requestsChanged?nativeTaskRequestReferences():[]).map(value=>[value.actorId,value])),actionRequestReferences=new Map((requestsChanged?nativeTaskActionRestoreReferences():[]).map(value=>[value.actorId,value])),homeRequestReferences=new Map((requestsChanged?nativeHomeRequestReferences():[]).map(value=>[value.actorId,value])),initialIdleRequestReferences=new Map((requestsChanged?nativeInitialIdleRequestReferences():[]).map(value=>[value.actorId,value])),strollRequestReferences=new Map((requestsChanged?nativeIdleStrollRequestReferences():[]).map(value=>[value.actorId,value])),farmArrivalRequestReferences=new Map((requestsChanged?nativeFarmArrivalRequestReferences():[]).map(value=>[value.actorId,value]));
    const cycleEvents=data.some((value,i)=>i%15===1&&value===7),cycleBindings=new Map((cycleEvents?nativeIdleCycleBindings():[]).map(value=>[value.reference.actorId,value])),cycleNext=new Map([...cycleBindings.keys()].map(actor=>[actor,nativeIdleCycleNextRequest(actor)]));
    const strollEvents=data.some((value,i)=>i%15===1&&value===1),strollBindings=new Map((strollEvents?nativeIdleStrollBindings():[]).map(value=>[value.reference.actorId,value]));
    const types=['','RouteAssigned','RouteInvalidated','RouteReplaced',
      'IntentChanged','RouteCompleted'];
    return Array.from({length:remaining},(_,index)=>{
      const at=index*15;
      if(data[at+14]!==2||data[at+8]!==after+index+1||
         !types[data[at+13]]||!Number.isFinite(data[at+9]))
        throw Error('Invalid native intent transition order or protocol');
      const pendingTaskCancellation=data[at+1]===7&&data[at+13]===4?readNativePendingTaskCancellation(wasm,epoch(),data[at],data[at+8]):null;
      const crop=readIssuedAnimalCrop(data,at);
      const pendingCrop=data[at+1]===6&&data[at+13]===4&&owningState?.raid?.animals.some(animal=>numericId(animal.id)===data[at])?
        readPendingAnimalCrop(false):null;
      const birth=pendingCrop&&raidFlight?.requestSequence===pendingCrop.requestSequence?raidFlight.birth:null;
      const home=homeRequestReferences.get(data[at]);
      const homeFlight=home?.version===2&&home.requestSequence===data[at+8];
      const strollFlightSequence=homeFlight?wasm.nav_home_pending_idle_stroll_flight_source?.(home.actorId,home.requestSequence,home.raidSpawnSequence):0;
      const initialIdleFlightSequence=homeFlight?wasm.nav_home_initial_idle_flight_source?.(home.actorId,home.requestSequence,home.raidSpawnSequence):0;
      const repairFlightSequence=homeFlight?wasm.nav_home_repair_flight_source?.(home.actorId,home.requestSequence,home.raidSpawnSequence):0;
      const stopped=issuedShieldCropStop,shieldCropStop=stopped?.actorId===data[at]&&data[at+13]===2&&data[at+1]===0&&
        stopped.worldBoundary.effectiveTime===data[at+9]&&stopped.slot===data[at+11]&&stopped.generation===data[at+12]?stopped:null;

      const q=encounterExhaustion;
      const exhausted=q?.hit&&q.animal===data[at]&&q.at===data[at+9]&&data[at+13]===2&&data[at+1]===0&&
        q.handle.slot===data[at+11]&&q.handle.generation===data[at+12]?{version:1,worker:q.worker,workerBody:q.workerBody,
          ...encounterWorkerSource(),animal:q.animal,animalBody:q.animalBody,assignment:q.assignment,handle:q.handle,
          hit:q.hit,spawn:raidFlight.event,from:q.from,at:q.at,x:q.x,z:q.z,yaw:q.yaw,phase:q.phase,first:q.first,exit:q.exit}:null;
      const encounterRetreat=q?.confirmed&&pendingCrop?.purpose==='retreat'&&pendingCrop.requestSequence===q.retreatRequest&&
        pendingCrop.actorId===q.animal&&pendingCrop.bodyId===q.animalBody;
      return {...(exhausted?{nativeEncounterExhaustion:exhausted}:{}),
        ...(encounterRetreat?{pendingAnimalCrop:pendingCrop,previousWorkerEncounter:q.hit}:{}),...(strollFlightSequence?{strollFlightSequence}:{}),...(initialIdleFlightSequence?{initialIdleFlightSequence}:{}),...(repairFlightSequence?{repairFlightSequence}:{}),...(shieldCropStop?{nativeShieldCropStop:shieldCropStop,nativeShieldCropPolygon:shieldCropStop.polygonId}:{}),...((pendingCrop?.previousStrike||pendingCrop?.previousShieldCrop||pendingCrop?.purpose==='center'||birth)&&pendingCrop.requestSequence===data[at+8]?
        {pendingAnimalCrop:pendingCrop,...(birth?{raidFlightBirth:birth}:{})}:{}),...(crop?{nativeAnimalCrop:crop}:{}),actorId:data[at],state:data[at+1],taskId:data[at+2]||null,
        targetId:data[at+3]||null,routeHandle:data[at+6]?
          routeHandle(data[at+4],data[at+5],data[at+6]):null,
        ...(pendingTaskCancellation?{pendingTaskCancellation}:{}),
        topologyRevision:data[at+7],sequence:data[at+8],effectiveTime:data[at+9],
        revokedRouteHandle:data[at+12]?
          routeHandle(data[at+10],data[at+11],data[at+12]):null,
        type:types[data[at+13]],protocolVersion:2,authorityEpoch:epoch(),...(farmArrivalBindings.get(data[at])?.assignmentSequence===data[at+8]?{nativeFarmArrival:farmArrivalBindings.get(data[at])}:{}),...(strollBindings.get(data[at])?.assignmentSequence===data[at+8]?{nativeIdleStroll:strollBindings.get(data[at])}:{}),...(cycleBindings.get(data[at])?.cycleSequence===data[at+8]?{idleCycle:cycleBindings.get(data[at])}:{}),...(cycleNext.get(data[at])?.requestSequence===data[at+8]?{idleCycleNext:cycleNext.get(data[at])}:{}),...(data[at+1]===6?{taskRequest:requestReferences.get(data[at])?.requestSequence===data[at+8]?requestReferences.get(data[at]):null,...(actionRequestReferences.get(data[at])?.requestSequence===data[at+8]?{actionRequest:actionRequestReferences.get(data[at])}:{}),...(homeRequestReferences.get(data[at])?.requestSequence===data[at+8]?{homeRequest:homeRequestReferences.get(data[at])}:{}),...(initialIdleRequestReferences.get(data[at])?.requestSequence===data[at+8]?{initialIdleRequest:initialIdleRequestReferences.get(data[at])}:{}),...(strollRequestReferences.get(data[at])?.requestSequence===data[at+8]?{idleStrollRequest:strollRequestReferences.get(data[at])}:{}),...(farmArrivalRequestReferences.get(data[at])?.requestSequence===data[at+8]?{farmArrivalRequest:farmArrivalRequestReferences.get(data[at])}:{})}:{})};
    });
  };
  const nativeCausalClock=()=>{
    if(wasm.nav_intent_clock_snapshot?.()!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_clock_ptr(),8));
    return Object.freeze({protocolVersion:2,clockVersion:1,authorityEpoch:epoch(),nativeSession:a[1],
      clockSequence:a[2],intentSequence:a[3],committedThrough:a[4],rate:a[5],paused:a[6]===1,reanchor:a[7]===1});
  };
  const flushNativeIntentControl=()=>{
    for(const observer of [...controlObservers]){
      try{
        if(observer.authorityEpoch!==epoch())throw Error('Native intent authority epoch changed');
        const changes=readIntentChanges(observer.sequence);
        if(changes.length){observer.sequence=changes.at(-1).sequence;observer.onChanges(changes);}
        const clock=nativeCausalClock();
        if(clock&&observer.onClock&&clock.clockSequence>observer.clockSequence){
          observer.clockSequence=clock.clockSequence;observer.onClock(clock);
        }
      }catch(error){
        controlObservers.delete(observer);
        try{observer.onClosed(error);}catch{}
      }
    }
  };
  const intentChanges=()=>{
    // Publish before the legacy mover drains/coalesces this same native log.
    // Observers hold cursors only; there is no second JS navigation/event log.
    flushNativeIntentControl();
    const changes=readIntentChanges(lastIntentSequence);
    if(!changes.length)return [];
    wasm.nav_intent_clear_changes();
    lastIntentSequence=changes.at(-1).sequence;
    return changes;
  };
  let shieldCropRequest=null,issuedShieldCropStop=null;
  function replanNativeShieldCrop(actorId,nav){
    const stop=issuedShieldCropStop,actor=numericId(actorId);
    if(!stop||stop.actorId!==actor||stop.worldBoundary.authorityEpoch!==epoch()||wasm.nav_animal_stopped_shield_crop(actor)!==1)
      throw Error('Native Shield crop replan lost its stopped source');
    const animal=owningState?.raid?.animals.find(item=>item.id===actorId);
    const target=animal&&raidTarget(owningState,animal.targetId);
    const spell=stop.spell&&owningState.spells.find(item=>item.id===stop.spell.id&&item.remaining>0&&
      item.x===stop.spell.x&&item.z===stop.spell.z&&item.radius===stop.spell.radius);
    const covered=target&&spell&&Math.hypot(spell.x-target.x,spell.z-target.z)<=spell.radius;
    let approach=null,out;
    if(stop.removed){
      if(!nav||!target||spell)return false;
      approach=reachableApproach(animal,target,nav)?.point;
      if(!approach)return false;
      out=wasm.nav_animal_replan_expired_shield_crop(actor,stop.worldBoundary.nativeSession,stop.polygonId,approach.x,approach.z);
    }else if(covered){
      if(!nav||session.shieldPolygonId(spell.id)!==stop.polygonId)return false;
      approach=reachableApproach(animal,target,nav,spell)?.point;
      if(!approach)return false;
      out=wasm.nav_animal_replan_protected_crop(actor,stop.worldBoundary.nativeSession,stop.polygonId,
        spell.x,spell.z,spell.radius,approach.x,approach.z);
    }else out=wasm.nav_animal_replan_shield_crop(actor,stop.worldBoundary.nativeSession,stop.polygonId);
    if(out===0||out===3||out===-4)return false;
    if(out===1&&approach){animal.approach=approach;animal.approachShieldId=spell?.id??null;animal.path=null;}
    if(out!==1)throw Error('Native Shield crop replan rejected: '+out);
    const q=nativeAnimalCropState(actorId);
    if(q.mode!==1||!['x','z','yaw','phase'].every(key=>q[key]===stop[key]))
      throw Error('Shield crop replan lost the stopped pose');
    shieldCropRequest={requestSequence:q.requestSequence,source:{worldBoundary:stop.worldBoundary,polygonId:stop.polygonId,
      ...(stop.replacesRequestSequence?{replacesRequestSequence:stop.replacesRequestSequence}:{}),
      assignmentSequence:stop.assignmentSequence,routeHandle:{authorityEpoch:epoch(),session:stop.worldBoundary.nativeSession,
        slot:stop.slot,generation:stop.generation},routeTicket:stop.routeTicket}};
    return true;
  }
  function readPendingAnimalCrop(baseline=true,recoveredActor=null){
    let request=null;
    for(const animal of owningState?.raid?.animals??[]){
      const p=nativeAnimalCropState(animal.id);
      if(!p||p.actor===recoveredActor||!baseline&&p.mode!==1&&p.mode!==5)continue;
      if(p.mode!==1&&p.mode!==5||request)throw Error('Animal crop requires a fresh prepared graphical admission');
      request={version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),
        ...(p.purpose?{purpose:p.purpose}:{}),actorId:p.actor,bodyId:p.body,targetId:p.target,centerId:p.center,requestSequence:p.requestSequence,
        ...(p.previousStrike?{previousStrike:p.previousStrike}:{}),...(p.restore?{restore:p.restore}:{}),
        ...(p.requestSequence===raidFlight?.requestSequence&&raidFlight.restoredWorkerImpact?{restoredWorkerImpact:raidFlight.restoredWorkerImpact}:{}),
        ...(shieldCropRequest?.requestSequence===p.requestSequence?{previousShieldCrop:shieldCropRequest.source}:{}),radius:p.radius,x:p.x,z:p.z,yaw:p.yaw,phase:p.phase,centerX:p.centerX,centerZ:p.centerZ,targetX:p.targetX,targetZ:p.targetZ};
    }
    return request;
  }
  function readIssuedAnimalCrop(data,at){
    if(data[at+1]===1&&data[at+13]===1){
      const handle=routeHandle(data[at+4],data[at+5],data[at+6]),route=nativeAnimalRouteBinding(handle);
      if(!route||route.assignmentSequence!==data[at+8])return null;
      const last=readNativeRouteSample(handle,route.endTime,true);
      if(!last?.arrived)throw Error('Acquired crop route lost its terminal sample');
      return {kind:26,...route,terminal:{x:last.x,z:last.z,phase:last.phase}};
    }
    if(data[at+1]!==2||data[at+13]!==4||wasm.nav_animal_strike_snapshot?.(data[at])!==1)return null;
    const s=new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),animalRouteV2?25:24);
    if(s[15]!==data[at+9])return null;
    const result={kind:27,...(s[24]===1?{purpose:'center'}:{}),actorId:s[1],bodyId:s[2],targetId:s[3],routeAssignment:s[4],routeTicket:s[5],
      generation:s[6],clip:s[7],duration:s[8],targetX:s[9],targetZ:s[10],x:s[11],z:s[12],phase:s[13],yaw:s[14],
      at:s[15],endTime:s[16],ticket:s[17],session:s[18],attackId:s[19],preparedTicket:s[22],preparedAt:s[23]};
    if(!result.routeAssignment)result.restore=nativeAnimalCropState('animal-'+result.actorId)?.restore;
    return result;
  }

  const nativeIntentControlBaseline=(recoveredWorkerRoute=null)=>{
    syncBoundaryTime();
    const count=wasm.nav_intent_control_snapshot();
    if(count<0)throw Error('Native intent control baseline is incoherent');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_control_snapshot_ptr(),count*6));
    const strolls=nativeIdleStrollBindings(),farmCount=wasm.nav_farm_arrival_route_binding_actors?.()??0,
      homes=nativeHomeRouteBindings();
    if(recoveredWorkerRoute?.version===2){
      const {members,refuge:arrival,ruin,encounter}=copyNativeRecoveryGroup(recoveredWorkerRoute,nativeWorldBoundary());
      if(encounter?.version===3){
        if(count||strolls.length||farmCount||homes.length||!sameRecoveredEncounter(encounter,nativeStationaryEncounterRecovery()))
          throw Error('Held stationary encounter changed before bootstrap');
      }else{
        const single=encounter?nativeEncounterFallRecovery(encounter.version===2?'center':'retreat'):
          ruin?nativeCenterRuinRetreatRecovery():arrival?nativeRefugeCropRecovery(members[0].kind):null;
        const executions=encounter||ruin||arrival?single&&[single.execution]:nativeRaidFlightRecoveryExecutions();
        const rows=members[0].kind===27?0:members.length;
        if(count!==rows||strolls.length||farmCount||homes.length!==members.length-1||!executions||
           arrival&&JSON.stringify(arrival)!==JSON.stringify(single.refuge)||
           ruin&&JSON.stringify(ruin)!==JSON.stringify(single.ruin)||
           encounter&&JSON.stringify(encounter)!==JSON.stringify(single.encounter)||
           members.some(({kind,proof},i)=>!nativeWorkerRouteRecoveryProfile(kind).sameAttestation(executions[i].binding,proof)))
          throw Error('Held raid routes changed before bootstrap');
      }
    }else if(recoveredWorkerRoute!==null){
      const profile=nativeWorkerRouteRecoveryProfile(recoveredWorkerRoute.kind);
      const crop=profile.kind===26,strike=profile.kind===27;
      if(count!==(strike?0:1)||strolls.length+farmCount+homes.length!==(crop||strike?0:1))
        throw Error('Unexpected active routes at recovery');
      const execution=strike?nativeAnimalCropStrikeExecution('animal-'+recoveredWorkerRoute.proof?.reference?.actorId):
        crop?nativeAnimalCropRouteExecution('animal-'+data[0]):profile.kind===18?nativeHomeRouteExecution(data[0]):
        profile.kind===22?nativeIdleStrollExecution(data[0]):nativeFarmArrivalRouteExecution(data[0]);
      const endpoint=profile.kind===18&&qualifyRaidEncounter&&owningState?.workers.length===1&&
        woundedHomeExecutionAtEndpoint(owningState,owningState.workers[0],execution);
      if(!execution||execution.arrived&&!endpoint||execution.binding.gateIds.length>profile.maxGates||
         profile.kind===18&&execution.binding.reference.sourceRequest?.raidSpawnSequence||
         !profile.sameAttestation(execution.binding,recoveredWorkerRoute.proof))
        throw Error('Held native route changed before bootstrap');
    }else{
      if(strolls.length)throw Error('Native Idle strolls require prepared graphical admission');
      if(farmCount!==0)throw Error('Native farm arrival routes require prepared graphical admission');
    }
    if((wasm.nav_farm_arrival_held_actors?.()??0)!==0)throw Error('Native held farm arrival bodies require prepared graphical admission');
    const clock=nativeCausalClock();
    if(clock&&(clock.intentSequence!==wasm.nav_intent_transition_sequence()||clock.committedThrough!==wasm.nav_intent_effective_time()))
      throw Error('Commit the native causal clock before attaching a new draw consumer');
    const pendingTaskRequests=nativeTaskRequestReferences(),pendingActionRequests=nativeTaskActionRestoreReferences(),pendingHomeRequests=nativeHomeRequestReferences(),pendingInitialIdleRequests=nativeInitialIdleRequestReferences(),pendingIdleStrollRequests=nativeIdleStrollRequestReferences(),pendingFarmArrivalRequests=nativeFarmArrivalRequestReferences(),nativeIdleCycles=nativeIdleCycleBindings(),cycleActors=new Set(nativeIdleCycles.map(value=>value.reference.actorId)),pendingIdleCycleRequests=nativeIdleCycles.map(value=>nativeIdleCycleNextRequest(value.reference.actorId)).filter(Boolean),nativeInitialIdleBodies=nativeInitialIdleBodyBindings().filter(value=>!cycleActors.has(value.reference.actorId)),nativeStartedRoutes=Array.from({length:count},(_,i)=>nativeTaskStartBinding(data[i*6])).filter(Boolean),nativeActions=nativeTaskActionBindings(),nativeHomes=recoveredWorkerRoute?.kind===18||recoveredWorkerRoute?.version===2?[]:homes,nativeSettlements=nativeTaskSettlementBindings(),nativeConsequences=Array.from({length:count},(_,i)=>nativeTaskConsequenceBinding(data[i*6])).filter(Boolean);
    const recoveryKind=recoveredWorkerRoute?.kind;
    const recoveredAnimal=recoveredWorkerRoute?.version===2?recoveredWorkerRoute.members.find(member=>member.kind===26||member.kind===27)?.proof.reference.actorId??null:
      recoveryKind===26||recoveryKind===27?recoveredWorkerRoute.proof.reference.actorId:null;
    const pendingAnimalCrop=readPendingAnimalCrop(true,recoveredAnimal);
    return {...(recoveredWorkerRoute?{recoveredWorkerRoute}:{}),...(pendingAnimalCrop?{pendingAnimalCrop}:{}),type:'IntentBaseline',protocolVersion:2,authorityEpoch:epoch(),...(restoredWallRepairs.length?{restoredWallRepairs}:{}),worldBoundary:nativeWorldBoundary(),...(clock?{clock}:{}),
      sequence:wasm.nav_intent_transition_sequence(),effectiveTime:wasm.nav_intent_effective_time(),...(pendingTaskRequests.length?{pendingTaskRequests}:{}),...(pendingActionRequests.length?{pendingActionRequests}:{}),...(pendingHomeRequests.length?{pendingHomeRequests}:{}),...(pendingInitialIdleRequests.length?{pendingInitialIdleRequests}:{}),...(pendingIdleStrollRequests.length?{pendingIdleStrollRequests}:{}),...(pendingFarmArrivalRequests.length?{pendingFarmArrivalRequests}:{}),...(nativeInitialIdleBodies.length?{nativeInitialIdleBodies}:{}),...(nativeIdleCycles.length?{nativeIdleCycles}:{}),...(pendingIdleCycleRequests.length?{pendingIdleCycleRequests}:{}),...(nativeStartedRoutes.length?{nativeStartedRoutes}:{}),...(nativeActions.length?{nativeActions}:{}),...(nativeConsequences.length?{nativeConsequences}:{}),...(nativeSettlements.length?{nativeSettlements}:{}),...(nativeHomes.length?{nativeHomes}:{}),
      routes:Array.from({length:count},(_,index)=>{
        const at=index*6;
        return {actorId:data[at],routeHandle:routeHandle(data[at+1],data[at+2],data[at+3]),
          assignmentSequence:data[at+4],startTime:data[at+5]};
      })};
  };
  const observeNativeIntentControl=({onBaseline,onChanges,onClosed=()=>{},onClock=null,gpuConsumer=null,recoveredWorkerRoute=null}={})=>{
    if(typeof onBaseline!=='function'||typeof onChanges!=='function'||typeof onClosed!=='function'||onClock!==null&&typeof onClock!=='function')
      throw TypeError('Expected native intent control observers');
    if(gpuConsumer!==null&&(!gpuConsumer.publication||typeof gpuConsumer.publication!=='object'||
       !gpuConsumer.owner||typeof gpuConsumer.owner!=='object'))throw TypeError('Expected native GPU consumer ownership');
    const baseline=nativeIntentControlBaseline(recoveredWorkerRoute),observer={
      authorityEpoch:baseline.authorityEpoch,sequence:baseline.sequence,clockSequence:baseline.clock?.clockSequence??0,onChanges,onClosed,onClock};
    controlObservers.add(observer);
    try{onBaseline(baseline);}catch(error){controlObservers.delete(observer);throw error;}
    if(gpuConsumer){pruneDrainedConsumers();controlConsumers.set(gpuConsumer.publication,gpuConsumer.owner);}
    return ()=>controlObservers.delete(observer);
  };
  const routePoints=handle=>{
    if(handle?.authorityEpoch!==epoch())return null;
    const count=wasm.nav_intent_route_points(handle.session,handle.slot,handle.generation);
    if(count<0)return null;
    // Movement may retain these points while WASM grows its memory. Copy once
    // when an action changes; ordinary ticks keep using the same JS view.
    return Float32Array.from(new Float32Array(wasm.memory.buffer,
      wasm.nav_intent_route_ptr(handle.session,handle.slot,handle.generation),count*2));
  };
  // Session-local provenance for the two actual bodies in the admitted spawn.
  // Resetting or replacing the Game, raid or actor invalidates this declaration.
  const nativeRaidFlightMember=(state,animal)=>{
    const f=raidFlight;
    if(!f||state!==owningState||state.raid!==f.raid||state.raid?.animals.length!==1||animal!==f.animal||
       state.workers.length!==1||state.workers[0]!==f.worker||animal.magicDown||animal.magicStunUntil>state.elapsed)return null;
    const w=f.worker;
    if(encounterRecoveryCurrent(state,w))return w;
    if(w.status!=='fleeing'||w.incapacitated||w.recovery||w.recoveryExitRemaining||w.fallRemaining||w.taskId||w.crateId||w.raidReturn)return null;
    if(w.nativeRouteAdmission==='pending-farm-flight-stop'){
      const motion=nativeFarmArrivalRouteBinding(w.id);
      return motion?.assignmentSequence===f.farmSequence&&motion.reference.bodyId===f.workerBody?w:null;
    }
    if(w.nativeRouteAdmission==='pending-idle-flight-stop'){
      const motion=nativeIdleStrollBinding(w.id);
      const held=motion?null:nativeIdleStrollHeldExecution(w.id);
      return (motion??held)?.assignmentSequence===f.strollSequence&&(motion?.reference.bodyId??held?.bodyId)===f.workerBody?w:null;
    }
    if(w.nativeRouteAdmission==='pending-task-flight-stop'){
      const motion=nativeTaskStartBinding(w.id),held=motion?null:nativeTaskCancellationSource(w.id);
      return (motion?.assignmentSequence??(held?.phase===25?held.sourceSequence:null))===f.taskSequence&&
        (motion?.reference.bodyId??held?.bodyId)===f.workerBody?w:null;
    }
    const h=w.nativeRouteAdmission==='pending-raid-flight-resources'?nativeHomeRequestReference(w.id):
      w.nativeRouteAdmission==='native-home'?nativeHomeRouteBinding(w.id)?.reference.sourceRequest:null;
    return h?.raidSpawnSequence===f.event&&h.bodyId===f.workerBody?w:null;
  };
  function declareRaidFlightPair(state,animal,worker,event,body,center,select){
    if(!qualifyFarmFlee||state!==owningState||!state.raid?.daytime||state.raid.animals[0]!==animal||state.workers[0]!==worker||
       animal.species!=='warthog'||!Number.isSafeInteger(event)||event<=0||!Number.isSafeInteger(body)||body<=0)return false;
    const farm=nativeFarmArrivalRouteBinding(worker.id),home=nativeHomeRequestReference(worker.id),
      stroll=worker.nativeRouteAdmission==='pending-idle-flight-stop'?nativeIdleStrollBinding(worker.id):null,
      task=worker.nativeRouteAdmission==='pending-task-flight-stop'?nativeTaskStartBinding(worker.id):null;
    const motion=farm??stroll??task,workerBody=motion?.reference.bodyId??home?.bodyId;
    const birth={workerActor:numericId(worker.id),workerBody,sourceSequence:motion?.assignmentSequence??home?.requestSequence,
      farmTicket:farm?.reference.worldBoundary.ticket??null,...(stroll?{strollTicket:stroll.reference.worldBoundary.ticket}:{}),
      ...(task?{taskTicket:task.reference.worldBoundary.ticket}:{}),raidSpawnSequence:event};
    const centerAttack=nativeCenterAttackCohort(state,worker);
    const pair={raid:state.raid,animal,worker,event,animalBody:body,workerBody,farmSequence:farm?.assignmentSequence,
      strollSequence:stroll?.assignmentSequence,taskSequence:task?.assignmentSequence,birth,center:numericId(center.id),centerAttack};
    raidFlight=pair;
    let selected;
    try{
      const result=nativeRaidFlightMember(state,animal)&&select();
      if(centerAttack){
        if(result?.target!==center||result.native||result.shieldId||!requestNativeCenterBirth(state,animal,result,body,pair))return null;
        pair.requestSequence=nativeAnimalCropState(animal.id)?.requestSequence;
      }else if(!result?.native||result.shieldId||!result.target?.alive)return null;
      const q=nativeAnimalCropState(animal.id);
      if(q?.mode!==1||q.body!==body||q.target!==numericId(result.target.id)||pair.requestSequence!==q.requestSequence)throw Error('Raid spawn lost its pending crop body');
      selected=centerAttack?{...result,approach:{point:result.approach.point,path:null}}:result;
      return selected;
    }finally{if(!selected)raidFlight=null;}
  }
  function flightCandidateClear(session,ticket){
    const f=raidFlight;
    if(!f)return true;


    if(encounterExhaustion?.confirmed){
      const a=nativeAnimalCropState(f.animal.id),q=encounterRetreatOwner(owningState,f.animal,a);
      if(q&&a?.retreat)return wasm.nav_encounter_retreat_proposal(session,ticket,q.animal,q.hit)===1;
    }
    if(f.restoredWorkerImpact){
      const a=nativeAnimalCropState(f.animal.id);
      return a?.mode===1&&a.purpose==='center'&&a.requestSequence===f.requestSequence&&a.body===f.animalBody&&
        nativeRaidFlightMember(owningState,f.animal)===f.worker;
    }
    if(!nativeRaidFlightMember(owningState,f.animal))return false;
    const verdict=wasm.nav_flight_crop_proposal_clear(session,ticket,numericId(f.worker.id),numericId(f.animal.id),f.event);
    return verdict===1;
  }

  let encounterImpact=null,encounterExhaustion=null;
  function centerPermitSource(state,animal,request){
    const f=raidFlight;
    if(!qualifyRaidEncounter||!f?.centerAttack||state!==owningState||state.raid!==f.raid||f.animal!==animal||
      f.worker.nativeRouteAdmission!=='native-home'||f.worker.hits!==0)return null;
    const home=nativeHomeRouteExecution(f.worker.id);
    if(!home||home.arrived||home.executedThrough!==state.elapsed||home.binding.gateIds.length)return null;
    const w=numericId(f.worker.id),a=numericId(animal.id),assignment=home.binding.assignmentSequence;
    if(wasm.nav_center_flight_animal_ready(w,a,request,f.event)!==0||
       wasm.nav_center_encounter_home(w,a,assignment,request,f.event)!==1)return null;
    return {w,a,assignment,event:f.event};
  }
  function inspectCenterEncounter(session,ticket){
    const snapshot=wasm.nav_center_encounter_witness(session,ticket);
    if(snapshot!==1)return null;
    const [worker,workerBody,,,,animal,animalBody,,,at,reach,collision,issued,id]=
      Float64Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_center_encounter_witness_ptr(),14));
    if(session!==id||ticket!==issued||reach<=at||worker===animal||workerBody===animalBody||collision!==0&&collision<reach)
      throw Error('Encounter witness misidentified its continuous source');
    return {reach,collision};
  }
  function stageCenterEncounter(p,initial){
    const session=wasm.nav_intent_session();
    const status=wasm.nav_center_encounter_stage(p.a,session,initial.requestSequence,p.w,p.assignment,p.event);
    if(status!==1)return status;
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Accepted encounter proof lost its ticket');
    const ticket=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),2)[1];
    if(!inspectCenterEncounter(session,ticket))throw Error('Prepared permit became unreadable');
    return status;
  }
  function prepareCenterEncounterStep(state,at){
    const f=raidFlight;
    if(!qualifyRaidEncounter||!f||encounterImpact?.consumed||state.raid!==f.raid)return;
    const w=numericId(f.worker.id),a=numericId(f.animal.id);
    if(wasm.nav_center_encounter_active(a)!==1)return;
    const impact=encounterImpact?.at===at?1:0;
    if(wasm.nav_center_encounter_step(wasm.nav_intent_session(),w,a,f.event,at,impact)!==1)
      throw Error('Encounter step proof was rejected');
  }
  let restoredEncounter=null;
  function encounterWorkerSource(){
    return raidFlight.restoredWorkerImpact?{restoredHit:encounterImpact.hit}:{workerAssignment:encounterImpact.assignment};
  }
  function encounterCheckpoint(captureCorridor=false){
    const state=owningState,worker=restoredEncounter?.worker??raidFlight?.worker;
    const q=encounterExhaustion,first=encounterImpact,f=raidFlight;
    const marker=q?.confirmed?{version:1,workerId:q.worker,animalId:q.animal,hit:q.hit}:
      restoredEncounter?.marker??(first?.consumed?{version:3,workerId:first.worker,animalId:first.animal,hit:first.hit,spawn:f.event}:null);
    if(!marker||state.structures.some(s=>s.gate&&s.status!=='ruined'))return null;
    if(marker.version===3){
      if(!f||state.raid!==f.raid||worker?.hits!==1||!encounterRecoveryCurrent(state,worker)||!(worker.fallRemaining>0)||worker.recovery)return null;
      const route=nativeAnimalCropState(f.animal.id);
      if(route?.mode!==2||route.purpose!=='center'||route.executedThrough!==state.elapsed||route.arrived||
         route.body!==f.animalBody||route.x!==f.animal.x||route.z!==f.animal.z||route.phase!==f.animal.motionPhase||route.yaw!==f.animal.heading)
        return null;
      if(!captureCorridor)return marker;
      const binding=nativeAnimalRouteBinding(f.animal.id);
      const sample=binding&&sampleNativeRoute(binding.routeHandle,state.elapsed);
      if(binding?.bodyId!==route.body||!sample||sample.x!==route.x||sample.z!==route.z||sample.phase!==route.phase)
        throw Error('Native encounter checkpoint lost its executed approach');
      // The live path still supplies the heading of the next presentation trace.
      const approachPath=remainingEncounterPath(binding.routeHandle,sample.firstRemainingPoint);
      const saved={...marker,approachPath};
      nativeEncounterCheckpointActors(state,saved);
      return saved;
    }
    if(worker?.nativeRouteAdmission==='native-home'&&worker.incapacitated&&!state.raid){
      const execution=nativeHomeRouteExecution(worker.id),reference=execution?.binding.reference,request=reference?.sourceRequest;
      if(!request||request.recoveryHit!==marker.hit||execution.arrived||execution.executedThrough!==state.elapsed||
         execution.binding.gateIds.length||execution.yaw!==worker.heading||worker.path!==null||worker.gateWaiting!==false||
         worker.taskId||worker.crateId||worker.raidReturn||
         !['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>execution[key]===worker[key])||
         !woundedHomeSourceCurrent(state,worker,request,state.elapsed-reference.worldBoundary.effectiveTime))return null;
      if(!captureCorridor)return marker;
      const path=remainingEncounterPath(reference.expectedRouteHandle,execution.firstRemainingPoint);
      return {version:2,workerId:marker.workerId,animalId:marker.animalId,hit:marker.hit,
        home:{...request.home,exitRemaining:worker.recoveryExitRemaining,path}};
    }
    if(!encounterRecoveryCurrent(state,worker))return null;
    if(state.raid){
      const animal=state.raid.animals[0],route=nativeAnimalCropState(animal.id);
      if(route?.mode!==2||route.arrived||!encounterRetreatOwner(state,animal,route)||route.executedThrough!==state.elapsed)return null;
    }
    try{nativeEncounterCheckpointActors(state,marker);}catch{return null;}
    return marker;
  }
  function remainingEncounterPath(handle,first){
    const points=routePoints(handle);
    if(!points||!Number.isSafeInteger(first)||first<0||first*2>=points.length)
      throw Error('Native encounter checkpoint lost its executed corridor');
    const path=[];
    for(let i=first*2;i<points.length;i+=2)path.push({x:points[i],z:points[i+1]});
    return path;
  }
  function encounterCheckpointBlocked(){
    const worker=restoredEncounter?.worker??raidFlight?.worker;
    return !!(encounterImpact?.consumed||restoredEncounter)&&!encounterCheckpoint()&&!(worker&&nativeWorkerHomeInactive(worker.id));
  }
  function restoreEncounterWorker(state,marker,body){
    if(!qualifyRaidEncounter||state!==owningState||restoredEncounter)throw Error('Native encounter restoration unavailable');
    const source=nativeEncounterCheckpointActors(state,marker),{worker,home}=source;
    syncBoundaryTime();
    session.actorSectorRevision({worker:true});
    if(wasm.nav_restore_encounter_worker?.(wasm.nav_intent_session(),marker.workerId,body,marker.hit,
       worker.x,worker.z,home?worker.heading:worker.downHeading,worker.runPhase,worker.walkPhase,worker.carryPhase,
       worker.runRemaining)!==1)throw Error('Native encounter worker restoration rejected');
    if(home){
      const pointer=wasm.nav_intent_attack_route_input_ptr(home.path.length);
      if(!pointer)throw Error('Saved encounter Home path input unavailable');
      const points=new Float32Array(wasm.memory.buffer,pointer,home.path.length*2);
      home.path.forEach(({x,z},i)=>{points[i*2]=x;points[i*2+1]=z;});
      const status=wasm.nav_intent_restore_encounter_home?.(wasm.nav_intent_session(),marker.workerId,marker.hit,
        home.villageId,home.x,home.z,home.exitRemaining,home.path.length);
      if(status!==1)throw Error('Saved encounter Home failed its native corridor proof: '+status);
      Object.assign(worker,{nativeRouteAdmission:'pending-home-resources',running:false});
    }
    restoredEncounter={...source,workerBody:body};
    return true;
  }
  function restoreEncounterApproach(state,animal,body){
    const source=restoredEncounter,{marker,worker,target}=source??{};
    if(state!==owningState||marker?.version!==3||source.animal!==animal||encounterImpact||raidFlight||
       !Number.isSafeInteger(body)||body<=0)return false;
    const workerBody=source.workerBody;
    writeAttackRouteInput(animal,marker.approachPath);
    const status=wasm.nav_restore_encounter_approach?.(wasm.nav_intent_session(),marker.workerId,marker.hit,marker.spawn,
      marker.animalId,numericId(target.id),body,marker.approachPath.length,animal.approach.x,animal.approach.z,
      animal.status==='entering'?1:0,animal.heading,animal.motionPhase);
    if(status!==1)return false;
    const pending=nativeAnimalCropState(animal.id);
    if(pending?.mode!==1||pending.purpose!=='center'||pending.body!==body||pending.target!==numericId(target.id))
      throw Error('Restored encounter lost its stationary approach source');
    const impact=state.events.find(event=>event.id==='event-'+marker.hit);
    const restoredWorkerImpact={version:1,actorId:marker.workerId,bodyId:workerBody,spawn:marker.spawn,hit:marker.hit,at:impact.simulationTime};
    raidFlight={raid:state.raid,animal,worker,event:marker.spawn,animalBody:body,workerBody,centerAttack:true,
      requestSequence:pending.requestSequence,restoredWorkerImpact};
    encounterImpact={worker:marker.workerId,animal:marker.animalId,body:workerBody,consumed:true,hit:marker.hit,
      result:{x:worker.x,z:worker.z}};
    return true;
  }
  function encounterApproachPending(){
    const f=raidFlight;
    return !!f?.restoredWorkerImpact&&owningState.raid===f.raid&&nativeAnimalCropState(f.animal.id)?.mode===1&&
      !encounterExhaustion?.confirmed;
  }
  function encounterRecoveryCurrent(state,w){
    if(restoredEncounter&&state===owningState&&w===restoredEncounter.worker){
      const fallingBeforeSecond=restoredEncounter.marker.version===3&&!encounterExhaustion?.confirmed;
      const matches=fallingBeforeSecond?w.status==='fleeing'&&!w.incapacitated&&w.hits===1:
        w.status==='incapacitated'&&w.incapacitated&&w.hits===2;
      return matches&&(w.fallRemaining>0||w.recovery)&&
        wasm.nav_restored_encounter_worker_current(restoredEncounter.marker.workerId,restoredEncounter.marker.hit)===1;
    }
    const f=raidFlight;

    if(encounterExhaustion?.confirmed&&w===f?.worker&&state===owningState&&(state.raid===f.raid||state.raid===null)&&
       w.status==='incapacitated'&&w.incapacitated&&w.hits===2&&(w.fallRemaining>0||w.recovery)&&
       w.x===encounterImpact.result.x&&w.z===encounterImpact.result.z&&wasm.nav_home_encounter_impact_current(encounterImpact.worker,encounterImpact.animal,f.event)===1)return true;
    return !!encounterImpact?.consumed&&f&&state===owningState&&state.raid===f.raid&&w===f.worker&&
      w.status==='fleeing'&&!w.incapacitated&&w.hits===1&&(w.fallRemaining>0||w.recovery)&&
      w.x===encounterImpact.result.x&&w.z===encounterImpact.result.z&&wasm.nav_home_encounter_impact_current(encounterImpact.worker,encounterImpact.animal,f.event)===1;
  }
  function finishEncounterRecovery(state,w,prepared){
    if(restoredEncounter?.worker===w){
      const {marker}=restoredEncounter,dest=prepared.destination;
      if(wasm.nav_finish_restored_encounter_worker(wasm.nav_intent_session(),marker.workerId,marker.hit,
         state.elapsed,w.x,w.z,dest.x,dest.z,dest.heading)!==1)throw Error('Restored encounter recovery final shift failed');
      return;
    }
    const q=encounterImpact,dest=prepared.destination;
    const status=wasm.nav_worker_finish_encounter_recovery(wasm.nav_intent_session(),q.worker,q.animal,raidFlight.event,
      state.elapsed,w.x,w.z,dest.x,dest.z,dest.heading);
    if(status!==1)throw Error('Native recovery final shift failed: '+status);
    q.result={x:dest.x,z:dest.z};
    q.recovered=true;
  }
  function requestEncounterHome(state,worker){
    const hit=encounterExhaustion?.confirmed&&raidFlight?.worker===worker?encounterExhaustion.hit:
      restoredEncounter?.worker===worker?restoredEncounter.marker.hit:null;
    if(!hit||state!==owningState||state.raid||state.workers.length!==1||
       worker.status!=='incapacitated'||!worker.incapacitated||worker.hits!==2||
       worker.recovery||worker.fallRemaining||worker.recoveryExitRemaining!==RECOVERY_EXIT_SECONDS||
       worker.taskId||worker.crateId||worker.nativeRouteAdmission||
       state.structures.some(structure=>structure.gate&&structure.status!=='ruined'))return;
    const village=state.villages.find(v=>v.id===worker.villageId),home=village?.entry??village;
    if(!home)throw Error('Recovered encounter worker has no refuge');
    session.actorSectorRevision({worker:true});
    const actor=numericId(worker.id);
    const result=wasm.nav_intent_encounter_home_request?.(wasm.nav_intent_session(),actor,hit,numericId(village.id),
      home.x,home.z,worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining);
    if(result!==1)throw Error('Native encounter Home source rejected: '+result);
    Object.assign(worker,{nativeRouteAdmission:'pending-home-resources',path:null,running:false,gateWaiting:false});
    return true;
  }
  function prepareHomeEncounterImpact(state,at,nav){
    const f=raidFlight;
    if(!qualifyRaidEncounter||encounterImpact||!f?.centerAttack||f.worker.nativeRouteAdmission!=='native-home'||f.worker.hits!==0)return;
    const w=f.worker,a=f.animal,home=nativeHomeRouteExecution(w.id),crop=nativeAnimalCropState(a.id),binding=nativeAnimalRouteBinding(a.id);
    if(!home||crop?.mode!==2||!binding||home.executedThrough!==state.elapsed||crop.executedThrough!==state.elapsed)return;
    if(a.magicDown||a.magicStunUntil>at||!a.hitsRemaining)return;
    const pair=a.id+':'+w.id,raid=state.raid;
    const contact=classifyWorkerEncounter(a,w,raid.encounterPositions??{},(raid.encounterContacts??raid.encounters??[]).includes(pair),(raid.encounterHits??[]).includes(pair));
    if(!contact?.eligible)return;
    const plan=prepareWorkerEncounter({elapsed:at,rng:state.rng},nav,a,w,contact.collision);
    if(!plan.hit||plan.hit.incapacitated)return;
    const result=plan.hit.push??{x:w.x,z:w.z,distance:0};
    const worker=numericId(w.id),animal=numericId(a.id),id=wasm.nav_intent_session(),sequence=home.binding.assignmentSequence;
    if(w.x!==home.x||w.z!==home.z||a.x!==crop.x||a.z!==crop.z)throw Error('Impact preview used unconfirmed Game poses');
    if(wasm.nav_home_encounter_impact_prepare(id,worker,animal,sequence,binding.assignmentSequence,f.event,
       at,w.x,w.z,result.x,result.z)!==1)throw Error('Native impact preview lost its exact source');
    encounterImpact={worker,animal,body:home.bodyId,from:state.elapsed,at,x:w.x,z:w.z,result,collision:contact.collision,
      handle:home.binding.reference.expectedRouteHandle,assignment:sequence,workerBefore:w.hits,afterRng:plan.rng,afterBudget:a.hitsRemaining-1};
  }
  function consumeHomeEncounterImpact(state,w,a,{collision,pushed,presentation}){
    if(!qualifyRaidEncounter)return null;
    const q=encounterImpact,f=raidFlight,id=wasm.nav_intent_session();
    if(!q||!f||q.consumed||w!==f.worker||a!==f.animal||state.elapsed!==q.at||
      collision!==q.collision||pushed!==q.result.distance||w.x!==q.result.x||w.z!==q.result.z||
      state.rng!==q.afterRng||a.hitsRemaining!==q.afterBudget||w.hits!==q.workerBefore+1||
      q.x!==presentation.x||q.z!==presentation.z||presentation.elapsed!==q.at)throw Error('Game impact differs from its prepared source');
    const home=nativeHomeRouteExecution(w.id),clock=nativeCausalClock();
    if(!home||home.x!==q.x||home.z!==q.z||home.executedThrough!==q.at||clock.committedThrough!==q.from)
      throw Error('WASM moved Home before the encounter or published the next clock');
    if(wasm.nav_home_encounter_impact_consume(id,q.worker,q.animal,f.event,q.at,q.x,q.z,w.x,w.z)!==1||
       nativeRouteExecution(q.handle)!==null)throw Error('Impact did not retire its exact route');
    q.consumed=true;q.hit=state.sequence;delete w.nativeRouteAdmission;
    return {version:1,home:home.binding,at:q.at,event:state.sequence,x:w.x,z:w.z,heading:w.downHeading};
  }



  function acquireEncounterRetreat(candidate,hold){
    const cut=encounterExhaustion,prepared=cut?.graphicalDraft,r=prepared?.reference,b=r?.worldBoundary;
    if(candidate.proposal!==prepared||!cut?.confirmed||owningState.elapsed!==cut.at||hold.effectiveTime!==cut.from||
       hold.clockSequence!==cut.draftClock.clockSequence||hold.sequence!==cut.draftClock.intent||
       !sameNativeAnimalCropReference(hold.preparedAnimalCropRouteTemplate,r)||!sameNativeWorldBoundary(hold.preparedWorldBoundary,b)||
       !Number.isSafeInteger(hold.preparedFrameSequence)||hold.preparedFrameSequence<1)
      throw Error('Encounter acquisition requires the exact held packet');
    const [sid,origin]=[b.nativeSession,b.ticket],actor=r.actorId,request=r.requestSequence;
    if(wasm.nav_animal_route_proposal_stage(actor,sid,request)!==1||wasm.nav_intent_barrier_proposal_ticket()!==1)
      throw Error('Encounter could not stage the acquired corridor');
    const read=(ptr,n)=>Array.from(new Float64Array(wasm.memory.buffer,ptr,n));
    const ticket=read(wasm.nav_intent_barrier_proposal_ticket_ptr(),6);
    const h=read(wasm.nav_animal_route_proposal_header_ptr(),24);
    const rows=Float64Array.from(read(wasm.nav_animal_route_proposal_rows_ptr(),h[19]*16));
    const worldBoundary=copyNativeWorldBoundary({...b,ticket:ticket[1],effectiveTime:ticket[3]});
    const actual=copyNativeAnimalCropProposal({...prepared,worldBoundary,
      reference:{...r,worldBoundary,sourceControlSequence:ticket[2],endTime:h[11]},rows,startTime:h[10],endTime:h[11]},26);
    const reference=actual.reference;
    if(ticket[0]!==sid||ticket[5]!==26||ticket[3]!==cut.at||h[1]!==actor||h[2]!==r.bodyId||
       h[4]!==r.generation||h[20]!==r.slot||h[21]!==request||h[22]!==cut.at||
       !nativeAnimalCropSuccessor(reference,r)||!nativeMotionPresentationMatches(prepared,actual,[])||
       wasm.nav_encounter_retreat_commit_draft(sid,ticket[1],origin,actor,cut.hit)!==1)
      throw Error('Encounter acquired something other than its held corridor');
    committedWorldBoundary=worldBoundary;
    if(beginNativeRouteExecution().status!=='started')throw Error('Encounter Retreat did not start');
    const acquired=nativeAnimalRouteBinding(routeHandle(sid,r.slot,r.generation));
    if(!acquired||acquired.bodyId!==r.bodyId||acquired.assignmentSequence!==request+1||
       !sameNativeWorldBoundary(acquired.worldBoundary,worldBoundary)||!sameNativeWorldBoundary(acquired.preparedWorldBoundary,b))
      throw Error('Encounter lost its prepared identity or committed twice');
    const binding=copyNativeAnimalCropAttestation({version:1,reference,preparedReference:r,assignmentSequence:acquired.assignmentSequence},26);
    activeAnimalRoute=binding;
    const clock=commitNativeCausalClock({rate:nativeCausalClock().rate,paused:false});
    if(clock.status!=='committed'||clock.clock.clockSequence!==cut.draftClock.clockSequence+2||
       clock.clock.intentSequence!==binding.assignmentSequence||clock.clock.committedThrough!==cut.at)
      throw Error('Encounter GO lacks its exact native watermark');
    const {workerFall:w}=candidate;
    const actualWorker=owningState.workers.find(item=>item.id===w.id);
    if(!actualWorker?.incapacitated||actualWorker.hits!==2||actualWorker.recovery||
       actualWorker.fallRemaining!==w.remaining||actualWorker.x!==w.x||actualWorker.z!==w.z||
       actualWorker.downHeading!==w.heading||owningState.elapsed!==w.at)
      throw Error('Encounter GO differs from the prepared Fall');
    const resources={version:1,kind:26,phase:'committed',worldBoundary,nativeAnimalCropRouteBinding:binding,
      presentation:captureNativeRoutePresentation(routeHandle(sid,r.slot,r.generation))};
    return {binding,worldBoundary,resources,hit:cut.hit,workerFall:w};
  }
  function prepareEncounterRetreat(state,at,nav,span){
    prepareEncounterExhaustion(state,at,nav);
    const cut=encounterExhaustion,flight=raidFlight,worker=encounterImpact;
    if(!cut?.graphicalDraft||cut.fact||cut.from!==state.elapsed||cut.at!==at)return null;
    const falling=state.workers.find(w=>numericId(w.id)===worker.worker);
    if(!falling||!(falling.fallRemaining>span)||falling.recovery||falling.recoveryExitRemaining||falling.incapacitated||
       !(span>0&&span<=.02)||state.elapsed+span!==at)
      throw Error('Encounter draft lacks its continuing Fall');
    const from=falling.fallRemaining;
    const workerFall={id:falling.id,body:worker.body,fromTime:state.elapsed,at,span,
      x:falling.x,z:falling.z,heading:falling.downHeading,from,remaining:from-span};
    return {proposal:cut.graphicalDraft,workerFall,source:{version:1,at:cut.at,initialClock:cut.draftClock.clockSequence,intent:cut.draftClock.intent,
      approach:activeAnimalRoute,reference:cut.graphicalDraft.reference,worker:worker.worker,workerBody:worker.body,
      ...encounterWorkerSource(),spawn:flight.event}};
  }
  function prepareEncounterExhaustion(state,at,nav){
    const f=raidFlight,q=encounterImpact;
    if(!qualifyRaidEncounter||encounterExhaustion||!q?.consumed||!f?.centerAttack||state!==owningState||state.raid!==f.raid)return;
    const w=f.worker,a=f.animal,raid=f.raid;
    if(w.hits!==1||!w.fallRemaining||w.incapacitated||a.hitsRemaining!==1||a.magicDown||a.magicStunUntil>at||a.status==='attacking')return;
    const pair=a.id+':'+w.id;
    const contact=classifyWorkerEncounter(a,w,raid.encounterPositions??{},(raid.encounterContacts??[]).includes(pair),(raid.encounterHits??[]).includes(pair));
    if(!contact?.eligible)return;
    const plan=prepareWorkerEncounter({elapsed:at,rng:state.rng},nav,a,w,contact.collision);
    if(!plan.hit)return;
    if(!plan.hit.incapacitated||plan.hit.push||plan.hit.fall!==null)throw Error('Exhaustion must retain the original fall and body');
    const crop=nativeAnimalCropState(a.id),binding=nativeAnimalRouteBinding(a.id),exit=a.exit??a.spawn,session=wasm.nav_intent_session();
    if(crop?.mode!==2||!binding||crop.arrived||crop.executedThrough!==state.elapsed||
       crop.x!==a.x||crop.z!==a.z||crop.phase!==a.motionPhase||crop.yaw!==a.heading)throw Error('Exhaustion preview has another approach pose');
    const sequence=binding.assignmentSequence;
    if(wasm.nav_encounter_exhaust_prepare(session,q.worker,q.animal,f.event,sequence,at,a.x,a.z,a.heading,a.motionPhase,exit.x,exit.z)!==1)
      throw Error('Exhaustion preview lost its exact source');
    encounterExhaustion={from:state.elapsed,at,worker:q.worker,workerBody:q.body,animal:q.animal,animalBody:crop.body,
      assignment:sequence,handle:binding.routeHandle,exit:{x:exit.x,z:exit.z},collision:contact.collision,
      x:a.x,z:a.z,yaw:a.heading,phase:a.motionPhase,fall:w.fallRemaining,rng:plan.rng};

    const clock=nativeCausalClock();
    if(wasm.nav_encounter_retreat_draft(session,q.animal,f.event,at)!==1||wasm.nav_intent_barrier_proposal_ticket()===1||
       nativeAnimalRouteBinding(a.id)?.assignmentSequence!==sequence||nativeCausalClock().committedThrough!==clock.committedThrough)
      throw Error('Retreat draft changed its verified approach or clock');
    const read=(name,n)=>Array.from(new Float64Array(wasm.memory.buffer,wasm[name](),n));
    const [draftSession,ticket,intent,time,clockSequence,end]=read('nav_encounter_retreat_draft_boundary',6);
    const h=read('nav_encounter_retreat_draft_header',24);
    const rows=read('nav_encounter_retreat_draft_rows',h[19]*16);
    const worldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:epoch(),nativeSession:draftSession,ticket,effectiveTime:time});
    const reference={version:1,kind:26,purpose:'retreat',worldBoundary,sourceControlSequence:h[23],actorId:h[1],bodyId:h[2],
      targetId:null,centerId:null,centerX:null,centerZ:null,targetX:exit.x,targetZ:exit.z,slot:h[20],generation:h[4],requestSequence:h[21],
      radius:h[7],x:h[8],z:h[9],phase:rows[4],yaw:rows[5],endTime:h[11]};
    if(h[10]!==time||h[22]!==end||draftSession!==session||intent!==clock.intentSequence||clockSequence!==clock.clockSequence||
       h[1]!==q.animal||h[2]!==crop.body||reference.requestSequence!==intent+2||reference.sourceControlSequence!==intent+2||
       time!==state.elapsed||end!==at)throw Error('Retreat draft does not name the exact substep');
    encounterExhaustion.graphicalDraft=copyNativeAnimalCropProposal({kind:'native-animal-crop-route-proposal',version:1,worldBoundary,reference,authorizedAutonomy:false,
      startTime:time,endTime:h[11],radius:h[7],profile:h[5],rowWidth:16,rows:Float64Array.from(rows),gates:[],motionMode:'animal',motionFlags:0},26);
    encounterExhaustion.draftClock={intent,clockSequence};
  }
  function consumeEncounterExhaustion(state,w,a,hit,{collision,pushed,presentation}){
    const f=raidFlight,q=encounterExhaustion,first=encounterImpact;
    if(!q)return;
    if(q.hit||state.elapsed!==q.at||w!==f.worker||a!==f.animal||a.hitsRemaining!==0||w.hits!==2||!w.incapacitated||
       w.fallRemaining!==q.fall||w.x!==first.result.x||w.z!==first.result.z||presentation.x!==w.x||presentation.z!==w.z||
       presentation.elapsed!==q.at||collision!==q.collision||pushed!==0||state.rng!==q.rng)throw Error('Game exhaustion differed from its preflight');
    const crop=nativeAnimalCropState(a.id),clock=nativeCausalClock(),id=wasm.nav_intent_session();
    if(!crop||crop.x!==q.x||crop.z!==q.z||crop.phase!==q.phase||crop.executedThrough!==q.at||clock.committedThrough!==q.from)
      throw Error('Native approach moved ahead of the exhaustion');
    if(wasm.nav_encounter_exhaust_consume(id,q.worker,q.animal,f.event,q.assignment,q.at,hit)!==1||
       nativeRouteExecution(q.handle)!==null||nativeAnimalCropState(a.id)!==null)
      throw Error('Exhaustion did not revoke its exact approach');
    const ptr=wasm.nav_encounter_exhaust_pose(id,q.animal,hit);
    if(!ptr)
      throw Error('The encounter first step lost its native witness');
    const [x,z,distance,phase,yaw]=new Float64Array(wasm.memory.buffer,ptr,5);
    if(![x,z,distance,phase,yaw].every(Number.isFinite)||distance<=0||Math.abs(distance-(q.at-q.from)*3.8)>1e-10||
       Math.abs(phase-q.phase-(q.at-q.from))>1e-10)throw Error('The encounter first step has the wrong timing');
    q.first={x,z,yaw,phase,distance};q.hit=hit;
    a.x=x;a.z=z;a.heading=yaw;a.motionPhase=phase;
  }

  function observeRetreatEncounter(state,w,a,sequence,hit){
    const q=encounterExhaustion,f=raidFlight;
    if(!q)return;
    if(q.fact||q.at!==state.elapsed||w!==f.worker||a!==f.animal)throw Error('Encounter fact differs from its prepared substep');
    q.fact={sequence,...hit};
    q.poseAtImpact=[a.x,a.z,a.heading,a.motionPhase];
  }
  function hasRetreatEncounter(state,a){
    const q=encounterExhaustion,f=raidFlight;
    return !!q?.fact&&!q.confirmed&&state===owningState&&state.elapsed===q.at&&state.raid===f.raid&&a===f.animal;
  }
  function applyRetreatEncounter(state,a){
    if(!hasRetreatEncounter(state,a))throw Error('Missing exact encounter fact');
    const q=encounterExhaustion,retreat=state.events.at(-1),worker=raidFlight.worker;
    const previous=[q.x,q.z,q.yaw,q.phase],before=[a.x,a.z,a.heading,a.motionPhase];
    if(retreat?.type!=='AnimalRetreating'||retreat.targetId!==a.id||retreat.simulationTime!==q.at||
       previous.some((value,index)=>q.poseAtImpact[index]!==value||before[index]!==value))
      throw Error('Retreat first step ran before both Game facts');
    q.poseAtRetreatEvent=before;
    consumeEncounterExhaustion(state,worker,a,q.fact.sequence,q.fact);
    confirmEncounterExhaustion(state,'event-'+q.fact.sequence);
  }
  function confirmEncounterExhaustion(state,id){
    const q=encounterExhaustion,f=raidFlight;
    if(!q||!q.hit)return;
    const fact=state.events.find(e=>e.id===id);
    if(q.confirmed||id!=='event-'+q.hit||fact?.type!=='WorkerIncapacitated'||fact.targetId!==f.worker.id||
       fact.animalId!==f.animal.id||fact.simulationTime!==q.at||fact.pushed!==0)throw Error('Exhaustion has no matching Game fact');
    q.confirmed=true;
  }
  function encounterRetreatOwner(state,animal,native){
    if(restoredEncounter?.marker.version===1&&restoredEncounter.animal===animal&&animal&&state===owningState&&state.raid?.animals[0]===animal){
      const {worker,exit}=restoredEncounter;
      return native?.retreat&&native.actor===restoredEncounter.marker.animalId&&
        native.targetX===exit.x&&native.targetZ===exit.z&&worker.incapacitated&&worker.hits===2&&
        animal.status==='retreating'&&!animal.targetId&&!animal.reservation&&!animal.hitsRemaining?restoredEncounter:null;
    }
    const f=raidFlight,q=encounterExhaustion;
    if(!q?.confirmed||state!==owningState||state.raid!==f?.raid||animal!==f.animal||
       animal.hitsRemaining!==0||animal.magicDown||animal.magicStunUntil>state.elapsed||
       !f.worker.incapacitated||f.worker.hits!==2||state.workers.length!==1||state.workers[0]!==f.worker||
       (animal.exit??animal.spawn).x!==q.exit.x||(animal.exit??animal.spawn).z!==q.exit.z)return null;
    if(!native)return animal.x===q.first.x&&animal.z===q.first.z&&animal.heading===q.first.yaw&&animal.motionPhase===q.first.phase?q:null;
    return animal.status==='retreating'&&!animal.targetId&&!animal.reservation&&native.retreat&&native.actor===q.animal&&native.body===q.animalBody&&
       native.targetX===q.exit.x&&native.targetZ===q.exit.z?q:null;
  }
  function requestEncounterRetreat(state,animal){
    const q=encounterRetreatOwner(state,animal,null);if(!q)return 'unsupported';
    session.actorSectorRevision({worker:false,species:animal.species});
    const status=wasm.nav_encounter_retreat_request(wasm.nav_intent_session(),q.animal,q.hit,q.exit.x,q.exit.z);
    if(status===0||status===3)return status===0?'blocked':'unknown';
    const route=nativeAnimalCropState(animal.id);
    if(status!==1||route?.mode!==1||!route.retreat||route.body!==q.animalBody||route.x!==q.first.x||route.z!==q.first.z||route.yaw!==q.first.yaw||route.phase!==q.first.phase)
      throw Error('Retreat request lost its exact stopped body '+JSON.stringify({status,route}));
    q.retreatRequest=route.requestSequence;
    return 'pending';
  }
  function verifyEncounterBoundary(state){
    if(encounterExhaustion?.at===state.elapsed&&!encounterExhaustion.confirmed)throw Error('Prepared exhaustion escaped its Game event');
    if(encounterImpact&&!encounterImpact.consumed&&encounterImpact.at===state.elapsed)throw Error('Prepared impact escaped the Game decision');
  }
  function nativeCenterFlightAnimalReady(state,animal,requestSequence){
    const worker=nativeRaidFlightMember(state,animal);
    if(!worker||worker.nativeRouteAdmission!=='native-home')return true;
    const check=wasm.nav_center_flight_animal_ready;

    const verdict=check?.(numericId(worker.id),numericId(animal.id),requestSequence,raidFlight.event);
    return !check||verdict===1||verdict===0&&raidFlight.centerAttack&&centerPermitSource(state,animal,requestSequence);
  }
  const requestNativeAnimalCropRoute=(state,animal,bodyId)=>{
    if(state!==owningState||!Number.isSafeInteger(bodyId)||bodyId<1||!wasm.nav_animal_route_request)return false;
    const source=nativeCropRouteSubject(state,animal,nativeRaidFlightMember(state,animal));
    if(!source||source.purpose==='center'&&!animalRouteV2||!['entering','walking'].includes(animal.status)||!Number.isFinite(animal.x)||!Number.isFinite(animal.z))return false;
    syncBoundaryTime();
    return wasm.nav_animal_route_request(numericId(animal.id),bodyId,numericId(source.center.id),
      animal.status==='entering'?1:0,animal.heading??0,animal.motionPhase??0)===1;
  };
  const requestRestoredAnimalStrike=(state,animal,bodyId)=>{
    if(state!==owningState||!wasm.nav_animal_strike_restore_request||!Number.isSafeInteger(bodyId)||bodyId<1)return false;
    const subject=nativeCropRouteSubject(state,animal),saved=savedRaidStrike(animal);
    if(!subject||subject.purpose||!saved||saved.attackId>=state.sequence||
       !Number.isFinite(animal.heading)||!Number.isFinite(animal.motionPhase))return false;
    syncBoundaryTime();
    return wasm.nav_animal_strike_restore_request(numericId(animal.id),wasm.nav_intent_session(),bodyId,numericId(subject.center.id),
      saved.attackId,saved.clip,saved.duration,saved.remaining,animal.motionPhase,animal.heading)===1;
  };
  const finishedAnimalStrike=(state,animal,retreat)=>{
    if(state!==owningState||!animal?.hitApplied||animal.status!=='walking'||
       (retreat?animal.hitsRemaining!==0:!(animal.hitsRemaining>0))||animal.species!=='warthog'||state.raid?.animals.length!==1||
       state.raid.animals[0]!==animal||animal.magicDown||(animal.magicStunUntil??0)>state.elapsed||
       !state.workers.every(w=>w.status==='home'&&!w.raidReturn&&!w.nativeRouteAdmission))return null;
    const center=animalRouteV2&&nativeCenterAttackCohort(state);
    if(state.biome!=='sabana'&&!center||
       wasm.nav_animal_finished_strike_snapshot?.(numericId(animal.id))!==1)return null;
    const [version,nativeSession,actor,body,attackId,x,z,radius,phase,yaw,at,polygon,target]=
      new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),wasm.nav_animal_repeat_protected_strike?13:11);
    const stop=issuedShieldCropStop;
    const border=!retreat&&!center&&polygon>0&&stop?.actorId===actor&&stop.polygonId===polygon&&
      animal.approachShieldId===stop.spell?.id&&numericId(animal.targetId)===target&&
      Math.fround(animal.approach?.x)===x&&Math.fround(animal.approach?.z)===z;
    const covered=border&&session.shieldPolygonId(stop.spell.id)===polygon&&
      !!nativeCropRouteSubject(state,animal,null,{mode:1,shieldContact:stop.spell,shieldPolygon:polygon});
    const crop=border&&raidTarget(state,animal.targetId);
    const finishedInShield=e=>stop.expiredSuccessor?.attackId===attackId&&e.type==='AnimalLogicalHit'&&
      e.presentation?.shield?.id===stop.spell.id&&['x','z','radius'].every(k=>e.presentation.shield[k]===stop.spell[k]);
    const expired=!!wasm.nav_animal_reapproach_expired_crop&&crop?.alive&&
      state.raid.reservations[animal.reservation]===animal.id&&!session.shieldPolygonId(stop.spell.id)&&
      !state.spells.some(s=>s.kind==='shield'&&(s.id===stop.spell.id||s.remaining>0&&Math.hypot(s.x-crop.x,s.z-crop.z)<=s.radius))&&
      state.events.some(e=>e.attackId===animal.attackId&&e.targetId===crop.id&&e.simulationTime===at&&
        (e.type==='AnimalLogicalMiss'&&e.reason==='shield-expired'||finishedInShield(e)));
    if(!covered&&!expired&&(center&&!retreat?nativeCropRouteSubject(state,animal)?.purpose!=='center':animal.targetId||animal.reservation))return null;
    if(version!==1||nativeSession!==wasm.nav_intent_session()||actor!==numericId(animal.id)||
       animal.attackId!=='attack-'+attackId||animal.x!==x||animal.z!==z||animal.heading!==yaw||
       animal.motionPhase!==phase||animal.radius!==radius||state.elapsed<at)return null;
    return {body,attackId,phase,...(covered||expired?{shieldPolygon:polygon,shieldExpired:expired}:{}),...(center?{purpose:'center'}:{})};
  };
  const nativeFinishedAnimalCrop=(state,animal)=>finishedAnimalStrike(state,animal,false);
  const nativeFinishedAnimalRetreat=(state,animal)=>finishedAnimalStrike(state,animal,true);
  const requestNativeProtectedSuccessor=(state,animal,source,nav)=>{
    const current=nativeFinishedAnimalCrop(state,animal);
    if(!current?.shieldPolygon||source?.shieldPolygon!==current.shieldPolygon||source.shieldExpired!==current.shieldExpired||
       source.body!==current.body||source.attackId!==current.attackId)return false;
    session.actorSectorRevision({worker:false,species:animal.species});
    const proof=[numericId(animal.id),current.attackId,numericId(animal.targetId),current.shieldPolygon];
    if(!current.shieldExpired)return wasm.nav_animal_repeat_protected_strike(...proof)===1;
    const target=raidTarget(state,animal.targetId);
    const approach=reachableApproach(animal,target,nav)?.point;
    if(!approach||wasm.nav_animal_reapproach_expired_crop(...proof,approach.x,approach.z)!==1)return false;
    animal.approach=approach;animal.approachShieldId=null;animal.path=null;
    animal.destinationId=approach.id;animal.pathVersion=nav.version;
    return true;
  };
  const requestNativeCenterSuccessor=(state,animal,source)=>{
    const finished=nativeFinishedAnimalCrop(state,animal);
    if(finished?.purpose!=='center'||source?.attackId!==finished.attackId||source.body!==finished.body)return false;
    session.actorSectorRevision({worker:false,species:animal.species});
    return wasm.nav_animal_plan_finished_center(numericId(animal.id),finished.attackId,numericId(animal.targetId),
      animal.approach.x,animal.approach.z)===1;
  };
  const requestNativeRetreat=(state,animal)=>{
    const finished=nativeFinishedAnimalRetreat(state,animal),exit=animal.exit??animal.spawn;
    if(!finished||animal.hitsRemaining!==0||!Number.isFinite(exit?.x)||!Number.isFinite(exit?.z))return 'unsupported';
    session.actorSectorRevision({worker:false,species:animal.species});
    const result=wasm.nav_animal_plan_finished_retreat(numericId(animal.id),finished.attackId,exit.x,exit.z);
    if(result===0||result===3)return result===3?'unknown':'blocked';
    if(result!==1)throw Error('Native retreat lost its finished strike');
    return 'pending';
  };
  const requestRestoredAnimalRetreat=(state,animal,body,encounter=null)=>{
    if(state!==owningState||!wasm.nav_animal_restore_retreat_request||
       !Number.isFinite(animal.heading)||!Number.isFinite(animal.motionPhase))return false;
    const exit=encounter?nativeEncounterCheckpointActors(state,encounter).exit:nativeRetreatSubject(state,animal);
    if(!exit)return false;
    syncBoundaryTime();
    session.actorSectorRevision({worker:false,species:animal.species});
    return wasm.nav_animal_restore_retreat_request(numericId(animal.id),wasm.nav_intent_session(),body,
      exit.x,exit.z,animal.motionPhase,animal.heading)===1;
  };
  const finishNativeRetreat=(animal,native)=>{
    if(!native.retreat||native.mode!==2||!native.arrived||wasm.nav_intent_actor(native.actor)!==1)return false;
    const row=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const binding=nativeAnimalRouteBinding(routeHandle(row[4],row[5],row[6]));
    return binding?.purpose==='retreat'&&binding.bodyId===native.body&&
      wasm.nav_animal_finish_retreat(numericId(animal.id),binding.assignmentSequence)===1;
  };
  const nativeAnimalCropState=actorId=>{
    const actor=numericId(actorId),mode=wasm.nav_animal_crop_state?.(actor)??0;
    if(mode===0)return null;
    if(mode<1||mode>5)throw Error('Native crop route lost its reserved source');
    const h=new Float64Array(wasm.memory.buffer,wasm.nav_animal_crop_state_ptr(),
      wasm.nav_animal_strike_restore_request?29:wasm.nav_animal_replan_protected_crop?24:animalRouteV2?23:wasm.nav_animal_plan_finished_crop?22:20);
    if(h[0]!==1||h[1]!==mode||h[2]!==actor)throw Error('Native crop state has another owner');
    let strike=null;
    if(mode===3){
      if(wasm.nav_animal_strike_snapshot(actor)!==1)throw Error('Native crop action lost its strike');
      const a=new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),24);
      if(a[1]!==actor||a[2]!==h[3]||a[3]!==h[4]||a[21]!==h[16])throw Error('Native strike changed its physical source');
      strike={ticket:a[17],attackId:a[19],endTime:a[16],duration:a[8],at:a[15],clip:a[7],yaw:a[14]};
    }
    const retreat=h[4]===0&&h[5]===0;
    const purpose=retreat?'retreat':h[22]===1?'center':undefined;
    const stop=issuedShieldCropStop;
    const shieldPolygon=h[23]||0;
    const shieldContact=stop?.actorId===actor&&(mode===4||stop.polygonId===shieldPolygon)?stop.spell:null;
    const shieldExpired=mode===3&&stop?.expiredStrike?.ticket===strike.ticket&&stop.expiredStrike.attackId===strike.attackId&&
      stop.polygonId===shieldPolygon&&stop.actorId===actor;
    const restore=h[24]>0?{attackId:h[24],clip:h[25],duration:h[26],remaining:h[27],requestedAt:h[28]}:null;
    return {mode,actor,purpose,shieldContact,shieldPolygon,shieldExpired,...(retreat?{retreat:true}:{}),body:h[3],target:h[4]||null,center:h[5]||null,centerX:retreat?null:h[6],centerZ:retreat?null:h[7],radius:h[8],strike,...(restore?{restore}:{}),
      x:h[9],z:h[10],yaw:h[11],phase:h[12],arrived:h[13]===1,running:h[14]===1,speed:h[15],
      executedThrough:h[16],targetX:h[17],targetZ:h[18],requestSequence:h[19],...(h[20]>0?{previousStrike:{attackId:h[20],ticket:h[21]}}:{})};
  };
  function recoveredCenterCurrent(reference,animal,live,flightWorker=null){
    const target=nativeCropRouteSubject(owningState,animal,flightWorker,live)?.target;
    return target?.kind==='center'&&target.status==='intact'&&target.id==='structure-'+reference.targetId&&
      target.x===reference.targetX&&target.z===reference.targetZ&&
      live?.center===reference.centerId&&live.centerX===target.x&&live.centerZ===target.z&&
      live.targetX===target.x&&live.targetZ===target.z;
  }
  function nativeAnimalCropRouteExecution(actorId,{sharedCut=false,flightWorker=null}={}){
    const proof=activeAnimalRoute,r=proof?.reference;
    if(!r||actorId!=='animal-'+r.actorId||
       !(sharedCut?nativeRecoveryCovers(nativeWorldBoundary(),r.worldBoundary):sameNativeWorldBoundary(r.worldBoundary,nativeWorldBoundary())))return null;
    const animal=owningState?.raid?.animals.find(row=>row.id===actorId);
    const live=animal&&nativeAnimalCropState(actorId),binding=live&&nativeAnimalRouteBinding(actorId);
    const exit=r.purpose==='retreat'?(nativeRetreatSubject(owningState,animal)??encounterRetreatOwner(owningState,animal,live)?.exit):null;
    const expected=r.purpose==='retreat'?exit?.x===r.targetX&&exit.z===r.targetZ:
      ['entering','walking'].includes(animal?.status)&&(r.purpose==='center'?
        recoveredCenterCurrent(r,animal,live,flightWorker):animal.targetId==='plant-'+r.targetId);
    if(animal?.species!=='warthog'||!expected||animal.magicDown||live?.mode!==2||live.arrived||
       live.executedThrough!==owningState.elapsed||live.executedThrough>=r.endTime||
       live.purpose!==r.purpose||live.body!==r.bodyId||live.target!==r.targetId||live.requestSequence!==r.requestSequence||
       live.x!==animal.x||live.z!==animal.z||live.phase!==animal.motionPhase||live.yaw!==animal.heading||
       binding?.assignmentSequence!==proof.assignmentSequence||binding.routeHandle.slot!==r.slot||
       binding.routeHandle.generation!==r.generation||binding.bodyId!==r.bodyId||
       !sameNativeWorldBoundary(binding.worldBoundary,r.worldBoundary)||
       !sameNativeWorldBoundary(binding.preparedWorldBoundary,proof.preparedReference.worldBoundary))return null;
    const end=readNativeRouteSample(binding.routeHandle,r.endTime,true);
    if(!end?.arrived)return null;
    return {kind:'native-animal-crop-route-execution',actorId:r.actorId,bodyId:r.bodyId,arrived:false,
      executedThrough:live.executedThrough,x:live.x,z:live.z,yaw:live.yaw,phase:live.phase,
      binding:{...proof,gateIds:[],terminal:{x:end.x,z:end.z,phase:end.phase}}};
  }
  function nativeEncounterFallRecovery(purpose){
    const game=owningState,f=raidFlight,q=encounterExhaustion,first=encounterImpact;
    if(!f||!first?.consumed||game.raid!==f.raid||!encounterRecoveryCurrent(game,f.worker)||
       !(f.worker.fallRemaining>0)||f.worker.recovery||f.worker.recoveryExitRemaining)return null;
    const approach=purpose==='center';
    if(approach?!!q:f.worker.hits!==2||!q?.confirmed||q.at>game.elapsed)return null;
    const execution=nativeAnimalCropRouteExecution(f.animal.id,{flightWorker:approach?f.worker:null});
    if(execution?.binding.reference.purpose!==purpose||
       !approach&&execution.binding.reference.worldBoundary.effectiveTime!==q.at)return null;
    const {x,z,downHeading:heading,fallRemaining:remaining}=f.worker;
    const encounter={version:approach?2:1,workerId:first.worker,workerBody:first.body,hit:approach?first.hit:q.hit,
      x,z,heading,remaining};
    if(approach){
      const impactAt=f.restoredWorkerImpact?.at??first.at;
      if(!Number.isFinite(impactAt)||impactAt>game.elapsed)return null;
      Object.assign(encounter,{spawn:f.event,impactAt,...(first.assignment===undefined?{}:{workerAssignment:first.assignment})});
    }
    return {execution,encounter};
  }
  function nativeStationaryEncounterRecovery(){
    const state=owningState;
    if(!qualifyRaidEncounter||!state||state.raid||state.workers.length!==1)return null;
    const worker=state.workers[0];
    const home=worker.nativeRouteAdmission==='pending-home-resources'?nativeHomeRequestReference(worker.id):null;
    let marker,workerBody;
    if(home){
      const q=encounterExhaustion;
      marker=q?.confirmed&&raidFlight?.worker===worker?{version:1,workerId:q.worker,animalId:q.animal,hit:q.hit}:
        restoredEncounter?.worker===worker?restoredEncounter.marker:null;
      workerBody=restoredEncounter?.workerBody??encounterImpact?.body;
      const refuge=state.villages.find(v=>v.id===worker.villageId),destination=refuge?.entry??refuge;
      if(!marker||home.actorId!==marker.workerId||home.bodyId!==workerBody||home.recoveryHit!==marker.hit||
         (home.recoveryExit??RECOVERY_EXIT_SECONDS)!==RECOVERY_EXIT_SECONDS||!woundedHomeSourceCurrent(state,worker,home,0)||
         worker.status!=='incapacitated'||worker.running!==false||worker.gateWaiting!==false||worker.heading!==home.pose.yaw||
         worker.taskId||worker.crateId||worker.path!==null||worker.raidReturn||
         !['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===home.pose[key])||
         !destination||numericId(refuge.id)!==home.home.villageId||destination.x!==home.home.x||destination.z!==home.home.z||
         state.structures.some(s=>s.gate&&s.status!=='ruined'))return null;
    }else{
      if(worker.nativeRouteAdmission||!encounterRecoveryCurrent(state,worker)||worker.recoveryExitRemaining)return null;
      marker=encounterCheckpoint();workerBody=restoredEncounter?.workerBody??encounterImpact?.body;
    }
    if(marker?.version!==1||!Number.isSafeInteger(workerBody)||workerBody<1)return null;
    const {workerId,animalId,hit}=marker;
    const fact=state.events.find(event=>event.id==='event-'+hit&&event.type==='WorkerIncapacitated'&&event.targetId===worker.id&&event.animalId==='animal-'+animalId);
    if(!fact)return null;
    const ended=state.events.find(event=>event.type==='RaidEnded'&&event.simulationTime>=fact.simulationTime);
    if(!ended||ended.simulationTime>state.elapsed)return null;
    return copyRecoveredEncounterPose({version:3,workerId,workerBody,animalId,profile:worker.profile,hit,
      impactAt:fact.simulationTime,raidEnded:numericId(ended.id),endedAt:ended.simulationTime,at:state.elapsed,
      x:worker.x,z:worker.z,heading:home?worker.heading:worker.downHeading,remaining:worker.fallRemaining??0,getUp:worker.recovery??null,
      ...(home?{home}:{})});
  }
  function nativeRaidFlightRecoveryExecutions(){
    const game=owningState,animal=game?.raid?.animals[0],worker=animal&&nativeRaidFlightMember(game,animal);
    if(!worker||worker.nativeRouteAdmission!=='native-home')return null;
    const home=nativeHomeRouteExecution(worker.id);
    const crop=nativeAnimalCropRouteExecution(animal.id,{sharedCut:true,flightWorker:worker});
    const cut=nativeWorldBoundary(),homeWorld=home?.binding.reference.worldBoundary,cropWorld=crop?.binding.reference.worldBoundary;
    if(!home||home.arrived||home.executedThrough!==game.elapsed||!crop||crop.binding.reference.purpose==='retreat'||
       !nativeRecoveryCovers(cut,homeWorld)||!nativeRecoveryCovers(cut,cropWorld)||
       sameNativeWorldBoundary(cut,homeWorld)===sameNativeWorldBoundary(cut,cropWorld))return null;
    return [home,crop];
  }
  function nativeRefugeCropRecovery(kind){
    const game=owningState,saved=refuge,raid=game?.raid;
    if(!qualifyFarmFlee||!saved||!raid?.daytime||raid!==saved.raid||raid.animals.length!==1||
       game.workers.length!==1||game.workers[0]!==saved.worker)return null;
    const {worker,issued}=saved,r=issued.reference,cut=nativeWorldBoundary();
    const home=nativeHomeRouteSource(r.sourceHome.reference).home;
    if(!nativeRecoveryCovers(cut,r.worldBoundary)||!nativeWorkerHomeInactive(r.actorId)||
       worker.x!==home.x||worker.z!==home.z||worker.heading!==r.pose.yaw||
       ['runPhase','walkPhase','carryPhase','runRemaining'].some(key=>worker[key]!==r.pose[key])||
       wasm.spatial_body_has_blockers(r.bodyId,0)!==-1)return null;
    const actual=new Float64Array(wasm.memory.buffer,wasm.nav_home_arrival_result_ptr(),52);
    if(actual[0]!==1||actual[1]!==issued.retiredSequence||actual[3]!==r.worldBoundary.ticket||
       actual[29]!==r.actorId||actual[30]!==r.bodyId||actual[44]!==r.worldBoundary.effectiveTime)return null;
    const actorId=raid.animals[0].id;
    const execution=kind===27?nativeAnimalCropStrikeExecution(actorId):nativeAnimalCropRouteExecution(actorId,{sharedCut:true});
    return execution&&matchesNativeRefugeRecovery(cut,issued,execution.binding)?{execution,refuge:issued}:null;
  }
  function nativeCenterRuinRetreatRecovery(){
    const game=owningState,ruin=committedCenterRuin,cut=nativeWorldBoundary();
    if(!ruin||!sameNativeWorldBoundary(ruin.acquired,cut)||wasm.spatial_world_resource_snapshot()!==1)return null;
    const center=game.structures.find(row=>row.id===ruin.center);
    if(center?.kind!=='center'||center.status!=='ruined'||center.hp!==0||session.centerPolygonId(ruin.center))return null;
    const header=new Float64Array(wasm.memory.buffer,wasm.spatial_world_resource_header_ptr(),9);
    if(header[1]!==cut.nativeSession||header[2]!==cut.ticket||header[3]!==cut.effectiveTime||header[4]!==4||
       !ruin.revisions.every((value,i)=>header[6+i]===value))return null;
    const original=ruin.prepared.retreat;
    const execution=nativeAnimalCropRouteExecution('animal-'+original.reference.actorId,{sharedCut:true});
    const binding=execution?.binding;
    if(!binding||binding.assignmentSequence!==original.assignmentSequence||
       !sameNativeAnimalCropReference(original.reference,binding.reference)||
       !sameNativeAnimalCropReference(original.preparedReference,binding.preparedReference))return null;
    return {execution,ruin};
  }
  function nativeAnimalCropStrikeExecution(actorId){
    const proof=activeAnimalStrike,r=proof?.reference;
    if(!r||actorId!=='animal-'+r.actorId||
       !sameNativeWorldBoundary(r.worldBoundary,nativeWorldBoundary()))return null;
    const animal=owningState?.raid?.animals.find(value=>value.id===actorId);
    if(animal?.species!=='warthog'||animal.magicDown||
       animal.hitsRemaining<=0||owningState.raid.reservations[animal.reservation]!==actorId)return null;
    const live=nativeAnimalCropState(actorId),strike=live?.strike,saved=savedRaidStrike(animal);
    if(r.purpose==='center'?!recoveredCenterCurrent(r,animal,live):animal.targetId!=='plant-'+r.targetId)return null;
    const at=live?.executedThrough,epoch=r.worldBoundary.effectiveTime;
    const remaining=at===epoch?r.restore?.remaining??r.duration:r.endTime-at;
    if(live?.mode!==3||live.purpose!==r.purpose||at!==owningState.elapsed||at<epoch||!(remaining>0)||
       live.body!==r.bodyId||live.target!==r.targetId||live.requestSequence!==r.requestSequence||
       !saved||saved.attackId!==proof.attackId||saved.clip!==r.clip||saved.duration!==r.duration||saved.remaining!==remaining||
       strike.ticket!==r.worldBoundary.ticket||strike.attackId!==proof.attackId||strike.at!==epoch||strike.endTime!==r.endTime||
       live.x!==r.x||live.z!==r.z||live.phase!==r.phase||strike.yaw!==r.yaw||
       animal.x!==r.x||animal.z!==r.z||animal.motionPhase!==r.phase||animal.heading!==r.yaw)return null;
    // The native snapshot has already validated the held body and, for a live
    // strike, its still-owned departure route. Preserve the two receipts.
    const row=new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),animalRouteV2?25:24);
    const prepared=proof.preparedReference.worldBoundary;
    if(row[4]!==(r.routeAssignment??0)||row[5]!==(r.routeTicket??0)||row[6]!==(r.generation??0)||
       row[18]!==r.worldBoundary.nativeSession||row[22]!==prepared.ticket||row[23]!==prepared.effectiveTime||
       (row[24]===1)!==(r.purpose==='center'))return null;
    return {kind:'native-animal-crop-strike-execution',actorId:r.actorId,bodyId:r.bodyId,arrived:false,
      executedThrough:at,x:r.x,z:r.z,yaw:r.yaw,phase:r.phase,attackRemaining:remaining,
      binding:{...proof,gateIds:[]}};
  }
  function acquireNativeAnimalCrop({actorId,getPublication,prepareResources,signal=null},kind){
    if(typeof prepareResources!=='function')throw TypeError('Native crop action requires graphical preparation');
    const state=owningState,animal=state.raid?.animals.find(a=>a.id===actorId),actor=numericId(actorId);
    if(!animal)return Promise.resolve({status:'unsupported'});
    const initial=nativeAnimalCropState(actorId),restore=kind===27?initial?.restore:null;
    const selected=kind===27?(restore?{index:restore.clip,duration:restore.duration}:previewRaidStrike(state,animal)):null;
    const api=kind===26?'nav_animal_route_proposal':'nav_animal_strike_proposal';
    const call=(suffix,...args)=>wasm[api+suffix](...args);
    let prepared=null,candidate=null,translation=null,attestation=null,routeBinding=null;
    if(kind===27&&!restore)routeBinding=nativeAnimalRouteBinding(actorId);
    const current=()=>{
      if(state!==owningState||!initial||!nativeCropCohortCurrent(state,{nativeAnimalCropState,nativeRaidFlightMember,encounterRetreatOwner})||state.pauses.length||state.result)return false;
      const now=nativeAnimalCropState(actorId);
      if(!now||now.mode!==(kind===26?1:restore?5:2)||now.requestSequence!==initial.requestSequence||now.body!==initial.body||now.purpose!==initial.purpose)return false;
      if(kind===26)return true;
      if(restore){
        const saved=savedRaidStrike(animal);
        return !!saved&&animal.heading===now.yaw&&sameRestoredAnimalStrike({...saved,requestedAt:restore.requestedAt},now.restore);
      }
      if(now.retreat)return false;
      if(now.purpose==='center'&&(Math.fround(animal.approach?.x)!==now.x||Math.fround(animal.approach?.z)!==now.z))return false;
      const clip=previewRaidStrike(state,animal);
      return now.arrived&&routeBinding&&clip.index===selected.index&&clip.duration===selected.duration&&
        nativeAnimalRouteBinding(routeBinding.routeHandle)?.assignmentSequence===routeBinding.assignmentSequence;
    };
    if(!current())return Promise.resolve({status:'unsupported'});
    function capture(){
      if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Missing native crop proposal ticket');
      const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
      if(t[5]!==kind||call('_snapshot',t[0],t[1])!==1)throw Error('Native crop preparation has another owner');
      const h=Array.from(new Float64Array(wasm.memory.buffer,call('_header_ptr'),kind===26?24:19));
      const worldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:epoch(),nativeSession:t[0],ticket:t[1],effectiveTime:t[3]});
      const base={version:1,kind,worldBoundary,sourceControlSequence:t[2],actorId:initial.actor,bodyId:initial.body,
        ...(initial.purpose?{purpose:initial.purpose}:{}),targetId:initial.target,centerId:initial.center,centerX:initial.centerX,centerZ:initial.centerZ,
        targetX:initial.targetX,targetZ:initial.targetZ,requestSequence:initial.requestSequence,radius:initial.radius,
        x:initial.x,z:initial.z,phase:initial.phase,yaw:initial.yaw};
      if(kind===27){
        if(h[1]!==actor||h[2]!==initial.body||h[3]!==initial.target||h[4]!==(routeBinding?.assignmentSequence??0)||
           h[5]!==(routeBinding?.worldBoundary.ticket??0)||h[6]!==(routeBinding?.routeHandle.generation??0)||h[7]!==selected.index||
           h[8]!==selected.duration||h[9]!==initial.targetX||h[10]!==initial.targetZ||h[11]!==initial.x||
           h[12]!==initial.z||h[13]!==initial.phase||h[15]!==t[3]||h[17]!==t[1]||h[18]!==t[0])throw Error('Native strike differs from its terminal route');
        const source=restore?{restore}:{generation:h[6],slot:routeBinding.routeHandle.slot,routeTicket:h[5],routeAssignment:h[4]};
        const reference={...base,...source,yaw:h[14],clip:h[7],duration:h[8],endTime:h[16]};
        return copyNativeAnimalCropProposal({version:1,kind:'native-animal-crop-strike-proposal',reference,worldBoundary,authorizedAutonomy:false},kind);
      }
      const count=call('_rows',t[0],t[1]);
      if(h[1]!==actor||h[2]!==initial.body||h[8]!==initial.x||h[9]!==initial.z||h[7]!==initial.radius||
         h[10]!==t[3]||h[21]!==initial.requestSequence||count!==h[19]||count<1||count>16384)throw Error('Native crop route differs from its resting source');
      const rows=Float64Array.from(new Float64Array(wasm.memory.buffer,call('_rows_ptr'),count*16));
      return copyNativeAnimalCropProposal({version:1,kind:'native-animal-crop-route-proposal',reference:{...base,generation:h[4],slot:h[20],endTime:h[11]},
        worldBoundary,startTime:h[10],endTime:h[11],motionMode:'animal',motionFlags:0,radius:h[7],profile:h[5],
        rowWidth:16,rows,gates:[],authorizedAutonomy:false},kind);
    }

    function checkEncounterRetreatDraft(){
      const q=encounterExhaustion,draft=q?.graphicalDraft;
      if(kind!==26||initial?.purpose!=='retreat'||!draft)return;
      const actual=capture(),r=actual.reference,p=draft.reference,b=actual.worldBoundary;
      const nativeMatch=wasm.nav_encounter_retreat_match_draft(b.nativeSession,b.ticket,p.worldBoundary.ticket,r.actorId,q.hit);
      if(nativeMatch!==1||b.effectiveTime!==q.at||
         !nativeAnimalCropSuccessor(r,p)||!nativeMotionPresentationMatches(draft,actual,[]))
        throw Error('Retreat draft changed its native motion '+JSON.stringify({nativeMatch,prepared:p,actual:r}));
    }
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:kind===26?'animal-crop-route':'animal-crop-strike',
      ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      cancel:(session,ticket)=>call('_cancel',session,ticket),release(){},
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;
        const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return t[0]===session&&t[1]===ticket&&t[5]===kind;},
      capture(boundary){prepared=candidate=capture();if(!sameNativeWorldBoundary(candidate.worldBoundary,boundary))throw Error('Wrong crop preparation boundary');return candidate;},
      revalidate(session,ticket){
        if(!current()||call('_revalidate',session,ticket)!==1)return {status:'stale'};

        candidate=capture();if(kind===26)inspectCenterEncounter(session,candidate.worldBoundary.ticket);
        if(kind===26&&!flightCandidateClear(session,candidate.worldBoundary.ticket)){
          call('_cancel',session,candidate.worldBoundary.ticket);return {status:'stale'};
        }
        let compatible=nativeAnimalCropSuccessor(candidate.reference,prepared.reference);
        if(kind===26){
          const ptr=call('_time_translation_ptr',session,candidate.worldBoundary.ticket);
          compatible=compatible&&!!ptr&&new Float64Array(wasm.memory.buffer,ptr,11)[9]===1&&nativeMotionPresentationMatches(prepared,candidate,[]);
        }
        translation={compatible};return {status:'revalidated',timeTranslation:translation,proposal:candidate};
      },timeTranslation:()=>translation,binding:()=>attestation};
    return commitNativeWorldProposal(getPublication,()=>kind===26?(()=>{

      const permit=centerPermitSource(state,animal,initial.requestSequence);
      const status=permit?stageCenterEncounter(permit,initial):call('_stage',actor,wasm.nav_intent_session(),initial.requestSequence);
      if(status!==1||!raidFlight||state.raid!==raidFlight.raid)return status;
      if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Staged crop lost its native ticket');
      const [session,ticket]=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),2);
      if(flightCandidateClear(session,ticket)){checkEncounterRetreatDraft();return 1;}
      call('_cancel',session,ticket);return 0;
    })():
      call('_stage',actor,wasm.nav_intent_session(),routeBinding?.assignmentSequence??0,selected.index,selected.duration),(mark,...boundary)=>{
      if(!current())return {status:-2};
      if(kind===26&&!flightCandidateClear(boundary[0],boundary[1]))return {status:-2};
      const attackId=restore?.attackId??state.sequence,readyTicket=prepared.worldBoundary.ticket;
      const status=kind===26?call('_commit_bound',...boundary,readyTicket):call('_commit_bound',...boundary,readyTicket,attackId);
      if(status!==1)return {status};mark();
      const ref=candidate.reference;
      if(kind===26){
        if(beginNativeRouteExecution().status!=='started')throw Error('Native crop route could not begin execution');
        const binding=nativeAnimalRouteBinding(routeHandle(boundary[0],ref.slot,ref.generation));
        if(!binding||!sameNativeWorldBoundary(binding.worldBoundary,ref.worldBoundary)||
           !sameNativeWorldBoundary(binding.preparedWorldBoundary,prepared.worldBoundary)||binding.bodyId!==ref.bodyId||
           binding.targetId!==ref.targetId||binding.requestSequence!==ref.requestSequence||binding.purpose!==ref.purpose)throw Error('Native crop route acquired a different resource');
        attestation=copyNativeAnimalCropAttestation({version:1,reference:ref,preparedReference:prepared.reference,assignmentSequence:binding.assignmentSequence},kind);
        activeAnimalRoute=attestation;
      }else{
        if(wasm.nav_animal_strike_snapshot(actor)!==1)throw Error('Native strike did not acquire its terminal source');
        const a=new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),animalRouteV2?25:24);
        if(a[17]!==ref.worldBoundary.ticket||a[19]!==attackId||a[22]!==readyTicket||a[15]!==ref.worldBoundary.effectiveTime||a[23]!==prepared.worldBoundary.effectiveTime||
           (a[24]===1)!==(ref.purpose==='center'))throw Error('Native strike did not retain its prepared resource');
        projectAcquiredRaidStrike(state,animal,{purpose:ref.purpose,actor:a[1],body:a[2],target:a[3],clip:a[7],duration:a[8],
          targetX:a[9],targetZ:a[10],x:a[11],z:a[12],yaw:a[14],at:a[15],attackId});
        attestation=copyNativeAnimalCropAttestation({version:1,reference:ref,preparedReference:prepared.reference,attackId,
          assignmentSequence:wasm.nav_intent_transition_sequence()},kind);
        activeAnimalStrike=attestation;
      }
      const key=kind===26?'nativeAnimalCropRouteBinding':'nativeAnimalCropStrikeBinding';
      const resources={version:1,kind,phase:'committed',worldBoundary:nativeWorldBoundary(),[key]:attestation,
        ...(kind===26?{presentation:captureNativeRoutePresentation(routeHandle(boundary[0],ref.slot,ref.generation))}:{})};
      mark({resources,[key]:attestation});return {status:1,value:{resources,[key]:attestation}};
    },prepareResources,signal,protocol);
  }

  function prepareNativeCenterRuin(center,end){
    const state=owningState,retreat=activeAnimalRoute,ref=retreat?.reference,actor=state?.raid?.animals[0];
    if(!ref||!actor||actor.id!=='animal-'+ref.actorId||actor.status!=='retreating'||
       !state.structures.includes(center)||center.status!=='collapsing'||
       !sameNativeWorldBoundary(ref.worldBoundary,nativeWorldBoundary())||typeof wasm.spatial_center_ruin_stage!=='function')
      throw Error('Center ruin requires an acquired Retreat');
    const handle=routeHandle(ref.worldBoundary.nativeSession,ref.slot,ref.generation);
    const currentRoute=()=>{const q=nativeAnimalRouteBinding(handle);return !!q&&q.purpose==='retreat'&&
      q.actorId===ref.actorId&&q.bodyId===ref.bodyId&&q.assignmentSequence===retreat.assignmentSequence&&
      sameNativeWorldBoundary(q.worldBoundary,ref.worldBoundary)&&sameNativeWorldBoundary(q.preparedWorldBoundary,retreat.preparedReference.worldBoundary);};
    const polygon=session.centerPolygonId(center.id),adoption=session.prepareNativeCenterRuinAdoption(center,state,polygon);
    if(!polygon||!currentRoute())throw Error('Center ruin lost its native polygon or Retreat');
    const footprint=centerFootprint(center,state).footprint.flatMap(point=>[Math.fround(point.x),Math.fround(point.z)]);
    const prior=nativeWorldBoundary(),input=wasm.spatial_world_proposal_float_ptr(footprint.length);
    if(!input)throw Error('Center ruin footprint storage unavailable');
    new Float32Array(wasm.memory.buffer,input,footprint.length).set(footprint);
    if(wasm.spatial_center_ruin_stage(numericId(center.id),polygon,ref.actorId,ref.bodyId,ref.slot,ref.generation,
      retreat.assignmentSequence,ref.worldBoundary.ticket,end)!==1)throw Error('Center ruin could not reserve its native substep');
    const ticketRow=()=>Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Reserved center ruin ticket unavailable');
    const [sid,ticket,intent,at,initialClock,kind]=ticketRow(),boundary=Object.freeze({...prior,ticket,effectiveTime:at});
    const header=()=>Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_world_proposal_resource_header_ptr(),9));
    let proof=null;
    try{
      if(sid!==prior.nativeSession||at!==state.elapsed||kind!==4)throw Error('Reserved center ruin ticket differs from authority');
      const source=centerSource({boundary,previous:prior,retreat,initialClock,intent,center:center.id,polygon,end,
        footprint,revisions:header().slice(6)});
      const resources=Object.freeze({kind:'native-center-ruin-proposal',version:1,worldBoundary:boundary,nativeCenterRuin:source});
      const valid=()=>!proof&&adoption.valid()&&currentRoute()&&state.elapsed===at&&sameNativeWorldBoundary(prior,nativeWorldBoundary())&&
        wasm.nav_intent_barrier_proposal_ticket()===1&&ticketRow().every((value,index)=>value===[sid,ticket,intent,at,initialClock,kind][index]);
      return {resources,valid,cancel:()=>!proof&&wasm.nav_intent_barrier_proposal_cancel(sid,ticket)===1,
        consume(){
          if(proof||state.elapsed!==end||!adoption.valid()||!currentRoute()||
            !sameNativeWorldBoundary(prior,nativeWorldBoundary())||wasm.spatial_center_ruin_consume(sid,ticket,end)!==1)
            throw Error('Center ruin lost its exact native substep');
          const actual=Object.freeze({...boundary,effectiveTime:end});
          if(wasm.spatial_world_resource_snapshot()!==1)throw Error('Acquired center ruin resources unavailable');
          const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_world_resource_header_ptr(),9));
          proof=Object.freeze({prepared:source,acquired:actual,center:center.id,polygon,status:'ruined',revisions:Object.freeze(row.slice(6))});
          if(row[1]!==sid||row[2]!==ticket||row[3]!==end||row[4]!==4||!verifiesCenter(source,actual,proof))
            throw Error('Center ruin differs from native acquisition');
          committedWorldBoundary=actual;adoption.adopt();
        },
        finish(){
          if(!proof||center.status!=='ruined'||center.hp!==0||!currentRoute()||nativeCausalClock()?.committedThrough!==end)
            throw Error('Center ruin did not finish at its native boundary');
          const published=session.publishNativeWorldResources(proof.acquired);
          if(published.kind!==4||published.chunks.length||published.removed.length)throw Error('Center ruin unexpectedly changed terrain');
          const committed=Object.freeze({...published,phase:'committed',worldBoundary:proof.acquired,nativeCenterRuin:proof});
          committedCenterRuin=proof;
          onNativeWorldResources?.(committed);
          return {worldBoundary:proof.acquired,resources:committed,nativeCenterRuin:proof};
        }};
    }catch(error){wasm.nav_intent_barrier_proposal_cancel(sid,ticket);throw error;}
  }
  const nativeAnimalRouteBinding=handle=>{
    if(typeof handle==='string'){
      if(wasm.nav_intent_actor(numericId(handle))!==1)return null;
      const row=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
      handle=routeHandle(row[4],row[5],row[6]);
    }
    if(handle?.authorityEpoch!==epoch()||wasm.nav_animal_route_binding?.(handle.session,handle.slot,handle.generation)!==1)return null;
    const h=new Float64Array(wasm.memory.buffer,wasm.nav_animal_route_binding_ptr(),animalRouteV2?25:24);
    const world=(ticket,at)=>copyNativeWorldBoundary({version:1,authorityEpoch:epoch(),nativeSession:handle.session,ticket,effectiveTime:at});
    const cut=encounterExhaustion,held=cut?.graphicalDraft?.reference;
    const encounterPreparedBeforeRequest=!!held&&cut.confirmed&&h[6]===0&&h[7]===0&&h[4]===cut.animal&&h[5]===cut.animalBody&&
      h[8]===cut.retreatRequest&&h[8]===held.requestSequence&&h[9]===cut.at&&h[12]===cut.at&&h[14]===held.worldBoundary.ticket&&
      h[15]===cut.from&&h[16]===held.endTime&&h[2]===held.slot&&h[3]===held.generation&&
      h[20]===held.x&&h[21]===held.z&&h[22]===held.phase&&h[23]===held.yaw;
    if(h[0]!==1||h[1]!==handle.session||h[2]!==handle.slot||h[3]!==handle.generation||
       !(h[6]===0&&h[7]===0||[6,7].every(i=>Number.isSafeInteger(h[i])&&h[i]>0))||![4,5,8,10].every(i=>Number.isSafeInteger(h[i])&&h[i]>0)||h[10]<=h[8]||
       h[14]>h[11]||h[15]<h[9]&&!encounterPreparedBeforeRequest||h[12]<h[15]||h[13]<h[12]||h[16]<h[15])throw Error('Invalid acquired native animal route');
    const purpose=h[6]===0?'retreat':h[24]===1?'center':undefined;
    return Object.freeze({actorId:h[4],bodyId:h[5],...(purpose?{purpose}:{}),targetId:h[6]||null,centerId:h[7]||null,requestSequence:h[8],
      requestedAt:h[9],assignmentSequence:h[10],worldBoundary:world(h[11],h[12]),endTime:h[13],
      preparedWorldBoundary:world(h[14],h[15]),preparedEndTime:h[16],routeHandle:routeHandle(h[1],h[2],h[3]),
      center:Object.freeze({x:h[7]?h[17]:null,z:h[7]?h[18]:null}),radius:h[19],origin:Object.freeze({x:h[20],z:h[21],phase:h[22],yaw:h[23]})});
  };
  const nativeRouteTiming=handle=>{
    if(handle?.authorityEpoch!==epoch()||
       wasm.nav_intent_route_timing(handle.session,handle.slot,handle.generation)!==1)return null;
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_timing_ptr(),20)),
      count=data[9];
    if(data[0]!==1||![1,2].includes(data[10])||!Number.isSafeInteger(count)||count<0||count>4096)
      throw Error('Invalid native route timing contract');
    const points=routePoints(handle),distances=Float64Array.from(new Float64Array(wasm.memory.buffer,
       wasm.nav_intent_route_distances_ptr(handle.session,handle.slot,handle.generation),count));
    if(!points||points.length!==count*2)throw Error('Native route timing lost its pinned geometry');
    const held=wasm.nav_intent_route_initial_hold?.(handle.session,handle.slot,handle.generation)===1,
      hold=held?Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_initial_hold_ptr(),3)):null;
    const gateCandidate=wasm.nav_intent_route_gate_candidate?
      wasm.nav_intent_route_gate_candidate(handle.session,handle.slot,handle.generation)===1:held;
    const gateAdmitted=wasm.nav_gate_route_admitted?.(handle.session,handle.slot,handle.generation)===1;
    const resumable=wasm.nav_gate_route_resumable?.(handle.session,handle.slot,handle.generation)===1,
      offsets=resumable?Array.from(new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_route_motion_offset_ptr(handle.session,handle.slot,handle.generation),7)):null;
    let holds=held?[Object.freeze({gateId:hold[0],distance:0,from:hold[1],until:hold[2]})]:[];
    if(wasm.nav_intent_route_holds_version?.()===1){
      const count=wasm.nav_intent_route_holds(handle.session,handle.slot,handle.generation);
      if(!Number.isSafeInteger(count)||count<0||count>4096)throw Error('Invalid native route hold contract');
      const rows=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_holds_ptr(),count*4));
      holds=Array.from({length:count},(_,i)=>Object.freeze({gateId:rows[i*4],distance:rows[i*4+1],from:rows[i*4+2],until:rows[i*4+3]}));
    }
    const animal=data[10]===1?nativeAnimalRouteBinding(handle):null;
    return Object.freeze({actorId:data[1],routeHandle:handle,startTime:data[2],endTime:data[3],
      speed:data[4],radius:data[5],origin:Object.freeze({x:data[6],z:data[7]}),distance:data[8],
      duration:data[3]-data[2],assignmentSequence:data[11],profile:data[12],points,distances,
      executionScope:animal?'native-animal-crop-route':gateAdmitted?'native-desert-gate-crossing':gateCandidate?'unadmitted-desert-gate-candidate':resumable?'native-desert-worker-suffix':data[10]===2?'static-desert-worker':'static-desert-animal',authorizedAutonomy:false,
      ...(animal?{nativeAnimalRoute:animal}:{}),
      ...(resumable?{resumable:true,motionOffset:Object.freeze({distance:offsets[0],phase:offsets[1],runPhase:offsets[2],walkPhase:offsets[3],carryPhase:offsets[4],runDistance:offsets[5],walkDistance:offsets[6]})}:{}),
      ...(gateCandidate||gateAdmitted?{holds:Object.freeze(holds),authorizedPassage:false,nativeCrossingAdmitted:gateAdmitted}:{}),
      ...(held?{initialHold:Object.freeze({gateId:hold[0],from:hold[1],until:hold[2]})}:{}),
      ...(data[10]===2?{motionMode:'worker',runDistance:data[16],runSpeed:data[17],
        runBudget:data[18],motionFlags:data[19]}:{})});
  };
  const nativeRouteTimeKnots=handle=>{
    if(handle?.authorityEpoch!==epoch())return null;
    if(wasm.nav_intent_route_holds_version?.()!==1)throw Error('Rebuild native route hold service');
    const count=wasm.nav_intent_route_time_knots(handle.session,handle.slot,handle.generation);if(count<0)return null;
    if(!Number.isSafeInteger(count)||count<1||count>16384)throw Error('Invalid native route time-knot contract');
    return Float64Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_time_knots_ptr(),count));
  };
  const decodeMotionSample=(data,animalRoute=false)=>{
    return {x:data[0],z:data[1],distance:data[2],phase:data[3],yaw:data[4],
      firstRemainingPoint:data[5],arrived:data[6]===1,at:data[7],duration:data[8],
      ...(data[17]===2||animalRoute?{runPhase:data[9],walkPhase:data[10],carryPhase:data[11],
        runDistance:data[12],walkDistance:data[13],runRemaining:data[14],
        running:data[15]===1,currentSpeed:data[16]}:{})};
  };
  const nativeGateRouteSweep=(gateId,handle,target)=>{
    if(handle?.authorityEpoch!==epoch())return {status:'stale',authorizedPassage:false};
    if(wasm.nav_gate_sweep_version?.()!==1)throw Error('Rebuild native gate sweep service');
    syncBoundaryTime();const result=wasm.nav_gate_route_sweep(numericId(gateId),handle.session,handle.slot,handle.generation,target),
      a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_sweep_result_ptr(),6));
    return {status:result===1?'clear':result===0?'blocked':'invalid',authorizedPassage:false,
      witness:a[0]?{gateId:a[0],bodyId:a[1],from:a[2],to:a[3],reason:a[4]===1?'overlap':'unproven'}:null};
  };
  const nativeGateMechanismPose=gateId=>{
    if(wasm.nav_gate_mechanism_version?.()!==1)throw Error('Rebuild native gate mechanism service');
    if(wasm.nav_gate_mechanism_pose(numericId(gateId))!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_pose_ptr(),40));
    return Object.freeze({version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),entityId:gateId,gateId:a[0],modelId:a[1],mechanism:a[2],
      collisionModel:'kinematic-union',supportClass:'flat-native-datum',visualClass:'intact-full-health',baseY:a[3],supportMin:a[4],supportMax:a[5],sampledAt:a[6],opening:a[7],
      rootMatrix:Object.freeze(a.slice(8,24)),leafMatrix:Object.freeze(a.slice(24,40)),authorizedPassage:false,authorizedAutonomy:false});
  };
  const nativeGateMechanism=gateId=>{
    const pose=nativeGateMechanismPose(gateId);if(!pose)return null;
    const count=wasm.nav_gate_mechanism_vertices(numericId(gateId));if(!Number.isSafeInteger(count)||count<3||count>100000)throw Error('Invalid native gate geometry contract');
    return Object.freeze({...pose,positions:Float32Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_gate_mechanism_positions_ptr(numericId(gateId)),count*3)),
      leafFlags:Uint8Array.from(new Uint8Array(wasm.memory.buffer,wasm.nav_gate_mechanism_leaf_ptr(numericId(gateId)),count))});
  };
  const nativeGateMechanismSegment=(gateId,body,from,to)=>{
    const pose=nativeGateMechanismPose(gateId);if(!pose)return {status:'unknown'};
    const result=wasm.nav_gate_mechanism_segment(numericId(gateId),body,from.x,from.z,to.x,to.z),
      a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_collision_ptr(),8));
    return {status:result===1?'clear':result===0?'blocked':result===-2?'unsupported':'unknown',components:a[2],sampledAt:a[3],mechanism:a[7],authorizedPassage:false};
  };
  const nativeGateMechanismWorldVertices=gateId=>{
    const pose=nativeGateMechanismPose(gateId);if(!pose)return null;
    const count=wasm.nav_gate_mechanism_world_vertices(numericId(gateId));if(count<3||count>100000)throw Error('Invalid native gate world geometry');
    return Float64Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_world_ptr(),count*3));
  };
  const prepareNativeGateMotionAfterGpuFence=async({getPublication,enabled,staticObjects=false,prepareResources=null,signal=null}={})=>{
    if(!initialized||!owningState)throw Error('Reset the native intent session first');
    if(nativeCausalClock()){
      if(typeof prepareResources!=='function')return {status:'resources-unavailable',authorizedAutonomy:false,authorizedPassage:false};
      if(typeof staticObjects!=='boolean'||enabled!==undefined&&typeof enabled!=='boolean'||signal!==null&&typeof signal?.addEventListener!=='function')throw TypeError('Invalid causal gate resource preparation');
      if(wasm.nav_gate_motion_causal_version?.()!==1)throw Error('Rebuild causal gate motion service');
      let resources;
      const protocol={
        preparedFrameRequired:true,
        ticket:()=>wasm.nav_gate_motion_world_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
        snapshot:(session,ticket)=>wasm.nav_gate_motion_current(session,ticket),
        cancel:(session,ticket)=>wasm.nav_gate_motion_cancel(session,ticket),release(){},
        capture(boundary){
          const {nativeSession,ticket,effectiveTime}=boundary,count=wasm.nav_gate_motion_presentations(nativeSession,ticket);
          if(count<0)throw Error('Native gate proposal graphics unavailable');
          const ids=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count));
          const gates=ids.map(id=>{const entityId=`structure-${id}`,mesh=nativeGateMechanism(entityId),knots=wasm.nav_gate_motion_presentation(nativeSession,ticket,id);
            if(!mesh||knots<1||knots>6)throw Error('Native gate proposal curve unavailable');
            const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),21+knots*2)),rows=Float64Array.from(data.slice(21)),endTime=rows.at(-2);
            if(data[0]!==id||data[1]!==mesh.mechanism||data[2]!==mesh.modelId)throw Error('Native gate proposal identity mismatch');
            return copyNativeGatePresentation({kind:'native-gate-presentation',version:1,worldBoundary:boundary,gateId:id,entityId,mechanism:data[1],modelId:data[2],startTime:effectiveTime,endTime,rootMatrix:data.slice(5,21),hinge:[data[3],0,data[4]],positions:mesh.positions,leafFlags:mesh.leafFlags,rows,authorizedAutonomy:false},{worldBoundary:boundary,startTime:effectiveTime,endTime});
          });
          resources=Object.freeze({version:1,kind:12,phase:'proposal',worldBoundary:boundary,gates:Object.freeze(gates)});return resources;
        }
      };
      return commitNativeWorldProposal(getPublication,()=>wasm.nav_gate_motion_stage_causal((enabled??(!owningState.pauses?.length&&!owningState.result&&!owningState.initialPreparation))?1:0,staticObjects?1:0),
        (mark,...boundary)=>{const result=wasm.nav_gate_motion_commit_causal(...boundary);if(result!==1)return {status:result};const committed=Object.freeze({...resources,phase:'committed'});mark({resources:committed});return {status:1,value:{resources:committed}};},prepareResources,signal,protocol);
    }
    if(typeof getPublication!=='function'||enabled!==undefined&&typeof enabled!=='boolean'||typeof staticObjects!=='boolean')
      throw TypeError('Expected current native control publication and gate boundary facts');
    if(wasm.nav_gate_motion_transaction_version?.()!==1)throw Error('Rebuild native gate transaction service');
    if(staticObjects&&wasm.nav_gate_static_object_version?.()!==1)throw Error('Rebuild native gate static-object service');
    const policy=()=>[!!owningState.pauses?.length,!!owningState.result,!!owningState.initialPreparation],beforePolicy=policy(),
      running=enabled??!beforePolicy.some(Boolean),owner=epoch();
    syncBoundaryTime();flushNativeIntentControl();
    const source=getPublication(),control=source?.status?.(),at=wasm.nav_intent_effective_time(),
      sequence=wasm.nav_intent_transition_sequence();
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(!source||typeof source.fenceGpu!=='function'||control?.closed||control?.authorityEpoch!==owner)
      return outcome('control-unavailable');
    if(!coversGpuConsumers(source))return outcome('control-consumers-mismatch');
    // A GPU drain cannot invent a newer logical clock boundary. Until causal
    // clock publication is implemented, only an exact published boundary is used.
    if(control.sentSequence!==sequence||control.sentTime!==at)return outcome('control-boundary-mismatch');
    const staged=(staticObjects?wasm.nav_gate_motion_stage_objects:wasm.nav_gate_motion_stage)(running?1:0);
    if(staged!==1)return outcome(staged===-2?'incomplete-facts':staged===-3||staged===-8?'blocked':staged===-4?'busy':
      staged===-6?'unknown':staged===-7?'unsupported':staged===-9?'crossing-reserved':'invalid',staticObjects?{staticWitness:readNativeGateStaticWitness(wasm)}:{});
    if(wasm.nav_gate_motion_ticket()!==1)throw Error('Native gate proposal lost its ticket');
    const [session,ticket,nativeSequence,nativeTime]=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_motion_ticket_ptr(),5));
    try{
      const receipt=await source.fenceGpu(),current=source.status();
      if(epoch()!==owner||getPublication()!==source||current.closed||current.session!==control.session||
         current.authorityEpoch!==owner||!coversGpuConsumers(source))return outcome('control-replaced');
      if(receipt.authorityEpoch!==owner||receipt.sequence!==nativeSequence||receipt.effectiveTime!==nativeTime||
         !Number.isSafeInteger(receipt.fenceId)||receipt.fenceId<1)return outcome('invalid-receipt');
      if(owningState.elapsed!==nativeTime||policy().some((value,i)=>value!==beforePolicy[i]))return outcome('stale');
      const committed=wasm.nav_gate_motion_commit(session,ticket,receipt.sequence,receipt.effectiveTime);
      return outcome(committed===1?'committed':committed===-3?'invalid-receipt':'stale',
        committed===1?{receipt,ticket:Object.freeze({authorityEpoch:owner,session,ticket})}:{});
    }catch(error){return outcome('control-failed',{error:String(error?.message??error)});}
    finally{wasm.nav_gate_motion_cancel(session,ticket);}
  };
  // First conditioned world mutation, opt-in. Geometry and affected-route
  // preflight remain native; this bridge only carries an immutable input and
  // an exact receipt from the current direct draw connection.
  const commitNativeWorldProposal=createNativeResourceAdmission({
    wasm,isReady:()=>initialized&&!!owningState,simulationTime:()=>owningState.elapsed,
    epoch,syncBoundaryTime,flushNativeIntentControl,nativeCausalClock,coversGpuConsumers,nativeWorldBoundary,
    commitWorldBoundary:boundary=>{committedWorldBoundary=boundary;},
    captureWorldProposalResources:boundary=>session.core.captureNativeWorldProposalResources(boundary),
    nativeSuspendedGateRoute:actorId=>nativeSuspendedGateRoute(actorId),nativeRouteTiming,nativeTaskStartBinding,
    nativeTaskActionBinding:actorId=>nativeTaskActionBinding(actorId),nativeTaskConsequenceBinding:actorId=>nativeTaskConsequenceBinding(actorId),nativeTaskSettlementBinding:actorId=>nativeTaskSettlementBinding(actorId),nativeHomeRouteBinding:actorId=>nativeHomeRouteBinding(actorId),nativeFarmArrivalRouteBinding:actorId=>nativeFarmArrivalRouteBinding(actorId),nativeInitialIdleBodyBinding:actorId=>nativeInitialIdleBodyBinding(actorId),nativeIdleCycleBinding:actorId=>nativeIdleCycleBinding(actorId),nativeIdleStrollBinding:actorId=>nativeIdleStrollBinding(actorId)
  });
  // Query the existing native mutation proposal and discard its ticket. This
  // grants no motion/graphics permission and publishes no geometry or clock.
  const inspectNativeStructureStops=(kind,values)=>{
    if(![2,3].includes(kind)||!Array.isArray(values)||!values.length||!values.every(Number.isFinite))throw TypeError('Invalid structure preflight');
    syncBoundaryTime();flushNativeIntentControl();
    const pointer=wasm.spatial_world_proposal_float_ptr(values.length);
    if(!pointer)throw Error('Native structure preflight allocation failed');
    new Float32Array(wasm.memory.buffer,pointer,values.length).set(values);
    wasm.spatial_world_proposal_int_ptr(0);
    const result=wasm.spatial_world_proposal_stage(kind,0,values.length,0);
    if(result!==1)return {status:result===0?'blocked':result===-4?'busy':result===-2?'stale':'invalid',actors:[]};
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native structure preflight lost its ticket');
    const [session,ticket]=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);
    try{
      const count=wasm.nav_intent_world_proposal_route_effects(session,ticket);
      if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Native structure preflight effects unavailable');
      const rows=new Float64Array(wasm.memory.buffer,wasm.nav_intent_world_proposal_route_effects_ptr(),count*26);
      return {status:'ready',actors:Array.from({length:count},(_,i)=>rows[i*26])};
    }finally{if(wasm.nav_intent_barrier_proposal_cancel(session,ticket)!==1)throw Error('Native structure preflight cancellation failed');}
  };

  // Gate proxies deliberately permit passage. Impact must instead use the
  // native mechanism's exact unsupported volume and its stop conflict closure.
  const inspectNativeGateAdditionStops=gate=>{
    const id=numericId(gate?.entityId);
    if(!Number.isSafeInteger(id)||id<1||!Number.isInteger(gate?.modelId)||![gate?.x,gate?.z,gate?.yaw,gate?.sx,gate?.sz].every(Number.isFinite))throw TypeError('Invalid gate preflight');
    if(wasm.nav_gate_addition_stop_query_version?.()!==1)throw Error('Rebuild native gate stop inspection');
    syncBoundaryTime();flushNativeIntentControl();
    const count=wasm.nav_gate_addition_inspect_stops(id,gate.modelId,gate.x,gate.z,gate.yaw,gate.sx,gate.sz);
    if(!Number.isSafeInteger(count)||count>32768)throw Error('Invalid native gate stop count');
    if(count<0)return {status:count===-4?'busy':count===-2?'stale':count===-5||count===-3?'blocked':'invalid',actors:[]};
    const actors=count?Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_addition_stop_actors_ptr(),count)):[];
    if(actors.some(actor=>!Number.isSafeInteger(actor)||actor<1)||new Set(actors).size!==actors.length)throw Error('Invalid native gate stop actors');
    return {status:'ready',actors};
  };

  const inspectNativeGateRemovalStops=entityId=>{
    const id=numericId(entityId);if(!id||entityId!==`structure-${id}`)throw TypeError('Invalid gate removal owner');
    if(wasm.spatial_world_gate_removal_version?.()!==1)throw Error('Rebuild native gate removal');
    syncBoundaryTime();flushNativeIntentControl();const count=wasm.nav_gate_removal_inspect_stops(id);
    if(!Number.isSafeInteger(count)||count>32768)throw Error('Invalid removal stop count');
    if(count<0)return {status:count===-4?'busy':count===-2?'stale':'invalid',actors:[]};
    const actors=count?Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_addition_stop_actors_ptr(),count)):[];
    if(actors.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(actors).size!==actors.length)throw Error('Invalid removal stop owners');
    return {status:'ready',actors};
  };
  // Both addition classes use the existing world transaction. A gate keeps
  // its mechanism, three proxies and initial pose in a single native proposal.
  const addNativeBarriersAfterGpuQuiescence=({additions,gate=null,removal=null,getPublication,prepareResources,signal=null,validate,project,atCommitBoundary=null,onProposal=null}={})=>{
    if(removal!==null&&(gate!==null||additions!==undefined))throw TypeError('Removal must use its own kind2 batch');
    if(gate!==null&&additions!==undefined)throw TypeError('Native gate and solid additions require separate proposals');
    const shapes=gate===null&&removal===null?copyNativeBarrierAdditions(additions):null,count=shapes?.length??3;
    const removalId=removal&&numericId(removal.entityId);
    if(removal&&(!removalId||removal.entityId!==`structure-${removalId}`||wasm.spatial_world_gate_removal_version?.()!==1))throw Error('Native gate removal unavailable');
    const gateId=gate&&numericId(gate.entityId);
    if(gate!==null&&(!gateId||gate.entityId!==`structure-${gateId}`||![1,2,3].includes(gate.modelId)||![gate.x,gate.z,gate.yaw,gate.sx,gate.sz].every(Number.isFinite)||gate.sx<=0||gate.sz<=0))throw TypeError('Invalid native gate placement');
    if(typeof prepareResources!=='function'||typeof validate!=='function'||typeof project!=='function')throw TypeError('Native solid addition requires preparation and synchronous Game adoption');
    if(atCommitBoundary!==null&&typeof atCommitBoundary!=='function')throw TypeError('Invalid native command boundary');
    if(onProposal!==null&&typeof onProposal!=='function')throw TypeError('Invalid native solid addition proposal observer');
    if(wasm.spatial_world_barrier_addition_version?.()!==1)throw Error('Rebuild native solid addition association');
    if(gate&&wasm.spatial_world_gate_addition_version?.()!==1)throw Error('Rebuild native gate addition association');
    let candidate=null,preparedReference=null,translation=null,issued=null;
    const tuple=()=>{if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native solid addition lost its ticket');const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));if(row[5]!==2)throw Error('Native solid addition changed family');return row;};
    const capture=boundary=>{
      const resources=session.core.captureNativeWorldProposalResources(boundary),row=tuple();
      if(resources.kind!==2||resources.chunks.length||resources.removed.length||resources.retainsNativeAssignments!==true||resources.routeEffects.rows.length||resources.gateEffects.rows.length||row[0]!==boundary.nativeSession||row[1]!==boundary.ticket||row[3]!==boundary.effectiveTime)throw Error('Native solid addition lacks its unchanged-owner proof');
      let shape={additions:shapes};
      if(gate){
        const pointer=wasm.spatial_world_gate_addition_proxies_ptr(row[0],row[1]);
        if(!pointer)throw Error('Native gate proposal lost its proxy geometry');
        const proxies=Array.from(new Float32Array(wasm.memory.buffer,pointer,18));
        if(wasm.nav_gate_addition_proposal_pose(row[0],row[1])!==1)throw Error('Native gate proposal lost its initial pose');
        const pose=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_pose_ptr(),40));
        if(pose[0]!==gateId||pose[1]!==gate.modelId||pose[6]!==boundary.effectiveTime)throw Error('Native gate proposal changed its identity');
        shape={gate:{entityId:gate.entityId,modelId:pose[1],x:gate.x,z:gate.z,yaw:gate.yaw,sx:gate.sx,sz:gate.sz,
          mechanismId:pose[2],opening:pose[7],rootMatrix:pose.slice(8,24),leafMatrix:pose.slice(24,40),
          proxies:Array.from({length:3},(_,index)=>{const [x,z,halfX,halfZ,yaw,passMask]=proxies.slice(index*6,index*6+6);return {x,z,halfX,halfZ,yaw,passMask};})}};
      }
      if(removal){
        const pointer=wasm.spatial_world_gate_removal_ids_ptr(row[0],row[1]);if(!pointer||wasm.nav_gate_mechanism_pose(removalId)!==1)throw Error('Native removal lost its owner');
        const ids=Array.from(new Int32Array(wasm.memory.buffer,pointer,3)),pose=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_mechanism_pose_ptr(),40));
        shape={removal:{entityId:removal.entityId,mechanismId:pose[2],nativeIds:ids}};
      }
      return copyNativeBarrierAdditionProposal({kind:'native-barrier-addition-proposal',version:1,worldBoundary:boundary,
        nativeBarrierAddition:{kind:'native-barrier-addition-reference',version:removal?3:gate?2:1,worldBoundary:boundary,sourceControlSequence:row[2],...shape},
        authorizedAutonomy:false,authorizedConsequences:false});
    };
    const protocol={motionKind:'barrier-addition',preparedFrameRequired:true,deferred:true,atCommitBoundary,
      ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      capture(boundary){candidate=capture(boundary);preparedReference=candidate.nativeBarrierAddition;onProposal?.(boundary);return candidate;},
      retained(session,ticket){if(validate()!==true||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const row=tuple();return row[0]===session&&row[1]===ticket;},
      revalidate(session,ticket){
        if(validate()!==true)return {status:'stale'};
        const result=removal?wasm.spatial_world_gate_removal_revalidate(session,ticket):gate?wasm.spatial_world_gate_addition_revalidate(session,ticket):wasm.spatial_world_proposal_revalidate_barriers(session,ticket);
        if(result!==1)return {status:result===0?'blocked':'stale'};
        const row=tuple(),boundary=copyNativeWorldBoundary({version:1,authorityEpoch:epoch(),nativeSession:row[0],ticket:row[1],effectiveTime:row[3]});
        let retained=false;
        try{
          const pointer=wasm.nav_barrier_addition_proposal_translation_ptr(row[0],row[1]);
          if(!pointer)throw Error('Native addition translation unavailable');
          const proof=Array.from(new Float64Array(wasm.memory.buffer,pointer,8)),origin=preparedReference.worldBoundary;
          if(proof[0]!==1||proof[1]!==origin.ticket||proof[2]!==row[1]||proof[3]!==origin.effectiveTime||proof[4]!==row[3]||proof[5]!==1||proof[6]!==count||proof[7]!==0)throw Error('Native addition translation mismatch');
          candidate=capture(boundary);
          if(!nativeBarrierAdditionSuccessor(preparedReference,candidate.nativeBarrierAddition))return {status:'stale'};
          translation=Object.freeze({version:1,sameResourceOwners:true,preparedTicket:proof[1],ticket:proof[2],preparedAt:proof[3],effectiveTime:proof[4]});
          retained=true;
          return {status:'revalidated',proposal:candidate,timeTranslation:translation};
        }finally{
          if(!retained){protocol.release(row[0],row[1]);protocol.cancel(row[0],row[1]);}
        }
      },
      timeTranslation:()=>translation,binding:()=>issued,
      release(session,ticket){wasm.spatial_world_proposal_resource_release(session,ticket);},cancel(session,ticket){wasm.nav_intent_barrier_proposal_cancel(session,ticket);}
    };
    return commitNativeWorldProposal(getPublication,()=>{
      if(validate()!==true)return -2;
      if(removal)return wasm.spatial_world_gate_removal_stage(removalId);
      if(gate)return wasm.spatial_world_gate_addition_stage(gateId,gate.modelId,gate.x,gate.z,gate.yaw,gate.sx,gate.sz);
      const values=shapes.flatMap(p=>[p.x,p.z,p.halfX,p.halfZ,p.yaw,0]),pointer=wasm.spatial_world_proposal_float_ptr(values.length);if(!pointer)throw Error('Native solid addition input allocation failed');
      new Float32Array(wasm.memory.buffer,pointer,values.length).set(values);wasm.spatial_world_proposal_int_ptr(0);return wasm.spatial_world_proposal_stage_resources(2,0,values.length,0);
    },(mark,...boundary)=>{
      if(validate()!==true)return {status:-2};
      const commit=removal?wasm.spatial_world_gate_removal_commit_bound:gate?wasm.spatial_world_gate_addition_commit_bound:wasm.spatial_world_proposal_barriers_commit_bound;
      const status=commit(...boundary,preparedReference.worldBoundary.ticket);if(status!==1)return {status};mark();
      const pointer=wasm.spatial_world_barrier_binding_ptr();if(!pointer||wasm.spatial_world_proposal_result_count()!==count)throw Error('Native addition receipt unavailable');
      const proof=Array.from(new Float64Array(wasm.memory.buffer,pointer,5)),expected=[1,preparedReference.worldBoundary.ticket,preparedReference.worldBoundary.effectiveTime,boundary[1],boundary[3]];
      if(!proof.every((value,index)=>value===expected[index]))throw Error('Native solid addition receipt mismatch');
      const ids=Array.from(new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),count));
      issued=copyNativeBarrierAdditionAttestation({kind:'native-barrier-addition-attestation',version:1,reference:candidate.nativeBarrierAddition,preparedReference,nativeIds:ids});
      // Native commit is irreversible. Expected Game rejection must happen in
      // validate, and project must adopt these exact IDs synchronously.
      const projection=project({ids:issued.nativeIds,worldBoundary:nativeWorldBoundary(),nativeBarrierAdditionBinding:issued});
      if(projection!==true)throw Error('Native solid addition Game projection was not synchronous and successful');
      const published=session.publishNativeWorldResources(committedWorldBoundary),resources=copyNativeBarrierAdditionResources({...published,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeBarrierAdditionBinding:issued});
      if(onNativeWorldResources)onNativeWorldResources({...published,worldBoundary:nativeWorldBoundary(),nativeBarrierAdditionBinding:issued});
      mark({ids,resources,nativeBarrierAdditionBinding:issued});return {status:1,value:{ids,resources,nativeBarrierAdditionBinding:issued}};
    },prepareResources,signal,protocol);
  };

  const addNativeBarrierAfterGpuQuiescence=({getPublication,x,z,halfX,halfZ,yaw=0,passMask=0}={})=>{
    if(![x,z,halfX,halfZ,yaw].every(Number.isFinite)||halfX<=0||halfZ<=0||halfX>100||halfZ>100||
       !Number.isInteger(passMask)||passMask<0||passMask>3)throw TypeError('Expected a native barrier proposal');
    return commitNativeWorldProposal(getPublication,()=>wasm.spatial_barrier_proposal_stage(x,z,halfX,halfZ,yaw,passMask),
      (markCommitted,...boundary)=>{const id=wasm.spatial_barrier_proposal_commit(...boundary);
        if(id<=0)return {status:id};markCommitted({barrierId:id});return {status:1,value:{barrierId:id}};});
  };
  const nativeWorkerRouteStopInput=({actorId,routeHandle:h,assignmentSequence})=>{
    const split=value=>[Number(BigInt(value)&0xffffffffn)|0,Math.floor(value/4294967296)];
    return [...split(h.session),...split(actorId),h.slot|0,h.generation|0,...split(assignmentSequence)];
  };
  const mutateNativeWorldAfterGpuQuiescence=({getPublication,mutation,prepareResources=null,signal=null,shield=null}={})=>{
    if(prepareResources!==null&&typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Invalid native resource preparation');
    if(prepareResources&&wasm.spatial_world_proposal_resource_version?.()!==1)throw Error('Rebuild native proposal resources');
    if(wasm.spatial_world_proposal_version?.()!==1)throw Error('Rebuild native world proposal service');
    if(wasm.spatial_world_resource_version?.()!==1)throw Error('Rebuild native world resource projection');
    const m=mutation;if(!m||typeof m!=='object'||Array.isArray(m))throw TypeError('Expected a native world mutation');
    let kind,mode=0,floats=[],integers=[];
    const pass=value=>Number.isInteger(value)&&value>=0&&value<=3,
      id=value=>Number.isInteger(value)&&value>0&&value<=2147483647;
    if(m.type==='barriers'){
      const remove=m.removeIds??[],add=m.additions??[];
      if(!Array.isArray(remove)||!Array.isArray(add)||remove.length>1024||add.length>1024||!remove.length&&!add.length||
         remove.some(v=>!id(v))||new Set(remove).size!==remove.length||add.some(v=>!v||![v.x,v.z,v.halfX,v.halfZ,v.yaw??0].every(Number.isFinite)||
           v.halfX<=0||v.halfZ<=0||v.halfX>100||v.halfZ>100||!pass(v.passMask??0)))throw TypeError('Invalid native barrier batch');
      kind=2;mode=remove.length;integers=remove.slice();floats=add.flatMap(v=>[v.x,v.z,v.halfX,v.halfZ,v.yaw??0,v.passMask??0]);
    }else if(m.type==='addPolygon'){
      if(!Array.isArray(m.points)||m.points.length<3||m.points.length>64||!pass(m.passMask??0)||
         m.points.some(p=>!p||![p.x,p.z].every(Number.isFinite)))throw TypeError('Invalid native polygon');
      kind=3;mode=m.passMask??0;floats=m.points.flatMap(p=>[p.x,p.z]);
    }else if(m.type==='removePolygon'){
      if(!id(m.id))throw TypeError('Invalid native polygon ID');kind=4;integers=[m.id];
    }else if(m.type==='barrierPassability'){
      if(!id(m.id)||!pass(m.passMask))throw TypeError('Invalid native barrier passability');kind=5;mode=m.passMask;integers=[m.id];
    }else if(m.type==='addChunk'){
      if(![m.cx,m.cz].every(v=>Number.isInteger(v)&&Math.abs(v)<=44739000))throw TypeError('Invalid native chunk coordinates');
      kind=6;integers=[m.cx,m.cz];
    }else if(m.type==='removeChunks'){
      if(!Array.isArray(m.chunks)||!m.chunks.length||m.chunks.length>4096||typeof (m.releaseOnly??false)!=='boolean'||
         m.chunks.some(c=>!Array.isArray(c)||c.length!==2||c.some(v=>!Number.isInteger(v)||Math.abs(v)>44739000)))
        throw TypeError('Invalid native chunk removal');
      kind=7;mode=m.releaseOnly?1:0;integers=m.chunks.flat();
    }else if(m.type==='removeProp'){
      if(!Number.isInteger(m.group)||m.group<0||m.group>5||![m.gx,m.gz].every(v=>Number.isInteger(v)&&v>=-2147483648&&v<=2147483647))
        throw TypeError('Invalid native prop identity');
      kind=8;integers=[m.group,m.gx,m.gz];
    }else if(m.type==='restoreRemovedProps'){
      if(!Array.isArray(m.records)||m.records.length>100000||m.records.some(p=>!p||!Number.isInteger(p.group)||p.group<0||p.group>5||
         ![p.gx,p.gz].every(v=>Number.isInteger(v)&&v>=-2147483648&&v<=2147483647)))throw TypeError('Invalid native prop restoration');
      kind=9;integers=m.records.flatMap(p=>[p.group,p.gx,p.gz]);
    }else if(m.type==='settlements'){
      if(!Array.isArray(m.sites)||m.sites.length>256||typeof (m.replace??false)!=='boolean'||m.sites.some(s=>!s||
         ![s.x,s.z,s.hx,s.hz,s.waterFalloff??6].every(v=>Number.isFinite(v)&&Number.isFinite(Math.fround(v)))||
         s.hx<=0||s.hz<=0||s.hx>100||s.hz>100||(s.waterFalloff??6)<.25||(s.waterFalloff??6)>6))throw TypeError('Invalid native settlement mutation');
      kind=10;mode=m.replace?1:0;floats=m.sites.flatMap(s=>[s.x,s.z,s.hx,s.hz,s.waterFalloff??6]);
    }else if(m.type==='publishPreparedChunk'){
      if(!id(m.id))throw TypeError('Invalid native prepared chunk ID');kind=11;integers=[m.id];
    }else if(m.type==='stopFarmArrival'){
      if(typeof prepareResources!=='function')throw TypeError('Native farm arrival stop requires retained prepared resources');
      const binding=copyNativeFarmArrivalRouteAttestation(m.binding),r=binding.reference,h=r.expectedRouteHandle;
      if(h.authorityEpoch!==epoch()||h.session!==wasm.nav_intent_session()||!sameNativeFarmArrivalRouteAttestation(binding,nativeFarmArrivalRouteBinding(r.actorId)))return Promise.resolve({status:'stale',authorizedAutonomy:false,authorizedPassage:false});
      return stopNativeFarmArrivalAfterGpuQuiescence({actorId:r.actorId,getPublication,prepareResources,signal});
    }else if(m.type==='stopIdleStroll'){
      if(typeof prepareResources!=='function')throw TypeError('Native stroll stop requires retained prepared resources');
      const binding=copyNativeIdleStrollAttestation(m.binding),r=binding.reference,h=r.expectedRouteHandle;
      if(h.authorityEpoch!==epoch()||h.session!==wasm.nav_intent_session()||!sameNativeIdleStrollAttestation(binding,nativeIdleStrollBinding(r.actorId)))return Promise.resolve({status:'stale',authorizedAutonomy:false,authorizedPassage:false});
      const prepare=prepareResources;prepareResources=async options=>{
        const handle=await prepare(options);
        if(!handle?.preparedWorldBoundary){handle?.abort?.();throw Error('Native stroll stop requires a retained command packet');}
        return handle;
      };
      kind=12;integers=nativeWorkerRouteStopInput(stopSourceRoute(binding));
    }else throw TypeError('Unsupported native world mutation');
    let protocol=null,pendingShield=null,cropStop=null,cropExpiry=null;
    const supersededStrike=shield?.expiredRequest?.previousStrike;
    if(shield!==null){
      if(!nativeShieldWorldKind(kind)||typeof prepareResources!=='function'||typeof shield.validate!=='function'||
         typeof shield.project!=='function'||typeof shield.atCommitBoundary!=='function')throw TypeError('Invalid prepared shield owner');
      pendingShield=copyNativeShieldWorld(shield.source,kind,{proposal:true});
      if(kind===3){
        const expected=spatialShieldFootprint(pendingShield.spell).flatMap(point=>[point.x,point.z]);
        if(mode!==1||expected.length!==floats.length||expected.some((value,index)=>value!==floats[index]))throw Error('Native shield footprint changed');
      }else if(pendingShield.polygonId!==integers[0])throw Error('Native shield removal uses another polygon');
      protocol={preparedFrameRequired:true,atCommitBoundary:shield.atCommitBoundary,
       get preparedShieldCropExpiry(){return cropExpiry;},
       capture:worldBoundary=>{
        const captured={...session.core.captureNativeWorldProposalResources(worldBoundary,shield.crop),worldBoundary,nativeShield:pendingShield};
         if(shield.terminalStrike){
           cropExpiry=copyNativeShieldCropExpiry({version:1,worldBoundary,polygonId:pendingShield.polygonId,...shield.terminalStrike});
           return {...captured,nativeShieldCropExpiry:cropExpiry};
         }
         if(supersededStrike){
           const q=nativeAnimalCropState(shield.expiredRequest.actorId);
           if(kind!==4||q?.mode!==1||q.shieldPolygon!==pendingShield.polygonId||q.requestSequence!==shield.expiredRequest.requestSequence||
              q.previousStrike?.attackId!==supersededStrike.attackId||q.previousStrike.ticket!==supersededStrike.ticket)
             throw Error('Shield expiry has another pending protected strike successor');
           cropExpiry=copyNativeShieldCropExpiry({version:1,worldBoundary,actorId:q.actor,bodyId:q.body,targetId:q.target,
             requestSequence:q.requestSequence,polygonId:q.shieldPolygon,attackId:supersededStrike.attackId,strikeTicket:supersededStrike.ticket});
           return {...captured,nativeShieldCropExpiry:cropExpiry};
         }
        const running=kind===4&&shield.crop?nativeAnimalCropState('animal-'+shield.crop.actorId)?.running:undefined;
        cropStop=shield.crop?shieldCropStopFromProposal(captured,shield.crop,running):null;
        return cropStop?{...captured,nativeShieldCropStop:cropStop}:captured;
       },
       ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
       snapshot:(...boundary)=>wasm.spatial_world_proposal_resource_snapshot(...boundary),
       release:(...boundary)=>wasm.spatial_world_proposal_resource_release(...boundary),
       cancel:(...boundary)=>wasm.nav_intent_barrier_proposal_cancel(...boundary)};
    }
    // Only serialization into the authority-owned temporary input buffers.
    return commitNativeWorldProposal(getPublication,()=>{
      if(shield&&shield.validate()!==true)return -2;
      const fp=wasm.spatial_world_proposal_float_ptr(floats.length);if(floats.length&&!fp)throw Error('Native proposal allocation failed');
      if(floats.length)new Float32Array(wasm.memory.buffer,fp,floats.length).set(floats);
      const ip=wasm.spatial_world_proposal_int_ptr(integers.length);if(integers.length&&!ip)throw Error('Native proposal allocation failed');
      if(integers.length)new Int32Array(wasm.memory.buffer,ip,integers.length).set(integers);
      if(shield?.crop){
        const crop=shield.crop,h=crop.routeHandle;
        const {x,z,radius}=pendingShield.spell;
        if(kind===4)return wasm.spatial_shield_crop_expiry_stage(crop.actorId,crop.bodyId,h.slot,h.generation,
          crop.assignmentSequence,crop.worldBoundary.ticket,x,z,radius);
        const owner=[floats.length,crop.actorId,crop.bodyId,h.slot,h.generation,crop.assignmentSequence,crop.worldBoundary.ticket];
        if(shield.protectedApproach)return wasm.spatial_shield_protected_crop_stage_resources(...owner,x,z,radius);
        return wasm.spatial_shield_crop_stage_resources(...owner);
      }
      return (prepareResources?wasm.spatial_world_proposal_stage_resources:wasm.spatial_world_proposal_stage)(kind,mode,floats.length,integers.length);
    },(markCommitted,...boundary)=>{
      if(shield&&shield.validate()!==true)return {status:-2};
      const status=wasm.spatial_world_proposal_commit(...boundary);if(status!==1)return {status};
      // Once native state changed, every failure must still retire the old GPU
      // packet. Never report/release as an aborted physical mutation.
      markCommitted();const count=wasm.spatial_world_proposal_result_count();
      if(!Number.isSafeInteger(count)||count<0||count>8192)throw Error('Invalid native mutation result');
      const ids=Array.from(new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),count));markCommitted({ids});
      if(kind===6||kind===7||kind===11)session.core.adoptNativeResidencyCommit(kind,ids);
      const worldBoundary=nativeWorldBoundary();
      let nativeShield=null;
      if(pendingShield){
        if(ids.length!==1||kind===4&&ids[0]!==pendingShield.polygonId)throw Error('Native shield committed another polygon');
        nativeShield=copyNativeShieldWorld({...pendingShield,polygonId:ids[0]},kind);
        const stopped=shield.crop&&wasm.nav_animal_stopped_shield_crop(shield.crop.actorId);
        if(cropStop){
          if(stopped!==1)throw Error('Native Shield commit lacks its stopped body');
          const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_animal_stopped_shield_crop_ptr(),12));
          const crop=shield.crop;
          if(![crop.actorId,crop.bodyId,crop.targetId,ids[0],worldBoundary.effectiveTime].every((value,i)=>value===row[i])||
             row[9]!==crop.routeHandle.generation||row[10]!==crop.assignmentSequence||row[11]!==crop.worldBoundary.ticket||
             !['x','z','yaw','phase'].every((key,i)=>cropStop[key]===row[5+i]))
            throw Error('Shield stop changed its native crop');
          issuedShieldCropStop={...cropStop,polygonId:ids[0],
            spell:wasm.nav_animal_replan_protected_crop?nativeShield.spell:null};
        }
        if(shield.project({ids,worldBoundary,nativeShield})!==true)throw Error('Native shield Game projection was not synchronous and successful');
        if(kind===4&&(cropStop||shield.expiredRequest)){
          const stop=issuedShieldCropStop,actorId=cropStop?'animal-'+cropStop.actorId:shield.expiredRequest.actorId;
          const animal=owningState.raid?.animals.find(item=>item.id===actorId);
          if(!stop||!animal||stop.actorId!==numericId(actorId)||stop.polygonId!==ids[0]||animal.approachShieldId!==nativeShield.spell.id)
            throw Error('Native Shield expiry lost the protected approach source');
          if(supersededStrike){
            if(wasm.nav_animal_retire_expired_shield_request(stop.actorId,worldBoundary.nativeSession,ids[0],
              shield.expiredRequest.requestSequence)!==1)
              throw Error('Native Shield expiry could not retire the completed strike successor');
            stop.expiredSuccessor=supersededStrike;
            const finished=nativeFinishedAnimalCrop(owningState,animal);
            if(!finished?.shieldExpired||finished.attackId!==supersededStrike.attackId)
              throw Error('Native Shield expiry lost the completed protected impact');
            requestNativeProtectedSuccessor(owningState,animal,finished,shield.nav);
          }else if(shield.expiredRequest){
            const sequence=shield.expiredRequest.requestSequence;
            if(wasm.nav_animal_retire_expired_shield_request(stop.actorId,worldBoundary.nativeSession,ids[0],sequence)!==1)
              throw Error('Native Shield expiry could not retire the pending route');
            stop.replacesRequestSequence=sequence;
          }
          if(!supersededStrike){stop.removed=true;animal.approachShieldId=null;animal.path=null;}
        }
        if(kind===4&&issuedShieldCropStop?.polygonId===ids[0]&&issuedShieldCropStop.spell?.id===nativeShield.spell.id){
          const q=nativeAnimalCropState('animal-'+issuedShieldCropStop.actorId);
          if(q?.mode===3&&q.shieldPolygon===ids[0])issuedShieldCropStop.expiredStrike=q.strike;
        }
        if(cropStop||shield.expiredRequest&&!supersededStrike)
          replanNativeShieldCrop(cropStop?'animal-'+cropStop.actorId:shield.expiredRequest.actorId,shield.nav);
      }
      const published=session.publishNativeWorldResources(committedWorldBoundary);
      const resources=nativeShield?{...published,phase:'committed',worldBoundary,nativeShield}:published;
      if(resources.kind!==kind)throw Error('Native world resource family mismatch');
      if(onNativeWorldResources)onNativeWorldResources({...resources,worldBoundary});
      return {status:1,value:{ids,resources:cropStop?{...resources,nativeShieldCropStop:cropStop}:
        cropExpiry?{...resources,nativeShieldCropExpiry:cropExpiry}:resources}};
    },prepareResources,signal,protocol);
  };
  const stopNativeWorkerRouteAfterGpuQuiescence=(kind,{actorId,getPublication,prepareResources,signal=null,sourceStillCurrent=null}={})=>{
    const {motionKind,source,matches}=workerRouteStops[kind];
    if(typeof prepareResources!=='function')throw TypeError('Native moving stop requires retained prepared resources');
    const binding=source(actorId);if(!binding)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const actor=stopSourceRoute(binding).actorId,current=()=>matches(binding,source(actor))&&(!sourceStillCurrent||sourceStillCurrent());let candidate=null,preparedTicket=null,sourceTicket=null,translation=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind,
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===kind;},
      revalidate(){if(!current())return {status:'stale'};const result=revalidateNativeWorkerRouteStopProposal(kind,sourceTicket);if(result.status==='revalidated'){candidate=result.proposal;sourceTicket=result.ticket;translation=result.timeTranslation;}return result;},
      binding(reference,preparedReference){return nativeWorkerRouteStopBinding(kind,reference,preparedReference,{projection:{version:1,routeEffects:candidate.routeEffects,gateEffects:candidate.gateEffects}});},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),release(session,ticket){wasm.spatial_world_proposal_resource_release?.(session,ticket);},cancel(){if(sourceTicket)cancelNativeWorkerRouteStopProposal(kind,sourceTicket);},
      capture(boundary){candidate=captureNativeWorkerRouteStopProposal(kind,sourceTicket);if(!candidate||!sameNativeWorldBoundary(candidate.worldBoundary,boundary))throw Error('Native moving stop resources unavailable');preparedTicket=sourceTicket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeWorkerRouteStopProposal(kind,actor);if(p.status==='proposed'){sourceTicket=p.ticket;return 1;}return p.status==='busy'?-4:p.status==='blocked'?0:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.spatial_world_proposal_stop_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
      const resources=session.publishNativeWorldResources(committedWorldBoundary);if(resources.kind!==kind)throw Error('Native stop committed another resource family');if(onNativeWorldResources)onNativeWorldResources({...resources,worldBoundary:nativeWorldBoundary()});
      mark({ids:[],resources});return {status:1,value:{ids:[],resources}};
    },prepareResources,signal,protocol);
  };
  const stopNativeIdleStrollAfterGpuQuiescence=options=>stopNativeWorkerRouteAfterGpuQuiescence(12,options);
  const stopNativeFarmArrivalAfterGpuQuiescence=options=>stopNativeWorkerRouteAfterGpuQuiescence(24,options);
  const stopNativeTaskRouteAfterGpuQuiescence=options=>stopNativeWorkerRouteAfterGpuQuiescence(25,options);
  const mutateNativeOverlayAfterGpuQuiescence=mutateNativeWorldAfterGpuQuiescence;
  const readNativeRouteSample=(handle,at,animalRoute)=>{
    if(handle?.authorityEpoch!==epoch()||
       wasm.nav_intent_route_sample(handle.session,handle.slot,handle.generation,at)!==1)return null;
    return decodeMotionSample(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_sample_ptr(),18),animalRoute);
  };
  const sampleNativeRoute=(handle,at)=>readNativeRouteSample(handle,at,!!nativeAnimalRouteBinding(handle));
  // Copy once for a route assignment. This is not a position publication or
  // another solver: native reservation knots define every affine interval.
  const captureNativeRoutePresentation=handle=>{
    const plan=nativeRouteTiming(handle),knots=plan?nativeRouteTimeKnots(handle):null;
    if(!plan||!knots)return null;
    if(knots[0]!==plan.startTime||knots.at(-1)!==plan.endTime||knots.some((at,i)=>!Number.isFinite(at)||i>0&&at<=knots[i-1]))throw Error('Invalid native presentation knots');
    const worldBoundary=copyNativeWorldBoundary(nativeWorldResourceBoundary()),rows=new Float64Array(knots.length*NATIVE_ROUTE_PRESENTATION_WIDTH);
    for(let i=0;i<knots.length;i++){
      const at=knots[i],animalRoute=!!plan.nativeAnimalRoute,pose=readNativeRouteSample(handle,at,animalRoute),right=i+1<knots.length?readNativeRouteSample(handle,at+(knots[i+1]-at)*.5,animalRoute):pose;
      if(!pose||!right)return null;
      const values=[at,pose.x,pose.z,pose.distance,pose.phase,right.yaw,right.firstRemainingPoint,right.arrived?1:0,pose.runPhase??0,pose.walkPhase??0,pose.carryPhase??0,pose.runDistance??0,pose.walkDistance??0,pose.runRemaining??0,right.running?1:0,right.currentSpeed??(right.arrived?0:plan.speed)];
      if(!values.every(Number.isFinite))throw Error('Invalid native presentation sample');rows.set(values,i*NATIVE_ROUTE_PRESENTATION_WIDTH);
    }
    const nativeRoute=Object.freeze({actorId:plan.actorId,assignmentSequence:plan.assignmentSequence,routeHandle:routeHandle(handle.session,handle.slot,handle.generation)});
    if(wasm.nav_gate_route_presentations_version?.()!==1)throw Error('Rebuild native gate presentation service');
    const count=wasm.nav_gate_route_presentations(handle.session,handle.slot,handle.generation);
    if(count<0)throw Error('Native gate presentation unavailable');
    const ids=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count)),gates=ids.map(id=>{
      const entityId=`structure-${id}`,mechanism=nativeGateMechanism(entityId);
      const knots=wasm.nav_gate_route_presentation(handle.session,handle.slot,handle.generation,id);
      if(!mechanism||knots<1||knots>6)throw Error('Native gate presentation curve unavailable');
      const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),21+knots*2));
      if(data[0]!==id||data[1]!==mechanism.mechanism||data[2]!==mechanism.modelId)throw Error('Native gate presentation identity mismatch');
      return copyNativeGatePresentation({kind:'native-gate-presentation',version:1,nativeRoute,gateId:id,entityId,mechanism:data[1],modelId:data[2],
        startTime:plan.startTime,endTime:plan.endTime,rootMatrix:data.slice(5,21),hinge:[data[3],0,data[4]],
        positions:mechanism.positions,leafFlags:mechanism.leafFlags,rows:Float64Array.from(data.slice(21)),authorizedAutonomy:false},
        {nativeRoute,startTime:plan.startTime,endTime:plan.endTime});
    });
    return Object.freeze({kind:'native-route-presentation',version:NATIVE_ROUTE_PRESENTATION_VERSION,rowWidth:NATIVE_ROUTE_PRESENTATION_WIDTH,
      nativeRoute,
      worldBoundary,startTime:plan.startTime,endTime:plan.endTime,motionMode:plan.motionMode??'animal',motionFlags:plan.motionFlags??0,profile:plan.profile,radius:plan.radius,executionScope:plan.executionScope,nativeCrossingAdmitted:plan.nativeCrossingAdmitted===true,authorizedAutonomy:false,rows,gates:Object.freeze(gates)});
  };
  const beginNativeRouteExecution=()=>{
    syncBoundaryTime();const result=wasm.nav_intent_execution_begin();
    return {status:result===1?'started':result===-2?'inactive':result===-4?'world-changed':'incoherent',authorizedAutonomy:false};
  };
  const advanceNativeRouteExecution=at=>{
    // The caller proposes the same logical simulation time, never wall time or
    // a presentation clock. On rejection its simulation transaction must abort.
    if(at!==owningState?.elapsed)throw TypeError('Native execution must use the simulation clock');
    const result=wasm.nav_intent_execution_advance(at);
    return result>=0?{status:'advanced',routes:result,authorizedAutonomy:false}:
      {status:result===-4?'world-changed':result===-1?'invalid-time':
       result===-2?'inactive':result===-5?'paused':'incoherent',authorizedAutonomy:false};
  };
  const commitNativeCausalClock=({rate=1,paused=false}={})=>{
    if(typeof paused!=='boolean'||!Number.isFinite(rate)||rate<=0||rate>1000000)throw TypeError('Invalid native clock policy');
    syncBoundaryTime();if(wasm.nav_intent_clock_version?.()!==1)throw Error('Rebuild native causal clock service');
    const result=wasm.nav_intent_clock_commit(rate,paused?1:0);
    if(result<0)return {status:result===-2?'unexecuted-cohort':'invalid',authorizedAutonomy:false};
    flushNativeIntentControl();return {status:result===1?'committed':'unchanged',clock:nativeCausalClock(),authorizedAutonomy:false};
  };
  const stopNativeRouteExecution=()=>{
    syncBoundaryTime();const count=wasm.nav_intent_execution_stop();
    if(count<0)throw Error('Native execution bindings are incoherent; restore the authority session');
    flushNativeIntentControl();return count;
  };
  const nativeRouteExecution=handle=>{
    if(handle?.authorityEpoch!==epoch()||
       wasm.nav_intent_route_execution(handle.session,handle.slot,handle.generation)!==1)return null;
    return {...decodeMotionSample(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_execution_ptr(),18)),
      executedThrough:wasm.nav_intent_effective_time()};
  };
  const nativeGameExecutionState=()=>{
    if(typeof wasm.nav_intent_game_execution_state==='function')return wasm.nav_intent_game_execution_state();
    if(nativeCausalClock())throw Error('Rebuild native task execution projection');
    return 0;
  };
  const advanceNativeGameExecution=(at,{rate=1}={})=>{
    if(nativeGameExecutionState()!==1||!Number.isFinite(at)||at<owningState.elapsed||!Number.isFinite(rate)||rate<=0||rate>1000000)throw Error('Native task execution cannot advance this game cohort');
    const clock=wasm.nav_intent_clock_commit(rate,0);if(clock<0)throw Error('Native task clock policy rejected');
    // An intent/policy change can commit a watermark at the current time.
    // Deliver it before advancing; the end-of-step watermark cannot replace it.
    if(clock===1)flushNativeIntentControl();
    // No observer runs between the native advance and Game adopting this time.
    // The new watermark is committed only after the same step's semantic work.
    const result=wasm.nav_intent_execution_advance(at);if(result<0)throw Error(`Native task execution rejected: ${result}`);
    return result;
  };
  const nativeTaskExecution=actorId=>{
    const id=typeof actorId==='number'?actorId:numericId(actorId);
    if(wasm.nav_intent_task_execution_version?.()!==1||wasm.nav_intent_task_execution(id)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_task_execution_ptr(),31));
    return Object.freeze({kind:'native-task-execution',version:1,nativeRoute:Object.freeze({actorId:a[1],routeHandle:routeHandle(a[4],a[5],a[6]),assignmentSequence:a[7]}),taskId:a[2],targetId:a[3],bodyId:a[8],executedThrough:a[9],requiresResources:a[10]===1,endpoint:Object.freeze({x:a[11],z:a[12]}),...decodeMotionSample(a.slice(13))});
  };
  const requestNativeTaskActionResources=(actorId,{kind,duration,heading}={})=>{
    const code={harvest:0,initial:1,water:2,crate:3,repair:4}[kind];
    if(code===undefined||!Number.isFinite(duration)||duration<0||!Number.isFinite(heading))throw TypeError('Invalid native task action declaration');
    syncBoundaryTime();return wasm.nav_intent_task_action_request(numericId(actorId),code,duration,heading)===1;
  };
  const taskActionRestoreSource=data=>{
    if(data.length!==8||data[0]!==1||!data.every(Number.isFinite))throw Error('Invalid native restored action source');
    return {sourceRequest:copyNativeTaskActionRestoreReference({kind:'native-task-action-restore-reference',version:1,actorId:data[1],taskId:data[2],targetId:data[3],authorityEpoch:epoch(),nativeSession:data[4],requestSequence:data[5],requestedAt:data[6]}),initialElapsed:data[7]};
  };
  const nativeTaskActionRestoreSource=actorId=>wasm.nav_task_action_restore_source_snapshot?.(actorId)===1?taskActionRestoreSource(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_restore_source_ptr(),8))):null;
  const nativeTaskActionRestoreReferences=()=>{
    if(wasm.nav_task_action_restore_version?.()!==1)return [];
    const count=wasm.nav_task_action_restore_requests_snapshot();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native restored action source count');
    const rows=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_restore_requests_ptr(),count*8));return Array.from({length:count},(_,i)=>taskActionRestoreSource(rows.slice(i*8,i*8+8)).sourceRequest);
  };
  const nativeTaskActionRequest=actorId=>{
    const id=typeof actorId==='number'?actorId:numericId(actorId);
    if(wasm.nav_intent_task_execution_version?.()!==1||wasm.nav_intent_task_action_request_snapshot(id)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_task_action_request_ptr(),14));
    return copyNativeTaskActionRequest({kind:'native-task-action-resource-request',version:1,...(a[6]===0?nativeTaskActionRestoreSource(id):{nativeRoute:{actorId:a[1],routeHandle:routeHandle(a[4],a[5],a[6]),assignmentSequence:a[7]}}),taskId:a[2],targetId:a[3],bodyId:a[8],requestedAt:a[9],actionKind:NATIVE_TASK_ACTION_KINDS[a[10]],duration:a[11],heading:a[12],executedThrough:a[13],authorizedAutonomy:false});
  };
  const taskActionProposalFromHeader=(h,nativeSession,ticketId,restored=null)=>copyNativeTaskActionProposal({kind:'native-task-action-proposal',version:1,ticket:{kind:'native-task-action-proposal-ticket',authorityEpoch:epoch(),session:nativeSession,ticket:ticketId},worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession,ticket:ticketId,effectiveTime:h[15]},request:{kind:'native-task-action-resource-request',version:1,...(restored??{nativeRoute:{actorId:h[1],routeHandle:routeHandle(nativeSession,h[5],h[6]),assignmentSequence:h[7]}}),taskId:h[2],targetId:h[3],bodyId:h[4],requestedAt:h[8],actionKind:NATIVE_TASK_ACTION_KINDS[h[9]],duration:h[10],heading:h[11],executedThrough:h[15],authorizedAutonomy:false},sourceControlSequence:h[21],origin:{x:h[12],z:h[13]},radius:h[14],startTime:h[15],endTime:h[16],runPhase:h[17],walkPhase:h[18],carryPhase:h[19],runRemaining:h[20],profile:h[22],motionFlags:h[23],authorizedAutonomy:false,authorizedConsequences:false});
  const readTaskActionBindings=(count,readRestoredSource=nativeTaskActionRestoreSource)=>{
    if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native action binding count');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_binding_snapshot_ptr(),count*54));
    return Array.from({length:count},(_,i)=>{
      const row=data.slice(i*54,(i+1)*54);if(row[0]!==1||!row.every(Number.isFinite))throw Error('Invalid native action binding data');
      const restored=row[12]===0?readRestoredSource(row[7]):null;
      const reference=nativeTaskActionReferenceFromProposal(taskActionProposalFromHeader(row.slice(30),row[2],row[4],restored)),preparedReference=nativeTaskActionReferenceFromProposal(taskActionProposalFromHeader(row.slice(6,30),row[2],row[3],restored));
      if(row[5]<reference.startTime)throw Error('Native action execution precedes its admission');
      return {binding:copyNativeTaskActionAttestation({kind:'native-task-action-attestation',version:1,projectionVersion:1,actionSequence:row[1],reference,preparedReference}),executedThrough:row[5]};
    });
  };
  const nativeTaskActionBindings=()=>{
    if(wasm.nav_task_action_binding_version?.()!==1)return Object.freeze([]);
    return Object.freeze(readTaskActionBindings(wasm.nav_task_action_bindings_snapshot()).map(row=>row.binding));
  };
  const readTaskAction=actorId=>{
    if(wasm.nav_task_action_binding_version?.()!==1)return null;
    const result=wasm.nav_task_action_binding_snapshot(typeof actorId==='number'?actorId:numericId(actorId));
    if(result<0)throw Error('Native action body is incoherent');return result===1?readTaskActionBindings(1)[0]:null;
  };
  const nativeTaskActionBinding=actorId=>readTaskAction(actorId)?.binding??null;
  const nativeTaskActionExecution=actorId=>{
    const row=readTaskAction(actorId);if(!row)return null;const r=row.binding.reference;
    return Object.freeze({kind:'native-task-action-execution',version:1,binding:row.binding,executedThrough:row.executedThrough,elapsed:row.executedThrough>=r.endTime?r.request.duration:Math.min(r.request.duration,(r.request.initialElapsed??0)+Math.max(0,row.executedThrough-r.startTime)),remaining:Math.max(0,r.endTime-row.executedThrough),completed:row.executedThrough>=r.endTime});
  };
  const captureNativeTaskActionProposal=ticket=>{
    if(ticket?.kind!=='native-task-action-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_task_action_proposal_snapshot(ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_proposal_header_ptr(),24));
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)return null;
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(!h.every(Number.isFinite)||h[0]!==1||h[15]!==t[3]||h[21]!==t[2]||t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!==15||!Number.isInteger(h[9]))throw Error('Invalid native task action draft');
    const restored=wasm.nav_task_action_proposal_restore_source?.(t[0],t[1])===1?taskActionRestoreSource(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_restore_source_ptr(),8))):null;
    return taskActionProposalFromHeader(h,t[0],t[1],restored);
  };
  const prepareNativeTaskActionProposal=value=>{
    const request=copyNativeTaskActionRequest(value),handle=request.nativeRoute?.routeHandle,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    if((request.sourceRequest?.authorityEpoch??handle.authorityEpoch)!==epoch())return outcome('stale');
    if(wasm.nav_task_action_proposal_version?.()!==1)throw Error('Rebuild native task action proposal');
    syncBoundaryTime();flushNativeIntentControl();
    if(!sameNativeTaskActionRequest(request,nativeTaskActionRequest(nativeTaskActionActor(request))))return outcome('stale');
    const result=request.sourceRequest?wasm.nav_task_action_restore_proposal_stage(nativeTaskActionActor(request),request.sourceRequest.nativeSession,request.sourceRequest.requestSequence,request.taskId,request.targetId,request.bodyId,request.requestedAt,NATIVE_TASK_ACTION_KINDS.indexOf(request.actionKind),request.duration,request.initialElapsed,request.heading):wasm.nav_task_action_proposal_stage(nativeTaskActionActor(request),handle.session,handle.slot,handle.generation,request.nativeRoute.assignmentSequence,request.taskId,request.targetId,request.bodyId,request.requestedAt,NATIVE_TASK_ACTION_KINDS.indexOf(request.actionKind),request.duration,request.heading);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===-4?'busy':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native task action proposal lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-task-action-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]});
    try{const proposal=captureNativeTaskActionProposal(ticket);if(!proposal)throw Error('Native task action proposal expired during capture');return outcome('proposed',{proposal});}catch(error){wasm.nav_task_action_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeTaskActionProposal=ticket=>ticket?.kind==='native-task-action-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_task_action_proposal_cancel(ticket.session,ticket.ticket)===1;
  const cancelNativeTaskActionForRaidFlight=task=>{
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)return true;
    const [session,ticket,,,,kind]=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);
    if(kind!==15)return true;
    const request=nativeTaskActionRequest(task.nativeRoute.actorId),ptr=wasm.nav_task_action_proposal_header_ptr();
    if(!request?.nativeRoute||request.taskId!==task.taskId||request.targetId!==task.targetId||
       request.bodyId!==task.bodyId||request.nativeRoute.assignmentSequence!==task.nativeRoute.assignmentSequence||!ptr)return false;
    // The preparation can be older than this tick. Read its identity without
    // asking for a current world snapshot, which would clear a stale proposal.
    const header=Array.from(new Float64Array(wasm.memory.buffer,ptr,24));
    if(header[6]===0)return false;
    const proposal=taskActionProposalFromHeader(header,session,ticket);
    return sameNativeTaskActionRequest(proposal.request,request)&&cancelNativeTaskActionProposal(proposal.ticket);
  };
  const revalidateNativeTaskActionProposal=ticket=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    if(ticket?.kind!=='native-task-action-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_intent_barrier_proposal_ticket()!==1)return outcome('stale');
    const old=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(old[0]!==ticket.session||old[1]!==ticket.ticket||old[5]!==15)return outcome('stale');
    syncBoundaryTime();flushNativeIntentControl();const result=wasm.nav_task_action_proposal_revalidate(ticket.session,ticket.ticket);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===-4?'busy':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native task action revalidation lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),nextTicket=Object.freeze({...ticket,session:t[0],ticket:t[1]});
    try{
      const proposal=captureNativeTaskActionProposal(nextTicket),ptr=wasm.nav_task_action_proposal_time_translation_ptr(t[0],t[1]);
      if(!proposal||!ptr)throw Error('Native task action revalidation evidence unavailable');
      const a=Array.from(new Float64Array(wasm.memory.buffer,ptr,8));
      if(!a.every(Number.isFinite)||a[0]!==1||a[1]!==ticket.ticket||a[2]!==nextTicket.ticket||a[5]!==proposal.startTime||a[6]!==proposal.endTime||![0,1].includes(a[7]))throw Error('Invalid native task action time translation');
      return outcome('revalidated',{proposal,timeTranslation:Object.freeze({kind:'native-task-action-time-translation',version:1,previousTicket:Object.freeze({...ticket}),ticket:nextTicket,previousStartTime:a[3],previousEndTime:a[4],startTime:a[5],endTime:a[6],sameSourceState:a[7]===1,authorizedAutonomy:false,authorizedConsequences:false})});
    }catch(error){wasm.nav_task_action_proposal_cancel(t[0],t[1]);throw error;}
  };
  const prepareNativeRouteMotion=(handle,{radius,urgent=false,flight=false,slow=false,
    carrying=false,recovering=false,incapacitated=false,runRemaining=0,waitForGates=false}={})=>{
    const facts=[urgent,flight,slow,carrying,recovering,incapacitated];
    if(typeof waitForGates!=='boolean'||facts.some(value=>typeof value!=='boolean')||!Number.isFinite(radius)||radius<=0||radius>2||
       !Number.isFinite(runRemaining)||runRemaining<0||runRemaining>1e9)
      throw TypeError('Expected native route motion policy facts');
    if(handle?.authorityEpoch!==epoch())return {status:'stale'};
    syncBoundaryTime();
    const flags=facts.reduce((value,enabled,bit)=>value|(enabled?1<<bit:0),0),
      prepare=waitForGates?wasm.nav_gate_prepare_waiting_route:wasm.nav_intent_route_prepare_motion,
      status=prepare(handle.session,handle.slot,handle.generation,
        radius,flags,runRemaining);
    if(status!==1)return {status:status===-1?'stale':status===-7?
      ({1:'blocked',2:'unknown',3:'unsupported',4:'invalid'}[wasm.nav_intent_timing_rejection()]??'invalid'):'unsupported'};
    const data=new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_timing_ptr(),20),
      replacement=routeHandle(data[13],data[14],data[15]),motionPlan=nativeRouteTiming(replacement);
    flushNativeIntentControl();
    return {status:'prepared',routeHandle:replacement,motionPlan};
  };
  const reserveNativeRoute=(handle,bodyId)=>{
    if(handle?.authorityEpoch!==epoch())return {status:'stale',authorizedAutonomy:false};
    const result=wasm.nav_intent_route_reserve(handle.session,handle.slot,handle.generation,bodyId);
    const status=result===1?'reserved':result===0?'conflict':result===-1?'stale':
      result===-2?'unsupported':result===-3?'body-mismatch':null;
    if(!status)throw Error(`Native route reservation rejected: ${result}`);
    const data=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_route_reservation_result_ptr(),6));
    return {status,authorizedAutonomy:false,...(data[0]?{conflict:{
      kind:data[0]===2?'trajectory':data[0]===3?'bound-body-mutation':'stationary-body',
      bodyId:data[1],actorId:data[2],at:data[3],slot:data[4],generation:data[5]}}:{})};
  };
  const admitNativeGateRoute=(handle,bodyId,{radius,urgent=false,flight=false,slow=false,
    carrying=false,recovering=false,incapacitated=false,runRemaining=0}={})=>{
    const facts=[urgent,flight,slow,carrying,recovering,incapacitated];
    if(facts.some(value=>typeof value!=='boolean')||!Number.isFinite(radius)||radius<=0||radius>2||
       !Number.isSafeInteger(bodyId)||bodyId<0||!Number.isFinite(runRemaining)||runRemaining<0||runRemaining>1e9)
      throw TypeError('Expected native crossing body and motion policy facts');
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(handle?.authorityEpoch!==epoch())return outcome('stale');
    if(wasm.nav_gate_crossing_version?.()!==1)throw Error('Rebuild native gate crossing service');
    syncBoundaryTime();const flags=facts.reduce((value,enabled,bit)=>value|(enabled?1<<bit:0),0),
      result=wasm.nav_gate_admit_route(handle.session,handle.slot,handle.generation,bodyId,radius,flags,runRemaining);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===0?'conflict':
      result===-6?'unknown':result===-8?'blocked':result===-7?
        ({1:'blocked',2:'unknown',3:'unsupported',4:'invalid'}[wasm.nav_intent_timing_rejection()]??'unsupported'):'unsupported');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_timing_ptr(),20)),
      replacement=routeHandle(data[13],data[14],data[15]),motionPlan=nativeRouteTiming(replacement);
    flushNativeIntentControl();return outcome('admitted',{routeHandle:replacement,motionPlan});
  };
  const nativeGateCrossings=gateId=>{
    if(wasm.nav_gate_crossing_version?.()!==1)throw Error('Rebuild native gate crossing service');
    const count=wasm.nav_gate_crossings(numericId(gateId));if(count<0)return null;
    if(!Number.isSafeInteger(count)||count>4096)throw Error('Invalid native gate crossing contract');
    const rows=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count*6));
    return Object.freeze(Array.from({length:count},(_,i)=>Object.freeze({actorId:rows[i*6],bodyId:rows[i*6+1],
      routeHandle:routeHandle(wasm.nav_intent_session(),rows[i*6+2],rows[i*6+3]),from:rows[i*6+4],until:rows[i*6+5]})));
  };
  const nativeSuspendedGateRoute=actorId=>{
    if(wasm.nav_gate_route_suspend_version?.()!==1)throw Error('Rebuild native route suspension service');
    if(wasm.nav_gate_suspended_route(actorId)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_suspended_route_ptr(),27)),
      resumeHandle=routeHandle(a[1],a[2],a[3]),count=a[5];
    if(!Number.isSafeInteger(count)||count<0||count>4096)throw Error('Invalid native retained suffix');
    const pointer=wasm.nav_gate_suspended_points_ptr(a[1],a[2],a[3]);if(!pointer)return null;
    return Object.freeze({actorId:a[0],resumeHandle,suspendedAt:a[4],bodyId:a[6],motionFlags:a[7],radius:a[8],
      remainingPoints:Float32Array.from(new Float32Array(wasm.memory.buffer,pointer,count*2)),
      pose:Object.freeze(decodeMotionSample(a.slice(9))),authorizedAutonomy:false,authorizedPassage:false});
  };
  const suspendNativeGateRoute=handle=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(handle?.authorityEpoch!==epoch())return outcome('stale');
    syncBoundaryTime();
    if(wasm.nav_gate_route_suspend_version?.()!==1)throw Error('Rebuild native route suspension service');
    if(wasm.nav_intent_route_timing(handle.session,handle.slot,handle.generation)!==1)return outcome('stale');
    const actorId=new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_timing_ptr(),20)[1],
      result=wasm.nav_gate_suspend_route(handle.session,handle.slot,handle.generation);
    if(result!==1)return outcome(result===-1?'stale':'unsupported');
    flushNativeIntentControl();return outcome('suspended',{suspendedRoute:nativeSuspendedGateRoute(actorId)});
  };
  const readTaskConsequenceSource=(actor,ticket=0,settlement=false)=>{
    if((settlement?wasm.nav_task_settlement_action_source_snapshot(actor,ticket):wasm.nav_task_consequence_source_snapshot(actor,ticket))!==1)throw Error('Native consequence source unavailable');
    return readTaskActionBindings(1,id=>(settlement?wasm.nav_task_settlement_action_source_restore(id,ticket):wasm.nav_task_consequence_source_restore(id,ticket))===1?taskActionRestoreSource(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_restore_source_ptr(),8))):null)[0].binding;
  };
  // Resource draft only. There is intentionally no predicted assignment log
  // sequence or executable NativeRoutePresentation in this envelope.
  const captureNativeMotionProposal=(ticket,starting=false)=>{
    const home=starting==='home',consequence=starting==='consequence',stroll=starting==='stroll',farm=starting==='farm-arrival';starting=starting===true;
    const prefix=farm?'nav_farm_arrival_route_proposal':stroll?'nav_idle_stroll_proposal':home?'nav_home_route_proposal':consequence?'nav_task_consequence_proposal':starting?'nav_task_start_proposal':'nav_gate_resume_proposal',call=(suffix,...args)=>wasm[prefix+suffix](...args),ticketKind=farm?'native-farm-arrival-route-proposal-ticket':stroll?'native-idle-stroll-proposal-ticket':home?'native-home-route-proposal-ticket':consequence?'native-task-consequence-proposal-ticket':starting?'native-task-start-proposal-ticket':'native-route-resume-proposal-ticket';
    if(ticket?.kind!==ticketKind||ticket.authorityEpoch!==epoch()||call('_snapshot',ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,call('_header_ptr'),24));
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)return null;
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),count=call('_rows',ticket.session,ticket.ticket),pointsCount=call('_points',ticket.session,ticket.ticket);
    if(!h.every(Number.isFinite)||h[0]!==1||h[17]!==2||t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!== (farm?23:stroll?22:home?18:consequence?16:starting?14:13)||h[10]!==t[3]||h[23]!==t[2]||h[11]<h[10]||!Number.isSafeInteger(count)||count<1||count>16385||h[19]!==count||!Number.isSafeInteger(pointsCount)||pointsCount<(farm?0:1)||pointsCount>4096||h[18]!==pointsCount)throw Error('Invalid native motion proposal resource');
    const rows=Float64Array.from(new Float64Array(wasm.memory.buffer,call('_rows_ptr'),count*16)),points=Float32Array.from(new Float32Array(wasm.memory.buffer,call('_points_ptr'),pointsCount*2)),worldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:epoch(),nativeSession:ticket.session,ticket:ticket.ticket,effectiveTime:t[3]});
    if(!rows.every(Number.isFinite)||!points.every(Number.isFinite)||rows[0]!==h[10]||rows.at(-16)!==h[11])throw Error('Invalid native motion proposal samples');
    const gateCount=call('_gates',ticket.session,ticket.ticket);if(!Number.isSafeInteger(gateCount)||gateCount<0||gateCount>4096)throw Error('Invalid native motion proposal gates');
    const ids=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),gateCount)),gates=ids.map(id=>{
      const entityId=`structure-${id}`,mechanism=nativeGateMechanism(entityId),knots=call('_gate',ticket.session,ticket.ticket,id);
      if(!mechanism||knots<1||knots>6)throw Error('Native motion gate curve unavailable');
      const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),21+knots*2));
      if(data[0]!==id||data[1]!==mechanism.mechanism||data[2]!==mechanism.modelId)throw Error('Native motion gate identity mismatch');
      return copyNativeGatePresentation({kind:'native-gate-presentation',version:1,worldBoundary,gateId:id,entityId,mechanism:data[1],modelId:data[2],startTime:h[10],endTime:h[11],rootMatrix:data.slice(5,21),hinge:[data[3],0,data[4]],positions:mechanism.positions,leafFlags:mechanism.leafFlags,rows:Float64Array.from(data.slice(21)),authorizedAutonomy:false},{worldBoundary,startTime:h[10],endTime:h[11]});
    });
    const task=starting?Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_start_proposal_task_ptr(),2)):null;
    const motion={expectedRouteHandle:routeHandle(ticket.session,h[20],h[4]),actorId:h[1],bodyId:h[2],sourceControlSequence:h[23],profile:h[5],motionFlags:h[6],radius:h[7],origin:Object.freeze({x:h[8],z:h[9]}),startTime:h[10],endTime:h[11],distance:h[12],speed:h[13],runDistance:h[14],runSpeed:h[15],runBudget:h[16],motionMode:'worker',rowWidth:16,rows,points,gates:Object.freeze(gates),authorizedAutonomy:false};
    if(stroll){const m=idleStrollSemantic(wasm.nav_idle_stroll_proposal_semantic_ptr());return copyNativeIdleStrollProposal({kind:'native-idle-stroll-proposal',version:1,ticket,worldBoundary,...motion,nativeIdleStroll:idleStrollReference(h,m,ticket.ticket),authorizedPassage:false});}
    if(farm){const sourceRequest=nativeFarmArrivalRouteSourceRequestReference(h[1],ticket.ticket),sourceHeld=sourceRequest&&farmArrivalHeldOrigin(h[1],ticket.ticket,sourceRequest,h[20]);if(!sourceRequest||sourceRequest.requestSequence!==h[21]||sourceRequest.requestedAt!==h[22])throw Error('Native farm arrival proposal lost its exact source');return copyNativeFarmArrivalRouteProposal({kind:'native-farm-arrival-route-proposal',version:1,ticket,worldBoundary,...motion,sourceRequest,...(sourceHeld?{sourceHeld}:{}),destination:points.length?{x:points.at(-2),z:points.at(-1)}:{x:h[8],z:h[9]},authorizedPassage:false});}
    if(home)return copyNativeHomeRouteProposal({kind:'native-home-route-proposal',version:1,ticket,worldBoundary,...motion,...readHomeRouteSource(h[1],ticket.ticket),authorizedPassage:false});
    if(consequence){const effect=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_consequence_proposal_effect_ptr(),8)),sourceAction=readTaskConsequenceSource(h[1],ticket.ticket);if(effect[0]!==1||effect[1]!==sourceAction.reference.request.taskId||effect[2]!==sourceAction.reference.request.targetId||effect[7]!==sourceAction.actionSequence)throw Error('Native consequence source effect mismatch');return copyNativeTaskConsequenceProposal({kind:'native-task-consequence-proposal',version:1,ticket,worldBoundary,...motion,sourceAction,crateId:effect[3],centerId:effect[4],destination:{x:effect[5],z:effect[6]},authorizedConsequences:false});}
    return Object.freeze({kind:starting?'native-task-start-proposal':'native-route-resume-proposal',version:1,ticket,worldBoundary,...(starting?{sourceRequestHandle:Object.freeze({kind:'native-task-route-request-handle',...routeHandle(ticket.session,h[20],h[3])}),requestSequence:h[21],requestedAt:h[22],taskId:task[0],targetId:task[1]}:{sourceResumeHandle:routeHandle(ticket.session,h[20],h[3]),sourceAssignmentSequence:h[21],suspendedAt:h[22]}),...motion,authorizedPassage:false});
  };
  const captureNativeGateResumeProposal=ticket=>captureNativeMotionProposal(ticket);
  const captureNativeTaskStartProposal=ticket=>captureNativeMotionProposal(ticket,true);
  const captureNativeTaskConsequenceProposal=ticket=>captureNativeMotionProposal(ticket,'consequence');
  const captureNativeHomeRouteProposal=ticket=>captureNativeMotionProposal(ticket,'home');
  const captureNativeFarmArrivalRouteProposal=ticket=>captureNativeMotionProposal(ticket,'farm-arrival');
  const prepareNativeGateResumeProposal=resumeHandle=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(resumeHandle?.authorityEpoch!==epoch())return outcome('stale');
    if(wasm.nav_gate_resume_proposal_version?.()!==1)throw Error('Rebuild native resume proposal service');
    syncBoundaryTime();flushNativeIntentControl();const result=wasm.nav_gate_resume_proposal_stage(resumeHandle.session,resumeHandle.slot,resumeHandle.generation);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===-4?'busy':result===0?'conflict':result===-6?'unknown':result===-8?'blocked':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native resume proposal lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-route-resume-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]});
    try{const proposal=captureNativeGateResumeProposal(ticket);if(!proposal)throw Error('Native resume proposal expired during capture');return outcome('proposed',{proposal});}catch(error){wasm.nav_gate_resume_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeGateResumeProposal=ticket=>ticket?.kind==='native-route-resume-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_gate_resume_proposal_cancel(ticket.session,ticket.ticket)===1;
  // Revalidate a late result from its native-owned source identity, never
  // caller-supplied replacement handles. A fresh ticket/data set requires fresh
  // graphical admission; this operation cannot renew the old GPU permission.
  const revalidateNativeMotionProposal=(ticket,starting=false)=>{
    const home=starting==='home',consequence=starting==='consequence',farm=starting==='farm-arrival',mode=starting;starting=starting===true;
    const prefix=farm?'nav_farm_arrival_route_proposal':home?'nav_home_route_proposal':consequence?'nav_task_consequence_proposal':starting?'nav_task_start_proposal':'nav_gate_resume_proposal',call=(suffix,...args)=>wasm[prefix+suffix](...args),ticketKind=farm?'native-farm-arrival-route-proposal-ticket':home?'native-home-route-proposal-ticket':consequence?'native-task-consequence-proposal-ticket':starting?'native-task-start-proposal-ticket':'native-route-resume-proposal-ticket';
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(ticket?.kind!==ticketKind||ticket.authorityEpoch!==epoch()||call('_version')!==1||wasm.nav_intent_barrier_proposal_ticket()!==1)return outcome('stale');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!== (farm?23:home?18:consequence?16:starting?14:13))return outcome('stale');
    if(wasm.nav_gate_resume_revalidation_version?.()!==2)throw Error('Rebuild native resume revalidation service');
    const previousTicket=Object.freeze({kind:ticket.kind,authorityEpoch:ticket.authorityEpoch,session:ticket.session,ticket:ticket.ticket});
    syncBoundaryTime();flushNativeIntentControl();
    const status=call('_revalidate',ticket.session,ticket.ticket);
    if(status!==1)return outcome(status===-1?'stale':status===-3?'body-mismatch':status===-4?'busy':status===0?'conflict':status===-6?'unknown':status===-8?'blocked':'unsupported',{previousTicket});
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native revalidation lost its proposal');
    const current=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),nextTicket=Object.freeze({...previousTicket,session:current[0],ticket:current[1]});
    try{
      const proposal=captureNativeMotionProposal(nextTicket,mode),pointer=call('_time_translation_ptr',current[0],current[1]);
      if(!proposal||!pointer)throw Error('Native time translation evidence unavailable');
      const values=Array.from(new Float64Array(wasm.memory.buffer,pointer,11));
      if(values[0]!==2||values[1]!==ticket.ticket||values[2]!==nextTicket.ticket||values[5]!==proposal.startTime||values[6]!==proposal.endTime||![values[7],values[8],values[9],values[10]].every(value=>value===0||value===1)||!values.every(Number.isFinite))throw Error('Invalid native time translation evidence');
      const timeTranslation=Object.freeze({kind:farm?'native-farm-arrival-route-time-translation':home?'native-home-route-time-translation':consequence?'native-task-consequence-time-translation':starting?'native-task-start-time-translation':'native-resume-time-translation',version:2,previousTicket,ticket:nextTicket,...(farm?{sourceRequest:proposal.sourceRequest}:home?(proposal.sourceRequest?{sourceRequest:proposal.sourceRequest}:{sourceSettlement:proposal.sourceSettlement}):consequence?{sourceAction:proposal.sourceAction,crateId:proposal.crateId,centerId:proposal.centerId}:starting?{sourceRequestHandle:proposal.sourceRequestHandle,requestSequence:proposal.requestSequence}:{sourceResumeHandle:proposal.sourceResumeHandle}),previousStartTime:values[3],previousEndTime:values[4],startTime:values[5],endTime:values[6],sameNativeMotion:values[7]===1,sameNativeGates:values[8]===1,sameFloat32Motion:values[9]===1,sameFloat32Gates:values[10]===1,authorizedAutonomy:false,authorizedPassage:false});
      return outcome('revalidated',{previousTicket,proposal,timeTranslation,requiresResourcePreparation:true});
    }catch(error){call('_cancel',nextTicket.session,nextTicket.ticket);throw error;}
  };
  const revalidateNativeGateResumeProposal=ticket=>revalidateNativeMotionProposal(ticket);
  const revalidateNativeTaskStartProposal=ticket=>revalidateNativeMotionProposal(ticket,true);
  const revalidateNativeTaskConsequenceProposal=ticket=>revalidateNativeMotionProposal(ticket,'consequence');
  const revalidateNativeHomeRouteProposal=ticket=>revalidateNativeMotionProposal(ticket,'home');
  const revalidateNativeFarmArrivalRouteProposal=ticket=>revalidateNativeMotionProposal(ticket,'farm-arrival');
  const prepareNativeTaskStartProposal=(request,{bodyId,radius,urgent=false,flight=false,slow=false,carrying=false,recovering=false,incapacitated=false,runRemaining=0,runPhase=0,walkPhase=0,carryPhase=0}={})=>{
    const facts=[urgent,flight,slow,carrying,recovering,incapacitated],outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra}),handle=request?.requestHandle;
    if(!Number.isSafeInteger(bodyId)||bodyId<=0||!Number.isFinite(radius)||radius<=0||radius>2||facts.some(value=>typeof value!=='boolean')||!Number.isFinite(runRemaining)||runRemaining<0||runRemaining>1e9||[runPhase,walkPhase,carryPhase].some(value=>!Number.isFinite(value)||value<0))throw TypeError('Invalid native task start body or policy');
    if(request?.kind!=='native-task-route-request'||handle?.kind!=='native-task-route-request-handle'||handle.authorityEpoch!==epoch())return outcome('stale');
    if(wasm.nav_task_start_proposal_version?.()!==1||wasm.nav_task_start_proposal_phase_version?.()!==1)throw Error('Rebuild native task start proposal');
    syncBoundaryTime();flushNativeIntentControl();const flags=facts.reduce((value,enabled,bit)=>value|(enabled?1<<bit:0),0),result=wasm.nav_task_start_proposal_stage_with_phases(handle.session,handle.slot,handle.generation,request.requestSequence,bodyId,radius,flags,runRemaining,runPhase,walkPhase,carryPhase);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===-4?'busy':result===0?'conflict':result===-6?'unknown':result===-8?'blocked':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native task start proposal lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-task-start-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]});
    try{const proposal=captureNativeTaskStartProposal(ticket);if(!proposal)throw Error('Native task start proposal expired during capture');return outcome('proposed',{proposal});}catch(error){wasm.nav_task_start_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeTaskStartProposal=ticket=>ticket?.kind==='native-task-start-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_task_start_proposal_cancel(ticket.session,ticket.ticket)===1;
  const prepareNativeTaskConsequenceProposal=(source,{crateId,centerId,destination}={})=>{
    const action=copyNativeTaskActionAttestation(source),actor=nativeTaskActionActor(action.reference.request),world=action.reference.worldBoundary,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    crateId=typeof crateId==='number'?crateId:numericId(crateId);centerId=typeof centerId==='number'?centerId:numericId(centerId);
    if(![crateId,centerId].every(n=>Number.isSafeInteger(n)&&n>0)||![destination?.x,destination?.z].every(Number.isFinite))throw TypeError('Invalid native consequence destination or crate');
    if(world.authorityEpoch!==epoch())return outcome('stale');
    if(wasm.nav_task_consequence_proposal_version?.()!==1)throw Error('Rebuild native task consequences');
    syncBoundaryTime();flushNativeIntentControl();const current=nativeTaskActionExecution(actor);
    if(!current||current.binding.actionSequence!==action.actionSequence||!sameNativeTaskActionRequest(current.binding.reference.request,action.reference.request))return outcome('stale');
    if(!current.completed)return outcome('incomplete');
    const result=wasm.nav_task_consequence_proposal_stage(actor,world.nativeSession,action.actionSequence,crateId,centerId,destination.x,destination.z);
    if(result!==1)return outcome(result===-4?'busy':result===-6?'unknown':result===0?'blocked':result===-1?'stale':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native consequence lost its proposal');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-task-consequence-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]});
    try{const proposal=captureNativeTaskConsequenceProposal(ticket);if(!proposal)throw Error('Native consequence expired during capture');return outcome('proposed',{proposal});}catch(error){wasm.nav_task_consequence_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeTaskConsequenceProposal=ticket=>ticket?.kind==='native-task-consequence-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_task_consequence_proposal_cancel(ticket.session,ticket.ticket)===1;
  const readTaskConsequenceBinding=(actorId,ticket=0,settlement=false)=>{
    if(wasm.nav_task_consequence_proposal_version?.()!==1)return null;
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if((settlement?wasm.nav_task_settlement_source_snapshot(actor,ticket):wasm.nav_task_consequence_binding_snapshot(actor))!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_consequence_binding_ptr(),61));if(a[0]!==1||!a.every(Number.isFinite)||!Number.isSafeInteger(a[60])||a[60]<0||a[60]>1024)throw Error('Invalid native consequence binding');
    const gateIds=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_consequence_binding_ptr()+61*8,a[60])),sourceAction=readTaskConsequenceSource(actor,ticket,settlement),effect=a.slice(52,60);
    if(effect[0]!==1||effect[1]!==sourceAction.reference.request.taskId||effect[2]!==sourceAction.reference.request.targetId||effect[7]!==sourceAction.actionSequence)throw Error('Native consequence effect differs from its source');
    const ref=(h,ticket)=>copyNativeTaskConsequenceReference({kind:'native-task-consequence-reference',version:1,actorId:h[1],bodyId:h[2],sourceAction,crateId:effect[3],centerId:effect[4],destination:{x:effect[5],z:effect[6]},expectedRouteHandle:routeHandle(wasm.nav_intent_session(),h[20],h[4]),sourceControlSequence:h[23],endTime:h[11],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[10]}});
    return copyNativeTaskConsequenceAttestation({kind:'native-task-consequence-attestation',version:1,projectionVersion:1,assignmentSequence:a[1],preparedReference:ref(a.slice(4,28),a[2]),reference:ref(a.slice(28,52),a[3]),gateIds});
  };
  const nativeTaskConsequenceBinding=actorId=>readTaskConsequenceBinding(actorId);
  const nativeDeliveryExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);
    if(wasm.nav_intent_delivery_execution?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_delivery_execution_ptr(),30)),binding=nativeTaskConsequenceBinding(actor);
    if(a[0]!==1||!a.every(Number.isFinite)||!binding||binding.assignmentSequence!==a[8])throw Error('Invalid native delivery execution');
    return Object.freeze({kind:'native-delivery-execution',version:1,actorId:a[1],bodyId:a[2],crateId:a[3],centerId:a[4],nativeRoute:Object.freeze({actorId:a[1],routeHandle:routeHandle(a[5],a[6],a[7]),assignmentSequence:a[8]}),executedThrough:a[9],sourceTaskId:a[10],sourceTargetId:a[11],binding,...decodeMotionSample(a.slice(12))});
  };
  const settlementReference=(h,ticket,sourceCarry)=>copyNativeTaskSettlementReference({kind:'native-task-settlement-reference',version:1,actorId:h[1],bodyId:h[2],crateId:h[3],centerId:h[4],sourceControlSequence:h[6],sourceCarry,
    worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[17]},pose:{x:h[9],z:h[10],yaw:h[11],radius:h[12],runPhase:h[13],walkPhase:h[14],carryPhase:h[15],runRemaining:h[16]},profile:h[18],...(h[21]?{home:{villageId:h[21],x:h[22],z:h[23]}}:{})});
  const captureNativeTaskSettlementProposal=ticket=>{
    if(ticket?.kind!=='native-task-settlement-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_task_settlement_proposal_snapshot?.(ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_settlement_proposal_header_ptr(),24));if(h[0]!==1||!h.every(Number.isFinite))throw Error('Invalid native settlement header');
    const source=readTaskConsequenceBinding(h[1],ticket.ticket,true),nativeSettlement=settlementReference(h,ticket.ticket,source);
    return copyNativeTaskSettlementProposal({kind:'native-task-settlement-proposal',version:1,ticket,worldBoundary:nativeSettlement.worldBoundary,nativeSettlement});
  };
  const prepareNativeTaskSettlementProposal=(source,{home}={})=>{
    if(home!==undefined&&(!home||!Number.isSafeInteger(home.villageId)||home.villageId<=0||![home.x,home.z].every(x=>Number.isFinite(x)&&Math.abs(x)<2147483000)))throw TypeError('Invalid native settlement Home destination');
    const carry=copyNativeTaskConsequenceAttestation(source),r=carry.reference,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    if(r.worldBoundary.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_task_settlement_proposal_version?.()!==2)throw Error('Rebuild native task settlement');
    syncBoundaryTime();flushNativeIntentControl();const current=nativeTaskConsequenceBinding(r.actorId);if(!current||JSON.stringify(current)!==JSON.stringify(carry))return outcome('stale');
    if(home&&wasm.nav_task_settlement_proposal_home_version?.()!==1)throw Error('Rebuild native settlement Home disposition');
    const result=home?wasm.nav_task_settlement_proposal_stage_home(r.actorId,r.worldBoundary.nativeSession,carry.assignmentSequence,home.villageId,home.x,home.z):wasm.nav_task_settlement_proposal_stage(r.actorId,r.worldBoundary.nativeSession,carry.assignmentSequence);if(result!==1)return outcome(result===-4?'busy':result===-2?'unsupported':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native settlement lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-task-settlement-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{return outcome('proposed',{proposal:captureNativeTaskSettlementProposal(ticket)});}catch(error){wasm.nav_task_settlement_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeTaskSettlementProposal=ticket=>ticket?.kind==='native-task-settlement-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_task_settlement_proposal_cancel(ticket.session,ticket.ticket)===1;
  const revalidateNativeTaskSettlementProposal=ticket=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    if(ticket?.kind!=='native-task-settlement-proposal-ticket'||ticket.authorityEpoch!==epoch())return outcome('stale');syncBoundaryTime();flushNativeIntentControl();
    const result=wasm.nav_task_settlement_proposal_revalidate(ticket.session,ticket.ticket);if(result!==1)return outcome(result===-4?'busy':'stale');if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native settlement revalidation lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),next={kind:ticket.kind,authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{const proposal=captureNativeTaskSettlementProposal(next),p=wasm.nav_task_settlement_proposal_time_translation_ptr(next.session,next.ticket);if(!proposal||!p)throw Error('Native settlement revalidation lost its evidence '+JSON.stringify({proposal:!!proposal,pointer:p,next,tuple:t}));const a=Array.from(new Float64Array(wasm.memory.buffer,p,8));if(a[0]!==1||a[1]!==ticket.ticket||a[2]!==next.ticket||a[5]!==proposal.worldBoundary.effectiveTime||!a.every(Number.isFinite)||![0,1].includes(a[7]))throw Error('Invalid native settlement translation');return outcome('revalidated',{proposal,timeTranslation:Object.freeze({kind:'native-task-settlement-time-translation',version:1,previousTicket:ticket,ticket:next,previousStartTime:a[3],startTime:a[5],sameSourceState:a[7]===1})});}catch(error){cancelNativeTaskSettlementProposal(next);throw error;}
  };
  const nativeTaskSettlementBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_task_settlement_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_settlement_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native settlement binding');const source=readTaskConsequenceBinding(actor,0,true);
    return copyNativeTaskSettlementAttestation({kind:'native-task-settlement-attestation',version:1,projectionVersion:1,settlementSequence:a[1],preparedReference:settlementReference(a.slice(4,28),a[2],source),reference:settlementReference(a.slice(28,52),a[3],source)});
  };
  const nativeTaskSettlementBindings=()=>{
    if(wasm.nav_task_settlement_binding_actors===undefined)return Object.freeze([]);const count=wasm.nav_task_settlement_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native settled body count');
    const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_settlement_binding_ptr(),count));return Object.freeze(actors.map(actor=>{const binding=nativeTaskSettlementBinding(actor);if(!binding)throw Error('Native settled body lost its source');return binding;}));
  };
  const nativeSettledWorkerExecution=actorId=>{
    const binding=nativeTaskSettlementBinding(actorId);if(!binding)return null;const r=binding.reference;
    return Object.freeze({kind:'native-settled-worker-execution',version:1,actorId:r.actorId,bodyId:r.bodyId,crateId:r.crateId,centerId:r.centerId,binding,executedThrough:wasm.nav_intent_effective_time(),...r.pose});
  };
  const nativeHomeRequestReference=(actorId,ticket=0)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_home_request_snapshot?.(actor,ticket)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_request_ptr(),19));if(![1,2,3].includes(a[0])||a[1]!==actor||!a.every(Number.isFinite))throw Error('Invalid native Home request snapshot');
    const origin=a[0]===2?{raidSpawnSequence:wasm.nav_home_flight_event(actor,ticket)}:
      a[0]===3?{recoveryHit:wasm.nav_home_recovery_event(actor,ticket)}:{};
    if(a[0]===3){
      const exit=wasm.nav_home_recovery_exit?.(actor,ticket)??RECOVERY_EXIT_SECONDS;
      if(exit!==RECOVERY_EXIT_SECONDS)origin.recoveryExit=exit;
    }
    return copyNativeHomeRequestReference({kind:'native-home-request-reference',version:a[0],...origin,authorityEpoch:epoch(),actorId:a[1],nativeSession:a[2],requestSequence:a[3],requestedAt:a[4],home:{villageId:a[5],x:a[6],z:a[7]},pose:{x:a[8],z:a[9],yaw:a[10],runPhase:a[11],walkPhase:a[12],carryPhase:a[13],runRemaining:a[14],radius:a[17]},profile:a[15],bodyId:a[16],bodyFlags:a[18]});
  };
  const nativeHomeDeclarationReference=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_home_declaration_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_request_ptr(),19));if((a[0]!==1&&a[0]!==2)||a[1]!==actor||!a.every(Number.isFinite)||a[16]!==0||a[17]!==0||a[18]!==0)throw Error('Invalid bodyless native Home declaration');
    const raidSpawnSequence=a[0]===2?wasm.nav_home_flight_event(actor,0):0;
    return copyNativeHomeDeclarationReference({kind:'native-home-declaration-reference',version:a[0],...(raidSpawnSequence?{raidSpawnSequence}:{}),authorityEpoch:epoch(),actorId:a[1],nativeSession:a[2],requestSequence:a[3],requestedAt:a[4],home:{villageId:a[5],x:a[6],z:a[7]},pose:{x:a[8],z:a[9],yaw:a[10],runPhase:a[11],walkPhase:a[12],carryPhase:a[13],runRemaining:a[14]},profile:a[15]});
  };
  const nativeHomeRequestReferences=()=>{
    if(wasm.nav_home_requests_snapshot===undefined)return Object.freeze([]);const count=wasm.nav_home_requests_snapshot();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid pending native Home cohort');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_requests_ptr(),count*19));return Object.freeze(Array.from({length:count},(_,i)=>{const r=nativeHomeRequestReference(data[i*19+1]);if(!r)throw Error('Native Home request lost its physical owner');return r;}));
  };
  const farmArrivalSourceReference=(a,actor,bound)=>{
    if(a[0]!==1||a[1]!==actor||!a.every(Number.isFinite))throw Error('Invalid native farm arrival snapshot');
    return (bound?copyNativeFarmArrivalRequestReference:copyNativeFarmArrivalDeclarationReference)({kind:bound?'native-farm-arrival-request-reference':'native-farm-arrival-declaration-reference',version:a[23]?2:1,...(a[23]?{refugeSequence:a[23]}:{}),authorityEpoch:epoch(),nativeSession:a[2],actorId:a[1],requestSequence:a[3],requestedAt:a[4],centerId:a[5],...(bound?{bodyId:a[6],bodyFlags:a[8]}:{}),profile:a[7],workerProfile:PROFILES[a[17]]?.id,
      pose:{x:a[9],z:a[10],yaw:a[11],...(bound?{radius:a[12]}:{}),runPhase:a[13],walkPhase:a[14],carryPhase:a[15],runRemaining:a[16]},goal:{x:a[18],z:a[19],centerX:a[20],centerZ:a[21],arrivalRadius:a[22]}});
  };
  const readNativeFarmArrivalReference=(actorId,bound)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),snapshot=bound?wasm.nav_farm_arrival_request_snapshot:wasm.nav_farm_arrival_declaration_snapshot;if(snapshot?.(actor)!==1)return null;
    return farmArrivalSourceReference(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_request_ptr(),wasm.nav_intent_return_to_farm?24:23)),actor,bound);
  };
  const nativeFarmArrivalRouteSourceRequestReference=(actorId,ticket=0)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_farm_arrival_route_source_snapshot?.(actor,ticket)!==1)return null;
    return farmArrivalSourceReference(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_request_ptr(),wasm.nav_intent_return_to_farm?24:23)),actor,true);
  };
  const nativeFarmArrivalRequestReference=actor=>readNativeFarmArrivalReference(actor,true),nativeFarmArrivalDeclarationReference=actor=>readNativeFarmArrivalReference(actor,false);
  const nativeFarmArrivalRequestReferences=()=>{
    if(wasm.nav_farm_arrival_requests_snapshot===undefined)return Object.freeze([]);const count=wasm.nav_farm_arrival_requests_snapshot();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native farm arrival cohort');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_requests_ptr(),count*23));return Object.freeze(Array.from({length:count},(_,i)=>{const source=nativeFarmArrivalRequestReference(data[i*23+1]);if(!source)throw Error('Native farm arrival lost its physical owner');return source;}));
  };
  const declareNativeFarmArrivalRequest=(worker,options)=>{
    const semantic=nativeFarmArrivalState(owningState,worker,options);if(wasm.nav_farm_arrival_request_version?.()!==1)throw Error('Rebuild native farm arrival source');
    session.actorSectorRevision({worker:true});syncBoundaryTime();if(wasm.nav_farm_arrival_goal_snapshot?.(numericId(worker.id))!==1)throw Error('Native farm arrival goal unavailable');
    const goal=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_request_ptr(),9));if(goal[0]!==1||!goal.every(Number.isFinite)||goal[1]!==semantic.centerId||goal[7]!==semantic.pose.x||goal[8]!==semantic.pose.z||['x','z','centerX','centerZ','arrivalRadius'].some((key,i)=>goal[i+2]!==semantic.goal[key]))throw Error('Native farm arrival goal or pose differs from Game');
    const declared=options?.retiredSequence?wasm.nav_intent_return_to_farm(wasm.nav_intent_session(),options.retiredSequence,...semantic.args):wasm.nav_intent_request_farm_arrival(...semantic.args);
    if(declared!==1)throw Error('Native farm arrival declaration rejected');
    return {...semantic,request:nativeFarmArrivalRequestReference(worker.id),declaration:nativeFarmArrivalDeclarationReference(worker.id)};
  };
  function takeRefugeReturn(state,endedRaid,event){
    const saved=refuge;
    refuge=null;
    if(!saved||endedRaid!==saved.raid)return null;
    const {worker,issued}=saved,r=issued.reference,home=nativeHomeRouteSource(r.sourceHome.reference).home;
    if(!qualifyFarmFlee||state!==owningState||state.raid||!endedRaid.daytime||state.workers.length!==1||
       state.workers[0]!==worker||worker.status!=='arriving'||worker.raidReturn!==true||worker.nativeRouteAdmission||
       worker.contractDay!==saved.contractDay||worker.centerId!==saved.centerId||contractExpired(worker,state)||
       state.time>=(profileEnd.get(worker.profile)??0)||event?.type!=='RaidEnded'||event.simulationTime!==state.elapsed||
       !state.events.includes(event)||endedRaid.animals.some(a=>a.status!=='gone')||worker.x!==home.x||worker.z!==home.z||
       numericId(worker.villageId)!==home.villageId||r.worldBoundary.authorityEpoch!==epoch()||
       wasm.nav_intent_worker_inactive(r.actorId)!==1||worker.heading!==r.pose.yaw||
       ['runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]!==r.pose[k]))return null;
    return {worker,retiredSequence:issued.retiredSequence,bodyId:r.bodyId};
  }
  const readNativeInitialIdleReference=(actorId,bound,sourceTicket=null)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),snapshot=sourceTicket!==null?value=>wasm.nav_initial_idle_body_source_snapshot?.(value,sourceTicket):bound?wasm.nav_initial_idle_request_snapshot:wasm.nav_initial_idle_declaration_snapshot;if(snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_initial_idle_request_ptr(),25));if(a[0]!==1||a[1]!==actor||!a.every(Number.isFinite))throw Error('Invalid initial native Idle source snapshot');
    const anchorPrefix=['','farm-plant','farm-structure','village'][a[22]],idleState=a[18]===0?null:{anchorId:`${anchorPrefix}-${a[23]}`,mode:a[18]===1?'rest':a[18]===2?'watch':null,elapsed:a[19],remaining:a[20],rng:a[21],approachRetry:a[24]};
    const copy=bound?copyNativeInitialIdleRequestReference:copyNativeInitialIdleDeclarationReference;
    return copy({kind:bound?'native-initial-idle-request-reference':'native-initial-idle-declaration-reference',version:1,authorityEpoch:epoch(),actorId:a[1],nativeSession:a[2],requestSequence:a[3],requestedAt:a[4],centerId:a[5],...(bound?{bodyId:a[6],bodyFlags:a[8]}:{}),profile:a[7],workerProfile:PROFILES[a[17]]?.id,
      pose:{x:a[9],z:a[10],yaw:a[11],...(bound?{radius:a[12]}:{}),runPhase:a[13],walkPhase:a[14],carryPhase:a[15],runRemaining:a[16]},idleState});
  };
  const nativeInitialIdleRequestReference=actorId=>readNativeInitialIdleReference(actorId,true);
  const nativeInitialIdleDeclarationReference=actorId=>readNativeInitialIdleReference(actorId,false);
  const readTaskCancellationSource=actor=>{
    const row=new Float64Array(wasm.memory.buffer,wasm.nav_task_cancellation_source_ptr(),20);
    const [version,phase,actorId,taskId,targetId,nativeSession,sourceSequence,routeSlot,routeGeneration,bodyId,sourceAt,x,z,yaw,radius,runPhase,walkPhase,carryPhase,runRemaining,bodyFlags]=row;
    if(actorId!==actor||nativeSession!==wasm.nav_intent_session())throw Error('Native Task cancellation differs from the current owner');
    return copyNativeTaskCancellationSource({kind:'native-task-cancellation-source',version,phase,actorId,taskId,targetId,nativeSession,sourceSequence,routeSlot,routeGeneration,bodyId,sourceAt,
      pose:{x,z,yaw,radius,runPhase,walkPhase,carryPhase,runRemaining},bodyFlags});
  };
  const nativeTaskCancellationSource=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);
    return wasm.nav_task_cancellation_source_snapshot?.(actor)===1?readTaskCancellationSource(actor):null;
  };
  const nativeTaskCancellationSupported=()=>typeof wasm.nav_task_cancellation_source_snapshot==='function';
  const cancelNativePendingTask=request=>typeof wasm.nav_intent_pending_task_cancellation_snapshot==='function'&&
    wasm.nav_intent_pending_task_cancel(request.actorId,request.requestHandle.session,request.requestSequence)===1;
  const readInitialIdleBodySourceProof=(actor,ticket)=>{
    if(wasm.nav_initial_idle_body_cancellation_source_snapshot?.(actor,ticket)===1)return {cancellationSource:readTaskCancellationSource(actor)};
    let field;
    if(wasm.nav_initial_idle_body_watering_source_snapshot?.(actor,ticket)===1)field='wateringSource';
    else if(wasm.nav_initial_idle_body_center_repair_source_snapshot?.(actor,ticket)===1)field='centerRepairSource';
    else if(wasm.nav_initial_idle_body_wall_repair_source_snapshot?.(actor,ticket)===1)field='wallRepairSource';
    else return {};
    const readRestore=()=>taskActionRestoreSource(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_action_restore_source_ptr(),8)));
    return {[field]:readTaskActionBindings(1,readRestore)[0].binding};
  };
  const initialIdleBodyReference=(h,ticket,sourceRequest,sourceProof)=>{
    if(h.length!==8||h[0]!==1||!h.every(Number.isFinite)||h[3]!==sourceRequest?.requestSequence||h[4]!==sourceRequest.requestedAt)throw Error('Invalid native initial Idle body header');
    return copyNativeInitialIdleBodyReference({kind:'native-initial-idle-body-reference',version:1,actorId:h[1],bodyId:h[2],profile:h[7],sourceControlSequence:h[6],sourceRequest,...sourceProof,
      worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[5]}});
  };
  const captureNativeInitialIdleBodyProposal=ticket=>{
    if(ticket?.kind!=='native-initial-idle-body-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_initial_idle_body_proposal_snapshot?.(ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_initial_idle_body_proposal_header_ptr(),8)),source=readNativeInitialIdleReference(h[1],true,ticket.ticket);
    const nativeInitialIdleBody=initialIdleBodyReference(h,ticket.ticket,source,readInitialIdleBodySourceProof(h[1],ticket.ticket));
    return copyNativeInitialIdleBodyProposal({kind:'native-initial-idle-body-proposal',version:1,ticket,worldBoundary:nativeInitialIdleBody.worldBoundary,nativeInitialIdleBody});
  };
  const prepareInitialIdleBodyProposal=stage=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(wasm.nav_initial_idle_body_proposal_version?.()!==1)throw Error('Rebuild native initial Idle body admission');
    syncBoundaryTime();flushNativeIntentControl();const status=stage();if(status!==1)return outcome(status===-4?'busy':status===-2?'unsupported':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native initial Idle body lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-initial-idle-body-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{return outcome('proposed',{proposal:captureNativeInitialIdleBodyProposal(ticket)});}catch(error){wasm.nav_initial_idle_body_proposal_cancel(t[0],t[1]);throw error;}
  };
  const prepareNativeInitialIdleBodyProposal=value=>{
    const r=copyNativeInitialIdleRequestReference(value);
    return prepareInitialIdleBodyProposal(()=>r.authorityEpoch===epoch()&&JSON.stringify(nativeInitialIdleRequestReference(r.actorId))===JSON.stringify(r)?
      wasm.nav_initial_idle_body_proposal_stage(r.actorId,r.nativeSession,r.requestSequence):-1);
  };
  const cancelNativeInitialIdleBodyProposal=ticket=>ticket?.kind==='native-initial-idle-body-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_initial_idle_body_proposal_cancel(ticket.session,ticket.ticket)===1;
  const revalidateNativeInitialIdleBodyProposal=ticket=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(ticket?.kind!=='native-initial-idle-body-proposal-ticket'||ticket.authorityEpoch!==epoch())return outcome('stale');syncBoundaryTime();flushNativeIntentControl();
    const status=wasm.nav_initial_idle_body_proposal_revalidate(ticket.session,ticket.ticket);if(status!==1)return outcome(status===-4?'busy':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native initial Idle body revalidation lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),next={kind:ticket.kind,authorityEpoch:epoch(),session:t[0],ticket:t[1]},ptr=wasm.nav_initial_idle_body_proposal_time_translation_ptr(t[0],t[1]),a=ptr?Array.from(new Float64Array(wasm.memory.buffer,ptr,8)):null;
    if(!a||a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native initial Idle body translation');
    return outcome('revalidated',{proposal:captureNativeInitialIdleBodyProposal(next),timeTranslation:{version:1,compatible:a[7]===1,preparedTicket:a[1],actualTicket:a[2],preparedStart:a[3],preparedEnd:a[4],actualStart:a[5],actualEnd:a[6],delta:a[5]-a[3]}});
  };
  const nativeInitialIdleBodyBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_initial_idle_body_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_initial_idle_body_binding_ptr(),20));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native initial Idle body binding');
    const source=readNativeInitialIdleReference(actor,true,0),sourceProof=readInitialIdleBodySourceProof(actor,0);
    return copyNativeInitialIdleBodyAttestation({kind:'native-initial-idle-body-attestation',version:1,projectionVersion:1,bodySequence:a[1],preparedReference:initialIdleBodyReference(a.slice(4,12),a[2],source,sourceProof),reference:initialIdleBodyReference(a.slice(12,20),a[3],source,sourceProof)});
  };
  const nativeInitialIdleBodyBindings=()=>{
    if(wasm.nav_initial_idle_body_binding_actors===undefined)return Object.freeze([]);const count=wasm.nav_initial_idle_body_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native initial Idle body cohort');
    const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_initial_idle_body_binding_ptr(),count));return Object.freeze(actors.map(actor=>{const binding=nativeInitialIdleBodyBinding(actor);if(!binding)throw Error('Native initial Idle body lost its owner');return binding;}));
  };
  const idleStrollRequestFromRow=(a,bound=true)=>{
    if(![1,2].includes(a[0])||a.length!==(a[0]===2?30:29)||a[0]===2&&wasm.nav_idle_stroll_restore_state_version?.()!==1||![0,1].includes(a[28])||!a.every(Number.isFinite)||a[2]!==wasm.nav_intent_session())throw Error('Invalid native restored stroll request');
    return (bound?copyNativeIdleStrollRequestReference:copyNativeIdleStrollDeclarationReference)({kind:bound?'native-idle-stroll-request-reference':'native-idle-stroll-declaration-reference',version:a[0],...(a[0]===2?{walkRemaining:a[29]}:{}),authorityEpoch:epoch(),nativeSession:a[2],actorId:a[1],requestSequence:a[3],requestedAt:a[4],centerId:a[5],...(bound?{bodyId:a[6],bodyFlags:a[8]}:{}),profile:a[7],pose:{x:a[9],z:a[10],yaw:a[11],...(bound?{radius:a[12]}:{}),runPhase:a[13],walkPhase:a[14],carryPhase:a[15],runRemaining:a[16]},workerProfile:PROFILES[a[17]]?.id,anchor:{kind:a[18],id:a[19],x:a[20],z:a[21],radius:a[22]},idleSeconds:a[23],walkRng:a[24],approachRetry:a[25],destination:{x:a[26],z:a[27]},...(a[28]===1?{approach:true}:{})});
  };
  const idleStrollRequestRow=()=>{const ptr=wasm.nav_idle_stroll_restore_request_ptr(),schema=new Float64Array(wasm.memory.buffer,ptr,1)[0];if(![1,2].includes(schema)||schema===2&&wasm.nav_idle_stroll_restore_state_version?.()!==1)throw Error('Rebuild native stroll remaining requests');return Array.from(new Float64Array(wasm.memory.buffer,ptr,schema===2?30:29));};
  const readIdleStrollRequest=(actorId,source=false,declaration=false)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),method=declaration?'nav_idle_stroll_restore_declaration_snapshot':source?'nav_idle_stroll_restore_source_snapshot':'nav_idle_stroll_restore_request_snapshot';if(wasm[method]===undefined)return null;
    if(wasm.nav_idle_stroll_restore_version?.()!==2)throw Error('Rebuild native restored stroll requests');if(wasm[method](actor)!==1)return null;
    const value=idleStrollRequestFromRow(idleStrollRequestRow(),!declaration);if(value.actorId!==actor)throw Error('Native restored stroll actor mismatch');return value;
  };
  const nativeIdleStrollRequestReference=actor=>readIdleStrollRequest(actor);
  const readIdleStrollFailedRest=(actor,source)=>{
    if(wasm.nav_idle_stroll_failed_rest_version?.()!==1)throw Error('Rebuild native Idle failed REST source');
    if(!source||!restoredStrollRequestCurrent(source)||wasm.nav_idle_stroll_failed_rest_snapshot(actor,source.nativeSession,source.requestSequence)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_failed_rest_ptr(),9));
    if(a[0]!==1||!a.every(Number.isFinite)||a[1]!==actor||a[2]!==source.nativeSession||a[3]!==source.requestSequence)throw Error('Invalid native Idle failed REST snapshot');
    return copyNativeIdleStrollFailedRestReference({kind:'native-idle-stroll-failed-rest-reference',version:1,sourceRequest:source,observedAt:a[4],topology:a[5],desiredRest:{mode:'rest',elapsed:0,remaining:a[6],rng:a[7],approachRetry:a[8]}});
  };
  const nativeIdleStrollFailedRestReference=actorId=>{
    if(wasm.nav_idle_stroll_failed_rest_version?.()!==1)throw Error('Rebuild native Idle failed REST source');
    const actor=typeof actorId==='number'?actorId:numericId(actorId);syncBoundaryTime();flushNativeIntentControl();return readIdleStrollFailedRest(actor,nativeIdleStrollRequestReference(actor));
  };
  const nativeIdleStrollDeclarationReference=actor=>readIdleStrollRequest(actor,false,true);
  const nativeIdleStrollSourceRequestReference=actor=>readIdleStrollRequest(actor,true);
  const nativeIdleStrollRequestReferences=()=>{
    if(wasm.nav_idle_stroll_restore_requests_snapshot===undefined)return Object.freeze([]);
    if(wasm.nav_idle_stroll_restore_version?.()!==2)throw Error('Rebuild native restored stroll requests');const extended=wasm.nav_idle_stroll_restore_state_version?.()===1,count=extended?wasm.nav_idle_stroll_restore_state_requests_snapshot():wasm.nav_idle_stroll_restore_requests_snapshot(),width=extended?30:29;if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native restored stroll request cohort');
    const rows=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_restore_requests_ptr(),count*width)),values=Array.from({length:count},(_,i)=>{const row=rows.slice(i*width,(i+1)*width);return idleStrollRequestFromRow(row[0]===1?row.slice(0,29):row);});if(new Set(values.map(v=>v.actorId)).size!==count)throw Error('Duplicate native restored stroll actor');return Object.freeze(values);
  };
  const restoredStrollRequestCurrent=request=>{
    const state=owningState,worker=state?.workers.find(w=>numericId(w.id)===request.actorId);if(!worker||contractExpired(worker,state)||state.time>=profileEnd.get(worker.profile)||!sameNativeIdleStrollRequestReference(request,nativeIdleStrollRequestReference(request.actorId)))return false;
    return restoredStrollMatchesWorker(state,worker,request);
  };
  // Read the discriminator inside the legacy bounds before the extra scalar.
  const idleStrollSemantic=ptr=>{
    const schema=new Float64Array(wasm.memory.buffer,ptr,1)[0];
    if(![1,2,3].includes(schema)||schema===2&&wasm.nav_idle_stroll_cycle_approach_version?.()!==1||schema===3&&typeof wasm.nav_idle_stroll_farm_yield_proposal_stage!=='function')throw Error('Rebuild native selected Idle approach decoder');
    return Array.from(new Float64Array(wasm.memory.buffer,ptr,schema===2?21:20));
  };
  const idleStrollReference=(h,m,ticket)=>{
    if(h[0]!==1||![1,2,3].includes(m[0])||m.length!==(m[0]===2?21:20)||!h.every(Number.isFinite)||!m.every(Number.isFinite))throw Error('Invalid native Idle stroll source');const farm=m[1]===0?idleStrollFarmSource(h[1],ticket):null,settlement=m[1]===0?idleStrollSettlementSource(h[1],ticket):null;
    return copyNativeIdleStrollReference({kind:'native-idle-stroll-reference',version:m[0],...(m[0]===2?{walkRemaining:m[20]}:{}),...(farm?{sourceFarm:farm}:settlement?{sourceSettlement:settlement}:m[1]===0?{sourceRequest:nativeIdleStrollSourceRequestReference(h[1])}:{}),actorId:h[1],bodyId:h[2],centerId:m[3],profile:h[5],workerProfile:PROFILES[m[2]]?.id,bodyFlags:m[4],pose:{x:h[8],z:h[9],yaw:m[5],radius:h[7],runPhase:m[6],walkPhase:m[7],carryPhase:m[8],runRemaining:m[9]},anchor:{kind:m[10],id:m[11],x:m[12],z:m[13],radius:m[14]},sourceCycleSequence:m[1],sourceDecisionSequence:h[21],requestedAt:h[22],walkRng:m[15],approachRetry:m[16],idleSeconds:m[17],destination:{x:m[18],z:m[19]},expectedRouteHandle:routeHandle(wasm.nav_intent_session(),h[20],h[4]),sourceControlSequence:h[23],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[10]},endTime:h[11]});
  };
  const captureNativeIdleStrollProposal=ticket=>captureNativeMotionProposal(ticket,'stroll');
  const stageFarmHarvestYield=(actor,source)=>{
    const [reason,body]=new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_reservation_result_ptr(),2);
    if(reason!==1)return 0;
    const a=source.anchor;
    for(const worker of source.state.workers){
      if(worker.status!=='acting'||worker.nativeRouteAdmission!=='native-action'||worker.centerId!==source.worker.centerId)continue;
      const execution=nativeTaskActionExecution(worker.id),action=execution?.binding,request=action?.reference.request;
      if(!execution?.completed||request.bodyId!==body||request.actionKind!=='harvest'||request.targetId!==a.id)continue;
      const harvest=nativeHarvestDeliverySource(numericId(worker.id),action);
      if(!harvest)return 0;
      const {destination}=harvest;
      return wasm.nav_idle_stroll_farm_yield_proposal_stage(actor,wasm.nav_intent_session(),source.sequence,a.id,a.x,a.z,a.radius,source.calibration.idleSeconds,source.body.idleState.rng,numericId(worker.id),action.actionSequence,destination.x,destination.z);
    }
    return 0;
  };
  const prepareNativeIdleStrollProposal=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(wasm.nav_idle_stroll_proposal_version?.()!==1)throw Error('Rebuild native Idle stroll admission');syncBoundaryTime();flushNativeIntentControl();const request=nativeIdleStrollRequestReference(actor),source=request?null:idleCycleSource(actor,true);
    if(request?!restoredStrollRequestCurrent(request):!source?.sourceFarm&&!source?.sourceSettlement&&(!source?.next||source.next.idleState.mode!=='walk'))return outcome('unsupported');
    const selected=source?.next?.approach===true;if(selected&&(wasm.nav_idle_stroll_cycle_approach_version?.()!==1||typeof wasm.nav_idle_stroll_cycle_approach_proposal_stage!=='function'))throw Error('Rebuild native selected Idle approach admission');
    const a=source?.anchor;
    let status=selected?wasm.nav_idle_stroll_cycle_approach_proposal_stage(actor,wasm.nav_intent_session(),source.next.requestSequence):source?.sourceSettlement?wasm.nav_idle_stroll_settlement_proposal_stage?.(actor,wasm.nav_intent_session(),source.sequence,a.kind,a.id,a.x,a.z,a.radius,source.calibration.idleSeconds,source.body.idleState.rng,PROFILES.findIndex(p=>p.id===source.body.workerProfile)):source?.sourceFarm?wasm.nav_idle_stroll_farm_proposal_stage?.(actor,wasm.nav_intent_session(),source.sequence,a.kind,a.id,a.x,a.z,a.radius,source.calibration.idleSeconds,source.body.idleState.rng):wasm.nav_idle_stroll_proposal_stage(actor,wasm.nav_intent_session(),request?.requestSequence??source.next.requestSequence);
    if(status===0&&source?.sourceFarm&&a.kind===1&&typeof wasm.nav_idle_stroll_farm_yield_proposal_stage==='function')status=stageFarmHarvestYield(actor,source);
    if(status!==1)return outcome(status===-4?'busy':status===-6?'unknown':status===-7?'blocked':status===0?'conflict':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Idle stroll lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-idle-stroll-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{const proposal=captureNativeIdleStrollProposal(ticket);if(!proposal||!(request?nativeIdleStrollContinuesRestoredRequest(proposal.nativeIdleStroll,request):source.sourceSettlement?JSON.stringify(proposal.nativeIdleStroll.sourceSettlement)===JSON.stringify(source.body):source.sourceFarm?JSON.stringify(proposal.nativeIdleStroll.sourceFarm)===JSON.stringify(source.body):nativeIdleStrollContinuesNext(proposal.nativeIdleStroll,source.next)))throw Error('Native Idle stroll changed its selected source');return outcome('proposed',{proposal});}catch(error){wasm.nav_idle_stroll_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeIdleStrollProposal=ticket=>ticket?.kind==='native-idle-stroll-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_idle_stroll_proposal_cancel(ticket.session,ticket.ticket)===1;
  const revalidateNativeIdleStrollProposal=ticket=>{
    if(ticket?.kind!=='native-idle-stroll-proposal-ticket'||ticket.authorityEpoch!==epoch())return {status:'stale'};syncBoundaryTime();flushNativeIntentControl();
    if(wasm.nav_intent_barrier_proposal_ticket()===1){const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);if(t[0]===ticket.session&&t[1]===ticket.ticket&&t[5]===22){const h=new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_proposal_header_ptr(),24),request=nativeIdleStrollRequestReference(h[1]);if(request&&!restoredStrollRequestCurrent(request))return {status:'stale'};}}
    const farm=idleStrollFarmSourceFromTicket(ticket);if(farm&&JSON.stringify(idleCycleSource(farm.actorId,true)?.body)!==JSON.stringify(farm))return {status:'stale'};
    const status=wasm.nav_idle_stroll_proposal_revalidate(ticket.session,ticket.ticket);if(status!==1)return {status:status===-4?'busy':status===-6?'unknown':status===-7?'blocked':'stale'};
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Idle stroll revalidation lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),next={kind:ticket.kind,authorityEpoch:epoch(),session:t[0],ticket:t[1]},ptr=wasm.nav_idle_stroll_proposal_time_translation_ptr(t[0],t[1]),a=ptr?Array.from(new Float64Array(wasm.memory.buffer,ptr,11)):null;
    if(!a||a[0]!==2||!a.every(Number.isFinite)||a[1]!==ticket.ticket||a[2]!==next.ticket||a.slice(7).some(v=>v!==0&&v!==1))throw Error('Invalid native Idle stroll translation');
    return {status:'revalidated',proposal:captureNativeIdleStrollProposal(next),timeTranslation:Object.freeze({kind:'native-route-time-translation',version:2,preparedStart:a[3],preparedEnd:a[4],actualStart:a[5],actualEnd:a[6],sameProgram:a[7]===1,sameGateProgram:a[8]===1,sameRelativeProgram:a[9]===1,sameRelativeGateProgram:a[10]===1})};
  };
  const nativeIdleStrollBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_stroll_binding_snapshot?.(actor)!==1)return null;
    const ptr=wasm.nav_idle_stroll_binding_ptr(),m=idleStrollSemantic(ptr+52*8),a=Array.from(new Float64Array(wasm.memory.buffer,ptr,52+m.length));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Idle stroll association');const count=wasm.nav_idle_stroll_binding_gates(actor);if(!Number.isSafeInteger(count)||count<0||count>1024)throw Error('Invalid native Idle stroll gates');const gateIds=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count));
    return copyNativeIdleStrollAttestation({kind:'native-idle-stroll-attestation',version:1,projectionVersion:1,assignmentSequence:a[1],preparedReference:idleStrollReference(a.slice(4,28),m,a[2]),reference:idleStrollReference(a.slice(28,52),m,a[3]),gateIds});
  };
  const nativeIdleStrollBindings=()=>{
    if(!wasm.nav_idle_stroll_binding_actors)return Object.freeze([]);const count=wasm.nav_idle_stroll_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native Idle stroll cohort');const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_binding_ptr(),count));
    return Object.freeze(actors.map(actor=>{const binding=nativeIdleStrollBinding(actor);if(!binding)throw Error('Native Idle stroll lost its physical source');return binding;}));
  };
  const stopSourceRoute=binding=>copyNativeRouteReference(binding.nativeRoute??{actorId:binding.reference.actorId,assignmentSequence:binding.assignmentSequence,routeHandle:binding.reference.expectedRouteHandle});
  const workerRouteStops={
    12:{codec:nativeIdleStrollStopCodec,source:nativeIdleStrollBinding,api:'nav_idle_stroll_stop_proposal',motionKind:'idle-stroll-stop',matches:sameNativeIdleStrollAttestation},
    24:{codec:nativeFarmArrivalStopCodec,source:actor=>nativeFarmArrivalRouteBinding(actor),api:'nav_farm_arrival_stop_proposal',motionKind:'farm-arrival-stop',matches:sameNativeFarmArrivalRouteAttestation},
    25:{codec:nativeTaskRouteStopCodec,source:actor=>{const task=nativeTaskExecution(actor);return task&&!task.arrived?task:null;},api:'nav_task_route_stop_proposal',motionKind:'task-route-stop',
        matches(original,actual){
          if(!actual||original.taskId!==actual.taskId||original.targetId!==actual.targetId||original.bodyId!==actual.bodyId)return false;
          const a=original.nativeRoute,b=actual.nativeRoute;
          return a.actorId===b.actorId&&a.assignmentSequence===b.assignmentSequence&&
            a.routeHandle.authorityEpoch===b.routeHandle.authorityEpoch&&a.routeHandle.session===b.routeHandle.session&&
            a.routeHandle.slot===b.routeHandle.slot&&a.routeHandle.generation===b.routeHandle.generation;
        }},
  };
  const workerRouteStopCodec=kind=>workerRouteStops[kind].codec;
  const workerRouteStopSource=(kind,actor)=>workerRouteStops[kind].source(actor);
  const currentWorkerRouteStopTicket=(kind,ticket)=>{
    if(ticket.authorityEpoch!==epoch()||ticket.session!==wasm.nav_intent_session()||wasm.nav_intent_barrier_proposal_ticket()!==1)return null;
    const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);
    if(t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!==kind)return null;
    if(kind===25){
      const {actorId,routeHandle,assignmentSequence}=ticket.sourceRoute;
      if(wasm.nav_task_route_stop_proposal_source_matches?.(ticket.session,ticket.ticket,actorId,routeHandle.slot,routeHandle.generation,assignmentSequence)!==1)return null;
    }
    return Array.from(t);
  };
  const captureNativeWorkerRouteStopProposal=(kind,value)=>{
    const codec=workerRouteStopCodec(kind);
    const ticket=codec.copyTicket(value),t=currentWorkerRouteStopTicket(kind,ticket);if(!t)return null;
    const binding=workerRouteStopSource(kind,ticket.sourceRoute.actorId);if(!binding||JSON.stringify(stopSourceRoute(binding))!==JSON.stringify(ticket.sourceRoute))return null;
    const worldBoundary={version:1,authorityEpoch:epoch(),nativeSession:t[0],ticket:t[1],effectiveTime:t[3]},resources=session.core.captureNativeWorldProposalResources(worldBoundary),routes=[],gates=[];
    for(let i=0;i<resources.routeEffects.rows.length;i+=26){const r=resources.routeEffects.rows.subarray(i,i+26);routes.push({nativeRoute:{actorId:r[0],assignmentSequence:r[1],routeHandle:{authorityEpoch:epoch(),session:t[0],slot:r[2],generation:r[3]}},bodyId:r[4],state:r[5],resumeGeneration:r[7]});}
    for(let i=0;i<resources.gateEffects.rows.length;i+=3)gates.push({gateId:resources.gateEffects.rows[i],mechanism:resources.gateEffects.rows[i+1]});
    const nativeStop=codec.copyReference({kind:codec.referenceKind,version:1,worldBoundary,sourceRoute:ticket.sourceRoute,routes,gates});
    return codec.copyProposal({...resources,worldBoundary,nativeStop,authorizedAutonomy:false,authorizedPassage:false});
  };
  const cancelNativeWorkerRouteStopProposal=(kind,value)=>{
    const codec=workerRouteStopCodec(kind);
    if(value?.kind!==codec.ticketKind||value.authorityEpoch!==epoch())return false;const ticket=codec.copyTicket(value);
    if(!currentWorkerRouteStopTicket(kind,ticket))return false;
    const cancelled=wasm.nav_intent_barrier_proposal_cancel(ticket.session,ticket.ticket)===1;
    wasm.spatial_world_proposal_resource_release(ticket.session,ticket.ticket);return cancelled;
  };
  const prepareNativeWorkerRouteStopProposal=(kind,actorId)=>{
    const codec=workerRouteStopCodec(kind);
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(typeof wasm.spatial_world_proposal_revalidate_stop!=='function'||typeof wasm.spatial_world_proposal_stop_commit_bound!=='function'||typeof wasm.spatial_world_stop_binding_ptr!=='function'||typeof wasm.spatial_world_stop_source_ptr!=='function'||kind!==12&&wasm[workerRouteStops[kind].api+'_version']?.()!==1||kind===25&&typeof wasm.nav_task_route_stop_proposal_source_matches!=='function'||typeof wasm.nav_intent_stopped_route_matches!=='function')throw Error('Rebuild native moving stop resources');
    syncBoundaryTime();flushNativeIntentControl();const binding=workerRouteStopSource(kind,actorId);if(!binding)return outcome('unsupported');
    const sourceRoute=stopSourceRoute(binding),input=nativeWorkerRouteStopInput(sourceRoute);wasm.spatial_world_proposal_float_ptr(0);const ptr=wasm.spatial_world_proposal_int_ptr(input.length);if(!ptr)throw Error('Native stop proposal allocation failed');new Int32Array(wasm.memory.buffer,ptr,input.length).set(input);
    const status=wasm.spatial_world_proposal_stage_resources(kind,0,0,input.length);if(status!==1)return outcome(status===-4?'busy':status===0?'blocked':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native stop lost its proposal ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=codec.copyTicket({kind:codec.ticketKind,authorityEpoch:epoch(),session:t[0],ticket:t[1],sourceRoute});
    try{const proposal=captureNativeWorkerRouteStopProposal(kind,ticket);if(!proposal)throw Error('Native stop source changed during capture');return outcome('proposed',{proposal,ticket});}catch(error){cancelNativeWorkerRouteStopProposal(kind,ticket);throw error;}
  };
  const revalidateNativeWorkerRouteStopProposal=(kind,value)=>{
    const codec=workerRouteStopCodec(kind);
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(value?.kind!==codec.ticketKind||value.authorityEpoch!==epoch())return outcome('stale');const previous=codec.copyTicket(value);if(!currentWorkerRouteStopTicket(kind,previous))return outcome('stale');syncBoundaryTime();flushNativeIntentControl();
    if(!currentWorkerRouteStopTicket(kind,previous))return outcome('stale');
    const binding=workerRouteStopSource(kind,previous.sourceRoute.actorId);if(!binding||JSON.stringify(stopSourceRoute(binding))!==JSON.stringify(previous.sourceRoute))return outcome('stale');
    const status=wasm.spatial_world_proposal_revalidate_stop(previous.session,previous.ticket);if(status!==1)return outcome(status===-4?'busy':'stale');if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native stop refresh lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=codec.copyTicket({...previous,session:t[0],ticket:t[1]});
    try{
      const ptr=wasm[workerRouteStops[kind].api+'_translation_ptr'](t[0],t[1]),a=ptr?Array.from(new Float64Array(wasm.memory.buffer,ptr,8)):null,proposal=captureNativeWorkerRouteStopProposal(kind,ticket);
      if(!a||a[0]!==1||!a.every(Number.isFinite)||!proposal||!Number.isSafeInteger(a[1])||a[1]<1||a[1]>=a[2]||a[2]!==ticket.ticket||a[3]<0||a[4]<a[3]||a[4]!==proposal.effectiveTime||![0,1].includes(a[5])||a[6]!==proposal.nativeStop.routes.length||a[7]!==proposal.nativeStop.gates.length)throw Error('Invalid native stop refresh receipt');
      return outcome('revalidated',{ticket,proposal,timeTranslation:Object.freeze({kind:codec.translationKind,version:1,preparedTicket:a[1],actualTicket:a[2],preparedAt:a[3],effectiveTime:a[4],sameResourceOwners:a[5]===1,routeCount:a[6],gateCount:a[7]})});
    }catch(error){cancelNativeWorkerRouteStopProposal(kind,ticket);throw error;}
  };
  const nativeWorkerRouteStopBinding=(kind,reference,preparedReference=reference,{projection=null}={})=>{
    const codec=workerRouteStopCodec(kind);
    if(typeof wasm.nav_intent_stopped_route_matches!=='function'||typeof wasm.spatial_world_stop_source_ptr!=='function')throw Error('Rebuild native stopped route identity verification');
    const proof=codec.copyAttestation({kind:codec.attestationKind,version:1,projectionVersion:1,reference,preparedReference}),b=proof.reference.worldBoundary,p=proof.preparedReference.worldBoundary;
    if(b.authorityEpoch!==epoch()||b.nativeSession!==wasm.nav_intent_session())return null;const ptr=wasm.spatial_world_stop_binding_ptr?.();if(!ptr)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,ptr,5));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native stop association');if(a[1]!==p.ticket||a[2]!==p.effectiveTime||a[3]!==b.ticket||a[4]!==b.effectiveTime)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.spatial_world_resource_header_ptr(),9));if(h[0]!==1||h[1]!==b.nativeSession||h[2]!==b.ticket||h[3]!==b.effectiveTime||h[4]!==kind||h[5]!==0)return null;
    const selectedPointer=wasm.spatial_world_stop_source_ptr();if(!selectedPointer)return null;
    const selected=Array.from(new Float64Array(wasm.memory.buffer,selectedPointer,6)),source=proof.reference.sourceRoute,handle=source.routeHandle;
    if(selected[0]!==1||!selected.every(Number.isSafeInteger)||selected[1]!==handle.session||selected[2]!==source.actorId||selected[3]!==handle.slot||selected[4]!==handle.generation||selected[5]!==source.assignmentSequence)return null;
    for(const owner of proof.reference.routes){const h=owner.nativeRoute.routeHandle;if(wasm.nav_intent_stopped_route_matches(owner.nativeRoute.actorId,h.session,h.slot,h.generation,owner.nativeRoute.assignmentSequence,owner.bodyId,owner.state,b.effectiveTime)!==1)return null;if(owner.state===4){const held=nativeSuspendedGateRoute(owner.nativeRoute.actorId),handle=owner.nativeRoute.routeHandle;if(!held||held.bodyId!==owner.bodyId||held.suspendedAt!==b.effectiveTime||held.resumeHandle.session!==handle.session||held.resumeHandle.slot!==handle.slot||held.resumeHandle.generation!==owner.resumeGeneration)return null;}else{if(wasm.nav_intent_actor(owner.nativeRoute.actorId)!==1||new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10)[1]!==0)return null;}}
    for(const g of proof.reference.gates)if(nativeGateMechanismPose(`structure-${g.gateId}`)?.mechanism!==g.mechanism)return null;
    if(projection===null)return proof;
    const values=codec.copyProjection(projection,proof.reference);
    for(let i=0;i<proof.reference.routes.length;i++){
      const owner=proof.reference.routes[i];if(owner.state!==4)return null;
      if(!nativeSuspendedGateRoute(owner.nativeRoute.actorId))return null;
      const actual=new Float64Array(wasm.memory.buffer,wasm.nav_gate_suspended_route_ptr(),27),pose=values.routeEffects.rows.slice(i*26+8,(i+1)*26);
      if(pose.some((value,k)=>value!==actual[k+9]))return null;
    }
    for(let i=0;i<proof.reference.gates.length;i++){const g=proof.reference.gates[i],actual=nativeGateMechanismPose(`structure-${g.gateId}`);if(!actual||actual.opening!==values.gateEffects.rows[i*3+2])return null;}
    return codec.copyAttestation({...proof,projection:values});
  };
  const captureNativeIdleStrollStopProposal=value=>captureNativeWorkerRouteStopProposal(12,value);
  const cancelNativeIdleStrollStopProposal=value=>cancelNativeWorkerRouteStopProposal(12,value);
  const prepareNativeIdleStrollStopProposal=value=>prepareNativeWorkerRouteStopProposal(12,value);
  const revalidateNativeIdleStrollStopProposal=value=>revalidateNativeWorkerRouteStopProposal(12,value);
  const nativeIdleStrollStopBinding=(reference,preparedReference=reference,options={})=>nativeWorkerRouteStopBinding(12,reference,preparedReference,options);
  const captureNativeFarmArrivalStopProposal=value=>captureNativeWorkerRouteStopProposal(24,value);
  const cancelNativeFarmArrivalStopProposal=value=>cancelNativeWorkerRouteStopProposal(24,value);
  const prepareNativeFarmArrivalStopProposal=value=>prepareNativeWorkerRouteStopProposal(24,value);
  const revalidateNativeFarmArrivalStopProposal=value=>revalidateNativeWorkerRouteStopProposal(24,value);
  const nativeFarmArrivalStopBinding=(reference,preparedReference=reference,options={})=>nativeWorkerRouteStopBinding(24,reference,preparedReference,options);
  const captureNativeTaskRouteStopProposal=value=>captureNativeWorkerRouteStopProposal(25,value);
  const cancelNativeTaskRouteStopProposal=value=>cancelNativeWorkerRouteStopProposal(25,value);
  const prepareNativeTaskRouteStopProposal=value=>prepareNativeWorkerRouteStopProposal(25,value);
  const revalidateNativeTaskRouteStopProposal=value=>revalidateNativeWorkerRouteStopProposal(25,value);
  const nativeTaskRouteStopBinding=(reference,preparedReference=reference,options={})=>nativeWorkerRouteStopBinding(25,reference,preparedReference,options);
  const nativeIdleStrollHeldExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);
    if(typeof wasm.nav_idle_stroll_held_execution!=='function'||typeof wasm.nav_idle_stroll_held_source_snapshot!=='function')throw Error('Rebuild native held Idle stroll source');
    if(wasm.nav_idle_stroll_held_execution(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_execution_ptr(),42));
    if(wasm.nav_idle_stroll_held_source_snapshot(actor)!==1)throw Error('Native held Idle stroll lost its source');
    const ptr=wasm.nav_idle_stroll_binding_ptr(),m=idleStrollSemantic(ptr+27*8),b=Array.from(new Float64Array(wasm.memory.buffer,ptr,27+m.length)),r=idleStrollReference(b.slice(3,27),m,b[2]);
    if(a[0]!==1||b[0]!==1||!a.every(Number.isFinite)||!b.every(Number.isFinite)||a[1]!==r.actorId||a[2]!==r.bodyId||a[3]!==r.worldBoundary.nativeSession||a[4]!==r.expectedRouteHandle.slot||a[6]!==b[1]||a[8]!==r.sourceCycleSequence||a[9]!==r.sourceDecisionSequence||a[10]!==r.centerId||PROFILES[a[11]]?.id!==r.workerProfile||a[18]!==0||a[27]!==0||a[28]!==0||a[29]!==2||a[30]!==3||a[36]!==0)throw Error('Invalid native held Idle stroll execution');
    return copyNativeIdleStrollHeldExecution({kind:'native-idle-stroll-held-execution',version:1,actorId:a[1],bodyId:a[2],sourceReference:r,assignmentSequence:b[1],resumeHandle:routeHandle(a[3],a[4],a[5]),suspendedAt:a[19],executedThrough:a[7],pose:{x:a[12],z:a[13],yaw:a[16],radius:r.pose.radius,runPhase:a[21],walkPhase:a[22],carryPhase:a[23],runRemaining:a[26]},walkState:{mode:'walk',rng:a[33],approachRetry:a[34],age:a[35],...(r.version===2?{remaining:a[32]}:{})}});
  };
  const nativeIdleStrollExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_stroll_execution?.(actor)!==1)return null;const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_execution_ptr(),42)),binding=nativeIdleStrollBinding(actor),r=binding?.reference;
    if(a[0]!==1||!a.every(Number.isFinite)||!binding||a[1]!==r.actorId||a[2]!==r.bodyId||a[3]!==r.worldBoundary.nativeSession||a[4]!==r.expectedRouteHandle.slot||a[5]!==r.expectedRouteHandle.generation||a[6]!==binding.assignmentSequence||a[8]!==r.sourceCycleSequence||a[9]!==r.sourceDecisionSequence||a[10]!==r.centerId||PROFILES[a[11]]?.id!==r.workerProfile||![0,1].includes(a[18])||a[30]!==3||a[33]!==r.walkRng||r.version===2&&a[32]!==r.walkRemaining||a[27]!==0||![0,1].includes(a[36])||a[36]===1&&a[18]!==1)throw Error('Invalid native Idle stroll execution');
    return Object.freeze({kind:'native-idle-stroll-execution',version:1,actorId:a[1],bodyId:a[2],binding,executedThrough:a[7],arrived:a[18]===1,distance:a[14],sampledThrough:a[19],pose:Object.freeze({x:a[12],z:a[13],yaw:a[16],radius:r.pose.radius,runPhase:a[21],walkPhase:a[22],carryPhase:a[23],runRemaining:a[26]}),walkState:Object.freeze({mode:'walk',rng:a[33],approachRetry:a[34],age:a[35],...(nativeIdleStrollApproachesAnchor(r)?{remaining:a[32]}:{})}),desiredRest:a[36]===1?Object.freeze({mode:'rest',elapsed:a[37],remaining:a[38],rng:a[39],approachRetry:a[40]}):null});
  };
  const decodeIdleCycleBodySource=(actor,a,ticket=0)=>{
    if(a[0]!==1||![1,17,20,22,23,122].includes(a[1])||!a.every(Number.isFinite)||a[2]!==actor||a[4]!==wasm.nav_intent_session()||![1,2].includes(a[19])||![1,2].includes(a[21]))throw Error('Invalid native Idle current-body source');
    const pose={x:a[11],z:a[12],yaw:a[13],radius:a[14],runPhase:a[15],walkPhase:a[16],carryPhase:a[17],runRemaining:a[18]},idleState={anchorId:`${a[19]===1?'farm-plant':'farm-structure'}-${a[20]}`,mode:a[21]===1?'rest':'watch',elapsed:a[22],remaining:a[23],rng:a[24],approachRetry:a[25]};
    if(a[1]===20){const body=nativeInitialIdleBodyBinding(actor),q=body?.reference.sourceRequest;
      if(!q||body.bodySequence!==a[5]||q.requestedAt!==a[6]||q.bodyId!==a[3]||q.profile!==a[7]||q.workerProfile!==PROFILES[a[8]]?.id||q.centerId!==a[9]||q.bodyFlags!==a[10]||JSON.stringify(q.pose)!==JSON.stringify(pose)||JSON.stringify(q.idleState)!==JSON.stringify(idleState))throw Error('Native Idle initial-body source mismatch');return body;
    }
    let sourceRequest;
    if(a[1]===1){
      if(wasm.nav_idle_cycle_failed_request_version?.()!==1)throw Error('Rebuild native failed Idle origin requests');
      if(wasm.nav_idle_cycle_failed_request_snapshot(actor,ticket)!==1)throw Error('Native failed Idle source lost its original WALK request');
      sourceRequest=idleStrollRequestFromRow(idleStrollRequestRow());
    }
    const kind=a[1]===1?'native-idle-stroll-failed-source':a[1]===17?'native-settled-worker-idle-source':a[1]===23?'native-farm-arrival-idle-source':a[1]===122?'native-idle-stroll-reanchor-source':'native-idle-stroll-arrival-source';
    return copyNativeIdleCycleBodySource({kind,...(sourceRequest?{sourceRequest}:{}),version:1,authorityEpoch:epoch(),nativeSession:a[4],actorId:a[2],bodyId:a[3],bodyFlags:a[10],sourceSequence:a[5],sourceAt:a[6],centerId:a[9],profile:a[7],workerProfile:PROFILES[a[8]]?.id,pose,idleState});
  };
  const idleCycleBodySource=(actor,ticket=0)=>{
    if(wasm.nav_idle_cycle_source_snapshot===undefined)return nativeInitialIdleBodyBinding(actor);
    if(wasm.nav_idle_cycle_source_version?.()!==1)throw Error('Rebuild native Idle current-body source');
    if(wasm.nav_idle_cycle_source_snapshot(actor,ticket)!==1)return null;
    return decodeIdleCycleBodySource(actor,Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_source_ptr(),26)),ticket);
  };
  const idleStrollSettlementSource=(actor,ticket=0)=>{
    if(typeof wasm.nav_idle_stroll_settlement_source_snapshot!=='function'||wasm.nav_idle_stroll_settlement_source_snapshot(actor,ticket)!==1&&(!ticket||wasm.nav_idle_stroll_settlement_source_snapshot(actor,0)!==1))return null;return decodeIdleCycleBodySource(actor,Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_source_ptr(),26)));
  };
  const idleStrollFarmSource=(actor,ticket=0)=>{
    if(typeof wasm.nav_idle_stroll_farm_source_snapshot!=='function'||wasm.nav_idle_stroll_farm_source_snapshot(actor,ticket)!==1&&(!ticket||wasm.nav_idle_stroll_farm_source_snapshot(actor,0)!==1))return null;
    const source=decodeIdleCycleBodySource(actor,Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_source_ptr(),26)));
    if(source.kind!=='native-farm-arrival-idle-source')throw Error('Native Idle approach lost Farm provenance');return source;
  };
  const idleStrollFarmSourceFromTicket=ticket=>{
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)return null;const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!==22)return null;const h=new Float64Array(wasm.memory.buffer,wasm.nav_idle_stroll_proposal_header_ptr(),24);return idleStrollFarmSource(h[1],ticket.ticket)??idleStrollSettlementSource(h[1],ticket.ticket);
  };
  const idleCycleReference=(h,ticket,body)=>{
    const q=nativeIdleCycleBodyState(body);
    if(h[3]!==q.sourceSequence||PROFILES[h[8]]?.id!==q.workerProfile||`${h[9]===1?'farm-plant':'farm-structure'}-${h[10]}`!==q.idleState.anchorId)throw Error('Native Idle cycle header differs from its current body');
    return copyNativeIdleCycleReference({kind:'native-idle-cycle-reference',version:h[0],actorId:h[1],bodyId:h[2],profile:h[7],sourceBody:body,sourceCycleSequence:h[4],sourceControlSequence:h[6],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[5]},anchor:{id:q.idleState.anchorId,x:h[11],z:h[12],radius:h[13]},durations:{rest:h[14],watch:h[15]},initialState:{anchorId:q.idleState.anchorId,mode:h[16]===1?'rest':'watch',elapsed:h[17],remaining:h[18],rng:h[19],approachRetry:h[20]},watchStartOffset:h[21],watchRng:h[22],duration:h[23]});
  };
  const nativeIdleCycleBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_cycle_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_binding_ptr(),52)),body=idleCycleBodySource(actor);if(a[0]!==1||!a.every(Number.isFinite)||!body)throw Error('Invalid native Idle cycle association');
    return copyNativeIdleCycleAttestation({kind:'native-idle-cycle-attestation',version:1,projectionVersion:1,cycleSequence:a[1],preparedReference:idleCycleReference(a.slice(4,28),a[2],body),reference:idleCycleReference(a.slice(28),a[3],body)});
  };
  const nativeIdleCycleNextRequest=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_cycle_next?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_next_ptr(),14));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Idle cycle successor');if(a[3]!==1)return null;
    const sourceCycle=nativeIdleCycleBinding(actor);if(!sourceCycle||sourceCycle.cycleSequence!==a[2]||![1,2,3].includes(a[6]))throw Error('Native Idle cycle successor lost its source');
    const approach=a[6]===3&&wasm.nav_idle_cycle_next_approach?.(actor)===1,idleState={anchorId:sourceCycle.reference.anchor.id,mode:({1:'rest',2:'watch',3:'walk'})[a[6]],elapsed:a[7],remaining:a[8],rng:a[9],approachRetry:a[10],...(a[6]===3?{pathVersion:a[13],destination:{id:approach?sourceCycle.reference.anchor.id:`idle-worker-${actor}`,x:a[11],z:a[12]}}:{})};
    return copyNativeIdleCycleNextRequest({kind:'native-idle-cycle-next-request',version:sourceCycle.reference.version,sourceCycle,requestSequence:a[4],requestedAt:a[5],idleState,...(approach?{approach:true}:{})});
  };
  const nativeIdleCycleBindings=()=>{
    if(wasm.nav_idle_cycle_binding_actors===undefined)return nativeInitialIdleBodyBindings().map(value=>nativeIdleCycleBinding(value.reference.actorId)).filter(Boolean);
    const count=wasm.nav_idle_cycle_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native Idle cycle cohort');const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_binding_ptr(),count));
    if(actors.some(actor=>!Number.isSafeInteger(actor)||actor<=0)||new Set(actors).size!==actors.length)throw Error('Invalid native Idle cycle actor identity');
    return Object.freeze(actors.map(actor=>{const binding=nativeIdleCycleBinding(actor);if(!binding)throw Error('Native Idle cycle lost its current body source');return binding;}));
  };
  const nativeIdleCycleExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_cycle_execution?.(actor)!==1)return null;const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_execution_ptr(),14)),binding=nativeIdleCycleBinding(actor);
    if(a[0]!==1||!a.every(Number.isFinite)||!binding||a[2]!==binding.reference.bodyId||a[3]!==binding.cycleSequence||![1,2].includes(a[5])||![0,1].includes(a[10])||![0,1,-2,-6].includes(a[11])||a[13]!==binding.reference.worldBoundary.effectiveTime+binding.reference.duration)throw Error('Invalid native Idle cycle execution');
    return Object.freeze({kind:'native-idle-cycle-execution',version:1,actorId:a[1],bodyId:a[2],binding,executedThrough:a[4],idleState:Object.freeze({anchorId:binding.reference.anchor.id,mode:a[5]===1?'rest':'watch',elapsed:a[6],remaining:a[7],rng:a[8],approachRetry:a[9]}),finished:a[10]===1,nextStatus:a[11],nextSequence:a[12],endTime:a[13]});
  };
  // Read the genuine stationary owner and original farm anchor. This does
  // not project/advance Game or make a stochastic choice in JavaScript.
  const idleCycleSource=(actor,allowStroll=false)=>{
    const state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||contractExpired(worker,state)||state.time>=PROFILES.find(p=>p.id===worker.profile)?.end)return null;
    try{
      let body,semantic,initial,next=null,sourceStroll=null,sourceFarm=null,sourceFailed=null,sourceSettlement=null,reanchor=null,sequence;const stroll=nativeIdleStrollExecution(actor),farm=nativeFarmArrivalRouteExecution(actor),settled=nativeSettledWorkerExecution(actor);
      if(settled){
        const r=settled.binding.reference,p=r.pose,crate=state.crates.find(c=>c.id===`crate-${r.crateId}`),center=state.structures.find(c=>c.id===worker.centerId);
        if(r.home||settled.executedThrough!==state.elapsed||worker.status!=='idle'||worker.nativeRouteAdmission||worker.taskId||worker.crateId||worker.path!==null||worker.idleState!==null||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false||worker.heading!==p.yaw||!crate?.delivered||crate.carrierId||!center||numericId(center.id)!==r.centerId||['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]!==p[k]))return null;
        const anchor=idleFarmAnchor(state,worker,center),match=/^(farm-plant|farm-structure)-(\d+)$/.exec(anchor.id),calibration=LOCOMOTION.sources.find(c=>c.profile===worker.profile);if(!match||!calibration||typeof wasm.nav_idle_cycle_settlement_source_snapshot!=='function')return null;
        initial=copyNativeInitialIdleState({...createIdleState(worker,anchor,state.seed),approachRetry:0});
        if(wasm.nav_idle_cycle_settlement_source_snapshot(actor,wasm.nav_intent_session(),settled.binding.settlementSequence,match[1]==='farm-plant'?1:2,Number(match[2]),calibration.idleSeconds,initial.rng,PROFILES.findIndex(p=>p.id===worker.profile))!==1)return null;
        body=decodeIdleCycleBodySource(actor,Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_source_ptr(),26)));if(body.kind!=='native-settled-worker-idle-source'||JSON.stringify(body.pose)!==JSON.stringify(p)||JSON.stringify(body.idleState)!==JSON.stringify(initial))return null;
        semantic={pose:p};sourceSettlement=settled.binding;sequence=body.sourceSequence;
      }else if(farm){
        if(!farm.arrived||farm.running||farm.currentSpeed!==0||farm.executedThrough!==state.elapsed||farm.executedThrough<farm.binding.reference.endTime)return null;
        semantic=nativeFarmArrivalTerminalState(state,worker);
        const r=farm.binding.reference,q=r.sourceRequest,anchor=idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId));
        initial=copyNativeInitialIdleState({...createIdleState(worker,anchor,state.seed),approachRetry:0});
        body=copyNativeIdleCycleBodySource({kind:'native-farm-arrival-idle-source',version:1,authorityEpoch:epoch(),nativeSession:r.worldBoundary.nativeSession,actorId:actor,bodyId:r.bodyId,bodyFlags:q.bodyFlags,sourceSequence:farm.binding.assignmentSequence,sourceAt:r.endTime,centerId:q.centerId,profile:q.profile,workerProfile:q.workerProfile,pose:{x:farm.x,z:farm.z,yaw:farm.yaw,radius:q.pose.radius,runPhase:farm.runPhase,walkPhase:farm.walkPhase,carryPhase:farm.carryPhase,runRemaining:farm.runRemaining},idleState:initial});
        sourceFarm=farm.binding;sequence=body.sourceSequence;
      }else if(stroll){
        if(allowStroll||!stroll.arrived||!stroll.desiredRest||stroll.executedThrough!==state.elapsed)return null;
        semantic=nativeIdleStrollLiveState(state,worker);const r=stroll.binding.reference,idle=semantic.idleState,anchorId=`${r.anchor.kind===1?'farm-plant':'farm-structure'}-${r.anchor.id}`;
        if(idle.remaining!==nativeIdleStrollWalkRemaining(r)||idle.anchorId!==anchorId||idle.rng!==stroll.walkState.rng||idle.approachRetry!==stroll.walkState.approachRetry||idle.destination.x!==r.destination.x||idle.destination.z!==r.destination.z)return null;
        reanchor=idleReanchorAfterCrop(state,worker,anchorId);
        const kind=reanchor?'native-idle-stroll-reanchor-source':'native-idle-stroll-arrival-source';
        const idleState=reanchor?{...createIdleState(worker,reanchor,state.seed),approachRetry:0}:{anchorId,...stroll.desiredRest};
        body=copyNativeIdleCycleBodySource({kind,version:1,authorityEpoch:epoch(),nativeSession:r.worldBoundary.nativeSession,actorId:actor,bodyId:r.bodyId,bodyFlags:r.bodyFlags,sourceSequence:stroll.binding.assignmentSequence,sourceAt:r.endTime,centerId:r.centerId,profile:r.profile,workerProfile:r.workerProfile,pose:stroll.pose,idleState});
        sourceStroll=stroll.binding;initial=body.idleState;sequence=body.sourceSequence;
      }else{
        const request=nativeIdleStrollRequestReference(actor);
        if(request){
          if(allowStroll)return null;const failure=readIdleStrollFailedRest(actor,request);if(!failure)return null;
          semantic=restoredStrollGameState(state,worker);const r=failure.sourceRequest,anchorId=`${r.anchor.kind===1?'farm-plant':'farm-structure'}-${r.anchor.id}`;
          body=copyNativeIdleCycleBodySource({kind:'native-idle-stroll-failed-source',version:1,authorityEpoch:r.authorityEpoch,nativeSession:r.nativeSession,actorId:r.actorId,bodyId:r.bodyId,bodyFlags:r.bodyFlags,sourceSequence:r.requestSequence,sourceAt:r.requestedAt,centerId:r.centerId,profile:r.profile,workerProfile:r.workerProfile,pose:r.pose,idleState:{anchorId,...failure.desiredRest},sourceRequest:r});
          sourceFailed=r;initial=body.idleState;sequence=r.requestSequence;
        }else{
          const cycle=nativeIdleCycleExecution(actor);body=cycle?.binding.reference.sourceBody??nativeInitialIdleBodyBinding(actor);if(!body||worker.nativeRouteAdmission!=='native-idle')return null;
          semantic=nativeInitialIdleRetainedState(state,worker,{canonical:true});const q=nativeIdleCycleBodyState(body);
          next=cycle?nativeIdleCycleNextRequest(actor):null;initial=cycle?next?.idleState:q.idleState;
          // A selected semantic successor stays intention while the previous
          // phase executes or holds at its native horizon.
          if(!initial||initial.mode==='walk'&&!allowStroll||cycle&&cycle.executedThrough!==state.elapsed||JSON.stringify(semantic.idleState)!==JSON.stringify(cycle?.idleState??initial))return null;
          sequence=next?.requestSequence??q.sourceSequence;
        }
      }
      const q=nativeIdleCycleBodyState(body);
      if(worker.profile!==q.workerProfile||numericId(worker.centerId)!==q.centerId||Object.entries(semantic.pose).some(([k,v])=>v!==q.pose[k]))return null;
      // Complete the acquired WALK against its own anchor. A newly nearer crop
      // is a future policy choice, not a change to the source of REST21.
      const retainedAnchor=sourceFailed?.anchor??sourceStroll?.reference.anchor;
      const center=state.structures.find(c=>c.id===worker.centerId),anchor=reanchor??(retainedAnchor?{id:initial.anchorId,x:retainedAnchor.x,z:retainedAnchor.z,idleRadius:retainedAnchor.radius}:idleFarmAnchor(state,worker,center)),match=/^(farm-plant|farm-structure|village)-(\d+)$/.exec(anchor.id),calibration=LOCOMOTION.sources.find(c=>c.profile===worker.profile);
      if(!match||anchor.id!==initial.anchorId||!calibration||![anchor.x,anchor.z,anchor.idleRadius].every(Number.isFinite)||allowStroll&&(sourceFarm||sourceSettlement)&&Math.hypot(q.pose.x-anchor.x,q.pose.z-anchor.z)<=anchor.idleRadius)return null;
      return {state,worker,body,next,sourceStroll,sourceFarm,sourceFailed,sourceSettlement,reanchor:!!reanchor,anchor:{kind:['','farm-plant','farm-structure','village'].indexOf(match[1]),id:Number(match[2]),x:anchor.x,z:anchor.z,radius:anchor.idleRadius},sequence,calibration};
    }catch{return null;}
  };
  const sameIdleCycleSource=(a,b)=>!!a&&!!b&&a.state===b.state&&a.worker===b.worker&&JSON.stringify(a.body)===JSON.stringify(b.body)&&JSON.stringify(a.sourceStroll)===JSON.stringify(b.sourceStroll)&&JSON.stringify(a.sourceFarm)===JSON.stringify(b.sourceFarm)&&JSON.stringify(a.sourceSettlement)===JSON.stringify(b.sourceSettlement)&&JSON.stringify(a.sourceFailed)===JSON.stringify(b.sourceFailed)&&(!a.next&&!b.next||sameNativeIdleCycleNextRequest(a.next,b.next))&&JSON.stringify(a.anchor)===JSON.stringify(b.anchor);
  // Arrival keeps its genuine stopped body until its semantic successor is
  // acquired (as NavigationAgent3D separates target_reached and finished).
  // Reuse the existing source/anchor reader; this neither stages nor advances.
  const terminalIdleSource=(actorId,kind)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),source=idleCycleSource(actor);if(!source?.[kind])return null;
    const {body,anchor}=source;
    return Object.freeze({body,anchor:Object.freeze({...anchor}),approach:Math.hypot(body.pose.x-anchor.x,body.pose.z-anchor.z)>anchor.radius});
  };
  const nativeFarmArrivalIdleSource=actorId=>terminalIdleSource(actorId,'sourceFarm');
  const nativeSettlementIdleSource=actorId=>terminalIdleSource(actorId,'sourceSettlement');
  const prepareNativeIdleCycleProposal=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(wasm.nav_idle_cycle_version?.()!==1)throw Error('Rebuild native Idle cycle admission');syncBoundaryTime();flushNativeIntentControl();const source=idleCycleSource(actor);if(!source)return outcome('unsupported');
    if(source.sourceFailed&&(wasm.nav_idle_cycle_failed_rest_version?.()!==1||wasm.nav_idle_cycle_failed_request_version?.()!==1))throw Error('Rebuild native failed Idle cycle admission');
    if(source.sourceFarm&&typeof wasm.nav_idle_cycle_farm_proposal_stage!=='function')throw Error('Rebuild native Farm to Idle cycle admission');
    if(source.sourceSettlement&&typeof wasm.nav_idle_cycle_settlement_proposal_stage!=='function')throw Error('Rebuild native settled Idle cycle admission');
    const a=source.anchor,c=source.calibration,q=nativeIdleCycleBodyState(source.body),initialRetry=source.body.kind==='native-initial-idle-body-attestation'&&Math.hypot(q.pose.x-a.x,q.pose.z-a.z)>a.radius;
    if(initialRetry&&(wasm.nav_idle_cycle_initial_retry_version?.()!==1||typeof wasm.nav_idle_cycle_initial_retry_proposal_stage!=='function'))throw Error('Rebuild native initial Idle retry admission');
    if(source.reanchor&&typeof wasm.nav_idle_cycle_stroll_reanchor_proposal_stage!=='function')throw Error('Rebuild native Idle reanchor admission');
    const args=[actor,wasm.nav_intent_session(),source.sequence,a.kind,a.id,a.x,a.z,a.radius,c.idleSeconds,c.alertSeconds],status=source.reanchor?wasm.nav_idle_cycle_stroll_reanchor_proposal_stage(...args,q.idleState.rng):source.sourceFailed?wasm.nav_idle_cycle_failed_rest_proposal_stage(...args):source.sourceSettlement?wasm.nav_idle_cycle_settlement_proposal_stage(...args,source.body.idleState.rng,PROFILES.findIndex(p=>p.id===source.body.workerProfile)):source.sourceFarm?wasm.nav_idle_cycle_farm_proposal_stage(...args,source.body.idleState.rng):initialRetry?wasm.nav_idle_cycle_initial_retry_proposal_stage(...args):wasm.nav_idle_cycle_proposal_stage(...args);
    if(status!==1)return outcome(status===-4?'busy':status===-2?'unsupported':'stale');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Idle cycle lost its proposal ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-idle-cycle-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{return outcome('proposed',{proposal:captureNativeIdleCycleProposal(ticket)});}catch(error){wasm.nav_idle_cycle_proposal_cancel(t[0],t[1]);throw error;}
  };
  const captureNativeIdleCycleProposal=ticket=>{
    if(ticket?.kind!=='native-idle-cycle-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_idle_cycle_proposal_snapshot(ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_proposal_header_ptr(),24));if(![1,2].includes(h[0])||!h.every(Number.isFinite))throw Error('Invalid native Idle cycle proposal');const body=idleCycleBodySource(h[1],ticket.ticket);if(!body)throw Error('Native Idle cycle lost its current physical source');const nativeIdleCycle=idleCycleReference(h,ticket.ticket,body);
    return copyNativeIdleCycleProposal({kind:'native-idle-cycle-proposal',version:1,ticket,worldBoundary:nativeIdleCycle.worldBoundary,nativeIdleCycle});
  };
  const cancelNativeIdleCycleProposal=ticket=>ticket?.kind==='native-idle-cycle-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_idle_cycle_proposal_cancel(ticket.session,ticket.ticket)===1;
  const revalidateNativeIdleCycleProposal=ticket=>{
    if(ticket?.kind!=='native-idle-cycle-proposal-ticket'||ticket.authorityEpoch!==epoch())return {status:'stale'};syncBoundaryTime();flushNativeIntentControl();const status=wasm.nav_idle_cycle_proposal_revalidate(ticket.session,ticket.ticket);if(status!==1)return {status:status===-4?'busy':'stale'};
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Idle cycle lost its revalidated ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),next={kind:ticket.kind,authorityEpoch:epoch(),session:t[0],ticket:t[1]},a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_idle_cycle_proposal_time_translation_ptr(t[0],t[1]),8));if(a[0]!==1||!a.every(Number.isFinite)||a[1]!==ticket.ticket||a[2]!==next.ticket||![0,1].includes(a[7]))throw Error('Invalid native Idle cycle translation');
    return {status:'revalidated',proposal:captureNativeIdleCycleProposal(next),timeTranslation:Object.freeze({kind:'native-idle-cycle-time-translation',version:1,preparedStart:a[3],preparedEnd:a[4],actualStart:a[5],actualEnd:a[6],compatible:a[7]===1})};
  };
  const nativeInitialIdleBodyState=actorId=>{
    // A timed cycle keeps the physical ancestry, but its private phase is no
    // longer the held initial pose. The old Game consumer must fail closed.
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_idle_cycle_binding_snapshot?.(actor)===1)return null;
    const binding=nativeInitialIdleBodyBinding(actorId);if(!binding)return null;const r=binding.reference,q=r.sourceRequest;
    return {actorId:r.actorId,bodyId:r.bodyId,centerId:q.centerId,binding,executedThrough:wasm.nav_intent_effective_time(),...q.pose,idleState:q.idleState};
  };
  const nativeInitialIdleRequestReferences=()=>{
    if(wasm.nav_initial_idle_requests_snapshot===undefined)return Object.freeze([]);const count=wasm.nav_initial_idle_requests_snapshot();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid initial native Idle request cohort');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_initial_idle_requests_ptr(),count*25));return Object.freeze(Array.from({length:count},(_,i)=>{const r=nativeInitialIdleRequestReference(data[i*25+1]);if(!r)throw Error('Initial native Idle lost its current body');return r;}));
  };
  const declareNativeInitialIdleRequest=(worker,options)=>{
    if(options?.initialize!==undefined&&typeof options.initialize!=='boolean')throw TypeError('Invalid native initial Idle initialization option');
    const declared=nativeInitialIdleDeclaration(owningState,worker,options);
    const initialize=options?.initialize===true&&worker.idleState==null;
    if(initialize&&nativeInitialIdleDeclarationReference(worker.id))throw Error('Native initial Idle initialization requires a fresh declaration');
    const semantic=initialize?nativeInitialIdleInitialization(owningState,worker,idleFarmAnchor(owningState,worker,owningState.structures.find(c=>c.id===worker.centerId)),options):declared;
    if(wasm.nav_initial_idle_request_version?.()!==1)throw Error('Rebuild native initial Idle declaration');
    session.actorSectorRevision({worker:true});syncBoundaryTime();
    if(wasm.nav_intent_request_initial_idle(...semantic.args)!==1)throw Error('Native initial Idle declaration rejected');
    if(initialize)worker.idleState={...semantic.idleState};
    return {...semantic,request:nativeInitialIdleRequestReference(worker.id)};
  };
  const requestNativeIdleHome=(source,home)=>{
    const held=copyNativeTaskSettlementAttestation(source),r=held.reference;
    if(r.home||r.worldBoundary.authorityEpoch!==epoch()||JSON.stringify(nativeTaskSettlementBinding(r.actorId))!==JSON.stringify(held))throw Error('Native Idle Home source is not current');
    if(typeof wasm.nav_intent_idle_home_request!=='function')throw Error('Rebuild native Idle Home request');
    syncBoundaryTime();
    if(wasm.nav_intent_idle_home_request(r.actorId,r.worldBoundary.nativeSession,held.settlementSequence,home.villageId,home.x,home.z)!==1)throw Error('Native Idle Home request rejected');
    const request=nativeHomeRequestReference(r.actorId);if(!request)throw Error('Native Idle Home lost its physical owner');return request;
  };
  const requestNativeIdleStrollHome=(source,home,raidSpawnSequence=0)=>{
    const completed=source?.kind==='native-idle-stroll-execution',held=completed?source:copyNativeIdleStrollHeldExecution(source),actual=completed?nativeIdleStrollExecution(held.actorId):nativeIdleStrollHeldExecution(held.actorId);
    const identity=value=>JSON.stringify({...value,executedThrough:0});
    if(!actual||!Number.isFinite(held.executedThrough)||held.executedThrough>actual.executedThrough||identity(held)!==identity(actual)||completed&&(!actual.arrived||actual.executedThrough<actual.binding.reference.endTime))throw Error('Native Idle stroll Home source is not current');
    if(typeof wasm.nav_intent_idle_stroll_home_request!=='function')throw Error('Rebuild native held Idle stroll Home request');
    syncBoundaryTime();
    const handle=completed?actual.binding.reference.expectedRouteHandle:held.resumeHandle,sequence=completed?actual.binding.assignmentSequence:held.assignmentSequence;
    const args=[held.actorId,handle.session,sequence,handle.generation,home.villageId,home.x,home.z];
    const status=raidSpawnSequence?wasm.nav_intent_idle_stroll_flight_request?.(...args,raidSpawnSequence):wasm.nav_intent_idle_stroll_home_request(...args);
    // An obsolete in-flight stop must settle through its existing controller.
    // Neither a pending proposal nor a peer reservation is ours to revoke here.
    if(completed&&(status===-4||status===0))return null;
    if(status!==1)throw Error('Native Idle stroll Home request rejected');
    const request=nativeHomeRequestReference(held.actorId);if(!(completed?nativeHomeRequestContinuesCompletedIdleStroll:nativeHomeRequestContinuesHeldIdleStroll)(request,held))throw Error('Native Idle stroll Home lost its actual body');return request;
  };
  const requestNativeFarmArrivalHome=(source,home,raidSpawnSequence=0)=>{
    if(['native-farm-arrival-request-reference','native-farm-arrival-declaration-reference'].includes(source?.kind)){
      const bound=source.kind==='native-farm-arrival-request-reference',q=(bound?copyNativeFarmArrivalRequestReference:copyNativeFarmArrivalDeclarationReference)(source),actual=bound?nativeFarmArrivalRequestReference(q.actorId):nativeFarmArrivalDeclarationReference(q.actorId);
      if(q.authorityEpoch!==epoch()||JSON.stringify(actual)!==JSON.stringify(q))throw Error('Native pending Farm Home source is not current');
      if(typeof wasm.nav_intent_pending_farm_home_request!=='function')throw Error('Rebuild native pending Farm Home request');syncBoundaryTime();
      const status=raidSpawnSequence?wasm.nav_intent_farm_flight_request(q.actorId,q.nativeSession,q.requestSequence,0,home.villageId,home.x,home.z,raidSpawnSequence):wasm.nav_intent_pending_farm_home_request(q.actorId,q.nativeSession,q.requestSequence,home.villageId,home.x,home.z);
      if(status!==1)throw Error('Native pending Farm Home request rejected');
      const request=bound?nativeHomeRequestReference(q.actorId):nativeHomeDeclarationReference(q.actorId);if(bound&&!nativeHomeRequestContinuesFarmRequest(request,q))throw Error('Native pending Farm Home lost its actual body');return request;
    }
    const completed=source?.kind==='native-farm-arrival-route-execution',held=completed?source:copyNativeFarmArrivalHeldExecution(source),actual=completed?nativeFarmArrivalRouteExecution(held.actorId):nativeFarmArrivalHeldExecution(held.actorId),identity=value=>JSON.stringify({...value,executedThrough:0});
    if(!actual||!Number.isFinite(held.executedThrough)||held.executedThrough>actual.executedThrough||identity(held)!==identity(actual)||completed&&(!actual.arrived||actual.running||actual.currentSpeed!==0||held.executedThrough<actual.binding.reference.endTime))throw Error('Native Farm Home source is not current');
    if(typeof wasm.nav_intent_farm_arrival_home_request!=='function')throw Error('Rebuild native Farm Home request');
    const handle=completed?actual.binding.reference.expectedRouteHandle:held.resumeHandle,sequence=completed?actual.binding.assignmentSequence:held.assignmentSequence;
    syncBoundaryTime();
    const status=raidSpawnSequence?wasm.nav_intent_farm_flight_request(held.actorId,handle.session,sequence,handle.generation,home.villageId,home.x,home.z,raidSpawnSequence):wasm.nav_intent_farm_arrival_home_request(held.actorId,handle.session,sequence,handle.generation,home.villageId,home.x,home.z);
    // A retained successor can still own the proposal slot at shift end.
    // The producer cancels it at publication, leaving Home to the next tick.
    if(completed&&!raidSpawnSequence&&status===-4)return null;
    if(status!==1)throw Error('Native Farm Home request rejected');
    const request=nativeHomeRequestReference(held.actorId);if(!(completed?nativeHomeRequestContinuesCompletedFarmArrival:nativeHomeRequestContinuesHeldFarmArrival)(request,held))throw Error('Native Farm Home lost its actual body');return request;
  };
  const requestNativeRepairFlight=(source,home,event,repairTicket)=>{
    if(typeof wasm.nav_intent_repair_flight_request!=='function')return null;
    syncBoundaryTime();
    const result=wasm.nav_intent_repair_flight_request(source.actorId,source.nativeSession,source.sourceSequence,home.villageId,home.x,home.z,event,repairTicket);
    if(result!==1)return null;
    const request=nativeHomeRequestReference(source.actorId);
    if(request?.bodyId!==source.bodyId||request.bodyFlags!==source.bodyFlags||Object.keys(source.pose).some(key=>request.pose[key]!==source.pose[key]))throw Error('Repair flight lost its acquired pose');
    return request;
  };
  const requestNativeTaskHomeFromCompletion=(actorId,taskId,targetId,source,home,raidSpawnSequence=0)=>{
    const actor=numericId(actorId),actual=nativeTaskExecution(actor);
    if(!actual||!actual.arrived||actual.running||actual.currentSpeed!==0||actual.executedThrough<actual.at||
       actual.taskId!==numericId(taskId)||actual.targetId!==numericId(targetId)||
       JSON.stringify({...actual,executedThrough:0})!==JSON.stringify({...source,executedThrough:0}))throw Error('Completed Task Home source is not current');
    if(typeof wasm.nav_intent_completed_task_home_request!=='function')throw Error('Rebuild native completed Task Home request');
    syncBoundaryTime();
    const handle=actual.nativeRoute.routeHandle,args=[actor,handle.session,actual.nativeRoute.assignmentSequence,handle.generation,home.villageId,home.x,home.z];
    const result=raidSpawnSequence?wasm.nav_intent_task_flight_request(...args,raidSpawnSequence,0):wasm.nav_intent_completed_task_home_request(...args);
    if(result===-4||result===0)return null;
    if(result!==1)throw Error('Completed Task Home request rejected');
    const request=nativeHomeRequestReference(actor);
    if(!request||request.bodyId!==actual.bodyId||['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>request.pose[key]!==actual[key]))throw Error('Completed Task Home lost its actual pose');
    return request;
  };

  const requestNativeTaskHomeFromStop=(actorId,taskId,targetId,stop,home,raidSpawnSequence=0)=>{
    if(stop?.kind!==nativeTaskRouteStopCodec.attestationKind||stop.version!==1||stop.projectionVersion!==1||!stop.projection)
      throw Error('Native Task stop receipt is required for Home');
    syncBoundaryTime();
    const proof=nativeTaskRouteStopBinding(stop.reference,stop.preparedReference),actor=numericId(actorId);
    if(!proof||proof.reference.sourceRoute.actorId!==actor||!sameNativeWorldBoundary(proof.reference.worldBoundary,nativeWorldBoundary()))
      throw Error('Native Task stop receipt no longer owns the committed body');
    if(wasm.nav_intent_actor(actor)!==1)throw Error('Native Task stop lost its assignment');
    const [,,nativeTask,nativeTarget]=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),4);
    if(nativeTask!==numericId(taskId)||nativeTarget!==numericId(targetId))throw Error('Native Task stop differs from the Game assignment');
    const held=nativeSuspendedGateRoute(actor),handle=held.resumeHandle;
    if(typeof wasm.nav_intent_stopped_task_home_request!=='function')throw Error('Rebuild native Task stop Home request');
    const args=[actor,handle.session,proof.reference.sourceRoute.assignmentSequence,handle.generation,home.villageId,home.x,home.z];
    const status=raidSpawnSequence?wasm.nav_intent_task_flight_request(...args,raidSpawnSequence,1):wasm.nav_intent_stopped_task_home_request(...args);
    if(status!==1)throw Error('Native Task stop Home request rejected');
    const request=nativeHomeRequestReference(actor);
    if(!request||request.bodyId!==held.bodyId||request.pose.radius!==held.radius||
       ['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>request.pose[key]!==held.pose[key]))
      throw Error('Native Task stop Home lost its actual pose');
    return request;
  };
  const requestNativeIdleCycleHome=(source,home,raidSpawnSequence=0)=>{
    const held=copyNativeIdleCycleAttestation(source),r=held.reference;
    if(r.worldBoundary.authorityEpoch!==epoch()||JSON.stringify(nativeIdleCycleBinding(r.actorId))!==JSON.stringify(held))throw Error('Native Idle cycle Home source is not current');
    if(typeof wasm.nav_intent_idle_cycle_home_request!=='function')throw Error('Rebuild native current-cycle Home request');
    syncBoundaryTime();
    const args=[r.actorId,r.worldBoundary.nativeSession,held.cycleSequence,home.villageId,home.x,home.z];
    const status=raidSpawnSequence?wasm.nav_intent_idle_cycle_flight_request?.(...args,raidSpawnSequence):wasm.nav_intent_idle_cycle_home_request(...args);
    if(status!==1)throw Error('Native Idle cycle Home request rejected');
    const request=nativeHomeRequestReference(r.actorId);if(!nativeHomeRequestContinuesIdleCycle(request,held))throw Error('Native Idle cycle Home lost its current body');return request;
  };
  const issueInitialIdleHome=(r,sequence,home,raidSpawnSequence)=>{
    if(typeof wasm.nav_intent_initial_idle_home_request!=='function')throw Error('Rebuild native initial Idle Home request');
    syncBoundaryTime();
    const args=[r.actorId,r.nativeSession,sequence,home.villageId,home.x,home.z];
    const status=raidSpawnSequence?wasm.nav_intent_initial_idle_flight_request?.(...args,raidSpawnSequence):wasm.nav_intent_initial_idle_home_request(...args);
    if(status!==1)throw Error('Native initial Idle Home request rejected');
    const request=nativeHomeRequestReference(r.actorId);
    if(r.bodyId&&!nativeHomeRequestContinuesInitialIdle(request,r))throw Error('Native initial Idle Home lost its physical source');
    return request;
  };
  const requestNativeInitialIdleHome=(source,home,raidSpawnSequence=0)=>{
    const r=(raidSpawnSequence?copyNativeInitialIdleRequestReference:copyNativeInitialIdleDeclarationReference)(source);
    const current=(raidSpawnSequence?nativeInitialIdleRequestReference:nativeInitialIdleDeclarationReference)(r.actorId);
    if(r.authorityEpoch!==epoch()||JSON.stringify(current)!==JSON.stringify(r))throw Error('Native initial Idle Home source is not current');
    return issueInitialIdleHome(r,r.requestSequence,home,raidSpawnSequence);
  };
  const requestNativeRestoredIdleStrollHome=(source,home,raidSpawnSequence=0)=>{
    const declared=source?.kind==='native-idle-stroll-declaration-reference',r=(declared?copyNativeIdleStrollDeclarationReference:copyNativeIdleStrollRequestReference)(source),current=declared?nativeIdleStrollDeclarationReference(r.actorId):nativeIdleStrollRequestReference(r.actorId);
    if(r.authorityEpoch!==epoch()||JSON.stringify(current)!==JSON.stringify(r))throw Error('Native restored stroll Home source is not current');
    if(typeof wasm.nav_intent_restored_idle_stroll_home_request!=='function')throw Error('Rebuild native restored stroll Home');syncBoundaryTime();
    const args=[r.actorId,r.nativeSession,r.requestSequence,home.villageId,home.x,home.z];
    const status=raidSpawnSequence?wasm.nav_intent_pending_idle_stroll_flight_request?.(...args,raidSpawnSequence):wasm.nav_intent_restored_idle_stroll_home_request(...args);
    if(status!==1)throw Error('Native restored stroll Home request rejected');
    const request=nativeHomeRequestReference(r.actorId);
    if(!declared&&!nativeHomeRequestContinuesInitialIdle(request,r))throw Error('Native restored stroll Home lost its physical source');
    return request;
  };
  const requestNativeInitialIdleBodyHome=(source,home,raidSpawnSequence=0)=>{
    const held=copyNativeInitialIdleBodyAttestation(source),r=held.reference;
    if(r.worldBoundary.authorityEpoch!==epoch()||JSON.stringify(nativeInitialIdleBodyBinding(r.actorId))!==JSON.stringify(held))throw Error('Native initial Idle body Home source is not current');
    return issueInitialIdleHome(r.sourceRequest,held.bodySequence,home,raidSpawnSequence);
  };
  const stageFarmArrivalRoute=(actor,sessionId,sequence,flags)=>{
    const stage=qualifyFarmFlee&&wasm.spatial_world_biome()===0?wasm.nav_farm_arrival_route_proposal_stage_savanna:wasm.nav_farm_arrival_route_proposal_stage;
    return stage(actor,sessionId,sequence,flags);
  };
  const prepareNativeFarmArrivalRouteProposal=(value,{urgent=false}={})=>{
    if(typeof urgent!=='boolean')throw TypeError('Invalid native farm arrival urgency');
    const source=copyNativeFarmArrivalRequestReference(value),outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(source.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_farm_arrival_route_proposal_version?.()!==1)throw Error('Rebuild native farm arrival route admission');
    syncBoundaryTime();flushNativeIntentControl();if(!sameNativeFarmArrivalRequestReference(source,nativeFarmArrivalRequestReference(source.actorId)))return outcome('stale');
    const status=stageFarmArrivalRoute(source.actorId,source.nativeSession,source.requestSequence,urgent?1:0);if(status!==1)return outcome(status===-4?'busy':status===-6?'unknown':status===0?'conflict':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native farm arrival lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-farm-arrival-route-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]});
    try{const proposal=captureNativeFarmArrivalRouteProposal(ticket);if(!proposal)throw Error('Native farm arrival expired during capture');return outcome('proposed',{proposal});}catch(error){wasm.nav_farm_arrival_route_proposal_cancel(t[0],t[1]);throw error;}
  };
  const prepareNativeFarmArrivalContinuationProposal=value=>{
    const source=copyNativeFarmArrivalHeldExecution(value),outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(source.resumeHandle.authorityEpoch!==epoch())return outcome('stale');
    if(typeof wasm.nav_farm_arrival_route_held_origin_snapshot!=='function')throw Error('Rebuild native Farm continuation');
    syncBoundaryTime();flushNativeIntentControl();const actual=nativeFarmArrivalHeldExecution(source.actorId),identity=v=>JSON.stringify({...v,executedThrough:0});
    if(!actual||source.executedThrough>actual.executedThrough||identity(actual)!==identity(source))return outcome('stale');
    const q=source.sourceReference.sourceRequest,status=stageFarmArrivalRoute(source.actorId,q.nativeSession,q.requestSequence,source.sourceReference.motionFlags);
    if(status!==1)return outcome(status===-4?'busy':status===-6?'unknown':status===0?'conflict':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Farm continuation lost its ticket');
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket=Object.freeze({kind:'native-farm-arrival-route-proposal-ticket',authorityEpoch:epoch(),session:a[0],ticket:a[1]});
    try{const proposal=captureNativeFarmArrivalRouteProposal(ticket);if(!proposal?.sourceHeld)throw Error('Native Farm continuation lost its stopped source');return outcome('proposed',{proposal});}catch(error){wasm.nav_farm_arrival_route_proposal_cancel(a[0],a[1]);throw error;}
  };
  const cancelNativeFarmArrivalRouteProposal=ticket=>ticket?.kind==='native-farm-arrival-route-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_farm_arrival_route_proposal_cancel?.(ticket.session,ticket.ticket)===1;
  const farmArrivalHeldOrigin=(actor,ticket,sourceRequest,slot)=>{
    if(wasm.nav_farm_arrival_route_held_origin_snapshot?.(actor,ticket)!==1)return undefined;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_farm_arrival_execution_ptr(),12));
    if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Farm continuation origin');
    return {kind:'native-farm-arrival-held-source',version:1,sourceSequence:a[1],resumeHandle:routeHandle(sourceRequest.nativeSession,slot,a[2]),suspendedAt:a[3],pose:{x:a[4],z:a[5],yaw:a[6],radius:a[7],runPhase:a[8],walkPhase:a[9],carryPhase:a[10],runRemaining:a[11]}};
  };
  const farmArrivalRouteReference=(h,ticket,sourceRequest,destination,sourceHeld)=>{
    const p=sourceHeld?.pose??sourceRequest.pose;if(h[0]!==1||h[17]!==2||h[1]!==sourceRequest.actorId||h[2]!==sourceRequest.bodyId||h[5]!==sourceRequest.profile||h[7]!==p.radius||h[8]!==p.x||h[9]!==p.z||h[16]!==p.runRemaining||h[18]!==destination[3]||h[21]!==sourceRequest.requestSequence||h[22]!==sourceRequest.requestedAt)throw Error('Native farm arrival header differs from its source');
    return copyNativeFarmArrivalRouteReference({kind:'native-farm-arrival-route-reference',version:1,actorId:h[1],bodyId:h[2],sourceRequest,...(sourceHeld?{sourceHeld}:{}),destination:{x:destination[1],z:destination[2]},motionFlags:h[6],distance:h[12],expectedRouteHandle:routeHandle(sourceRequest.nativeSession,h[20],h[4]),sourceControlSequence:h[23],endTime:h[11],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:sourceRequest.nativeSession,ticket,effectiveTime:h[10]}});
  };
  const nativeFarmArrivalRouteBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_farm_arrival_route_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_route_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native farm arrival binding');
    const source=nativeFarmArrivalRouteSourceRequestReference(actor);if(!source)throw Error('Native farm arrival binding lost its source');if(wasm.nav_farm_arrival_route_destination_snapshot?.(actor)!==1)throw Error('Native farm arrival endpoint unavailable');const destination=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_farm_arrival_execution_ptr(),4));if(destination[0]!==1||!destination.every(Number.isFinite)||!Number.isSafeInteger(destination[3])||destination[3]<0||destination[3]>4096)throw Error('Invalid native farm arrival endpoint');
    const sourceHeld=farmArrivalHeldOrigin(actor,0,source,a[24]);
    const count=wasm.nav_farm_arrival_route_binding_gates(actor);if(!Number.isSafeInteger(count)||count<0||count>1024)throw Error('Invalid native farm arrival gates');const gateIds=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count));
    return copyNativeFarmArrivalRouteAttestation({kind:'native-farm-arrival-route-attestation',version:1,projectionVersion:1,assignmentSequence:a[1],preparedReference:farmArrivalRouteReference(a.slice(4,28),a[2],source,destination,sourceHeld),reference:farmArrivalRouteReference(a.slice(28,52),a[3],source,destination,sourceHeld),gateIds});
  };
  const nativeFarmArrivalHeldExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(typeof wasm.nav_intent_farm_arrival_held_execution!=='function')return null;
    if(typeof wasm.nav_farm_arrival_held_source_snapshot!=='function')throw Error('Rebuild native held farm arrival source');
    if(wasm.nav_intent_farm_arrival_held_execution(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_farm_arrival_execution_ptr(),30));
    if(wasm.nav_farm_arrival_held_source_snapshot(actor)!==1)throw Error('Native held farm arrival lost its source');
    const b=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_route_binding_ptr(),29)),q=farmArrivalSourceReference(Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_request_ptr(),wasm.nav_intent_return_to_farm?24:23)),actor,true);
    if(b[0]!==1||!b.every(Number.isFinite)||!Number.isSafeInteger(b[21])||b[21]<0||b[21]>4096)throw Error('Invalid native held farm arrival source header');
    const origin=farmArrivalHeldOrigin(actor,0,q,b[23]),r=farmArrivalRouteReference(b.slice(3,27),b[2],q,[1,b[27],b[28],b[21]],origin);
    if(a[0]!==1||!a.every(Number.isFinite)||a[1]!==r.actorId||a[2]!==r.bodyId||a[3]!==q.centerId||a[4]!==q.nativeSession||a[5]!==r.expectedRouteHandle.slot||a[7]!==b[1]||a[8]<a[19]||a[9]!==q.goal.x||a[10]!==q.goal.z||a[11]!==q.requestSequence||a[18]!==0||a[27]!==0||a[28]!==0||a[29]!==2)throw Error('Invalid native held farm arrival execution');
    return copyNativeFarmArrivalHeldExecution({kind:'native-farm-arrival-held-execution',version:1,actorId:a[1],bodyId:a[2],sourceReference:r,assignmentSequence:b[1],resumeHandle:routeHandle(a[4],a[5],a[6]),suspendedAt:a[19],executedThrough:a[8],pose:{x:a[12],z:a[13],yaw:a[16],radius:q.pose.radius,runPhase:a[21],walkPhase:a[22],carryPhase:a[23],runRemaining:a[26]}});
  };
  const nativeFarmArrivalRouteBindings=()=>{
    if(!wasm.nav_farm_arrival_route_binding_actors)return Object.freeze([]);const count=wasm.nav_farm_arrival_route_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native farm arrival route count');const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_farm_arrival_route_binding_ptr(),count));
    return Object.freeze(actors.map(actor=>{const binding=nativeFarmArrivalRouteBinding(actor);if(!binding)throw Error('Native farm arrival lost its association');return binding;}));
  };
  const nativeFarmArrivalRouteExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_intent_farm_arrival_execution?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_farm_arrival_execution_ptr(),30)),binding=nativeFarmArrivalRouteBinding(actor),r=binding?.reference,s=r?.sourceRequest;
    if(a[0]!==1||!a.every(Number.isFinite)||a[29]!==2||!binding||a[1]!==r.actorId||a[2]!==r.bodyId||a[3]!==s.centerId||a[4]!==s.nativeSession||a[5]!==r.expectedRouteHandle.slot||a[6]!==r.expectedRouteHandle.generation||a[7]!==binding.assignmentSequence||a[8]<r.worldBoundary.effectiveTime||a[9]!==s.goal.x||a[10]!==s.goal.z||a[11]!==s.requestSequence)throw Error('Invalid native farm arrival execution');
    return Object.freeze({kind:'native-farm-arrival-route-execution',version:1,actorId:a[1],bodyId:a[2],centerId:a[3],nativeRoute:Object.freeze({actorId:a[1],routeHandle:r.expectedRouteHandle,assignmentSequence:a[7]}),executedThrough:a[8],sourceRequestSequence:a[11],destination:r.destination,goal:s.goal,binding,...decodeMotionSample(a.slice(12))});
  };
  const readHomeRouteSource=(actor,ticket=0)=>{
    const sourceRequest=nativeHomeRequestReference(actor,ticket);if(sourceRequest)return {sourceRequest};
    if(wasm.nav_home_route_source_snapshot(actor,ticket)!==1)throw Error('Native Home stationary source unavailable');
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_settlement_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Home stationary source');
    const carry=readTaskConsequenceBinding(actor,ticket,true);return {sourceSettlement:copyNativeTaskSettlementAttestation({kind:'native-task-settlement-attestation',version:1,projectionVersion:1,settlementSequence:a[1],preparedReference:settlementReference(a.slice(4,28),a[2],carry),reference:settlementReference(a.slice(28,52),a[3],carry)})};
  };
  const prepareNativeHomeRouteProposal=source=>{
    const fresh=source?.kind==='native-home-request-reference',held=fresh?copyNativeHomeRequestReference(source):copyNativeTaskSettlementAttestation(source),r=fresh?held:held.reference,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(!r.home)return outcome('unsupported');if((fresh?r.authorityEpoch:r.worldBoundary.authorityEpoch)!==epoch())return outcome('stale');if(wasm.nav_home_route_proposal_version?.()!==1)throw Error('Rebuild native Home route admission');
    syncBoundaryTime();flushNativeIntentControl();const actual=fresh?nativeHomeRequestReference(r.actorId):nativeTaskSettlementBinding(r.actorId);if(JSON.stringify(actual)!==JSON.stringify(held))return outcome('stale');
    const status=wasm.nav_home_route_proposal_stage(r.actorId,fresh?r.nativeSession:r.worldBoundary.nativeSession,fresh?r.requestSequence:held.settlementSequence);if(status!==1)return outcome(status===-4?'busy':status===-6?'unknown':status===0?'conflict':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Home lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-home-route-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{return outcome('proposed',{proposal:captureNativeHomeRouteProposal(ticket)});}catch(error){wasm.nav_home_route_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeHomeRouteProposal=ticket=>ticket?.kind==='native-home-route-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_home_route_proposal_cancel(ticket.session,ticket.ticket)===1;
  const nativeHomeRouteBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_home_route_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_route_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Home route binding');const source=readHomeRouteSource(actor),count=wasm.nav_home_route_binding_gates(actor);if(!Number.isSafeInteger(count)||count<0||count>1024)throw Error('Invalid native Home gates');const gateIds=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count));
    const ref=(h,ticket)=>copyNativeHomeRouteReference({kind:'native-home-route-reference',version:1,actorId:h[1],bodyId:h[2],...source,expectedRouteHandle:routeHandle(wasm.nav_intent_session(),h[20],h[4]),sourceControlSequence:h[23],endTime:h[11],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[10]}});
    return copyNativeHomeRouteAttestation({kind:'native-home-route-attestation',version:1,projectionVersion:1,assignmentSequence:a[1],preparedReference:ref(a.slice(4,28),a[2]),reference:ref(a.slice(28,52),a[3]),gateIds});
  };
  const nativeHomeRouteBindings=()=>{
    if(!wasm.nav_home_route_binding_actors)return Object.freeze([]);const count=wasm.nav_home_route_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native Home route count');
    const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_route_binding_ptr(),count));return Object.freeze(actors.map(actor=>{const binding=nativeHomeRouteBinding(actor);if(!binding)throw Error('Native Home route lost its source');return binding;}));
  };
  const nativeHomeRouteExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_intent_home_execution?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_home_execution_ptr(),30)),binding=nativeHomeRouteBinding(actor);if(a[0]!==1||!a.every(Number.isFinite)||!binding||binding.assignmentSequence!==a[7]||nativeHomeRouteSourceSequence(binding.reference)!==a[11])throw Error('Invalid native Home execution');
    return Object.freeze({kind:'native-home-route-execution',version:1,actorId:a[1],bodyId:a[2],villageId:a[3],nativeRoute:Object.freeze({actorId:a[1],routeHandle:routeHandle(a[4],a[5],a[6]),assignmentSequence:a[7]}),executedThrough:a[8],destination:Object.freeze({x:a[9],z:a[10]}),binding,...decodeMotionSample(a.slice(12))});
  };
  const homeArrivalReference=(h,ticket,sourceHome)=>{
    const r=sourceHome.reference,home=nativeHomeRouteSource(r).home;
    if(h.length!==24||h[0]!==1||!h.every(Number.isFinite)||h[1]!==r.actorId||h[2]!==r.bodyId||h[3]!==home.villageId||h[4]!==sourceHome.assignmentSequence||h[6]!==r.expectedRouteHandle.slot||h[7]!==r.expectedRouteHandle.generation||h[17]!==home.x||h[18]!==home.z||h[21]!==r.worldBoundary.effectiveTime||h[22]!==r.endTime||h[23]!==r.worldBoundary.ticket)throw Error('Native Home arrival lost its issued source');
    return copyNativeHomeArrivalReference({kind:'native-home-arrival-reference',version:1,actorId:h[1],bodyId:h[2],sourceHome,sourceControlSequence:h[5],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:r.worldBoundary.nativeSession,ticket,effectiveTime:h[16]},pose:{x:h[8],z:h[9],yaw:h[10],radius:h[11],runPhase:h[12],walkPhase:h[13],carryPhase:h[14],runRemaining:h[15]},profile:h[19],bodyFlags:h[20]});
  };
  const captureNativeHomeArrivalProposal=ticket=>{
    if(ticket?.kind!=='native-home-arrival-proposal-ticket'||ticket.authorityEpoch!==epoch()||wasm.nav_home_arrival_proposal_snapshot?.(ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_arrival_proposal_header_ptr(),24)),source=nativeHomeRouteBinding(h[1]);if(!source)throw Error('Native Home arrival has no current route');
    const nativeHomeArrival=homeArrivalReference(h,ticket.ticket,source);return copyNativeHomeArrivalProposal({kind:'native-home-arrival-proposal',version:1,ticket,worldBoundary:nativeHomeArrival.worldBoundary,nativeHomeArrival,authorizedAutonomy:false,authorizedConsequences:false});
  };
  const prepareNativeHomeArrivalProposal=value=>{
    const source=copyNativeHomeRouteAttestation(value),r=source.reference,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});
    if(r.worldBoundary.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_home_arrival_proposal_version?.()!==2)throw Error('Rebuild native Home arrival admission');syncBoundaryTime();flushNativeIntentControl();
    if(JSON.stringify(nativeHomeRouteBinding(r.actorId))!==JSON.stringify(source))return outcome('stale');
    const result=wasm.nav_home_arrival_proposal_stage(r.actorId,r.worldBoundary.nativeSession,source.assignmentSequence);if(result!==1)return outcome(result===-4?'busy':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Home arrival lost its ticket');const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-home-arrival-proposal-ticket',authorityEpoch:epoch(),session:a[0],ticket:a[1]};
    try{return outcome('proposed',{proposal:captureNativeHomeArrivalProposal(ticket)});}catch(error){wasm.nav_home_arrival_proposal_cancel(a[0],a[1]);throw error;}
  };
  const cancelNativeHomeArrivalProposal=ticket=>ticket?.kind==='native-home-arrival-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_home_arrival_proposal_cancel(ticket.session,ticket.ticket)===1;
  const revalidateNativeHomeArrivalProposal=ticket=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedConsequences:false,...extra});if(ticket?.kind!=='native-home-arrival-proposal-ticket'||ticket.authorityEpoch!==epoch())return outcome('stale');syncBoundaryTime();flushNativeIntentControl();
    const result=wasm.nav_home_arrival_proposal_revalidate(ticket.session,ticket.ticket);if(result!==1)return outcome(result===-4?'busy':'stale');if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Home arrival revalidation lost its ticket');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),next={kind:'native-home-arrival-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{const proposal=captureNativeHomeArrivalProposal(next),ptr=wasm.nav_home_arrival_proposal_time_translation_ptr(next.session,next.ticket);if(!proposal||!ptr)throw Error('Native Home arrival revalidation lost its evidence');const a=Array.from(new Float64Array(wasm.memory.buffer,ptr,8));if(a[0]!==1||a[1]!==ticket.ticket||a[2]!==next.ticket||a[5]!==proposal.worldBoundary.effectiveTime||!a.every(Number.isFinite)||![0,1].includes(a[7]))throw Error('Invalid native Home arrival translation');return outcome('revalidated',{proposal,timeTranslation:Object.freeze({kind:'native-home-arrival-time-translation',version:1,previousTicket:ticket,ticket:next,previousStartTime:a[3],startTime:a[5],sameSourceState:a[7]===1})});}catch(error){cancelNativeHomeArrivalProposal(next);throw error;}
  };
  const nativeWorkerHomeInactive=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),worker=owningState?.workers.find(w=>numericId(w.id)===actor);
    return !!inactiveHomeEntry(owningState,worker,legacyCropHomes,qualifyRaidEncounter)&&wasm.nav_intent_worker_inactive?.(actor)===1;
  };
  const startNativeHomeArrivalAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Home arrival requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),source=nativeHomeRouteBinding(actor),home=source&&nativeHomeRouteSource(source.reference).home,village=home&&state?.villages.find(v=>numericId(v.id)===home.villageId);
    if(!source||!worker||!village)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});
    const current=()=>{const e=nativeHomeRouteExecution(actor);return owningState===state&&state.workers.includes(worker)&&state.villages.includes(village)&&(source.reference.sourceRequest?.raidSpawnSequence?nativeRaidFlightMember(state,state.raid?.animals[0])===worker:worker.status===nativeHomeWorkerStatus(source.reference.sourceRequest))&&worker.nativeRouteAdmission==='native-home'&&!worker.taskId&&!worker.crateId&&!worker.path?.length&&(source.reference.sourceRequest?.recoveryHit?worker.incapacitated&&worker.hits===2:!worker.incapacitated)&&!worker.recovery&&!worker.recoveryExitRemaining&&!worker.fallRemaining&&!worker.raidReturn&&worker.running===false&&worker.gateWaiting===false&&numericId(worker.villageId)===home.villageId&&(village.entry??village).x===home.x&&(village.entry??village).z===home.z&&e?.arrived===true&&e.executedThrough===state.elapsed&&e.binding.assignmentSequence===source.assignmentSequence&&JSON.stringify(e.binding)===JSON.stringify(source)&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>worker[k]===e[k])&&worker.heading===e.yaw;};
    if(!current())return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});let candidate=null,prepared=null,translation=null,issued=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'home-arrival',binding:()=>issued,
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===19;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeHomeArrivalProposal({kind:'native-home-arrival-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),snapshot:(session,ticket)=>wasm.nav_home_arrival_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_home_arrival_proposal_cancel(session,ticket),release(){},
      capture(boundary){prepared=candidate=captureNativeHomeArrivalProposal({kind:'native-home-arrival-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native Home arrival resources unavailable');return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeHomeArrivalProposal(source);return p.status==='proposed'?1:p.status==='busy'?-4:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_home_arrival_proposal_commit_bound(...boundary,prepared.ticket.ticket);if(status!==1)return {status};mark();
      const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_arrival_result_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite)||a[1]!==wasm.nav_intent_transition_sequence()||a[2]!==prepared.ticket.ticket||a[3]!==candidate.ticket.ticket||wasm.nav_intent_actor(actor)!==0||wasm.nav_intent_worker_inactive(actor)!==1||wasm.spatial_body_has_blockers(source.reference.bodyId,0)!==-1)throw Error('Native Home arrival did not retire its issued body');
      issued=copyNativeHomeArrivalAttestation({kind:'native-home-arrival-attestation',version:1,projectionVersion:1,retiredSequence:a[1],preparedReference:homeArrivalReference(a.slice(4,28),a[2],source),reference:homeArrivalReference(a.slice(28,52),a[3],source)});
      if(!sameNativeHomeArrivalReference(issued.reference,candidate.nativeHomeArrival)||!sameNativeHomeArrivalReference(issued.preparedReference,prepared.nativeHomeArrival))throw Error('Native Home arrival differs from the prepared consequence');
      const pose=issued.reference.pose;Object.assign(worker,{x:home.x,z:home.z,heading:pose.yaw,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase,runRemaining:pose.runRemaining,status:'home',path:[],running:false,gateWaiting:false});delete worker.nativeRouteAdmission;
      if(source.reference.sourceRequest?.recoveryHit){
        restoredEncounter=null;encounterImpact=null;encounterExhaustion=null;raidFlight=null;
      }else if(raidFlight?.worker===worker&&source.reference.sourceRequest?.raidSpawnSequence===raidFlight.event){
        refuge={worker,raid:raidFlight.raid,issued,contractDay:worker.contractDay,centerId:worker.centerId};
        raidFlight=null;
      }
      notifyWorkerPlanningChange(state,worker);
      const resources=Object.freeze({version:1,kind:19,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeHomeArrivalBinding:issued});mark({resources,nativeHomeArrivalBinding:issued});return {status:1,value:{resources,nativeHomeArrivalBinding:issued}};
    },prepareResources,signal,protocol);
  };
  const acquireNativeFarmArrivalAfterGpuQuiescence=({actorId,urgent=false,getPublication,prepareResources,signal=null}={},continuation=null,isContinuationCurrent=()=>true)=>{
    if(typeof urgent!=='boolean'||typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native farm arrival requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),source=continuation?.sourceReference.sourceRequest??nativeFarmArrivalRequestReference(actor);
    if(!source||!worker)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const current=()=>{try{if(owningState!==state)return false;const semantic=continuation?nativeFarmArrivalHeldState(state,worker):nativeFarmArrivalState(state,worker,{canonical:true}),p=continuation?.pose??source.pose,actual=continuation?nativeFarmArrivalHeldExecution(actor):null;return (continuation?!!actual&&continuation.executedThrough<=actual.executedThrough&&JSON.stringify({...continuation,executedThrough:0})===JSON.stringify({...actual,executedThrough:0})&&isContinuationCurrent()&&!contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0):sameNativeFarmArrivalRequestReference(nativeFarmArrivalRequestReference(actor),source))&&semantic.centerId===source.centerId&&worker.profile===source.workerProfile&&source.requestedAt<=state.elapsed&&(worker.radius===undefined||worker.radius===source.pose.radius)&&Object.keys(semantic.pose).every(k=>semantic.pose[k]===p[k])&&Object.keys(semantic.goal).every(k=>semantic.goal[k]===source.goal[k]);}catch{return false;}};
    if(!current())return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'farm-arrival',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===23;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeFarmArrivalRouteProposal({kind:'native-farm-arrival-route-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(g=>g.gateId),ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),snapshot:(session,ticket)=>wasm.nav_farm_arrival_route_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_farm_arrival_route_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeFarmArrivalRouteProposal({kind:'native-farm-arrival-route-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native farm arrival resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=continuation?prepareNativeFarmArrivalContinuationProposal(continuation):prepareNativeFarmArrivalRouteProposal(source,{urgent});return p.status==='proposed'?1:p.status==='busy'?-4:p.status==='conflict'?0:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_farm_arrival_route_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();if(beginNativeRouteExecution().status!=='started')throw Error('Native farm arrival could not establish its execution boundary');projectNativeFarmArrivalRouteExecution(state,worker,{nativeFarmArrivalRouteExecution});
      const binding=nativeFarmArrivalRouteBinding(actor),nativeRoute=Object.freeze({actorId:actor,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence}),resources=copyNativeFarmArrivalRouteResources({version:1,kind:23,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,nativeFarmArrivalBinding:binding,presentation:captureNativeRoutePresentation(binding.reference.expectedRouteHandle)});mark({resources,nativeRoute,nativeFarmArrivalBinding:binding});return {status:1,value:{resources,nativeRoute,nativeFarmArrivalBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const startNativeFarmArrivalAfterGpuQuiescence=options=>acquireNativeFarmArrivalAfterGpuQuiescence(options);
  const continueNativeFarmArrivalAfterGpuQuiescence=(options,isCurrent)=>{const source=nativeFarmArrivalHeldExecution(options?.actorId);return source?acquireNativeFarmArrivalAfterGpuQuiescence(options,source,isCurrent):Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});};
  const startNativeHomeRouteAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Home requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),flight=worker?.nativeRouteAdmission==='pending-raid-flight-resources',fresh=flight||worker?.nativeRouteAdmission==='pending-home-resources',source=fresh?nativeHomeRequestReference(actor):nativeTaskSettlementBinding(actor),r=fresh?source:source?.reference,home=r?.home,village=home&&state?.villages.find(v=>numericId(v.id)===home.villageId);
    if(!source||!home||!worker||!village)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const current=()=>owningState===state&&state.workers.includes(worker)&&state.villages.includes(village)&&(flight?nativeRaidFlightMember(state,state.raid?.animals[0])===worker&&r.raidSpawnSequence===raidFlight?.event:worker.status===nativeHomeWorkerStatus(r))&&(r.recoveryHit?worker.incapacitated&&worker.hits===2&&worker.recoveryExitRemaining===(r.recoveryExit??RECOVERY_EXIT_SECONDS):!worker.incapacitated&&!worker.recoveryExitRemaining)&&!worker.recovery&&!worker.fallRemaining&&!worker.raidReturn&&worker.running===false&&worker.gateWaiting===false&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>worker[k]===r.pose[k])&&!worker.taskId&&!worker.crateId&&(fresh?worker.nativeRouteAdmission===(flight?'pending-raid-flight-resources':'pending-home-resources')&&worker.heading===r.pose.yaw&&sameNativeHomeRequestReference(nativeHomeRequestReference(actor),source):!worker.nativeRouteAdmission)&&!worker.path?.length&&numericId(worker.villageId)===home.villageId&&(village.entry??village).x===home.x&&(village.entry??village).z===home.z;
    if(!current())return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'home-route',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===18;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeHomeRouteProposal({kind:'native-home-route-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;if(flight&&!flightCandidateClear(session,candidate.ticket.ticket)){cancelNativeHomeRouteProposal(candidate.ticket);return {status:'stale'};}translation=result.timeTranslation;}return result;},timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(g=>g.gateId),ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),snapshot:(session,ticket)=>wasm.nav_home_route_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_home_route_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeHomeRouteProposal({kind:'native-home-route-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native Home route resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeHomeRouteProposal(source);
      if(flight&&p.status==='proposed'&&!flightCandidateClear(p.proposal.ticket.session,p.proposal.ticket.ticket)){cancelNativeHomeRouteProposal(p.proposal.ticket);return 0;}
      return p.status==='proposed'?1:p.status==='busy'?-4:p.status==='conflict'?0:-2;},(mark,...boundary)=>{
      if(!current()||flight&&!flightCandidateClear(boundary[0],boundary[1]))return {status:-2};const status=wasm.nav_home_route_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();if(fresh&&beginNativeRouteExecution().status!=='started')throw Error('Restored Home could not establish its native execution boundary');projectNativeHomeRouteExecution(state,worker,{nativeHomeRouteExecution});
      const binding=nativeHomeRouteBinding(actor),nativeRoute=Object.freeze({actorId:actor,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence}),resources=Object.freeze({version:1,kind:18,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,nativeHomeRouteBinding:binding,presentation:captureNativeRoutePresentation(binding.reference.expectedRouteHandle)});mark({resources,nativeRoute,nativeHomeRouteBinding:binding});return {status:1,value:{resources,nativeRoute,nativeHomeRouteBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const startNativeIdleStrollAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={},isCurrent=()=>true)=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Idle stroll requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),restored=nativeIdleStrollRequestReference(actor),source=restored??idleCycleSource(actor,true);if(!isCurrent()||(restored?!restoredStrollRequestCurrent(restored):!source?.sourceFarm&&!source?.sourceSettlement&&source?.next?.idleState.mode!=='walk'))return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const current=()=>isCurrent()&&(restored?restoredStrollRequestCurrent(restored):sameIdleCycleSource(source,idleCycleSource(actor,true)));let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'idle-stroll',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===22;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeIdleStrollProposal({kind:'native-idle-stroll-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(g=>g.gateId),ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),snapshot:(session,ticket)=>wasm.nav_idle_stroll_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_idle_stroll_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeIdleStrollProposal({kind:'native-idle-stroll-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native Idle stroll resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeIdleStrollProposal(actor);return p.status==='proposed'?1:p.status==='busy'?-4:p.status==='conflict'?0:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_idle_stroll_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();if(beginNativeRouteExecution().status!=='started')throw Error('Native Idle stroll could not establish its execution boundary');
      const binding=nativeIdleStrollBinding(actor),nativeRoute=Object.freeze({actorId:actor,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence}),resources=Object.freeze({version:1,kind:22,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,nativeIdleStrollBinding:binding,presentation:captureNativeRoutePresentation(binding.reference.expectedRouteHandle)});
      mark({resources,nativeRoute,nativeIdleStrollBinding:binding});return {status:1,value:{resources,nativeRoute,nativeIdleStrollBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const startNativeIdleCycleAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={},isCurrent=()=>true)=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Idle cycle requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),source=idleCycleSource(actor);if(!source||!isCurrent())return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const current=()=>isCurrent()&&sameIdleCycleSource(source,idleCycleSource(actor));let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'idle-cycle',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===21;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_idle_cycle_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_idle_cycle_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native Idle cycle resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeIdleCycleProposal(actor);return p.status==='proposed'?1:p.status==='busy'?-4:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_idle_cycle_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
      const binding=nativeIdleCycleBinding(actor),resources=Object.freeze({version:1,kind:21,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeIdleCycleBinding:binding});
      mark({resources,nativeIdleCycleBinding:binding});return {status:1,value:{resources,nativeIdleCycleBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const startNativeInitialIdleBodyAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null,stationaryTaskNavigation=null,cancelTask=null,returnStoppedTaskToIdle=false,atCommitBoundary=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native initial Idle body requires retained resource preparation');
    if(cancelTask&&(stationaryTaskNavigation||typeof cancelTask.valid!=='function'||typeof cancelTask.project!=='function')||atCommitBoundary!==null&&typeof atCommitBoundary!=='function')throw TypeError('Invalid native initial Idle command');
    const cancelling=!!cancelTask||returnStoppedTaskToIdle;
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),source=stationaryTaskNavigation||cancelling?null:nativeInitialIdleRequestReference(actor);
    const action=stationaryTaskNavigation?nativeTaskActionExecution(actor):null;
    const completion=action?.completed?prepareNativeStationaryTaskConsequence(state,worker,action.binding,stationaryTaskNavigation):null;
    const cancellation=cancelling?nativeTaskCancellationSource(actor):null;
    const center=cancellation&&state.structures.find(item=>item.id===worker?.centerId);
    const cancelledIdle=worker&&center?copyNativeInitialIdleState({...createIdleState(worker,idleFarmAnchor(state,worker,center),state.seed),approachRetry:0}):null;
    if(!worker||(cancelling?(!cancelledIdle||returnStoppedTaskToIdle&&cancellation.phase!==25):stationaryTaskNavigation?!completion:!source?.idleState))return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    let stage=()=>prepareNativeInitialIdleBodyProposal(source);
    if(completion){
      const idle=completion.idleState,anchorKind=idle.anchorId.startsWith('farm-plant-')?1:2;
      const stageAction=completion.task.kind!=='repair'?wasm.nav_initial_idle_body_proposal_stage_watering:
        completion.target.kind==='wall'?wasm.nav_initial_idle_body_proposal_stage_wall_repair:wasm.nav_initial_idle_body_proposal_stage_center_repair;
      if(!stageAction)throw Error('Rebuild native stationary task continuation');
      stage=()=>prepareInitialIdleBodyProposal(()=>stageAction(actor,action.binding.reference.worldBoundary.nativeSession,action.binding.actionSequence,
        PROFILES.findIndex(p=>p.id===worker.profile),anchorKind,numericId(idle.anchorId),idle.rng,idle.remaining));
    }
    if(cancellation){
      const idle=cancelledIdle,anchorKind=idle.anchorId.startsWith('farm-plant-')?1:2;
      stage=()=>prepareInitialIdleBodyProposal(()=>wasm.nav_initial_idle_body_proposal_stage_cancelled_task(actor,cancellation.nativeSession,cancellation.phase,
        cancellation.sourceSequence,cancellation.routeGeneration,PROFILES.findIndex(p=>p.id===worker.profile),anchorKind,numericId(idle.anchorId),idle.rng,idle.remaining));
    }
    const current=()=>{
      if(owningState!==state||!state.workers.includes(worker))return false;
      if(cancellation){
        const p=cancellation.pose;
        return (!cancelTask||cancelTask.valid())&&!!worker.taskId&&numericId(worker.taskId)===cancellation.taskId&&state.tasks.some(t=>t.id===worker.taskId&&t.workerId===worker.id&&numericId(t.targetId)===cancellation.targetId)&&
          worker.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>worker[k]===p[k])&&
          sameNativeTaskCancellationSource(nativeTaskCancellationSource(actor),cancellation);
      }
      if(completion){
        const actual=nativeTaskActionExecution(actor);
        if(!actual?.completed||actual.executedThrough!==state.elapsed||JSON.stringify(actual.binding)!==JSON.stringify(action.binding))return false;
        const plan=prepareNativeStationaryTaskConsequence(state,worker,actual.binding,stationaryTaskNavigation);
        return !!plan&&plan.task===completion.task&&plan.target===completion.target&&plan.reachable===completion.reachable&&
          ['due','hp','maxHp','cost'].every(key=>plan[key]===completion[key])&&JSON.stringify(plan.idleState)===JSON.stringify(completion.idleState);
      }
      if(worker.nativeRouteAdmission!=='pending-idle-resources'||JSON.stringify(nativeInitialIdleRequestReference(actor))!==JSON.stringify(source))return false;
      try{const semantic=nativeInitialIdleDeclaration(state,worker,{canonical:true});return worker.profile===source.workerProfile&&numericId(worker.centerId)===source.centerId&&Object.entries(semantic.pose).every(([key,value])=>value===source.pose[key])&&JSON.stringify(semantic.idleState)===JSON.stringify(source.idleState);}catch{return false;}
    };
    let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'initial-idle-body',atCommitBoundary,
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===20;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeInitialIdleBodyProposal({kind:'native-initial-idle-body-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_initial_idle_body_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_initial_idle_body_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeInitialIdleBodyProposal({kind:'native-initial-idle-body-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native initial Idle body resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=stage();return p.status==='proposed'?1:p.status==='busy'?-4:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_initial_idle_body_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
      if(completion)projectNativeStationaryTaskConsequence(state,worker,stationaryTaskNavigation,{nativeInitialIdleBodyBinding});
      else if(cancellation){
        if(returnStoppedTaskToIdle)releaseTask(state,worker);
        else if(cancelTask.project()!==true||worker.taskId)throw Error('Native cancelled Task consequence did not release the assignment');
        Object.assign(worker,{status:'idle',path:null,taskApproach:null,destinationId:null,idleState:{...cancelledIdle},running:false,gateWaiting:false,nativeRouteAdmission:'native-idle',actionRemaining:0});
        notifyWorkerPlanningChange(state,worker);
      }
      else worker.nativeRouteAdmission='native-idle';
      const binding=nativeInitialIdleBodyBinding(actor),resources=Object.freeze({version:1,kind:20,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeInitialIdleBodyBinding:binding});
      mark({resources,nativeInitialIdleBodyBinding:binding});return {status:1,value:{resources,nativeInitialIdleBodyBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const startNativeTaskSettlementAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native settlement requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),crate=state?.crates.find(c=>c.id===worker?.crateId),center=state?.structures.find(c=>c.id===worker?.centerId),preview=state&&prepareCrateDeliveryConsequence(state,worker,crate,center),source=nativeTaskConsequenceBinding(actor);
    if(!preview||preview.status==='returning'&&!preview.home||!source)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});
    const current=()=>owningState===state&&state.workers.includes(worker)&&state.crates.includes(crate)&&state.structures.includes(center)&&worker.nativeRouteAdmission==='native-delivery'&&crateDeliveryConsequenceCurrent(state,worker,crate,center,preview);
    let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'task-settlement',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===17;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeTaskSettlementProposal({kind:'native-task-settlement-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_task_settlement_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_task_settlement_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeTaskSettlementProposal({kind:'native-task-settlement-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native settlement resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeTaskSettlementProposal(source,{home:preview.home});return p.status==='proposed'?1:p.status==='busy'?-4:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_task_settlement_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
      projectNativeCrateDeliveryConsequence(state,worker,preview,{nativeSettledWorkerExecution});
      const binding=nativeTaskSettlementBinding(actor),resources=Object.freeze({version:1,kind:17,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeTaskSettlementBinding:binding});
      mark({resources,nativeTaskSettlementBinding:binding});return {status:1,value:{resources,nativeTaskSettlementBinding:binding}};
    },prepareResources,signal,protocol);
  };
  const nativeHarvestDeliverySource=(actor,source=nativeTaskActionBinding(actor))=>{
    const state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),task=state?.tasks.find(t=>t.id===worker?.taskId),target=state?.plants.find(p=>p.id===task?.targetId),center=state?.structures.find(c=>c.id===worker?.centerId),preview=prepareHarvestConsequence(state,worker,task,target);
    if(!preview||!source||center?.kind!=='center'||center.status!=='intact')return null;
    return {state,worker,task,target,center,preview,source,destination:centerDeliveryPoint(center,target,state)};
  };
  const startNativeTaskConsequenceAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native consequence requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),harvest=nativeHarvestDeliverySource(actor);
    if(!harvest)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});
    const {state,worker,task,target,center,preview,source,destination}=harvest;
    const centerOrigin={x:center.x,z:center.z,yaw:center.yaw,status:center.status},current=()=>owningState===state&&worker.status==='acting'&&worker.nativeRouteAdmission==='native-action'&&state.workers.includes(worker)&&state.tasks.includes(task)&&state.plants.includes(target)&&state.structures.includes(center)&&worker.centerId===center.id&&['x','z','yaw','status'].every(k=>center[k]===centerOrigin[k])&&harvestConsequenceCurrent(state,worker,task,target,preview);
    let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'task-consequence',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return t[0]===session&&t[1]===ticket&&t[5]===16;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeTaskConsequenceProposal({kind:'native-task-consequence-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(g=>g.gateId),
      ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_task_consequence_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_task_consequence_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeTaskConsequenceProposal({kind:'native-task-consequence-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native consequence resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -1;const p=prepareNativeTaskConsequenceProposal(source,{crateId:preview.nextId,centerId:center.id,destination});return p.status==='proposed'?1:p.status==='busy'?-4:0;},
      (mark,...boundary)=>{if(!current())return {status:-2};const status=wasm.nav_task_consequence_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
        // The actual native fact precedes semantic projection and all observers.
        projectNativeHarvestConsequence(state,worker,preview,{nativeDeliveryExecution});
        const binding=nativeTaskConsequenceBinding(actor),nativeRoute=Object.freeze({actorId:actor,routeHandle:candidate.expectedRouteHandle,assignmentSequence:binding.assignmentSequence}),resources=Object.freeze({version:1,kind:16,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,nativeTaskConsequenceBinding:binding,presentation:captureNativeRoutePresentation(candidate.expectedRouteHandle)});
        mark({resources,nativeRoute,nativeTaskConsequenceBinding:binding});return {status:1,value:{resources,nativeRoute,nativeTaskConsequenceBinding:binding}};
      },prepareResources,signal,protocol);
  };
  const resumeNativeGateRouteAfterGpuQuiescence=({getPublication,resumeHandle,proposalTicket=null,prepareResources,signal=null,deferredStart=false}={})=>{
    if(typeof deferredStart!=='boolean')throw TypeError('Invalid native resume start policy');
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native resume requires retained resource preparation');
    if(wasm.nav_gate_resume_proposal_version?.()!==1)throw Error('Rebuild native resume proposal service');
    let candidate=null,translation=null;
    const stage=()=>{
      if(resumeHandle?.authorityEpoch!==epoch())return -1;
      if(proposalTicket===null)return wasm.nav_gate_resume_proposal_stage(resumeHandle.session,resumeHandle.slot,resumeHandle.generation);
      if(proposalTicket?.kind!=='native-route-resume-proposal-ticket'||proposalTicket.authorityEpoch!==epoch()||proposalTicket.session!==resumeHandle.session||wasm.nav_intent_barrier_proposal_ticket()!==1)return -1;
      const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
      if(t[0]!==proposalTicket.session||t[1]!==proposalTicket.ticket||t[5]!==13)return -1;
      const pointer=wasm.nav_gate_resume_proposal_header_ptr();if(!pointer)return -1;
      const h=new Float64Array(wasm.memory.buffer,pointer,24);
      if(h[20]!==resumeHandle.slot||h[3]!==resumeHandle.generation)return -1;
      return wasm.nav_gate_resume_proposal_snapshot(t[0],t[1]);
    };
    const protocol={preparedFrameRequired:true,deferred:deferredStart,
      retained(session,ticket){if(wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return t[0]===session&&t[1]===ticket&&t[5]===13;},
      revalidate(session,ticket){const result=revalidateNativeGateResumeProposal({kind:'native-route-resume-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(gate=>gate.gateId),
      ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_gate_resume_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_gate_resume_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeGateResumeProposal(Object.freeze({kind:'native-route-resume-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket}));if(!candidate)throw Error('Native resume resources unavailable');return candidate;}};
    return commitNativeWorldProposal(getPublication,stage,
      (mark,...boundary)=>{const status=wasm.nav_gate_resume_proposal_commit(...boundary);if(status!==1)return {status};mark();
        const plan=nativeRouteTiming(candidate.expectedRouteHandle);if(!plan||plan.actorId!==candidate.actorId)throw Error('Native resumed assignment unavailable');
        const started=beginNativeRouteExecution();if(started.status!=='started')throw Error('Native resumed execution could not establish its causal boundary');
        const nativeRoute=Object.freeze({actorId:plan.actorId,routeHandle:candidate.expectedRouteHandle,assignmentSequence:plan.assignmentSequence}),resources=Object.freeze({version:1,kind:13,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,presentation:captureNativeRoutePresentation(candidate.expectedRouteHandle)});mark({resources,nativeRoute});return {status:1,value:{resources,nativeRoute}};
      },prepareResources,signal,protocol);
  };
  // Genuine first assignment: one retained packet, current native revalidation,
  // and the source-owned bound origin; no fabricated suspension or sequence.
  const startNativeTaskRouteAfterGpuQuiescence=({getPublication,request,policy,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('First task requires retained resource preparation');
    let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'task-start',
      retained(session,ticket){if(wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return t[0]===session&&t[1]===ticket&&t[5]===14;},
      revalidate(session,ticket){const result=revalidateNativeTaskStartProposal({kind:'native-task-start-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(gate=>gate.gateId),
      ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_task_start_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_task_start_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeTaskStartProposal({kind:'native-task-start-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native first-task resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{const result=prepareNativeTaskStartProposal(request,policy);return result.status==='proposed'?1:result.status==='busy'?-4:0;},
      (mark,...boundary)=>{const status=wasm.nav_task_start_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
        const plan=nativeRouteTiming(candidate.expectedRouteHandle);if(!plan||plan.actorId!==candidate.actorId)throw Error('First native assignment unavailable');
        if(beginNativeRouteExecution().status!=='started')throw Error('First native assignment could not establish its causal boundary');
        const nativeRoute=Object.freeze({actorId:plan.actorId,routeHandle:candidate.expectedRouteHandle,assignmentSequence:plan.assignmentSequence}),resources=Object.freeze({version:1,kind:14,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,presentation:captureNativeRoutePresentation(candidate.expectedRouteHandle)});mark({resources,nativeRoute});return {status:1,value:{resources,nativeRoute}};
      },prepareResources,signal,protocol);
  };
  const startNativeTaskActionAfterGpuQuiescence=({getPublication,request,prepareResources,signal=null}={})=>{
    request=copyNativeTaskActionRequest(request);
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native action requires retained resource preparation');
    let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'task-action',
      retained(session,ticket){if(wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const t=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return t[0]===session&&t[1]===ticket&&t[5]===15;},
      revalidate(session,ticket){const result=revalidateNativeTaskActionProposal({kind:'native-task-action-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},
      timeTranslation:()=>translation,ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),
      snapshot:(session,ticket)=>wasm.nav_task_action_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_task_action_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeTaskActionProposal({kind:'native-task-action-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native action resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{const p=prepareNativeTaskActionProposal(request);return p.status==='proposed'?1:p.status==='busy'?-4:0;},
      (mark,...boundary)=>{const status=wasm.nav_task_action_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();
        const binding=nativeTaskActionBinding(nativeTaskActionActor(candidate.request));if(!binding)throw Error('Issued native action unavailable');const resources=Object.freeze({version:1,kind:15,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeTaskActionBinding:binding});mark({resources,nativeTaskActionBinding:binding});return {status:1,value:{resources,nativeTaskActionBinding:binding}};
      },prepareResources,signal,protocol);
  };
  const resumeNativeGateRoute=resumeHandle=>{
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(resumeHandle?.authorityEpoch!==epoch())return outcome('stale');
    syncBoundaryTime();
    if(wasm.nav_gate_route_suspend_version?.()!==1)throw Error('Rebuild native route suspension service');
    const result=wasm.nav_gate_resume_route(resumeHandle.session,resumeHandle.slot,resumeHandle.generation);
    if(result!==1)return outcome(result===-1?'stale':result===-3?'body-mismatch':result===0?'conflict':
      result===-6?'unknown':result===-8?'blocked':result===-7?
        ({1:'blocked',2:'unknown',3:'unsupported',4:'invalid'}[wasm.nav_intent_timing_rejection()]??'unsupported'):'unsupported');
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_timing_ptr(),20)),
      replacement=routeHandle(a[13],a[14],a[15]),motionPlan=nativeRouteTiming(replacement);
    flushNativeIntentControl();return outcome('resumed',{routeHandle:replacement,motionPlan});
  };
  const projectRouteProgress=state=>{
    let accepted=0;
    for(const actors of [state.workers,state.raid?.animals??[]])for(const actor of actors){
      if(nativeTaskExecution(actor.id))continue;
      const path=actor.path;
      if(!Array.isArray(path)||path.length>4096||
         path.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.z)))
        continue;
      const pointer=wasm.nav_intent_route_progress_input_ptr(path.length);
      if(path.length&&!pointer)throw Error('Native route progress allocation failed');
      if(path.length){
        const input=new Float32Array(wasm.memory.buffer,pointer,path.length*2);
        for(let i=0;i<path.length;i++){
          input[i*2]=path[i].x;input[i*2+1]=path[i].z;
        }
      }
      if(wasm.nav_intent_route_progress(numericId(actor.id),actor.x,actor.z,
        path.length)===1)accepted++;
    }
    return accepted;
  };
  // A committed world event is the only reason to reconsider live routes.
  // The caller projects affected actor positions in the same delta batch;
  // normal movement reads routePoints() without entering the planner.
  const processEventBoundary=(state,events,{topologyChanged=false}={})=>{
    applyEvents(state,events);
    if(topologyChanged)session.actorSectorRevision({worker:true});
    const invalidated=topologyChanged?wasm.nav_intent_reconcile_topology():0;
    const rerouted=invalidated?wasm.nav_intent_replan_pending_routes():0;
    return {invalidated,rerouted,changes:intentChanges()};
  };
  const requestReroute=actorId=>{
    session.actorSectorRevision({worker:true});
    if(wasm.nav_intent_request_reroute(numericId(actorId))!==1)return false;
    wasm.nav_intent_replan_pending_routes();
    return true;
  };
  const writeAttackRouteInput=(animal,path)=>{
    if(!Array.isArray(path)||path.length>4096||
      path.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.z)))
      throw TypeError('Expected a finite confirmed animal route');
    session.actorSectorRevision({worker:false,species:animal.species});
    if(path.length){
      const ptr=wasm.nav_intent_attack_route_input_ptr(path.length);
      if(!ptr)throw Error('Native attack route allocation failed');
      const points=new Float32Array(wasm.memory.buffer,ptr,path.length*2);
      for(let index=0;index<path.length;index++){
        points[index*2]=path[index].x;points[index*2+1]=path[index].z;
      }
    }
  };
  const requestNativeCenterBirth=(state,animal,{target,approach},body,pair=null)=>{
    if(state!==owningState||!animalRouteV2||!nativeCenterAttackCohort(state,pair?.worker)||target!==state.structures[0]||
       state.raid?.animals[0]!==animal||animal.status!=='entering'||!approach.path?.length)return false;
    syncBoundaryTime();
    writeAttackRouteInput(animal,approach.path);
    const declare=pair?wasm.nav_animal_plan_flight_center:wasm.nav_animal_plan_center_birth;
    return declare?.(wasm.nav_intent_session(),numericId(animal.id),
      numericId(target.id),body,approach.path.length,approach.point.x,approach.point.z,
      animal.heading??0,animal.motionPhase??0,...(pair?[pair.birth.workerActor,pair.birth.sourceSequence]:[]))===1;
  };
  const registerAttackIntent=(state,animal,target,path)=>{
    if(!initialized||!state.raid||animal.targetId!==target.id||
      !animal.reservation||state.raid.reservations[animal.reservation]!==animal.id)
      throw Error('Animal attack must be confirmed before native registration');
    writeAttackRouteInput(animal,path);
    if(!animal.approach||!Number.isFinite(animal.approach.x)||
       !Number.isFinite(animal.approach.z))
      throw Error('Confirmed animal attack has no finite approach point');
    const status=wasm.nav_intent_register_attack_site(numericId(animal.id),
      numericId(target.id),animal.x,animal.z,path.length,
      animal.approach.x,animal.approach.z,animal.radius??.28);
    if(status!==1)throw Error(`Native attack intention rejected: ${status}`);
    if(target.kind==='wall')
      wasm.nav_intent_track_wall_opportunities(numericId(animal.id),
        animal.x,animal.z,animal.radius);
    return true;
  };
  const reconsiderWallOpportunity=animal=>{
    session.actorSectorRevision({worker:false,species:animal.species});
    return wasm.nav_intent_reconsider_wall_opportunity(numericId(animal.id),
      animal.x,animal.z,animal.radius);
  };
  const wallOpportunityCandidates=()=>{
    const count=wasm.nav_intent_wall_opportunity_candidates();
    return count?Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_wall_opportunity_candidates_ptr(),count)):[];
  };
  const prepareAttackTransients=(state,animal,successor=false)=>{
    // Shield borders and introductory crop quotas alter interaction geometry
    // and eligibility. Keep those cases on the established selector until the
    // corresponding confirmed facts are projected into the native index.
    if(state.raid.introCropLimit!==undefined&&!successor||
      state.spells.some(spell=>spell.kind==='shield'&&spell.remaining>0))
      return null;
    session.actorSectorRevision({worker:false,species:animal.species});
    const blockers=actorBlockers(state,animal,false);
    // Physical bodies and reserved future attack sites are different facts.
    // Send both in the same transient batch so native site selection cannot
    // return an approach that the confirmed raid reservation would reject.
    for(const other of state.raid.animals){
      if(other===animal||!other.approach||
        ['gone','retreating','waiting'].includes(other.status))continue;
      blockers.push({x:other.approach.x,z:other.approach.z,
        radius:(other.radius??.28)+.1});
    }
    const reservedTargets=state.raid.animals.filter(other=>other!==animal&&
      other.targetId&&!other.targetId.startsWith('center-')&&
      !['gone','retreating','waiting'].includes(other.status))
      .map(other=>numericId(other.targetId));
    // Under the introductory limit, spare every crop that the existing
    // game rule protects. The planner still chooses among eligible sites.
    if(successor&&state.raid.introCropLimit!==undefined&&
       (state.raid.introCropsDestroyed??0)>=state.raid.introCropLimit){
      for(const crop of activeCrops(state.plants))if(!canAttackCrop(state,crop))reservedTargets.push(numericId(crop.id));
    }
    const blockerPtr=wasm.nav_intent_attack_blockers_ptr(blockers.length);
    if(!blockerPtr&&blockers.length)
      throw Error('Native attack blocker allocation failed');
    if(blockers.length){
      const rows=new Float64Array(wasm.memory.buffer,blockerPtr,
        blockers.length*3);
      for(let index=0;index<blockers.length;index++){
        const blocker=blockers[index],offset=index*3;
        rows[offset]=blocker.x;rows[offset+1]=blocker.z;
        rows[offset+2]=blocker.radius??.28;
      }
    }
    const reservedPtr=wasm.nav_intent_attack_reserved_targets_ptr(
      reservedTargets.length);
    if(!reservedPtr&&reservedTargets.length)
      throw Error('Native attack target lease allocation failed');
    if(reservedTargets.length)new Float64Array(wasm.memory.buffer,reservedPtr,
      reservedTargets.length).set(reservedTargets);
    return {blockerCount:blockers.length,reservedTargetCount:reservedTargets.length};
  };
  const planAttackCrop=(state,animal,{timedRoute=false}={})=>{
    if(typeof timedRoute!=='boolean'||timedRoute&&animal.status!=='walking')
      throw TypeError('Native timed AttackCrops currently requires a walking intention');
    if(!initialized||!state.raid)throw Error('No native raid intention session');
    const finished=nativeFinishedAnimalCrop(state,animal);
    const birth=raidFlight?.animal===animal&&!raidFlight.requestSequence&&nativeRaidFlightMember(state,animal)?raidFlight:null;
    if(birth?.centerAttack)return null;
    const transient=prepareAttackTransients(state,animal,!!finished||!!birth);
    if(!transient)return null;
    const plan=birth?wasm.nav_animal_plan_flight_crop:finished?wasm.nav_animal_plan_finished_crop:wasm.nav_intent_plan_attack_crop;
    const status=plan(numericId(animal.id),
      animal.x,animal.z,animal.radius,1,transient.blockerCount,
      transient.reservedTargetCount,timedRoute?1:0,...(birth?[wasm.nav_intent_session(),birth.birth.workerActor,
        birth.birth.sourceSequence,birth.animalBody,birth.center,animal.heading??0,animal.motionPhase??0]:[]));
    if(status<0)throw Error(`Native crop intention rejected: ${status}`);
    const values=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_attack_result_ptr(),13);
    if(status!==1)return {status:status===3?'unknown':
      status===4?'occupied':status===2?'blocked':'none',
      frontier:values[12]===1?{x:values[10],z:values[11]}:null,
      regionQueries:values[8],routeQueries:values[9],
      diagnostics:{firstCandidateCrop:values[1],preferredTrials:values[2],
        lastPreferredRouteCount:values[3],siteTrials:values[4],
        lastRouteCount:values[5],lastRegisterResult:values[6],
        unknownCauseMask:values[7]}};
    const targetId=values[1],target=cropObjects.get(targetId);
    const handle=routeHandle(values[4],values[5],values[6]);
    if(birth)birth.requestSequence=nativeAnimalCropState(animal.id)?.requestSequence;
    const waiting=!!finished||!!birth;
    const coordinates=waiting?null:routePoints(handle);
    if(!target||!waiting&&(!coordinates||coordinates.length<2||coordinates.length%2)){
      wasm.nav_intent_attack_cancel(numericId(animal.id));
      throw Error('Native crop intention has no confirmed JS target or route');
    }
    return {status:'found',target,reservation:targetReservationKey(target,animal),
      approach:{point:{id:`native-approach-${target.id}`,
        x:values[2],z:values[3]},path:waiting?null:Array.from(
        {length:coordinates.length/2},(_,index)=>({
          x:coordinates[index*2],z:coordinates[index*2+1]}))},
      native:true,routeHandle:handle,...(timedRoute?{motionPlan:nativeRouteTiming(handle)}:{}),groupId:values[7],
      regionQueries:values[8],routeQueries:values[9]};
  };
  const planAttackWall=(state,animal)=>{
    if(!initialized||!state.raid)throw Error('No native raid intention session');
    if(!prepareAttackTransients(state,animal))return null;
    const status=wasm.nav_intent_plan_attack_wall(numericId(animal.id),
      animal.x,animal.z,animal.radius);
    if(status<0)throw Error(`Native wall intention rejected: ${status}`);
    const values=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_wall_attack_result_ptr(),10);
    if(status!==1)return {status:status===3?'unknown':
      status===4?'occupied':status===2?'blocked':'none',
      candidatesExamined:values[8],routeQueries:values[9]};
    const target=state.structures.find(structure=>
      numericId(structure.id)===values[1]&&structure.kind==='wall'&&
      structure.status==='intact');
    const handle=routeHandle(values[4],values[5],values[6]);
    const coordinates=routePoints(handle);
    if(!target||!coordinates||coordinates.length<2||coordinates.length%2){
      wasm.nav_intent_attack_cancel(numericId(animal.id));
      throw Error('Native wall intention has no confirmed JS target or route');
    }
    return {status:'found',target,reservation:targetReservationKey(target,animal),
      approach:{point:{id:`native-approach-${target.id}`,
        x:values[2],z:values[3]},path:Array.from(
        {length:coordinates.length/2},(_,index)=>({
          x:coordinates[index*2],z:coordinates[index*2+1]}))},
      native:true,routeHandle:handle,groupId:values[7],
      candidatesExamined:values[8],routeQueries:values[9]};
  };
  const replanAttackRoute=animal=>{
    if(!animal.approach)throw Error('Animal has no confirmed attack approach');
    session.actorSectorRevision({worker:false,species:animal.species});
    const status=wasm.nav_intent_replan_attack_route(numericId(animal.id),
      animal.x,animal.z,animal.approach.x,animal.approach.z);
    // The native route planner distinguishes an incomplete graph from a
    // physically blocked route to this particular interaction point. Neither
    // verdict certifies that every side of the target is blocked.
    if(status===3)return {status:wasm.nav_intent_timing_rejection()!==0?'unknown':
      wasm.spatial_world_route_reason()===0?'blocked-approach':'unknown'};
    if(status!==1)throw Error(`Native attack reroute rejected: ${status}`);
    if(wasm.nav_intent_actor(numericId(animal.id))!==1)
      throw Error('Native attack reroute lost its active intention');
    const values=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const handle=routeHandle(values[4],values[5],values[6]);
    const points=routePoints(handle);
    if(!points||points.length<2||points.length%2)
      throw Error('Native attack reroute has no usable points');
    return {status:'found',routeHandle:handle,path:Array.from(
      {length:points.length/2},(_,index)=>({
        x:points[index*2],z:points[index*2+1]}))};
  };
  const planRetreatRoute=animal=>{
    const exit=animal.exit??animal.spawn;
    if(!exit)throw Error('Animal has no confirmed retreat exit');
    session.actorSectorRevision({worker:false,species:animal.species});
    const status=wasm.nav_intent_plan_retreat(numericId(animal.id),
      animal.x,animal.z,exit.x,exit.z);
    if(status===0||status===3)
      return {status:status===3?'unknown':'blocked'};
    if(status!==1)throw Error(`Native retreat route rejected: ${status}`);
    if(wasm.nav_intent_actor(numericId(animal.id))!==1)
      throw Error('Native retreat route lost its active intention');
    const values=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const handle=routeHandle(values[4],values[5],values[6]);
    const points=routePoints(handle);
    if(!points||points.length<2||points.length%2)
      throw Error('Native retreat route has no usable points');
    return {status:'found',routeHandle:handle,path:Array.from(
      {length:points.length/2},(_,index)=>({
        x:points[index*2],z:points[index*2+1]}))};
  };
  const planHomeRoute=(worker,home)=>{
    session.actorSectorRevision({worker:true});
    const status=wasm.nav_intent_plan_home(numericId(worker.id),
      worker.x,worker.z,home.x,home.z);
    if(status===-2)return {status:'unavailable'};
    if(status===0||status===3)
      return {status:status===3?'unknown':'blocked'};
    if(status!==1)throw Error(`Native home route rejected: ${status}`);
    if(wasm.nav_intent_actor(numericId(worker.id))!==1)
      throw Error('Native home route lost its active intention');
    const values=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const handle=routeHandle(values[4],values[5],values[6]);
    const points=routePoints(handle);
    if(!points||points.length<2||points.length%2)
      throw Error('Native home route has no usable points');
    return {status:'found',routeHandle:handle,path:Array.from(
      {length:points.length/2},(_,index)=>({
        x:points[index*2],z:points[index*2+1]}))};
  };
  // Older moving AttackCrops saves included the waypoints already traversed.
  // Recover a straight retrace only when the pose is exactly on that initial
  // run, facing forward. The normal native registration validates the suffix.
  const restoredCropPath=animal=>{
    const {path,x,z,heading}=animal;
    if(animal.species!=='warthog'||!animal.targetId.startsWith('plant-')||path.length<2)return path;
    const first=path[0],next=path[1],dx=next.x-first.x,dz=next.z-first.z;
    if((x-first.x)*dx+(z-first.z)*dz<=0||heading!==Math.atan2(dx,dz))return path;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],sx=b.x-a.x,sz=b.z-a.z;
      if(dx*sz!==dz*sx||dx*sx+dz*sz<=0)break;
      const t=Math.abs(sx)>=Math.abs(sz)?(x-a.x)/sx:(z-a.z)/sz;
      if(t>=0&&t<1&&x===a.x+sx*t&&z===a.z+sz*t)return path.slice(i);
    }
    return path;
  };
  const restoreAttackIntents=state=>{
    let committed=0,travelling=0,staleRoutes=0;
    const pendingAttackRouteIds=[],pendingAttackRouteResults=[];
    for(const animal of [...(state.raid?.animals??[])]
      .sort((left,right)=>numericId(left.id)-numericId(right.id))){
      if(!animal.targetId||['gone','retreating','waiting'].includes(animal.status))
        continue;
      session.actorSectorRevision({worker:false,species:animal.species});
      // The confirmed read model already indexes live crops and structures.
      // Saved crop history may be large and must not be scanned per animal.
      const targetId=numericId(animal.targetId);
      const target=animal.targetId.startsWith('plant-')?
        cropObjects.get(targetId):structuresById.get(targetId);
      if(animal.status==='attacking'){
        if(wasm.nav_intent_restore_attack_action(numericId(animal.id),
          numericId(animal.targetId),Number(!!animal.reservation&&
            state.raid.reservations[animal.reservation]===animal.id))!==1)
          throw Error(`Cannot restore committed animal attack ${animal.id}`);
        if(animal.approach)wasm.nav_intent_restore_attack_site(
          numericId(animal.id),animal.approach.x,animal.approach.z,
          animal.radius??.28);
        if(target?.kind==='wall'&&target.status==='intact')
          wasm.nav_intent_track_wall_opportunities(numericId(animal.id),
            animal.x,animal.z,animal.radius);
        committed++;continue;
      }
      if(!target||!animal.reservation||
        state.raid.reservations[animal.reservation]!==animal.id||
        'status' in target&&target.status!=='intact')continue;
      if(!Array.isArray(animal.path)||!animal.path.length){
        if(!animal.approach)continue;
        if(wasm.nav_intent_restore_attack_pending(numericId(animal.id),
          numericId(animal.targetId),1)!==1)
          throw Error(`Cannot restore pending animal attack ${animal.id}`);
        wasm.nav_intent_restore_attack_site(numericId(animal.id),
          animal.approach.x,animal.approach.z,animal.radius??.28);
        const replacement=replanAttackRoute(animal);
        if(replacement.status!=='found'){
          pendingAttackRouteIds.push(animal.id);
          pendingAttackRouteResults.push({id:animal.id,status:replacement.status});
        }else {
          animal.path=replacement.path;
          animal.destinationId=animal.approach.id;
          animal.pathVersion=session.topologySource.revision();
        }
        continue;
      }
      try{
        const path=restoredCropPath(animal);
        registerAttackIntent(state,animal,target,path);
        animal.path=path;travelling++;
      }
      catch(error){
        if(!/Native attack intention rejected: -5/.test(String(error)))throw error;
        animal.path=null;staleRoutes++;
        if(wasm.nav_intent_restore_attack_pending(numericId(animal.id),
          numericId(animal.targetId),1)!==1)
          throw Error(`Cannot restore stale animal route ${animal.id}`);
        if(animal.approach)wasm.nav_intent_restore_attack_site(
          numericId(animal.id),animal.approach.x,animal.approach.z,
          animal.radius??.28);
        const replacement=replanAttackRoute(animal);
        if(replacement.status!=='found'){
          pendingAttackRouteIds.push(animal.id);
          pendingAttackRouteResults.push({id:animal.id,status:replacement.status});
        }else {
          animal.path=replacement.path;
          animal.destinationId=animal.approach.id;
          animal.pathVersion=session.topologySource.revision();
        }
      }
    }
    return {restoredAnimalAttacks:committed,restoredAnimalRoutes:travelling,
      invalidSavedAnimalRoutes:staleRoutes,pendingAttackRouteIds,
      pendingAttackRouteResults};
  };
  const restoreRetreatIntents=state=>{
    const restoredRetreatRouteIds=[];
    let invalidSavedRetreatRoutes=0;
    for(const animal of [...(state.raid?.animals??[])]
      .filter(item=>item.status==='retreating'&&item.path?.length)
      .sort((left,right)=>numericId(left.id)-numericId(right.id))){
      const exit=animal.exit??animal.spawn;
      if(!exit||animal.path.length>4096){invalidSavedRetreatRoutes++;continue;}
      session.actorSectorRevision({worker:false,species:animal.species});
      const pointer=wasm.nav_intent_attack_route_input_ptr(animal.path.length);
      if(!pointer){invalidSavedRetreatRoutes++;continue;}
      const input=new Float32Array(wasm.memory.buffer,pointer,
        animal.path.length*2);
      for(let index=0;index<animal.path.length;index++){
        input[index*2]=animal.path[index].x;
        input[index*2+1]=animal.path[index].z;
      }
      const status=wasm.nav_intent_restore_retreat(numericId(animal.id),
        animal.x,animal.z,exit.x,exit.z,animal.path.length);
      if(status===1)restoredRetreatRouteIds.push(animal.id);
      else invalidSavedRetreatRoutes++;
    }
    return {restoredRetreatRouteIds,invalidSavedRetreatRoutes};
  };
  const restoreHomeIntents=state=>{
    // Assigned tasks initialize the empty intent index first. Home declarations
    // then join that same session, before any physical bodies are admitted.
    for(const worker of [...state.workers].filter(w=>w.nativeRouteAdmission==='pending-home-resources').sort((a,b)=>numericId(a.id)-numericId(b.id))){
      const village=state.villages.find(v=>v.id===worker.villageId),home=village.entry??village;session.actorSectorRevision({worker:true});
      if(wasm.nav_intent_restore_home_request(numericId(worker.id),numericId(village.id),home.x,home.z,worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining)!==1)throw Error('Native Home declaration rejected');
    }
    const restoredHomeRouteIds=[];
    let invalidSavedHomeRoutes=0;
    const villages=new Map(state.villages.map(village=>[village.id,village]));
    for(const worker of [...state.workers]
      .filter(item=>['returning','fleeing','incapacitated'].includes(item.status)&&
        item.path?.length)
      .sort((left,right)=>numericId(left.id)-numericId(right.id))){
      const village=villages.get(worker.villageId),home=village?.entry??village;
      if(!home||worker.path.length>4096){invalidSavedHomeRoutes++;continue;}
      session.actorSectorRevision({worker:true});
      const pointer=wasm.nav_intent_attack_route_input_ptr(worker.path.length);
      if(!pointer){invalidSavedHomeRoutes++;continue;}
      const input=new Float32Array(wasm.memory.buffer,pointer,
        worker.path.length*2);
      for(let index=0;index<worker.path.length;index++){
        input[index*2]=worker.path[index].x;
        input[index*2+1]=worker.path[index].z;
      }
      const status=wasm.nav_intent_restore_home(numericId(worker.id),
        worker.x,worker.z,home.x,home.z,worker.path.length);
      if(status===1)restoredHomeRouteIds.push(worker.id);
      else invalidSavedHomeRoutes++;
    }
    return {restoredHomeRouteIds,invalidSavedHomeRoutes};
  };
  const restoreFarmArrivalIntents=state=>{const workers=state.workers.filter(w=>w.nativeRouteAdmission==='pending-farm-arrival-resources').sort((a,b)=>numericId(a.id)-numericId(b.id));for(const worker of workers)declareNativeFarmArrivalRequest(worker,{canonical:true});return {restoredFarmArrivalIds:workers.map(w=>w.id)};};
  const restoreInitialIdleIntents=state=>{
    const workers=state.workers.filter(w=>w.nativeRouteAdmission==='pending-idle-resources').sort((a,b)=>numericId(a.id)-numericId(b.id));
    for(const worker of workers)declareNativeInitialIdleRequest(worker,{canonical:true});
    return {restoredInitialIdleIds:workers.map(w=>w.id)};
  };
  const restoreIdleStrollIntents=state=>{
    const workers=state.workers.filter(w=>w.nativeRouteAdmission==='pending-stroll-resources').sort((a,b)=>numericId(a.id)-numericId(b.id));
    for(const worker of workers){const {pose:p,idleState:i,anchor:a,calibration:c,approach}=restoredStrollGameState(state,worker);session.actorSectorRevision({worker:true});
      const retainsRemaining=approach&&i.remaining!==c.idleSeconds*2,args=[numericId(worker.id),PROFILES.findIndex(v=>v.id===worker.profile),a.kind,a.id,a.x,a.z,a.radius,c.idleSeconds,i.rng,i.approachRetry,i.destination.x,i.destination.z,p.yaw,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining],method=retainsRemaining?'nav_intent_restore_idle_approach_state':approach?'nav_intent_restore_idle_approach':'nav_intent_restore_idle_stroll';
      if(retainsRemaining)args.push(i.remaining);if(wasm[method](...args)!==1)throw Error('Native saved stroll declaration rejected');}
    return {restoredIdleStrollIds:workers.map(w=>w.id)};
  };
  const api={get authorityEpoch(){return epoch();},resetFromState,applyEvents,applyCommittedEvents,planTasks,
    nativeIntentControlBaseline,nativeWorldResourceBoundary,observeNativeIntentControl,flushNativeIntentControl,nativeCausalClock,commitNativeCausalClock,
    restoreAssignedTasks,restoreAttackIntents,restoreRetreatIntents,
    restoreHomeIntents,restoreFarmArrivalIntents,restoreInitialIdleIntents,restoreIdleStrollIntents,declareNativeInitialIdleRequest,declareNativeFarmArrivalRequest,
    proposalRoute,pendingTaskRoute,nativeTaskStartBinding,startNativeTaskRouteAfterGpuQuiescence,
    getDamagedWalls:()=>getDamaged('wall'),
    getDamagedCenters:()=>getDamaged('center'),
    structureFor:id=>structuresById.get(numericId(id))??null,
    getUnprotectedCropGroups,
    findPlantingSite,releasePlantingSite,
    prepareNativeCenterRuin,takeRefugeReturn,intentChanges,routePoints,replanNativeShieldCrop,startNativeAnimalCropRouteAfterGpuQuiescence:options=>acquireNativeAnimalCrop(options,26),startNativeAnimalCropStrikeAfterGpuQuiescence:options=>acquireNativeAnimalCrop(options,27),requestNativeAnimalCropRoute,requestRestoredAnimalStrike,requestNativeProtectedSuccessor,requestNativeCenterSuccessor,acquireEncounterRetreat,prepareEncounterRetreat,observeRetreatEncounter,hasRetreatEncounter,applyRetreatEncounter,prepareEncounterExhaustion,consumeEncounterExhaustion,confirmEncounterExhaustion,encounterRetreatOwner,requestEncounterRetreat,encounterCheckpoint,restoreEncounterWorker,restoreEncounterApproach,encounterApproachPending,encounterCheckpointBlocked,encounterRecoveryCurrent,finishEncounterRecovery,requestEncounterHome,prepareHomeEncounterImpact,prepareCenterEncounterStep,consumeHomeEncounterImpact,verifyEncounterBoundary,declareRaidFlightPair,nativeRaidFlightMember,nativeCenterFlightAnimalReady,requestNativeRetreat,requestRestoredAnimalRetreat,finishNativeRetreat,nativeFinishedAnimalRetreat,nativeFinishedAnimalCrop,nativeAnimalCropState,nativeAnimalCropRouteExecution,nativeEncounterFallRecovery,nativeStationaryEncounterRecovery,nativeRaidFlightRecoveryExecutions,nativeRefugeCropRecovery,nativeCenterRuinRetreatRecovery,nativeAnimalCropStrikeExecution,nativeAnimalRouteBinding,nativeRouteTiming,nativeRouteTimeKnots,sampleNativeRoute,captureNativeRoutePresentation,nativeGateRouteSweep,nativeGateMechanism,nativeGateMechanismPose,nativeGateMechanismSegment,nativeGateMechanismWorldVertices,prepareNativeGateMotionAfterGpuFence,inspectNativeStructureStops,inspectNativeGateAdditionStops,inspectNativeGateRemovalStops,addNativeBarriersAfterGpuQuiescence,addNativeBarrierAfterGpuQuiescence,mutateNativeOverlayAfterGpuQuiescence,mutateNativeWorldAfterGpuQuiescence,stopNativeIdleStrollAfterGpuQuiescence,stopNativeFarmArrivalAfterGpuQuiescence,prepareNativeRouteMotion,reserveNativeRoute,admitNativeGateRoute,nativeGateCrossings,nativeSuspendedGateRoute,suspendNativeGateRoute,resumeNativeGateRoute,resumeNativeGateRouteAfterGpuQuiescence,prepareNativeGateResumeProposal,captureNativeGateResumeProposal,cancelNativeGateResumeProposal,revalidateNativeGateResumeProposal,prepareNativeTaskStartProposal,captureNativeTaskStartProposal,revalidateNativeTaskStartProposal,cancelNativeTaskStartProposal,
    beginNativeRouteExecution,advanceNativeRouteExecution,stopNativeRouteExecution,nativeRouteExecution,nativeGameExecutionState,advanceNativeGameExecution,nativeTaskExecution,nativeTaskCancellationSource,nativeTaskCancellationSupported,cancelNativePendingTask,requestNativeTaskActionResources,nativeTaskActionRequest,
    startNativeTaskActionAfterGpuQuiescence,prepareNativeTaskActionProposal,captureNativeTaskActionProposal,revalidateNativeTaskActionProposal,cancelNativeTaskActionProposal,cancelNativeTaskActionForRaidFlight,
    nativeTaskActionBinding,nativeTaskActionBindings,nativeTaskActionExecution,nativeTaskActionRestoreReferences,
    nativeWorkerHomeInactive,startNativeHomeArrivalAfterGpuQuiescence,prepareNativeHomeArrivalProposal,captureNativeHomeArrivalProposal,revalidateNativeHomeArrivalProposal,cancelNativeHomeArrivalProposal,
    nativeIdleStrollDeclarationReference,requestNativeRestoredIdleStrollHome,nativeIdleStrollRequestReference,nativeIdleStrollSourceRequestReference,nativeIdleStrollRequestReferences,
    nativeIdleStrollFailedRestReference,startNativeIdleStrollAfterGpuQuiescence,nativeIdleStrollBinding,nativeIdleStrollBindings,nativeIdleStrollExecution,nativeIdleStrollHeldExecution,prepareNativeIdleStrollStopProposal,captureNativeIdleStrollStopProposal,revalidateNativeIdleStrollStopProposal,cancelNativeIdleStrollStopProposal,nativeIdleStrollStopBinding,prepareNativeFarmArrivalStopProposal,captureNativeFarmArrivalStopProposal,revalidateNativeFarmArrivalStopProposal,cancelNativeFarmArrivalStopProposal,nativeFarmArrivalStopBinding,prepareNativeIdleStrollProposal,captureNativeIdleStrollProposal,revalidateNativeIdleStrollProposal,cancelNativeIdleStrollProposal,
    prepareNativeTaskRouteStopProposal,captureNativeTaskRouteStopProposal,revalidateNativeTaskRouteStopProposal,cancelNativeTaskRouteStopProposal,nativeTaskRouteStopBinding,
    stopNativeTaskRouteAfterGpuQuiescence,
    requestNativeTaskHomeFromCompletion,requestNativeTaskHomeFromStop,requestNativeRepairFlight,
    nativeIdleCycleBinding,nativeIdleCycleBindings,nativeIdleCycleNextRequest,nativeIdleCycleExecution,prepareNativeIdleCycleProposal,startNativeIdleCycleAfterGpuQuiescence,captureNativeIdleCycleProposal,revalidateNativeIdleCycleProposal,cancelNativeIdleCycleProposal,
    prepareNativeFarmArrivalContinuationProposal,prepareNativeFarmArrivalRouteProposal,captureNativeFarmArrivalRouteProposal,revalidateNativeFarmArrivalRouteProposal,cancelNativeFarmArrivalRouteProposal,nativeFarmArrivalRouteSourceRequestReference,nativeFarmArrivalRouteBinding,nativeFarmArrivalRouteBindings,nativeFarmArrivalRouteExecution,nativeFarmArrivalHeldExecution,
    nativeFarmArrivalRequestReference,nativeFarmArrivalRequestReferences,nativeFarmArrivalDeclarationReference,nativeFarmArrivalIdleSource,nativeSettlementIdleSource,
    continueNativeFarmArrivalAfterGpuQuiescence,startNativeFarmArrivalAfterGpuQuiescence,nativeInitialIdleRequestReference,nativeInitialIdleRequestReferences,nativeInitialIdleDeclarationReference,requestNativeInitialIdleHome,requestNativeInitialIdleBodyHome,nativeInitialIdleBodyBinding,nativeInitialIdleBodyBindings,nativeInitialIdleBodyState,requestNativeIdleCycleHome,requestNativeIdleStrollHome,requestNativeFarmArrivalHome,prepareNativeInitialIdleBodyProposal,captureNativeInitialIdleBodyProposal,revalidateNativeInitialIdleBodyProposal,cancelNativeInitialIdleBodyProposal,startNativeInitialIdleBodyAfterGpuQuiescence,requestNativeIdleHome,startNativeHomeRouteAfterGpuQuiescence,nativeHomeDeclarationReference,nativeHomeRequestReference,nativeHomeRequestReferences,nativeHomeRouteBinding,nativeHomeRouteBindings,nativeHomeRouteExecution,prepareNativeHomeRouteProposal,captureNativeHomeRouteProposal,revalidateNativeHomeRouteProposal,cancelNativeHomeRouteProposal,
    startNativeTaskSettlementAfterGpuQuiescence,nativeTaskSettlementBinding,nativeTaskSettlementBindings,nativeSettledWorkerExecution,prepareNativeTaskSettlementProposal,captureNativeTaskSettlementProposal,revalidateNativeTaskSettlementProposal,cancelNativeTaskSettlementProposal,
    nativeTaskConsequenceBinding,nativeDeliveryExecution,startNativeTaskConsequenceAfterGpuQuiescence,prepareNativeTaskConsequenceProposal,captureNativeTaskConsequenceProposal,revalidateNativeTaskConsequenceProposal,cancelNativeTaskConsequenceProposal,
    projectRouteProgress,processEventBoundary,requestReroute,
    registerAttackIntent,requestNativeCenterBirth,planAttackCrop,planAttackWall,replanAttackRoute,
    planRetreatRoute,planHomeRoute,
    cancelHomeIntent:actorId=>wasm.nav_intent_cancel_home(numericId(actorId))===1,
    reconsiderWallOpportunity,wallOpportunityCandidates,
    markAttackActive:actorId=>wasm.nav_intent_attack_action_active(numericId(actorId))===1,
    finishAttackIntent:actorId=>wasm.nav_intent_attack_finished(numericId(actorId)),
    cancelAttackIntent:actorId=>wasm.nav_intent_attack_cancel(numericId(actorId))===1,
    retireActor:actorId=>wasm.nav_intent_retire_actor(numericId(actorId))===1,
    reconcileTopology:()=>wasm.nav_intent_reconcile_topology(),
    replanPendingRoutes:()=>wasm.nav_intent_replan_pending_routes(),
    markActionActive:actorId=>wasm.nav_intent_action_active(numericId(actorId))===1,
    finishAction:actorId=>wasm.nav_intent_finish(numericId(actorId))===1,
    discard:()=>wasm.nav_intent_discard(),
    commit:()=>wasm.nav_intent_commit(),
    commitResourceRequests:()=>{if(wasm.nav_intent_task_resource_request_version?.()!==1)throw Error('Rebuild native task resource requests');return wasm.nav_intent_commit_resource_requests();},
    sequence:()=>sequence};
  // Timestamp at authoritative mutation boundaries, not when a renderer or a
  // delayed resource job drains the log. Read-only route access stays untouched.
  for(const name of ['applyEvents','applyCommittedEvents','planTasks',
    'restoreAssignedTasks','restoreAttackIntents','restoreRetreatIntents',
    'restoreHomeIntents','restoreInitialIdleIntents','findPlantingSite','releasePlantingSite',
    'processEventBoundary','requestReroute','registerAttackIntent','planAttackCrop',
    'planAttackWall','replanAttackRoute','planRetreatRoute','planHomeRoute',
    'cancelHomeIntent','reconsiderWallOpportunity','markAttackActive',
    'finishAttackIntent','cancelAttackIntent','retireActor','reconcileTopology',
    'replanPendingRoutes','markActionActive','finishAction','commit','commitResourceRequests']){
    const operation=api[name];
    api[name]=(...args)=>{
      syncBoundaryTime();
      try{return operation(...args);}finally{if(controlObservers.size)flushNativeIntentControl();}
    };
  }
  return api;
}

function structureCondition(structure){
  const hp=structure.hp,maxHp=structure.maxHp;
  const damage=maxHp>0?Math.max(0,1-hp/maxHp):0;
  const severity=structure.status==='ruined'?'breach':
    structure.status==='collapsing'||damage>=.8?'critical':
    damage>=.5?'severe':damage>=.2?'repairable':
    damage>0?'minor':'healthy';
  return {hp,maxHp,status:structure.status,kind:structure.kind,
    gate:!!structure.gate,severity,
    enclosureId:structure.defenseEnclosureId??null,
    plannedGroupId:structure.defenseGroupId??null};
}

// Experimental action-level gate for the global worker task queue. Callers
// deliver committed deltas at action boundaries; ordinary movement never
// invokes the native planner. A pending physical result gets one bounded
// recovery retry in case a dynamic obstruction produced no reliable event.
export function createEventDrivenTaskPlanner(session,{qualifyFarmFlee=false,qualifyRaidEncounter=false,retrySeconds=8,authorityEpoch,onNativeWorldResources=null,onNativeAnimalDeparted=null,onNativeRefugeReturn=null,repairFlightTicket=()=>0}={}){
  if(!Number.isFinite(retrySeconds)||retrySeconds<=0)
    throw RangeError('retrySeconds must be positive');
  const bridge=createSpatialIntentBridge(session,{qualifyFarmFlee,qualifyRaidEncounter,authorityEpoch,onNativeWorldResources});
  const eligible=new Set(),requests=new Map(),animalRequests=new Map(),
    workerPlanCounts=new Map(),animalPlanCounts=new Map(),
    workerPeakPerMinute=new Map(),animalPeakPerMinute=new Map(),
    projectedPositions=new Map(),pendingAttackRoutes=new Map(),
    tacticalReconsiderations=new Set(),retreatRoutes=new Set(),
    homeRoutes=new Set(),homeAttempts=new Map(),
    cropProtectionListeners=new Set(),structureConditionListeners=new Set();
  let cropProtectionSnapshot=null;
  let structureConditionSnapshot=null;
  let pendingTaskEvents=[];
  let pendingWorldEvents=[];
  let observedTaskState=null,stopTaskObserver=null,stopWorldObserver=null;
  let dirty=true,nextRetry=Infinity,lastTime=-Infinity,total=0,
    animalTotal=0,taskRouteQueries=0,taskCandidates=0,initialized=false;
  let homePlanAttempts=0,homePlanFound=0,homePlanFallbacks=0,
    homeRoutesRestored=0;
  const homeFallbacksByStatus={blocked:0,unknown:0,unavailable:0};
  const homeFallbackSamples=[];
  let topologyReconciliations=0,topologyRouteInvalidations=0;
  let lastNavigationVersion=null,pendingNativeChanges=true;
  let lastPlan=null,lastPlanFacts=null,sourceState=null;
  const markPendingAttackRoute=(actorId,status,elapsed)=>{
    const id=typeof actorId==='number'?actorId:numericId(actorId);
    pendingAttackRoutes.set(id,{
      status,since:elapsed,nextRetry:elapsed+retrySeconds,attempts:0});
  };
  const setWorker=(worker,state)=>{
    const id=numericId(worker.id);
    if(workerRow(worker,state)[6])eligible.add(id);
    else eligible.delete(id);
    projectedPositions.set(id,[worker.x,worker.z]);
  };
  const resetFromState=(state,{restoredEncounterApproach=false}={})=>{
    normalizeNativeIntentRestoration(state,session.core.wasm);
    initialized=false;
    sourceState=state;
    if(observedTaskState!==state){
      stopTaskObserver?.();stopTaskObserver=null;
      stopWorldObserver?.();stopWorldObserver=null;
      observedTaskState=null;
    }
    const result=bridge.resetFromState(state);
    const restored=bridge.restoreAssignedTasks(state);
    const restoredAnimals=restoredEncounterApproach?{pendingAttackRouteResults:[]}:bridge.restoreAttackIntents(state);
    const restoredRetreats=bridge.restoreRetreatIntents(state);
    const restoredHomes=bridge.restoreHomeIntents(state);
    const restoredFarmArrivals=bridge.restoreFarmArrivalIntents(state);
    const restoredInitialIdles=bridge.restoreInitialIdleIntents?.(state)??{restoredInitialIdleIds:[]};
    const restoredStrolls=bridge.restoreIdleStrollIntents?.(state)??{restoredIdleStrollIds:[]};
    homeRoutesRestored=restoredHomes.restoredHomeRouteIds.length;
    eligible.clear();projectedPositions.clear();pendingAttackRoutes.clear();
    retreatRoutes.clear();
    homeRoutes.clear();homeAttempts.clear();
    for(const id of restoredRetreats.restoredRetreatRouteIds)
      retreatRoutes.add(numericId(id));
    for(const id of restoredHomes.restoredHomeRouteIds)
      homeRoutes.add(numericId(id));
    tacticalReconsiderations.clear();
    requests.clear();animalRequests.clear();
    workerPlanCounts.clear();animalPlanCounts.clear();
    workerPeakPerMinute.clear();animalPeakPerMinute.clear();
    for(const pending of restoredAnimals.pendingAttackRouteResults)
      markPendingAttackRoute(pending.id,pending.status,state.elapsed);
    pendingTaskEvents=[];pendingWorldEvents=[];
    total=0;animalTotal=0;taskRouteQueries=0;taskCandidates=0;
    homePlanAttempts=0;homePlanFound=0;homePlanFallbacks=0;
    topologyReconciliations=0;topologyRouteInvalidations=0;
    lastPlan=null;lastPlanFacts=null;
    for(const worker of state.workers)setWorker(worker,state);
    dirty=true;nextRetry=Infinity;lastTime=-Infinity;
    lastNavigationVersion=null;
    pendingNativeChanges=true;
    initialized=true;
    if(cropProtectionListeners.size)cropProtectionSnapshot=new Map(
      bridge.getUnprotectedCropGroups({includeProtected:true})
        .map(group=>[group.id,group]));
    else cropProtectionSnapshot=null;
    structureConditionSnapshot=structureConditionListeners.size?
      new Map(state.structures.map(item=>[item.id,structureCondition(item)])):null;
    return {...result,...restored,...restoredAnimals,...restoredRetreats,
      ...restoredHomes,...restoredFarmArrivals,...restoredInitialIdles,...restoredStrolls};
  };
  const publishCropProtectionChanges=({cropOnly=false,cropAdded=false}={})=>{
    if(!cropProtectionListeners.size)return;
    if(cropOnly&&!cropAdded&&!Array.from(cropProtectionSnapshot?.values()??[])
      .some(group=>group.protection==='protected'))return;
    const next=new Map(bridge.getUnprotectedCropGroups({includeProtected:true})
      .map(group=>[group.id,group]));
    const previous=cropProtectionSnapshot;
    cropProtectionSnapshot=next;
    if(!previous)return;
    // A native group's ID is its lowest crop ID. Harvesting that crop can
    // change the ID in the same event batch that opens a wall breach. Follow
    // surviving members so the protection transition is still delivered.
    let priorByCrop;
    if([...next.keys()].some(id=>!previous.has(id))||
       [...previous.keys()].some(id=>!next.has(id))){
      priorByCrop=new Map();
      for(const group of previous.values())
        for(const cropId of group.cropIds)priorByCrop.set(cropId,group);
    }
    for(const [id,group] of next){
      let old=previous.get(id);
      if(priorByCrop){
        const ancestors=group.cropIds.map(cropId=>priorByCrop.get(cropId))
          .filter(Boolean);
        if(group.protection!=='protected')
          old=ancestors.find(ancestor=>ancestor.protection==='protected')??old;
        old??=ancestors[0];
      }
      if((!old&&group.protection!=='unprotected')||
          old?.protection===group.protection)continue;
      const change={type:'CropGroupProtectionChanged',groupId:id,
        previous:old?.protection??null,protection:group.protection,group};
      for(const listener of cropProtectionListeners)listener(change);
    }
  };
  const observeCropProtection=listener=>{
    if(!initialized)throw Error('Reset the native intent session before observing crop protection');
    if(typeof listener!=='function')throw TypeError('Expected a crop protection listener');
    if(!cropProtectionListeners.size)cropProtectionSnapshot=new Map(
      bridge.getUnprotectedCropGroups({includeProtected:true})
        .map(group=>[group.id,group]));
    cropProtectionListeners.add(listener);
    return ()=>{
      cropProtectionListeners.delete(listener);
      if(!cropProtectionListeners.size)cropProtectionSnapshot=null;
    };
  };
  const publishStructureConditionChanges=events=>{
    if(!structureConditionListeners.size)return;
    const ids=new Set(events.filter(event=>
      ['StructureHit','StructureRuined','RepairApplied','WallRemoved']
        .includes(event.type)).map(event=>event.targetId));
    for(const event of events){
      if(event.type==='PlacementCommitted'&&
        (event.kind==='wall'||event.kind==='center')&&
        !ids.has(event.targetId)){
        const entity=bridge.structureFor(event.targetId);
        if(entity)structureConditionSnapshot.set(entity.id,structureCondition(entity));
      }else if(event.type==='WallChainBuilt'){
        const first=numericId(event.targetId);
        for(let offset=0;offset<event.count;offset++){
          const id=`structure-${first+offset}`;
          if(ids.has(id))continue;
          const entity=bridge.structureFor(id);
          if(entity)structureConditionSnapshot.set(id,structureCondition(entity));
        }
      }
    }
    for(const id of [...ids].sort((a,b)=>numericId(a)-numericId(b))){
      const before=structureConditionSnapshot.get(id)??null;
      const current=bridge.structureFor(id);
      const after=current?structureCondition(current):null;
      if(!before&&!after)continue;
      if(after)structureConditionSnapshot.set(id,after);
      else structureConditionSnapshot.delete(id);
      if(before?.hp===after?.hp&&before?.status===after?.status)continue;
      const kind=!after?'removed':after.status==='ruined'&&
        before?.status!=='ruined'?(after.kind==='wall'?'breach':'ruined'):
        after.hp>(before?.hp??after.maxHp)?
        'repaired':'damaged';
      const change={type:'StructureConditionChanged',change:kind,
        structureId:id,kind:after?.kind??before.kind,
        gate:after?.gate??before.gate,enclosureId:after?.enclosureId??
          before?.enclosureId??null,plannedGroupId:after?.plannedGroupId??
          before?.plannedGroupId??null,
        hp:after?.hp??0,maxHp:after?.maxHp??before.maxHp,
        previousHp:before?.hp??null,status:after?.status??'removed',
        previousStatus:before?.status??null,
        severity:after?.severity??'breach',
        thresholdCrossed:before?.severity!==after?.severity};
      for(const listener of structureConditionListeners)listener(change);
    }
  };
  const observeStructureCondition=listener=>{
    if(!initialized)throw Error('Reset the native intent session before observing structures');
    if(typeof listener!=='function')throw TypeError('Expected a structure condition listener');
    if(!structureConditionListeners.size)structureConditionSnapshot=new Map(
      (observedTaskState??sourceState).structures.map(item=>
        [item.id,structureCondition(item)]));
    structureConditionListeners.add(listener);
    return ()=>{
      structureConditionListeners.delete(listener);
      if(!structureConditionListeners.size)structureConditionSnapshot=null;
    };
  };
  const applyEvents=(state,events)=>{
    if(lastPlan?.some(row=>row.status===1))dirty=true;
    lastPlan=null;lastPlanFacts=null;
    let result;
    const previousChanges=session.core.wasm.nav_intent_change_count();
    try{result=bridge.applyEvents(state,events);}
    catch(error){
      // The bridge has rebuilt WASM from authoritative JS state. Rebuild this
      // gate's eligibility view as well, so recovery cannot miss a wakeup.
      eligible.clear();projectedPositions.clear();
      for(const worker of state.workers)setWorker(worker,state);
      dirty=true;nextRetry=Infinity;
      throw error;
    }
    for(const event of events)if(event.type==='worker'){
      if(event.remove){
        const id=numericId(event.id);
        eligible.delete(id);projectedPositions.delete(id);
        requests.delete(id);workerPlanCounts.delete(id);workerPeakPerMinute.delete(id);
        homeRoutes.delete(id);homeAttempts.delete(id);
      }
      else setWorker(event.entity,state);
    }
    const planningChanged=events.some(event=>event.type!=='structureDamage');
    if(planningChanged)dirty=true;
    if(planningChanged||
      session.core.wasm.nav_intent_change_count()>previousChanges)
      pendingNativeChanges=true;
    const topology=events.some(event=>event.type==='target'&&!event.remove&&
      (event.entity.kind==='wall'||event.entity.kind==='center'));
    const crops=events.some(event=>event.type==='target'&&
      (event.remove||'alive' in event.entity));
    if(topology||crops)publishCropProtectionChanges({cropOnly:!topology,
      cropAdded:events.some(event=>event.type==='target'&&!event.remove&&
        event.entity.id?.startsWith('plant-'))});
    return result;
  };
  const planIfNeeded=simulatedSeconds=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(!Number.isFinite(simulatedSeconds)||simulatedSeconds<lastTime)
      throw RangeError('Simulation time must be finite and monotonic');
    lastTime=simulatedSeconds;
    if(pendingWorldEvents.length)flushWorldEvents();
    if(pendingTaskEvents.length)flushTaskEvents();
    if(!dirty&&simulatedSeconds<nextRetry)return null;
    if(!eligible.size||!session.core.wasm.nav_intent_task_count()){
      dirty=false;nextRetry=Infinity;lastPlan=[];lastPlanFacts=new Map();return lastPlan;
    }
    // Idle workers can move while awaiting a task. Refresh only changed
    // positions at an actual planning boundary; movement ticks do not query
    // native navigation or rebuild the worker roster.
    syncChangedPositions(false);
    const before=new Map([...eligible].map(id=>
      [id,session.core.wasm.nav_intent_actor_planning_calls(id)]));
    const result=bridge.planTasks();
    taskRouteQueries+=session.core.wasm.nav_intent_route_queries();
    taskCandidates+=session.core.wasm.nav_intent_candidate_count();
    lastPlan=result;
    const state=observedTaskState??sourceState;
    const tasks=new Map(state.tasks.map(task=>[numericId(task.id),task]));
    const workers=new Map(state.workers.map(worker=>[numericId(worker.id),worker]));
    const targetFor=taskTargetLookup(state);
    lastPlanFacts=new Map(result.filter(row=>row.status===1).map(row=>{
      const task=tasks.get(row.taskId),worker=workers.get(row.workerId);
      const target=task&&targetFor(task.targetId);
      if(!task||!worker||!target)throw Error('Native task proposal has no JS counterpart');
      return [task.id,{workerId:worker.id,targetId:task.targetId,
        centerId:task.centerId,kind:task.kind,
        workerX:worker.x,workerZ:worker.z,targetX:target.x,targetZ:target.z}];
    }));
    dirty=false;
    nextRetry=result.some(row=>row.status===2||row.status===3)?
      simulatedSeconds+retrySeconds:Infinity;
    total++;
    for(const id of eligible){
      const count=session.core.wasm.nav_intent_actor_planning_calls(id)-before.get(id);
      if(!count)continue;
      let times=requests.get(id);
      if(!times)requests.set(id,times=[]);
      for(let index=0;index<count;index++)times.push(simulatedSeconds);
      while(times.length&&times[0]<=simulatedSeconds-60)times.shift();
      workerPlanCounts.set(id,(workerPlanCounts.get(id)??0)+count);
      workerPeakPerMinute.set(id,Math.max(workerPeakPerMinute.get(id)??0,times.length));
    }
    return result;
  };
  const commitTaskBatchToState=(state,plan,{navVersion,pendingResources=false}={})=>{
    if(typeof pendingResources!=='boolean')throw TypeError('Invalid native route resource policy');
    if(plan!==lastPlan||!Number.isFinite(navVersion))
      throw Error('Native proposal is not the current planning batch');
    if(pendingTaskEvents.length||pendingWorldEvents.length)
      throw Error('Confirmed events must be processed before committing a proposal');
    const tasksByNumericId=new Map(state.tasks.map(task=>[numericId(task.id),task]));
    const workersByNumericId=new Map(state.workers.map(worker=>[numericId(worker.id),worker]));
    const targetFor=taskTargetLookup(state);
    const assignments=[];let awaitingSourceTransfer=false;
    for(const row of plan){
      if(row.status!==1)continue;
      const task=tasksByNumericId.get(row.taskId),worker=workersByNumericId.get(row.workerId);
      const target=task&&targetFor(task.targetId);
      if(!task||!worker||!target||'alive' in target&&!target.alive||
        'delivered' in target&&target.delivered||
        task.kind==='repair'&&target.hp>=target.maxHp)
        throw Error('Native proposal target changed before commit');
      const farm=pendingResources&&worker.nativeRouteAdmission==='native-farm-arrival'?bridge.nativeFarmArrivalRouteExecution(worker.id):null,stroll=pendingResources&&worker.nativeRouteAdmission==='native-idle-stroll'?bridge.nativeIdleStrollExecution(worker.id):null,stopping=!!stroll||!!farm&&!(farm.arrived&&farm.running===false&&farm.currentSpeed===0&&farm.executedThrough>=farm.binding.reference.endTime);
      if(stopping)awaitingSourceTransfer=true;
      const fact=lastPlanFacts.get(task.id);
      if(!fact||fact.workerId!==worker.id||fact.targetId!==task.targetId||
        fact.centerId!==task.centerId||fact.kind!==task.kind||
        fact.workerX!==worker.x||fact.workerZ!==worker.z||
        fact.targetX!==target.x||fact.targetZ!==target.z||
        workerRow(worker,state)[6]!==1&&!stopping)
        throw Error('Native proposal inputs changed before commit');
      if(stroll)fact.awaitingIdleStrollTransfer=true;
      const path=bridge.proposalRoute(row);
      const interaction=['repair','initial','water'].includes(task.kind);
      const destination=interaction?{
        id:`native-point-${task.id}`,x:row.approach.x,z:row.approach.z}:target;
      assignments.push({taskId:task.id,workerId:worker.id,path,destination});
    }
    if(!pendingResources&&assignments.some(a=>bridge.nativeTaskSettlementBinding(a.workerId)))throw Error('Native stationary ownership requires prepared task resources');
    // The existing batch owns the choice until prepared stop12/24 transfers
    // the body. If WALK finishes first, its ordinary REST21 successor owns
    // the transfer instead. The actual native event wakes replanning.
    // Never attempt a Task commit against a still-owned22 and clear its choice.
    if(awaitingSourceTransfer){
      // This proposal cannot commit before ownership changes. Retain its JS
      // choice for stop12, but release the native draft so terminal WALK can
      // prepare REST21 if it arrives before the stop is ready.
      if([...lastPlanFacts.values()].some(f=>f.awaitingIdleStrollTransfer))bridge.discard();
      return 0;
    }
    // Validate the JS side before committing WASM. A stale native revision
    // rejects the whole lease; no JS task or worker has changed yet.
    applyConfirmedTaskAssignments(state,assignments,navVersion,{validateOnly:true,pendingResources});
    const committed=pendingResources?bridge.commitResourceRequests():bridge.commit();
    if(committed!==assignments.length){
      lastPlan=null;dirty=true;
      // A rejected unpublished batch cannot reset bodies/clocks already owned
      // by the native cohort or invalidate its retained GPU associations.
      if(!bridge.nativeCausalClock())bridge.resetFromState(state);
      throw Error('Native task proposal became stale before commit');
    }
    const count=applyConfirmedTaskAssignments(state,assignments,navVersion,{pendingResources});
    pendingNativeChanges=true;
    for(const row of plan){
      const task=tasksByNumericId.get(row.taskId);
      if(task&&row.status!==1)task.blocked=row.status===2;
    }
    lastPlan=null;lastPlanFacts=null;
    // Assignment notifications mirror the lease just committed in WASM.
    // Project them now, without treating that echo as a second reason to plan.
    flushTaskEvents();
    if(!pendingWorldEvents.length)dirty=false;
    return count;
  };
  const metrics=simulatedSeconds=>({nativePlanningCalls:total,
    nativeLifecycleInvalidations:session.core.wasm.nav_intent_invalidation_count(),
    nativeTopologyReconciliations:topologyReconciliations,
    nativeTopologyRouteInvalidations:topologyRouteInvalidations,
    nativeTaskRouteQueries:taskRouteQueries,nativeTaskCandidates:taskCandidates,
    nativeHomePlanAttempts:homePlanAttempts,
    nativeHomePlansFound:homePlanFound,
    nativeHomePlanFallbacks:homePlanFallbacks,
    nativeHomeFallbacksByStatus:{...homeFallbacksByStatus},
    nativeHomeFallbackSamples:homeFallbackSamples.map(sample=>({...sample})),
    nativeHomeRoutesRestored:homeRoutesRestored,
    perWorkerPerMinute:Object.fromEntries([...requests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length])),
    workerPlansByActor:Object.fromEntries(workerPlanCounts),
    workerPeakPlansPerMinute:Object.fromEntries(workerPeakPerMinute),
    nativeAnimalPlans:animalTotal,
    perAnimalPerMinute:Object.fromEntries([...animalRequests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length])),
    animalPlansByActor:Object.fromEntries(animalPlanCounts),
    animalPeakPlansPerMinute:Object.fromEntries(animalPeakPerMinute)});
  const recordAnimalPlan=(animal,elapsed)=>{
    animalTotal++;
    const id=numericId(animal.id),times=animalRequests.get(id)??[];
    times.push(elapsed);
    while(times.length&&times[0]<=elapsed-60)times.shift();
    animalRequests.set(id,times);
    animalPlanCounts.set(id,(animalPlanCounts.get(id)??0)+1);
    animalPeakPerMinute.set(id,Math.max(animalPeakPerMinute.get(id)??0,times.length));
  };
  const recordWorkerRoutePlan=(worker,elapsed)=>{
    const id=numericId(worker.id),times=requests.get(id)??[];
    times.push(elapsed);
    while(times.length&&times[0]<=elapsed-60)times.shift();
    requests.set(id,times);
    workerPlanCounts.set(id,(workerPlanCounts.get(id)??0)+1);
    workerPeakPerMinute.set(id,Math.max(workerPeakPerMinute.get(id)??0,times.length));
  };
  const recordHomePlan=(worker,elapsed,result)=>{
    recordWorkerRoutePlan(worker,elapsed);
    homePlanAttempts++;
    if(result.status==='found')homePlanFound++;
    else{
      homePlanFallbacks++;
      if(result.status in homeFallbacksByStatus)
        homeFallbacksByStatus[result.status]++;
      if(homeFallbackSamples.length<32)homeFallbackSamples.push({
        day:sourceState?.day??null,time:sourceState?.time??null,
        workerId:worker.id,status:result.status,
        x:worker.x,z:worker.z,villageId:worker.villageId});
    }
  };
  const hasPendingAt=simulatedSeconds=>{
    if(!initialized)throw Error('Reset the native intent session first');
    return dirty||pendingTaskEvents.length>0||pendingWorldEvents.length>0||
      simulatedSeconds>=nextRetry;
  };
  // The game advances movement every tick, but native intention changes are
  // delivered only at a confirmed event or topology boundary. This cheap JS
  // gate avoids asking WASM for an empty change list during ordinary travel.
  const needsReconciliation=navVersion=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(!Number.isFinite(navVersion))throw TypeError('Expected a navigation revision');
    return lastNavigationVersion!==navVersion||pendingNativeChanges||
      pendingTaskEvents.length>0||pendingWorldEvents.length>0;
  };
  const syncChangedPositions=all=>{
    if(!observedTaskState)return 0;
    const moved=[];
    for(const worker of observedTaskState.workers){
      const id=numericId(worker.id),position=projectedPositions.get(id);
      if(position&&(all||eligible.has(id))&&
        (position[0]!==worker.x||position[1]!==worker.z))
        moved.push({type:'worker',entity:worker});
    }
    if(moved.length)applyEvents(observedTaskState,moved);
    return moved.length;
  };
  const reconcileTopology=()=>{
    topologyReconciliations++;
    // JS consumes native path points while moving. Publish only a verified
    // remaining suffix at a topology event, never on ordinary walking ticks.
    bridge.projectRouteProgress(observedTaskState??sourceState);
    const invalidated=session.core.wasm.nav_intent_reconcile_topology();
    topologyRouteInvalidations+=invalidated;
    if(invalidated)session.core.wasm.nav_intent_replan_pending_routes();
    return invalidated;
  };
  const flushWorldEvents=()=>{
    if(!pendingWorldEvents.length)return 0;
    const events=pendingWorldEvents;pendingWorldEvents=[];
    const topologyChanged=events.some(event=>
      ['WallRemoved','WallChainBuilt','StructureRuined','PlacementCommitted']
        .includes(event.type)||event.type==='RepairApplied'&&
        event.repair?.previousStatus!=='intact');
    if(topologyChanged)syncChangedPositions(true);
    const previousChanges=session.core.wasm.nav_intent_change_count();
    bridge.applyCommittedEvents(observedTaskState,events);
    publishStructureConditionChanges(events);
    if(events.some(event=>event.type!=='StructureHit')||
      session.core.wasm.nav_intent_change_count()>previousChanges)
      pendingNativeChanges=true;
    if(events.some(event=>event.type==='StructureRuined'||
      event.type==='WallRemoved')&&observedTaskState.raid){
      const structures=new Map(observedTaskState.structures.map(item=>
        [item.id,item]));
      const animals=new Map(observedTaskState.raid.animals.map(item=>
        [numericId(item.id),item]));
      for(const actorId of bridge.wallOpportunityCandidates()){
        const animal=animals.get(actorId);
        if(!animal)continue;
        const target=structures.get(animal.targetId);
        if(target?.kind!=='wall'||target.status!=='intact')continue;
        if(bridge.reconsiderWallOpportunity(animal)===1&&
          animal.status!=='attacking')
          tacticalReconsiderations.add(animal.id);
      }
    }
    if(topologyChanged){
      session.actorSectorRevision({worker:true});
      reconcileTopology();
    }
    if(events.some(event=>event.type==='CrateDropped'))
      session.core.wasm.nav_intent_replan_pending_routes();
    const cropChanged=events.some(event=>
      ['CropPlaced','CropDestroyed','CropPicked'].includes(event.type));
    if(topologyChanged||cropChanged)
      publishCropProtectionChanges({cropOnly:!topologyChanged,
        cropAdded:events.some(event=>event.type==='CropPlaced')});
    return events.length;
  };
  // A revision is an event, not a reason to poll paths on every tick. The
  // native graph decides whether each pinned route remains physically valid.
  const reconcileNavigationRevision=(state,version)=>{
    if(!Number.isFinite(version))throw TypeError('Expected a navigation revision');
    if(lastNavigationVersion===version)return 0;
    lastNavigationVersion=version;
    syncChangedPositions(true);
    session.actorSectorRevision({worker:true});
    const invalidated=reconcileTopology();
    pendingNativeChanges=true;
    // Existing JS paths are the movement copy of native-pinned routes. A
    // changed graph revision has now been validated, including the routes
    // whose replacement or waiting state will be delivered below.
    for(const worker of state.workers)if(worker.path&&
      (worker.taskId&&worker.status==='walking'||
       homeRoutes.has(numericId(worker.id))))worker.pathVersion=version;
    for(const animal of state.raid?.animals??[])
      if(animal.path&&animal.status!=='attacking'&&
        (animal.targetId||retreatRoutes.has(numericId(animal.id))))
        animal.pathVersion=version;
    publishCropProtectionChanges();
    return invalidated;
  };
  const requestReroute=(state,worker)=>{
    const wasDirty=dirty;
    applyEvents(state,[{type:'worker',entity:worker}]);
    dirty=wasDirty;
    return bridge.requestReroute(worker.id);
  };
  const adoptNativeTaskExecution=(worker,execution)=>{
    Object.assign(worker,{x:execution.x,z:execution.z,heading:execution.yaw,runPhase:execution.runPhase,walkPhase:execution.walkPhase,carryPhase:execution.carryPhase,runRemaining:execution.runRemaining,running:execution.running,gateWaiting:!execution.arrived&&execution.currentSpeed===0});
    projectedPositions.set(numericId(worker.id),[execution.x,execution.z]);
    if(!Array.isArray(worker.path)||worker.path.length)worker.path=[];
  };
  const projectNativeTaskExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native task projection belongs to another game');
    const execution=bridge.nativeTaskExecution(worker.id)??nativeStoppedTaskExecution(state,worker);if(!execution)return null;
    const task=state.tasks.find(value=>value.id===worker.taskId);
    if(!task||numericId(task.id)!==execution.taskId||numericId(task.targetId)!==execution.targetId||task.workerId!==worker.id||execution.executedThrough!==state.elapsed)throw Error('Native task projection is not the executed game boundary');
    adoptNativeTaskExecution(worker,execution);
    if(execution.held)worker.gateWaiting=false;
    return execution;
  };
  const cancelNativePendingTaskForBlessing=(state,worker,request,project)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native provisional Task belongs to another game');
    const current=bridge.pendingTaskRoute(worker.id);
    if(!current||worker.nativeRouteAdmission!=='pending-resources'||!worker.taskId||numericId(worker.taskId)!==request.taskId||
      current.actorId!==request.actorId||current.taskId!==request.taskId||current.targetId!==request.targetId||current.requestSequence!==request.requestSequence||
      !['session','slot','generation'].every(key=>current.requestHandle[key]===request.requestHandle[key])||!bridge.cancelNativePendingTask(request))return false;
    const body=bridge.nativeIdleCycleExecution(worker.id)??bridge.nativeInitialIdleBodyState(worker.id);
    const idle=body?.idleState??body?.binding.reference.sourceRequest.idleState;
    if(!idle||body.executedThrough!==state.elapsed||project()!==true||worker.taskId)throw Error('Native provisional Task cancellation lost its retained body');
    Object.assign(worker,{status:'idle',path:null,taskApproach:null,destinationId:null,idleState:{...idle},running:false,gateWaiting:false,nativeRouteAdmission:'native-idle',actionRemaining:0});
    notifyWorkerPlanningChange(state,worker);
    pendingNativeChanges=true;
    bridge.flushNativeIntentControl();
    return true;
  };
  const nativeStoppedTaskExecution=(state,worker)=>{
    if(worker.nativeRouteAdmission!=='native-task'||!worker.taskId)return null;
    const source=bridge.nativeTaskCancellationSource(worker.id);
    return source?.phase===25?{...source,...source.pose,held:true,arrived:false,running:false,currentSpeed:0,executedThrough:state.elapsed}:null;
  };
  const projectNativeDeliveryExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native delivery projection belongs to another game');
    const execution=bridge.nativeDeliveryExecution(worker.id);if(!execution)return null;
    const crate=state.crates.find(c=>c.id===worker.crateId),center=state.structures.find(c=>c.id===worker.centerId),semantic=worker.nativeDelivery;
    if(worker.nativeRouteAdmission!=='native-delivery'||worker.status!=='carrying'||worker.taskId||!crate||crate.delivered||crate.carrierId!==worker.id||!center||center.status!=='intact'||semantic?.version!==1||semantic.crateId!==crate.id||semantic.centerId!==center.id||numericId(crate.id)!==execution.crateId||numericId(center.id)!==execution.centerId||execution.executedThrough!==state.elapsed)throw Error('Native delivery projection is not the executed game boundary');
    adoptNativeTaskExecution(worker,execution);crate.x=worker.x;crate.z=worker.z;return execution;
  };
  const projectNativeHomeExecution=(state,worker)=>{if(state!==sourceState&&state!==observedTaskState)throw Error('Native Home projection belongs to another game');const execution=projectNativeHomeRouteExecution(state,worker,bridge);if(execution)projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return execution;};
  const projectEncounterHome=(state,worker)=>{
    if(!worker.incapacitated||!['pending-home-resources','native-home'].includes(worker.nativeRouteAdmission))return null;
    const request=bridge.nativeHomeRequestReference(worker.id);
    return request?.recoveryHit?projectNativeHomeExecution(state,worker):null;
  };
  const projectNativeFarmArrivalExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native farm arrival projection belongs to another game');
    const execution=projectNativeFarmArrivalRouteExecution(state,worker,bridge);if(['native-farm-arrival-route-execution','native-farm-arrival-held-execution'].includes(execution?.kind))projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return execution;
  };
  const projectFarmArrivalSource=(state,worker,bound)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native farm arrival belongs to another game');if(worker.nativeRouteAdmission!=='pending-farm-arrival-resources')return null;
    const semantic=nativeFarmArrivalRetainedPendingState(state,worker),source=bound?bridge.nativeFarmArrivalRequestReference(worker.id):bridge.nativeFarmArrivalDeclarationReference(worker.id);if(!source)return null;
    if(source.actorId!==numericId(worker.id)||source.centerId!==semantic.centerId||source.workerProfile!==worker.profile||source.requestedAt>state.elapsed||Object.keys(semantic.pose).some(k=>source.pose[k]!==semantic.pose[k])||Object.keys(semantic.goal).some(k=>source.goal[k]!==semantic.goal[k]))throw Error('Native farm arrival differs from retained Game source');
    return source;
  };
  const projectNativeFarmArrivalRequest=(state,worker)=>projectFarmArrivalSource(state,worker,true),projectNativeFarmArrivalDeclaration=(state,worker)=>projectFarmArrivalSource(state,worker,false);
  const requestNativeFarmArrivalResources=(state,worker,options)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native farm arrival belongs to another game');const semantic=bridge.declareNativeFarmArrivalRequest(worker,options),p=semantic.pose;
    Object.assign(worker,{heading:p.yaw,runPhase:p.runPhase,walkPhase:p.walkPhase,carryPhase:p.carryPhase,nativeRouteAdmission:'pending-farm-arrival-resources',running:false,gateWaiting:false,destinationId:null,idleState:null});notifyWorkerPlanningChange(state,worker);pendingNativeChanges=true;
    return {status:'requested',request:semantic.request,declaration:semantic.declaration};
  };
  function returnFromRaidRefuge(state,endedRaid,event){
    if(!onNativeRefugeReturn)return false;
    const source=bridge.takeRefugeReturn(state,endedRaid,event);
    if(!source)return false;
    const {worker,retiredSequence,bodyId}=source;
    const readmit=onNativeRefugeReturn(worker.id,bodyId);
    const result=requestNativeFarmArrivalResources(state,worker,{canonical:true,retiredSequence});
    if(result.declaration?.refugeSequence!==retiredSequence||result.request)throw Error('Civil Farm return must begin without a body');
    worker.nativeRefugeSequence=retiredSequence;
    readmit();
    return true;
  }
  const projectInitialIdleSource=(state,worker,bound)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native initial Idle projection belongs to another game');
    if(worker.nativeRouteAdmission!=='pending-idle-resources')return null;
    const semantic=nativeInitialIdleRetainedState(state,worker,{canonical:true}),request=bound?bridge.nativeInitialIdleRequestReference(worker.id):bridge.nativeInitialIdleDeclarationReference(worker.id);
    if(!request)return null;
    if(request.actorId!==numericId(worker.id)||request.centerId!==numericId(worker.centerId)||request.workerProfile!==worker.profile||request.requestedAt>state.elapsed||
      Object.keys(semantic.pose).some(k=>request.pose[k]!==semantic.pose[k])||JSON.stringify(request.idleState)!==JSON.stringify(semantic.idleState))throw Error('Native initial Idle projection is not the retained game source');
    return request;
  };
  const projectRestoredStrollSource=(state,worker,bound)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native restored stroll belongs to another game');if(worker.nativeRouteAdmission!=='pending-stroll-resources')return null;
    const request=bound?bridge.nativeIdleStrollRequestReference(worker.id):bridge.nativeIdleStrollDeclarationReference(worker.id);if(!request)return null;
    if(!restoredStrollMatchesWorker(state,worker,request))throw Error('Native restored stroll differs from its retained Game state');projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return request;
  };
  const projectNativeIdleStrollRequest=(state,worker)=>projectRestoredStrollSource(state,worker,true);
  const projectNativeIdleStrollDeclaration=(state,worker)=>projectRestoredStrollSource(state,worker,false);
  const projectNativeInitialIdleRequest=(state,worker)=>projectInitialIdleSource(state,worker,true);
  const projectNativeInitialIdleDeclaration=(state,worker)=>projectInitialIdleSource(state,worker,false);
  const requestNativeInitialIdleResources=(state,worker,options)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native initial Idle declaration belongs to another game');
    const {pose,request}=bridge.declareNativeInitialIdleRequest(worker,options);
    Object.assign(worker,{heading:pose.yaw,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase,nativeRouteAdmission:'pending-idle-resources',running:false,gateWaiting:false});
    notifyWorkerPlanningChange(state,worker);pendingNativeChanges=true;
    return {status:'requested',request};
  };
  const projectNativeInitialIdleBody=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native initial Idle body belongs to another game');
    const view=bridge.nativeInitialIdleBodyState?.(worker.id);if(!view)return null;const q=view.binding.reference.sourceRequest;
    if(!state.workers.includes(worker)||view.executedThrough!==state.elapsed||worker.profile!==q.workerProfile||numericId(worker.centerId)!==q.centerId||worker.crateId||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false||
      ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]!==q.pose[k])||worker.heading!==q.pose.yaw)throw Error('Native initial Idle body is not the retained game boundary');
    const pending=worker.status==='waiting-task'&&worker.nativeRouteAdmission==='pending-resources'&&worker.path===null&&!!worker.taskId&&bridge.pendingTaskRoute(worker.id)?.taskId===numericId(worker.taskId);
    const pendingHome=worker.status==='returning'&&worker.nativeRouteAdmission==='pending-home-resources'||
      worker.status==='fleeing'&&worker.nativeRouteAdmission==='pending-raid-flight-resources'&&bridge.nativeRaidFlightMember(state,state.raid?.animals[0])===worker;
    const home=pendingHome&&nativeHomeRequestContinuesInitialIdle(bridge.nativeHomeRequestReference(worker.id),q)&&!!projectNativeHomeExecution(state,worker);
    if(!pending&&!home){
      const semantic=nativeInitialIdleRetainedState(state,worker,{canonical:true});
      if(JSON.stringify(semantic.idleState)!==JSON.stringify(q.idleState))throw Error('Native initial Idle pose differs from its retained private state');
      if(worker.nativeRouteAdmission!=='native-idle'){worker.nativeRouteAdmission='native-idle';pendingNativeChanges=true;}
    }
    projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return view;
  };
  // Reconsider a deferred batch only after its actual source owner changes.
  // The wait belongs to existing proposal facts, not a timer or second queue.
  const wakeDeferredIdleTask=actor=>{
    if(!lastPlanFacts||![...lastPlanFacts.values()].some(f=>numericId(f.workerId)===actor&&f.awaitingIdleStrollTransfer))return;
    lastPlan=null;lastPlanFacts=null;dirty=true;pendingNativeChanges=true;
  };
  const projectNativeIdleCycle=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native Idle cycle belongs to another game');
    const view=bridge.nativeIdleCycleExecution(worker.id);if(!view)return null;const q=nativeIdleCycleBodyState(view.binding.reference.sourceBody);
    if(!state.workers.includes(worker)||view.executedThrough!==state.elapsed||view.actorId!==numericId(worker.id)||worker.profile!==q.workerProfile||numericId(worker.centerId)!==q.centerId||worker.crateId||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false||
      ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]!==q.pose[k])||worker.heading!==q.pose.yaw)throw Error('Native Idle cycle is not the executed game boundary');
    const pending=worker.status==='waiting-task'&&worker.nativeRouteAdmission==='pending-resources'&&worker.path===null&&!!worker.taskId&&bridge.pendingTaskRoute(worker.id)?.taskId===numericId(worker.taskId);
    const pendingHome=worker.status==='returning'&&worker.nativeRouteAdmission==='pending-home-resources'||
      worker.status==='fleeing'&&worker.nativeRouteAdmission==='pending-raid-flight-resources'&&bridge.nativeRaidFlightMember(state,state.raid?.animals[0])===worker;
    const home=pendingHome&&nativeHomeRequestContinuesIdleCycle(bridge.nativeHomeRequestReference(worker.id),view.binding)&&!!projectNativeHomeExecution(state,worker);
    if(!pending&&!home){
      if(worker.nativeRouteAdmission==='pending-stroll-resources'){
        if(q.kind!=='native-idle-stroll-failed-source'||view.binding.reference.sourceCycleSequence!==0||!restoredStrollMatchesWorker(state,worker,q.sourceRequest))throw Error('Native failed Idle cycle has no matching pending WALK source');
        worker.nativeRouteAdmission='native-idle';worker.destinationId=null;
      }else if(worker.nativeRouteAdmission==='native-idle-stroll'){
        const {idleState:idle}=nativeIdleStrollLiveState(state,worker);let rng=idle.rng;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;
        const reanchor=q.kind==='native-idle-stroll-reanchor-source'&&idleReanchorAfterCrop(state,worker,idle.anchorId);
        const phaseMatches=reanchor?JSON.stringify(q.idleState)===JSON.stringify(copyNativeInitialIdleState({...createIdleState(worker,reanchor,state.seed),approachRetry:0})):
          q.kind==='native-idle-stroll-arrival-source'&&idle.anchorId===q.idleState.anchorId&&q.idleState.rng===rng&&q.idleState.approachRetry===idle.approachRetry;
        if(!phaseMatches||view.binding.reference.sourceCycleSequence!==0||worker.x!==Math.fround(idle.destination.x)||worker.z!==Math.fround(idle.destination.z))throw Error('Native Idle cycle has no matching executed stroll source');
        worker.nativeRouteAdmission='native-idle';worker.destinationId=null;
      }else if(worker.nativeRouteAdmission==='native-farm-arrival'){
        nativeFarmArrivalTerminalState(state,worker);
        const anchor=idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId)),initial=copyNativeInitialIdleState({...createIdleState(worker,anchor,state.seed),approachRetry:0});
        if(q.kind!=='native-farm-arrival-idle-source'||view.binding.reference.sourceCycleSequence!==0||JSON.stringify(q.idleState)!==JSON.stringify(initial))throw Error('Native Idle cycle has no matching completed Farm source');
        Object.assign(worker,{status:'idle',nativeRouteAdmission:'native-idle',destinationId:null});
      }else if(worker.status==='idle'&&worker.nativeRouteAdmission===undefined){
        const anchor=idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId)),initial=copyNativeInitialIdleState({...createIdleState(worker,anchor,state.seed),approachRetry:0});
        if(q.kind!=='native-settled-worker-idle-source'||view.binding.reference.sourceCycleSequence!==0||worker.taskId||worker.idleState!==null||JSON.stringify(q.idleState)!==JSON.stringify(initial))throw Error('Native Idle cycle has no matching acquired settlement source');
        Object.assign(worker,{nativeRouteAdmission:'native-idle',destinationId:null});
      }else{
        const semantic=nativeInitialIdleRetainedState(state,worker,{canonical:true});
        if(worker.nativeRouteAdmission!=='native-idle'||!semantic.idleState||semantic.idleState.anchorId!==view.idleState.anchorId)throw Error('Native Idle cycle has no matching game owner');
      }
      if(JSON.stringify(worker.idleState)!==JSON.stringify(view.idleState))worker.idleState={...view.idleState};
    }
    if(isNativeIdleStrollArrivalSource(q))wakeDeferredIdleTask(numericId(worker.id));
    projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return view;
  };
  const projectNativeIdleStroll=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native Idle stroll belongs to another game');
    const view=bridge.nativeIdleStrollExecution(worker.id)??bridge.nativeIdleStrollHeldExecution(worker.id);if(!view)return null;const r=view.sourceReference??view.binding.reference,p=view.pose,actor=numericId(worker.id),anchorId=`${r.anchor.kind===1?'farm-plant':'farm-structure'}-${r.anchor.id}`,destination={id:nativeIdleStrollApproachesAnchor(r)?anchorId:`idle-${worker.id}`,x:r.destination.x,z:r.destination.z},previous=projectedPositions.get(actor);
    if(!state.workers.includes(worker)||view.executedThrough!==state.elapsed||view.actorId!==actor||view.bodyId!==r.bodyId||worker.profile!==r.workerProfile||numericId(worker.centerId)!==r.centerId||previous&&(worker.x!==previous[0]||worker.z!==previous[1]))throw Error('Native Idle stroll is not the executed game boundary');
    // The held physical source survives while Home acquires resources. Keep
    // its genuine semantic Home owner instead of reinstating the old WALK.
    const pendingHome=worker.status==='returning'&&worker.nativeRouteAdmission==='pending-home-resources'||
      worker.status==='fleeing'&&worker.nativeRouteAdmission==='pending-raid-flight-resources'&&bridge.nativeRaidFlightMember(state,state.raid?.animals[0])===worker;
    if(pendingHome&&nativeHomeRequestContinuesHeldIdleStroll(bridge.nativeHomeRequestReference(worker.id),view)&&projectNativeHomeExecution(state,worker))return view;
    if(worker.nativeRouteAdmission==='pending-stroll-resources'){
      if(!r.sourceRequest||!restoredStrollMatchesWorker(state,worker,r.sourceRequest))throw Error('Native restored stroll has no matching saved Game source');
    }else if(worker.status==='idle'&&worker.nativeRouteAdmission===undefined){
      const birth=copyNativeInitialIdleState({...createIdleState(worker,idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId)),state.seed),approachRetry:0}),q=r.sourceSettlement;
      if(!q||q.kind!=='native-settled-worker-idle-source'||worker.taskId||worker.crateId||worker.idleState!==null||JSON.stringify(q.idleState)!==JSON.stringify(birth)||['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(k=>worker[k]!==r.pose[k])||worker.heading!==r.pose.yaw)throw Error('Native Idle approach has no matching actual settlement source');
    }else if(worker.nativeRouteAdmission==='native-farm-arrival'){
      const semantic=nativeFarmArrivalTerminalState(state,worker),birth=copyNativeInitialIdleState({...createIdleState(worker,idleFarmAnchor(state,worker,state.structures.find(c=>c.id===worker.centerId)),state.seed),approachRetry:0});
      if(!r.sourceFarm||JSON.stringify(r.sourceFarm.idleState)!==JSON.stringify(birth)||Object.entries(semantic.pose).some(([k,v])=>v!==r.pose[k]))throw Error('Native Idle approach has no matching actual Farm source');worker.status='idle';
    }else if(worker.nativeRouteAdmission==='native-idle'){
      const semantic=nativeInitialIdleRetainedState(state,worker,{canonical:true});
      const idle=semantic.idleState,phaseMatches=r.version===2?['rest','watch'].includes(idle?.mode)&&idle.remaining===r.walkRemaining&&idle.rng===r.walkRng&&idle.approachRetry===0:idle?.mode==='watch'&&idle.remaining===0;
      if(!phaseMatches||idle.anchorId!==anchorId||Object.keys(semantic.pose).some(k=>semantic.pose[k]!==r.pose[k]))throw Error('Native Idle stroll has no matching executed source phase');
    }else{
      const semantic=nativeIdleStrollLiveState(state,worker),idle=semantic.idleState;
      if(idle.remaining!==nativeIdleStrollWalkRemaining(r)||idle.anchorId!==anchorId||idle.rng!==r.walkRng||['id','x','z'].some(k=>idle.destination[k]!==destination[k]))throw Error('Native Idle stroll live intent differs from its native owner');
    }
    const idleState={anchorId,mode:'walk',elapsed:0,remaining:nativeIdleStrollWalkRemaining(r),rng:view.walkState.rng,approachRetry:view.walkState.approachRetry,destination},values={x:p.x,z:p.z,heading:p.yaw,runPhase:p.runPhase,walkPhase:p.walkPhase,carryPhase:p.carryPhase,runRemaining:p.runRemaining,nativeRouteAdmission:'native-idle-stroll',destinationId:destination.id};
    for(const [key,value] of Object.entries(values))if(worker[key]!==value)worker[key]=value;
    const old=worker.idleState;if(['anchorId','mode','elapsed','remaining','rng','approachRetry'].some(k=>old?.[k]!==idleState[k])||['id','x','z'].some(k=>old?.destination?.[k]!==destination[k]))worker.idleState=idleState;
    if(view.kind==='native-idle-stroll-held-execution')wakeDeferredIdleTask(actor);
    projectedPositions.set(actor,[worker.x,worker.z]);return view;
  };
  const projectNativeSettledWorkerExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native idle projection belongs to another game');const execution=bridge.nativeSettledWorkerExecution(worker.id);if(!execution)return null;
    const home=execution.binding.reference.home,village=home&&state.villages.find(v=>numericId(v.id)===home.villageId),destination=village?.entry??village,returning=!!home&&numericId(worker.villageId)===home.villageId&&worker.status==='returning'&&!worker.taskId&&!worker.nativeRouteAdmission&&!worker.path?.length&&destination?.x===home.x&&destination?.z===home.z;
    const crate=state.crates.find(c=>numericId(c.id)===execution.crateId),pending=!home&&worker.status==='waiting-task'&&worker.nativeRouteAdmission==='pending-resources'&&!!worker.taskId&&worker.path===null;
    const pendingHome=!home&&worker.nativeRouteAdmission==='pending-home-resources'&&nativeHomeRequestContinuesIdle(bridge.nativeHomeRequestReference(worker.id),execution.binding)&&!!projectNativeHomeExecution(state,worker);
    if(execution.executedThrough!==state.elapsed||worker.crateId||numericId(worker.centerId)!==execution.centerId||!crate?.delivered||crate.carrierId||!(returning||pending||pendingHome||!home&&worker.status==='idle'&&!worker.taskId&&!worker.nativeRouteAdmission&&!worker.path?.length))throw Error('Native idle projection is not the executed game boundary');
    Object.assign(worker,{x:execution.x,z:execution.z,heading:execution.yaw,runPhase:execution.runPhase,walkPhase:execution.walkPhase,carryPhase:execution.carryPhase,runRemaining:execution.runRemaining,running:false,gateWaiting:false});projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return execution;
  };
  const requestNativeIdleHome=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native Idle Home belongs to another game');
    const cycle=bridge.nativeIdleCycleExecution(worker.id),held=bridge.nativeIdleStrollHeldExecution(worker.id),completed=worker.nativeRouteAdmission==='native-idle-stroll'&&bridge.nativeIdleStrollExecution(worker.id)?.arrived===true,restored=worker.nativeRouteAdmission==='pending-stroll-resources',initial=worker.nativeRouteAdmission==='pending-idle-resources',body=!!cycle||worker.nativeRouteAdmission==='native-idle'||!!bridge.nativeInitialIdleBodyState?.(worker.id);
    if(!state.workers.includes(worker)||worker.status!=='idle'||worker.taskId||worker.crateId||worker.nativeRouteAdmission&&!restored&&!initial&&!body&&!held&&!completed||worker.path?.length||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||!contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0))throw Error('Native Idle Home requires a finished idle contract');
    const execution=restored?projectNativeIdleStrollDeclaration(state,worker):held||completed?projectNativeIdleStroll(state,worker):cycle?projectNativeIdleCycle(state,worker):body?projectNativeInitialIdleBody(state,worker):initial?projectNativeInitialIdleDeclaration(state,worker):projectNativeSettledWorkerExecution(state,worker),village=state.villages.find(v=>v.id===worker.villageId),home=village?.entry??village;
    if(!execution||!restored&&!held&&!completed&&!initial&&!body&&execution.binding.reference.home||!home)throw Error('Native Idle Home requires its actual stationary source');
    const goal={villageId:numericId(village.id),x:home.x,z:home.z},request=restored?bridge.requestNativeRestoredIdleStrollHome(execution,goal):held||completed?bridge.requestNativeIdleStrollHome(execution,goal):cycle?bridge.requestNativeIdleCycleHome(execution.binding,goal):body?bridge.requestNativeInitialIdleBodyHome(execution.binding,goal):initial?bridge.requestNativeInitialIdleHome(execution,goal):bridge.requestNativeIdleHome(execution.binding,goal);
    // Only completed WALK can be busy; unbound declarations legitimately return no body reference.
    if(completed&&!request)return null;
    cancelIdle(worker);
    Object.assign(worker,{status:'returning',path:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false});
    notifyWorkerPlanningChange(state,worker);pendingNativeChanges=true;return request;
  };
  // Both existing moving families retain the planner's choice, not a copied
  // queue. Motion can advance; target, worker policy and proposal must remain current.
  const plannedTaskStopChoice=(actor,worker,state)=>{
    if(dirty||pendingTaskEvents.length||pendingWorldEvents.length||!lastPlan)return null;
    const row=lastPlan.find(r=>r.status===1&&r.workerId===actor),task=row&&state.tasks.find(t=>numericId(t.id)===row.taskId),fact=task&&lastPlanFacts?.get(task.id),target=task&&taskTargetLookup(state)(task.targetId);
    if(!task||task.workerId||!fact||!target||'alive' in target&&!target.alive||'delivered' in target&&target.delivered||task.kind==='repair'&&target.hp>=target.maxHp||workerRow(worker,state)[6]!==1||fact.workerId!==worker.id||fact.targetId!==task.targetId||fact.centerId!==task.centerId||fact.kind!==task.kind||fact.targetX!==target.x||fact.targetZ!==target.z)return null;
    return task.id;
  };
  const nativeIdleStrollStopRequest=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||worker.nativeRouteAdmission!=='native-idle-stroll')return null;
    const execution=bridge.nativeIdleStrollExecution(actor);if(!execution||execution.arrived)return null;
    const {pose,idleState:idle}=nativeIdleStrollLiveState(state,worker),r=execution.binding.reference,anchorId=`${r.anchor.kind===1?'farm-plant':'farm-structure'}-${r.anchor.id}`;
    if(execution.actorId!==actor||execution.executedThrough!==state.elapsed||r.workerProfile!==worker.profile||r.centerId!==numericId(worker.centerId)||worker.radius!==undefined&&worker.radius!==r.pose.radius||Object.keys(pose).some(k=>pose[k]!==execution.pose[k])||idle.anchorId!==anchorId||idle.rng!==r.walkRng||idle.remaining!==nativeIdleStrollWalkRemaining(r)||['x','z'].some(k=>idle.destination[k]!==r.destination[k]))throw Error('Idle stroll stop request differs from its executed Game source');
    // Godot pauses its existing agent independently of the world. Our existing
    // family12 additionally waits for prepared graphics before retaining it.
    if(contractExpired(worker,state)||state.time>=(profileEnd.get(worker.profile)??0))return Object.freeze({reason:'home',binding:execution.binding});
    const taskId=plannedTaskStopChoice(actor,worker,state);
    return taskId?Object.freeze({reason:'task',taskId,binding:execution.binding}):null;
  };
  const nativeFarmArrivalStopRequest=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||worker.nativeRouteAdmission!=='native-farm-arrival')return null;
    const execution=bridge.nativeFarmArrivalRouteExecution(actorId);
    if(!execution||execution.arrived&&execution.running===false&&execution.currentSpeed===0&&execution.executedThrough>=execution.binding.reference.endTime)return null;
    const semantic=nativeFarmArrivalBoundState(state,worker),q=execution.binding.reference.sourceRequest;
    if(execution.actorId!==numericId(worker.id)||execution.centerId!==semantic.centerId||q.centerId!==semantic.centerId||q.workerProfile!==worker.profile||execution.executedThrough!==state.elapsed||Object.keys(semantic.pose).some(k=>semantic.pose[k]!==execution[k])||Object.keys(semantic.goal).some(k=>semantic.goal[k]!==q.goal[k]))throw Error('Farm stop request differs from its executed Game source');
    const binding=execution.binding;
    if(contractExpired(worker,state)||state.time>=(profileEnd.get(worker.profile)??0))return Object.freeze({reason:'home',taskId:null,binding});
    const taskId=plannedTaskStopChoice(actor,worker,state);
    return taskId?Object.freeze({reason:'task',taskId,binding}):null;
  };
  const nativeFarmArrivalContinuationSource=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||worker.nativeRouteAdmission!=='native-farm-arrival-held'||dirty||pendingTaskEvents.length||pendingWorldEvents.length||lastPlan?.some(r=>r.status===1&&r.workerId===actor)||contractExpired(worker,state)||state.time>=(profileEnd.get(worker.profile)??0))return null;
    const source=bridge.nativeFarmArrivalHeldExecution(actor);if(!source)return null;
    const semantic=nativeFarmArrivalHeldState(state,worker),q=source.sourceReference.sourceRequest;
    if(source.executedThrough!==state.elapsed||q.centerId!==semantic.centerId||q.workerProfile!==worker.profile||Object.keys(semantic.pose).some(k=>semantic.pose[k]!==source.pose[k])||Object.keys(semantic.goal).some(k=>semantic.goal[k]!==q.goal[k]))throw Error('Farm continuation differs from its actual held Game source');
    return source;
  };
  const terminalIdleSource=(actorId,settled)=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||dirty||pendingTaskEvents.length||pendingWorldEvents.length||lastPlan?.some(r=>r.status===1&&r.workerId===actor))return null;
    if(settled)return worker.status==='idle'&&worker.nativeRouteAdmission===undefined&&!state.pauses.length?bridge.nativeSettlementIdleSource(actor):null;
    return worker.nativeRouteAdmission==='native-farm-arrival'?bridge.nativeFarmArrivalIdleSource(actor):null;
  };
  const nativeFarmArrivalIdleSource=actorId=>terminalIdleSource(actorId,false);
  const nativeSettlementIdleSource=actorId=>terminalIdleSource(actorId,true);
  const terminalIdleAdmissionCurrent=({actorId,terminalIdleSource:expected}={})=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    const read=expected?.body?.kind==='native-settled-worker-idle-source'?nativeSettlementIdleSource:
      worker?.nativeRouteAdmission==='native-farm-arrival'?nativeFarmArrivalIdleSource:null;
    if(!read)return ()=>true;
    const source=expected??read(actor),identity=source&&JSON.stringify(source);
    return ()=>!!identity&&JSON.stringify(read(actor))===identity;
  };
  const requestNativeFarmHome=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native Farm Home belongs to another game');
    if(!state.workers.includes(worker)||worker.status!=='arriving'||!['pending-farm-arrival-resources','native-farm-arrival-held','native-farm-arrival'].includes(worker.nativeRouteAdmission)||worker.taskId||worker.crateId||worker.path?.length||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn&&!worker.nativeRefugeSequence||state.raid||!contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0))throw Error('Native Farm Home requires a finished arriving contract and actual held body');
    const pending=worker.nativeRouteAdmission==='pending-farm-arrival-resources',execution=pending?(projectNativeFarmArrivalRequest(state,worker)??projectNativeFarmArrivalDeclaration(state,worker)):projectNativeFarmArrivalExecution(state,worker),village=state.villages.find(v=>v.id===worker.villageId),home=village?.entry??village;
    if(!home||!execution||!pending&&execution?.kind!=='native-farm-arrival-held-execution'&&(execution?.kind!=='native-farm-arrival-route-execution'||!execution.arrived||execution.running||execution.currentSpeed!==0||execution.executedThrough<execution.binding.reference.endTime))throw Error('Native Farm Home requires its actual completed or stopped source');
    const request=bridge.requestNativeFarmArrivalHome(execution,{villageId:numericId(village.id),x:home.x,z:home.z});
    if(!request)return null;
    if(worker.nativeRefugeSequence){worker.raidReturn=false;delete worker.nativeRefugeSequence;}
    cancelIdle(worker);Object.assign(worker,{status:'returning',path:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false});notifyWorkerPlanningChange(state,worker);pendingNativeChanges=true;return request;
  };
  // Cancellation retains the executed Task until its existing stop25 has an
  // acquired resource receipt. The producer selects it from the actor itself.
  const nativeTaskReturnSource=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||worker.status!=='walking'||worker.nativeRouteAdmission!=='native-task'||!worker.taskId||worker.crateId||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid)return null;
    const task=state.tasks.find(t=>t.id===worker.taskId),village=state.villages.find(v=>v.id===worker.villageId),execution=bridge.nativeTaskExecution(actor)??nativeStoppedTaskExecution(state,worker);
    if(!task||task.workerId!==worker.id||task.centerId!==worker.centerId||!village||!execution||execution.arrived&&(execution.running||execution.currentSpeed!==0||execution.executedThrough<execution.at)||execution.taskId!==numericId(task.id)||execution.targetId!==numericId(task.targetId)||execution.executedThrough!==state.elapsed)return null;
    return execution;
  };
  const nativeTaskRouteStopRequest=actorId=>{
    const execution=nativeTaskReturnSource(actorId);if(!execution||execution.arrived||execution.held)return null;
    const state=observedTaskState??sourceState,worker=state.workers.find(w=>numericId(w.id)===execution.nativeRoute.actorId);
    if(!contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0))return null;
    return Object.freeze({reason:'home',taskId:worker.taskId,bodyId:execution.bodyId,nativeRoute:execution.nativeRoute});
  };
  const stopNativeTaskForHomeAfterGpuQuiescence=async options=>{
    const owner=bridge.authorityEpoch,source=nativeTaskRouteStopRequest(options.actorId),identity=JSON.stringify(source);
    if(!source)return {status:'unsupported',authorizedAutonomy:false,authorizedPassage:false};
    const result=await bridge.stopNativeTaskRouteAfterGpuQuiescence({...options,prepareResources:args=>{
      if(JSON.stringify(nativeTaskRouteStopRequest(options.actorId))!==identity)throw Error('Native Task stop source changed');
      return options.prepareResources(args);
    }});
    if(result.status==='committed'){
      // No task release or Home request is permitted before this acquired25.
      const state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===source.nativeRoute.actorId);
      if(bridge.authorityEpoch!==owner||!worker||worker.taskId!==source.taskId)throw Error('Native acquired Task stop lost its Game owner');
      requestNativeStoppedTaskHome(state,worker,result.nativeTaskRouteStopBinding);
      flushTaskEvents();
      const clock=bridge.nativeCausalClock();
      if(!['committed','unchanged'].includes(bridge.commitNativeCausalClock({rate:clock?.rate??1,paused:!!state.pauses.length||!!state.result}).status))throw Error('Native Task Home declaration could not commit its causal boundary');
    }
    return result;
  };

  const requestNativeTaskHome=(state,worker,stop,completed=null)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native Task Home belongs to another game');
    if(!state.workers.includes(worker)||worker.status!=='walking'||worker.nativeRouteAdmission!=='native-task'||!worker.taskId||
       worker.crateId||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||state.raid||
       !contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0))
      throw Error('Native Task Home requires a finished contract and its retained Task');
    const task=state.tasks.find(value=>value.id===worker.taskId);
    const village=state.villages.find(value=>value.id===worker.villageId),home=village?.entry??village;
    if(!task||task.workerId!==worker.id||task.centerId!==worker.centerId||!home)throw Error('Native Task Home lost its assignment or village');
    const goal={villageId:numericId(village.id),x:home.x,z:home.z};
    const request=completed?bridge.requestNativeTaskHomeFromCompletion(worker.id,task.id,task.targetId,completed,goal):bridge.requestNativeTaskHomeFromStop(worker.id,task.id,task.targetId,stop,goal);
    if(!request)return null;
    releaseTask(state,worker);
    cancelIdle(worker);
    const {x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining}=request.pose;
    Object.assign(worker,{x,z,heading:yaw,runPhase,walkPhase,carryPhase,runRemaining,status:'returning',
      path:null,destinationId:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false});
    projectedPositions.set(numericId(worker.id),[x,z]);
    notifyWorkerPlanningChange(state,worker);
    pendingNativeChanges=true;
    return request;
  };
  const requestNativeStoppedTaskHome=(state,worker,stop)=>requestNativeTaskHome(state,worker,stop);
  const requestNativeCompletedTaskHome=(state,worker)=>{
    const execution=nativeTaskReturnSource(worker.id);if(!execution?.arrived)throw Error('Completed Task Home requires its executed endpoint');
    const request=requestNativeTaskHome(state,worker,null,execution);
    if(request)flushTaskEvents();
    return request;
  };
  const projectNativeTaskActionExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native action projection belongs to another game');
    const execution=bridge.nativeTaskActionExecution(worker.id);if(!execution)return null;
    const reference=execution.binding.reference,request=reference.request,task=state.tasks.find(value=>value.id===worker.taskId);
    if(!task||numericId(task.id)!==request.taskId||numericId(task.targetId)!==request.targetId||task.workerId!==worker.id||task.kind!==request.actionKind||execution.executedThrough!==state.elapsed)throw Error('Native action projection is not the executed game boundary');
    const changed=worker.status!=='acting'||worker.nativeRouteAdmission!=='native-action';
    Object.assign(worker,{x:reference.origin.x,z:reference.origin.z,heading:request.heading,runPhase:reference.runPhase,walkPhase:reference.walkPhase,carryPhase:reference.carryPhase,runRemaining:reference.runRemaining,running:false,gateWaiting:false,status:'acting',nativeRouteAdmission:'native-action',actionRemaining:Math.max(0,request.duration-execution.elapsed)});
    // Only semantic progress crosses save/presentation boundaries: no native
    // handles, tickets, association or independent JS countdown is stored.
    worker.nativeTaskAction={version:1,kind:request.actionKind,duration:request.duration,elapsed:execution.elapsed};
    projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);
    if(!Array.isArray(worker.path)||worker.path.length)worker.path=[];
    if(changed)notifyWorkerPlanningChange(state,worker);
    return execution;
  };
  const reconcileWorkerRoutes=(state,{navVersion}={})=>{
    if(!Number.isFinite(navVersion))throw TypeError('Expected a navigation revision');
    const changes=bridge.intentChanges();
    pendingNativeChanges=false;
    if(!changes.length)return changes;
    const latest=new Map();
    for(const change of changes)latest.set(change.actorId,change);
    const workers=new Map(state.workers.map(worker=>[numericId(worker.id),worker]));
    const animals=new Map((state.raid?.animals??[])
      .map(animal=>[numericId(animal.id),animal]));
    const villages=new Map(state.villages.map(village=>[village.id,village]));
    const tasks=new Map(state.tasks.map(task=>[numericId(task.id),task]));
    const targetFor=taskTargetLookup(state);
    for(const change of latest.values()){
      const worker=workers.get(change.actorId);
      if(worker&&bridge.nativeHomeRouteExecution(worker.id)){projectNativeHomeExecution(state,worker);continue;}
      if(['pending-idle-flight-stop','pending-task-flight-stop'].includes(worker?.nativeRouteAdmission)&&projectRaidFlightStop(state,worker))continue;
      if(worker&&bridge.nativeIdleStrollHeldExecution(worker.id)){projectNativeIdleStroll(state,worker);continue;}
      if(worker&&bridge.nativeIdleCycleExecution(worker.id)){projectNativeIdleCycle(state,worker);continue;}
      if(worker&&bridge.nativeInitialIdleBodyState?.(worker.id)){projectNativeInitialIdleBody(state,worker);continue;}
      if(worker&&change.state===7){if(!projectNativeSettledWorkerExecution(state,worker))throw Error('Native idle transition lost its body');continue;}
      if(worker&&homeRoutes.has(change.actorId)&&
        ['returning','fleeing','incapacitated'].includes(worker.status)){
        if(change.state===0){
          const village=villages.get(worker.villageId);
          const home=village?.entry??village;
          if(!home)throw Error(`Worker ${worker.id} has no return village`);
          const replacement=bridge.planHomeRoute(worker,home);
          recordHomePlan(worker,state.elapsed,replacement);
          if(replacement.status==='found'){
            worker.path=replacement.path;
            worker.destinationId=`home-${village.id}`;
            worker.pathVersion=navVersion;
            pendingNativeChanges=true;
          }else{
            homeRoutes.delete(change.actorId);
            homeAttempts.set(change.actorId,navVersion);
            worker.path=null;
          }
        }
        if(change.state===5)homeRoutes.delete(change.actorId);
        continue;
      }
      const animal=animals.get(change.actorId);
      if(animal?.status==='retreating'&&retreatRoutes.has(change.actorId)){
        if(change.state===0){
          const replacement=bridge.planRetreatRoute(animal);
          recordAnimalPlan(animal,state.elapsed);
          if(replacement.status==='found'){
            animal.path=replacement.path;
            animal.destinationId=`exit-${animal.id}`;
            animal.pathVersion=navVersion;
            pendingNativeChanges=true;
          }else{
            retreatRoutes.delete(change.actorId);
            animal.path=null;
          }
        }
        if(change.state===5)retreatRoutes.delete(change.actorId);
        continue;
      }
      if(animal&&change.state===1&&animal.status!=='attacking'&&
        !animal.path&&animal.targetId&&
        numericId(animal.targetId)===change.targetId){
        const coordinates=bridge.routePoints(change.routeHandle);
        if(!coordinates||coordinates.length<2||coordinates.length%2)
          throw Error('Restored animal intention has no native route');
        animal.path=Array.from({length:coordinates.length/2},(_,index)=>({
          x:coordinates[index*2],z:coordinates[index*2+1]}));
        animal.destinationId=animal.approach.id;
        animal.pathVersion=navVersion;
        pendingAttackRoutes.delete(change.actorId);
      }
      if(animal&&change.nativeShieldCropStop){
        const p=change.nativeShieldCropStop;
        if(animal.targetId!=='plant-'+p.targetId||animal.x!==p.x||animal.z!==p.z||animal.motionPhase!==p.phase||animal.heading!==p.yaw)
          throw Error('Native Shield stop Game source changed');
        animal.path=null;pendingAttackRoutes.delete(change.actorId);continue;
      }
      if(animal&&change.state===0&&animal.status!=='attacking'&&
        animal.targetId&&numericId(animal.targetId)===change.targetId){
        if(tacticalReconsiderations.has(animal.id))continue;
        const target=targetFor(animal.targetId);
        if(target&&(!('alive' in target)||target.alive)&&
          (!('status' in target)||target.status==='intact')&&
          animal.reservation&&state.raid.reservations[animal.reservation]===animal.id){
          const replacement=bridge.replanAttackRoute(animal);
          pendingNativeChanges=true;
          recordAnimalPlan(animal,state.elapsed);
          animal.path=replacement.status==='found'?replacement.path:null;
          if(animal.path){
            animal.destinationId=animal.approach.id;
            animal.pathVersion=navVersion;
            pendingAttackRoutes.delete(change.actorId);
          }else markPendingAttackRoute(change.actorId,replacement.status,state.elapsed);
          continue;
        }
      }
      if(animal&&change.state===5&&animal.status!=='attacking'&&
        animal.targetId&&numericId(animal.targetId)===change.targetId){
        pendingAttackRoutes.delete(change.actorId);
        const target=targetFor(animal.targetId);
        // The native route was invalidated by a confirmed world change.
        // Retain a still-valid target and lease; the raid controller will
        // request one replacement route at its next action boundary.
        animal.path=null;
        if(!target||'alive' in target&&!target.alive||
          ('status' in target&&target.status!=='intact')){
          if(animal.reservation&&state.raid.reservations[animal.reservation]===animal.id){
            delete state.raid.reservations[animal.reservation];
            state.raid.waitRevision=((state.raid.waitRevision??0)+1)>>>0;
          }
          animal.targetId=null;animal.reservation=null;
          animal.approach=null;animal.approachShieldId=null;
        }
      }
      if(!worker||!worker.taskId||numericId(worker.taskId)!==change.taskId)continue;
      const task=tasks.get(change.taskId);
      if(change.state===6&&change.actionRequest){
        const action=copyNativeTaskActionProgress(worker.nativeTaskAction);
        if(!task||task.workerId!==worker.id||task.kind!==action.kind||change.actionRequest.taskId!==change.taskId||change.actionRequest.targetId!==numericId(task.targetId))throw Error('Native restored action projection is stale');
        worker.nativeRouteAdmission='pending-action-resources';worker.status='waiting-task';worker.path=null;worker.running=false;worker.gateWaiting=false;continue;
      }
      if(worker.nativeRouteAdmission==='pending-action-resources'&&[0,3,4,5,6].includes(change.state)){
        releaseTask(state,worker);worker.status='idle';worker.path=null;notifyWorkerPlanningChange(state,worker);continue;
      }
      if(change.state===1){
        const execution=bridge.nativeTaskExecution(worker.id),coordinates=execution?null:bridge.routePoints(change.routeHandle);
        if(!execution&&(!coordinates||coordinates.length<2||coordinates.length%2))
          throw Error('Native active intention has no valid route');
        const path=execution?[]:Array.from({length:coordinates.length/2},(_,index)=>
          ({x:coordinates[index*2],z:coordinates[index*2+1]}));
        const endpoint=execution?.endpoint??path.at(-1),target=task&&targetFor(task.targetId);
        if(!target)throw Error('Native reroute lost its JS task target');
        const interaction=['repair','initial','water'].includes(task.kind);
        const destination=interaction?{
          id:`native-point-${task.id}`,x:endpoint.x,z:endpoint.z}:target;
        if(execution){if(execution.executedThrough!==state.elapsed||execution.taskId!==change.taskId||execution.nativeRoute.assignmentSequence!==change.sequence)throw Error('Native task assignment projection is stale');adoptNativeTaskExecution(worker,execution);worker.nativeRouteAdmission='native-task';}else delete worker.nativeRouteAdmission;
        delete worker.nativeTaskAction;
        worker.path=path;worker.destinationId=destination.id;
        worker.pathVersion=navVersion;
        worker.taskApproach=interaction?{taskId:task.id,destination}:null;
        if(worker.status==='waiting-task'){
          worker.status='walking';notifyWorkerPlanningChange(state,worker);
        }
      }else if(change.state===2&&bridge.nativeTaskActionBinding(worker.id)){
        projectNativeTaskActionExecution(state,worker);
      }else if(change.state===0||change.state===3||change.state===4||change.state===6){
        const target=task&&targetFor(task.targetId);
        if(!task||!target||'alive' in target&&!target.alive||target.delivered){
          releaseTask(state,worker);worker.status='idle';worker.path=null;
          notifyWorkerPlanningChange(state,worker);
          if(task)replaceTasks(state,state.tasks.filter(item=>item.id!==task.id));
        }else{
          worker.path=null;worker.status='waiting-task';if(change.state===6||worker.nativeRouteAdmission==='native-task'||worker.nativeRouteAdmission==='native-action')worker.nativeRouteAdmission='pending-resources';delete worker.nativeTaskAction;
          notifyWorkerPlanningChange(state,worker);
        }
      }else if(change.state===5){
        releaseTask(state,worker);worker.status='idle';worker.path=null;
        notifyWorkerPlanningChange(state,worker);
      }
    }
    return changes;
  };
  const flushTaskEvents=()=>{
    if(!pendingTaskEvents.length)return 0;
    const workerEvents=new Map(),taskEvents=[],currentWorker=workerEntityLookup(()=>observedTaskState.workers);
    for(const event of pendingTaskEvents){
      if(event.type==='worker'){
        const id=event.remove?event.id:event.entity.id;
        // Eligibility notices retain their confirmed semantics, but a queued
        // pose cannot rewind a native-owned body which Game already projected.
        // Reject an altered live Game pose before entering the native delta.
        const point=!event.remove?projectedPositions.get(numericId(id)):null,worker=point?currentWorker(id):null;
        if(worker?.nativeRouteAdmission&&(worker.x!==point[0]||worker.z!==point[1]))throw Error('Native worker planning notice differs from the executed Game pose');
        const notice=worker?.nativeRouteAdmission?{...event,entity:{...event.entity,x:point[0],z:point[1]}}:event;
        workerEvents.set(id,notice);
      }else if(raidFlightStop?.task?.id===(event.id??event.entity.id))raidFlightStop.task.deltas.push(event);
      else taskEvents.push(event);
    }
    const events=[...taskEvents,...[...workerEvents]
      .sort(([a],[b])=>numericId(a)-numericId(b)).map(([,event])=>event)];
    const wasDirty=dirty||!!lastPlan?.some(row=>row.status===1);
    const eligibilityChanged=events.some(event=>event.type==='worker'&&
      eligible.has(numericId(event.remove?event.id:event.entity.id))!==
      (!event.remove&&workerRow(event.entity,observedTaskState)[6]===1));
    pendingTaskEvents=[];
    applyEvents(observedTaskState,events);
    if(!taskEvents.length&&!eligibilityChanged)dirty=wasDirty;
    return events.length;
  };
  const observeTasks=state=>{
    if(!initialized)throw Error('Reset the native intent session before observing tasks');
    if(stopTaskObserver)throw Error('A task observer is already attached');
    observedTaskState=state;
    const stop=observeTaskChanges(state,event=>{
      if(event.type==='worker'){
        pendingTaskEvents.push({type:'worker',entity:event.worker});
        if(eligible.has(numericId(event.worker.id))!==
          (workerRow(event.worker,state)[6]===1))dirty=true;
        return;
      }
      if(event.type==='worker-removed'){
        pendingTaskEvents.push({type:'worker',remove:true,id:event.workerId});
        dirty=true;return;
      }
      const nativeEvent=event.type==='removed'?
        {type:'task',remove:true,id:event.taskId}:
        {type:'task',entity:{id:event.taskId,centerId:event.centerId,
          targetId:event.targetId,kind:event.kind,created:event.created,
          workerId:event.workerId},...(event.type==='released'&&event.worker?{releasedWorker:event.worker}:{})};
      pendingTaskEvents.push(nativeEvent);
      if(event.worker)pendingTaskEvents.push({type:'worker',entity:event.worker});
      dirty=true;
    });
    stopTaskObserver=stop;
    return ()=>{
      if(stopTaskObserver!==stop)return;
      stop();stopTaskObserver=null;pendingTaskEvents=[];
      if(!stopWorldObserver)observedTaskState=null;
    };
  };
  // Only a RaidSpawned delivered by this observed Game can transfer a worker
  // source. A restored status string or a similar event in another Game cannot.
  let raidFlightStop=null;
  function requestRaidRefuge(state,worker,source,eventId){
    const village=state.villages.find(v=>v.id===worker.villageId),goal=village?.entry??village;
    if(!goal)return false;
    const home={villageId:numericId(village.id),x:goal.x,z:goal.z};
    const request=source.kind==='native-task-cancellation-source'?bridge.requestNativeRepairFlight(source,home,eventId,repairFlightTicket(source)):
      source.kind==='native-idle-cycle-attestation'?bridge.requestNativeIdleCycleHome(source,home,eventId):
      source.kind==='native-initial-idle-request-reference'?bridge.requestNativeInitialIdleHome(source,home,eventId):
      source.kind==='native-initial-idle-body-attestation'?bridge.requestNativeInitialIdleBodyHome(source,home,eventId):
      source.kind==='native-idle-stroll-request-reference'?bridge.requestNativeRestoredIdleStrollHome(source,home,eventId):
      ['native-idle-stroll-execution','native-idle-stroll-held-execution'].includes(source.kind)?bridge.requestNativeIdleStrollHome(source,home,eventId):
      bridge.requestNativeFarmArrivalHome(source,home,eventId);
    if(!request)return null;
    if(request.raidSpawnSequence!==eventId)throw Error('Home flight lost its raid source');
    // This is a stationary request. Continuous mixed traffic owns any later GO.
    worker.nativeRouteAdmission='pending-raid-flight-resources';
    pendingNativeChanges=true;
    return request;
  }
  function observeRaidEvacuation(state,event){
    const raid=state.raid,animal=raid?.animals[0];
    if(!raid?.daytime||raid.id!==event.raidFacts?.id||event.simulationTime!==state.elapsed||
       raid.animals.length!==1||animal.species!=='warthog'||state.workers.length!==1)return;
    const worker=state.workers[0];
    if(worker.status!=='fleeing'||worker.taskId||worker.crateId||worker.incapacitated||worker.recovery||worker.fallRemaining||worker.raidReturn)return;
    const releasedTask=(source,status)=>pendingTaskEvents.find(row=>row.releasedWorker?.id===worker.id&&row.releasedWorker.status===status&&
      numericId(row.entity.id)===source.taskId&&numericId(row.entity.targetId)===source.targetId&&row.entity.centerId===worker.centerId);
    const action=state.biome==='desierto'?bridge.nativeTaskActionExecution(worker.id):null;
    if(action){
      const source=bridge.nativeTaskCancellationSource(worker.id);
      if(!source||source.phase!==15||!action.completed||action.executedThrough!==state.elapsed||action.binding.reference.request.actionKind!=='repair'||
         !releasedTask(source,'acting')||source.sourceSequence!==action.binding.actionSequence||
         ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>source.pose[key]!==worker[key])||source.pose.yaw!==worker.heading)return;
      if(requestRaidRefuge(state,worker,source,numericId(event.id)))worker.destinationId=null;
      return;
    }
    const task=state.biome==='desierto'?bridge.nativeTaskExecution(worker.id):null;
    if(task){
      const released=releasedTask(task,'walking');
      const binding=bridge.nativeTaskStartBinding(worker.id);
      if(!released||!binding||task.executedThrough!==state.elapsed||task.bodyId!==binding.reference.bodyId||
         task.nativeRoute.assignmentSequence!==binding.assignmentSequence||
         ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>task[key]!==worker[key])||task.yaw!==worker.heading)return;
      // The raid declares its animal in this event. Release the exact
      // unacquired action before that declaration needs the same native slot.
      if(task.arrived&&!bridge.cancelNativeTaskActionForRaidFlight(task))return;
      const marker='pending-task-flight-stop';
      raidFlightStop={raid,worker,eventId:numericId(event.id),spawnTime:event.simulationTime,binding,marker,sample:'nativeTaskFlightSample',
        task:{id:released.entity.id,targetId:released.entity.targetId,deltas:[]}};
      worker.nativeRouteAdmission=marker;
      worker.destinationId=null;
      pendingNativeChanges=true;
      return;
    }
    const pendingTask=state.biome==='desierto'?bridge.pendingTaskRoute(worker.id):null;
    if(pendingTask){
      const released=releasedTask(pendingTask,'waiting-task');
      if(!released||released.releasedWorker.x!==worker.x||released.releasedWorker.z!==worker.z||
         !bridge.cancelNativePendingTask(pendingTask))return;
      // This receipt is readable only while the stationary owner is current.
      // Publish the cancellation before reading that owner for Home.
      bridge.flushNativeIntentControl();
      worker.destinationId=null;
    }
    const pending=bridge.nativeFarmArrivalRequestReference(worker.id);
    const held=bridge.nativeFarmArrivalHeldExecution(worker.id);
    const moving=bridge.nativeFarmArrivalRouteExecution(worker.id);
    const idleSource=state.biome==='desierto'&&!pending&&!held&&!moving;
    const pendingStroll=idleSource?bridge.nativeIdleStrollRequestReference(worker.id):null;
    const stroll=idleSource&&!pendingStroll?bridge.nativeIdleStrollExecution(worker.id):null;
    const cycle=!pending&&!held&&!moving&&!stroll&&!pendingStroll?bridge.nativeIdleCycleExecution(worker.id):null;
    const initialSource=!pending&&!held&&!moving&&!stroll&&!pendingStroll&&!cycle;
    const pendingInitial=initialSource?bridge.nativeInitialIdleRequestReference(worker.id):null;
    const initial=initialSource&&!pendingInitial?bridge.nativeInitialIdleBodyState(worker.id):null;
    if(cycle&&cycle.executedThrough!==state.elapsed)return;
    if(stroll&&stroll.executedThrough!==state.elapsed)return;
    if(initial&&initial.executedThrough!==state.elapsed)return;
    const original=pending??pendingStroll??held?.sourceReference?.sourceRequest??moving?.binding.reference.sourceRequest??
      stroll?.binding.reference??pendingInitial??initial?.binding.reference.sourceRequest??(cycle&&nativeIdleCycleBodyState(cycle.binding.reference.sourceBody));
    if(!original||original.centerId!==numericId(worker.centerId)||original.workerProfile!==worker.profile)return;
    const pose=pending?.pose??held?.pose??moving??stroll?.pose??original.pose;
    if(['x','z','runPhase','walkPhase','carryPhase','runRemaining'].some(key=>pose[key]!==worker[key])||pose.yaw!==worker.heading)return;
    const eventId=numericId(event.id);
    if(cycle||pending||pendingStroll||pendingInitial||initial||held||moving?.arrived&&moving.currentSpeed===0){
      requestRaidRefuge(state,worker,cycle?.binding??pending??pendingStroll??pendingInitial??initial?.binding??held??moving,eventId);return;
    }
    const marker=stroll?'pending-idle-flight-stop':'pending-farm-flight-stop',
      sample=stroll?'nativeIdleFlightSample':'nativeFarmFlightSample';
    raidFlightStop={raid,worker,eventId,spawnTime:event.simulationTime,binding:(stroll??moving).binding,stroll:!!stroll,marker,sample};
    worker.nativeRouteAdmission=marker;
    pendingNativeChanges=true;
  }
  function projectRaidFlightStop(state,worker){
    const pending=raidFlightStop;
    if(!pending||pending.raid!==state.raid||pending.worker!==worker||worker.nativeRouteAdmission!==pending.marker||
       bridge.nativeRaidFlightMember(state,state.raid.animals[0])!==worker)return null;
    const e=pending.task?bridge.nativeTaskExecution(worker.id):pending.stroll?
      bridge.nativeIdleStrollExecution(worker.id)??bridge.nativeIdleStrollHeldExecution(worker.id):bridge.nativeFarmArrivalRouteExecution(worker.id);
    if(!e||e.executedThrough!==state.elapsed||(e.binding?.assignmentSequence??e.assignmentSequence??e.nativeRoute?.assignmentSequence)!==pending.binding.assignmentSequence||
       e.bodyId!==pending.binding.reference.bodyId)return null;
    const p=e.pose??e,pose={x:p.x,z:p.z,heading:p.yaw,runPhase:p.runPhase,walkPhase:p.walkPhase,carryPhase:p.carryPhase,
      runRemaining:p.runRemaining,running:e.running??false,gateWaiting:!e.arrived&&e.currentSpeed===0};
    Object.assign(worker,pose);
    // The renderer may receive this exact native sample after the proposed stop instant.
    worker[pending.sample]={eventId:pending.eventId,spawnTime:pending.spawnTime,
      nativeRoute:e.nativeRoute??{actorId:e.actorId,assignmentSequence:pending.binding.assignmentSequence,routeHandle:pending.binding.reference.expectedRouteHandle},
      bodyId:e.bodyId,at:e.executedThrough,pose};
    projectedPositions.set(numericId(worker.id),[pose.x,pose.z]);return e;
  }
  function nativeRaidFlightStopRequest(actorId){
    const pending=raidFlightStop,state=observedTaskState;
    if(!pending||pending.raid!==state?.raid||pending.worker.id!==actorId||
       !state.workers.includes(pending.worker)||pending.worker.status!=='fleeing'||
       pending.worker.nativeRouteAdmission!==pending.marker)return null;
    if(pending.task){
      const actual=bridge.nativeTaskStartBinding(actorId),execution=bridge.nativeTaskExecution(actorId);
      if(!actual||!execution||JSON.stringify(actual)!==JSON.stringify(pending.binding))return null;
      return {reason:'raid-flight',eventId:pending.eventId,binding:actual,task:true,arrived:execution.arrived};
    }
    const actual=pending.stroll?bridge.nativeIdleStrollBinding(actorId):bridge.nativeFarmArrivalRouteBinding(actorId);
    const same=pending.stroll?sameNativeIdleStrollAttestation:sameNativeFarmArrivalRouteAttestation;
    if(!actual||!same(actual,pending.binding))return null;
    return {reason:'raid-flight',eventId:pending.eventId,binding:actual,stroll:pending.stroll,
      ...(pending.stroll?{arrived:bridge.nativeIdleStrollExecution(actorId)?.arrived===true}:{})};
  }
  async function stopForRaidFlight(options){
    const pending=raidFlightStop;
    if(!nativeRaidFlightStopRequest(options.actorId))return {status:'stale'};
    if(pending.task)return stopTaskForRaidFlight(pending,options);
    const stop=pending.stroll?bridge.stopNativeIdleStrollAfterGpuQuiescence:bridge.stopNativeFarmArrivalAfterGpuQuiescence;
    const strollEnd=()=>pending.stroll&&bridge.nativeIdleStrollExecution(options.actorId);
    const result=strollEnd()?.arrived?{status:'stale'}:await stop({...options,
      sourceStillCurrent:()=>raidFlightStop===pending&&!!nativeRaidFlightStopRequest(options.actorId)&&!strollEnd()?.arrived});
    if(pending===raidFlightStop){
      const held=result.status==='committed'?(pending.stroll?bridge.nativeIdleStrollHeldExecution(options.actorId):bridge.nativeFarmArrivalHeldExecution(options.actorId)):null;
      const arrived=!held&&strollEnd();
      if(!held&&!arrived?.arrived)return result;
      const matchesHeld=pending.stroll?sameNativeIdleStrollReference:sameNativeFarmArrivalRouteReference;
      if(observedTaskState?.raid===pending.raid&&observedTaskState.workers.includes(pending.worker)&&
         pending.worker.status==='fleeing'&&pending.worker.nativeRouteAdmission===pending.marker&&
         (held?held.assignmentSequence===pending.binding.assignmentSequence&&matchesHeld(held.sourceReference,pending.binding.reference):
           sameNativeIdleStrollAttestation(arrived.binding,pending.binding))){
        // The native stop sampled position and phases at acquisition.
        const source=held??arrived,pose=source.pose;
        Object.assign(pending.worker,{x:pose.x,z:pose.z,heading:pose.yaw,runPhase:pose.runPhase,
          walkPhase:pose.walkPhase,carryPhase:pose.carryPhase,runRemaining:pose.runRemaining,running:false,gateWaiting:false});
        const request=requestRaidRefuge(observedTaskState,pending.worker,source,pending.eventId);
        if(request){
          delete pending.worker[pending.sample];
          raidFlightStop=null;
          // This successor is issued after the stop GO clock. Publish its
          // watermark at the same native instant, including while paused.
          const clock=bridge.nativeCausalClock();
          const receipt=bridge.commitNativeCausalClock({rate:clock.rate,paused:clock.paused});
          if(!['committed','unchanged'].includes(receipt.status)||receipt.clock.intentSequence<request.requestSequence)
            throw Error('Native flight request lacks its causal clock');
        }
      }
    }
    return result;
  }
  async function stopTaskForRaidFlight(pending,options){
    const execution=()=>bridge.nativeTaskExecution(options.actorId);
    const result=execution()?.arrived?{status:'stale'}:await bridge.stopNativeTaskRouteAfterGpuQuiescence({...options,
      sourceStillCurrent:()=>raidFlightStop===pending&&!!nativeRaidFlightStopRequest(options.actorId)&&!execution()?.arrived});
    const state=observedTaskState,{task,worker,eventId}=pending,arrived=execution();
    if(raidFlightStop!==pending||state?.raid!==pending.raid||!state.workers.includes(worker)||worker.nativeRouteAdmission!==pending.marker||
       bridge.nativeRaidFlightMember(state,state.raid.animals[0])!==worker||
       result.status!=='committed'&&(!arrived?.arrived||!nativeRaidFlightStopRequest(options.actorId)))return result;
    const village=state.villages.find(value=>value.id===worker.villageId),home=village?.entry??village;
    if(!home)throw Error('Native Task flight lost its village');
    const goal={villageId:numericId(village.id),x:home.x,z:home.z};
    const request=result.status==='committed'?
      bridge.requestNativeTaskHomeFromStop(worker.id,task.id,task.targetId,result.nativeTaskRouteStopBinding,goal,eventId):
      bridge.requestNativeTaskHomeFromCompletion(worker.id,task.id,task.targetId,arrived,goal,eventId);
    if(!request)return result;
    const {x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining}=request.pose;
    Object.assign(worker,{x,z,heading:yaw,runPhase,walkPhase,carryPhase,runRemaining,running:false,gateWaiting:false,
      nativeRouteAdmission:'pending-raid-flight-resources'});
    delete worker[pending.sample];
    projectedPositions.set(numericId(worker.id),[x,z]);
    raidFlightStop=null;
    pendingNativeChanges=true;
    // Game already released the assignment at the spawn. Its native mirror can
    // consume the queued deltas once Home owns the same physical body.
    pendingTaskEvents.unshift(...task.deltas);
    flushTaskEvents();
    const clock=bridge.nativeCausalClock();
    const receipt=bridge.commitNativeCausalClock({rate:clock.rate,paused:clock.paused});
    if(!['committed','unchanged'].includes(receipt.status)||receipt.clock.intentSequence<request.requestSequence)
      throw Error('Native Task flight request lacks its causal clock');
    return result;
  }
  const observeWorld=state=>{
    if(!initialized)throw Error('Reset the native intent session before observing events');
    if(stopWorldObserver)throw Error('A world event observer is already attached');
    if(observedTaskState&&observedTaskState!==state)
      throw Error('World and task observers must share one game state');
    observedTaskState=state;
    const relevant=new Set(['CropPlaced','CropDestroyed','CropPicked',
      'CrateDropped','CrateDelivered',
      'PlacementCommitted','WallChainBuilt','WallRemoved','StructureHit',
      'StructureRuined','RepairApplied']);
    const stop=observeGameEvents(state,event=>{
      if(qualifyFarmFlee&&event.type==='RaidSpawned')observeRaidEvacuation(state,event);
      if(raidFlightStop&&raidFlightStop.raid!==state.raid){
        if(raidFlightStop.task)pendingTaskEvents.unshift(...raidFlightStop.task.deltas);
        delete raidFlightStop.worker[raidFlightStop.sample];
        if(raidFlightStop.worker.nativeRouteAdmission===raidFlightStop.marker)delete raidFlightStop.worker.nativeRouteAdmission;
        raidFlightStop=null;
      }
      if(!relevant.has(event.type))return;
      pendingWorldEvents.push(event);
      if(event.type!=='StructureHit')dirty=true;
    });
    stopWorldObserver=stop;
    return ()=>{
      if(stopWorldObserver!==stop)return;
      stop();stopWorldObserver=null;pendingWorldEvents=[];
      if(raidFlightStop)delete raidFlightStop.worker[raidFlightStop.sample];
      raidFlightStop=null;
      if(!stopTaskObserver)observedTaskState=null;
    };
  };
  return {resetFromState,applyEvents,observeTasks,observeWorld,
    observeCropProtection,observeStructureCondition,
    getUnprotectedCropGroups:bridge.getUnprotectedCropGroups,
    getDamagedWalls:()=>{flushWorldEvents();return bridge.getDamagedWalls();},
    getDamagedCenters:()=>{flushWorldEvents();return bridge.getDamagedCenters();},
    findPlantingSite:(...args)=>{
      flushWorldEvents();return bridge.findPlantingSite(...args);
    },
    releasePlantingSite:bridge.releasePlantingSite,
    flushTaskEvents,flushWorldEvents,reconcileNavigationRevision,requestReroute,
    reconcileWorkerRoutes,planIfNeeded,
    hasPendingAt,needsReconciliation,metrics,
    commitTaskBatchToState,returnFromRaidRefuge,projectRaidFlightStop,nativeRaidFlightStopRequest,stopForRaidFlight,nativeFarmArrivalContinuationSource,nativeFarmArrivalStopRequest,nativeIdleStrollStopRequest,nativeWorkerTaskEligible:actorId=>eligible.has(typeof actorId==='number'?actorId:numericId(actorId)),
    registerAttackIntent:(...args)=>{
      const result=bridge.registerAttackIntent(...args);
      pendingNativeChanges=true;
      pendingAttackRoutes.delete(numericId(args[1].id));
      return result;
    },
    requestNativeCenterBirth:(state,animal,selection,body)=>{
      if(!bridge.requestNativeCenterBirth(state,animal,selection,body))return false;
      pendingNativeChanges=true;
      return true;
    },
    planAttackCrop:(state,animal)=>{
      if(state!==observedTaskState&&state!==sourceState)return null;
      // A preceding strike or harvest may have removed a crop earlier in this
      // same Game.tick. Project confirmed events before choosing and leasing
      // another target; never let the native index lag its JS authority here.
      if(pendingWorldEvents.length)flushWorldEvents();
      const result=bridge.planAttackCrop(state,animal);
      if(result!==null){
        recordAnimalPlan(animal,state.elapsed);
        if(result.status==='found')pendingNativeChanges=true;
      }
      return result;
    },
    planAttackWall:(state,animal)=>{
      if(state!==observedTaskState&&state!==sourceState)return null;
      if(pendingWorldEvents.length)flushWorldEvents();
      const result=bridge.planAttackWall(state,animal);
      if(result!==null){
        recordAnimalPlan(animal,state.elapsed);
        if(result.status==='found')pendingNativeChanges=true;
      }
      return result;
    },
    requestNativeRetreat:(state,animal)=>{
      if(state!==observedTaskState&&state!==sourceState)return 'unsupported';
      if(pendingWorldEvents.length)flushWorldEvents();
      const result=bridge.requestNativeRetreat(state,animal);
      if(result==='pending')pendingNativeChanges=true;
      return result;
    },
    requestRestoredAnimalRetreat(state,animal,body,encounter){
      if(!bridge.requestRestoredAnimalRetreat(state,animal,body,encounter))return false;
      retreatRoutes.delete(numericId(animal.id));pendingNativeChanges=true;
      return true;
    },
    finishNativeRetreat:(animal,native)=>{
      if(!bridge.finishNativeRetreat(animal,native))return false;
      onNativeAnimalDeparted?.(animal.id,native.body);pendingNativeChanges=true;
      return true;
    },
    planRetreatRoute:(state,animal)=>{
      if(state!==observedTaskState&&state!==sourceState)return null;
      if(pendingWorldEvents.length)flushWorldEvents();
      const result=bridge.planRetreatRoute(animal);
      recordAnimalPlan(animal,state.elapsed);
      if(result.status==='found'){
        retreatRoutes.add(numericId(animal.id));pendingNativeChanges=true;
      }else retreatRoutes.delete(numericId(animal.id));
      return result;
    },
    planHomeRoute:(state,worker,home,navVersion)=>{
      if(state!==observedTaskState&&state!==sourceState)return null;
      const id=numericId(worker.id);
      if(homeRoutes.has(id))return {status:'active'};
      if(homeAttempts.get(id)===navVersion)return {status:'fallback'};
      if(pendingWorldEvents.length)flushWorldEvents();
      if(pendingTaskEvents.length)flushTaskEvents();
      const result=bridge.planHomeRoute(worker,home);
      recordHomePlan(worker,state.elapsed,result);
      homeAttempts.set(id,navVersion);
      if(result.status==='found'){
        homeRoutes.add(id);pendingNativeChanges=true;
      }
      return result;
    },
    homeRouteActive:actorId=>homeRoutes.has(numericId(actorId)),
    finishHomeIntent:actorId=>{
      const id=numericId(actorId);
      homeRoutes.delete(id);homeAttempts.delete(id);
      const result=bridge.cancelHomeIntent(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    retreatRouteActive:actorId=>retreatRoutes.has(numericId(actorId)),
    finishRetreatIntent:actorId=>{
      retreatRoutes.delete(numericId(actorId));
      const result=bridge.cancelAttackIntent(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    retireRaidActors:animals=>{
      for(const animal of animals){
        const id=numericId(animal.id);
        bridge.retireActor(animal.id);
        animalRequests.delete(id);animalPlanCounts.delete(id);
        animalPeakPerMinute.delete(id);pendingAttackRoutes.delete(id);
        tacticalReconsiderations.delete(id);retreatRoutes.delete(id);
      }
    },
    attackRoutePending:actorId=>pendingAttackRoutes.has(numericId(actorId)),
    retryPendingAttackRoute:(state,animal,navVersion)=>{
      const id=numericId(animal.id),pending=pendingAttackRoutes.get(id);
      if(!pending)return 'ready';
      if(pending.status==='blocked-approach')return 'reconsider';
      // A missing sector or a temporarily invalid interaction point is not a
      // proof that the target is blocked. Give the same lease a few slow
      // recovery attempts, then end an otherwise unbounded raid wait.
      if(state.elapsed-pending.since>=90)return 'expired';
      if(state.elapsed<pending.nextRetry)return 'waiting';
      if(session.core.wasm.nav_intent_request_reroute(id)!==1)return 'expired';
      const replacement=bridge.replanAttackRoute(animal);
      recordAnimalPlan(animal,state.elapsed);
      pendingNativeChanges=true;
      if(replacement.status==='found'){
        animal.path=replacement.path;
        animal.destinationId=animal.approach.id;
        animal.pathVersion=navVersion;
        pendingAttackRoutes.delete(id);
        return 'found';
      }
      if(replacement.status==='blocked-approach'){
        pending.status=replacement.status;
        return 'reconsider';
      }
      pending.attempts++;
      pending.nextRetry=state.elapsed+retrySeconds*2**Math.min(pending.attempts,3);
      return 'waiting';
    },
    drainTacticalReconsiderations:()=>{
      const actors=[...tacticalReconsiderations]
        .sort((a,b)=>numericId(a)-numericId(b));
      tacticalReconsiderations.clear();
      return actors;
    },
    markAttackActive:actorId=>{
      const result=bridge.markAttackActive(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    requestNativeProtectedSuccessor:(...args)=>{
      const requested=bridge.requestNativeProtectedSuccessor(...args);
      if(requested)pendingNativeChanges=true;
      return requested;
    },
    requestNativeCenterSuccessor:(...args)=>{
      const requested=bridge.requestNativeCenterSuccessor(...args);
      if(requested)pendingNativeChanges=true;
      return requested;
    },
    finishAttackIntent:actorId=>{
      pendingAttackRoutes.delete(numericId(actorId));
      const result=bridge.finishAttackIntent(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    cancelAttackIntent:actorId=>{
      pendingAttackRoutes.delete(numericId(actorId));
      retreatRoutes.delete(numericId(actorId));
      tacticalReconsiderations.delete(actorId);
      const result=bridge.cancelAttackIntent(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    markActionActive:actorId=>{
      const result=bridge.markActionActive(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    finishAction:actorId=>{
      const result=bridge.finishAction(actorId);
      if(result)pendingNativeChanges=true;
      return result;
    },
    get authorityEpoch(){return bridge.authorityEpoch;},
    nativeIntentControlBaseline:bridge.nativeIntentControlBaseline,
    nativeWorldResourceBoundary:bridge.nativeWorldResourceBoundary,
    addNativeBarrierAfterGpuQuiescence:bridge.addNativeBarrierAfterGpuQuiescence,
    mutateNativeOverlayAfterGpuQuiescence:bridge.mutateNativeOverlayAfterGpuQuiescence,
    inspectNativeStructureStops:bridge.inspectNativeStructureStops,inspectNativeGateAdditionStops:bridge.inspectNativeGateAdditionStops,inspectNativeGateRemovalStops:bridge.inspectNativeGateRemovalStops,addNativeBarriersAfterGpuQuiescence:bridge.addNativeBarriersAfterGpuQuiescence,mutateNativeWorldAfterGpuQuiescence:bridge.mutateNativeWorldAfterGpuQuiescence,stopNativeIdleStrollAfterGpuQuiescence:bridge.stopNativeIdleStrollAfterGpuQuiescence,stopNativeFarmArrivalAfterGpuQuiescence:bridge.stopNativeFarmArrivalAfterGpuQuiescence,
    nativeCausalClock:bridge.nativeCausalClock,commitNativeCausalClock:bridge.commitNativeCausalClock,
    observeNativeIntentControl:bridge.observeNativeIntentControl,
    flushNativeIntentControl:bridge.flushNativeIntentControl,
    intentChanges:bridge.intentChanges,pendingTaskRoute:bridge.pendingTaskRoute,nativeTaskStartBinding:bridge.nativeTaskStartBinding,
    async startNativeTaskRouteAfterGpuQuiescence(options){
      const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskRouteAfterGpuQuiescence(options);
      // The asynchronous commit emits a real native assignment without a task
      // or topology event. Wake the existing game reconciliation gate, including
      // a physical commit whose subsequent draw-control release failed.
      if(bridge.authorityEpoch===owner&&(result.status==='committed'||result.status==='committed-control-failed'))pendingNativeChanges=true;
      return result;
    },routePoints:bridge.routePoints,
    prepareNativeCenterRuin:bridge.prepareNativeCenterRuin,replanNativeShieldCrop:bridge.replanNativeShieldCrop,startNativeAnimalCropRouteAfterGpuQuiescence:bridge.startNativeAnimalCropRouteAfterGpuQuiescence,startNativeAnimalCropStrikeAfterGpuQuiescence:bridge.startNativeAnimalCropStrikeAfterGpuQuiescence,requestNativeAnimalCropRoute:bridge.requestNativeAnimalCropRoute,requestRestoredAnimalStrike:bridge.requestRestoredAnimalStrike,declareRaidFlightPair:bridge.declareRaidFlightPair,acquireEncounterRetreat:bridge.acquireEncounterRetreat,prepareEncounterRetreat:bridge.prepareEncounterRetreat,observeRetreatEncounter:bridge.observeRetreatEncounter,hasRetreatEncounter:bridge.hasRetreatEncounter,applyRetreatEncounter:bridge.applyRetreatEncounter,prepareEncounterExhaustion:bridge.prepareEncounterExhaustion,consumeEncounterExhaustion:bridge.consumeEncounterExhaustion,confirmEncounterExhaustion:bridge.confirmEncounterExhaustion,encounterRetreatOwner:bridge.encounterRetreatOwner,requestEncounterRetreat:bridge.requestEncounterRetreat,encounterCheckpoint:bridge.encounterCheckpoint,restoreEncounterWorker:bridge.restoreEncounterWorker,restoreEncounterApproach:bridge.restoreEncounterApproach,encounterApproachPending:bridge.encounterApproachPending,encounterCheckpointBlocked:bridge.encounterCheckpointBlocked,encounterRecoveryCurrent:bridge.encounterRecoveryCurrent,finishEncounterRecovery:bridge.finishEncounterRecovery,requestEncounterHome:(state,w)=>bridge.requestEncounterHome(state,w)&&projectNativeHomeExecution(state,w),prepareHomeEncounterImpact:bridge.prepareHomeEncounterImpact,prepareCenterEncounterStep:bridge.prepareCenterEncounterStep,consumeHomeEncounterImpact:bridge.consumeHomeEncounterImpact,verifyEncounterBoundary:bridge.verifyEncounterBoundary,nativeRaidFlightMember:bridge.nativeRaidFlightMember,nativeCenterFlightAnimalReady:bridge.nativeCenterFlightAnimalReady,nativeFinishedAnimalRetreat:bridge.nativeFinishedAnimalRetreat,nativeFinishedAnimalCrop:bridge.nativeFinishedAnimalCrop,nativeAnimalCropState:bridge.nativeAnimalCropState,nativeAnimalRouteBinding:bridge.nativeAnimalRouteBinding,nativeAnimalCropRouteExecution:bridge.nativeAnimalCropRouteExecution,nativeEncounterFallRecovery:bridge.nativeEncounterFallRecovery,nativeStationaryEncounterRecovery:bridge.nativeStationaryEncounterRecovery,nativeRaidFlightRecoveryExecutions:bridge.nativeRaidFlightRecoveryExecutions,nativeRefugeCropRecovery:bridge.nativeRefugeCropRecovery,nativeCenterRuinRetreatRecovery:bridge.nativeCenterRuinRetreatRecovery,nativeAnimalCropStrikeExecution:bridge.nativeAnimalCropStrikeExecution,nativeRouteTiming:bridge.nativeRouteTiming,nativeRouteTimeKnots:bridge.nativeRouteTimeKnots,sampleNativeRoute:bridge.sampleNativeRoute,captureNativeRoutePresentation:bridge.captureNativeRoutePresentation,
    nativeGateRouteSweep:bridge.nativeGateRouteSweep,
    nativeGateMechanism:bridge.nativeGateMechanism,nativeGateMechanismPose:bridge.nativeGateMechanismPose,nativeGateMechanismSegment:bridge.nativeGateMechanismSegment,
    nativeGateMechanismWorldVertices:bridge.nativeGateMechanismWorldVertices,
    admitNativeGateRoute:bridge.admitNativeGateRoute,nativeGateCrossings:bridge.nativeGateCrossings,
    nativeSuspendedGateRoute:bridge.nativeSuspendedGateRoute,suspendNativeGateRoute:bridge.suspendNativeGateRoute,resumeNativeGateRoute:bridge.resumeNativeGateRoute,resumeNativeGateRouteAfterGpuQuiescence:bridge.resumeNativeGateRouteAfterGpuQuiescence,prepareNativeGateResumeProposal:bridge.prepareNativeGateResumeProposal,captureNativeGateResumeProposal:bridge.captureNativeGateResumeProposal,cancelNativeGateResumeProposal:bridge.cancelNativeGateResumeProposal,revalidateNativeGateResumeProposal:bridge.revalidateNativeGateResumeProposal,
    prepareNativeTaskStartProposal:bridge.prepareNativeTaskStartProposal,captureNativeTaskStartProposal:bridge.captureNativeTaskStartProposal,revalidateNativeTaskStartProposal:bridge.revalidateNativeTaskStartProposal,cancelNativeTaskStartProposal:bridge.cancelNativeTaskStartProposal,
    prepareNativeGateMotionAfterGpuFence:bridge.prepareNativeGateMotionAfterGpuFence,
    reserveNativeRoute:bridge.reserveNativeRoute,
    prepareNativeRouteMotion:bridge.prepareNativeRouteMotion,
    beginNativeRouteExecution:bridge.beginNativeRouteExecution,
    advanceNativeRouteExecution:bridge.advanceNativeRouteExecution,
    stopNativeRouteExecution:bridge.stopNativeRouteExecution,nativeRouteExecution:bridge.nativeRouteExecution,
    nativeGameExecutionState:bridge.nativeGameExecutionState,advanceNativeGameExecution:bridge.advanceNativeGameExecution,nativeTaskExecution:bridge.nativeTaskExecution,nativeTaskCancellationSource:bridge.nativeTaskCancellationSource,nativeTaskCancellationSupported:bridge.nativeTaskCancellationSupported,cancelNativePendingTaskForBlessing,projectNativeTaskExecution,requestNativeTaskActionResources:bridge.requestNativeTaskActionResources,nativeTaskActionRequest:bridge.nativeTaskActionRequest,
    async startNativeTaskActionAfterGpuQuiescence(options){
      const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskActionAfterGpuQuiescence(options);
      if(bridge.authorityEpoch===owner&&result.resources){
        pendingNativeChanges=true;
        const request=result.nativeTaskActionBinding.reference.request,state=sourceState??observedTaskState;
        const worker=state?.workers.find(w=>numericId(w.id)===nativeTaskActionActor(request));
        if(worker)projectNativeTaskActionExecution(state,worker);
      }
      return result;
    },prepareNativeTaskActionProposal:bridge.prepareNativeTaskActionProposal,captureNativeTaskActionProposal:bridge.captureNativeTaskActionProposal,revalidateNativeTaskActionProposal:bridge.revalidateNativeTaskActionProposal,cancelNativeTaskActionProposal:bridge.cancelNativeTaskActionProposal,
    nativeTaskActionBinding:bridge.nativeTaskActionBinding,nativeTaskActionBindings:bridge.nativeTaskActionBindings,nativeTaskActionExecution:bridge.nativeTaskActionExecution,nativeTaskActionRestoreReferences:bridge.nativeTaskActionRestoreReferences,projectNativeTaskActionExecution,
    async startNativeTaskSettlementAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskSettlementAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeTaskSettlementBinding.reference.actorId);if(worker)projectNativeSettledWorkerExecution(state,worker);}return result;},
    projectEncounterHome,projectNativeHomeExecution,nativeHomeDeclarationReference:bridge.nativeHomeDeclarationReference,nativeHomeRequestReference:bridge.nativeHomeRequestReference,nativeHomeRequestReferences:bridge.nativeHomeRequestReferences,nativeHomeRouteBinding:bridge.nativeHomeRouteBinding,nativeHomeRouteBindings:bridge.nativeHomeRouteBindings,nativeHomeRouteExecution:bridge.nativeHomeRouteExecution,prepareNativeHomeRouteProposal:bridge.prepareNativeHomeRouteProposal,captureNativeHomeRouteProposal:bridge.captureNativeHomeRouteProposal,revalidateNativeHomeRouteProposal:bridge.revalidateNativeHomeRouteProposal,cancelNativeHomeRouteProposal:bridge.cancelNativeHomeRouteProposal,
    nativeWorkerHomeInactive:bridge.nativeWorkerHomeInactive,prepareNativeHomeArrivalProposal:bridge.prepareNativeHomeArrivalProposal,captureNativeHomeArrivalProposal:bridge.captureNativeHomeArrivalProposal,revalidateNativeHomeArrivalProposal:bridge.revalidateNativeHomeArrivalProposal,cancelNativeHomeArrivalProposal:bridge.cancelNativeHomeArrivalProposal,
    async startNativeHomeArrivalAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeHomeArrivalAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources)pendingNativeChanges=true;return result;},
    async continueNativeFarmArrivalAfterGpuQuiescence(options){
      const source=nativeFarmArrivalContinuationSource(options?.actorId),identity=v=>v&&JSON.stringify({...v,executedThrough:0});
      if(!source)return {status:'unsupported',authorizedAutonomy:false,authorizedPassage:false};
      const owner=bridge.authorityEpoch,result=await bridge.continueNativeFarmArrivalAfterGpuQuiescence(options,()=>identity(nativeFarmArrivalContinuationSource(options.actorId))===identity(source));
      if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeFarmArrivalBinding.reference.actorId);if(worker)projectNativeFarmArrivalExecution(state,worker);}return result;
    },
    async startNativeFarmArrivalAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeFarmArrivalAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeFarmArrivalBinding.reference.actorId);if(worker)projectNativeFarmArrivalExecution(state,worker);}return result;},
    async startNativeHomeRouteAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeHomeRouteAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources)pendingNativeChanges=true;return result;},
    prepareNativeFarmArrivalContinuationProposal:bridge.prepareNativeFarmArrivalContinuationProposal,prepareNativeFarmArrivalRouteProposal:bridge.prepareNativeFarmArrivalRouteProposal,captureNativeFarmArrivalRouteProposal:bridge.captureNativeFarmArrivalRouteProposal,revalidateNativeFarmArrivalRouteProposal:bridge.revalidateNativeFarmArrivalRouteProposal,cancelNativeFarmArrivalRouteProposal:bridge.cancelNativeFarmArrivalRouteProposal,nativeFarmArrivalRouteSourceRequestReference:bridge.nativeFarmArrivalRouteSourceRequestReference,nativeFarmArrivalRouteBinding:bridge.nativeFarmArrivalRouteBinding,nativeFarmArrivalRouteBindings:bridge.nativeFarmArrivalRouteBindings,nativeFarmArrivalRouteExecution:bridge.nativeFarmArrivalRouteExecution,nativeFarmArrivalHeldExecution:bridge.nativeFarmArrivalHeldExecution,
    nativeFarmArrivalIdleSource,nativeSettlementIdleSource,nativeFarmArrivalRequestReference:bridge.nativeFarmArrivalRequestReference,nativeFarmArrivalRequestReferences:bridge.nativeFarmArrivalRequestReferences,nativeFarmArrivalDeclarationReference:bridge.nativeFarmArrivalDeclarationReference,requestNativeFarmArrivalResources,projectNativeFarmArrivalRequest,projectNativeFarmArrivalDeclaration,projectNativeFarmArrivalExecution,
    nativeInitialIdleRequestReference:bridge.nativeInitialIdleRequestReference,nativeInitialIdleRequestReferences:bridge.nativeInitialIdleRequestReferences,nativeInitialIdleDeclarationReference:bridge.nativeInitialIdleDeclarationReference,requestNativeInitialIdleResources,projectNativeInitialIdleRequest,projectNativeInitialIdleDeclaration,requestNativeIdleHome,requestNativeFarmHome,requestNativeStoppedTaskHome,requestNativeCompletedTaskHome,projectNativeSettledWorkerExecution,
    async startNativeIdleStrollAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeIdleStrollAfterGpuQuiescence(options,terminalIdleAdmissionCurrent(options));if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeIdleStrollBinding.reference.actorId);if(worker)projectNativeIdleStroll(state,worker);}return result;},
    prepareNativeFarmArrivalStopProposal:bridge.prepareNativeFarmArrivalStopProposal,captureNativeFarmArrivalStopProposal:bridge.captureNativeFarmArrivalStopProposal,revalidateNativeFarmArrivalStopProposal:bridge.revalidateNativeFarmArrivalStopProposal,cancelNativeFarmArrivalStopProposal:bridge.cancelNativeFarmArrivalStopProposal,nativeFarmArrivalStopBinding:bridge.nativeFarmArrivalStopBinding,
    prepareNativeTaskRouteStopProposal:bridge.prepareNativeTaskRouteStopProposal,captureNativeTaskRouteStopProposal:bridge.captureNativeTaskRouteStopProposal,revalidateNativeTaskRouteStopProposal:bridge.revalidateNativeTaskRouteStopProposal,cancelNativeTaskRouteStopProposal:bridge.cancelNativeTaskRouteStopProposal,nativeTaskRouteStopBinding:bridge.nativeTaskRouteStopBinding,
    nativeTaskReturnSource,nativeTaskRouteStopRequest,stopNativeTaskForHomeAfterGpuQuiescence,
    stopNativeTaskRouteAfterGpuQuiescence:bridge.stopNativeTaskRouteAfterGpuQuiescence,
    prepareNativeIdleStrollStopProposal:bridge.prepareNativeIdleStrollStopProposal,captureNativeIdleStrollStopProposal:bridge.captureNativeIdleStrollStopProposal,revalidateNativeIdleStrollStopProposal:bridge.revalidateNativeIdleStrollStopProposal,cancelNativeIdleStrollStopProposal:bridge.cancelNativeIdleStrollStopProposal,nativeIdleStrollStopBinding:bridge.nativeIdleStrollStopBinding,
    nativeIdleStrollDeclarationReference:bridge.nativeIdleStrollDeclarationReference,projectNativeIdleStrollRequest,projectNativeIdleStrollDeclaration,
    nativeIdleStrollRequestReference:bridge.nativeIdleStrollRequestReference,nativeIdleStrollSourceRequestReference:bridge.nativeIdleStrollSourceRequestReference,nativeIdleStrollRequestReferences:bridge.nativeIdleStrollRequestReferences,
    nativeIdleStrollFailedRestReference:bridge.nativeIdleStrollFailedRestReference,nativeIdleStrollBinding:bridge.nativeIdleStrollBinding,nativeIdleStrollBindings:bridge.nativeIdleStrollBindings,nativeIdleStrollExecution:bridge.nativeIdleStrollExecution,nativeIdleStrollHeldExecution:bridge.nativeIdleStrollHeldExecution,requestNativeIdleStrollHome:bridge.requestNativeIdleStrollHome,projectNativeIdleStroll,prepareNativeIdleStrollProposal:bridge.prepareNativeIdleStrollProposal,captureNativeIdleStrollProposal:bridge.captureNativeIdleStrollProposal,revalidateNativeIdleStrollProposal:bridge.revalidateNativeIdleStrollProposal,cancelNativeIdleStrollProposal:bridge.cancelNativeIdleStrollProposal,
    nativeIdleCycleBinding:bridge.nativeIdleCycleBinding,nativeIdleCycleBindings:bridge.nativeIdleCycleBindings,nativeIdleCycleNextRequest:bridge.nativeIdleCycleNextRequest,nativeIdleCycleExecution:bridge.nativeIdleCycleExecution,projectNativeIdleCycle,prepareNativeIdleCycleProposal:bridge.prepareNativeIdleCycleProposal,async startNativeIdleCycleAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeIdleCycleAfterGpuQuiescence(options,terminalIdleAdmissionCurrent(options));if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeIdleCycleBinding.reference.actorId);if(worker)projectNativeIdleCycle(state,worker);}return result;},captureNativeIdleCycleProposal:bridge.captureNativeIdleCycleProposal,revalidateNativeIdleCycleProposal:bridge.revalidateNativeIdleCycleProposal,cancelNativeIdleCycleProposal:bridge.cancelNativeIdleCycleProposal,
    nativeInitialIdleBodyBinding:bridge.nativeInitialIdleBodyBinding,nativeInitialIdleBodyBindings:bridge.nativeInitialIdleBodyBindings,nativeInitialIdleBodyState:bridge.nativeInitialIdleBodyState,prepareNativeInitialIdleBodyProposal:bridge.prepareNativeInitialIdleBodyProposal,captureNativeInitialIdleBodyProposal:bridge.captureNativeInitialIdleBodyProposal,revalidateNativeInitialIdleBodyProposal:bridge.revalidateNativeInitialIdleBodyProposal,cancelNativeInitialIdleBodyProposal:bridge.cancelNativeInitialIdleBodyProposal,projectNativeInitialIdleBody,
    async startNativeInitialIdleBodyAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeInitialIdleBodyAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeInitialIdleBodyBinding.reference.actorId);if(worker)projectNativeInitialIdleBody(state,worker);}return result;},
    nativeTaskSettlementBinding:bridge.nativeTaskSettlementBinding,nativeTaskSettlementBindings:bridge.nativeTaskSettlementBindings,nativeSettledWorkerExecution:bridge.nativeSettledWorkerExecution,prepareNativeTaskSettlementProposal:bridge.prepareNativeTaskSettlementProposal,captureNativeTaskSettlementProposal:bridge.captureNativeTaskSettlementProposal,revalidateNativeTaskSettlementProposal:bridge.revalidateNativeTaskSettlementProposal,cancelNativeTaskSettlementProposal:bridge.cancelNativeTaskSettlementProposal,
    nativeTaskConsequenceBinding:bridge.nativeTaskConsequenceBinding,nativeDeliveryExecution:bridge.nativeDeliveryExecution,projectNativeDeliveryExecution,
    async startNativeTaskConsequenceAfterGpuQuiescence(options){
      const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskConsequenceAfterGpuQuiescence(options);
      if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeRoute.actorId);if(worker)projectNativeDeliveryExecution(state,worker);}
      return result;
    },prepareNativeTaskConsequenceProposal:bridge.prepareNativeTaskConsequenceProposal,captureNativeTaskConsequenceProposal:bridge.captureNativeTaskConsequenceProposal,revalidateNativeTaskConsequenceProposal:bridge.revalidateNativeTaskConsequenceProposal,cancelNativeTaskConsequenceProposal:bridge.cancelNativeTaskConsequenceProposal,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
