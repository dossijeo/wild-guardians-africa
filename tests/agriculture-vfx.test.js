import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {AgricultureVfx} from '../src/rendering/agriculture-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url)));
const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function graphics(){const pipeline=new BuildingDestructionPass({shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)}),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048})),scene=new THREE.Scene(),manager=new AgricultureVfx(library,pipeline,scene,(x,z)=>x*.04+z*.03);return {manager,library,scene,dispose(){manager.dispose();library.dispose();pipeline.dispose();}};}
for(const [kind,duration,cooldown] of [['growth',30,90],['multiply',15,120]])test(`${kind}: native blessing lasts its approved simulated duration without hearts, extra gameplay or lost reload phase`,()=>{
 let s=Game.newGame({slotId:'farm-magic',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);Game.plant(s,'seed','mijo',6,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.day=5;s.initialPreparation=false;Game.cast(s,'cast',kind,6,0,nav);
 let g=graphics();const id=s.spells[0].id;
 for(const dt of [1,3,6,duration-11]){
  Game.tick(s,dt,nav);const before=serialize(s);g.manager.update(s);assert.equal(serialize(s),before);
  const effect=g.manager.effects.get(id);assert.ok(Math.abs(effect.native.time-(duration-s.spells[0].remaining))<1e-8);assert.equal(effect.scale.y,1);assert.equal(effect.scale.x,Game.spellRadius(kind)/.79);
  assert.ok(effect.native.geometry().length>0);assert.ok(effect.native.sprites().length>0);assert.equal(effect.native.contacts.length,0);assert.ok(effect.native.parts.every(p=>p.tex!=='heart'));
  const geometry=effect.native.geometry();for(let i=0;i<geometry.length;i+=11)if(geometry[i+10]===0)assert.ok(Math.abs(geometry[i+1]-(.025+effect.localSurface(geometry[i],geometry[i+2])))<1e-6);
 }
 const oldTime=g.manager.effects.get(id).native.time;Game.pause(s,'qa');Game.tick(s,100,nav);g.manager.update(s);assert.equal(g.manager.effects.get(id).native.time,oldTime);Game.resume(s,'qa');
 g.dispose();s=deserialize(serialize(s));g=graphics();g.manager.update(s);assert.ok(Math.abs(g.manager.effects.get(id).native.time-oldTime)<1e-8);assert.ok(g.manager.effects.get(id).native.geometry().length>0);
 Game.tick(s,1,nav);g.manager.update(s);assert.equal(s.spells.length,0);assert.equal(g.manager.effects.size,0);assert.equal(g.library.instances.size,0);assert.equal(g.scene.children.length,0);assert.ok(Math.abs(s.cooldowns[kind]-(cooldown-duration))<1e-8);g.dispose();
});
