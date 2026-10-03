import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {ShieldVfx,shieldVfxPlans} from '../src/rendering/shield-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {createNativeVfx,createVfxAtlasRects} from '../src/rendering/vfx-native.js';
import {ANIMAL_ACTIONS as A} from '../src/simulation/animal-actions-data.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url))),rects=createVfxAtlasRects(catalog,4096,2048);
const nav={version:1,placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function stateFixture(){const s=Game.newGame({slotId:'shield-vfx',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);s.day=2;s.time=320;s.initialPreparation=false;s.nightPlan={at:320,done:true,group:[]};Game.cast(s,'cast','shield',12,8,nav);return s;}
function graphics(){const pipeline=new BuildingDestructionPass({shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)}),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048})),scene=new THREE.Scene(),manager=new ShieldVfx(library,pipeline,scene,()=>0);return {pipeline,library,scene,manager,dispose(){manager.dispose();library.dispose();pipeline.dispose();}};}

test('The original dome lasts twenty simulated seconds at its actual radius, without the timed demonstration impact',()=>{
  let state=stateFixture(),g=graphics();g.manager.update(state);const id=state.spells[0].id;
  for(const dt of [1,1,4,6,7]){Game.tick(state,dt,nav);const before=serialize(state);g.manager.update(state);assert.equal(serialize(state),before);const effect=g.manager.effects.get(id);assert.equal(effect.native.contacts.length,0);assert.ok(effect.native.geometry().length>0);assert.equal(effect.scale.x,1.95/1.65);assert.ok(Math.abs(effect.native.time-state.elapsed)<1e-8);}
  assert.ok(Math.abs(state.spells[0].remaining-1)<1e-8);assert.ok(Math.abs(state.cooldowns.shield-71)<1e-8);
  Game.pause(state,'qa');const time=g.manager.effects.get(id).native.time;Game.tick(state,20,nav);g.manager.update(state);assert.equal(g.manager.effects.get(id).native.time,time);assert.ok(Math.abs(state.spells[0].remaining-1)<1e-8);Game.resume(state,'qa');
  g.dispose();state=deserialize(serialize(state));g=graphics();g.manager.update(state);assert.ok(Math.abs(g.manager.effects.get(id).native.time-time)<1e-8);
  Game.tick(state,1,nav);g.manager.update(state);assert.equal(state.spells.length,0);assert.ok(Math.abs(state.cooldowns.shield-70)<1e-8);assert.equal(g.manager.effects.size,0);assert.equal(g.library.instances.size,0);assert.equal(g.scene.children.length,0);g.dispose();
});

test('Every species triggers one original block from a confirmed hit, on the 3D dome, with pause and reload',()=>{
  for(const species of Object.keys(A.animals)){
    let state=stateFixture(),g=graphics();const duration=A.animals[species].clips.Right_Hand_Sword_Slash.duration,target=state.structures[0];
    const animal={id:'animal',species,x:12,z:11,heading:Math.PI,radius:.45,spawn:{x:12,z:20},status:'attacking',targetId:target.id,reservation:'structure:'+target.id,hitsRemaining:1,animation:'Right_Hand_Sword_Slash',attackId:'attack',attackDuration:duration,attackRemaining:duration,hitApplied:false};
    state.raid={id:'raid',animals:[animal],encounters:[],reservations:{[animal.reservation]:animal.id}};
    Game.tick(state,duration-.1,nav);g.manager.update(state);assert.equal(g.manager.effects.size,1);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,0);
    Game.tick(state,.11,nav);const before=serialize(state);g.manager.update(state);assert.equal(serialize(state),before);assert.equal(target.hp,600);assert.equal(animal.hitsRemaining,0);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,1);assert.equal(g.manager.effects.size,2);
    const plan=shieldVfxPlans(state).find(p=>p.mode==='contact'),effect=g.manager.effects.get(plan.key);assert.equal(effect.native.contacts.length,1);assert.equal(effect.native.contacts[0].tag,'shield-block');assert.equal(effect.native.contacts[0].structuralDamage,'external');
    effect.updateWorldMatrix(true,false);const p=new THREE.Vector3(-1.5,.86,0).applyMatrix4(effect.matrixWorld),r=1.95;assert.ok(Math.abs((p.x-12)**2/r**2+(p.z-8)**2/r**2+p.y**2/(1.2*r)**2-1)<1e-8);
    const geometry=effect.native.geometry();for(let i=10;i<geometry.length;i+=11)assert.notEqual(geometry[i],2,'A block must not create another dome');
    Game.pause(state,'qa');const phase=effect.native.time;Game.tick(state,3,nav);g.manager.update(state);assert.equal(effect.native.time,phase);
    g.dispose();state=deserialize(serialize(state));g=graphics();g.manager.update(state);assert.ok(Math.abs(g.manager.effects.get(plan.key).native.time-phase)<1e-8);Game.resume(state,'qa');
    Game.tick(state,1,nav);g.manager.update(state);assert.equal(g.manager.effects.size,1);assert.equal(state.structures[0].hp,600);assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit').length,1);g.dispose();
  }
});

test('Production shield mesh follows the world floor and has no incoming demonstration bolt',()=>{
  const surface=(x,z)=>.1*x+.03*z,fx=createNativeVfx('shield',rects,{shieldMode:'barrier',surface});fx.seek(8);
  const geometry=fx.geometry();let vertices=0;
  for(let i=0;i<geometry.length;i+=11)if(geometry[i+10]===2){const x=geometry[i],y=geometry[i+1],z=geometry[i+2];assert.ok(y>=surface(x,z)+.039-1e-6);assert.ok(Math.hypot(x,z)<=1.650001);vertices++;}
  assert.equal(vertices,48*17*6);assert.equal(fx.contacts.length,0);assert.ok(!fx.sprites().some(p=>p.tex==='trail'));
  const contact=createNativeVfx('shield',rects,{shieldMode:'contact'});contact.seek(.1);assert.equal(contact.contacts.length,1);assert.ok(!contact.sprites().some(p=>p.tex==='trail'));assert.throws(()=>createNativeVfx('shield',rects,{shieldMode:'unknown'}),/Escudo/);
});


test('QA-115: Shield crosses sunset on the real clock without changing crop growth, and night recast remains permitted',()=>{
  let state=Game.newGame({slotId:'shield-sunset',seed:712});Game.resume(state,'intro');Game.placeStructure(state,'center',{x:12,z:8},nav);Game.plant(state,'seed','mijo',18,8,nav);Game.openInitialHiring(state);Game.hire(state,'hire',{olderMale:1});
  state.day=3;state.time=299;state.dayPlan={done:true};state.nightPlan={done:true,group:[]};state.tutorial.step='done';Game.cast(state,'shield','shield',18,8,nav);
  const control=deserialize(serialize(state));control.spells=[];control.cooldowns.shield=0;
  let g=graphics();const id=state.spells[0].id;
  try {
    Game.advanceReal(state,1.2,nav);Game.advanceReal(control,1.2,nav);
    assert.ok(Math.abs(state.time-301)<1e-7);assert.deepEqual(state.plants,control.plants);
    const before=serialize(state);g.manager.update(state);assert.equal(serialize(state),before);assert.ok(Math.abs(g.manager.effects.get(id).native.time-2)<1e-7);
    Game.pause(state,'menu');const paused=serialize(state);Game.advanceReal(state,100,nav);g.manager.update(state);assert.equal(serialize(state),paused);
    g.dispose();state=deserialize(serialize(state));g=graphics();g.manager.update(state);assert.ok(Math.abs(g.manager.effects.get(id).native.time-2)<1e-7);Game.resume(state,'menu');
    Game.advanceReal(state,18/5,nav);Game.advanceReal(control,18/5,nav);g.manager.update(state);assert.equal(state.spells.length,0);assert.equal(g.manager.effects.size,0);assert.deepEqual(state.plants,control.plants);assert.ok(Math.abs(state.cooldowns.shield-70)<1e-7);
    Game.advanceReal(state,70/5,nav);assert.ok(state.time>=300);assert.equal(state.cooldowns.shield,0);Game.cast(state,'night-shield','shield',18,8,nav);assert.equal(state.spells[0].remaining,20);
  }finally{g.dispose();}
});
