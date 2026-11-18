import {ceilFloat32,floorFloat32} from '../float32-time.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeIdleCycleBodySource,nativeIdleCycleBodyState} from './native-idle-cycle-body-source.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';
import {LOCOMOTION} from '../simulation/locomotion-calibration.js';

const id=n=>Number.isSafeInteger(n)&&n>0;
const nextRng=rng=>{let value=rng;value^=value<<13;value^=value>>>17;value^=value<<5;return value>>>0;};
const fields=['kind','version','actorId','bodyId','profile','sourceBody','sourceCycleSequence','sourceControlSequence','worldBoundary','anchor','durations','initialState','watchStartOffset','watchRng','duration'];
// Only this decoder's own frozen outputs can skip structural decoding. A wire
// clone or foreign frozen object still takes every validation below. Weak keys
// neither keep programmes alive nor attest a live native owner.
const canonicalReferences=new WeakMap();
// Immutable finite rest/watch program. Its next stochastic semantic request is
// a separate native fact; neither this reference nor its draft grants movement.
export function copyNativeIdleCycleReference(value){
 if(canonicalReferences.has(value))return value;
 if(value?.kind!=='native-idle-cycle-reference'||![1,2].includes(value.version)||Object.keys(value).some(k=>!fields.includes(k)))throw TypeError('Invalid native Idle cycle reference');
 const sourceBody=copyNativeIdleCycleBodySource(value.sourceBody),worldBoundary=copyNativeWorldBoundary(value.worldBoundary),initialState=copyNativeInitialIdleState(value.initialState),q=nativeIdleCycleBodyState(sourceBody),a=value.anchor,d=value.durations,calibration=LOCOMOTION.sources.find(s=>s.profile===q.workerProfile),failed=sourceBody.kind==='native-idle-stroll-failed-source';
 if(value.version!==(failed?2:1)||!initialState||value.actorId!==q.actorId||value.bodyId!==q.bodyId||value.profile!==q.profile||!Number.isSafeInteger(value.sourceCycleSequence)||value.sourceCycleSequence<0||value.sourceCycleSequence!==0&&value.sourceCycleSequence<=q.sourceSequence||!id(value.sourceControlSequence)||value.sourceControlSequence<Math.max(q.sourceSequence,value.sourceCycleSequence)||worldBoundary.authorityEpoch!==q.authorityEpoch||worldBoundary.nativeSession!==q.nativeSession||worldBoundary.effectiveTime<q.sourceAt||
  !a||Object.keys(a).some(k=>!['id','x','z','radius'].includes(k))||a.id!==q.idleState.anchorId||a.id!==initialState.anchorId||!['x','z','radius'].every(k=>Number.isFinite(a[k])&&Number.isFinite(Math.fround(a[k])))||a.radius<=0||a.radius>8||!failed&&Math.hypot(q.pose.x-a.x,q.pose.z-a.z)>a.radius||failed&&['x','z','radius'].some(k=>a[k]!==q.sourceRequest.anchor[k])||
  !d||Object.keys(d).some(k=>!['rest','watch'].includes(k))||d.rest!==calibration.idleSeconds||d.watch!==calibration.alertSeconds||
  !Number.isSafeInteger(value.watchRng)||value.watchRng<0||value.watchRng>0xffffffff||value.watchRng!==(initialState.mode==='rest'?nextRng(initialState.rng):initialState.rng)||!['watchStartOffset','duration'].every(k=>Number.isFinite(value[k])&&Number.isFinite(Math.fround(value[k]))&&value[k]>=0)||value.watchStartOffset!==(initialState.mode==='rest'?initialState.remaining:0)||!value.sourceCycleSequence&&JSON.stringify(initialState)!==JSON.stringify(q.idleState)||value.sourceCycleSequence&&!failed&&(initialState.mode!=='rest'||initialState.elapsed!==0))throw TypeError('Native Idle cycle differs from its source or original calibration');
 const full=value.watchStartOffset+(initialState.mode==='rest'?d.watch*(1+Math.floor(value.watchRng/4294967296*2)):initialState.remaining),outside=Math.hypot(q.pose.x-a.x,q.pose.z-a.z)>a.radius,duration=failed&&outside?Math.min(full,initialState.approachRetry):full;
 if(value.duration!==duration||failed&&(!Number.isFinite(worldBoundary.effectiveTime+duration)||duration>0&&worldBoundary.effectiveTime+duration<=worldBoundary.effectiveTime))throw TypeError('Native Idle cycle has a different finite horizon');
 const reference=Object.freeze({kind:value.kind,version:value.version,actorId:value.actorId,bodyId:value.bodyId,profile:value.profile,sourceBody,sourceCycleSequence:value.sourceCycleSequence,sourceControlSequence:value.sourceControlSequence,worldBoundary,anchor:Object.freeze({id:a.id,x:a.x,z:a.z,radius:a.radius}),durations:Object.freeze({rest:d.rest,watch:d.watch}),initialState,watchStartOffset:value.watchStartOffset,watchRng:value.watchRng,duration:value.duration});
 canonicalReferences.set(reference,null);return reference;
}
// Immutable frontier facts used only to validate native DTOs. This is not a
// Game clock, policy selector, per-frame sampler, or successor producer.
const outsideAnchor=r=>{const p=nativeIdleCycleBodyState(r.sourceBody).pose;return Math.hypot(p.x-r.anchor.x,p.z-r.anchor.z)>r.anchor.radius;};
const fullDuration=r=>r.watchStartOffset+(r.initialState.mode==='rest'?r.durations.watch*(1+Math.floor(r.watchRng/4294967296*2)):r.initialState.remaining);
const retryFrontier=r=>r.version===2&&outsideAnchor(r)&&r.initialState.approachRetry<=fullDuration(r);
function terminalFacts(r){
 const s=r.initialState,t=r.duration,retryRest=retryFrontier(r)&&s.mode==='rest'&&t<=r.watchStartOffset,watch=s.mode==='watch'||!retryRest&&(r.worldBoundary.effectiveTime+r.watchStartOffset)-(r.worldBoundary.effectiveTime+t)<=1e-9,local=watch?Math.max(0,t-r.watchStartOffset):t;
 return {anchorId:r.anchor.id,mode:watch?'watch':'rest',elapsed:(watch?(s.mode==='watch'?s.elapsed:0):s.elapsed)+local,remaining:Math.max(0,(watch?fullDuration(r)-r.watchStartOffset:s.remaining)-local),rng:watch?r.watchRng:s.rng,approachRetry:Math.max(0,s.approachRetry-t)};
}
function referenceKey(value){const reference=copyNativeIdleCycleReference(value);let key=canonicalReferences.get(reference);if(key===null){key=JSON.stringify(reference);canonicalReferences.set(reference,key);}return key;}
export function sameNativeIdleCycleReference(a,b){try{return referenceKey(a)===referenceKey(b);}catch{return false;}}
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
 if(value?.kind!=='native-idle-cycle-next-request'||![1,2].includes(value.version)||value.version===1&&Object.hasOwn(value,'approach')||Object.keys(value).some(k=>!['kind','version','sourceCycle','requestSequence','requestedAt','idleState','approach'].includes(k))||value.approach!==undefined&&value.approach!==true)throw TypeError('Invalid native Idle cycle next request');
 const sourceCycle=copyNativeIdleCycleAttestation(value.sourceCycle),r=sourceCycle.reference,s=value.idleState,approach=value.approach===true,terminal=terminalFacts(r),outside=outsideAnchor(r),retryDue=r.version===2&&outside&&terminal.approachRetry===0;
 if(value.version!==r.version||approach&&!retryDue||!id(value.requestSequence)||value.requestSequence<=sourceCycle.cycleSequence||!Number.isFinite(value.requestedAt)||r.worldBoundary.effectiveTime+r.duration-value.requestedAt>(retryFrontier(r)?0:1e-9)||!s||s.anchorId!==r.anchor.id||r.version===1&&s.elapsed!==0)throw TypeError('Native Idle successor differs from its cycle or deadline');
 let idleState;
 if(s.mode==='rest'||s.mode==='watch'){
  idleState=copyNativeInitialIdleState(s);
  if(approach)throw TypeError('Native approach is not a WALK intention');
  if(r.version===2&&outside){
   let expected;
   if(terminal.remaining>1e-9)expected={...terminal,approachRetry:1};
   else if(terminal.mode==='rest'){const rng=nextRng(terminal.rng);expected={anchorId:r.anchor.id,mode:'watch',elapsed:0,remaining:r.durations.watch*(1+Math.floor(rng/4294967296*2)),rng,approachRetry:retryDue?1:terminal.approachRetry};}
   else{const rng=nextRng(nextRng(terminal.rng));expected={anchorId:r.anchor.id,mode:'rest',elapsed:0,remaining:r.durations.rest*(2+Math.floor(rng/4294967296*3)),rng,approachRetry:retryDue?1:terminal.approachRetry};}
   if(JSON.stringify(idleState)!==JSON.stringify(copyNativeInitialIdleState(expected)))throw TypeError('Native Idle retry differs from its finite source phase');
  }else if(s.mode!=='rest'||s.elapsed!==0||idleState.remaining!==r.durations.rest*(2+Math.floor(idleState.rng/4294967296*3)))throw TypeError('Native Idle successor has a different rest duration');
 }else{
  const d=s.destination;
  if(s.mode!=='walk'||Object.keys(s).some(k=>!['anchorId','mode','elapsed','remaining','rng','approachRetry','pathVersion','destination'].includes(k))||s.elapsed!==0||!Number.isSafeInteger(s.rng)||s.rng<0||s.rng>0xffffffff||!Number.isFinite(s.approachRetry)||s.approachRetry<0||!Number.isSafeInteger(s.pathVersion)||s.pathVersion<0||!d||Object.keys(d).some(k=>!['id','x','z'].includes(k))||!['x','z'].every(k=>Number.isFinite(d[k])&&Number.isFinite(Math.fround(d[k]))))throw TypeError('Invalid native pending stroll semantics');
  if(approach){if(d.id!==r.anchor.id||d.x!==r.anchor.x||d.z!==r.anchor.z||s.remaining!==terminal.remaining||s.rng!==terminal.rng||s.approachRetry!==1)throw TypeError('Native approach differs from its retained Idle phase');}
  else if(r.version===2&&outside||s.remaining!==0||d.id!==`idle-worker-${r.actorId}`||Math.hypot(d.x-r.anchor.x,d.z-r.anchor.z)>r.anchor.radius+1e-9||Math.hypot(d.x-nativeIdleCycleBodyState(r.sourceBody).pose.x,d.z-nativeIdleCycleBodyState(r.sourceBody).pose.z)<.75)throw TypeError('Native local stroll differs from its source or radius');
  idleState=Object.freeze({...s,destination:Object.freeze({id:d.id,x:d.x,z:d.z})});
 }
 return Object.freeze({kind:value.kind,version:value.version,sourceCycle,requestSequence:value.requestSequence,requestedAt:value.requestedAt,idleState,...(approach?{approach:true}:{})});
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
 // A retry at/before the REST knot retains REST until its admitted successor.
 // Put the knot strictly beyond the physical f32 clamp, including duration0.
 if(retryFrontier(r)&&r.duration<=r.watchStartOffset){const f=new Float32Array(1),bits=new Uint32Array(f.buffer);f[0]=floorFloat32(r.duration);bits[0]++;if(!Number.isFinite(f[0]))throw RangeError('Native Idle retry knot exceeds float32');return f[0];}
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
