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
  if(gates.length>1024||gates.some(gate=>gate.status!=='intact'||gate.hp!==gate.maxHp||
     !nativeGateModelId(gate.material)||!validGateOpening(gate.gateOpen)))return null;
  return {gates};
}

export function checkpointGateOpenings(value){
  return value?.gates??(value?.gate?[value.gate]:[]);
}

export function validCheckpointGateOpening(gate){
  return !!gate&&typeof gate.id==='string'&&/^structure-[1-9]\d*$/.test(gate.id)&&
    id(actorNumber(gate.id))&&validGateOpening(gate.opening);
}

export function sameCheckpointGateOpenings(gates,checkpoint){
  const saved=checkpointGateOpenings(checkpoint);
  return gates.length===saved.length&&gates.every((gate,i)=>gate.id===saved[i].id&&gate.gateOpen===saved[i].opening);
}

export function refugeGateFields(gates){
  const rows=gates.map(gate=>({id:gate.id,opening:gate.gateOpen}));
  return rows.length>1?{version:2,gates:rows}:{version:1,...(rows.length?{gate:rows[0]}:{})};
}

export function copyRefugeReturnCheckpoint(value){
  const {version,actorId,animalId,spawnSequence,personId,contractDay,centerId,villageId,pose,gate,gates}=value??{};
  if(![1,2].includes(version)||![actorId,animalId,spawnSequence].every(id)||actorId===animalId||
     !Number.isSafeInteger(contractDay)||contractDay<0||
     ![personId,centerId,villageId].every(key=>typeof key==='string'&&key.length>0)||
     (version===1?gates!==undefined||gate!==undefined&&!validCheckpointGateOpening(gate):
       gate!==undefined||!Array.isArray(gates)||gates.length<2||gates.length>1024||
       !gates.every(validCheckpointGateOpening)||new Set(gates.map(row=>row.id)).size!==gates.length))
    throw TypeError('Invalid native refuge return checkpoint');
  const copyGate=({id,opening})=>Object.freeze({id,opening});
  return Object.freeze({version,actorId,animalId,spawnSequence,personId,contractDay,centerId,villageId,pose:copyPose(pose),
    ...(gates?{gates:Object.freeze(gates.map(copyGate))}:gate?{gate:copyGate(gate)}:{})});
}

export function validateRefugeReturnState(state,value){
  const saved=copyRefugeReturnCheckpoint(value),[worker]=state.workers,[animal]=state.raid?.animals??[];
  const spawn=state.events.findLast(event=>event.type==='RaidSpawned');
  const village=state.villages.find(item=>item.id===saved.villageId),home=village?.entry??village;
  const layout=state.biome==='sabana'?{gates:[]}:nativeDesertRefugeLayout(state);
  if(!layout||!sameCheckpointGateOpenings(layout.gates,saved)||
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

export function captureRefugeReturnCheckpoint(state,worker,spawnSequence,gates=[]){
  return validateRefugeReturnState(state,{...refugeGateFields(gates),actorId:actorNumber(worker.id),
    animalId:actorNumber(state.raid.animals[0].id),spawnSequence,personId:worker.personId,contractDay:worker.contractDay,
    centerId:worker.centerId,villageId:worker.villageId,pose:refugeWorkerPose(worker)});
}

export function copyRestoredRefugeReturn(value){
  const {version,authorityEpoch,nativeSession,retiredSequence,actorId,animalId,at,pose}=value??{};
  if(version!==1||typeof authorityEpoch!=='string'||!authorityEpoch||
     ![nativeSession,retiredSequence,actorId,animalId].every(id)||actorId===animalId||!Number.isFinite(at)||at<0)
    throw Error('Invalid restored native refuge return');
  return Object.freeze({version,authorityEpoch,nativeSession,retiredSequence,actorId,animalId,at,pose:copyPose(pose)});
}
