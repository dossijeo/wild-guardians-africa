import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {RECOVERY_EXIT_SECONDS} from './worker-recovery.js';
import {copyNativeHomeRouteAttestation} from '../world/native-home-route.js';

function validateApproachCheckpoint(state,marker){
 const {workerId,animalId,hit,spawn,approachPath}=marker;
 const worker=state.workers[0],raid=state.raid,animal=raid?.animals[0];
 const first=state.events.find(event=>event.id==='event-'+hit);
 const birth=state.events.find(event=>event.id==='event-'+spawn);
 const impact=first?.nativeHomeImpact;
 const target=state.structures[0],claim='center:'+target?.id+':'+animal?.id;
 if(state.biome!=='desierto'||state.workers.length!==1||worker?.id!=='worker-'+workerId||
    worker.status!=='fleeing'||worker.hits!==1||worker.incapacitated||!(worker.fallRemaining>0)||
    !Number.isFinite(worker.fallRemaining)||worker.recovery||worker.recoveryExitRemaining||worker.nativeRouteAdmission||
    worker.taskId||worker.crateId||worker.raidReturn||worker.path!==null||
    !['x','z','downHeading','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>Number.isFinite(worker[k]))||
    !raid?.daytime||raid.animals.length!==1||animal?.id!=='animal-'+animalId||animal.species!=='warthog'||
    !['walking','entering'].includes(animal.status)||animal.hitsRemaining!==1||animal.hitApplied!==false||
    animal.attackRemaining!==0||animal.attackId||animal.approachShieldId||animal.magicDown||animal.magicStunUntil>state.elapsed||
    !['x','z','motionPhase','heading'].every(k=>Number.isFinite(animal[k]))||
    target?.kind!=='center'||target.status!=='intact'||animal.targetId!==target.id||animal.reservation!==claim||
    raid.reservations[claim]!==animal.id||!animal.approach||
    approachPath.at(-1).x!==Math.fround(animal.approach.x)||approachPath.at(-1).z!==Math.fround(animal.approach.z)||
    state.structures.some(structure=>structure.gate&&structure.status!=='ruined')||
    birth?.type!=='RaidSpawned'||!Number.isFinite(birth.simulationTime)||birth.raidFacts?.id!==raid.id||
    birth.raidFacts.actors?.length!==1||birth.raidFacts.actors[0].id!==animal.id||
    birth.raidFacts.actors[0].species!==animal.species||birth.raidFacts.actors[0].hitsRemaining!==2||
    first?.type!=='WorkerHit'||first.targetId!==worker.id||first.animalId!==animal.id||
    !Number.isFinite(first.simulationTime)||first.simulationTime<birth.simulationTime||first.simulationTime>state.elapsed||
    impact?.version!==1||impact.event!==hit||impact.at!==first.simulationTime||
    impact.x!==worker.x||impact.z!==worker.z||impact.heading!==worker.downHeading||
    state.events.some(event=>event.type==='WorkerIncapacitated'&&event.targetId===worker.id&&event.simulationTime>=first.simulationTime))
   throw Error('Invalid saved encounter after the first impact');
 const home=copyNativeHomeRouteAttestation(impact.home);
 if(home.reference.actorId!==workerId||home.reference.sourceRequest?.raidSpawnSequence!==spawn||
    home.reference.worldBoundary.effectiveTime>impact.at||home.reference.endTime<impact.at||home.gateIds.length)
   throw Error('First impact lacks its historical Home source');
 const exit=animal.exit??animal.spawn;
 if(!Number.isFinite(exit?.x)||!Number.isFinite(exit?.z))throw Error('Invalid saved encounter exit');
 return {marker,worker,animal,exit,target};
}

export function copyNativeEncounterCheckpoint(value){
 const {version,workerId,animalId,hit,home,spawn,approachPath}=value??{};
 if(![1,2,3].includes(version)||![workerId,animalId,hit].every(id=>Number.isSafeInteger(id)&&id>0)||
    workerId===animalId||Object.keys(value).length!==3+version)
  throw Error('Invalid native encounter checkpoint');
 if(version===1)return Object.freeze({version,workerId,animalId,hit});
 if(version===3){
  if(!Number.isSafeInteger(spawn)||spawn<=0||hit!==spawn+1||!validPath(approachPath))
   throw Error('Invalid saved encounter origin or approach corridor');
  return Object.freeze({version,workerId,animalId,hit,spawn,approachPath:freezePath(approachPath)});
 }
 const {villageId,x,z,exitRemaining,path}=home??{};
 if(!home||Object.keys(home).length!==5||!Number.isSafeInteger(villageId)||villageId<=0||
    !coord(x)||!coord(z)||!Number.isFinite(exitRemaining)||exitRemaining<0||exitRemaining>RECOVERY_EXIT_SECONDS||
    !validPath(path)||
    path.at(-1).x!==Math.fround(x)||path.at(-1).z!==Math.fround(z))
  throw Error('Invalid saved encounter Home path or exit phase');
 return Object.freeze({version,workerId,animalId,hit,home:Object.freeze({villageId,x,z,exitRemaining,
  path:freezePath(path)})});
}

const coord=n=>Number.isFinite(n)&&Math.abs(n)<2147483000;
const validPath=path=>Array.isArray(path)&&path.length>=1&&path.length<=4096&&
 path.every(p=>p&&Object.keys(p).length===2&&coord(p.x)&&coord(p.z)&&p.x===Math.fround(p.x)&&p.z===Math.fround(p.z));
const freezePath=path=>Object.freeze(path.map(({x,z})=>Object.freeze({x,z})));

export function nativeEncounterCheckpointActors(state,value){
 const marker=copyNativeEncounterCheckpoint(value);
 if(marker.version===3)return validateApproachCheckpoint(state,marker);
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
