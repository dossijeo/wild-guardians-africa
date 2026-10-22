import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKY_FRAGMENT} from '../src/rendering/sky-source.js';
import {skyAtmosphereEnabled,patchSkyAtmosphere,patchSkyReflectionLatitude} from '../src/rendering/sky-atmosphere.js';
import {endpointEnvironment} from '../src/rendering/environment-endpoints.js';
import {environmentFunctions,fluidLightingFunctions} from '../src/rendering/fluid-lighting-source.js';
test('sky atmosphere requires both explicit lab switches',()=>{
 for(const search of ['','?skyAtmosphere=clouds','?visualLab=global-lighting','?visualLab=global-lighting&skyAtmosphere=off'])assert.equal(skyAtmosphereEnabled(search),false);
 assert.equal(skyAtmosphereEnabled('?visualLab=global-lighting&skyAtmosphere=clouds'),true);
});
test('native sky patch preserves the reviewed QA shader exactly',()=>{
 const qa=readFileSync('tools/experiments/qa-sky-cloud-latitude-subtle-20261022.mjs','utf8');const patch=qa.match(/const patch=`([\s\S]*?)`;/)[1];
 const sample='vec3 base=pow(max(1.-exp(-max(readHDR(uv)';
 const expected=SKY_FRAGMENT.replace('base=applySaturation(base,uSkySaturation);',patch).replace(sample,'if(uSkyKind<.5)uv.y-=.025*smoothstep(.10,.50,uv.y); '+sample);
 assert.equal(patchSkyAtmosphere(SKY_FRAGMENT),expected);assert.equal(expected.split('texelFetch(').length,5);
 assert.throws(()=>patchSkyAtmosphere('changed'),/anchors/);
});
test('both environment paths align day UV while preserving night and original palette',()=>{
 for(const source of [environmentFunctions,fluidLightingFunctions]){
  const original=endpointEnvironment(source,{atmosphere:false}),candidate=endpointEnvironment(source,{atmosphere:true});
  assert.equal(candidate,patchSkyReflectionLatitude(original));
  assert.equal(candidate.split('textureLod(uEnvDay,vec2(').length,3);
  assert.equal(candidate.split('textureLod(uEnvNight,uv,rough*7.)').length,3);
  assert.equal(candidate.replaceAll('vec2(uv.x,uv.y-.025*smoothstep(.10,.50,uv.y))','uv'),original);
 }
});
import * as THREE from 'three';
import {createLoadingSky} from '../src/rendering/loading-sky.js';
test('loading clone does not grade an atmosphere sky a second time',()=>{
 const material=new THREE.RawShaderMaterial({fragmentShader:patchSkyAtmosphere(SKY_FRAGMENT),uniforms:{uSkyOpacity:{value:1}}});
 const geometry=new THREE.BufferGeometry(),scene=new THREE.Scene();scene.add(new THREE.Mesh(geometry,material));
 const sky={materials:[material],scene,uniforms:{},render(){}};const loading=createLoadingSky(sky);
 assert.equal(loading.materials[0].fragmentShader,material.fragmentShader);
 assert.notEqual(loading.materials[0],material);loading.dispose();material.dispose();geometry.dispose();
});
