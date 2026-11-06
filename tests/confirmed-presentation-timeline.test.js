import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('timeline exposes matching reconciled state and terrain before pose and event observers',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start),sent=[],order=[],port={postMessage:m=>sent.push(m),start(){},close(){}};let terrainRevision=0;
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:2,maxBytes:50000000},terrain:{ready:()=>true,confirm:(sequence,elapsed)=>{assert.equal(elapsed,state.elapsed);assert.equal(clock.elapsed,state.elapsed);assert.equal(state.raid.animals[0].x,authority.raid.animals[0].x);terrainRevision=sequence;order.push('terrain');}},onPhysics:()=>{assert.equal(terrainRevision,1);order.push('pose');}});
 const stop=observePresentationGameEvents(state,()=>{assert.equal(terrainRevision,1);order.push('event');});
 try{authority.elapsed=start+1;authority.raid.animals[0].x+=1;emit(authority,'Test');port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)],physicsPose:null}}});stream.advancePresentationTo(start+1);assert.deepEqual(order,['terrain','pose','event']);assert.equal(sent.at(-1).kind,'publicationAck');}finally{stop();stream.dispose();clock.dispose();}
});
test('failed terrain barrier emits neither pose nor event nor application acknowledgement',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start),sent=[],seen=[],errors=[],port={postMessage:m=>sent.push(m),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:2,maxBytes:50000000},terrain:{ready:()=>true,confirm:()=>{throw Error('terrain failed');}},onPhysics:()=>seen.push('pose'),onError:error=>errors.push(error.message)}),stop=observePresentationGameEvents(state,()=>seen.push('event'));
 try{authority.elapsed=start+1;emit(authority,'Test');port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)],physicsPose:null}}});stream.advancePresentationTo(start+1);assert.deepEqual(seen,[]);assert.deepEqual(errors,['terrain failed']);assert.deepEqual(sent.map(m=>m.kind),['publicationReceipt']);assert.equal(stream.status().fault,true);assert.equal(stream.status().closed,true);}finally{stop();stream.dispose();clock.dispose();}
});
test('timeline retains ordered publications until both simulation time and terrain are ready',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start),sent=[],applied=[],events=[],errors=[];let ready=0;
 const port={postMessage:m=>sent.push(m),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:4,maxBytes:50000000},terrain:{ready:n=>n<=ready,confirm:n=>applied.push(n)},onError:e=>errors.push(e)});
 const stop=observePresentationGameEvents(state,e=>events.push(e.type));
 try{
  const publications=[];
  for(let n=1;n<=2;n++){authority.elapsed=start+n;emit(authority,'Test'+n);publications.push({kind:'publication',session:'s',publication:{session:'s',sequence:n,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)]}});}
  for(const publication of publications)port.onmessage({data:publication});
  assert.deepEqual(sent.map(m=>m.kind),['publicationReceipt','publicationReceipt']);assert.equal(state.elapsed,start);assert.deepEqual(events,[]);assert.throws(()=>stream.advancePresentationTo(start+3),/timeline time/);
  stream.advancePresentationTo(start+1);assert.equal(state.elapsed,start);ready=2;stream.terrainReady();assert.equal(state.elapsed,start+1);assert.equal(clock.elapsed,start+1);assert.deepEqual(applied,[1]);assert.deepEqual(events,['Test1']);assert.deepEqual(sent.map(m=>[m.kind,m.sequence]),[['publicationReceipt',1],['publicationReceipt',2],['publicationAck',1]]);
  stream.advancePresentationTo(start+2);assert.equal(state.elapsed,start+2);assert.deepEqual(applied,[1,2]);assert.deepEqual(events,['Test1','Test2']);assert.equal(sent.at(-1).sequence,2);assert.equal(sent.at(-1).kind,'publicationAck');assert.deepEqual(errors,[]);
 }finally{stop();stream.dispose();clock.dispose();}
});
test('timeline fails closed on saturation without acknowledging the dropped publication',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),clock=createConfirmedPresentationClock(state.elapsed),sent=[],errors=[],port={postMessage:m=>sent.push(m),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:1,maxBytes:50000000},terrain:{ready:()=>false,confirm(){throw Error('unexpected');}},onError:e=>errors.push(e.message)});
 try{for(let n=1;n<=2;n++){authority.elapsed+=1;port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:n,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[]}}});}assert.deepEqual(sent.map(m=>[m.kind,m.sequence]),[['publicationReceipt',1]]);assert.match(errors[0],/capacity/);assert.equal(stream.status().closed,true);assert.equal(state.elapsed,clock.elapsed);}finally{stream.dispose();clock.dispose();}
});

test('timeline exchanges receipts and application ACKs with the real visual producer',async()=>{
 const {openVisualStream}=await import('../src/simulation/visual-publication-stream.js');
 const state=fixture(),authority=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start),down=[],up=[],errors=[];let ready=0;
 const source={postMessage:m=>down.push(m),start(){},close(){}},sink={postMessage:m=>up.push(m),start(){},close(){}};
 const sender=openVisualStream(source,'s',()=>{},{receiptAcknowledgements:true,incrementalTransport:true,highWatermark:3});
 const receiver=createConfirmedPresentationStream({port:sink,session:'s',state,presentationClock:clock,timeline:{maxPublications:3,maxBytes:50000000},terrain:{ready:n=>n<=ready,confirm(){}},onError:e=>errors.push(e)});
 try{
  for(let n=1;n<=2;n++){authority.elapsed=start+n;emit(authority,'Test'+n);sender.publish({session:'s',sequence:n,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)],physicsPose:null},true);}
  sink.onmessage({data:down.shift()});source.onmessage({data:up.shift()});sink.onmessage({data:down.shift()});source.onmessage({data:up.shift()});
  assert.equal(sender.status().received,2);assert.equal(sender.status().acknowledged,0);assert.equal(state.elapsed,start);
  ready=2;receiver.advancePresentationTo(start+2);while(up.length)source.onmessage({data:up.shift()});
  assert.equal(sender.status().acknowledged,2);assert.equal(state.elapsed,start+2);assert.deepEqual(errors,[]);
 }finally{sender.close();receiver.dispose();clock.dispose();}
});

test('timeline hides recovery bypass and reports producer failure without acknowledging it',()=>{
 const state=fixture(),clock=createConfirmedPresentationClock(state.elapsed),sent=[],errors=[],port={postMessage:m=>sent.push(m),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:1,maxBytes:100000},terrain:{ready:()=>false,confirm(){}},onError:e=>errors.push(e.message)});
 try{assert.equal(stream.acceptRecovery,undefined);port.onmessage({data:{kind:'presentationFailure',session:'s',message:'authority stopped'}});assert.deepEqual(errors,['authority stopped']);assert.deepEqual(sent,[]);assert.equal(stream.status().closed,true);}finally{stream.dispose();clock.dispose();}
});
