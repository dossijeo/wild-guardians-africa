import {nativeEntityNumericId} from '../world/native-entity-id.js';

export function copyNativeEncounterCheckpoint(value){
 const {version,workerId,animalId,hit}=value??{};
 if(version!==1||![workerId,animalId,hit].every(id=>Number.isSafeInteger(id)&&id>0)||
    workerId===animalId||Object.keys(value).length!==4)
  throw Error('Invalid native encounter checkpoint');
 return Object.freeze({version,workerId,animalId,hit});
}

export function nativeEncounterCheckpointActors(state,value){
 const marker=copyNativeEncounterCheckpoint(value);
 const {workerId,animalId,hit}=marker;
 const worker=state.workers[0],animal=state.raid?.animals[0];
 const fact=state.events.find(event=>event.id==='event-'+hit);
 const retreat=state.events.find(event=>event.id==='event-'+(hit+1));
 if(state.biome!=='desierto'||state.workers.length!==1||nativeEntityNumericId(worker.id)!==workerId||
    worker.hits!==2||!worker.incapacitated||worker.status!=='incapacitated'||worker.recoveryExitRemaining||
    worker.taskId||worker.crateId||worker.nativeRouteAdmission||!(worker.fallRemaining>0||worker.recovery)||
    ![worker.x,worker.z,worker.downHeading].every(Number.isFinite)||
    fact?.type!=='WorkerIncapacitated'||fact.targetId!==worker.id||fact.animalId!=='animal-'+animalId||
    !Number.isFinite(fact.simulationTime)||fact.simulationTime>state.elapsed||
    fact.presentation?.x!==worker.x||fact.presentation?.z!==worker.z||
    retreat?.type!=='AnimalRetreating'||retreat.targetId!==fact.animalId||retreat.reason!=='budget-exhausted'||
    retreat.simulationTime!==fact.simulationTime||
    state.raid&&(!state.raid.daytime||state.raid.animals.length!==1||animal?.id!==fact.animalId||
      animal.species!=='warthog'||animal.status!=='retreating'||animal.hitsRemaining!==0||
      animal.attackRemaining>0||animal.targetId||animal.reservation||animal.magicDown||animal.magicStunUntil>state.elapsed||
      ![animal.x,animal.z,animal.motionPhase,animal.heading].every(Number.isFinite))||
    !state.raid&&!state.events.some(event=>event.type==='RaidEnded'&&event.simulationTime>=fact.simulationTime&&event.simulationTime<=state.elapsed))
  throw Error('Native encounter checkpoint differs from the completed hit');
 const exit=animal&&(animal.exit??animal.spawn);
 if(animal&&![exit?.x,exit?.z].every(Number.isFinite))throw Error('Invalid saved encounter exit');
 return {marker,worker,animal,exit};
}
