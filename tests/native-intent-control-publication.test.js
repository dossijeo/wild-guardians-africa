import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function fixture({autoAck=true,autoFence=true,timeoutMs=10000}={}){
  const {port1,port2}=new MessageChannel(),errors=[],received=[];
  let observers,control;
  port2.onmessage=({data:message})=>{
    received.push(message);
    if(message.type==='IntentControlFence'){
      if(autoFence)port2.postMessage({...message,type:'intent-control-fenced',accepted:true});
      return;
    }
    if(message.type==='IntentBaseline')control=createNativeRouteControl({
      authorityEpoch:message.authorityEpoch,initialSequence:message.sequence,
      initialTime:message.effectiveTime,routes:message.routes});
    else if(message.type==='IntentControlClosed'){control.dispose();return;}
    else control.accept(message);
    if(autoAck)port2.postMessage({type:'intent-control-applied',session:'session-a',
      authorityEpoch:message.authorityEpoch,sequence:message.sequence,accepted:true});
  };
  let stopped=false;
  const publication=createNativeIntentControlPublication({port:port1,session:'session-a',timeoutMs,
    observe:callbacks=>{observers=callbacks;callbacks.onBaseline({type:'IntentBaseline',
      protocolVersion:2,authorityEpoch:'native-owner/1',sequence:9,effectiveTime:10,routes:[]});
      return ()=>{stopped=true;};},onError:error=>errors.push(error)});
  return {publication,port2,errors,received,observers,get control(){return control;},
    get stopped(){return stopped;},dispose(){publication.dispose();port2.close();}};
}

test('direct native publication starts from a high-water baseline, not obsolete event replay',async()=>{
  const f=fixture();
  try{
    assert.deepEqual(await f.publication.ready,{authorityEpoch:'native-owner/1',sequence:9});
    assert.equal(f.received.length,1);
    assert.equal(f.received[0].session,'session-a');
    assert.equal(f.publication.status().appliedSequence,9);
    const handle={authorityEpoch:'native-owner/1',session:1,slot:0,generation:1};
    f.observers.onChanges([{protocolVersion:2,type:'RouteAssigned',authorityEpoch:'native-owner/1',
      sequence:10,effectiveTime:11,actorId:7,routeHandle:handle,revokedRouteHandle:null}]);
    assert.equal(f.publication.status().sentSequence,10);
    const message=await new Promise(resolve=>f.port2.once('message',resolve));
    assert.equal(message.sequence,10);
    assert(f.control.admit({actorId:7,routeHandle:handle,assignmentSequence:10}));
    assert.deepEqual(f.errors,[]);
  }finally{f.dispose();}
});

test('an acknowledgement from another transport session closes the source',async()=>{
  const f=fixture({autoAck:false});
  try{
    const rejected=assert.rejects(f.publication.ready,/acknowledgement/);
    f.port2.postMessage({type:'intent-control-applied',session:'wrong-session',
      authorityEpoch:'native-owner/1',sequence:9,accepted:true});
    await rejected;
    assert.equal(f.publication.status().closed,true);
    assert.equal(f.stopped,true);
    assert.equal(f.errors.length,1);
  }finally{f.dispose();}
});

test('native reset retires a live connection and releases its observer',async()=>{
  const f=fixture();
  try{
    await f.publication.ready;
    const retirement=new Promise(resolve=>f.port2.once('message',resolve));
    f.observers.onClosed('native-reset');
    assert.equal((await retirement).type,'IntentControlClosed');
    assert.equal(f.stopped,true);
    assert.equal(f.publication.status().closed,true);
    assert.deepEqual(f.errors,[]);
  }finally{f.dispose();}
});

test('GPU drain receipts are separate from ordinary control ACKs and keep their exact causal boundary',async()=>{
 const f=fixture({autoFence:false});try{
  await f.publication.ready;const message=new Promise(resolve=>f.port2.once('message',resolve));
  let resolved=false;const receipt=f.publication.fenceGpu().then(value=>{resolved=true;return value;}),request=await message;
  assert.equal(request.type,'IntentControlFence');assert.equal(request.fenceId,1);
  assert.equal(resolved,false);assert.equal(f.publication.status().pendingGpuFences,1);
  f.port2.postMessage({...request,type:'intent-control-fenced',accepted:true});
  assert.deepEqual(await receipt,{authorityEpoch:'native-owner/1',sequence:9,effectiveTime:10,fenceId:1});
  assert.equal(f.publication.status().pendingGpuFences,0);
 }finally{f.dispose();}
});

test('wrong epoch or forged GPU drain receipts cannot authorize the pending boundary',async()=>{
 for(const change of [{authorityEpoch:'other/1'},{session:'other'},{sequence:10},{effectiveTime:11},{fenceId:2},{accepted:false}]){
  const f=fixture({autoFence:false});try{
   await f.publication.ready;const message=new Promise(resolve=>f.port2.once('message',resolve)),
    rejected=assert.rejects(f.publication.fenceGpu(),/GPU fence acknowledgement/),request=await message;
   f.port2.postMessage({...request,type:'intent-control-fenced',accepted:true,...change});await rejected;
   assert.equal(f.publication.status().closed,true);assert.equal(f.publication.status().pendingGpuFences,0);
  }finally{f.dispose();}
 }
});

test('retirement and missing GPU receipts reject pending fences rather than silently granting them',async()=>{
 const f=fixture({autoFence:false});try{
  await f.publication.ready;const rejected=assert.rejects(f.publication.fenceGpu(),/GPU fence closed/);
  f.publication.dispose('replaced');await rejected;assert.equal(f.publication.status().pendingGpuFences,0);
 }finally{f.dispose();}
 const g=fixture({autoFence:false,timeoutMs:1000});try{
  await g.publication.ready;await assert.rejects(g.publication.fenceGpu(),/GPU fence timed out/);
  assert.equal(g.publication.status().closed,true);assert.equal(g.errors.length,1);
 }finally{g.dispose();}
});

test('native causal clock publication retains its anchor for watermarks and reanchors policy changes outside preparation',async()=>{
 const {port1,port2}=new MessageChannel();let callbacks,now=1000,draw;
 const record={protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner/1',nativeSession:1,clockSequence:4,intentSequence:9,
  committedThrough:10,paused:false,rate:1,reanchor:false};
 port2.onmessage=({data})=>{
  if(data.type==='IntentBaseline'){
   draw=createNativeRouteControl({authorityEpoch:data.authorityEpoch,initialSequence:data.sequence,initialTime:data.effectiveTime,routes:data.routes});
   draw.acceptClock(data.clock,{baseline:true});port2.postMessage({type:'intent-control-applied',session:'clock',authorityEpoch:data.authorityEpoch,
    sequence:data.sequence,accepted:true,clockSequence:data.clock.clockSequence,clockIntentSequence:data.clock.intentSequence,clockCommittedThrough:data.clock.committedThrough});
  }else if(data.type==='IntentClock'){
   draw.acceptClock(data);port2.postMessage({type:'intent-clock-applied',session:'clock',authorityEpoch:data.authorityEpoch,clockSequence:data.clockSequence,
    intentSequence:data.intentSequence,committedThrough:data.committedThrough,accepted:true});
  }else if(data.type==='IntentControlClosed')draw.dispose();
  else if(data.type==='IntentControlFence')port2.postMessage({...data,type:'intent-control-fenced',accepted:true});
 };
 const source=createNativeIntentControlPublication({port:port1,session:'clock',absoluteNow:()=>now,
  observe:observer=>{callbacks=observer;observer.onBaseline({type:'IntentBaseline',protocolVersion:2,authorityEpoch:record.authorityEpoch,
   sequence:9,effectiveTime:10,routes:[],clock:record});return ()=>{};}});
 try{
  await source.ready;assert.equal(source.status().appliedClockSequence,4);
  const received=new Promise(resolve=>port2.once('message',resolve));callbacks.onClock({...record,clockSequence:5,committedThrough:11});
  const watermark=await received;assert.equal(watermark.anchorLogicalTime,10);assert.equal(watermark.anchorAbsoluteMs,1000);
  now=1500;const policyMessage=new Promise(resolve=>port2.once('message',resolve));
  callbacks.onClock({...record,clockSequence:6,committedThrough:11,rate:2,reanchor:true});
  const policy=await policyMessage;assert.equal(policy.anchorLogicalTime,11);assert.equal(policy.anchorAbsoluteMs,1500);
  assert.equal((await source.fenceGpu()).clockSequence,6);assert.equal(draw.status().clock.rate,2);
 }finally{source.dispose();port2.close();}
});

test('a forged causal clock bootstrap acknowledgement cannot make a draw connection ready',async()=>{
 const {port1,port2}=new MessageChannel(),record={protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner/1',nativeSession:1,clockSequence:1,
  intentSequence:9,committedThrough:10,paused:false,rate:1,reanchor:true};
 port2.onmessage=({data})=>{if(data.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:'clock',authorityEpoch:record.authorityEpoch,
  sequence:9,accepted:true,clockSequence:1,clockIntentSequence:9,clockCommittedThrough:11});};
 const source=createNativeIntentControlPublication({port:port1,session:'clock',observe:observer=>{
  observer.onBaseline({type:'IntentBaseline',protocolVersion:2,authorityEpoch:record.authorityEpoch,sequence:9,effectiveTime:10,routes:[],clock:record});return ()=>{};}});
 try{await assert.rejects(source.ready,/clock acknowledgement/);assert.equal(source.status().closed,true);}
 finally{source.dispose();port2.close();}
});

test('an already-live legacy connection cannot be silently upgraded into a causal clock permit',async()=>{
 const f=fixture();try{
  await f.publication.ready;f.observers.onClock({protocolVersion:2,clockVersion:1,authorityEpoch:'native-owner/1',nativeSession:1,
   clockSequence:1,intentSequence:9,committedThrough:10,paused:false,rate:1,reanchor:true});
  assert.equal(f.publication.status().closed,true);assert.match(f.publication.status().fault,/fresh clock-aware bootstrap/);
  assert.equal(f.errors.length,1);
 }finally{f.dispose();}
});
