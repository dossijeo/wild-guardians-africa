import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {geometryOnly,measureFootsteps} from '../tools/calibrate_footsteps.mjs';
import {prepareAnimalClips} from '../src/rendering/animal-actions.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
import {LocomotionVfx,movingPose,crossedFootsteps} from '../src/rendering/locomotion-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url))),nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function graphics(){const pipeline=new BuildingDestructionPass({shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)}),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048})),scene=new THREE.Scene(),manager=new LocomotionVfx(library,pipeline,scene,()=>0);return {manager,library,scene,dispose(){manager.dispose();library.dispose();pipeline.dispose();}};}
function ready(){const s=Game.newGame({slotId:'dust',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',18,8,nav);Game.openInitialHiring(s);return s;}
for(const [id,source] of Object.entries(FOOTSTEPS.sources))test(`${id}: foot contacts reproduce original native toe trajectories and clip cycles`,async()=>{
 const bytes=fs.readFileSync(new URL('../public'+source.url,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
 const gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),''),clips=id.endsWith('Male')||id.endsWith('Female')?gltf.animations:prepareAnimalClips(gltf.animations);
 for(const [name,measured] of Object.entries(source.clips)){
  assert.deepEqual(measureFootsteps(gltf.scene,clips.find(c=>c.name===name)),measured);
  for(const foot of ['Left','Right'])assert.ok(measured.contacts.some(c=>c.foot===foot));
  const crossings=crossedFootsteps(measured,.01,measured.duration*10+.01);assert.equal(crossings.length,measured.contacts.length*10);
  assert.equal(new Set(crossings.map(c=>c.cycle+'/'+c.index)).size,crossings.length);assert.deepEqual(crossedFootsteps(measured,1,1),[]);
 }
});
test('Paid walking emits only measured single-step dust, freezes on pause and does not invent a trail after reload or a long jump',()=>{
 let s=ready();Game.hire(s,'hire',{olderMale:1});let g=graphics();g.manager.update(s);assert.equal(g.manager.effects.size,0);
 let total=0;
 for(let i=0;i<80;i++){
  Game.tick(s,.05,nav);const before=serialize(s);g.manager.update(s);assert.equal(serialize(s),before);total+=g.manager.effects.size;
  for(const effect of g.manager.effects.values()){assert.ok(effect.native.parts.length<=4);assert.ok(effect.native.rigids.length<=4);if(effect.native.time<1.2)assert.equal(effect.native.rigids.length,4);assert.equal(effect.native.contacts.length,0);assert.ok(effect.native.lights.colors.every(c=>c.every(v=>v===0)));}
 }
 assert.ok(total>0);Game.pause(s,'qa');const phases=[...g.manager.effects.values()].map(e=>e.native.time);Game.tick(s,10,nav);g.manager.update(s);assert.deepEqual([...g.manager.effects.values()].map(e=>e.native.time),phases);Game.resume(s,'qa');
 Game.tick(s,2,nav);g.manager.update(s);assert.equal(g.manager.effects.size,0);
 g.dispose();s=deserialize(serialize(s));g=graphics();g.manager.update(s);assert.equal(g.manager.effects.size,0);
 for(let i=0;i<30;i++){Game.tick(s,.05,nav);g.manager.update(s);}assert.ok(g.manager.effects.size>0);
 g.dispose();assert.equal(g.library.instances.size,0);assert.equal(g.scene.children.length,0);
});
test('Waiting, falling, incapacitation, stationary animation and backwards time cannot generate footsteps',()=>{
 const base={id:'worker',profile:'olderMale',x:0,z:0,status:'walking',walkPhase:0};
 for(const changes of [{gateWaiting:true},{fallRemaining:1},{incapacitated:true},{status:'home'},{status:'acting'}])assert.equal(movingPose({...base,...changes}),null);
 const g=graphics(),s={elapsed:0,time:0,workers:[base],raid:null};g.manager.update(s);base.walkPhase=3;s.elapsed=.1;g.manager.update(s);assert.equal(g.manager.effects.size,0);
 base.x=.1;base.walkPhase=4;s.elapsed=.2;g.manager.update(s);assert.ok(g.manager.effects.size>0);s.elapsed=0;g.manager.update(s);assert.equal(g.manager.effects.size,0);g.dispose();
});
for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(`${species}: real animal movement phases drive native dust independently of combat budgets`,()=>{
 const s=ready();Game.hire(s,'hire',{});s.day=30;s.time=320;spawnRaid(s,{group:[species]},nav);const g=graphics();g.manager.update(s);let seen=false;
 for(let i=0;i<30;i++){Game.tick(s,.05,nav);const before=serialize(s);g.manager.update(s);assert.equal(serialize(s),before);seen||=g.manager.effects.size>0;}
 assert.ok(seen);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,0);g.dispose();
});
