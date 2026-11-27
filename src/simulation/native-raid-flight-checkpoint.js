import {nativeCropRouteSubject} from './raids.js';
import {refugeWorkerPose,sameRefugePose} from '../world/native-refuge-return.js';
import {nativeGateModelId,validGateOpening} from '../world/gate-passages.js';

const poseFields=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
const positive=value=>Number.isSafeInteger(value)&&value>0;
const pointValue=value=>Number.isFinite(value)&&Math.abs(value)<2147483000;
const numberFromId=id=>Number(id?.split('-').at(-1));

export function nativeRaidFlightCheckpointLayout(state){
 const [center,...walls]=state.structures;
 if(center?.kind!=='center'||center.status!=='intact'||state.spells.length)return null;
 if(state.biome==='sabana'&&!walls.length)return {gate:null};
 if(state.biome!=='desierto'||walls.some(wall=>wall.kind!=='wall'))return null;
 const gates=walls.filter(wall=>wall.gate&&wall.status!=='ruined');
 const [gate]=gates;
 return gates.length===1&&gate.status==='intact'&&gate.hp===gate.maxHp&&nativeGateModelId(gate.material)?{gate}:null;
}

export function copyNativeRaidFlightCheckpoint(value){
 const {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose,animalPose,homePath,homePending,gate}=value??{};
 if(version!==1||!Number.isFinite(at)||at<0||![spawnSequence,actorId,animalId].every(positive)||actorId===animalId||
    ![personId,villageId,centerId].every(id=>typeof id==='string'&&id)||!Number.isSafeInteger(contractDay)||contractDay<0||
    !workerPose||!poseFields.every(key=>Number.isFinite(workerPose[key]))||poseFields.slice(3).some(key=>workerPose[key]<0)||
    !animalPose||![animalPose.x,animalPose.z,animalPose.yaw,animalPose.phase].every(Number.isFinite)||animalPose.phase<0||
    typeof animalPose.targetId!=='string'||!animalPose.targetId||typeof animalPose.reservation!=='string'||!animalPose.reservation||
    homePending!==undefined&&homePending!==true||
    gate!==undefined&&(!gate||typeof gate.id!=='string'||!/^structure-[1-9]\d*$/.test(gate.id)||
      !validGateOpening(gate.opening)||gate.reservedByHome!==undefined&&(gate.reservedByHome!==false||homePending)||
      !homePending&&gate.reservedByHome!==false&&gate.opening!==1)||
    (homePending?homePath!==undefined:!Array.isArray(homePath)||!homePath.length||homePath.length>4096||
      homePath.some(point=>!pointValue(point?.x)||!pointValue(point?.z)||point.x!==Math.fround(point.x)||point.z!==Math.fround(point.z))))
  throw Error('Invalid native raid flight checkpoint');
 const pose=Object.fromEntries(poseFields.map(key=>[key,workerPose[key]]));
 const animal={x:animalPose.x,z:animalPose.z,yaw:animalPose.yaw,phase:animalPose.phase,
  targetId:animalPose.targetId,reservation:animalPose.reservation};
 return {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose:pose,animalPose:animal,
  ...(homePending?{homePending}:{homePath:homePath.map(({x,z})=>({x,z}))}),
  ...(gate?{gate:{id:gate.id,opening:gate.opening,...(gate.reservedByHome===false?{reservedByHome:false}:{})}}:{})};
}

export function nativeRaidFlightCheckpointActors(state,marker){
 const value=copyNativeRaidFlightCheckpoint(marker),[worker]=state.workers,[animal]=state.raid?.animals??[];
 const spawn=state.events.findLast(event=>event.type==='RaidSpawned'),village=state.villages.find(item=>item.id===value.villageId),home=village?.entry??village;
 const endpoint=value.homePath?.at(-1),approachEnd=animal?.path?.at(-1);
 const admission=value.homePending?'pending-raid-flight-resources':'native-home';
 const layout=nativeRaidFlightCheckpointLayout(state);
 if(!layout||layout.gate?.id!==value.gate?.id||layout.gate?.gateOpen!==value.gate?.opening||
    state.elapsed!==value.at||state.raid?.daytime!==true||state.raid.animals.length!==1||
    state.workers.length!==1||animal?.species!=='warthog'||
    !['entering','walking'].includes(animal.status)||worker?.status!=='fleeing'||worker.hits!==0||
    worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||
    worker.taskId||worker.crateId||worker.path!==null||worker.gateWaiting!==false||
    ![undefined,admission].includes(worker.nativeRouteAdmission)||value.homePending&&worker.running!==false||
    worker.id!=='worker-'+value.actorId||
    animal.id!=='animal-'+value.animalId||worker.personId!==value.personId||worker.contractDay!==value.contractDay||
    worker.villageId!==value.villageId||worker.centerId!==value.centerId||!home||
    !value.homePending&&(endpoint.x!==Math.fround(home.x)||endpoint.z!==Math.fround(home.z))||
    !sameRefugePose(refugeWorkerPose(worker),value.workerPose)||
    animal.x!==value.animalPose.x||animal.z!==value.animalPose.z||animal.heading!==value.animalPose.yaw||
    animal.motionPhase!==value.animalPose.phase||animal.targetId!==value.animalPose.targetId||animal.reservation!==value.animalPose.reservation||
    !nativeCropRouteSubject(state,animal,worker)||!approachEnd||
    approachEnd.x!==Math.fround(animal.approach.x)||approachEnd.z!==Math.fround(animal.approach.z)||
    spawn?.id!=='event-'+value.spawnSequence||spawn.raidFacts?.daytime!==true||spawn.raidFacts.id!==state.raid.id||
    spawn.raidFacts.day!==state.day||spawn.simulationTime>value.at||
    !spawn.raidFacts.actors?.some(item=>item.id===animal.id&&item.species===animal.species)||
    state.events.some(event=>event.type==='RaidEnded'&&event.simulationTime>=spawn.simulationTime))
  throw Error('Native raid flight checkpoint differs from the saved cohort or destination');
 return {marker:value,worker,animal,home};
}

export function captureNativeRaidFlightCheckpoint(state,worker,animal,spawnSequence,homePath,gate=null,reservedByHome=true){
 const marker={version:1,at:state.elapsed,spawnSequence,actorId:numberFromId(worker.id),animalId:numberFromId(animal.id),
  personId:worker.personId,contractDay:worker.contractDay,villageId:worker.villageId,centerId:worker.centerId,
  workerPose:refugeWorkerPose(worker),animalPose:{x:animal.x,z:animal.z,yaw:animal.heading,phase:animal.motionPhase,
   targetId:animal.targetId,reservation:animal.reservation},...(homePath?{homePath}:{homePending:true}),
  ...(gate?{gate:{id:gate.id,opening:gate.gateOpen,...(reservedByHome?{}:{reservedByHome:false})}}:{})};
 return nativeRaidFlightCheckpointActors(state,marker).marker;
}
