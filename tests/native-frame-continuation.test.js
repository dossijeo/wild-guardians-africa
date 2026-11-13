import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DirectionalLight,PerspectiveCamera} from 'three';
import ShadowNode from 'three/src/nodes/lighting/ShadowNode.js';
import {nativeFrameReadiness,rejectedNativeFrameTarget,isPreparedFrameInvalidation} from '../src/rendering/webgpu-frame-recovery.js';

const world=ticket=>({version:1,authorityEpoch:'native',nativeSession:1,ticket,effectiveTime:10});
const old=world(1),next=world(2),future=world(3),error=()=>Object.assign(Error('old recording'),{code:'remote-frame-native-mutation-obsolete',resourcePreparationsRetained:true});
const frame={nativeWorldBoundary:old,preparedInterval:null};
const proposal=(phase='ready',worldBoundary=next)=>({phase,sequence:2,worldBoundary});

test('preparing a future delta preserves the current recording until physical adoption is armed',()=>{
 assert.equal(nativeFrameReadiness({prepared:old,required:old,proposal:proposal('preparing')}),'ready');
 assert.equal(nativeFrameReadiness({prepared:old,required:old,proposal:proposal()}),'ready');
 assert.equal(nativeFrameReadiness({prepared:old,required:old,proposal:proposal('armed')}),'waiting');
});
test('resources and direct control must meet at the same applied world in either delivery order',()=>{
 assert.equal(nativeFrameReadiness({prepared:old,required:next,proposal:proposal('adopting')}),'waiting');
 assert.equal(nativeFrameReadiness({prepared:next,required:old}),'waiting');
 assert.equal(nativeFrameReadiness({prepared:next,required:next}),'ready');
 assert.equal(nativeFrameReadiness({prepared:old,required:next}),'unavailable');
 assert.equal(nativeFrameReadiness({prepared:next,required:next,closed:true}),'unavailable');
});
test('retained uploads only permit waiting for a real prepared newer generation',()=>{
 const state={prepared:old,required:next,proposal:proposal('armed')};assert.deepEqual(rejectedNativeFrameTarget(error(),frame,state),next);
 assert.equal(nativeFrameReadiness({...state,resumeTarget:next}),'waiting');
 for(const bad of [Object.assign(error(),{resourcePreparationsRetained:false}),Object.assign(error(),{code:'historical-playback-invalidated'}),Object.assign(error(),{code:'device-lost'})])assert.equal(rejectedNativeFrameTarget(bad,frame,state),null);
 assert.equal(rejectedNativeFrameTarget(error(),{...frame,preparedInterval:{token:1}},state),null);
 assert.equal(rejectedNativeFrameTarget(error(),frame,{prepared:old,required:next}),null);
 assert.equal(rejectedNativeFrameTarget(error(),frame,{prepared:old,required:old}),null);
 assert.equal(rejectedNativeFrameTarget(error(),frame,{...state,closed:true}),null);
});
test('an unrelated native owner or regressed time cannot adopt a rejected recording',()=>{
 for(const bad of [{...next,authorityEpoch:'other'},{...next,nativeSession:2},{...next,effectiveTime:9},old])assert.equal(rejectedNativeFrameTarget(error(),frame,{prepared:old,required:bad,proposal:proposal('armed',bad)}),null);
});
test('a later speculative proposal does not hide the already applied generation that invalidated the frame',()=>{
 const state={prepared:next,required:next,proposal:proposal('ready',future)};assert.deepEqual(rejectedNativeFrameTarget(error(),frame,state),next);assert.equal(nativeFrameReadiness({...state,resumeTarget:next}),'ready');
 assert.equal(nativeFrameReadiness({prepared:future,required:future,resumeTarget:next}),'ready');
});
test('a rejected first native frame waits when the direct boundary message is still on its other channel',()=>{
 const target=rejectedNativeFrameTarget(error(),{nativeWorldBoundary:null},{prepared:null,required:null,proposal:proposal()});assert.deepEqual(target,next);
 assert.equal(nativeFrameReadiness({prepared:null,required:null,proposal:proposal(),resumeTarget:target}),'waiting');
 assert.equal(nativeFrameReadiness({prepared:next,required:null,resumeTarget:target}),'waiting');
 assert.equal(nativeFrameReadiness({prepared:next,required:next,resumeTarget:target}),'ready');
});
test('actual Three shadow nodes skip a same-frame re-record and regenerate on the next frame with the same target',()=>{
 const light=new DirectionalLight(),camera=new PerspectiveCamera(),node=new ShadowNode(light),target={depthTexture:{version:1}};node.shadowMap=target;let draws=0;
 node.updateShadow=()=>{draws++;node._depthVersionCached=1;};
 node.updateBefore({camera,frameId:10});light.shadow.needsUpdate=true;node.updateBefore({camera,frameId:10});assert.equal(draws,1);
 node.updateBefore({camera,frameId:11});assert.equal(draws,2);assert.equal(node.shadowMap,target);
});

// Exercise the actual Worker recording loop. Resource/preparation ownership is
// tested above and in the real product WebGPU audit; only its bootstrap is replaced.
function workerFixture(){
 const notices=[],scheduled=new Map(),timers=new Map(),begins=[],recorded=[];let serial=0,readiness='ready',reject=true,phaseClosed=0,finishes=0;
 const surface={get nativeWorldBoundary(){return reject?old:next;},timelinePump:{advance:()=>0,status:()=>({}),setHistoricalVisibility(){}},get nativeFrameReadiness(){return readiness;},render(){recorded.push('draw');return true;},remoteFrameMetadata:()=>({nativeWorldBoundary:reject?old:next,preparedInterval:null}),retainRejectedNativeFrame(e,m){return !!rejectedNativeFrameTarget(e,m,{prepared:old,required:next,proposal:proposal('armed')});},finishNativeFrameContinuation(){finishes++;}};
 const remote={beginFrame:metadata=>begins.push(metadata),endFrame:async()=>{if(reject)throw error();},cancelFrame(){}};
 let source=readFileSync('src/rendering/webgpu-world-worker.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.env.DEV','false');
 source+="\nphase='running';recoveryEnabled=true;surface=testSurface;remoteGpu=testRemote;return {draw,resumePreparation,onmessage:self.onmessage,get phase(){return phase;}};";
 const self={},worker=new Function('self','testSurface','testRemote','createWebGpuSurfaceOwner','postMessage','isPreparedFrameInvalidation','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','close',source)(self,surface,remote,()=>({signal:new AbortController().signal,close:async()=>{phaseClosed++;}}),m=>notices.push(m),isPreparedFrameInvalidation,fn=>{const id=++serial;scheduled.set(id,fn);return id;},id=>scheduled.delete(id),(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},id=>timers.delete(id),()=>{});
 return {worker,surface,notices,begins,recorded,timers,scheduled,set readiness(value){readiness=value;},set reject(value){reject=value;},get finishes(){return finishes;},get closed(){return phaseClosed;}};
}
test('actual Worker retains the owner, parks without recording an unapplied world, and presents fresh commands',async()=>{
 const f=workerFixture();await f.worker.draw();const cancelledTimeout=[...f.timers.values()][0].fn;assert.equal(f.worker.phase,'running');assert.equal(f.notices.length,0);assert.equal(f.recorded.length,1);assert.equal(f.timers.size,1);
 f.readiness='waiting';await f.worker.draw();assert.equal(f.recorded.length,1);assert.equal(f.begins.length,1);
 f.readiness='next-frame';await f.worker.draw();assert.equal(f.recorded.length,1);
 f.readiness='ready';f.reject=false;await f.worker.draw();assert.equal(f.recorded.length,2);assert.deepEqual(f.begins.map(m=>m.nativeWorldBoundary),[old,next]);assert.equal(f.finishes,1);assert.equal(f.timers.size,0);assert.equal(f.closed,0);assert.equal(f.notices[0].kind,'firstFrame');cancelledTimeout();assert.equal(f.worker.phase,'running','a cancelled generation cannot fail a later valid frame');
});
test('an uncompleted continuation times out through the existing failure handoff without declaring a frame presented',async()=>{
 const f=workerFixture();await f.worker.draw();const timer=[...f.timers.values()][0];assert.equal(timer.delay,10000);timer.fn();assert.equal(f.worker.phase,'failed');assert.equal(f.notices[0].kind,'failure');assert.equal(f.notices[0].code,'remote-frame-native-mutation-obsolete');assert.equal(f.notices.some(m=>m.kind==='firstFrame'),false);assert.equal(f.closed,0,'old GPU owner stays alive for its existing drained handoff');
});
test('disposing the actual Worker cancels a waiting native continuation',async()=>{
 const f=workerFixture();await f.worker.draw();await f.worker.onmessage({data:{kind:'dispose'}});assert.equal(f.timers.size,0);assert.equal(f.worker.phase,'closed');assert.equal(f.closed,1);
});

test('hidden presentation suspends the continuation watchdog instead of rebuilding a healthy device',async()=>{
 const f=workerFixture();await f.worker.draw();await f.worker.onmessage({data:{kind:'presentation-visibility',hidden:true}});assert.equal(f.timers.size,0);assert.equal(f.worker.phase,'running');await f.worker.onmessage({data:{kind:'presentation-visibility',hidden:false}});assert.equal(f.timers.size,1);assert([...f.timers.values()][0].delay<=10000);assert.equal(f.notices.length,0);await f.worker.onmessage({data:{kind:'dispose'}});
});
