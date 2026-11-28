import {copyNativeIdleStrollRequestReference} from './native-idle-stroll-request-reference.js';
import {copyNativeInitialIdleState} from './native-initial-idle-request-reference.js';

const fields=['kind','version','sourceRequest','observedAt','topology','desiredRest'];
const restFields=['mode','elapsed','remaining','rng','approachRetry'];
// A desired state read from a failed native path query. This descriptor is
// neither an executed22 nor an Idle21 attestation or graphical permission.
export function copyNativeIdleStrollFailedRestReference(value){
 if(value?.kind!=='native-idle-stroll-failed-rest-reference'||value.version!==1||Object.keys(value).some(k=>!fields.includes(k))||!Number.isFinite(value.observedAt)||value.observedAt<0||!Number.isSafeInteger(value.topology)||value.topology<0||value.topology>0xffffffff||!value.desiredRest||Object.keys(value.desiredRest).some(k=>!restFields.includes(k)))throw TypeError('Invalid native Idle failed REST source');
 const sourceRequest=copyNativeIdleStrollRequestReference(value.sourceRequest),r=value.desiredRest;
 const idle=copyNativeInitialIdleState({anchorId:`${sourceRequest.anchor.kind===1?'farm-plant':'farm-structure'}-${sourceRequest.anchor.id}`,...r});
 // Validate the original one-draw cancelWalk relation; gameplay never chooses
 // or installs a phase in this value copier.
 let rng=sourceRequest.walkRng;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;
 if(value.observedAt<sourceRequest.requestedAt||idle.mode!=='rest'||idle.elapsed!==0||idle.rng!==rng||idle.remaining!==sourceRequest.idleSeconds*(2+Math.floor(rng/4294967296*3))||idle.approachRetry!==sourceRequest.approachRetry)throw TypeError('Native Idle failed REST differs from original cancelWalk');
 return Object.freeze({kind:value.kind,version:1,sourceRequest,observedAt:value.observedAt,topology:value.topology,desiredRest:Object.freeze(Object.fromEntries(restFields.map(k=>[k,idle[k]])))});
}
