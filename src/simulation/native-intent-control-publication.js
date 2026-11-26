import {copyNativeShieldCropExpiry,sameNativeShieldCropExpiry} from '../world/native-shield-world.js';
import {centerSource,sameCenter,verifiesCenter} from '../world/native-center-ruin-source.js';
import {nativeWorkerRouteRecoveryProfile} from '../world/native-worker-route-recovery.js';
import {copyNativeBarrierAdditionReference,sameNativeBarrierAdditionReference,copyNativeBarrierAdditionAttestation} from '../world/native-barrier-addition.js';
import {copyNativeTaskRouteStopAttestation,copyNativeTaskRouteStopReference,sameNativeTaskRouteStopReference} from '../world/native-task-route-stop.js';
import {copyNativeFarmArrivalStopReference,sameNativeFarmArrivalStopReference,copyNativeFarmArrivalStopAttestation} from '../world/native-farm-arrival-stop.js';
import {copyNativeIdleStrollStopReference,sameNativeIdleStrollStopReference,copyNativeIdleStrollStopAttestation} from '../world/native-idle-stroll-stop.js';
import {copyNativeIdleStrollReference,sameNativeIdleStrollReference,copyNativeIdleStrollAttestation} from '../world/native-idle-stroll.js';
import {copyNativeIdleCycleReference,sameNativeIdleCycleReference,copyNativeIdleCycleAttestation} from '../world/native-idle-cycle.js';
import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
import {copyNativeAnimalCropReference,copyNativeAnimalCropAttestation,sameNativeAnimalCropReference} from '../world/native-animal-crop-resource.js';
import {copyNativeFarmArrivalRouteReference,sameNativeFarmArrivalRouteReference,copyNativeFarmArrivalRouteAttestation} from '../world/native-farm-arrival-route.js';
import {copyNativeHomeRouteReference,sameNativeHomeRouteReference,copyNativeHomeRouteAttestation} from '../world/native-home-route.js';
import {copyNativeInitialIdleBodyReference,sameNativeInitialIdleBodyReference,copyNativeInitialIdleBodyAttestation} from '../world/native-initial-idle-body.js';
import {copyNativeTaskSettlementReference,sameNativeTaskSettlementReference,copyNativeTaskSettlementAttestation} from '../world/native-task-settlement.js';
import {copyNativeTaskConsequenceReference,sameNativeTaskConsequenceReference,copyNativeTaskConsequenceAttestation} from '../world/native-task-consequence.js';
import {copyNativeTaskStartReference,sameNativeTaskStartReference} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation} from '../world/native-task-start-attestation.js';
import {copyNativeTaskActionReference,sameNativeTaskActionReference} from '../world/native-task-action-presentation.js';
import {nativeTaskActionActor} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionAttestation} from '../world/native-task-action-attestation.js';
import {copyNativeResumeAttestation} from '../world/native-resume-attestation.js';
import {sameNativeResumeReference} from '../world/native-resume-reference.js';
// Direct authority -> draw transport for the existing native intent protocol.
// The native owner supplies the baseline/log; this sender keeps ACK cursors only.
import {copyNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';
export function createNativeIntentControlPublication({port,session,observe,
  controlOwner=null,onError=()=>{},timeoutMs=10000,absoluteNow=()=>performance.timeOrigin+performance.now()}={}){
  if(!port||typeof port.postMessage!=='function'||typeof observe!=='function'||
     typeof session!=='string'||!session||typeof onError!=='function'||
      !Number.isFinite(timeoutMs)||timeoutMs<=0||typeof absoluteNow!=='function')throw TypeError('Invalid native intent publication');
  if(controlOwner!==null&&(typeof controlOwner!=='object'||Array.isArray(controlOwner)))throw TypeError('Invalid native control owner');
  const publication={};
  let authorityEpoch=null,baselineSequence=null,sentSequence=0,sentTime=null,appliedSequence=null,
    stop=null,closed=false,fault=null,timer=null,resolveReady,rejectReady;
  let nextFence=0;const gpuFences=new Map();
  let nextMutationFence=0,mutationHold=null;
  let mutationOpportunityVersion=0,nextMutationOpportunity=0,mutationOpportunity=null;
  const consumerToken=crypto.randomUUID();
  let retirement=null,drained=false,consumerDrainReceipt=null,terminalWait=null;
  let worldBoundary=null,recoveryBaseline=null;
  let clock=null,appliedClockSequence=null,baselineClockSequence=null;const clockReceipts=new Map();
  function prepareClock(record,{baseline=false}={}){
    if(record?.protocolVersion!==2||record.clockVersion!==1||record.authorityEpoch!==authorityEpoch||record.intentSequence!==sentSequence||
       !Number.isSafeInteger(record.clockSequence)||record.clockSequence<1||clock&&!baseline&&record.clockSequence!==clock.clockSequence+1)
      throw Error('Native clock publication lost causal order');
    if(clockReceipts.size>=256)throw Error('Native causal clock acknowledgements stalled');
    const anchor=baseline||record.reanchor||!clock?
      {anchorLogicalTime:record.committedThrough,anchorAbsoluteMs:absoluteNow()}:
      {anchorLogicalTime:clock.anchorLogicalTime,anchorAbsoluteMs:clock.anchorAbsoluteMs};
    clock=Object.freeze({...record,...anchor});sentTime=record.committedThrough;
    clockReceipts.set(record.clockSequence,clock);return clock;
  }
  function acknowledgeClock(data){
    const expected=clockReceipts.get(data.clockSequence);
    if(!expected||data.accepted!==true||data.session!==session||data.authorityEpoch!==authorityEpoch||
       data.intentSequence!==expected.intentSequence||data.committedThrough!==expected.committedThrough||
       appliedClockSequence!==null&&data.clockSequence<=appliedClockSequence)throw Error('Invalid native causal clock acknowledgement');
    clockReceipts.delete(data.clockSequence);appliedClockSequence=data.clockSequence;
  }
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  ready.catch(()=>{});
  function dispose(reason='disposed'){
    if(closed)return;closed=true;clearTimeout(timer);stop?.();stop=null;
    if(terminalWait){clearTimeout(terminalWait.timer);if(consumerDrainReceipt)terminalWait.resolve(consumerDrainReceipt);
      else terminalWait.reject(Error('Direct consumer closed without a terminal receipt'));terminalWait=null;}
    for(const fence of gpuFences.values()){clearTimeout(fence.timer);fence.reject(Error('Native GPU fence closed: '+(fault??reason)));}
    gpuFences.clear();
    if(mutationOpportunity){clearTimeout(mutationOpportunity.timer);mutationOpportunity.cleanup();mutationOpportunity.reject(Error('Native mutation opportunity closed: '+(fault??reason)));mutationOpportunity=null;}
    if(mutationHold){clearTimeout(mutationHold.timer);mutationHold.reject(Error('Native mutation fence closed: '+(fault??reason)));mutationHold=null;}
    clockReceipts.clear();
    if(retirement){clearTimeout(retirement.timer);retirement.reject(Error('Native GPU retirement closed: '+(fault??reason)));}
    try{if(authorityEpoch)port.postMessage({type:'IntentControlClosed',protocolVersion:2,
      session,authorityEpoch,sequence:sentSequence,reason});}catch{}
    port.onmessage=null;port.onmessageerror=null;port.close?.();
    rejectReady(Error('Native intent control closed: '+reason));
  }
  function fail(error){
    if(closed)return;fault=String(error?.message??error);
    rejectReady(error instanceof Error?error:Error(fault));dispose('failed');
    try{onError(error instanceof Error?error:Error(fault));}catch{}
  }
  port.onmessage=({data})=>{
    if(closed)return;
    if(data?.type==='intent-mutation-opportunity'){
      const pending=mutationOpportunity;
      if(!pending||data.protocolVersion!==2||data.opportunityVersion!==1||data.session!==session||
         data.authorityEpoch!==authorityEpoch||data.consumerToken!==consumerToken||data.opportunityId!==pending.id||
         !(data.accepted===true||data.accepted===false&&(data.reason==='prepared-frame-unavailable'||data.reason==='request-cancelled'&&pending.cancelled))){
        fail(Error('Invalid native mutation opportunity notification'));return;
      }
      mutationOpportunity=null;clearTimeout(pending.timer);pending.cleanup();
      if(pending.cancelled)pending.reject(new DOMException('Native mutation opportunity cancelled','AbortError'));
      else if(data.accepted)pending.resolve();else pending.reject(Error('Native mutation prepared frame unavailable'));
      return;
    }
    if(data?.type==='intent-control-drained'){
      const pending=retirement;
      if(!pending||data.accepted!==true||data.protocolVersion!==2||data.fenceVersion!==1||
         data.session!==session||data.authorityEpoch!==authorityEpoch||data.retirementId!==pending.id||
         data.sequence!==pending.sequence||data.effectiveTime!==pending.time||data.clockSequence!==pending.clockSequence){
        fail(Error('Invalid native GPU retirement acknowledgement'));return;
      }
      clearTimeout(pending.timer);drained=true;
      pending.resolve(Object.freeze({authorityEpoch,session,retirementId:pending.id,sequence:pending.sequence,
        effectiveTime:pending.time,...(pending.clockSequence===undefined?{}:{clockSequence:pending.clockSequence})}));
      dispose(pending.reason);return;
    }
    if(data?.type==='intent-clock-applied'){
      try{acknowledgeClock(data);}catch(error){fail(error);}return;
    }
    if(data?.type==='intent-control-retired'&&data.session===session&&
       data.authorityEpoch===authorityEpoch){
      if(data.protocolVersion!==2||data.consumerToken!==consumerToken||data.drained!==true){
        fail(Error('Native GPU retirement lacks a connection-bound drain receipt'));return;
      }
      consumerDrainReceipt=Object.freeze({type:data.type,protocolVersion:2,session,authorityEpoch,consumerToken,sequence:data.sequence,drained:true});
      drained=true;
      if(retirement)retirement.resolve(Object.freeze({authorityEpoch,session,retirementId:retirement.id,
        sequence:retirement.sequence,effectiveTime:retirement.time,clockSequence:retirement.clockSequence}));
      dispose('consumer-retired');return;
    }
    if(data?.type==='intent-mutation-quiesced'){
      const hold=mutationHold;
      const barrier=hold?.preparedBarrierAdditionTemplate,invalidBarrierReceipt=barrier?data.nativeBarrierAdditionVersion!==1||!sameNativeBarrierAdditionReference(data.preparedBarrierAdditionTemplate,barrier)||Object.keys(data).some(key=>key.startsWith('prepared')&&key.endsWith('Template')&&key!=='preparedBarrierAdditionTemplate'&&data[key]!==undefined):data.preparedBarrierAdditionTemplate!==undefined||data.nativeBarrierAdditionVersion!==undefined;
      const taskStop=hold?.preparedTaskRouteStopTemplate,invalidTaskReceipt=taskStop?
        data.nativeTaskRouteStopVersion!==1||!sameNativeTaskRouteStopReference(data.preparedTaskRouteStopTemplate,taskStop)||
        Object.keys(data).some(key=>key.startsWith('prepared')&&key.endsWith('Template')&&key!=='preparedTaskRouteStopTemplate'&&data[key]!==undefined):
        data.preparedTaskRouteStopTemplate!==undefined||data.nativeTaskRouteStopVersion!==undefined;
      if(!hold||!!hold.preparedCenterRuin!==!!data.preparedCenterRuin||
         !!hold.preparedShieldCropExpiry!==!!data.preparedShieldCropExpiry||hold.preparedShieldCropExpiry&&!sameNativeShieldCropExpiry(hold.preparedShieldCropExpiry,data.preparedShieldCropExpiry)||
         hold.preparedCenterRuin&&!sameCenter(hold.preparedCenterRuin,data.preparedCenterRuin)||invalidBarrierReceipt||invalidTaskReceipt||hold.receipt||data.session!==session||data.authorityEpoch!==authorityEpoch||data.fenceVersion!==1||
         data.accepted!==true||data.holdId!==hold.holdId||data.sequence!==hold.sequence||
         data.effectiveTime!==hold.effectiveTime||data.clockSequence!==hold.clockSequence||hold.preparedTaskStartTemplate&&(data.nativeTaskStartVersion!==1||!sameNativeTaskStartReference(data.preparedTaskStartTemplate,hold.preparedTaskStartTemplate))||hold.preparedAnimalCropRouteTemplate&&(data.nativeAnimalCropRouteVersion!==1||!sameNativeAnimalCropReference(data.preparedAnimalCropRouteTemplate,hold.preparedAnimalCropRouteTemplate))||(!hold.preparedAnimalCropRouteTemplate&&(data.preparedAnimalCropRouteTemplate!==undefined||data.nativeAnimalCropRouteVersion!==undefined))||hold.preparedAnimalCropStrikeTemplate&&(data.nativeAnimalCropStrikeVersion!==1||!sameNativeAnimalCropReference(data.preparedAnimalCropStrikeTemplate,hold.preparedAnimalCropStrikeTemplate))||(!hold.preparedAnimalCropStrikeTemplate&&(data.preparedAnimalCropStrikeTemplate!==undefined||data.nativeAnimalCropStrikeVersion!==undefined))||hold.preparedFarmArrivalTemplate&&(data.nativeFarmArrivalVersion!==1||!sameNativeFarmArrivalRouteReference(data.preparedFarmArrivalTemplate,hold.preparedFarmArrivalTemplate))||hold.preparedHomeArrivalTemplate&&(data.nativeHomeArrivalVersion!==1||!sameNativeHomeArrivalReference(data.preparedHomeArrivalTemplate,hold.preparedHomeArrivalTemplate))||hold.preparedIdleStrollStopTemplate&&(data.nativeIdleStrollStopVersion!==1||!sameNativeIdleStrollStopReference(data.preparedIdleStrollStopTemplate,hold.preparedIdleStrollStopTemplate))||hold.preparedFarmArrivalStopTemplate&&(data.nativeFarmArrivalStopVersion!==1||!sameNativeFarmArrivalStopReference(data.preparedFarmArrivalStopTemplate,hold.preparedFarmArrivalStopTemplate))||hold.preparedIdleStrollTemplate&&(data.nativeIdleStrollVersion!==1||!sameNativeIdleStrollReference(data.preparedIdleStrollTemplate,hold.preparedIdleStrollTemplate))||hold.preparedHomeRouteTemplate&&(data.nativeHomeRouteVersion!==1||!sameNativeHomeRouteReference(data.preparedHomeRouteTemplate,hold.preparedHomeRouteTemplate))||hold.preparedInitialIdleBodyTemplate&&(data.nativeInitialIdleBodyVersion!==1||!sameNativeInitialIdleBodyReference(data.preparedInitialIdleBodyTemplate,hold.preparedInitialIdleBodyTemplate))||hold.preparedIdleCycleTemplate&&(data.nativeIdleCycleVersion!==1||!sameNativeIdleCycleReference(data.preparedIdleCycleTemplate,hold.preparedIdleCycleTemplate))||hold.preparedTaskSettlementTemplate&&(data.nativeTaskSettlementVersion!==1||!sameNativeTaskSettlementReference(data.preparedTaskSettlementTemplate,hold.preparedTaskSettlementTemplate))||hold.preparedTaskConsequenceTemplate&&(data.nativeTaskConsequenceVersion!==1||!sameNativeTaskConsequenceReference(data.preparedTaskConsequenceTemplate,hold.preparedTaskConsequenceTemplate))||hold.preparedWorldBoundary&&(!sameNativeWorldBoundary(data.preparedWorldBoundary,hold.preparedWorldBoundary)||!Number.isSafeInteger(data.preparedFrameSequence)||data.preparedFrameSequence<1)){
        fail(Error('Invalid native mutation fence acknowledgement'));return;
      }
      hold.receipt=Object.freeze({authorityEpoch,session,holdId:hold.holdId,sequence:hold.sequence,
        effectiveTime:hold.effectiveTime,clockSequence:hold.clockSequence,...(hold.preparedShieldCropExpiry?{preparedShieldCropExpiry:hold.preparedShieldCropExpiry}:{}),...(barrier?{nativeBarrierAdditionVersion:1,preparedBarrierAdditionTemplate:barrier}:{}),...(hold.preparedTaskStartTemplate?{nativeTaskStartVersion:data.nativeTaskStartVersion,preparedTaskStartTemplate:hold.preparedTaskStartTemplate}:{}),...(hold.preparedHomeArrivalTemplate?{nativeHomeArrivalVersion:data.nativeHomeArrivalVersion,preparedHomeArrivalTemplate:hold.preparedHomeArrivalTemplate}:{}),...(hold.preparedIdleStrollStopTemplate?{nativeIdleStrollStopVersion:data.nativeIdleStrollStopVersion,preparedIdleStrollStopTemplate:hold.preparedIdleStrollStopTemplate}:{}),...(taskStop?{nativeTaskRouteStopVersion:1,preparedTaskRouteStopTemplate:taskStop}:{}),...(hold.preparedFarmArrivalStopTemplate?{nativeFarmArrivalStopVersion:data.nativeFarmArrivalStopVersion,preparedFarmArrivalStopTemplate:hold.preparedFarmArrivalStopTemplate}:{}),...(hold.preparedIdleStrollTemplate?{nativeIdleStrollVersion:data.nativeIdleStrollVersion,preparedIdleStrollTemplate:hold.preparedIdleStrollTemplate}:{}),...(hold.preparedAnimalCropRouteTemplate?{nativeAnimalCropRouteVersion:1,preparedAnimalCropRouteTemplate:hold.preparedAnimalCropRouteTemplate}:{}),...(hold.preparedAnimalCropStrikeTemplate?{nativeAnimalCropStrikeVersion:1,preparedAnimalCropStrikeTemplate:hold.preparedAnimalCropStrikeTemplate}:{}),...(hold.preparedFarmArrivalTemplate?{nativeFarmArrivalVersion:data.nativeFarmArrivalVersion,preparedFarmArrivalTemplate:hold.preparedFarmArrivalTemplate}:{}),...(hold.preparedHomeRouteTemplate?{nativeHomeRouteVersion:data.nativeHomeRouteVersion,preparedHomeRouteTemplate:hold.preparedHomeRouteTemplate}:{}),...(hold.preparedInitialIdleBodyTemplate?{nativeInitialIdleBodyVersion:data.nativeInitialIdleBodyVersion,preparedInitialIdleBodyTemplate:hold.preparedInitialIdleBodyTemplate}:{}),...(hold.preparedIdleCycleTemplate?{nativeIdleCycleVersion:data.nativeIdleCycleVersion,preparedIdleCycleTemplate:hold.preparedIdleCycleTemplate}:{}),...(hold.preparedTaskSettlementTemplate?{nativeTaskSettlementVersion:data.nativeTaskSettlementVersion,preparedTaskSettlementTemplate:hold.preparedTaskSettlementTemplate}:{}),...(hold.preparedTaskConsequenceTemplate?{nativeTaskConsequenceVersion:1,preparedTaskConsequenceTemplate:hold.preparedTaskConsequenceTemplate}:{}),...(hold.preparedWorldBoundary?{preparedWorldBoundary:hold.preparedWorldBoundary,preparedFrameSequence:data.preparedFrameSequence}:{})});hold.resolve(hold.receipt);return;
    }
    if(data?.type==='intent-control-fenced'){
      const fence=gpuFences.get(data.fenceId);
      if(!fence||data.session!==session||data.authorityEpoch!==authorityEpoch||
          data.fenceVersion!==1||data.accepted!==true||data.sequence!==fence.sequence||data.effectiveTime!==fence.effectiveTime||
          data.clockSequence!==fence.clockSequence){
        fail(Error('Invalid native GPU fence acknowledgement'));return;
      }
      const draw=data.recoveredSubmission;
      const recoveryProfile=draw&&recoveryBaseline?nativeWorkerRouteRecoveryProfile(recoveryBaseline.kind):null;
      if(draw&&(!recoveryProfile||draw.holdId!==recoveryBaseline.holdId||draw.consumerToken!==consumerToken||
         draw.kind!==recoveryProfile.kind||
         draw.assignmentSequence!==recoveryBaseline.proof.assignmentSequence||!Number.isSafeInteger(draw.frameSequence)||draw.frameSequence<1||
         !recoveryProfile.sameReference(draw[recoveryProfile.clockField],recoveryBaseline.proof.reference)||draw.elapsed!==fence.effectiveTime||
         !Number.isFinite(draw.relativeTime)||draw.relativeTime<0||
         (recoveryBaseline.proof.gateIds.length===1?
           draw.nativeGate?.gateId!==recoveryBaseline.proof.gateIds[0]||
           !sameNativeWorldBoundary(draw.nativeGate.worldBoundary,recoveryBaseline.proof.reference.worldBoundary)||
           draw.gateElapsed!==recoveryBaseline.proof.reference.worldBoundary.effectiveTime+draw.relativeTime:
           draw.nativeGate!==undefined||draw.gateElapsed!==undefined))){
        fail(Error('Invalid recovered frame at native fence'));return;
      }
      gpuFences.delete(data.fenceId);clearTimeout(fence.timer);
       fence.resolve({...(draw?{recoveredSubmission:draw}:{}),authorityEpoch,sequence:fence.sequence,effectiveTime:fence.effectiveTime,fenceId:data.fenceId,
         ...(fence.clockSequence===undefined?{}:{clockSequence:fence.clockSequence})});return;
    }
    if(data?.type!=='intent-control-applied'||data.session!==session||
       data.authorityEpoch!==authorityEpoch||data.accepted!==true||
       !Number.isSafeInteger(data.sequence)||data.sequence<baselineSequence||
       data.sequence>sentSequence||appliedSequence!==null&&data.sequence<appliedSequence){
      fail(Error('Invalid native intent control acknowledgement'));return;
    }
    if(data.mutationOpportunityVersion!==undefined){
      if(appliedSequence!==null||data.mutationOpportunityVersion!==1||data.consumerToken!==consumerToken){fail(Error('Invalid native mutation opportunity negotiation'));return;}
      mutationOpportunityVersion=1;
    }
    appliedSequence=data.sequence;clearTimeout(timer);
    if(baselineClockSequence!==null&&appliedClockSequence===null){
      try{if(data.clockSequence!==baselineClockSequence)throw Error('Native causal clock bootstrap was not applied');
         acknowledgeClock({...data,intentSequence:data.clockIntentSequence,committedThrough:data.clockCommittedThrough});
      }catch(error){fail(error);return;}
    }
    resolveReady({authorityEpoch,sequence:appliedSequence});
  };
  port.onmessageerror=()=>fail(Error('Native intent control transfer failed'));
  port.start?.();
  timer=setTimeout(()=>fail(Error('Native intent control bootstrap timed out')),timeoutMs);
  try{
    stop=observe({
      gpuConsumer:{publication,owner:controlOwner??publication},
      onBaseline(baseline){
        if(authorityEpoch!==null)throw Error('Native intent baseline repeated');
        authorityEpoch=baseline.authorityEpoch;baselineSequence=sentSequence=baseline.sequence;sentTime=baseline.effectiveTime;
        worldBoundary=copyNativeWorldBoundary(baseline.worldBoundary??null);
        if(worldBoundary&&worldBoundary.authorityEpoch!==authorityEpoch)throw Error('Native world baseline belongs to another authority');
        const initial=baseline.clock?prepareClock(baseline.clock,{baseline:true}):null;
        if(worldBoundary&&(!initial||worldBoundary.nativeSession!==initial.nativeSession||worldBoundary.effectiveTime>initial.committedThrough))
          throw Error('Native world resources precede their causal baseline');
        baselineClockSequence=initial?.clockSequence??null;recoveryBaseline=baseline.recoveredWorkerRoute??null;
        port.postMessage({...baseline,...(baseline.recoveredWorkerRoute?{recoveredWorkerRoute:{...baseline.recoveredWorkerRoute,consumerToken}}:{}),...(initial?{clock:initial}:{}),worldBoundary,worldBoundaryVersion:1,mutationOpportunityVersion:1,session,consumerToken});
      },
      onClock(record){
        if(closed||retirement)return;
        // An already-live legacy consumer may have presented an unbounded
        // producer clock. Never pretend a late upgrade retroactively fenced it.
        // Causal mode requires a fresh, clock-aware baseline handshake.
        if(!clock){fail(Error('Native causal clock requires a fresh clock-aware bootstrap'));return;}
        const permit=prepareClock(record);
        port.postMessage({type:'IntentClock',...permit,session});
      },
      onChanges(changes){
        if(closed||retirement)return;
        for(const event of changes){
          if(event.authorityEpoch!==authorityEpoch||event.sequence!==sentSequence+1)
            throw Error('Native intent publication lost causal order');
          sentSequence=event.sequence;sentTime=event.effectiveTime;port.postMessage({...event,session});
        }
      },
      onClosed(reason){if(reason instanceof Error)fail(reason);else dispose(reason);},
    });
  }catch(error){fail(error);throw error;}
  function fenceGpu(){
    // Receipt only: the caller still needs an authoritative pending mutation,
    // clock ordering and all live consumers before committing physical effects.
    if(closed||retirement||appliedSequence===null||mutationHold||mutationOpportunity)return Promise.reject(Error('Native GPU fence connection is not ready'));
    if(gpuFences.size>=64)return Promise.reject(Error('Too many pending native GPU fences'));
    if(!Number.isSafeInteger(nextFence+1))return Promise.reject(Error('Native GPU fence identity exhausted'));
    const fenceId=++nextFence,sequence=sentSequence,effectiveTime=sentTime;
    return new Promise((resolve,reject)=>{
      const fence={sequence,effectiveTime,clockSequence:clock?.clockSequence,resolve,reject,timer:setTimeout(()=>fail(Error('Native GPU fence timed out')),timeoutMs)};
      gpuFences.set(fenceId,fence);
      try{port.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,
         session,authorityEpoch,sequence,effectiveTime,fenceId,...(clock?{clockSequence:clock.clockSequence}:{})});}catch(error){fail(error);}
    });
  }
  function waitForMutationOpportunity({preparedWorldBoundary=null,signal=null}={}){
    if(signal?.aborted)return Promise.reject(new DOMException('Native mutation opportunity cancelled','AbortError'));
    if(closed||retirement||appliedSequence===null||!clock)return Promise.reject(Error('Native mutation opportunity connection is not ready'));
    if(mutationOpportunity||mutationHold||gpuFences.size)return Promise.reject(Error('Native mutation opportunity boundary is busy'));
    preparedWorldBoundary=copyNativeWorldBoundary(preparedWorldBoundary);
    if(preparedWorldBoundary&&(preparedWorldBoundary.authorityEpoch!==authorityEpoch||preparedWorldBoundary.nativeSession!==clock.nativeSession))throw Error('Invalid native mutation opportunity preparation');
    // Legacy peers retain their original safety protocol. This versioned
    // notification does not claim to improve their presentation scheduling.
    if(mutationOpportunityVersion!==1)return Promise.resolve();
    return requestMutationOpportunity(preparedWorldBoundary,signal);
  }
  function requestMutationOpportunity(preparedWorldBoundary,signal){
    if(!Number.isSafeInteger(nextMutationOpportunity+1))return Promise.reject(Error('Native mutation opportunity identity exhausted'));
    const id=++nextMutationOpportunity;
    return new Promise((resolve,reject)=>{
      const abort=()=>{
        if(mutationOpportunity?.id!==id)return;mutationOpportunity.cancelled=true;
        try{port.postMessage({type:'IntentMutationOpportunityCancel',protocolVersion:2,opportunityVersion:1,
          session,authorityEpoch,consumerToken,opportunityId:id});}catch(error){fail(error);}
      };
      mutationOpportunity={id,resolve,reject,cancelled:false,cleanup:()=>signal?.removeEventListener('abort',abort),timer:setTimeout(()=>fail(Error('Native mutation opportunity timed out')),timeoutMs)};
      signal?.addEventListener('abort',abort,{once:true});
      try{port.postMessage({type:'IntentMutationOpportunity',protocolVersion:2,opportunityVersion:1,
        session,authorityEpoch,consumerToken,opportunityId:id,...(preparedWorldBoundary?{preparedWorldBoundary}:{})});}catch(error){fail(error);}
    });
  }
  function quiesceGpuForMutation({preparedShieldCropExpiry=null,preparedCenterRuin=null,preparedAnimalCropRouteTemplate=null,preparedAnimalCropStrikeTemplate=null,signal=null,preparedWorldBoundary=null,preparedBarrierAdditionTemplate=null,preparedResumeTemplate=null,preparedTaskStartTemplate=null,preparedTaskActionTemplate=null,preparedTaskConsequenceTemplate=null,preparedTaskSettlementTemplate=null,preparedInitialIdleBodyTemplate=null,preparedIdleCycleTemplate=null,preparedIdleStrollStopTemplate=null,preparedFarmArrivalStopTemplate=null,preparedTaskRouteStopTemplate=null,preparedIdleStrollTemplate=null,preparedHomeRouteTemplate=null,preparedFarmArrivalTemplate=null,preparedHomeArrivalTemplate=null}={}){
    if(signal?.aborted)return Promise.reject(new DOMException('Native mutation opportunity cancelled','AbortError'));
    if(closed||retirement||appliedSequence===null||!clock||clock.intentSequence!==sentSequence||clock.committedThrough!==sentTime)
      return Promise.reject(Error('Native causal mutation boundary is not ready'));
    if(mutationHold||mutationOpportunity||gpuFences.size)return Promise.reject(Error('Native GPU mutation boundary is busy'));
    if(!Number.isSafeInteger(nextMutationFence+1))return Promise.reject(Error('Native mutation fence identity exhausted'));
    if([preparedShieldCropExpiry,preparedCenterRuin,preparedAnimalCropRouteTemplate,preparedAnimalCropStrikeTemplate,preparedBarrierAdditionTemplate,preparedResumeTemplate,preparedTaskStartTemplate,preparedTaskActionTemplate,preparedTaskConsequenceTemplate,preparedTaskSettlementTemplate,preparedInitialIdleBodyTemplate,preparedIdleCycleTemplate,preparedIdleStrollStopTemplate,preparedFarmArrivalStopTemplate,preparedTaskRouteStopTemplate,preparedIdleStrollTemplate,preparedHomeRouteTemplate,preparedFarmArrivalTemplate,preparedHomeArrivalTemplate].filter(Boolean).length>1)throw Error('Conflicting native prepared templates');
    if(preparedBarrierAdditionTemplate){preparedBarrierAdditionTemplate=copyNativeBarrierAdditionReference(preparedBarrierAdditionTemplate);if(!preparedWorldBoundary||!sameNativeWorldBoundary(preparedBarrierAdditionTemplate.worldBoundary,preparedWorldBoundary)||preparedBarrierAdditionTemplate.sourceControlSequence!==sentSequence)throw Error('Native solid additions require their prepared packet and clock');}
    if(preparedHomeArrivalTemplate){preparedHomeArrivalTemplate=copyNativeHomeArrivalReference(preparedHomeArrivalTemplate);if(!preparedWorldBoundary)throw Error('Native Home arrival requires a prepared packet');}
    if(preparedAnimalCropRouteTemplate)preparedAnimalCropRouteTemplate=copyNativeAnimalCropReference(preparedAnimalCropRouteTemplate,26);
    if(preparedAnimalCropStrikeTemplate)preparedAnimalCropStrikeTemplate=copyNativeAnimalCropReference(preparedAnimalCropStrikeTemplate,27);
    if(preparedFarmArrivalTemplate){preparedFarmArrivalTemplate=copyNativeFarmArrivalRouteReference(preparedFarmArrivalTemplate);if(!preparedWorldBoundary)throw Error('Native farm arrival requires a prepared packet');}
    if(preparedHomeRouteTemplate){preparedHomeRouteTemplate=copyNativeHomeRouteReference(preparedHomeRouteTemplate);if(!preparedWorldBoundary)throw Error('Native Home requires a prepared packet');}
    if(preparedIdleStrollStopTemplate){preparedIdleStrollStopTemplate=copyNativeIdleStrollStopReference(preparedIdleStrollStopTemplate);if(!preparedWorldBoundary||preparedIdleStrollStopTemplate.routes.some(owner=>owner.nativeRoute.assignmentSequence>sentSequence))throw Error('Native moving stop requires its prepared packet and issued source');}
    if(preparedTaskRouteStopTemplate){
      preparedTaskRouteStopTemplate=copyNativeTaskRouteStopReference(preparedTaskRouteStopTemplate);
      if(!preparedWorldBoundary||preparedTaskRouteStopTemplate.routes.some(owner=>owner.nativeRoute.assignmentSequence>sentSequence))throw Error('Native task route stop requires its prepared packet and issued source');
    }
    if(preparedFarmArrivalStopTemplate){preparedFarmArrivalStopTemplate=copyNativeFarmArrivalStopReference(preparedFarmArrivalStopTemplate);if(!preparedWorldBoundary||preparedFarmArrivalStopTemplate.routes.some(owner=>owner.nativeRoute.assignmentSequence>sentSequence))throw Error('Native farm arrival stop requires its prepared packet and issued source');}
    if(preparedIdleStrollTemplate){preparedIdleStrollTemplate=copyNativeIdleStrollReference(preparedIdleStrollTemplate);if(!preparedWorldBoundary)throw Error('Native Idle stroll requires a prepared packet');}
    if(preparedInitialIdleBodyTemplate){preparedInitialIdleBodyTemplate=copyNativeInitialIdleBodyReference(preparedInitialIdleBodyTemplate);if(!preparedWorldBoundary)throw Error('Native initial Idle body requires a prepared packet');}
    if(preparedIdleCycleTemplate){preparedIdleCycleTemplate=copyNativeIdleCycleReference(preparedIdleCycleTemplate);if(!preparedWorldBoundary)throw Error('Native Idle cycle requires a prepared packet');}
    if(preparedTaskSettlementTemplate){preparedTaskSettlementTemplate=copyNativeTaskSettlementReference(preparedTaskSettlementTemplate);if(!preparedWorldBoundary)throw Error('Native settlement requires a prepared packet');}
    if(preparedTaskConsequenceTemplate){preparedTaskConsequenceTemplate=copyNativeTaskConsequenceReference(preparedTaskConsequenceTemplate);if(!preparedWorldBoundary)throw Error('Native consequence requires a prepared packet');}
    if(preparedTaskActionTemplate){preparedTaskActionTemplate=copyNativeTaskActionReference(preparedTaskActionTemplate);if(!preparedWorldBoundary)throw Error('Native action requires a prepared packet');}
    if(preparedTaskStartTemplate){preparedTaskStartTemplate=copyNativeTaskStartReference(preparedTaskStartTemplate);if(preparedResumeTemplate||!preparedWorldBoundary)throw Error('First task requires its own prepared packet');}
    if(preparedResumeTemplate){preparedResumeTemplate=copyNativeResumeReference(preparedResumeTemplate);if(!preparedWorldBoundary)throw Error('Deferred resume requires a prepared packet');}
    const preparedTemplate=preparedAnimalCropRouteTemplate??preparedAnimalCropStrikeTemplate??preparedBarrierAdditionTemplate??preparedResumeTemplate??preparedTaskStartTemplate??preparedTaskActionTemplate??preparedTaskConsequenceTemplate??preparedTaskSettlementTemplate??preparedInitialIdleBodyTemplate??preparedIdleCycleTemplate??preparedIdleStrollStopTemplate??preparedFarmArrivalStopTemplate??preparedTaskRouteStopTemplate??preparedIdleStrollTemplate??preparedHomeRouteTemplate??preparedFarmArrivalTemplate??preparedHomeArrivalTemplate;
    if(preparedWorldBoundary){
      preparedWorldBoundary=copyNativeWorldBoundary(preparedWorldBoundary);
      if(!preparedWorldBoundary||preparedWorldBoundary.authorityEpoch!==authorityEpoch||preparedWorldBoundary.nativeSession!==clock.nativeSession||
         (preparedTemplate?preparedWorldBoundary.effectiveTime>sentTime||!sameNativeWorldBoundary(preparedTemplate.worldBoundary,preparedWorldBoundary)||preparedTemplate.sourceControlSequence>sentSequence:preparedWorldBoundary.effectiveTime!==sentTime))throw Error('Invalid prepared native mutation boundary');
    }
    if(preparedCenterRuin){
      preparedCenterRuin=centerSource(preparedCenterRuin);
      if(preparedTemplate||!sameNativeWorldBoundary(preparedCenterRuin.previous,worldBoundary)||
         !sameNativeWorldBoundary(preparedCenterRuin.boundary,preparedWorldBoundary)||
         preparedCenterRuin.initialClock!==clock.clockSequence||preparedCenterRuin.intent!==sentSequence)
        throw Error('Center ruin differs from current control');
    }
    if(preparedShieldCropExpiry){
      preparedShieldCropExpiry=copyNativeShieldCropExpiry(preparedShieldCropExpiry);
      if(!sameNativeWorldBoundary(preparedShieldCropExpiry.worldBoundary,preparedWorldBoundary)||
         preparedShieldCropExpiry.requestSequence!==sentSequence)throw Error('Shield expiry differs from the pending crop successor');
    }
    const holdId=++nextMutationFence,sequence=sentSequence,effectiveTime=sentTime,clockSequence=clock.clockSequence;
    return new Promise((resolve,reject)=>{
      mutationHold={holdId,sequence,preparedShieldCropExpiry,preparedCenterRuin,effectiveTime,clockSequence,preparedWorldBoundary,preparedAnimalCropRouteTemplate,preparedAnimalCropStrikeTemplate,preparedBarrierAdditionTemplate,preparedResumeTemplate,preparedTaskStartTemplate,preparedTaskActionTemplate,preparedTaskConsequenceTemplate,preparedTaskSettlementTemplate,preparedInitialIdleBodyTemplate,preparedIdleCycleTemplate,preparedIdleStrollStopTemplate,preparedFarmArrivalStopTemplate,preparedTaskRouteStopTemplate,preparedIdleStrollTemplate,preparedHomeRouteTemplate,preparedFarmArrivalTemplate,preparedHomeArrivalTemplate,resolve,reject,receipt:null,
        timer:setTimeout(()=>fail(Error('Native mutation fence timed out')),timeoutMs)};
      try{port.postMessage({type:'IntentMutationQuiesce',...(preparedShieldCropExpiry?{preparedShieldCropExpiry}:{}),...(preparedCenterRuin?{preparedCenterRuin}:{}),protocolVersion:2,fenceVersion:1,
        session,authorityEpoch,holdId,sequence,effectiveTime,clockSequence,...(preparedWorldBoundary?{preparedWorldBoundary}:{}),...(preparedBarrierAdditionTemplate?{preparedBarrierAdditionTemplate}:{}),...(preparedResumeTemplate?{preparedResumeTemplate}:{}),...(preparedTaskStartTemplate?{preparedTaskStartTemplate}:{}),...(preparedTaskActionTemplate?{preparedTaskActionTemplate}:{}),...(preparedTaskConsequenceTemplate?{preparedTaskConsequenceTemplate}:{}),...(preparedInitialIdleBodyTemplate?{preparedInitialIdleBodyTemplate}:{}),...(preparedIdleCycleTemplate?{preparedIdleCycleTemplate}:{}),...(preparedTaskSettlementTemplate?{preparedTaskSettlementTemplate}:{}),...(preparedIdleStrollStopTemplate?{preparedIdleStrollStopTemplate}:{}),...(preparedFarmArrivalStopTemplate?{preparedFarmArrivalStopTemplate}:{}),...(preparedTaskRouteStopTemplate?{preparedTaskRouteStopTemplate}:{}),...(preparedIdleStrollTemplate?{preparedIdleStrollTemplate}:{}),...(preparedHomeRouteTemplate?{preparedHomeRouteTemplate}:{}),...(preparedAnimalCropRouteTemplate?{preparedAnimalCropRouteTemplate}:{}),...(preparedAnimalCropStrikeTemplate?{preparedAnimalCropStrikeTemplate}:{}),...(preparedFarmArrivalTemplate?{preparedFarmArrivalTemplate}:{}),...(preparedHomeArrivalTemplate?{preparedHomeArrivalTemplate}:{})});}catch(error){fail(error);}
    });
  }
  function releaseGpuAfterMutation(receipt,{acquiredCenterRuin=null,committed=false,worldBoundary:nextBoundary=null,nativeBarrierAdditions=[],nativeSuspendedBodies=[],nativeResumedRoutes=[],nativeStartedRoutes=[],nativeActions=[],nativeConsequences=[],nativeSettlements=[],nativeInitialIdleBodies=[],nativeIdleCycles=[],nativeStrollStops=[],nativeFarmArrivalStops=[],nativeTaskRouteStops=[],nativeStrolls=[],nativeHomes=[],nativeAnimalCropRoutes=[],nativeAnimalCropStrikes=[],nativeFarmArrivals=[],nativeHomeArrivals=[]}={}){
    const hold=mutationHold;
    if(typeof committed!=='boolean')throw TypeError('Expected native mutation commit outcome');
    if(closed||!hold||!hold.receipt||receipt!==hold.receipt||!clock||clock.intentSequence!==sentSequence||
       clock.committedThrough!==sentTime||clock.committedThrough<hold.effectiveTime)
      throw Error('Native mutation hold is stale or its causal boundary is unpublished');
    if(acquiredCenterRuin||committed&&hold.preparedCenterRuin){
      const companions=[nativeBarrierAdditions,nativeSuspendedBodies,nativeResumedRoutes,nativeStartedRoutes,nativeActions,
        nativeConsequences,nativeSettlements,nativeInitialIdleBodies,nativeIdleCycles,nativeStrollStops,nativeFarmArrivalStops,
        nativeTaskRouteStops,nativeStrolls,nativeHomes,nativeAnimalCropRoutes,nativeAnimalCropStrikes,nativeFarmArrivals,nativeHomeArrivals];
      if(!committed||!verifiesCenter(hold.preparedCenterRuin,nextBoundary,acquiredCenterRuin)||
         clock.clockSequence!==hold.clockSequence+1||sentSequence!==hold.sequence||companions.some(items=>items?.length))
        throw Error('Center ruin acquisition differs from the reserved substep');
    }
    if(committed){
      nextBoundary=copyNativeWorldBoundary(nextBoundary);
      if(hold.preparedWorldBoundary&&!hold.preparedCenterRuin&&!hold.preparedBarrierAdditionTemplate&&!hold.preparedResumeTemplate&&!hold.preparedTaskStartTemplate&&!hold.preparedTaskActionTemplate&&!hold.preparedTaskConsequenceTemplate&&!hold.preparedTaskSettlementTemplate&&!hold.preparedInitialIdleBodyTemplate&&!hold.preparedIdleCycleTemplate&&!hold.preparedIdleStrollStopTemplate&&!hold.preparedFarmArrivalStopTemplate&&!hold.preparedTaskRouteStopTemplate&&!hold.preparedIdleStrollTemplate&&!hold.preparedHomeRouteTemplate&&!hold.preparedAnimalCropRouteTemplate&&!hold.preparedAnimalCropStrikeTemplate&&!hold.preparedFarmArrivalTemplate&&!hold.preparedHomeArrivalTemplate&&!sameNativeWorldBoundary(hold.preparedWorldBoundary,nextBoundary))throw Error('Committed world differs from the retained prepared packet');
      if(!nextBoundary||nextBoundary.authorityEpoch!==authorityEpoch||nextBoundary.nativeSession!==clock.nativeSession||
         nextBoundary.effectiveTime!==sentTime||worldBoundary&&nextBoundary.ticket<=worldBoundary.ticket)
        throw Error('Native committed mutation requires a new world resource boundary');
    }else if(nextBoundary!==null)throw Error('Cancelled mutation cannot replace world resources');
    if(!Array.isArray(nativeSuspendedBodies)||nativeSuspendedBodies.length>32768||!committed&&nativeSuspendedBodies.length)throw TypeError('Invalid committed native suspended bodies');
    const bodies=nativeSuspendedBodies.map(copyNativeSuspendedBodyReference),actors=new Set(),bodyIds=new Set();
    for(const reference of bodies){if(!sameNativeWorldBoundary(reference.worldBoundary,nextBoundary)||actors.has(reference.nativeRoute.actorId)||bodyIds.has(reference.bodyId))throw Error('Native suspended body differs from committed world boundary');actors.add(reference.nativeRoute.actorId);bodyIds.add(reference.bodyId);}
    if(!Array.isArray(nativeResumedRoutes)||nativeResumedRoutes.length>32768||!committed&&nativeResumedRoutes.length)throw TypeError('Invalid committed native resumed routes');
    const resumes=nativeResumedRoutes.map(input=>{const value=copyNativeResumeAttestation(input),{reference,assignmentSequence}=value;
      if(!sameNativeWorldBoundary(reference.worldBoundary,nextBoundary)||reference.sourceControlSequence!==hold.sequence||!Number.isSafeInteger(assignmentSequence)||assignmentSequence<=reference.sourceControlSequence||assignmentSequence>sentSequence||actors.has(reference.actorId)||bodyIds.has(reference.bodyId))throw Error('Native resumed route differs from its committed authority boundary');
      actors.add(reference.actorId);bodyIds.add(reference.bodyId);return value;});
    if(!Array.isArray(nativeStartedRoutes)||nativeStartedRoutes.length>32768||!committed&&nativeStartedRoutes.length)throw TypeError('Invalid committed native started routes');
    const starts=nativeStartedRoutes.map(input=>{const value=copyNativeTaskStartAttestation(input),{reference,assignmentSequence}=value;if(!sameNativeWorldBoundary(reference.worldBoundary,nextBoundary)||reference.sourceControlSequence!==hold.sequence||assignmentSequence>sentSequence||actors.has(reference.actorId)||bodyIds.has(reference.bodyId))throw Error('Native started route differs from its authority boundary');actors.add(reference.actorId);bodyIds.add(reference.bodyId);return value;});
    if(starts.length&&!hold.preparedTaskStartTemplate)throw Error('First-task attestation lacks a retained template');
    if(!Array.isArray(nativeActions)||nativeActions.length>32768||!committed&&nativeActions.length)throw TypeError('Invalid committed native actions');
    const actions=nativeActions.map(input=>{const value=copyNativeTaskActionAttestation(input),r=value.reference,q=r.request,actor=nativeTaskActionActor(q);if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.actionSequence>sentSequence||actors.has(actor)||bodyIds.has(q.bodyId))throw Error('Native action differs from its authority boundary');actors.add(actor);bodyIds.add(q.bodyId);return value;});
    if(!Array.isArray(nativeConsequences)||nativeConsequences.length>32768||!committed&&nativeConsequences.length)throw TypeError('Invalid committed native consequences');
    const consequences=nativeConsequences.map(input=>{const value=copyNativeTaskConsequenceAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.assignmentSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native consequence differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeIdleCycles)||nativeIdleCycles.length>32768||!committed&&nativeIdleCycles.length)throw TypeError('Invalid committed native cycles');
    const cycles=nativeIdleCycles.map(input=>{const value=copyNativeIdleCycleAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.cycleSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Idle cycle differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeInitialIdleBodies)||nativeInitialIdleBodies.length>32768||!committed&&nativeInitialIdleBodies.length)throw TypeError('Invalid committed native initialBodies');
    const initialBodies=nativeInitialIdleBodies.map(input=>{const value=copyNativeInitialIdleBodyAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.bodySequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native initial Idle body differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeSettlements)||nativeSettlements.length>32768||!committed&&nativeSettlements.length)throw TypeError('Invalid committed native settlements');
    const settlements=nativeSettlements.map(input=>{const value=copyNativeTaskSettlementAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.settlementSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native settlement differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeStrolls)||nativeStrolls.length>32768||!committed&&nativeStrolls.length)throw TypeError('Invalid committed native Idle strolls');
    const strolls=nativeStrolls.map(input=>{const value=copyNativeIdleStrollAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.assignmentSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Idle stroll differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeFarmArrivals)||nativeFarmArrivals.length>32768||!committed&&nativeFarmArrivals.length)throw TypeError('Invalid committed native farm arrivals');
    const farmArrivals=nativeFarmArrivals.map(input=>{const value=copyNativeFarmArrivalRouteAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.assignmentSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native farm arrival differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeHomes)||nativeHomes.length>32768||!committed&&nativeHomes.length)throw TypeError('Invalid committed native Home routes');
    const homes=nativeHomes.map(input=>{const value=copyNativeHomeRouteAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.assignmentSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Home differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeHomeArrivals)||nativeHomeArrivals.length>32768||!committed&&nativeHomeArrivals.length)throw TypeError('Invalid committed native Home arrivals');
    const arrivals=nativeHomeArrivals.map(input=>{const value=copyNativeHomeArrivalAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.retiredSequence!==sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Home arrival differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeStrollStops)||nativeStrollStops.length>1||!committed&&nativeStrollStops.length)throw TypeError('Invalid committed native moving stops');
    const stops=nativeStrollStops.map(input=>{const value=copyNativeIdleStrollStopAttestation(input),r=value.reference;
      if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceRoute.assignmentSequence>hold.sequence)throw Error('Native moving stop differs from its authority boundary');
      for(const owner of r.routes){const actor=owner.nativeRoute.actorId;if(owner.nativeRoute.assignmentSequence>hold.sequence||actors.has(actor)||bodyIds.has(owner.bodyId))throw Error('Native moving stop repeats an owner or advances an assignment');actors.add(actor);bodyIds.add(owner.bodyId);}return value;});
    if(!Array.isArray(nativeFarmArrivalStops)||nativeFarmArrivalStops.length>1||!committed&&nativeFarmArrivalStops.length)throw TypeError('Invalid committed native farm arrival stops');
    const farmStops=nativeFarmArrivalStops.map(input=>{const value=copyNativeFarmArrivalStopAttestation(input),r=value.reference;
      if(!value.projection||!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceRoute.assignmentSequence>hold.sequence)throw Error('Native farm arrival stop differs from its authority boundary');
      for(const owner of r.routes){const actor=owner.nativeRoute.actorId;if(owner.nativeRoute.assignmentSequence>hold.sequence||actors.has(actor)||bodyIds.has(owner.bodyId))throw Error('Native farm arrival stop repeats an owner or advances an assignment');actors.add(actor);bodyIds.add(owner.bodyId);}return value;});
    if(!Array.isArray(nativeTaskRouteStops)||nativeTaskRouteStops.length>1||!committed&&nativeTaskRouteStops.length)throw TypeError('Invalid committed native task route stops');
    const taskStops=nativeTaskRouteStops.map(input=>{
      const value=copyNativeTaskRouteStopAttestation(input),r=value.reference;
      if(!value.projection||!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceRoute.assignmentSequence>hold.sequence)throw Error('Native task route stop differs from its authority boundary');
      for(const owner of r.routes){
        const actor=owner.nativeRoute.actorId;
        if(owner.nativeRoute.assignmentSequence>hold.sequence||actors.has(actor)||bodyIds.has(owner.bodyId))throw Error('Native task route stop repeats an owner or advances an assignment');
        actors.add(actor);bodyIds.add(owner.bodyId);
      }
      return value;
    });
    if(taskStops.length&&!hold.preparedTaskRouteStopTemplate)throw Error('Native task route stop lacks its retained template');
    if(committed&&hold.preparedTaskRouteStopTemplate&&(
        [farmArrivals,strolls,cycles,initialBodies,arrivals,homes,bodies,resumes,starts,actions,consequences,settlements,stops,farmStops].some(items=>items.length)||
        taskStops.length!==1||!sameNativeTaskRouteStopReference(taskStops[0].preparedReference,hold.preparedTaskRouteStopTemplate)))throw Error('Native task route stop differs from its retained template');
    if(stops.length&&!hold.preparedIdleStrollStopTemplate)throw Error('Native moving stop lacks its retained template');
    if(committed&&hold.preparedIdleStrollStopTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||stops.length!==1||!sameNativeIdleStrollStopReference(stops[0].preparedReference,hold.preparedIdleStrollStopTemplate)))throw Error('Native moving stop differs from its retained template');
    if(farmStops.length&&!hold.preparedFarmArrivalStopTemplate)throw Error('Native farm arrival stop lacks its retained template');
    if(committed&&hold.preparedFarmArrivalStopTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||stops.length||farmStops.length!==1||!sameNativeFarmArrivalStopReference(farmStops[0].preparedReference,hold.preparedFarmArrivalStopTemplate)))throw Error('Native farm arrival stop differs from its retained template');
    if(arrivals.length&&!hold.preparedHomeArrivalTemplate)throw Error('Native Home arrival lacks its retained template');
    if(committed&&hold.preparedHomeArrivalTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||homes.length||arrivals.length!==1||!sameNativeHomeArrivalReference(arrivals[0].preparedReference,hold.preparedHomeArrivalTemplate)))throw Error('Native Home arrival differs from its retained template');
    if(strolls.length&&!hold.preparedIdleStrollTemplate)throw Error('Native Idle stroll lacks its retained template');
    if(committed&&hold.preparedIdleStrollTemplate&&(farmArrivals.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||strolls.length!==1||!sameNativeIdleStrollReference(strolls[0].preparedReference,hold.preparedIdleStrollTemplate)))throw Error('Native Idle stroll differs from its retained template');
    const cropRoute=nativeAnimalCropRoutes.map(input=>copyNativeAnimalCropAttestation(input,26));
    if(cropRoute.length!==(committed&&hold.preparedAnimalCropRouteTemplate?1:0))throw Error('Unexpected native crop Route acquisition');
    if(cropRoute.length){
      const a=cropRoute[0],r=a.reference;
      if([nativeBarrierAdditions,taskStops,farmStops,stops,strolls,cycles,initialBodies,arrivals,homes,bodies,resumes,starts,actions,consequences,settlements,farmArrivals].some(v=>v.length)||
         !sameNativeAnimalCropReference(a.preparedReference,hold.preparedAnimalCropRouteTemplate)||r.sourceControlSequence!==hold.sequence||
         a.assignmentSequence!==sentSequence||!sameNativeWorldBoundary(r.worldBoundary,nextBoundary))throw Error('Native crop acquisition differs from its prepared hold');
    }
    const cropStrike=nativeAnimalCropStrikes.map(input=>copyNativeAnimalCropAttestation(input,27));
    if(cropStrike.length!==(committed&&hold.preparedAnimalCropStrikeTemplate?1:0))throw Error('Unexpected native crop Strike acquisition');
    if(cropStrike.length){
      const a=cropStrike[0],r=a.reference;
      if([nativeBarrierAdditions,taskStops,farmStops,stops,strolls,cycles,initialBodies,arrivals,homes,bodies,resumes,starts,actions,consequences,settlements,farmArrivals].some(v=>v.length)||
         !sameNativeAnimalCropReference(a.preparedReference,hold.preparedAnimalCropStrikeTemplate)||r.sourceControlSequence!==hold.sequence||
         a.assignmentSequence!==sentSequence||!sameNativeWorldBoundary(r.worldBoundary,nextBoundary))throw Error('Native crop acquisition differs from its prepared hold');
    }
    if(farmArrivals.length&&!hold.preparedFarmArrivalTemplate)throw Error('Native farm arrival lacks its retained template');
    if(committed&&hold.preparedFarmArrivalTemplate&&(stops.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||farmArrivals.length!==1||!sameNativeFarmArrivalRouteReference(farmArrivals[0].preparedReference,hold.preparedFarmArrivalTemplate)))throw Error('Native farm arrival differs from its retained template');
    if(homes.length&&!hold.preparedHomeRouteTemplate)throw Error('Native Home lacks its retained template');
    if(committed&&hold.preparedHomeRouteTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||homes.length!==1||!sameNativeHomeRouteReference(homes[0].preparedReference,hold.preparedHomeRouteTemplate)))throw Error('Native Home differs from its retained template');
    if(cycles.length&&!hold.preparedIdleCycleTemplate)throw Error('Native Idle cycle lacks its retained template');
    if(committed&&hold.preparedIdleCycleTemplate&&(farmArrivals.length||strolls.length||initialBodies.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||cycles.length!==1||!sameNativeIdleCycleReference(cycles[0].preparedReference,hold.preparedIdleCycleTemplate)))throw Error('Native Idle cycle differs from its retained template');
    if(initialBodies.length&&!hold.preparedInitialIdleBodyTemplate)throw Error('Native initial Idle body lacks its retained template');
    if(committed&&hold.preparedInitialIdleBodyTemplate&&(farmArrivals.length||strolls.length||cycles.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||initialBodies.length!==1||!sameNativeInitialIdleBodyReference(initialBodies[0].preparedReference,hold.preparedInitialIdleBodyTemplate)))throw Error('Native initial Idle body differs from its retained template');
    if(settlements.length&&!hold.preparedTaskSettlementTemplate)throw Error('Native settlement lacks its retained template');
    if(committed&&hold.preparedTaskSettlementTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length!==1||!sameNativeTaskSettlementReference(settlements[0].preparedReference,hold.preparedTaskSettlementTemplate)))throw Error('Native settlement differs from its retained template');
    if(consequences.length&&!hold.preparedTaskConsequenceTemplate)throw Error('Native consequence lacks its retained template');
    if(committed&&hold.preparedTaskConsequenceTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length!==1||!sameNativeTaskConsequenceReference(consequences[0].preparedReference,hold.preparedTaskConsequenceTemplate)))throw Error('Native consequence differs from its retained template');
    if(actions.length&&!hold.preparedTaskActionTemplate)throw Error('Native action lacks its retained template');
    if(committed&&hold.preparedTaskActionTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||bodies.length||resumes.length||starts.length||actions.length!==1||!sameNativeTaskActionReference(actions[0].preparedReference,hold.preparedTaskActionTemplate)))throw Error('Native action differs from its retained template');
    if(committed&&hold.preparedTaskStartTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||actions.length||bodies.length||resumes.length||starts.length!==1||!sameNativeTaskStartReference(starts[0].preparedReference,hold.preparedTaskStartTemplate)))throw Error('First task differs from its retained template');
    if(committed&&hold.preparedResumeTemplate&&(farmArrivals.length||strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||actions.length||starts.length||(bodies.length||resumes.length!==1||!sameNativeResumeReference(resumes[0].preparedReference,hold.preparedResumeTemplate))))throw Error('Deferred resume does not match the retained template');
    if(!Array.isArray(nativeBarrierAdditions)||nativeBarrierAdditions.length>1||!committed&&nativeBarrierAdditions.length)throw TypeError('Invalid native solid addition release');
    const barriers=nativeBarrierAdditions.map(copyNativeBarrierAdditionAttestation);
    if(barriers.length&&!hold.preparedBarrierAdditionTemplate||committed&&hold.preparedBarrierAdditionTemplate&&(barriers.length!==1||[bodies,resumes,starts,actions,consequences,settlements,initialBodies,cycles,stops,farmStops,taskStops,strolls,homes,farmArrivals,arrivals].some(items=>items.length)||!sameNativeBarrierAdditionReference(barriers[0].preparedReference,hold.preparedBarrierAdditionTemplate)||!sameNativeWorldBoundary(barriers[0].reference.worldBoundary,nextBoundary)||barriers[0].reference.sourceControlSequence!==hold.sequence))throw Error('Native solid addition differs from its retained template');
    port.postMessage({type:'IntentMutationRelease',...(acquiredCenterRuin?{acquiredCenterRuin}:{}),protocolVersion:2,fenceVersion:1,session,authorityEpoch,
      holdId:hold.holdId,heldSequence:hold.sequence,heldTime:hold.effectiveTime,heldClockSequence:hold.clockSequence,
      sequence:sentSequence,effectiveTime:sentTime,clockSequence:clock.clockSequence,committed,
      ...(committed?{worldBoundary:nextBoundary,...(barriers.length?{nativeBarrierAdditions:barriers}:{}),...(bodies.length?{nativeSuspendedBodies:bodies}:{}),...(resumes.length?{nativeResumedRoutes:resumes}:{}),...(starts.length?{nativeStartedRoutes:starts}:{}),...(actions.length?{nativeActions:actions}:{}),...(consequences.length?{nativeConsequences:consequences}:{}),...(initialBodies.length?{nativeInitialIdleBodies:initialBodies}:{}),...(cycles.length?{nativeIdleCycles:cycles}:{}),...(settlements.length?{nativeSettlements:settlements}:{}),...(stops.length?{nativeStrollStops:stops}:{}),...(farmStops.length?{nativeFarmArrivalStops:farmStops}:{}),...(taskStops.length?{nativeTaskRouteStops:taskStops}:{}),...(strolls.length?{nativeStrolls:strolls}:{}),...(homes.length?{nativeHomes:homes}:{}),...(cropRoute.length?{nativeAnimalCropRoutes:cropRoute}:{}),...(cropStrike.length?{nativeAnimalCropStrikes:cropStrike}:{}),...(farmArrivals.length?{nativeFarmArrivals:farmArrivals}:{}),...(arrivals.length?{nativeHomeArrivals:arrivals}:{})}:{})});
    if(committed)worldBoundary=nextBoundary;
    clearTimeout(hold.timer);mutationHold=null;return true;
  }
  function retireGpu(reason='replaced'){
    if(retirement)return retirement.promise;
    // An unsolicited terminal receipt already stopped and drained this exact
    // connection. Reuse it; never mint a new requested retirement token.
    if(drained&&consumerDrainReceipt)return Promise.resolve(consumerDrainReceipt);
    if(closed||appliedSequence===null||mutationHold||gpuFences.size)
      return Promise.reject(Error('Native GPU retirement boundary is not ready'));
    // A fresh token, rather than a counter reset on each connection, prevents
    // an old Worker receipt from retiring its replacement in the same epoch.
    const id=crypto.randomUUID(),sequence=sentSequence,time=sentTime,clockSequence=clock?.clockSequence;
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
    retirement={id,sequence,time,clockSequence,reason,promise,resolve,reject,
      timer:setTimeout(()=>fail(Error('Native GPU retirement timed out')),timeoutMs)};
    stop?.();stop=null;
    try{port.postMessage({type:'IntentControlRetire',protocolVersion:2,fenceVersion:1,session,authorityEpoch,
      retirementId:id,sequence,effectiveTime:time,...(clockSequence===undefined?{}:{clockSequence})});}
    catch(error){fail(error);}
    return promise;
  }

    function waitForTerminalDraw(){
      if(consumerDrainReceipt)return Promise.resolve(consumerDrainReceipt);
      if(closed||terminalWait||retirement||appliedSequence===null||mutationHold||gpuFences.size)
        return Promise.reject(Error('Terminal draw observation unavailable'));
      return new Promise((resolve,reject)=>{terminalWait={resolve,reject,timer:setTimeout(()=>{
        terminalWait=null;reject(Error('Timed out waiting for the previous draw to retire'));
      },timeoutMs)};});
    }
    return Object.assign(publication,{ready,dispose,waitForTerminalDraw,fenceGpu,waitForMutationOpportunity,quiesceGpuForMutation,releaseGpuAfterMutation,retireGpu,
    ownsGpuConsumer:consumer=>consumer===publication,status:()=>({session,authorityEpoch,baselineSequence,
    sentSequence,sentTime,appliedSequence,pendingGpuFences:gpuFences.size,closed,fault,
    ...(clock?{clockSequence:clock.clockSequence,appliedClockSequence,pendingClockReceipts:clockReceipts.size}:{} ),
    mutationOpportunityVersion,pendingMutationOpportunity:mutationOpportunity?.id??null,
    pendingMutationHold:mutationHold?.holdId??null,retiring:retirement!==null,drained,worldBoundary})});
}
