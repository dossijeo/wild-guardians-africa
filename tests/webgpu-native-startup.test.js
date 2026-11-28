import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {attachWebGpuNativeResources} from '../src/app/webgpu-native-startup.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function setup(){const ports=[0,1].map(()=>({closed:0,close(){this.closed++;}})),ack=deferred(),calls=[];return {ports,ack,calls,options:{client:{attachNativeResourcePreparation:port=>calls.push(['graphics',port])},runtime:{attachNativeResourcePreparation:port=>{calls.push(['source',port]);return ack.promise;}},isCurrent:()=>true,channelFactory:()=>({port1:ports[0],port2:ports[1]})}};}

test('startup awaits the actual same-port handshake and leaves successful owners alive',async()=>{
 const channel=new MessageChannel();let graphicsPort,connection,endpoint,settled=false;
 const ready=attachWebGpuNativeResources({client:{attachNativeResourcePreparation:port=>{graphicsPort=port;}},runtime:{attachNativeResourcePreparation:port=>{assert.equal(port,channel.port1);connection=createNativeResourcePreparationConnection({port,session:'startup'});return connection.ready;}},isCurrent:()=>true,channelFactory:()=>channel}).then(value=>{settled=true;return value;});
 try{
  assert.equal(graphicsPort,channel.port2);await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  endpoint=attachNativeResourcePreparationEndpoint({port:graphicsPort,session:'startup',isRunning:()=>true,prepare:()=>{throw Error('Handshake must not prepare or publish an actor');}});
  assert.deepEqual(await ready,{version:1,session:'startup'});assert.equal(connection.status().phase,'running');await connection.flush();assert.equal(connection.status().phase,'running');
 }finally{connection?.dispose();endpoint?.dispose();channel.port1.close();channel.port2.close();await ready.catch(()=>{});}
});

test('source transfer waits for graphics attachment and startup waits for its existing acknowledgement',async()=>{
 const f=setup();let finished=false;const ready=attachWebGpuNativeResources(f.options).then(value=>{finished=true;return value;});
 assert.deepEqual(f.calls,[['graphics',f.ports[1]],['source',f.ports[0]]]);await Promise.resolve();assert.equal(finished,false);f.ack.resolve({version:1,session:'s'});assert.deepEqual(await ready,{version:1,session:'s'});assert.deepEqual(f.ports.map(p=>p.closed),[0,0]);
});

test('a remote startup opens preparation only after the initial authoritative publication draws',async()=>{
 const f=setup(),drawn=deferred();
 f.options.initialSequence=17;
 f.options.client.waitForCurrentFrame=options=>{assert.deepEqual(options,{minSequence:17});return drawn.promise;};
 const ready=attachWebGpuNativeResources(f.options);
 assert.deepEqual(f.calls,[]);
 drawn.resolve({sequence:17});
 await Promise.resolve();
 assert.deepEqual(f.calls,[['graphics',f.ports[1]],['source',f.ports[0]]]);
 f.ack.resolve({version:1,session:'s'});
 assert.deepEqual(await ready,{version:1,session:'s'});
});

test('an initial draw for a replaced world cannot transfer the preparation port',async()=>{
 const f=setup(),drawn=deferred();
 let current=true;
 f.options.initialSequence=17;f.options.isCurrent=()=>current;
 f.options.client.waitForCurrentFrame=()=>drawn.promise;
 f.options.channelFactory=()=>{throw Error('Unexpected allocation');};
 const ready=attachWebGpuNativeResources(f.options);
 current=false;drawn.resolve({sequence:17});
 await assert.rejects(ready,/World changed/);
 assert.deepEqual(f.calls,[]);
});

test('an obsolete world allocates and transfers nothing',async()=>{
 const f=setup();let created=0;f.options.isCurrent=()=>false;f.options.channelFactory=()=>{created++;throw Error('Unexpected allocation');};await assert.rejects(attachWebGpuNativeResources(f.options),/World changed/);assert.equal(created,0);assert.deepEqual(f.calls,[]);
});

test('a world replaced while awaiting the real acknowledgement cannot activate startup',async()=>{
 const f=setup();let current=true;f.options.isCurrent=()=>current;const ready=attachWebGpuNativeResources(f.options);current=false;f.ack.resolve({version:1,session:'s'});await assert.rejects(ready,/World changed/);assert.deepEqual(f.ports.map(p=>p.closed),[1,1]);
});

test('graphics transfer failure closes both local ends without attempting source attachment',async()=>{
 const f=setup(),error=Error('GPU transfer failed');f.options.client.attachNativeResourcePreparation=()=>{throw error;};await assert.rejects(attachWebGpuNativeResources(f.options),e=>e===error);assert.deepEqual(f.calls,[]);assert.deepEqual(f.ports.map(p=>p.closed),[1,1]);
});

for(const asynchronous of [false,true])test(`source attachment failure closes local ends and preserves the error (async=${asynchronous})`,async()=>{
 const f=setup(),error=Error('Source attachment failed');if(!asynchronous)f.options.runtime.attachNativeResourcePreparation=()=>{throw error;};const ready=attachWebGpuNativeResources(f.options);if(asynchronous)f.ack.reject(error);await assert.rejects(ready,e=>e===error);assert.deepEqual(f.ports.map(p=>p.closed),[1,1]);
});

test('cleanup failure does not mask the attachment error or skip the other end',async()=>{
 const f=setup(),error=Error('Source closed');f.ports[0].close=()=>{throw Error('Local close failed');};const ready=attachWebGpuNativeResources(f.options);f.ack.reject(error);await assert.rejects(ready,e=>e===error);assert.equal(f.ports[1].closed,1);
});

test('missing endpoints fail before allocating a channel',async()=>{
 const f=setup();f.options.client={};let created=0;f.options.channelFactory=()=>{created++;};await assert.rejects(attachWebGpuNativeResources(f.options),/Invalid native resource startup/);assert.equal(created,0);
});
