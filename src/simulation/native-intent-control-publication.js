// Direct authority -> draw transport for the existing native intent protocol.
// The native owner supplies the baseline/log; this sender keeps ACK cursors only.
import {copyNativeWorldBoundary} from '../world/native-world-boundary.js';
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
         data.effectiveTime!==hold.effectiveTime||data.clockSequence!==hold.clockSequence){
        fail(Error('Invalid native mutation fence acknowledgement'));return;
      }
      hold.receipt=Object.freeze({authorityEpoch,session,holdId:hold.holdId,sequence:hold.sequence,
        effectiveTime:hold.effectiveTime,clockSequence:hold.clockSequence});hold.resolve(hold.receipt);return;
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
  function quiesceGpuForMutation(){
    if(closed||retirement||appliedSequence===null||!clock||clock.intentSequence!==sentSequence||clock.committedThrough!==sentTime)
      return Promise.reject(Error('Native causal mutation boundary is not ready'));
    if(mutationHold||gpuFences.size)return Promise.reject(Error('Native GPU mutation boundary is busy'));
    if(!Number.isSafeInteger(nextMutationFence+1))return Promise.reject(Error('Native mutation fence identity exhausted'));
    const holdId=++nextMutationFence,sequence=sentSequence,effectiveTime=sentTime,clockSequence=clock.clockSequence;
    return new Promise((resolve,reject)=>{
      mutationHold={holdId,sequence,effectiveTime,clockSequence,resolve,reject,receipt:null,
        timer:setTimeout(()=>fail(Error('Native mutation fence timed out')),timeoutMs)};
      try{port.postMessage({type:'IntentMutationQuiesce',protocolVersion:2,fenceVersion:1,
        session,authorityEpoch,holdId,sequence,effectiveTime,clockSequence});}catch(error){fail(error);}
    });
  }
  function releaseGpuAfterMutation(receipt,{committed=false,worldBoundary:nextBoundary=null}={}){
    const hold=mutationHold;
    if(typeof committed!=='boolean')throw TypeError('Expected native mutation commit outcome');
    if(closed||!hold||!hold.receipt||receipt!==hold.receipt||!clock||clock.intentSequence!==sentSequence||
       clock.committedThrough!==sentTime||clock.committedThrough<hold.effectiveTime)
      throw Error('Native mutation hold is stale or its causal boundary is unpublished');
    if(committed){
      nextBoundary=copyNativeWorldBoundary(nextBoundary);
      if(!nextBoundary||nextBoundary.authorityEpoch!==authorityEpoch||nextBoundary.nativeSession!==clock.nativeSession||
         nextBoundary.effectiveTime!==sentTime||worldBoundary&&nextBoundary.ticket<=worldBoundary.ticket)
        throw Error('Native committed mutation requires a new world resource boundary');
    }else if(nextBoundary!==null)throw Error('Cancelled mutation cannot replace world resources');
    port.postMessage({type:'IntentMutationRelease',protocolVersion:2,fenceVersion:1,session,authorityEpoch,
      holdId:hold.holdId,heldSequence:hold.sequence,heldTime:hold.effectiveTime,heldClockSequence:hold.clockSequence,
      sequence:sentSequence,effectiveTime:sentTime,clockSequence:clock.clockSequence,committed,
      ...(committed?{worldBoundary:nextBoundary}:{})});
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
