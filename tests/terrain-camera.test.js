import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TerrainField} from '../src/world/terrain.js';
import {nativeGroundGeometry} from '../src/rendering/terrain-geometry.js';
import {nativeCameraPose,protectTerrainCamera,updateTerrainCamera,focusTerrainCamera,configureTerrainControls,installTerrainCameraIntent} from '../src/rendering/terrain-camera.js';
import {WorldScene} from '../src/rendering/scene.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
const update=source.slice(source.indexOf('function updateCamera(dt){'),source.indexOf('\nfunction zoom(amount)'));
const reference=Function('field','target','theta','phi','distance',`const mode='terrain',world={field},state={},clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,add=(a,b)=>a.map((v,i)=>v+b[i]);const camera={theta,phi,distance,target:[...target],focusHeight:0,goal:{theta,phi,distance,target:[...target]}};${update};updateCamera(1000);return {target:camera.target,eye:camera.eye,altitude:camera.altitude};`);
const packs=['savanna','grand_river','mangrove','volcanoes','canyons','desert'].map(id=>JSON.parse(readFileSync('public/content/biome-'+id+'.json')));

test('synchronous OrbitControls zoom uses raw intent instead of a cliff-corrected radius',()=>{
 const field={surface:x=>x>5?100:0},camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null);
 configureTerrainControls(controls);controls.enableDamping=true;
 const original=controls.update,release=installTerrainCameraIntent(camera,controls,()=>field);
 focusTerrainCamera(camera,controls,field,{x:0,z:0});assert.ok(camera.position.distanceTo(controls.target)>65);
 // This is the same synchronous update path used by the installed wheel
 // handler; it happens before WorldScene's next render-loop update.
 controls._dollyIn(.95);controls.update();
 const expected=nativeCameraPose(field,[0,0,0],.5,1.16,38*.95);
 assert.ok(camera.position.distanceTo(new THREE.Vector3(...expected.eye))<1e-9);
 for(let i=0;i<200;i++){controls.update();assert.ok(camera.position.distanceTo(new THREE.Vector3(...expected.eye))<1e-9);}
 release();assert.equal(controls.update,original);
});

test('intent hook handles field changes and preserves external pan edits and update return values',()=>{
 let field;const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),update(){return 'changed';}};
 const original=controls.update,release=installTerrainCameraIntent(camera,controls,()=>field);
 assert.equal(controls.update(),'changed');field={surface:()=>0};focusTerrainCamera(camera,controls,field,{x:0,z:0});
 camera.position.x+=12;controls.target.x+=12;assert.equal(controls.update(),'changed');assert.equal(controls.target.x,12);
 field={surface:()=>7};controls.update();assert.equal(controls.target.y,7.18);assert.ok(camera.position.y>=9);
 release();assert.equal(controls.update,original);
});

test('terrain camera tilt, distance, target and clearance reproduce the native instantaneous pose',()=>{
  for(const pack of packs){const field=new TerrainField({seed:'712',biome:pack.biomeId,relief:1,river:true});
    for(const target of [[0,0,0],[-25,100,49],[300,-100,-400]])for(const phi of [-1,.065,.8,1.47,2])for(const distance of [0,4,38,140]){
      const actual=nativeCameraPose(field,target,-.7,phi,distance),expected=reference(field,target,-.7,phi,distance);
      for(const key of ['target','eye'])actual[key].forEach((v,i)=>assert.ok(Math.abs(v-expected[key][i])<1e-9));assert.ok(Math.abs(actual.altitude-expected.altitude)<1e-9);assert.ok(actual.altitude>=2-1e-10&&actual.altitude<=20+1e-10);
    }
  }
});

test('actual camera stays above rendered triangles in six biomes and across negative chunk boundaries',()=>{
  for(const pack of packs){const field=new TerrainField({seed:'712',biome:pack.biomeId,relief:1,river:true});
    const camera=new THREE.PerspectiveCamera(42,1,.1,600),controls={target:new THREE.Vector3()};configureTerrainControls(controls);
    assert.equal(controls.screenSpacePanning,false);assert.equal(controls.minDistance,4);assert.equal(controls.maxDistance,65);
    for(const [x,z] of [[0,0],[-24.1,48.1],[field.riverX(12),12]]){
      controls.target.set(x,500,z);camera.position.set(x+34,-300,z+40);const pose=protectTerrainCamera(camera,controls,field);
      const [xx,yy,zz]=pose.eye,cx=Math.floor((xx+24)/48),cz=Math.floor((zz+24)/48),geometry=nativeGroundGeometry(field,pack.profile,cx,cz),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.position.set(cx*48,0,cz*48);mesh.updateMatrixWorld();
      const hit=new THREE.Raycaster(new THREE.Vector3(xx,500,zz),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];assert.ok(hit);assert.ok(yy-hit.point.y>=2-1e-5&&yy-hit.point.y<=20+1e-5);
      assert.deepEqual(controls.target.toArray(),pose.target);assert.deepEqual(camera.position.toArray(),pose.eye);
      const direction=camera.getWorldDirection(new THREE.Vector3()),towards=controls.target.clone().sub(camera.position).normalize();assert.ok(direction.distanceTo(towards)<1e-10);
      for(let i=0;i<20;i++){const next=protectTerrainCamera(camera,controls,field);assert.deepEqual(next,pose);assert.deepEqual(camera.position.toArray(),pose.eye);}
      geometry.dispose();mesh.material.dispose();
    }
  }
});

test('focus keeps unrestricted travel and native canyon/home angles without altering simulation state',()=>{
  const saved={day:44,time:313,elapsed:4201},before=JSON.stringify(saved);
  for(const pack of packs){const field=new TerrainField({seed:'712',biome:pack.biomeId,relief:1,river:true}),camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3()};
    const world={camera,controls,nav:{field},state:saved};WorldScene.prototype.focus.call(world,{x:-1234,z:987});
    const expected=nativeCameraPose(field,[-1234,0,987],field.canyon?0:.5,field.canyon?1.18:1.16,field.canyon?34:38);
    assert.deepEqual(camera.position.toArray(),expected.eye);assert.deepEqual(controls.target.toArray(),expected.target);
    let updates=0;controls.update=()=>{updates++;camera.position.y=-1000;};WorldScene.prototype.updateCamera.call(world);assert.equal(updates,1);assert.ok(camera.position.y>=field.surface(camera.position.x,camera.position.z)+2-1e-9);
  }
  assert.equal(JSON.stringify(saved),before);assert.equal(protectTerrainCamera({}, {},null),undefined);
});

test('focus consumes pending damping before applying the new destination; unchanged frames retain the same eye',()=>{
  const field=new TerrainField({seed:'712',biome:'canyons',relief:1,river:true}),camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),enableDamping:true,update(){assert.equal(this.enableDamping,false);this.target.x+=10;camera.position.x+=10;}};
  const pose=focusTerrainCamera(camera,controls,field,{x:field.riverX(0),z:0});assert.equal(controls.enableDamping,true);
  for(let i=0;i<100;i++){camera.position.x+=1e-10;assert.deepEqual(protectTerrainCamera(camera,controls,field),pose);}
});

test('real OrbitControls do not turn a cliff height correction into a moving camera on idle frames',()=>{
  const field={surface:(x,z)=>x>5?100:0},camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera,null);configureTerrainControls(controls);controls.enableDamping=true;
  const pose=focusTerrainCamera(camera,controls,field,{x:0,z:0});assert.equal(pose.altitude,2);assert.ok(camera.position.distanceTo(controls.target)>65);
  for(let i=0;i<200;i++){updateTerrainCamera(camera,controls,field);assert.ok(camera.position.distanceTo(new THREE.Vector3(...pose.eye))<1e-9);}
  // A real external edit must still move the view rather than reuse its cached pose.
  camera.position.x+=12;controls.target.x+=12;updateTerrainCamera(camera,controls,field);assert.ok(Math.abs(controls.target.x-12)<1e-9);assert.ok(camera.position.y>=field.surface(camera.position.x,camera.position.z)+2);
  // No DOM was connected, so there are no event listeners to dispose.
});

test('picking uses the protected camera even when input arrives before the next rendered frame',()=>{
  const camera=new THREE.PerspectiveCamera(42,1,.1,600),field={surface:()=>7},controls={target:new THREE.Vector3(0,7,0)};camera.position.set(2,-10,20);
  const world={camera,controls,nav:{field},canvas:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},cursor:new THREE.Vector2(),raycaster:new THREE.Raycaster(),objects:new Map(),state:{plants:[]},terrainMeshes:[]};
  assert.deepEqual(WorldScene.prototype.pick.call(world,{clientX:50,clientY:50}),{entityId:null,point:null});assert.ok(camera.position.y>=9);
  assert.deepEqual(world.raycaster.ray.origin.toArray(),camera.position.toArray());
});
