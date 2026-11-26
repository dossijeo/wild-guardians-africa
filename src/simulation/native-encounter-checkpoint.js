import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {RECOVERY_EXIT_SECONDS} from './worker-recovery.js';

export function copyNativeEncounterCheckpoint(value){
 const {version,workerId,animalId,hit,home}=value??{};
 if(![1,2].includes(version)||![workerId,animalId,hit].every(id=>Number.isSafeInteger(id)&&id>0)||
    workerId===animalId||Object.keys(value).length!==(version===1?4:5))
  throw Error('Invalid native encounter checkpoint');
 if(version===1)return Object.freeze({version,workerId,animalId,hit});
 const {villageId,x,z,exitRemaining,path}=home??{};
 const coord=n=>Number.isFinite(n)&&Math.abs(n)<2147483000;
 if(!home||Object.keys(home).length!==5||!Number.isSafeInteger(villageId)||villageId<=0||
    !coord(x)||!coord(z)||!Number.isFinite(exitRemaining)||exitRemaining<0||exitRemaining>RECOVERY_EXIT_SECONDS||
    !Array.isArray(path)||path.length<1||path.length>4096||
    path.some(p=>!p||Object.keys(p).length!==2||!coord(p.x)||!coord(p.z)||p.x!==Math.fround(p.x)||p.z!==Math.fround(p.z))||
    path.at(-1).x!==Math.fround(x)||path.at(-1).z!==Math.fround(z))
  throw Error('Invalid saved encounter Home path or exit phase');
 return Object.freeze({version,workerId,animalId,hit,home:Object.freeze({villageId,x,z,exitRemaining,
  path:Object.freeze(path.map(({x,z})=>Object.freeze({x,z})))})});
}

export function nativeEncounterCheckpointActors(state,value){
 const marker=copyNativeEncounterCheckpoint(value);
 const {workerId,animalId,hit,home}=marker;
 const worker=state.workers[0],animal=state.raid?.animals[0];
 const fact=state.events.find(event=>event.id==='event-'+hit);
 const retreat=state.events.find(event=>event.id==='event-'+(hit+1));
 if(state.biome!=='desierto'||state.workers.length!==1||nativeEntityNumericId(worker.id)!==workerId||
    worker.hits!==2||!worker.incapacitated||worker.status!=='incapacitated'||
    worker.taskId||worker.crateId||worker.nativeRouteAdmission||
    ![worker.x,worker.z].every(Number.isFinite)||
    fact?.type!=='WorkerIncapacitated'||fact.targetId!==worker.id||fact.animalId!=='animal-'+animalId||
    !Number.isFinite(fact.simulationTime)||fact.simulationTime>state.elapsed||
    retreat?.type!=='AnimalRetreating'||retreat.targetId!==fact.animalId||retreat.reason!=='budget-exhausted'||
    retreat.simulationTime!==fact.simulationTime||
    state.raid&&(!state.raid.daytime||state.raid.animals.length!==1||animal?.id!==fact.animalId||
      animal.species!=='warthog'||animal.status!=='retreating'||animal.hitsRemaining!==0||
      animal.attackRemaining>0||animal.targetId||animal.reservation||animal.magicDown||animal.magicStunUntil>state.elapsed||
      ![animal.x,animal.z,animal.motionPhase,animal.heading].every(Number.isFinite))||
    !state.raid&&!state.events.some(event=>event.type==='RaidEnded'&&event.simulationTime>=fact.simulationTime&&event.simulationTime<=state.elapsed))
  throw Error('Native encounter checkpoint differs from the completed hit');
 if(home){
  const village=state.villages.find(v=>v.id===worker.villageId),entry=village?.entry??village;
  if(state.raid||!village||nativeEntityNumericId(village.id)!==home.villageId||entry.x!==home.x||entry.z!==home.z||
     worker.recovery||worker.fallRemaining||worker.recoveryExitRemaining!==home.exitRemaining||
     worker.path!==null||worker.gateWaiting!==false||worker.raidReturn||
     !['heading','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>Number.isFinite(worker[key])))
   throw Error('Invalid saved encounter Home worker or refuge');
 }else if(worker.recoveryExitRemaining||!(worker.fallRemaining>0||worker.recovery)||!Number.isFinite(worker.downHeading)||
    fact.presentation?.x!==worker.x||fact.presentation?.z!==worker.z)
  throw Error('Native encounter checkpoint differs from the completed hit');
 const exit=animal&&(animal.exit??animal.spawn);
 if(animal&&![exit?.x,exit?.z].every(Number.isFinite))throw Error('Invalid saved encounter exit');
 return {marker,worker,animal,exit,home};
}
