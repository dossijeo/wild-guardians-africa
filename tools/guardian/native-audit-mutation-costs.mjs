// Optional served annotations composed by the existing preparation observer.
// All additions observe original operations; no protocol fields or new awaits.
export function rewriteMutationCosts(source,owner){
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Mutation observation seam changed: '+from);source=source.replace(from,to);};
 const marker=`function qaMutation(stage,value={}){const boundary=value.preparedWorldBoundary??value.worldBoundary;const row={owner:'${owner}',stage,at:performance.timeOrigin+performance.now(),opportunityCount:value.opportunityCount??null,submittedDrawCount:value.submittedDrawCount??null,opportunityId:value.opportunityId??null,accepted:value.accepted??null,reason:value.reason??null,holdId:value.holdId??null,session:value.session??null,authorityEpoch:value.authorityEpoch??boundary?.authorityEpoch??null,sequence:value.sequence??null,effectiveTime:value.effectiveTime??boundary?.effectiveTime??null,ticket:boundary?.ticket??null,nativeSession:boundary?.nativeSession??null,preparedFrameSequence:value.preparedFrameSequence??null};${owner==='host'?'metrics.qaMutationStages.push(row);':''}performance.mark('native-mutation:${owner}:'+stage,{detail:row});}`;
 if(owner==='host'){
  replace('  function resourceJob(type,stage,run){','  metrics.qaMutationStages=[];metrics.qaPresentationOpportunities=[];\n  '+marker+'\n  function resourceJob(type,stage,run){');
  replace('  metrics.qaMutationStages=[];metrics.qaPresentationOpportunities=[];',"  metrics.qaMutationStages=[];metrics.qaPresentationOpportunities=[];qaMutation('observation-start',{session:intentControl?.session});");
  replace('    if(nativeRetirementNotified)return;nativeRetirementNotified=true;',"    if(nativeRetirementNotified)return;nativeRetirementNotified=true;qaMutation(deviceIsLost?'retired-device-loss':'retired-drained',{session:intentControl?.session,authorityEpoch:routeControl?.status().authorityEpoch,opportunityCount:opportunityCursor,submittedDrawCount:sampleCursor});");
  replace("         if(message?.type==='IntentMutationOpportunity'){","         if(message?.type==='IntentMutationOpportunity'){qaMutation('opportunity-request',message);");
  replace("    intentControl.port.postMessage({type:'intent-mutation-opportunity'","    qaMutation('opportunity-send',{...request,accepted,reason});intentControl.port.postMessage({type:'intent-mutation-opportunity'");
  replace('          packet.preparedUploadsComplete=true;',"          packet.preparedUploadsComplete=true;qaMutation('ready-send',{sequence:packet.sequence,session:intentControl?.session,worldBoundary:boundary});");
  replace("         if(message?.type==='IntentMutationQuiesce'){","         if(message?.type==='IntentMutationQuiesce'){qaMutation('request-received',message);");
  replace('           if(preparedWorldBoundary)nativeMutationHold.preparedFrameSequence=pending.sequence;','           if(preparedWorldBoundary)nativeMutationHold.preparedFrameSequence=pending.sequence;qaMutation(\'hold-start\',nativeMutationHold);');
  replace('             nativeMutationHold.quiesced=true;metrics.nativeMutationQuiescedAt=absoluteNow();','             nativeMutationHold.quiesced=true;metrics.nativeMutationQuiescedAt=absoluteNow();qaMutation(\'drained\',nativeMutationHold);');
  replace("             intentControl.port.postMessage({type:'intent-mutation-quiesced'","             qaMutation('ack-send',nativeMutationHold);intentControl.port.postMessage({type:'intent-mutation-quiesced'");
  replace("         if(message?.type==='IntentMutationRelease'){","         if(message?.type==='IntentMutationRelease'){qaMutation('release-received',message);");
  replace('           nativeMutationFloor=Math.max(nativeMutationFloor??0,hold.effectiveTime);nativeMutationHold=null;','           qaMutation(\'world-installed\',message);nativeMutationFloor=Math.max(nativeMutationFloor??0,hold.effectiveTime);nativeMutationHold=null;');
  replace('            metrics.nativeMutationReleasedAt=absoluteNow();','            metrics.nativeMutationReleasedAt=absoluteNow();qaMutation(\'released\',message);');
  replace("            if(hold.presentationMissed)draw('mutation-release');","            if(hold.presentationMissed){qaMutation('release-draw-start',message);draw('mutation-release');qaMutation('release-draw-end',message);}");
  replace('    previousOpportunityAt = at;',"    const qaOpportunity={ordinal:opportunityCursor,at,intervalMs:previousOpportunityAt===null?null:at-previousOpportunityAt,outcome,holdId,sequence:active?.sequence??null};metrics.qaPresentationOpportunities.push(qaOpportunity);performance.mark('native-presentation-opportunity',{detail:qaOpportunity});previousOpportunityAt = at;");
  replace('      previousFrameAt = startedAt;',"      performance.mark('native-submitted-draw',{detail:{...samples[(sampleCursor-1)%samples.length],ordinal:sampleCursor}});previousFrameAt = startedAt;");
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
 }else if(owner==='bridge'){
  source=marker+'\n'+source;
  replace('  const captureNativeRoutePresentation=handle=>{',"  const captureNativeRoutePresentation=handle=>{qaMutation('route-presentation-start');");
  replace('    const worldBoundary=copyNativeWorldBoundary(nativeWorldResourceBoundary()),rows=',"    qaMutation('route-presentation-samples');const worldBoundary=copyNativeWorldBoundary(nativeWorldResourceBoundary()),rows=");
  replace("    if(wasm.nav_gate_route_presentations_version?.()!==1)","    qaMutation('route-presentation-gates');if(wasm.nav_gate_route_presentations_version?.()!==1)");
  replace("    return Object.freeze({kind:'native-route-presentation',version:NATIVE_ROUTE_PRESENTATION_VERSION", "    qaMutation('route-presentation-return');return Object.freeze({kind:'native-route-presentation',version:NATIVE_ROUTE_PRESENTATION_VERSION");
  replace("    const status=call('_revalidate',ticket.session,ticket.ticket);", "    qaMutation('motion-revalidate-native');const status=call('_revalidate',ticket.session,ticket.ticket);qaMutation('motion-revalidate-native-return');");
  replace('      const proposal=captureNativeMotionProposal(nextTicket,mode),pointer=',"      qaMutation('motion-revalidate-capture');const proposal=captureNativeMotionProposal(nextTicket,mode),pointer=");
  replace("      return outcome('revalidated',{previousTicket,proposal,timeTranslation,requiresResourcePreparation:true});", "      qaMutation('motion-revalidate-return');return outcome('revalidated',{previousTicket,proposal,timeTranslation,requiresResourcePreparation:true});");
  const commit="      if(!current())return {status:-2};const status=wasm.nav_farm_arrival_route_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};mark();if(beginNativeRouteExecution().status!=='started')throw Error('Native farm arrival could not establish its execution boundary');projectNativeFarmArrivalRouteExecution(state,worker,{nativeFarmArrivalRouteExecution});";
  replace(commit,`      qaMutation('farm-current');if(!current())return {status:-2};
      qaMutation('farm-native-commit');const status=wasm.nav_farm_arrival_route_proposal_commit_bound(...boundary,preparedTicket);if(status!==1)return {status};
      qaMutation('farm-boundary');mark();qaMutation('farm-execution');if(beginNativeRouteExecution().status!=='started')throw Error('Native farm arrival could not establish its execution boundary');
      qaMutation('farm-projection');projectNativeFarmArrivalRouteExecution(state,worker,{nativeFarmArrivalRouteExecution});qaMutation('farm-binding');`);
  replace('),resources=copyNativeFarmArrivalRouteResources({version:1,kind:23,phase:',
   ");qaMutation('farm-resource-copy');const resources=copyNativeFarmArrivalRouteResources({version:1,kind:23,phase:");
  replace('});mark({resources,nativeRoute,nativeFarmArrivalBinding:binding});return',
   "});qaMutation('farm-resources-ready');mark({resources,nativeRoute,nativeFarmArrivalBinding:binding});qaMutation('farm-commit-return');return");
 }else throw Error('Unknown mutation observation owner');
 return source;
}
