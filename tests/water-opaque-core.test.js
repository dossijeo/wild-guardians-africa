import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {waterOpaqueCoreEnabled,prepareOpaqueCore} from '../src/rendering/water-opaque-core.js';
test('opaque water core is restricted to explicit Canyon option',()=>{
 const q='?visualLab=global-lighting&waterEdges=natural&waterCore=opaque';
 assert.equal(waterOpaqueCoreEnabled('gran-canon',q),true);
 for(const b of ['sabana','gran-rio','manglares','volcanes','desierto'])assert.equal(waterOpaqueCoreEnabled(b,q),false);
 assert.equal(waterOpaqueCoreEnabled('gran-canon','?waterCore=opaque'),false);
});
test('core borrows geometry and shares live uniforms without duplicate attachment',()=>{
 const g=new THREE.PlaneGeometry(),m=new THREE.MeshStandardMaterial({transparent:true});m.userData.paintUniforms={uTime:{value:0}};
 const mesh=new THREE.Mesh(g,m),group=new THREE.Group();group.add(mesh);prepareOpaqueCore(mesh);prepareOpaqueCore(mesh);
 assert.equal(group.children.length,2);const core=mesh.userData.waterCore;
 assert.equal(core.geometry,g);assert.equal(core.userData.borrowedWaterGeometry,true);assert.equal(core.material.userData.paintUniforms,m.userData.paintUniforms);
 assert.equal(core.material.transparent,false);assert.equal(core.material.depthWrite,true);core.material.dispose();m.dispose();g.dispose();
});
