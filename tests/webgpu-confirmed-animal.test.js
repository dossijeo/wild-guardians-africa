import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Scene,Group,Bone,AnimationClip} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createWebGpuConfirmedAnimal} from '../src/rendering/webgpu-confirmed-animal.js';
const state=()=>JSON.parse(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('cancels a pending animal download on disposal signal',async()=>{
 const original=GLTFLoader.prototype.loadAsync,controller=new AbortController();let loaderSignal;
 GLTFLoader.prototype.loadAsync=function(){loaderSignal=this.manager.abortController.signal;return new Promise((resolve,reject)=>loaderSignal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));};
 try{const game=state(),pending=createWebGpuConfirmedAnimal({scene:new Scene(),residency:{},state:game,actorId:game.raid.animals[0].id,signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(loaderSignal.aborted,true);}finally{GLTFLoader.prototype.loadAsync=original;}
});
test('does not start a download when already cancelled',async()=>{
 const controller=new AbortController();controller.abort();const game=state();await assert.rejects(createWebGpuConfirmedAnimal({scene:new Scene(),residency:{},state:game,actorId:game.raid.animals[0].id,signal:controller.signal}),{name:'AbortError'});
});
test('applies confirmed physics and restores normal pose when authority releases the actor',async()=>{
 const scene=new Scene(),model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);let released=0,physical=null;const animal={id:'a',species:'hyena',status:'waiting',x:8,z:9,path:null},game={raid:{animals:[animal]},elapsed:1},assetBank={async acquire(){return {model,clips:[new AnimationClip('Walking',1,[])],release(){released++;}};}};
 const actor=await createWebGpuConfirmedAnimal({scene,residency:{get(){return null;}},state:game,actorId:'a',assetBank,getPose:()=>physical}),transform=(x,y=0)=>[x,y,0,0,0,0,1,1,1,1];
 physical={actorId:'a',active:true,root:transform(15,4),model:transform(2,3),bones:[{name:'Hips',transform:transform(7)},{name:'LeftToeBase',transform:transform(1)},{name:'RightToeBase',transform:transform(1)}]};actor.validatePose(physical);actor.update();assert.equal(actor.root.position.x,15);assert.equal(model.position.y,3);assert.equal(bone.position.x,7);
 assert.throws(()=>actor.validatePose({...physical,bones:[{name:'Wrong',transform:transform(0)}]}),/rig mismatch/);assert.equal(bone.position.x,7);
 assert.throws(()=>actor.validatePose({...physical,bones:[...physical.bones,{name:'LeftToeBase',transform:transform(0)}]}),/Duplicate auxiliary/);
 physical=null;actor.update();assert.equal(actor.root.position.x,8);assert.equal(actor.root.position.z,9);assert.equal(model.position.y,0);assert.equal(bone.position.x,0);actor.dispose();assert.equal(released,1);
});
