import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RaidCameraDirector} from '../src/rendering/raid-camera.js';
import {focusTerrainCamera,updateTerrainCamera,TERRAIN_CAMERA} from '../src/rendering/terrain-camera.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
function fixture(field={surface:()=>0}){
 const camera=new THREE.PerspectiveCamera(42,1,.1,500),controls={target:new THREE.Vector3(),enableDamping:true,update(){}};
 focusTerrainCamera(camera,controls,field,{x:100,z:100});
 const state=Game.newGame({slotId:'camera-trip'});state.pauses=[];state.structures=[{id:'center',kind:'center',x:0,z:0,status:'intact'}];
 state.raid={id:'raid-1',animals:[{id:'animal-1',x:50,z:50,status:'entering',species:'warthog',radius:1.1}],reservations:{}};
 const director=new RaidCameraDirector(camera,controls,field);return {state,camera,controls,director,field};
}
test('travel waits for farm entry, then smoothly follows the moving animal once per incursion',()=>{
 const {state,controls,camera,director}=fixture(),a=state.raid.animals[0];director.update(state,.1);assert.equal(controls.target.x,100);assert.equal(director.travel,null);
 a.x=12;a.z=0;director.update(state,.1);assert.ok(controls.target.x<100&&controls.target.x>12);assert.equal(state.raid.cameraFocusedAnimalId,a.id);
 for(let i=0;i<11;i++){a.x-=.1;updateTerrainCamera(camera,controls,director.field);director.update(state,.1);}
 assert.ok(Math.abs(controls.target.x-a.x)<1e-8);assert.ok(Math.abs(controls.target.z-a.z)<1e-8);assert.equal(director.travel,null);
 const before=controls.target.clone();a.x=40;director.update(state,10);assert.deepEqual(controls.target,before,'camera does not chase after the arrival trip');
 state.raid={id:'raid-2',animals:[{...a,id:'animal-2',x:0,status:'walking'}],reservations:{}};director.update(state,.1);assert.ok(director.travel);
});
test('manual camera input cancels a trip without snapping or restarting, and holds off an unstarted trip',()=>{
 const {state,controls,director}=fixture(),a=state.raid.animals[0];director.beginManual();a.x=0;a.z=0;director.update(state,2);assert.equal(controls.target.x,100);assert.equal(state.raid.cameraFocusedAnimalId,undefined);
 director.endManual();director.update(state,.1);assert.ok(director.travel);director.beginManual();controls.target.set(80,0,70);director.endManual();director.update(state,5);
 assert.equal(director.travel,null);assert.equal(controls.target.x,80);assert.equal(controls.target.z,70);
});
test('menu and hidden pauses hold the trip, while tutorial action pauses permit the visual arrival',()=>{
 const {state,controls,director}=fixture();state.raid.animals[0].x=0;state.raid.animals[0].z=0;state.pauses=['menu'];director.update(state,10);assert.equal(controls.target.x,100);
 state.pauses=['tutorial-action'];director.update(state,.3);const before=controls.target.clone(),age=director.travel.age;
 state.pauses=['hidden'];director.update(state,10);assert.equal(director.travel.age,age);assert.deepEqual(controls.target,before);
});
test('a departing animal or ended raid stops the trip; saved focus does not replay on reload',()=>{
 const {state,camera,controls,director,field}=fixture();state.raid.animals[0].status='walking';director.update(state,.1);
 const restored=deserialize(serialize(state)),fresh=new RaidCameraDirector(camera,controls,field),before=controls.target.clone();fresh.update(restored,2);assert.equal(fresh.travel,null);assert.deepEqual(controls.target,before);
 state.raid.animals[0].status='retreating';director.update(state,.1);assert.equal(director.travel,null);state.raid=null;director.update(state,.1);assert.equal(director.raidId,null);
});
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: travel to an arrival preserves terrain clearance and centres the actual animal`,()=>{
 const {s,nav}=createOpeningWorld({biome}),c=s.structures[0],{camera,controls,director}=fixture(nav.field);
 s.raid={id:'arrival-'+biome,animals:[{id:'a',x:c.x+5,z:c.z,status:'walking'}]};
 for(let i=0;i<12;i++){
  updateTerrainCamera(camera,controls,nav.field);director.update(s,.1);
  const clearance=camera.position.y-nav.field.surface(camera.position.x,camera.position.z);
  assert.ok(clearance>=TERRAIN_CAMERA.minClearance-1e-8&&clearance<=TERRAIN_CAMERA.maxClearance+1e-8);
 }
 assert.ok(Math.abs(controls.target.x-s.raid.animals[0].x)<1e-8);assert.ok(Math.abs(controls.target.z-s.raid.animals[0].z)<1e-8);
});
