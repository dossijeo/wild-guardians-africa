import {centerFootprint} from '../src/world/centers.js';
import {edgeDistance} from '../src/world/footprints.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {AttackVfx,attackVfxPlans,attackVfxContacts} from '../src/rendering/attack-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {ANIMAL_ACTIONS as A} from '../src/simulation/animal-actions-data.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url)));
const nav={version:1,placement:()=>({valid:true}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(species,animation,culture='mapungubwe'){
  const state=Game.newGame({slotId:'attack-vfx',seed:712,culture});Game.resume(state,'intro');Game.placeStructure(state,'center',{x:12,z:8},nav);
  const target=state.structures[0],duration=A.animals[species].clips[animation].duration;
  const animal={id:'animal',species,x:12,z:13,heading:Math.PI,radius:1,spawn:{x:12,z:30},targetId:target.id,reservation:'structure:'+target.id,hitsRemaining:1,status:'attacking',animation,attackId:'attack-vfx',attackDuration:duration,attackRemaining:duration,hitApplied:false};
  state.raid={id:'raid',animals:[animal],reservations:{[animal.reservation]:animal.id},encounters:[]};state.initialPreparation=false;state.time=320;state.nightPlan={at:320,done:true,group:[]};
  return {state,animal,target,duration};
}
function graphics(){const renderer={shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)},pipeline=new BuildingDestructionPass(renderer),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048})),scene=new THREE.Scene(),manager=new AttackVfx(library,pipeline,scene,()=>0);return {pipeline,library,scene,manager,dispose(){manager.dispose();library.dispose();pipeline.dispose();}};}

for(const species of Object.keys(A.animals))test(`${species}: four clips present one committed logical hit with independent decorative contacts, pause and reload`,()=>{
  for(const animation of ['Right_Hand_Sword_Slash','Charged_Upward_Slash','Weapon_Combo','Weapon_Combo_2']){
    let {state,animal,target,duration}=fixture(species,animation),g=graphics();const hp=target.hp;
    Game.tick(state,duration/2,nav);const before=serialize(state);g.manager.update(state);assert.equal(serialize(state),before);
    let effect=g.manager.effects.get(animal.attackId),plan=attackVfxPlans(state)[0];assert.ok(Math.abs(plan.time-attackVfxContacts[species].time/2)<1e-8);assert.equal(target.hp,hp);
    const landed=new THREE.Vector3(...attackVfxContacts[species].point);effect.updateWorldMatrix(true,false);landed.applyMatrix4(effect.matrixWorld);const hull=centerFootprint(target,state).footprint;assert.ok(Math.min(...hull.map((p,i)=>edgeDistance(p,hull[(i+1)%hull.length],landed.x,landed.z)))<1e-8);
    Game.pause(state,'qa');const phase=effect.native.time;Game.tick(state,20,nav);g.manager.update(state);assert.equal(effect.native.time,phase);Game.resume(state,'qa');
    g.dispose();state=deserialize(serialize(state));g=graphics();g.manager.update(state);assert.ok(Math.abs(g.manager.effects.get(animal.attackId).native.time-phase)<1e-8);
    Game.tick(state,duration/2+.01,nav);g.manager.update(state);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,1);assert.equal(state.raid.animals[0].hitsRemaining,0);assert.ok(state.structures[0].hp<hp);
    effect=g.manager.effects.get(animal.attackId);assert.equal(effect.native.contacts.length,species==='lion'?3:1);assert.ok(effect.native.contacts.every(c=>c.preview&&c.structuralDamage==='external'));
    const hitState=serialize(state),atHit=effect.native.time;g.manager.update(state);assert.equal(serialize(state),hitState);assert.equal(effect.native.time,atHit);assert.equal(effect.native.contacts.length,species==='lion'?3:1);
    // Reload after impact: the persisted fact restores the same dissipating phase.
    g.dispose();state=deserialize(hitState);g=graphics();g.manager.update(state);assert.ok(Math.abs(g.manager.effects.get(animal.attackId).native.time-atHit)<1e-8);
    Game.tick(state,6,nav);g.manager.update(state);assert.equal(g.manager.effects.size,0);assert.equal(g.library.instances.size,0);assert.equal(g.scene.children.length,0);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,1);g.dispose();
  }
});

test('Shield hit metadata places the contact on its actual edge and survives shield expiry and raid removal',()=>{
  const {state,animal,target,duration}=fixture('rhino','Weapon_Combo');state.spells.push({id:'shield',kind:'shield',x:12,z:8,radius:4,remaining:20});
  let plan=attackVfxPlans(state)[0];assert.equal(plan.contact.z,12);
  Game.tick(state,duration+.01,nav);const event=state.events.find(e=>e.type==='AnimalLogicalHit');assert.equal(target.hp,600);assert.equal(animal.hitsRemaining,0);assert.equal(event.presentation.shield.id,'shield');
  state.spells=[];state.raid=null;plan=attackVfxPlans(state)[0];assert.equal(plan.blocked,true);assert.equal(plan.contact.x,12);assert.equal(plan.contact.z,12);
  const loaded=deserialize(serialize(state));assert.deepEqual(attackVfxPlans(loaded),attackVfxPlans(state));
});

test('Invalidated targets and exhausted attacks release visuals without inventing a completed impact',()=>{
  for(const invalidation of ['ruined','budget']){
    const {state,animal,target,duration}=fixture('lion','Weapon_Combo_2'),g=graphics();g.manager.update(state);assert.equal(g.manager.effects.size,1);
    if(invalidation==='ruined'){target.status='ruined';target.hp=0;}else animal.hitsRemaining=0;
    g.manager.update(state);assert.equal(g.manager.effects.size,0);Game.tick(state,duration+.1,nav);g.manager.update(state);assert.equal(g.manager.effects.size,0);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,0);g.dispose();
  }
});

test('Different attack IDs coexist through dissipating tails; legacy/malformed metadata cannot replay damage',()=>{
  const {state,animal,duration}=fixture('hyena','Right_Hand_Sword_Slash');Game.tick(state,duration+.01,nav);
  const first=state.events.find(e=>e.type==='AnimalLogicalHit');animal.attackId='second';animal.status='attacking';animal.attackRemaining=duration;animal.hitApplied=false;animal.hitsRemaining=1;
  assert.equal(attackVfxPlans(state).length,2);
  state.events.push({...first,id:'legacy',attackId:'legacy',presentation:undefined},{...first,id:'bad',attackId:'bad',presentation:{elapsed:NaN}});assert.equal(attackVfxPlans(state).length,2);
  state.elapsed=first.presentation.elapsed+10;assert.equal(attackVfxPlans(state).length,1);
});

test('Legacy center hit facts recover native culture and yaw from the retained structure without changing damage',()=>{
 for(const culture of Game.CULTURES){
  const {state,target,duration}=fixture('hyena','Right_Hand_Sword_Slash',culture);target.yaw=.73;
  Game.tick(state,duration+.01,nav);const event=state.events.find(e=>e.type==='AnimalLogicalHit');
  assert.equal(event.presentation.target.culture,culture);assert.equal(event.presentation.target.yaw,.73);
  const expected=attackVfxPlans(state)[0];assert.ok(expected);
  delete event.presentation.target.culture;delete event.presentation.target.yaw;
  const before=serialize(state);assert.deepEqual(attackVfxPlans(state)[0],expected);assert.equal(serialize(state),before);
  assert.deepEqual(attackVfxPlans(deserialize(before))[0],expected);assert.equal(target.hp,550);
 }
});
