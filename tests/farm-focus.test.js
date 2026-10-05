import test from 'node:test';
import assert from 'node:assert/strict';
import {farmHomeFocus} from '../src/rendering/farm-focus.js';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {TerrainField} from '../src/world/terrain.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const center=(id,x,z)=>({id,x,z,kind:'center',hp:800,status:'intact',created:0});
test('resume uses the HUD home destination, without a separate crop centroid or orientation',()=>{
 const s={villages:[{x:0,z:0},{x:80,z:0}],structures:[center('far',80,0),center('near',8,0)],plants:[{alive:true,centerId:'near',x:12,z:3},{alive:true,centerId:'near',x:16,z:7},{alive:true,centerId:'far',x:100,z:50},{alive:false,centerId:'near',x:1000,z:1000}]};
 const before=JSON.stringify(s);assert.equal(farmHomeFocus(s),s.structures[0]);assert.equal(JSON.stringify(s),before);
});
test('home skips ruined centres and walls; without a centre it returns to the first village',()=>{
 const s={villages:[{x:0,z:0}],structures:[{...center('ruined',1,0),hp:0,status:'ruined'},center('live',8,0)],plants:[]};
 s.structures.unshift({kind:'wall',status:'intact',x:1,z:1});assert.equal(farmHomeFocus(s),s.structures[2]);s.structures=[];assert.equal(farmHomeFocus(s),s.villages[0]);
});
test('home restores exactly the same camera pose after panning, zooming and an active raid in every biome',()=>{
 for(const biome of Object.values(BIOME_IDS)){
  const field=new TerrainField({seed:'712',biome,relief:1,river:true}),state={villages:[{x:0,z:0}],structures:[center('main',8,6)],plants:[{alive:true,centerId:'main',x:45,z:30}]},before=JSON.stringify(state);
  const world=Object.create(WorldScene.prototype);world.state=state;world.nav={field};world.camera=new THREE.PerspectiveCamera();let cancelled=0;
  world.controls={target:new THREE.Vector3(),enableDamping:true,update(){assert.equal(this.enableDamping,false);this.target.x+=17;world.camera.position.x+=17;}};world.raidCamera={cancel:()=>cancelled++};
  world.focusFarm();const eye=world.camera.position.toArray(),target=world.controls.target.toArray(),expected=nativeCameraPose(field,[8,0,6],field.canyon?0:.5,field.canyon?1.18:1.16,field.canyon?34:38);
  assert.deepEqual(eye,expected.eye);assert.deepEqual(target,expected.target);
  world.camera.position.set(-240,50,170);world.controls.target.set(-220,0,190);world.focusFarm();
  assert.deepEqual(world.camera.position.toArray(),eye);assert.deepEqual(world.controls.target.toArray(),target);assert.equal(cancelled,2);assert.equal(world.controls.enableDamping,true);assert.equal(JSON.stringify(state),before);
 }
});
test('walls allow building-edge intersections and partial fluid contact, but reject fully enclosed or submerged pieces',()=>{
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>true,waterInfo:()=>({inside:false}),slope:()=>2,surface:()=>0};nav.propsAt=()=>[];
 nav.obstacles=[{kind:'house',footprint:[{x:-3,z:-3},{x:3,z:-3},{x:3,z:3},{x:-3,z:3}]}];
 const wall={kind:'wall',x:0,z:0,yaw:0,material:'zarzas'};
 assert.equal(nav.wallPlacement(wall).valid,false);
 assert.equal(nav.wallPlacement({...wall,x:3}).valid,true);
 assert.equal(nav.wallPlacement({...wall,x:10}).valid,true);
 assert.equal(nav.placement(10,0,.4).valid,false);
 for(const yaw of [0,.5,Math.PI/2])assert.equal(nav.wallPlacement({...wall,yaw}).valid,false);
 nav.field.waterInfo=x=>({inside:x>10});assert.equal(nav.wallPlacement({...wall,x:10}).valid,true);assert.equal(nav.wallPlacement({...wall,x:14}).valid,false);
});
