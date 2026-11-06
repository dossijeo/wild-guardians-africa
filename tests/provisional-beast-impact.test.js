import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone} from 'three';
import {ProvisionalBeastImpact} from '../src/rendering/provisional-beast-impact.js';
import {captureAnimalImpact,applyAnimalImpact,restoreAnimalImpact} from '../src/rendering/animal-impact.js';
test('duplicate command identities cannot orphan a provisional animal',()=>{
 const manager=new ProvisionalBeastImpact({now:()=>0}),a={id:'a',x:0,z:0},b={id:'b',x:2,z:0},state={raid:{animals:[a,b]}},command={kind:'castAttack',id:'hit',targetId:'a'};
 assert.equal(manager.begin(command,state,()=>0),true);
 assert.equal(manager.begin({...command,targetId:'b'},state,()=>0),false);
 assert.equal(manager.byTarget.size,1);assert.equal(manager.byCommand.get('hit').targetId,'a');
 assert.equal(manager.end('hit'),true);assert.equal(manager.byTarget.size,0);
 assert.equal(manager.begin({...command,id:'',targetId:'b'},state,()=>0),false);
 assert.equal(manager.begin({...command,id:'second',targetId:'b'},state,()=>0),true);
 assert.equal(manager.end('second'),true);assert.equal(manager.byTarget.size,0);
});
test('provisional recoil affects only the rendered rig and ends by command ID',()=>{
 let now=1000;const manager=new ProvisionalBeastImpact({now:()=>now}),animal={id:'a',species:'hyena',x:2,z:3,radius:.7,heading:0,status:'walking'},state={raid:{animals:[animal]}},original=structuredClone(state),command={kind:'castAttack',id:'c1',targetId:'a',selection:{origin:{x:0,y:2,z:3},contact:{x:2,y:1,z:3}}};
 assert.equal(manager.begin(command,state,()=>0),true);assert.equal(manager.sample(animal,10),null);now+=320;const sample=manager.sample(animal,10);assert.ok(sample);const model=new Group(),bone=new Bone();bone.name='Spine';model.add(bone);const data={model};captureAnimalImpact(data,sample.animal,sample.elapsed);applyAnimalImpact(data,sample.animal,sample.elapsed);assert.notEqual(bone.quaternion.z,0);assert.deepEqual(state,original);assert.equal(manager.end('other'),false);assert.equal(manager.end('c1'),true);assert.equal(manager.lastResolution.lastSample.age,sample.elapsed);assert.ok(Number.isFinite(manager.lastResolution.lastSample.response.roll));restoreAnimalImpact(data);assert.equal(bone.quaternion.z,0);assert.equal(manager.sample(animal,10),null);
});
test('downed or actively confirmed actors do not receive provisional recoil',()=>{
 let now=0;const manager=new ProvisionalBeastImpact({now:()=>now}),animal={id:'a',species:'hyena',x:0,z:0,status:'walking'},state={raid:{animals:[animal]}},command={kind:'castAttack',id:'a1',targetId:'a',selection:{}};assert.equal(manager.begin(command,state,()=>0),true);now=400;animal.magicDown={phase:'falling'};assert.equal(manager.sample(animal,4),null);delete animal.magicDown;animal.magicImpact={at:3.8,impactAt:3.8};assert.equal(manager.sample(animal,4),null);manager.clear();assert.equal(manager.byTarget.size,0);
});
test('Worker presentation holds a bounded provisional pose until physical reconciliation',()=>{
 let now=0;const manager=new ProvisionalBeastImpact({now:()=>now}),animal={id:'a',species:'hyena',x:0,z:0,status:'walking'},state={raid:{animals:[animal]}};
 assert.equal(manager.begin({kind:'castAttack',id:'a1',targetId:'a',selection:{}},state,()=>0),true);animal.magicDown={phase:'falling'};animal.magicImpact={at:2,impactAt:2.2};now=3000;
 const sample=manager.sample(animal,3,{holdUntilPhysical:true});assert.ok(sample);assert.equal(sample.elapsed,1.34);manager.end('a1');assert.equal(manager.sample(animal,3,{holdUntilPhysical:true}),null);
});

test('historical visual anchor is copied, validated and leaves simulation untouched',()=>{const manager=new ProvisionalBeastImpact({now:()=>0}),animal={id:'a',species:'hyena',x:0,z:0,status:'walking'},state={raid:{animals:[animal]}},original=structuredClone(state),command={kind:'castAttack',id:'a1',targetId:'a',selection:{}},anchor={x:4,y:2,z:3,yaw:1,at:5,horizon:6};assert.equal(manager.begin(command,state,()=>2,anchor),true);anchor.x=99;assert.equal(manager.byTarget.get('a').anchor.x,4);assert.deepEqual(state,original);manager.end('a1');assert.equal(manager.begin({...command,id:'bad'},state,()=>2,{...anchor,at:7}),false);assert.equal(manager.byTarget.size,0);});
