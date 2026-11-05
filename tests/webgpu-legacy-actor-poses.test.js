import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Bone,AnimationClip,AnimationMixer,DirectionalLight,PerspectiveCamera,Vector2,Vector3,Matrix4} from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {ProvisionalBeastImpact} from '../src/rendering/provisional-beast-impact.js';
import {renderWithOptionalWebGpuPresentation} from '../src/app/webgpu-legacy-draw.js';

function fixture(){
 const calls=[],scene=new Scene(),worker={id:'worker',profile:'youngMale',status:'acting',taskId:'water',x:1,z:2,heading:.6},animal={id:'beast',species:'hyena',hitsRemaining:1,status:'walking',x:3,z:4,heading:.4,path:[{x:4,z:4}]},state={workers:[worker],raid:{animals:[animal]},tasks:[{id:'water',kind:'water'}],structures:[],villages:[],plants:[],crates:[],spells:[],elapsed:1,time:20,day:1,biome:'sabana'},workerRoot=new Group(),animalRoot=new Group();scene.add(workerRoot,animalRoot);
 const owner={state,scene,workerRuntime:{status:()=>({running:true})},cropModels:[],objects:new Map([['worker',workerRoot],['beast',animalRoot]]),mixers:new Map([['worker',{}],['beast',{}]]),nav:{actorSurface:()=>5,field:{surface:()=>5}},controls:{target:new Vector3()},renderOrigin:{},cropBatch:{capacity:1,update(){}},provisionalCrops:{visible:values=>values},prepareUpcomingAnimalRigs(){},renderer:{setClearColor(){}},pack:{profile:{bg:'#ffffff'}},destructionPass:{cinemaGroundUniform:{value:{fromArray(){}}}},sun:new DirectionalLight(),ambient:{},updateActor(entity,dt,type){calls.push(['pose',entity.id,dt,type]);},updateDeferredActorRoot:WorldScene.prototype.updateDeferredActorRoot,trackedWorkerVisualYaw:WorldScene.prototype.trackedWorkerVisualYaw,prepareDeferredActorPoses:WorldScene.prototype.prepareDeferredActorPoses};
 return {owner,state,worker,animal,workerRoot,animalRoot,calls};
}

test('hidden legacy presentation keeps root transforms and defers skeletal poses only with Worker authority',()=>{
 const f=fixture();WorldScene.prototype.sync.call(f.owner,.1,{legacyDraw:false});assert.deepEqual(f.calls,[]);assert.equal(f.owner.legacyActorPosesDeferred,true);assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);assert.equal(f.workerRoot.rotation.y,.6);assert.equal(f.animalRoot.rotation.y,Math.PI/2);
 WorldScene.prototype.sync.call(f.owner,.1);assert.deepEqual(f.calls.map(x=>x[1]),['worker','beast']);assert.equal(f.owner.legacyActorPosesDeferred,false);
 f.calls.length=0;f.owner.workerRuntime=null;WorldScene.prototype.sync.call(f.owner,.1,{legacyDraw:false});assert.deepEqual(f.calls.map(x=>x[1]),['worker','beast']);
});

test('confirmed physical pose keeps its root transform without sampling bones',()=>{
 const f=fixture(),physical=[];f.owner.provisionalBeastImpact={physicalPose:id=>physical.push(id)};f.owner.confirmedAnimalPoses=new Map([['beast',{actorId:'beast',root:[7,8,9,0,0,0,1,2,2,2]}]]);WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.animalRoot.position.toArray(),[7,8,9]);assert.deepEqual(f.animalRoot.scale.toArray(),[2,2,2]);assert.deepEqual(physical,['beast']);assert.deepEqual(f.calls,[]);
});

test('a recovering actor keeps down heading before any path heading',()=>{
 const f=fixture();f.worker.downHeading=-.8;f.worker.fallRemaining=.5;f.worker.path=[{x:20,z:20}];f.animal.downHeading=1.2;f.animal.recovery={};WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.workerRoot.rotation.y,-.8);assert.equal(f.animalRoot.rotation.y,1.2);
});

test('watering retains its authored emitter and corrected root orientation while poses are deferred',()=>{
 const f=fixture(),effect=new Group();effect.surfaceInverse=new Matrix4();f.owner.scene.add(effect);f.owner.mixers.set('worker',{profile:'youngMale'});f.owner.wateringEmitters=new Map([['youngMale',(_time,position,direction)=>{position.set(0,1,0);direction.set(0,0,1);}]]);f.owner.waterMouth=new Vector3();f.owner.waterDirection=new Vector3();
 WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});const result=WorldScene.prototype.wateringSource.call(f.owner,'worker',0,effect);assert.deepEqual(result.position,[1,6.025,2]);assert.ok(Math.abs(result.direction[0]-Math.sin(.6))<1e-10);assert.ok(Math.abs(result.direction[2]-Math.cos(.6))<1e-10);assert.deepEqual(f.calls,[]);
});

test('tracked Worker roots stay untouched while watering uses confirmed position and visual yaw',()=>{
 const f=fixture(),effect=new Group();effect.surfaceInverse=new Matrix4();f.owner.scene.add(effect);f.owner.workerRuntime={status:()=>({running:true})};f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.1]]);f.owner.mixers.set('worker',{profile:'youngMale'});f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:f.owner.mixers.get('worker'),root:f.workerRoot,revoked:false}]]);f.owner.wateringEmitters=new Map([['youngMale',(_time,position,direction)=>{position.set(0,1,0);direction.set(0,0,1);}]]);f.owner.waterMouth=new Vector3();f.owner.waterDirection=new Vector3();
 WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.workerRoot.position.toArray(),[0,0,0]);assert.equal(f.workerRoot.rotation.y,0);const result=WorldScene.prototype.wateringSource.call(f.owner,'worker',0,effect);assert.deepEqual(result.position,[1,6.025,2]);assert.ok(Math.abs(result.direction[0]-Math.sin(1.1))<1e-10);assert.ok(Math.abs(result.direction[2]-Math.cos(1.1))<1e-10);assert.deepEqual(f.workerRoot.position.toArray(),[0,0,0]);f.owner.prepareDeferredActorPoses();assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);assert.equal(f.workerRoot.rotation.y,1.1);
});
test('QA cleanup excludes retained workers but tracks objects added without another publication',()=>{
 const f=fixture();f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.1]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:f.owner.mixers.get('worker'),root:f.workerRoot,revoked:false}]]);WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.legacyWorkerPublicationCache.cleanup.has('worker'),false);
 f.state.spells.push({id:'shield',kind:'shield',x:4,z:5});WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.legacyWorkerPublicationCache.cleanup.has('shield'),true);assert.equal(f.owner.objects.has('shield'),true);f.state.spells=[];WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.objects.has('shield'),false);assert.equal(f.owner.objects.has('worker'),true);
 f.owner.workerRuntime=null;WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.legacyWorkerPublicationCache,null);assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);
});

test('untracked workers and failed authority retain the legacy root update',()=>{
 const f=fixture();f.owner.workerRuntime={status:()=>({running:true})};f.owner.confirmedWorkerVisualHeadings=new Map();WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);f.workerRoot.position.set(0,0,0);f.owner.confirmedWorkerVisualHeadings.set('worker',.6);f.owner.workerRuntime={status:()=>({running:false})};WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);assert.equal(f.owner.legacyActorPosesDeferred,false);assert.deepEqual(f.calls.map(call=>call[1]),['worker','beast']);
});
test('a missing rig keeps its root current while it is requested again',()=>{
 const f=fixture();f.owner.workerRuntime={status:()=>({running:true})};f.owner.confirmedWorkerVisualHeadings=new Map([['worker',.6]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:f.owner.mixers.get('worker'),root:f.workerRoot,revoked:false}]]);f.owner.mixers.delete('worker');f.owner.requestActor=(entity,type)=>f.calls.push(['request',entity.id,type]);WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);assert.deepEqual(f.calls,[['request','worker','worker']]);assert.equal(f.owner.confirmedWorkerVisualIdentities.get('worker').revoked,true);
});
test('a new identity waits for its first rig and revokes a replaced pending root',()=>{
 const f=fixture();f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.4]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{pending:true,revoked:false}]]);f.owner.mixers.delete('worker');assert.equal(f.owner.trackedWorkerVisualYaw('worker',f.workerRoot),undefined);const rig={};f.owner.mixers.set('worker',rig);assert.equal(f.owner.trackedWorkerVisualYaw('worker',f.workerRoot),1.4);assert.equal(f.owner.confirmedWorkerVisualIdentities.get('worker').rig,rig);
 const other={pending:true,revoked:false};f.owner.confirmedWorkerVisualIdentities.set('worker',other);f.owner.mixers.delete('worker');f.owner.trackedWorkerVisualYaw('worker',f.workerRoot);assert.equal(f.owner.trackedWorkerVisualYaw('worker',new Group()),undefined);assert.equal(other.revoked,true);
});

test('rig replacement revokes only that worker even after later heading deltas and fallback',()=>{
 const f=fixture(),second={id:'second',profile:'olderMale',status:'walking',x:4,z:6,path:[{x:5,z:6}]},secondRoot=new Group(),secondRig={};f.state.workers.push(second);f.owner.scene.add(secondRoot);f.owner.objects.set('second',secondRoot);f.owner.mixers.set('second',secondRig);const original=f.owner.mixers.get('worker');f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.1],['second',2.2]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:original,root:f.workerRoot,revoked:false}],['second',{rig:secondRig,root:secondRoot,revoked:false}]]);
 WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(f.workerRoot.position.toArray(),[0,0,0]);assert.deepEqual(secondRoot.position.toArray(),[0,0,0]);
 f.owner.mixers.set('worker',{});f.owner.legacyActorRevision=(f.owner.legacyActorRevision??0)+1;f.owner.confirmedWorkerVisualHeadings.set('worker',2.8);WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.confirmedWorkerVisualIdentities.get('worker').revoked,true);assert.equal(f.owner.confirmedWorkerVisualIdentities.get('second').revoked,false);assert.deepEqual(f.workerRoot.position.toArray(),[1,5.025,2]);assert.equal(f.workerRoot.rotation.y,.6);assert.deepEqual(secondRoot.position.toArray(),[0,0,0]);
 f.calls.length=0;WorldScene.prototype.sync.call(f.owner,0);assert.equal(f.workerRoot.rotation.y,.6);assert.equal(secondRoot.rotation.y,2.2);assert.deepEqual(f.calls.map(call=>call[1]),['worker','second','beast']);
});

test('an unstarted authority does not force its baseline yaw on the legacy scene',()=>{
 const f=fixture();f.owner.workerRuntime=null;f.worker.status='idle';f.worker.path=[];f.workerRoot.rotation.y=.2;f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.1]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:f.owner.mixers.get('worker'),root:f.workerRoot,revoked:false}]]);WorldScene.prototype.sync.call(f.owner,0);assert.equal(f.workerRoot.rotation.y,.2);
});
test('loss of authority restores the last tracked yaw once and then resumes legacy history',()=>{
 const f=fixture();f.worker.status='idle';f.worker.path=[];f.owner.confirmedWorkerVisualHeadings=new Map([['worker',1.1]]);f.owner.confirmedWorkerVisualIdentities=new Map([['worker',{rig:f.owner.mixers.get('worker'),root:f.workerRoot,revoked:false}]]);WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.legacyActorRootsDeferred,true);f.owner.workerRuntime={status:()=>({running:false})};WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.workerRoot.rotation.y,1.1);f.workerRoot.rotation.y=.4;WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.workerRoot.rotation.y,.4);
});

test('legacy raycast refreshes current actor poses and matrices, terrain-only picking does not',()=>{
 const f=fixture();WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});f.worker.x=9;f.animal.z=12;f.owner.nav.field=null;f.owner.canvas={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};f.owner.camera=new PerspectiveCamera();f.owner.cursor=new Vector2();f.owner.terrainMeshes=[];f.owner.raycaster={setFromCamera(){},intersectObjects(){f.calls.push(['raycast']);return [];}};const update=f.owner.scene.updateMatrixWorld.bind(f.owner.scene);f.owner.scene.updateMatrixWorld=value=>{f.calls.push(['matrices']);update(value);};
 WorldScene.prototype.pick.call(f.owner,{clientX:50,clientY:50},{terrainOnly:true});assert.deepEqual(f.calls,[['raycast']]);f.calls.length=0;
 WorldScene.prototype.pick.call(f.owner,{clientX:50,clientY:50});assert.deepEqual(f.calls.map(x=>x[0]),['pose','pose','matrices','raycast','raycast']);assert.equal(f.workerRoot.position.x,9);assert.equal(f.animalRoot.position.z,12);
});

test('a deferred confirmed Rapier pose is fully applied before legacy picking',()=>{
 const f=fixture(),model=new Group(),bone=new Bone();f.state.workers=[];f.owner.objects.delete('worker');f.owner.mixers.delete('worker');bone.name='Spine';model.add(bone);f.animalRoot.add(model);const data={model,expression:{update(){}}};f.owner.mixers.set('beast',data);f.owner.updateActor=WorldScene.prototype.updateActor;f.owner.confirmedAnimalPoses=new Map([['beast',{actorId:'beast',active:true,root:[7,8,9,0,0,0,1,1,1,1],model:[0,0,0,0,0,0,1,1,1,1],bones:[{name:'Spine',transform:[2,3,4,0,0,0,1,1,1,1]}]}]]);f.owner.renderer.domElement={height:720};
 WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.deepEqual(bone.position.toArray(),[0,0,0]);f.owner.prepareDeferredActorPoses();assert.deepEqual(bone.position.toArray(),[2,3,4]);assert.deepEqual(f.animalRoot.position.toArray(),[7,8,9]);
});

test('provisional impact is applied when the legacy pose is requested',()=>{
 const f=fixture(),model=new Group(),bone=new Bone();f.state.workers=[];f.owner.objects.delete('worker');f.owner.mixers.delete('worker');bone.name='Spine';model.add(bone);f.animalRoot.add(model);let now=0;const impact=new ProvisionalBeastImpact({now:()=>now});f.owner.provisionalBeastImpact=impact;f.owner.confirmedAnimalPoses=new Map();f.owner.terrainSupportStats={disabled:true,calls:0,ms:0};f.owner.renderer.domElement={height:720};f.owner.mixers.set('beast',{model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])],groundSamples:[],expression:{update(){}}});f.owner.updateActor=WorldScene.prototype.updateActor;
 assert.equal(impact.begin({kind:'castAttack',id:'cmd',targetId:'beast'},f.state,()=>5),true);now=400;WorldScene.prototype.sync.call(f.owner,0,{legacyDraw:false});assert.equal(f.owner.mixers.get('beast').impactApplied,undefined);f.owner.prepareDeferredActorPoses();assert.equal(f.owner.mixers.get('beast').impactApplied,true);assert.equal(impact.byTarget.get('beast').sampleCount,1);
});

test('Worker loss restores all legacy actor poses before the first fallback draw',()=>{
 const f=fixture();let status={phase:'running',backend:'WebGPU'};f.owner.webGpuWorld={client:{status:()=>status}};f.owner.renderFrameUpdates=function*(dt,farDt,options){WorldScene.prototype.sync.call(this,dt,options);yield;};f.owner.render=function(dt){WorldScene.prototype.sync.call(this,dt);f.calls.push(['draw']);};
 renderWithOptionalWebGpuPresentation(f.owner,.1,true);assert.deepEqual(f.calls,[]);status={phase:'failed',backend:'WebGPU'};renderWithOptionalWebGpuPresentation(f.owner,.1,true);assert.deepEqual(f.calls.map(call=>call[0]),['pose','pose','draw']);assert.equal(f.owner.legacyActorPosesDeferred,false);
});
