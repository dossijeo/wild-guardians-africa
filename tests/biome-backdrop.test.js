import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createBiomeBackdrop} from '../src/rendering/biome-backdrop.js';
function fixture(biome='savanna'){return {scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),nav:{config:{biome},field:{surface:()=>3}},toon:{uniforms:{uNight:{value:0}}}};}
test('backdrop has bounded parallax, retains vertical freedom and borrows its atlas',()=>{
 const world=fixture(),texture=new THREE.Texture(),layer=createBiomeBackdrop(world,texture);assert.equal(layer.root.children.length,1);layer.update();assert.equal(layer.root.position.y,3);
 world.camera.position.set(1000,2000,-1000);layer.update();assert.ok(Math.abs(layer.root.position.x-world.camera.position.x)<=30);assert.ok(Math.abs(layer.root.position.z-world.camera.position.z)<=30);assert.equal(layer.root.position.y,3);
 world.camera.position.set(1e7,100,1e7);layer.update();assert.ok(Math.abs(layer.root.position.x-world.camera.position.x)<=30);assert.equal(layer.root.children[0].material.uniforms.uBackdropNight,world.toon.uniforms.uNight);
 let geometries=0,materials=0,textures=0;for(const child of layer.root.children){child.geometry.addEventListener('dispose',()=>geometries++);assert.equal(child.castShadow,false);assert.equal(child.material.depthWrite,false);}layer.root.children[0].material.addEventListener('dispose',()=>materials++);texture.addEventListener('dispose',()=>textures++);
 layer.dispose();layer.dispose();assert.equal(geometries,1);assert.equal(materials,1);assert.equal(textures,0);assert.equal(world.scene.children.length,0);
});
for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])test(`${biome}: backdrop responds to the same day/night uniform`,()=>{const world=fixture(biome),layer=createBiomeBackdrop(world,new THREE.Texture());world.toon.uniforms.uNight.value=1;layer.update();assert.equal(layer.root.children[0].material.uniforms.uBackdropFog.value.getHexString(),'263747');layer.dispose();});
