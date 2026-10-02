import {BALANCE as B} from './balance.js';
import {nextRandom,randomInt,compositions,attraction,threatTier,animalSpec,operational,hitStructure} from './rules.js';
import {emit,notice,walkTo,rebuildTasks,spellAt,dropCarriedCrate,recoverDisplacedWorkers} from './game.js';
import {contractExpired} from './workforce.js';
import {cancelIdle} from './idle.js';
import {releaseTask} from './tasks.js';
import {rational,compare} from './money.js';
import {contiguousGroup} from './crops.js';
import {updateWorkerEncounters} from './encounters.js';
import {ANIMAL_ACTIONS} from './animal-actions-data.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function planNight(s) {
  const at=323+nextRandom(s)*225; // 20:00–05:00 at 2.4 internal minutes/s.
  const value=attraction(s.plants),tier=threatTier(value);
  let group=[];
  if(!s.postgame&&s.day===2)group=['warthog'];
  else if(!s.postgame&&s.day>2&&tier&&nextRandom(s)<tier.night_attack_probability) {
    const budget=randomInt(s,tier.threat_min,tier.threat_max),legal=compositions(budget,tier.unlocked_species);
    group=legal[randomInt(s,0,legal.length-1)];
  }
  s.nightPlan={at,attraction:value,group,done:false};
}
export function planDay(s) {s.dayPlan={at:(115+nextRandom(s)*420)/2.4,done:false};}
export function spawnRaid(s,plan,nav,daytime=false) {
  if(s.raid||s.postgame)return;
  let group=plan.group;
  if(daytime) {
    const value=attraction(s.plants);if(value<10000||nextRandom(s)>=.1)return;
    const budget=randomInt(s,7,10),legal=compositions(budget,threatTier(value).unlocked_species);group=legal[randomInt(s,0,legal.length-1)];
  }
  if(!group?.length)return;
  const focus=s.structures.find(operational)??s.villages[0],preferredSide=randomInt(s,0,3);
  const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  let entries=null;
  for(let sideTry=0;sideTry<4&&!entries;sideTry++){
    const side=(preferredSide+sideTry)%4;
    for(let attempt=0;attempt<31&&!entries;attempt++){
      const clusterOffset=attempt?Math.ceil(attempt/2)*(attempt%2?2:-2):0,points=[];
      for(let i=0;i<specs.length;i++){
        const {radius}=specs[i];let spawn=null;
        for(const adjustment of [0,1,-1,2,-2]){
          const offset=clusterOffset+(i-(group.length-1)/2)*4+adjustment;
          const point={x:focus.x+(side<2?(side?1:-1)*46:offset),z:focus.z+(side>=2?(side===3?1:-1)*46:offset)};
          if(nav.walkable(point.x,point.z,radius,null,false)&&points.every((p,j)=>dist(p,point)>specs[j].radius+radius+1)&&connectedEntry(s,{...point,radius},nav)){
            spawn=point;break;
          }
        }
        if(!spawn)break;points.push(spawn);
      }
      if(points.length===specs.length)entries=points;
    }
  }
  if(!entries){notice(s,'La incursión no encuentra una entrada transitable para su grupo completo.');return;}
  const animals=specs.map(({spec,radius},i)=>({id:`animal-${s.nextId++}`,species:spec.id,...entries[i],spawn:{...entries[i]},radius,
    hitsRemaining:randomInt(s,spec.hit_budget_min,spec.hit_budget_max),status:'entering',targetId:null,reservation:null,path:null,attackRemaining:0,attackId:null,hitApplied:false}));
  s.raid={id:`raid-${s.day}-${daytime?'day':'night'}`,animals,encounters:[],reservations:{},daytime};
  for(const w of s.workers) {
    cancelIdle(w);
    releaseTask(s,w);w.path=null;w.hits=0;
    if(w.crateId)dropCarriedCrate(s,w);
    if(w.status!=='home')w.status='fleeing';
  }
  s.tasks=s.tasks.filter(t=>t.kind!=='repair');
  notice(s,'¡Incursión! Los trabajadores buscan refugio. Protege la finca con Escudo.',animals[0].id);emit(s,'RaidSpawned');
}
function release(s,a) {if(a.reservation)delete s.raid.reservations[a.reservation];a.reservation=null;a.targetId=null;a.path=null;a.approach=null;a.approachShieldId=null;}
function connectedEntry(s,a,nav){
  // Spawn only needs proof that some target is reachable. Check the larger
  // structure service rings first; actual target priority is still targetFor.
  for(const structure of s.structures.filter(c=>c.status==='intact'&&!s.raid?.reservations[`structure:${c.id}`])){
    if(reachableApproach(a,structure,nav,spellAt(s,'shield',structure)))return true;
  }
  return !!targetFor(s,a,nav);
}
export function reachableApproach(a,target,nav,shield=null){
  const focus=shield??target,r=shield?shield.radius+a.radius+.1:(target.kind==='center'?3.1:target.kind==='wall'?1.2:.6)+a.radius;
  const angle=Math.atan2(a.x-focus.x,a.z-focus.z);
  for(let sample=0;sample<32;sample++){
    const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
    const point={id:`approach-${target.id}-${shield?.id??'direct'}-${sample}`,x:focus.x+Math.sin(angle+offset)*r,z:focus.z+Math.cos(angle+offset)*r};
    const path=nav.path(a,point,a.radius,null,false);
    if(path)return {point,path};
  }
  return null;
}
function targetFor(s,a,nav) {
  const groups=[],seen=new Set();
  for(const p of s.plants.filter(p=>p.alive))if(!seen.has(p.id)) {
    const group=contiguousGroup(s.plants,p);group.forEach(p=>seen.add(p.id));const id=group.map(p=>p.id).sort()[0];
    if(!s.raid?.reservations[`crop:${id}`])groups.push({id:`crop:${id}`,targets:group,value:group.length*B.crops.find(c=>c.id===p.species).base_harvest_value});
  }
  groups.sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  for(const group of groups)for(const p of group.targets.sort((p,q)=>dist(a,p)-dist(a,q))) {
    const shield=spellAt(s,'shield',p),approach=reachableApproach(a,p,nav,shield);
    if(approach)return {target:p,reservation:group.id,approach,shieldId:shield?.id??null};
  }
  // If crops are blocked, resolve the nearest visible barrier, without weakest-material omniscience.
  const structures=s.structures.filter(c=>c.status==='intact'&&!s.raid?.reservations[`structure:${c.id}`]);
  structures.sort((p,q)=>groups.length?dist(a,p)-dist(a,q):q.cost-p.cost||dist(a,p)-dist(a,q));
  for(const structure of structures) {
    const shield=spellAt(s,'shield',structure),approach=reachableApproach(a,structure,nav,shield);
    if(approach)return {target:structure,reservation:`structure:${structure.id}`,approach,shieldId:shield?.id??null};
  }
  return null;
}
export function updateRaid(s,dt,nav) {
  if(!s.raid)return;
  updateWorkerEncounters(s,nav);
  for(const a of s.raid.animals) {
    if(a.status==='gone')continue;
    if(a.status==='attacking'){
      a.attackDuration??=ANIMAL_ACTIONS.animals[a.species].clips[a.animation].duration;
      a.attackRemaining=Math.max(0,a.attackRemaining-dt);
      if(a.attackRemaining>1e-9)continue;
      const target=[...s.plants,...s.structures].find(t=>t.id===a.targetId&&(!('alive' in t)||t.alive)&&(!('status' in t)||t.status==='intact'));
      if(!a.hitApplied&&a.hitsRemaining>0){
        a.hitApplied=true;a.hitsRemaining--;
        if(target){
          const shield=spellAt(s,'shield',target);
          if(!shield){
            if('alive' in target){target.alive=false;target.harvestRequested=false;emit(s,'CropDestroyed',{targetId:target.id});}
            else {hitStructure(target,animalSpec(a.species).structure_hit_damage);emit(s,'StructureHit',{targetId:target.id});}
          }
          // A presentation snapshot is a fact about this completed hit, never
          // another damage command. It survives target movement, raid end/save.
          emit(s,'AnimalLogicalHit',{attackId:a.attackId,targetId:target.id,species:a.species,presentation:{elapsed:s.elapsed,
            animal:{x:a.x,z:a.z,heading:a.heading},target:{x:target.x,z:target.z,kind:target.kind,...(target.kind==='wall'?{material:target.material,gate:target.gate,yaw:target.yaw,baseScaleX:target.baseScaleX}:{})},
            shield:shield?{id:shield.id,x:shield.x,z:shield.z,radius:shield.radius}:null}});
        }else emit(s,'AnimalLogicalMiss',{attackId:a.attackId,targetId:a.targetId,species:a.species});
      }
      a.status='walking';a.path=null;if(!target)release(s,a);
      // Finish the committed animation before spending another hit or retreating.
      continue;
    }
    if(a.hitsRemaining<=0&&a.status!=='retreating'){release(s,a);a.status='retreating';emit(s,'AnimalRetreating',{targetId:a.id});}
    if(a.status==='retreating') {
      if(walkTo(s,a,{...a.spawn,id:`exit-${a.id}`},dt,nav,{speed:3.8,worker:false,expandRoute:true}))a.status='gone';continue;
    }
    if(a.hitsRemaining<=0)continue;
    let target=[...s.plants,...s.structures].find(t=>t.id===a.targetId&&(!('alive' in t)||t.alive)&&(!('status' in t)||t.status==='intact'));
    if(!target) {
      release(s,a);const selected=targetFor(s,a,nav);
      if(!selected){a.status='retreating';continue;}
      target=selected.target;a.targetId=target.id;a.reservation=selected.reservation;s.raid.reservations[a.reservation]=a.id;
      a.approach=selected.approach.point;a.approachShieldId=selected.shieldId;
      a.path=selected.approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
    }
    const shield=spellAt(s,'shield',target);
    if(!a.approach||a.approachShieldId!==(shield?.id??null)) {
      const approach=reachableApproach(a,target,nav,shield);
      if(!approach){release(s,a);a.status='walking';continue;}
      a.approach=approach.point;a.approachShieldId=shield?.id??null;
      a.path=approach.path;a.destinationId=a.approach.id;a.pathVersion=nav.version;
    }
    if(a.status!=='attacking') {
      if(walkTo(s,a,a.approach,dt,nav,{speed:a.status==='entering'?3.8:1.5,worker:false})) {
        a.heading=Math.atan2(target.x-a.x,target.z-a.z);
        a.status='attacking';a.hitApplied=false;a.attackId=`attack-${s.sequence++}`;
        const roll=nextRandom(s);a.animation=roll<.45?'Right_Hand_Sword_Slash':roll<.75?'Charged_Upward_Slash':roll<.9?'Weapon_Combo':'Weapon_Combo_2';
        a.attackDuration=ANIMAL_ACTIONS.animals[a.species].clips[a.animation].duration;a.attackRemaining=a.attackDuration;
      } else if(!a.path){release(s,a);a.status='walking';}
      else if(dist(a,s.structures.find(operational)??target)<25)a.status='walking';
    }
  }
  if(s.raid.animals.every(a=>a.status==='gone')) {
    s.raid=null;nav.setState(s);emit(s,'RaidEnded');
    if(!s.structures.some(operational)&&compare(s.ledger.balance,rational(800))<0){s.result='defeat';notice(s,'El último centro ha caído y no puedes financiar otro.');emit(s,'GameOver');return;}
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
