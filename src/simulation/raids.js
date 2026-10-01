import {BALANCE as B} from './balance.js';
import {nextRandom,randomInt,compositions,attraction,threatTier,animalSpec,operational,hitStructure} from './rules.js';
import {emit,notice,walkTo,rebuildTasks,spellAt} from './game.js';
import {releaseTask} from './tasks.js';
import {rational,compare} from './money.js';
import {contiguousGroup} from './crops.js';
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
  const focus=s.structures.find(operational)??s.villages[0],side=randomInt(s,0,3);
  const animals=[];
  for(let i=0;i<group.length;i++) {
    const spec=animalSpec(group[i]),radius={warthog:.45,hyena:.45,buffalo:.8,lion:.65,rhino:1}[spec.id];
    let spawn=null;
    for(let attempt=0;attempt<150;attempt++) {
      const offset=(i-(group.length-1)/2)*4+(attempt%15)*2;
      const point={x:focus.x+(side<2?(side?1:-1)*(46+Math.floor(attempt/15)*2):offset),z:focus.z+(side>=2?(side===3?1:-1)*(46+Math.floor(attempt/15)*2):offset)};
      if(nav.walkable(point.x,point.z,radius,null,false)&&animals.every(a=>dist(a,point)>a.radius+radius+1)){spawn=point;break;}
    }
    if(!spawn){notice(s,'La incursión no encuentra un punto de entrada transitable.');continue;}
    animals.push({id:`animal-${s.nextId++}`,species:spec.id,...spawn,spawn:{...spawn},radius,hitsRemaining:randomInt(s,spec.hit_budget_min,spec.hit_budget_max),status:'entering',targetId:null,reservation:null,path:null,attackRemaining:0,attackId:null,hitApplied:false});
  }
  if(!animals.length)return;
  s.raid={id:`raid-${s.day}-${daytime?'day':'night'}`,animals,encounters:[],reservations:{},daytime};
  for(const w of s.workers) {
    releaseTask(s,w);w.path=null;w.hits=0;
    if(w.crateId) {const c=s.crates.find(c=>c.id===w.crateId);c.carrierId=null;c.x=w.x;c.z=w.z;w.crateId=null;emit(s,'CrateDropped',{targetId:c.id});}
    if(w.status!=='home')w.status='fleeing';
  }
  notice(s,'¡Incursión! Los trabajadores buscan refugio. Protege la finca con Escudo.',animals[0].id);emit(s,'RaidSpawned');
}
function release(s,a) {if(a.reservation)delete s.raid.reservations[a.reservation];a.reservation=null;a.targetId=null;a.path=null;}
function targetFor(s,a,nav) {
  const groups=[],seen=new Set();
  for(const p of s.plants.filter(p=>p.alive))if(!seen.has(p.id)) {
    const group=contiguousGroup(s.plants,p);group.forEach(p=>seen.add(p.id));const id=group.map(p=>p.id).sort()[0];
    if(!s.raid.reservations[`crop:${id}`])groups.push({id:`crop:${id}`,targets:group,value:group.length*B.crops.find(c=>c.id===p.species).base_harvest_value});
  }
  groups.sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
  for(const group of groups)for(const p of group.targets.sort((p,q)=>dist(a,p)-dist(a,q))) {
    const shield=spellAt(s,'shield',p),d=shield?dist(a,shield)||1:1;
    const destination=shield?{x:shield.x+(a.x-shield.x)*(shield.radius+a.radius+.1)/d,z:shield.z+(a.z-shield.z)*(shield.radius+a.radius+.1)/d}:p;
    if(nav.path(a,destination,a.radius,null,false))return {target:p,reservation:group.id};
  }
  // If crops are blocked, resolve the nearest visible barrier, without weakest-material omniscience.
  const structures=s.structures.filter(c=>c.status==='intact'&&!s.raid.reservations[`structure:${c.id}`]);
  structures.sort((p,q)=>groups.length?dist(a,p)-dist(a,q):q.cost-p.cost||dist(a,p)-dist(a,q));
  for(const structure of structures) {
    const approach=approachPoint(a,structure);
    if(nav.path(a,approach,a.radius,structure.id,false))return {target:structure,reservation:`structure:${structure.id}`};
  }
  return null;
}
function approachPoint(a,target) {
  const d=dist(a,target)||1,r=(target.kind==='center'?3.1:target.kind==='wall'?1.2:.6)+a.radius;
  return {...target,x:target.x+(a.x-target.x)*r/d,z:target.z+(a.z-target.z)*r/d};
}
function hitWorker(s,a,w) {
  if(w.incapacitated||a.hitsRemaining<=0)return;
  const pair=`${a.id}:${w.id}`;
  if(s.raid.encounters.includes(pair))return;
  s.raid.encounters.push(pair);
  const collision=dist(a,w)<a.radius+.28;
  if(!collision&&nextRandom(s)>=.6)return;
  a.hitsRemaining--;w.hits++;
  if(w.hits>=2) {
    w.incapacitated=true;w.status='incapacitated';w.path=null;
    const person=s.people.find(p=>p.id===w.personId);if(person)person.recoveryUntil=s.day+1;
    emit(s,'WorkerIncapacitated',{targetId:w.id});
  } else {w.fallRemaining=3.54;emit(s,'WorkerHit',{targetId:w.id});}
}
export function updateRaid(s,dt,nav) {
  if(!s.raid)return;
  for(const a of s.raid.animals) {
    if(a.status==='gone')continue;
    if(a.hitsRemaining<=0&&a.status!=='retreating'){release(s,a);a.status='retreating';emit(s,'AnimalRetreating',{targetId:a.id});}
    if(a.status==='retreating') {
      if(walkTo(s,a,{...a.spawn,id:`exit-${a.id}`},dt,nav,{speed:3.8,worker:false}))a.status='gone';continue;
    }
    for(const w of s.workers)if(w.status!=='home'&&dist(a,w)<a.radius+1.1)hitWorker(s,a,w);
    if(a.hitsRemaining<=0)continue;
    let target=[...s.plants,...s.structures].find(t=>t.id===a.targetId&&(!('alive' in t)||t.alive)&&(!('status' in t)||t.status==='intact'));
    if(!target) {
      release(s,a);const selected=targetFor(s,a,nav);
      if(!selected){a.status='retreating';continue;}
      target=selected.target;a.targetId=target.id;a.reservation=selected.reservation;s.raid.reservations[a.reservation]=a.id;
    }
    const shield=spellAt(s,'shield',target);
    let destination=approachPoint(a,target);
    if(shield) {
      const d=dist(a,shield)||1;destination={id:`shield-edge-${shield.id}`,x:shield.x+(a.x-shield.x)*(shield.radius+a.radius+.05)/d,z:shield.z+(a.z-shield.z)*(shield.radius+a.radius+.05)/d};
    }
    if(a.status!=='attacking') {
      if(walkTo(s,a,destination,dt,nav,{speed:a.status==='entering'?3.8:1.5,ignore:target.kind?target.id:null,worker:false})) {
        a.status='attacking';a.attackRemaining=1.8;a.hitApplied=false;a.attackId=`attack-${s.sequence++}`;
        const roll=nextRandom(s);a.animation=roll<.45?'Right_Hand_Sword_Slash':roll<.75?'Charged_Upward_Slash':roll<.9?'Weapon_Combo':'Weapon_Combo_2';
      } else if(dist(a,s.structures.find(operational)??target)<25)a.status='walking';
    } else {
      a.attackRemaining-=dt;
      if(a.attackRemaining<=.8&&!a.hitApplied) {
        a.hitApplied=true;a.hitsRemaining--;
        if(!spellAt(s,'shield',target)) {
          if('alive' in target){target.alive=false;target.harvestRequested=false;emit(s,'CropDestroyed',{targetId:target.id});}
          else {hitStructure(target,animalSpec(a.species).structure_hit_damage);emit(s,'StructureHit',{targetId:target.id});}
        }
        emit(s,'AnimalLogicalHit',{attackId:a.attackId,targetId:target.id,species:a.species});
      }
      if(a.attackRemaining<=0){a.status='walking';a.path=null;if(!target.alive&&'alive' in target||target.status&&target.status!=='intact')release(s,a);}
    }
  }
  if(s.raid.animals.every(a=>a.status==='gone')) {
    s.raid=null;nav.setState(s);emit(s,'RaidEnded');
    if(!s.structures.some(operational)&&compare(s.ledger.balance,rational(800))<0){s.result='defeat';notice(s,'El último centro ha caído y no puedes financiar otro.');emit(s,'GameOver');return;}
    for(const w of s.workers) {
      if(w.incapacitated||s.time>=PROFILES_END(w.profile))continue;
      const center=s.structures.find(c=>c.id===w.centerId&&operational(c));
      const replacement=center??s.structures.find(c=>operational(c)&&c.villageId===w.villageId);
      if(replacement){w.centerId=replacement.id;w.status='arriving';w.path=null;}
    }
    rebuildTasks(s);
  }
}
const PROFILES_END=id=>id.endsWith('Male')?250:300;
