import {commitAgriculturalPower,growthPowerStep,settleMultiplyPower} from './agricultural-power.js';
import {activeRaidEntryPlan} from '../world/raid-entry-data.js';
import {animalExitConnector} from './animal-exit-connectors.js';
import {animalNativeExitBridgePending} from './animal-native-exit-bridge.js';
import {workerReturnRoute,workerReturnRoutePending} from './worker-return-route.js';
import {workerFractionalConnector,workerFractionalConnectorPending} from '../world/worker-fractional-connector.js';
import {SpatialChunkUnavailable} from '../world/wild-engine/spatial-navigation-movement.js';
import {workerRiskClearance} from './worker-route-clearance.js';
import {resolveFluidPlacement} from '../world/fluid-placement.js';
import {ensurePurchaseBudget,HIRING_RESERVE} from './budget.js';
import {ensureBoundaryGates} from '../world/boundary-gates.js';
import {gatePortalPoints} from '../world/gate-passages.js';
import {wallCollisionBounds} from '../world/wall-collision-frame.js';
import {containsPoint,footprintDistance} from '../world/footprints.js';
import {centerCulture,centerFootprint,centerServicePoint,centerDeliveryPoint} from '../world/centers.js';
import {actorBlockers,actorSegmentClear,prepareActorMotion,createWorkerBodyIndex,workerYieldPoint} from './actor-motion.js';
import {animalRouteClearance} from './animal-route-clearance.js';
import {animalSlopeRecoveryPath} from './animal-slope-recovery.js';
import {BALANCE as B} from './balance.js';
import {wallVisualAt,recordWallPresentation} from './structure-presentation.js';
import {rational,rationalNumber,add,multiply,negate,transact,compare,numberOf} from './money.js';
import {PROFILES,allocateWorkers,hiringCost,distributeProfiles,contractExpired} from './workforce.js';
import {spellUnlocked,permission,operational,cropSpec,wallSpec,structureHealth,dawnMinimum,nextRandom,randomInt,villageCost,hitStructure} from './rules.js';
import {createPlant,advancePlant,waterPlant,isMature,contiguousGroup} from './crops.js';
import {activeCrops,cropBecameInactive} from './active-crops.js';
import {activeCrates,crateBecameInactive} from './active-crates.js';
import {retireFarmHistory} from './retire-farm-history.js';
import {harvestMicroLoss} from '../microevents/economy.js';
import {workerEntityLookup} from './worker-entity-lookup.js';
import {enqueue,taskEnqueuer,reserveTasks,releaseTask,replaceTasks,
  notifyWorkerPlanningChange,notifyWorkerPlanningRoster,taskPlanningRevision} from './tasks.js';
import {planNight,updateRaid,spawnRaid,planDay} from './raids.js';
import {wallStroke,wallLayout,wallStrokeLine,gateScale} from '../world/wall-layout.js';
import {selectEvent,applyEvent} from './events.js';
import {villageLayout,findVillageEntry,nearestVillageRoute} from '../world/villages.js';
import {LOCOMOTION as L} from './locomotion-calibration.js';
import {dailyRunMetres,urgentWork,moveWorker,movePath,movePathWithGates} from './locomotion.js';
import {workerSlopeRecoveryPath} from '../world/worker-slope-recovery.js';
import {animalWallOverlapRecovery,workerWallOverlapRecoveryPath} from '../world/worker-wall-overlap-recovery.js';
import {createUrgencyPass} from './work-urgency.js';
import {repairRoute,wateringRoute,canWaterFrom} from '../world/work-points.js';
import {updateIdle,cancelIdle} from './idle.js';
import {advanceGateLeaves,waitForGate} from './gates.js';

// A failed plan is a waiting state, not a request to repeat the same search
// on every movement tick. Kept outside saves: a restored actor gets one fresh
// attempt, then waits for topology/residency or a bounded dynamic retry.
const routePlanWaits=new WeakMap();
// Dependency stamps are session-local; restored actors take the normal route
// planning path until this navigator has observed their current route.
const activeRouteStamps=new WeakMap();
const ROUTE_RETRY_SECONDS=8;
const routeEpoch=(nav,actor,destination,worker)=>{
  const sectors=nav.spatialSectorRevision?.(actor.radius??.28,worker)??0;
  return `${destination.id}:${destination.x}:${destination.z}:${nav.version}:${sectors}:${worker?'worker':actor.species??'animal'}`;
};
const taskPlanWaits=new WeakMap();
const preparedWallQuotes=new WeakMap();
const eventObservers=new WeakMap();

export const BIOMES=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'];
export const CULTURES=['mapungubwe','saheliana','suajili','musgum','etiope'];
export function newGame({biome='sabana',culture='mapungubwe',seed=Date.now(),slotId=crypto.randomUUID()}={}) {
  if(!BIOMES.includes(biome)||!CULTURES.includes(culture))throw new Error('Combinación desconocida');
  return {saveVersion:1,terrainVersion:'4.1.10.3',slotId,seed:String(seed),rng:(Number(seed)>>>0)||918271,biome,culture,day:1,time:0,elapsed:0,completedNights:0,cinematicSeenAct:0,postgame:false,result:null,
    initialPreparation:true,ledger:{balance:rational(B.initial_money),entries:{}},nextId:2,sequence:1,structures:[],plants:[],workers:[],people:[],crates:[],spells:[],tasks:[],villages:[{id:'village-1',culture,x:0,z:0,buildings:[]}],suppressed:[],
    pauses:[],hiringPaidDay:null,hiringSelection:{olderMale:0,olderFemale:0,youngMale:0,youngFemale:0},raid:null,nightPlan:null,dayPlan:null,eventPlan:null,
    cooldowns:{shield:0,growth:0,multiply:0},tutorial:{step:'intro',seen:[]},messages:[],commandIds:[],events:[]};
}
export const pause=(s,reason)=>{if(!s.pauses.includes(reason))s.pauses.push(reason);};
export const resume=(s,reason)=>{s.pauses=s.pauses.filter(r=>r!==reason);};
export function observeGameEvents(s,callback){
  if(typeof callback!=='function')throw TypeError('Expected a game event observer');
  let listeners=eventObservers.get(s);
  if(!listeners){listeners=new Set();eventObservers.set(s,listeners);}
  listeners.add(callback);
  return ()=>listeners.delete(callback);
}
export function emit(s,type,detail={}) {
  const event={id:`event-${s.sequence++}`,type,...detail};
  s.events.push(event);if(s.events.length>200)s.events.shift();
  for(const callback of eventObservers.get(s)??[])callback(event);
}
export function notice(s,text,target=null) {s.messages.push({id:`message-${s.sequence++}`,text,target});if(s.messages.length>8)s.messages.shift();}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const profile=w=>PROFILES.find(p=>p.id===w.profile);
const nearest=(list,point)=>[...list].sort((a,b)=>dist(a,point)-dist(b,point)||a.id.localeCompare(b.id))[0];
function enqueueLooseCrates(s) {
  const centers=s.structures.filter(operational);
  for(const crate of activeCrates(s.crates)) {
    if(crate.carrierId)continue;
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
  const living=activeCrops(s.plants);
  const villages=[...s.villages].sort((a,b)=>dist(a,{x,z})-dist(b,{x,z})||a.id.localeCompare(b.id));
  for(const village of villages){
    const culture=village.culture??s.culture;
    if(!cultures.has(culture)){
      const resolved=resolveFluidPlacement(nav,(px,pz)=>[centerFootprint({kind:'center',x:px,z:pz,yaw,culture},s)],x,z,footprint=>living.some(p=>p.alive&&footprintDistance(footprint.footprint,p.x,p.z)<.4)?{valid:false,reason:'Un cultivo ocupa este terreno'}:null);
      const footprint=resolved.shapes[0],candidate={kind:'center',x:resolved.x,z:resolved.z,yaw,culture};
      const check=resolved.checks[0];
      cultures.set(culture,{candidate,footprint,check});
    }
    const {candidate,footprint,check}=cultures.get(culture);
    if(!check.valid){failure??=check.reason;continue;}buildable=true;
    const departure=centerServicePoint(candidate,s,.8),entry=village.entry??village;
    const inspect=routes=>{
      // A route snapped out of a new footprint is not a valid departure:
      // workers must still be able to stand at the actual village entry.
      let routeLength;
      if(nav.withCenterPreview){
        if(routes.walkable(entry.x,entry.z,.28,null,true)!==true)return;
        const reach=routes.reachCost?
          (start,end)=>routes.reachCost(start,end):
          (start,end)=>({status:routes.reachable(start,end),cost:null});
        const outbound=reach(entry,departure),inbound=reach(departure,entry);
        if(outbound.status!=='found'||inbound.status!=='found')return;
        // The same native overlay search already traversed the accessible
        // cells. Its cost avoids assigning a center through a long detour
        // merely because that village is closer in a straight line.
        routeLength=Number.isFinite(inbound.cost)?inbound.cost:dist(departure,entry);
      }else{
        const outbound=routes.path(entry,departure,.28,null,true),
          inbound=outbound&&routes.path(departure,entry,.28,null,true);
        if(!inbound)return;
        routeLength=inbound.reduce((length,p,i)=>
          length+dist(p,i?inbound[i-1]:departure),0);
      }
      candidates.push({...candidate,footprint,suppress:check.suppress??[],villageId:village.id,routeLength,valid:true,cost:B.work_center.cost});
    };
    if(nav.withCenterPreview)nav.withCenterPreview(footprint,check.suppress??[],inspect);
    else inspect(nav.forBuildingPlacement?.(footprint,check.suppress??[])??nav);
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
  if(kind==='wall'&&!gate){
    const gatePlan=planNewWallGates(s,[entity],nav,[],()=>false);
    // An edit that seals a playable room must leave a traversable entrance.
    if(gatePlan.unhostedWorker||gatePlan.unhosted&&!gatePlan.length)return false;
    for(const update of gatePlan)Object.assign(entity,update);
  }
  const suppression=entity.autoGate?nav.wallPlacement(entity).suppress??[]:check.suppress??[];
  return commit(s,id,kind==='center'?'center':'wall',()=>{
    ensurePurchaseBudget(s,cost);transact(s.ledger,id,rational(-cost));
    const replaced=kind==='wall'?replaceCoincidentRuins(s,[entity]):[];
    s.nextId++;s.sequence++;s.structures.push(entity);
    s.suppressed.push(...suppression);nav.setState(s);
    for(const ruin of replaced)emit(s,'WallRemoved',{
      targetId:ruin.id,refund:0,replacedBy:entity.id});
    emit(s,'PlacementCommitted',{kind,targetId:s.structures.at(-1).id,presentation:{x,z}});
    if(kind==='center'){recoverDisplacedWorkers(s);enqueueLooseCrates(s);}
    if(kind==='center'&&s.tutorial.step==='center')s.tutorial.step='plant';
  });
}
export function wallCapacity(s,material){return Math.max(0,Math.floor((numberOf(s.ledger.balance)-HIRING_RESERVE)/wallSpec(material).cost));}
function coincidentRuins(s,pieces){
  return s.structures.filter(old=>old.kind==='wall'&&old.status==='ruined'&&
    pieces.some(piece=>Math.hypot(old.x-piece.x,old.z-piece.z)<.35&&
      Math.abs(Math.sin((old.yaw??0)-(piece.yaw??0)))<.18));
}
function replaceCoincidentRuins(s,pieces){
  const ruins=coincidentRuins(s,pieces);
  if(!ruins.length)return [];
  const ids=new Set(ruins.map(ruin=>ruin.id));
  const tasks=new Set(s.tasks.filter(task=>ids.has(task.targetId))
    .map(task=>task.id));
  for(const worker of s.workers.filter(item=>tasks.has(item.taskId))){
    releaseTask(s,worker);worker.path=null;worker.status='idle';
    notifyWorkerPlanningChange(s,worker);
  }
  replaceTasks(s,s.tasks.filter(task=>!ids.has(task.targetId)));
  s.structures=s.structures.filter(item=>!ids.has(item.id));
  return ruins;
}
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
// A previously valid path remains valid after building a wall when each of its
// physical segments misses the wall's expanded collision bounds. This broad
// phase may request an unnecessary full proof, but never certifies a route
// close to a new barrier. Removed props and opened gates cannot block it.
function routeClearOfNewWalls(start,route,end,walls){
  if(!Array.isArray(route))return false;
  const points=[start,...route,end];
  for(const wall of walls){
    const [minX,minZ,maxX,maxZ]=wallCollisionBounds(wall,.30);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(![a?.x,a?.z,b?.x,b?.z].every(Number.isFinite))return false;
      if(Math.max(a.x,b.x)>=minX&&Math.min(a.x,b.x)<=maxX&&
         Math.max(a.z,b.z)>=minZ&&Math.min(a.z,b.z)<=maxZ)return false;
    }
  }
  return true;
}
function planNewWallGates(s,newPieces,nav,blockedPieces,cropOverlap){
  if(!newPieces.length)return [];
  const living=activeCrops(s.plants);
  const newIds=new Set(newPieces.map(p=>p.created));
  const wallSettings=Object.fromEntries(B.walls.map(w=>[w.id,w.hp]));
  let layout=wallLayout([...s.structures,...newPieces],wallSettings);
  const originals=new Map([...s.structures,...newPieces].map(p=>[p.created,p]));
  const suppressedForGates=new Set(nav.suppressed);
  for(const piece of newPieces)for(const id of nav.wallPlacement(piece).suppress??[])suppressedForGates.add(id);
  const overlayUnavailable=Symbol('local wall overlay unavailable');
  let localOverlay=null;
  const canHostCandidate=p=>{
    const original=originals.get(p.id);if(!original)return false;
    const candidate={...original,gate:true},check=nav.wallPlacement(candidate);
    if(!check.valid||cropOverlap(candidate))return false;
    const points=gatePortalPoints(candidate);if(points.length!==2)return false;
    if(nav.wallWorkerReachability){
      const overlay=localOverlay??nav.wallLocalOverlay?.(newPieces,
        [...suppressedForGates,...check.suppress??[]]);
      return overlay?.gateClear(candidate,points)===true;
    }
    if(nav.withWallPreview){
      if(localOverlay){
        if((check.suppress??[]).some(id=>!nav.suppressed.has(id)))throw overlayUnavailable;
        const clear=localOverlay.gateClear(candidate,points);
        if(clear===null)throw overlayUnavailable;
        return clear;
      }
      const local=nav.gateOverlayClear?.(candidate,points,check.suppress??[]);
      if(local!==null&&local!==undefined)return local;
      const proposed=newPieces.map(piece=>piece.created===p.id?candidate:piece);
      return nav.withWallPreview(proposed,[...suppressedForGates,...check.suppress??[]],draft=>
        points.every(point=>draft.walkable(point.x,point.z,.28,null,true))&&
        draft.segmentClear(points[0],points[1],.28,null,true));
    }
    const draft=nav.forBuildingPlacement(candidate);
    draft.obstacles=[...nav.obstacles.filter(o=>o.kind!=='wall'),...layout.pieces.filter(q=>originals.get(q.id)?.status!=='ruined').map(q=>({...originals.get(q.id),gate:q.id===p.id||q.kind==='gate'}))];
    draft.suppressed=new Set([...suppressedForGates,...check.suppress??[]]);
    return points.every(point=>draft.walkable(point.x,point.z,.28,null,true))&&draft.segmentClear(points[0],points[1],.28,null,true);
  };
  const interior=nav.withWallPreview?null:nav.forBuildingPlacement(newPieces[0]??s.structures[0]);
  if(interior){interior.obstacles=[...nav.obstacles.filter(o=>o.kind!=='wall'),...[...s.structures,...newPieces].filter(p=>p.kind==='wall'&&p.status!=='ruined')];interior.suppressed=suppressedForGates;}
  const omitted=blockedPieces.map(piece=>{const h=piece.baseScaleX*2.18/2,dx=Math.cos(piece.yaw)*h,dz=-Math.sin(piece.yaw)*h;return [[piece.x-dx,piece.z-dz],[piece.x+dx,piece.z+dz]];});
  const cropsByCenter=new Map();
  for(const crop of living)if(crop.alive){
    const plants=cropsByCenter.get(crop.centerId)??[];plants.push(crop);cropsByCenter.set(crop.centerId,plants);
  }
  const targets=s.structures.filter(operational).map(center=>{
    const plants=cropsByCenter.get(center.id)??[];
    return plants.length?{x:plants.reduce((sum,q)=>sum+q.x,0)/plants.length,z:plants.reduce((sum,q)=>sum+q.z,0)/plants.length}:centerServicePoint(center,s,.8);
  }),scores=new Map();
  const rank=(p,face)=>{
    if(face.ids.some(id=>id>0&&!newIds.has(id)))return -p.id;
    // Rank plausible doors geometrically; the native read-only overlay below
    // certifies actual worker access before the quote can be purchased.
    if(!scores.has(p.id))scores.set(p.id,Math.min(...targets.flatMap(target=>
      s.villages.map(v=>dist(v.entry??v,p)+dist(p,target)))));
    return scores.get(p.id);
  };
  let unhosted=false,unhostedWorker=false;
  const ensure=isFree=>ensureBoundaryGates(layout,nav,canHostCandidate,isFree,omitted,rank,p=>newIds.has(p.id),face=>{
    unhosted=true;
    const polygon=face.polygon.map(([x,z])=>({x,z}));
    if(s.workers.some(w=>w.status!=='home'&&containsPoint(polygon,w.x,w.z)))unhostedWorker=true;
  });
  if(nav.wallWorkerReachability){
    localOverlay=nav.wallLocalOverlay?.(newPieces,[...suppressedForGates]);
    if(!localOverlay)unhostedWorker=true;
    else{
      try{
        ensure((x,z)=>{
          const clear=localOverlay.walkable(x,z);
          if(clear===null)throw overlayUnavailable;
          return clear;
        });
      }catch(error){
        if(error!==overlayUnavailable)throw error;
        unhostedWorker=true;
      }
      localOverlay=null;
    }
  }else if(nav.withWallPreview){
    localOverlay=nav.wallLocalOverlay?.(newPieces,[...suppressedForGates]);
    let localComplete=false;
    if(localOverlay){
      try{
        ensure((x,z)=>{
          const clear=localOverlay.walkable(x,z);
          if(clear===null)throw overlayUnavailable;
          return clear;
        });
        localComplete=true;
      }catch(error){
        if(error!==overlayUnavailable)throw error;
        // Discard temporary gate choices before the full-preview fallback.
        layout=wallLayout([...s.structures,...newPieces],wallSettings);
        unhosted=false;unhostedWorker=false;
      }
      localOverlay=null;
    }
    if(!localComplete){
      nav.withWallPreview(newPieces,[...suppressedForGates],draft=>
        ensure((x,z)=>draft.walkable(x,z,.28,null,true)));
    }
  }else ensure((x,z)=>interior.walkable(x,z,.28,null,true));
  const converted=layout.pieces.filter(p=>newIds.has(p.id)&&p.autoGate&&!s.structures.some(e=>e.id===p.entityId&&e.autoGate));
  const updates=converted.map(p=>({id:p.entityId,gate:true,autoGate:true,maxHp:p.maxHp,hp:p.hp})).filter(update=>{const piece=[...s.structures,...newPieces].find(p=>p.id===update.id),candidate={...piece,...update};return nav.wallPlacement(candidate).valid&&!cropOverlap(candidate);});
  if(nav.wallWorkerReachability){
    // One shared native connectivity query per village and direction replaces
    // the old route-before/route-after loop over every worker and center.
    // A positive answer is a physical certificate; unknown never proves a
    // blocked route or an available escape.
    const witnesses=s.villages.map(village=>({
      entry:village.entry??village,
      centers:s.structures.filter(center=>operational(center)&&
        center.villageId===village.id).map(center=>centerServicePoint(center,s,.8)),
      // A fleeing worker with no route is already in recovery. Treating an
      // inconclusive pre-existing return as an access lost by this proposal
      // can prevent every legal wall purchase, even when the worker is
      // outside the proposed enclosure. Active routes are still protected.
      workers:s.workers.filter(worker=>worker.status!=='home'&&
        worker.villageId===village.id&&
        !(worker.status==='fleeing'&&!worker.path))
    }));
    const obligations=[];
    let unresolvedAccess=false;
    for(const {entry,centers,workers} of witnesses){
      // Legacy/synthetic layouts can place a service center over the village
      // entry itself. No worker route can start or end on that blocked point.
      if(!nav.walkable(entry.x,entry.z,.28,null,true))continue;
      for(const [targets,reverse] of [[centers,false],[workers,true]]){
        if(!targets.length)continue;
        const before=nav.wallWorkerReachability(entry,targets,[],[],reverse);
        if(!before){unresolvedAccess=true;continue;}
        const required=[];
        for(let i=0;i<targets.length;i++){
          if(before[i]==='found')required.push(targets[i]);
          else if(before[i]==='unknown'&&
            nav.walkable(targets[i].x,targets[i].z,.28,null,true))
            unresolvedAccess=true;
        }
        if(required.length)obligations.push({entry,targets:required,reverse});
      }
    }
    const proposed=()=>newPieces.map(piece=>({...piece,...updates.find(u=>u.id===piece.id)}));
    const preservesAccess=()=>!unresolvedAccess&&obligations.every(
      ({entry,targets,reverse})=>{
        const after=nav.wallWorkerReachability(entry,targets,proposed(),
          [...suppressedForGates],reverse);
        return after?.every(value=>value==='found')===true;
      });
    if(!unhostedWorker&&!preservesAccess()){
      let restored=false;
      for(const piece of newPieces){
        if(piece.gate||updates.some(u=>u.id===piece.id))continue;
        const candidate={...piece,gate:true,autoGate:true,
          maxHp:layout.settings.hp[piece.material]*.6,
          hp:piece.hp/piece.maxHp*layout.settings.hp[piece.material]*.6};
        if(!nav.wallPlacement(candidate).valid||cropOverlap(candidate)||
          !canHostCandidate(layout.pieces.find(p=>p.id===piece.created)))continue;
        updates.push({id:piece.id,gate:true,autoGate:true,
          maxHp:candidate.maxHp,hp:candidate.hp});
        if(preservesAccess()){restored=true;break;}
        updates.pop();
      }
      if(!restored)unhostedWorker=true;
    }
  }else if(nav.withWallPreview){
    // A single new module can close a passage against rocks, buildings or a
    // canyon edge without completing a wall-only face. Preserve existing
    // worker/center routes for every paid stroke, including gradual edits.
    const witnesses=[];
    for(const center of s.structures.filter(operational)){
      const village=s.villages.find(v=>v.id===center.villageId);
      if(village)witnesses.push([village.entry??village,centerServicePoint(center,s,.8)]);
    }
    for(const worker of s.workers.filter(w=>w.status!=='home')){
      const village=s.villages.find(v=>v.id===worker.villageId);
      if(village)witnesses.push([worker,village.entry??village]);
    }
    const known=(routes,a,b)=>{
      try{return routes.path(a,b,.28,null,true);}
      catch(error){if(error.name==='SpatialChunkUnavailable')return null;throw error;}
    };
    const reachable=witnesses.map(([a,b])=>({a,b,route:known(nav,a,b)}))
      .filter(({route})=>Array.isArray(route));
    const proposed=()=>newPieces.map(piece=>({...piece,...updates.find(u=>u.id===piece.id)}));
    const preserved=()=>{
      const walls=proposed();
      const affected=reachable.filter(({a,b,route})=>
        !routeClearOfNewWalls(a,route,b,walls));
      if(!affected.length)return true;
      return nav.withWallPreview(walls,[...suppressedForGates],draft=>
        affected.every(({a,b})=>Boolean(known(draft,a,b))),true);
    };
    if(reachable.length&&!preserved()){
      let routesPreserved=false;
      for(const piece of newPieces){
        if(piece.gate||updates.some(u=>u.id===piece.id))continue;
        const candidate={...piece,gate:true,autoGate:true,
          maxHp:layout.settings.hp[piece.material]*.6,
          hp:piece.hp/piece.maxHp*layout.settings.hp[piece.material]*.6};
        if(!nav.wallPlacement(candidate).valid||cropOverlap(candidate)||
          !canHostCandidate(layout.pieces.find(p=>p.id===piece.created)))continue;
        const update={id:piece.id,gate:true,autoGate:true,maxHp:candidate.maxHp,hp:candidate.hp};
        updates.push(update);
        if(preserved()){routesPreserved=true;break;}
        updates.pop();
      }
      // Every failed candidate was rolled back to the already-failed plan.
      // Rechecking that same plan would rebuild its draft and repeat routes.
      if(!routesPreserved)unhostedWorker=true;
    }
  }
  return Object.assign(updates,{unhosted,unhostedWorker});
}
// Geometry/price quote is read-only and may describe a future purchase. Actual
// preview/build still enforce available cash and the native hiring reserve.
export function quoteWallChain(s,material,points,nav,options={}) {
  if(!permission(s,'wall'))throw new Error('Esta acción no está disponible ahora');
  // A multi-arc enclosure is one atomic quote: gate selection must see every
  // proposed module before deciding whether the combined boundary is closed.
  const strokes=Array.isArray(points[0]?.[0])?points:[points];
  const spec=wallSpec(material),strokeSlots=strokes.map(stroke=>
    wallStroke(stroke,s.structures,{...options,maxPieces:Infinity}));
  const sampled=strokeSlots.flat();
  const slots=strokes.length===1?sampled:[];
  if(strokes.length>1)for(const slot of sampled)if(!slots.some(other=>
    Math.hypot(other.x-slot.x,other.z-slot.z)<.35&&
    Math.abs(Math.sin(other.angle-slot.angle))<.18))slots.push(slot);
  const living=activeCrops(s.plants);
  const cropOverlap=piece=>{const c=Math.cos(piece.yaw),sn=Math.sin(piece.yaw),scale=piece.gate?(piece.material==='reforzado'?1.6:['adobe','piedra'].includes(piece.material)?1.4:1):1;return living.some(p=>p.alive&&Math.abs((p.x-piece.x)*c-(p.z-piece.z)*sn)<1.09*(piece.baseScaleX??1)*scale+.4&&Math.abs((p.x-piece.x)*sn+(p.z-piece.z)*c)<.22*scale+.4);};
  const blockedPieces=[],blockedCrops=[];
  const newPieces=slots.map(slot=>({kind:'wall',material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle,maxHp:spec.hp,hp:spec.hp,status:'intact',cost:spec.cost,collapseRemaining:0,villageId:nearest(s.villages,{x:slot.x,z:slot.z})?.id})).filter(piece=>{if(!nav.wallPlacement(piece).valid){blockedPieces.push(piece);return false;}if(cropOverlap(piece)){blockedCrops.push(piece);return false;}return true;}).slice(0,Math.max(0,Math.floor(options.maxPieces??Infinity)));
  newPieces.forEach((piece,i)=>Object.assign(piece,{id:`structure-${s.nextId+i}`,created:s.sequence+i}));
  const gatePlan=planNewWallGates(s,newPieces,nav,blockedPieces,cropOverlap);
  if(gatePlan.unhostedWorker||gatePlan.unhosted&&!gatePlan.length){
    // Enclosure planning needs an atomic closure. A missing worker gate
    // cannot be repaired by recursively trimming one wall at a time, and
    // the resulting partial quote would be rejected by its physical proof.
    if(options.requireComplete){
      const error=new Error('A complete wall quote would isolate workers');
      error.name='IncompleteWallQuote';throw error;
    }
    // The closing module remains unbuilt; the player can later edit the
    // stroke without trapping a worker in a room that has no usable door.
    return quoteWallChain(s,material,points,nav,{...options,
      _requestedMaxPieces:options._requestedMaxPieces??options.maxPieces??Infinity,
      maxPieces:newPieces.length-1});
  }
  const updates=gatePlan;
  for(const piece of newPieces){const update=updates.find(p=>p.id===piece.id);if(update)Object.assign(piece,update);}
  const checks=[...newPieces,...updates.filter(p=>!newPieces.some(e=>e.id===p.id)).map(p=>({...s.structures.find(e=>e.id===p.id),...p}))],suppressed=new Set();
  for(const piece of checks){
    const check=nav.wallPlacement(piece);
    for(const key of check.suppress??[])suppressed.add(key);
  }
  const cost=spec.cost*newPieces.length;
  const plan={pieces:newPieces,previewPieces:checks,updates,suppressed:[...suppressed],cost,gates:updates.length,
    repairableRuins:coincidentRuins(s,newPieces).map(ruin=>ruin.id),
    expectedSlots:slots,strokeSlots,strokeClosed:strokes.map(stroke=>
      stroke.length>=3&&Math.hypot(stroke[0][0]-stroke.at(-1)[0],
        stroke[0][1]-stroke.at(-1)[1])<1e-6),blockedPieces,blockedCrops};
  preparedWallQuotes.set(plan,{state:s,nav,material,points:JSON.stringify(points),
    smooth:options.smooth??true,snap:options.snap??true,
    maxPieces:options._requestedMaxPieces??options.maxPieces??Infinity,
    sequence:s.sequence,nextId:s.nextId,
    elapsed:s.elapsed,version:nav.version,structureCount:s.structures.length,
    plantCount:s.plants.length,workerCount:s.workers.length,
    quote:structuredClone(plan)});
  return plan;
}
export function previewWallChain(s,material,points,nav,options={}) {
  const plan=quoteWallChain(s,material,points,nav,options);
  if(compare(s.ledger.balance,rational(plan.cost))<0)throw new Error('No hay monedas suficientes para todo el trazado');
  return plan;
}
export function buildWallChain(s,id,material,points,nav,options={}) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  const prepared=preparedWallQuotes.get(options.preparedPlan);
  let plan;
  if(options.preparedPlan){
    if(!prepared||!Number.isFinite(nav.version)||prepared.state!==s||prepared.nav!==nav||
      prepared.material!==material||prepared.points!==JSON.stringify(points)||
      prepared.smooth!==(options.smooth??true)||
      prepared.snap!==(options.snap??true)||
      prepared.maxPieces!==(options.maxPieces??Infinity)||
      prepared.sequence!==s.sequence||prepared.nextId!==s.nextId||
      prepared.elapsed!==s.elapsed||prepared.version!==nav.version||
      prepared.structureCount!==s.structures.length||
      prepared.plantCount!==s.plants.length||
      prepared.workerCount!==s.workers.length)
      throw Error('La cotización de la muralla ha caducado');
    plan=prepared.quote;
    if(compare(s.ledger.balance,rational(plan.cost))<0)
      throw Error('No hay monedas suficientes para todo el trazado');
    preparedWallQuotes.delete(options.preparedPlan);
  }else plan=previewWallChain(s,material,points,nav,options);
  const newPieces=plan.pieces;
  if(!newPieces.length)return false;
  return commit(s,id,'wall',()=>{
    ensurePurchaseBudget(s,plan.cost);transact(s.ledger,id,rational(-plan.cost));
    const replaced=replaceCoincidentRuins(s,newPieces);
    for(const update of plan.updates){const existing=s.structures.find(e=>e.id===update.id);if(existing)Object.assign(existing,update);}
    s.structures.push(...newPieces);s.nextId+=newPieces.length;s.sequence+=newPieces.length;s.suppressed.push(...plan.suppressed.filter(key=>!s.suppressed.includes(key)));nav.setState(s);
    for(const ruin of replaced)emit(s,'WallRemoved',{
      targetId:ruin.id,refund:0,replacedBy:newPieces.find(piece=>
        Math.hypot(ruin.x-piece.x,ruin.z-piece.z)<.35)?.id});
    emit(s,'WallChainBuilt',{material,count:newPieces.length,gates:plan.gates,targetId:newPieces[0].id,presentation:{x:newPieces[0].x,z:newPieces[0].z}});
  });
}
export function removeWall(s,id,targetId,nav) {
  return commit(s,id,'wall',()=>{
    const target=s.structures.find(e=>e.id===targetId&&e.kind==='wall');if(!target)throw new Error('No existe esa defensa');
    const tasks=new Set(s.tasks.filter(t=>t.targetId===targetId).map(t=>t.id));
    for(const worker of s.workers.filter(w=>tasks.has(w.taskId))){releaseTask(s,worker);worker.path=null;worker.status='idle';notifyWorkerPlanningChange(s,worker);}
    replaceTasks(s,s.tasks.filter(t=>t.targetId!==targetId));s.structures=s.structures.filter(e=>e.id!==targetId);nav.setState(s);
    const refund=wallRefund(target);transact(s.ledger,id,refund);
    // Removal opens the graph: never call ensureAutomaticGates here or on reload.
    emit(s,'WallRemoved',{targetId,refund:numberOf(refund)});
  });
}
export function plant(s,id,species,x,z,nav) {
  const check=nav.placement(x,z,.4);
  if(!check.valid)throw new Error(check.reason);
  if(activeCrops(s.plants).some(p=>p.alive&&dist(p,{x,z})<1.1))throw new Error('Necesitas separar las plantas');
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
  const living=activeCrops(s.plants),p=living.find(p=>p.id===plantId&&isMature(p));if(!p)throw new Error('Este cultivo todavía no está maduro');
  return commit(s,id,'harvest',()=>{
    const group=contiguousGroup(living,p).filter(isMature);
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
  notifyWorkerPlanningChange(s,s.workers.at(-1));
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
  const living=activeCrops(s.plants);
  const centers=s.structures.filter(operational).map(c=>({...c,plants:living.filter(p=>p.alive&&p.centerId===c.id).length}));
  const total=Object.values(selection).reduce((a,b)=>a+b,0),quotas=allocateWorkers(centers,total),assigned=distributeProfiles(quotas,selection);
  for(const w of s.workers)w.contractDay??=s.hiringPaidDay??s.day-1;
  const previousWorkers=s.workers;
  s.workers=s.workers.filter(w=>contractExpired(w,s)&&w.status!=='home');
  notifyWorkerPlanningRoster(s,previousWorkers,s.workers);
  for(const worker of s.workers)notifyWorkerPlanningChange(s,worker);
  const usedPeople=new Set(s.workers.map(w=>w.personId));
  const add=(profileId,centerId)=>{
    addHiredWorker(s,profileId,centerId,usedPeople);
  };
  for(const [centerId,profiles] of Object.entries(assigned))for(const p of profiles)add(p,centerId);
  if(!centers.length)for(const p of PROFILES)for(let i=0;i<(selection[p.id]??0);i++)add(p.id,null);
  s.commandIds.push(id);s.hiringSelection={...selection};s.hiringPaidDay=s.day;s.initialPreparation=false;resume(s,'hiring');rebuildTasks(s);planDay(s);
  if(s.tutorial.step==='hire')s.tutorial.step='observe';emit(s,'HiringConfirmed',{count:total,cost});
}
export function openInitialHiring(s) {if(s.structures.some(operational)&&activeCrops(s.plants).some(p=>p.alive)&&s.hiringPaidDay!==s.day)pause(s,'hiring');}
function queueMatureHarvest(s,p,queue) {
  if(!isMature(p))return;
  if(!p.harvestRequested){p.harvestRequested=true;emit(s,'HarvestRequested',{targetId:p.id,count:1,automatic:true});}
  if(!s.raid&&s.structures.some(c=>c.id===p.centerId&&operational(c))){if(queue)queue(p.centerId,'harvest',p.id);else enqueue(s,p.centerId,'harvest',p.id);}
}
export function rebuildTasks(s) {
  const committed=new Set(s.workers.filter(w=>contractExpired(w,s)&&w.status==='acting').map(w=>w.taskId));
  replaceTasks(s,s.tasks.filter(t=>committed.has(t.id)));
  for(const w of s.workers){
    cancelIdle(w);
    if(committed.has(w.taskId)&&s.tasks.some(t=>t.id===w.taskId&&t.workerId===w.id))continue;
    const previousTask=w.taskId,previousStatus=w.status;
    w.taskId=null;w.taskApproach=null;if(['walking','acting'].includes(w.status))w.status='idle';
    if(previousTask!==w.taskId||previousStatus!==w.status)notifyWorkerPlanningChange(s,w);
  }
  for(const p of activeCrops(s.plants)) {
    if(!p.alive)continue;
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
  const living=activeCrops(s.plants);
  const available=w=>!w.incapacitated&&!contractExpired(w,s)&&s.time<profile(w).end;
  for(const w of s.workers){
    const lost=w.centerId&&!s.structures.some(c=>c.id===w.centerId&&operational(c));
    if(lost&&available(w))w.displacedDay??=s.day;
  }
  for(const village of s.villages){
    const centers=s.structures.filter(c=>operational(c)&&c.villageId===village.id)
      .map(c=>({...c,plants:living.filter(p=>p.alive&&p.centerId===c.id).length}));
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
      notifyWorkerPlanningChange(s,w);
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
  const crate=activeCrates(s.crates).find(c=>c.id===worker.crateId);
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
export const spellRadius=id=>({shield:1.95,growth:.65,multiply:.65})[id]; // Agricultural radius is visual only; gameplay uses the plant identity.
const agriculturalSpellIndex=new WeakMap();
export function spellAt(s,id,p) {
  if(!s.spells.length)return undefined;
  let index=agriculturalSpellIndex.get(s);
  if(!index||index.source!==s.spells||index.length!==s.spells.length){
    index={source:s.spells,length:s.spells.length,targets:new Map(),areas:[]};
    for(const a of s.spells)if(a.targetPlantId!==undefined){
      if(!index.targets.has(a.kind))index.targets.set(a.kind,new Map());
      index.targets.get(a.kind).set(a.targetPlantId,a);
    }else index.areas.push(a);
    agriculturalSpellIndex.set(s,index);
  }
  const a=index.targets.get(id)?.get(p.id);
  return a?.remaining>0?a:index.areas.find(a=>a.kind===id&&a.remaining>0&&dist(a,p)<=a.radius);
}
function markMultiplyTargets(s,area){
  for(const p of activeCrops(s.plants))if(p.alive&&(area.targetPlantId!==undefined?p.id===area.targetPlantId:dist(area,p)<=area.radius))p.multiplyHarvest=true;
  area.exposureApplied=true;
}
export function previewSpell(s,kind,x,z,nav,targetPlantId) {
  const draft={kind,x,z,radius:spellRadius(kind),valid:false,reason:null};
  try {
    validateSpell(s,kind,x,z,nav,targetPlantId);draft.valid=true;
  } catch(error) {draft.reason=error.message;}
  return draft;
}
function agriculturalTarget(s,kind,x,z,targetPlantId){
  if(kind==='shield')return null;
  const p=activeCrops(s.plants).find(p=>p.alive&&(targetPlantId!==undefined?p.id===targetPlantId:p.x===x&&p.z===z));
  if(!p||p.x!==x||p.z!==z)throw new Error('Selecciona una planta para aplicar esta magia');
  if(kind==='growth'&&isMature(p))throw new Error('Esta planta ya está madura');
  return p;
}
function validateSpell(s,kind,x,z,nav,targetPlantId) {
  const spec=B.spells.find(p=>p.id===kind);if(!spec)throw new Error('Magia desconocida');
  if(!spellUnlocked(s,kind))throw new Error('El Espíritu todavía no ha revelado esta magia');
  if(kind==='shield'&&s.cooldowns[kind]>0)throw new Error('La magia está recargando');
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new Error('Ubicación mágica inválida');
  const radius=spellRadius(kind);
  const target=agriculturalTarget(s,kind,x,z,targetPlantId);
  if(s.spells.some(a=>a.remaining>0&&(target?
    a.targetPlantId!==undefined?a.targetPlantId===target.id||dist(a,target)<1e-6:dist(a,target)<=a.radius:
    a.targetPlantId!==undefined?dist(a,{x,z})<=radius:dist(a,{x,z})<a.radius+radius)))throw new Error('Las áreas mágicas no pueden solaparse');
  if(kind==='shield'&&s.raid?.animals.some(a=>a.status!=='gone'&&dist(a,{x,z})<radius+a.radius))throw new Error('El Escudo solapa un animal');
  if(!permission(s,kind))throw new Error('Esta acción no está disponible ahora');
  return spec;
}
export function cast(s,id,kind,x,z,nav,targetPlantId) {
  if(s.commandIds.includes(id)||Object.hasOwn(s.ledger.entries,id))return false;
  const spec=validateSpell(s,kind,x,z,nav,targetPlantId),radius=spellRadius(kind);
  const target=agriculturalTarget(s,kind,x,z,targetPlantId);
  return commit(s,id,kind,()=>{
    const area={id:`spell-${s.nextId++}`,kind,x,z,radius,remaining:spec.duration_seconds};
    if(target)area.targetPlantId=target.id;
    if(target){area.power=commitAgriculturalPower(s,target,kind,cropSpec(target.species).base_harvest_value);if(kind==='multiply'){target.multiplyHarvest=true;area.exposureApplied=true;}}
    s.spells.push(area);s.cooldowns[kind]=kind==='shield'?spec.cooldown_seconds:0;
    if(kind==='shield')nav.setState(s);
    emit(s,'SpellActivated',{kind,x,z,targetPlantId:target?.id,benefited:area.power?.benefited??false,power:area.power??null,duration:spec.duration_seconds});
  });
}
function retainRouteAfterWallChange(w,destination,nav){
  const stamp=activeRouteStamps.get(w);
  if(w.path&&w.pathVersion===nav.version&&nav.routeStamp&&
    nav.ownsRoute?.(w.path)===true&&
    (stamp?.path!==w.path||stamp?.nav!==nav||stamp?.version!==nav.version))
    activeRouteStamps.set(w,{path:w.path,nav,version:nav.version,
      spatial:nav.routeStamp()});
  if(w.path&&w.pathVersion!==nav.version&&!w.wallEscape&&
    w.destinationId===destination.id&&stamp?.path===w.path&&
    stamp.nav===nav&&stamp.version===w.pathVersion&&
    nav.routeUnaffectedByWalls?.(stamp.spatial,[w,...w.path],w.radius??.28)){
    w.pathVersion=nav.version;
    activeRouteStamps.set(w,{path:w.path,nav,version:nav.version,
      spatial:nav.routeStamp()});
  }
}
export function walkTo(s,w,destination,dt,nav,{speed=L.walkMetresPerSecond,ignore=null,worker=true,motion=null,expandRoute=false,routeVia=null,externallyPlanned=false}={}) {
  const previous={x:w.x,z:w.z};
  if(worker)w.running=false;
  if(w.exitRouteRecovery&&
    (w.exitRouteRecovery.destinationId!==destination.id||w.exitRouteRecovery.version!==nav.version))
    delete w.exitRouteRecovery;
  const abandonExhaustedExit=()=>{
    const exhausted=w.exitConnectorSearch?.exhausted===true,
      timedOut=w.exitRouteRecovery&&s.elapsed-w.exitRouteRecovery.startedAt>=
        (w.exitRouteRecovery.reason==='no-exit-progress'?300:1500);
    if(worker||!expandRoute||w.status!=='retreating'||
      (!exhausted&&!timedOut)||animalNativeExitBridgePending(w,destination,nav))return false;
    emit(s,'AnimalRetreatExitAbandoned',{actorId:w.id,x:w.x,z:w.z,elapsed:s.elapsed,
      reason:exhausted?'bounded-search-exhausted':'recovery-timeout',
      hitsRemaining:w.hitsRemaining??0,
      seconds:s.elapsed-(w.exitRouteRecovery?.startedAt??s.elapsed)});
    delete w.exitConnectorSearch;delete w.exitRouteRecovery;w.path=null;
    return true;
  };
  const recoverExitRoute=reason=>{
    // Keep one recovery episode across connector attempts. A newly proposed
    // route can fail at the same static edge on the next tick; resetting the
    // deadline there would allow an exhausted raid to run indefinitely.
    if(w.exitRouteRecovery?.destinationId===destination.id&&
      w.exitRouteRecovery.version===nav.version)return;
    w.exitRouteRecovery={destinationId:destination.id,version:nav.version,
      startedAt:s.elapsed,x:w.x,z:w.z,reason};
    emit(s,'AnimalExitRouteRecovery',{actorId:w.id,x:w.x,z:w.z,
      exitId:destination.id,reason});
  };
  if(w.exitRouteRecovery&&!w.path&&abandonExhaustedExit())return true;
  if(w.mobileRecoveryDestinationId!==destination.id||
    w.mobileRecoveryVersion!==nav.version){
    if(w.mobileYield)nav.motionObserver?.({kind:'workerYieldEnd',actorId:w.id,
      blockerId:w.mobileYield.blockerId,elapsed:s.elapsed,
      duration:s.elapsed-w.mobileYield.startedAt,reason:'destination-or-revision'});
    delete w.mobileYield;
    w.mobileRecoveryDestinationId=destination.id;
    w.mobileRecoveryVersion=nav.version;
    w.mobileRecoveryAttempts=0;
    w.mobileProgressDistance=dist(w,destination);
    w.mobileProgressAt=s.elapsed;
    delete w.retreatStaticRouteFailure;
  }
  if(!Number.isFinite(w.mobileProgressDistance)||!Number.isFinite(w.mobileProgressAt)){
    w.mobileProgressDistance=dist(w,destination);
    w.mobileProgressAt=s.elapsed;
  }
  retainRouteAfterWallChange(w,destination,nav);
  if(w.wallEscape&&w.pathVersion!==nav.version)delete w.wallEscape;
  // An intention-owned route is reconsidered only at a confirmed navigation
  // event boundary. Movement must not silently invoke the legacy planner.
  if(externallyPlanned&&(!w.path||w.destinationId!==destination.id||
    w.pathVersion!==nav.version))return false;
  if(!w.path||w.destinationId!==destination.id||w.pathVersion!==nav.version) {
    const epoch=routeEpoch(nav,w,destination,worker);
    const wait=routePlanWaits.get(w);
    const pendingSearch=!!w.exitRouteRecovery||!!w.exitConnectorSearch&&!w.exitConnectorSearch.exhausted||
      !worker&&expandRoute&&animalNativeExitBridgePending(w,destination,nav)||
      worker&&(workerReturnRoutePending(nav,w)||workerFractionalConnectorPending(nav,w));
    if(!nav.forcePlanningPoll&&!pendingSearch&&!w.path&&wait?.epoch===epoch&&s.elapsed<wait.retryAt){
      nav.planningObserver?.({kind:'routeDeferred',actorId:w.id,elapsed:s.elapsed,destinationId:destination.id});
      return abandonExhaustedExit();
    }
    if(w.exitRouteRecovery){
      nav.planningObserver?.({kind:'routeRecoveryStep',actorId:w.id,
        elapsed:s.elapsed,destinationId:destination.id});
      // A prior connector may have failed at a fractional landing even when
      // the current position has a valid route around it. Retry the native
      // planner once per recovery episode, then use the bounded physical
      // connector if that route is unavailable or rejected again.
      if(!w.exitRouteRecovery.normalRetryDone){
        w.path=nav.path?.(w,destination,w.radius??.28,ignore,worker)??null;
        w.exitRouteRecovery.normalRetryDone=true;
      }
      if(!w.path)w.path=animalExitConnector(w,destination,nav);
      if(!w.path)return abandonExhaustedExit();
    }else{
      nav.planningObserver?.({kind:worker&&pendingSearch?'routeRecoveryStep':'routeRefresh',
        actorId:w.id,elapsed:s.elapsed,destinationId:destination.id});
      if(!worker&&expandRoute&&w.status==='retreating'&&
        nav.walkable?.(destination.x,destination.z,w.radius??.28,ignore,false)&&
        nav.segmentClear?.(w,destination,w.radius??.28,ignore,false)){
        // The confirmed straight exit is already a complete route. A grid
        // waypoint can be less usable than this continuous swept segment.
        w.path=[{x:destination.x,z:destination.z}];
      }else w.path=worker&&nav.workerPath?nav.workerPath(w,destination,w.radius??.28,ignore):nav.path(w,destination,w.radius??.28,ignore,worker);
    }
    w.destinationId=destination.id;
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
      if(!w.path){
        const recovery=animalWallOverlapRecovery(nav,w,destination,w.radius??.28);
        if(recovery){w.path=recovery.path;w.wallEscape={exit:recovery.exit,
          wallIds:recovery.wallIds};
          emit(s,'AnimalWallOverlapRecovery',{actorId:w.id,x:w.x,z:w.z,
            wallIds:recovery.wallIds});}
      }
    }
    if(!w.path&&worker&&!ignore&&['fleeing','returning','incapacitated'].includes(w.status)){
      w.path=workerWallOverlapRecoveryPath(nav,w,destination,w.radius??.28);
      if(!w.path)w.path=workerSlopeRecoveryPath(nav,w,destination,w.radius??.28);
      if(!w.path)w.path=workerFractionalConnector(nav,w,destination,w.radius??.28);
      if(!w.path)w.path=workerReturnRoute(nav,w,destination,w.radius??.28);
    }
    w.pathVersion=nav.version;
    if(w.path&&nav.routeStamp)activeRouteStamps.set(w,
      {path:w.path,nav,version:nav.version,spatial:nav.routeStamp()});
    else activeRouteStamps.delete(w);
    if(!w.path){routePlanWaits.set(w,{epoch,retryAt:s.elapsed+ROUTE_RETRY_SECONDS});return abandonExhaustedExit();}
  }
  if(worker&&waitForGate(w,s.structures))return false;
  if(!worker&&w.wallEscape){
    const {exit,wallIds}=w.wallEscape,remaining=dist(w,exit);
    if(remaining>1e-8){
      const metres=movePath(w,Math.min(speed*dt,remaining),
        (a,b)=>nav.wallOverlapMotionClear(a,b,w.radius??.28,wallIds,false));
      w.motionPhase=(w.motionPhase??0)+metres/speed;
      if(metres>1e-8){w.heading=Math.atan2(w.x-previous.x,w.z-previous.z);
        w.dynamicStallSeconds=0;}
    }
    if(dist(w,exit)<=1e-7){delete w.wallEscape;
      if(w.path?.length&&dist(w,w.path[0])<=1e-7)w.path.shift();}
    return w.path?.length===0;
  }
  const stepMobileYield=()=>{
    const yielding=w.mobileYield;
    if(!worker||!yielding)return false;
    const point={x:yielding.x,z:yielding.z};
    const blockers=actorBlockers(s,w,true,8);
    if(dist(w,point)<=1e-5){
      if(yielding.pointReachedAt===undefined){
        yielding.pointReachedAt=s.elapsed;
        nav.motionObserver?.({kind:'workerYieldPointReached',actorId:w.id,
          blockerId:yielding.blockerId,elapsed:s.elapsed,
          travelSeconds:s.elapsed-yielding.startedAt});
      }
      const next=w.path?.[0],length=next?dist(w,next):0,
        probe=length>1e-8?{x:w.x+(next.x-w.x)*Math.min(.5,length)/length,
          z:w.z+(next.z-w.z)*Math.min(.5,length)/length}:null;
      if(!probe||actorSegmentClear(w,probe,w,blockers)){
        nav.motionObserver?.({kind:'workerYieldEnd',actorId:w.id,
          blockerId:yielding.blockerId,elapsed:s.elapsed,
          duration:s.elapsed-yielding.startedAt,
          waitSeconds:s.elapsed-yielding.pointReachedAt,reason:'rejoined'});
        delete w.mobileYield;w.mobileProgressAt=s.elapsed;
        w.mobileProgressDistance=dist(w,destination);
        return false;
      }
      return true;
    }
    const path=w.path;
    w.path=[point];
    const clear=(a,b)=>nav.workerMotionClear?.(a,b,w.radius??.28)&&
      actorSegmentClear(a,b,w,blockers);
    if(motion)moveWorker(w,dt,{...motion,gates:s.structures,clear});
    else{
      const metres=movePathWithGates(w,speed*dt,s.structures,clear);
      w.motionPhase=(w.motionPhase??0)+metres/speed;
    }
    w.path=path;
    if(dist(previous,w)>1e-8){w.heading=Math.atan2(w.x-previous.x,w.z-previous.z);
      w.dynamicStallSeconds=0;}
    else w.dynamicStallSeconds=Math.min(3,(w.dynamicStallSeconds??0)+dt);
    return true;
  };
  if(stepMobileYield())return false;
  // The ordinary local avoidance remains first. Only after stationary time
  // or prolonged movement without destination progress, and only when a short
  // static step is valid but occupied by another moving body, temporarily
  // ignore mobile collisions. Static terrain,
  // barriers and the live gate leaf remain authoritative throughout.
  const next=w.path[0],distanceToNext=next?dist(w,next):0;
  if(!worker&&expandRoute&&next&&s.elapsed-w.mobileProgressAt>=12&&
    nav.segmentClear?.(w,next,w.radius??.28,ignore,false)===false){
    w.path=null;
    recoverExitRoute('stale-static-connector');
    return false;
  }
  const probe=next&&distanceToNext>1e-8?{
    x:w.x+(next.x-w.x)*Math.min(.5,distanceToNext)/distanceToNext,
    z:w.z+(next.z-w.z)*Math.min(.5,distanceToNext)/distanceToNext}:null;
  const stationarySeconds=w.dynamicStallSeconds??0,
    destinationStallSeconds=s.elapsed-w.mobileProgressAt;
  if((stationarySeconds>=3||destinationStallSeconds>=12)&&
    (w.mobileRecoveryAttempts??0)<2&&probe){
    const blockers=actorBlockers(s,w,worker);
    const staticClear=worker?nav.workerMotionClear?.(w,probe,w.radius??.28):
      nav.segmentClear?.(w,probe,w.radius??.28,ignore,false);
    // An animal can phase around a mobile body occupying its destination;
    // attack initiation still checks approach occupancy, and movement below
    // continues to validate every static segment.
    if(staticClear&&(!worker||
      actorSegmentClear(destination,destination,w,blockers))&&
      !actorSegmentClear(w,probe,w,blockers)){
      const yieldingBlocker=worker&&nav.motionProbeYield?blockers.find(body=>
        s.workers.includes(body)&&!actorSegmentClear(w,probe,w,[body])):null;
      const blocker=yieldingBlocker??(worker?blockers.find(body=>
        s.workers.includes(body)&&!actorSegmentClear(w,probe,w,[body])):null);
      const yieldPoint=blocker?workerYieldPoint(s,w,blocker,nav,blockers):null;
      w.dynamicStallSeconds=0;
      w.mobileRecoveryAttempts=(w.mobileRecoveryAttempts??0)+1;
      w.mobileProgressDistance=dist(w,destination);
      w.mobileProgressAt=s.elapsed;
      if(yieldPoint){
        w.mobileYield={destinationId:destination.id,version:nav.version,
          blockerId:blocker.id,x:yieldPoint.x,z:yieldPoint.z,startedAt:s.elapsed};
        nav.motionObserver?.({kind:'workerYieldStart',actorId:w.id,
          blockerId:blocker.id,elapsed:s.elapsed,point:yieldPoint});
        if(stepMobileYield())return false;
      }
      w.mobilePhaseRemaining=3;
      nav.motionObserver?.({kind:'mobileCollisionRecovery',actorId:w.id,
        status:w.status,elapsed:s.elapsed,
        trigger:stationarySeconds>=3?'stationary':'destination-stall',
        stationarySeconds,destinationStallSeconds,
        ...(nav.motionProbeYield?{yieldPoint,blockerId:yieldingBlocker?.id??null}:{})});
      emit(s,'ActorMobileCollisionRecovery',{actorId:w.id,
        x:w.x,z:w.z,elapsed:s.elapsed,duration:3});
    }
  }
  const phased=(w.mobilePhaseRemaining??0)>0;
  const dynamicClear=phased?
    (worker?(a,b)=>nav.workerMotionClear?.(a,b,w.radius??.28)??
      nav.segmentClear?.(a,b,w.radius??.28,ignore,true)??false:null):
    prepareActorMotion(s,w,nav,worker);
  const routeClearance=worker?workerRiskClearance(w,nav,{radius:w.radius??.28,ignore},dynamicClear):animalRouteClearance(w,nav,{radius:w.radius??.28,ignore,escapeProps:expandRoute},dynamicClear);
  const clear=routeClearance?.clear??dynamicClear;
  if(motion)moveWorker(w,dt,{...motion,gates:worker?s.structures:[],clear});else {
    const metres=worker?movePathWithGates(w,speed*dt,s.structures,clear):movePath(w,speed*dt,clear);w.motionPhase=(w.motionPhase??0)+metres/speed;
  }
  if(dist(previous,w)>1e-9)w.heading=Math.atan2(w.x-previous.x,w.z-previous.z);
  if(phased)w.mobilePhaseRemaining=Math.max(0,w.mobilePhaseRemaining-dt);
  if(dist(previous,w)>1e-8||!w.path?.length)w.dynamicStallSeconds=0;
  else w.dynamicStallSeconds=Math.min(3,(w.dynamicStallSeconds??0)+dt);
  const remaining=dist(w,destination);
  if(remaining<=w.mobileProgressDistance-.75){
    w.mobileProgressDistance=remaining;
    w.mobileProgressAt=s.elapsed;
    delete w.retreatStaticRouteFailure;
  }
  if(w.exitRouteRecovery&&Number.isFinite(w.exitRouteRecovery.x)&&
    dist(w,w.exitRouteRecovery)>=.75)delete w.exitRouteRecovery;
  if(routeClearance?.blocked()){
    const failed=routeClearance.blockedSegment?.();
    if(failed)nav.rejectRouteSegment?.(failed.start,failed.end,w.radius??.28,worker);
    w.path=null;
    if(!worker&&expandRoute&&w.status==='retreating'){
      const prior=w.retreatStaticRouteFailure,
        repeated=prior?.destinationId===destination.id&&
          prior.version===nav.version&&Math.hypot(w.x-prior.x,w.z-prior.z)<.1;
      w.retreatStaticRouteFailure={destinationId:destination.id,
        version:nav.version,x:w.x,z:w.z,count:repeated?
          Math.min(3,prior.count+1):1};
      // An invalid route that alternates between two near-identical points
      // can move a few centimetres forever. Only repeated *static* rejection
      // without destination progress invokes the bounded exit recovery.
      if(w.retreatStaticRouteFailure.count>=2&&
        s.elapsed-w.mobileProgressAt>=12)recoverExitRoute('no-exit-progress');
    }
    const epoch=routeEpoch(nav,w,destination,worker);
    const previousWait=routePlanWaits.get(w);
    // Retry once at the next movement boundary. If the same physical route
    // fails again without a topology/residency change, do not replan per tick.
    if(!worker&&expandRoute&&previousWait?.epoch===epoch){
      recoverExitRoute('repeated-static-connector');
    }
    routePlanWaits.set(w,{epoch,retryAt:previousWait?.epoch===epoch?
      s.elapsed+ROUTE_RETRY_SECONDS:s.elapsed});
    return false;
  }
  routePlanWaits.delete(w);
  const arrived=w.path.length===0;
  if(arrived)delete w.exitRouteRecovery;
  return arrived;
}
// A ruined wall regains collision when repaired. Check that this topological
// change does not seal workers or a center away from its village. Candidate
// gates are previewed against the same native wall mirror used by movement;
// no payment or confirmed intention changes during these synchronous probes.
function nativeRepairAccess(s,target,nav){
  const probe=(reason,detail={})=>globalThis.__wildRepairAccessProbe?.(
    {day:s.day,time:s.time,targetId:target.id,reason,...detail});
  if(!nav.wallWorkerReachability){probe('batch-unavailable');return null;}
  const obligations=[];
  for(const village of s.villages){
    const entry=village.entry??village;
    const targets=[...s.structures.filter(center=>operational(center)&&
      center.villageId===village.id).map(center=>centerServicePoint(center,s,.8)),
      ...s.workers.filter(worker=>worker.status!=='home'&&
        worker.villageId===village.id)];
    if(!targets.length)continue;
    const before=nav.wallWorkerReachability(entry,targets,[],[],true);
    if(!before){probe('batch-inconclusive',{villageId:village.id});return null;}
    const required=[];
    for(let i=0;i<targets.length;i++){
      if(before[i]==='found'){required.push(targets[i]);continue;}
      // Only inconclusive witnesses need an ordinary route. A known blocked
      // worker was already isolated before this repair and is not a new loss.
      const physical=nav.workerPhysicalRoute(targets[i],entry);
      if(physical.status==='unknown'){
        probe('witness-unknown',{villageId:village.id,witnessId:targets[i].id});
        return null;
      }
      if(physical.status==='found')required.push(targets[i]);
    }
    if(required.length)obligations.push({entry,targets:required});
  }
  if(!obligations.length)return {status:'safe',updates:[]};
  const repaired={...target,status:'intact',hp:target.maxHp};
  if(nav.wallLocalOverlay){
    const before=nav.wallLocalOverlay([],[]),wall=nav.wallLocalOverlay([repaired],[]);
    const gate=nav.wallLocalOverlay([{...repaired,gate:true,autoGate:true}],[]);
    if(before&&wall&&gate){
      let wallBlocks=false,gateBlocks=false;
      for(const {targets} of obligations)for(const point of targets){
        if(before.walkable(point.x,point.z)!==true)continue;
        wallBlocks ||= wall.walkable(point.x,point.z)===false;
        gateBlocks ||= gate.walkable(point.x,point.z)===false;
      }
      // Changing a different wall cannot make an occupied position inside
      // this repaired wall or its own gate physically valid. Defer repair.
      if(wallBlocks&&gateBlocks)return {status:'blocked',updates:[]};
    }
  }
  const repairedAccess=obligations.map(({entry,targets})=>
    nav.wallWorkerReachability(entry,targets,[repaired],[],true));
  if(repairedAccess.every(statuses=>statuses?.every(status=>status==='found')===true))
    return {status:'safe',updates:[]};
  // A worker at this existing gate can lack a certified connector while the
  // gate is provisionally restored. Another gate cannot resolve that local
  // uncertainty, so leave the repair pending until movement or residency
  // changes. Unknown is not evidence of a physical blockage.
  const nearGateUnknown=target.gate&&repairedAccess.every(statuses=>
    statuses?.every(status=>status==='found'||status==='unknown')===true)&&
    obligations.some(({targets},i)=>repairedAccess[i].some((status,j)=>
      status==='unknown'&&s.workers.includes(targets[j])&&
      dist(targets[j],target)<=(target.baseScaleX??1)*gateScale(target.material)+.4));
  if(nearGateUnknown)return {status:'unknown',updates:[]};
  const reaches=(proposed,removed=[])=>obligations.every(({entry,targets})=>
    nav.wallWorkerReachability(entry,targets,proposed,[],true,removed)
      ?.every(status=>status==='found')===true);
  const living=activeCrops(s.plants);
  const candidates=s.structures.filter(piece=>piece.kind==='wall'&&!piece.gate&&
    (piece.status==='intact'&&piece.hp>0||piece.id===target.id));
  candidates.sort((a,b)=>dist(a,target)-dist(b,target)||a.created-b.created);
  for(const wall of candidates){
    const scale=gateScale(wall.material),c=Math.cos(wall.yaw??0),
      sn=Math.sin(wall.yaw??0);
    if(living.some(plant=>Math.abs((plant.x-wall.x)*c-
      (plant.z-wall.z)*sn)<1.09*(wall.baseScaleX??1)*scale+.4&&
      Math.abs((plant.x-wall.x)*sn+(plant.z-wall.z)*c)<.22*scale+.4))
      continue;
    const base=wall.id===target.id?repaired:wall,maxHp=base.maxHp*.6;
    const gate={...base,gate:true,autoGate:true,maxHp,
      hp:base.hp/base.maxHp*maxHp};
    const proposed=wall.id===target.id?[gate]:[repaired,gate];
    if(reaches(proposed,wall.id===target.id?[]:[wall.id]))
      return {status:'safe',updates:wall.id===target.id?[gate]:[repaired,gate]};
  }
  probe('no-gate-restores-access',{obligations:obligations.length,
    candidateWalls:candidates.length});
  return null;
}
export function planRepairAccess(s,target,nav){
  if(target.kind!=='wall'||target.status!=='ruined'||
    !nav.withWallStatePreview||!nav.workerPhysicalRoute)
    return {status:'safe',updates:[]};
  const native=nativeRepairAccess(s,target,nav);
  if(native)return native;
  const villages=new Map(s.villages.map(v=>[v.id,v]));
  const witnesses=[];
  for(const center of s.structures.filter(operational)){
    const village=villages.get(center.villageId);
    if(village)witnesses.push([centerServicePoint(center,s,.8),village.entry??village]);
  }
  for(const worker of s.workers)if(worker.status!=='home'){
    const village=villages.get(worker.villageId);
    if(village)witnesses.push([worker,village.entry??village]);
  }
  const routes=witnesses.map(([from,to])=>nav.workerPhysicalRoute(from,to));
  if(routes.some(route=>route.status==='unknown'))return {status:'unknown',updates:[]};
  const connected=witnesses.filter((_,index)=>routes[index].status==='found');
  if(!connected.length)return {status:'safe',updates:[]};
  const repaired={...target,status:'intact',hp:target.maxHp};
  const byId=new Map([[target.id,repaired]]);
  const structures=()=>s.structures.map(piece=>byId.get(piece.id)??piece);
  const groups=new Map();
  for(let i=0;i<connected.length;i++){
    const [from,to]=connected[i];
    if(!groups.has(to))groups.set(to,{targets:[],indices:[]});
    const group=groups.get(to);
    group.targets.push(from);group.indices.push(i);
  }
  const checks=()=>nav.withWallStatePreview(structures(),({route,reachBatch})=>{
    if(!reachBatch)return connected.map(([from,to])=>route(from,to).status);
    const statuses=new Array(connected.length);
    for(const [entry,{targets,indices}] of groups){
      // Reverse reachability asks every worker/center to reach its village.
      // The overlay graph and hypothetical wall state are shared by the batch.
      for(let offset=0;offset<targets.length;offset+=256){
        const batch=reachBatch(entry,targets.slice(offset,offset+256),true);
        for(let i=0;i<Math.min(256,targets.length-offset);i++)
          statuses[indices[offset+i]]=batch?.[i]??'unknown';
      }
    }
    return statuses;
  });
  let statuses=checks();
  if(statuses.every(status=>status==='found'))return {status:'safe',updates:[]};
  const living=activeCrops(s.plants),points=routes.flatMap(route=>
    route.status==='found'?route.points:[]);
  const candidates=s.structures.filter(piece=>piece.kind==='wall'&&
    !piece.gate&&(piece.status==='intact'&&piece.hp>0||piece.id===target.id));
  const scores=new Map(candidates.map(wall=>{
    let minimum=Infinity;
    for(const point of points)minimum=Math.min(minimum,dist(point,wall));
    return [wall.id,minimum];
  }));
  candidates.sort((a,b)=>{
    return scores.get(a.id)-scores.get(b.id)||a.created-b.created;
  });
  const used=new Set();
  while(statuses.some(status=>status!=='found')){
    let best=null,bestStatuses=null,bestFound=statuses.filter(x=>x==='found').length;
    for(const original of candidates){
      if(used.has(original.id))continue;
      const wall=byId.get(original.id)??original;
      const scale=gateScale(wall.material),c=Math.cos(wall.yaw??0),
        sn=Math.sin(wall.yaw??0);
      if(living.some(plant=>Math.abs((plant.x-wall.x)*c-
        (plant.z-wall.z)*sn)<1.09*(wall.baseScaleX??1)*scale+.4&&
        Math.abs((plant.x-wall.x)*sn+(plant.z-wall.z)*c)<.22*scale+.4))
        continue;
      const maxHp=wall.maxHp*.6;
      const gate={...wall,gate:true,autoGate:true,maxHp,
        hp:wall.hp/wall.maxHp*maxHp};
      byId.set(wall.id,gate);
      const trial=checks(),found=trial.filter(x=>x==='found').length;
      byId.delete(wall.id);
      if(original.id===target.id)byId.set(target.id,repaired);
      if(found>bestFound){best=gate;bestStatuses=trial;bestFound=found;
        if(found===connected.length)break;}
    }
    if(!best)return {status:statuses.includes('unknown')?'unknown':'blocked',updates:[]};
    byId.set(best.id,best);used.add(best.id);statuses=bestStatuses;
  }
  return {status:'safe',updates:[...byId.values()]};
}
function completeTask(s,w,t,target,nav) {
  if(t.kind==='initial'||t.kind==='water') {
    if(!canWaterFrom(w,target,nav)){releaseTask(s,w);w.status='idle';w.path=null;notifyWorkerPlanningChange(s,w);return;}
    if(target.alive){waterPlant(target);emit(s,'WaterSatisfied',{workerId:w.id,targetId:target.id});}
  } else if(t.kind==='harvest') {
    if(isMature(target)&&target.harvestRequested) {
      let value=rational(cropSpec(target.species).base_harvest_value);
      if(profile(w).male)value=multiply(value,6,5);
      if(!target.multiplyPower&&(target.multiplyHarvest||spellAt(s,'multiply',target)))value=multiply(value,2);
      if(target.harvestBonus)value=multiply(value,100+target.harvestBonus,100);
      if(s.microevents?.pendingLosses[target.id])value=harvestMicroLoss(s,target,value,detail=>emit(s,'MicroeventHarvestLossApplied',detail));
      target.alive=false;target.harvestRequested=false;target.multiplyHarvest=false;
      cropBecameInactive(s.plants);
      const crate={id:`crate-${s.nextId++}`,sourcePlantId:target.id,species:target.species,x:w.x,z:w.z,value,multiplyPower:target.multiplyPower??null,profile:w.profile,carrierId:w.id,delivered:false,centerId:w.centerId};delete target.multiplyPower;s.crates.push(crate);w.crateId=crate.id;w.status='carrying';w.path=null;emit(s,'CropPicked',{workerId:w.id,targetId:target.id,crateId:crate.id});
    }
  } else if(t.kind==='crate') {target.carrierId=w.id;w.crateId=target.id;target.centerId=w.centerId;w.status='carrying';w.path=null;}
  else if(t.kind==='repair') {
    try {
      const access=planRepairAccess(s,target,nav);
      if(access.status!=='safe')throw new Error(access.status==='unknown'?
        'La reparación espera información del terreno para conservar el acceso.':
        'La reparación cerraría el acceso de los trabajadores sin una puerta válida.');
      ensurePurchaseBudget(s,repairCost(target));
      const paymentId=`repair:${t.id}`,previousHp=target.hp,previousStatus=target.status;
      if(transact(s.ledger,paymentId,negate(repairCost(target)))){
        const visual=target.kind==='wall'?wallVisualAt(target,s.elapsed):null;
        delete target.wallPresentation;target.hp=target.maxHp;target.status='intact';target.collapseRemaining=0;
        for(const update of access.updates){
          const piece=s.structures.find(item=>item.id===update.id);
          if(piece)Object.assign(piece,update);
        }
        if(visual!==null)recordWallPresentation(target,visual,s.elapsed);
        if(target.kind==='center'&&nav.syncCenterRepair)nav.syncCenterRepair(s,target,previousStatus);else nav.setState(s);
        // Read the settled ledger debit: proportional repair prices may be
        // fractional before transact rounds the actual payment to whole coins.
        emit(s,'RepairApplied',{workerId:w.id,targetId:target.id,
          repair:{taskId:t.id,paymentId,paidCoins:-numberOf(s.ledger.entries[paymentId]),previousHp,previousStatus,restoredHp:target.hp,maxHp:target.maxHp},
          presentation:{elapsed:s.elapsed,x:w.x,z:w.z,yaw:w.heading??0}});
        if(target.kind==='center'){recoverDisplacedWorkers(s);enqueueLooseCrates(s);}
      }
    }
    catch(error){
      if(error.code==='hiring-reserve')
        notice(s,'La reparación se canceló: fondos insuficientes al llegar.',target.id);
      else if(error.message?.startsWith('La reparación'))notice(s,error.message,target.id);
      else throw error;
    }
  }
  nav.intentTaskPlanner?.finishAction(w.id);
  replaceTasks(s,s.tasks.filter(task=>task.id!==t.id));w.taskId=null;w.taskApproach=null;if(w.status!=='carrying')w.status='idle';w.path=null;
  notifyWorkerPlanningChange(s,w);
}
export function idleFarmAnchor(s,worker,center,livingCandidates=null){
  let live=null,liveDistance=Infinity;
  // The worker pass supplies one shared living subset. Recheck object life as
  // earlier workers can harvest during that same pass. Historical crops never
  // choose an idle destination or trigger a scan of the save's crop history.
  const candidates=livingCandidates??activeCrops(s.plants);
  for(const plant of candidates){
    if(plant.centerId!==worker.centerId||!plant.alive)continue;
    const distance=dist(plant,worker);
    if(distance<liveDistance||distance===liveDistance&&plant.id.localeCompare(live.id)<0){live=plant;liveDistance=distance;}
  }
  if(live)return {...live,id:'farm-'+live.id,idleRadius:3};
  return {...center,...centerServicePoint(center,s,.8),id:'farm-'+center.id,idleRadius:2};
}
function taskRouteWhenKnown(compute){
  try{return compute();}
  catch(error){
    if(error instanceof SpatialChunkUnavailable)return undefined;
    throw error;
  }
}
const taskCandidateWaits=new WeakMap();
function reserveAvailableTasks(s,nav){
  if(s.raid||s.time>=300)return;
  if(nav.intentTaskPlanner){
    const planner=nav.intentTaskPlanner;
    if(!planner.hasPendingAt(s.elapsed))return;
    planner.flushWorldEvents();planner.flushTaskEvents();
    planner.reconcileWorkerRoutes(s,{navVersion:nav.version});
    const plan=planner.planIfNeeded(s.elapsed);
    if(plan!==null){
      planner.commitTaskBatchToState(s,plan,{navVersion:nav.version});
      planner.reconcileWorkerRoutes(s,{navVersion:nav.version});
    }
    return;
  }
  const idle=s.workers.filter(w=>w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,s))
    .map(w=>`${w.id}:${w.centerId}`).join('|');
  const sectors=nav.spatialSectorRevision?.(.28,true)??0;
  const wait=taskPlanWaits.get(s);
  const taskRevision=taskPlanningRevision(s);
  const wakes=[];
  if(!wait)wakes.push('initial');
  else{
    if(wait.tasks!==s.tasks||wait.length!==s.tasks.length)wakes.push('queue');
    if(wait.taskRevision!==taskRevision)wakes.push('lease');
    if(wait.idle!==idle)wakes.push('idle-workers');
    if(wait.topology!==nav.version)wakes.push('topology');
    if(wait.sectors!==sectors)wakes.push('sector-residency');
    if(s.elapsed>=wait.retryAt)wakes.push('bounded-retry');
  }
  if(!nav.forcePlanningPoll&&!wakes.length){
    nav.planningObserver?.({kind:'taskDeferred',actorId:null,elapsed:s.elapsed});
    return;
  }
  nav.planningObserver?.({kind:'taskWake',actorId:null,elapsed:s.elapsed,reasons:wakes});
  nav.planningObserver?.({kind:'taskPass',actorId:null,elapsed:s.elapsed});
  let deferred=taskCandidateWaits.get(s);
  if(!deferred){deferred=new Map();taskCandidateWaits.set(s,deferred);}
  if(deferred.size>Math.max(128,s.tasks.length*2)){
    const active=new Set(s.tasks.map(t=>t.id));
    for(const id of deferred.keys())if(!active.has(id))deferred.delete(id);
  }
  reserveTasks(s,(w,t,target)=>{
    if(s.time>=profile(w).end)return false;
    let byWorker=deferred.get(t.id);
    const previous=byWorker?.get(w.id);
    if(!nav.forcePlanningPoll&&!nav.forceTaskCandidatePoll&&previous&&previous.topology===nav.version&&
      previous.sectors===sectors&&previous.kind===t.kind&&
      previous.targetX===target.x&&previous.targetZ===target.z&&
      Math.hypot(previous.workerX-w.x,previous.workerZ-w.z)<.5&&
      s.elapsed<previous.retryAt){
      nav.planningObserver?.({kind:'taskCandidateDeferred',actorId:w.id,elapsed:s.elapsed,taskId:t.id});
      // The prior failed point is waiting for an event, not a fresh proof that
      // the task is currently blocked at this worker's moving position.
      return null;
    }
    nav.planningObserver?.({kind:'taskCandidate',actorId:w.id,elapsed:s.elapsed,taskId:t.id});
    const route=taskRouteWhenKnown(()=>t.kind==='repair'?repairRoute(w,target,nav):
      t.kind==='initial'||t.kind==='water'?wateringRoute(w,target,nav):
        (nav.workerPath?nav.workerPath(w,target,.28,null):nav.path(w,target,.28,null,true)));
    nav.planningObserver?.({kind:'taskCandidateResult',actorId:w.id,elapsed:s.elapsed,
      taskId:t.id,outcome:route===undefined?'unknown':route?'found':'blocked'});
    if(route)byWorker?.delete(w.id);
    else{
      if(!byWorker){byWorker=new Map();deferred.set(t.id,byWorker);}
      byWorker.set(w.id,{topology:nav.version,sectors,kind:t.kind,
        targetX:target.x,targetZ:target.z,workerX:w.x,workerZ:w.z,
        retryAt:s.elapsed+ROUTE_RETRY_SECONDS});
    }
    return route===undefined?null:route;
  },(w,t,target,route)=>{
    if(nav.forceRouteRebuild)return;
    const interaction=t.kind==='repair'||t.kind==='initial'||t.kind==='water';
    const destination=interaction?route.destination:target;
    w.path=interaction?route.path:route;
    if(interaction)w.taskApproach={taskId:t.id,destination};
    w.destinationId=destination.id;
    w.pathVersion=nav.version;
  });
  taskPlanWaits.set(s,{tasks:s.tasks,length:s.tasks.length,
    taskRevision:taskPlanningRevision(s),
    idle:s.workers.filter(w=>w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,s))
      .map(w=>`${w.id}:${w.centerId}`).join('|'),
    topology:nav.version,sectors,retryAt:s.elapsed+ROUTE_RETRY_SECONDS});
}
function reconcileNativeIntents(s,nav){
  if(nav.intentTaskPlanner?.needsReconciliation(nav.version)){
    nav.intentTaskPlanner.flushWorldEvents();
    nav.intentTaskPlanner.flushTaskEvents();
    nav.intentTaskPlanner.reconcileNavigationRevision(s,nav.version);
    nav.intentTaskPlanner.reconcileWorkerRoutes(s,{navVersion:nav.version});
  }
}
// A worker's clearance disc has entered the village doorway once its center
// is within one body radius of the entry. Requiring the exact point can trap
// the first person in a queue: the final centimeter would overlap the person
// behind them, even though the terrain and doorway are open.
export function workerAtVillageEntry(worker,entry,nav){
  const radius=worker.radius??.28;
  if(dist(worker,entry)>radius+1e-9)return false;
  return nav.workerMotionClear?.(worker,entry,radius)??
    nav.segmentClear?.(worker,entry,radius,null,true)??false;
}
function updateWorkers(s,dt,nav) {
  reconcileNativeIntents(s,nav);
  // Task removals/rebuilds replace the array; enqueues change its length.
  // Unchanged queues can reuse their index while reservation fields stay live.
  const findPlant=workerEntityLookup(()=>s.plants,{reuse:true,appendOnly:true}),findCrate=workerEntityLookup(()=>s.crates,{reuse:true,appendOnly:true}),findTask=workerEntityLookup(()=>s.tasks,{reuse:true});
  let idlePlants;
  let idleBodies;
  let walkingCandidates;
  // One ambient walker is cheaper with a scan, even in a large paid crew.
  // Count only when an idle call actually occurs; the threshold avoids bucket
  // construction when there are too few queries to amortize it.
  const bodyIndex=()=>{
    if(s.workers.length<96)return null;
    walkingCandidates??=s.workers.reduce((n,w)=>n+Number(w.idleState?.mode==='walk'&&
      (w.status==='idle'||w.status==='waiting')),0);
    return walkingCandidates>=Math.max(48,Math.ceil(s.workers.length/4))?
      (idleBodies??=createWorkerBodyIndex(s.workers)):null;
  };
  const newArrivals=[];
  const nativeTasks=!!nav.intentTaskPlanner;
  if(!s.raid&&s.time<300)for(const w of s.workers){
    if(w.status!=='arriving'||w.raidReturn||w.incapacitated||w.fallRemaining>0||contractExpired(w,s)||s.time>=profile(w).end)continue;
    if(!s.structures.some(c=>c.id===w.centerId&&operational(c)))continue;
    if(!nativeTasks)w.status='idle';
    newArrivals.push(w);
  }
  // New contracts reserve from their actual village position before any idle
  // motion. Returning raid survivors retain the existing arrival sequence.
  if(newArrivals.length){
    reserveAvailableTasks(s,nav);
    if(!nativeTasks)for(const w of newArrivals)if(!w.taskId)w.status='arriving';
  }
  // Small crews retain direct queries; amortize bookkeeping only in large farms.
  const urgency=s.workers.length>=64?createUrgencyPass(s):null;
  for(const w of s.workers) {
    try {
      if(w.fallRemaining>0&&!w.incapacitated){w.fallRemaining=Math.max(0,w.fallRemaining-dt);continue;}
      const p=profile(w),center=s.structures.find(c=>c.id===w.centerId),village=s.villages.find(v=>v.id===w.villageId);
      if(['fleeing','returning','incapacitated'].includes(w.status)) {
        const home={...(village.entry??village),id:`home-${village.id}`};
        if(nav.intentTaskPlanner&&workerAtVillageEntry(w,home,nav)){
          nav.intentTaskPlanner?.finishHomeIntent?.(w.id);
          // Complete the remaining sub-radius step as part of entering the
          // building. The worker ceases to be a dynamic obstacle immediately.
          w.x=home.x;w.z=home.z;w.path=[];w.status='home';
          notifyWorkerPlanningChange(s,w);
          continue;
        }
        const nativeHome=nav.intentTaskPlanner?.planHomeRoute?.(s,w,home,nav.version);
        if(nativeHome?.status==='found'){
          w.path=nativeHome.path;w.destinationId=home.id;
          w.pathVersion=nav.version;
        }else if(nav.intentTaskPlanner?.homeRouteActive?.(w.id)&&w.path)
          w.pathVersion=nav.version;
        const native=nav.intentTaskPlanner?.homeRouteActive?.(w.id)??false;
        const reached=walkTo(s,w,home,dt,nav,{
          motion:{flight:w.incapacitated||w.status==='fleeing',slow:w.incapacitated},
          externallyPlanned:native});
        if(reached){
          nav.intentTaskPlanner?.finishHomeIntent?.(w.id);
          w.status='home';notifyWorkerPlanningChange(s,w);
        }else if(native&&!w.path)nav.intentTaskPlanner?.finishHomeIntent?.(w.id);
        continue;
      }
      if(w.status==='home')continue;
      if(w.status==='waiting'&&!center&&!s.raid&&!contractExpired(w,s)&&s.time<p.end){updateIdle(w,{...(village.entry??village),id:village.id},dt,nav,s.seed,s.structures,s,bodyIndex);continue;}
      if(w.status!=='idle')cancelIdle(w);
      if(!center||!operational(center)) {if(center&&!contractExpired(w,s)&&s.time<p.end)w.displacedDay??=s.day;cancelIdle(w);releaseTask(s,w);if(w.crateId)dropCarriedCrate(s,w);w.status='returning';w.path=null;notifyWorkerPlanningChange(s,w);continue;}
      const ended=contractExpired(w,s)||s.time>=p.end;
      if(ended&&!['acting','carrying'].includes(w.status)) {cancelIdle(w);releaseTask(s,w);w.status='returning';w.path=null;notifyWorkerPlanningChange(s,w);continue;}
      if(w.status==='arriving') {
        const arrival={...center,...centerServicePoint(center,s,.8),id:`arrival-${center.id}`};
        const reached=walkTo(s,w,arrival,dt,nav,
          {motion:{urgent:!w.raidReturn&&(urgency?urgency.urgent(w):urgentWork(s,w))}});
        // Several paid workers share one authored center entrance. Reaching
        // its clear approach zone is sufficient; insisting on the occupied
        // exact point can strand later arrivals behind an idle coworker.
        const nearEntrance=w.path?.length>0&&w.destinationId===arrival.id&&
          w.pathVersion===nav.version&&dist(w,arrival)<=2&&
          (nav.segmentClear?.(w,arrival,w.radius??.28,null,true)??false);
        if(reached||nearEntrance){
          w.path=null;w.destinationId=null;w.status='idle';w.raidReturn=false;
          notifyWorkerPlanningChange(s,w);
        }
        continue;
      }
      if(w.status==='carrying') {
        const crate=findCrate(w.crateId);
        if(!crate){w.crateId=null;w.status='idle';notifyWorkerPlanningChange(s,w);continue;}
        if(w.deliveryApproach?.crateId!==crate.id||w.deliveryApproach?.centerId!==center.id||!Number.isFinite(w.deliveryApproach?.x)||!Number.isFinite(w.deliveryApproach?.z)){
          const source=findPlant(crate.sourcePlantId)??crate;
          w.deliveryApproach={...centerDeliveryPoint(center,source,s),crateId:crate.id,centerId:center.id};w.path=null;
        }
        const delivered=walkTo(s,w,{...w.deliveryApproach,id:`delivery-${center.id}-${crate.id}`},dt,nav,{motion:{carrying:true}});
        crate.x=w.x;crate.z=w.z;
        if(delivered) {
          const extraIncome=settleMultiplyPower(s,crate);transact(s.ledger,`deliver:${crate.id}`,add(crate.value,extraIncome));crate.multiplyIncome=extraIncome;crate.delivered=true;crateBecameInactive(s.crates);crate.carrierId=null;w.crateId=null;w.deliveryApproach=null;w.status=ended?'returning':'idle';w.path=null;notifyWorkerPlanningChange(s,w);emit(s,'CrateDelivered',{workerId:w.id,targetId:crate.id,species:crate.species,multiplyIncome:crate.multiplyIncome});
          s.tutorial.harvestCompleted=true;
          if(s.tutorial.step==='observe'||s.tutorial.step==='harvest'){s.tutorial.step='done';if(!s.tutorial.basicSkipped)emit(s,'TutorialCompleted',{workerId:w.id,targetId:crate.id});}
        }
        continue;
      }
      const t=findTask(w.taskId);
      if(!t) {
        if(w.status!=='idle'){w.status='idle';notifyWorkerPlanningChange(s,w);}
        if(s.tasks.some(task=>task.centerId===w.centerId&&!task.workerId))cancelIdle(w);
        else {idlePlants??=activeCrops(s.plants);updateIdle(w,idleFarmAnchor(s,w,center,idlePlants),dt,nav,s.seed,s.structures,s,bodyIndex);}
        continue;
      }
      const target=findPlant(t.targetId)??findCrate(t.targetId)??s.structures.find(e=>e.id===t.targetId);
      if(!target || ('alive' in target&&!target.alive)) {replaceTasks(s,s.tasks.filter(q=>q.id!==t.id));w.taskId=null;w.status='idle';w.path=null;notifyWorkerPlanningChange(s,w);continue;}
      if(w.status==='walking') {
        let destination=target;
        if(t.kind==='repair'){
          if(w.taskApproach?.taskId!==t.id||w.path===null){
            if(nativeTasks){
              nav.intentTaskPlanner.requestReroute(s,w);
              w.status='waiting-task';notifyWorkerPlanningChange(s,w);continue;
            }
            nav.planningObserver?.({kind:'assignedRouteRebuild',actorId:w.id,elapsed:s.elapsed,taskId:t.id});
            const route=taskRouteWhenKnown(()=>repairRoute(w,target,nav));
            if(!route){releaseTask(s,w);w.status='idle';notifyWorkerPlanningChange(s,w);continue;}
            w.taskApproach={taskId:t.id,destination:route.destination};w.path=route.path;w.destinationId=route.destination.id;w.pathVersion=nav.version;
          }
          destination=w.taskApproach.destination;
        }else if(t.kind==='initial'||t.kind==='water'){
          if(w.taskApproach?.taskId===t.id&&w.path&&
            w.pathVersion!==nav.version)
            retainRouteAfterWallChange(w,w.taskApproach.destination,nav);
          if(w.taskApproach?.taskId!==t.id||w.path===null||w.pathVersion!==nav.version){
            if(nativeTasks&&w.pathVersion!==nav.version&&w.path)continue;
            if(nativeTasks){
              nav.intentTaskPlanner.requestReroute(s,w);
              w.status='waiting-task';notifyWorkerPlanningChange(s,w);continue;
            }
            nav.planningObserver?.({kind:'assignedRouteRebuild',actorId:w.id,elapsed:s.elapsed,taskId:t.id});
            const route=taskRouteWhenKnown(()=>wateringRoute(w,target,nav));
            if(!route){releaseTask(s,w);w.status='idle';notifyWorkerPlanningChange(s,w);continue;}
            w.taskApproach={taskId:t.id,destination:route.destination};w.path=route.path;w.destinationId=route.destination.id;w.pathVersion=nav.version;
          }
          destination=w.taskApproach.destination;
        }
        if(walkTo(s,w,destination,dt,nav,{externallyPlanned:nativeTasks,
          motion:{urgent:(urgency?urgency.urgent(w):urgentWork(s,w))}})) {
          if(t.kind==='repair'){completeTask(s,w,t,target,nav);urgency?.invalidate();continue;}
          if(t.kind==='initial'||t.kind==='water')w.heading=Math.atan2(target.x-w.x,target.z-w.z);
          w.status='acting';w.actionRemaining=(t.kind==='initial'?7.2:t.kind==='water'?3.4:t.kind==='harvest'?3.6:t.kind==='repair'?3.8:1)/p.speed;
          nav.intentTaskPlanner?.markActionActive(w.id);
          notifyWorkerPlanningChange(s,w);
        }else if(w.path===null){
          if(nativeTasks){
            nav.intentTaskPlanner.requestReroute(s,w);
            w.status='waiting-task';notifyWorkerPlanningChange(s,w);
          }
          else {releaseTask(s,w);w.status='idle';notifyWorkerPlanningChange(s,w);}
        }
      } else if(w.status==='acting') {
        if(t.kind==='repair'){completeTask(s,w,t,target,nav);urgency?.invalidate();continue;}
        w.actionRemaining-=dt;if(w.actionRemaining<=0)completeTask(s,w,t,target,nav);
      }
    } finally {urgency?.changed(w);idleBodies?.update(w);}
  }
  reserveAvailableTasks(s,nav);
}
function closeNight(s) {
  s.completedNights++;s.time=0;s.day++;
  retireFarmHistory(s);
  s.tutorial.shownToday={day:s.day,ids:[]};
  const previousWorkers=s.workers;
  s.workers=s.workers.filter(w=>w.status!=='home');
  notifyWorkerPlanningRoster(s,previousWorkers,s.workers);
  for(const w of s.workers){
    w.contractDay??=s.day-1;w.runRemaining=dailyRunMetres();w.running=false;
    w.recovering=s.day<=(s.people.find(p=>p.id===w.personId)?.recoveryUntil??0);
    if(!['acting','carrying','fleeing','returning','incapacitated'].includes(w.status)){releaseTask(s,w);w.status='returning';w.path=null;notifyWorkerPlanningChange(s,w);}
    else notifyWorkerPlanningChange(s,w);
  }
  applyEvent(s);s.eventPlan=null;s.nightPlan=null;
  if(compare(s.ledger.balance,rational(dawnMinimum(s)))<0){s.result='defeat';notice(s,'El sol vuelve, pero el poblado no puede costear otra jornada.');emit(s,'GameOver');return;}
  if(s.completedNights>=100&&!s.postgame){s.result='victory';emit(s,'CampaignWon');return;}
  for(const plant of activeCrops(s.plants))if(plant.alive)plant.centerId=nearest(s.structures.filter(operational),plant)?.id??null;
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
export function nightEntryPending(s){const plan=activeRaidEntryPlan(s);return !s.result&&!!plan?.group?.length&&!plan.done&&s.time>=plan.at;}
function clockBoundaries(s){
  return [250,300,600,...(s.dayPlan&&!s.dayPlan.done?[s.dayPlan.at]:[]),...(s.nightPlan&&!s.nightPlan.done?[s.nightPlan.at]:[])].filter(Number.isFinite);
}
function prepareClockEvents(s,nav){
  const wave=s.raid?.pendingWavePlan;
  if(wave&&!wave.done&&s.time>=wave.at)spawnRaid(s,wave,nav);
  if(s.time>=300 && !s.nightPlan){planNight(s);selectEvent(s);emit(s,'NightStarted');}
  if(s.dayPlan&&!s.dayPlan.done&&s.time>=s.dayPlan.at){s.dayPlan.done=s.postgame||spawnRaid(s,s.dayPlan,nav,true)!==false;}
  if(s.nightPlan&&!s.nightPlan.done&&s.time>=s.nightPlan.at&&(!s.dayPlan||activeRaidEntryPlan(s)!==s.dayPlan)){s.nightPlan.done=!s.nightPlan.group?.length||spawnRaid(s,s.nightPlan,nav)!==false;}
}
export function tick(s,seconds,nav) {
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Paso temporal inválido');
  let left=seconds;
  while(left>1e-9 && !s.pauses.length && !s.result) {
    prepareClockEvents(s,nav);
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
      if(kind!=='shield'){s.cooldowns[kind]=0;continue;}
      const remaining=s.cooldowns[kind]-step;
      s.cooldowns[kind]=remaining>1e-9?remaining:0;
    }
    for(const structure of s.structures)if(structure.status==='collapsing') {
      structure.collapseRemaining-=step;if(structure.collapseRemaining<=1e-9){structure.status='ruined';structure.hp=0;nav.setState(s);emit(s,'StructureRuined',{targetId:structure.id});}
    }
    if(previousTime<300) {
      const growthStep=s.spells.some(spell=>spell.kind==='growth'&&spell.remaining>0)?growthPowerStep(s):null;
      const flushGrowth=()=>growthStep?.flush();
      const enqueueCrop=taskEnqueuer(s,flushGrowth);
      try{for(const p of activeCrops(s.plants)) {
        if(!p.alive)continue;
        const before=isMature(p),growthSpell=spellAt(s,'growth',p),extra=advancePlant(p,step,growthSpell?.power?growthSpell.power.intensity:!!growthSpell);
        if(growthSpell&&extra>0){growthSpell.growthSecondsAdded=(growthSpell.growthSecondsAdded??0)+extra;growthStep?.consume(growthSpell,extra);}
        if(!before&&isMature(p)){flushGrowth();emit(s,'CropMatured',{targetId:p.id});if(s.tutorial.step==='observe')s.tutorial.step='harvest';}
        if(!p.harvestRequested&&isMature(p)){flushGrowth();queueMatureHarvest(s,p,enqueueCrop);}
        if(p.alive&&p.water.some(w=>w.status==='due')&&p.centerId&&s.structures.some(c=>c.id===p.centerId&&operational(c)))enqueueCrop(p.centerId,p.water[0].status==='due'?'initial':'water',p.id);
      }}finally{flushGrowth();}
    }
    const shieldsBefore=s.spells.filter(a=>a.kind==='shield').length;
    for(const spell of s.spells)spell.remaining=Math.max(0,spell.remaining-step);
    for(const a of s.spells)if(a.remaining<=1e-9&&a.targetPlantId!==undefined)emit(s,'AgriculturalSpellEnded',{spellId:a.id,kind:a.kind,targetPlantId:a.targetPlantId,growthSecondsAdded:a.growthSecondsAdded??0});
    s.spells=s.spells.filter(a=>a.remaining>1e-9);
    if(s.spells.filter(a=>a.kind==='shield').length!==shieldsBefore)nav.setState(s);
    advanceGateLeaves(s,step);
    // A restored or event-invalidated animal route must be published before
    // the raid controller attempts physical movement in this interval.
    reconcileNativeIntents(s,nav);
    updateRaid(s,step,nav);updateWorkers(s,step,nav);
    // Arrival is an event at the end of this interval. Newly spawned animals
    // must not move for time that elapsed before they existed.
    prepareClockEvents(s,nav);
    if(s.time>=600 && !s.raid && !s.result && (!s.nightPlan?.group?.length||s.nightPlan.done))closeNight(s);
  }
}
export function advanceReal(s,seconds,nav,{nightFastForward=true}={}) {
  let left=seconds;
  while(left>1e-9 && !s.pauses.length&&!s.result) {
      prepareClockEvents(s,nav);
    const speed=nightFastForward&&s.time>=300&&!s.raid?5:1;
    const untilBoundary=Math.min(...clockBoundaries(s).filter(t=>t>s.time+1e-9).map(t=>(t-s.time)/speed));
    const real=Math.min(left,.02,untilBoundary);left-=real;
    tick(s,real*speed,nav);
  }
}
export function clockLabel(s) {
  const minutes=(425+Math.min(600,s.time)*2.4)%1440;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;
}
