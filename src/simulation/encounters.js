import {BALANCE as B} from './balance.js';
import {LOCOMOTION as L} from './locomotion-calibration.js';
import {nextRandom} from './rules.js';
import {emit} from './game.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function sweptDistance(a,w,previousA=a,previousW=w){
  const x=previousW.x-previousA.x,z=previousW.z-previousA.z;
  const dx=w.x-a.x-x,dz=w.z-a.z-z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,-(x*dx+z*dz)/length)):0;
  return Math.hypot(x+t*dx,z+t*dz);
}
export function pushWorker(animal,worker,metres,nav){
  const angle=distance(animal,worker)>1e-9?Math.atan2(worker.x-animal.x,worker.z-animal.z):animal.heading??0;
  let best={x:worker.x,z:worker.z,distance:0};
  // Prefer away from the animal, then clear tangents. Sample the whole swept
  // capsule rather than accepting an endpoint on the other side of a wall.
  for(const offset of [0,Math.PI/8,-Math.PI/8,Math.PI/4,-Math.PI/4,3*Math.PI/8,-3*Math.PI/8,Math.PI/2,-Math.PI/2]){
    let reachable=0;
    for(let step=1;step<=Math.ceil(metres/.1);step++){
      const d=Math.min(metres,step*.1),x=worker.x+Math.sin(angle+offset)*d,z=worker.z+Math.cos(angle+offset)*d;
      if(!nav.walkable(x,z,.28,null,true))break;
      const previous={x:worker.x+Math.sin(angle+offset)*reachable,z:worker.z+Math.cos(angle+offset)*reachable};
      if(nav.workerMotionClear&&!nav.workerMotionClear(previous,{x,z},.28))break;
      reachable=d;
    }
    if(reachable>best.distance)best={x:worker.x+Math.sin(angle+offset)*reachable,z:worker.z+Math.cos(angle+offset)*reachable,distance:reachable};
    if(reachable>=metres-1e-9)break;
  }
  worker.x=best.x;worker.z=best.z;worker.path=null;
  return best.distance;
}
export function updateWorkerEncounters(state,nav){
  const raid=state.raid;if(!raid)return;
  const previous=raid.encounterPositions??{},contacts=new Set(raid.encounterContacts??raid.encounters??[]),hits=new Set(raid.encounterHits??[]),active=new Set();
  for(const animal of raid.animals){
    if(['gone','retreating'].includes(animal.status)||animal.hitsRemaining<=0)continue;
    for(const worker of state.workers){
      if(worker.status==='home'||worker.incapacitated)continue;
      const pair=`${animal.id}:${worker.id}`,range=animal.radius+1.1;
      const close=distance(animal,worker)<range;
      const collision=sweptDistance(animal,worker,previous[animal.id],previous[worker.id])<animal.radius+.28;
      if(close)active.add(pair);
      if((!close&&!collision)||contacts.has(pair)&&(!collision||hits.has(pair))||animal.hitsRemaining<=0)continue;
      // Behind/side passages don't consume the encounter roll. A later frontal
      // passage can still become a valid encounter without leaving the radius.
      const dx=worker.x-animal.x,dz=worker.z-animal.z,heading=animal.heading??0;
      const frontal=dx*Math.sin(heading)+dz*Math.cos(heading)>0;
      if(!collision&&!frontal){active.delete(pair);continue;}
      if(!collision&&nextRandom(state)>=B.raids.worker_pass_front_attack_probability)continue;
      animal.hitsRemaining--;worker.hits=(worker.hits??0)+1;worker.path=null;
      hits.add(pair);
      const presentation={elapsed:state.elapsed,x:worker.x,z:worker.z};
      let pushed=0;
      if(collision){
        const [min,max]=B.raids.worker_collision_knockback_m;
        pushed=pushWorker(animal,worker,min+nextRandom(state)*(max-min),nav);
      }
      if(worker.hits>=2){
        worker.incapacitated=true;worker.status='incapacitated';worker.fallRemaining=0;
        const person=state.people.find(p=>p.id===worker.personId);if(person)person.recoveryUntil=state.day+1;
        emit(state,'WorkerIncapacitated',{targetId:worker.id,animalId:animal.id,collision,pushed,presentation});
      }else{
        worker.fallRemaining=L.sources.find(s=>s.profile===worker.profile).fallSeconds;
        emit(state,'WorkerHit',{targetId:worker.id,animalId:animal.id,collision,pushed,presentation});
      }
      if(distance(animal,worker)>=range)active.delete(pair);
    }
  }
  raid.encounterContacts=[...active];raid.encounterHits=[...hits].filter(pair=>active.has(pair));raid.encounterPositions={};
  for(const entity of [...raid.animals,...state.workers])raid.encounterPositions[entity.id]={x:entity.x,z:entity.z};
}
