import {copyNativeFarmArrivalRouteAttestation,copyNativeFarmArrivalRouteResources,sameNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteReference} from './native-farm-arrival-route.js';
import {copyNativeIdleStrollAttestation,copyNativeIdleStrollResources,sameNativeIdleStrollAttestation,sameNativeIdleStrollReference} from './native-idle-stroll.js';
import {copyNativeHomeRouteAttestation,copyNativeHomeRouteResources,sameNativeHomeRouteAttestation,sameNativeHomeRouteReference} from './native-home-route.js';
import {copyNativeAnimalCropAttestation,sameNativeAnimalCropReference} from './native-animal-crop-resource.js';
import {copyNativeRoutePresentation} from './native-route-presentation.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

// Recovery carries the acquired program independently of the original Draw.
// The terminal sample is also needed for the next strike's source validation.
function copyCropAttestation(value){
 const binding=copyNativeAnimalCropAttestation(value,26);
 if(binding.reference.purpose==='center'||value?.gateIds?.length!==0||!Array.isArray(value.gateIds)||
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
 if(binding.reference.purpose!==undefined||binding.assignmentSequence!==binding.reference.sourceControlSequence+1||
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
  kind:18,admission:'native-home',executionKind:'native-home-route-execution',maxGates:1,
  bindingField:'nativeHomeRouteBinding',clockField:'nativeHome',proofField:'homeProof',
  obsoleteCode:'native-home-admission-obsolete',
  copyResources:copyNativeHomeRouteResources,copyAttestation:copyNativeHomeRouteAttestation,
  sameAttestation:sameNativeHomeRouteAttestation,sameReference:sameNativeHomeRouteReference
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
  kind:23,admission:'native-farm-arrival',executionKind:'native-farm-arrival-route-execution',maxGates:1,
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

export function nativeRecoveryCovers(world,source){
 return !!world&&!!source&&world.authorityEpoch===source.authorityEpoch&&world.nativeSession===source.nativeSession&&
   (sameNativeWorldBoundary(world,source)||world.ticket>source.ticket&&world.effectiveTime>=source.effectiveTime);
}

// A pair is one recovery transaction with two independently acquired clocks.
export function copyNativeRecoveryMembers(value,world){
 if(value.version===undefined&&value.members===undefined)
   return [{kind:value.kind,proof:nativeWorkerRouteRecoveryProfile(value.kind).copyAttestation(value.proof)}];
 if(value.version!==2||!Array.isArray(value.members)||value.members.length!==2||
    value.members[0]?.kind!==18||value.members[1]?.kind!==26)throw Error('Invalid mixed recovery membership');
 const members=value.members.map(({kind,proof})=>({kind,proof:nativeWorkerRouteRecoveryProfile(kind).copyAttestation(proof)}));
 const [home,crop]=members.map(member=>member.proof.reference);
 if(!home.sourceRequest?.raidSpawnSequence||crop.purpose!==undefined||
    home.actorId===crop.actorId||home.bodyId===crop.bodyId||
    members[0].proof.assignmentSequence===members[1].proof.assignmentSequence||
    !members.every(({proof})=>nativeRecoveryCovers(world,proof.reference.worldBoundary))||
    members.filter(({proof})=>sameNativeWorldBoundary(world,proof.reference.worldBoundary)).length!==1)
   throw Error('Mixed recovery requires two current assignments at one world cut');
 return members;
}
