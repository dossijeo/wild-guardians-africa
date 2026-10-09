import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NativeHands} from '../src/rendering/hands.js';
import {HAND_ASSETS} from '../src/rendering/hands-native.js';
import {assetUrl} from '../src/rendering/asset-url.js';
import {createLoadingReadinessSpanTracker,loadingReadinessSnapshot,installLoadingReadinessObservation} from '../src/rendering/loading-readiness-snapshot.js';
import {WorldScene} from '../src/rendering/scene.js';
import {NativeChunkStream} from '../src/rendering/chunk-stream.js';
import {readFileSync} from 'node:fs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(witness){
 const loads=[],textures=Object.keys(HAND_ASSETS).map(()=>new THREE.Texture()),pending=textures.map(deferred),scene=new THREE.Scene(),loader={loadAsync(url){assert.strictEqual(this,loader);loads.push(url);return pending[loads.length-1].promise;}},errors=[];
 const hands=new NativeHands(scene,()=>0,{textureLoader:loader,onLoadingSpan:witness,onError:e=>errors.push(e)});
 return {hands,loads,pending,textures,errors,scene};
}

test('six observed and ordinary image requests preserve exact URLs/order/calls, and adoption uses the original textures',async()=>{
 const witness=createLoadingReadinessSpanTracker(),a=fixture(),b=fixture(witness);assert.deepEqual(a.loads,b.loads);assert.deepEqual(b.loads,Object.values(HAND_ASSETS).map(assetUrl));
 assert.equal(witness.snapshot().active.length,6);assert.deepEqual(witness.snapshot().active.map(row=>row.label),Object.keys(HAND_ASSETS).map(kind=>'hands-texture:'+kind));
 for(let i=0;i<6;i++){a.pending[i].resolve(a.textures[i]);b.pending[i].resolve(b.textures[i]);}await Promise.all([a.hands.ready,b.hands.ready]);assert.equal(witness.snapshot().active.length,0);
 for(const [i,kind] of Object.keys(HAND_ASSETS).entries()){assert.strictEqual(b.hands.textures.get(kind),b.textures[i]);assert.equal(b.textures[i].flipY,false);assert.equal(b.textures[i].colorSpace,THREE.SRGBColorSpace);}
 a.hands.dispose();b.hands.dispose();witness.clear();
});

test('snapshot distinguishes private hand adoption from observed global transfers without invoking readiness or loading',async()=>{
 const witness=createLoadingReadinessSpanTracker(),f=fixture(witness),world={hands:f.hands};f.pending[0].resolve(f.textures[0]);await flush();
 const report=loadingReadinessSnapshot({world,progress:{downloads:{requests:new Map()},stages:new Map()},spans:witness});assert.equal(report.transfers.pending,0);assert.equal(report.hands.required,6);assert.equal(report.hands.loaded,1);assert.deepEqual(report.hands.loadedKinds,['press']);assert.equal(report.hands.unadoptedKinds.length,5);assert.equal(report.spans.active.length,5);assert.equal(f.loads.length,6);
 for(let i=1;i<6;i++)f.pending[i].resolve(f.textures[i]);await f.hands.ready;f.hands.dispose();witness.clear();
});

test('real dispose plus terminal observer clear prevents late adoption/retained rows and disposes each late image exactly once',async()=>{
 let priorCalls=0;const witness=createLoadingReadinessSpanTracker(()=>priorCalls++),f=fixture(witness),counts=f.textures.map(texture=>{const count={n:0};texture.addEventListener('dispose',()=>count.n++);return count;});
 f.hands.dispose();witness.clear();for(let i=0;i<6;i++)f.pending[i].resolve(f.textures[i]);await f.hands.ready;
 assert.equal(f.hands.textures.size,0);assert.deepEqual(counts.map(c=>c.n),[1,1,1,1,1,1]);assert.equal(priorCalls,0);assert.equal(witness.snapshot().closed,true);assert.deepEqual(witness.snapshot().active,[]);assert.deepEqual(f.errors,[]);
});

test('observer throws/getters throw do not mask the original load failure or change the existing error callback',async()=>{
 for(const witness of [()=>{throw Error('observer');},Object.defineProperty(()=>{},'onBegin',{get(){throw Error('getter');}})]){
  const f=fixture(witness),error=Error('image load failed');f.pending[0].reject(error);await f.hands.ready;assert.deepEqual(f.errors,[error]);f.hands.dispose();for(let i=1;i<6;i++)f.pending[i].resolve(f.textures[i]);await flush();assert.equal(f.hands.textures.size,0);
 }
});

test('actual nine-chunk readiness resolves with queued outer work; finish observation never treats it as an active original wait',async()=>{
 const loaded=new Map(),messages=[],worker={postMessage:m=>messages.push(m),terminate(){}},stream=new NativeChunkStream({}, {},{loaded:()=>loaded,onData:d=>loaded.set(d.cx+','+d.cz,d),workerFactory:()=>worker});
 stream.plan(new Map(Array.from({length:25},(_,i)=>[i+',0',{cx:i,cz:0,score:i}])));const ready=stream.whenReady();
 for(let i=0;i<9;i++){const m=messages.at(-1);stream.receive({id:m.id,epoch:m.epoch,data:{cx:m.cx,cz:m.cz}});}assert.deepEqual(await ready,{cancelled:false});
 const before=messages.length,report=loadingReadinessSnapshot({world:{chunkStream:stream,chunks:loaded}});assert.equal(report.chunks.loaded,9);assert.equal(report.chunks.queued,15);assert.equal(report.chunks.busy,true);assert.equal(report.chunks.waiterCount,0);assert.equal(report.chunks.busyJob.cx,9);assert.equal(report.chunks.created,9);assert.equal(messages.length,before);
 const idle=stream.whenIdle();const waiting=loadingReadinessSnapshot({world:{chunkStream:stream,chunks:loaded}});assert.deepEqual(waiting.chunks.waiterMinimums,[null]);stream.dispose();assert.deepEqual(await idle,{cancelled:true});
});

test('bounded scalar snapshots omit waiter objects and crop resources; destroyed owner and missing hands stay explicit',()=>{
 const pending={resolve(){throw Error('must not run');},minimum:9};const world={chunkStream:{queue:[],busy:{id:2,epoch:1,cx:3,cz:4,config:{secret:true}},desired:new Map(),failed:new Set(),waiters:Array(12).fill(pending),stats:{created:3},dead:false},chunks:new Map(),hands:{disposed:true,textures:new Map([['press',{secret:true}]])}};
 const result=loadingReadinessSnapshot({world});assert.equal(result.chunks.omittedWaiters,4);assert.equal(result.chunks.waiterMinimums.length,8);assert.equal(JSON.stringify(result).includes('secret'),false);assert.equal(result.hands.disposed,true);assert.equal(loadingReadinessSnapshot().hands,null);
 const scene=readFileSync(new URL('../src/rendering/scene.js',import.meta.url),'utf8');assert.match(scene,/onLoadingSpan:this\.loadingReadinessObservation\?\.witness/);
});


test('original World.loadReady abort wins while private image loads continue; terminal bridge and hands disposal prevent late adoption',async()=>{
 let priorCalls=0;const world=Object.assign(Object.create(WorldScene.prototype),{loading:new AbortController(),onLoadingSpan:()=>priorCalls++});world.loadingReadinessObservation=installLoadingReadinessObservation(world,{enabled:true,scope:{}});
 const f=fixture(world.loadingReadinessObservation.witness);world.hands=f.hands;const counts=f.textures.map(texture=>{const c={n:0};texture.addEventListener('dispose',()=>c.n++);return c;});
 const waiting=world.loadReady(f.hands.ready),rejected=assert.rejects(waiting,/cancelada/);world.loading.abort();f.hands.dispose();await rejected;
 const before=priorCalls;for(let i=0;i<6;i++)f.pending[i].resolve(f.textures[i]);await f.hands.ready;assert.equal(priorCalls,before);assert.equal(f.hands.textures.size,0);assert.deepEqual(counts.map(c=>c.n),[1,1,1,1,1,1]);assert.equal(world.loadingReadinessObservation.witness,null);
});
