import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {MaterialVfx,materialVfxPlans,wallImpactContact} from '../src/rendering/material-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url))),nav=clearNavigation();
function fixture(material,gate=false){
 const s=Game.newGame({slotId:'material',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:6,z:4,yaw:Math.PI/3},nav);s.initialPreparation=false;s.day=2;s.time=320;
 const wall=s.structures[1],duration=ANIMAL_ACTIONS.animals.warthog.clips.Right_Hand_Sword_Slash.duration;
 s.raid={id:'raid',encounters:[],reservations:{['structure:'+wall.id]:'animal'},animals:[{id:'animal',species:'warthog',x:6,z:8,radius:1.1,spawn:{x:6,z:20},hitsRemaining:1,status:'attacking',targetId:wall.id,reservation:'structure:'+wall.id,animation:'Right_Hand_Sword_Slash',attackId:'attack',attackDuration:duration,attackRemaining:duration,hitApplied:false}]};
 return {s,wall,duration};
}
function graphics(){const pipeline=new BuildingDestructionPass({shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)}),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048})),scene=new THREE.Scene(),manager=new MaterialVfx(library,pipeline,scene,(x,z)=>.04*x+.02*z);return {manager,library,scene,dispose(){manager.dispose();library.dispose();pipeline.dispose();}};}
test('Five wall materials and gates produce one native debris composition only after a real unshielded hit, with pause and reload',()=>{
 for(const [material,id] of Object.entries({zarzas:'wood',empalizada:'wood',reforzado:'wood',adobe:'adobe',piedra:'stone'}))for(const gate of [false,true]){
  let {s,wall,duration}=fixture(material,gate),g=graphics();g.manager.update(s);assert.equal(g.manager.effects.size,0);const hp=wall.hp;
  Game.tick(s,duration/2,nav);g.manager.update(s);assert.equal(wall.hp,hp);assert.equal(g.manager.effects.size,0);
  Game.tick(s,duration/2,nav);const before=serialize(s);g.manager.update(s);assert.equal(serialize(s),before);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);assert.equal(s.raid.animals[0].hitsRemaining,0);assert.equal(wall.hp,Math.max(0,hp-20));
  const plan=materialVfxPlans(s)[0],effect=g.manager.effects.get('attack');assert.equal(effect.native.definition.id,id);assert.ok(effect.native.rigids.length>=13);assert.ok(effect.native.rigids.every(r=>r.kind===id));assert.equal(effect.native.contacts.length,0);
  effect.updateMatrixWorld(true);const p=new THREE.Vector3(.05,.98,.33).applyMatrix4(effect.matrixWorld);assert.ok(Math.hypot(p.x-plan.contact.x,p.z-plan.contact.z)<1e-8);assert.ok(Math.abs(p.y-(.98+.04*p.x+.02*p.z))<1e-8);
  Game.pause(s,'qa');Game.tick(s,10,nav);g.manager.update(s);assert.equal(effect.native.time,.42);Game.resume(s,'qa');
  g.dispose();s=deserialize(before);g=graphics();g.manager.update(s);assert.equal(g.manager.effects.get('attack').native.rigids.length,id==='wood'?14:13);
  Game.tick(s,4,nav);g.manager.update(s);assert.equal(g.manager.effects.size,0);assert.equal(g.library.instances.size,0);assert.equal(g.scene.children.length,0);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);g.dispose();
 }
});
test('Shield blocks, crop hits, centre hits and legacy/malformed facts cannot create material damage particles',()=>{
 const {s,wall,duration}=fixture('piedra');s.spells.push({id:'shield',kind:'shield',x:wall.x,z:wall.z,radius:4,remaining:20});Game.tick(s,duration,nav);assert.equal(materialVfxPlans(s).length,0);
 const valid=s.events.find(e=>e.type==='AnimalLogicalHit');
 for(const change of [{presentation:undefined},{presentation:{...valid.presentation,shield:null,target:{x:6,z:4,kind:'center',material:'adobe'}}},{presentation:{...valid.presentation,shield:null,target:{x:6,z:4,kind:'wall',material:'piedra',yaw:NaN}}}]){s.events=[{...valid,...change}];assert.deepEqual(materialVfxPlans(s),[]);}
});
test('Contacts use the oriented outer face of shortened walls and scaled gates, including corner approaches',()=>{
 for(const yaw of [0,Math.PI/3,Math.PI/2])for(const baseScaleX of [.4,1])for(const gate of [false,true]){
  const wall={x:3,z:8,yaw,baseScaleX,material:'reforzado',gate},scale=gate?1.6:1;
  for(const [x,z] of [[0,5],[5,0],[5,5]]){const animal={x:wall.x+Math.cos(yaw)*x+Math.sin(yaw)*z,z:wall.z-Math.sin(yaw)*x+Math.cos(yaw)*z},p=wallImpactContact(wall,animal),dx=p.x-wall.x,dz=p.z-wall.z,lx=Math.cos(yaw)*dx-Math.sin(yaw)*dz,lz=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
   assert.ok(Math.abs(lx)<=1.09*baseScaleX*scale+1e-8);assert.ok(Math.abs(lz)<=.22*scale+1e-8);assert.ok(Math.abs(Math.abs(lx)-1.09*baseScaleX*scale)<1e-8||Math.abs(Math.abs(lz)-.22*scale)<1e-8);
  }
 }
});
