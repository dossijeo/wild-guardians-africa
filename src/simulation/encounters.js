import {BALANCE as B} from './balance.js';
import {LOCOMOTION as L} from './locomotion-calibration.js';
import {nextRandom} from './rules.js';
import {emit} from './game.js';
import {notifyWorkerPlanningChange} from './tasks.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function sweptDistance(a,w,previousA=a,previousW=w){
  const x=previousW.x-previousA.x,z=previousW.z-previousA.z;
  const dx=w.x-a.x-x,dz=w.z-a.z-z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,-(x*dx+z*dz)/length)):0;
  return Math.hypot(x+t*dx,z+t*dz);
}
function workerPush(animal,worker,metres,nav){
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
  return best;
}
export function pushWorker(animal,worker,metres,nav){
  const push=workerPush(animal,worker,metres,nav);
  worker.x=push.x;worker.z=push.z;worker.path=null;
  return push.distance;
}

export function classifyWorkerEncounter(animal,worker,previous,continuing,alreadyHit){
  const range=animal.radius+1.1,close=distance(animal,worker)<range;
  const collision=sweptDistance(animal,worker,previous[animal.id],previous[worker.id])<animal.radius+.28;
  if(!close&&!collision)return null;
  if(continuing&&(!collision||alreadyHit)||animal.hitsRemaining<=0)
    return {range,close,collision,eligible:false,behind:false};
  // A passage behind the animal can still become frontal without exiting the radius.
  const heading=animal.heading??0;
  const frontal=(worker.x-animal.x)*Math.sin(heading)+(worker.z-animal.z)*Math.cos(heading)>0;
  const behind=!collision&&!frontal;
  return {range,close,collision,eligible:!behind,behind};
}

// Compute the consequence of an eligible encounter before spending any of its
// state. The same terrain sweep is used for a preview and the Game update.
export function prepareWorkerEncounter(state,nav,animal,worker,collision){
  const random={rng:state.rng};
  if(!collision&&nextRandom(random)>=B.raids.worker_pass_front_attack_probability)return {rng:random.rng,hit:null};
  let push=null;
  if(collision&&!worker.fallRemaining&&!worker.recovery){
    const [min,max]=B.raids.worker_collision_knockback_m;
    push=workerPush(animal,worker,min+nextRandom(random)*(max-min),nav);
  }
  const hits=(worker.hits??0)+1,incapacitated=hits>=2;
  const fall=!incapacitated||!worker.fallRemaining&&!worker.recovery?
    L.sources.find(s=>s.profile===worker.profile).fallSeconds:null;
  return {rng:random.rng,hit:{hits,incapacitated,fall,push,
    presentation:{elapsed:state.elapsed,x:worker.x,z:worker.z}}};
}
export function updateWorkerEncounters(state,nav){
  const raid=state.raid;if(!raid)return;
  const previous=raid.encounterPositions??{},contacts=new Set(raid.encounterContacts??raid.encounters??[]),hits=new Set(raid.encounterHits??[]),active=new Set();
  for(const animal of raid.animals){
    if(animal.magicDown||(animal.magicStunUntil??0)>state.elapsed||['gone','retreating'].includes(animal.status)||animal.hitsRemaining<=0)continue;
    for(const worker of state.workers){
      if(worker.status==='home'||worker.incapacitated)continue;
      const pair=`${animal.id}:${worker.id}`;
      const contact=classifyWorkerEncounter(animal,worker,previous,contacts.has(pair),hits.has(pair));
      if(!contact)continue;
      if(contact.behind)active.delete(pair);
      else if(contact.close)active.add(pair);
      if(!contact.eligible)continue;
      const {collision}=contact,{rng,hit}=prepareWorkerEncounter(state,nav,animal,worker,collision);
      if(state.rng!==rng)state.rng=rng;
      if(!hit)continue;
      animal.hitsRemaining--;worker.hits=hit.hits;worker.path=null;
      hits.add(pair);
      if(hit.push){worker.x=hit.push.x;worker.z=hit.push.z;}
      if(hit.fall!==null){
        worker.fallRemaining=hit.fall;
        worker.downHeading=worker.heading??0;
      }
      const {presentation}=hit,pushed=hit.push?.distance??0;
      if(hit.incapacitated){
        worker.incapacitated=true;worker.status='incapacitated';
        notifyWorkerPlanningChange(state,worker);
        const person=state.people.find(p=>p.id===worker.personId);if(person)person.recoveryUntil=state.day+1;
        emit(state,'WorkerIncapacitated',{targetId:worker.id,animalId:animal.id,collision,pushed,presentation});
      }else{
        notifyWorkerPlanningChange(state,worker);
        emit(state,'WorkerHit',{targetId:worker.id,animalId:animal.id,collision,pushed,presentation});
      }
      if(distance(animal,worker)>=contact.range)active.delete(pair);
    }
  }
  raid.encounterContacts=[...active];raid.encounterHits=[...hits].filter(pair=>active.has(pair));raid.encounterPositions={};
  for(const entity of [...raid.animals,...state.workers])raid.encounterPositions[entity.id]={x:entity.x,z:entity.z};
}
