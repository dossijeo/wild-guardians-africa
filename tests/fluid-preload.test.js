import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Matrix4} from 'three';
import {paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {FluidGpuPreload} from '../src/rendering/fluid-preload.js';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';

test('dry-view preparation borrows native water and lava recipes without mutating material or logical clocks',()=>{
 for(const lava of [false,true]){
  const material=paintedWaterMaterial('#507761',lava,712),uniforms=material.userData.paintUniforms,time=uniforms.uTime.value,key=material.customProgramCacheKey(),compile=material.onBeforeCompile;
  const primer=new FluidGpuPreload(material,{instanced:true});assert.equal(primer.children.length,2);
  for(const mesh of primer.children){assert.equal(mesh.material,material);assert.equal(mesh.receiveShadow,true);assert.equal(mesh.castShadow,false);assert.equal(mesh.frustumCulled,false);}
  const matrix=new Matrix4();primer.children[1].getMatrixAt(0,matrix);assert.deepEqual(matrix.elements,new Matrix4().elements);
  assert.equal(material.customProgramCacheKey(),key);assert.equal(material.onBeforeCompile,compile);assert.equal(uniforms.uTime.value,time);
  primer.dispose();material.dispose();
 }
});

test('temporary fluid geometry survives preparation with original depth recipes and is released once on error cleanup',()=>{
 const material=paintedWaterMaterial('#507761'),primer=new FluidGpuPreload(material,{instanced:true}),parent=new Group();parent.add(primer);
 let materialDisposals=0,geometryDisposals=0,instanceDisposals=0;material.addEventListener('dispose',()=>materialDisposals++);primer.geometry.addEventListener('dispose',()=>geometryDisposals++);primer.children[1].addEventListener('dispose',()=>instanceDisposals++);
 const failure=Error('shader failed');assert.throws(()=>withDepthCaptureMaterials(parent,()=>{
  assert.ok(primer.children.every(mesh=>mesh.material===material));assert.equal(material.colorWrite,false);throw failure;
 }),error=>error===failure);
 assert.equal(material.colorWrite,true);assert.equal(material.visible,true);primer.dispose();primer.dispose();assert.equal(parent.children.length,0);assert.equal(primer.children.length,0);assert.equal(geometryDisposals,1);assert.equal(instanceDisposals,1);assert.equal(materialDisposals,0);material.dispose();assert.equal(materialDisposals,1);
});

test('worlds without authored fluid props prepare only the chunk mesh and still leave permanent shader ownership intact',()=>{
 const material=paintedWaterMaterial('#507761'),primer=new FluidGpuPreload(material);assert.equal(primer.children.length,1);assert.equal(primer.children[0].isInstancedMesh,undefined);primer.dispose();assert.equal(material.userData.paintUniforms.uTime.value,0);material.dispose();
});
