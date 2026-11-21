// Optional served annotations composed by the existing preparation observer.
// All additions observe original operations; no protocol fields or new awaits.
export function rewriteMutationCosts(source,owner){
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Mutation observation seam changed: '+from);source=source.replace(from,to);};
 const marker=`function qaMutation(stage,value={}){const boundary=value.preparedWorldBoundary??value.worldBoundary;const row={owner:'${owner}',stage,at:performance.timeOrigin+performance.now(),holdId:value.holdId??null,session:value.session??null,authorityEpoch:value.authorityEpoch??boundary?.authorityEpoch??null,sequence:value.sequence??null,effectiveTime:value.effectiveTime??boundary?.effectiveTime??null,ticket:boundary?.ticket??null,nativeSession:boundary?.nativeSession??null,preparedFrameSequence:value.preparedFrameSequence??null};${owner==='host'?'metrics.qaMutationStages.push(row);':''}performance.mark('native-mutation:${owner}:'+stage,{detail:row});}`;
 if(owner==='host'){
  replace('  function resourceJob(type,stage,run){','  metrics.qaMutationStages=[];metrics.qaPresentationOpportunities=[];\n  '+marker+'\n  function resourceJob(type,stage,run){');
  replace("         if(message?.type==='IntentMutationQuiesce'){","         if(message?.type==='IntentMutationQuiesce'){qaMutation('request-received',message);");
  replace('           if(preparedWorldBoundary)nativeMutationHold.preparedFrameSequence=pending.sequence;','           if(preparedWorldBoundary)nativeMutationHold.preparedFrameSequence=pending.sequence;qaMutation(\'hold-start\',nativeMutationHold);');
  replace('             nativeMutationHold.quiesced=true;metrics.nativeMutationQuiescedAt=absoluteNow();','             nativeMutationHold.quiesced=true;metrics.nativeMutationQuiescedAt=absoluteNow();qaMutation(\'drained\',nativeMutationHold);');
  replace("             intentControl.port.postMessage({type:'intent-mutation-quiesced'","             qaMutation('ack-send',nativeMutationHold);intentControl.port.postMessage({type:'intent-mutation-quiesced'");
  replace("         if(message?.type==='IntentMutationRelease'){","         if(message?.type==='IntentMutationRelease'){qaMutation('release-received',message);");
  replace('           nativeMutationFloor=Math.max(nativeMutationFloor??0,hold.effectiveTime);nativeMutationHold=null;','           qaMutation(\'world-installed\',message);nativeMutationFloor=Math.max(nativeMutationFloor??0,hold.effectiveTime);nativeMutationHold=null;');
  replace('            metrics.nativeMutationReleasedAt=absoluteNow();','            metrics.nativeMutationReleasedAt=absoluteNow();qaMutation(\'released\',message);');
  replace("            if(hold.presentationMissed)draw('mutation-release');","            if(hold.presentationMissed){qaMutation('release-draw-start',message);draw('mutation-release');qaMutation('release-draw-end',message);}");
  replace('    previousOpportunityAt = at;','    metrics.qaPresentationOpportunities.push({at,intervalMs:previousOpportunityAt===null?null:at-previousOpportunityAt,outcome,holdId,sequence:active?.sequence??null});previousOpportunityAt = at;');
 }else if(owner==='publication'){
  source=marker+'\n'+source;
  replace("    if(data?.type==='intent-mutation-quiesced'){","    if(data?.type==='intent-mutation-quiesced'){qaMutation('ack-received',data);");
  replace("      try{port.postMessage({type:'IntentMutationQuiesce'","      qaMutation('quiesce-send',{...mutationHold,session,authorityEpoch});try{port.postMessage({type:'IntentMutationQuiesce'");
  replace("    port.postMessage({type:'IntentMutationRelease'","    qaMutation('release-send',{...hold,session,authorityEpoch,worldBoundary:nextBoundary});port.postMessage({type:'IntentMutationRelease'");
 }else if(owner==='admission'){
  source=marker+'\n'+source;
  replace('      receipt=await source.quiesceGpuForMutation(',"      qaMutation('before-quiesce',{worldBoundary:preparedWorldBoundary});receipt=await source.quiesceGpuForMutation(");
  replace('}:undefined);const current=source.status();',"}:undefined);const current=source.status();qaMutation('quiesced',receipt);");
  replace('        commitAttempted=true;',"        qaMutation('before-commit',receipt);commitAttempted=true;");
  replace("        if(committed.status===1&&!physicalCommitted)","        qaMutation('after-commit',receipt);if(committed.status===1&&!physicalCommitted)");
  replace('        if(committed.status===1)motionRoutes=',"        qaMutation('before-attest',receipt);if(committed.status===1)motionRoutes=");
  replace('        if(committed.status===1&&preparedResources&&preparedResources.commit(',"        qaMutation('before-retain',receipt);if(committed.status===1&&preparedResources&&preparedResources.commit(");
  replace("        answer=committed.status===1?outcome(","        qaMutation('after-retain',receipt);answer=committed.status===1?outcome(");
  replace('          flushNativeIntentControl();const latest=nativeCausalClock();',"          qaMutation('before-clock-flush',receipt);flushNativeIntentControl();const latest=nativeCausalClock();");
  replace('          flushNativeIntentControl();source.releaseGpuAfterMutation(receipt,',"          flushNativeIntentControl();qaMutation('before-release',receipt);source.releaseGpuAfterMutation(receipt,");
 }else throw Error('Unknown mutation observation owner');
 return source;
}
