// A fresh surface stays hidden; a retained surface requires its old consumer
// image held until final admission. A failed transaction must terminate the
// surface; callers must never keep a partially restored one.
// Compare the existing checkpoint DTOs, preserving ordered histories and every
// own field. Keys may be serialized in a different order. No owner is restored.
function sameCheckpointDto(a,b){
 if(a===null||b===null)return a===b;
 if(typeof a!=='object'||typeof b!=='object')return a===b&&!['function','symbol','bigint'].includes(typeof a)&&(typeof a!=='number'||Number.isFinite(a));
 const array=Array.isArray(a);if(array!==Array.isArray(b)||array&&a.length!==b.length)return false;
 if(!array&&[a,b].some(value=>![Object.prototype,null].includes(Object.getPrototypeOf(value))))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameCheckpointDto(a[key],b[key]));
}
export function assertRetainedTemporalPresentation(message,{presentation,work=null}={}){
 if(!Number.isSafeInteger(message?.sequence)||message.sequence<0||!Number.isFinite(message.elapsed)||message.elapsed<0||presentation?.version!==1||presentation.sequence!==message.sequence||presentation.elapsed!==message.elapsed)throw Error('Retained presentation checkpoint boundary mismatch');
 const expected=message.presentationCheckpoint??message.workCheckpoint?.presentation;
 if(!expected||!sameCheckpointDto(expected,presentation))throw Error('Retained presentation checkpoint differs from current effects');
 const expectedWork=message.workCheckpoint;
 if(expectedWork===undefined){if(work!==null)throw Error('Retained work checkpoint unavailable');return true;}
 if(!expectedWork||typeof expectedWork!=='object'||Array.isArray(expectedWork)||work?.version!==1||work.sequence!==message.sequence||work.elapsed!==message.elapsed)throw Error('Retained work checkpoint boundary mismatch');
 const {presentation:embedded,...payload}=expectedWork;
 if(embedded!==undefined&&!sameCheckpointDto(embedded,presentation)||!sameCheckpointDto(payload,work))throw Error('Retained work checkpoint differs from current effects');
 return true;
}

export function createTemporalSurfaceRecovery({stream,terrain,prepareCheckpoint,validateCheckpoint,onCheckpoint=()=>{},onBoundary=()=>{},onError=()=>{},retainCurrent=false}={}){
 if(typeof retainCurrent!=='boolean'||retainCurrent&&typeof stream?.beginTimelineReplay!=='function'||typeof stream?.queueReplayBoundary!=='function'||typeof stream?.advanceNextTimelineBoundary!=='function'||typeof stream?.finishTimelineReplay!=='function'||typeof terrain?.beginReplay!=='function'||typeof terrain?.stageReplayBoundary!=='function'||typeof terrain?.waitForReplayBoundary!=='function'||typeof terrain?.finishReplay!=='function'||typeof prepareCheckpoint!=='function'||typeof validateCheckpoint!=='function'||typeof onCheckpoint!=='function'||typeof onBoundary!=='function'||typeof onError!=='function')throw TypeError('Invalid temporal surface recovery');
 let phase='checkpoint',busy=false;
 const check=signal=>{if(signal?.aborted)throw new DOMException('Temporal recovery cancelled','AbortError');};
 async function restoreTimelineCheckpoint(message,{signal,retainCurrent:retained=retainCurrent}={}){if(typeof retained!=='boolean'||retained&&typeof stream?.beginTimelineReplay!=='function')throw TypeError('Invalid retained temporal recovery mode');if(phase!=='checkpoint'&&(!retained||phase!=='live')||busy)throw Error('Temporal checkpoint unavailable');busy=true;let prepared=null;try{check(signal);const recoveryOptions={signal,...(retained?{retainCurrent:true}:{})};validateCheckpoint(message,recoveryOptions);const sourceEpoch=retained?message.terrainCheckpoint?.terrainManifest?.epoch:null;if(retained){stream.beginTimelineReplay({sequence:message.sequence,elapsed:message.elapsed});terrain.beginReplay({sequence:message.sequence,epoch:sourceEpoch});}prepared=await prepareCheckpoint(message,recoveryOptions);check(signal);validateCheckpoint(message,recoveryOptions);if(!prepared||prepared.sequence!==message.sequence||typeof prepared.epoch!=='string'||retained&&(prepared.epoch!==sourceEpoch||message.terrainCheckpoint?.terrainManifest?.epoch!==sourceEpoch)||typeof prepared.commit!=='function'||typeof prepared.abort!=='function')throw Error('Invalid prepared temporal checkpoint');if(prepared.commit()!==true)throw Error('Temporal checkpoint not committed');if(retained)validateCheckpoint(message,recoveryOptions);if(!retained)terrain.beginReplay({sequence:prepared.sequence,epoch:prepared.epoch});await onCheckpoint(message,prepared,recoveryOptions);check(signal);if(retained)validateCheckpoint(message,recoveryOptions);phase='replay';return true;}catch(error){try{prepared?.abort();}catch{}phase='failed';try{onError(error);}catch{}throw error;}finally{busy=false;}}
 async function applyTimelineRecoveryBoundary(boundary,{signal}={}){if(phase!=='replay'||busy||!boundary||!Array.isArray(boundary.terrain))throw Error('Temporal recovery boundary unavailable');busy=true;try{check(signal);stream.queueReplayBoundary(boundary.publication);terrain.stageReplayBoundary(boundary.sequence,boundary.terrain);await terrain.waitForReplayBoundary(boundary.sequence,{signal});check(signal);if(!stream.advanceNextTimelineBoundary()||stream.status().sequence!==boundary.sequence)throw Error('Temporal recovery boundary not committed');await onBoundary(boundary,{signal});check(signal);return true;}catch(error){phase='failed';try{onError(error);}catch{}throw error;}finally{busy=false;}}
 function finishTimelineRecovery(){if(phase!=='replay'||busy)throw Error('Temporal recovery not caught up');try{stream.finishTimelineReplay();terrain.finishReplay();phase='live';return true;}catch(error){phase='failed';try{onError(error);}catch{}throw error;}}
 return {restoreTimelineCheckpoint,applyTimelineRecoveryBoundary,finishTimelineRecovery,status(){return {phase,busy};}};
}
