import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Box3,Vector3} from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createWebGpuWorkerBank} from '../src/rendering/webgpu-worker-bank.js';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {MeshBasicNodeMaterial} from 'three/webgpu';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('historical worker shares the clock and uses terrain offset with rollback',async()=>{
 const scene=new Group(),clock=createConfirmedHistoricalClock({initialElapsed:5}),source=new MeshBasicNodeMaterial(),geometry=new BoxGeometry(),root=new Group();root.position.set(0,2.025,0);root.add(new Mesh(geometry,source));scene.add(root);
 const state={workers:[{id:'w',profile:'youngMale',status:'walking'}]},renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:m=>m.clone()}},bank={dispose(){}},worker={root,update(){root.visible=true;},isBakedWalking:()=>true,async installBakedWalk(){return true;},dispose(){root.removeFromParent();}},roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer,assetBank:bank,pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get:async()=>({})},experimentalHistoricalMotion:{actorIds:['w'],clock},createWorker:async options=>{assert.equal(options.confirmedClock,clock);return worker;}});
 try{roster.sync();await flush();await flush();assert.equal(roster.status().ready,1);assert.equal(source.positionNode,null);assert.notEqual(root.children[0].material,source);const path={actorId:'w',start:{at:5,x:0,z:0},end:{at:6,x:1,z:0},segments:[{t0:5,t1:6,x0:0,z0:0,x1:1,z1:0}]},support={sequence:1,valid:()=>true,actors:[{actorId:'w',startHeight:2,endHeight:2,segments:[{...path.segments[0],y0:2,y1:2}]}]},preview={sequence:1,safeForAutonomousPlayback:true,trace:{actors:[path]},certificates:{actorIds:['w'],sequence:1,animationSynchronized:true,otherActorsSynchronized:true,effectsSynchronized:true,continuousCollision:true,inputSynchronized:true}};assert.equal(roster.startHistoricalMotion(preview,support),true);assert.equal(roster.historicalMotionCurrent(preview),true);roster.cancelHistoricalMotion();assert.equal(roster.historicalMotionCurrent(preview),false);assert.deepEqual(root.position.toArray(),[0,2.025,0]);}
 finally{roster.dispose();clock.dispose();geometry.dispose();source.dispose();}
});
test('pending historical worker preparation stays outside the live scene and is released after cancellation',async()=>{
 const scene=new Group(),clock=createConfirmedHistoricalClock({initialElapsed:5}),root=new Group(),state={workers:[{id:'w',profile:'youngMale',status:'walking'}]},renderer={backend:{isWebGPUBackend:true}},bank={dispose(){}},pending={};let disposed=0;
 const roster=createWebGpuWorkerRoster({scene,residency:{},state,renderer,assetBank:bank,pipelineAdmission:{prepare:async()=>{}},bakedWalkBank:{get:()=>new Promise(resolve=>pending.resolve=resolve)},experimentalHistoricalMotion:{actorIds:['w'],clock},createWorker:async()=>{scene.add(root);return {root,update(){},dispose(){disposed++;root.removeFromParent();}};}});
 try{roster.sync();await flush();assert.equal(scene.children.includes(root),false);state.workers=[];roster.sync();pending.resolve({});await flush();await flush();assert.equal(disposed,1);assert.equal(scene.children.includes(root),false);}finally{roster.dispose();clock.dispose();}
});
test('worker presentation sees the latest entity and first matching task during delayed admission',async()=>{
 const first={id:'w',profile:'youngMale',status:'walking',taskId:'t'},state={workers:[first],tasks:[{id:'t',kind:'first'},{id:'t',kind:'second'}]},bank={dispose(){}},seen=[];let finish,read,task;
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,createWorker:options=>{read=options.getEntity;task=options.getTask;return new Promise(resolve=>{finish=resolve;});}});
 roster.sync();await flush();assert.equal(task('t').kind,'first');const next={...first,status:'acting'};state.workers=[next];state.tasks=[{id:'t',kind:'new'}];roster.sync();assert.equal(read(),next);assert.equal(task('t').kind,'new');finish({root:new Group(),update(){seen.push([read(),task('t')]);},dispose(){}});await flush();assert.equal(seen[0][0],next);assert.equal(seen[0][1],state.tasks[0]);state.workers=[];roster.sync();assert.equal(read(),null);roster.dispose();
});
test('closing the worker bank waits for every outstanding worker lease',async()=>{
 let disposed=0;const source=new Group();source.add(new Mesh(new BoxGeometry(),new MeshBasicMaterial()));const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>({scene:source,clips:[],library:{},dispose(){disposed++;}})}),a=await bank.acquire('youngMale'),b=await bank.acquire('youngMale');
 bank.dispose();assert.equal(disposed,0);a.release();assert.equal(disposed,0);b.release();assert.equal(disposed,1);b.release();assert.equal(disposed,1);
});
test('worker admission hides pending actors and cancels those returning home',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},bank={dispose(){}},pending=[],disposed=[],ready=[];
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,onReady:id=>ready.push(id),pipelineAdmission:{prepare(root,{signal}){assert.equal(root.visible,false);return new Promise((resolve,reject)=>{pending.push({resolve,signal});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}},createWorker:({actorId})=>({root:new Group(),update(){this.root.visible=true;},dispose(){disposed.push(actorId);}})});
 roster.sync();await flush();assert.equal(roster.status().ready,0);state.workers[0].status='home';roster.sync();await flush();assert.equal(pending[0].signal.aborted,true);assert.deepEqual(disposed,['a']);
 state.workers=[{id:'b',profile:'youngMale',status:'walking'}];roster.sync();await flush();pending[1].resolve();await flush();assert.equal(roster.status().ready,1);assert.equal(roster.get('b').root.visible,true);assert.deepEqual(ready,['b']);roster.dispose();assert.deepEqual(disposed,['a','b']);
});
test('a failed ready callback removes the actor and defers its GPU resource release',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},root=new Group(),parent=new Group(),releases=[],errors=[];let disposed=0;parent.add(root);
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{},deferRelease(object,release){assert.equal(object,root);releases.push(release);}},onReady(){throw Error('ready failed');},onError:error=>errors.push(error),createWorker:async()=>({root,update(){root.visible=true;},dispose(){disposed++;}})});
 roster.sync();await flush();assert.equal(roster.status().count,0);assert.equal(parent.children.length,0);assert.equal(errors[0]?.message,'ready failed');assert.equal(disposed,0);assert.equal(releases.length,1);releases[0]();assert.equal(disposed,1);roster.dispose();
});
test('selectable generation changes when a worker rig appears or leaves',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},bank={dispose(){}},changes=[],roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,onSelectableChange:()=>changes.push('change'),createWorker:async()=>({update(){},dispose(){}})});
 roster.sync();await flush();assert.equal(changes.length,1);state.workers[0].status='home';roster.sync();assert.equal(changes.length,2);roster.dispose();
});
test('advances shared worker texture transitions once per frame',()=>{
 const ticks=[],bank={tick:now=>ticks.push(now),dispose(){}};
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state:{workers:[]},assetBank:bank});
 roster.tick(123);roster.tick(456);assert.deepEqual(ticks,[123,456]);roster.dispose();
});
test('a borrowed asset bank remains available to crates after the worker roster closes',async()=>{
 let disposed=0,released=0;const bank={dispose(){disposed++;},async acquireCrate(){if(disposed)throw Error('bank closed');return {release(){released++;}};}};
 const roster=createWebGpuWorkerRoster({scene:{},residency:{},state:{workers:[]},assetBank:bank,ownsAssetBank:false});
 const crate=await bank.acquireCrate();roster.dispose();assert.equal(disposed,0);const other=await bank.acquireCrate();crate.release();other.release();bank.dispose();assert.equal(released,2);assert.equal(disposed,1);
});
test('shares original meshes and materials by profile and releases after last actor',async()=>{
 let loads=0,disposed=0;const source=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();source.add(new Mesh(geometry,material));const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],library:{},dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [a,b]=await Promise.all([bank.acquire('youngMale'),bank.acquire('youngMale')]);assert.equal(loads,1);assert.notEqual(a.model,b.model);assert.equal(a.model.children[0].geometry,b.model.children[0].geometry);assert.equal(a.model.children[0].material,b.model.children[0].material);a.release();assert.equal(disposed,0);b.release();assert.equal(disposed,1);bank.dispose();
});
test('reconciles confirmed appearance and home transitions, and rejects late creations',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},pending=new Map(),disposed=[],updates=[],bank={dispose(){this.closed=true;}},roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,createWorker:({actorId})=>new Promise(resolve=>pending.set(actorId,resolve))});
 roster.sync();await flush();state.workers[0].status='home';roster.sync();pending.get('a')({update(){updates.push('a');},dispose(){disposed.push('a');}});await flush();assert.deepEqual(disposed,['a']);assert.equal(roster.status().count,0);
 state.workers=[{id:'b',profile:'olderFemale',status:'acting'}];roster.sync();await flush();pending.get('b')({update(){updates.push('b');},dispose(){disposed.push('b');}});await flush();assert.equal(roster.status().ready,1);roster.sync();assert.deepEqual(updates,['b','b']);state.workers=[];roster.sync();assert.deepEqual(disposed,['a','b']);roster.dispose();assert.equal(bank.closed,true);
});
test('disposing during a shared load releases late resources',async()=>{
 let resolve,disposed=0;const gate=new Promise(r=>{resolve=r;}),bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:()=>gate}),pending=bank.acquire('olderMale');bank.dispose();resolve({scene:new Group(),clips:[],library:{},dispose(){disposed++;}});await assert.rejects(pending,{name:'AbortError'});assert.equal(disposed,1);
});
test('crate and worker leases reuse the same profile asset without cloning a worker rig for the crate',async()=>{
 let loads=0,disposed=0;const source=new Group(),geometry=new BoxGeometry(1,2,3),material=new MeshBasicMaterial(),crate=new Mesh(geometry,material);crate.name='Prop_FruitCrate';source.add(crate);
 const bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>{loads++;return {scene:source,clips:[],library:{},dispose(){disposed++;geometry.dispose();material.dispose();}};}});
 const [worker,loose]=await Promise.all([bank.acquire('olderMale'),bank.acquireCrate('olderMale')]);assert.equal(loads,1);assert.notEqual(loose.model,crate);assert.equal(loose.model.geometry,geometry);assert.equal(loose.model.material,material);worker.release();assert.equal(disposed,0);loose.release();assert.equal(disposed,1);loose.release();bank.dispose();assert.equal(disposed,1);
});
test('the real olderMale preview supplies a normalized loose crate',async()=>{
 const bytes=await readFile(new URL('../public/content/character-preview/olderMale/preview.glb',import.meta.url)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,''),bank=createWebGpuWorkerBank({renderer:{backend:{isWebGPUBackend:true}},loadAsset:async()=>({scene:gltf.scene,clips:[],library:{},dispose(){}})}),lease=await bank.acquireCrate('olderMale');
 const box=new Box3().setFromObject(lease.model),size=box.getSize(new Vector3());assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(size.x>.4&&size.x<.6&&size.y>.2&&size.y<.4&&size.z>.2&&size.z<.4);lease.release();bank.dispose();
});

test('passes the shared confirmed clock through to a real roster actor',async()=>{const clock=createConfirmedPresentationClock(.25),state={workers:[{id:'w',profile:'youngMale',status:'walking'}]},bank={dispose(){}},calls=[],roster=createWebGpuWorkerRoster({scene:{},residency:{},state,assetBank:bank,confirmedClock:clock,createWorker:async options=>{calls.push(options);return {update(){},dispose(){}};}});roster.sync();await flush();assert.equal(calls.length,1);assert.equal(calls[0].confirmedClock,clock);roster.dispose();clock.dispose();});

test('optional worker bake is requested only for supported live actors and cancelled on removal',async()=>{
 const state={workers:[{id:'a',profile:'youngMale',status:'walking'},{id:'b',profile:'olderMale',status:'walking'}]},requests=[],installed=[],pending=[],admission={prepare:async()=>{}},renderer={backend:{isWebGPUBackend:true}},bank={get(profile){requests.push(profile);return new Promise(resolve=>pending.push(resolve));}},roster=createWebGpuWorkerRoster({scene:{},residency:{},state,renderer,bakedWalkBank:bank,assetBank:{dispose(){}},pipelineAdmission:admission,createWorker:async({actorId})=>({root:new Group(),update(){},dispose(){},async installBakedWalk(){installed.push(actorId);return true;}})});
 roster.sync();await flush();await flush();assert.deepEqual(requests,['youngMale','olderMale']);state.workers=state.workers.filter(x=>x.id!=='a');roster.sync();pending[0]({});pending[1]({});await flush();assert.deepEqual(installed,['b']);roster.dispose();
});

test('failed baked-walk loading or admission keeps the live worker rig',async()=>{
 for(const stage of ['load','admit']){
  const state={workers:[{id:'a',profile:'youngMale',status:'walking'}]},errors=[],updates=[],actor={root:new Group(),update(){updates.push('live');},dispose(){},async installBakedWalk(){if(stage==='admit')throw Error('unsupported rig');return true;}},roster=createWebGpuWorkerRoster({scene:{},residency:{},state,renderer:{backend:{isWebGPUBackend:true}},bakedWalkBank:{async get(){if(stage==='load')throw Error('missing bake');return {};}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},createWorker:async()=>actor,onBakedWalkError:(profile,error)=>errors.push([profile,error.message])});
  roster.sync();await flush();await flush();assert.equal(roster.status().ready,1,stage);assert.deepEqual(errors,[[ 'youngMale',stage==='load'?'missing bake':'unsupported rig' ]]);
  roster.sync();assert.ok(updates.length>=2,stage);assert.equal(roster.status().ready,1,stage);roster.dispose();
 }
});
