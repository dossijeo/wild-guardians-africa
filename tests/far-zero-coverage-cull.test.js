import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';

test('zero-coverage vertex pilot preserves fragment recipe, active packing and default shader',()=>{
 const source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),metadata={impostorWidth:2,impostorHeight:3,localBase:[0,0,0]},trees=[{id:'a',x:0,y:0,z:0,yaw:0,scale:1},{id:'b',x:10,y:0,z:0,yaw:1,scale:2}];
 const make=options=>createFarImpostorPrototype(source,new THREE.Texture(),metadata,trees,{nativeModels:false,...options});
 const legacy=make({}),explicit=make({cullZeroImpostors:false}),pilot=make({cullZeroImpostors:true});
 assert.equal(legacy.impostors.material.vertexShader,explicit.impostors.material.vertexShader);assert.equal(pilot.impostors.material.fragmentShader,legacy.impostors.material.fragmentShader);
 assert.equal(pilot.impostors.material.vertexShader.replace('if(vMix*vDensityFade<=0.)gl_Position=vec4(2.,2.,2.,1.);',''),legacy.impostors.material.vertexShader);
 for(const [key,attribute]of Object.entries(legacy.impostors.geometry.attributes))assert.deepEqual(pilot.impostors.geometry.attributes[key].array,attribute.array);
 assert.equal(pilot.impostors.geometry.instanceCount,legacy.impostors.geometry.instanceCount);
 for(const p of [legacy,explicit,pilot])p.dispose();assert.throws(()=>make({cullZeroImpostors:1}),/zero-coverage/);source.geometry.dispose();source.material.dispose();
});
