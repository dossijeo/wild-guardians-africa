import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createFarVisualPortClient} from '../src/simulation/far-visual-port.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';

const request={cx:2,cz:-1,slots:[0],expectedSequence:4,expectedRevision:8};
const result=()=>({cx:2,cz:-1,sequence:4,revision:8,elapsed:1,instances:Array.from({length:20},()=>[])});
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('regional query uses the real visual port and rejects results after the confirmed sequence changes',async()=>{
 const channel=new MessageChannel();let sequence=4,release,started;
 let invoked=new Promise(resolve=>{started=resolve;}),server=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{started();return new Promise(resolve=>{release=resolve;});}}),client=createFarVisualPortClient({session:'s',port:channel.port2,sequence:()=>sequence});
 channel.port2.onmessage=({data})=>client.receive(data);channel.port2.start();
 try{const first=client.query(request);await invoked;assert.equal(await client.query(request),null);sequence=5;release(result());assert.equal(await first,null);sequence=4;invoked=new Promise(resolve=>{started=resolve;});const second=client.query(request);await invoked;release(result());assert.deepEqual(await second,result());}finally{client.dispose();server.close();channel.port2.close();}
});

test('cancellation and port replacement discard late native answers without queuing new work',async()=>{
 const channel=new MessageChannel();let release,started,seenSignal,calls=0;
 const invoked=new Promise(resolve=>{started=resolve;}),server=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:(_request,{signal})=>{calls++;seenSignal=signal;started();return new Promise(resolve=>{release=resolve;});}}),client=createFarVisualPortClient({session:'s',port:channel.port2,sequence:()=>4});
 channel.port2.onmessage=({data})=>client.receive(data);channel.port2.start();
 try{const abort=new AbortController(),first=client.query(request,{signal:abort.signal});await invoked;abort.abort();assert.equal(await first,null);assert.equal(await client.query(request),null);await turn();assert.equal(seenSignal.aborted,true);server.close();release(result());await turn();assert.equal(calls,1);}finally{client.dispose();server.close();channel.port2.close();}
});

test('an unchanged confirmed world revision permits a later authority sequence, but a changed revision rejects it',async()=>{
 const channel=new MessageChannel();let sequence=4,revision=8,release,started;let invoked=new Promise(resolve=>{started=resolve;});
 const server=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{started();return new Promise(resolve=>{release=resolve;});}}),client=createFarVisualPortClient({session:'s',port:channel.port2,sequence:()=>sequence,revision:()=>revision});
 channel.port2.onmessage=({data})=>client.receive(data);channel.port2.start();
 try{const first=client.query(request);await invoked;sequence=5;release({...result(),sequence:6});assert.equal((await first).sequence,6);invoked=new Promise(resolve=>{started=resolve;});const second=client.query({...request,expectedSequence:5});await invoked;sequence=6;revision=9;release({...result(),sequence:6});assert.equal(await second,null);}finally{client.dispose();server.close();channel.port2.close();}
});
test('an expected revision without a confirmed revision cannot authorize future authority state',async()=>{
 const channel=new MessageChannel();let release,start;const invoked=new Promise(resolve=>{start=resolve;}),server=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{start();return new Promise(resolve=>{release=resolve;});}}),client=createFarVisualPortClient({session:'s',port:channel.port2,sequence:()=>4});let rejected;channel.port2.onmessage=({data})=>{try{client.receive(data);}catch(error){rejected=error;client.dispose();}};channel.port2.start();
 try{const pending=client.query(request);await invoked;release({...result(),sequence:5});assert.equal(await pending,null);assert.match(rejected.message,/Invalid far visual response/);}finally{client.dispose();server.close();channel.port2.close();}
});
