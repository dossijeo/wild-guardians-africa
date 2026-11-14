import {centerGeometry,centerServicePoint} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';
import {observeGameEvents,repairCost} from '../../simulation/game.js';
import {BALANCE} from '../../simulation/balance.js';
import {activeCrops} from '../../simulation/active-crops.js';
import {workerEntityLookup} from '../../simulation/worker-entity-lookup.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {targetReservationKey} from '../../simulation/raid-target-reservations.js';
import {actorBlockers} from '../../simulation/actor-motion.js';
import {wallCollisionFrame} from '../wall-collision-frame.js';
import {readNativeGateStaticWitness} from './spatial-gate-intents.js';
import {copyNativeWorldBoundary} from '../native-world-boundary.js';
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
const numericId=id=>{
  const match=/-(\d+)$/.exec(id??'');
  if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])<1)
    throw TypeError(`Unsupported native intent ID: ${id}`);
  return Number(match[1]);
};
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
    entity.delivered?0:1,0,0,0];
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
    const routed=restored?wasm.nav_intent_replan_pending_routes():0;
    return {restored,routed};
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
        type:types[data[at+13]],protocolVersion:2,authorityEpoch:epoch()};
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
    const data=new Float64Array(wasm.memory.buffer,wasm.nav_intent_control_snapshot_ptr(),count*6);
    const clock=nativeCausalClock();
    if(clock&&(clock.intentSequence!==wasm.nav_intent_transition_sequence()||clock.committedThrough!==wasm.nav_intent_effective_time()))
      throw Error('Commit the native causal clock before attaching a new draw consumer');
    return {type:'IntentBaseline',protocolVersion:2,authorityEpoch:epoch(),worldBoundary:nativeWorldBoundary(),...(clock?{clock}:{}),
      sequence:wasm.nav_intent_transition_sequence(),effectiveTime:wasm.nav_intent_effective_time(),
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
  const prepareNativeGateMotionAfterGpuFence=async({getPublication,enabled,staticObjects=false}={})=>{
    if(!initialized||!owningState)throw Error('Reset the native intent session first');
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
  const commitNativeWorldProposal=async(getPublication,stage,commit,prepareResources=null,signal=null)=>{
    if(!initialized||!owningState)throw Error('Reset the native intent session first');
    if(typeof getPublication!=='function')throw TypeError('Expected current native control publication');
    if(wasm.nav_intent_barrier_proposal_version?.()!==1)throw Error('Rebuild native world proposal service');
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra}),
      owner=epoch();syncBoundaryTime();flushNativeIntentControl();
    const clock=nativeCausalClock(),source=getPublication(),control=source?.status?.();
    if(!source||typeof source.quiesceGpuForMutation!=='function'||typeof source.releaseGpuAfterMutation!=='function'||
       control?.closed||control?.authorityEpoch!==owner)return outcome('control-unavailable');
    if(!coversGpuConsumers(source))return outcome('control-consumers-mismatch');
    if(!clock||control.sentSequence!==clock.intentSequence||control.sentTime!==clock.committedThrough||
       control.clockSequence!==clock.clockSequence||owningState.elapsed!==clock.committedThrough)return outcome('control-boundary-mismatch');
    const result=stage();
    if(result!==1)return outcome(result===0?'blocked':result===-4?'busy':result===-2?'unsupported':'invalid');
    if(wasm.nav_intent_barrier_proposal_ticket()!==1)throw Error('Native barrier proposal lost its ticket');
    const [nativeSession,ticket,sequence,time,clockSequence]=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    let receipt=null,preparedResources=null,answer=outcome('control-failed'),physicalCommitted=false,commitAttempted=false,commitFailed=false,committedValue={};
    const preparationController=new AbortController(),abortPreparation=()=>preparationController.abort();signal?.addEventListener('abort',abortPreparation,{once:true});
    try{
      if(signal?.aborted)throw new DOMException('Native resource preparation cancelled','AbortError');
      if(prepareResources){
        const proposedWorldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:owner,nativeSession,ticket,effectiveTime:time}),
          resources=session.core.captureNativeWorldProposalResources(proposedWorldBoundary);
        let stopWaiting;const interrupted=new Promise((resolve,reject)=>{stopWaiting=()=>reject(new DOMException('Native resource preparation cancelled','AbortError'));});interrupted.catch(()=>{});
        preparationController.signal.addEventListener('abort',stopWaiting,{once:true});
        const preparing=Promise.resolve().then(()=>prepareResources({proposedWorldBoundary,resources,signal:preparationController.signal})).then(handle=>{
          if(preparationController.signal.aborted){handle?.abort?.();throw new DOMException('Native resource preparation cancelled','AbortError');}return handle;
        });
        try{preparedResources=await Promise.race([preparing,interrupted]);}finally{preparationController.signal.removeEventListener('abort',stopWaiting);}
        if(!preparedResources||['valid','commit','abort'].some(key=>typeof preparedResources[key]!=='function')||preparedResources.valid()!==true)throw Error('Native resources were not prepared');
        if(epoch()!==owner||getPublication()!==source||source.status().closed||!coversGpuConsumers(source))return outcome('control-replaced');
        if(wasm.spatial_world_proposal_resource_snapshot(nativeSession,ticket)!==1)return outcome('stale');
      }
      receipt=await source.quiesceGpuForMutation();const current=source.status();
      if(epoch()!==owner||getPublication()!==source||current.closed||current.session!==control.session||current.authorityEpoch!==owner||!coversGpuConsumers(source))
        answer=outcome('control-replaced');
      else if(receipt.authorityEpoch!==owner||receipt.session!==control.session||receipt.sequence!==sequence||
         receipt.effectiveTime!==time||receipt.clockSequence!==clockSequence||!Number.isSafeInteger(receipt.holdId)||receipt.holdId<1)
        answer=outcome('invalid-receipt');
      else{
        if(preparationController.signal.aborted||preparedResources&&preparedResources.valid()!==true)throw Error('Native prepared resources became stale');
        commitAttempted=true;
        const committed=commit(value=>{physicalCommitted=true;committedValue=value??{};
          committedWorldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:owner,nativeSession,ticket,effectiveTime:time});
        },nativeSession,ticket,sequence,time,clockSequence);
        if(committed.status===1&&!physicalCommitted)throw Error('Native mutation returned without a commit marker');
        if(committed.status===1&&preparedResources&&preparedResources.commit({worldBoundary:nativeWorldBoundary(),resources:committed.value.resources})!==true)throw Error('Native prepared resources were not retained for publication');
        answer=committed.status===1?outcome('committed',{...committed.value,receipt,worldBoundary:nativeWorldBoundary()}):
          outcome(committed.status===-2?'stale':committed.status===-3?'invalid-receipt':committed.status===-6?'blocked':'stale');
      }
    }catch(error){commitFailed=commitAttempted;answer=outcome(physicalCommitted?'committed-control-failed':'control-failed',
      {...committedValue,error:String(error?.message??error)});}
    finally{
      signal?.removeEventListener('abort',abortPreparation);preparationController.abort();
      if(preparedResources)try{preparedResources.abort();}catch{}
      wasm.spatial_world_proposal_resource_release?.(nativeSession,ticket);
      wasm.nav_intent_barrier_proposal_cancel(nativeSession,ticket);
      if(commitFailed&&!source.status().closed)source.dispose('mutation-commit-failed');
      if(receipt&&!source.status().closed){
        try{
          // The commit may have revoked routes. Publish their exact sequence and
          // a same-time native watermark before releasing the GPU hold.
          flushNativeIntentControl();const latest=nativeCausalClock();
          if(!latest||wasm.nav_intent_clock_commit(latest.rate,latest.paused?1:0)<0)throw Error('Native clock cannot publish mutation boundary');
          flushNativeIntentControl();source.releaseGpuAfterMutation(receipt,{committed:physicalCommitted,
            ...(physicalCommitted?{worldBoundary:nativeWorldBoundary()}:{})});
        }catch(error){source.dispose('mutation-release-failed');answer=outcome(physicalCommitted?'committed-control-failed':'control-failed',
          {...committedValue,error:String(error?.message??error)});}
      }
    }
    return answer;
  };
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
    return Object.freeze({kind:'native-route-presentation',version:NATIVE_ROUTE_PRESENTATION_VERSION,rowWidth:NATIVE_ROUTE_PRESENTATION_WIDTH,
      nativeRoute:Object.freeze({actorId:plan.actorId,assignmentSequence:plan.assignmentSequence,routeHandle:routeHandle(handle.session,handle.slot,handle.generation)}),
      worldBoundary,startTime:plan.startTime,endTime:plan.endTime,motionMode:plan.motionMode??'animal',profile:plan.profile,radius:plan.radius,executionScope:plan.executionScope,nativeCrossingAdmitted:plan.nativeCrossingAdmitted===true,authorizedAutonomy:false,rows});
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
    proposalRoute,
    getDamagedWalls:()=>getDamaged('wall'),
    getDamagedCenters:()=>getDamaged('center'),
    structureFor:id=>structuresById.get(numericId(id))??null,
    getUnprotectedCropGroups,
    findPlantingSite,releasePlantingSite,
    intentChanges,routePoints,nativeRouteTiming,nativeRouteTimeKnots,sampleNativeRoute,captureNativeRoutePresentation,nativeGateRouteSweep,nativeGateMechanism,nativeGateMechanismPose,nativeGateMechanismSegment,nativeGateMechanismWorldVertices,prepareNativeGateMotionAfterGpuFence,addNativeBarrierAfterGpuQuiescence,mutateNativeOverlayAfterGpuQuiescence,mutateNativeWorldAfterGpuQuiescence,prepareNativeRouteMotion,reserveNativeRoute,admitNativeGateRoute,nativeGateCrossings,nativeSuspendedGateRoute,suspendNativeGateRoute,resumeNativeGateRoute,
    beginNativeRouteExecution,advanceNativeRouteExecution,stopNativeRouteExecution,nativeRouteExecution,
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
    'replanPendingRoutes','markActionActive','finishAction','commit']){
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
  const commitTaskBatchToState=(state,plan,{navVersion}={})=>{
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
    // Validate the JS side before committing WASM. A stale native revision
    // rejects the whole lease; no JS task or worker has changed yet.
    applyConfirmedTaskAssignments(state,assignments,navVersion,{validateOnly:true});
    const committed=bridge.commit();
    if(committed!==assignments.length){
      lastPlan=null;bridge.resetFromState(state);
      throw Error('Native task proposal became stale before commit');
    }
    const count=applyConfirmedTaskAssignments(state,assignments,navVersion);
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
      if(change.state===1){
        const coordinates=bridge.routePoints(change.routeHandle);
        if(!coordinates||coordinates.length<2||coordinates.length%2)
          throw Error('Native active intention has no valid route');
        const path=Array.from({length:coordinates.length/2},(_,index)=>
          ({x:coordinates[index*2],z:coordinates[index*2+1]}));
        const endpoint=path.at(-1),target=task&&targetFor(task.targetId);
        if(!target)throw Error('Native reroute lost its JS task target');
        const interaction=['repair','initial','water'].includes(task.kind);
        const destination=interaction?{
          id:`native-point-${task.id}`,x:endpoint.x,z:endpoint.z}:target;
        worker.path=path;worker.destinationId=destination.id;
        worker.pathVersion=navVersion;
        worker.taskApproach=interaction?{taskId:task.id,destination}:null;
        if(worker.status==='waiting-task'){
          worker.status='walking';notifyWorkerPlanningChange(state,worker);
        }
      }else if(change.state===0||change.state===3||change.state===4){
        const target=task&&targetFor(task.targetId);
        if(!task||!target||'alive' in target&&!target.alive||target.delivered){
          releaseTask(state,worker);worker.status='idle';worker.path=null;
          notifyWorkerPlanningChange(state,worker);
          if(task)replaceTasks(state,state.tasks.filter(item=>item.id!==task.id));
        }else{
          worker.path=null;worker.status='waiting-task';
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
    intentChanges:bridge.intentChanges,routePoints:bridge.routePoints,
    nativeRouteTiming:bridge.nativeRouteTiming,nativeRouteTimeKnots:bridge.nativeRouteTimeKnots,sampleNativeRoute:bridge.sampleNativeRoute,captureNativeRoutePresentation:bridge.captureNativeRoutePresentation,
    nativeGateRouteSweep:bridge.nativeGateRouteSweep,
    nativeGateMechanism:bridge.nativeGateMechanism,nativeGateMechanismPose:bridge.nativeGateMechanismPose,nativeGateMechanismSegment:bridge.nativeGateMechanismSegment,
    nativeGateMechanismWorldVertices:bridge.nativeGateMechanismWorldVertices,
    admitNativeGateRoute:bridge.admitNativeGateRoute,nativeGateCrossings:bridge.nativeGateCrossings,
    nativeSuspendedGateRoute:bridge.nativeSuspendedGateRoute,suspendNativeGateRoute:bridge.suspendNativeGateRoute,resumeNativeGateRoute:bridge.resumeNativeGateRoute,
    prepareNativeGateMotionAfterGpuFence:bridge.prepareNativeGateMotionAfterGpuFence,
    reserveNativeRoute:bridge.reserveNativeRoute,
    prepareNativeRouteMotion:bridge.prepareNativeRouteMotion,
    beginNativeRouteExecution:bridge.beginNativeRouteExecution,
    advanceNativeRouteExecution:bridge.advanceNativeRouteExecution,
    stopNativeRouteExecution:bridge.stopNativeRouteExecution,nativeRouteExecution:bridge.nativeRouteExecution,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
