import {nativeCropRouteSubject,savedRaidStrike} from './raids.js';
import {checkpointGateOpenings,nativeDesertRefugeLayout,refugeWorkerPose,sameCheckpointGateOpenings,sameRefugePose,validCheckpointGateOpening} from '../world/native-refuge-return.js';
import {validGateOpening} from '../world/gate-passages.js';

const poseFields=['x','z','yaw','runPhase','walkPhase','carryPhase','runRemaining'];
const positive=value=>Number.isSafeInteger(value)&&value>0;
const pointValue=value=>Number.isFinite(value)&&Math.abs(value)<2147483000;
const numberFromId=id=>Number(id?.split('-').at(-1));

function copyFarmStopCut(value,at,gate,gates){
 const {startTime,pose,motionFlags,motor,motors,endTime,waiting}=value??{};
 if(!Number.isFinite(startTime)||startTime<0||startTime>=at||
    !pose||!poseFields.every(key=>pointValue(pose[key]))||poseFields.slice(3).some(key=>pose[key]<0)||
    ![0,1].includes(motionFlags)||typeof waiting!=='boolean'||!Number.isFinite(endTime)||endTime<=at)
  throw Error('Invalid saved Farm stop program');
 const copyMotor=(row,owner)=>{
  if(!owner||!row||!validGateOpening(row.from)||row.from>=1||row.target!==1||!Number.isFinite(row.at)||row.at<startTime||
     !Number.isFinite(row.endsAt)||row.endsAt<=row.at||endTime<row.endsAt||
     (at<=row.at?owner.opening!==row.from:at>=row.endsAt?owner.opening!==row.target:false))
   throw Error('Invalid saved Farm stop program');
  return {from:row.from,target:row.target,at:row.at,endsAt:row.endsAt};
 };
 const program={startTime,pose:Object.fromEntries(poseFields.map(key=>[key,pose[key]])),motionFlags};
 if(!gates){
  if(!gate||gate.reservedByHome!==undefined||motors!==undefined)throw Error('Invalid saved Farm stop program');
  return {...program,motor:copyMotor(motor,gate),endTime,waiting};
 }
 if(motor!==undefined||!Array.isArray(motors)||!motors.length||motors.length>gates.length)
  throw Error('Invalid saved Farm stop program');
 const remaining=new Map(gates.map(row=>[numberFromId(row.id),row]));
 const claims=[];
 for(const row of motors){
  const id=row?.gateId;
  claims.push({gateId:id,...copyMotor(row,remaining.get(id))});
  remaining.delete(id);
 }
 return {...program,motors:claims,endTime,waiting};
}

export function farmStopCutFromNative(row){
 const [startTime,x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining,motionFlags]=row;
 const [endTime,waiting]=row.subarray(row.length-2),motors=[];
 if(row.length<16||(row.length-11)%5||![0,1].includes(waiting))throw Error('Invalid native Farm stop row');
 for(let i=9;i<row.length-2;i+=5){
  const [gateId,from,target,at,endsAt]=row.subarray(i,i+5);
  if(!positive(gateId))throw Error('Invalid native Farm stop row');
  motors.push({gateId,from,target,at,endsAt});
 }
 return {startTime,pose:{x,z,yaw,runPhase,walkPhase,carryPhase,runRemaining},motionFlags,motors,endTime,waiting:waiting===1};
}

export function nativeRaidFlightCheckpointLayout(state){
 const center=state.structures.find(structure=>structure.id===state.workers[0]?.centerId);
 if(center?.kind!=='center'||center.status!=='intact'||state.spells.length)return null;
 if(state.biome==='sabana'&&state.structures.length===1)return {gates:[]};
 return nativeDesertRefugeLayout(state);
}

export function copyNativeRaidFlightCheckpoint(value){
 const {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose,animalPose,homePath,homePending,farmStop,gate,gates,strike}=value??{};
 const reserved=homePath!==undefined;
 if(![1,2].includes(version)||!Number.isFinite(at)||at<0||![spawnSequence,actorId,animalId].every(positive)||actorId===animalId||
    ![personId,villageId,centerId].every(id=>typeof id==='string'&&id)||!Number.isSafeInteger(contractDay)||contractDay<0||
    !workerPose||!poseFields.every(key=>Number.isFinite(workerPose[key]))||poseFields.slice(3).some(key=>workerPose[key]<0)||
    !animalPose||![animalPose.x,animalPose.z,animalPose.yaw,animalPose.phase].every(Number.isFinite)||animalPose.phase<0||
    typeof animalPose.targetId!=='string'||!animalPose.targetId||typeof animalPose.reservation!=='string'||!animalPose.reservation||
    strike!==undefined&&(!reserved||!strike||!positive(strike.attackId)||![0,1,2,3].includes(strike.clip)||
      !Number.isFinite(strike.duration)||strike.duration<=0||strike.duration>120||
      !Number.isFinite(strike.remaining)||strike.remaining<=0||strike.remaining>strike.duration)||
    homePending!==undefined&&(homePending!==true||farmStop!==undefined)||
    (version===1?gates!==undefined||gate!==undefined&&(!validCheckpointGateOpening(gate)||
      gate.reservedByHome!==undefined&&(gate.reservedByHome!==false||!reserved)||reserved&&gate.reservedByHome!==false&&gate.opening!==1):
      gate!==undefined||!Array.isArray(gates)||gates.length<2||gates.length>1024||
      !gates.every(row=>validCheckpointGateOpening(row)&&typeof row.reservedByHome==='boolean'&&
        (!row.reservedByHome||reserved&&row.opening===1))||new Set(gates.map(row=>row.id)).size!==gates.length)||
    (homePending||farmStop!==undefined?homePath!==undefined:!Array.isArray(homePath)||!homePath.length||homePath.length>4096||
      homePath.some(point=>!pointValue(point?.x)||!pointValue(point?.z)||point.x!==Math.fround(point.x)||point.z!==Math.fround(point.z))))
  throw Error('Invalid native raid flight checkpoint');
 const pose=Object.fromEntries(poseFields.map(key=>[key,workerPose[key]]));
 const animal={x:animalPose.x,z:animalPose.z,yaw:animalPose.yaw,phase:animalPose.phase,
  targetId:animalPose.targetId,reservation:animalPose.reservation};
 return {version,at,spawnSequence,actorId,animalId,personId,contractDay,villageId,centerId,workerPose:pose,animalPose:animal,
  ...(strike?{strike:{attackId:strike.attackId,clip:strike.clip,duration:strike.duration,remaining:strike.remaining}}:{}),
  ...(farmStop!==undefined?{farmStop:copyFarmStopCut(farmStop,at,gate,gates)}:homePending?{homePending}:{homePath:homePath.map(({x,z})=>({x,z}))}),
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
 const subject=animal&&nativeCropRouteSubject(state,animal,worker);
 const strike=value.strike,action=strike&&animal&&savedRaidStrike(animal);
 if(!layout||!sameCheckpointGateOpenings(layout.gates,value)||
    state.elapsed!==value.at||state.raid?.daytime!==true||state.raid.animals.length!==1||
    state.workers.length!==1||animal?.species!=='warthog'||
    (strike?state.biome!=='desierto'||subject?.purpose!=='center'||!action||
      !Object.keys(strike).every(key=>strike[key]===action[key])||strike.attackId>=state.sequence||
      state.events.some(event=>event.attackId===animal.attackId&&['AnimalLogicalHit','AnimalLogicalMiss'].includes(event.type))||
      animal.x!==Math.fround(animal.approach.x)||animal.z!==Math.fround(animal.approach.z):
      !['entering','walking'].includes(animal.status))||value.farmStop&&(state.biome!=='desierto'||animal.status!=='entering'||subject?.purpose!=='center')||
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
    !subject||!strike&&(!approachEnd||approachEnd.x!==Math.fround(animal.approach.x)||approachEnd.z!==Math.fround(animal.approach.z))||
    spawn?.id!=='event-'+value.spawnSequence||spawn.raidFacts?.daytime!==true||spawn.raidFacts.id!==state.raid.id||
    spawn.raidFacts.day!==state.day||spawn.simulationTime>value.at||
    !spawn.raidFacts.actors?.some(item=>item.id===animal.id&&item.species===animal.species)||
    state.events.some(event=>event.type==='RaidEnded'&&event.simulationTime>=spawn.simulationTime))
  throw Error('Native raid flight checkpoint differs from the saved cohort or destination');
 return {marker:value,worker,animal,home};
}

export function captureNativeRaidFlightCheckpoint(state,worker,animal,spawnSequence,homePath,gates=[],homeGateIds=[],farmStop=null,strike=null){
 const [gate]=gates,multiple=gates.length>1;
 if(farmStop&&!multiple){
  const {motors,...program}=farmStop;
  farmStop={...program,motor:motors[0]};
 }
 const marker={version:multiple?2:1,at:state.elapsed,spawnSequence,actorId:numberFromId(worker.id),animalId:numberFromId(animal.id),
  personId:worker.personId,contractDay:worker.contractDay,villageId:worker.villageId,centerId:worker.centerId,
  workerPose:refugeWorkerPose(worker),animalPose:{x:animal.x,z:animal.z,yaw:animal.heading,phase:animal.motionPhase,
   targetId:animal.targetId,reservation:animal.reservation},...(farmStop?{farmStop}:homePath?{homePath}:{homePending:true}),
  ...(strike?{strike}:{}),
  ...(multiple?{gates:gates.map(({id,gateOpen})=>({id,opening:gateOpen,reservedByHome:homeGateIds.includes(numberFromId(id))}))}:
    gate?{gate:{id:gate.id,opening:gate.gateOpen,...(homePath&&!homeGateIds.length?{reservedByHome:false}:{})}}:{})};
 return nativeRaidFlightCheckpointActors(state,marker).marker;
}
