import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {diagnosticPigment,diagnosticGroundNoise} from '../src/rendering/fine-noise.js';
import {toonFunctions} from '../src/rendering/african-toon-source.js';
import {volcanicFunctions} from '../src/rendering/volcanic-source.js';

test('noise adapter preserves every authored operation outside its uniform guard and rejects source drift',()=>{
  for(const source of [toonFunctions,volcanicFunctions]){
    const adapted=diagnosticPigment(source);
    const restored=adapted.replace('float brush=.32;\n if(uFineNoise>.5){brush=', 'float brush=').replace('*2.2)*.22;}','*2.2)*.22;');
    assert.equal(restored,source);
  }
  assert.throws(()=>diagnosticPigment('changed recipe'),/Unrecognized/);
  assert.throws(()=>diagnosticGroundNoise('changed recipe'),/Unrecognized/);
});

test('both ground qualities and volcanic objects share a live diagnostic uniform without recompilation',()=>{
  const toon=new AfricanToon();assert.equal(toon.uniforms.uFineNoise.value,1);
  for(const [kind,ground,volcanic] of [['standard',true,false],['basic',true,false],['standard',false,true]]){
    const material=kind==='basic'?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
    material.userData.toonGround=ground;if(volcanic)material.userData.nativeSurface={type:1};
    toon.material(material);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib[kind].vertexShader,fragmentShader:THREE.ShaderLib[kind].fragmentShader};
    material.onBeforeCompile(shader,{});
    assert.equal(shader.uniforms.uFineNoise,toon.uniforms.uFineNoise);
    const version=material.version,key=material.customProgramCacheKey();toon.uniforms.uFineNoise.value=0;
    assert.equal(shader.uniforms.uFineNoise.value,0);assert.equal(material.version,version);assert.equal(material.customProgramCacheKey(),key);
    assert.ok(shader.fragmentShader.includes('if(uFineNoise>.5)'));
    if(ground){assert.ok(shader.fragmentShader.includes('materialNoise(worldPatternPosition(worldP)*.32)'));assert.ok(shader.fragmentShader.includes('fine=.5;'));}
    if(volcanic)assert.equal(shader.fragmentShader.match(/if\(uFineNoise>\.5\)/g).length,2);
    material.dispose();
  }
});
