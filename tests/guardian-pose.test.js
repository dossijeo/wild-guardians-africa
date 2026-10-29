import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GuardianPose} from '../src/rendering/guardian-pose.js';
function fixture(){
 const model=new THREE.Group(),bone=new THREE.Bone();bone.name='Mantle';model.add(bone);
 const mixer=new THREE.AnimationMixer(model),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.4,.1,-.2));
 const clip=new THREE.AnimationClip('Wind',2,[new THREE.QuaternionKeyframeTrack('Mantle.quaternion',[0,2],[...q.toArray(),...q.toArray()]),new THREE.VectorKeyframeTrack('Mantle.position',[0,2],[0,0,0,0,1,0])]);
 const action=mixer.clipAction(clip);action.play();action.time=.6;
 return {bone,mixer,action,pose:new GuardianPose(model,mixer)};
}
function gust(bone){bone.rotation.x+=.16;bone.rotation.z+=.12;bone.position.x+=.03;}
test('reproduces cached mixer drift and prevents repeated paused gust accumulation',()=>{
 const raw=fixture();raw.mixer.update(0);gust(raw.bone);const first=raw.bone.quaternion.clone();
 for(let i=0;i<120;i++){raw.mixer.update(0);gust(raw.bone);}
 assert.ok(first.angleTo(raw.bone.quaternion)>.1,'the original mixer-plus-additive path drifts');
 const fixed=fixture();fixed.pose.update();gust(fixed.bone);const q=fixed.bone.quaternion.clone(),p=fixed.bone.position.clone();
 for(let i=0;i<240;i++){fixed.pose.update();gust(fixed.bone);assert.ok(q.angleTo(fixed.bone.quaternion)<1e-7);assert.ok(p.distanceTo(fixed.bone.position)<1e-10);}
});
test('resume, repeated seeks and disabled layers match a fresh mixer sample',()=>{
 const f=fixture();
 for(const time of [.1,.1,.3,.7,.7,1.2,.2]){
  f.action.time=time;f.pose.update();gust(f.bone);
  const fresh=fixture();fresh.action.time=time;fresh.pose.update();gust(fresh.bone);
  assert.ok(f.bone.quaternion.angleTo(fresh.bone.quaternion)<1e-7);
  assert.ok(f.bone.position.distanceTo(fresh.bone.position)<1e-10);
 }
 f.action.enabled=false;f.pose.update();const q=f.bone.quaternion.clone(),p=f.bone.position.clone();gust(f.bone);f.pose.update();
 assert.ok(q.angleTo(f.bone.quaternion)<1e-7);assert.ok(p.distanceTo(f.bone.position)<1e-10);
});

test('installed Guardian rig remains stable across repeated spell renders',async()=>{
 const {readFileSync}=await import('node:fs');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const {rigForSampling}=await import('../tools/prepare_watering_emitters.mjs');const {GuardianSummons}=await import('../src/rendering/guardian-summons.js');
 const gltf=await new GLTFLoader().parseAsync(rigForSampling(readFileSync('public/content/guardian/guardian.glb')),'');
 const world={toon:{uniforms:{uLightDir:{value:new THREE.Vector3(1,1,0)},uNight:{value:1}}},state:{events:[],elapsed:1,time:400},scene:new THREE.Scene(),assets:{model:async()=>gltf},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 for(const kind of ['attack','growth','multiply','shield']){
  world.state.elapsed+=3;summons.update();const at=world.state.elapsed;
  world.state.events.push({type:'SpellActivated',kind,x:0,z:0,presentation:{origin:{x:3,y:1,z:0},contact:{x:0,y:1,z:0},elapsed:at}});
  for(const age of [.12,.3,.72,1.8]){
   world.state.elapsed=at+age;summons.update();const bones=[];
   summons.slots[0].model.traverse(b=>{if(b.isBone)bones.push({b,q:b.quaternion.clone(),p:b.position.clone()});});
   for(let i=0;i<60;i++){summons.update();for(const {b,q,p} of bones){assert.ok(q.toArray().every((v,j)=>Math.abs(v-b.quaternion.toArray()[j])<1e-8),kind+' '+age+' '+b.name);assert.ok(p.distanceTo(b.position)<1e-9);}}
  }
 }
 summons.dispose();
});


test('installed animated hand anchors Attack flight and reaches the selected surface on the impact marker',async()=>{
 const {readFileSync}=await import('node:fs');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 const {rigForSampling}=await import('../tools/prepare_watering_emitters.mjs');const {GuardianSummons}=await import('../src/rendering/guardian-summons.js');
 const {GUARDIAN_ATTACK_TIMING:T}=await import('../src/simulation/guardian-timing.js');
 const gltf=await new GLTFLoader().parseAsync(rigForSampling(readFileSync('public/content/guardian/guardian.glb')),'');
 const world={toon:{uniforms:{uLightDir:{value:new THREE.Vector3(1,1,0)},uNight:{value:1}}},state:{events:[],elapsed:1,time:400,raid:{animals:[{id:'victim',status:'walking'}]}},scene:new THREE.Scene(),assets:{model:async()=>gltf},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;const slot=summons.slots[0];
 assert.ok(slot.hand?.isBone,'the installed model must expose the actual hand bone');
 assert.ok(slot.actions.has('Spell_Attack'),'exercise the authored attack clip');
 const matrix=new THREE.Matrix4();let previousHand=null,moved=false;
 try{
  for(const contact of [{x:0,y:1,z:0},{x:5,y:.2,z:-3},{x:-2,y:4,z:3}]){
   summons.clear();world.state.elapsed+=4;summons.update();const at=world.state.elapsed;
   world.state.events.push({type:'SpellActivated',kind:'attack',targetId:'victim',x:contact.x,z:contact.z,presentation:{origin:{x:3,y:1,z:0},contact,elapsed:at}});
   summons.update();assert.equal(slot.event.targetId,'victim');previousHand=null;
   for(const age of [T.release*.5,T.release+.005,T.release+(T.impact-T.release)*.5,T.impact-.001,T.impact+.001]){
    world.state.elapsed=at+age;summons.update();const hand=slot.hand.getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(contact.x,contact.y,contact.z);
    if(previousHand&&previousHand.distanceTo(hand)>.001)moved=true;previousHand=hand.clone();
    assert.equal(slot.impact.visible,age>=T.impact,'impact flash must not precede the shared marker');
    if(age<T.release){assert.equal(slot.beam.visible,false);assert.ok(slot.core.position.distanceTo(hand)<1e-6);continue;}
    assert.equal(slot.beam.visible,true);assert.equal(slot.beam.count,1);slot.beam.getMatrixAt(0,matrix);
    const tail=new THREE.Vector3(0,-.5,0).applyMatrix4(matrix),tip=new THREE.Vector3(0,.5,0).applyMatrix4(matrix),ray=target.clone().sub(hand),length=ray.length();ray.normalize();
    for(const point of [tail,tip]){const delta=point.clone().sub(hand),along=delta.dot(ray);assert.ok(along>=-1e-5&&along<=length+1e-5);assert.ok(delta.addScaledVector(ray,-along).length()<1e-5,'beam endpoints must remain on the current hand-to-contact line');}
    if(age<T.release+(T.impact-T.release)*.5+.0001)assert.ok(tail.distanceTo(hand)<1e-5,'initial trail is attached to the animated hand');
    if(age<T.impact)assert.ok(tip.distanceTo(target)>1e-4,'no premature contact');
    else{assert.ok(tip.distanceTo(target)<1e-5);assert.ok(slot.impact.position.distanceTo(target)<1e-6);}
   }
  }
  assert.ok(moved,'test must sample changing authored hand poses');
 }finally{summons.dispose();}
});
