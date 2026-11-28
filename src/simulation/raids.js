import {publishAnimalGone} from './presentation-lifecycle.js';
import {canyonRaidFormation} from './canyon-raid-formation.js';
import {agriculturalRayClear,resolveAgriculturalImpact,validDamageProfile} from './raid-agricultural-impact.js';
import {liveWaitQueue,occupiedEligibleGroup,enqueueWait,leaveWait,observeWaitProgress,waitEpoch,RAID_WAIT_SECONDS} from './raid-contention.js';
import {raidEntryChunks,includeRaidBounds} from '../world/raid-entry-residency.js';
import {raidEntryKey} from '../world/raid-entry-data.js';
import {exteriorRaidEntry} from './raid-exterior-entry.js';
import {createCropGrouping} from './crop-components.js';
import {activeCrops} from './active-crops.js';
import {retireFarmHistory} from './retire-farm-history.js';
import {RAID_NOTICE_TEXT} from './raid-notice.js';
import {warmRaidNavigation} from '../world/raid-navigation-warmth.js';
import {centerBoundaryPoint,centerCulture,centerDeliveryPoint,centerFootprint} from '../world/centers.js';
import {footprintDistance,footprintsOverlap} from '../world/footprints.js';
import {BALANCE as B} from './balance.js';
import {nextRandom,randomInt,attraction,threatTier,animalSpec,operational,hitStructure,collapseThreshold,CENTER_COLLAPSE_SECONDS} from './rules.js';
import {createRaidCompositionIndex} from './raid-composition-index.js';
import {preparePressureNight,nextPressureWave} from './raid-pressure-plan.js';
import {eligiblePendingRaidWavePlan} from '../world/raid-entry-data.js';
import {emit,notice,observeGameEvents,walkTo,rebuildTasks,spellAt,dropCarriedCrate,recoverDisplacedWorkers} from './game.js';
import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';
import {releaseTask,replaceTasks,notifyWorkerPlanningChange} from './tasks.js';
import {rational,compare} from './money.js';
import {updateWorkerEncounters} from './encounters.js';
import {animalExitConnector} from './animal-exit-connectors.js';
import {ANIMAL_ACTIONS} from './animal-actions-data.js';
import {actorBlockers,actorSegmentClear} from './actor-motion.js';
import {activeChunkRegion,validActiveBounds} from '../world/active-region.js';
import {defensiveGroups} from './defensive-groups.js';
import {wallCollisionFrame} from '../world/wall-collision-frame.js';
import {targetReservationKey,targetReserved,reservedApproachClear,reconcileTargetReservations} from './raid-target-reservations.js';
import {applyCropImpact,cropImpactDamage,CROP_HIT_POINTS} from './crop-impact-health.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),entrySelections=new WeakMap();
const RETREAT_SPEED=3.8;
const APPROACH_SPEED=1.5;
const cropTargetIndexes=new WeakMap();
const raidRegionDecisions=new WeakMap();
const reservationReconciliation=new WeakMap();
const RESERVATION_TARGET_EVENTS=new Set(['CropDestroyed','CropPicked',
  'StructureHit','StructureRuined','WallRemoved']);
function reconcileRaidReservationsOnChange(s,nav){
  // Legacy callers can still replace an animal's target directly without
  // emitting an event. Detect a stale lease, but preserve the reservation
  // object on an unchanged tick. Native intentions use confirmed events.
  const staleLegacyLease=!nav.intentTaskPlanner&&s.raid.animals.some(animal=>
    animal.targetId&&animal.status!=='attacking'&&
    (!animal.reservation||s.raid.reservations[animal.reservation]!==animal.id));
  let entry=reservationReconciliation.get(s);
  if(!entry){
    // A versioned save already contains committed claims in their original
    // insertion order. Rebuilding them on the first post-load tick changes
    // the serialized state even when ownership is identical.
    const restored=s.raid.targetReservationVersion===2&&
      s.raid.animals.every(animal=>{
        if(!animal.targetId||animal.status==='attacking')return true;
        const target=raidTarget(s,animal.targetId);
        return !!target&&animal.reservation===targetReservationKey(target,animal)&&
          s.raid.reservations[animal.reservation]===animal.id;
      });
    entry={raid:restored?s.raid:null,nav:restored?nav:null,
      navVersion:restored?nav.version:null,dirty:!restored};
    observeGameEvents(s,event=>{
      if(RESERVATION_TARGET_EVENTS.has(event.type))entry.dirty=true;
    });
    reservationReconciliation.set(s,entry);
  }
  if(entry.raid===s.raid&&entry.nav===nav&&entry.navVersion===nav.version&&
    !entry.dirty&&!staleLegacyLease&&s.raid.targetReservationVersion===2)return;
  reconcileTargetReservations(s,(state,animal)=>release(state,animal,nav));
  entry.raid=s.raid;entry.nav=nav;entry.navVersion=nav.version;entry.dirty=false;
}
const RAID_REGION_QUERIES_PER_TICK=16,RAID_REGION_RETRY_SECONDS=4;
const NATIVE_UNKNOWN_CAUSES=['source-connector','region-connectivity',
  'crop-sites','route','bounded-local-search'];
const NATIVE_REGION_UNKNOWN_REASONS=[0,1,2,8,10];
function regionDecisionScope(s,nav){
  let scope=raidRegionDecisions.get(nav);
  if(!scope||scope.raid!==s.raid||scope.topology!==nav.version){
    scope={raid:s.raid,topology:nav.version,decisions:new Map(),tick:-1,queries:0};
    raidRegionDecisions.set(nav,scope);
  }
  if(scope.tick!==s.elapsed){scope.tick=s.elapsed;scope.queries=0;}
  return scope;
}
function cropRegionDecision(s,a,nav,group,regionKey,candidates,scope,origin,
  sectors,requestDemand=true){
  const destination=regionKey.startsWith('unknown:')?`${group.id}:${regionKey}`:regionKey;
  const key=`${a.radius}:${origin}:${destination}`;
  const old=scope.decisions.get(key);
  if(old&&old.sectors===sectors){
    if(nav.raidSelectionStats)nav.raidSelectionStats.regionCacheHits=(nav.raidSelectionStats.regionCacheHits??0)+1;
    return old.status;
  }
  if(scope.queries>=RAID_REGION_QUERIES_PER_TICK){
    if(nav.raidSelectionStats)nav.raidSelectionStats.budgetDeferrals=(nav.raidSelectionStats.budgetDeferrals??0)+1;
    return 'unknown';
  }
  scope.queries++;
  if(nav.raidSelectionStats)nav.raidSelectionStats.regionQueries=(nav.raidSelectionStats.regionQueries??0)+1;
  // All members share this graph component. The result is a region decision,
  // not a route to each plant. Missing sectors remain pending across ticks.
  const result=nav.regionConnected(a,candidates[0],a.radius,null,false);
  const status=result===true?'accessible':result===false?'blocked':'unknown';
  if(scope.decisions.size>=2048)scope.decisions.delete(scope.decisions.keys().next().value);
  scope.decisions.set(key,{status,at:s.elapsed,sectors});
  if(status==='unknown'&&requestDemand)
    nav.requestRaidConnectivity?.(a,candidates[0],a.radius);
  return status;
}
function enclosedCropRegion(nav,scope,group,regionKey,candidates,radius,sectors){
  if(!nav.enclosureFor)return null;
  const destination=regionKey.startsWith('unknown:')?`${group.id}:${regionKey}`:regionKey;
  const key=`enclosure:${radius}:${destination}`;
  const previous=scope.decisions.get(key);
  if(previous?.sectors===sectors)return previous.result;
  const stats=nav.raidSelectionStats,started=stats?performance.now():0;
  // Only one native classification per crop region and movement profile.
  // Plants may be non-standable, so try a few representatives of the same
  // group; uncertainty never certifies a wall attack.
  let result={ids:[],status:'unknown'};
  for(const crop of candidates.slice(0,4)){
    const current=nav.enclosureFor(crop,radius);
    if(current.status==='sealed'){result=current;break;}
    if(current.status==='open-frontier')result=current;
  }
  if(stats){
    stats.enclosureClassifications=(stats.enclosureClassifications??0)+1;
    stats.enclosureClassificationMs=(stats.enclosureClassificationMs??0)+performance.now()-started;
  }
  scope.decisions.set(key,{sectors,result});
  return result;
}
function wallSideDecision(nav,scope,a,side,wallId,origin,sectors){
  const key=`wall-side:${a.radius}:${origin}:${wallId}:${side.x.toFixed(2)},${side.z.toFixed(2)}`;
  const old=scope.decisions.get(key);
  if(old?.sectors===sectors)return old.status;
  if(scope.queries>=RAID_REGION_QUERIES_PER_TICK)return null;
  scope.queries++;
  const status=nav.regionConnected(a,side,a.radius,null,false);
  scope.decisions.set(key,{sectors,status});
  return status;
}
function wallRegionPortals(nav,scope,radius,structures,sectors){
  const key=`wall-portals:${radius}`;
  const previous=scope.decisions.get(key);
  if(previous?.sectors===sectors)return previous.graph;
  const stats=nav.raidSelectionStats,started=stats?performance.now():0;
  const graph=new Map(),add=(from,to,wallId,point)=>{
    if(!graph.has(from))graph.set(from,[]);
    graph.get(from).push({to,wallId,point});
  };
  for(const wall of structures){
    if(wall.kind!=='wall'||wall.status==='ruined')continue;
    const frame=wallCollisionFrame(wall),normal={x:Math.sin(frame.yaw),z:Math.cos(frame.yaw)},
      tangent={x:frame.c,z:-frame.s},offset=frame.depth+radius+.6;
    for(const along of [0,-.6,.6]){
      const center={x:frame.x+tangent.x*frame.width*along,
        z:frame.z+tangent.z*frame.width*along};
      const pair=[1,-1].map(sign=>({x:center.x+normal.x*offset*sign,
        z:center.z+normal.z*offset*sign}));
      const regions=pair.map(point=>nav.enclosureFor(point,radius));
      if(regions.some(region=>region.status==='unknown'||!region.ids.length)||
         regions[0].ids.some(id=>regions[1].ids.includes(id)))continue;
      for(const from of regions[0].ids)for(const to of regions[1].ids){
        add(from,to,wall.id,pair[0]);add(to,from,wall.id,pair[1]);
      }
      break;
    }
  }
  if(stats){
    stats.wallPortalBuilds=(stats.wallPortalBuilds??0)+1;
    stats.wallPortalBuildMs=(stats.wallPortalBuildMs??0)+performance.now()-started;
  }
  scope.decisions.set(key,{sectors,graph});
  return graph;
}
function perimeterWallSides(nav,scope,enclosure,origin,radius,structures,sectors){
  const key=`perimeter:${radius}:${enclosure.ids.join('|')}:${origin.ids.join('|')}`;
  const previous=scope.decisions.get(key);
  if(previous?.sectors===sectors)return previous.sides;
  const stats=nav.raidSelectionStats,started=stats?performance.now():0;
  const graph=wallRegionPortals(nav,scope,radius,structures,sectors);
  const distances=new Map(),queue=[];
  for(const id of enclosure.ids){distances.set(id,0);queue.push(id);}
  for(let i=0;i<queue.length;i++){
    const from=queue[i],depth=distances.get(from);
    for(const edge of graph.get(from)??[])if(!distances.has(edge.to)){
      distances.set(edge.to,depth+1);queue.push(edge.to);
    }
  }
  const sides=new Map();
  const best=Math.min(...origin.ids.map(id=>distances.get(id)??Infinity));
  if(Number.isFinite(best))for(const id of origin.ids){
    if(distances.get(id)!==best)continue;
    for(const edge of graph.get(id)??[])
      if(distances.get(edge.to)===best-1)sides.set(edge.wallId,edge.point);
  }
  if(stats){
    stats.perimeterClassifications=(stats.perimeterClassifications??0)+1;
    stats.perimeterClassificationMs=(stats.perimeterClassificationMs??0)+performance.now()-started;
  }
  scope.decisions.set(key,{sectors,sides});
  return sides;
}
function cropTargetGroups(plants){
  const living=activeCrops(plants),cached=cropTargetIndexes.get(plants);
  if(cached&&cached.historyLength===plants.length&&cached.livingLength===living.length)return cached.groups;
  const components=createCropGrouping(plants),seen=new Set(),groups=[];
  for(const p of components.living)if(!seen.has(p.id)){
    const group=components.group(p);group.forEach(crop=>seen.add(crop.id));
    const id=group.map(crop=>crop.id).sort()[0];
    groups.push({id:`crop:${id}`,targets:group,value:group.length*B.crops.find(crop=>crop.id===p.species).base_harvest_value,regions:new Map()});
  }
  groups.sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  cropTargetIndexes.set(plants,{historyLength:plants.length,livingLength:living.length,groups});
  return groups;
}
export function planNight(s) {
  const prepared=preparePressureNight(s);
  s.nightPlan=prepared.plan;s.raidPressureMemory=prepared.memory;s.rng=prepared.rng;
}
export function planDay(s) {s.dayPlan={at:(115+nextRandom(s)*420)/2.4,done:false};}
export function cameraRaidEntry(s,specs,bounds,nav,view=nav.raidView,maxSearches=2){
  if(!view)return null;
  const dx=view.eye.x-view.target.x,dz=view.eye.z-view.target.z,length=Math.hypot(dx,dz);if(length<1e-6)return null;
  const bx=dx/length,bz=dz/length,spacing=Math.max(...specs.map(v=>v.radius))*2+1.1;
  const [minX,minZ,maxX,maxZ]=bounds;
  const centers=s.structures.filter(operational),walls=s.structures.filter(t=>t.kind==='wall'&&t.hp>0&&t.status!=='collapsing');
  // If the camera looks across disconnected water, try the near farm side.
  // Never perform an unbounded sequence of full A* searches during spawning.
  const focus=centers[0],anchors=[view.eye];
  if(focus)anchors.push(centerBoundaryPoint(focus,Math.atan2(bx,bz),2,s));
  for(const anchor of anchors){
    const points=[],exits=[];let searches=0;
    for(let i=0;i<specs.length;i++){
      const {radius}=specs[i];let chosen=null;
      const candidates=[];
      for(const back of [radius+2,radius+4,radius+6,radius+8,radius+12])for(const shift of [0,1,-1,2,-2,3,-3,4,-4,5,-5,6,-6]){
        const lateral=(i-(specs.length-1)/2+shift)*spacing;
        candidates.push({x:anchor.x+bx*back-bz*lateral,z:anchor.z+bz*back+bx*lateral,distance:back*back+lateral*lateral});
      }
      candidates.sort((a,b)=>a.distance-b.distance);
      for(const candidate of candidates){
        const point={x:candidate.x,z:candidate.z},exit={x:point.x+bx*3,z:point.z+bz*3};
        // A reachable lateral probe can still be far outside the near-arrival
        // area, especially beside a winding canyon river. Keep the
        // original camera/farm distance contract before spending path searches.
        const camera=nav.raidView?.eye??view.eye;
        if(dist(point,camera)>=20&&(!focus||dist(point,focus)>=12))continue;
        if([point,exit].some(p=>p.x-radius<minX||p.x+radius>maxX||p.z-radius<minZ||p.z+radius>maxZ))continue;
        if(!nav.walkable(point.x,point.z,radius,null,false)||!nav.walkable(exit.x,exit.z,radius,null,false))continue;
        if(points.some((p,j)=>dist(p,point)<=specs[j].radius+radius+1))continue;
        if(nav.segmentClear?!nav.segmentClear(point,exit,radius,null,false):!nav.path(point,exit,radius,null,false))continue;
        const targets=[...centers,...walls].sort((a,b)=>dist(a,point)-dist(b,point)).slice(0,2);
        let reachable=!targets.length;
        for(const target of targets){
          const angle=Math.atan2(point.x-target.x,point.z-target.z);
          const approach=target.kind==='center'?centerDeliveryPoint(target,point,s,radius+.5):{x:target.x+Math.sin(angle)*(radius+1.2),z:target.z+Math.cos(angle)*(radius+1.2)};
          if(!nav.walkable(approach.x,approach.z,radius,null,false))continue;
          if(nav.segmentClear?.(point,approach,radius,null,false)){reachable=true;break;}
          if(searches>=maxSearches)continue;searches++;
          try{
            if((nav.approachPath??nav.path).call(nav,point,approach,radius,null,false)){
              reachable=true;break;
            }
          }catch(error){
            // A speculative entrance candidate may need chunks that are not
            // resident yet. Try the next candidate; do not abort the raid tick.
            if(error?.name!=='SpatialChunkUnavailable')throw error;
          }
        }
        if(!reachable)continue;chosen={point,exit};break;
      }
      if(!chosen)break;points.push(chosen.point);exits.push(chosen.exit);
    }
    if(points.length===specs.length)return {entries:points,exits};
  }
  return null;
}
function nearFarmRaidEntry(s,specs,bounds,nav){
  const focus=s.structures.find(operational),view=nav.raidView;
  if(!focus||!view)return null;
  const angle=Math.atan2(view.eye.x-view.target.x,view.eye.z-view.target.z);
  // A dune or river can disconnect the entire rear of the camera. Try clear
  // approaches around the farm before falling back to a distant map edge.
  // These candidates require direct native reachability; no repeated A* here.
  const offsets=[0];for(let i=1;i<8;i++)offsets.push(-i*Math.PI/8,i*Math.PI/8);offsets.push(Math.PI);
  for(const offset of offsets){
    const heading=angle+offset,eye={x:focus.x+Math.sin(heading)*8,z:focus.z+Math.cos(heading)*8};
    const entry=cameraRaidEntry(s,specs,bounds,nav,{eye,target:focus},0);
    if(entry)return entry;
  }
  return null;
}
function baseRaidEntry(s,specs,bounds,preferredSide,nav){
  const focus=s.structures.find(operational)??s.villages[0];
  const inset=Math.max(...specs.map(({radius})=>radius))+.25;
  const [minX,minZ,maxX,maxZ]=bounds;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const nearby=cameraRaidEntry(s,specs,bounds,nav)??nearFarmRaidEntry(s,specs,bounds,nav);
  let entries=nearby?.entries??null,exits=nearby?.exits??null;
  for(let sideTry=0;sideTry<4&&!entries;sideTry++){
    const side=(preferredSide+sideTry)%4;
    const spread=(specs.length-1)*2+2,lo=(side<2?minZ:minX)+inset+spread,hi=(side<2?maxZ:maxX)-inset-spread;
    if(lo>hi)continue;
    const preferred=clamp(side<2?focus.z:focus.x,lo,hi),anchors=[preferred];
    // Cover the entire edge, nearest to the farm first, without repeatedly
    // clamping attempts to the same corner or resampling gameplay randomness.
    for(let offset=2;offset<=Math.max(preferred-lo,hi-preferred);offset+=2){if(preferred+offset<=hi)anchors.push(preferred+offset);if(preferred-offset>=lo)anchors.push(preferred-offset);}
    anchors.push(lo,hi);
    for(const along of new Set(anchors)){
      if(entries)break;
      const points=[],retreats=[];
      for(let i=0;i<specs.length;i++){
        const {radius}=specs[i];let spawn=null;
        for(const adjustment of [0,1,-1,2,-2]){
          const offset=(i-(specs.length-1)/2)*4+adjustment;
          const exit=side<2?
            {x:side?maxX-inset:minX+inset,z:along+offset}:
            {x:along+offset,z:side===3?maxZ-inset:minZ+inset};
          const point={x:exit.x+(side===0?3:side===1?-3:0),z:exit.z+(side===2?3:side===3?-3:0)};
          const clear=()=>nav.segmentClear?nav.segmentClear(point,exit,radius,null,false):!!nav.path(point,exit,radius,null,false);
          if(point.x-radius>=minX&&point.x+radius<=maxX&&point.z-radius>=minZ&&point.z+radius<=maxZ&&nav.walkable(point.x,point.z,radius,null,false)&&nav.walkable(exit.x,exit.z,radius,null,false)&&points.every((p,j)=>dist(p,point)>specs[j].radius+radius+1)&&clear()){
            spawn=point;retreats.push(exit);break;
          }
        }
        if(!spawn)break;points.push(spawn);
      }
      if(points.length===specs.length){entries=points;exits=retreats;}
    }
  }
  return entries?{entries,exits}:null;
}
export function chooseRaidEntry(s,specs,bounds,preferredSide,nav){
  if(!nav.field?.canyon)return exteriorRaidEntry(s,specs,bounds,preferredSide,nav,baseRaidEntry,cameraRaidEntry);
  // Canyon animals follow the river on the farm's bank. Generic edge and
  // camera entries can choose the opposite bank, which cannot reach crops.
  const entry=canyonRaidFormation(s,specs,bounds,nav,reachableApproach);
  if(entry)return entry;
  // One half-chunk search extension lets a complete bank formation straddle
  // the current resident edge. It is not a terrain override or a smaller wave.
  // The existing sparse birth/exit residency demand gates the actual spawn.
  const expanded=bounds.map((value,i)=>value+(i<2?-24:24));
  const view=Object.assign(Object.create(nav),{activeBounds:expanded});
  const bank=canyonRaidFormation(s,specs,expanded,view,reachableApproach);
  return bank?{...bank,selectionBounds:expanded}:null;
}
export function spawnRaid(s,plan,nav,daytime=false) {
  const previous=s.raid,wave=previous&&eligiblePendingRaidWavePlan(s)===plan;
  if(previous&&!wave)return false;if(s.postgame)return;
  let group=plan.group;
  if(daytime&&!group) {
    const value=attraction(s.plants);if(value<10000||nextRandom(s)>=.1)return;
    const budget=randomInt(s,7,10),legal=createRaidCompositionIndex(budget,threatTier(value).unlocked_species);group=legal.at(randomInt(s,0,legal.count-1));plan.group=[...group];
  }
  if(!group?.length)return;
  const focus=s.structures.find(operational)??s.villages[0];
  const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const bounds=validActiveBounds(nav.activeBounds)?[...nav.activeBounds]:activeChunkRegion(focus).bounds;
  const prepared=nav.preparedRaidEntry?.(s,group,bounds);
  if(prepared)warmRaidNavigation(nav,prepared.warmth);
  const preferredSide=randomInt({rng:s.rng},0,3);
  const selectionKey=raidEntryKey(s,nav,group,bounds)??JSON.stringify([s.rng,nav.version,group,bounds,nav.raidView,s.structures.map(t=>[t.id,t.status,t.hp>0])]);
  if(nav.raidEntryDemand?.key!==selectionKey)delete nav.raidEntryDemand;
  let cache=entrySelections.get(nav);if(!cache){cache=new Map();entrySelections.set(nav,cache);}let cached=cache.get(selectionKey);
  if(!prepared&&!cached){cached={key:selectionKey,entry:chooseRaidEntry(s,specs,bounds,preferredSide,nav)};if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(selectionKey,cached);}
  const entry=prepared?prepared.entry:cached.entry;
  const entries=entry?.entries,exits=entry?.exits;
  if(!entries){if(nav.raidEntryFailure?.key!==selectionKey){nav.raidEntryFailure={key:selectionKey,version:nav.version,group:[...group],bounds:[...bounds]};if(!s.messages.at(-1)?.text.includes('incursión espera una entrada físicamente exterior'))notice(s,'La incursión espera una entrada físicamente exterior transitable para su grupo completo.');}return false;}
  nav.raidEntryDemand={entry,radii:specs.map(v=>v.radius),key:selectionKey};
  if(nav.raidEntryResident&&!nav.raidEntryResident(entry,specs.map(v=>v.radius)))return false;
  if(entry.selectionBounds)nav.setActiveBounds?.(includeRaidBounds(bounds,raidEntryChunks(entry,specs.map(v=>v.radius))));
  randomInt(s,0,3);delete nav.raidEntryFailure;delete nav.raidEntryDemand;
  const animals=specs.map(({spec,radius},i)=>({id:`animal-${s.nextId++}`,species:spec.id,...entries[i],spawn:{...entries[i]},exit:{...exits[i]},radius,
    hitsRemaining:plan.actors?.[i]?.hits??(plan.introductory&&!daytime?spec.hit_budget_min:randomInt(s,spec.hit_budget_min,spec.hit_budget_max)),...(plan.actors?.[i]?.damageProfile?{damageProfile:structuredClone(plan.actors[i].damageProfile)}:{}),status:'entering',targetId:null,reservation:null,path:null,attackRemaining:0,attackId:null,hitApplied:false}));
  if(wave){previous.animals.push(...animals);previous.waveIndex=plan.index;delete previous.pendingWavePlan;}
  else s.raid={id:`raid-${s.day}-${daytime?'day':'night'}`,animals,encounters:[],reservations:{},daytime,...(plan.pressureVersion===1?{waves:structuredClone(plan.waves),waveIndex:0,pressureFacts:structuredClone(plan.pressureFacts)}:{})};
  if(plan.introductory&&!daytime){
    const count=activeCrops(s.plants).filter(p=>p.alive).length;
    s.raid.introPlantCount=count;s.raid.introCropLimit=Math.max(0,Math.min(count-1,Math.ceil(count*.2)));s.raid.introCropsDestroyed=0;
  }
  for(const w of wave?[]:s.workers) {
    cancelIdle(w);
    releaseTask(s,w);w.path=null;w.hits=0;
    if(w.crateId)dropCarriedCrate(s,w);
    if(w.status!=='home')w.status='fleeing';
    notifyWorkerPlanningChange(s,w);
  }
  replaceTasks(s,s.tasks.filter(t=>t.kind!=='repair'));
  if(!wave)notice(s,RAID_NOTICE_TEXT,animals[0].id);
  const exposed=activeCrops(s.plants).filter(p=>p.alive);
  emit(s,wave?'RaidWaveSpawned':'RaidSpawned',{raidFacts:{id:s.raid.id,day:s.day,daytime,elapsed:s.elapsed,waveIndex:s.raid.waveIndex??0,pressureFacts:s.raid.pressureFacts??null,exposedLiving:exposed.length,exposedWounded:exposed.filter(p=>(p.attackHits??0)>0).length,actors:animals.map(a=>({id:a.id,species:a.species,hitsRemaining:a.hitsRemaining,...(a.damageProfile?{damageProfile:structuredClone(a.damageProfile)}:{}),spawn:{...a.spawn},exit:{...a.exit}}))}});return true;
}
function release(s,a,nav) {nav?.intentTaskPlanner?.cancelAttackIntent(a.id);if(a.reservation&&s.raid.reservations[a.reservation]===a.id){delete s.raid.reservations[a.reservation];s.raid.waitRevision=((s.raid.waitRevision??0)+1)>>>0;}a.reservation=null;a.targetId=null;a.path=null;a.approach=null;a.approachShieldId=null;}
function publishRetreat(s,a,reason){
  leaveWait(s.raid,a);a.status='retreating';delete a.retreatRouteUnknown;
  emit(s,'AnimalRetreating',{targetId:a.id,species:a.species,
    hitsRemaining:a.hitsRemaining,reason});
}
function beginRetreat(s,a,nav,reason){
  publishRetreat(s,a,reason);
  const route=nav.intentTaskPlanner?.planRetreatRoute?.(s,a);
  if(route?.status==='found'){
    a.path=route.path;a.destinationId=`exit-${a.id}`;a.pathVersion=nav.version;
  }
}
function requestUnknownRaidTerrain(nav,error,start,end,radius){
  for(const {cx,cz} of error.missing??[])
    nav.requestRaidFrontier?.({x:cx*48,z:cz*48});
  nav.requestRaidConnectivity?.(start,end,radius);
}
function finishUnknownRetreat(s,a,nav,reason){
  emit(s,'AnimalRetreatExitAbandoned',{actorId:a.id,x:a.x,z:a.z,
    elapsed:s.elapsed,reason,hitsRemaining:a.hitsRemaining??0,
    seconds:s.elapsed-(a.retreatRouteUnknown?.since??s.elapsed)});
  a.status='gone';publishAnimalGone(s,a.id);a.path=null;
  delete a.retreatRouteUnknown;delete a.exitConnectorSearch;
  nav.intentTaskPlanner?.finishRetreatIntent?.(a.id);
}
export function reachableApproach(a,target,nav,shield=null,onUnknown=null,regionDecision=null){
  const focus=shield??target,r=shield?shield.radius+a.radius+.1:(target.kind==='wall'?1.2:.6)+a.radius;
  const angle=Math.atan2(a.x-focus.x,a.z-focus.z);
  // One preferred service point and bounded local alternatives. Connectivity
  // is decided at region level by targetFor; this is only the final approach.
  for(const [sample,offset] of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI].entries()){
    const point={id:`approach-${target.id}-${shield?.id??'direct'}-${sample}`,...(!shield&&target.kind==='center'?centerBoundaryPoint(target,angle+offset,a.radius+.5,nav.state):{x:focus.x+Math.sin(angle+offset)*r,z:focus.z+Math.cos(angle+offset)*r})};
    if(nav.state?.raid&&!reservedApproachClear(nav.state,a,point))continue;
    if(nav.state&&!actorSegmentClear(point,point,a,actorBlockers(nav.state,a,false)))continue;
    if(!nav.walkable(point.x,point.z,a.radius,null,false))continue;
    if(target.alive&&!shield&&nav.state&&!agriculturalRayClear(nav.state,nav,point,target,a.radius))continue;
    // The native region graph can prove that this service point is on the
    // opposite side of a barrier. Only ask for a detailed route when the
    // regions might connect; unknown connectivity still gets a full search.
    if(nav.regionConnected){
      const {scope,origin,sectors}=regionDecision??{};
      const destination=scope&&origin&&!origin.startsWith('unknown:')?
        nav.regionFor?.(point,a.radius,null,false)?.key:null;
      const key=destination?`service-region:${a.radius}:${origin}:${destination}`:null;
      let connected=key&&scope.decisions.get(key)?.sectors===sectors?
        scope.decisions.get(key).status:undefined;
      if(connected===undefined){
        connected=nav.regionConnected(a,point,a.radius,null,false);
        if(key&&connected!==null){
          if(scope.decisions.size>=2048)scope.decisions.delete(scope.decisions.keys().next().value);
          scope.decisions.set(key,{sectors,status:connected});
        }
      }
      if(connected===false)continue;
    }
    // A complete 32-cell corridor lets the native search certify enclosed
    // islands once and reuse that proof across nearby crop service points.
    let path;
    try{path=nav.approachPath?nav.approachPath(a,point,a.radius,32):nav.path(a,point,a.radius,null,false,32);}
    catch(error){
      if(error?.name!=='SpatialChunkUnavailable')throw error;
      requestUnknownRaidTerrain(nav,error,a,point,a.radius);
      onUnknown?.();
      continue;
    }
    // Native attack leases certify the swept route after selection. Reject a
    // connector here if the continuous movement predicate disagrees with the
    // discrete route, so one stale or borderline connector cannot abort a raid.
    if(path&&nav.intentTaskPlanner){
      let previous=a;
      for(const next of path){
        if(!nav.segmentClear(previous,next,a.radius,null,false)){
          path=null;break;
        }
        previous=next;
      }
    }
    if(path)return {point,path};
  }
  return null;
}
export function canAttackCrop(s,p){
  return p.alive&&(cropImpactDamage(p)<CROP_HIT_POINTS-1||s.raid.introCropLimit===undefined||(s.raid.introCropsDestroyed??0)<s.raid.introCropLimit);
}
export function raidTarget(s,id){
  const eligible=t=>t.id===id&&(!('alive' in t)||canAttackCrop(s,t))&&(!('status' in t)||t.status==='intact');
  // Keep crop-first selection and eligibility without allocating a copy of
  // the complete farm history for every animal and simulation step.
  return activeCrops(s.plants).find(eligible)??s.structures.find(eligible);
}
export function targetFor(s,a,nav,nativeCropOnly=false) {
  nav.planningObserver?.({kind:'attackSelection',actorId:a.id,elapsed:s.elapsed});
  const stats=nav.raidSelectionStats;
  const started=stats?performance.now():0;
  if(stats)stats.selections=(stats.selections??0)+1;
  try{
    const native=nav.intentTaskPlanner?.planAttackCrop?.(s,a);
    if(native&&stats){
      stats.nativeCropPlans=(stats.nativeCropPlans??0)+1;
      stats.nativeCropRegionQueries=(stats.nativeCropRegionQueries??0)+
        (native.regionQueries??0);
      stats.nativeCropRouteQueries=(stats.nativeCropRouteQueries??0)+
        (native.routeQueries??0);
      stats.nativeCropResults??={};
      stats.nativeCropResults[native.status]=
        (stats.nativeCropResults[native.status]??0)+1;
      if(native.status==='unknown'){
        stats.nativeUnknownCauses??={};
        const mask=native.diagnostics?.unknownCauseMask??0;
        for(let bit=0;bit<NATIVE_UNKNOWN_CAUSES.length;bit++)if(mask&(1<<bit)){
          const cause=NATIVE_UNKNOWN_CAUSES[bit];
          stats.nativeUnknownCauses[cause]=
            (stats.nativeUnknownCauses[cause]??0)+1;
        }
        for(const reason of NATIVE_REGION_UNKNOWN_REASONS)
          if(mask&(1<<(8+reason))){
          const cause=`region-reason-${reason}`;
          stats.nativeUnknownCauses[cause]=
            (stats.nativeUnknownCauses[cause]??0)+1;
        }
        stats.nativeUnknownDiagnostics??=[];
        if(stats.nativeUnknownDiagnostics.length<16)
          stats.nativeUnknownDiagnostics.push({actorId:a.id,
            day:s.day,time:s.time,frontier:native.frontier,
            ...native.diagnostics});
      }
    }
    if(native?.status==='found'){
      const point=native.approach.point;
      const rejected=!canAttackCrop(s,native.target)?'ineligible':
        targetReserved(s,a,native.target)?'reserved-target':
          !reservedApproachClear(s,a,point)?'reserved-approach':
            !actorSegmentClear(point,point,a,actorBlockers(s,a,false))?'occupied-approach':
              !nav.walkable(point.x,point.z,a.radius,null,false)?'physical-approach':null;
      if(!rejected)
        return {...native,shieldId:null};
      if(stats){
        stats.nativeCropRejections??={};
        stats.nativeCropRejections[rejected]=
          (stats.nativeCropRejections[rejected]??0)+1;
      }
      nav.intentTaskPlanner.cancelAttackIntent(a.id);
    }
    if(native?.status==='unknown'&&native.frontier){
      const queued=nav.requestRaidFrontier?.(native.frontier)??false;
      if(stats){
        stats.nativeFrontierOffers=(stats.nativeFrontierOffers??0)+1;
        if(queued)stats.nativeFrontierQueued=(stats.nativeFrontierQueued??0)+1;
      }
    }
    if(nativeCropOnly)return null;
    let nativeWallStatus='not-requested';
    if(nav.intentTaskPlanner?.nativeWallSelectionEnabled&&
      (native?.status==='blocked'||native?.status==='unknown')){
      const wall=nav.intentTaskPlanner.planAttackWall(s,a);
      nativeWallStatus=wall?.status??'unavailable';
      if(stats&&wall){
        stats.nativeWallPlans=(stats.nativeWallPlans??0)+1;
        stats.nativeWallRouteQueries=(stats.nativeWallRouteQueries??0)+
          (wall.routeQueries??0);
        stats.nativeWallResults??={};
        stats.nativeWallResults[wall.status]=
          (stats.nativeWallResults[wall.status]??0)+1;
      }
      if(wall?.status==='found'){
        const point=wall.approach.point;
        const rejected=targetReserved(s,a,wall.target)?'reserved-target':
          !reservedApproachClear(s,a,point)?'reserved-approach':
            !actorSegmentClear(point,point,a,actorBlockers(s,a,false))?
              'occupied-approach':
              !nav.walkable(point.x,point.z,a.radius,null,false)?
                'physical-approach':null;
        if(!rejected)return {...wall,shieldId:null};
        nav.intentTaskPlanner.cancelAttackIntent(a.id);
        if(stats){
          stats.nativeWallRejections??={};
          stats.nativeWallRejections[rejected]=
            (stats.nativeWallRejections[rejected]??0)+1;
        }
      }
    }
    // The native crop planner can leave interaction sites unresolved even
    // when the graph certifies that a wall separates the raid from the farm.
    // Ask the existing region/perimeter selector only for physical barriers;
    // do not re-enter its per-crop approach search on an unknown crop region.
    if(native?.status==='unknown'){
      const barrier=targetForImpl(s,a,nav,stats,{structuresOnly:true,
        skipConnectivityDemand:!!native.frontier});
      return barrier?.target?barrier:{unknown:true};
    }
    if(native?.status==='occupied')return {unknown:true,waitReason:'contention'};
    const fallback=targetForImpl(s,a,nav,stats);
    if(stats){
      const reason=native?.status??'unsupported',
        result=fallback?.unknown?'unknown':fallback?.target?.kind??
          (fallback?.target?'crop':'none');
      stats.legacyFallbacks??={};stats.legacyFallbackResults??={};
      stats.legacyFallbacks[reason]=(stats.legacyFallbacks[reason]??0)+1;
      stats.legacyFallbackResults[result]=
        (stats.legacyFallbackResults[result]??0)+1;
      stats.legacyFallbackMatrix??={};
      const key=`${reason}/${nativeWallStatus}`;
      const outcomes=stats.legacyFallbackMatrix[key]??={};
      outcomes[result]=(outcomes[result]??0)+1;
      if(nativeWallStatus==='occupied'&&fallback?.target){
        const samples=stats.occupiedWallFallbackSamples??=[];
        if(samples.length<8)samples.push({day:s.day,time:s.time,
          actorId:a.id,species:a.species,x:a.x,z:a.z,
          targetId:fallback.target.id,targetKind:fallback.target.kind,
          result});
      }
    }
    return fallback;
  }finally{
    if(stats)stats.selectionMs=(stats.selectionMs??0)+performance.now()-started;
    const scope=raidRegionDecisions.get(nav);
    if(stats&&scope){
      stats.maxRegionalQueriesPerTick=Math.max(stats.maxRegionalQueriesPerTick??0,scope.queries);
      stats.decisionCacheEntries=scope.decisions.size;
    }
  }
}
function targetForImpl(s,a,nav,stats,
  {structuresOnly=false,skipConnectivityDemand=false}={}){
  let unknown=false;
  const sealedWallSides=new Map();
  const sealedCropRepresentatives=[];
  const unresolvedCropRepresentatives=[];
  let certifiedSealedCrop=false;
  const scope=nav.spatialSectorRevision?regionDecisionScope(s,nav):null;
  const origin=scope?(nav.regionFor?.(a,a.radius,null,false)?.key??
    `unknown:${a.id}`):null;
  const originEnclosure=scope&&nav.enclosureFor?.(a,a.radius);
  const sectorRevision=scope?nav.spatialSectorRevision(a.radius):0;
  const markUnknown=()=>{unknown=true;};
  const groups=cropTargetGroups(s.plants);
  for(const group of groups){
    if(stats){stats.groups=(stats.groups??0)+1;stats.groupVisits??={};stats.groupVisits[group.id]=(stats.groupVisits[group.id]??0)+1;}
    const profile=String(a.radius),entry=group.regions.get(profile);
    let byRegion=entry?.version===nav.version&&entry?.sectors===sectorRevision?
      entry.byRegion:null;
    if(!byRegion){
      byRegion=new Map();
      for(const p of group.targets){
        const key=nav.regionFor?.(p,a.radius,null,false)?.key??`unknown:${group.id}`;
        if(!byRegion.has(key))byRegion.set(key,[]);
        byRegion.get(key).push(p);
      }
      group.regions.set(profile,{version:nav.version,sectors:sectorRevision,byRegion});
    }
    for(const [regionKey,candidates] of byRegion){
      if(stats)stats.regions=(stats.regions??0)+1;
      // One abstract connectivity query represents all crops in this region.
      const status=scope?cropRegionDecision(s,a,nav,group,regionKey,candidates,
        scope,origin,sectorRevision,!skipConnectivityDemand):
        nav.regionConnected?.(a,candidates[0],a.radius,null,false)===false?'blocked':'accessible';
      if(stats)stats[status]=(stats[status]??0)+1;
      if(status==='unknown'||status==='blocked'){
        const enclosure=scope&&enclosedCropRegion(nav,scope,group,regionKey,
          candidates,a.radius,sectorRevision);
        const definitelyOutside=enclosure?.status==='sealed'&&
          originEnclosure?.status!=='unknown'&&originEnclosure?.ids?.length>0&&
          !originEnclosure.ids.some(id=>enclosure.ids.includes(id));
        if(definitelyOutside){
          certifiedSealedCrop=true;
          if(status==='unknown'){
            const destination=regionKey.startsWith('unknown:')?
              `${group.id}:${regionKey}`:regionKey;
            scope.decisions.set(`${a.radius}:${origin}:${destination}`,
              {status:'blocked',at:s.elapsed,sectors:sectorRevision});
          }
          const perimeter=perimeterWallSides(nav,scope,enclosure,
            originEnclosure,a.radius,s.structures,sectorRevision);
          for(const [id,point] of perimeter)sealedWallSides.set(id,point);
          // The wall-only graph can have no path to a sealed crop when a
          // sampled wall side is unknown. Nominate only walls crossed toward
          // a nearby crop; the native path must still reach the attack side.
          if(!perimeter.size){
            sealedCropRepresentatives.push(...[...candidates]
              .sort((p,q)=>dist(a,p)-dist(a,q)).slice(0,8));
            sealedCropRepresentatives.sort((p,q)=>dist(a,p)-dist(a,q));
            sealedCropRepresentatives.length=Math.min(sealedCropRepresentatives.length,8);
          }
        }else if(status==='unknown'){
          unknown=true;unresolvedCropRepresentatives.push(candidates[0]);
        }
        continue;
      }
      if(structuresOnly)continue;
      const eligible=candidates.filter(p=>canAttackCrop(s,p)&&!targetReserved(s,a,p));
      if(!eligible.length)continue;
      eligible.sort((p,q)=>dist(a,p)-dist(a,q));
      for(const p of eligible){
        if(stats)stats.cropAttempts=(stats.cropAttempts??0)+1;
        const shield=spellAt(s,'shield',p),approach=reachableApproach(a,p,nav,shield,markUnknown,
          scope?{scope,origin,sectors:sectorRevision}:null);
        if(approach)return {target:p,reservation:targetReservationKey(p,a),approach,shieldId:shield?.id??null};
      }
    }
  }
  // Certified enclosures nominate their perimeter; unresolved regions leave
  // only independently reachable nearby structures as alternatives.
  const geometricWallCrops=[...unresolvedCropRepresentatives,...sealedCropRepresentatives];
  const structures=defensiveGroups(s),near=g=>Math.min(...g.targets.map(t=>dist(a,t)));
  structures.sort((p,q)=>groups.length?near(p)-near(q):q.value-p.value||near(p)-near(q)||p.id.localeCompare(q.id));
  for(const group of structures)for(const structure of [...group.targets].sort((p,q)=>dist(a,p)-dist(a,q)||p.id.localeCompare(q.id))) {
    if(targetReserved(s,a,structure))continue;
    if(nav.spatialSectorRevision){
      if(structure.kind==='wall'){
        const nearSide=sealedWallSides.get(structure.id);
        if(!nearSide&&certifiedSealedCrop&&!sealedCropRepresentatives.length)continue;
        if(!nearSide){
          // A missing graph edge or unresolved crop does not certify a wall.
          // The wall must intersect the route toward a crop and its near side
          // must be reachable in the native graph.
          const frame=wallCollisionFrame(structure);
          const local=point=>({x:(point.x-frame.x)*frame.c-(point.z-frame.z)*frame.s,
            z:(point.x-frame.x)*frame.s+(point.z-frame.z)*frame.c});
          const from=local(a),sign=Math.sign(from.z);
          if(!sign)continue;
          let between=false;
          for(const crop of geometricWallCrops){
            const to=local(crop);
            if(from.z*to.z>=0)continue;
            const crossing=from.x+(to.x-from.x)*(-from.z)/(to.z-from.z);
            if(Math.abs(crossing)<=frame.width+a.radius){between=true;break;}
          }
          if(!between)continue;
          const offset=frame.depth+a.radius+.6;
          const side={x:frame.x+Math.sin(frame.yaw)*offset*sign,
            z:frame.z+Math.cos(frame.yaw)*offset*sign};
          const reachable=wallSideDecision(nav,scope,a,side,structure.id,
            origin,sectorRevision);
          if(reachable!==true){if(reachable===null)unknown=true;continue;}
        }
        if(nearSide){
          const reachable=wallSideDecision(nav,scope,a,nearSide,structure.id,
            origin,sectorRevision);
          if(reachable!==true){if(reachable===null)unknown=true;continue;}
        }
      }
    }
    // An unloaded route to the same structure from the same native region is
    // one unresolved question, not one question per moving animal per tick.
    const key=scope?`approach:${a.radius}:${origin}:${structure.id}`:null;
    const old=key&&scope.decisions.get(key);
    if(old?.status==='unknown'&&old.sectors===sectorRevision&&s.elapsed-old.at<RAID_REGION_RETRY_SECONDS){unknown=true;continue;}
    const shield=spellAt(s,'shield',structure);
    let unresolved=false;
    const approach=reachableApproach(a,structure,nav,shield,()=>{unresolved=true;markUnknown();},
      scope?{scope,origin,sectors:sectorRevision}:null);
    if(key&&unresolved&&!approach){
      if(scope.decisions.size>=2048)scope.decisions.delete(scope.decisions.keys().next().value);
      scope.decisions.set(key,{status:'unknown',at:s.elapsed,sectors:sectorRevision});
    }
    if(approach)return {target:structure,reservation:targetReservationKey(structure,a),approach,shieldId:shield?.id??null};
  }
  return unknown?{unknown:true}:null;
}
export function warmRaidApproaches(state,specs,entry,nav){
  if(!entry)return;
  // Preview chooses only which static queries to warm. No preview choice,
  // reservation, motion or damage is copied back into the real simulation.
  const preview={...state,raid:{reservations:{},animals:specs.map(({radius},i)=>({id:`preview-${i}`,...entry.entries[i],radius,status:'entering',hitsRemaining:1}))}};
  const originalState=nav.state;
  try{
    nav.state=preview;
    for(const animal of preview.raid.animals){
      const selected=targetFor(preview,animal,nav);
      if(selected&&!selected.unknown){preview.raid.reservations[selected.reservation]=animal.id;animal.targetId=selected.target.id;animal.approach=selected.approach.point;}
    }
  }finally{nav.state=originalState;}
}
// Interrupt both authoritative intent ownership and the JS approach reservation.
// Recovery must select a fresh route from the displaced physical position.
export function interruptAnimalAttack(s,a,nav) {
 // Native cancellation deliberately refuses a committed strike. Finish its
 // ownership first; damage is emitted by updateRaid, not by this operation.
 if(a.status==='attacking')nav?.intentTaskPlanner?.finishAttackIntent(a.id);
 release(s,a,nav);a.destinationId=null;a.hitApplied=true;a.attackRemaining=0;
 if(a.status==='attacking')a.status='walking';
}
export function retreatAnimal(s,a,reason='magic',nav={}) {
 release(s,a,nav);a.hitApplied=true;a.attackRemaining=0;beginRetreat(s,a,nav,reason);
}
function nativeDesertIntroductoryCenterRaid(state){
 const raid=state.raid;
 return state.biome==='desierto'&&raid?.daytime===false&&raid.pressureFacts?.introductory===true&&
   raid.introCropLimit===0&&raid.animals.length===1&&raid.animals[0].species==='warthog'&&state.structures.length===1;
}
// The first native crop cohort has one mobile body and only inactive workers.
// A different encounter, protection or reservation requires a new admission.
export function nativeCenterAttackCohort(state,flightWorker=null){
 if(state.biome==='sabana')return state.structures.length===1&&state.structures[0].kind==='center'&&
   (state.raid?.daytime===true?state.workers.length===1:
     !flightWorker&&state.raid?.daytime===false&&Number.isSafeInteger(state.raid.introCropLimit))&&
   state.workers.every(worker=>worker===flightWorker||worker.status==='home'&&!worker.raidReturn&&!worker.nativeRouteAdmission);
 if(state.biome!=='desierto'||state.workers.length>1||!state.workers.every(worker=>
   worker===flightWorker||worker.status==='home'&&!worker.raidReturn&&!worker.nativeRouteAdmission)||
   state.structures[0]?.kind!=='center'||(!state.workers.length&&state.structures.some(structure=>structure.kind!=='center')))return false;
 const crops=activeCrops(state.plants);
 return !crops.length||!flightWorker&&nativeDesertIntroductoryCenterRaid(state)&&crops.every(crop=>!canAttackCrop(state,crop));
}
export function nativeCenterAttackSite(state,target){
 return !!target&&operational(target)&&(target===state.structures[0]||
   state.biome==='desierto'&&state.structures.includes(target));
}
function animalStructureDamage(animal){
 return validDamageProfile(animal.damageProfile)?animal.damageProfile.structureDamage:animalSpec(animal.species).structure_hit_damage;
}
function centerSurvivesStrikes(target,animal,hits){
 return target.hp-animalStructureDamage(animal)*hits>collapseThreshold(target)+1e-9;
}
function centerFootprintGap(a,b){
 if(footprintsOverlap(a,b))return 0;
 return Math.min(...a.map(point=>footprintDistance(b,point.x,point.z)),
   ...b.map(point=>footprintDistance(a,point.x,point.z)));
}
function centerCollapseWalkDistance(animal){
 const clips=ANIMAL_ACTIONS.animals[animal.species].clips;
 // A successor moves at approach speed, then the native strike must reach
 // the end of its clip before Game can apply the hit.
 const shortest=Math.min(...raidStrikeClips.map(name=>clips[name].duration));
 return Math.max(0,CENTER_COLLAPSE_SECONDS+.02-shortest)*APPROACH_SPEED;
}
function nativeCenterCollapseSuccessors(state,animal,target){
 if(state.biome!=='desierto'||state.spells.length||state.structures.some(structure=>
   structure.kind==='center'&&structure.status==='collapsing'))return null;
 const centers=state.structures.filter(center=>center!==target&&operational(center));
 const damage=animalStructureDamage(animal);
 const untilCollapse=Math.max(1,Math.ceil((target.hp-collapseThreshold(target)-1e-9)/damage));
 return centers.length&&centers.every(next=>centerSurvivesStrikes(next,animal,animal.hitsRemaining-untilCollapse))?
   centers:null;
}
export function nativeLiveCenterRaidCanArm(state,plan){
 const centers=state.structures.filter(operational);
 if(!centers.length)return false;
 if(state.structures.length===1)return true;
 // Arming the empty clock commits Game to native execution at birth.
 // Cover every possible target until the ordinary selector chooses one.
 const species=plan.group[0],actor=plan.actors?.[0],spec=animalSpec(species);
 const animal={species,damageProfile:actor?.damageProfile,hitsRemaining:actor?.hits??spec.hit_budget_max,
   radius:ANIMAL_ACTIONS.animals[species].presentation.footprint.radius};
 return state.structures.every(center=>center.status==='ruined'||operational(center))&&centers.every(center=>{
  if(centerSurvivesStrikes(center,animal,animal.hitsRemaining))return true;
  // Before spawn no exit has been selected. Every possible route to a
  // successor must leave either its approach or its strike live at the cut.
  if(centerSurvivesStrikes(center,animal,(actor?.hits??spec.hit_budget_min)-1))return false;
  const successors=nativeCenterCollapseSuccessors(state,animal,center);
  if(!successors)return false;
  const hull=centerFootprint(center,state).footprint;
  const clearance=animal.radius+.5,minimum=centerCollapseWalkDistance(animal);
  return successors.every(next=>centerFootprintGap(hull,centerFootprint(next,state).footprint)-2*clearance>minimum);
 });
}
export function nativeLiveCenterAttackSite(state,animal,target,approach=null,nav=null){
 if(!nativeCenterAttackSite(state,target))return false;
 if(!state.structures.some(center=>center!==target&&center.kind==='center')||
    centerSurvivesStrikes(target,animal,animal.hitsRemaining))return true;
 // The collapse needs an approach, strike or retreat that lasts through its substep.
 const exit=animal.exit??animal.spawn;
 if(!approach||!exit)return false;
 if(centerSurvivesStrikes(target,animal,animal.hitsRemaining-1))
  return Math.hypot(Math.fround(approach.x)-Math.fround(exit.x),Math.fround(approach.z)-Math.fround(exit.z))>
    (CENTER_COLLAPSE_SECONDS+.02)*RETREAT_SPEED;
 const centers=nav&&nativeCenterCollapseSuccessors(state,animal,target);
 if(!centers)return false;
 const from={...animal,x:Math.fround(approach.x),z:Math.fround(approach.z)};
 const minimum=centerCollapseWalkDistance(animal),clearance=animal.radius+.5;
 // Game may choose any of these centers when the strike finishes.
 return centers.every(next=>footprintDistance(centerFootprint(next,state).footprint,from.x,from.z)-clearance>minimum)&&
   centers.some(next=>!!reachableApproach(from,next,nav)?.path?.length);
}
export function nativeCenterCollapseSite(state,animal){
 if(!animal?.hitApplied||!animal.attackId)return null;
 const hit=state.events.findLast(event=>event.type==='AnimalLogicalHit'&&event.attackId===animal.attackId&&
   event.presentation?.target?.kind==='center'&&event.presentation.shield===null);
 const center=hit&&state.structures.find(item=>item.id===hit.targetId&&item.kind==='center');
 return hit&&nativeCenterCollapseImpact(state,animal,center)===hit?center:null;
}
// The collapsing center retains the impact that started its countdown even
// after the animal acquires a different target and attack id.
export function nativeCenterCollapseImpact(state,animal,center){
 if(!animal||center?.kind!=='center'||center.status!=='collapsing'||!(center.collapseRemaining>0)||
    !state.structures.includes(center))return null;
 const threshold=collapseThreshold(center)+1e-9;
 const index=state.events.findLastIndex(event=>event.type==='StructureHit'&&event.animalId===animal.id&&
   event.targetId===center.id&&event.structureHit?.kind==='center'&&event.structureHit.previousHp>threshold&&
   event.structureHit.hp===center.hp&&event.structureHit.hp<=threshold&&event.structureHit.maxHp===center.maxHp&&
   event.structureHit.x===center.x&&event.structureHit.z===center.z);
 if(index<0)return null;
 const damage=state.events[index],hit=state.events[index+1],pose=hit?.presentation?.animal;
 if(hit?.type!=='AnimalLogicalHit'||hit.targetId!==center.id||hit.species!==animal.species||
    !/^attack-[1-9]\d*$/.test(hit.attackId)||hit.presentation?.target?.kind!=='center'||hit.presentation.shield!==null||
    hit.simulationTime!==damage.simulationTime||hit.presentation.elapsed!==damage.simulationTime||
    !Number.isFinite(pose?.x)||!Number.isFinite(pose?.z)||pose.x!==damage.presentation?.x||pose.z!==damage.presentation?.z||
    !(damage.simulationTime<=state.elapsed)||
    Math.abs(damage.simulationTime+CENTER_COLLAPSE_SECONDS-state.elapsed-center.collapseRemaining)>1e-7)return null;
 return hit;
}
export function nativeShelteredCenterActor(state,animal){
 const raid=state.raid;
 if(raid?.animals.length!==1||raid.animals[0]!==animal||!nativeCenterAttackCohort(state))return false;
 if(state.biome==='desierto')return nativeDesertIntroductoryCenterRaid(state);
 if(!raid.daytime)return ['warthog','hyena','buffalo','lion','rhino'].includes(animal?.species);
 const center=state.structures[0].id;
 return animal?.species==='warthog'&&(animal.targetId===center||state.events?.some(event=>
   event.type==='StructureHit'&&event.animalId===animal.id&&event.targetId===center));
}
export function nativeRetreatBudgetAllowed(state,animal){
 if(animal.hitsRemaining===0)return true;
 if(!nativeShelteredCenterActor(state,animal)||!animal.hitApplied||!animal.attackId||
    animal.targetId||animal.reservation||animal.hitsRemaining<=0)return false;
 const center=state.structures[0],retreating=animal.status==='retreating';
 // In the Desert introductory cohort, the raid cannot damage any remaining crop.
 if(!retreating&&(animal.status!=='walking'||center.status!=='collapsing'||
   state.biome!=='desierto'&&activeCrops(state.plants).length))return false;
 const hit=state.events.findLast(event=>event.type==='AnimalLogicalHit'&&event.attackId===animal.attackId&&
   event.targetId===center.id&&event.presentation?.target?.kind==='center'&&event.presentation.shield===null);
 if(!hit||!state.events.some(event=>event.type==='StructureHit'&&event.simulationTime===hit.simulationTime&&
   event.animalId===animal.id&&event.targetId===center.id&&event.structureHit?.kind==='center'&&
   event.structureHit.previousHp>collapseThreshold(center)&&event.structureHit.hp<=collapseThreshold(center)))return false;
 // Once the raid has decided to leave, later crop or center changes cannot give it a new target.
 return !retreating||state.events.some(event=>event.type==='AnimalRetreating'&&event.targetId===animal.id&&
   event.reason==='no-reachable-unleased-target'&&event.hitsRemaining===animal.hitsRemaining&&event.simulationTime>=hit.simulationTime);
}
export function nativeAnimalCropPublicationMatches(state,{reference,attackId}){
 const animal=state.raid?.animals.find(candidate=>candidate.id==='animal-'+reference.actorId);
 const shelteredPurpose=reference.purpose==='center'||reference.purpose==='retreat';
 if(!animal||(animal.species!=='warthog'&&(!shelteredPurpose||!nativeShelteredCenterActor(state,animal))))return false;
 if(reference.purpose==='retreat')return animal.status==='retreating'&&!animal.targetId&&nativeRetreatBudgetAllowed(state,animal)&&
  (animal.exit??animal.spawn)?.x===reference.targetX&&(animal.exit??animal.spawn)?.z===reference.targetZ;
 const targetId=(reference.purpose==='center'?'structure-':'plant-')+reference.targetId;
 return animal.targetId===targetId&&(reference.kind===26?['entering','walking'].includes(animal.status):
  animal.status==='attacking'&&animal.attackId==='attack-'+attackId);
}
export function nativeCropRouteSubject(state,animal,flightWorker=null,native=null){
 const raid=state.raid;
 const centerAttack=nativeCenterAttackCohort(state,flightWorker)&&
   (state.biome==='desierto'||animal?.targetId===state.structures[0].id);
 if((state.biome!=='sabana'&&!centerAttack)||
    (animal?.species!=='warthog'&&!(centerAttack&&nativeShelteredCenterActor(state,animal)))||
    raid?.animals.length!==1||raid.animals[0]!==animal||
    !state.workers.every(w=>w===flightWorker||w.status==='home'&&!w.raidReturn&&!w.nativeRouteAdmission)||
    !animal.approach||animal.magicDown||(animal.magicStunUntil??0)>state.elapsed||
    animal.hitsRemaining<=0)return null;
 const target=raidTarget(state,animal.targetId);
 if((centerAttack?!nativeCenterAttackSite(state,target):!target?.alive)||animal.reservation!==targetReservationKey(target,animal)||
    raid.reservations[animal.reservation]!==animal.id)return null;
 const shield=spellAt(state,'shield',target),contact=native?.shieldContact;
 const pendingRemoval=!shield&&contact&&state.spells.some(spell=>spell.kind==='shield'&&spell.id===contact.id&&spell.remaining<=1e-9&&
   spell.x===contact.x&&spell.z===contact.z&&spell.radius===contact.radius&&Math.hypot(spell.x-target.x,spell.z-target.z)<=spell.radius);
 const expiredStrike=!shield&&!centerAttack&&!flightWorker&&native?.mode===3&&native.shieldPolygon>0&&contact&&animal.approachShieldId===contact.id&&
   animal.status==='attacking'&&animal.attackId==='attack-'+native.strike.attackId&&(pendingRemoval||native.shieldExpired&&!state.spells.some(s=>s.id===contact.id));
 const expiringApproach=pendingRemoval&&!centerAttack&&!flightWorker&&[1,2].includes(native?.mode)&&
   native.shieldPolygon>0&&animal.approachShieldId===contact.id;
 if((shield||animal.approachShieldId)&&!expiredStrike&&!expiringApproach){
   if(centerAttack||flightWorker||!contact||shield?.id!==contact.id||shield.x!==contact.x||shield.z!==contact.z||
      shield.radius!==contact.radius||native.mode!==4&&(!native.shieldPolygon||animal.approachShieldId!==shield.id))return null;
 }
 return centerAttack?{target,center:target,purpose:'center'}:{target,center:state.structures.find(operational)??target};
}
export function nativeRetreatSubject(state,animal){
 if(!animal||(state.biome!=='sabana'&&!nativeCenterAttackCohort(state))||state.raid?.animals.length!==1||
    state.raid.animals[0]!==animal||(animal.species!=='warthog'&&!nativeShelteredCenterActor(state,animal))||animal.status!=='retreating'||
    !nativeRetreatBudgetAllowed(state,animal)||!animal.hitApplied||animal.targetId||animal.reservation||animal.magicDown||
    (animal.magicStunUntil??0)>state.elapsed||
    !state.workers.every(w=>w.status==='home'&&!w.raidReturn&&!w.nativeRouteAdmission))return null;
 const exit=animal.exit??animal.spawn;
 return Number.isFinite(exit?.x)&&Number.isFinite(exit?.z)?exit:null;
}

function nativeRetreatOwnersMatch(state,animal,native,planner){
 const exit=nativeRetreatSubject(state,animal)??planner?.encounterRetreatOwner?.(state,animal,native)?.exit;
 return native.retreat&&!!exit&&animal.id==='animal-'+native.actor&&
   (!native.previousStrike||animal.attackId==='attack-'+native.previousStrike.attackId)&&
   animal.radius===native.radius&&exit.x===native.targetX&&exit.z===native.targetZ;
}
export function nativeCropCohortCurrent(state,planner){
 const animal=state.raid?.animals[0],native=animal&&planner?.nativeAnimalCropState?.(animal.id);
 const subject=animal&&nativeCropRouteSubject(state,animal,planner?.nativeRaidFlightMember?.(state,animal),native);
 if((!subject||subject.purpose==='center')&&animal?.hitApplied&&(nativeRetreatBudgetAllowed(state,animal)?
    planner?.nativeFinishedAnimalRetreat?.(state,animal):planner?.nativeFinishedAnimalCrop?.(state,animal)))return true;

 if(!native&&planner?.encounterRetreatOwner?.(state,animal,null))return true;
 if(!subject&&animal?.status!=='retreating')return false;
 if(native?.retreat)return native.executedThrough===state.elapsed&&nativeRetreatOwnersMatch(state,animal,native,planner)&&
   animal.x===native.x&&animal.z===native.z&&animal.motionPhase===native.phase;
 return !!subject&&!!native&&native.executedThrough===state.elapsed&&nativeCropOwnersMatch(subject,animal,native)&&
   animal.x===native.x&&animal.z===native.z&&(animal.motionPhase??0)===native.phase;
}
function nativeCropOwnersMatch({target,center,purpose},animal,native){
 return purpose===native.purpose&&animal.id==='animal-'+native.actor&&target.id===(purpose==='center'?'structure-':'plant-')+native.target&&
   target.x===native.targetX&&target.z===native.targetZ&&center.id===(center===target&&purpose!=='center'?'plant-':'structure-')+native.center&&
   center.x===native.centerX&&center.z===native.centerZ&&animal.radius===native.radius;
}
export const raidStrikeClips=Object.freeze(['Right_Hand_Sword_Slash','Charged_Upward_Slash','Weapon_Combo','Weapon_Combo_2']);
export function savedRaidStrike(animal){
 const match=/^attack-([1-9]\d*)$/.exec(animal.attackId??''),attackId=match?Number(match[1]):0;
 const clip=raidStrikeClips.indexOf(animal.animation),duration=animal.attackDuration,remaining=animal.attackRemaining;
 if(animal.status!=='attacking'||animal.hitApplied!==false||!Number.isSafeInteger(attackId)||attackId<=0||
    clip<0||duration!==ANIMAL_ACTIONS.animals[animal.species]?.clips[animal.animation]?.duration||
    !Number.isFinite(remaining)||!(remaining>0&&remaining<=duration))return null;
 return {attackId,clip,duration,remaining};
}
function raidStrikeClip(roll){return roll<.45?0:roll<.75?1:roll<.9?2:3;}

// Resource selection can read the persisted RNG, but only acquisition consumes
// a draw, allocates the attack id, and starts the ordinary gameplay action.
export function previewRaidStrike(state,animal){
 const index=raidStrikeClip(nextRandom({rng:state.rng})),animation=raidStrikeClips[index];
 return {index,animation,duration:ANIMAL_ACTIONS.animals[animal.species].clips[animation].duration};
}
function startRaidStrike(state,animal,markActive){
 animal.status='attacking';animal.hitApplied=false;animal.attackId=`attack-${state.sequence++}`;
 markActive?.();animal.animation=raidStrikeClips[raidStrikeClip(nextRandom(state))];
 animal.attackDuration=ANIMAL_ACTIONS.animals[animal.species].clips[animal.animation].duration;
 animal.attackRemaining=animal.attackDuration;
}
export function projectAcquiredRaidStrike(state,animal,proof){
 const target=raidTarget(state,animal.targetId);
 const center=proof?.purpose==='center';
 if(!target||!proof||(center?target.kind!=='center'||target.status!=='intact'||
    Math.fround(animal.approach?.x)!==proof.x||Math.fround(animal.approach?.z)!==proof.z:!target.alive)||
    animal.targetId!==(center?'structure-':'plant-')+proof.target||animal.id!=='animal-'+proof.actor||
    state.raid?.reservations[animal.reservation]!==animal.id||animal.hitsRemaining<=0||
    animal.x!==proof.x||animal.z!==proof.z||target.x!==proof.targetX||target.z!==proof.targetZ)
  throw Error('Native crop strike has another actor, crop or terminal pose');
 if(animal.status==='attacking'){
  if(animal.attackId!==`attack-${proof.attackId}`||animal.animation!==raidStrikeClips[proof.clip]||animal.attackDuration!==proof.duration)
   throw Error('Native crop strike cannot replace an active game strike');
  return;
 }
 const clip=previewRaidStrike(state,animal);
 if(!['walking','entering'].includes(animal.status)||state.pauses.length||state.sequence!==proof.attackId||state.elapsed!==proof.at||
    clip.index!==proof.clip||clip.duration!==proof.duration)throw Error('Stale native crop strike acquisition');
 animal.heading=proof.yaw;startRaidStrike(state,animal);
}

export function assignRaidTarget(s,a,selected,nav){
  const target=selected.target;
  a.targetId=target.id;a.reservation=selected.reservation;s.raid.reservations[a.reservation]=a.id;
  s.raid.waitRevision=((s.raid.waitRevision??0)+1)>>>0;
  a.approach=selected.approach.point;a.approachShieldId=selected.shieldId;
  a.path=selected.approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
  return target;
}
export function updateRaid(s,dt,nav) {
  if(!s.raid)return;
  // Resolve confirmed crop and barrier changes before the next attack
  // intention; a target destroyed by the previous step cannot be selected
  // from a stale native group snapshot.
  nav.intentTaskPlanner?.flushWorldEvents?.();
  const tactical=new Set(nav.intentTaskPlanner?.drainTacticalReconsiderations?.()??[]);
  if(tactical.size)for(const animal of s.raid.animals)
    if(tactical.has(animal.id)&&animal.status!=='attacking'&&animal.targetId)
      release(s,animal,nav);
  reconcileRaidReservationsOnChange(s,nav);
  updateWorkerEncounters(s,nav);
  nav.dynamicBodies?.sync(s);
  observeWaitProgress(s);liveWaitQueue(s.raid);
  for(const a of s.raid.animals) {
    try {
    if(a.status==='gone')continue;
    if(a.magicDown){if(s.elapsed<a.magicDown.until)continue;delete a.magicDown;}
    if((a.magicStunUntil??0)>s.elapsed)continue;
    if(nav.intentTaskPlanner?.hasRetreatEncounter?.(s,a)){
      if(a.targetId||a.reservation)release(s,a);
      publishRetreat(s,a,'budget-exhausted');
      nav.intentTaskPlanner.applyRetreatEncounter(s,a);
    }
    const crop=nav.intentTaskPlanner?.nativeAnimalCropState?.(a.id);
    const successor=!crop&&a.hitApplied&&a.hitsRemaining>0?nav.intentTaskPlanner?.nativeFinishedAnimalCrop?.(s,a):null;
    if(successor?.shieldPolygon){
      if(!nav.intentTaskPlanner.requestNativeProtectedSuccessor(s,a,successor,nav))throw Error('Native protected strike lost its finished source');
      continue;
    }
    if(successor?.purpose==='center'){
      const selected=successor.collapsed?targetFor(s,a,nav):null;
      if(!nav.intentTaskPlanner.requestNativeCenterSuccessor(s,a,successor,selected))throw Error('Native center strike lost its successor');
      if(selected)assignRaidTarget(s,a,{...selected,approach:{point:selected.approach.point,path:null}},nav);
      continue;
    }
    if(!crop&&a.hitApplied&&nav.intentTaskPlanner?.nativeFinishedAnimalRetreat?.(s,a)){
      const exit=a.exit??a.spawn,prior=a.retreatRouteUnknown;
      const sectors=nav.spatialSectorRevision?.(a.radius,false)??0;
      if(prior&&prior.sectors===sectors&&prior.topology===nav.version&&prior.exitX===exit?.x&&prior.exitZ===exit?.z)continue;
      const result=nav.intentTaskPlanner.requestNativeRetreat(s,a);
      if(result==='unknown'||result==='blocked'){
        a.retreatRouteUnknown={sectors,topology:nav.version,exitX:exit.x,exitZ:exit.z};
        if(result==='unknown')nav.requestRaidConnectivity?.(a,exit,a.radius);
        continue;
      }
      if(result!=='pending')throw Error('Native retreat has no terminal source');
      if(a.hitsRemaining>0)emit(s,'AnimalTargetUnavailable',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining});
      publishRetreat(s,a,a.hitsRemaining>0?'no-reachable-unleased-target':'budget-exhausted');
      continue;
    }

    if(!crop&&nav.intentTaskPlanner?.encounterRetreatOwner?.(s,a,null)){
      if(a.targetId||a.reservation)release(s,a);
      const exit=a.exit??a.spawn,prior=a.retreatRouteUnknown,sectors=nav.spatialSectorRevision?.(a.radius,false)??0;
      if(prior&&prior.sectors===sectors&&prior.topology===nav.version&&prior.exitX===exit.x&&prior.exitZ===exit.z)continue;
      const result=nav.intentTaskPlanner.requestEncounterRetreat(s,a);
      if(result==='blocked'||result==='unknown'){
        a.retreatRouteUnknown={sectors,topology:nav.version,exitX:exit.x,exitZ:exit.z};
        if(result==='unknown')nav.requestRaidConnectivity?.(a,exit,a.radius);
        continue;
      }
      if(result!=='pending')throw Error('Encounter retreat lost its current body');
      continue;
    }
    if(crop?.retreat){
      if(!nativeRetreatOwnersMatch(s,a,crop,nav.intentTaskPlanner)||crop.executedThrough!==s.elapsed)throw Error('Native retreat changed its exit or actor');
      if(crop.mode===1){
        if(a.x!==crop.x||a.z!==crop.z||a.motionPhase!==crop.phase)throw Error('Pending retreat moved before acquisition');
      }else{
        a.x=crop.x;a.z=crop.z;a.heading=crop.yaw;a.motionPhase=crop.phase;
        if(crop.arrived){
          if(!nav.intentTaskPlanner.finishNativeRetreat(a,crop))throw Error('Native retreat lacks its arrived body');
          a.status='gone';publishAnimalGone(s,a.id);
        }
      }
      continue;
    }
    if(crop){
      const source=nativeCropRouteSubject(s,a,nav.intentTaskPlanner?.nativeRaidFlightMember?.(s,a),crop);
      if(!source||!nativeCropOwnersMatch(source,a,crop)||crop.executedThrough!==s.elapsed)
        throw Error('Native crop action lost the current game source');
      if(crop.mode===4){
        if(a.x!==crop.x||a.z!==crop.z||a.heading!==crop.yaw||a.motionPhase!==crop.phase)
          throw Error('Shield crop moved while stopped');
        nav.intentTaskPlanner.replanNativeShieldCrop(a.id,nav);
        continue;
      }
      if(crop.mode===5){
        const saved=savedRaidStrike(a),restore=crop.restore;
        if(!saved||!Object.keys(saved).every(key=>saved[key]===restore[key])||
           a.x!==crop.x||a.z!==crop.z||a.heading!==crop.yaw||a.motionPhase!==crop.phase)
          throw Error('Pending restored strike lost its saved action');
        continue;
      }
      if(crop.mode!==3){
        if(!['entering','walking'].includes(a.status))throw Error('Native crop route has another semantic action');
        if(crop.mode===1){
          if(a.x!==crop.x||a.z!==crop.z||(a.motionPhase??0)!==crop.phase)throw Error('Pending crop route moved before acquisition');
        }else{
          a.x=crop.x;a.z=crop.z;a.heading=crop.yaw;a.motionPhase=crop.phase;
          if(!crop.running)a.status='walking';
        }
        continue;
      }
      if(a.status!=='attacking'||a.attackId!=='attack-'+crop.strike.attackId||
         a.animation!==raidStrikeClips[crop.strike.clip]||a.attackDuration!==crop.strike.duration)
        throw Error('Native crop strike lacks its acquired game action');
    }
    if(a.status==='attacking'){
      a.attackDuration??=ANIMAL_ACTIONS.animals[a.species].clips[a.animation].duration;
      a.attackRemaining=crop?Math.max(0,crop.strike.endTime-s.elapsed):Math.max(0,a.attackRemaining-dt);
      if(crop?s.elapsed<crop.strike.endTime:a.attackRemaining>1e-9)continue;
      const target=raidTarget(s,a.targetId);
      if(!a.hitApplied&&a.hitsRemaining>0){
        a.hitApplied=true;a.hitsRemaining--;observeWaitProgress(s);
        const shield=target?spellAt(s,'shield',target):null;
        const expiredBorder=!!a.approachShieldId&&a.approachShieldId!==shield?.id;
        // A committed border animation stays at that border. Losing the barrier
        // does not turn it into a ranged hit on the protected target.
        if(target&&!expiredBorder){
          let agriculturalImpact=null;
          if('alive' in target&&a.damageProfile)agriculturalImpact=resolveAgriculturalImpact(s,a,target,nav);
          const legacyCropOccluded='alive' in target&&!a.damageProfile&&!shield&&
            !agriculturalRayClear(s,nav,a,target,a.radius);
          if(!shield){
            if('alive' in target){
              if(agriculturalImpact){
                for(const hit of agriculturalImpact.hits){emit(s,'CropHit',{...hit,hits:hit.after,presentation:{elapsed:s.elapsed}});if(hit.destroyed){emit(s,'CropDestroyed',{targetId:hit.targetId,attackId:a.attackId,animalId:a.id});}}
              }else if(!legacyCropOccluded){
                const hit=applyCropImpact(s,target,1);
                if(hit){emit(s,'CropHit',{targetId:target.id,...hit,hits:hit.after,presentation:{elapsed:s.elapsed}});if(hit.destroyed)emit(s,'CropDestroyed',{targetId:target.id});}
              }
            }
            else {
              const previousHp=target.hp;hitStructure(target,animalStructureDamage(a),s.elapsed,s);
              const hitIds=s.raid.attackedStructureIds??=[],firstHitThisRaid=target.hp<previousHp&&!hitIds.includes(target.id);
              if(firstHitThisRaid){hitIds.push(target.id);s.raid.attackedStructureIds=hitIds;}
              emit(s,'StructureHit',{animalId:a.id,targetId:target.id,presentation:{elapsed:s.elapsed,x:a.x,z:a.z},structureHit:{kind:target.kind,...(target.kind==='wall'?{material:target.material}:{}),x:target.x,z:target.z,previousHp,hp:target.hp,maxHp:target.maxHp,
                criticalThreshold:collapseThreshold(target)*2,firstHitThisRaid}});
            }
          }
          // A presentation snapshot is a fact about this completed hit, never
          // another damage command. It survives target movement, raid end/save.
          emit(s,(agriculturalImpact?.blocked||legacyCropOccluded)&&!shield?'AnimalLogicalMiss':'AnimalLogicalHit',{attackId:a.attackId,targetId:target.id,species:a.species,...(legacyCropOccluded?{reason:'occluded'}:{}),...(agriculturalImpact?{agriculturalImpact}:{}),presentation:{version:1,elapsed:s.elapsed,...(agriculturalImpact?{agriculturalImpact}:{}),
            animal:{x:a.x,z:a.z,heading:a.heading},target:{x:target.x,z:target.z,kind:target.kind,...(target.kind==='center'?{culture:centerCulture(target,s),yaw:target.yaw??0}:{}),...(target.kind==='wall'?{material:target.material,gate:target.gate,yaw:target.yaw,baseScaleX:target.baseScaleX}:{})},
            shield:shield?{id:shield.id,x:shield.x,z:shield.z,radius:shield.radius}:null}});
        }else emit(s,'AnimalLogicalMiss',{attackId:a.attackId,targetId:a.targetId,species:a.species,...(expiredBorder?{reason:'shield-expired'}:{})});
      }
      const reconsider=nav.intentTaskPlanner?.finishAttackIntent(a.id);
      a.status='walking';a.path=null;
      if(reconsider>0||!target||target.alive===false||(crop?.purpose==='center'||crop?.shieldPolygon>0)&&a.hitsRemaining===0||
        target.status&&target.status!=='intact')release(s,a,nav);
      else if(nav.intentTaskPlanner&&a.approach){
        if(dist(a,a.approach)>.1)release(s,a,nav);
        else {
          // The next strike is a new action at the same validated position.
          // Keep an empty movement path instead of asking for another route.
          a.path=[];a.destinationId=a.approach.id;a.pathVersion=nav.version;
        }
      }
      // Finish the committed animation before spending another hit or retreating.
      continue;
    }
    if(a.hitsRemaining<=0&&a.status!=='retreating'){
      release(s,a,nav);beginRetreat(s,a,nav,'budget-exhausted');
    }
    if(a.status==='retreating') {
      const native=nav.intentTaskPlanner?.retreatRouteActive?.(a.id)??false;
      const exit={...(a.exit??a.spawn),id:`exit-${a.id}`};
      const pending=a.retreatRouteUnknown,
        sectors=nav.spatialSectorRevision?.(a.radius,false)??0;
      if(pending&&s.elapsed<pending.retryAt&&
        nav.version===pending.topology&&sectors===pending.sectors){
        if(pending.physicalFallback){
          const route=animalExitConnector(a,exit,nav);
          if(route){
            a.path=route;a.destinationId=exit.id;a.pathVersion=nav.version;
            delete a.retreatRouteUnknown;
          }else{
            if(a.exitConnectorSearch?.exhausted&&s.elapsed-pending.since>=90)
              finishUnknownRetreat(s,a,nav,'unknown-route-bounded-search-exhausted');
            continue;
          }
        }else{
          if(s.elapsed-pending.since>=1500)
            finishUnknownRetreat(s,a,nav,'unknown-residency-timeout');
          continue;
        }
      }
      try{
        if(walkTo(s,a,exit,dt,nav,
          {speed:RETREAT_SPEED,worker:false,expandRoute:true,routeVia:a.spawn,
            externallyPlanned:native})){
          a.status='gone';publishAnimalGone(s,a.id);nav.intentTaskPlanner?.finishRetreatIntent?.(a.id);
        }else if(native&&!a.path)nav.intentTaskPlanner?.finishRetreatIntent?.(a.id);
        delete a.retreatRouteUnknown;
      }catch(error){
        if(error?.name!=='SpatialChunkUnavailable')throw error;
        // Missing terrain is pending, not a blocked exit. Ask the existing
        // raid residency service to load it before retrying the same retreat.
        requestUnknownRaidTerrain(nav,error,a,exit,a.radius);
        const previous=a.retreatRouteUnknown,
          stable=previous?.topology===nav.version&&previous.sectors===sectors;
        if(!stable)delete a.exitConnectorSearch;
        const physicalFallback=!error.missing?.length&&
          error.details?.routeReason==='native-graph'&&
          error.details?.startRegions?.unknown===false&&
          error.details?.endRegions?.unknown===false;
        a.retreatRouteUnknown={retryAt:s.elapsed+1,topology:nav.version,
          sectors,since:stable?previous.since:s.elapsed,physicalFallback};
      }
      continue;
    }
    if(a.hitsRemaining<=0)continue;
    let target=raidTarget(s,a.targetId);
    if(!target) {
      if(!successor&&a.status!=='waiting')release(s,a,nav);
      // Search independent targets before staging. Each waiting actor retries
      // its own bounded search; an unreachable queue head cannot block peers.
      if(a.status==='waiting'){
        const wait=a.raidWait,progress=s.raid.waitProgress;
        if(s.elapsed-Math.max(wait.since,progress?.at??wait.since)>=RAID_WAIT_SECONDS||!nav.walkable(a.spawn.x,a.spawn.z,a.radius,null,false)){
          beginRetreat(s,a,nav,'waiting-expired-or-stage-blocked');continue;
        }
        if(dist(a,a.spawn)>.08&&(a.path||s.elapsed>=wait.moveRetryAt)){
          try{
            walkTo(s,a,{...a.spawn,id:'wait-'+a.id},dt,nav,{speed:1.5,worker:false});
            if(!a.path)wait.moveRetryAt=s.elapsed+1;
          }catch(error){
            if(error?.name!=='SpatialChunkUnavailable')throw error;
            // Staging is optional while the requested sectors load; keep the
            // waiting animal and its remaining attack budget unchanged.
            requestUnknownRaidTerrain(nav,error,a,a.spawn,a.radius);
            a.path=null;wait.moveRetryAt=s.elapsed+1;
            continue;
          }
        }
        const epoch=waitEpoch(s,nav,a);
        if(wait.epoch===epoch&&s.elapsed<wait.retryAt)continue;
        wait.epoch=epoch;wait.retryAt=s.elapsed+8;
      }
      if(successor&&a.raidWait?.epoch===waitEpoch(s,nav,a)&&s.elapsed<a.raidWait.retryAt)continue;
      const selected=targetFor(s,a,nav,!!successor);
      if(successor&&!selected){
        // The retained native body stays at the strike endpoint while an
        // unsupported shield or unavailable crop prevents another admission.
        a.raidWait={since:a.raidWait?.since??s.elapsed,epoch:waitEpoch(s,nav,a),retryAt:s.elapsed+8};
        continue;
      }
      if(!selected||selected.unknown){
        emit(s,'AnimalTargetUnavailable',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining});
        if(selected?.unknown){
          enqueueWait(s,a,selected.waitReason??'unknown');
          a.raidWait.epoch=waitEpoch(s,nav,a);
          a.raidWait.retryAt=s.elapsed+8;
        }
        else if(occupiedEligibleGroup(s,a,p=>canAttackCrop(s,p)))
          enqueueWait(s,a,'contention');
        else beginRetreat(s,a,nav,'no-reachable-unleased-target');
        continue;
      }
      if(a.status==='waiting')a.status='entering';leaveWait(s.raid,a);
      target=assignRaidTarget(s,a,selected,nav);
      if(successor){
        const request=nav.intentTaskPlanner.nativeAnimalCropState(a.id);
        const subject=nativeCropRouteSubject(s,a,nav.intentTaskPlanner?.nativeRaidFlightMember?.(s,a));
        if(!request||request.mode!==1||request.body!==successor.body||!subject||!nativeCropOwnersMatch(subject,a,request))release(s,a,nav);
        continue;
      }
      if(!selected.native)nav.intentTaskPlanner?.registerAttackIntent(s,a,target,a.path??[]);
    }
    // A confirmed topological event may leave the same native attack target
    // pending while sectors resolve. Ordinary travel ticks do not replace its
    // lease or run the old per-crop approach search.
    const shield=spellAt(s,'shield',target);
    const approachChanged=!a.approach||a.approachShieldId!==(shield?.id??null);
    // A new shield can invalidate the old crop route while creating a valid
    // interaction point at its border. Re-evaluate that point before parking
    // an otherwise pending native route until the shield expires.
    if(nav.intentTaskPlanner?.attackRoutePending?.(a.id)&&!approachChanged){
      const retry=nav.intentTaskPlanner.retryPendingAttackRoute?.(s,a,nav.version);
      if(retry==='expired'){
        release(s,a,nav);
        beginRetreat(s,a,nav,'unknown-attack-route-timeout');
        continue;
      }
      if(retry==='reconsider'){
        // Only the leased interaction point was proved unreachable. Another
        // side of this crop, a different crop, or a wall may still be valid.
        release(s,a,nav);
        a.status='walking';
        continue;
      }
      if(retry!=='found')continue;
    }
    const legacyApproachBlocked=!nav.intentTaskPlanner&&a.approach&&
      (!reservedApproachClear(s,a,a.approach)||
       !actorSegmentClear(a.approach,a.approach,a,actorBlockers(s,a,false)));
    if(approachChanged||legacyApproachBlocked) {
      const approach=reachableApproach(a,target,nav,shield);
      if(!approach){emit(s,'AnimalRouteUnavailable',{targetId:a.id,species:a.species,phase:'approach'});release(s,a,nav);a.status='walking';continue;}
      a.approach=approach.point;a.approachShieldId=shield?.id??null;
      a.path=approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
      nav.intentTaskPlanner?.registerAttackIntent(s,a,target,a.path??[]);
    }
    if(a.status!=='attacking') {
      if(walkTo(s,a,a.approach,dt,nav,{speed:a.status==='entering'?3.8:APPROACH_SPEED,
        worker:false,externallyPlanned:!!nav.intentTaskPlanner})) {
        if(nav.intentTaskPlanner&&(!reservedApproachClear(s,a,a.approach)||
          !actorSegmentClear(a.approach,a.approach,a,actorBlockers(s,a,false))))
          continue;
        a.heading=Math.atan2(target.x-a.x,target.z-a.z);
        // A previous committed strike releases its native lease at the damage
        // frame. Renew it only when this next strike actually begins.
        nav.intentTaskPlanner?.registerAttackIntent(s,a,target,[]);
        startRaidStrike(s,a,()=>nav.intentTaskPlanner?.markAttackActive(a.id));
      } else if(!a.path){
        emit(s,'AnimalRouteUnavailable',{targetId:a.id,species:a.species,phase:'travel'});
        release(s,a,nav);
        if(nav.intentTaskPlanner){
          enqueueWait(s,a);
          a.raidWait.epoch=waitEpoch(s,nav,a);
          a.raidWait.retryAt=s.elapsed+8;
        }
        else a.status='walking';
      }
      else if(dist(a,s.structures.find(operational)??target)<25)a.status='walking';
    }
    } finally {nav.dynamicBodies?.update(a,1);}
  }
  if(s.raid.animals.every(a=>a.status==='gone')) {
    const pending=s.raid.pendingWavePlan??nextPressureWave(s.raid,s.time);
    if(pending){s.raid.pendingWavePlan=pending;return;}
    nav.intentTaskPlanner?.retireRaidActors?.(s.raid.animals);
    const endedRaid=s.raid;
    s.raid=null;nav.setState(s);emit(s,'RaidEnded');
    const endEvent=s.events.at(-1);
    if(!s.structures.some(operational)&&compare(s.ledger.balance,rational(B.work_center.cost))<0){s.result='defeat';notice(s,'Cayó el último centro; faltan monedas para que otro nazca.');emit(s,'GameOver');retireFarmHistory(s);return;}
    for(const w of s.workers) {
      if(w.incapacitated||contractExpired(w,s)||s.time>=PROFILES_END(w.profile))continue;
      const center=s.structures.find(c=>c.id===w.centerId&&operational(c));
      if(center){w.status='arriving';w.raidReturn=true;w.path=null;}
      else {w.displacedDay=s.day;w.status='returning';w.path=null;}
      notifyWorkerPlanningChange(s,w);
    }
    nav.intentTaskPlanner?.returnFromRaidRefuge?.(s,endedRaid,endEvent);
    recoverDisplacedWorkers(s);
    rebuildTasks(s);
  }
}
const PROFILES_END=id=>id.endsWith('Male')?250:300;
