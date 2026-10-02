import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WATER_DEFAULTS,waterPalette,waterSeed,waterTime} from '../src/rendering/world-atmosphere.js';
import {paintedWaterMaterial,AfricanToon} from '../src/rendering/african-toon.js';
import {skyNight} from '../src/rendering/sky.js';

test('fluid uniforms match the original renderer recipe for all biome palettes and seeds',()=>{
  const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
  const recipe=source.match(/const water=hex\(currentBiome\(\).colors.water\),deep=[^\n]+/)[0];
  const evaluate=Function('currentBiome','hex','cmix',recipe.slice(0,recipe.indexOf(';for('))+';return inks;');
  const nativeDefaults={amplitude:Number(source.match(/gl\.uniform1f\(this\.u\.uAmplitude,([\d.]+)\)/)[1]),strokeWidth:Number(source.match(/gl\.uniform1f\(this\.u\.uStrokeWidth,([\d.]+)\)/)[1]),handmade:Number(source.match(/gl\.uniform1f\(this\.u\.uHandmade,([\d.]+)\)/)[1]),scale:Number(source.match(/waterScale:([\d.]+)/)[1]),speed:Number(source.match(/waterSpeed:([\d.]+)/)[1])};
  assert.deepEqual(WATER_DEFAULTS,nativeDefaults);
  const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
    const pack=JSON.parse(readFileSync('public/content/biome-'+biome+'.json')),color=pack.profile.colors.water,lava=biome==='volcanoes';
    assert.deepEqual(waterPalette(color,lava),evaluate(()=>({colors:{water:color},fluid:lava?'lava':'water'}),hex,mix));
    for(const seed of [42,712,918271,4294967295]){
      const m=paintedWaterMaterial(color,lava,seed),u=m.userData.paintUniforms;
      assert.deepEqual(u.uSeedOffset.value.toArray(),[(seed%1031)*.031,((seed>>>12)%937)*.037]);
      assert.equal(u.uWaterScale.value,.55);assert.equal(u.uAmplitude.value,.72);assert.equal(u.uStrokeWidth.value,1.08);assert.equal(u.uHandmade.value,.52);
      for(let i=0;i<4;i++)assert.deepEqual(u['uInk'+i].value.toArray(),waterPalette(color,lava)[i]);m.dispose();
    }
  }
  assert.equal(WATER_DEFAULTS.speed,.65);assert.deepEqual(waterSeed(0),waterSeed(42));
});
test('animation uses integrated simulated time once and shader converts flat inks to linear',()=>{
  const state={elapsed:123.5};assert.equal(waterTime(state.elapsed),80.275);assert.equal(waterTime(JSON.parse(JSON.stringify(state)).elapsed),waterTime(state.elapsed));
  for(const lava of [false,true]){
    const m=paintedWaterMaterial('#38bcc5',lava,712),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
    assert.ok(shader.fragmentShader.includes('toLinear4(base)'));assert.ok(shader.fragmentShader.includes('toLinear4(paintedLava(wp*4.))*2.15'));assert.ok(shader.fragmentShader.includes('*uWaterScale'));assert.ok(!shader.fragmentShader.includes('uTime*.65'));
    assert.equal(shader.uniforms.uTime,m.userData.paintUniforms.uTime);m.dispose();
  }
});
test('toon retains the same fractional dusk phase as the sky after reload',()=>{
  const toon=new AfricanToon(),sun=new THREE.DirectionalLight();sun.position.set(-30,55,25);
  for(const state of [{day:1,time:300.5},{day:2,time:.5},{day:1,time:100},{day:1,time:500}]){
    toon.update(skyNight(state),sun,'manglares');assert.equal(toon.uniforms.uNight.value,skyNight(state));assert.equal(toon.uniforms.uNightLight.value,1.12);
  }
});
