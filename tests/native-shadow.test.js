import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createNativeShadowUniforms,ensureNativeShadowTarget,updateNativeShadowUniforms,installNativeShadow,patchNativeShadow} from '../src/rendering/native-shadow.js';
import {nativeShadowFunctions,nativeShadowSourceHash} from '../src/rendering/native-shadow-source.js';
import {AfricanToon,paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {resizeShadowMap} from '../src/rendering/shadow-camera.js';

const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replace(/\r\n/g,'\n');

test('PCF preserves the original nine taps, slope compensation, bias and edge fade verbatim',()=>{
 const start=source.indexOf('float filteredShadow4(vec3 normal){'),original=source.slice(start,source.indexOf('\n}',start)+2);
 assert.equal(createHash('sha256').update(original).digest('hex'),nativeShadowSourceHash);
 const restored=nativeShadowFunctions.slice(nativeShadowFunctions.indexOf('float nativeShadowOcclusion')).replace('nativeShadowOcclusion(vec3 normal,vec3 worldPosition)','filteredShadow4(vec3 normal)').replace(' vec4 lightPosition=uNativeLightVP*vec4(worldPosition,1.);\n vec3 p=lightPosition.xyz/lightPosition.w*.5+.5;',' vec3 p=vLight.xyz/vLight.w*.5+.5;').replaceAll('uNativeShadowOn','uShadowOn').replaceAll('uNativeShadowFiltered','uShadowFiltered').replaceAll('uNativeShadowTexel','uTexel').replaceAll('uNativeShadowLight','uLightDir');
 const guard=restored.split('\n').find(line=>line.startsWith(' if(uShadowOn')),normalOrder=restored.replace(guard+'\n','').replace(' vec2 ux=',guard+'\n vec2 ux=');
 const tapBody='vec2 o=vec2(float(x),float(y))*uTexel*1.15;v+=textureLod(uShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias),0.);',taps=[];
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)taps.push(' {'+tapBody.replace('float(x)',`float(${x})`).replace('float(y)',`float(${y})`)+'}');
 assert.ok(normalOrder.includes(taps.join('\n')));assert.equal((nativeShadowFunctions.match(/v\+=textureLod/g)||[]).length,9);
 const loopOrder=normalOrder.replace(taps.join('\n'),' for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){'+tapBody+'}');
 assert.equal(loopOrder.replace('textureLod(uShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias),0.)','texture(uShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias))'),original);assert.ok(source.includes('gl.polygonOffset(1,1)'));assert.ok(source.includes('gl.LEQUAL'));
});

test('shadow target keeps packed-color compatibility and native depth24 comparison through resizing',()=>{
 const light=new THREE.DirectionalLight(),target=ensureNativeShadowTarget(light),depth=target.depthTexture;
 assert.equal(depth.type,THREE.UnsignedIntType);assert.equal(depth.format,THREE.DepthFormat);assert.equal(depth.internalFormat,'DEPTH_COMPONENT24');assert.equal(depth.compareFunction,THREE.LessEqualCompare);assert.equal(depth.minFilter,THREE.LinearFilter);assert.equal(depth.magFilter,THREE.LinearFilter);
 assert.equal(target.texture.minFilter,THREE.NearestFilter);assert.equal(ensureNativeShadowTarget(light),target);
 let disposed=0;target.addEventListener('dispose',()=>disposed++);resizeShadowMap(light,'alta');assert.equal(disposed,1);assert.equal(light.shadow.map,null);
 const next=ensureNativeShadowTarget(light);assert.notEqual(next,target);assert.equal(next.width,2048);assert.equal(next.depthTexture.image.height,2048);next.dispose();
});

test('native depth pass applies polygon offset to custom and shared materials, restoring state on exception',()=>{
 const light=new THREE.DirectionalLight(),uniforms=createNativeShadowUniforms(),materials=[new THREE.MeshDepthMaterial(),new THREE.ShaderMaterial({polygonOffset:true,polygonOffsetFactor:4,polygonOffsetUnits:2})],observed=[];
 const renderer={shadowMap:{enabled:true,autoUpdate:true,render(){for(const material of materials)renderer.renderBufferDirect(null,null,null,material);throw new Error('draw failure');}},renderBufferDirect(camera,scene,geometry,material){observed.push([material.polygonOffset,material.polygonOffsetFactor,material.polygonOffsetUnits]);}};
 light.castShadow=true;const original=renderer.shadowMap.render,draw=renderer.renderBufferDirect,release=installNativeShadow(renderer,light,uniforms);
 assert.throws(()=>renderer.shadowMap.render([light],null,null),/draw failure/);assert.deepEqual(observed,[[true,1,1],[true,1,1]]);assert.equal(renderer.renderBufferDirect,draw);assert.deepEqual(materials.map(m=>[m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits]),[[false,0,0],[true,4,2]]);
 release();release();assert.equal(renderer.shadowMap.render,original);assert.equal(uniforms.uNativeShadowOn.value,0);light.shadow.map.dispose();materials.forEach(m=>m.dispose());
});

test('disabled shadow passes do not allocate depth targets; shared uniforms follow enabled state and light VP',()=>{
 const scene=new THREE.Scene(),light=new THREE.DirectionalLight();scene.add(light,light.target);light.castShadow=true;light.position.set(30,40,50);scene.updateMatrixWorld(true);light.shadow.updateMatrices(light);
 const renderer={shadowMap:{enabled:false,autoUpdate:true,render(){}},renderBufferDirect(){}},uniforms=createNativeShadowUniforms(),release=installNativeShadow(renderer,light,uniforms);
 renderer.shadowMap.render([light],scene,new THREE.PerspectiveCamera());assert.equal(light.shadow.map,null);assert.equal(uniforms.uNativeShadowOn.value,0);assert.equal(uniforms.uNativeShadowFiltered.value,uniforms.fallback);assert.equal(uniforms.fallback.compareFunction,THREE.LessEqualCompare);assert.ok(uniforms.fallback.version>0);assert.equal(uniforms.fallback.image.width,1);
 renderer.shadowMap.enabled=true;light.shadow.autoUpdate=false;renderer.shadowMap.render([light],scene,new THREE.PerspectiveCamera());assert.equal(light.shadow.map,null);light.shadow.autoUpdate=true;renderer.shadowMap.render([light],scene,new THREE.PerspectiveCamera());assert.equal(uniforms.uNativeShadowOn.value,1);assert.equal(uniforms.uNativeShadowFiltered.value,light.shadow.map.depthTexture);
 assert.deepEqual(uniforms.uNativeLightVP.value,new THREE.Matrix4().multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse));light.castShadow=false;updateNativeShadowUniforms(uniforms,renderer,light);assert.equal(uniforms.uNativeShadowOn.value,0);release();light.shadow.map.dispose();
});

test('Standard direct lighting uses native PCF while spot and point shadows keep their own source',()=>{
 const shader={uniforms:{},fragmentShader:'#include <lights_fragment_begin>'},uniforms=createNativeShadowUniforms();patchNativeShadow(shader,uniforms,'vWorld');
 assert.ok(shader.fragmentShader.includes('nativeShadowOcclusion(inverseTransformDirection(normal,viewMatrix),vWorld)'));assert.ok(!shader.fragmentShader.includes('getShadow( directionalShadowMap'));
 assert.ok(shader.fragmentShader.includes('getPointShadow('));assert.ok(shader.fragmentShader.includes('getShadow( spotShadowMap'));assert.equal(shader.uniforms.uNativeShadowFiltered,uniforms.uNativeShadowFiltered);
});

test('ground, actors and water share the same native depth sampler without replacing DEST custom-depth materials',()=>{
 const toon=new AfricanToon();for(const ground of [true,false]){const material=new THREE.MeshStandardMaterial();material.userData.toonGround=ground;toon.material(material);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uNativeShadowFiltered,toon.shadowUniforms.uNativeShadowFiltered);assert.ok(shader.fragmentShader.includes('nativeShadowOcclusion(toonN,vToonWorld)'));material.dispose();}
 const material=paintedWaterMaterial('#336699',false,712,null,{textures:[],uniforms:toon.uniforms,shadowUniforms:toon.shadowUniforms}),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uNativeShadowFiltered,toon.shadowUniforms.uNativeShadowFiltered);assert.ok(shader.fragmentShader.includes('nativeShadowOcclusion(inverseTransformDirection(normal,viewMatrix),vPaintWorld)'));material.dispose();
});

test('independent water retains one valid fallback across shader recompiles and releases it with the material',()=>{
 const material=paintedWaterMaterial('#336699'),compile=()=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});return shader.uniforms.uNativeShadowFiltered.value;};
 const first=compile();assert.equal(compile(),first);assert.equal(first.compareFunction,THREE.LessEqualCompare);assert.ok(first.version>0);
 let disposed=0;first.addEventListener('dispose',()=>disposed++);material.dispose();assert.equal(disposed,1);
});
