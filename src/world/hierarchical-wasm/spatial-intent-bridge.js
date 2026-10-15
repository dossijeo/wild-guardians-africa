import {centerGeometry,centerServicePoint} from '../centers.js';
import {contractExpired,PROFILES} from '../../simulation/workforce.js';
import {repairCost} from '../../simulation/game.js';
import {numberOf} from '../../simulation/money.js';
import {BALANCE} from '../../simulation/balance.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';

// Experimental event-fed bridge. Gameplay does not call it yet: it is used to
// prove the native read model can be rebuilt after load and changed by deltas.
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
  numericId(worker.centerId),worker.x,worker.z,
  worker.status==='idle'&&!worker.taskId&&!worker.incapacitated&&
    !contractExpired(worker,state)&&state.time<(profileEnd.get(worker.profile)??0)?1:0,
  0,0,lexicalRank(worker.id)];
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

export function createSpatialIntentBridge(session){
  const wasm=session?.core?.wasm;
  for(const name of ['nav_intent_reset','nav_intent_changes_ptr',
    'nav_intent_apply_changes','nav_intent_plan_tasks','nav_intent_results_ptr',
    'nav_intent_discard','nav_intent_commit','nav_intent_damaged_structures',
    'nav_intent_damaged_ptr','nav_intent_crop_groups',
    'nav_intent_crop_groups_ptr','nav_intent_crop_members_ptr',
    'nav_intent_find_planting_site','nav_intent_planting_site_ptr',
    'nav_intent_release_planting_site'])
    if(typeof wasm?.[name]!=='function')throw TypeError(`Missing ${name}`);
  let sequence=0,initialized=false,observedBalance=0;
  const structuresById=new Map();
  const cropsById=new Map();
  const planningWorkers=new Map(),planningTasks=new Map();
  const protectionObservers=new Set();
  let observedProtection=new Map(),observedCropProtection=new Map(),
    lastProtectionGroups=new Map(),
    pendingProtection=false,protectionRevision=0,topologyEpoch=0,
    publishingProtection=false;
  const protectionMetrics={queries:0,notifications:0,queryMs:0};
  const publish=event=>{for(const observer of protectionObservers)observer(event);};
  const stopTopology=session.observeTopologyChanges?.(change=>{
    pendingProtection=true;protectionRevision++;topologyEpoch++;
    // The consumer receives the resulting crop-group state, never a raw
    // topology revision that would make it inspect the farm itself.
    publishCropProtectionChanges();
  });
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
      planningWorkers.clear();planningTasks.clear();
      for(const worker of workers)planningWorkers.set(numericId(worker.id),workerRow(worker,state).join(','));
      for(const task of tasks)planningTasks.set(numericId(task.id),taskRow(task).join(','));
      for(const structure of state.structures)
        structuresById.set(numericId(structure.id),{...structure});
      for(const crop of state.plants)if(crop.alive)
        cropsById.set(numericId(crop.id),crop.id);
      observedBalance=numberOf(state.ledger.balance);
      observedProtection=new Map();observedCropProtection=new Map();
      lastProtectionGroups=new Map();
      pendingProtection=true;protectionRevision++;topologyEpoch++;
      publish({type:'crop-protection-reset',reason:'state-restored'});
      publishCropProtectionChanges();
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
        if(event.type==='worker'||event.type==='task'){
          const mirror=event.type==='worker'?planningWorkers:planningTasks;
          const id=numericId(event.remove?event.id:event.entity.id);
          if(event.remove)mirror.delete(id);
          else mirror.set(id,(event.type==='worker'?workerRow(event.entity,state):taskRow(event.entity)).join(','));
        }
        if(event.type==='structureDamage'||event.type==='target'){
          const id=numericId(event.remove?event.id:event.entity.id);
          if(event.remove)structuresById.delete(id);
          else if(event.entity.kind==='wall'||event.entity.kind==='center')
            structuresById.set(id,{...event.entity});
        }
        if(event.type==='target'){
          const id=numericId(event.remove?event.id:event.entity.id);
          if(event.remove||'alive' in event.entity&&!event.entity.alive)
            cropsById.delete(id);
          else if('alive' in event.entity)cropsById.set(id,event.entity.id);
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
  // The task queue and worker eligibility are JS-owned. Reconcile them only
  // at an action boundary; walking along an assigned route is not a planning
  // event and must not cause a full worker/task replay each simulation tick.
  const syncActionBoundary=state=>{
    if(!initialized)throw Error('Reset the native intent session first');
    const changes=[],seenWorkers=new Set(),seenTasks=new Set();
    for(const worker of state.workers){
      const id=numericId(worker.id),signature=workerRow(worker,state).join(',');
      seenWorkers.add(id);
      if(planningWorkers.get(id)!==signature)changes.push({type:'worker',entity:worker});
    }
    for(const id of planningWorkers.keys())if(!seenWorkers.has(id))
      changes.push({type:'worker',remove:true,id:`worker-${id}`});
    for(const task of state.tasks){
      const id=numericId(task.id),signature=taskRow(task).join(',');
      seenTasks.add(id);
      if(planningTasks.get(id)!==signature)changes.push({type:'task',entity:task});
    }
    for(const id of planningTasks.keys())if(!seenTasks.has(id))
      changes.push({type:'task',remove:true,id:`task-${id}`});
    if(changes.length)applyEvents(state,changes);
    return changes.length;
  };
  // Translate only confirmed simulation events. A restored game uses
  // resetFromState(); this incremental projection never owns game rules.
  const applyCommittedEvents=(state,events)=>{
    const changes=[];
    let cropChanged=false,topologyChanged=false;
    let structures=null,plants=null;
    const structureFor=id=>state.structures.at(-1)?.id===id?state.structures.at(-1):
      (structures??=new Map(state.structures.map(item=>[item.id,item]))).get(id);
    const plantFor=id=>state.plants.at(-1)?.id===id?state.plants.at(-1):
      (plants??=new Map(state.plants.filter(item=>item.alive)
        .map(item=>[item.id,item]))).get(id);
    for(const event of events){
      // Removing a plant cannot create a new physical opening. A placement
      // can join regions or create a newly exposed agricultural group.
      if(event.type==='CropPlaced')cropChanged=true;
      if(['PlacementCommitted','WallChainBuilt','WallRemoved','StructureRuined'].includes(event.type))
        topologyChanged=true;
      if(event.type==='CropPlaced'){
        const entity=plantFor(event.targetId);
        if(entity)changes.push({type:'target',entity});
      }else if(event.type==='CropDestroyed')
        changes.push({type:'target',remove:true,id:event.targetId});
      else if(event.type==='CropPicked'){
        changes.push({type:'target',remove:true,id:event.targetId});
        const crate=state.crates.find(item=>item.sourcePlantId===event.targetId&&
          !item.delivered);
        if(crate)changes.push({type:'target',entity:crate});
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
    if(topologyChanged&&!stopTopology){
      pendingProtection=true;protectionRevision++;topologyEpoch++;
    }else if(cropChanged){pendingProtection=true;protectionRevision++;}
    publishCropProtectionChanges();
    if(events.some(event=>event.type==='Dawn'))publish({type:'day-start',day:state.day});
    const deliveries=events.filter(event=>event.type==='CrateDelivered');
    const income=deliveries.reduce((total,event)=>{
        const settled=state.ledger.entries[`deliver:${event.targetId}`];
        if(!settled)throw Error(`Missing settled delivery ${event.targetId}`);
        return total+numberOf(settled);
      },0);
    const balance=numberOf(state.ledger.balance),delta=balance-observedBalance;
    observedBalance=balance;
    if(delta||income){
      publish({type:'funds-changed',balance:state.ledger.balance,delta,income});
    }
    if(events.some(event=>['StructureHit','StructureRuined','RepairApplied'].includes(event.type)))
      publish({type:'structure-damaged'});
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
  // A consumer subscribes to changes in the native crop-group classification.
  // Confirmed game deltas mark it dirty; one native query per committed batch
  // publishes transitions. Ordinary movement and elapsed time do no work.
  const observeCropProtection=observer=>{
    if(typeof observer!=='function')throw TypeError('Expected crop protection observer');
    protectionObservers.add(observer);
    try{
      if(pendingProtection)publishCropProtectionChanges();
      else{
        const groups=[...lastProtectionGroups.values()];
        observer({type:'crop-groups-updated',groups});
        for(const group of groups)if(group.protection==='unprotected')
          observer({type:'crop-group-unprotected',group});
      }
    }catch(error){protectionObservers.delete(observer);throw error;}
    return ()=>protectionObservers.delete(observer);
  };
  const publishCropProtectionChanges=()=>{
    if(!pendingProtection||!protectionObservers.size||publishingProtection)return 0;
    publishingProtection=true;
    try{
    const revision=protectionRevision;
    const started=performance.now();
    const current=new Map(getUnprotectedCropGroups({includeProtected:true})
      .map(group=>[group.id,group]));
    protectionMetrics.queries++;
    let emitted=0;
    publish({type:'crop-groups-updated',groups:[...current.values()]});
    for(const [id,group] of current){
      // Native group IDs are represented by a member crop. Harvesting that
      // member can change the ID without changing the exposed field.
      const former=new Set(group.cropIds.map(cropId=>
        observedCropProtection.get(cropId)).filter(Boolean));
      const previous=former.size?former:observedProtection.has(id)?
        new Set([observedProtection.get(id)]):new Set();
      if(group.protection==='unprotected'&&
        (!previous.size||[...previous].some(status=>status!=='unprotected'))){
        publish({type:'crop-group-unprotected',group});emitted++;
      }else if(previous.has('unprotected')&&group.protection==='protected'){
        publish({type:'crop-group-protected',group});emitted++;
      }
    }
    observedProtection=new Map([...current].map(([id,group])=>[id,group.protection]));
    observedCropProtection=new Map([...current.values()].flatMap(group=>
      group.cropIds.map(cropId=>[cropId,group.protection])));
    lastProtectionGroups=current;
    pendingProtection=protectionRevision!==revision;
    protectionMetrics.notifications+=emitted;
    protectionMetrics.queryMs+=performance.now()-started;
    return emitted;
    }finally{publishingProtection=false;}
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
  return {resetFromState,applyEvents,applyCommittedEvents,syncActionBoundary,planTasks,
    observeCropProtection,
    topologyEpoch:()=>topologyEpoch,
    cropProtectionMetrics:()=>({...protectionMetrics}),
    dispose:()=>{stopTopology?.();protectionObservers.clear();},
    getDamagedWalls:()=>getDamaged('wall'),
    getDamagedCenters:()=>getDamaged('center'),
    getUnprotectedCropGroups,
    findPlantingSite,releasePlantingSite,
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
  const eligible=new Set(),requests=new Map();
  let dirty=true,nextRetry=Infinity,lastTime=-Infinity,total=0,initialized=false;
  const setWorker=(worker,state)=>{
    const id=numericId(worker.id);
    if(workerRow(worker,state)[6])eligible.add(id);
    else eligible.delete(id);
  };
  const resetFromState=state=>{
    initialized=false;
    const result=bridge.resetFromState(state);
    eligible.clear();requests.clear();total=0;
    for(const worker of state.workers)setWorker(worker,state);
    dirty=true;nextRetry=Infinity;lastTime=-Infinity;
    initialized=true;
    return result;
  };
  const applyEvents=(state,events)=>{
    let result;
    try{result=bridge.applyEvents(state,events);}
    catch(error){
      // The bridge has rebuilt WASM from authoritative JS state. Rebuild this
      // gate's eligibility view as well, so recovery cannot miss a wakeup.
      eligible.clear();
      for(const worker of state.workers)setWorker(worker,state);
      dirty=true;nextRetry=Infinity;
      throw error;
    }
    for(const event of events)if(event.type==='worker'){
      if(event.remove)eligible.delete(numericId(event.id));
      else setWorker(event.entity,state);
    }
    if(events.some(event=>event.type!=='structureDamage'))dirty=true;
    return result;
  };
  const syncActionBoundary=state=>{
    const changed=bridge.syncActionBoundary(state);
    if(changed){
      eligible.clear();
      for(const worker of state.workers)setWorker(worker,state);
      dirty=true;
    }
    return changed;
  };
  const planIfNeeded=simulatedSeconds=>{
    if(!initialized)throw Error('Reset the native intent session first');
    if(!Number.isFinite(simulatedSeconds)||simulatedSeconds<lastTime)
      throw RangeError('Simulation time must be finite and monotonic');
    lastTime=simulatedSeconds;
    if(!dirty&&simulatedSeconds<nextRetry)return null;
    if(!session.core.wasm.nav_intent_task_count()){
      dirty=false;nextRetry=Infinity;return [];
    }
    const result=bridge.planTasks();
    dirty=false;
    nextRetry=result.some(row=>row.status===2||row.status===3)?
      simulatedSeconds+retrySeconds:Infinity;
    total++;
    for(const id of eligible){
      let times=requests.get(id);
      if(!times)requests.set(id,times=[]);
      times.push(simulatedSeconds);
      while(times.length&&times[0]<=simulatedSeconds-60)times.shift();
    }
    return result;
  };
  const metrics=simulatedSeconds=>({nativePlanningCalls:total,
    perWorkerPerMinute:Object.fromEntries([...requests].map(([id,times])=>
      [id,times.filter(time=>time>simulatedSeconds-60).length]))});
  return {resetFromState,applyEvents,syncActionBoundary,planIfNeeded,metrics,
    discard:bridge.discard,commit:bridge.commit,sequence:bridge.sequence};
}
