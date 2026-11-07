import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import NodeFrame from '../node_modules/three/src/nodes/core/NodeFrame.js';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuVfxSoftDepth,createWebGpuVfxSpriteGraph,createWebGpuVfxSpriteMaterial,bindWebGpuVfxSpriteObject} from '../src/rendering/webgpu-vfx-sprite-material.js';

test('sprite effects share shader graphs while material references remain independent',()=>{
 const atlas=new THREE.Texture(),graph=createWebGpuVfxSpriteGraph(atlas),material=createWebGpuVfxSpriteMaterial(graph),meshes=[new THREE.Mesh(new THREE.BufferGeometry(),material),new THREE.Mesh(new THREE.BufferGeometry(),material)],a=bindWebGpuVfxSpriteObject(meshes[0]),b=bindWebGpuVfxSpriteObject(meshes[1]),frame=new NodeFrame();
 try{assert.equal(createWebGpuVfxSpriteGraph(atlas),graph);assert.equal(meshes[0].material,meshes[1].material);for(const [key,value] of Object.entries(graph.recipe.structural.state))assert.equal(material[key],value);a.uEye.value.set(1,2,3);b.uEye.value.set(7,8,9);a.lightCol[0].value.set(.1,.2,.3);b.lightCol[0].value.set(.4,.5,.6);const key=material.customProgramCacheKey();
  for(const mesh of meshes){frame.material=material;frame.object=mesh;for(const ref of Object.values(graph.references)){frame.updateNode(ref);assert.equal(ref.node.value,mesh[ref.property]);}}
  a.uEye.value.x=15;assert.equal(b.uEye.value.x,7);assert.equal(material.customProgramCacheKey(),key);
 }finally{material.dispose();for(const mesh of meshes)mesh.geometry.dispose();atlas.dispose();}
});
test('sprite graph distinguishes incompatible atlas layouts and resource identities',()=>{const a=new THREE.Texture(),b=new THREE.Texture();try{const first=createWebGpuVfxSpriteGraph(a);assert.notEqual(createWebGpuVfxSpriteGraph(b),first);a.channel=1;assert.notEqual(createWebGpuVfxSpriteGraph(a),first);}finally{a.dispose();b.dispose();}});

test('lit world does not request normals or duplicate lighting for authored billboard output',()=>{
 const atlas=new THREE.Texture(),graph=createWebGpuVfxSpriteGraph(atlas),material=createWebGpuVfxSpriteMaterial(graph),geometry=new THREE.InstancedBufferGeometry();
 for(const [name,size] of Object.entries({position:3,aCorner:2,iPos:3,iSize:2,iAngle:1,iRect:4,iNext:4,iColor:4,iParams:4,iDirection:3}))geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(size*3),size));
 const object=new THREE.Mesh(geometry,material);bindWebGpuVfxSpriteObject(object);const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});renderer.hasFeature=()=>true;
 const warn=console.warn,warnings=[];console.warn=(...args)=>warnings.push(args.join(' '));
 try{const builder=renderer.backend.createNodeBuilder(object,renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.lightsNode=renderer.lighting.createNode([new THREE.DirectionalLight(),new THREE.PointLight()]);builder.build();assert.equal(material.lights,false);assert.equal(material.outputNode,graph.outputNode);assert.deepEqual(warnings,[]);assert.equal(geometry.hasAttribute('normal'),false);assert.doesNotMatch(builder.vertexShader,/normalLocal|normalView/);assert.match(builder.fragmentShader,/textureSample/);}finally{console.warn=warn;material.dispose();geometry.dispose();atlas.dispose();}
});

test('optional terrain depth graph shares bindings, supports resizing and builds WGSL without a GPU',()=>{
 const atlas=new THREE.Texture(),depth=new THREE.DepthTexture(8,8),replacement=new THREE.DepthTexture(16,16),binding=createWebGpuVfxSoftDepth(depth);
 const graph=createWebGpuVfxSpriteGraph(atlas,binding),fallback=createWebGpuVfxSpriteGraph(atlas),material=createWebGpuVfxSpriteMaterial(graph),geometry=new THREE.BufferGeometry(),mesh=new THREE.Mesh(geometry,material),other=new THREE.Mesh(geometry,material),values=bindWebGpuVfxSpriteObject(mesh),otherValues=bindWebGpuVfxSpriteObject(other);
 const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
 for(const [name,size] of Object.entries({aCorner:2,iPos:3,iSize:2,iAngle:1,iRect:4,iNext:4,iColor:4,iParams:4,iDirection:3}))geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(size*3),size));
 try{
  assert.notEqual(graph,fallback);assert.equal(createWebGpuVfxSpriteGraph(atlas,binding),graph);assert.equal(createWebGpuVfxSpriteGraph(atlas),fallback);assert.equal(values.uSoftDepth.value,0);values.uSoftDepth.value=1;values.uSoftDepthScale.value=2;assert.equal(otherValues.uSoftDepth.value,0);
  const frame=new NodeFrame();frame.material=material;frame.object=mesh;for(const ref of Object.values(graph.references)){frame.updateNode(ref);assert.equal(ref.node.value,mesh[ref.property]);}
  for(const camera of [new THREE.PerspectiveCamera(),new THREE.OrthographicCamera()]){
   const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new THREE.Scene();builder.camera=camera;builder.build();const wgsl=builder.fragmentShader,depthName=wgsl.match(/var (\w+)\s*:\s*texture_depth_2d/)[1],guard=wgsl.match(/if\s*\(\s*\(\s*\(\s*object\.\w+\s*>\s*0\.5\s*\)\s*&&/);assert.ok(guard,'depth is guarded by the per-object enable flag');
   const start=wgsl.indexOf('{',guard.index);let nesting=1,end=start+1;while(nesting&&end<wgsl.length){if(wgsl[end]==='{')nesting++;else if(wgsl[end]==='}')nesting--;end++;}assert.equal(nesting,0);const loads=[...wgsl.matchAll(new RegExp(`textureLoad\\(\\s*${depthName}\\b`,'g'))];assert.ok(loads.length>0);for(const load of loads)assert.ok(load.index>start&&load.index<end,'depth texture is never read outside its guard');assert.match(wgsl,/smoothstep/);
  }
  const key=material.customProgramCacheKey();binding.setDepthTexture(replacement);assert.equal(binding.depthNode.value,replacement);assert.equal(createWebGpuVfxSpriteGraph(atlas,binding),graph);assert.equal(material.customProgramCacheKey(),key);assert.throws(()=>binding.setDepthTexture(atlas),/Invalid/);
 }finally{material.dispose();geometry.dispose();atlas.dispose();depth.dispose();replacement.dispose();}
});
