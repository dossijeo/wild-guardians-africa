import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pipelineGeometryKey,installExperimentalMorphPipelineKey} from '../src/labs/morph-pipeline-key.js';
test('pipeline key omits morph identity but preserves target count and vertex structure',()=>{
 const a=new THREE.BufferGeometry(),b=new THREE.BufferGeometry();for(const g of [a,b]){g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));g.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,0],3)];}
 assert.notEqual(a.morphAttributes.position[0].id,b.morphAttributes.position[0].id);assert.equal(pipelineGeometryKey(a),pipelineGeometryKey(b));b.morphAttributes.position.push(new THREE.Float32BufferAttribute([0,0,0],3));assert.notEqual(pipelineGeometryKey(a),pipelineGeometryKey(b));b.morphAttributes.position.pop();b.setAttribute('uv',new THREE.Float32BufferAttribute([0,0],2));assert.notEqual(pipelineGeometryKey(a),pipelineGeometryKey(b));
});
test('override affects only the backend key call and restores the render object',()=>{
 const geometry=new THREE.BufferGeometry();geometry.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,0],3)];const object={geometry,getGeometryCacheKey(){return 'original';}},backend={getRenderCacheKey(ro){return ro.getGeometryCacheKey();}};
 const undo=installExperimentalMorphPipelineKey(backend);assert.notEqual(backend.getRenderCacheKey(object),'original');assert.equal(object.getGeometryCacheKey(),'original');undo();assert.equal(backend.getRenderCacheKey(object),'original');
});
