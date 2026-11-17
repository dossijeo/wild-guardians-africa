import {copyNativeIdleStrollStopReference,sameNativeIdleStrollStopReference,copyNativeIdleStrollStopAttestation} from '../world/native-idle-stroll-stop.js';
import {copyNativeIdleStrollReference,sameNativeIdleStrollReference,copyNativeIdleStrollAttestation} from '../world/native-idle-stroll.js';
import {copyNativeIdleCycleReference,sameNativeIdleCycleReference,copyNativeIdleCycleAttestation} from '../world/native-idle-cycle.js';
import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
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
  const consumerToken=crypto.randomUUID();
  let retirement=null,drained=false;
  let worldBoundary=null;
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
    for(const fence of gpuFences.values()){clearTimeout(fence.timer);fence.reject(Error('Native GPU fence closed: '+(fault??reason)));}
    gpuFences.clear();
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
      drained=true;
      if(retirement)retirement.resolve(Object.freeze({authorityEpoch,session,retirementId:retirement.id,
        sequence:retirement.sequence,effectiveTime:retirement.time,clockSequence:retirement.clockSequence}));
      dispose('consumer-retired');return;
    }
    if(data?.type==='intent-mutation-quiesced'){
      const hold=mutationHold;
      if(!hold||hold.receipt||data.session!==session||data.authorityEpoch!==authorityEpoch||data.fenceVersion!==1||
         data.accepted!==true||data.holdId!==hold.holdId||data.sequence!==hold.sequence||
         data.effectiveTime!==hold.effectiveTime||data.clockSequence!==hold.clockSequence||hold.preparedHomeArrivalTemplate&&(data.nativeHomeArrivalVersion!==1||!sameNativeHomeArrivalReference(data.preparedHomeArrivalTemplate,hold.preparedHomeArrivalTemplate))||hold.preparedIdleStrollStopTemplate&&(data.nativeIdleStrollStopVersion!==1||!sameNativeIdleStrollStopReference(data.preparedIdleStrollStopTemplate,hold.preparedIdleStrollStopTemplate))||hold.preparedIdleStrollTemplate&&(data.nativeIdleStrollVersion!==1||!sameNativeIdleStrollReference(data.preparedIdleStrollTemplate,hold.preparedIdleStrollTemplate))||hold.preparedHomeRouteTemplate&&(data.nativeHomeRouteVersion!==1||!sameNativeHomeRouteReference(data.preparedHomeRouteTemplate,hold.preparedHomeRouteTemplate))||hold.preparedInitialIdleBodyTemplate&&(data.nativeInitialIdleBodyVersion!==1||!sameNativeInitialIdleBodyReference(data.preparedInitialIdleBodyTemplate,hold.preparedInitialIdleBodyTemplate))||hold.preparedIdleCycleTemplate&&(data.nativeIdleCycleVersion!==1||!sameNativeIdleCycleReference(data.preparedIdleCycleTemplate,hold.preparedIdleCycleTemplate))||hold.preparedTaskSettlementTemplate&&(data.nativeTaskSettlementVersion!==1||!sameNativeTaskSettlementReference(data.preparedTaskSettlementTemplate,hold.preparedTaskSettlementTemplate))||hold.preparedTaskConsequenceTemplate&&(data.nativeTaskConsequenceVersion!==1||!sameNativeTaskConsequenceReference(data.preparedTaskConsequenceTemplate,hold.preparedTaskConsequenceTemplate))||hold.preparedWorldBoundary&&(!sameNativeWorldBoundary(data.preparedWorldBoundary,hold.preparedWorldBoundary)||!Number.isSafeInteger(data.preparedFrameSequence)||data.preparedFrameSequence<1)){
        fail(Error('Invalid native mutation fence acknowledgement'));return;
      }
      hold.receipt=Object.freeze({authorityEpoch,session,holdId:hold.holdId,sequence:hold.sequence,
        effectiveTime:hold.effectiveTime,clockSequence:hold.clockSequence,...(hold.preparedHomeArrivalTemplate?{nativeHomeArrivalVersion:data.nativeHomeArrivalVersion,preparedHomeArrivalTemplate:hold.preparedHomeArrivalTemplate}:{}),...(hold.preparedIdleStrollStopTemplate?{nativeIdleStrollStopVersion:data.nativeIdleStrollStopVersion,preparedIdleStrollStopTemplate:hold.preparedIdleStrollStopTemplate}:{}),...(hold.preparedIdleStrollTemplate?{nativeIdleStrollVersion:data.nativeIdleStrollVersion,preparedIdleStrollTemplate:hold.preparedIdleStrollTemplate}:{}),...(hold.preparedHomeRouteTemplate?{nativeHomeRouteVersion:data.nativeHomeRouteVersion,preparedHomeRouteTemplate:hold.preparedHomeRouteTemplate}:{}),...(hold.preparedInitialIdleBodyTemplate?{nativeInitialIdleBodyVersion:data.nativeInitialIdleBodyVersion,preparedInitialIdleBodyTemplate:hold.preparedInitialIdleBodyTemplate}:{}),...(hold.preparedIdleCycleTemplate?{nativeIdleCycleVersion:data.nativeIdleCycleVersion,preparedIdleCycleTemplate:hold.preparedIdleCycleTemplate}:{}),...(hold.preparedTaskSettlementTemplate?{nativeTaskSettlementVersion:data.nativeTaskSettlementVersion,preparedTaskSettlementTemplate:hold.preparedTaskSettlementTemplate}:{}),...(hold.preparedTaskConsequenceTemplate?{nativeTaskConsequenceVersion:1,preparedTaskConsequenceTemplate:hold.preparedTaskConsequenceTemplate}:{}),...(hold.preparedWorldBoundary?{preparedWorldBoundary:hold.preparedWorldBoundary,preparedFrameSequence:data.preparedFrameSequence}:{})});hold.resolve(hold.receipt);return;
    }
    if(data?.type==='intent-control-fenced'){
      const fence=gpuFences.get(data.fenceId);
      if(!fence||data.session!==session||data.authorityEpoch!==authorityEpoch||
          data.fenceVersion!==1||data.accepted!==true||data.sequence!==fence.sequence||data.effectiveTime!==fence.effectiveTime||
          data.clockSequence!==fence.clockSequence){
        fail(Error('Invalid native GPU fence acknowledgement'));return;
      }
      gpuFences.delete(data.fenceId);clearTimeout(fence.timer);
       fence.resolve({authorityEpoch,sequence:fence.sequence,effectiveTime:fence.effectiveTime,fenceId:data.fenceId,
         ...(fence.clockSequence===undefined?{}:{clockSequence:fence.clockSequence})});return;
    }
    if(data?.type!=='intent-control-applied'||data.session!==session||
       data.authorityEpoch!==authorityEpoch||data.accepted!==true||
       !Number.isSafeInteger(data.sequence)||data.sequence<baselineSequence||
       data.sequence>sentSequence||appliedSequence!==null&&data.sequence<appliedSequence){
      fail(Error('Invalid native intent control acknowledgement'));return;
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
        baselineClockSequence=initial?.clockSequence??null;
        port.postMessage({...baseline,...(initial?{clock:initial}:{}),worldBoundary,worldBoundaryVersion:1,session,consumerToken});
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
    if(closed||retirement||appliedSequence===null||mutationHold)return Promise.reject(Error('Native GPU fence connection is not ready'));
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
  function quiesceGpuForMutation({preparedWorldBoundary=null,preparedResumeTemplate=null,preparedTaskStartTemplate=null,preparedTaskActionTemplate=null,preparedTaskConsequenceTemplate=null,preparedTaskSettlementTemplate=null,preparedInitialIdleBodyTemplate=null,preparedIdleCycleTemplate=null,preparedIdleStrollStopTemplate=null,preparedIdleStrollTemplate=null,preparedHomeRouteTemplate=null,preparedHomeArrivalTemplate=null}={}){
    if(closed||retirement||appliedSequence===null||!clock||clock.intentSequence!==sentSequence||clock.committedThrough!==sentTime)
      return Promise.reject(Error('Native causal mutation boundary is not ready'));
    if(mutationHold||gpuFences.size)return Promise.reject(Error('Native GPU mutation boundary is busy'));
    if(!Number.isSafeInteger(nextMutationFence+1))return Promise.reject(Error('Native mutation fence identity exhausted'));
    if([preparedResumeTemplate,preparedTaskStartTemplate,preparedTaskActionTemplate,preparedTaskConsequenceTemplate,preparedTaskSettlementTemplate,preparedInitialIdleBodyTemplate,preparedIdleCycleTemplate,preparedIdleStrollStopTemplate,preparedIdleStrollTemplate,preparedHomeRouteTemplate,preparedHomeArrivalTemplate].filter(Boolean).length>1)throw Error('Conflicting native prepared templates');
    if(preparedHomeArrivalTemplate){preparedHomeArrivalTemplate=copyNativeHomeArrivalReference(preparedHomeArrivalTemplate);if(!preparedWorldBoundary)throw Error('Native Home arrival requires a prepared packet');}
    if(preparedHomeRouteTemplate){preparedHomeRouteTemplate=copyNativeHomeRouteReference(preparedHomeRouteTemplate);if(!preparedWorldBoundary)throw Error('Native Home requires a prepared packet');}
    if(preparedIdleStrollStopTemplate){preparedIdleStrollStopTemplate=copyNativeIdleStrollStopReference(preparedIdleStrollStopTemplate);if(!preparedWorldBoundary||preparedIdleStrollStopTemplate.routes.some(owner=>owner.nativeRoute.assignmentSequence>sentSequence))throw Error('Native moving stop requires its prepared packet and issued source');}
    if(preparedIdleStrollTemplate){preparedIdleStrollTemplate=copyNativeIdleStrollReference(preparedIdleStrollTemplate);if(!preparedWorldBoundary)throw Error('Native Idle stroll requires a prepared packet');}
    if(preparedInitialIdleBodyTemplate){preparedInitialIdleBodyTemplate=copyNativeInitialIdleBodyReference(preparedInitialIdleBodyTemplate);if(!preparedWorldBoundary)throw Error('Native initial Idle body requires a prepared packet');}
    if(preparedIdleCycleTemplate){preparedIdleCycleTemplate=copyNativeIdleCycleReference(preparedIdleCycleTemplate);if(!preparedWorldBoundary)throw Error('Native Idle cycle requires a prepared packet');}
    if(preparedTaskSettlementTemplate){preparedTaskSettlementTemplate=copyNativeTaskSettlementReference(preparedTaskSettlementTemplate);if(!preparedWorldBoundary)throw Error('Native settlement requires a prepared packet');}
    if(preparedTaskConsequenceTemplate){preparedTaskConsequenceTemplate=copyNativeTaskConsequenceReference(preparedTaskConsequenceTemplate);if(!preparedWorldBoundary)throw Error('Native consequence requires a prepared packet');}
    if(preparedTaskActionTemplate){preparedTaskActionTemplate=copyNativeTaskActionReference(preparedTaskActionTemplate);if(!preparedWorldBoundary)throw Error('Native action requires a prepared packet');}
    if(preparedTaskStartTemplate){preparedTaskStartTemplate=copyNativeTaskStartReference(preparedTaskStartTemplate);if(preparedResumeTemplate||!preparedWorldBoundary)throw Error('First task requires its own prepared packet');}
    if(preparedResumeTemplate){preparedResumeTemplate=copyNativeResumeReference(preparedResumeTemplate);if(!preparedWorldBoundary)throw Error('Deferred resume requires a prepared packet');}
    if(preparedWorldBoundary){preparedWorldBoundary=copyNativeWorldBoundary(preparedWorldBoundary);if(!preparedWorldBoundary||preparedWorldBoundary.authorityEpoch!==authorityEpoch||preparedWorldBoundary.nativeSession!==clock.nativeSession||((preparedResumeTemplate||preparedTaskStartTemplate||preparedTaskActionTemplate||preparedTaskConsequenceTemplate||preparedTaskSettlementTemplate||preparedInitialIdleBodyTemplate||preparedIdleCycleTemplate||preparedIdleStrollStopTemplate||preparedIdleStrollTemplate||preparedHomeRouteTemplate||preparedHomeArrivalTemplate)?preparedWorldBoundary.effectiveTime>sentTime||!sameNativeWorldBoundary((preparedResumeTemplate??preparedTaskStartTemplate??preparedTaskActionTemplate??preparedTaskConsequenceTemplate??preparedTaskSettlementTemplate??preparedInitialIdleBodyTemplate??preparedIdleCycleTemplate??preparedIdleStrollStopTemplate??preparedIdleStrollTemplate??preparedHomeRouteTemplate??preparedHomeArrivalTemplate).worldBoundary,preparedWorldBoundary)||(preparedResumeTemplate??preparedTaskStartTemplate??preparedTaskActionTemplate??preparedTaskConsequenceTemplate??preparedTaskSettlementTemplate??preparedInitialIdleBodyTemplate??preparedIdleCycleTemplate??preparedIdleStrollStopTemplate??preparedIdleStrollTemplate??preparedHomeRouteTemplate??preparedHomeArrivalTemplate).sourceControlSequence>sentSequence:preparedWorldBoundary.effectiveTime!==sentTime))throw Error('Invalid prepared native mutation boundary');}
    const holdId=++nextMutationFence,sequence=sentSequence,effectiveTime=sentTime,clockSequence=clock.clockSequence;
    return new Promise((resolve,reject)=>{
      mutationHold={holdId,sequence,effectiveTime,clockSequence,preparedWorldBoundary,preparedResumeTemplate,preparedTaskStartTemplate,preparedTaskActionTemplate,preparedTaskConsequenceTemplate,preparedTaskSettlementTemplate,preparedInitialIdleBodyTemplate,preparedIdleCycleTemplate,preparedIdleStrollStopTemplate,preparedIdleStrollTemplate,preparedHomeRouteTemplate,preparedHomeArrivalTemplate,resolve,reject,receipt:null,
        timer:setTimeout(()=>fail(Error('Native mutation fence timed out')),timeoutMs)};
      try{port.postMessage({type:'IntentMutationQuiesce',protocolVersion:2,fenceVersion:1,
        session,authorityEpoch,holdId,sequence,effectiveTime,clockSequence,...(preparedWorldBoundary?{preparedWorldBoundary}:{}),...(preparedResumeTemplate?{preparedResumeTemplate}:{}),...(preparedTaskStartTemplate?{preparedTaskStartTemplate}:{}),...(preparedTaskActionTemplate?{preparedTaskActionTemplate}:{}),...(preparedTaskConsequenceTemplate?{preparedTaskConsequenceTemplate}:{}),...(preparedInitialIdleBodyTemplate?{preparedInitialIdleBodyTemplate}:{}),...(preparedIdleCycleTemplate?{preparedIdleCycleTemplate}:{}),...(preparedTaskSettlementTemplate?{preparedTaskSettlementTemplate}:{}),...(preparedIdleStrollStopTemplate?{preparedIdleStrollStopTemplate}:{}),...(preparedIdleStrollTemplate?{preparedIdleStrollTemplate}:{}),...(preparedHomeRouteTemplate?{preparedHomeRouteTemplate}:{}),...(preparedHomeArrivalTemplate?{preparedHomeArrivalTemplate}:{})});}catch(error){fail(error);}
    });
  }
  function releaseGpuAfterMutation(receipt,{committed=false,worldBoundary:nextBoundary=null,nativeSuspendedBodies=[],nativeResumedRoutes=[],nativeStartedRoutes=[],nativeActions=[],nativeConsequences=[],nativeSettlements=[],nativeInitialIdleBodies=[],nativeIdleCycles=[],nativeStrollStops=[],nativeStrolls=[],nativeHomes=[],nativeHomeArrivals=[]}={}){
    const hold=mutationHold;
    if(typeof committed!=='boolean')throw TypeError('Expected native mutation commit outcome');
    if(closed||!hold||!hold.receipt||receipt!==hold.receipt||!clock||clock.intentSequence!==sentSequence||
       clock.committedThrough!==sentTime||clock.committedThrough<hold.effectiveTime)
      throw Error('Native mutation hold is stale or its causal boundary is unpublished');
    if(committed){
      nextBoundary=copyNativeWorldBoundary(nextBoundary);
      if(hold.preparedWorldBoundary&&!hold.preparedResumeTemplate&&!hold.preparedTaskStartTemplate&&!hold.preparedTaskActionTemplate&&!hold.preparedTaskConsequenceTemplate&&!hold.preparedTaskSettlementTemplate&&!hold.preparedInitialIdleBodyTemplate&&!hold.preparedIdleCycleTemplate&&!hold.preparedIdleStrollStopTemplate&&!hold.preparedIdleStrollTemplate&&!hold.preparedHomeRouteTemplate&&!hold.preparedHomeArrivalTemplate&&!sameNativeWorldBoundary(hold.preparedWorldBoundary,nextBoundary))throw Error('Committed world differs from the retained prepared packet');
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
    if(!Array.isArray(nativeHomes)||nativeHomes.length>32768||!committed&&nativeHomes.length)throw TypeError('Invalid committed native Home routes');
    const homes=nativeHomes.map(input=>{const value=copyNativeHomeRouteAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.assignmentSequence>sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Home differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeHomeArrivals)||nativeHomeArrivals.length>32768||!committed&&nativeHomeArrivals.length)throw TypeError('Invalid committed native Home arrivals');
    const arrivals=nativeHomeArrivals.map(input=>{const value=copyNativeHomeArrivalAttestation(input),r=value.reference;if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceControlSequence!==hold.sequence||value.retiredSequence!==sentSequence||actors.has(r.actorId)||bodyIds.has(r.bodyId))throw Error('Native Home arrival differs from its authority boundary');actors.add(r.actorId);bodyIds.add(r.bodyId);return value;});
    if(!Array.isArray(nativeStrollStops)||nativeStrollStops.length>1||!committed&&nativeStrollStops.length)throw TypeError('Invalid committed native moving stops');
    const stops=nativeStrollStops.map(input=>{const value=copyNativeIdleStrollStopAttestation(input),r=value.reference;
      if(!sameNativeWorldBoundary(r.worldBoundary,nextBoundary)||r.sourceRoute.assignmentSequence>hold.sequence)throw Error('Native moving stop differs from its authority boundary');
      for(const owner of r.routes){const actor=owner.nativeRoute.actorId;if(owner.nativeRoute.assignmentSequence>hold.sequence||actors.has(actor)||bodyIds.has(owner.bodyId))throw Error('Native moving stop repeats an owner or advances an assignment');actors.add(actor);bodyIds.add(owner.bodyId);}return value;});
    if(stops.length&&!hold.preparedIdleStrollStopTemplate)throw Error('Native moving stop lacks its retained template');
    if(committed&&hold.preparedIdleStrollStopTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||stops.length!==1||!sameNativeIdleStrollStopReference(stops[0].preparedReference,hold.preparedIdleStrollStopTemplate)))throw Error('Native moving stop differs from its retained template');
    if(arrivals.length&&!hold.preparedHomeArrivalTemplate)throw Error('Native Home arrival lacks its retained template');
    if(committed&&hold.preparedHomeArrivalTemplate&&(strolls.length||cycles.length||initialBodies.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||homes.length||arrivals.length!==1||!sameNativeHomeArrivalReference(arrivals[0].preparedReference,hold.preparedHomeArrivalTemplate)))throw Error('Native Home arrival differs from its retained template');
    if(strolls.length&&!hold.preparedIdleStrollTemplate)throw Error('Native Idle stroll lacks its retained template');
    if(committed&&hold.preparedIdleStrollTemplate&&(cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||strolls.length!==1||!sameNativeIdleStrollReference(strolls[0].preparedReference,hold.preparedIdleStrollTemplate)))throw Error('Native Idle stroll differs from its retained template');
    if(homes.length&&!hold.preparedHomeRouteTemplate)throw Error('Native Home lacks its retained template');
    if(committed&&hold.preparedHomeRouteTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length||homes.length!==1||!sameNativeHomeRouteReference(homes[0].preparedReference,hold.preparedHomeRouteTemplate)))throw Error('Native Home differs from its retained template');
    if(cycles.length&&!hold.preparedIdleCycleTemplate)throw Error('Native Idle cycle lacks its retained template');
    if(committed&&hold.preparedIdleCycleTemplate&&(strolls.length||initialBodies.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||cycles.length!==1||!sameNativeIdleCycleReference(cycles[0].preparedReference,hold.preparedIdleCycleTemplate)))throw Error('Native Idle cycle differs from its retained template');
    if(initialBodies.length&&!hold.preparedInitialIdleBodyTemplate)throw Error('Native initial Idle body lacks its retained template');
    if(committed&&hold.preparedInitialIdleBodyTemplate&&(strolls.length||cycles.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||initialBodies.length!==1||!sameNativeInitialIdleBodyReference(initialBodies[0].preparedReference,hold.preparedInitialIdleBodyTemplate)))throw Error('Native initial Idle body differs from its retained template');
    if(settlements.length&&!hold.preparedTaskSettlementTemplate)throw Error('Native settlement lacks its retained template');
    if(committed&&hold.preparedTaskSettlementTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length||settlements.length!==1||!sameNativeTaskSettlementReference(settlements[0].preparedReference,hold.preparedTaskSettlementTemplate)))throw Error('Native settlement differs from its retained template');
    if(consequences.length&&!hold.preparedTaskConsequenceTemplate)throw Error('Native consequence lacks its retained template');
    if(committed&&hold.preparedTaskConsequenceTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||bodies.length||resumes.length||starts.length||actions.length||consequences.length!==1||!sameNativeTaskConsequenceReference(consequences[0].preparedReference,hold.preparedTaskConsequenceTemplate)))throw Error('Native consequence differs from its retained template');
    if(actions.length&&!hold.preparedTaskActionTemplate)throw Error('Native action lacks its retained template');
    if(committed&&hold.preparedTaskActionTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||bodies.length||resumes.length||starts.length||actions.length!==1||!sameNativeTaskActionReference(actions[0].preparedReference,hold.preparedTaskActionTemplate)))throw Error('Native action differs from its retained template');
    if(committed&&hold.preparedTaskStartTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||actions.length||bodies.length||resumes.length||starts.length!==1||!sameNativeTaskStartReference(starts[0].preparedReference,hold.preparedTaskStartTemplate)))throw Error('First task differs from its retained template');
    if(committed&&hold.preparedResumeTemplate&&(strolls.length||cycles.length||initialBodies.length||arrivals.length||homes.length||settlements.length||consequences.length||actions.length||starts.length||(bodies.length||resumes.length!==1||!sameNativeResumeReference(resumes[0].preparedReference,hold.preparedResumeTemplate))))throw Error('Deferred resume does not match the retained template');
    port.postMessage({type:'IntentMutationRelease',protocolVersion:2,fenceVersion:1,session,authorityEpoch,
      holdId:hold.holdId,heldSequence:hold.sequence,heldTime:hold.effectiveTime,heldClockSequence:hold.clockSequence,
      sequence:sentSequence,effectiveTime:sentTime,clockSequence:clock.clockSequence,committed,
      ...(committed?{worldBoundary:nextBoundary,...(bodies.length?{nativeSuspendedBodies:bodies}:{}),...(resumes.length?{nativeResumedRoutes:resumes}:{}),...(starts.length?{nativeStartedRoutes:starts}:{}),...(actions.length?{nativeActions:actions}:{}),...(consequences.length?{nativeConsequences:consequences}:{}),...(initialBodies.length?{nativeInitialIdleBodies:initialBodies}:{}),...(cycles.length?{nativeIdleCycles:cycles}:{}),...(settlements.length?{nativeSettlements:settlements}:{}),...(stops.length?{nativeStrollStops:stops}:{}),...(strolls.length?{nativeStrolls:strolls}:{}),...(homes.length?{nativeHomes:homes}:{}),...(arrivals.length?{nativeHomeArrivals:arrivals}:{})}:{})});
    if(committed)worldBoundary=nextBoundary;
    clearTimeout(hold.timer);mutationHold=null;return true;
  }
  function retireGpu(reason='replaced'){
    if(retirement)return retirement.promise;
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
  return Object.assign(publication,{ready,dispose,fenceGpu,quiesceGpuForMutation,releaseGpuAfterMutation,retireGpu,
    ownsGpuConsumer:consumer=>consumer===publication,status:()=>({session,authorityEpoch,baselineSequence,
    sentSequence,sentTime,appliedSequence,pendingGpuFences:gpuFences.size,closed,fault,
    ...(clock?{clockSequence:clock.clockSequence,appliedClockSequence,pendingClockReceipts:clockReceipts.size}:{} ),
    pendingMutationHold:mutationHold?.holdId??null,retiring:retirement!==null,drained,worldBoundary})});
}
