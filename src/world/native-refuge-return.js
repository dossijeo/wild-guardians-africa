import {nativeGateModelId,validGateOpening} from './gate-passages.js';

const poseFields=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
const id=value=>Number.isSafeInteger(value)&&value>0;
const actorNumber=value=>Number(String(value).split('-').at(-1));

function copyPose(pose){
  if(!pose||poseFields.some(key=>!Number.isFinite(pose[key]))||poseFields.slice(3).some(key=>pose[key]<0))
    throw TypeError('Invalid native refuge return pose');
  return Object.freeze(Object.fromEntries(poseFields.map(key=>[key,pose[key]])));
}

export function sameRefugePose(a,b){
  return !!a&&!!b&&poseFields.every(key=>a[key]===b[key]);
}

export function refugeWorkerPose(worker){
  return {x:worker.x,z:worker.z,yaw:worker.heading,runPhase:worker.runPhase,
    walkPhase:worker.walkPhase,carryPhase:worker.carryPhase,runRemaining:worker.runRemaining};
}

export function nativeDesertRefugeLayout(state){
  if(state.biome!=='desierto'||state.structures[0]?.kind!=='center'||state.spells.length||
     state.structures.slice(1).some(structure=>structure.kind!=='wall'))return null;
  const gates=state.structures.filter(structure=>structure.gate&&structure.status!=='ruined');
  const [gate]=gates;
  if(gates.length>1||gate&&(gate.status!=='intact'||gate.hp!==gate.maxHp||
     !nativeGateModelId(gate.material)||!validGateOpening(gate.gateOpen)))return null;
  return {gate};
}

export function copyRefugeReturnCheckpoint(value){
  const {version,actorId,animalId,spawnSequence,personId,contractDay,centerId,villageId,pose,gate}=value??{};
  if(version!==1||![actorId,animalId,spawnSequence].every(id)||actorId===animalId||
     !Number.isSafeInteger(contractDay)||contractDay<0||
     ![personId,centerId,villageId].every(key=>typeof key==='string'&&key.length>0)||
     gate!==undefined&&(!gate||typeof gate.id!=='string'||!/^structure-[1-9]\d*$/.test(gate.id)||!validGateOpening(gate.opening)))
    throw TypeError('Invalid native refuge return checkpoint');
  return Object.freeze({version,actorId,animalId,spawnSequence,personId,contractDay,centerId,villageId,pose:copyPose(pose),
    ...(gate?{gate:Object.freeze({id:gate.id,opening:gate.opening})}:{})});
}

export function validateRefugeReturnState(state,value){
  const saved=copyRefugeReturnCheckpoint(value),[worker]=state.workers,[animal]=state.raid?.animals??[];
  const spawn=state.events.findLast(event=>event.type==='RaidSpawned');
  const village=state.villages.find(item=>item.id===saved.villageId),home=village?.entry??village;
  const layout=state.biome==='sabana'?{}:nativeDesertRefugeLayout(state);
  if(!layout||layout.gate?.id!==saved.gate?.id||layout.gate?.gateOpen!==saved.gate?.opening||
     state.raid?.daytime!==true||state.raid.animals.length!==1||state.workers.length!==1||
     animal?.id!=='animal-'+saved.animalId||animal.species!=='warthog'||worker?.id!=='worker-'+saved.actorId||
     worker.status!=='home'||worker.running!==false||worker.gateWaiting!==false||worker.nativeRouteAdmission||
     worker.raidReturn||worker.hits!==0||worker.incapacitated||worker.taskId||worker.crateId||worker.path?.length||
     worker.personId!==saved.personId||worker.contractDay!==saved.contractDay||worker.centerId!==saved.centerId||
     worker.villageId!==saved.villageId||!home||worker.x!==home.x||worker.z!==home.z||
     !sameRefugePose(refugeWorkerPose(worker),saved.pose)||spawn?.id!=='event-'+saved.spawnSequence||
     spawn.raidFacts?.daytime!==true||spawn.raidFacts.id!==state.raid.id||spawn.raidFacts.day!==state.day||
     !Array.isArray(spawn.raidFacts.actors)||!spawn.raidFacts.actors.some(item=>item.id===animal.id&&item.species===animal.species)||
     spawn.simulationTime>state.elapsed||state.events.some(event=>event.type==='RaidEnded'&&event.simulationTime>=spawn.simulationTime))
    throw Error('Native refuge return differs from the saved worker, refuge, or raid');
  return saved;
}

export function captureRefugeReturnCheckpoint(state,worker,spawnSequence,gate=null){
  return validateRefugeReturnState(state,{version:1,actorId:actorNumber(worker.id),
    animalId:actorNumber(state.raid.animals[0].id),spawnSequence,personId:worker.personId,contractDay:worker.contractDay,
    centerId:worker.centerId,villageId:worker.villageId,pose:refugeWorkerPose(worker),
    ...(gate?{gate:{id:gate.id,opening:gate.gateOpen}}:{})});
}

export function copyRestoredRefugeReturn(value){
  const {version,authorityEpoch,nativeSession,retiredSequence,actorId,animalId,at,pose}=value??{};
  if(version!==1||typeof authorityEpoch!=='string'||!authorityEpoch||
     ![nativeSession,retiredSequence,actorId,animalId].every(id)||actorId===animalId||!Number.isFinite(at)||at<0)
    throw Error('Invalid restored native refuge return');
  return Object.freeze({version,authorityEpoch,nativeSession,retiredSequence,actorId,animalId,at,pose:copyPose(pose)});
}
