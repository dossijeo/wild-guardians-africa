import {canyonRaidFormation} from './canyon-raid-formation.js';
import {resolveAgriculturalImpact,validDamageProfile} from './raid-agricultural-impact.js';
import {liveWaitQueue,occupiedEligibleGroup,enqueueWait,leaveWait,observeWaitProgress,waitEpoch,RAID_WAIT_SECONDS} from './raid-contention.js';
import {raidEntryChunks,includeRaidBounds} from '../world/raid-entry-residency.js';
import {raidEntryKey} from '../world/raid-entry-data.js';
import {exteriorRaidEntry,raidWallEnvelope,exteriorRaidWitness} from './raid-exterior-entry.js';
import {createCropGrouping} from './crop-components.js';
import {activeCrops} from './active-crops.js';
import {RAID_NOTICE_TEXT} from './raid-notice.js';
import {warmRaidNavigation} from '../world/raid-navigation-warmth.js';
import {centerBoundaryPoint,centerCulture,centerDeliveryPoint} from '../world/centers.js';
import {BALANCE as B} from './balance.js';
import {nextRandom,randomInt,attraction,threatTier,animalSpec,operational,hitStructure,collapseThreshold} from './rules.js';
import {createRaidCompositionIndex} from './raid-composition-index.js';
import {preparePressureNight,nextPressureWave} from './raid-pressure-plan.js';
import {eligiblePendingRaidWavePlan} from '../world/raid-entry-data.js';
import {emit,notice,walkTo,rebuildTasks,spellAt,dropCarriedCrate,recoverDisplacedWorkers} from './game.js';
import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';
import {releaseTask} from './tasks.js';
import {rational,compare} from './money.js';
import {updateWorkerEncounters} from './encounters.js';
import {ANIMAL_ACTIONS} from './animal-actions-data.js';
import {actorBlockers,actorSegmentClear} from './actor-motion.js';
import {activeChunkRegion,validActiveBounds} from '../world/active-region.js';
import {defensiveGroups} from './defensive-groups.js';
import {wallCollisionFrame} from '../world/wall-collision-frame.js';
import {targetReservationKey,targetReserved,reservedApproachClear,reconcileTargetReservations} from './raid-target-reservations.js';
import {applyCropImpact,cropImpactDamage,CROP_HIT_POINTS} from './crop-impact-health.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),entrySelections=new WeakMap();
const cropTargetIndexes=new WeakMap();
const raidRegionDecisions=new WeakMap();
const RAID_REGION_QUERIES_PER_TICK=16,RAID_REGION_RETRY_SECONDS=4;
function regionDecisionScope(s,nav){
  let scope=raidRegionDecisions.get(nav);
  if(!scope||scope.raid!==s.raid||scope.topology!==nav.version){
    scope={raid:s.raid,topology:nav.version,decisions:new Map(),tick:-1,queries:0};
    raidRegionDecisions.set(nav,scope);
  }
  if(scope.tick!==s.elapsed){scope.tick=s.elapsed;scope.queries=0;}
  return scope;
}
function cropRegionDecision(s,a,nav,group,regionKey,candidates,scope,origin,sectors){
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
  if(status==='unknown')nav.requestRaidConnectivity?.(a,candidates[0],a.radius);
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
export function cameraRaidEntry(s,specs,bounds,nav,view=nav.raidView,maxSearches=2,accept=null){
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
        if(accept&&!accept(point,exit,radius))continue;
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
  let cropBox=null;
  for(const p of activeCrops(s.plants))if(p.centerId===focus.id||dist(p,focus)<32){
    cropBox??={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
    cropBox.minX=Math.min(cropBox.minX,p.x);cropBox.maxX=Math.max(cropBox.maxX,p.x);
    cropBox.minZ=Math.min(cropBox.minZ,p.z);cropBox.maxZ=Math.max(cropBox.maxZ,p.z);
  }
  const outsideCrops=(p,r)=>!cropBox||p.x<cropBox.minX-r-1||
    p.x>cropBox.maxX+r+1||p.z<cropBox.minZ-r-1||p.z>cropBox.maxZ+r+1;
  // A dune or river can disconnect the entire rear of the camera. Try clear
  // approaches around the farm before falling back to a distant map edge.
  // These candidates require direct native reachability; no repeated A* here.
  const offsets=[0];for(let i=1;i<8;i++)offsets.push(-i*Math.PI/8,i*Math.PI/8);offsets.push(Math.PI);
  for(const offset of specs.length<=4?offsets:[]){
    const heading=angle+offset,eye={x:focus.x+Math.sin(heading)*8,z:focus.z+Math.cos(heading)*8};
    const local=Object.assign(Object.create(nav),{raidView:{eye,target:focus}});
    const entry=cameraRaidEntry(s,specs,bounds,local,local.raidView,0,(p,exit,r)=>
      outsideCrops(p,r)&&outsideCrops(exit,r));
    if(entry)return entry;
  }
  // Large waves can use several connected approaches instead of one cramped
  // camera anchor. A cheap native region query certifies access to the center
  // or an attackable wall; ordinary routing and collisions still move actors.
  const box=raidWallEnvelope(s,nav),entries=[],exits=[];
  const walls=s.structures.filter(w=>w.kind==='wall'&&w.hp>0&&w.status!=='collapsing')
    .map(w=>({wall:w,frame:wallCollisionFrame(w)}));
  const reachable=(point,radius)=>{
    const center=centerDeliveryPoint(focus,point,s,radius+.5);
    if(nav.walkable(center.x,center.z,radius,null,false)&&
      nav.regionConnected(point,center,radius,null,false)===true)return true;
    const nearest=[];
    for(const item of walls){
      const distance=dist(point,item.wall),at=nearest.findIndex(x=>distance<x.distance);
      if(at>=0)nearest.splice(at,0,{...item,distance});
      else if(nearest.length<8)nearest.push({...item,distance});
      if(nearest.length>8)nearest.pop();
    }
    for(const {frame} of nearest){
      const nx=Math.sin(frame.yaw),nz=Math.cos(frame.yaw),sign=
        (point.x-frame.x)*nx+(point.z-frame.z)*nz>=0?1:-1;
      const side={x:frame.x+nx*sign*(frame.depth+radius+.6),
        z:frame.z+nz*sign*(frame.depth+radius+.6)};
      if(nav.walkable(side.x,side.z,radius,null,false)&&
        nav.regionConnected(point,side,radius,null,false)===true)return true;
    }
    return false;
  };
  const samples=[];
  const cropReach=cropBox?Math.max(focus.x-cropBox.minX,cropBox.maxX-focus.x,
    focus.z-cropBox.minZ,cropBox.maxZ-focus.z)+Math.max(...specs.map(x=>x.radius))+3:0;
  const firstRange=Math.max(18,cropReach);
  for(let ring=0;ring<6;ring++)for(let i=0;i<32;i++)
    samples.push({range:firstRange+ring*4,heading:angle+i*Math.PI/16});
  for(const spec of specs){
    let chosen=null;
    for(const {range,heading} of samples){
      const ray={x:Math.sin(heading),z:Math.cos(heading)};
      const point={x:focus.x+ray.x*range,z:focus.z+ray.z*range};
      const exit={x:point.x+ray.x*3,z:point.z+ray.z*3};
      if([point,exit].some(p=>p.x-spec.radius<bounds[0]||p.z-spec.radius<bounds[1]||
        p.x+spec.radius>bounds[2]||p.z+spec.radius>bounds[3]||
        !outsideCrops(p,spec.radius)||!nav.walkable(p.x,p.z,spec.radius,null,false)||
        !exteriorRaidWitness(p,spec.radius,box,nav)))continue;
      if(entries.some((p,j)=>dist(p,point)<=specs[j].radius+spec.radius+1)||
        !nav.segmentClear(point,exit,spec.radius,null,false)||
        !reachable(point,spec.radius))continue;
      chosen={point,exit};break;
    }
    if(!chosen)return null;
    entries.push(chosen.point);exits.push(chosen.exit);
  }
  return {entries,exits};
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
  }
  s.tasks=s.tasks.filter(t=>t.kind!=='repair');
  if(!wave)notice(s,RAID_NOTICE_TEXT,animals[0].id);
  const exposed=activeCrops(s.plants).filter(p=>p.alive);
  emit(s,wave?'RaidWaveSpawned':'RaidSpawned',{raidFacts:{id:s.raid.id,day:s.day,daytime,elapsed:s.elapsed,waveIndex:s.raid.waveIndex??0,pressureFacts:s.raid.pressureFacts??null,exposedLiving:exposed.length,exposedWounded:exposed.filter(p=>(p.attackHits??0)>0).length,actors:animals.map(a=>({id:a.id,species:a.species,hitsRemaining:a.hitsRemaining,...(a.damageProfile?{damageProfile:structuredClone(a.damageProfile)}:{}),spawn:{...a.spawn},exit:{...a.exit}}))}});return true;
}
function release(s,a) {if(a.reservation&&s.raid.reservations[a.reservation]===a.id){delete s.raid.reservations[a.reservation];s.raid.waitRevision=((s.raid.waitRevision??0)+1)>>>0;}a.reservation=null;a.targetId=null;a.path=null;a.approach=null;a.approachShieldId=null;}
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
      onUnknown?.();
      continue;
    }
    if(path)return {point,path};
  }
  return null;
}
function canAttackCrop(s,p){
  return p.alive&&(cropImpactDamage(p)<CROP_HIT_POINTS-1||s.raid.introCropLimit===undefined||(s.raid.introCropsDestroyed??0)<s.raid.introCropLimit);
}
export function raidTarget(s,id){
  const eligible=t=>t.id===id&&(!('alive' in t)||canAttackCrop(s,t))&&(!('status' in t)||t.status==='intact');
  // Keep crop-first selection and eligibility without allocating a copy of
  // the complete farm history for every animal and simulation step.
  return activeCrops(s.plants).find(eligible)??s.structures.find(eligible);
}
export function targetFor(s,a,nav) {
  const stats=nav.raidSelectionStats;
  const started=stats?performance.now():0;
  if(stats)stats.selections=(stats.selections??0)+1;
  try{return targetForImpl(s,a,nav,stats);}finally{
    if(stats)stats.selectionMs=(stats.selectionMs??0)+performance.now()-started;
    const scope=raidRegionDecisions.get(nav);
    if(stats&&scope){
      stats.maxRegionalQueriesPerTick=Math.max(stats.maxRegionalQueriesPerTick??0,scope.queries);
      stats.decisionCacheEntries=scope.decisions.size;
    }
  }
}
function targetForImpl(s,a,nav,stats){
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
      const status=scope?cropRegionDecision(s,a,nav,group,regionKey,candidates,scope,origin,sectorRevision):
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
export function updateRaid(s,dt,nav) {
  if(!s.raid)return;
  reconcileTargetReservations(s,release);
  updateWorkerEncounters(s,nav);
  observeWaitProgress(s);liveWaitQueue(s.raid);
  for(const a of s.raid.animals) {
    if(a.status==='gone')continue;
    if(a.status==='attacking'){
      a.attackDuration??=ANIMAL_ACTIONS.animals[a.species].clips[a.animation].duration;
      a.attackRemaining=Math.max(0,a.attackRemaining-dt);
      if(a.attackRemaining>1e-9)continue;
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
          if(!shield){
            if('alive' in target){
              if(agriculturalImpact){
                for(const hit of agriculturalImpact.hits){emit(s,'CropHit',{...hit,hits:hit.after});if(hit.destroyed){emit(s,'CropDestroyed',{targetId:hit.targetId,attackId:a.attackId,animalId:a.id});}}
              }else {
                const hit=applyCropImpact(s,target,1);
                if(hit){emit(s,'CropHit',{targetId:target.id,...hit,hits:hit.after});if(hit.destroyed)emit(s,'CropDestroyed',{targetId:target.id});}
              }
            }
            else {
              const previousHp=target.hp;hitStructure(target,validDamageProfile(a.damageProfile)?a.damageProfile.structureDamage:animalSpec(a.species).structure_hit_damage,s.elapsed);
              const hitIds=s.raid.attackedStructureIds??=[],firstHitThisRaid=target.hp<previousHp&&!hitIds.includes(target.id);
              if(firstHitThisRaid){hitIds.push(target.id);s.raid.attackedStructureIds=hitIds;}
              emit(s,'StructureHit',{animalId:a.id,targetId:target.id,structureHit:{kind:target.kind,x:target.x,z:target.z,previousHp,hp:target.hp,maxHp:target.maxHp,
                criticalThreshold:collapseThreshold(target)*2,firstHitThisRaid}});
            }
          }
          // A presentation snapshot is a fact about this completed hit, never
          // another damage command. It survives target movement, raid end/save.
          emit(s,agriculturalImpact?.blocked&&!shield?'AnimalLogicalMiss':'AnimalLogicalHit',{attackId:a.attackId,targetId:target.id,species:a.species,...(agriculturalImpact?{agriculturalImpact}:{}),presentation:{elapsed:s.elapsed,...(agriculturalImpact?{agriculturalImpact}:{}),
            animal:{x:a.x,z:a.z,heading:a.heading},target:{x:target.x,z:target.z,kind:target.kind,...(target.kind==='center'?{culture:centerCulture(target,s),yaw:target.yaw}:{}),...(target.kind==='wall'?{material:target.material,gate:target.gate,yaw:target.yaw,baseScaleX:target.baseScaleX}:{})},
            shield:shield?{id:shield.id,x:shield.x,z:shield.z,radius:shield.radius}:null}});
        }else emit(s,'AnimalLogicalMiss',{attackId:a.attackId,targetId:a.targetId,species:a.species,...(expiredBorder?{reason:'shield-expired'}:{})});
      }
      a.status='walking';a.path=null;if(!target||target.alive===false||target.status&&target.status!=='intact')release(s,a);
      // Finish the committed animation before spending another hit or retreating.
      continue;
    }
    if(a.hitsRemaining<=0&&a.status!=='retreating'){release(s,a);leaveWait(s.raid,a);a.status='retreating';emit(s,'AnimalRetreating',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining,reason:'budget-exhausted'});}
    if(a.status==='retreating') {
      if(walkTo(s,a,{...(a.exit??a.spawn),id:`exit-${a.id}`},dt,nav,{speed:3.8,worker:false,expandRoute:true,routeVia:a.spawn}))a.status='gone';continue;
    }
    if(a.hitsRemaining<=0)continue;
    let target=raidTarget(s,a.targetId);
    if(!target) {
      if(a.status!=='waiting')release(s,a);
      // Search independent targets before staging. Each waiting actor retries
      // its own bounded search; an unreachable queue head cannot block peers.
      if(a.status==='waiting'){
        const wait=a.raidWait,progress=s.raid.waitProgress;
        if(s.elapsed-Math.max(wait.since,progress?.at??wait.since)>=RAID_WAIT_SECONDS||!nav.walkable(a.spawn.x,a.spawn.z,a.radius,null,false)){
          leaveWait(s.raid,a);a.status='retreating';emit(s,'AnimalRetreating',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining,reason:'waiting-expired-or-stage-blocked'});continue;
        }
        if(dist(a,a.spawn)>.08&&(a.path||s.elapsed>=wait.moveRetryAt)){
          walkTo(s,a,{...a.spawn,id:'wait-'+a.id},dt,nav,{speed:1.5,worker:false});if(!a.path)wait.moveRetryAt=s.elapsed+1;
        }
        const epoch=waitEpoch(s,nav);
        if(wait.epoch===epoch&&s.elapsed<wait.retryAt)continue;
        wait.epoch=epoch;wait.retryAt=s.elapsed+1;
      }
      const selected=targetFor(s,a,nav);
      if(!selected||selected.unknown){
        emit(s,'AnimalTargetUnavailable',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining});
        if(selected?.unknown||occupiedEligibleGroup(s,a,p=>canAttackCrop(s,p)))enqueueWait(s,a);
        else {leaveWait(s.raid,a);a.status='retreating';emit(s,'AnimalRetreating',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining,reason:'no-reachable-unleased-target'});}
        continue;
      }
      if(a.status==='waiting')a.status='entering';leaveWait(s.raid,a);
      target=selected.target;a.targetId=target.id;a.reservation=selected.reservation;s.raid.reservations[a.reservation]=a.id;s.raid.waitRevision=((s.raid.waitRevision??0)+1)>>>0;
      a.approach=selected.approach.point;a.approachShieldId=selected.shieldId;
      a.path=selected.approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
    }
    const shield=spellAt(s,'shield',target);
    if(!a.approach||a.approachShieldId!==(shield?.id??null)||!reservedApproachClear(s,a,a.approach)||!actorSegmentClear(a.approach,a.approach,a,actorBlockers(s,a,false))) {
      const approach=reachableApproach(a,target,nav,shield);
      if(!approach){emit(s,'AnimalRouteUnavailable',{targetId:a.id,species:a.species,phase:'approach'});release(s,a);a.status='walking';continue;}
      a.approach=approach.point;a.approachShieldId=shield?.id??null;
      a.path=approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
    }
    if(a.status!=='attacking') {
      if(walkTo(s,a,a.approach,dt,nav,{speed:a.status==='entering'?3.8:1.5,worker:false})) {
        a.heading=Math.atan2(target.x-a.x,target.z-a.z);
        a.status='attacking';a.hitApplied=false;a.attackId=`attack-${s.sequence++}`;
        const roll=nextRandom(s);a.animation=roll<.45?'Right_Hand_Sword_Slash':roll<.75?'Charged_Upward_Slash':roll<.9?'Weapon_Combo':'Weapon_Combo_2';
        a.attackDuration=ANIMAL_ACTIONS.animals[a.species].clips[a.animation].duration;a.attackRemaining=a.attackDuration;
      } else if(!a.path){emit(s,'AnimalRouteUnavailable',{targetId:a.id,species:a.species,phase:'travel'});release(s,a);a.status='walking';}
      else if(dist(a,s.structures.find(operational)??target)<25)a.status='walking';
    }
  }
  if(s.raid.animals.every(a=>a.status==='gone')) {
    const pending=s.raid.pendingWavePlan??nextPressureWave(s.raid,s.time);
    if(pending){s.raid.pendingWavePlan=pending;return;}
    s.raid=null;nav.setState(s);emit(s,'RaidEnded');
    if(!s.structures.some(operational)&&compare(s.ledger.balance,rational(B.work_center.cost))<0){s.result='defeat';notice(s,'Cayó el último centro; faltan monedas para que otro nazca.');emit(s,'GameOver');return;}
    for(const w of s.workers) {
      if(w.incapacitated||contractExpired(w,s)||s.time>=PROFILES_END(w.profile))continue;
      const center=s.structures.find(c=>c.id===w.centerId&&operational(c));
      if(center){w.status='arriving';w.raidReturn=true;w.path=null;}
      else {w.displacedDay=s.day;w.status='returning';w.path=null;}
    }
    recoverDisplacedWorkers(s);
    rebuildTasks(s);
  }
}
const PROFILES_END=id=>id.endsWith('Male')?250:300;
