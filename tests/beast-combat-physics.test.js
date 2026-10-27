import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,AnimationClip,AnimationMixer} from 'three';
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
