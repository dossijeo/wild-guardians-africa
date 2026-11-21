import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrajectoryReceiver} from '../tools/trees/prototype_mobility_contract.mjs';
import {movePath} from '../src/simulation/locomotion.js';

const route=()=>({session:'world-1',actorId:'animal-1',version:1,kind:'trajectory',startTime:10,points:[{x:0,z:0},{x:2,z:0},{x:2,z:3}],durations:[1,3],movementMode:'walk',animationState:'walk'});
test('simulation time controls interpolation, pause and bounded endpoints',()=>{
 const receiver=createTrajectoryReceiver('world-1');receiver.apply(route(),10);
 assert.deepEqual([receiver.sample('animal-1',10).x,receiver.sample('animal-1',10).z],[0,0]);
 assert.deepEqual([receiver.sample('animal-1',11.5).x,receiver.sample('animal-1',11.5).z],[2,.5]);
 assert.deepEqual(receiver.sample('animal-1',11.5),receiver.sample('animal-1',11.5));
 assert.deepEqual([receiver.sample('animal-1',99).x,receiver.sample('animal-1',99).z],[2,3]);
});
test('newer stop and removal cannot be overwritten by delayed instructions or other sessions',()=>{
 const receiver=createTrajectoryReceiver('world-1');receiver.apply(route(),10);
 assert.equal(receiver.apply({session:'world-1',actorId:'animal-1',version:2,kind:'stop',at:11,point:{x:2,z:0},animationState:'idle'},11).accepted,true);
 assert.deepEqual(receiver.apply(route(),11),{accepted:false,reason:'stale'});
 assert.deepEqual(receiver.apply({...route(),session:'world-previous',version:99},11),{accepted:false,reason:'session'});
 assert.deepEqual([receiver.sample('animal-1',12).x,receiver.sample('animal-1',12).z],[2,0]);
 assert.equal(receiver.apply({session:'world-1',actorId:'animal-1',version:3,kind:'remove',at:12},12).accepted,true);
 assert.equal(receiver.sample('animal-1',12),null);
 assert.deepEqual(receiver.apply({...route(),version:2},12),{accepted:false,reason:'stale'});
});
test('invalid or externally mutated inputs cannot change the accepted instruction',()=>{
 const receiver=createTrajectoryReceiver('world-1'),input=route();receiver.apply(input,10);input.points[1].x=50;input.durations[0]=10;
 assert.equal(receiver.sample('animal-1',11).x,2);
 assert.throws(()=>receiver.apply({...route(),version:2,durations:[0,3]},11),/duration/);
 assert.throws(()=>receiver.apply({...route(),version:2,startTime:12},11),/trajectory/);
 assert.throws(()=>receiver.apply({...route(),version:2,startTime:1e20,durations:[1,3]},1e20),/end time/);
 assert.throws(()=>receiver.sample('animal-1',9),/precedes/);
 assert.equal(receiver.sample('animal-1',11).version,1);
 assert.throws(()=>receiver.sample('animal-1',NaN),/sample/);
});
test('unobstructed constant-speed interpolation matches current movement over multiple segments',()=>{
 const receiver=createTrajectoryReceiver('world-1'),actor={x:0,z:0,path:[{x:2,z:0},{x:2,z:3}]},speed=2;
 receiver.apply({...route(),startTime:0,durations:[1,1.5]},0);
 let elapsed=0;for(const dt of [.2,.3,.7,.45,.85]){
  movePath(actor,dt*speed);elapsed+=dt;const visual=receiver.sample('animal-1',elapsed);
  assert.ok(Math.abs(actor.x-visual.x)<1e-9);assert.ok(Math.abs(actor.z-visual.z)<1e-9);
 }
});
