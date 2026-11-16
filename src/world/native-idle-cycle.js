import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeInitialIdleBodyAttestation} from './native-initial-idle-body.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const nextRng=rng=>{let value=rng;value^=value<<13;value^=value>>>17;value^=value<<5;return value>>>0;};
const fields=['kind','version','actorId','bodyId','profile','sourceBody','sourceCycleSequence','sourceControlSequence','worldBoundary','anchor','durations','initialState','watchStartOffset','watchRng','duration'];
// Immutable finite rest/watch program. Its next stochastic semantic request is
// a separate native fact; neither this reference nor its draft grants movement.
export function copyNativeIdleCycleReference(value){
 if(value?.kind!=='native-idle-cycle-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k)))throw TypeError('Invalid native Idle cycle reference');
 const sourceBody=copyNativeInitialIdleBodyAttestation(value.sourceBody),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),initialState=copyNativeInitialIdleState(value.initialState),q=sourceBody.reference.sourceRequest,a=value.anchor,d=value.durations,calibration=LOCOMOTION.sources.find(s=>s.profile===q.workerProfile);
 if(!initialState||value.actorId!==q.actorId||value.bodyId!==q.bodyId||value.profile!==q.profile||!Number.isSafeInteger(value.sourceCycleSequence)||value.sourceCycleSequence<0||value.sourceCycleSequence!==0&&value.sourceCycleSequence<=sourceBody.bodySequence||!id(value.sourceControlSequence)||value.sourceControlSequence<Math.max(sourceBody.bodySequence,value.sourceCycleSequence)||worldBoundary.authorityEpoch!==q.authorityEpoch||worldBoundary.nativeSession!==q.nativeSession||worldBoundary.effectiveTime<sourceBody.reference.worldBoundary.effectiveTime||
  !a||Object.keys(a).some(k=>!['id','x','z','radius'].includes(k))||a.id!==q.idleState.anchorId||a.id!==initialState.anchorId||!['x','z','radius'].every(k=>Number.isFinite(a[k])&&Number.isFinite(Math.fround(a[k])))||a.radius<=0||a.radius>8||Math.hypot(q.pose.x-a.x,q.pose.z-a.z)>a.radius||
  !d||Object.keys(d).some(k=>!['rest','watch'].includes(k))||d.rest!==calibration.idleSeconds||d.watch!==calibration.alertSeconds||
  !Number.isSafeInteger(value.watchRng)||value.watchRng<0||value.watchRng>0xffffffff||value.watchRng!==(initialState.mode==='rest'?nextRng(initialState.rng):initialState.rng)||!['watchStartOffset','duration'].every(k=>Number.isFinite(value[k])&&Number.isFinite(Math.fround(value[k]))&&value[k]>=0)||value.watchStartOffset!==(initialState.mode==='rest'?initialState.remaining:0)||value.duration!==value.watchStartOffset+(initialState.mode==='rest'?d.watch*(1+Math.floor(value.watchRng/4294967296*2)):initialState.remaining)||!value.sourceCycleSequence&&JSON.stringify(initialState)!==JSON.stringify(q.idleState)||value.sourceCycleSequence&&(initialState.mode!=='rest'||initialState.elapsed!==0))throw TypeError('Native Idle cycle differs from its source or original calibration');
 return Object.freeze({kind:value.kind,version:1,actorId:value.actorId,bodyId:value.bodyId,profile:value.profile,sourceBody,sourceCycleSequence:value.sourceCycleSequence,sourceControlSequence:value.sourceControlSequence,worldBoundary,anchor:Object.freeze({id:a.id,x:a.x,z:a.z,radius:a.radius}),durations:Object.freeze({rest:d.rest,watch:d.watch}),initialState,watchStartOffset:value.watchStartOffset,watchRng:value.watchRng,duration:value.duration});
}
export function sameNativeIdleCycleReference(a,b){try{return JSON.stringify(copyNativeIdleCycleReference(a))===JSON.stringify(copyNativeIdleCycleReference(b));}catch{return false;}}
export function nativeIdleCycleSuccessor(previous,next){
 const a=copyNativeIdleCycleReference(previous),b=copyNativeIdleCycleReference(next),program=({worldBoundary,sourceControlSequence,...value})=>value;
 return JSON.stringify(program(a))===JSON.stringify(program(b))&&b.sourceControlSequence>=a.sourceControlSequence&&a.worldBoundary.authorityEpoch===b.worldBoundary.authorityEpoch&&a.worldBoundary.nativeSession===b.worldBoundary.nativeSession&&b.worldBoundary.effectiveTime>=a.worldBoundary.effectiveTime&&(b.worldBoundary.ticket>a.worldBoundary.ticket||sameNativeIdleCycleReference(a,b));
}
export function copyNativeIdleCycleProposal(value){
 if(value?.kind!=='native-idle-cycle-proposal'||value.version!==1||Object.keys(value).some(k=>!['kind','version','ticket','worldBoundary','nativeIdleCycle','authorizedAutonomy','authorizedPassage'].includes(k))||value.authorizedAutonomy!==undefined&&value.authorizedAutonomy!==false||value.authorizedPassage!==undefined&&value.authorizedPassage!==false)throw TypeError('Invalid native Idle cycle proposal');
 const nativeIdleCycle=copyNativeIdleCycleReference(value.nativeIdleCycle),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),t=value.ticket;
 if(!sameNativeWorldBoundary(worldBoundary,nativeIdleCycle.worldBoundary)||t?.kind!=='native-idle-cycle-proposal-ticket'||Object.keys(t).some(k=>!['kind','authorityEpoch','session','ticket'].includes(k))||t.authorityEpoch!==worldBoundary.authorityEpoch||t.session!==worldBoundary.nativeSession||t.ticket!==worldBoundary.ticket)throw TypeError('Native Idle cycle proposal has a different boundary');
 return Object.freeze({kind:value.kind,version:1,ticket:Object.freeze({...t}),worldBoundary,nativeIdleCycle,authorizedAutonomy:false,authorizedPassage:false});
}
export function copyNativeIdleCycleAttestation(value){
 if(value?.kind!=='native-idle-cycle-attestation'||value.version!==1||value.projectionVersion!==1||!id(value.cycleSequence)||Object.keys(value).some(k=>!['kind','version','projectionVersion','cycleSequence','reference','preparedReference'].includes(k)))throw TypeError('Invalid native Idle cycle attestation');
 const reference=copyNativeIdleCycleReference(value.reference),preparedReference=copyNativeIdleCycleReference(value.preparedReference);
 if(value.cycleSequence<=reference.sourceControlSequence||!nativeIdleCycleSuccessor(preparedReference,reference))throw TypeError('Native Idle cycle has no actual prepared association');
 return Object.freeze({kind:value.kind,version:1,projectionVersion:1,cycleSequence:value.cycleSequence,reference,preparedReference});
}
