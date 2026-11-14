import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createWebGpuFarRegion} from '../src/rendering/webgpu-far-region.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
const trees=(...items)=>Array.from({length:20},(_,slot)=>slot===0?items:[]);
const tree=id=>({id,x:0,y:0,z:0,yaw:0,scale:1});
test('regional queries are bounded, filtered and offered at the confirmed boundary',async()=>{
 let seq=3,resolve,active=0,peak=0;const received=[],removed=[],invalid=[];
 const owner=createWebGpuFarRegion({start:0,end:1,currentSequence:()=>seq,getSuppressed:()=>['gone'],onChunk:value=>received.push(value),onRemove:value=>removed.push(value),onInvalidate:value=>invalid.push(value),query:(request,{signal})=>{active++;peak=Math.max(peak,active);return new Promise(done=>{resolve=value=>{active--;done(value);};signal.addEventListener('abort',()=>resolve(null),{once:true});});}});
 owner.updateCamera({x:0,z:0});assert.equal(owner.pump(),true);assert.equal(owner.pump(),false);await turn();resolve({cx:0,cz:0,sequence:3,revision:7,instances:trees(tree('keep'),tree('gone'))});await turn();assert.equal(peak,1);assert.deepEqual(received[0].instances[0].map(item=>item.id),['keep']);assert.equal(owner.status().offered,1);
 owner.updateCamera({x:48,z:0});assert.deepEqual(removed,[{cx:0,cz:0,reason:'camera'}]);assert.equal(owner.status().offered,0);owner.dispose();assert.equal(invalid.length,0);
});
test('cancellation and stale sequence cannot publish late responses',async()=>{
 let seq=1,resolve;const received=[],invalid=[];const owner=createWebGpuFarRegion({start:0,end:1,retryMs:0,currentSequence:()=>seq,onChunk:value=>received.push(value),onRemove:()=>{},onInvalidate:value=>invalid.push(value),query:()=>new Promise(done=>{resolve=done;})});
 owner.updateCamera({x:0,z:0});owner.pump();await turn();seq=2;resolve({cx:0,cz:0,sequence:1,revision:1,instances:trees(tree('old'))});await turn();assert.equal(received.length,0);owner.pump();await turn();const late=resolve;owner.invalidate({reason:'structure'});late({cx:0,cz:0,sequence:2,revision:2,instances:trees(tree('late'))});await turn();assert.equal(received.length,0);assert.equal(invalid[0].reason,'structure');owner.dispose();
});
test('a changed native revision invalidates old coverage before offering new chunks',async()=>{
 let time=0,rev=1;const received=[],invalid=[];const owner=createWebGpuFarRegion({start:0,end:25,retryMs:0,now:()=>time,currentSequence:()=>4,onChunk:value=>received.push(value),onRemove:()=>{},onInvalidate:value=>invalid.push(value),query:async request=>({cx:request.cx,cz:request.cz,sequence:4,revision:rev,instances:trees()})});
 owner.updateCamera({x:0,z:0});owner.pump();await turn();assert.equal(received.length,1);rev=2;owner.pump();await turn();assert.equal(invalid[0].reason,'revision');assert.equal(owner.status().offered,0);assert.equal(owner.status().revision,null);owner.pump();await turn();assert.equal(received.at(-1).revision,2);owner.dispose();
});
test('coverage is confirmed only after admission, with cancellation on camera replacement',async()=>{
 let finish,signal;const removed=[];const owner=createWebGpuFarRegion({start:0,end:1,retryMs:0,currentSequence:()=>1,onChunk:(_,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});},onRemove:value=>removed.push(value),onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});
 owner.updateCamera({x:0,z:0});owner.pump();assert.equal(owner.status().pendingPhase,'query');await turn();assert.equal(owner.status().offered,0);assert.equal(owner.status().pending,'0,0');assert.equal(owner.status().pendingPhase,'admission');owner.updateCamera({x:48,z:0});assert.equal(signal.aborted,true);finish(true);await turn();assert.equal(owner.status().offered,0);assert.deepEqual(removed,[]);owner.dispose();
});
test('unchanged world revision keeps an admission valid across ticks but a changed revision rejects it',async()=>{
 let seq=1,rev=7,finish;const owner=createWebGpuFarRegion({start:0,end:1,retryMs:0,currentSequence:()=>seq,currentRevision:()=>rev,onChunk:()=>new Promise(resolve=>{finish=resolve;}),onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:seq,revision:7,instances:trees()})});
 try{owner.updateCamera({x:0,z:0});owner.pump();await turn();seq=2;finish(true);await turn();assert.equal(owner.status().offered,1);owner.invalidate({reason:'retry'});owner.pump();await turn();seq=3;rev=8;finish(true);await turn();assert.equal(owner.status().offered,0);}finally{owner.dispose();}
});
test('rejected asynchronous admission retries without falsely recording coverage',async()=>{
 let attempts=0;const owner=createWebGpuFarRegion({start:0,end:1,retryMs:0,currentSequence:()=>1,onChunk:async()=>++attempts>1,onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});owner.updateCamera({x:0,z:0});owner.pump();await turn();assert.equal(owner.status().offered,0);owner.pump();await turn();assert.equal(owner.status().offered,1);assert.equal(attempts,2);owner.dispose();
});
test('a deferred nonresident chunk does not block others and can be retried on residency change',async()=>{
 const attempts=[],owner=createWebGpuFarRegion({start:0,end:25,currentSequence:()=>1,onChunk:async item=>{attempts.push(`${item.cx},${item.cz}`);return attempts.length===1?'deferred':true;},onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});owner.updateCamera({x:0,z:0});owner.pump();await turn();assert.equal(owner.status().deferred,1);assert.equal(owner.pump(),true);await turn();assert.notEqual(attempts[0],attempts[1]);assert.equal(owner.status().offered,1);owner.retry();assert.equal(owner.status().deferred,0);owner.pump();await turn();assert.equal(attempts[2],attempts[0]);owner.dispose();
});
test('temporary rejection cools only its own chunk',async()=>{
 let time=0;const seen=[],owner=createWebGpuFarRegion({start:0,end:25,retryMs:100,now:()=>time,currentSequence:()=>1,onChunk:async item=>{seen.push(`${item.cx},${item.cz}`);return seen.length!==1;},onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});owner.updateCamera({x:0,z:0});owner.pump();await turn();owner.pump();await turn();assert.notEqual(seen[0],seen[1]);time=100;owner.pump();await turn();assert.equal(seen[2],seen[0]);owner.dispose();
});
test('a precise invalidation rearms only affected coverage',async()=>{
 const got=[],invalid=[],owner=createWebGpuFarRegion({start:0,end:25,currentSequence:()=>1,onChunk:async item=>{got.push(item);return true;},onRemove:()=>{},onInvalidate:item=>invalid.push(item),query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});owner.updateCamera({x:0,z:0});owner.pump();await turn();owner.pump();await turn();assert.equal(owner.status().offered,2);const target={cx:got[0].cx,cz:got[0].cz};owner.invalidate({reason:'chunk',chunks:[target]});assert.equal(owner.status().offered,1);assert.deepEqual(invalid[0].chunks,[target]);owner.pump();await turn();assert.equal(owner.status().offered,2);assert.equal(got[2].cx,target.cx);assert.equal(got[2].cz,target.cz);owner.dispose();
});
test('a local invalidation preserves unrelated in-flight admission but cancels the affected chunk',async()=>{
 let finish,signal;const accepted=[];const owner=createWebGpuFarRegion({start:0,end:1,currentSequence:()=>1,onChunk:(value,options)=>{accepted.push(value);signal=options.signal;return new Promise(resolve=>{finish=resolve;});},onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:1,revision:1,instances:trees()})});
 try{owner.updateCamera({x:0,z:0});owner.pump();await turn();owner.invalidate({reason:'other-chunk',chunks:[{cx:1,cz:0}]});assert.equal(signal.aborted,false);finish(true);await turn();assert.equal(owner.status().offered,1);owner.invalidate({reason:'retry',chunks:[{cx:0,cz:0}]});owner.pump();await turn();const stale=finish;owner.invalidate({reason:'same-chunk',chunks:[{cx:0,cz:0}]});assert.equal(signal.aborted,true);stale(true);await turn();assert.equal(owner.status().offered,0);assert.equal(accepted.length,2);}finally{owner.dispose();}
});
test('null responses respect retry delay and invalid camera is rejected',async()=>{
 let time=0,calls=0;const owner=createWebGpuFarRegion({start:0,end:1,retryMs:50,now:()=>time,currentSequence:()=>1,onChunk:()=>{},onRemove:()=>{},onInvalidate:()=>{},query:async()=>{calls++;return null;}});
 assert.throws(()=>owner.updateCamera({x:NaN,z:0}),/camera/);owner.updateCamera({x:0,z:0});owner.pump();await turn();assert.equal(owner.pump(),false);time=50;assert.equal(owner.pump(),true);await turn();assert.equal(calls,2);owner.dispose();
});
test('oversized regions are rejected before iterating or replacing the last camera',()=>{
 const make=end=>createWebGpuFarRegion({start:0,end,currentSequence:()=>1,onChunk:()=>{},onRemove:()=>{},onInvalidate:()=>{},query:async()=>null});
 const huge=make(1e9);assert.throws(()=>huge.updateCamera({x:0,z:0}),/budget/);huge.dispose();
 const owner=make(1);owner.updateCamera({x:0,z:0});assert.throws(()=>owner.updateCamera({x:1e12,z:0}),/budget/);assert.equal(owner.status().wanted,1);owner.dispose();
});
test('regional owner consumes real Wild Engine instances without changing residency',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),core=createSpatialWorld(module);core.generate(712,0,0,'mangrove',{mangroveNetwork:true});const before=structuredClone(core.captureResidentChunks()),expected=core.queryFarVisualChunk(2,0),received=[];
 const owner=createWebGpuFarRegion({start:0,end:1,currentSequence:()=>9,onChunk:item=>received.push(item),onRemove:()=>{},onInvalidate:()=>{},query:async request=>({...core.queryFarVisualChunk(request.cx,request.cz,{slots:request.slots}),sequence:request.expectedSequence})});
 owner.updateCamera({x:96,z:0});owner.pump();await turn();assert.equal(received.length,1);assert.deepEqual(received[0].instances,expected.instances);assert.deepEqual(core.captureResidentChunks(),before);owner.dispose();
});

test('revision change cancels the first pending query before any sector is published',async()=>{
 let revision=7,seq=1,finish,signal;const requests=[],invalid=[],accepted=[];
 const owner=createWebGpuFarRegion({start:0,end:1,retryMs:0,currentSequence:()=>seq,currentRevision:()=>revision,onChunk:value=>accepted.push(value),onRemove:()=>{},onInvalidate:value=>invalid.push(value),query:(request,options)=>{requests.push(request);signal=options.signal;return new Promise(resolve=>{finish=resolve;});}});
 try{owner.updateCamera({x:0,z:0});assert.equal(owner.pump(),true);await turn();assert.equal(requests[0].expectedRevision,7);assert.equal(owner.status().revision,null);owner.confirmRevision(7);assert.equal(signal.aborted,false);revision=8;seq=2;owner.confirmRevision(8);assert.equal(signal.aborted,true);assert.equal(owner.status().pending,null);assert.equal(invalid.length,1);const previousFinish=finish;assert.equal(owner.pump(),true);await turn();assert.equal(requests[1].expectedRevision,8);previousFinish({cx:0,cz:0,sequence:1,revision:7,instances:trees()});await turn();assert.equal(accepted.length,0);finish({cx:0,cz:0,sequence:2,revision:8,instances:trees()});await turn();assert.equal(accepted.length,1);assert.equal(owner.status().revision,8);}finally{owner.dispose();}
});
test('revision change cancels an in-progress first graphical admission',async()=>{
 let revision=1,finish,signal;const owner=createWebGpuFarRegion({start:0,end:1,currentSequence:()=>2,currentRevision:()=>revision,onChunk:(_,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});},onRemove:()=>{},onInvalidate:()=>{},query:async request=>({cx:request.cx,cz:request.cz,sequence:2,revision:1,instances:trees()})});
 try{owner.updateCamera({x:0,z:0});owner.pump();await turn();assert.equal(owner.status().pendingPhase,'admission');revision=2;owner.confirmRevision(2);assert.equal(signal.aborted,true);assert.equal(owner.status().pending,null);finish(true);await turn();assert.equal(owner.status().offered,0);}finally{owner.dispose();}
});
test('without native revision a new confirmed sequence cancels a pending query',async()=>{
 let seq=1,signal,finish;const owner=createWebGpuFarRegion({start:0,end:1,currentSequence:()=>seq,onChunk:()=>true,onRemove:()=>{},onInvalidate:()=>{},query:(_,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});}});
 try{owner.updateCamera({x:0,z:0});owner.pump();await turn();owner.confirmRevision(null);assert.equal(signal.aborted,false);seq=2;owner.confirmRevision(null);assert.equal(signal.aborted,true);assert.equal(owner.status().pending,null);finish(null);}finally{owner.dispose();}
});
