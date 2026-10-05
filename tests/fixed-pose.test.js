import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,AnimationClip,NumberKeyframeTrack,Object3D,LoopOnce} from 'three';
import {sampleFixedPose} from '../src/rendering/fixed-pose.js';
function rig(){const model=new Object3D(),mixer=new AnimationMixer(model),clip=new AnimationClip('move',2,[new NumberKeyframeTrack('.position[x]',[0,1,2],[0,10,20])]),action=mixer.clipAction(clip).play();action.paused=true;let calls=0;const update=mixer.update.bind(mixer);mixer.update=dt=>{calls++;return update(dt);};return {model,mixer,action,calls:()=>calls};}
test('an unchanged paused sample retains exact transforms without reevaluating the mixer',()=>{
 const data=rig();sampleFixedPose(data,.5);assert.equal(data.model.position.x,5);
 for(let i=0;i<300;i++)assert.equal(sampleFixedPose(data,.5),false);
 assert.equal(data.calls(),1);assert.equal(data.model.position.x,5);
 sampleFixedPose(data,.6);assert.equal(data.calls(),2);assert.equal(data.model.position.x,6);
});
test('restarted actions, replaced actions/mixers, weights and externally changed times invalidate reuse',()=>{
 const data=rig();sampleFixedPose(data,.5);sampleFixedPose(data,.5,true);assert.equal(data.calls(),2);
 data.action.time=.2;sampleFixedPose(data,.5);assert.equal(data.calls(),3);assert.equal(data.model.position.x,5);
 data.action.weight=.5;sampleFixedPose(data,.5);assert.equal(data.calls(),4);assert.equal(data.model.position.x,2.5);
 const replacement=rig();Object.assign(data,{mixer:replacement.mixer,action:replacement.action});assert.equal(sampleFixedPose(data,.5),true);assert.equal(replacement.calls(),1);
});
test('repeated terminal poses and a new attack at identical clip time remain correct',()=>{
 const data=rig();data.action.setLoop(LoopOnce,1);data.action.clampWhenFinished=true;
 sampleFixedPose(data,2);const position=data.model.position.x;for(let i=0;i<20;i++)sampleFixedPose(data,2);assert.equal(data.model.position.x,position);
 data.action.reset().play();data.action.paused=true;sampleFixedPose(data,0,true);assert.equal(data.model.position.x,0);
});
