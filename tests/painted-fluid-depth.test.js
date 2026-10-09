import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGLUniforms} from 'three/src/renderers/webgl/WebGLUniforms.js';
import {paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';
import {nativeDepthRecipe} from '../src/rendering/depth-recipes.js';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';
function water(options={}){
 const {lava=false,bounds=null,outside=false}=options;
 return paintedWaterMaterial('#678f99',lava,712,bounds,null,outside);
}
function compile(material){const library=material.isMeshDepthMaterial?THREE.ShaderLib.depth:THREE.ShaderLib.standard,shader={uniforms:{},vertexShader:library.vertexShader,fragmentShader:library.fragmentShader};material.onBeforeCompile(shader);return shader;}
const position=shader=>shader.vertexShader.split('#include <project_vertex>')[1].split('vPaintWorld=(modelMatrix*paintPosition).xyz;')[0]+'vPaintWorld=(modelMatrix*paintPosition).xyz;';
const discard=shader=>shader.fragmentShader.match(/if\(uFluidClip>\.5\)\{bool inside=.*?discard;\}/)?.[0];

test('production water/lava registers authored coverage without changing its color or shadow recipe',()=>{
 for(const lava of [false,true]){
  const source=water({lava}),before=compile(source),key=source.customProgramCacheKey(),shadow=source.customDepthMaterial;
  assert.deepEqual([...nativeDepthRecipe(source).features],['painted-fluid-clip']);assert.ok(standardDepthMaterial(source)?.isMeshDepthMaterial);
  const after=compile(source);assert.equal(before.vertexShader,after.vertexShader);assert.equal(before.fragmentShader,after.fragmentShader);assert.equal(source.customProgramCacheKey(),key);assert.equal(source.customDepthMaterial,shadow);assert.equal(source.toneMapped,false);
  source.dispose();
 }
});

test('water/lava depth uses exact authored transformed/batched/instanced/model position and half-open discard source',()=>{
 for(const lava of [false,true])for(const outside of [false,true]){
  const source=water({lava,bounds:[-8,-4,12,16],outside}),color=compile(source),depth=compile(standardDepthMaterial(source));
  assert.equal(position(depth),position(color));assert.equal(discard(depth),discard(color));assert.ok(discard(depth));
  assert.ok(depth.vertexShader.indexOf('morphtarget_vertex')<depth.vertexShader.indexOf('paintPosition=vec4(transformed'));assert.ok(depth.vertexShader.indexOf('skinning_vertex')<depth.vertexShader.indexOf('paintPosition=vec4(transformed'));assert.ok(depth.vertexShader.indexOf('displacementmap_vertex')<depth.vertexShader.indexOf('paintPosition=vec4(transformed'));
  assert.match(depth.vertexShader,/paintPosition=batchingMatrix\*paintPosition/);assert.match(depth.vertexShader,/paintPosition=instanceMatrix\*paintPosition/);
  assert.doesNotMatch(depth.fragmentShader,/nativeFluid4|nativeShadowOcclusion|endpointFluid|uEnvDay|uInk/);assert.doesNotMatch(depth.fragmentShader,/lights_physical_fragment/);
  source.dispose();
 }
});

test('live per-material mode and bounds survive shared shader cache and actual Three uniform uploads in alternating draws',()=>{
 const resident=water(),inside=water({bounds:[-8,-4,12,16]}),outside=water({lava:true,bounds:[20,30,40,50],outside:true});
 const shaders=[resident,inside,outside].map(m=>compile(standardDepthMaterial(m))),uploads=[];
 const infos=[{name:'uFluidClip',type:0x1406,size:1},{name:'uFluidBounds',type:0x8B52,size:1}];
 const gl={ACTIVE_UNIFORMS:0x8B86,getProgramParameter:()=>2,getActiveUniform:(_,i)=>infos[i],getUniformLocation:(_,name)=>name,uniform1f:(name,value)=>uploads.push([name,value]),uniform4f:(name,...values)=>uploads.push([name,...values])},uniforms=new WebGLUniforms(gl,{});
 for(const shader of [shaders[0],shaders[1],shaders[0],shaders[2]])WebGLUniforms.upload(gl,uniforms.seq,shader.uniforms);
 inside.userData.paintUniforms.uFluidBounds.value.set(1,2,3,4);inside.userData.paintUniforms.uFluidClip.value=2;WebGLUniforms.upload(gl,uniforms.seq,shaders[1].uniforms);
 assert.deepEqual(uploads,[['uFluidClip',0],['uFluidBounds',-1e8,-1e8,1e8,1e8],['uFluidClip',1],['uFluidBounds',-8,-4,12,16],['uFluidClip',0],['uFluidBounds',-1e8,-1e8,1e8,1e8],['uFluidClip',2],['uFluidBounds',20,30,40,50],['uFluidBounds',1,2,3,4]]);
 for(let i=0;i<3;i++){assert.equal(shaders[i].uniforms.uFluidClip,[resident,inside,outside][i].userData.paintUniforms.uFluidClip);assert.equal(shaders[i].uniforms.uFluidBounds,[resident,inside,outside][i].userData.paintUniforms.uFluidBounds);}
 assert.notEqual(shaders[0].uniforms.uFluidBounds,shaders[1].uniforms.uFluidBounds);assert.equal(standardDepthMaterial(resident).customProgramCacheKey(),standardDepthMaterial(outside).customProgramCacheKey());[resident,inside,outside].forEach(m=>m.dispose());
});

test('stock depth retains side/depth/alpha/displacement/UV/skin/morph properties and updates source versions',()=>{
 const source=water({bounds:[0,0,8,8]});Object.assign(source,{side:THREE.BackSide,depthFunc:THREE.GreaterDepth,depthTest:false,depthWrite:false,opacity:.65,alphaTest:.4,alphaToCoverage:true,map:new THREE.Texture(),alphaMap:new THREE.Texture(),displacementMap:new THREE.Texture(),displacementScale:.3,displacementBias:.1,vertexColors:true});source.map.channel=1;
 const depth=standardDepthMaterial(source);for(const key of ['side','depthFunc','depthTest','depthWrite','opacity','alphaTest','alphaToCoverage','map','alphaMap','displacementMap','displacementScale','displacementBias','vertexColors'])assert.equal(depth[key],source[key]);
 const shader=compile(depth);for(const chunk of ['uv_pars_vertex','uv_vertex','morphtarget_vertex','skinning_vertex','displacementmap_vertex'])assert.ok(shader.vertexShader.includes(chunk));for(const chunk of ['map_fragment','alphamap_fragment','alphatest_fragment','color_fragment'])assert.ok(shader.fragmentShader.includes(chunk));
 const version=depth.version;source.map.channel=2;source.needsUpdate=true;assert.equal(standardDepthMaterial(source),depth);assert.ok(depth.version>version);for(const texture of [source.map,source.alphaMap,source.displacementMap])texture.dispose();source.dispose();
});

test('replaced hooks, cloned custom hooks and forged userData cannot inherit authored fluid authority',()=>{
 const source=water(),first=standardDepthMaterial(source);source.onBeforeCompile=shader=>{shader.vertexShader='unknown deformation';};assert.equal(nativeDepthRecipe(source),null);assert.equal(standardDepthMaterial(source),null);
 const original=water(),copy=original.clone();copy.onBeforeCompile=original.onBeforeCompile;assert.equal(nativeDepthRecipe(copy),null);assert.equal(standardDepthMaterial(copy),null);
 const forged=new THREE.MeshStandardMaterial();forged.onBeforeCompile=()=>{};forged.userData.worldDepthStandard=true;forged.userData.paintUniforms=original.userData.paintUniforms;assert.equal(standardDepthMaterial(forged),null);
 let disposed=0;first.addEventListener('dispose',()=>disposed++);source.dispose();assert.equal(disposed,1);original.dispose();copy.dispose();forged.dispose();
});

test('missing authored fluid uniforms fails closed rather than using an unclipped depth material',()=>{
 const source=water({bounds:[0,0,8,8]});delete source.userData.paintUniforms.uFluidBounds;assert.equal(standardDepthMaterial(source),null);source.dispose();
});

test('cached depth is owned by source and disposed exactly once without disposing borrowed maps/bounds',()=>{
 const source=water(),map=new THREE.Texture();source.map=map;let mapDisposals=0,depthDisposals=0;map.addEventListener('dispose',()=>mapDisposals++);const depth=standardDepthMaterial(source);depth.addEventListener('dispose',()=>depthDisposals++);const bounds=source.userData.paintUniforms.uFluidBounds.value;
 for(let i=0;i<8;i++)assert.equal(standardDepthMaterial(source),depth);source.dispose();source.dispose();assert.equal(depthDisposals,1);assert.equal(mapDisposals,0);assert.equal(source.userData.paintUniforms.uFluidBounds.value,bounds);map.dispose();
});

test('actual capture restores all borrowed materials, colorWrite and visibility on success/render-error/cancel/loss',()=>{
 for(const failure of [null,Error('render fault'),Error('cancelled owner'),Error('context loss')]){
  const scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(),waterSource=water({bounds:[0,0,8,8]}),lavaSource=water({lava:true}),a=new THREE.Mesh(geometry,waterSource),b=new THREE.InstancedMesh(geometry,lavaSource,2);scene.add(a,b);let disposed=0;for(const source of [waterSource,lavaSource])source.addEventListener('dispose',()=>disposed++);
  const run=()=>withDepthCaptureMaterials(scene,stats=>{assert.equal(stats.specialized,2);assert.ok(a.material.isMeshDepthMaterial);assert.ok(b.material.isMeshDepthMaterial);assert.equal(a.material.colorWrite,false);if(failure)throw failure;});
  if(failure)assert.throws(run,error=>error===failure);else run();assert.equal(a.material,waterSource);assert.equal(b.material,lavaSource);for(const source of [waterSource,lavaSource]){assert.equal(source.colorWrite,true);assert.equal(source.visible,true);}assert.equal(disposed,0);waterSource.dispose();lavaSource.dispose();b.dispose();geometry.dispose();
 }
});

test('cloneable userData replacement cannot redirect closure-owned fluid depth uniforms',()=>{
 const source=water({bounds:[-8,-4,12,16]}),owned=source.userData.paintUniforms;
 source.userData.paintUniforms={uFluidClip:{value:0},uFluidBounds:{value:new THREE.Vector4(0,0,0,0)}};
 const color=compile(source),depth=compile(standardDepthMaterial(source));assert.equal(color.uniforms.uFluidClip,owned.uFluidClip);assert.equal(depth.uniforms.uFluidClip,owned.uFluidClip);assert.equal(depth.uniforms.uFluidBounds,owned.uFluidBounds);
 owned.uFluidBounds.value.set(1,2,3,4);assert.deepEqual(depth.uniforms.uFluidBounds.value.toArray(),[1,2,3,4]);source.dispose();
});
