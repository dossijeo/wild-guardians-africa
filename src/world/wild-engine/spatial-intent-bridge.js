import {copyNativeHomeArrivalReference,copyNativeHomeArrivalProposal,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../native-home-arrival.js';
import {createNativeResourceAdmission} from '../native-resource-admission.js';
import {nativeTaskStartReferenceFromProposal} from '../native-task-start-reference.js';
import {copyNativeTaskRequestReference} from '../native-task-request-reference.js';
import {copyNativeTaskActionRestoreReference} from '../native-task-action-restore-reference.js';
import {copyNativeTaskActionProgress,nativeTaskActionActor,copyNativeTaskActionRequest,copyNativeTaskActionProposal,nativeTaskActionReferenceFromProposal,sameNativeTaskActionRequest,NATIVE_TASK_ACTION_KINDS} from '../native-task-action-presentation.js';
import {copyNativeTaskActionAttestation} from '../native-task-action-attestation.js';
import {copyNativeTaskStartAttestation} from '../native-task-start-attestation.js';
import {copyNativeTaskConsequenceProposal,copyNativeTaskConsequenceAttestation,copyNativeTaskConsequenceReference} from '../native-task-consequence.js';
import {copyNativeHomeRouteProposal,copyNativeHomeRouteReference,copyNativeHomeRouteAttestation} from '../native-home-route.js';
import {copyNativeTaskSettlementReference,copyNativeTaskSettlementProposal,copyNativeTaskSettlementAttestation} from '../native-task-settlement.js';
import {nativeEntityNumericId as numericId} from '../native-entity-id.js';
import {copyNativeGatePresentation} from '../native-gate-presentation.js';
import {centerGeometry,centerServicePoint,centerDeliveryPoint} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';
import {observeGameEvents,repairCost,prepareHarvestConsequence,harvestConsequenceCurrent,projectNativeHarvestConsequence,prepareCrateDeliveryConsequence,crateDeliveryConsequenceCurrent,projectNativeCrateDeliveryConsequence,projectNativeHomeRouteExecution} from '../../simulation/game.js';
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

function inactiveHomeEntry(state,worker){
  if(!worker||worker.status!=='home'||worker.taskId||worker.crateId||worker.nativeRouteAdmission!==undefined||worker.nativeTaskAction!==undefined||worker.nativeDelivery!==undefined||worker.path?.length||worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining>0||worker.raidReturn||worker.running!==false||worker.gateWaiting!==false)return null;
  const village=state.villages.find(v=>v.id===worker.villageId),entry=village?.entry??village;
  return entry&&Number.isFinite(entry.x)&&Number.isFinite(entry.z)&&worker.x===entry.x&&worker.z===entry.z?entry:null;
}

function normalizeNativeActionRestoration(state,wasm){
  if(state.workers.some(w=>w.nativeRouteAdmission==='native-home'))throw Error('Native Home restoration requires fresh route resource admission');
  if(state.workers.some(w=>w.nativeRouteAdmission==='native-delivery'||w.nativeDelivery!==undefined))throw Error('Native delivery restoration requires fresh consequence resource admission');
  const workers=state.workers.filter(w=>['native-action','pending-action-resources'].includes(w.nativeRouteAdmission));
  if(workers.length&&wasm.nav_task_action_restore_version?.()!==1)throw Error('Rebuild native task action restoration');
  const prepared=workers.map(worker=>{const action=copyNativeTaskActionProgress(worker.nativeTaskAction),task=state.tasks.find(t=>t.id===worker.taskId),pending=worker.nativeRouteAdmission==='pending-action-resources';
    if(!task||task.workerId!==worker.id||task.kind!==action.kind||worker.status!==(pending?'waiting-task':'acting')||(pending?worker.path!==null:!Array.isArray(worker.path)||worker.path.length)||worker.actionRemaining!==action.duration-action.elapsed||worker.running!==false||worker.gateWaiting!==false||![worker.x,worker.z,worker.heading].every(Number.isFinite))throw Error('Invalid native action restoration state');
    return {worker,action};});
  for(const {worker,action} of prepared){worker.nativeTaskAction=action;worker.nativeRouteAdmission='pending-action-resources';worker.status='waiting-task';worker.path=null;worker.taskApproach=null;worker.running=false;worker.gateWaiting=false;}
}

export function createSpatialIntentBridge(session,{authorityEpoch=globalThis.crypto.randomUUID(),onNativeWorldResources=null}={}){
  if(onNativeWorldResources!==null&&typeof onNativeWorldResources!=='function')throw TypeError('Invalid native world resource observer');
  if(typeof authorityEpoch!=='string'||!authorityEpoch||authorityEpoch.length>256)
    throw TypeError('Expected an authority epoch for native route handles');
  const wasm=session?.core?.wasm;
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
  let sequence=0,initialized=false,owningState=null,lastIntentSequence=0;
  const controlObservers=new Set();
  // Retention is independent of the event subscription: closing a port or
  // stopping an observer does not prove its device stopped executing work.
  const controlConsumers=new Map();
  let committedWorldBoundary=null;
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
    normalizeNativeActionRestoration(state,wasm);
    closeControlObservers('native-reset');
    wasm.nav_intent_reset();sequence=0;lastIntentSequence=0;
    initialized=true;owningState=state;
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
      if(wasm.spatial_body_count()===0)for(const worker of workers){
        const entry=inactiveHomeEntry(state,worker);if(!entry)continue;
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
      throw RangeError('Plant search budget must be 1–4096');
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
    const requestsChanged=data.some((value,i)=>i%15===1&&value===6),requestReferences=new Map((requestsChanged?nativeTaskRequestReferences():[]).map(value=>[value.actorId,value])),actionRequestReferences=new Map((requestsChanged?nativeTaskActionRestoreReferences():[]).map(value=>[value.actorId,value]));
    const types=['','RouteAssigned','RouteInvalidated','RouteReplaced',
      'IntentChanged','RouteCompleted'];
    return Array.from({length:remaining},(_,index)=>{
      const at=index*15;
      if(data[at+14]!==2||data[at+8]!==after+index+1||
         !types[data[at+13]]||!Number.isFinite(data[at+9]))
        throw Error('Invalid native intent transition order or protocol');
      return {actorId:data[at],state:data[at+1],taskId:data[at+2]||null,
        targetId:data[at+3]||null,routeHandle:data[at+6]?
          routeHandle(data[at+4],data[at+5],data[at+6]):null,
        topologyRevision:data[at+7],sequence:data[at+8],effectiveTime:data[at+9],
        revokedRouteHandle:data[at+12]?
          routeHandle(data[at+10],data[at+11],data[at+12]):null,
        type:types[data[at+13]],protocolVersion:2,authorityEpoch:epoch(),...(data[at+1]===6?{taskRequest:requestReferences.get(data[at])?.requestSequence===data[at+8]?requestReferences.get(data[at]):null,...(actionRequestReferences.get(data[at])?.requestSequence===data[at+8]?{actionRequest:actionRequestReferences.get(data[at])}:{})}:{})};
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
  const nativeIntentControlBaseline=()=>{
    syncBoundaryTime();
    const count=wasm.nav_intent_control_snapshot();
    if(count<0)throw Error('Native intent control baseline is incoherent');
    const data=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_control_snapshot_ptr(),count*6));
    const clock=nativeCausalClock();
    if(clock&&(clock.intentSequence!==wasm.nav_intent_transition_sequence()||clock.committedThrough!==wasm.nav_intent_effective_time()))
      throw Error('Commit the native causal clock before attaching a new draw consumer');
    const pendingTaskRequests=nativeTaskRequestReferences(),pendingActionRequests=nativeTaskActionRestoreReferences(),nativeStartedRoutes=Array.from({length:count},(_,i)=>nativeTaskStartBinding(data[i*6])).filter(Boolean),nativeActions=nativeTaskActionBindings(),nativeHomes=nativeHomeRouteBindings(),nativeSettlements=nativeTaskSettlementBindings(),nativeConsequences=Array.from({length:count},(_,i)=>nativeTaskConsequenceBinding(data[i*6])).filter(Boolean);
    return {type:'IntentBaseline',protocolVersion:2,authorityEpoch:epoch(),worldBoundary:nativeWorldBoundary(),...(clock?{clock}:{}),
      sequence:wasm.nav_intent_transition_sequence(),effectiveTime:wasm.nav_intent_effective_time(),...(pendingTaskRequests.length?{pendingTaskRequests}:{}),...(pendingActionRequests.length?{pendingActionRequests}:{}),...(nativeStartedRoutes.length?{nativeStartedRoutes}:{}),...(nativeActions.length?{nativeActions}:{}),...(nativeConsequences.length?{nativeConsequences}:{}),...(nativeSettlements.length?{nativeSettlements}:{}),...(nativeHomes.length?{nativeHomes}:{}),
      routes:Array.from({length:count},(_,index)=>{
        const at=index*6;
        return {actorId:data[at],routeHandle:routeHandle(data[at+1],data[at+2],data[at+3]),
          assignmentSequence:data[at+4],startTime:data[at+5]};
      })};
  };
  const observeNativeIntentControl=({onBaseline,onChanges,onClosed=()=>{},onClock=null,gpuConsumer=null}={})=>{
    if(typeof onBaseline!=='function'||typeof onChanges!=='function'||typeof onClosed!=='function'||onClock!==null&&typeof onClock!=='function')
      throw TypeError('Expected native intent control observers');
    if(gpuConsumer!==null&&(!gpuConsumer.publication||typeof gpuConsumer.publication!=='object'||
       !gpuConsumer.owner||typeof gpuConsumer.owner!=='object'))throw TypeError('Expected native GPU consumer ownership');
    const baseline=nativeIntentControlBaseline(),observer={
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
    return Object.freeze({actorId:data[1],routeHandle:handle,startTime:data[2],endTime:data[3],
      speed:data[4],radius:data[5],origin:Object.freeze({x:data[6],z:data[7]}),distance:data[8],
      duration:data[3]-data[2],assignmentSequence:data[11],profile:data[12],points,distances,
      executionScope:gateAdmitted?'native-desert-gate-crossing':gateCandidate?'unadmitted-desert-gate-candidate':resumable?'native-desert-worker-suffix':data[10]===2?'static-desert-worker':'static-desert-animal',authorizedAutonomy:false,
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
  const decodeMotionSample=data=>{
    return {x:data[0],z:data[1],distance:data[2],phase:data[3],yaw:data[4],
      firstRemainingPoint:data[5],arrived:data[6]===1,at:data[7],duration:data[8],
      ...(data[17]===2?{runPhase:data[9],walkPhase:data[10],carryPhase:data[11],
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
    nativeTaskActionBinding:actorId=>nativeTaskActionBinding(actorId),nativeTaskConsequenceBinding:actorId=>nativeTaskConsequenceBinding(actorId),nativeTaskSettlementBinding:actorId=>nativeTaskSettlementBinding(actorId),nativeHomeRouteBinding:actorId=>nativeHomeRouteBinding(actorId)
  });
  const addNativeBarrierAfterGpuQuiescence=({getPublication,x,z,halfX,halfZ,yaw=0,passMask=0}={})=>{
    if(![x,z,halfX,halfZ,yaw].every(Number.isFinite)||halfX<=0||halfZ<=0||halfX>100||halfZ>100||
       !Number.isInteger(passMask)||passMask<0||passMask>3)throw TypeError('Expected a native barrier proposal');
    return commitNativeWorldProposal(getPublication,()=>wasm.spatial_barrier_proposal_stage(x,z,halfX,halfZ,yaw,passMask),
      (markCommitted,...boundary)=>{const id=wasm.spatial_barrier_proposal_commit(...boundary);
        if(id<=0)return {status:id};markCommitted({barrierId:id});return {status:1,value:{barrierId:id}};});
  };
  const mutateNativeWorldAfterGpuQuiescence=({getPublication,mutation,prepareResources=null,signal=null}={})=>{
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
    }else throw TypeError('Unsupported native world mutation');
    // Only serialization into the authority-owned temporary input buffers.
    return commitNativeWorldProposal(getPublication,()=>{
      const fp=wasm.spatial_world_proposal_float_ptr(floats.length);if(floats.length&&!fp)throw Error('Native proposal allocation failed');
      if(floats.length)new Float32Array(wasm.memory.buffer,fp,floats.length).set(floats);
      const ip=wasm.spatial_world_proposal_int_ptr(integers.length);if(integers.length&&!ip)throw Error('Native proposal allocation failed');
      if(integers.length)new Int32Array(wasm.memory.buffer,ip,integers.length).set(integers);
      return (prepareResources?wasm.spatial_world_proposal_stage_resources:wasm.spatial_world_proposal_stage)(kind,mode,floats.length,integers.length);
    },(markCommitted,...boundary)=>{
      const status=wasm.spatial_world_proposal_commit(...boundary);if(status!==1)return {status};
      // Once native state changed, every failure must still retire the old GPU
      // packet. Never report/release as an aborted physical mutation.
      markCommitted();const count=wasm.spatial_world_proposal_result_count();
      if(!Number.isSafeInteger(count)||count<0||count>8192)throw Error('Invalid native mutation result');
      const ids=Array.from(new Int32Array(wasm.memory.buffer,wasm.spatial_world_proposal_result_ptr(),count));markCommitted({ids});
      if(kind===6||kind===7||kind===11)session.core.adoptNativeResidencyCommit(kind,ids);
      const resources=session.publishNativeWorldResources(committedWorldBoundary);
      if(resources.kind!==kind)throw Error('Native world resource family mismatch');
      if(onNativeWorldResources)onNativeWorldResources({...resources,worldBoundary:nativeWorldBoundary()});
      return {status:1,value:{ids,resources}};
    },prepareResources,signal);
  };
  const mutateNativeOverlayAfterGpuQuiescence=mutateNativeWorldAfterGpuQuiescence;
  const sampleNativeRoute=(handle,at)=>{
    if(handle?.authorityEpoch!==epoch()||
       wasm.nav_intent_route_sample(handle.session,handle.slot,handle.generation,at)!==1)return null;
    return decodeMotionSample(new Float64Array(wasm.memory.buffer,wasm.nav_intent_route_sample_ptr(),18));
  };
  // Copy once for a route assignment. This is not a position publication or
  // another solver: native reservation knots define every affine interval.
  const captureNativeRoutePresentation=handle=>{
    const plan=nativeRouteTiming(handle),knots=plan?nativeRouteTimeKnots(handle):null;
    if(!plan||!knots)return null;
    if(knots[0]!==plan.startTime||knots.at(-1)!==plan.endTime||knots.some((at,i)=>!Number.isFinite(at)||i>0&&at<=knots[i-1]))throw Error('Invalid native presentation knots');
    const worldBoundary=copyNativeWorldBoundary(nativeWorldResourceBoundary()),rows=new Float64Array(knots.length*NATIVE_ROUTE_PRESENTATION_WIDTH);
    for(let i=0;i<knots.length;i++){
      const at=knots[i],pose=sampleNativeRoute(handle,at),right=i+1<knots.length?sampleNativeRoute(handle,at+(knots[i+1]-at)*.5):pose;
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
    if(wasm.nav_intent_clock_commit(rate,0)<0)throw Error('Native task clock policy rejected');
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
    const home=starting==='home',consequence=starting==='consequence';starting=starting===true;
    const prefix=home?'nav_home_route_proposal':consequence?'nav_task_consequence_proposal':starting?'nav_task_start_proposal':'nav_gate_resume_proposal',call=(suffix,...args)=>wasm[prefix+suffix](...args),ticketKind=home?'native-home-route-proposal-ticket':consequence?'native-task-consequence-proposal-ticket':starting?'native-task-start-proposal-ticket':'native-route-resume-proposal-ticket';
    if(ticket?.kind!==ticketKind||ticket.authorityEpoch!==epoch()||call('_snapshot',ticket.session,ticket.ticket)!==1)return null;
    const h=Array.from(new Float64Array(wasm.memory.buffer,call('_header_ptr'),24));
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)return null;
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),count=call('_rows',ticket.session,ticket.ticket),pointsCount=call('_points',ticket.session,ticket.ticket);
    if(!h.every(Number.isFinite)||h[0]!==1||h[17]!==2||t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!== (home?18:consequence?16:starting?14:13)||h[10]!==t[3]||h[23]!==t[2]||h[11]<h[10]||!Number.isSafeInteger(count)||count<1||count>16385||h[19]!==count||!Number.isSafeInteger(pointsCount)||pointsCount<1||pointsCount>4096||h[18]!==pointsCount)throw Error('Invalid native motion proposal resource');
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
    if(home)return copyNativeHomeRouteProposal({kind:'native-home-route-proposal',version:1,ticket,worldBoundary,...motion,sourceSettlement:readHomeRouteSource(h[1],ticket.ticket),authorizedPassage:false});
    if(consequence){const effect=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_consequence_proposal_effect_ptr(),8)),sourceAction=readTaskConsequenceSource(h[1],ticket.ticket);if(effect[0]!==1||effect[1]!==sourceAction.reference.request.taskId||effect[2]!==sourceAction.reference.request.targetId||effect[7]!==sourceAction.actionSequence)throw Error('Native consequence source effect mismatch');return copyNativeTaskConsequenceProposal({kind:'native-task-consequence-proposal',version:1,ticket,worldBoundary,...motion,sourceAction,crateId:effect[3],centerId:effect[4],destination:{x:effect[5],z:effect[6]},authorizedConsequences:false});}
    return Object.freeze({kind:starting?'native-task-start-proposal':'native-route-resume-proposal',version:1,ticket,worldBoundary,...(starting?{sourceRequestHandle:Object.freeze({kind:'native-task-route-request-handle',...routeHandle(ticket.session,h[20],h[3])}),requestSequence:h[21],requestedAt:h[22],taskId:task[0],targetId:task[1]}:{sourceResumeHandle:routeHandle(ticket.session,h[20],h[3]),sourceAssignmentSequence:h[21],suspendedAt:h[22]}),...motion,authorizedPassage:false});
  };
  const captureNativeGateResumeProposal=ticket=>captureNativeMotionProposal(ticket);
  const captureNativeTaskStartProposal=ticket=>captureNativeMotionProposal(ticket,true);
  const captureNativeTaskConsequenceProposal=ticket=>captureNativeMotionProposal(ticket,'consequence');
  const captureNativeHomeRouteProposal=ticket=>captureNativeMotionProposal(ticket,'home');
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
    const home=starting==='home',consequence=starting==='consequence',mode=starting;starting=starting===true;
    const prefix=home?'nav_home_route_proposal':consequence?'nav_task_consequence_proposal':starting?'nav_task_start_proposal':'nav_gate_resume_proposal',call=(suffix,...args)=>wasm[prefix+suffix](...args),ticketKind=home?'native-home-route-proposal-ticket':consequence?'native-task-consequence-proposal-ticket':starting?'native-task-start-proposal-ticket':'native-route-resume-proposal-ticket';
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(ticket?.kind!==ticketKind||ticket.authorityEpoch!==epoch()||call('_version')!==1||wasm.nav_intent_barrier_proposal_ticket()!==1)return outcome('stale');
    const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    if(t[0]!==ticket.session||t[1]!==ticket.ticket||t[5]!== (home?18:consequence?16:starting?14:13))return outcome('stale');
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
      const timeTranslation=Object.freeze({kind:home?'native-home-route-time-translation':consequence?'native-task-consequence-time-translation':starting?'native-task-start-time-translation':'native-resume-time-translation',version:2,previousTicket,ticket:nextTicket,...(home?{sourceSettlement:proposal.sourceSettlement}:consequence?{sourceAction:proposal.sourceAction,crateId:proposal.crateId,centerId:proposal.centerId}:starting?{sourceRequestHandle:proposal.sourceRequestHandle,requestSequence:proposal.requestSequence}:{sourceResumeHandle:proposal.sourceResumeHandle}),previousStartTime:values[3],previousEndTime:values[4],startTime:values[5],endTime:values[6],sameNativeMotion:values[7]===1,sameNativeGates:values[8]===1,sameFloat32Motion:values[9]===1,sameFloat32Gates:values[10]===1,authorizedAutonomy:false,authorizedPassage:false});
      return outcome('revalidated',{previousTicket,proposal,timeTranslation,requiresResourcePreparation:true});
    }catch(error){call('_cancel',nextTicket.session,nextTicket.ticket);throw error;}
  };
  const revalidateNativeGateResumeProposal=ticket=>revalidateNativeMotionProposal(ticket);
  const revalidateNativeTaskStartProposal=ticket=>revalidateNativeMotionProposal(ticket,true);
  const revalidateNativeTaskConsequenceProposal=ticket=>revalidateNativeMotionProposal(ticket,'consequence');
  const revalidateNativeHomeRouteProposal=ticket=>revalidateNativeMotionProposal(ticket,'home');
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
    if(r.worldBoundary.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_task_settlement_proposal_version?.()!==1)throw Error('Rebuild native task settlement');
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
  const readHomeRouteSource=(actor,ticket=0)=>{
    if(wasm.nav_home_route_source_snapshot(actor,ticket)!==1)throw Error('Native Home stationary source unavailable');
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_task_settlement_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Home stationary source');
    const carry=readTaskConsequenceBinding(actor,ticket,true);return copyNativeTaskSettlementAttestation({kind:'native-task-settlement-attestation',version:1,projectionVersion:1,settlementSequence:a[1],preparedReference:settlementReference(a.slice(4,28),a[2],carry),reference:settlementReference(a.slice(28,52),a[3],carry)});
  };
  const prepareNativeHomeRouteProposal=source=>{
    const held=copyNativeTaskSettlementAttestation(source),r=held.reference,outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra});
    if(!r.home)return outcome('unsupported');if(r.worldBoundary.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_home_route_proposal_version?.()!==1)throw Error('Rebuild native Home route admission');
    syncBoundaryTime();flushNativeIntentControl();const actual=nativeTaskSettlementBinding(r.actorId);if(JSON.stringify(actual)!==JSON.stringify(held))return outcome('stale');
    const status=wasm.nav_home_route_proposal_stage(r.actorId,r.worldBoundary.nativeSession,held.settlementSequence);if(status!==1)return outcome(status===-4?'busy':status===-6?'unknown':status===0?'conflict':'unsupported');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native Home lost its ticket');const t=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6)),ticket={kind:'native-home-route-proposal-ticket',authorityEpoch:epoch(),session:t[0],ticket:t[1]};
    try{return outcome('proposed',{proposal:captureNativeHomeRouteProposal(ticket)});}catch(error){wasm.nav_home_route_proposal_cancel(t[0],t[1]);throw error;}
  };
  const cancelNativeHomeRouteProposal=ticket=>ticket?.kind==='native-home-route-proposal-ticket'&&ticket.authorityEpoch===epoch()&&wasm.nav_home_route_proposal_cancel(ticket.session,ticket.ticket)===1;
  const nativeHomeRouteBinding=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_home_route_binding_snapshot?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_route_binding_ptr(),52));if(a[0]!==1||!a.every(Number.isFinite))throw Error('Invalid native Home route binding');const sourceSettlement=readHomeRouteSource(actor),count=wasm.nav_home_route_binding_gates(actor);if(!Number.isSafeInteger(count)||count<0||count>1024)throw Error('Invalid native Home gates');const gateIds=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_gate_result_ptr(),count));
    const ref=(h,ticket)=>copyNativeHomeRouteReference({kind:'native-home-route-reference',version:1,actorId:h[1],bodyId:h[2],sourceSettlement,expectedRouteHandle:routeHandle(wasm.nav_intent_session(),h[20],h[4]),sourceControlSequence:h[23],endTime:h[11],worldBoundary:{version:1,authorityEpoch:epoch(),nativeSession:wasm.nav_intent_session(),ticket,effectiveTime:h[10]}});
    return copyNativeHomeRouteAttestation({kind:'native-home-route-attestation',version:1,projectionVersion:1,assignmentSequence:a[1],preparedReference:ref(a.slice(4,28),a[2]),reference:ref(a.slice(28,52),a[3]),gateIds});
  };
  const nativeHomeRouteBindings=()=>{
    if(!wasm.nav_home_route_binding_actors)return Object.freeze([]);const count=wasm.nav_home_route_binding_actors();if(!Number.isSafeInteger(count)||count<0||count>32768)throw Error('Invalid native Home route count');
    const actors=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_home_route_binding_ptr(),count));return Object.freeze(actors.map(actor=>{const binding=nativeHomeRouteBinding(actor);if(!binding)throw Error('Native Home route lost its source');return binding;}));
  };
  const nativeHomeRouteExecution=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId);if(wasm.nav_intent_home_execution?.(actor)!==1)return null;
    const a=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_home_execution_ptr(),30)),binding=nativeHomeRouteBinding(actor);if(a[0]!==1||!a.every(Number.isFinite)||!binding||binding.assignmentSequence!==a[7]||binding.reference.sourceSettlement.settlementSequence!==a[11])throw Error('Invalid native Home execution');
    return Object.freeze({kind:'native-home-route-execution',version:1,actorId:a[1],bodyId:a[2],villageId:a[3],nativeRoute:Object.freeze({actorId:a[1],routeHandle:routeHandle(a[4],a[5],a[6]),assignmentSequence:a[7]}),executedThrough:a[8],destination:Object.freeze({x:a[9],z:a[10]}),binding,...decodeMotionSample(a.slice(12))});
  };
  const homeArrivalReference=(h,ticket,sourceHome)=>{
    const r=sourceHome.reference,home=r.sourceSettlement.reference.home;
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
    if(r.worldBoundary.authorityEpoch!==epoch())return outcome('stale');if(wasm.nav_home_arrival_proposal_version?.()!==1)throw Error('Rebuild native Home arrival admission');syncBoundaryTime();flushNativeIntentControl();
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
    return !!inactiveHomeEntry(owningState,worker)&&wasm.nav_intent_worker_inactive?.(actor)===1;
  };
  const startNativeHomeArrivalAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Home arrival requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),source=nativeHomeRouteBinding(actor),home=source?.reference.sourceSettlement.reference.home,village=home&&state?.villages.find(v=>numericId(v.id)===home.villageId);
    if(!source||!worker||!village)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});
    const current=()=>{const e=nativeHomeRouteExecution(actor);return owningState===state&&state.workers.includes(worker)&&state.villages.includes(village)&&worker.status==='returning'&&worker.nativeRouteAdmission==='native-home'&&!worker.taskId&&!worker.crateId&&!worker.path?.length&&!worker.incapacitated&&!worker.recovery&&!worker.recoveryExitRemaining&&!worker.fallRemaining&&!worker.raidReturn&&worker.running===false&&worker.gateWaiting===false&&numericId(worker.villageId)===home.villageId&&(village.entry??village).x===home.x&&(village.entry??village).z===home.z&&e?.arrived===true&&e.executedThrough===state.elapsed&&e.binding.assignmentSequence===source.assignmentSequence&&JSON.stringify(e.binding)===JSON.stringify(source)&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>worker[k]===e[k])&&worker.heading===e.yaw;};
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
      const pose=issued.reference.pose;Object.assign(worker,{x:home.x,z:home.z,heading:pose.yaw,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase,runRemaining:pose.runRemaining,status:'home',path:[],running:false,gateWaiting:false});delete worker.nativeRouteAdmission;notifyWorkerPlanningChange(state,worker);
      const resources=Object.freeze({version:1,kind:19,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeHomeArrivalBinding:issued});mark({resources,nativeHomeArrivalBinding:issued});return {status:1,value:{resources,nativeHomeArrivalBinding:issued}};
    },prepareResources,signal,protocol);
  };
  const startNativeHomeRouteAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native Home requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),source=nativeTaskSettlementBinding(actor),home=source?.reference.home,village=home&&state?.villages.find(v=>numericId(v.id)===home.villageId);
    if(!source||!home||!worker||!village)return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});
    const current=()=>owningState===state&&state.workers.includes(worker)&&state.villages.includes(village)&&worker.status==='returning'&&!worker.incapacitated&&!worker.recovery&&!worker.recoveryExitRemaining&&!worker.fallRemaining&&!worker.raidReturn&&worker.running===false&&worker.gateWaiting===false&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>worker[k]===source.reference.pose[k])&&!worker.taskId&&!worker.crateId&&!worker.nativeRouteAdmission&&!worker.path?.length&&numericId(worker.villageId)===home.villageId&&(village.entry??village).x===home.x&&(village.entry??village).z===home.z;
    if(!current())return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedPassage:false});let candidate=null,translation=null,preparedTicket=null;
    const protocol={preparedFrameRequired:true,deferred:true,motionKind:'home-route',
      retained(session,ticket){if(!current()||wasm.nav_intent_barrier_proposal_ticket()!==1)return false;const a=new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6);return a[0]===session&&a[1]===ticket&&a[5]===18;},
      revalidate(session,ticket){if(!current())return {status:'stale'};const result=revalidateNativeHomeRouteProposal({kind:'native-home-route-proposal-ticket',authorityEpoch:epoch(),session,ticket});if(result.status==='revalidated'){candidate=result.proposal;translation=result.timeTranslation;}return result;},timeTranslation:()=>translation,gateIds:()=>candidate.gates.map(g=>g.gateId),ticket:()=>wasm.nav_intent_barrier_proposal_ticket(),ticketPtr:()=>wasm.nav_intent_barrier_proposal_ticket_ptr(),snapshot:(session,ticket)=>wasm.nav_home_route_proposal_snapshot(session,ticket),cancel:(session,ticket)=>wasm.nav_home_route_proposal_cancel(session,ticket),release(){},
      capture(boundary){candidate=captureNativeHomeRouteProposal({kind:'native-home-route-proposal-ticket',authorityEpoch:boundary.authorityEpoch,session:boundary.nativeSession,ticket:boundary.ticket});if(!candidate)throw Error('Native Home route resources unavailable');preparedTicket=candidate.ticket.ticket;return candidate;}};
    return commitNativeWorldProposal(getPublication,()=>{if(!current())return -2;const p=prepareNativeHomeRouteProposal(source);return p.status==='proposed'?1:p.status==='busy'?-4:p.status==='conflict'?0:-2;},(mark,...boundary)=>{
      if(!current())return {status:-2};const status=wasm.nav_home_route_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();projectNativeHomeRouteExecution(state,worker,{nativeHomeRouteExecution});
      const binding=nativeHomeRouteBinding(actor),nativeRoute=Object.freeze({actorId:actor,routeHandle:binding.reference.expectedRouteHandle,assignmentSequence:binding.assignmentSequence}),resources=Object.freeze({version:1,kind:18,phase:'committed',worldBoundary:nativeWorldBoundary(),nativeRoute,nativeHomeRouteBinding:binding,presentation:captureNativeRoutePresentation(binding.reference.expectedRouteHandle)});mark({resources,nativeRoute,nativeHomeRouteBinding:binding});return {status:1,value:{resources,nativeRoute,nativeHomeRouteBinding:binding}};
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
  const startNativeTaskConsequenceAfterGpuQuiescence=({actorId,getPublication,prepareResources,signal=null}={})=>{
    if(typeof prepareResources!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Native consequence requires retained resource preparation');
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=owningState,worker=state?.workers.find(w=>numericId(w.id)===actor),task=state?.tasks.find(t=>t.id===worker?.taskId),target=state?.plants.find(p=>p.id===task?.targetId),center=state?.structures.find(c=>c.id===worker?.centerId),preview=prepareHarvestConsequence(state,worker,task,target),source=nativeTaskActionBinding(actor);
    if(!preview||!source||center?.kind!=='center'||center.status!=='intact')return Promise.resolve({status:'unsupported',authorizedAutonomy:false,authorizedConsequences:false});
    const destination=centerDeliveryPoint(center,target,state),centerOrigin={x:center.x,z:center.z,yaw:center.yaw,status:center.status},current=()=>owningState===state&&worker.status==='acting'&&worker.nativeRouteAdmission==='native-action'&&state.workers.includes(worker)&&state.tasks.includes(task)&&state.plants.includes(target)&&state.structures.includes(center)&&worker.centerId===center.id&&['x','z','yaw','status'].every(k=>center[k]===centerOrigin[k])&&harvestConsequenceCurrent(state,worker,task,target,preview);
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
  const registerAttackIntent=(state,animal,target,path)=>{
    if(!initialized||!state.raid||animal.targetId!==target.id||
      !animal.reservation||state.raid.reservations[animal.reservation]!==animal.id)
      throw Error('Animal attack must be confirmed before native registration');
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
  const prepareAttackTransients=(state,animal)=>{
    // Shield borders and introductory crop quotas alter interaction geometry
    // and eligibility. Keep those cases on the established selector until the
    // corresponding confirmed facts are projected into the native index.
    if(state.raid.introCropLimit!==undefined||
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
    const transient=prepareAttackTransients(state,animal);
    if(!transient)return null;
    const status=wasm.nav_intent_plan_attack_crop(numericId(animal.id),
      animal.x,animal.z,animal.radius,1,transient.blockerCount,
      transient.reservedTargetCount,timedRoute?1:0);
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
    const coordinates=routePoints(handle);
    if(!target||!coordinates||coordinates.length<2||coordinates.length%2){
      wasm.nav_intent_attack_cancel(numericId(animal.id));
      throw Error('Native crop intention has no confirmed JS target or route');
    }
    return {status:'found',target,reservation:targetReservationKey(target,animal),
      approach:{point:{id:`native-approach-${target.id}`,
        x:values[2],z:values[3]},path:Array.from(
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
      try{registerAttackIntent(state,animal,target,animal.path);travelling++;}
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
  const api={get authorityEpoch(){return epoch();},resetFromState,applyEvents,applyCommittedEvents,planTasks,
    nativeIntentControlBaseline,nativeWorldResourceBoundary,observeNativeIntentControl,flushNativeIntentControl,nativeCausalClock,commitNativeCausalClock,
    restoreAssignedTasks,restoreAttackIntents,restoreRetreatIntents,
    restoreHomeIntents,
    proposalRoute,pendingTaskRoute,nativeTaskStartBinding,startNativeTaskRouteAfterGpuQuiescence,
    getDamagedWalls:()=>getDamaged('wall'),
    getDamagedCenters:()=>getDamaged('center'),
    structureFor:id=>structuresById.get(numericId(id))??null,
    getUnprotectedCropGroups,
    findPlantingSite,releasePlantingSite,
    intentChanges,routePoints,nativeRouteTiming,nativeRouteTimeKnots,sampleNativeRoute,captureNativeRoutePresentation,nativeGateRouteSweep,nativeGateMechanism,nativeGateMechanismPose,nativeGateMechanismSegment,nativeGateMechanismWorldVertices,prepareNativeGateMotionAfterGpuFence,addNativeBarrierAfterGpuQuiescence,mutateNativeOverlayAfterGpuQuiescence,mutateNativeWorldAfterGpuQuiescence,prepareNativeRouteMotion,reserveNativeRoute,admitNativeGateRoute,nativeGateCrossings,nativeSuspendedGateRoute,suspendNativeGateRoute,resumeNativeGateRoute,resumeNativeGateRouteAfterGpuQuiescence,prepareNativeGateResumeProposal,captureNativeGateResumeProposal,cancelNativeGateResumeProposal,revalidateNativeGateResumeProposal,prepareNativeTaskStartProposal,captureNativeTaskStartProposal,revalidateNativeTaskStartProposal,cancelNativeTaskStartProposal,
    beginNativeRouteExecution,advanceNativeRouteExecution,stopNativeRouteExecution,nativeRouteExecution,nativeGameExecutionState,advanceNativeGameExecution,nativeTaskExecution,requestNativeTaskActionResources,nativeTaskActionRequest,
    startNativeTaskActionAfterGpuQuiescence,prepareNativeTaskActionProposal,captureNativeTaskActionProposal,revalidateNativeTaskActionProposal,cancelNativeTaskActionProposal,
    nativeTaskActionBinding,nativeTaskActionBindings,nativeTaskActionExecution,nativeTaskActionRestoreReferences,
    nativeWorkerHomeInactive,startNativeHomeArrivalAfterGpuQuiescence,prepareNativeHomeArrivalProposal,captureNativeHomeArrivalProposal,revalidateNativeHomeArrivalProposal,cancelNativeHomeArrivalProposal,
    startNativeHomeRouteAfterGpuQuiescence,nativeHomeRouteBinding,nativeHomeRouteBindings,nativeHomeRouteExecution,prepareNativeHomeRouteProposal,captureNativeHomeRouteProposal,revalidateNativeHomeRouteProposal,cancelNativeHomeRouteProposal,
    startNativeTaskSettlementAfterGpuQuiescence,nativeTaskSettlementBinding,nativeTaskSettlementBindings,nativeSettledWorkerExecution,prepareNativeTaskSettlementProposal,captureNativeTaskSettlementProposal,revalidateNativeTaskSettlementProposal,cancelNativeTaskSettlementProposal,
    nativeTaskConsequenceBinding,nativeDeliveryExecution,startNativeTaskConsequenceAfterGpuQuiescence,prepareNativeTaskConsequenceProposal,captureNativeTaskConsequenceProposal,revalidateNativeTaskConsequenceProposal,cancelNativeTaskConsequenceProposal,
    projectRouteProgress,processEventBoundary,requestReroute,
    registerAttackIntent,planAttackCrop,planAttackWall,replanAttackRoute,
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
    'restoreHomeIntents','findPlantingSite','releasePlantingSite',
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
export function createEventDrivenTaskPlanner(session,{retrySeconds=8,authorityEpoch,onNativeWorldResources=null}={}){
  if(!Number.isFinite(retrySeconds)||retrySeconds<=0)
    throw RangeError('retrySeconds must be positive');
  const bridge=createSpatialIntentBridge(session,{authorityEpoch,onNativeWorldResources});
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
  const resetFromState=state=>{
    normalizeNativeActionRestoration(state,session.core.wasm);
    initialized=false;
    sourceState=state;
    if(observedTaskState!==state){
      stopTaskObserver?.();stopTaskObserver=null;
      stopWorldObserver?.();stopWorldObserver=null;
      observedTaskState=null;
    }
    const result=bridge.resetFromState(state);
    const restored=bridge.restoreAssignedTasks(state);
    const restoredAnimals=bridge.restoreAttackIntents(state);
    const restoredRetreats=bridge.restoreRetreatIntents(state);
    const restoredHomes=bridge.restoreHomeIntents(state);
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
      ...restoredHomes};
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
    const assignments=[];
    for(const row of plan){
      if(row.status!==1)continue;
      const task=tasksByNumericId.get(row.taskId),worker=workersByNumericId.get(row.workerId);
      const target=task&&targetFor(task.targetId);
      if(!task||!worker||!target||'alive' in target&&!target.alive||
        'delivered' in target&&target.delivered||
        task.kind==='repair'&&target.hp>=target.maxHp)
        throw Error('Native proposal target changed before commit');
      const fact=lastPlanFacts.get(task.id);
      if(!fact||fact.workerId!==worker.id||fact.targetId!==task.targetId||
        fact.centerId!==task.centerId||fact.kind!==task.kind||
        fact.workerX!==worker.x||fact.workerZ!==worker.z||
        fact.targetX!==target.x||fact.targetZ!==target.z||
        workerRow(worker,state)[6]!==1)
        throw Error('Native proposal inputs changed before commit');
      const path=bridge.proposalRoute(row);
      const interaction=['repair','initial','water'].includes(task.kind);
      const destination=interaction?{
        id:`native-point-${task.id}`,x:row.approach.x,z:row.approach.z}:target;
      assignments.push({taskId:task.id,workerId:worker.id,path,destination});
    }
    if(!pendingResources&&assignments.some(a=>bridge.nativeTaskSettlementBinding(a.workerId)))throw Error('Native stationary ownership requires prepared task resources');
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
    const execution=bridge.nativeTaskExecution(worker.id);if(!execution)return null;
    const task=state.tasks.find(value=>value.id===worker.taskId);
    if(!task||numericId(task.id)!==execution.taskId||numericId(task.targetId)!==execution.targetId||task.workerId!==worker.id||execution.executedThrough!==state.elapsed)throw Error('Native task projection is not the executed game boundary');
    adoptNativeTaskExecution(worker,execution);return execution;
  };
  const projectNativeDeliveryExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native delivery projection belongs to another game');
    const execution=bridge.nativeDeliveryExecution(worker.id);if(!execution)return null;
    const crate=state.crates.find(c=>c.id===worker.crateId),center=state.structures.find(c=>c.id===worker.centerId),semantic=worker.nativeDelivery;
    if(worker.nativeRouteAdmission!=='native-delivery'||worker.status!=='carrying'||worker.taskId||!crate||crate.delivered||crate.carrierId!==worker.id||!center||center.status!=='intact'||semantic?.version!==1||semantic.crateId!==crate.id||semantic.centerId!==center.id||numericId(crate.id)!==execution.crateId||numericId(center.id)!==execution.centerId||execution.executedThrough!==state.elapsed)throw Error('Native delivery projection is not the executed game boundary');
    adoptNativeTaskExecution(worker,execution);crate.x=worker.x;crate.z=worker.z;return execution;
  };
  const projectNativeHomeExecution=(state,worker)=>{if(state!==sourceState&&state!==observedTaskState)throw Error('Native Home projection belongs to another game');const execution=projectNativeHomeRouteExecution(state,worker,bridge);if(execution)projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return execution;};
  const projectNativeSettledWorkerExecution=(state,worker)=>{
    if(state!==sourceState&&state!==observedTaskState)throw Error('Native idle projection belongs to another game');const execution=bridge.nativeSettledWorkerExecution(worker.id);if(!execution)return null;
    const home=execution.binding.reference.home,village=home&&state.villages.find(v=>numericId(v.id)===home.villageId),destination=village?.entry??village,returning=!!home&&numericId(worker.villageId)===home.villageId&&worker.status==='returning'&&!worker.taskId&&!worker.nativeRouteAdmission&&!worker.path?.length&&destination?.x===home.x&&destination?.z===home.z;
    const crate=state.crates.find(c=>numericId(c.id)===execution.crateId),pending=!home&&worker.status==='waiting-task'&&worker.nativeRouteAdmission==='pending-resources'&&!!worker.taskId&&worker.path===null;
    if(execution.executedThrough!==state.elapsed||worker.crateId||numericId(worker.centerId)!==execution.centerId||!crate?.delivered||crate.carrierId||!(returning||pending||!home&&worker.status==='idle'&&!worker.taskId&&!worker.nativeRouteAdmission&&!worker.path?.length))throw Error('Native idle projection is not the executed game boundary');
    Object.assign(worker,{x:execution.x,z:execution.z,heading:execution.yaw,runPhase:execution.runPhase,walkPhase:execution.walkPhase,carryPhase:execution.carryPhase,runRemaining:execution.runRemaining,running:false,gateWaiting:false});projectedPositions.set(numericId(worker.id),[worker.x,worker.z]);return execution;
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
    const workerEvents=new Map(),taskEvents=[];
    for(const event of pendingTaskEvents){
      if(event.type==='worker'){
        const id=event.remove?event.id:event.entity.id;
        workerEvents.set(id,event);
      }else taskEvents.push(event);
    }
    const events=[...taskEvents,...[...workerEvents]
      .sort(([a],[b])=>numericId(a)-numericId(b)).map(([,event])=>event)];
    const wasDirty=dirty;
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
          workerId:event.workerId}};
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
      if(!relevant.has(event.type))return;
      pendingWorldEvents.push(event);
      if(event.type!=='StructureHit')dirty=true;
    });
    stopWorldObserver=stop;
    return ()=>{
      if(stopWorldObserver!==stop)return;
      stop();stopWorldObserver=null;pendingWorldEvents=[];
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
    commitTaskBatchToState,
    registerAttackIntent:(...args)=>{
      const result=bridge.registerAttackIntent(...args);
      pendingNativeChanges=true;
      pendingAttackRoutes.delete(numericId(args[1].id));
      return result;
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
    mutateNativeWorldAfterGpuQuiescence:bridge.mutateNativeWorldAfterGpuQuiescence,
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
    nativeRouteTiming:bridge.nativeRouteTiming,nativeRouteTimeKnots:bridge.nativeRouteTimeKnots,sampleNativeRoute:bridge.sampleNativeRoute,captureNativeRoutePresentation:bridge.captureNativeRoutePresentation,
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
    nativeGameExecutionState:bridge.nativeGameExecutionState,advanceNativeGameExecution:bridge.advanceNativeGameExecution,nativeTaskExecution:bridge.nativeTaskExecution,projectNativeTaskExecution,requestNativeTaskActionResources:bridge.requestNativeTaskActionResources,nativeTaskActionRequest:bridge.nativeTaskActionRequest,
    async startNativeTaskActionAfterGpuQuiescence(options){
      const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskActionAfterGpuQuiescence(options);
      if(bridge.authorityEpoch===owner&&(result.status==='committed'||result.status==='committed-control-failed'))pendingNativeChanges=true;
      return result;
    },prepareNativeTaskActionProposal:bridge.prepareNativeTaskActionProposal,captureNativeTaskActionProposal:bridge.captureNativeTaskActionProposal,revalidateNativeTaskActionProposal:bridge.revalidateNativeTaskActionProposal,cancelNativeTaskActionProposal:bridge.cancelNativeTaskActionProposal,
    nativeTaskActionBinding:bridge.nativeTaskActionBinding,nativeTaskActionBindings:bridge.nativeTaskActionBindings,nativeTaskActionExecution:bridge.nativeTaskActionExecution,nativeTaskActionRestoreReferences:bridge.nativeTaskActionRestoreReferences,projectNativeTaskActionExecution,
    async startNativeTaskSettlementAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskSettlementAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeTaskSettlementBinding.reference.actorId);if(worker)projectNativeSettledWorkerExecution(state,worker);}return result;},
    projectNativeHomeExecution,nativeHomeRouteBinding:bridge.nativeHomeRouteBinding,nativeHomeRouteBindings:bridge.nativeHomeRouteBindings,nativeHomeRouteExecution:bridge.nativeHomeRouteExecution,prepareNativeHomeRouteProposal:bridge.prepareNativeHomeRouteProposal,captureNativeHomeRouteProposal:bridge.captureNativeHomeRouteProposal,revalidateNativeHomeRouteProposal:bridge.revalidateNativeHomeRouteProposal,cancelNativeHomeRouteProposal:bridge.cancelNativeHomeRouteProposal,
    nativeWorkerHomeInactive:bridge.nativeWorkerHomeInactive,prepareNativeHomeArrivalProposal:bridge.prepareNativeHomeArrivalProposal,captureNativeHomeArrivalProposal:bridge.captureNativeHomeArrivalProposal,revalidateNativeHomeArrivalProposal:bridge.revalidateNativeHomeArrivalProposal,cancelNativeHomeArrivalProposal:bridge.cancelNativeHomeArrivalProposal,
    async startNativeHomeArrivalAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeHomeArrivalAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources)pendingNativeChanges=true;return result;},
    async startNativeHomeRouteAfterGpuQuiescence(options){const owner=bridge.authorityEpoch,result=await bridge.startNativeHomeRouteAfterGpuQuiescence(options);if(bridge.authorityEpoch===owner&&result.resources)pendingNativeChanges=true;return result;},
    projectNativeSettledWorkerExecution,
    nativeTaskSettlementBinding:bridge.nativeTaskSettlementBinding,nativeTaskSettlementBindings:bridge.nativeTaskSettlementBindings,nativeSettledWorkerExecution:bridge.nativeSettledWorkerExecution,prepareNativeTaskSettlementProposal:bridge.prepareNativeTaskSettlementProposal,captureNativeTaskSettlementProposal:bridge.captureNativeTaskSettlementProposal,revalidateNativeTaskSettlementProposal:bridge.revalidateNativeTaskSettlementProposal,cancelNativeTaskSettlementProposal:bridge.cancelNativeTaskSettlementProposal,
    nativeTaskConsequenceBinding:bridge.nativeTaskConsequenceBinding,nativeDeliveryExecution:bridge.nativeDeliveryExecution,projectNativeDeliveryExecution,
    async startNativeTaskConsequenceAfterGpuQuiescence(options){
      const owner=bridge.authorityEpoch,result=await bridge.startNativeTaskConsequenceAfterGpuQuiescence(options);
      if(bridge.authorityEpoch===owner&&result.resources){pendingNativeChanges=true;const state=sourceState??observedTaskState,worker=state?.workers.find(w=>numericId(w.id)===result.nativeRoute.actorId);if(worker)projectNativeDeliveryExecution(state,worker);}
      return result;
    },prepareNativeTaskConsequenceProposal:bridge.prepareNativeTaskConsequenceProposal,captureNativeTaskConsequenceProposal:bridge.captureNativeTaskConsequenceProposal,revalidateNativeTaskConsequenceProposal:bridge.revalidateNativeTaskConsequenceProposal,cancelNativeTaskConsequenceProposal:bridge.cancelNativeTaskConsequenceProposal,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
