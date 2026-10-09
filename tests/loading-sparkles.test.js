import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {LoadingSparkles} from '../src/rendering/loading-sparkles.js';

test('presentation sparkles keep one fixed instanced buffer and dispose only their resources',()=>{
 const scene=new Scene(),sparkles=new LoadingSparkles(scene);const geometry=sparkles.geometry,material=sparkles.material,seeds=geometry.attributes.aSeed.array;
 assert.equal(scene.children.length,1);assert.equal(geometry.instanceCount,24);assert.equal(seeds.length,24);assert.equal(geometry.index.count,6);assert.equal(material.depthWrite,false);assert.equal(sparkles.mesh.castShadow,false);
 let geometryDisposed=0,materialDisposed=0;geometry.addEventListener('dispose',()=>geometryDisposed++);material.addEventListener('dispose',()=>materialDisposed++);
 for(let i=0;i<120;i++)sparkles.update(i/60,.7,false);
 assert.equal(sparkles.geometry,geometry);assert.equal(sparkles.material,material);assert.equal(geometry.attributes.aSeed.array,seeds);assert.equal(sparkles.uniforms.uNight.value,.7);
 sparkles.update(5,1,true);assert.equal(sparkles.uniforms.uMotion.value,0);
 sparkles.dispose();assert.equal(scene.children.length,0);assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
});
