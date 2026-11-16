import {ceilFloat32} from '../float32-time.js';
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
export const nativeIdleCycleAttestationCovers=(proof,reference)=>sameNativeIdleCycleReference(proof?.reference,reference)||sameNativeIdleCycleReference(proof?.preparedReference,reference);
export function sameNativeIdleCycleAttestation(a,b){return !!a&&!!b&&a.cycleSequence===b.cycleSequence&&sameNativeIdleCycleReference(a.reference,b.reference)&&sameNativeIdleCycleReference(a.preparedReference,b.preparedReference);}

// A native semantic successor, not a walking reservation or graphic permit.
// The path stays in the native owner; control needs only its immutable target.
export function copyNativeIdleCycleNextRequest(value){
 if(value?.kind!=='native-idle-cycle-next-request'||value.version!==1||Object.keys(value).some(k=>!['kind','version','sourceCycle','requestSequence','requestedAt','idleState'].includes(k)))throw TypeError('Invalid native Idle cycle next request');
 const sourceCycle=copyNativeIdleCycleAttestation(value.sourceCycle),r=sourceCycle.reference,s=value.idleState;
 if(!id(value.requestSequence)||value.requestSequence<=sourceCycle.cycleSequence||!Number.isFinite(value.requestedAt)||r.worldBoundary.effectiveTime+r.duration-value.requestedAt>1e-9||!s||s.anchorId!==r.anchor.id||s.elapsed!==0)throw TypeError('Native Idle successor differs from its cycle or deadline');
 let idleState;
 if(s.mode==='rest'){
  idleState=copyNativeInitialIdleState(s);
  if(idleState.remaining!==r.durations.rest*(2+Math.floor(idleState.rng/4294967296*3)))throw TypeError('Native Idle successor has a different rest duration');
 }else{
  const d=s.destination;
  if(s.mode!=='walk'||Object.keys(s).some(k=>!['anchorId','mode','elapsed','remaining','rng','approachRetry','pathVersion','destination'].includes(k))||s.remaining!==0||!Number.isSafeInteger(s.rng)||s.rng<0||s.rng>0xffffffff||!Number.isFinite(s.approachRetry)||s.approachRetry<0||!Number.isSafeInteger(s.pathVersion)||s.pathVersion<0||!d||Object.keys(d).some(k=>!['id','x','z'].includes(k))||d.id!==`idle-worker-${r.actorId}`||!['x','z'].every(k=>Number.isFinite(d[k])&&Number.isFinite(Math.fround(d[k])))||Math.hypot(d.x-r.anchor.x,d.z-r.anchor.z)>r.anchor.radius+1e-9||Math.hypot(d.x-r.sourceBody.reference.sourceRequest.pose.x,d.z-r.sourceBody.reference.sourceRequest.pose.z)<.75)throw TypeError('Invalid native pending stroll semantics');
  idleState=Object.freeze({...s,destination:Object.freeze({id:d.id,x:d.x,z:d.z})});
 }
 return Object.freeze({kind:value.kind,version:1,sourceCycle,requestSequence:value.requestSequence,requestedAt:value.requestedAt,idleState});
}
export function sameNativeIdleCycleNextRequest(a,b){try{return JSON.stringify(copyNativeIdleCycleNextRequest(a))===JSON.stringify(copyNativeIdleCycleNextRequest(b));}catch{return false;}}

export const nativeIdleCycleReferenceFromProposal=value=>copyNativeIdleCycleProposal(value).nativeIdleCycle;

export function nativeIdleCycleReferenceCovered(reference,boundary){const w=reference.worldBoundary;return !!boundary&&w.authorityEpoch===boundary.authorityEpoch&&w.nativeSession===boundary.nativeSession&&boundary.ticket>=w.ticket&&boundary.effectiveTime>=w.effectiveTime;}

// Encode the native absolute-time comparison in the ordered nonnegative f32
// domain. Standard lower_bound halving; at most31 comparisons at admission,
// never a per-draw policy decision. Retiming uses the actual execution origin.
export function nativeIdleCycleWatchKnot(value,executionEpoch=value.worldBoundary.effectiveTime){
 const r=copyNativeIdleCycleReference(value);
 if(!Number.isFinite(executionEpoch)||executionEpoch<r.worldBoundary.effectiveTime)throw TypeError('Invalid native Idle cycle execution origin');
 if(r.initialState.mode==='watch')return 0;
 const f=new Float32Array(1),bits=new Uint32Array(f.buffer);f[0]=ceilFloat32(r.duration);let first=0,length=bits[0]+1;
 while(length){const half=Math.floor(length/2),mid=first+half;bits[0]=mid;
  if((executionEpoch+r.watchStartOffset)-(executionEpoch+f[0])>1e-9){first=mid+1;length-=half+1;}else length=half;
 }
 bits[0]=first;if(!Number.isFinite(f[0]))throw RangeError('Native Idle watch knot exceeds float32');return f[0];
}

export function copyNativeIdleCycleResources(value){
 if(value?.version!==1||value.kind!==21||value.phase!=='committed'||Object.keys(value).some(k=>!['version','kind','phase','worldBoundary','nativeIdleCycleBinding'].includes(k)))throw TypeError('Invalid native Idle cycle resources');
 const worldBoundary=copyNativeWorldBoundary(value.worldBoundary),nativeIdleCycleBinding=copyNativeIdleCycleAttestation(value.nativeIdleCycleBinding);
 if(!sameNativeWorldBoundary(worldBoundary,nativeIdleCycleBinding.reference.worldBoundary))throw TypeError('Native Idle cycle resource boundary mismatch');
 return Object.freeze({version:1,kind:21,phase:'committed',worldBoundary,nativeIdleCycleBinding});
}
export function nativeIdleCyclePresentationMatches(proposal,value,binding){
 try{const prepared=nativeIdleCycleReferenceFromProposal(proposal),resources=copyNativeIdleCycleResources(value),proof=copyNativeIdleCycleAttestation(binding);return nativeIdleCycleAttestationCovers(proof,prepared)&&sameNativeIdleCycleAttestation(resources.nativeIdleCycleBinding,proof);}catch{return false;}
}
