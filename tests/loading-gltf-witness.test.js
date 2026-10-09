import test from 'node:test';
import assert from 'node:assert/strict';
import {observeLoadingGltf} from '../src/rendering/loading-gltf-witness.js';
test('ordinary GLTF loader remains identical and never reads a diagnostic clock',()=>{const loader={parse(){}};const parse=loader.parse;observeLoadingGltf(loader,null,()=>{throw Error('clock');});assert.equal(loader.parse,parse);});
test('parse attribution excludes transfer and forwards asynchronous result with exact receiver',()=>{let time=100,load,error,receiver,delivered;const events=[],starts=[],witness=e=>events.push(e);witness.onBegin=e=>starts.push(e);const loader={parse(data,path,yes,no){receiver=this;load=yes;error=no;time=103;return 7;}};observeLoadingGltf(loader,witness,()=>time);const result=loader.parse(new ArrayBuffer(12),'models/',function(value){delivered={value,receiver:this};},()=>{});assert.equal(result,7);assert.equal(receiver,loader);assert.equal(events.length,1);assert.equal(events[0].duration,3);assert.equal(starts[0].bytes,12);time=160;const resultOwner={};load.call(resultOwner,{scene:1});assert.deepEqual(delivered,{value:{scene:1},receiver:resultOwner});assert.equal(events[1].duration,60);assert.equal(events[1].failed,false);error(Error('late'));assert.equal(events.length,2);});
test('throwing diagnostics do not prevent parse or change its original failure',()=>{const original=Error('decoder');let called=0;const loader={parse(){called++;throw original;}},witness=()=>{throw Error('diagnostic');};witness.onBegin=witness;observeLoadingGltf(loader,witness,()=>1);assert.throws(()=>loader.parse(new ArrayBuffer(1),'/',()=>{},()=>{}),error=>error===original);assert.equal(called,1);});
test('asynchronous decoder rejection closes pending span and preserves error callback',()=>{let fail,time=0,observed;const events=[],loader={parse(data,path,yes,no){fail=no;}};observeLoadingGltf(loader,e=>events.push(e),()=>time);loader.parse(new ArrayBuffer(1),'/',()=>{},error=>observed=error);const error=Error('decoder');time=20;fail(error);assert.equal(observed,error);assert.equal(events[1].failed,true);assert.equal(events[1].duration,20);});

function progressFixture(witnessOverride,clockOverride){
 let time=0;const events=[],requests=new Map(),pending=[];
 const loader={load(url,onLoad,onProgress,onError){requests.set(url,{onProgress,onError,deliver(data){loader.parse(data,'same/',onLoad,onError);}});return 'request:'+url;},parse(data,path,onLoad,onError){pending.push({data,onLoad,onError});return 'parse';}};
 observeLoadingGltf(loader,witnessOverride??(span=>events.push(span)),clockOverride??(()=>time));
 return {loader,events,requests,pending,time:value=>{time=value;},summaries:()=>events.filter(e=>e.label.startsWith('asset-gltf-progress:'))};
}
test('progress forwards exact this/arguments/return once and associates parse by callback identity',()=>{
 const f=progressFixture();let calls=0;const receiver={},event={loaded:12,total:12,lengthComputable:true};
 assert.equal(f.loader.load('A',()=>{},function(...args){calls++;assert.equal(this,receiver);assert.deepEqual(args,[event,7]);f.time(5);return 42;},()=>{}),'request:A');
 f.time(2);assert.equal(f.requests.get('A').onProgress.call(receiver,event,7),42);assert.equal(calls,1);
 f.time(20);f.requests.get('A').deliver(new ArrayBuffer(12));f.time(40);f.pending[0].onLoad({scene:1});
 const s=f.summaries()[0];assert.equal(s.count,1);assert.equal(s.firstAt,2);assert.equal(s.lastAt,2);assert.equal(s.loaded,12);assert.equal(s.total,12);assert.equal(s.callbackCpuMs,3);assert.equal(s.parseStart,20);assert.equal(s.lastProgressToParseMs,18);assert.equal(s.parseBytes,12);
});
test('interleaving same path and equal byte-size parses preserve request identity',()=>{
 const f=progressFixture();for(const url of ['A','B'])f.loader.load(url,()=>{},()=>{},()=>{});
 f.time(1);f.requests.get('A').onProgress({loaded:8,total:8,lengthComputable:true});f.time(2);f.requests.get('B').onProgress({loaded:8,total:8,lengthComputable:true});
 f.time(10);f.requests.get('B').deliver(new ArrayBuffer(8));f.time(15);f.requests.get('A').deliver(new ArrayBuffer(8));f.time(20);f.pending[1].onLoad({scene:'A'});f.time(30);f.pending[0].onLoad({scene:'B'});
 const [a,b]=f.summaries();assert.equal(a.label,'asset-gltf-progress:A');assert.equal(a.parseStart,15);assert.equal(b.label,'asset-gltf-progress:B');assert.equal(b.parseStart,10);
});
test('zero progress events and network errors have no inferred parse or transfer gap',()=>{
 const f=progressFixture();const error=Error('network');let delivered;
 f.loader.load('A',()=>{},undefined,function(value){delivered={value,receiver:this};return 9;});const receiver={};f.time(7);assert.equal(f.requests.get('A').onError.call(receiver,error),9);assert.deepEqual(delivered,{value:error,receiver});
 const s=f.summaries()[0];assert.equal(s.count,0);assert.equal(s.firstAt,null);assert.equal(s.lastProgressToParseMs,null);assert.equal(s.parseStart,null);assert.equal(s.failed,true);
});
test('original progress exception survives once and synchronous callback cost is summarized',()=>{
 const f=progressFixture(),error=Error('callback');let calls=0;
 f.loader.load('A',()=>{},()=>{calls++;f.time(6);throw error;},()=>{});f.time(1);assert.throws(()=>f.requests.get('A').onProgress({loaded:3,total:8}),e=>e===error);assert.equal(calls,1);f.requests.get('A').onError(error);assert.equal(f.summaries()[0].callbackFailures,1);assert.equal(f.summaries()[0].callbackCpuMs,5);
});
test('throwing observer and clock never alter callback or load/parse return',()=>{
 const witness=()=>{throw Error('observer');};witness.onBegin=witness;const f=progressFixture(witness,()=>{throw Error('clock');});let value;
 assert.equal(f.loader.load('A',function(...args){value={args,receiver:this};return 81;},()=>22,()=>{}),'request:A');assert.equal(f.requests.get('A').onProgress({loaded:2,total:2}),22);assert.equal(f.requests.get('A').deliver(new ArrayBuffer(2)),undefined);const receiver={},gltf={scene:1};assert.equal(f.pending[0].onLoad.call(receiver,gltf,4),81);assert.deepEqual(value,{args:[gltf,4],receiver});
});
test('decode failure associates only its exact callback delivery and retains error receiver',()=>{
 const f=progressFixture();let got;f.loader.load('A',()=>{},()=>{},function(error){got={error,receiver:this};return 6;});f.time(9);f.requests.get('A').deliver(new ArrayBuffer(4));const error=Error('decoder'),receiver={};f.time(15);assert.equal(f.pending[0].onError.call(receiver,error),6);assert.deepEqual(got,{error,receiver});assert.equal(f.summaries()[0].parseStart,9);assert.equal(f.summaries()[0].failed,true);
});

test('real Three GLTFLoader callback chain associates cached body without path guessing',async()=>{
 const {Cache}=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');const enabled=Cache.enabled,url='diagnostic-callback-contract.gltf',body=JSON.stringify({asset:{version:'2.0'},scenes:[{nodes:[]}],scene:0,nodes:[]}),events=[];
 Cache.enabled=true;Cache.add(`file:${url}`,body);
 try{const loader=new GLTFLoader();observeLoadingGltf(loader,e=>events.push(e));const gltf=await loader.loadAsync(url);assert.ok(gltf.scene);const summary=events.find(e=>e.label==='asset-gltf-progress:'+url);assert.ok(summary.association.startsWith('Exact synchronous'));assert.equal(summary.count,0);assert.ok(Number.isFinite(summary.parseStart));assert.equal(summary.lastProgressToParseMs,null);}finally{Cache.remove(`file:${url}`);Cache.enabled=enabled;}
});

test('missing callbacks and trailing load arguments retain original loader semantics',()=>{
 const witness=()=>{},receiver={},loader={parse(){},load(...args){assert.equal(this,receiver);assert.deepEqual(args,['A',undefined,null,undefined,9]);return 17;}};observeLoadingGltf(loader,witness);assert.equal(loader.load.call(receiver,'A',undefined,null,undefined,9),17);
});
