import {BALANCE as B} from './balance.js';
import {rational,multiply,negate,transact,compare} from './money.js';
import {PROFILES,allocateWorkers,hiringCost,distributeProfiles} from './workforce.js';
import {permission,operational,cropSpec,wallSpec,structureHealth,dawnMinimum,nextRandom,randomInt,villageCost,hitStructure} from './rules.js';
import {createPlant,advancePlant,waterPlant,isMature,contiguousGroup} from './crops.js';
import {enqueue,reserveTasks,releaseTask} from './tasks.js';
import {planNight,updateRaid,spawnRaid,planDay} from './raids.js';
import {selectEvent,applyEvent} from './events.js';

export const BIOMES=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'];
export const CULTURES=['mapungubwe','saheliana','suajili','musgum','etiope'];
export function newGame({biome='sabana',culture='mapungubwe',seed=Date.now(),slotId=crypto.randomUUID()}={}) {
  if(!BIOMES.includes(biome)||!CULTURES.includes(culture))throw new Error('Combinación desconocida');
  return {saveVersion:1,slotId,seed:String(seed),rng:(Number(seed)>>>0)||918271,biome,culture,day:1,time:0,elapsed:0,completedNights:0,postgame:false,result:null,
    initialPreparation:true,ledger:{balance:rational(1000),entries:{}},nextId:2,sequence:1,structures:[],plants:[],workers:[],people:[],crates:[],spells:[],tasks:[],villages:[{id:'village-1',culture,x:0,z:0,buildings:[]}],suppressed:[],
    pauses:['intro'],hiringPaidDay:null,hiringSelection:{olderMale:0,olderFemale:0,youngMale:0,youngFemale:0},raid:null,nightPlan:null,dayPlan:null,eventPlan:null,
    cooldowns:{shield:0,growth:0,multiply:0},tutorial:{step:'intro',seen:[]},messages:[],commandIds:[],events:[]};
}
export const pause=(s,reason)=>{if(!s.pauses.includes(reason))s.pauses.push(reason);};
export const resume=(s,reason)=>{s.pauses=s.pauses.filter(r=>r!==reason);};
export function emit(s,type,detail={}) {s.events.push({id:`event-${s.sequence++}`,type,...detail});if(s.events.length>200)s.events.shift();}
export function notice(s,text,target=null) {s.messages.push({id:`message-${s.sequence++}`,text,target});if(s.messages.length>8)s.messages.shift();}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const profile=w=>PROFILES.find(p=>p.id===w.profile);
const nearest=(list,point)=>[...list].sort((a,b)=>dist(a,point)-dist(b,point)||a.id.localeCompare(b.id))[0];
export function commit(s,id,action,operation) {
  if(s.commandIds.includes(id))return false;
  if(!permission(s,action))throw new Error('Esta acción no está disponible ahora');
  operation();s.commandIds.push(id);return true;
}
export function placeStructure(s,id,{kind='center',material='zarzas',gate=false,x,z,yaw=0},nav) {
  const check=nav.placement(x,z,kind==='center'?2.6:.8);
  if(!check.valid)throw new Error(check.reason);
  if(kind!=='center'&&kind!=='wall')throw new Error('Construcción desconocida');
  const cost=kind==='center'?800:wallSpec(material).cost;
  return commit(s,id,kind==='center'?'center':'wall',()=>{
    transact(s.ledger,id,rational(-cost));
    const maxHp=structureHealth(kind,material,gate),village=nearest(s.villages,{x,z});
    s.structures.push({id:`structure-${s.nextId++}`,created:s.sequence++,kind,material,gate,x,z,yaw,maxHp,hp:maxHp,status:'intact',villageId:village?.id,cost,collapseRemaining:0});
    s.suppressed.push(...(check.suppress??[]));nav.setState(s);emit(s,'PlacementCommitted',{kind});
    if(kind==='center'&&s.tutorial.step==='center')s.tutorial.step='plant';
  });
}
export function plant(s,id,species,x,z,nav) {
  const check=nav.placement(x,z,.4);
  if(!check.valid)throw new Error(check.reason);
  if(s.plants.some(p=>p.alive&&dist(p,{x,z})<1.1))throw new Error('Necesitas separar las plantas');
  const center=nearest(s.structures.filter(operational),{x,z});
  return commit(s,id,'plant',()=>{
    transact(s.ledger,id,rational(-cropSpec(species).plant_cost));
    const p=createPlant(`plant-${s.nextId++}`,species,x,z,center.id);s.plants.push(p);enqueue(s,center.id,'initial',p.id);
    s.suppressed.push(...(check.suppress??[]));nav.setState(s);emit(s,'CropPlaced',{targetId:p.id});
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
export function hire(s,id,selection) {
  if(s.hiringPaidDay===s.day)return false;
  if(!s.pauses.includes('hiring'))throw new Error('La contratación no está abierta');
  const cost=hiringCost(selection);transact(s.ledger,id,rational(-cost));
  const centers=s.structures.filter(operational).map(c=>({...c,plants:s.plants.filter(p=>p.alive&&p.centerId===c.id).length}));
  const total=Object.values(selection).reduce((a,b)=>a+b,0),quotas=allocateWorkers(centers,total),assigned=distributeProfiles(quotas,selection);
  s.workers=[];const usedPeople=new Set();
  const add=(profileId,centerId)=>{
    const center=s.structures.find(c=>c.id===centerId),village=s.villages.find(v=>v.id===center?.villageId)??s.villages[0];
    let person=s.people.find(p=>p.profile===profileId&&!usedPeople.has(p.id));
    if(!person){person={id:`person-${s.nextId++}`,profile:profileId,recoveryUntil:0};s.people.push(person);}usedPeople.add(person.id);
    s.workers.push({id:`worker-${s.nextId++}`,personId:person.id,profile:profileId,centerId: centerId??null,villageId:village.id,x:village.x,z:village.z,status:center?'arriving':'home',taskId:null,crateId:null,path:null,hits:0,incapacitated:false,recovering:s.day<=person.recoveryUntil,runRemaining:0,actionRemaining:0});
  };
  for(const [centerId,profiles] of Object.entries(assigned))for(const p of profiles)add(p,centerId);
  if(!centers.length)for(const p of PROFILES)for(let i=0;i<(selection[p.id]??0);i++)add(p.id,null);
  s.hiringSelection={...selection};s.hiringPaidDay=s.day;s.initialPreparation=false;resume(s,'hiring');rebuildTasks(s);planDay(s);
  if(s.tutorial.step==='hire')s.tutorial.step='observe';emit(s,'HiringConfirmed',{count:total});
}
export function openInitialHiring(s) {if(s.structures.some(operational)&&s.plants.some(p=>p.alive)&&s.hiringPaidDay!==s.day)pause(s,'hiring');}
export function rebuildTasks(s) {
  s.tasks=[];for(const w of s.workers){w.taskId=null;if(['walking','acting'].includes(w.status))w.status='idle';}
  for(const p of s.plants.filter(p=>p.alive)) {
    if(!s.structures.some(c=>c.id===p.centerId&&operational(c)))continue;
    if(p.water[0].status==='due')enqueue(s,p.centerId,'initial',p.id);
    else if(p.water.some(w=>w.status==='due'))enqueue(s,p.centerId,'water',p.id);
    if(isMature(p)&&p.harvestRequested)enqueue(s,p.centerId,'harvest',p.id);
  }
  for(const crate of s.crates.filter(c=>!c.delivered&&!c.carrierId)) {
    const center=nearest(s.structures.filter(operational),crate);if(center)enqueue(s,center.id,'crate',crate.id);
  }
}
export function repairCost(target) {return target.status==='ruined'?rational(target.cost):multiply(rational(target.cost),target.maxHp-target.hp,target.maxHp);}
export function requestRepair(s,id,targetId) {
  const target=s.structures.find(c=>c.id===targetId);if(!target||target.hp===target.maxHp)throw new Error('No necesita reparación');
  if(compare(s.ledger.balance,repairCost(target))<0)throw new Error('Fondos insuficientes');
  return commit(s,id,'repair',()=>{
    const center=nearest(s.structures.filter(operational),target);enqueue(s,center.id,'repair',targetId);emit(s,'RepairRequested',{targetId});
  });
}
export const spellRadius=id=>({shield:1.95,growth:2.6,multiply:2.2})[id]; // Calibrated against 1.5 m planting pitch; area, not plant cap.
export function spellAt(s,id,p) {return s.spells.find(a=>a.kind===id&&a.remaining>0&&dist(a,p)<=a.radius);}
export function cast(s,id,kind,x,z,nav) {
  const spec=B.spells.find(p=>p.id===kind);if(!spec)throw new Error('Magia desconocida');
  const unlocked=kind==='shield'?s.day>=2&&s.time>=300||s.day>2:kind==='growth'?s.day>=3:s.day>=5;
  if(!unlocked)throw new Error('El Espíritu todavía no ha revelado esta magia');
  if(s.cooldowns[kind]>0)throw new Error('La magia está recargando');
  if(!nav.terrainValid(x,z,.2))throw new Error('Ubicación mágica inválida');
  const radius=spellRadius(kind);
  if(s.spells.some(a=>a.remaining>0&&dist(a,{x,z})<a.radius+radius))throw new Error('Las áreas mágicas no pueden solaparse');
  if(kind==='shield'&&s.raid?.animals.some(a=>a.status!=='gone'&&Math.abs(dist(a,{x,z})-radius)<a.radius))throw new Error('El borde del Escudo solapa un animal');
  return commit(s,id,kind,()=>{
    s.spells.push({id:`spell-${s.nextId++}`,kind,x,z,radius,remaining:spec.duration_seconds});s.cooldowns[kind]=spec.cooldown_seconds;emit(s,'SpellActivated',{kind,x,z});
  });
}
export function walkTo(s,w,destination,dt,nav,{speed=1.3,ignore=null,worker=true}={}) {
  if(!w.path||w.destinationId!==destination.id) {
    w.path=nav.path(w,destination,w.radius??.28,ignore,worker);w.destinationId=destination.id;
    if(!w.path)return false;
  }
  let distanceLeft=speed*dt;
  while(w.path.length&&distanceLeft>0) {
    const point=w.path[0],d=dist(w,point);
    if(d<=distanceLeft){w.x=point.x;w.z=point.z;distanceLeft-=d;w.path.shift();}
    else {w.x+=(point.x-w.x)*distanceLeft/d;w.z+=(point.z-w.z)*distanceLeft/d;distanceLeft=0;}
  }
  return w.path.length===0;
}
function completeTask(s,w,t,target) {
  if(t.kind==='initial'||t.kind==='water') {
    if(target.alive){waterPlant(target);target.toleranceBonus=0;emit(s,'WaterSatisfied',{targetId:target.id});}
  } else if(t.kind==='harvest') {
    if(isMature(target)&&target.harvestRequested) {
      let value=rational(cropSpec(target.species).base_harvest_value);
      if(profile(w).male)value=multiply(value,6,5);
      if(spellAt(s,'multiply',target))value=multiply(value,2);
      if(target.harvestBonus)value=multiply(value,100+target.harvestBonus,100);
      target.alive=false;target.harvestRequested=false;
      const crate={id:`crate-${s.nextId++}`,x:w.x,z:w.z,value,carrierId:w.id,delivered:false,centerId:w.centerId};s.crates.push(crate);w.crateId=crate.id;w.status='carrying';w.path=null;emit(s,'CropPicked',{targetId:target.id});
    }
  } else if(t.kind==='crate') {target.carrierId=w.id;w.crateId=target.id;target.centerId=w.centerId;w.status='carrying';w.path=null;}
  else if(t.kind==='repair') {
    if(target.status==='collapsing') {w.actionRemaining=.1;return;}
    try {transact(s.ledger,`repair:${t.id}`,negate(repairCost(target)));target.hp=target.maxHp;target.status='intact';target.collapseRemaining=0;emit(s,'RepairApplied',{targetId:target.id});}
    catch {notice(s,'La reparación se canceló: fondos insuficientes al llegar.',target.id);}
  }
  s.tasks=s.tasks.filter(task=>task.id!==t.id);w.taskId=null;if(w.status!=='carrying')w.status='idle';w.path=null;
}
function updateWorkers(s,dt,nav) {
  for(const w of s.workers) {
    const p=profile(w),center=s.structures.find(c=>c.id===w.centerId),village=s.villages.find(v=>v.id===w.villageId);
    if(['fleeing','returning','incapacitated'].includes(w.status)) {
      const reached=walkTo(s,w,{...village,id:`home-${village.id}`},dt,nav,{speed:w.incapacitated?.55:w.status==='fleeing'?3:1.3});
      if(reached)w.status='home';continue;
    }
    if(w.status==='home')continue;
    if(!center||!operational(center)) {releaseTask(s,w);w.status='returning';w.path=null;continue;}
    if(w.status==='arriving') {if(walkTo(s,w,{...center,x:center.x+3.4,id:`arrival-${center.id}`},dt,nav,{ignore:center.id}))w.status='idle';continue;}
    const ended=s.time>=p.end;
    if(ended&&!['acting','carrying'].includes(w.status)) {releaseTask(s,w);w.status='returning';w.path=null;continue;}
    if(w.status==='carrying') {
      const crate=s.crates.find(c=>c.id===w.crateId);
      if(!crate){w.crateId=null;w.status='idle';continue;}
      crate.x=w.x;crate.z=w.z;
      if(walkTo(s,w,{...center,x:center.x+3.2,id:`delivery-${center.id}`},dt,nav,{ignore:center.id})) {
        transact(s.ledger,`deliver:${crate.id}`,crate.value);crate.delivered=true;crate.carrierId=null;w.crateId=null;w.status=ended?'returning':'idle';w.path=null;emit(s,'CrateDelivered',{targetId:crate.id});
        if(s.tutorial.step==='observe'||s.tutorial.step==='harvest')s.tutorial.step='done';
      }
      continue;
    }
    const t=s.tasks.find(t=>t.id===w.taskId);
    if(!t) {if(w.status!=='idle')w.status='idle';continue;}
    const target=[...s.plants,...s.crates,...s.structures].find(e=>e.id===t.targetId);
    if(!target || ('alive' in target&&!target.alive)) {s.tasks=s.tasks.filter(q=>q.id!==t.id);w.taskId=null;w.status='idle';w.path=null;continue;}
    if(w.status==='walking') {
      const destination=t.kind==='repair'?{...target,x:target.x+(target.kind==='center'?3.2:1.2)}:target;
      if(walkTo(s,w,destination,dt,nav,{ignore:t.kind==='repair'?target.id:null})) {
        w.status='acting';w.actionRemaining=(t.kind==='initial'?7.2:t.kind==='water'?3.4:t.kind==='harvest'?3.6:t.kind==='repair'?3.8:1)/p.speed;
      }
    } else if(w.status==='acting') {
      w.actionRemaining-=dt;if(w.actionRemaining<=0)completeTask(s,w,t,target);
    }
  }
  if(!s.raid && s.time<300)reserveTasks(s,(w,t,target)=>{
    if(s.time>=profile(w).end)return false;
    const destination=t.kind==='repair'?{...target,x:target.x+(target.kind==='center'?3.2:1.2)}:target;
    return !!nav.path(w,destination,.28,t.kind==='repair'?target.id:null,true);
  });
}
function closeNight(s) {
  s.completedNights++;s.time=0;s.day++;
  applyEvent(s);s.eventPlan=null;s.nightPlan=null;
  if(compare(s.ledger.balance,rational(dawnMinimum(s)))<0){s.result='defeat';notice(s,'El poblado no dispone del mínimo necesario para iniciar otra jornada.');emit(s,'GameOver');return;}
  if(s.completedNights>=100&&!s.postgame){s.result='victory';emit(s,'CampaignWon');return;}
  for(const plant of s.plants.filter(p=>p.alive))plant.centerId=nearest(s.structures.filter(operational),plant)?.id??null;
  s.workers=[];s.hiringPaidDay=null;rebuildTasks(s);pause(s,'hiring');emit(s,'Dawn');
}
export function continuePostgame(s) {if(s.result!=='victory')return;s.result=null;s.postgame=true;s.nightPlan=null;s.dayPlan=null;pause(s,'hiring');emit(s,'PostgameStarted');}
export function tick(s,seconds,nav) {
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Paso temporal inválido');
  if(s.initialPreparation)return;
  let left=seconds;
  while(left>1e-9 && !s.pauses.length && !s.result) {
    const previousTime=s.time;
    const boundaries=[250,300,600].filter(t=>t>s.time+1e-9).map(t=>t-s.time);
    const magicBoundaries=s.spells.filter(a=>a.remaining>1e-9).map(a=>a.remaining);
    const step=Math.min(left,.1,...boundaries,...magicBoundaries);left-=step;
    s.elapsed+=step;s.time=Math.min(600,s.time+step);
    for(const kind of Object.keys(s.cooldowns))s.cooldowns[kind]=Math.max(0,s.cooldowns[kind]-step);
    for(const structure of s.structures)if(structure.status==='collapsing') {
      structure.collapseRemaining-=step;if(structure.collapseRemaining<=1e-9){structure.status='ruined';structure.hp=0;nav.setState(s);emit(s,'StructureRuined',{targetId:structure.id});}
    }
    if(previousTime<300) {
      for(const p of s.plants) {
        const before=isMature(p);advancePlant(p,step,!!spellAt(s,'growth',p));
        if(!before&&isMature(p)){emit(s,'CropMatured',{targetId:p.id});if(s.tutorial.step==='observe')s.tutorial.step='harvest';}
        if(p.alive&&p.water.some(w=>w.status==='due')&&p.centerId&&s.structures.some(c=>c.id===p.centerId&&operational(c)))enqueue(s,p.centerId,p.water[0].status==='due'?'initial':'water',p.id);
      }
    }
    for(const spell of s.spells)spell.remaining=Math.max(0,spell.remaining-step);
    s.spells=s.spells.filter(a=>a.remaining>1e-9);
    if(s.time>=300 && !s.nightPlan){planNight(s);selectEvent(s);emit(s,'NightStarted');}
    if(s.dayPlan&&!s.dayPlan.done&&s.time>=s.dayPlan.at){s.dayPlan.done=true;if(!s.postgame)spawnRaid(s,s.dayPlan,nav,true);}
    if(s.nightPlan&&!s.nightPlan.done&&s.time>=s.nightPlan.at){s.nightPlan.done=true;if(s.nightPlan.group?.length)spawnRaid(s,s.nightPlan,nav);}
    updateRaid(s,step,nav);updateWorkers(s,step,nav);
    if(s.time>=600 && !s.raid && !s.result)closeNight(s);
  }
}
export function advanceReal(s,seconds,nav) {
  let left=seconds;
  while(left>1e-9 && !s.pauses.length&&!s.result) {
    const real=Math.min(left,.02);left-=real;
    tick(s,real*(s.time>=300&&!s.raid?5:1),nav);
  }
}
export function clockLabel(s) {
  const minutes=(425+Math.min(600,s.time)*2.4)%1440;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;
}
