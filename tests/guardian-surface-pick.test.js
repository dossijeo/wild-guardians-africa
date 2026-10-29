import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,PerspectiveCamera,Raycaster,Vector2,Vector3} from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import * as Game from '../src/simulation/game.js';
import {castPickedSpell} from '../src/app/spell-placement.js';
import {actorGeometry} from './helpers/actor-geometry.js';

for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species}: installed skin ray contact reaches Attack and its presentation unchanged`,async()=>{
 const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}],field:{surface:()=>0}};
 const state=Game.newGame({seed:712,slotId:'surface-pick'});Game.resume(state,'intro');Game.placeStructure(state,'center',{x:12,z:8},nav);state.day=5;state.time=400;state.initialPreparation=false;state.elapsed=10;
 const animal={id:'surface-beast',species,x:17,z:8,radius:.7,status:'walking',hitsRemaining:4,spawn:{x:30,z:0}};state.raid={animals:[animal],reservations:{}};
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 const root=new Group();root.userData.entityId=animal.id;root.position.set(animal.x,0,animal.z);root.add(model);root.updateMatrixWorld(true);
 const box=new Box3().setFromObject(root),center=box.getCenter(new Vector3()),extent=box.getSize(new Vector3()).length();
 const camera=new PerspectiveCamera(45,1,.01,1000);camera.position.copy(center).add(new Vector3(1,.3,1).normalize().multiplyScalar(extent*2));camera.lookAt(center);camera.updateMatrixWorld(true);
 const world=Object.assign(Object.create(WorldScene.prototype),{camera,controls:{target:center},nav:{},state,canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1000,height:1000})},cursor:new Vector2(),raycaster:new Raycaster(),objects:new Map([[animal.id,root]]),terrainMeshes:[]});
 let picked;
 for(const [x,y] of [[500,500],[480,500],[520,500],[500,450],[500,550]]){const p=world.pick({clientX:x,clientY:y});if(p.entityId===animal.id){picked=p;break;}}
 assert.ok(picked?.hitPoint,'A real mesh surface must be hit');assert.equal(picked.point,null,'No terrain hit is needed to select a beast');
 const contact={...picked.hitPoint};assert.ok(new Vector3(contact.x,contact.y,contact.z).distanceTo(root.position)>.01);
 castPickedSpell(state,'surface-hit','attack',{...picked,origin:{x:camera.position.x,y:camera.position.y,z:camera.position.z}},nav);
 assert.deepEqual(animal.magicImpact.point,contact);
 assert.deepEqual(state.events.findLast(e=>e.type==='SpellActivated').presentation.contact,contact);
 const hit=state.events.findLast(e=>e.type==='GuardianMagicHit').presentation;assert.deepEqual({x:hit.x,y:hit.y,z:hit.z},contact);
 model.traverse(o=>{o.geometry?.dispose();for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[])material.dispose();});
});
