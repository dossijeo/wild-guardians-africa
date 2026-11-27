import {nativeCropRouteSubject} from './raids.js';
import {checkpointGateOpenings,nativeDesertRefugeLayout,refugeWorkerPose,sameCheckpointGateOpenings,sameRefugePose,validCheckpointGateOpening} from '../world/native-refuge-return.js';
import {validGateOpening} from '../world/gate-passages.js';

const poseFields=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
const positive=value=>Number.isSafeInteger(value)&&value>0;
const pointValue=value=>Number.isFinite(value)&&Math.abs(value)<2147483000;
const numberFromId=id=>Number(id?.split('-').at(-1));

function copyFarmStopCut(value,at,gate){
 const {startTime,pose,motionFlags,motor,endTime,waiting}=value??{};
 if(!gate||gate.reservedByHome!==undefined||!Number.isFinite(startTime)||startTime<0||startTime>=at||
    !pose||!poseFields.every(key=>pointValue(pose[key]))||poseFields.slice(3).some(key=>pose[key]<0)||
    ![0,1].includes(motionFlags)||typeof waiting!=='boolean'||!motor||!validGateOpening(motor.from)||motor.from>=1||
    motor.target!==1||!Number.isFinite(motor.at)||motor.at<startTime||
    !Number.isFinite(motor.endsAt)||motor.endsAt<=motor.at||!Number.isFinite(endTime)||endTime<motor.endsAt||endTime<=at||
    (at<=motor.at?gate.opening!==motor.from:at>=motor.endsAt?gate.opening!==motor.target:false))
  throw Error('Invalid saved Farm stop program');
 return {startTime,pose:Object.fromEntries(poseFields.map(key=>[key,pose[key]])),motionFlags,
  motor:{from:motor.from,target:motor.target,at:motor.at,endsAt:motor.endsAt},endTime,waiting};
}

export function farmStopCutFromNative(row){
 const [startTime,x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining,motionFlags,gateId,from,target,at,endsAt,endTime,waiting]=row;
 if(!positive(gateId)||![0,1].includes(waiting))throw Error('Invalid native Farm stop row');
 return {gateId,cut:{startTime,pose:{x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining},motionFlags,
  motor:{from,target,at,endsAt},endTime,waiting:waiting===1}};
}

export function nativeRaidFlightCheckpointLayout(state){
 const [center,...walls]=state.structures;
 if(center?.kind!=='center'||center.status!=='intact'||state.spells.length)return null;
 if(state.biome==='sabana'&&!walls.length)return {gates:[]};
 const layout=nativeDesertRefugeLayout(state);
 return layout?.gates.length?layout:null;
}

export function copyNativeRaidFlightCheckpoint(value){
 const {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose,animalPose,homePath,homePending,farmStop,gate,gates}=value??{};
 const reserved=homePath!==undefined;
 if(![1,2].includes(version)||!Number.isFinite(at)||at<0||![spawnSequence,actorId,animalId].every(positive)||actorId===animalId||
    ![personId,villageId,centerId].every(id=>typeof id==='string'&&id)||!Number.isSafeInteger(contractDay)||contractDay<0||
    !workerPose||!poseFields.every(key=>Number.isFinite(workerPose[key]))||poseFields.slice(3).some(key=>workerPose[key]<0)||
    !animalPose||![animalPose.x,animalPose.z,animalPose.yaw,animalPose.phase].every(Number.isFinite)||animalPose.phase<0||
    typeof animalPose.targetId!=='string'||!animalPose.targetId||typeof animalPose.reservation!=='string'||!animalPose.reservation||
    homePending!==undefined&&(homePending!==true||farmStop!==undefined)||
    (version===1?gates!==undefined||gate!==undefined&&(!validCheckpointGateOpening(gate)||
      gate.reservedByHome!==undefined&&(gate.reservedByHome!==false||!reserved)||reserved&&gate.reservedByHome!==false&&gate.opening!==1):
      gate!==undefined||farmStop!==undefined||!Array.isArray(gates)||gates.length<2||gates.length>1024||
      !gates.every(row=>validCheckpointGateOpening(row)&&typeof row.reservedByHome==='boolean'&&
        (!row.reservedByHome||reserved&&row.opening===1))||new Set(gates.map(row=>row.id)).size!==gates.length)||
    (homePending||farmStop!==undefined?homePath!==undefined:!Array.isArray(homePath)||!homePath.length||homePath.length>4096||
      homePath.some(point=>!pointValue(point?.x)||!pointValue(point?.z)||point.x!==Math.fround(point.x)||point.z!==Math.fround(point.z))))
  throw Error('Invalid native raid flight checkpoint');
 const pose=Object.fromEntries(poseFields.map(key=>[key,workerPose[key]]));
 const animal={x:animalPose.x,z:animalPose.z,yaw:animalPose.yaw,phase:animalPose.phase,
  targetId:animalPose.targetId,reservation:animalPose.reservation};
 return {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose:pose,animalPose:animal,
  ...(farmStop!==undefined?{farmStop:copyFarmStopCut(farmStop,at,gate)}:homePending?{homePending}:{homePath:homePath.map(({x,z})=>({x,z}))}),
  ...(gates?{gates:gates.map(({id,opening,reservedByHome})=>({id,opening,reservedByHome}))}:
    gate?{gate:{id:gate.id,opening:gate.opening,...(gate.reservedByHome===false?{reservedByHome:false}:{})}}:{})};
}

export function savedRaidFlightHomeGateIds(marker){
 return checkpointGateOpenings(marker).filter(gate=>gate.reservedByHome!==false).map(gate=>numberFromId(gate.id));
}

export function nativeRaidFlightCheckpointActors(state,marker){
 const value=copyNativeRaidFlightCheckpoint(marker),[worker]=state.workers,[animal]=state.raid?.animals??[];
 const spawn=state.events.findLast(event=>event.type==='RaidSpawned'),village=state.villages.find(item=>item.id===value.villageId),home=village?.entry??village;
 const endpoint=value.homePath?.at(-1),approachEnd=animal?.path?.at(-1);
 const admission=value.farmStop?'pending-farm-flight-stop':value.homePending?'pending-raid-flight-resources':'native-home';
 const layout=nativeRaidFlightCheckpointLayout(state);
 if(!layout||!sameCheckpointGateOpenings(layout.gates,value)||
    state.elapsed!==value.at||state.raid?.daytime!==true||state.raid.animals.length!==1||
    state.workers.length!==1||animal?.species!=='warthog'||
    !['entering','walking'].includes(animal.status)||value.farmStop&&(state.biome!=='desierto'||animal.status!=='entering'||animal.targetId!==value.centerId)||
    worker?.status!=='fleeing'||worker.hits!==0||
    worker.incapacitated||worker.recovery||worker.recoveryExitRemaining||worker.fallRemaining||worker.raidReturn||
    worker.taskId||worker.crateId||worker.path!==null||worker.gateWaiting!==(value.farmStop?.waiting??false)||
    ![undefined,admission].includes(worker.nativeRouteAdmission)||value.homePending&&worker.running!==false||
    worker.id!=='worker-'+value.actorId||
    animal.id!=='animal-'+value.animalId||worker.personId!==value.personId||worker.contractDay!==value.contractDay||
    worker.villageId!==value.villageId||worker.centerId!==value.centerId||!home||
    !value.homePending&&!value.farmStop&&(endpoint.x!==Math.fround(home.x)||endpoint.z!==Math.fround(home.z))||
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

export function captureNativeRaidFlightCheckpoint(state,worker,animal,spawnSequence,homePath,gates=[],homeGateIds=[],farmStop=null){
 const [gate]=gates,multiple=gates.length>1;
 const marker={version:multiple?2:1,at:state.elapsed,spawnSequence,actorId:numberFromId(worker.id),animalId:numberFromId(animal.id),
  personId:worker.personId,contractDay:worker.contractDay,villageId:worker.villageId,centerId:worker.centerId,
  workerPose:refugeWorkerPose(worker),animalPose:{x:animal.x,z:animal.z,yaw:animal.heading,phase:animal.motionPhase,
   targetId:animal.targetId,reservation:animal.reservation},...(farmStop?{farmStop}:homePath?{homePath}:{homePending:true}),
  ...(multiple?{gates:gates.map(({id,gateOpen})=>({id,opening:gateOpen,reservedByHome:homeGateIds.includes(numberFromId(id))}))}:
    gate?{gate:{id:gate.id,opening:gate.gateOpen,...(homePath&&!homeGateIds.length?{reservedByHome:false}:{})}}:{})};
 return nativeRaidFlightCheckpointActors(state,marker).marker;
}
