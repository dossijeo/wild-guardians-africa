import {resolveAgriculturalImpact,validDamageProfile} from './raid-agricultural-impact.js';
import {liveWaitQueue,occupiedEligibleGroup,enqueueWait,leaveWait,observeWaitProgress,waitEpoch,RAID_WAIT_SECONDS} from './raid-contention.js';
import {raidEntryChunks,includeRaidBounds} from '../world/raid-entry-residency.js';
import {raidEntryKey} from '../world/raid-entry-data.js';
import {exteriorRaidEntry} from './raid-exterior-entry.js';
import {createCropGrouping} from './crop-components.js';
import {cropBecameInactive} from './active-crops.js';
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
import {targetReservationKey,targetReserved,reservedApproachClear,reconcileTargetReservations} from './raid-target-reservations.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),entrySelections=new WeakMap();
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
        // area, especially once canyon water becomes traversable. Keep the
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
          if((nav.approachPath??nav.path).call(nav,point,approach,radius,null,false)){reachable=true;break;}
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
export function chooseRaidEntry(s,specs,bounds,preferredSide,nav){return exteriorRaidEntry(s,specs,bounds,preferredSide,nav,baseRaidEntry,cameraRaidEntry);}
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
    const count=s.plants.filter(p=>p.alive).length;
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
  const exposed=s.plants.filter(p=>p.alive);
  emit(s,wave?'RaidWaveSpawned':'RaidSpawned',{raidFacts:{id:s.raid.id,day:s.day,daytime,elapsed:s.elapsed,waveIndex:s.raid.waveIndex??0,pressureFacts:s.raid.pressureFacts??null,exposedLiving:exposed.length,exposedWounded:exposed.filter(p=>(p.attackHits??0)>0).length,actors:animals.map(a=>({id:a.id,species:a.species,hitsRemaining:a.hitsRemaining,...(a.damageProfile?{damageProfile:structuredClone(a.damageProfile)}:{}),spawn:{...a.spawn},exit:{...a.exit}}))}});return true;
}
function release(s,a) {if(a.reservation&&s.raid.reservations[a.reservation]===a.id){delete s.raid.reservations[a.reservation];s.raid.waitRevision=((s.raid.waitRevision??0)+1)>>>0;}a.reservation=null;a.targetId=null;a.path=null;a.approach=null;a.approachShieldId=null;}
export function reachableApproach(a,target,nav,shield=null){
  const focus=shield??target,r=shield?shield.radius+a.radius+.1:(target.kind==='wall'?1.2:.6)+a.radius;
  const angle=Math.atan2(a.x-focus.x,a.z-focus.z);
  for(let sample=0;sample<32;sample++){
    if(nav.approachRegionBlocked?.(a,focus,a.radius,r))return null;
    const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
    const point={id:`approach-${target.id}-${shield?.id??'direct'}-${sample}`,...(!shield&&target.kind==='center'?centerBoundaryPoint(target,angle+offset,a.radius+.5,nav.state):{x:focus.x+Math.sin(angle+offset)*r,z:focus.z+Math.cos(angle+offset)*r})};
    if(nav.state?.raid&&!reservedApproachClear(nav.state,a,point))continue;
    if(nav.state&&!actorSegmentClear(point,point,a,actorBlockers(nav.state,a,false)))continue;
    // A complete 32-cell corridor lets the native search certify enclosed
    // islands once and reuse that proof across nearby crop service points.
    const path=nav.approachPath?nav.approachPath(a,point,a.radius,32):nav.path(a,point,a.radius,null,false,32);
    if(path)return {point,path};
  }
  return null;
}
function canAttackCrop(s,p){
  return p.alive&&((p.attackHits??0)<1||s.raid.introCropLimit===undefined||(s.raid.introCropsDestroyed??0)<s.raid.introCropLimit);
}
export function raidTarget(s,id){
  const eligible=t=>t.id===id&&(!('alive' in t)||canAttackCrop(s,t))&&(!('status' in t)||t.status==='intact');
  // Keep crop-first selection and eligibility without allocating a copy of
  // the complete farm history for every animal and simulation step.
  return s.plants.find(eligible)??s.structures.find(eligible);
}
function targetFor(s,a,nav) {
  const groups=[],seen=new Set(),components=createCropGrouping(s.plants);
  for(const p of components.living)if(!seen.has(p.id)) {
    const group=components.group(p);group.forEach(p=>seen.add(p.id));const id=group.map(p=>p.id).sort()[0];
    groups.push({id:`crop:${id}`,targets:group,value:group.length*B.crops.find(c=>c.id===p.species).base_harvest_value});
  }
  groups.sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  for(const group of groups){
   for(const p of group.targets.filter(p=>canAttackCrop(s,p)).sort((p,q)=>dist(a,p)-dist(a,q))) {
    // Accessibility belongs to the valued connected zone; a native closed
    // component proof can reject that zone once, without reserving it.
    if(nav.approachGroupBlocked?.(a,group.targets,a.radius,.6+a.radius))break;
    if(targetReserved(s,a,p))continue;
    const shield=spellAt(s,'shield',p),approach=reachableApproach(a,p,nav,shield);
    if(approach)return {target:p,reservation:targetReservationKey(p,a),approach,shieldId:shield?.id??null};
   }
  }
  // If crops are blocked, resolve the nearest visible barrier, without weakest-material omniscience.
  const structures=defensiveGroups(s),near=g=>Math.min(...g.targets.map(t=>dist(a,t)));
  structures.sort((p,q)=>groups.length?near(p)-near(q):q.value-p.value||near(p)-near(q)||p.id.localeCompare(q.id));
  for(const group of structures)for(const structure of [...group.targets].sort((p,q)=>dist(a,p)-dist(a,q)||p.id.localeCompare(q.id))) {
    if(targetReserved(s,a,structure))continue;
    const shield=spellAt(s,'shield',structure),approach=reachableApproach(a,structure,nav,shield);
    if(approach)return {target:structure,reservation:targetReservationKey(structure,a),approach,shieldId:shield?.id??null};
  }
  return null;
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
      if(selected){preview.raid.reservations[selected.reservation]=animal.id;animal.targetId=selected.target.id;animal.approach=selected.approach.point;}
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
                target.attackHits=Math.min(2,(target.attackHits??0)+1);emit(s,'CropHit',{targetId:target.id,hits:target.attackHits});
                if(target.attackHits>=2){target.alive=false;target.harvestRequested=false;cropBecameInactive(s.plants);if(s.raid.introCropLimit!==undefined)s.raid.introCropsDestroyed++;emit(s,'CropDestroyed',{targetId:target.id});}
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
      if(!selected){
        emit(s,'AnimalTargetUnavailable',{targetId:a.id,species:a.species,hitsRemaining:a.hitsRemaining});
        if(occupiedEligibleGroup(s,a,p=>canAttackCrop(s,p)))enqueueWait(s,a);
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
