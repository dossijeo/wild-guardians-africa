import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createBiomeBackdrop} from '../src/rendering/biome-backdrop.js';
test('decorative backdrop follows authored terrain height with bounded parallax and borrows its atlas',()=>{
 const texture=new THREE.Texture(),world={scene:new THREE.Scene(),camera:{position:new THREE.Vector3(0,14,0)},nav:{config:{biome:'savanna'},field:{surface:(x,z)=>x*.1-z*.05}},toon:{uniforms:{uNight:{value:0}}}};
 let textureReleases=0;texture.addEventListener('dispose',()=>textureReleases++);const owner=createBiomeBackdrop(world,texture),mesh=owner.root.children[0];let geometryReleases=0,materialReleases=0;mesh.geometry.addEventListener('dispose',()=>geometryReleases++);mesh.material.addEventListener('dispose',()=>materialReleases++);
 world.camera.position.set(10000,90,-10000);owner.update();assert.ok(Math.abs(owner.root.position.x-10000)<=30);assert.ok(Math.abs(owner.root.position.z+10000)<=30);assert.equal(owner.root.position.y,1500);assert.equal(owner.root.rotation.x,0);assert.equal(owner.root.rotation.z,0);assert.equal(mesh.material.uniforms.uBackdropNight,world.toon.uniforms.uNight);
 owner.dispose();owner.dispose();assert.equal(world.scene.children.length,0);assert.equal(geometryReleases,1);assert.equal(materialReleases,1);assert.equal(textureReleases,0);texture.dispose();
});
test('invalid backdrop fog mix rejects before mutating the scene or texture',()=>{
 const world={nav:{config:{biome:'savanna'}},scene:new THREE.Scene()},texture=new THREE.Texture();assert.throws(()=>createBiomeBackdrop(world,texture,{fogMix:1.01}),/fog mix/);assert.equal(world.scene.children.length,0);assert.equal(texture.colorSpace,THREE.NoColorSpace);
});
test('decorative fog uses the shared atmosphere palette through the day/night transition',()=>{
 const world={scene:new THREE.Scene(),camera:{position:new THREE.Vector3()},nav:{config:{biome:'mangrove'},field:{surface:()=>0}},toon:{uniforms:{uNight:{value:0}}}},texture=new THREE.Texture();
 const owner=createBiomeBackdrop(world,texture,{fogDayColor:'#b3b5c0',fogNightColor:'#3f4140'}),fog=owner.root.children[0].material.uniforms.uBackdropFog.value;
 owner.update();assert.equal(fog.getHexString(),'b3b5c0');world.toon.uniforms.uNight.value=.5;owner.update();assert.ok(fog.equals(new THREE.Color('#b3b5c0').lerp(new THREE.Color('#3f4140'),.5)));
 world.toon.uniforms.uNight.value=1;owner.update();assert.equal(fog.getHexString(),'3f4140');owner.dispose();texture.dispose();
});
