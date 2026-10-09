import {animalExitConnector} from './animal-exit-connectors.js';
import {workerReturnRoute} from './worker-return-route.js';
import {workerRiskClearance} from './worker-route-clearance.js';
import {resolveFluidPlacement} from '../world/fluid-placement.js';
import {ensurePurchaseBudget,HIRING_RESERVE} from './budget.js';
import {ensureBoundaryGates} from '../world/boundary-gates.js';
import {gatePortalPoints} from '../world/gate-passages.js';
import {footprintDistance} from '../world/footprints.js';
import {centerCulture,centerFootprint,centerServicePoint,centerDeliveryPoint} from '../world/centers.js';
import {prepareActorMotion} from './actor-motion.js';
import {animalRouteClearance} from './animal-route-clearance.js';
import {animalSlopeRecoveryPath} from './animal-slope-recovery.js';
import {withNavigationQueries} from '../world/navigation-query-scope.js';
import {BALANCE as B} from './balance.js';
import {wallVisualAt,recordWallPresentation} from './structure-presentation.js';
import {rational,rationalNumber,add,multiply,negate,transact,compare,numberOf} from './money.js';
import {PROFILES,allocateWorkers,hiringCost,distributeProfiles,contractExpired} from './workforce.js';
import {spellUnlocked,permission,operational,cropSpec,wallSpec,structureHealth,dawnMinimum,nextRandom,randomInt,villageCost,hitStructure} from './rules.js';
import {createPlant,advancePlant,waterPlant,isMature,contiguousGroup} from './crops.js';
import {activeCrops,cropBecameInactive} from './active-crops.js';
import {workerEntityLookup} from './worker-entity-lookup.js';
import {enqueue,taskEnqueuer,reserveTasks,releaseTask} from './tasks.js';
import {planNight,updateRaid,spawnRaid,planDay} from './raids.js';
import {wallStroke,wallLayout,wallStrokeLine} from '../world/wall-layout.js';
import {selectEvent,applyEvent} from './events.js';
import {villageLayout,findVillageEntry,nearestVillageRoute} from '../world/villages.js';
import {LOCOMOTION as L} from './locomotion-calibration.js';
import {dailyRunMetres,urgentWork,moveWorker,movePath,movePathWithGates} from './locomotion.js';
import {workerSlopeRecoveryPath} from '../world/worker-slope-recovery.js';
import {createUrgencyPass} from './work-urgency.js';
import {repairRoute,wateringRoute,canWaterFrom} from '../world/work-points.js';
import {updateIdle,cancelIdle} from './idle.js';
import {advanceGateLeaves,waitForGate} from './gates.js';

export const BIOMES=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'];
export const CULTURES=['mapungubwe','saheliana','suajili','musgum','etiope'];
export function newGame({biome='sabana',culture='mapungubwe',seed=Date.now(),slotId=crypto.randomUUID()}={}) {
  if(!BIOMES.includes(biome)||!CULTURES.includes(culture))throw new Error('Combinación desconocida');
  return {saveVersion:1,terrainVersion:'4.1.10.3',slotId,seed:String(seed),rng:(Number(seed)>>>0)||918271,biome,culture,day:1,time:0,elapsed:0,completedNights:0,postgame:false,result:null,
    initialPreparation:true,ledger:{balance:rational(B.initial_money),entries:{}},nextId:2,sequence:1,structures:[],plants:[],workers:[],people:[],crates:[],spells:[],tasks:[],villages:[{id:'village-1',culture,x:0,z:0,buildings:[]}],suppressed:[],
    pauses:[],hiringPaidDay:null,hiringSelection:{olderMale:0,olderFemale:0,youngMale:0,youngFemale:0},raid:null,nightPlan:null,dayPlan:null,eventPlan:null,
    cooldowns:{shield:0,growth:0,multiply:0},tutorial:{step:'intro',seen:[]},messages:[],commandIds:[],events:[]};
}
export const pause=(s,reason)=>{if(!s.pauses.includes(reason))s.pauses.push(reason);};
export const resume=(s,reason)=>{s.pauses=s.pauses.filter(r=>r!==reason);};
export function emit(s,type,detail={}) {s.events.push({id:`event-${s.sequence++}`,type,...detail});if(s.events.length>200)s.events.shift();}
export function notice(s,text,target=null) {s.messages.push({id:`message-${s.sequence++}`,text,target});if(s.messages.length>8)s.messages.shift();}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const profile=w=>PROFILES.find(p=>p.id===w.profile);
const nearest=(list,point)=>[...list].sort((a,b)=>dist(a,point)-dist(b,point)||a.id.localeCompare(b.id))[0];
function enqueueLooseCrates(s) {
  const centers=s.structures.filter(operational);
  for(const crate of s.crates.filter(c=>!c.delivered&&!c.carrierId)) {
    const center=nearest(centers,crate);if(center)enqueue(s,center.id,'crate',crate.id);
  }
}
export function commit(s,id,action,operation) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  if(!permission(s,action))throw new Error('Esta acción no está disponible ahora');
  operation();s.commandIds.push(id);return true;
}
export function previewCenter(s,{x,z,yaw=0},nav) {
  const candidates=[],cultures=new Map();let failure=null,buildable=false;
  const villages=[...s.villages].sort((a,b)=>dist(a,{x,z})-dist(b,{x,z})||a.id.localeCompare(b.id));
  for(const village of villages){
    const culture=village.culture??s.culture;
    if(!cultures.has(culture)){
      const resolved=resolveFluidPlacement(nav,(px,pz)=>[centerFootprint({kind:'center',x:px,z:pz,yaw,culture},s)],x,z,footprint=>s.plants.some(p=>p.alive&&footprintDistance(footprint.footprint,p.x,p.z)<.4)?{valid:false,reason:'Un cultivo ocupa este terreno'}:null);
      const footprint=resolved.shapes[0],candidate={kind:'center',x:resolved.x,z:resolved.z,yaw,culture};
      const check=resolved.checks[0];
      cultures.set(culture,{candidate,footprint,check});
    }
    const {candidate,footprint,check}=cultures.get(culture);
    if(!check.valid){failure??=check.reason;continue;}buildable=true;
    const routes=nav.forBuildingPlacement?.(footprint,check.suppress??[])??nav;
    const departure=centerServicePoint(candidate,s,.8),entry=village.entry??village;
    const outbound=routes.path(entry,departure,.28,null,true),inbound=outbound&&routes.path(departure,entry,.28,null,true);
    if(!inbound)continue;
    const routeLength=inbound.reduce((length,p,i)=>length+dist(p,i?inbound[i-1]:departure),0);
    candidates.push({...candidate,footprint,suppress:check.suppress??[],villageId:village.id,routeLength,valid:true,cost:B.work_center.cost});
  }
  candidates.sort((a,b)=>a.routeLength-b.routeLength||a.villageId.localeCompare(b.villageId));
  return candidates[0]??{valid:false,cost:B.work_center.cost,reason:buildable?'El centro no tiene un camino válido al poblado':failure??'El centro no tiene un camino válido al poblado'};
}
export function placeStructure(s,id,{kind='center',material='zarzas',gate=false,x,z,yaw=0},nav) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  if(kind==='wall'&&!permission(s,'wall'))throw new Error('Esta acción no está disponible ahora');
  const draft=kind==='center'?previewCenter(s,{x,z,yaw},nav):null;
  const village=draft?s.villages.find(v=>v.id===draft.villageId):nearest(s.villages,{x,z}),culture=draft?.culture??village?.culture??s.culture;
  if(draft?.valid){x=draft.x;z=draft.z;}
  const candidate={kind,x,z,yaw,culture};
  const check=draft??(nav.wallPlacement?.({...candidate,material,gate})??nav.placement(x,z,.8));
  if(!check.valid){if(kind==='wall')return false;throw new Error(check.reason);}
  if(kind!=='center'&&kind!=='wall')throw new Error('Construcción desconocida');
  const cost=kind==='center'?B.work_center.cost:wallSpec(material).cost;
  const maxHp=structureHealth(kind,material,gate),entity={id:`structure-${s.nextId}`,created:s.sequence,kind,material,gate,x,z,yaw,...(kind==='center'?{culture}:{}),maxHp,hp:maxHp,status:'intact',villageId:village?.id,cost,collapseRemaining:0};
  if(kind==='wall'&&!gate)for(const update of planNewWallGates(s,[entity],nav,[],()=>false))Object.assign(entity,update);
  const suppression=entity.autoGate?nav.wallPlacement(entity).suppress??[]:check.suppress??[];
  return commit(s,id,kind==='center'?'center':'wall',()=>{
    ensurePurchaseBudget(s,cost);transact(s.ledger,id,rational(-cost));
    s.nextId++;s.sequence++;s.structures.push(entity);
    s.suppressed.push(...suppression);nav.setState(s);emit(s,'PlacementCommitted',{kind,targetId:s.structures.at(-1).id,presentation:{x,z}});
    if(kind==='center'){recoverDisplacedWorkers(s);enqueueLooseCrates(s);}
    if(kind==='center'&&s.tutorial.step==='center')s.tutorial.step='plant';
  });
}
export function wallCapacity(s,material){return Math.max(0,Math.floor((numberOf(s.ledger.balance)-HIRING_RESERVE)/wallSpec(material).cost));}
export function affordableWallStroke(s,material,points){
  const maxPieces=wallCapacity(s,material),all=wallStroke(points,s.structures),slots=all.slice(0,maxPieces);
  return {slots,points:maxPieces?(all.length<=maxPieces?points:wallStrokeLine(slots)):[],maxPieces};
}
export function wallRefund(target){
  if(target.kind!=='wall'||target.hp<=0||target.status==='ruined'||target.status==='collapsing')return rational(0);
  // Native automatic gates can have fractional HP after proportional conversion.
  const health=rationalNumber(Math.min(target.hp,target.maxHp)),maximum=rationalNumber(target.maxHp);
  const amount=multiply(rational(target.cost),BigInt(health.n)*BigInt(maximum.d),BigInt(health.d)*BigInt(maximum.n));
  return rational((BigInt(amount.n)+BigInt(amount.d)-1n)/BigInt(amount.d));
}
function planNewWallGates(s,newPieces,nav,blockedPieces,cropOverlap){
  if(!newPieces.length)return [];
  const newIds=new Set(newPieces.map(p=>p.created));
  const layout=wallLayout([...s.structures,...newPieces],Object.fromEntries(B.walls.map(w=>[w.id,w.hp])));
  const originals=new Map([...s.structures,...newPieces].map(p=>[p.created,p]));
  const suppressedForGates=new Set(nav.suppressed);
  for(const piece of newPieces)for(const id of nav.wallPlacement(piece).suppress??[])suppressedForGates.add(id);
  const canHost=p=>{
    const original=originals.get(p.id);if(!original)return false;
    const candidate={...original,gate:true},check=nav.wallPlacement(candidate);
    if(!check.valid||cropOverlap(candidate))return false;
    const points=gatePortalPoints(candidate);if(points.length!==2)return false;
    const draft=nav.forBuildingPlacement(candidate);
    draft.obstacles=[...nav.obstacles.filter(o=>o.kind!=='wall'),...layout.pieces.filter(q=>originals.get(q.id)?.status!=='ruined').map(q=>({...originals.get(q.id),gate:q.id===p.id||q.kind==='gate'}))];
    draft.suppressed=new Set([...suppressedForGates,...check.suppress??[]]);
    return points.every(point=>draft.walkable(point.x,point.z,.28,null,true))&&draft.segmentClear(points[0],points[1],.28,null,true);
  };
  const interior=nav.forBuildingPlacement(newPieces[0]??s.structures[0]);
  interior.obstacles=[...nav.obstacles.filter(o=>o.kind!=='wall'),...[...s.structures,...newPieces].filter(p=>p.kind==='wall'&&p.status!=='ruined')];interior.suppressed=suppressedForGates;
  const omitted=blockedPieces.map(piece=>{const h=piece.baseScaleX*2.18/2,dx=Math.cos(piece.yaw)*h,dz=-Math.sin(piece.yaw)*h;return [[piece.x-dx,piece.z-dz],[piece.x+dx,piece.z+dz]];});
  const targets=s.structures.filter(operational).map(center=>{
    const plants=s.plants.filter(q=>q.alive&&q.centerId===center.id),target=plants.length?{x:plants.reduce((sum,q)=>sum+q.x,0)/plants.length,z:plants.reduce((sum,q)=>sum+q.z,0)/plants.length}:centerServicePoint(center,s,.8);
    return target;
  }),scores=new Map();let approachRoutes;
  const routeDistance=(p,route)=>Math.min(...route.slice(1).map((b,i)=>{
    const a=route[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
    return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
  }));
  const rank=(p,face)=>{
    if(face.ids.some(id=>id>0&&!newIds.has(id)))return -p.id;
    // Reuse existing shortest navigation routes, including buildings and cliffs.
    // Computed only for a fresh enclosure; incremental edits always prefer the
    // last new module rather than relocating an older wall.
    approachRoutes??=targets.flatMap(target=>s.villages.map(v=>{
      const entry=v.entry??v,path=nav.path(entry,target,.28,null,true);
      return {entry,target,path:path?[entry,...path]:null};
    }));
    if(!scores.has(p.id))scores.set(p.id,Math.min(...approachRoutes.map(({entry,target,path})=>(path?routeDistance(p,path):0)*1e6+dist(entry,p)+dist(p,target))));
    return scores.get(p.id);
  };
  ensureBoundaryGates(layout,nav,canHost,(x,z)=>interior.walkable(x,z,.28,null,true),omitted,rank,p=>newIds.has(p.id));
  const converted=layout.pieces.filter(p=>newIds.has(p.id)&&p.autoGate&&!s.structures.some(e=>e.id===p.entityId&&e.autoGate));
  const updates=converted.map(p=>({id:p.entityId,gate:true,autoGate:true,maxHp:p.maxHp,hp:p.hp})).filter(update=>{const piece=[...s.structures,...newPieces].find(p=>p.id===update.id),candidate={...piece,...update};return nav.wallPlacement(candidate).valid&&!cropOverlap(candidate);});
  return updates;
}
export function previewWallChain(s,material,points,nav,options={}) {
  if(!permission(s,'wall'))throw new Error('Esta acción no está disponible ahora');
  const spec=wallSpec(material),slots=wallStroke(points,s.structures,{...options,maxPieces:Infinity});
  const cropOverlap=piece=>{const c=Math.cos(piece.yaw),sn=Math.sin(piece.yaw),scale=piece.gate?(piece.material==='reforzado'?1.6:['adobe','piedra'].includes(piece.material)?1.4:1):1;return s.plants.some(p=>p.alive&&Math.abs((p.x-piece.x)*c-(p.z-piece.z)*sn)<1.09*(piece.baseScaleX??1)*scale+.4&&Math.abs((p.x-piece.x)*sn+(p.z-piece.z)*c)<.22*scale+.4);};
  const blockedPieces=[];
  const newPieces=slots.map(slot=>({kind:'wall',material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle,maxHp:spec.hp,hp:spec.hp,status:'intact',cost:spec.cost,collapseRemaining:0,villageId:nearest(s.villages,{x:slot.x,z:slot.z})?.id})).filter(piece=>{if(!nav.wallPlacement(piece).valid){blockedPieces.push(piece);return false;}return !cropOverlap(piece);}).slice(0,Math.max(0,Math.floor(options.maxPieces??Infinity)));
  newPieces.forEach((piece,i)=>Object.assign(piece,{id:`structure-${s.nextId+i}`,created:s.sequence+i}));
  const updates=planNewWallGates(s,newPieces,nav,blockedPieces,cropOverlap);
  for(const piece of newPieces){const update=updates.find(p=>p.id===piece.id);if(update)Object.assign(piece,update);}
  const checks=[...newPieces,...updates.filter(p=>!newPieces.some(e=>e.id===p.id)).map(p=>({...s.structures.find(e=>e.id===p.id),...p}))],suppressed=new Set();
  for(const piece of checks){
    const check=nav.wallPlacement(piece);
    for(const key of check.suppress??[])suppressed.add(key);
  }
  const cost=spec.cost*newPieces.length;
  if(compare(s.ledger.balance,rational(cost))<0)throw new Error('No hay monedas suficientes para todo el trazado');
  return {pieces:newPieces,previewPieces:checks,updates,suppressed:[...suppressed],cost,gates:updates.length};
}
export function buildWallChain(s,id,material,points,nav,options={}) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  const plan=previewWallChain(s,material,points,nav,options),newPieces=plan.pieces;
  if(!newPieces.length)return false;
  return commit(s,id,'wall',()=>{
    ensurePurchaseBudget(s,plan.cost);transact(s.ledger,id,rational(-plan.cost));
    for(const update of plan.updates){const existing=s.structures.find(e=>e.id===update.id);if(existing)Object.assign(existing,update);}
    s.structures.push(...newPieces);s.nextId+=newPieces.length;s.sequence+=newPieces.length;s.suppressed.push(...plan.suppressed.filter(key=>!s.suppressed.includes(key)));nav.setState(s);
    emit(s,'WallChainBuilt',{material,count:newPieces.length,gates:plan.gates,targetId:newPieces[0].id,presentation:{x:newPieces[0].x,z:newPieces[0].z}});
  });
}
export function removeWall(s,id,targetId,nav) {
  return commit(s,id,'wall',()=>{
    const target=s.structures.find(e=>e.id===targetId&&e.kind==='wall');if(!target)throw new Error('No existe esa defensa');
    const tasks=new Set(s.tasks.filter(t=>t.targetId===targetId).map(t=>t.id));
    for(const worker of s.workers.filter(w=>tasks.has(w.taskId))){releaseTask(s,worker);worker.path=null;worker.status='idle';}
    s.tasks=s.tasks.filter(t=>t.targetId!==targetId);s.structures=s.structures.filter(e=>e.id!==targetId);nav.setState(s);
    const refund=wallRefund(target);transact(s.ledger,id,refund);
    // Removal opens the graph: never call ensureAutomaticGates here or on reload.
    emit(s,'WallRemoved',{targetId,refund:numberOf(refund)});
  });
}
export function plant(s,id,species,x,z,nav) {
  const check=nav.placement(x,z,.4);
  if(!check.valid)throw new Error(check.reason);
  if(s.plants.some(p=>p.alive&&dist(p,{x,z})<1.1))throw new Error('Necesitas separar las plantas');
  const center=nearest(s.structures.filter(operational),{x,z});
  return commit(s,id,'plant',()=>{
    ensurePurchaseBudget(s,cropSpec(species).plant_cost);transact(s.ledger,id,rational(-cropSpec(species).plant_cost));
    const p=createPlant(`plant-${s.nextId++}`,species,x,z,center.id);
    if(spellAt(s,'multiply',p))p.multiplyHarvest=true;
    s.plants.push(p);enqueue(s,center.id,'initial',p.id);
    const removedProps=check.suppress??[];s.suppressed.push(...removedProps);
    if(nav.syncCropPlacement)nav.syncCropPlacement(s,removedProps);else nav.setState(s);
    emit(s,'CropPlaced',{targetId:p.id});
    if(s.tutorial.step==='plant')s.tutorial.step='hire';
  });
}
export function harvest(s,id,plantId) {
  const p=s.plants.find(p=>p.id===plantId&&isMature(p));if(!p)throw new Error('Este cultivo todavía no está maduro');
  return commit(s,id,'harvest',()=>{
    const group=contiguousGroup(s.plants,p).filter(isMature);
    group.sort((a,b)=>{
      const ca=s.structures.find(c=>c.id===a.centerId),cb=s.structures.find(c=>c.id===b.centerId);
      return (ca?dist(a,ca):Infinity)-(cb?dist(b,cb):Infinity)||a.id.localeCompare(b.id);
    });
    for(const target of group){target.harvestRequested=true;enqueue(s,target.centerId,'harvest',target.id);}
    emit(s,'HarvestRequested',{targetId:p.id,count:group.length});
  });
}
function addHiredWorker(s,profileId,centerId,usedPeople){
  const center=s.structures.find(c=>c.id===centerId),village=s.villages.find(v=>v.id===center?.villageId)??s.villages[0];
  let person=s.people.find(p=>p.profile===profileId&&!usedPeople.has(p.id));
  if(!person){person={id:`person-${s.nextId++}`,profile:profileId,recoveryUntil:0};s.people.push(person);}usedPeople.add(person.id);
  const entry=village.entry??village;
  s.workers.push({id:`worker-${s.nextId++}`,personId:person.id,profile:profileId,contractDay:s.day,centerId:centerId??null,villageId:village.id,x:entry.x,z:entry.z,status:center?'arriving':'waiting',taskId:null,crateId:null,path:null,hits:0,incapacitated:false,recovering:s.day<=person.recoveryUntil,runRemaining:dailyRunMetres(),actionRemaining:0});
}
export function hireAdditional(s,id,selection,centerId){
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  if(s.result||s.raid||s.hiringPaidDay!==s.day||s.time>=300||s.pauses.some(p=>!['menu','tutorial-action'].includes(p)))throw new Error('La contratación adicional no está disponible ahora');
  if(!s.structures.some(c=>c.id===centerId&&operational(c)))throw new Error('El centro de trabajo no está disponible');
  const cost=hiringCost(selection,{time:s.time}),total=Object.values(selection).reduce((n,c)=>n+c,0);
  if(!total)return false;
  transact(s.ledger,id,rational(-cost));
  const usedPeople=new Set(s.workers.map(w=>w.personId));
  for(const p of PROFILES)for(let i=0;i<(selection[p.id]??0);i++)addHiredWorker(s,p.id,centerId,usedPeople);
  for(const p of PROFILES)s.hiringSelection[p.id]=(s.hiringSelection[p.id]??0)+(selection[p.id]??0);
  s.commandIds.push(id);emit(s,'HiringConfirmed',{count:total,additional:true,centerId,cost});return true;
}
export function hire(s,id,selection) {
  if(s.hiringPaidDay===s.day)return false;
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  if(!s.pauses.includes('hiring'))throw new Error('La contratación no está abierta');
  const cost=hiringCost(selection);transact(s.ledger,id,rational(-cost));
  const centers=s.structures.filter(operational).map(c=>({...c,plants:s.plants.filter(p=>p.alive&&p.centerId===c.id).length}));
  const total=Object.values(selection).reduce((a,b)=>a+b,0),quotas=allocateWorkers(centers,total),assigned=distributeProfiles(quotas,selection);
  for(const w of s.workers)w.contractDay??=s.hiringPaidDay??s.day-1;
  s.workers=s.workers.filter(w=>contractExpired(w,s)&&w.status!=='home');
  const usedPeople=new Set(s.workers.map(w=>w.personId));
  const add=(profileId,centerId)=>{
    addHiredWorker(s,profileId,centerId,usedPeople);
  };
  for(const [centerId,profiles] of Object.entries(assigned))for(const p of profiles)add(p,centerId);
  if(!centers.length)for(const p of PROFILES)for(let i=0;i<(selection[p.id]??0);i++)add(p.id,null);
  s.commandIds.push(id);s.hiringSelection={...selection};s.hiringPaidDay=s.day;s.initialPreparation=false;resume(s,'hiring');rebuildTasks(s);planDay(s);
  if(s.tutorial.step==='hire')s.tutorial.step='observe';emit(s,'HiringConfirmed',{count:total,cost});
}
export function openInitialHiring(s) {if(s.structures.some(operational)&&s.plants.some(p=>p.alive)&&s.hiringPaidDay!==s.day)pause(s,'hiring');}
function queueMatureHarvest(s,p,queue) {
  if(!isMature(p))return;
  if(!p.harvestRequested){p.harvestRequested=true;emit(s,'HarvestRequested',{targetId:p.id,count:1,automatic:true});}
  if(!s.raid&&s.structures.some(c=>c.id===p.centerId&&operational(c))){if(queue)queue(p.centerId,'harvest',p.id);else enqueue(s,p.centerId,'harvest',p.id);}
}
export function rebuildTasks(s) {
  const committed=new Set(s.workers.filter(w=>contractExpired(w,s)&&w.status==='acting').map(w=>w.taskId));
  s.tasks=s.tasks.filter(t=>committed.has(t.id));
  for(const w of s.workers){
    cancelIdle(w);
    if(committed.has(w.taskId)&&s.tasks.some(t=>t.id===w.taskId&&t.workerId===w.id))continue;
    w.taskId=null;w.taskApproach=null;if(['walking','acting'].includes(w.status))w.status='idle';
  }
  for(const p of s.plants.filter(p=>p.alive)) {
    if(!s.structures.some(c=>c.id===p.centerId&&operational(c)))continue;
    if(p.water[0].status==='due')enqueue(s,p.centerId,'initial',p.id);
    else if(p.water.some(w=>w.status==='due'))enqueue(s,p.centerId,'water',p.id);
    queueMatureHarvest(s,p);
  }
  enqueueLooseCrates(s);
}
// Destruction is the only intraday reassignment exception. Quotas describe
// vacancies; workers of surviving centers keep their existing assignments.
export function recoverDisplacedWorkers(s) {
  if(s.raid)return;
  const available=w=>!w.incapacitated&&!contractExpired(w,s)&&s.time<profile(w).end;
  for(const w of s.workers){
    const lost=w.centerId&&!s.structures.some(c=>c.id===w.centerId&&operational(c));
    if(lost&&available(w))w.displacedDay??=s.day;
  }
  for(const village of s.villages){
    const centers=s.structures.filter(c=>operational(c)&&c.villageId===village.id)
      .map(c=>({...c,plants:s.plants.filter(p=>p.alive&&p.centerId===c.id).length}));
    const pool=s.workers.filter(w=>w.villageId===village.id&&available(w)&&
      (w.displacedDay===s.day||!w.centerId&&w.status==='waiting'));
    if(!pool.length||!centers.length)continue;
    const staff=s.workers.filter(w=>w.villageId===village.id&&available(w)&&!pool.includes(w)&&centers.some(c=>c.id===w.centerId));
    const quotas=allocateWorkers(centers,staff.length+pool.length);
    const counts=Object.fromEntries(centers.map(c=>[c.id,staff.filter(w=>w.centerId===c.id).length]));
    for(const w of pool){
      const destination=[...centers].filter(c=>counts[c.id]<quotas[c.id])
        .sort((a,b)=>(quotas[b.id]-counts[b.id])-(quotas[a.id]-counts[a.id])||a.created-b.created||a.id.localeCompare(b.id))[0];
      if(!destination)continue;
      cancelIdle(w);releaseTask(s,w);w.centerId=destination.id;w.status='arriving';w.raidReturn=true;w.path=null;
      delete w.displacedDay;counts[destination.id]++;
      emit(s,'WorkerReassigned',{targetId:w.id,centerId:destination.id});
    }
  }
}
export function repairCost(target) {
  if(target.status==='ruined')return rational(target.cost);
  const maximum=rationalNumber(target.maxHp),damage=add(maximum,negate(rationalNumber(target.hp)));
  return multiply(rational(target.cost),BigInt(damage.n)*BigInt(maximum.d),BigInt(damage.d)*BigInt(maximum.n));
}
export function dropCarriedCrate(s,worker){
  const crate=s.crates.find(c=>c.id===worker.crateId&&!c.delivered);
  worker.crateId=null;
  if(!crate)return;
  crate.carrierId=null;crate.x=worker.x;crate.z=worker.z;emit(s,'CrateDropped',{targetId:crate.id});
  if(!s.raid){const center=nearest(s.structures.filter(operational),crate);if(center)enqueue(s,center.id,'crate',crate.id);}
}
export function requestRepair(s,id,targetId) {
  const target=s.structures.find(c=>c.id===targetId);if(!target||target.hp===target.maxHp)throw new Error('No necesita reparación');
  if(compare(s.ledger.balance,repairCost(target))<0)throw new Error('Fondos insuficientes');
  ensurePurchaseBudget(s,repairCost(target));
  return commit(s,id,'repair',()=>{
    const center=nearest(s.structures.filter(operational),target);enqueue(s,center.id,'repair',targetId);emit(s,'RepairRequested',{targetId});
  });
}
export const spellRadius=id=>({shield:1.95,growth:2.6,multiply:2.2})[id]; // Calibrated against 1.5 m planting pitch; area, not plant cap.
export function spellAt(s,id,p) {return s.spells.find(a=>a.kind===id&&a.remaining>0&&dist(a,p)<=a.radius);}
function markMultiplyTargets(s,area){
  for(const p of s.plants)if(p.alive&&dist(area,p)<=area.radius)p.multiplyHarvest=true;
  area.exposureApplied=true;
}
export function previewSpell(s,kind,x,z,nav) {
  const draft={kind,x,z,radius:spellRadius(kind),valid:false,reason:null};
  try {
    validateSpell(s,kind,x,z,nav);draft.valid=true;
  } catch(error) {draft.reason=error.message;}
  return draft;
}
function validateSpell(s,kind,x,z,nav) {
  const spec=B.spells.find(p=>p.id===kind);if(!spec)throw new Error('Magia desconocida');
  if(!spellUnlocked(s,kind))throw new Error('El Espíritu todavía no ha revelado esta magia');
  if(s.cooldowns[kind]>0)throw new Error('La magia está recargando');
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new Error('Ubicación mágica inválida');
  const radius=spellRadius(kind);
  if(s.spells.some(a=>a.remaining>0&&dist(a,{x,z})<a.radius+radius))throw new Error('Las áreas mágicas no pueden solaparse');
  if(kind==='shield'&&s.raid?.animals.some(a=>a.status!=='gone'&&dist(a,{x,z})<radius+a.radius))throw new Error('El Escudo solapa un animal');
  if(!permission(s,kind))throw new Error('Esta acción no está disponible ahora');
  return spec;
}
export function cast(s,id,kind,x,z,nav) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  const spec=validateSpell(s,kind,x,z,nav),radius=spellRadius(kind);
  return commit(s,id,kind,()=>{
    const area={id:`spell-${s.nextId++}`,kind,x,z,radius,remaining:spec.duration_seconds};
    if(kind==='multiply')markMultiplyTargets(s,area);
    s.spells.push(area);s.cooldowns[kind]=spec.cooldown_seconds;nav.setState(s);emit(s,'SpellActivated',{kind,x,z});
  });
}
export function walkTo(s,w,destination,dt,nav,{speed=L.walkMetresPerSecond,ignore=null,worker=true,motion=null,expandRoute=false,routeVia=null}={}) {
  const previous={x:w.x,z:w.z};
  if(worker)w.running=false;
  if(!w.path||w.destinationId!==destination.id||w.pathVersion!==nav.version) {
    w.path=worker&&nav.workerPath?nav.workerPath(w,destination,w.radius??.28,ignore):nav.path(w,destination,w.radius??.28,ignore,worker);w.destinationId=destination.id;
    // The local search corridor is not a physical enclosure. Exhausted animals
    // can need a wider detour to reach the same exit they entered through.
    if(!w.path&&expandRoute)for(const margin of [32,64]){w.path=nav.path(w,destination,w.radius??.28,ignore,worker,margin);if(w.path)break;}
    // A fractional exit can connect through the validated entry corridor even
    // when none of its adjacent grid cells connect to the farm component.
    if(!w.path&&routeVia&&nav.segmentClear?.(routeVia,destination,w.radius??.28,ignore,worker)){
      for(const margin of [16,32,64]){w.path=nav.path(w,routeVia,w.radius??.28,ignore,worker,margin);if(w.path)break;}
      if(w.path)w.path.push({x:destination.x,z:destination.z});
    }
    if(!w.path&&expandRoute&&!worker){
      w.path=nav.propOverlapExitPath?.(w,destination,w.radius??.28,ignore,worker)??null;
      if(!w.path)w.path=animalExitConnector(w,destination,nav);
      if(!w.path)w.path=animalSlopeRecoveryPath(nav,w,destination,w.radius??.28);
    }
    if(!w.path&&worker&&!ignore&&['fleeing','returning','incapacitated'].includes(w.status)){
      w.path=workerSlopeRecoveryPath(nav,w,destination,w.radius??.28);
      if(!w.path)w.path=workerReturnRoute(nav,w,destination,w.radius??.28);
    }
    w.pathVersion=nav.version;
    if(!w.path)return false;
  }
  if(worker&&waitForGate(w,s.structures))return false;
  const dynamicClear=prepareActorMotion(s,w,nav,worker);
  const routeClearance=worker?workerRiskClearance(w,nav,{radius:w.radius??.28,ignore},dynamicClear):animalRouteClearance(w,nav,{radius:w.radius??.28,ignore,escapeProps:expandRoute},dynamicClear);
  const clear=routeClearance?.clear??dynamicClear;
  if(motion)moveWorker(w,dt,{...motion,gates:worker?s.structures:[],clear});else {
    const metres=worker?movePathWithGates(w,speed*dt,s.structures,clear):movePath(w,speed*dt,clear);w.motionPhase=(w.motionPhase??0)+metres/speed;
  }
  if(dist(previous,w)>1e-9)w.heading=Math.atan2(w.x-previous.x,w.z-previous.z);
  if(routeClearance?.blocked()){w.path=null;return false;}
  return w.path.length===0;
}
function completeTask(s,w,t,target,nav) {
  if(t.kind==='initial'||t.kind==='water') {
    if(!canWaterFrom(w,target,nav)){releaseTask(s,w);w.status='idle';w.path=null;return;}
    if(target.alive){waterPlant(target);emit(s,'WaterSatisfied',{workerId:w.id,targetId:target.id});}
  } else if(t.kind==='harvest') {
    if(isMature(target)&&target.harvestRequested) {
      let value=rational(cropSpec(target.species).base_harvest_value);
      if(profile(w).male)value=multiply(value,6,5);
      if(target.multiplyHarvest||spellAt(s,'multiply',target))value=multiply(value,2);
      if(target.harvestBonus)value=multiply(value,100+target.harvestBonus,100);
      target.alive=false;target.harvestRequested=false;target.multiplyHarvest=false;
      cropBecameInactive(s.plants);
      const crate={id:`crate-${s.nextId++}`,sourcePlantId:target.id,species:target.species,x:w.x,z:w.z,value,profile:w.profile,carrierId:w.id,delivered:false,centerId:w.centerId};s.crates.push(crate);w.crateId=crate.id;w.status='carrying';w.path=null;emit(s,'CropPicked',{workerId:w.id,targetId:target.id});
    }
  } else if(t.kind==='crate') {target.carrierId=w.id;w.crateId=target.id;target.centerId=w.centerId;w.status='carrying';w.path=null;}
  else if(t.kind==='repair') {
    try {
      ensurePurchaseBudget(s,repairCost(target));
      const paymentId=`repair:${t.id}`,previousHp=target.hp,previousStatus=target.status;
      if(transact(s.ledger,paymentId,negate(repairCost(target)))){
        const visual=target.kind==='wall'?wallVisualAt(target,s.elapsed):null;
        delete target.wallPresentation;target.hp=target.maxHp;target.status='intact';target.collapseRemaining=0;
        if(visual!==null)recordWallPresentation(target,visual,s.elapsed);nav.setState(s);
        // Read the settled ledger debit: proportional repair prices may be
        // fractional before transact rounds the actual payment to whole coins.
        emit(s,'RepairApplied',{workerId:w.id,targetId:target.id,
          repair:{taskId:t.id,paymentId,paidCoins:-numberOf(s.ledger.entries[paymentId]),previousHp,previousStatus,restoredHp:target.hp,maxHp:target.maxHp},
          presentation:{elapsed:s.elapsed,x:w.x,z:w.z,yaw:w.heading??0}});
        if(target.kind==='center'){recoverDisplacedWorkers(s);enqueueLooseCrates(s);}
      }
    }
    catch {notice(s,'La reparación se canceló: fondos insuficientes al llegar.',target.id);}
  }
  s.tasks=s.tasks.filter(task=>task.id!==t.id);w.taskId=null;w.taskApproach=null;if(w.status!=='carrying')w.status='idle';w.path=null;
}
export function idleFarmAnchor(s,worker,center,livingCandidates=null){
  let planted=null,live=null,plantedDistance=Infinity,liveDistance=Infinity;
  // The worker pass supplies one shared living subset. Recheck object life as
  // earlier workers can harvest during that same pass. Fall back to the exact
  // original historical scan when this center no longer has living crops.
  const candidates=livingCandidates?.some(p=>p.centerId===worker.centerId&&p.alive)?livingCandidates:s.plants;
  for(const plant of candidates){
    if(plant.centerId!==worker.centerId)continue;
    const distance=dist(plant,worker);
    if(distance<plantedDistance||distance===plantedDistance&&plant.id.localeCompare(planted.id)<0){planted=plant;plantedDistance=distance;}
    if(plant.alive&&(distance<liveDistance||distance===liveDistance&&plant.id.localeCompare(live.id)<0)){live=plant;liveDistance=distance;}
  }
  const plant=live??planted;
  // Keep the cultivated area as the idle anchor after its last harvest too.
  if(plant)return {...plant,id:'farm-'+plant.id,idleRadius:3};
  return {...center,...centerServicePoint(center,s,.8),id:'farm-'+center.id,idleRadius:2};
}
function reserveAvailableTasks(s,nav){
  if(!s.raid&&s.time<300)reserveTasks(s,(w,t,target)=>{
    if(s.time>=profile(w).end)return false;
    return t.kind==='repair'?!!repairRoute(w,target,nav):t.kind==='initial'||t.kind==='water'?!!wateringRoute(w,target,nav):!!nav.path(w,target,.28,null,true);
  });
}
function updateWorkers(s,dt,nav) {
  // Task removals/rebuilds replace the array; enqueues change its length.
  // Unchanged queues can reuse their index while reservation fields stay live.
  const findPlant=workerEntityLookup(()=>s.plants,{reuse:true,appendOnly:true}),findCrate=workerEntityLookup(()=>s.crates,{reuse:true,appendOnly:true}),findTask=workerEntityLookup(()=>s.tasks,{reuse:true});
  let idlePlants;
  const newArrivals=[];
  if(!s.raid&&s.time<300)for(const w of s.workers){
    if(w.status!=='arriving'||w.raidReturn||w.incapacitated||w.fallRemaining>0||contractExpired(w,s)||s.time>=profile(w).end)continue;
    if(!s.structures.some(c=>c.id===w.centerId&&operational(c)))continue;
    w.status='idle';newArrivals.push(w);
  }
  // New contracts reserve from their actual village position before any idle
  // motion. Returning raid survivors retain the existing arrival sequence.
  if(newArrivals.length){
    reserveAvailableTasks(s,nav);
    for(const w of newArrivals)if(!w.taskId)w.status='arriving';
  }
  // Small crews retain direct queries; amortize bookkeeping only in large farms.
  const urgency=s.workers.length>=64?createUrgencyPass(s):null;
  for(const w of s.workers) {
    try {
      if(w.fallRemaining>0&&!w.incapacitated){w.fallRemaining=Math.max(0,w.fallRemaining-dt);continue;}
      const p=profile(w),center=s.structures.find(c=>c.id===w.centerId),village=s.villages.find(v=>v.id===w.villageId);
      if(['fleeing','returning','incapacitated'].includes(w.status)) {
        const reached=walkTo(s,w,{...(village.entry??village),id:`home-${village.id}`},dt,nav,{motion:{flight:w.incapacitated||w.status==='fleeing',slow:w.incapacitated}});
        if(reached)w.status='home';continue;
      }
      if(w.status==='home')continue;
      if(w.status==='waiting'&&!center&&!s.raid&&!contractExpired(w,s)&&s.time<p.end){updateIdle(w,{...(village.entry??village),id:village.id},dt,nav,s.seed,s.structures);continue;}
      if(w.status!=='idle')cancelIdle(w);
      if(!center||!operational(center)) {if(center&&!contractExpired(w,s)&&s.time<p.end)w.displacedDay??=s.day;cancelIdle(w);releaseTask(s,w);if(w.crateId)dropCarriedCrate(s,w);w.status='returning';w.path=null;continue;}
      const ended=contractExpired(w,s)||s.time>=p.end;
      if(ended&&!['acting','carrying'].includes(w.status)) {cancelIdle(w);releaseTask(s,w);w.status='returning';w.path=null;continue;}
      if(w.status==='arriving') {if(walkTo(s,w,{...center,...centerServicePoint(center,s,.8),id:`arrival-${center.id}`},dt,nav,{motion:{urgent:!w.raidReturn&&(urgency?urgency.urgent(w):urgentWork(s,w))}})){w.status='idle';w.raidReturn=false;}continue;}
      if(w.status==='carrying') {
        const crate=findCrate(w.crateId);
        if(!crate){w.crateId=null;w.status='idle';continue;}
        if(w.deliveryApproach?.crateId!==crate.id||w.deliveryApproach?.centerId!==center.id||!Number.isFinite(w.deliveryApproach?.x)||!Number.isFinite(w.deliveryApproach?.z)){
          const source=findPlant(crate.sourcePlantId)??crate;
          w.deliveryApproach={...centerDeliveryPoint(center,source,s),crateId:crate.id,centerId:center.id};w.path=null;
        }
        const delivered=walkTo(s,w,{...w.deliveryApproach,id:`delivery-${center.id}-${crate.id}`},dt,nav,{motion:{carrying:true}});
        crate.x=w.x;crate.z=w.z;
        if(delivered) {
          transact(s.ledger,`deliver:${crate.id}`,crate.value);crate.delivered=true;crate.carrierId=null;w.crateId=null;w.deliveryApproach=null;w.status=ended?'returning':'idle';w.path=null;emit(s,'CrateDelivered',{workerId:w.id,targetId:crate.id});
          if(s.tutorial.step==='observe'||s.tutorial.step==='harvest'){s.tutorial.step='done';if(!s.tutorial.basicSkipped)emit(s,'TutorialCompleted',{workerId:w.id,targetId:crate.id});}
        }
        continue;
      }
      const t=findTask(w.taskId);
      if(!t) {
        if(w.status!=='idle')w.status='idle';
        if(s.tasks.some(task=>task.centerId===w.centerId&&!task.workerId))cancelIdle(w);
        else {idlePlants??=s.plants.filter(p=>p.alive);updateIdle(w,idleFarmAnchor(s,w,center,idlePlants),dt,nav,s.seed,s.structures);}
        continue;
      }
      const target=findPlant(t.targetId)??findCrate(t.targetId)??s.structures.find(e=>e.id===t.targetId);
      if(!target || ('alive' in target&&!target.alive)) {s.tasks=s.tasks.filter(q=>q.id!==t.id);w.taskId=null;w.status='idle';w.path=null;continue;}
      if(w.status==='walking') {
        let destination=target;
        if(t.kind==='repair'){
          if(w.taskApproach?.taskId!==t.id||w.path===null){
            const route=repairRoute(w,target,nav);
            if(!route){releaseTask(s,w);w.status='idle';continue;}
            w.taskApproach={taskId:t.id,destination:route.destination};w.path=route.path;w.destinationId=route.destination.id;w.pathVersion=nav.version;
          }
          destination=w.taskApproach.destination;
        }else if(t.kind==='initial'||t.kind==='water'){
          if(w.taskApproach?.taskId!==t.id||w.path===null||w.pathVersion!==nav.version){
            const route=wateringRoute(w,target,nav);
            if(!route){releaseTask(s,w);w.status='idle';continue;}
            w.taskApproach={taskId:t.id,destination:route.destination};w.path=route.path;w.destinationId=route.destination.id;w.pathVersion=nav.version;
          }
          destination=w.taskApproach.destination;
        }
        if(walkTo(s,w,destination,dt,nav,{motion:{urgent:(urgency?urgency.urgent(w):urgentWork(s,w))}})) {
          if(t.kind==='repair'){completeTask(s,w,t,target,nav);urgency?.invalidate();continue;}
          if(t.kind==='initial'||t.kind==='water')w.heading=Math.atan2(target.x-w.x,target.z-w.z);
          w.status='acting';w.actionRemaining=(t.kind==='initial'?7.2:t.kind==='water'?3.4:t.kind==='harvest'?3.6:t.kind==='repair'?3.8:1)/p.speed;
        }else if(w.path===null){releaseTask(s,w);w.status='idle';}
      } else if(w.status==='acting') {
        if(t.kind==='repair'){completeTask(s,w,t,target,nav);urgency?.invalidate();continue;}
        w.actionRemaining-=dt;if(w.actionRemaining<=0)completeTask(s,w,t,target,nav);
      }
    } finally {urgency?.changed(w);}
  }
  reserveAvailableTasks(s,nav);
}
function closeNight(s) {
  s.completedNights++;s.time=0;s.day++;
  s.tutorial.shownToday={day:s.day,ids:[]};
  s.workers=s.workers.filter(w=>w.status!=='home');
  for(const w of s.workers){
    w.contractDay??=s.day-1;w.runRemaining=dailyRunMetres();w.running=false;
    w.recovering=s.day<=(s.people.find(p=>p.id===w.personId)?.recoveryUntil??0);
    if(!['acting','carrying','fleeing','returning','incapacitated'].includes(w.status)){releaseTask(s,w);w.status='returning';w.path=null;}
  }
  applyEvent(s);s.eventPlan=null;s.nightPlan=null;
  if(compare(s.ledger.balance,rational(dawnMinimum(s)))<0){s.result='defeat';notice(s,'El sol vuelve, pero el poblado no puede costear otra jornada.');emit(s,'GameOver');return;}
  if(s.completedNights>=100&&!s.postgame){s.result='victory';emit(s,'CampaignWon');return;}
  for(const plant of s.plants.filter(p=>p.alive))plant.centerId=nearest(s.structures.filter(operational),plant)?.id??null;
  s.hiringPaidDay=null;rebuildTasks(s);pause(s,'hiring');emit(s,'Dawn');
}
export function continuePostgame(s) {if(s.result!=='victory')return;s.result=null;s.postgame=true;s.nightPlan=null;s.dayPlan=null;pause(s,'hiring');emit(s,'PostgameStarted');}
export function previewVillage(s,culture,x,z,payload,nav) {
  if(!CULTURES.includes(culture))throw new Error('Cultura desconocida');
  const resolved=resolveFluidPlacement(nav,(px,pz)=>villageLayout(payload,px,pz),x,z),buildings=resolved.shapes,checks=resolved.checks;
  x=resolved.x;z=resolved.z;
  const entry=checks.every(c=>c.valid)?findVillageEntry(nav,buildings,x,z):null;
  return {culture,x,z,buildings,entry,cost:villageCost(s.villages.length+1),valid:checks.every(c=>c.valid)&&!!entry,suppress:[...new Set(checks.flatMap(c=>c.suppress??[]))],reason:checks.find(c=>!c.valid)?.reason??(!entry?'El poblado no tiene una salida transitable':undefined)};
}
export function foundVillage(s,id,culture,x,z,payload,nav) {
  return commit(s,id,'village',()=>{
    // Replayed commands must stop before validating their already occupied site.
    // New confirmations still revalidate the complete layout before charging.
    const preview=previewVillage(s,culture,x,z,payload,nav);if(!preview.valid)throw new Error(preview.reason);x=preview.x;z=preview.z;
    ensurePurchaseBudget(s,preview.cost);transact(s.ledger,id,rational(-preview.cost));s.villages.push({id:`village-${s.nextId++}`,culture,x,z,buildings:preview.buildings,entry:preview.entry});s.suppressed.push(...preview.suppress);
    nav.setState(s);
    for(const center of s.structures.filter(operational)) {
      const departure=centerServicePoint(center,s);
      const nearestRoute=nearestVillageRoute(nav,departure,s.villages);
      if(nearestRoute){center.culture??=centerCulture(center,s);center.villageId=nearestRoute.v.id;}
    }
    emit(s,'VillageFounded',{culture,x,z,targetId:s.villages.at(-1).id,presentation:{x,z}});
  });
}
function clockBoundaries(s){
  return [250,300,600,...(s.dayPlan&&!s.dayPlan.done?[s.dayPlan.at]:[]),...(s.nightPlan&&!s.nightPlan.done?[s.nightPlan.at]:[])].filter(Number.isFinite);
}
function prepareClockEvents(s,nav){
  if(s.time>=300 && !s.nightPlan){planNight(s);selectEvent(s);emit(s,'NightStarted');}
  if(s.dayPlan&&!s.dayPlan.done&&s.time>=s.dayPlan.at){s.dayPlan.done=true;if(!s.postgame)spawnRaid(s,s.dayPlan,nav,true);}
  if(s.nightPlan&&!s.nightPlan.done&&s.time>=s.nightPlan.at){
    if(!s.nightPlan.group?.length)s.nightPlan.done=true;
    else if(spawnRaid(s,s.nightPlan,nav)==='spawned')s.nightPlan.done=true;
  }
}
export function nightEntryPending(s){return !!(!s.postgame&&s.nightPlan&&!s.nightPlan.done&&s.nightPlan.group?.length&&s.time>=s.nightPlan.at);}
export function tick(s,seconds,nav) {
  return withNavigationQueries(nav,()=>tickScoped(s,seconds,nav));
}
function tickScoped(s,seconds,nav) {
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Paso temporal inválido');
  let left=seconds;
  while(left>1e-9 && !s.pauses.length && !s.result) {
    prepareClockEvents(s,nav);
    // No actors entered: waiting at dawn is not extra simulated night time.
    // UI/camera and presentation preparation run outside this simulation loop.
    if(s.time>=600&&!s.raid&&nightEntryPending(s))return;
    // Version-1 saves can contain an active area without exposure bookkeeping.
    // Mark once on restoration; static plants need no per-frame exposure scan.
    for(const area of s.spells)if(area.kind==='multiply'&&area.remaining>0&&!area.exposureApplied)markMultiplyTargets(s,area);
    const previousTime=s.time;
    const clockEdges=clockBoundaries(s);
    const boundaries=clockEdges.filter(t=>t>s.time+1e-9).map(t=>t-s.time);
    const magicBoundaries=s.spells.filter(a=>a.remaining>1e-9).map(a=>a.remaining);
    const step=Math.min(left,.1,...boundaries,...magicBoundaries);left-=step;
    s.elapsed+=step;
    const nextTime=Math.min(600,s.time+step);
    s.time=clockEdges.find(boundary=>Math.abs(nextTime-boundary)<1e-9)??nextTime;
    for(const kind of Object.keys(s.cooldowns)) {
      const remaining=s.cooldowns[kind]-step;
      s.cooldowns[kind]=remaining>1e-9?remaining:0;
    }
    for(const structure of s.structures)if(structure.status==='collapsing') {
      structure.collapseRemaining-=step;if(structure.collapseRemaining<=1e-9){structure.status='ruined';structure.hp=0;nav.setState(s);emit(s,'StructureRuined',{targetId:structure.id});}
    }
    if(previousTime<300) {
      const enqueueCrop=taskEnqueuer(s);
      for(const p of activeCrops(s.plants)) {
        if(!p.alive)continue;
        const before=isMature(p);advancePlant(p,step,!!spellAt(s,'growth',p));
        if(!before&&isMature(p)){emit(s,'CropMatured',{targetId:p.id});if(s.tutorial.step==='observe')s.tutorial.step='harvest';}
        if(!p.harvestRequested)queueMatureHarvest(s,p,enqueueCrop);
        if(p.alive&&p.water.some(w=>w.status==='due')&&p.centerId&&s.structures.some(c=>c.id===p.centerId&&operational(c)))enqueueCrop(p.centerId,p.water[0].status==='due'?'initial':'water',p.id);
      }
    }
    const spellCount=s.spells.length;
    for(const spell of s.spells)spell.remaining=Math.max(0,spell.remaining-step);
    s.spells=s.spells.filter(a=>a.remaining>1e-9);
    if(s.spells.length!==spellCount)nav.setState(s);
    advanceGateLeaves(s,step);updateRaid(s,step,nav);updateWorkers(s,step,nav);
    // Arrival is an event at the end of this interval. Newly spawned animals
    // must not move for time that elapsed before they existed.
    prepareClockEvents(s,nav);
    if(s.time>=600 && !s.raid && !s.result && !nightEntryPending(s))closeNight(s);
  }
}
export function advanceReal(s,seconds,nav) {
  let left=seconds;
  while(left>1e-9 && !s.pauses.length&&!s.result) {
      prepareClockEvents(s,nav);
    if(s.time>=600&&!s.raid&&nightEntryPending(s))return;
    const speed=s.time>=300&&!s.raid?5:1;
    const untilBoundary=Math.min(...clockBoundaries(s).filter(t=>t>s.time+1e-9).map(t=>(t-s.time)/speed));
    const real=Math.min(left,.02,untilBoundary);left-=real;
    tick(s,real*speed,nav);
  }
}
export function clockLabel(s) {
  const minutes=(425+Math.min(600,s.time)*2.4)%1440;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;
}
