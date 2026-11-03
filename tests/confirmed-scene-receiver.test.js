import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Group,Bone} from 'three';import {deserialize,serialize} from '../src/persistence/snapshots.js';import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';import {emit,observePresentationGameEvents} from '../src/simulation/game.js';import {createConfirmedSceneReceiver} from '../src/rendering/confirmed-scene-receiver.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
const transform=()=>[0,0,0,0,0,0,1,1,1,1];
test('scene applies only ordered poses paired with confirmed state and resets released rigs',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),animal=authority.raid.animals[0],model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);const rig={model,key:'running'},world={state,mixers:new Map([[animal.id,rig]])},receiver=createConfirmedSceneReceiver(state,'s',world),pose={actorId:animal.id,active:true,root:transform(),model:transform(),bones:[{name:'Hips',transform:transform()}]};
 animal.magicDown={phase:'falling',since:authority.elapsed,until:authority.elapsed+1};emit(authority,'TestPose');const event=authority.events.at(-1),seen=[],stop=observePresentationGameEvents(state,()=>seen.push(world.confirmedAnimalPoses?.has(animal.id)));const packet={session:'s',sequence:1,snapshot:serializeConfirmedState(authority),events:[event],physicsPose:pose};
 const before=serialize(state),{physicsPose:ignored,...missing}=packet;assert.throws(()=>receiver.accept(missing),/Missing confirmed physics pose/);assert.throws(()=>receiver.accept({...packet,physicsPose:{...pose,bones:[{name:'wrong',transform:transform()}]}}),/rig mismatch/);assert.equal(serialize(state),before);assert.equal(receiver.status().sequence,0);
 assert.deepEqual(receiver.accept(packet),{accepted:true,sequence:1});assert.equal(world.confirmedAnimalPoses.get(animal.id),pose);assert.deepEqual(seen,[true]);assert.equal(receiver.accept(packet).reason,'stale');
 delete animal.magicDown;const released={...packet,sequence:2,events:[],snapshot:serializeConfirmedState(authority),physicsPose:{...pose,active:false}};assert.equal(receiver.accept(released).accepted,true);assert.equal(world.confirmedAnimalPoses.size,0);assert.equal(rig.key,null);stop();
});
test('scene rejects mismatched or duplicate poses before mutating state',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),animal=authority.raid.animals[0],world={state,mixers:new Map()},receiver=createConfirmedSceneReceiver(state,'s',world),pose={actorId:animal.id,active:true,root:transform(),model:transform(),bones:[]};animal.magicDown={phase:'falling',since:authority.elapsed,until:authority.elapsed+1};const packet={session:'s',sequence:1,snapshot:serializeConfirmedState(authority),events:[],physicsPose:pose,physicsPoses:[pose,pose]},before=serialize(state);
 assert.throws(()=>receiver.accept(packet),/Invalid confirmed animal pose/);assert.equal(serialize(state),before);assert.equal(receiver.status().sequence,0);
});
test('scene accepts observed motion only with a confirmed publication',()=>{
 const state=fixture(),world={state,mixers:new Map()},receiver=createConfirmedSceneReceiver(state,'s',world),id=state.raid.animals[0].id,trace={actorId:id,start:{at:1,x:0,z:0},end:{at:2,x:1,z:0},segments:[{at:2,x0:0,z0:0,x1:1,z1:0,t0:1,t1:2}],continuous:true,timed:true},packet={session:'s',sequence:1,snapshot:serializeConfirmedState(state),events:[],physicsPose:null,motionTrace:trace};
 assert.throws(()=>receiver.accept({...packet,motionTrace:{...trace,segments:[{...trace.segments[0],at:3}]}}),/Invalid observed path motion/);assert.equal(receiver.status().sequence,0);assert.equal(world.lastObservedPathMotion,undefined);
 assert.equal(receiver.accept(packet).accepted,true);assert.equal(world.lastObservedPathMotion,trace);
});
