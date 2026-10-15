import {centerGeometry,centerServicePoint} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';
import {observeGameEvents,repairCost} from '../../simulation/game.js';
import {BALANCE} from '../../simulation/balance.js';
import {activeCrops} from '../../simulation/active-crops.js';
import {workerEntityLookup} from '../../simulation/worker-entity-lookup.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {targetReservationKey} from '../../simulation/raid-target-reservations.js';
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
    const scale=entity.gate?(entity.material==='reforzado'?1.6:
      ['adobe','piedra'].includes(entity.material)?1.4:1):1;
    return [1,2,numericId(entity.id),3,entity.x,entity.z,1,0,entity.yaw??0,scale];
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

export function createSpatialIntentBridge(session){
  const wasm=session?.core?.wasm;
  for(const name of ['nav_intent_reset','nav_intent_changes_ptr',
    'nav_intent_apply_changes','nav_intent_plan_tasks','nav_intent_results_ptr',
    'nav_intent_restore_assigned_tasks',
    'nav_intent_discard','nav_intent_commit','nav_intent_damaged_structures',
    'nav_intent_damaged_ptr','nav_intent_crop_groups',
    'nav_intent_crop_groups_ptr','nav_intent_crop_members_ptr',
    'nav_intent_find_planting_site','nav_intent_planting_site_ptr',
    'nav_intent_release_planting_site','nav_intent_change_count',
    'nav_intent_change_ptr','nav_intent_clear_changes',
    'nav_intent_route_points','nav_intent_route_ptr',
    'nav_intent_reconcile_topology','nav_intent_replan_attack_route',
    'nav_intent_replan_pending_routes',
    'nav_intent_request_reroute',
    'nav_intent_attack_route_input_ptr','nav_intent_register_attack',
    'nav_intent_track_wall_opportunities',
    'nav_intent_wall_opportunity_candidates',
    'nav_intent_wall_opportunity_candidates_ptr',
    'nav_intent_reconsider_wall_opportunity',
    'nav_intent_plan_attack_crop','nav_intent_attack_result_ptr',
    'nav_intent_attack_action_active','nav_intent_restore_attack_action',
    'nav_intent_restore_attack_pending',
    'nav_intent_attack_finished',
    'nav_intent_attack_cancel',
    'nav_intent_action_active','nav_intent_finish',
    'nav_intent_actor_planning_calls','nav_intent_routes_ptr',
    'nav_intent_route_point_count'])
    if(typeof wasm?.[name]!=='function')throw TypeError(`Missing ${name}`);
  let sequence=0,initialized=false;
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
    wasm.nav_intent_reset();sequence=0;initialized=true;
    try{
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
      const count=wasm.nav_intent_crop_groups();
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
          group={id:`crop:${cropsById.get(id)??id}`,cropIds:ids.map(item=>cropsById.get(item)??item),
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
    if(center?.kind!=='center'||center.status==='ruined')
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
  const intentChanges=()=>{
    const count=wasm.nav_intent_change_count();
    if(!count)return [];
    const data=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_change_ptr(),count*8));
    wasm.nav_intent_clear_changes();
    return Array.from({length:count},(_,index)=>{
      const at=index*8;
      return {actorId:data[at],state:data[at+1],taskId:data[at+2]||null,
        targetId:data[at+3]||null,routeHandle:data[at+6]?
          {session:data[at+4],slot:data[at+5],generation:data[at+6]}:null,
        topologyRevision:data[at+7]};
    });
  };
  const routePoints=handle=>{
    const count=wasm.nav_intent_route_points(handle.session,handle.slot,handle.generation);
    if(count<0)return null;
    // Movement may retain these points while WASM grows its memory. Copy once
    // when an action changes; ordinary ticks keep using the same JS view.
    return Float32Array.from(new Float32Array(wasm.memory.buffer,
      wasm.nav_intent_route_ptr(handle.session,handle.slot,handle.generation),count*2));
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
    const status=wasm.nav_intent_register_attack(numericId(animal.id),
      numericId(target.id),animal.x,animal.z,path.length);
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
  const planAttackCrop=(state,animal)=>{
    if(!initialized||!state.raid)throw Error('No native raid intention session');
    // Shield borders and introductory crop quotas alter interaction geometry
    // and eligibility. Keep those cases on the established selector until the
    // corresponding confirmed facts are projected into the native index.
    if(state.raid.introCropLimit!==undefined||
      state.spells.some(spell=>spell.kind==='shield'&&spell.remaining>0))
      return null;
    session.actorSectorRevision({worker:false,species:animal.species});
    const status=wasm.nav_intent_plan_attack_crop(numericId(animal.id),
      animal.x,animal.z,animal.radius,1);
    if(status<0)throw Error(`Native crop intention rejected: ${status}`);
    const values=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_attack_result_ptr(),10);
    if(status!==1)return {status:status===3?'unknown':status===2?'blocked':'none',
      regionQueries:values[8],routeQueries:values[9]};
    const targetId=values[1],target=cropObjects.get(targetId);
    const routeHandle={session:values[4],slot:values[5],generation:values[6]};
    const coordinates=routePoints(routeHandle);
    if(!target||!coordinates||coordinates.length<2||coordinates.length%2){
      wasm.nav_intent_attack_cancel(numericId(animal.id));
      throw Error('Native crop intention has no confirmed JS target or route');
    }
    return {status:'found',target,reservation:targetReservationKey(target,animal),
      approach:{point:{id:`native-approach-${target.id}`,
        x:values[2],z:values[3]},path:Array.from(
        {length:coordinates.length/2},(_,index)=>({
          x:coordinates[index*2],z:coordinates[index*2+1]}))},
      native:true,routeHandle,groupId:values[7],
      regionQueries:values[8],routeQueries:values[9]};
  };
  const replanAttackRoute=animal=>{
    if(!animal.approach)throw Error('Animal has no confirmed attack approach');
    session.actorSectorRevision({worker:false,species:animal.species});
    const status=wasm.nav_intent_replan_attack_route(numericId(animal.id),
      animal.x,animal.z,animal.approach.x,animal.approach.z);
    if(status===3)return {status:'unknown'};
    if(status!==1)throw Error(`Native attack reroute rejected: ${status}`);
    if(wasm.nav_intent_actor(numericId(animal.id))!==1)
      throw Error('Native attack reroute lost its active intention');
    const values=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const routeHandle={session:values[4],slot:values[5],generation:values[6]};
    const points=routePoints(routeHandle);
    if(!points||points.length<2||points.length%2)
      throw Error('Native attack reroute has no usable points');
    return {status:'found',routeHandle,path:Array.from(
      {length:points.length/2},(_,index)=>({
        x:points[index*2],z:points[index*2+1]}))};
  };
  const restoreAttackIntents=state=>{
    let committed=0,travelling=0,staleRoutes=0;
    const pendingAttackRouteIds=[];
    for(const animal of [...(state.raid?.animals??[])]
      .sort((left,right)=>numericId(left.id)-numericId(right.id))){
      if(!animal.targetId||['gone','retreating','waiting'].includes(animal.status))
        continue;
      session.actorSectorRevision({worker:false,species:animal.species});
      const target=[...state.plants,...state.structures]
        .find(item=>item.id===animal.targetId);
      if(animal.status==='attacking'){
        if(wasm.nav_intent_restore_attack_action(numericId(animal.id),
          numericId(animal.targetId),Number(!!animal.reservation&&
            state.raid.reservations[animal.reservation]===animal.id))!==1)
          throw Error(`Cannot restore committed animal attack ${animal.id}`);
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
        const replacement=replanAttackRoute(animal);
        if(replacement.status==='unknown')pendingAttackRouteIds.push(animal.id);
        continue;
      }
      try{registerAttackIntent(state,animal,target,animal.path);travelling++;}
      catch(error){
        if(!/Native attack intention rejected: -5/.test(String(error)))throw error;
        animal.path=null;staleRoutes++;
        if(wasm.nav_intent_restore_attack_pending(numericId(animal.id),
          numericId(animal.targetId),1)!==1)
          throw Error(`Cannot restore stale animal route ${animal.id}`);
        const replacement=replanAttackRoute(animal);
        if(replacement.status==='unknown')pendingAttackRouteIds.push(animal.id);
      }
    }
    return {restoredAnimalAttacks:committed,restoredAnimalRoutes:travelling,
      invalidSavedAnimalRoutes:staleRoutes,pendingAttackRouteIds};
  };
  return {resetFromState,applyEvents,applyCommittedEvents,planTasks,
    restoreAssignedTasks,restoreAttackIntents,proposalRoute,
    getDamagedWalls:()=>getDamaged('wall'),
    getDamagedCenters:()=>getDamaged('center'),
    getUnprotectedCropGroups,
    findPlantingSite,releasePlantingSite,
    intentChanges,routePoints,processEventBoundary,requestReroute,
    registerAttackIntent,planAttackCrop,replanAttackRoute,
    reconsiderWallOpportunity,wallOpportunityCandidates,
    markAttackActive:actorId=>wasm.nav_intent_attack_action_active(numericId(actorId))===1,
    finishAttackIntent:actorId=>wasm.nav_intent_attack_finished(numericId(actorId)),
    cancelAttackIntent:actorId=>wasm.nav_intent_attack_cancel(numericId(actorId))===1,
    reconcileTopology:()=>wasm.nav_intent_reconcile_topology(),
    replanPendingRoutes:()=>wasm.nav_intent_replan_pending_routes(),
    markActionActive:actorId=>wasm.nav_intent_action_active(numericId(actorId))===1,
    finishAction:actorId=>wasm.nav_intent_finish(numericId(actorId))===1,
    discard:()=>wasm.nav_intent_discard(),
    commit:()=>wasm.nav_intent_commit(),
    sequence:()=>sequence};
}

// Experimental action-level gate for the global worker task queue. Callers
// deliver committed deltas at action boundaries; ordinary movement never
// invokes the native planner. A pending physical result gets one bounded
// recovery retry in case a dynamic obstruction produced no reliable event.
export function createEventDrivenTaskPlanner(session,{retrySeconds=8}={}){
  if(!Number.isFinite(retrySeconds)||retrySeconds<=0)
    throw RangeError('retrySeconds must be positive');
  const bridge=createSpatialIntentBridge(session);
  const eligible=new Set(),requests=new Map(),animalRequests=new Map(),
    projectedPositions=new Map(),pendingAttackRoutes=new Map(),
    tacticalReconsiderations=new Set();
  let pendingTaskEvents=[];
  let pendingWorldEvents=[];
  let observedTaskState=null,stopTaskObserver=null,stopWorldObserver=null;
  let dirty=true,nextRetry=Infinity,lastTime=-Infinity,total=0,
    animalTotal=0,taskRouteQueries=0,taskCandidates=0,initialized=false;
  let lastNavigationVersion=null,pendingNativeChanges=true;
  let lastPlan=null,lastPlanFacts=null,sourceState=null;
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
    eligible.clear();projectedPositions.clear();pendingAttackRoutes.clear();
    tacticalReconsiderations.clear();
    requests.clear();
    animalRequests.clear();
    for(const id of restoredAnimals.pendingAttackRouteIds)
      pendingAttackRoutes.set(numericId(id),'unknown');
    pendingTaskEvents=[];pendingWorldEvents=[];
    total=0;animalTotal=0;taskRouteQueries=0;taskCandidates=0;
    lastPlan=null;lastPlanFacts=null;
    for(const worker of state.workers)setWorker(worker,state);
    dirty=true;nextRetry=Infinity;lastTime=-Infinity;
    lastNavigationVersion=null;
    pendingNativeChanges=true;
    initialized=true;
    return {...result,...restored,...restoredAnimals};
  };
  const applyEvents=(state,events)=>{
    lastPlan=null;lastPlanFacts=null;
    let result;
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
      if(event.remove){eligible.delete(numericId(event.id));projectedPositions.delete(numericId(event.id));}
      else setWorker(event.entity,state);
    }
    if(events.some(event=>event.type!=='structureDamage'))dirty=true;
    pendingNativeChanges=true;
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
      if(!task||!worker||!target||'alive' in target&&!target.alive)
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
    nativeTaskRouteQueries:taskRouteQueries,nativeTaskCandidates:taskCandidates,
    perWorkerPerMinute:Object.fromEntries([...requests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length])),
    nativeAnimalPlans:animalTotal,
    perAnimalPerMinute:Object.fromEntries([...animalRequests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length]))});
  const recordAnimalPlan=(animal,elapsed)=>{
    animalTotal++;
    const id=numericId(animal.id),times=animalRequests.get(id)??[];
    times.push(elapsed);
    while(times.length&&times[0]<=elapsed-60)times.shift();
    animalRequests.set(id,times);
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
  const flushWorldEvents=()=>{
    if(!pendingWorldEvents.length)return 0;
    const events=pendingWorldEvents;pendingWorldEvents=[];
    const topologyChanged=events.some(event=>
      ['WallRemoved','WallChainBuilt','StructureRuined','PlacementCommitted',
        'RepairApplied'].includes(event.type));
    if(topologyChanged)syncChangedPositions(true);
    bridge.applyCommittedEvents(observedTaskState,events);
    pendingNativeChanges=true;
    if(events.some(event=>event.type==='StructureRuined'||
      event.type==='WallRemoved')&&observedTaskState.raid){
      const structures=new Map(observedTaskState.structures.map(item=>
        [item.id,item]));
      for(const actorId of bridge.wallOpportunityCandidates()){
        const animal=observedTaskState.raid.animals.find(item=>
          numericId(item.id)===actorId);
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
      const invalidated=session.core.wasm.nav_intent_reconcile_topology();
      if(invalidated)session.core.wasm.nav_intent_replan_pending_routes();
    }
    if(events.some(event=>event.type==='CrateDropped'))
      session.core.wasm.nav_intent_replan_pending_routes();
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
    const invalidated=session.core.wasm.nav_intent_reconcile_topology();
    if(invalidated)session.core.wasm.nav_intent_replan_pending_routes();
    pendingNativeChanges=true;
    // Existing JS paths are the movement copy of native-pinned routes. A
    // changed graph revision has now been validated, including the routes
    // whose replacement or waiting state will be delivered below.
    for(const worker of state.workers)if(worker.taskId&&worker.path&&
      worker.status==='walking')worker.pathVersion=version;
    for(const animal of state.raid?.animals??[])if(animal.targetId&&
      animal.path&&animal.status!=='attacking')animal.pathVersion=version;
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
    const tasks=new Map(state.tasks.map(task=>[numericId(task.id),task]));
    const targetFor=taskTargetLookup(state);
    for(const change of latest.values()){
      const animal=animals.get(change.actorId);
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
          }else pendingAttackRoutes.set(change.actorId,replacement.status);
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
      const worker=workers.get(change.actorId);
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
      const result=bridge.planAttackCrop(state,animal);
      if(result!==null){
        recordAnimalPlan(animal,state.elapsed);
        if(result.status==='found')pendingNativeChanges=true;
      }
      return result;
    },
    attackRoutePending:actorId=>pendingAttackRoutes.has(numericId(actorId)),
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
    intentChanges:bridge.intentChanges,routePoints:bridge.routePoints,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
