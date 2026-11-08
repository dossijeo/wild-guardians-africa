// Direct authority -> draw transport for the existing native intent protocol.
// The native owner supplies the baseline/log; this sender keeps ACK cursors only.
export function createNativeIntentControlPublication({port,session,observe,
  onError=()=>{},timeoutMs=10000}={}){
  if(!port||typeof port.postMessage!=='function'||typeof observe!=='function'||
     typeof session!=='string'||!session||typeof onError!=='function'||
     !Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('Invalid native intent publication');
  let authorityEpoch=null,baselineSequence=null,sentSequence=0,appliedSequence=null,
    stop=null,closed=false,fault=null,timer=null,resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  ready.catch(()=>{});
  function dispose(reason='disposed'){
    if(closed)return;closed=true;clearTimeout(timer);stop?.();stop=null;
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
    if(data?.type==='intent-control-retired'&&data.session===session&&
       data.authorityEpoch===authorityEpoch){dispose('consumer-retired');return;}
    if(data?.type!=='intent-control-applied'||data.session!==session||
       data.authorityEpoch!==authorityEpoch||data.accepted!==true||
       !Number.isSafeInteger(data.sequence)||data.sequence<baselineSequence||
       data.sequence>sentSequence||appliedSequence!==null&&data.sequence<appliedSequence){
      fail(Error('Invalid native intent control acknowledgement'));return;
    }
    appliedSequence=data.sequence;clearTimeout(timer);
    resolveReady({authorityEpoch,sequence:appliedSequence});
  };
  port.onmessageerror=()=>fail(Error('Native intent control transfer failed'));
  port.start?.();
  timer=setTimeout(()=>fail(Error('Native intent control bootstrap timed out')),timeoutMs);
  try{
    stop=observe({
      onBaseline(baseline){
        if(authorityEpoch!==null)throw Error('Native intent baseline repeated');
        authorityEpoch=baseline.authorityEpoch;baselineSequence=sentSequence=baseline.sequence;
        port.postMessage({...baseline,session});
      },
      onChanges(changes){
        if(closed)return;
        for(const event of changes){
          if(event.authorityEpoch!==authorityEpoch||event.sequence!==sentSequence+1)
            throw Error('Native intent publication lost causal order');
          sentSequence=event.sequence;port.postMessage({...event,session});
        }
      },
      onClosed(reason){if(reason instanceof Error)fail(reason);else dispose(reason);},
    });
  }catch(error){fail(error);throw error;}
  return {ready,dispose,status:()=>({session,authorityEpoch,baselineSequence,
    sentSequence,appliedSequence,closed,fault})};
}
