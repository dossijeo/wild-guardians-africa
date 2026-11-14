// Diagnostic only: prevents presentation clock advancement after a pause
// request. A later authoritative time requires external reconciliation.
export function createPausePresentationGate(session,initialTime,{displayedTime=initialTime}={}){
 if(typeof session!=='string'||!session||!Number.isFinite(initialTime)||initialTime<0||!Number.isFinite(displayedTime)||displayedTime<0||displayedTime>initialTime)throw TypeError('Invalid session or time');
 let displayed=displayedTime,confirmed=initialTime,lastSequence=0,pending=null,phase='running',needsReconciliation=false;
 const validSeq=seq=>Number.isSafeInteger(seq)&&seq>lastSequence;
 return {
  advance(time){if(!Number.isFinite(time)||time<displayed||time>confirmed)throw RangeError('Time outside confirmed interval');if(phase==='running')displayed=time;return displayed;},
  requestPause(sequence){if(phase!=='running'||!validSeq(sequence))return false;lastSequence=sequence;pending=sequence;phase='pausing';return true;},
  confirmPause(event){if(event?.session!==session||phase!=='pausing'||event.sequence!==pending)return false;if(event.paused!==true||!Number.isFinite(event.time)||event.time<confirmed){phase='suspended';throw TypeError('Invalid pause confirmation');}confirmed=event.time;needsReconciliation=confirmed!==displayed;pending=null;phase='paused';return true;},
  // The caller must establish visual/physical continuity independently.
  confirmReconciled(time){if(phase!=='paused'||!needsReconciliation||time!==confirmed)return false;displayed=time;needsReconciliation=false;return true;},
  requestResume(sequence){if(phase!=='paused'||needsReconciliation||!validSeq(sequence))return false;lastSequence=sequence;pending=sequence;phase='resuming';return true;},
  confirmResume(event){if(event?.session!==session||phase!=='resuming'||event.sequence!==pending)return false;if(event.paused!==false||event.time!==confirmed){phase='suspended';throw TypeError('Invalid resume confirmation');}pending=null;phase='running';return true;},
  snapshot(){return {displayed,confirmed,phase,needsReconciliation,pending};}
 };
}
