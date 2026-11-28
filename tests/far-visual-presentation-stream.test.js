import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';

test('graphical stream discards a regional reply when an ordered publication advances its state',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),next=deserialize(serialize(state));next.elapsed+=.1;
 let release,start,confirmed;const invoked=new Promise(resolve=>{start=resolve;}),committed=new Promise(resolve=>{confirmed=resolve;});
 const host=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{start();return new Promise(resolve=>{release=resolve;});}}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){}},allowFarVisualQueries:true,onConfirmed:confirmed});
 try{const pending=stream.queryFarVisualChunk({cx:0,cz:0,slots:[0],expectedSequence:0});await invoked;channel.port1.postMessage({kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serializeConfirmedState(next),events:[],physicsPose:null}});await committed;release({cx:0,cz:0,sequence:0,revision:1,elapsed:next.elapsed-.1,instances:Array.from({length:20},()=>[])});assert.equal(await pending,null);assert.equal(stream.status().sequence,1);}finally{stream.dispose();host.close();}
});

test('graphical stream retains a regional answer across ticks only while the committed world revision matches',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),next=deserialize(serialize(state));let release,start,notify;
 const host=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{start();return new Promise(resolve=>{release=resolve;});}}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){}},allowFarVisualQueries:true,onConfirmed:()=>notify?.()});
 const publish=async(sequence,revision)=>{next.elapsed+=.1;const done=new Promise(resolve=>{notify=resolve;});host.publish({session:'s',sequence,snapshot:serializeConfirmedState(next),events:[],physicsPose:null,farVisualRevision:revision},true);await done;notify=null;};
 try{await publish(1,8);assert.equal(stream.farVisualRevision(),8);let invoked=new Promise(resolve=>{start=resolve;});let pending=stream.queryFarVisualChunk({cx:0,cz:0,slots:[0],expectedSequence:1,expectedRevision:8});await invoked;await publish(2,8);release({cx:0,cz:0,sequence:2,revision:8,elapsed:next.elapsed,instances:Array.from({length:20},()=>[])});assert.equal((await pending).revision,8);invoked=new Promise(resolve=>{start=resolve;});pending=stream.queryFarVisualChunk({cx:0,cz:0,slots:[0],expectedSequence:2,expectedRevision:8});await invoked;await publish(3,9);release({cx:0,cz:0,sequence:2,revision:8,elapsed:next.elapsed-.1,instances:Array.from({length:20},()=>[])});assert.equal(await pending,null);}finally{stream.dispose();host.close();}
});

test('an unchanged publication updates the confirmed revision before its observer runs',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());let resolve,seen;
 const host=openVisualStream(channel.port1,'s',()=>{}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){}},allowFarVisualQueries:true,onError:error=>{seen=error;resolve();},onConfirmed:()=>resolve(),onUnchanged:()=>{seen=stream.farVisualRevision();resolve();}});
 try{let done=new Promise(done=>{resolve=done;});host.publish({session:'s',sequence:1,snapshot:serializeConfirmedState(state),events:[],physicsPose:null,farVisualRevision:8},true);await done;done=new Promise(done=>{resolve=done;});host.publish({session:'s',sequence:2,unchanged:true,slotId:state.slotId,stateSequence:state.sequence,elapsed:state.elapsed,pauses:[...state.pauses],saveAvailable:true,events:[],farVisualRevision:9},false);await done;assert.equal(seen,9);}finally{stream.dispose();host.close();}
});

test('regional queries wait until temporal recovery replay has finished',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());let calls=0;
 const host=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:request=>{calls++;return {cx:request.cx,cz:request.cz,sequence:request.expectedSequence,revision:1,elapsed:state.elapsed,instances:Array.from({length:20},()=>[])};}}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){},ready(){return true;}},presentationClock:{elapsed:state.elapsed,commit(){}},timeline:{replay:true,manualBoundaries:true,maxPublications:8,maxBytes:1000000},allowFarVisualQueries:true});
 const request={cx:0,cz:0,slots:[0],expectedSequence:0};
 try{assert.equal(await stream.queryFarVisualChunk(request),null);assert.equal(calls,0);stream.finishTimelineReplay();assert.equal((await stream.queryFarVisualChunk(request)).revision,1);assert.equal(calls,1);}finally{stream.dispose();host.close();}
});

test('regional queries wait for presentation timeline negotiation',async()=>{
 const messages=[],state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),port={postMessage(message){messages.push(message);},start(){},close(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){},ready(){return true;}},presentationClock:{elapsed:state.elapsed,commit(){}},timeline:{handshake:true,manualBoundaries:true,maxPublications:8,maxBytes:1000000},allowFarVisualQueries:true});
 const request={cx:0,cz:0,slots:[0],expectedSequence:0};
 try{assert.equal(await stream.queryFarVisualChunk(request),null);assert.deepEqual(messages.map(message=>message.kind),['presentationTimelineHello']);port.onmessage({data:{kind:'presentationTimelineReady',session:'s',version:1}});const result=stream.queryFarVisualChunk(request),query=messages.at(-1);assert.equal(query.kind,'farVisualQuery');port.onmessage({data:{kind:'farVisualResult',session:'s',id:query.id,result:{cx:0,cz:0,sequence:0,revision:1,elapsed:state.elapsed,instances:Array.from({length:20},()=>[])}}});assert.equal((await result).revision,1);}finally{stream.dispose();}
});

test('detachment discards an in-flight regional answer from the old port',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());let release,start,failures=0;const invoked=new Promise(resolve=>{start=resolve;});
 const host=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{start();return new Promise(resolve=>{release=resolve;});}}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){}},allowFarVisualQueries:true,onError:()=>{failures++;}});
 try{const pending=stream.queryFarVisualChunk({cx:0,cz:0,slots:[0],expectedSequence:0});await invoked;channel.port1.postMessage({kind:'presentationDetached',session:'s'});assert.equal(await pending,null);release({cx:0,cz:0,sequence:0,revision:1,elapsed:state.elapsed,instances:Array.from({length:20},()=>[])});await new Promise(resolve=>setImmediate(resolve));assert.equal(stream.status().closed,true);assert.equal(failures,0);}finally{stream.dispose();host.close();}
});
