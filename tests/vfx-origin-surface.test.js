import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {withRenderOrigin} from '../src/rendering/render-origin.js';

test('shield domes and agricultural ribbons query global terrain and preserve their local vertices while projection is rebased',()=>{
  const catalog=JSON.parse(fs.readFileSync('public/content/vfx.json'));
  const pipeline=new BuildingDestructionPass({shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)}),library=new VfxLibrary(catalog,new THREE.Texture({width:4096,height:2048}));
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,4/3,.1,400),queries=[];
  const surface=(x,z)=>{queries.push([x,z]);return 12+.03*x+.02*z;};
  camera.position.set(249,28,60);camera.lookAt(240,20,48);camera.updateMatrixWorld();
  for(const [id,mode] of [['shield','barrier'],['heal','growth'],['heal','multiply']]){
    const fx=library.create(id,pipeline,{worldSurface:surface,...(id==='shield'?{shieldMode:mode,shieldDuration:20}:{agricultureMode:mode,agricultureDuration:30})});
    fx.position.set(240,surface(240,48),48);fx.rotation.y=.7;fx.scale.set(1.2,1.1,1.3);scene.add(fx);fx.seek(1);
    const expected=new Float32Array(fx.native.geometry());assert.ok(expected.length>0);queries.length=0;
    withRenderOrigin({scene,camera,origin:{x:240,z:48}},()=>{
      fx.prepare(camera,scene);
      assert.ok(queries.length>0);assert.ok(queries.every(([x,z])=>x>230&&x<250&&z>38&&z<58),'terrain queries must remain near the global effect location');
      const actual=fx.ribbonBuffer.array.slice(0,expected.length);
      assert.ok(actual.every((value,i)=>value===expected[i]),'rebasing projection must not bend or bury native terrain-following geometry');
    });
    const point=new THREE.Vector3(1,fx.localSurface(1,-1),-1).applyMatrix4(fx.matrixWorld);assert.ok(Math.abs(point.y-surface(point.x,point.z))<1e-8);fx.dispose();
  }
  library.dispose();pipeline.dispose();
});
