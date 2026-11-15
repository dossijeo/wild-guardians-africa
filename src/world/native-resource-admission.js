import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';
import {nativeSuspendedBodiesFromProposal} from './native-suspended-body-reference.js';
import {nativeResourceAdmissionProfile} from './native-resource-admission-profiles.js';

// Shared vertical: stage -> prepare -> drain -> current native validation ->
// synchronous native commit -> retain -> publish/release. The bridge supplies
// its existing authority and protocol. This factory owns no world, clock,
// renderer, execution queue, retry loop or per-action state.
export function createNativeResourceAdmission({wasm,isReady,simulationTime,epoch,
  syncBoundaryTime,flushNativeIntentControl,nativeCausalClock,coversGpuConsumers,
  nativeWorldBoundary,commitWorldBoundary,captureWorldProposalResources,
  nativeSuspendedGateRoute,nativeRouteTiming,nativeTaskStartBinding,nativeTaskActionBinding,nativeTaskConsequenceBinding,nativeTaskSettlementBinding}){
  const native={nativeSuspendedGateRoute,nativeRouteTiming,nativeTaskStartBinding,nativeTaskActionBinding,nativeTaskConsequenceBinding,nativeTaskSettlementBinding};
  return async function commitNativeWorldProposal(getPublication,stage,commit,prepareResources=null,signal=null,protocol=null){
    const motion=nativeResourceAdmissionProfile(protocol?.motionKind),
      {reference:fromProposal,sameReference:sameTemplate,templateField,bindingField,releaseField}=motion;
    if(!isReady())throw Error('Reset the native intent session first');
    if(typeof getPublication!=='function')throw TypeError('Expected current native control publication');
    if(wasm.nav_intent_barrier_proposal_version?.()!==1)throw Error('Rebuild native world proposal service');
    const outcome=(status,extra={})=>({status,authorizedAutonomy:false,authorizedPassage:false,...extra}),
      owner=epoch();syncBoundaryTime();flushNativeIntentControl();
    const clock=nativeCausalClock(),source=getPublication(),control=source?.status?.();
    if(!source||typeof source.quiesceGpuForMutation!=='function'||typeof source.releaseGpuAfterMutation!=='function'||
       control?.closed||control?.authorityEpoch!==owner)return outcome('control-unavailable');
    if(!coversGpuConsumers(source))return outcome('control-consumers-mismatch');
    if(!clock||control.sentSequence!==clock.intentSequence||control.sentTime!==clock.committedThrough||
       control.clockSequence!==clock.clockSequence||simulationTime()!==clock.committedThrough)return outcome('control-boundary-mismatch');
    const result=stage();
    if(result!==1)return outcome(result===0?'blocked':result===-4?'busy':result===-2?'unsupported':'invalid');
    if((protocol?protocol.ticket():wasm.nav_intent_barrier_proposal_ticket())!==1)throw Error('Native mutation proposal lost its ticket');
    let [nativeSession,ticket,sequence,time,clockSequence]=Array.from(new Float64Array(wasm.memory.buffer,protocol?protocol.ticketPtr():wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
    const initialWorld=nativeWorldBoundary(),worldUnchanged=()=>initialWorld===null?nativeWorldBoundary()===null:sameNativeWorldBoundary(initialWorld,nativeWorldBoundary());let preparedMotionTemplate=null;
    let receipt=null,preparedResources=null,answer=outcome('control-failed'),physicalCommitted=false,commitAttempted=false,commitFailed=false,committedValue={},suspendedBodies=Object.freeze([]),motionReferences=Object.freeze([]),motionRoutes=Object.freeze([]);
    let stoppedCommit=null;const stopCommit=(status,extra={})=>{stoppedCommit=outcome(status,extra);throw stoppedCommit;};
    const preparationController=new AbortController(),abortPreparation=()=>preparationController.abort();signal?.addEventListener('abort',abortPreparation,{once:true});
    try{
      if(signal?.aborted)throw new DOMException('Native resource preparation cancelled','AbortError');
      if(prepareResources){
        const proposedWorldBoundary=copyNativeWorldBoundary({version:1,authorityEpoch:owner,nativeSession,ticket,effectiveTime:time}),
          resources=protocol?protocol.capture(proposedWorldBoundary):captureWorldProposalResources(proposedWorldBoundary);
        suspendedBodies=nativeSuspendedBodiesFromProposal(resources,proposedWorldBoundary);
        if(resources?.kind===motion.proposalKind)motionReferences=Object.freeze([fromProposal(resources)]);
        let stopWaiting;const interrupted=new Promise((resolve,reject)=>{stopWaiting=()=>reject(new DOMException('Native resource preparation cancelled','AbortError'));});interrupted.catch(()=>{});
        preparationController.signal.addEventListener('abort',stopWaiting,{once:true});
        const preparing=Promise.resolve().then(()=>prepareResources({proposedWorldBoundary,resources,signal:preparationController.signal,...(protocol?.deferred?{deferredStart:true}:{})})).then(handle=>{
          if(preparationController.signal.aborted){handle?.abort?.();throw new DOMException('Native resource preparation cancelled','AbortError');}return handle;
        });
        try{preparedResources=await Promise.race([preparing,interrupted]);}finally{preparationController.signal.removeEventListener('abort',stopWaiting);}
        if(!preparedResources||['valid','commit','abort'].some(key=>typeof preparedResources[key]!=='function')||preparedResources.valid()!==true)throw Error('Native resources were not prepared');
        if(protocol?.preparedFrameRequired&&!preparedResources.preparedWorldBoundary)throw Error('Native gate requires a retained prepared command packet');
        if(epoch()!==owner||getPublication()!==source||source.status().closed||!coversGpuConsumers(source))return outcome('control-replaced');
        if(protocol?.deferred){
          preparedMotionTemplate=motionReferences[0];
          if(!sameTemplate(preparedResources[templateField],preparedMotionTemplate))throw Error('Native resume lacks its retained deferred template');
          if(!worldUnchanged()||!protocol.retained(nativeSession,ticket))return outcome('stale');
        }else if((protocol?protocol.snapshot(nativeSession,ticket):wasm.spatial_world_proposal_resource_snapshot(nativeSession,ticket))!==1)return outcome('stale');
      }
      const preparedWorldBoundary=copyNativeWorldBoundary(preparedResources?.preparedWorldBoundary??null);
      if(preparedWorldBoundary&&(preparedWorldBoundary.authorityEpoch!==owner||preparedWorldBoundary.nativeSession!==nativeSession||preparedWorldBoundary.ticket!==ticket||preparedWorldBoundary.effectiveTime!==time))throw Error('Prepared command packet names a different native mutation');
      const quiescence=protocol?.deferred?source.status():{sentSequence:sequence,sentTime:time,clockSequence};
      receipt=await source.quiesceGpuForMutation(preparedWorldBoundary?{preparedWorldBoundary,...(preparedMotionTemplate?{[templateField]:preparedMotionTemplate}:{})}:undefined);const current=source.status();
      if(epoch()!==owner||getPublication()!==source||current.closed||current.session!==control.session||current.authorityEpoch!==owner||!coversGpuConsumers(source))
        answer=outcome('control-replaced');
      else if(receipt.authorityEpoch!==owner||receipt.session!==control.session||receipt.sequence!==quiescence.sentSequence||
         receipt.effectiveTime!==quiescence.sentTime||receipt.clockSequence!==quiescence.clockSequence||!Number.isSafeInteger(receipt.holdId)||receipt.holdId<1||
         preparedWorldBoundary&&(!sameNativeWorldBoundary(receipt.preparedWorldBoundary,preparedWorldBoundary)||!Number.isSafeInteger(receipt.preparedFrameSequence)||receipt.preparedFrameSequence<1)||
         motion.receiptCompatible&&motion.receiptCompatible(receipt,preparedMotionTemplate)!==true)
        answer=outcome('invalid-receipt');
      else{
        if(preparationController.signal.aborted||preparedResources&&preparedResources.valid()!==true)throw Error('Native prepared resources became stale');
        if(protocol?.deferred){
          if(!worldUnchanged())stopCommit('stale');
          // A clock can advance during the drain. A new intent transition may
          // require another actor's graphical resources and cannot borrow it.
          if(nativeCausalClock()?.intentSequence!==quiescence.sentSequence)stopCommit('resources-changed');
          const fresh=protocol.revalidate(nativeSession,ticket);
          if(fresh.status!=='revalidated')stopCommit(fresh.status);
          [nativeSession,ticket,sequence,time,clockSequence]=Array.from(new Float64Array(wasm.memory.buffer,protocol.ticketPtr(),6));
          if(!motion.compatible(fresh.timeTranslation))stopCommit('resources-changed',{timeTranslation:fresh.timeTranslation});
          motionReferences=Object.freeze([fromProposal(fresh.proposal)]);
        }
        commitAttempted=true;
        const committed=commit(value=>{physicalCommitted=true;committedValue=value??{};
          commitWorldBoundary(copyNativeWorldBoundary({version:1,authorityEpoch:owner,nativeSession,ticket,effectiveTime:time}));
        },nativeSession,ticket,sequence,time,clockSequence);
        if(committed.status===1&&!physicalCommitted)throw Error('Native mutation returned without a commit marker');
        if(committed.status===1)for(const reference of suspendedBodies){
          const actual=nativeSuspendedGateRoute(reference.nativeRoute.actorId),handle=actual?.resumeHandle,old=reference.nativeRoute.routeHandle;
          if(!actual||actual.actorId!==reference.nativeRoute.actorId||actual.bodyId!==reference.bodyId||actual.suspendedAt!==reference.suspendedAt||handle.authorityEpoch!==old.authorityEpoch||handle.session!==old.session||handle.slot!==old.slot||handle.generation!==reference.resumeGeneration)throw Error('Committed native body differs from its proposed suspension');
        }
        if(committed.status===1)motionRoutes=Object.freeze(motionReferences.map(reference=>
          motion.attest(native,reference,preparedMotionTemplate,protocol)));
        if(committed.status===1&&preparedResources&&preparedResources.commit({worldBoundary:nativeWorldBoundary(),resources:committed.value.resources,...(preparedMotionTemplate?{[bindingField]:motionRoutes[0]}:{})})!==true)throw Error('Native prepared resources were not retained for publication');
        answer=committed.status===1?outcome('committed',{...committed.value,receipt,worldBoundary:nativeWorldBoundary(),...(protocol?.deferred?{timeTranslation:protocol.timeTranslation()}:{})}):
          outcome(committed.status===-2?'stale':committed.status===-3?'invalid-receipt':committed.status===-6?'blocked':'stale');
      }
    }catch(error){commitFailed=commitAttempted;answer=stoppedCommit!==null&&error===stoppedCommit?stoppedCommit:outcome(physicalCommitted?'committed-control-failed':'control-failed',
      {...committedValue,error:String(error?.message??error)});}
    finally{
      signal?.removeEventListener('abort',abortPreparation);preparationController.abort();
      if(preparedResources)try{preparedResources.abort();}catch{}
      if(protocol){protocol.release(nativeSession,ticket);protocol.cancel(nativeSession,ticket);}
      else{wasm.spatial_world_proposal_resource_release?.(nativeSession,ticket);wasm.nav_intent_barrier_proposal_cancel(nativeSession,ticket);}
      if(commitFailed&&!source.status().closed)source.dispose('mutation-commit-failed');
      if(receipt&&!source.status().closed){
        try{
          // The commit may have revoked routes. Publish their exact sequence and
          // a same-time native watermark before releasing the GPU hold.
          flushNativeIntentControl();const latest=nativeCausalClock();
          if(!latest||wasm.nav_intent_clock_commit(latest.rate,latest.paused?1:0)<0)throw Error('Native clock cannot publish mutation boundary');
          flushNativeIntentControl();source.releaseGpuAfterMutation(receipt,{committed:physicalCommitted,
            ...(physicalCommitted?{worldBoundary:nativeWorldBoundary(),...(suspendedBodies.length?{nativeSuspendedBodies:suspendedBodies}:{}),...(motionRoutes.length?{[releaseField]:motionRoutes}:{})}:{})});
        }catch(error){source.dispose('mutation-release-failed');answer=outcome(physicalCommitted?'committed-control-failed':'control-failed',
          {...committedValue,error:String(error?.message??error)});}
      }
    }
    return answer;
  };
}
