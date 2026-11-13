import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {setImmediate as turn} from 'node:timers/promises';
import {createNativeIntentControlCohort} from '../src/simulation/native-intent-control-cohort.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';

function consumer({baseline=true,quiesce=true,retire=true}={}){
 const {port1,port2}=new MessageChannel(),messages=[];let draw;
 const send=data=>port2.postMessage({...data,accepted:true});
 function ack(m){
  if(m.type==='IntentBaseline')send({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,
   clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  if(m.type==='IntentMutationQuiesce')send({...m,type:'intent-mutation-quiesced'});
  if(m.type==='IntentControlRetire')send({...m,type:'intent-control-drained'});
 }
 port2.onmessage=({data:m})=>{
  messages.push(m);
  if(m.type==='IntentBaseline'){
   draw=createNativeRouteControl({authorityEpoch:m.authorityEpoch,initialSequence:m.sequence,initialTime:m.effectiveTime,routes:m.routes});
   draw.acceptClock(m.clock,{baseline:true});if(baseline)ack(m);
  }else if(m.type==='IntentClock'){
   draw.acceptClock(m);send({type:'intent-clock-applied',session:m.session,authorityEpoch:m.authorityEpoch,
    clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough});
  }else if(m.type==='IntentMutationQuiesce'){if(quiesce)ack(m);}
  else if(m.type==='IntentControlRetire'){draw.dispose();if(retire)ack(m);}
  else if(m.type==='IntentControlClosed')draw.dispose();
  else if(m.type!=='IntentMutationRelease'){
   draw.accept(m);send({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence});
  }
 };
 return {port:port1,messages,ack,send,
  async request(type){for(let i=0;i<200;i++){const m=messages.find(m=>m.type===type);if(m)return m;await turn();}throw Error('Missing '+type);},
  dispose(){port1.close();port2.close();}};
}
function setup(){
 const f=createNativeRouteExecutionFixture();f.worker(1,f.point(-6,0),f.point(6,0));
 f.bridge.beginNativeRouteExecution();f.advance(11);f.bridge.commitNativeCausalClock();
 const errors=[],cohort=createNativeIntentControlCohort({observe:f.bridge.observeNativeIntentControl,
  onError:e=>errors.push(e),publicationOptions:{timeoutMs:200}});
 return {...f,cohort,errors,mutate:()=>f.bridge.addNativeBarrierAfterGpuQuiescence({getPublication:()=>cohort,
  ...f.point(2,0),halfX:.15,halfZ:.6}),dispose(){cohort.dispose();f.session.dispose();}};
}

test('a pending replacement cannot be omitted from a conditioned world boundary, even before its baseline ACK',async()=>{
 const f=setup(),a=consumer(),b=consumer({baseline:false,retire:false});
 try{
  await f.cohort.attach(a.port,'cohort');const before=f.session.core.snapshot();
  const attached=f.cohort.attach(b.port,'cohort'),baseline=await b.request('IntentBaseline');
  assert.equal(f.cohort.status().consumers,2);assert.equal(f.cohort.status().coherent,false);
  assert.equal((await f.mutate()).status,'control-failed');assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(a.messages.some(m=>m.type==='IntentMutationQuiesce'),false);
  b.ack(baseline);await attached;
  assert.equal(f.cohort.status().consumers,1);assert.equal(f.cohort.status().coherent,true);
  assert.equal((await f.mutate()).status,'committed');assert.notDeepEqual(f.session.core.snapshot(),before);
 }finally{a.dispose();b.dispose();f.dispose();}
});

test('membership is frozen during a physical proposal and a copied old cohort receipt cannot release it',async()=>{
 const f=setup(),a=consumer({quiesce:false}),b=consumer();
 try{
  await f.cohort.attach(a.port,'cohort');const pending=f.mutate(),request=await a.request('IntentMutationQuiesce');
  await assert.rejects(f.cohort.attach(b.port,'cohort'),/unavailable/);
  assert.throws(()=>f.cohort.releaseGpuAfterMutation({...request}),/stale/);
  a.ack(request);assert.equal((await pending).status,'committed');
  await f.cohort.attach(b.port,'cohort');assert.equal(f.cohort.status().consumers,1);
  assert.throws(()=>f.cohort.releaseGpuAfterMutation(request),/stale/);
 }finally{a.dispose();b.dispose();f.dispose();}
});

test('an undrained or silently lost predecessor stays registered and blocks both physical commit and later replacement',async()=>{
 for(const kind of ['silent','forged','retired']){
  const f=setup(),a=consumer({retire:false}),b=consumer(),c=consumer();
  try{
   await f.cohort.attach(a.port,'cohort');const before=f.session.core.snapshot();
   const replaced=f.cohort.attach(b.port,'cohort'),rejected=assert.rejects(replaced,/retirement/),request=await a.request('IntentControlRetire');
   if(kind==='forged')a.send({...request,type:'intent-control-drained',retirementId:'previous-worker'});
   if(kind==='retired')a.send({...request,type:'intent-control-retired'});
   await rejected;assert.equal(f.cohort.status().consumers,2);assert.equal(f.cohort.status().closed,true);
   assert.equal((await f.mutate()).status,'control-unavailable');assert.deepEqual(f.session.core.snapshot(),before);
   await assert.rejects(f.cohort.attach(c.port,'cohort'),/unavailable/);
   a.ack(request);await turn();assert.equal(f.cohort.status().closed,true,'a late receipt cannot revive the cohort');
  }finally{a.dispose();b.dispose();c.dispose();f.dispose();}
 }
});

test('silence after quiescence was requested cannot apply a staged native mutation',async()=>{
 const f=setup(),a=consumer({quiesce:false});
 try{
  await f.cohort.attach(a.port,'cohort');const before=f.session.core.snapshot();
  const pending=f.mutate(),request=await a.request('IntentMutationQuiesce');
  assert.equal((await pending).status,'control-failed');assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(f.cohort.status().closed,true);a.ack(request);await turn();assert.deepEqual(f.session.core.snapshot(),before);
 }finally{a.dispose();f.dispose();}
});
