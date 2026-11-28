import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene} from 'three';
import {LocomotionVfx} from '../src/rendering/locomotion-vfx.js';

test('locomotion effects use confirmed visual yaw without moving the legacy root',()=>{
 const scene=new Scene(),root=new Group(),actor={id:'worker',profile:'olderMale',x:0,z:0,status:'walking',walkPhase:0},state={elapsed:0,time:0,workers:[actor],raid:null},objects=new Map([['worker',root]]),library={create(){const effect=new Group();effect.native={time:0};effect.seek=time=>{effect.native.time=time;};effect.advance=dt=>{effect.native.time+=dt;};effect.dispose=()=>effect.removeFromParent();return effect;}},vfx=new LocomotionVfx(library,{},scene,()=>0);
 vfx.update(state,objects,()=>1.2);actor.x=.1;actor.walkPhase=4;state.elapsed=.2;vfx.update(state,objects,()=>1.2);assert.ok(vfx.effects.size>0);for(const effect of vfx.effects.values())assert.equal(effect.rotation.y,1.2);assert.equal(root.rotation.y,0);vfx.dispose();
});
