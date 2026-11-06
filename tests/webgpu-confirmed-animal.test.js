import {NumberKeyframeTrack} from 'three';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
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
 assert.equal(actor.root.visible,false);physical={actorId:'a',active:true,root:transform(15,4),model:transform(2,3),bones:[{name:'Hips',transform:transform(7)},{name:'LeftToeBase',transform:transform(1)},{name:'RightToeBase',transform:transform(1)}]};actor.validatePose(physical);actor.update();assert.equal(actor.root.visible,true);assert.equal(actor.root.position.x,15);assert.equal(model.position.y,3);assert.equal(bone.position.x,7);
 assert.throws(()=>actor.validatePose({...physical,bones:[{name:'Wrong',transform:transform(0)}]}),/rig mismatch/);assert.equal(bone.position.x,7);
 assert.throws(()=>actor.validatePose({...physical,bones:[...physical.bones,{name:'LeftToeBase',transform:transform(0)}]}),/Duplicate auxiliary/);
 physical=null;actor.update();assert.equal(actor.root.visible,false);assert.equal(actor.root.position.x,8);assert.equal(actor.root.position.z,9);assert.equal(model.position.y,0);assert.equal(bone.position.x,0);actor.dispose();assert.equal(released,1);
});
test('confirmed recovery exit yields to a new provisional impact and then real physics',async()=>{
 const scene=new Scene(),model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);const animal={id:'a',species:'hyena',status:'walking',x:0,z:0,heading:0,radius:.7},game={raid:{animals:[animal]},elapsed:1},assetBank={async acquire(){return {model,clips:[new AnimationClip('Walking',1,[])],release(){}};}};let physical=null,provisional=null,confirmed=0;
 const actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state:game,actorId:'a',assetBank,getPose:()=>physical,getProvisional:()=>provisional,onPhysical:()=>confirmed++}),transform=x=>[x,0,0,0,0,0,1,1,1,1];
 try{
  physical={actorId:'a',active:true,visualTransition:'recovery-exit',root:transform(7),model:transform(0),bones:[{name:'Hips',transform:transform(3)}]};actor.update();assert.equal(actor.root.position.x,7);assert.equal(bone.position.x,3);assert.equal(actor.isPhysical(),false);assert.equal(confirmed,0);
  const hit={at:0,impactAt:0,point:{x:0,y:1,z:0},direction:{x:1,y:0,z:0},intensity:1,ground:0};provisional={animal:{...animal,magicImpact:hit},elapsed:.1};actor.update();assert.equal(actor.root.position.x,0);assert.notEqual(model.quaternion.z,0);assert.equal(confirmed,0);
  physical={...physical,visualTransition:undefined,root:transform(9),bones:[{name:'Hips',transform:transform(4)}]};actor.update();assert.equal(actor.root.position.x,9);assert.equal(bone.position.x,4);assert.equal(actor.isPhysical(),true);assert.equal(confirmed,1);
 }finally{actor.dispose();}
});
test('historical impact selects its fall direction in the visible anchored orientation',async()=>{
 const scene=new Scene(),model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);const animal={id:'a',species:'hyena',status:'walking',x:0,z:0,heading:0,radius:.7},game={raid:{animals:[animal]},elapsed:1},bank={async acquire(){return {model,clips:[new AnimationClip('Walking',1,[])],release(){}};}};let anchor=null,selected=null;
 const hit={at:0,impactAt:0,point:{x:0,y:1,z:0},direction:{x:1,y:0,z:0},intensity:1,ground:0},sample={animal:{...animal,magicImpact:hit},elapsed:.1};
 const actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state:game,actorId:'a',assetBank:bank,getProvisional:()=>sample,getProvisionalAnchor:()=>anchor,getFalls:()=>({get(key){selected=key;return null;}})});
 try{assert.equal(selected,'hyena:side');anchor={x:0,y:0,z:0,yaw:Math.PI/2};actor.update();assert.equal(selected,'hyena:front');assert.equal(actor.root.rotation.y,Math.PI/2);}finally{actor.dispose();}
});
test('QA bone reconciliation ends on the authoritative pose while root remains authoritative',async()=>{
 const scene=new Scene(),model=new Group(),bone=new Bone();bone.name='Spine';model.add(bone);const animal={id:'a',species:'hyena',status:'walking',x:0,z:0,heading:0,radius:.7},game={raid:{animals:[animal]},elapsed:1},bank={async acquire(){return {model,clips:[new AnimationClip('Walking',1,[])],release(){}};}};let now=0,physical=null;
 const hit={at:0,impactAt:0,point:{x:0,y:1,z:0},direction:{x:1,y:0,z:0},intensity:1,ground:0},sample={animal:{...animal,magicImpact:hit},elapsed:.1};
 const actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state:game,actorId:'a',assetBank:bank,experimentalPoseReconciliation:true,clock:()=>now,getPose:()=>physical,getProvisional:()=>sample});actor.update();const initial=bone.quaternion.clone(),transform=(x=0)=>[x,0,0,0,0,0,1,1,1,1];
 physical={actorId:'a',active:true,root:transform(7),model:transform(),bones:[{name:'Spine',transform:[0,0,0,0,Math.SQRT1_2,0,Math.SQRT1_2,1,1,1]}]};actor.update();assert.equal(actor.root.position.x,7);assert.equal(model.position.x,-7);assert.ok(bone.quaternion.angleTo(initial)<1e-6);assert.equal(actor.isReconciling(),true);
 now=150;actor.update();assert.equal(actor.isReconciling(),false);assert.equal(model.position.x,0);assert.ok(bone.quaternion.angleTo(new Bone().quaternion.set(0,Math.SQRT1_2,0,Math.SQRT1_2))<1e-6);actor.dispose();
});

test('normal animal pose uses confirmed clock while provisional and physical paths keep authority',async()=>{const scene=new Scene(),model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);const animal={id:'a',species:'hyena',status:'walking',x:0,z:0},game={raid:{animals:[animal]},elapsed:.75},clip=new AnimationClip('Walking',1,[new NumberKeyframeTrack('Hips.position[x]',[0,1],[0,1])]),attackClip=new AnimationClip('Weapon_Combo',1,[new NumberKeyframeTrack('Hips.position[x]',[0,1],[0,1])]),assetBank={async acquire(){return {model,clips:[clip,attackClip],release(){}};}},confirmedClock=createConfirmedPresentationClock(.25);let physical=null,provisionalTime=null;const actor=await createWebGpuConfirmedAnimal({scene,residency:{get:()=>null},state:game,actorId:'a',assetBank,confirmedClock,getPose:()=>physical,getProvisional:(_entity,time)=>{provisionalTime=time;return null;}});assert.ok(Math.abs(bone.position.x-.25)<1e-6);assert.equal(provisionalTime,.75);game.elapsed=.9;actor.update();assert.ok(Math.abs(bone.position.x-.25)<1e-6);assert.equal(provisionalTime,.9);confirmedClock.commit(.5);game.elapsed=.5;actor.update();assert.ok(Math.abs(bone.position.x-.5)<1e-6);animal.motionPhase=.17;actor.update();assert.ok(Math.abs(bone.position.x-.17)<1e-6);delete animal.motionPhase;animal.status='attacking';animal.animation='Weapon_Combo';animal.attackDuration=1;animal.attackRemaining=.7;animal.attackId='hit';actor.update();assert.ok(Math.abs(bone.position.x-.3)<1e-6);animal.status='walking';actor.update();assert.ok(Math.abs(bone.position.x-.5)<1e-6);const transform=x=>[x,0,0,0,0,0,1,1,1,1];physical={actorId:'a',active:true,root:transform(7),model:transform(0),bones:[{name:'Hips',transform:transform(.8)}]};actor.update();assert.equal(actor.root.position.x,7);assert.equal(bone.position.x,.8);physical=null;actor.update();assert.equal(actor.root.position.x,0);assert.ok(Math.abs(bone.position.x-.5)<1e-6);actor.dispose();confirmedClock.dispose();});
