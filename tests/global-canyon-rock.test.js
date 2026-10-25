import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {BiomeGround} from '../src/rendering/biome-ground.js';

test('cliff shader stays opt-in, canyon-only and works on resident and horizon materials',()=>{
 for(const enabled of [false,true])for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])for(const mapped of [0,1]){
  const toon=new AfricanToon();toon.globalVisualLighting=enabled;
  const m=new THREE.MeshStandardMaterial();Object.assign(m.userData,{toonGround:true,groundBiome:biome,biomeGround:{uGroundMapped:{value:mapped},uGroundLayered:{value:0},uCliffRock:{value:new THREE.Texture()}}});
  toon.material(m);const shader={...THREE.ShaderLib.standard,uniforms:{}};m.onBeforeCompile(shader,{});
  assert.equal(shader.fragmentShader.includes('float rockWall='),enabled&&biome==='canyons');
  if(enabled&&biome==='canyons'){assert.ok(shader.fragmentShader.includes('pale*.24+thin*.10'));assert.ok(!shader.fragmentShader.includes('pale*.72+thin*.32'));}
  m.dispose();m.userData.biomeGround.uCliffRock.value.dispose();toon.shadowUniforms.fallback.dispose();
 }
});

test('resident and horizon share the owned cliff map and release it once at ground shutdown',()=>{
 const ground=new BiomeGround(),borrowed=new THREE.Texture();ground.cliffRock=borrowed.clone();let released=0,borrowedReleased=0;
 ground.cliffRock.addEventListener('dispose',()=>released++);borrowed.addEventListener('dispose',()=>borrowedReleased++);
 ground.field={seed:712,c:{biome:'canyons'}};ground.profile={colors:{soil:'#aabbcc',grass:'#aabbcc',foliage:'#aabbcc'}};ground.tile={scale:.1,blend:1,normalBoost:1};ground.textures=Array.from({length:3},()=>new THREE.Texture());
 const a=new THREE.MeshStandardMaterial(),b=new THREE.MeshStandardMaterial();ground.attach(a,0,0,new Uint8Array(35*35*4));ground.attach(b,2,0,null,{mapped:false});
 assert.equal(a.userData.biomeGround.uCliffRock.value,b.userData.biomeGround.uCliffRock.value);a.dispose();b.dispose();assert.equal(released,0);ground.dispose();ground.dispose();assert.equal(released,1);assert.equal(borrowedReleased,0);borrowed.dispose();
});
