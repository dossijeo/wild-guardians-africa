import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {raidGroupFrame} from '../src/rendering/raid-group-framing.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {RaidCameraDirector} from '../src/rendering/raid-camera.js';
import {focusTerrainCamera} from '../src/rendering/terrain-camera.js';
const field={surface:()=>0},travel={theta:.5,phi:1.16};
for(const count of [4,10,16])test(`${count} approaching beasts fit the group framing with HUD margins`,()=>{
 const camera=new PerspectiveCamera(42,16/9,.1,500),species=['warthog','hyena','buffalo','lion','rhino'];
 const animals=Array.from({length:count},(_,i)=>({id:String(i),species:species[i%5],status:'entering',x:50+(i%4-1.5)*3,z:50+(Math.floor(i/4)-1.5)*3,radius:1}));
 const before=JSON.stringify(animals),frame=raidGroupFrame(animals,field,camera,travel),pose=nativeCameraPose(field,[frame.x,0,frame.z],travel.theta,travel.phi,frame.distance);
 camera.position.fromArray(pose.eye);camera.lookAt(new Vector3().fromArray(pose.target));camera.updateMatrixWorld(true);
 for(const a of animals)for(let corner=0;corner<8;corner++){
  const p=new Vector3(a.x+(corner&1?1:-1),corner&4?ANIMAL_ACTIONS.animals[a.species].presentation.bindHeight:0,a.z+(corner&2?1:-1)).project(camera);
  assert(p.x>=-.90001&&p.x<=.60001,`Horizontal crop ${p.x}`);assert(p.y>=-.55001&&p.y<=.72001,`Vertical crop ${p.y}`);
 }
 assert.equal(JSON.stringify(animals),before);
 const narrower=raidGroupFrame(animals.slice(0,2),field,camera,{...travel,groupDistance:frame.distance});assert(narrower.distance>=frame.distance);
});
test('single or departed animals retain the existing individual camera path',()=>{
 const camera=new PerspectiveCamera(42,16/9,.1,500);
 assert.equal(raidGroupFrame([{x:0,z:0,status:'walking'},{x:5,z:0,status:'gone'}],field,camera,travel),null);
});
test('group arrival frames all visitors once and releases control on manual input',()=>{
 const camera=new PerspectiveCamera(42,16/9,.1,500),controls={target:new Vector3(),update(){}};
 focusTerrainCamera(camera,controls,field,{x:0,z:0});
 const animals=Array.from({length:4},(_,i)=>({id:String(i),species:'warthog',status:'entering',x:40+i*4,z:40,radius:1}));
 const state={raid:{id:'group',animals},pauses:[],plants:[],structures:[{status:'intact',x:0,z:0}]},director=new RaidCameraDirector(camera,controls,field);
 const saved=JSON.stringify(animals);director.update(state,2);
 assert.equal(state.raid.cameraFocusedAnimalId,'0');assert(director.travel.groupDistance>=18);
 assert.notEqual(controls.target.x,animals[0].x);assert.equal(JSON.stringify(animals),saved);
 director.beginManual();controls.target.set(80,0,70);director.endManual();director.update(state,2);
 assert.equal(director.travel,null);assert.equal(controls.target.x,80);assert.equal(controls.target.z,70);
});
