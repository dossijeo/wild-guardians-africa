import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';

// Invalid recording and resource lifetime are separate (Babylon snapshot
// invalidation). Retained uploads still require a genuinely applied native
// delta and freshly recorded passes, never a new tag on the rejected commands.
export function isPreparedFrameInvalidation(error) {
  return error?.code === 'remote-frame-native-clock-obsolete' || error?.code === 'historical-playback-invalidated' || error?.code === 'remote-frame-native-mutation-obsolete' || error?.code === 'remote-frame-native-route-obsolete';
}

function sameOwner(a,b){return !!a&&!!b&&a.authorityEpoch===b.authorityEpoch&&a.nativeSession===b.nativeSession;}
function atLeast(value,minimum){return sameOwner(value,minimum)&&value.ticket>=minimum.ticket&&value.effectiveTime>=minimum.effectiveTime;}
function pendingBoundary(proposal){return ['ready','armed','adopting'].includes(proposal?.phase)?proposal.worldBoundary:null;}

// All inputs belong to the existing surface/control owners. A proposal is only
// a reason to wait; only the applied owner marker matching direct control can
// make a new recording ready. No clock or route permission is manufactured.
export function nativeFrameReadiness({prepared=null,required=null,proposal=null,resumeTarget=null,closed=false}={}){
 if(closed)return 'unavailable';
 const pending=pendingBoundary(proposal),armed=['armed','adopting'].includes(proposal?.phase);
 if(sameNativeWorldBoundary(prepared,required)){
  if(resumeTarget&&!atLeast(prepared,resumeTarget))return pending&&atLeast(pending,resumeTarget)?'waiting':'unavailable';
  return armed?'waiting':'ready';
 }
 if(pending&&(!required||atLeast(pending,required))&&(!resumeTarget||atLeast(pending,resumeTarget)))return 'waiting';
 // The applied state and the direct control message can arrive on different
 // channels. Wait for control rather than publishing a future requirement.
 if(prepared&&(!required||atLeast(prepared,required))&&(!resumeTarget||atLeast(prepared,resumeTarget)))return 'waiting';
 return 'unavailable';
}

export function rejectedHistoricalIntervalTarget(error,metadata,state){
 const proof=error?.clockRejection,clock=metadata?.clock,interval=metadata?.preparedInterval;
 if(error?.code!=='remote-frame-native-clock-obsolete'||error.resourcePreparationsRetained!==true||
    !interval||!clock||!proof||!Number.isFinite(clock.epoch)||proof.epoch!==clock.epoch||
    !Number.isFinite(interval.end)||interval.end!==clock.safeUntil||
    !Number.isFinite(proof.safeUntil)||proof.safeUntil<interval.end||
    !Number.isFinite(proof.presentedThrough)||proof.presentedThrough<=proof.safeUntil)return null;
 const boundary=copyNativeWorldBoundary(metadata.nativeWorldBoundary??null);
 return boundary&&sameNativeWorldBoundary(boundary,state.prepared)&&sameNativeWorldBoundary(boundary,state.required)&&
   nativeFrameReadiness({...state,resumeTarget:boundary})==='ready'?boundary:null;
}

export function rejectedNativeFrameTarget(error,metadata,state={}){
 const clockObsolete=error?.code==='remote-frame-native-clock-obsolete';
 if(!clockObsolete&&error?.code!=='remote-frame-native-mutation-obsolete'||error.resourcePreparationsRetained!==true||!metadata||metadata.preparedInterval!=null||state.closed)return null;
 const before=copyNativeWorldBoundary(metadata.nativeWorldBoundary??null),pending=pendingBoundary(state.proposal),required=state.required??null,applied=state.prepared??null;
 // Clock obsolescence changes no world owner. Re-record only against the
 // exact already-applied/directly-required world, never a pending mutation.
 if(clockObsolete)return before&&sameNativeWorldBoundary(before,applied)&&sameNativeWorldBoundary(before,required)&&nativeFrameReadiness({...state,resumeTarget:before})!=='unavailable'?before:null;
 const candidate=required&&sameNativeWorldBoundary(applied,required)?applied:required&&sameNativeWorldBoundary(pending,required)?pending:pending??applied,
  target=copyNativeWorldBoundary(candidate);
 if(!target||before&&(!atLeast(target,before)||target.ticket===before.ticket))return null;
 if(state.required&&!sameNativeWorldBoundary(state.required,before)&&!sameNativeWorldBoundary(state.required,target))return null;
 if(nativeFrameReadiness({...state,resumeTarget:target})==='unavailable')return null;
 return target;
}
