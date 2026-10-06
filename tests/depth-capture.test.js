import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';

function fixture(){
 const world=new THREE.Scene(),source=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),depth=new THREE.MeshDepthMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source);
 depth.userData.worldDepthCompatible=true;mesh.customDepthMaterial=depth;world.add(mesh);return {world,mesh,source,depth};
}
test('authored depth route shares live deformation uniforms and restores original objects and materials after failure',()=>{
 const {world,mesh,source,depth}=fixture(),clock={value:12};depth.userData.clock=clock;depth.visible=false;
 assert.throws(()=>withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,depth);assert.equal(depth.visible,true);assert.equal(depth.colorWrite,false);assert.equal(depth.userData.clock,clock);throw new Error('GPU failure');}),/GPU failure/);
 assert.equal(mesh.material,source);assert.equal(source.colorWrite,true);assert.equal(source.visible,true);assert.equal(depth.colorWrite,true);assert.equal(depth.visible,false);
});
test('unverified depth shaders, clipping, alpha mismatch, offset, side mismatch and multi-material meshes retain their original recipes',()=>{
 for(const change of [f=>delete f.depth.userData.worldDepthCompatible,f=>f.source.visible=false,f=>f.source.clippingPlanes=[new THREE.Plane()],f=>f.source.alphaTest=.3,f=>f.source.alphaHash=true,f=>f.source.wireframe=true,f=>f.source.displacementMap=new THREE.Texture(),f=>f.source.polygonOffset=true,f=>f.depth.side=THREE.FrontSide,f=>f.mesh.material=[f.source]]){
  const f=fixture();change(f);const original=f.mesh.material;
  const stats=withDepthCaptureMaterials(f.world,()=>assert.equal(f.mesh.material,original));assert.equal(stats.specialized,0);assert.equal(stats.fallback,1);assert.equal(f.mesh.material,original);
 }
});
test('transparency and non-writing materials remain excluded; override and diagnostic comparison preserve the old route',()=>{
 const {world,mesh,source,depth}=fixture();
 for(const flag of ['transparent','depthWrite']){source[flag]=flag==='transparent';withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,source);assert.equal(source.visible,false);});source[flag]=flag!=='transparent';assert.equal(source.visible,true);}
 world.overrideMaterial=new THREE.MeshBasicMaterial();withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,source);assert.equal(world.overrideMaterial.colorWrite,false);});assert.equal(world.overrideMaterial.colorWrite,true);world.overrideMaterial=null;
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,source),{optimized:false});assert.equal(stats.specialized,0);assert.equal(depth.colorWrite,true);
});

test('hidden ancestors skip depth preparation while shared visible materials and restoration remain correct',()=>{
 const {world,mesh,source,depth}=fixture(),hidden=new THREE.Group();hidden.visible=false;world.add(hidden);
 const child=new THREE.Mesh(mesh.geometry,source);child.customDepthMaterial=depth;hidden.add(child);
 const hiddenSource=new THREE.MeshStandardMaterial(),hiddenOnly=new THREE.Mesh(mesh.geometry,hiddenSource);hidden.add(hiddenOnly);
 const stats=withDepthCaptureMaterials(world,()=>{
  assert.equal(mesh.material,depth);assert.equal(child.material,source);
  assert.equal(hiddenOnly.material,hiddenSource);assert.equal(hiddenSource.colorWrite,true);
 });
 assert.equal(stats.specialized,1);assert.equal(stats.fallback,0);assert.equal(child.material,source);assert.equal(source.colorWrite,true);
 hidden.visible=true;const revealed=withDepthCaptureMaterials(world,()=>assert.equal(child.material,depth));assert.equal(revealed.specialized,3);
 hidden.visible=false;const reference=withDepthCaptureMaterials(world,()=>assert.equal(child.material,depth),{visibleOnly:false});assert.equal(reference.specialized,3);
 assert.throws(()=>withDepthCaptureMaterials(world,()=>{assert.equal(child.material,source);throw Error('render failure');}),/render failure/);
 assert.equal(mesh.material,source);assert.equal(depth.colorWrite,true);assert.equal(source.colorWrite,true);
 mesh.geometry.dispose();source.dispose();depth.dispose();hiddenSource.dispose();
});
