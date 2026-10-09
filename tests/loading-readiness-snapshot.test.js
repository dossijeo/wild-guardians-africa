import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingProgress} from '../src/app/loading-progress.js';
import {LoadingOrbit} from '../src/rendering/loading-orbit.js';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import {loadingReadinessSnapshot,existingLoadingContextIdentity,createLoadingReadinessSpanTracker,installLoadingReadinessObservation} from '../src/rendering/loading-readiness-snapshot.js';

test('snapshot distinguishes real milestones and presentation maturity without scheduling work',()=>{
 const progress=new LoadingProgress([{id:'gpu',weight:1},{id:'far-assets',weight:1},{id:'visible-ready',weight:1}],{now:()=>0});progress.update('gpu');
 const orbit=new LoadingOrbit(),plants=new LoadingPlants();orbit.stop();
 const forbidden=()=>{throw Error('observer scheduled readiness');};
 const world={loadingProgress:progress,loading:{signal:{aborted:false}},loadingActorQueue:{jobs:[{}],pumping:true,closed:false,spent:12,stats:{submitted:3,completed:2,failed:0,yields:1},run:forbidden},chunkStream:{queue:[{}],busy:{},desired:new Map([['x',{}]]),failed:new Set(),epoch:4,whenReady:forbidden},farVegetation:{enabled:true,adapters:[{layer:{current:null,pendingPreparations:1,epoch:3,stream:{pending:{key:'region'},whenReady:forbidden}},stats:{errors:[]}}]}};
 const before=plants.plants.map(p=>p.growth),result=loadingReadinessSnapshot({world,diorama:{orbit,plants,prepared:true},cinematic:{armed:false,time:0}});
 assert.equal(result.progress.stages[0].progress,1);assert.equal(result.progress.stages[1].progress,0);
 assert.equal(result.actors.queued,1);assert.equal(result.chunks.busy,true);assert.equal(result.far.adapters[0].current,false);assert.equal(result.far.adapters[0].streamPending,true);
 assert.equal(result.presentation.orbitSettled,false);assert.equal(result.presentation.plantsMature,false);assert.deepEqual(plants.plants.map(p=>p.growth),before);
 plants.update(1,1,{ready:true});orbit.step(1);orbit.step(1);orbit.step(1);orbit.step(1);
 const ready=loadingReadinessSnapshot({world,diorama:{orbit,plants}});assert.equal(ready.presentation.orbitSettled,true);assert.equal(ready.presentation.plantsMature,true);
});

test('bounded copies never retain region prototypes, promises, jobs or source arrays',()=>{
 const adapters=Array.from({length:10},()=>({layer:{current:{key:'x',prototype:{}},stream:{pending:{key:'y',promise:Promise.resolve()}}},stats:{errors:[]}}));
 const stages=new Map(Array.from({length:20},(_,i)=>[i,{id:String(i),progress:0}]));
 const result=loadingReadinessSnapshot({world:{farVegetation:{adapters}},progress:{stages,value:.88}});
 assert.equal(result.far.adapters.length,8);assert.equal(result.far.omitted,2);assert.equal(result.progress.stages.length,16);assert.equal(result.progress.omitted,4);
 adapters[0].layer.current.key='changed';assert.equal(result.far.adapters[0].currentKey,'x');assert.equal(JSON.stringify(result).includes('prototype'),false);
});

test('observer faults are contained per section and absent owners remain unknown',()=>{
 const world={get loadingActorQueue(){throw Error('fault');}};const result=loadingReadinessSnapshot({world});assert.equal(result.actors,null);assert.deepEqual(result.issues,['actors']);assert.equal(result.presentation.orbitSettled,null);assert.equal(loadingReadinessSnapshot().owner.present,false);
});

test('context identity borrows renderer only, skips dead owners and tolerates driver faults',()=>{
 let reads=0;const gl={VENDOR:1,RENDERER:2,VERSION:3,isContextLost:()=>false,getExtension:()=>({UNMASKED_VENDOR_WEBGL:4,UNMASKED_RENDERER_WEBGL:5}),getParameter:id=>{reads++;return 'parameter-'+id;}};
 const world={renderer:{getContext:()=>gl},canvas:{getContext(){throw Error('new context');}}};assert.equal(existingLoadingContextIdentity(world).unmaskedRenderer,'parameter-5');assert.equal(reads,5);
 world.disposed=true;assert.equal(existingLoadingContextIdentity(world),null);assert.equal(reads,5);world.disposed=false;gl.getParameter=()=>{throw Error('driver');};assert.deepEqual(existingLoadingContextIdentity(world),{unavailable:true});
});

test('span tracker preserves interleaved same-label awaits and prior callback contract',()=>{
 const calls=[],receiver={};function previous(...args){calls.push({receiver:this,args});return 42;}previous.onBegin=function(...args){calls.push({receiver:this,args});return 7;};
 const tracker=createLoadingReadinessSpanTracker(previous,{now:()=>10});const a={label:'region',start:1},b={label:'region',start:2};assert.equal(tracker.onBegin.call(receiver,a,'tail'),7);tracker.onBegin(b);assert.equal(tracker.call(receiver,{...a,end:5,duration:4}),42);
 assert.equal(calls.length,3);assert.equal(calls[0].receiver,receiver);assert.deepEqual(calls[0].args,[a,'tail']);assert.equal(calls[2].receiver,receiver);assert.equal(calls[1].receiver,previous);
 const row=tracker.snapshot();assert.equal(row.active.length,1);assert.equal(row.active[0].start,2);assert.equal(row.active[0].elapsed,8);assert.equal(row.lastCompleted.duration,4);
 row.active[0].label='mutated';assert.equal(tracker.snapshot().active[0].label,'region');
});

test('tracker contains observation faults but retains original callback exceptions',()=>{
 const failure=Error('original');const previous=()=>{throw failure;};const tracker=createLoadingReadinessSpanTracker(previous,{now:()=>{throw Error('clock');}});
 const poisonous={get label(){throw Error('observer');}};assert.throws(()=>tracker(poisonous),error=>error===failure);assert.equal(tracker.snapshot().at,null);
});

test('tracker bounds active rows and reports omissions without extending waits',()=>{
 const tracker=createLoadingReadinessSpanTracker(null,{now:()=>100});for(let i=0;i<20;i++)tracker.onBegin({label:'phase'+i,start:i});const result=tracker.snapshot();assert.equal(result.active.length,16);assert.equal(result.dropped,4);tracker({label:'phase0',start:0,end:99,duration:99});assert.equal(tracker.snapshot().active.length,15);
});


test('transfer snapshot reads real LoadingDownloads records without snapshot/refresh/cache assumptions',async()=>{
 const {LoadingDownloads}=await import('../src/app/loading-downloads.js');let clock=0;const downloads=new LoadingDownloads({now:()=>clock});
 const unknown=downloads.begin('/unknown.glb');downloads.update(unknown,10);const network=downloads.begin('/network.glb');clock=20;downloads.finish(network,{loaded:20,timing:{transferSize:21,encodedBodySize:20,decodedBodySize:20,responseEnd:19}});
 downloads.cacheHit('/application.glb');const failed=downloads.begin('/failed.glb');downloads.finish(failed,{failed:true});
 downloads.snapshot=()=>assert.fail('observer invoked estimator');const progress={downloads,snapshot:()=>assert.fail('observer refreshed progress')};
 const row=loadingReadinessSnapshot({progress}).transfers;assert.equal(row.count,4);assert.equal(row.pending,1);assert.equal(row.failed,1);assert.equal(row.cache.unknown,2);assert.equal(row.cache.network,1);assert.equal(row.cache['application-cache'],1);assert.equal(row.rows.length,2);assert.equal(downloads.requests.get(unknown).end,null);
});

test('bridge normal path and unavailable/failing WeakRef never publish or mutate',()=>{
 for(const options of [{enabled:false},{enabled:true,WeakRefCtor:null},{enabled:true,WeakRefCtor:class{constructor(){throw Error('weak');}}}]){
  const previous=()=>{},scope={},world={loading:new AbortController(),onLoadingSpan:previous};assert.equal(installLoadingReadinessObservation(world,{scope,...options}),null);assert.equal(world.onLoadingSpan,previous);assert.equal(scope.__desktopSmokeLoadingReadiness,undefined);
 }
});

test('bridge abort/dispose releases own callback and cannot erase replacement World',async()=>{
 const scope={__desktopSmokeStarted:true},previous=()=>{};const first={loading:new AbortController(),onLoadingSpan:previous};first.loadingReadinessObservation=installLoadingReadinessObservation(first,{scope});const old=scope.__desktopSmokeLoadingReadiness;
 const second={loading:new AbortController()};second.loadingReadinessObservation=installLoadingReadinessObservation(second,{scope});const replacement=scope.__desktopSmokeLoadingReadiness;assert.notEqual(old,replacement);first.loading.abort();assert.equal(scope.__desktopSmokeLoadingReadiness,replacement);assert.equal(first.onLoadingSpan,previous);assert.equal(old(),null);
 const {WorldScene}=await import('../src/rendering/scene.js');assert.throws(()=>WorldScene.prototype.dispose.call(second));assert.equal(second.disposed,true);assert.equal(scope.__desktopSmokeLoadingReadiness,undefined);assert.equal(replacement(),null);
});

test('failed real World constructor does not install a snapshot owner',async()=>{
 const {WorldScene}=await import('../src/rendering/scene.js');const oldStarted=globalThis.__desktopSmokeStarted,oldCallable=globalThis.__desktopSmokeLoadingReadiness,previous=()=>42,originalError=console.error;
 try{globalThis.__desktopSmokeStarted=true;globalThis.__desktopSmokeLoadingReadiness=previous;console.error=()=>{};assert.throws(()=>new WorldScene({addEventListener(){throw Error('constructor');},getContext(){throw Error('constructor');}}));assert.equal(globalThis.__desktopSmokeLoadingReadiness,previous);}finally{console.error=originalError;if(oldStarted===undefined)delete globalThis.__desktopSmokeStarted;else globalThis.__desktopSmokeStarted=oldStarted;if(oldCallable===undefined)delete globalThis.__desktopSmokeLoadingReadiness;else globalThis.__desktopSmokeLoadingReadiness=oldCallable;}
});

test('dead WeakRef and callback replacement remain safe without a strong fallback',()=>{
 let living=true;class Ref{constructor(value){this.value=value;}deref(){return living?this.value:undefined;}}
 const scope={__desktopSmokeStarted:true},world={loading:new AbortController()};const bridge=installLoadingReadinessObservation(world,{scope,WeakRefCtor:Ref}),callable=scope.__desktopSmokeLoadingReadiness;world.onLoadingSpan=()=>77;bridge.release();assert.equal(world.onLoadingSpan(),77);assert.equal(callable(),null);
 const next=installLoadingReadinessObservation(world,{scope,WeakRefCtor:Ref});living=false;assert.equal(scope.__desktopSmokeLoadingReadiness(),null);next.release();assert.equal(scope.__desktopSmokeLoadingReadiness,undefined);
});

test('bridge observes real actor/chunk/far properties while work remains pending',async()=>{
 const {LoadingSyncQueue}=await import('../src/rendering/loading-sync-queue.js'),{NativeChunkStream}=await import('../src/rendering/chunk-stream.js'),{NativeFarLayer}=await import('../tools/experiments/native-far-layer.js'),{FarSceneStream}=await import('../tools/experiments/far-scene-stream.js'),{Group}=await import('three');
 const actors=new LoadingSyncQueue();await actors.run(()=>42);
 let scheduled=0;const chunks=new NativeChunkStream({}, {},{loaded:()=>new Map(),onData:()=>{},workerFactory:()=>null,schedule:()=>++scheduled,cancel:()=>{}});chunks.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
 let complete;const stream=new FarSceneStream({load:()=>new Promise(resolve=>{complete=resolve;})});const layer=new NativeFarLayer({scene:new Group(),metadata:{localBase:[0,0,0]},stream,prepare:()=>assert.fail('GPU preparation scheduled')});const pending=layer.request('region',{});await Promise.resolve();
 const world={loadingActorQueue:actors,chunkStream:chunks,farVegetation:{adapters:[{layer,stats:{errors:[]}}]}};const snapshot=loadingReadinessSnapshot({world});assert.equal(snapshot.actors.completed,1);assert.equal(snapshot.chunks.busy,true);assert.equal(snapshot.far.adapters[0].pendingPreparations,1);assert.equal(snapshot.far.adapters[0].streamPending,true);assert.equal(snapshot.far.adapters[0].current,false);assert.equal(scheduled,1);
 layer.dispose();complete(null);await pending;chunks.dispose();actors.dispose();assert.equal(loadingReadinessSnapshot({world}).far.adapters[0].pendingPreparations,0);
});


test('bridge publication/connect/presentation faults do not leak ownership or change application exceptions',()=>{
 const signal=new AbortController().signal,scope={__desktopSmokeStarted:true};Object.defineProperty(scope,'__desktopSmokeLoadingReadiness',{configurable:true,set(){throw Error('publish');}});
 const previous=()=>{};const world={loading:{signal},onLoadingSpan:previous};assert.equal(installLoadingReadinessObservation(world,{scope}),null);assert.equal(world.onLoadingSpan,previous);
 const normalScope={__desktopSmokeStarted:true},bridge=installLoadingReadinessObservation(world,{scope:normalScope});const original=Error('original');world.onLoadingSpan=()=>{throw original;};bridge.connect();assert.throws(()=>bridge.witness({label:'failure',start:0,end:1}),error=>error===original);bridge.presentation({},{});bridge.release();assert.equal(normalScope.__desktopSmokeLoadingReadiness,undefined);
});


test('bridge registration follows every successful constructor step and original gates stay intact',async()=>{
 const {readFile}=await import('node:fs/promises');const scene=await readFile(new URL('../src/rendering/scene.js',import.meta.url),'utf8');const constructor=scene.slice(scene.indexOf('constructor(canvas,onPick)'),scene.indexOf('  resize()'));
 assert.ok(constructor.indexOf('installLoadingReadinessObservation(this)')>constructor.lastIndexOf("canvas.addEventListener('webglcontextrestored'"));
 const main=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8');for(const label of ['app-world-load','app-extra-village','app-initial-far-ready','app-orbit-settle','app-cinematic-prepare','app-plants-mature','app-cinematic-finished'])assert.ok(main.includes(label));
 const smoke=await readFile(new URL('../src-tauri/smoke.js',import.meta.url),'utf8');assert.match(smoke,/90000/);assert.match(smoke,/await wait\(300000\)/);assert.equal(smoke.match(/__desktopSmokeLoadingReadiness\?\.\(\)/g)?.length,1);
});
