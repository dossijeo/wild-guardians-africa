import test from 'node:test';
import assert from 'node:assert/strict';
import {FineNoiseVolume,volumeNoiseSource,cornerNoise} from './browser/noise-volume.js';
import {toonFunctions} from '../src/rendering/african-toon-source.js';
import {diagnosticPigment} from '../src/rendering/fine-noise.js';

test('QA volume is deterministic R8 data with interpolation and explicit disposal',()=>{
 const a=new FineNoiseVolume(),b=new FineNoiseVolume(),data=a.texture.image.data;
 assert.equal(data.byteLength,262144);assert.deepEqual(data,b.texture.image.data);
 assert.equal(data[5+64*(9+64*17)],Math.round(cornerNoise(5,9,17)*255));
 const mean=data.reduce((n,v)=>n+v,0)/data.length/255;
 assert.ok(mean>.45&&mean<.55,'quantized field must not bias pigment average');
 assert.equal(a.uniforms.uFineNoiseVolumeEnabled.value,0);
 let disposal=0;a.texture.addEventListener('dispose',()=>disposal++);a.dispose();a.dispose();b.dispose();assert.equal(disposal,1);
});

test('QA adapter only replaces fine evaluations and leaves coarse ground and analytic fallback available',()=>{
 const source=diagnosticPigment(toonFunctions)+'\nvoid ground(){float coarse=materialNoise(worldPatternPosition(worldP)*.32),fine=materialNoise(worldPatternPosition(worldP)*2.6);}';
 const adapted=volumeNoiseSource(source);
 assert.ok(adapted.includes('materialNoise(worldPatternPosition(worldP)*.32)'));
 assert.ok(adapted.includes('volumeFineNoise(worldPatternPosition(worldP)*2.6)'));
 assert.ok(adapted.includes('volumeFineNoise(worldP*.85)'));
 assert.ok(adapted.includes('if(uFineNoiseVolumeEnabled<.5)return materialNoise(p);'));
 assert.equal(adapted.split('float volumeFineNoise(').length,2);
 assert.equal(volumeNoiseSource('void main(){}'),'void main(){}');
 assert.throws(()=>volumeNoiseSource('materialNoise(worldP*.85)'),/authored color helper/);
});

test('single-exit QA control retains noise calls, texture coordinates and branch condition',()=>{
 const source=diagnosticPigment(toonFunctions),normal=volumeNoiseSource(source),single=volumeNoiseSource(source,{singleExit:true});
 const helper=shader=>shader.slice(shader.indexOf('float volumeFineNoise('),shader.indexOf('vec3 toLinear4'));
 assert.equal(normal.replace(helper(normal),''),single.replace(helper(single),''));
 const body=helper(single);
 assert.equal(body.match(/return /g).length,1);
 assert.ok(body.includes('float qaNoise=0.;'));
 assert.ok(body.includes('if(uFineNoiseVolumeEnabled<.5)qaNoise=materialNoise(p);'));
 assert.ok(body.includes('qaNoise=texture(uFineNoiseVolume,(mod(i,64.)+f+.5)/64.).r;'));
 assert.equal(body.match(/materialNoise\(p\)/g).length,1);
 assert.equal(body.match(/texture\(/g).length,1);
 const volume=new FineNoiseVolume({singleExit:true}),ordinary=new FineNoiseVolume();
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),a=new THREE.MeshStandardMaterial(),b=new THREE.MeshStandardMaterial();
 a.onBeforeCompile=b.onBeforeCompile=shader=>{shader.fragmentShader=source;};
 root.add(new THREE.Mesh(geometry,a));volume.apply(root);
 const other=new THREE.Group();other.add(new THREE.Mesh(geometry,b));ordinary.apply(other);
 assert.notEqual(a.customProgramCacheKey(),b.customProgramCacheKey());
 const shader={fragmentShader:'',uniforms:{}};a.onBeforeCompile(shader,{});
 assert.equal(shader.fragmentShader,single);assert.equal(shader.uniforms.uFineNoiseVolume,volume.uniforms.uFineNoiseVolume);
 volume.dispose();ordinary.dispose();geometry.dispose();a.dispose();b.dispose();
});


import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {nativeDepthRecipe} from '../src/rendering/depth-recipes.js';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';
import {assetClipMaterial} from '../src/rendering/asset-clip.js';
import {obstructionMaterial} from '../src/rendering/obstruction.js';

test('RGB-only QA volume preserves audited depth hooks without granting unknown hooks authority',()=>{
 const volume=new FineNoiseVolume(),root=new THREE.Group(),source=new THREE.MeshStandardMaterial();
 assetClipMaterial(source);obstructionMaterial(source);new AfricanToon().material(source);
 const features=[...nativeDepthRecipe(source).features].sort(),depth=standardDepthMaterial(source);
 const unknown=new THREE.MeshStandardMaterial();unknown.onBeforeCompile=shader=>{shader.vertexShader+='\n// unknown displacement';};
 root.add(new THREE.Mesh(new THREE.BoxGeometry(),source),new THREE.Mesh(new THREE.BoxGeometry(),unknown));
 volume.apply(root);assert.deepEqual([...nativeDepthRecipe(source).features].sort(),features);
 assert.equal(standardDepthMaterial(source),depth);assert.equal(nativeDepthRecipe(unknown),null);
 assert.equal(standardDepthMaterial(unknown),null);
 const hook=source.onBeforeCompile;volume.apply(root);assert.equal(source.onBeforeCompile,hook);
 root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});volume.dispose();
});
