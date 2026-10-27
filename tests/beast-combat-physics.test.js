import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,AnimationClip,AnimationMixer,Vector3,Quaternion} from 'three';
import {beastSkin} from './helpers/beast-skin.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../src/rendering/beast-combat-physics.js';
import {updateRaid} from '../src/simulation/raids.js';
const R=await beastPhysicsRuntime();
function fixture(){
 const model=beastSkin('hyena'),root=new Group();root.add(model);root.position.set(20,0,30);root.updateMatrixWorld(true);
 const animal={id:'beast',species:'hyena',x:20,z:30,status:'attacking',hitsRemaining:8,heading:0,radius:.7,attackRemaining:1,path:[{x:21,z:30}],magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
 const data={model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]};
 const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,data]]),onError:error=>{throw error;}};
 return {animal,state,root,world,manager:new BeastCombatPhysics(world,R)};
}
test('combat physics suspends AI and worker hits, moves logical position, recovers and releases resources',()=>{
 const {animal,state,world,root,manager}=fixture();
 state.workers.push({id:'worker',x:20,z:30,status:'walking'});
 manager.step(state,.1);assert.equal(animal.magicDown.phase,'falling');assert.equal(animal.path,null);
 const position=[animal.x,animal.z],hits=animal.hitsRemaining;
 updateRaid(state,.1,world.nav);assert.deepEqual([animal.x,animal.z],position);assert.equal(animal.hitsRemaining,hits);assert.equal(state.workers[0].hits,undefined);
 let recovering=false;
 for(let i=0;i<480;i++){
  state.elapsed+=1/60;manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);
  recovering ||= animal.magicDown?.phase==='recovering';
 }
 assert.ok(recovering);assert.equal(animal.magicDown,undefined);assert.equal(manager.entries.size,0);
 assert.ok(Math.hypot(animal.x-20,animal.z-30)>.5);assert.equal(animal.destinationId,null);
 manager.dispose();assert.equal(world.nav.beastPhysics,undefined);
});
test('second hit reuses the airborne articulated body without resetting its pose',()=>{
 const {animal,state,manager}=fixture();manager.step(state,.1);
 const entry=manager.entries.get(animal.id),before=Array.from(entry.actor.pose);
 state.elapsed+=.1;animal.magicImpact.at=state.elapsed;manager.step(state,0);
 assert.equal(manager.entries.get(animal.id),entry);assert.deepEqual(Array.from(entry.actor.pose),before);assert.equal(entry.solver.world.bodies.len(),14);
 state.raid=null;manager.step(state,.1);assert.equal(manager.entries.size,0);assert.equal(manager.seen.size,0);assert.equal(animal.magicDown,undefined);manager.dispose();
});

test('physical launch waits for projectile contact and only advances the elapsed part of the hit tick',()=>{
 const {animal,state,world,manager}=fixture();animal.magicImpact.impactAt=10.24;animal.magicStunUntil=11;state.workers.push({id:'w',x:20,z:30,status:'walking'});
 state.elapsed=10.1;manager.step(state,.1);assert.equal(manager.entries.size,0);updateRaid(state,.1,world.nav);assert.equal(state.workers[0].hits,undefined);assert.equal(animal.hitsRemaining,8);
 state.elapsed=10.2;manager.step(state,.1);assert.equal(manager.entries.size,0);
 state.elapsed=10.3;manager.step(state,.1);const entry=manager.entries.get(animal.id);
 assert.ok(entry);assert.ok(entry.actor.age>.049&&entry.actor.age<.061);manager.dispose();
});

test('hits throughout get-up preserve the visible pose and reuse the collision world',()=>{
 for(const age of [.15,.65,1.4]){
  const {animal,state,root,manager}=fixture();manager.step(state,.1);
  let entry=manager.entries.get(animal.id);
  for(let i=0;i<360&&!entry.recovery;i++){
   state.elapsed+=1/60;manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);
  }
  assert.ok(entry.recovery,'never entered get-up');entry.recoveryAge=age;manager.render(animal.id);
  const before=entry.binding.entries.map(e=>({p:e.bone.getWorldPosition(new Vector3()),q:e.bone.getWorldQuaternion(new Quaternion())}));
  const logical={x:animal.x,z:animal.z},world=entry.solver.world;
  state.elapsed+=.01;animal.magicImpact.at=state.elapsed;manager.step(state,0);manager.render(animal.id);
  entry=manager.entries.get(animal.id);assert.equal(entry.solver.world,world);assert.equal(world.bodies.len(),14);assert.equal(entry.recovery,null);assert.equal(animal.magicDown.phase,'falling');
  assert.ok(Math.hypot(animal.x-logical.x,animal.z-logical.z)<.0001);
  for(let i=0;i<before.length;i++){
   assert.ok(before[i].p.distanceTo(entry.binding.entries[i].bone.getWorldPosition(new Vector3()))<.0001,'bone position popped at get-up '+age);
   assert.ok(before[i].q.angleTo(entry.binding.entries[i].bone.getWorldQuaternion(new Quaternion()))<.001,'bone orientation popped at get-up '+age);
  }
  for(let i=0;i<500;i++){state.elapsed+=1/60;manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);}
  assert.equal(manager.entries.size,0);assert.equal(animal.magicDown,undefined);manager.dispose();
 }
});


test('four simultaneous contacts keep three ragdolls and release every actor on scene end',()=>{
 const f=fixture();
 for(let i=1;i<4;i++){
  const other=fixture(),id='beast-'+i;other.animal.id=id;other.animal.x+=i*3;other.root.position.x+=i*3;other.root.updateMatrixWorld(true);
  f.state.raid.animals.push(other.animal);f.world.objects.set(id,other.root);f.world.mixers.set(id,other.world.mixers.get('beast'));other.manager.dispose();
 }
 f.manager.step(f.state,.1);assert.equal(f.manager.entries.size,3);assert.equal(f.manager.stats.rejected,1);
 assert.equal(f.state.raid.animals.filter(a=>a.magicDown).length,3);assert.equal(f.state.raid.animals[3].magicDown,undefined);
 for(const entry of f.manager.entries.values())assert.equal(entry.solver.world.bodies.len(),14);
 f.state.result={outcome:'ended'};f.manager.step(f.state,.1);assert.equal(f.manager.entries.size,0);
 assert.ok(f.state.raid.animals.every(a=>!a.magicDown));f.manager.dispose();
});
