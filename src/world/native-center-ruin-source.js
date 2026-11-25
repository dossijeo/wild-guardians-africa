import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {copyNativeAnimalCropAttestation} from './native-animal-crop-resource.js';
const nat=n=>Number.isSafeInteger(n)&&n>=0;
const copyArray=(a,n,valid)=>{
 if(!Array.isArray(a)||a.length!==n||!a.every(valid))throw Error('Invalid center removal evidence');
 return Object.freeze([...a]);
};
export function centerSource(s){
 const boundary=copyNativeWorldBoundary(s?.boundary),exit=copyNativeAnimalCropAttestation(s?.retreat,26);
 if(!boundary||exit.reference.purpose!=='retreat'||!sameNativeWorldBoundary(exit.reference.worldBoundary,s.previous)||
   boundary.authorityEpoch!==s.previous.authorityEpoch||boundary.nativeSession!==s.previous.nativeSession||
   boundary.ticket<=s.previous.ticket||!(boundary.effectiveTime>=s.previous.effectiveTime)||
   !nat(s.initialClock)||!nat(s.intent)||exit.assignmentSequence!==s.intent||
   !/^structure-[1-9]\d*$/.test(s.center)||!nat(s.polygon)||!s.polygon||
   !Number.isFinite(s.end)||s.end<=boundary.effectiveTime||s.end>boundary.effectiveTime+.020000001||
   s.end>=exit.reference.endTime)throw Error('Invalid center removal source');
 return Object.freeze({boundary,previous:exit.reference.worldBoundary,retreat:exit,initialClock:s.initialClock,intent:s.intent,
   center:s.center,polygon:s.polygon,end:s.end,revisions:copyArray(s.revisions,3,nat),
   footprint:copyArray(s.footprint,48,x=>Number.isFinite(x)&&x===Math.fround(x))});
}
export function sameCenter(a,b){return !!a&&!!b&&JSON.stringify(centerSource(a))===JSON.stringify(centerSource(b));}
export function verifiesCenter(s,boundary,proof){
 if(!s||!proof||!sameCenter(s,proof.prepared)||!sameNativeWorldBoundary(boundary,proof.acquired)||
    !sameNativeWorldBoundary({...s.boundary,effectiveTime:s.end},boundary)||proof.polygon!==s.polygon||
    proof.center!==s.center||proof.status!=='ruined'||!Array.isArray(proof.revisions))return false;
 return proof.revisions.length===3&&proof.revisions[0]===s.revisions[0]&&proof.revisions[1]===s.revisions[1]+1&&proof.revisions[2]===s.revisions[2];
}

export function matchesCenterRuinCommit(source,{resources,worldBoundary,nativeCenterRuin}={}){
 return verifiesCenter(source,worldBoundary,nativeCenterRuin)&&resources?.version===1&&resources.kind===4&&
  resources.phase==='committed'&&resources.nativeSession===worldBoundary.nativeSession&&
  resources.ticket===worldBoundary.ticket&&resources.effectiveTime===worldBoundary.effectiveTime&&
  Array.isArray(resources.chunks)&&resources.chunks.length===0&&Array.isArray(resources.removed)&&resources.removed.length===0&&
  verifiesCenter(source,worldBoundary,resources.nativeCenterRuin);
}
