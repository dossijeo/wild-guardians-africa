import {copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteReference} from './native-farm-arrival-route.js';
import {copyNativeIdleStrollAttestation,copyNativeIdleStrollResources,sameNativeIdleStrollAttestation,sameNativeIdleStrollReference} from './native-idle-stroll.js';
import {copyNativeIdleCycleAttestation,copyNativeIdleCycleResources,sameNativeIdleCycleAttestation,sameNativeIdleCycleReference} from './native-idle-cycle.js';
import {copyNativeHomeRouteAttestation,copyNativeHomeRouteResources,sameNativeHomeRouteAttestation,sameNativeHomeRouteReference} from './native-home-route.js';
import {copyNativeHomeArrivalAttestation} from './native-home-arrival.js';
import {copyNativeAnimalCropAttestation,sameNativeAnimalCropReference} from './native-animal-crop-resource.js';
import {copyNativeRoutePresentation} from './native-route-presentation.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {centerSource,verifiesCenter} from './native-center-ruin-source.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';
import {RECOVERY_EXIT_SECONDS,WORKER_RECOVERY,woundedHomeSourceCurrent} from '../simulation/worker-recovery.js';
import {copyNativeHomeRequestReference,sameNativeHomeRequestReference} from './native-home-request-reference.js';

export function woundedHomeEndpoint(binding,at){
 const {reference,gateIds}=binding??{},request=reference?.sourceRequest;
 return !!request?.recoveryHit&&!request.raidSpawnSequence&&gateIds?.length===0&&at>=reference.endTime;
}

export function centerRuinApproachEndpoint(ruin,world,binding,at){
 const source=ruin?.prepared,approach=source?.approach,ref=binding?.reference;
 return !!approach&&ref?.kind===26&&Number.isFinite(at)&&at>=ref.endTime&&
   at>=world?.effectiveTime&&verifiesCenter(source,world,ruin)&&
   approach.assignmentSequence===binding.assignmentSequence&&
   sameNativeAnimalCropReference(approach.reference,ref)&&
   sameNativeAnimalCropReference(approach.preparedReference,binding.preparedReference);
}

export function matchesNativeWoundedRefuge(world,refuge){
 const arrival=refuge?.reference;
 return !!world&&!!arrival&&sameNativeWorldBoundary(world,arrival.worldBoundary)&&
   woundedHomeEndpoint(arrival.sourceHome,world.effectiveTime);
}

export function matchesNativeOrdinaryRefuge(world,refuge){
 const arrival=refuge?.reference,home=arrival?.sourceHome;
 return sameNativeWorldBoundary(world,arrival?.worldBoundary)&&!!home&&home.gateIds.length===0&&
   !home.reference.sourceRequest?.raidSpawnSequence&&!home.reference.sourceRequest?.recoveryHit;
}

export function matchesNativeStationaryRefuge(world,refuge){
 return matchesNativeWoundedRefuge(world,refuge)||matchesNativeOrdinaryRefuge(world,refuge);
}

export function woundedHomeExecutionAtEndpoint(state,worker,execution){
 if(execution?.arrived!==true||execution.executedThrough!==state.elapsed||
    !woundedHomeEndpoint(execution.binding,state.elapsed))return false;
 const {reference}=execution.binding;
 return worker?.id==='worker-'+reference.actorId&&worker.nativeRouteAdmission==='native-home'&&
   execution.actorId===reference.actorId&&execution.bodyId===reference.bodyId&&
   woundedHomeSourceCurrent(state,worker,reference.sourceRequest,state.elapsed-reference.worldBoundary.effectiveTime)&&
   !worker.taskId&&!worker.crateId&&!worker.raidReturn&&worker.path===null&&
   worker.running===false&&worker.gateWaiting===false&&worker.heading===execution.yaw&&
   ['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(key=>worker[key]===execution[key]);
}

// Recovery carries the acquired program independently of the original Draw.
// The terminal sample is also needed for the next strike's source validation.
function copyCropAttestation(value){
 const binding=copyNativeAnimalCropAttestation(value,26);
 if(value?.gateIds?.length!==0||!Array.isArray(value.gateIds)||
    !['x','z','phase'].every(key=>Number.isFinite(value.terminal?.[key]))||
    value.terminal.phase<binding.reference.phase)throw TypeError('Invalid recovered crop source');
 const {x,z,phase}=value.terminal;
 const r=binding.reference;
 if(r.purpose==='retreat'&&(x!==Math.fround(r.targetX)||z!==Math.fround(r.targetZ)))
   throw TypeError('Recovered Retreat has another exit');
 return Object.freeze({...binding,gateIds:Object.freeze([]),terminal:Object.freeze({x,z,phase})});
}
function sameCropAttestation(a,b){
 return !!a&&!!b&&a.assignmentSequence===b.assignmentSequence&&a.gateIds?.length===0&&b.gateIds?.length===0&&
   !!a.terminal&&!!b.terminal&&['x','z','phase'].every(key=>a.terminal[key]===b.terminal[key])&&
   sameNativeAnimalCropReference(a.reference,b.reference)&&sameNativeAnimalCropReference(a.preparedReference,b.preparedReference);
}
function copyCropResources(value,cut=null){
 const worldBoundary=copyNativeWorldBoundary(value?.worldBoundary);
 const binding=copyCropAttestation(value?.nativeAnimalCropRouteBinding),r=binding.reference;
 const presentation=copyNativeRoutePresentation(value.presentation),nativeRoute=presentation.nativeRoute;
 const h=nativeRoute.routeHandle,p=value.nativeRoute,k=p?.routeHandle;
 if(value.version!==1||value.kind!==26||value.phase!=='committed'||!sameNativeWorldBoundary(worldBoundary,r.worldBoundary)||
    !sameNativeWorldBoundary(presentation.worldBoundary,cut??worldBoundary)||
    nativeRoute.assignmentSequence!==binding.assignmentSequence||nativeRoute.actorId!==r.actorId||
    h.session!==worldBoundary.nativeSession||h.authorityEpoch!==worldBoundary.authorityEpoch||h.slot!==r.slot||h.generation!==r.generation||
    p?.actorId!==nativeRoute.actorId||p.assignmentSequence!==nativeRoute.assignmentSequence||
    !['session','authorityEpoch','slot','generation'].every(name=>k?.[name]===h[name])||
    presentation.motionMode!=='animal'||presentation.gates.length||presentation.radius!==r.radius||
    presentation.startTime!==worldBoundary.effectiveTime||presentation.endTime!==r.endTime||
    presentation.rows[1]!==r.x||presentation.rows[2]!==r.z||presentation.rows[4]!==r.phase||
    presentation.rows.at(-15)!==binding.terminal.x||presentation.rows.at(-14)!==binding.terminal.z||
    presentation.rows.at(-12)!==binding.terminal.phase||presentation.rows.at(-9)!==1)
   throw TypeError('Recovered crop program differs from the acquired route');
 return Object.freeze({version:1,kind:26,phase:'committed',worldBoundary,nativeRoute,presentation,nativeAnimalCropRouteBinding:binding});
}
function copyStrikeAttestation(value){
 const binding=copyNativeAnimalCropAttestation(value,27);
 if(binding.assignmentSequence!==binding.reference.sourceControlSequence+1||
    !Array.isArray(value.gateIds)||value.gateIds.length)throw TypeError('Invalid recovered crop strike');
 return Object.freeze({...binding,gateIds:Object.freeze([])});
}
function sameStrikeAttestation(a,b){
 return !!a&&!!b&&a.attackId===b.attackId&&a.assignmentSequence===b.assignmentSequence&&
   a.gateIds?.length===0&&b.gateIds?.length===0&&sameNativeAnimalCropReference(a.reference,b.reference)&&
   sameNativeAnimalCropReference(a.preparedReference,b.preparedReference);
}
function copyStrikeResources(value){
 const binding=copyStrikeAttestation(value?.nativeAnimalCropStrikeBinding);
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary);
 if(value.version!==1||value.kind!==27||value.phase!=='committed'||value.nativeRoute!==undefined||
    value.presentation!==undefined||!sameNativeWorldBoundary(worldBoundary,binding.reference.worldBoundary))
   throw TypeError('Recovered strike is not the acquired stationary action');
 return Object.freeze({version:1,kind:27,phase:'committed',worldBoundary,nativeAnimalCropStrikeBinding:binding});
}

const profiles=new Map([
 [18,Object.freeze({
  kind:18,admission:'native-home',executionKind:'native-home-route-execution',maxGates:1024,
  bindingField:'nativeHomeRouteBinding',clockField:'nativeHome',proofField:'homeProof',
  obsoleteCode:'native-home-admission-obsolete',
  copyResources:copyNativeHomeRouteResources,copyAttestation:copyNativeHomeRouteAttestation,
  sameAttestation:sameNativeHomeRouteAttestation,sameReference:sameNativeHomeRouteReference
 })],
 [21,Object.freeze({
  kind:21,admission:'native-idle',executionKind:'native-idle-cycle-execution',maxGates:0,
  bindingField:'nativeIdleCycleBinding',clockField:'nativeIdleCycle',
  obsoleteCode:'native-idle-cycle-admission-obsolete',
  copyResources:copyNativeIdleCycleResources,copyAttestation:copyNativeIdleCycleAttestation,
  sameAttestation:sameNativeIdleCycleAttestation,sameReference:sameNativeIdleCycleReference
 })],
 [22,Object.freeze({
  kind:22,admission:'native-idle-stroll',executionKind:'native-idle-stroll-execution',maxGates:0,
  bindingField:'nativeIdleStrollBinding',clockField:'nativeStroll',issuedField:'issuedStroll',
  proofField:'strollProof',admittedField:'strollAdmitted',
  obsoleteCode:'native-idle-stroll-admission-obsolete',
  copyResources:copyNativeIdleStrollResources,copyAttestation:copyNativeIdleStrollAttestation,
  sameAttestation:sameNativeIdleStrollAttestation,sameReference:sameNativeIdleStrollReference
 })],
 [23,Object.freeze({
  kind:23,admission:'native-farm-arrival',executionKind:'native-farm-arrival-route-execution',maxGates:1024,
  bindingField:'nativeFarmArrivalBinding',clockField:'nativeFarmArrival',issuedField:'issuedFarmArrival',
  proofField:'farmArrivalProof',admittedField:'farmArrivalAdmitted',
  obsoleteCode:'native-farm-arrival-admission-obsolete',
  copyResources:copyNativeFarmArrivalRouteResources,copyAttestation:copyNativeFarmArrivalRouteAttestation,
  sameAttestation:sameNativeFarmArrivalRouteAttestation,sameReference:sameNativeFarmArrivalRouteReference
 })],
 [26,Object.freeze({
  kind:26,executionKind:'native-animal-crop-route-execution',maxGates:0,
  bindingField:'nativeAnimalCropRouteBinding',clockField:'nativeAnimalCrop',
  obsoleteCode:'native-crop-recovery-obsolete',
  copyResources:copyCropResources,copyAttestation:copyCropAttestation,
  sameAttestation:sameCropAttestation,sameReference:sameNativeAnimalCropReference
 })],
 [27,Object.freeze({
  kind:27,executionKind:'native-animal-crop-strike-execution',maxGates:0,
  bindingField:'nativeAnimalCropStrikeBinding',clockField:'nativeAnimalCrop',
  obsoleteCode:'native-crop-recovery-obsolete',
  copyResources:copyStrikeResources,copyAttestation:copyStrikeAttestation,
  sameAttestation:sameStrikeAttestation,sameReference:sameNativeAnimalCropReference
 })]
]);

export function nativeWorkerRouteRecoveryProfile(kind){
 const profile=profiles.get(kind);
 if(!profile)throw TypeError('Unsupported worker route recovery kind');
 return profile;
}

export function recoveredNativeGateSamples(row){
 if(row.nativeGates!==undefined)return row.nativeGates;
 return row.nativeGate===undefined?[]:[{nativeGate:row.nativeGate,gateElapsed:row.gateElapsed}];
}

export const nativeRecoverySequence=proof=>proof.cycleSequence??proof.assignmentSequence;
export const nativeRecoveryGates=proof=>proof.gateIds??[];
export function nativeOrdinaryRecoveryKinds(kinds,withRefuge=false){
 const [first,second]=kinds;
 if(withRefuge)return kinds.length===1&&[18,21,22].includes(first);
 return kinds.length===1&&first===21||kinds.length===2&&
   (first===21&&second===21||first===18&&[21,22].includes(second));
}

export function copyNativeIdleCycleRecoveryPhase(value){
 const {version,actorId,bodyId,cycleSequence,phaseDelay}=value??{};
 const worldBoundary=copyNativeWorldBoundary(value?.worldBoundary);
 if(version!==1||![actorId,bodyId,cycleSequence].every(n=>Number.isSafeInteger(n)&&n>0)||!worldBoundary||
    !Number.isFinite(phaseDelay)||phaseDelay<0||phaseDelay>worldBoundary.effectiveTime)
   throw TypeError('Invalid retired Idle cycle phase');
 return Object.freeze({version,actorId,bodyId,cycleSequence,worldBoundary,phaseDelay});
}

export function nativeIdleCycleRecoveryPhaseMatches(phase,proof){
 const ref=proof?.reference;
 return !!phase&&!!ref&&phase.actorId===ref.actorId&&phase.bodyId===ref.bodyId&&phase.cycleSequence===proof.cycleSequence&&
   sameNativeWorldBoundary(phase.worldBoundary,ref.worldBoundary);
}

export function nativeRecoveryCovers(world,source){
 return !!world&&!!source&&world.authorityEpoch===source.authorityEpoch&&world.nativeSession===source.nativeSession&&
   (sameNativeWorldBoundary(world,source)||world.ticket>source.ticket&&world.effectiveTime>=source.effectiveTime);
}

export function matchesNativeOrdinaryRefugeContinuation(world,refuge,proof){
 const home=refuge?.reference,worker=proof?.reference;
 if(!home||!worker||!matchesNativeOrdinaryRefuge(home.worldBoundary,refuge)||
    !nativeRecoveryCovers(world,home.worldBoundary)||!nativeRecoveryCovers(world,worker.worldBoundary)||
    home.actorId===worker.actorId||home.bodyId===worker.bodyId)return false;
 const sequence=nativeRecoverySequence(proof);
 return sameNativeWorldBoundary(world,home.worldBoundary)&&sequence<refuge.retiredSequence||
   sameNativeWorldBoundary(world,worker.worldBoundary)&&sequence>refuge.retiredSequence;
}

export function matchesNativeRefugeRecovery(world,{reference:home,retiredSequence},{reference:animal,assignmentSequence}){
 if(!home.sourceHome.reference.sourceRequest?.raidSpawnSequence||animal.actorId===home.actorId||animal.bodyId===home.bodyId)return false;
 if(sameNativeWorldBoundary(world,animal.worldBoundary)){
   return nativeRecoveryCovers(world,home.worldBoundary)&&world.ticket>home.worldBoundary.ticket&&
     !animal.restore&&assignmentSequence>retiredSequence;
 }
 // Home19 may itself be the last world operation, retaining the approach
 // that was acquired before the worker reached the refuge.
 return animal.kind===26&&animal.purpose!=='retreat'&&sameNativeWorldBoundary(world,home.worldBoundary)&&
   nativeRecoveryCovers(world,animal.worldBoundary)&&assignmentSequence<retiredSequence;
}

export function copyRecoveredEncounterFall(value){
 const {version,workerId,workerBody,hit,x,z,heading,remaining,spawn,impactAt,workerAssignment}=value??{};
 const positiveId=id=>Number.isSafeInteger(id)&&id>0;
 if(![1,2].includes(version)||![workerId,workerBody,hit].every(positiveId)||
    ![x,z,heading,remaining].every(Number.isFinite)||remaining<=0)throw Error('Invalid recovered encounter Fall');
 if(version===2&&(!positiveId(spawn)||hit<=spawn||!Number.isFinite(impactAt)||impactAt<0||
    workerAssignment!==undefined&&!positiveId(workerAssignment)))throw Error('Invalid first-impact recovery source');
 const source=version===2?{spawn,impactAt,...(workerAssignment===undefined?{}:{workerAssignment})}:{};
 return Object.freeze({version,workerId,workerBody,hit,x,z,heading,remaining,...source});
}

export function sameRecoveredEncounter(a,b){
 if(a?.version===3||b?.version===3)return a?.version===3&&b?.version===3&&
  ['workerId','workerBody','animalId','profile','hit','impactAt','raidEnded','endedAt','at','x','z','heading','remaining','phase']
   .every(key=>a[key]===b[key])&&(a.home===undefined?b.home===undefined:sameNativeHomeRequestReference(a.home,b.home))&&
   (a.getUp===null?b.getUp===null:!!a.getUp&&!!b.getUp&&
    ['duration','elapsed','heading','dx','dz','fraction','travelLimit'].every(key=>a.getUp[key]===b.getUp[key]));
 return !!a&&!!b&&['version','workerId','workerBody','hit','x','z','heading','remaining','spawn','impactAt','workerAssignment']
  .every(key=>a[key]===b[key]);
}

export function copyRecoveredEncounterPose(value){
 const {version,workerId,workerBody,animalId,profile,hit,impactAt,raidEnded,endedAt,at,x,z,heading,remaining,getUp}=value??{};
 const duration=LOCOMOTION.sources.find(source=>source.profile===profile)?.fallSeconds;
 if(version!==3||![workerId,workerBody,animalId,hit,raidEnded].every(id=>Number.isSafeInteger(id)&&id>0)||
    animalId===workerId||raidEnded<=hit+1||![impactAt,endedAt,at,x,z,heading,remaining,duration].every(Number.isFinite)||
    impactAt<0||endedAt<impactAt||at<endedAt||remaining<0||remaining>duration)
  throw Error('Invalid stationary encounter source');
 const home=value.home===undefined?null:copyNativeHomeRequestReference(value.home);
 let recovery=null;
 if(home){
  if(remaining!==0||getUp!==null||home.version!==3||home.recoveryHit!==hit||home.bodyId!==workerBody||
     home.actorId!==workerId||home.requestedAt<endedAt||home.requestedAt>at||(home.recoveryExit??RECOVERY_EXIT_SECONDS)!==RECOVERY_EXIT_SECONDS||
     home.pose.x!==x||home.pose.z!==z||home.pose.yaw!==heading)throw Error('Invalid pending wounded Home source');
 }else if(remaining===0){
  const {duration,elapsed,heading:yaw,dx,dz,fraction,travelLimit}=getUp??{};
  if(duration!==WORKER_RECOVERY[profile]?.duration||![duration,elapsed,yaw,dx,dz,fraction].every(Number.isFinite)||
     elapsed<0||elapsed>=duration||yaw!==heading||fraction<0||fraction>1||
     travelLimit!==undefined&&(!Number.isFinite(travelLimit)||travelLimit<0||travelLimit>1))
   throw Error('Invalid stationary GetUp source');
  recovery=Object.freeze({duration,elapsed,heading:yaw,dx,dz,fraction,...(travelLimit===undefined?{}:{travelLimit})});
 }else if(getUp!==null)throw Error('Recovered Fall overlaps GetUp');
 const phase=home?0:Math.fround(recovery?.elapsed??duration-remaining);
 if(value.phase!==undefined&&value.phase!==phase)throw Error('Invalid stationary encounter phase');
 return Object.freeze({version,workerId,workerBody,animalId,profile,hit,impactAt,raidEnded,endedAt,at,x,z,heading,remaining,getUp:recovery,phase,...(home?{home}:{})});
}

// The current world can include an exact later mutation that retained the
// moving actor's acquisition. Each surviving clock keeps its origin.
export function copyNativeRecoveryGroup(value,world,{awaitingIdleCyclePhase=false}={}){
 const ordinaryWorkers=value.version===2&&Array.isArray(value.members)&&value.ruin===undefined&&
   value.encounter===undefined&&nativeOrdinaryRecoveryKinds(value.members.map(member=>member?.kind),value.refuge!==undefined);
 if(value.idleCyclePhases!==undefined&&!ordinaryWorkers)throw Error('Idle cycle phases require their recovered cycles');
 if(value.version===undefined&&value.members===undefined&&value.refuge===undefined&&value.ruin===undefined&&value.encounter===undefined)
   return {members:[{kind:value.kind,proof:nativeWorkerRouteRecoveryProfile(value.kind).copyAttestation(value.proof)}]};
 if(value.version!==2||!Array.isArray(value.members))throw Error('Invalid recovery membership');
 if(value.encounter!==undefined){
   if(value.encounter?.version===3){
     const encounter=copyRecoveredEncounterPose(value.encounter);
     if(value.refuge!==undefined||value.ruin!==undefined||value.members.length||
        !world||world.effectiveTime>encounter.at||encounter.home&&(encounter.home.authorityEpoch!==world.authorityEpoch||
          encounter.home.nativeSession!==world.nativeSession))throw Error('Stationary encounter recovery cannot supply a moving route');
     return {members:[],encounter};
   }
   if(value.refuge!==undefined||value.ruin!==undefined||value.members.length!==1||value.members[0]?.kind!==26)
     throw Error('Encounter recovery requires its route and Fall');
   const proof=copyCropAttestation(value.members[0].proof),encounter=copyRecoveredEncounterFall(value.encounter),ref=proof.reference;
   if(ref.purpose!==(encounter.version===2?'center':'retreat')||ref.actorId===encounter.workerId||ref.bodyId===encounter.workerBody||
      encounter.version===2&&encounter.workerAssignment!==undefined&&
        (encounter.impactAt<ref.worldBoundary.effectiveTime||encounter.workerAssignment>=proof.assignmentSequence)||
      !sameNativeWorldBoundary(ref.worldBoundary,world))
     throw Error('Encounter Fall belongs to another acquisition');
   return {members:[{kind:26,proof}],encounter};
 }
 if(value.ruin!==undefined){
   const [member]=value.members,prepared=centerSource(value.ruin?.prepared),kind=prepared.strike?27:26;
   if(value.refuge!==undefined||value.members.length!==1||member?.kind!==kind)
     throw Error('Center ruin recovery requires its surviving animal program');
   const proof=kind===27?copyStrikeAttestation(member.proof):copyCropAttestation(member.proof);
   const retained=prepared.retreat??prepared.approach??prepared.strike;
   if(!verifiesCenter(prepared,world,value.ruin)||retained.assignmentSequence!==proof.assignmentSequence||retained.attackId!==proof.attackId||
      !sameNativeAnimalCropReference(retained.reference,proof.reference)||
      !sameNativeAnimalCropReference(retained.preparedReference,proof.preparedReference))
     throw Error('Recovered animal route differs from the acquired center ruin');
   const ruin=Object.freeze({prepared,acquired:copyNativeWorldBoundary(world),center:prepared.center,
     polygon:prepared.polygon,status:'ruined',revisions:Object.freeze([...value.ruin.revisions])});
   return {members:[{kind,proof}],ruin};
 }
 if(value.refuge!==undefined&&!ordinaryWorkers){
   const refuge=copyNativeHomeArrivalAttestation(value.refuge);
   if(value.members.length===0&&matchesNativeStationaryRefuge(world,refuge))return {members:[],refuge};
   const member=value.members[0],kind=member?.kind;
   if(value.members.length!==1||(kind!==26&&kind!==27))throw Error('Refuge recovery requires the surviving animal');
   const proof=nativeWorkerRouteRecoveryProfile(kind).copyAttestation(member.proof);
   if(!matchesNativeRefugeRecovery(world,refuge,proof))
     throw Error('Crop recovery differs from the acquired refuge cut');
   return {members:[{kind,proof}],refuge};
 }
 if(!ordinaryWorkers&&(value.members.length!==2||value.members[0]?.kind!==18||value.members[1]?.kind!==26))
   throw Error('Invalid mixed recovery membership');
 const members=value.members.map(({kind,proof})=>({kind,proof:nativeWorkerRouteRecoveryProfile(kind).copyAttestation(proof)}));
 const refuge=value.refuge===undefined?null:copyNativeHomeArrivalAttestation(value.refuge);
 if(refuge&&!matchesNativeOrdinaryRefugeContinuation(world,refuge,members[0].proof))
   throw Error('Civil recovery differs from the acquired refuge cut');
 let idleCyclePhases=[];
 if(ordinaryWorkers){
   const inherited=members.filter(({kind,proof})=>kind===21&&proof.reference.sourceCycleSequence!==0);
   if(value.idleCyclePhases!==undefined){
     if(!Array.isArray(value.idleCyclePhases)||value.idleCyclePhases.length!==inherited.length)
       throw Error('Each inherited Idle cycle requires its retired phase');
     idleCyclePhases=Object.freeze(value.idleCyclePhases.map(copyNativeIdleCycleRecoveryPhase));
     for(const [i,member] of inherited.entries()){
       const phase=idleCyclePhases[i];
       if(!nativeIdleCycleRecoveryPhaseMatches(phase,member.proof))throw Error('Retired phase differs from its recovered Idle cycle');
       member.idleCyclePhase=phase;
     }
   }else if(inherited.length&&!awaitingIdleCyclePhase)throw Error('Each inherited Idle cycle requires its retired phase');
   if(!refuge&&members.length===1&&!sameNativeWorldBoundary(world,members[0].proof.reference.worldBoundary))
     throw Error('Single Idle recovery needs its acquired world cut');
 }
 const refs=members.map(member=>member.proof.reference);
 if((ordinaryWorkers?members.some(({kind,proof})=>nativeRecoveryGates(proof).length||kind===18&&
    (proof.reference.sourceRequest?.raidSpawnSequence||proof.reference.sourceRequest?.recoveryHit)):
    !refs[0].sourceRequest?.raidSpawnSequence||refs[1].purpose==='retreat')||
    new Set(refs.map(ref=>ref.actorId)).size!==members.length||new Set(refs.map(ref=>ref.bodyId)).size!==members.length||
    new Set(members.map(({proof})=>nativeRecoverySequence(proof))).size!==members.length||
    !members.every(({proof})=>nativeRecoveryCovers(world,proof.reference.worldBoundary))||
    !refuge&&members.filter(({proof})=>sameNativeWorldBoundary(world,proof.reference.worldBoundary)).length!==1)
   throw Error('Mixed recovery requires two current assignments at one world cut');
 return ordinaryWorkers?{members,ordinaryWorkers:true,...(refuge?{refuge}:{}),...(idleCyclePhases.length?{idleCyclePhases}:{})}:{members};
}
