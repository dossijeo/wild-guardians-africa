// Read-only observations after ordinary simulation ticks. Times bracket changes
// between samples; they are not exact timestamps of intermediate substeps.
import {cropSpec} from '../src/simulation/rules.js';

export function createCropLifecycleObserver(species=['algodon','platano']){
 const selected=new Set(species),records=new Map(),pending=new Set();
 let samples=0,previous=null;
 const at=s=>({day:s.day,time:s.time,elapsed:s.elapsed});
 const observation=p=>({growth:p.growth,water:p.water.map(w=>({...w})),attackHits:p.attackHits??0});
 const append=(row,s,type,detail={})=>row.timeline.push({type,after:previous,before:at(s),...detail});
 function observe(s){
  const crates=new Map(s.crates.filter(c=>selected.has(c.species)).map(c=>[c.sourcePlantId,c]));
  const tasks=new Map();
  for(const task of s.tasks)if(!tasks.has(task.targetId))tasks.set(task.targetId,task);
  const workers=new Map(s.workers.map(w=>[w.id,w]));
  for(const plant of s.plants){
   if(!selected.has(plant.species))continue;
   let row=records.get(plant.id);
   if(!row){
    row={id:plant.id,species:plant.species,x:plant.x,z:plant.z,firstObserved:at(s),timeline:[],outcome:'living'};
    records.set(plant.id,row);append(row,s,'first-observed',observation(plant));
   }
   if(row.outcome!=='living')continue;
   const water=plant.water.map(w=>w.status).join(','),spec=cropSpec(plant.species);
   const dry=plant.water.some(w=>w.status==='due'&&w.wait>=spec.derived_tolerance_seconds*(1+(plant.toleranceBonus??0)));
   const mature=plant.growth>=spec.growth_seconds;
   const task=tasks.get(plant.id),worker=task?workers.get(task.workerId):null;
   const work=task?{id:task.id,kind:task.kind,workerId:task.workerId,blocked:task.blocked,workerStatus:worker?.status??null}:null;
   const workKey=JSON.stringify(work);
   if(row.water!==undefined&&row.water!==water)append(row,s,'watering-change',observation(plant));
   if(row.dry!==undefined&&row.dry!==dry)append(row,s,dry?'growth-frozen-by-water':'water-freeze-ended',observation(plant));
   if((plant.attackHits??0)>(row.attackHits??0))append(row,s,'attack-hit',{hits:plant.attackHits});
   if(mature&&!row.mature)append(row,s,'mature',observation(plant));
   if(row.workKey!==workKey)append(row,s,'task-change',{task:work});
   row.water=water;row.dry=dry;row.mature=mature;row.workKey=workKey;row.attackHits=plant.attackHits??0;
   if(plant.alive)row.lastAlive={...at(s),...observation(plant)};
   else {
    const crate=crates.get(plant.id);row.outcome=crate?'picked':'destroyed';
    append(row,s,row.outcome,{lastAlive:row.lastAlive??null,...observation(plant),crateId:crate?.id??null});
    if(crate){row.crateId=crate.id;pending.add(plant.id);}
   }
  }
  for(const id of pending){
   const crate=crates.get(id);if(!crate?.delivered)continue;
   const row=records.get(id),entry=s.ledger.entries['deliver:'+crate.id];
   if(!entry)throw Error('Delivered crate has no settled income');
   append(row,s,'delivered',{crateId:crate.id,income:entry.n});row.outcome='delivered';row.income=entry.n;pending.delete(id);
  }
  samples++;previous=at(s);
 }
 function report(){
  const crops=[...records.values()].map(({water,dry,mature,workKey,attackHits,...row})=>row);
  return structuredClone({samples,lastObserved:previous,species:[...selected],crops,scope:'Read-only post-tick samples. Transition intervals bracket observations; intermediate actions may occur within a tick. A picked crop is not income until its physical crate is delivered. No simulation commands, price, growth, task or damage overrides.'});
 }
 return {observe,report};
}
