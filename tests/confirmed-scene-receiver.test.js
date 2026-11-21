import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Group,Bone} from 'three';import {deserialize,serialize} from '../src/persistence/snapshots.js';import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';import {emit,observePresentationGameEvents} from '../src/simulation/game.js';import {createConfirmedSceneReceiver} from '../src/rendering/confirmed-scene-receiver.js';
import {attackVfxPlans} from '../src/rendering/attack-vfx.js';import {materialVfxPlans} from '../src/rendering/material-vfx.js';import {shieldVfxPlans} from '../src/rendering/shield-vfx.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
const transform=()=>[0,0,0,0,0,0,1,1,1,1];
test('legacy VFX retain confirmed hit facts beyond the snapshot event ring',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),world={state,mixers:new Map()},receiver=createConfirmedSceneReceiver(state,'s',world),events=[];
 const hit=(attackId,shield)=>({attackId,targetId:'wall-test',species:'warthog',presentation:{version:1,elapsed:authority.elapsed,animal:{x:2,z:0,heading:0},target:{kind:'wall',material:'piedra',x:0,z:0},...(shield?{shield:{id:'shield-test',x:0,z:0,radius:2}}:{})}});
 for(const [name,detail] of [['AnimalLogicalHit',hit('wall-hit',false)],['AnimalLogicalHit',hit('shield-hit',true)]]){emit(authority,name,detail);events.push(structuredClone(authority.events.at(-1)));}
 for(let i=0;i<201;i++){emit(authority,'Unrelated');events.push(structuredClone(authority.events.at(-1)));}
 assert.ok(!authority.events.some(event=>event.id===events[0].id));assert.equal(receiver.accept({session:'s',sequence:1,snapshot:serializeConfirmedState(authority),events,physicsPose:null}).accepted,true);
 const factEvents=world.confirmedVfxEventWindow.sync(state.elapsed),withWindow={...state,events:factEvents},reference={...state,events:events.slice(0,2)};
 for(const plans of [attackVfxPlans,materialVfxPlans,shieldVfxPlans])assert.deepEqual(plans(withWindow),plans(reference));
 assert.equal(materialVfxPlans(withWindow).length,1);assert.equal(shieldVfxPlans(withWindow).filter(plan=>plan.mode==='contact').length,1);
});
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
test('an omitted inactive pose releases its previous rig after confirmation',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),animal=authority.raid.animals[0],model=new Group(),bone=new Bone();bone.name='Hips';model.add(bone);const rig={model,key:'falling'},world={state,mixers:new Map([[animal.id,rig]])},receiver=createConfirmedSceneReceiver(state,'s',world),pose={actorId:animal.id,active:true,root:transform(),model:transform(),bones:[{name:'Hips',transform:transform()}]};
 animal.magicDown={phase:'falling',since:authority.elapsed,until:authority.elapsed+1};assert.equal(receiver.accept({session:'s',sequence:1,snapshot:serializeConfirmedState(authority),events:[],physicsPose:pose}).accepted,true);delete animal.magicDown;
 assert.equal(receiver.accept({session:'s',sequence:2,snapshot:serializeConfirmedState(authority),events:[],physicsPose:null}).accepted,true);assert.equal(world.confirmedAnimalPoses.size,0);assert.equal(rig.key,null);
});
test('scene accepts observed motion only with a confirmed publication',()=>{
 const state=fixture(),world={state,mixers:new Map()},receiver=createConfirmedSceneReceiver(state,'s',world),actor=state.raid.animals[0],id=actor.id,trace={actorId:id,start:{at:state.elapsed,x:actor.x,z:actor.z},end:{at:state.elapsed,x:actor.x,z:actor.z},segments:[],continuous:true,timed:true},packet={session:'s',sequence:1,snapshot:serializeConfirmedState(state),events:[],physicsPose:null,motionTrace:trace};
 assert.throws(()=>receiver.accept({...packet,motionTrace:{...trace,end:{...trace.end,x:trace.end.x+1}}}),/Invalid observed path motion/);assert.equal(receiver.status().sequence,0);assert.equal(world.lastObservedPathMotion,undefined);
 assert.throws(()=>receiver.accept({...packet,motionTrace:{...trace,segments:[{at:state.elapsed,x0:actor.x+1,z0:actor.z,x1:actor.x,z1:actor.z,t0:state.elapsed,t1:state.elapsed}]}}),/Invalid observed path motion/);
 assert.throws(()=>receiver.accept({...packet,motionTrace:{...trace,peers:[{...trace,radius:.28,startStatus:'walking',endStatus:'walking'}],rosterChanged:false}}),/Invalid observed peer motion/);
 assert.equal(receiver.accept(packet).accepted,true);assert.equal(world.lastObservedPathMotion,trace);
 const invalidation={actorId:id,at:state.elapsed,x:1,z:0,reason:'pause'},next={session:'s',sequence:2,snapshot:serializeConfirmedState(state),events:[],physicsPose:null,elapsed:state.elapsed,motionInvalidation:invalidation};
 assert.throws(()=>receiver.accept({...next,motionInvalidation:{...invalidation,at:invalidation.at+1}}),/Invalid path motion invalidation/);assert.equal(world.lastObservedPathMotion,trace);assert.equal(receiver.accept(next).accepted,true);assert.equal(world.lastObservedPathMotion,null);assert.equal(world.lastObservedPathInvalidation,invalidation);
 const batch={...packet,sequence:3,elapsed:state.elapsed,motionInvalidation:{actorId:id,at:state.elapsed,x:actor.x,z:actor.z,reason:'simulation-event'}};assert.equal(receiver.accept(batch).accepted,true);assert.equal(world.lastObservedPathMotion,null);assert.equal(world.lastObservedPathInvalidation.reason,'simulation-event');
});
