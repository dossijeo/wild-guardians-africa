import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {positionLocal} from 'three/tsl';
import {MeshBasicNodeMaterial,WebGPURenderer} from 'three/webgpu';
import ChainMap from '../node_modules/three/src/renderers/common/ChainMap.js';
import RenderObjects from '../node_modules/three/src/renderers/common/RenderObjects.js';
import {patchOverrideRendererSource,patchOverrideRenderObjectsSource,patchOverrideRenderObjectSource,patchOverrideChainMapSource} from '../tools/patch-three-source-material.mjs';

test('source material backport is reproducible for source and both bundles and rejects unfamiliar classes',async()=>{
 for(const [patch,file] of [[patchOverrideRendererSource,'Renderer'],[patchOverrideRenderObjectsSource,'RenderObjects'],[patchOverrideRenderObjectSource,'RenderObject'],[patchOverrideChainMapSource,'ChainMap']]){
  for(const path of [`src/renderers/common/${file}.js`,'build/three.webgpu.js','build/three.webgpu.nodes.js']){const source=await readFile(`node_modules/three/${path}`,'utf8');assert.equal(patch(source),source);}
  assert.throws(()=>patch('unfamiliar source'),/Unexpected/);
 }
});

test('shadow source context and original position node restore even if drawing fails',()=>{
 const source=new MeshBasicNodeMaterial(),override=new MeshBasicNodeMaterial(),original=positionLocal,displaced=positionLocal.mul(2),object=new THREE.Mesh(new THREE.BoxGeometry(),source),scene=new THREE.Scene(),previous={};override.isShadowPassMaterial=true;override.positionNode=original;source.positionNode=displaced;scene.overrideMaterial=override;const failure=Error('draw failed');let calls=0;
 const renderer={_currentSourceMaterial:previous,_handleObjectFunction(mesh,material){calls++;assert.equal(this._currentSourceMaterial,source);assert.equal(material,override);assert.equal(material.positionNode,displaced);throw failure;}};
 try{assert.throws(()=>WebGPURenderer.prototype.renderObject.call(renderer,object,scene,new THREE.PerspectiveCamera(),object.geometry,source,null,{}),error=>error===failure);assert.equal(calls,1);assert.equal(renderer._currentSourceMaterial,previous);assert.equal(override.positionNode,original);}finally{source.dispose();override.dispose();object.geometry.dispose();}
});

test('nested draws retain their own source owner and restore the enclosing owner before returning',()=>{
 const a=new MeshBasicNodeMaterial(),b=new MeshBasicNodeMaterial(),override=new MeshBasicNodeMaterial(),object=new THREE.Mesh(new THREE.BoxGeometry(),a),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),seen=[];scene.overrideMaterial=override;override.isShadowPassMaterial=true;
 const renderer={_currentSourceMaterial:null,_handleObjectFunction(){seen.push(this._currentSourceMaterial);if(this._currentSourceMaterial===a){WebGPURenderer.prototype.renderObject.call(this,object,scene,camera,object.geometry,b,null,{});assert.equal(this._currentSourceMaterial,a);}}};
 try{WebGPURenderer.prototype.renderObject.call(renderer,object,scene,camera,object.geometry,a,null,{});assert.deepEqual(seen,[a,b]);assert.equal(renderer._currentSourceMaterial,null);}finally{a.dispose();b.dispose();override.dispose();object.geometry.dispose();}
});

test('actual render objects keep old and candidate shadows separate and retire each with its source material',()=>{
 const renderer={_currentSourceMaterial:null,backend:{isWebGPUBackend:true}},removed=[],manager=new RenderObjects(renderer,{getCacheKey:()=>0,delete:value=>removed.push(value)},{},{delete(){}},{delete(){}},{}),a=new MeshBasicNodeMaterial(),b=new MeshBasicNodeMaterial(),shadow=new MeshBasicNodeMaterial(),geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,a),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),lights={},context={};
 const get=source=>{renderer._currentSourceMaterial=source;return manager.get(mesh,shadow,scene,camera,lights,context,null,'shadow');};
 try{const old=get(a),candidate=get(b);assert.notEqual(old,candidate);assert.equal(get(a),old);assert.equal(get(b),candidate);assert.equal(removed.length,0);assert.equal(old.getChainArray().at(-1),a);assert.equal(candidate.getChainArray().at(-1),b);a.needsUpdate=true;assert.equal(get(a),old);assert.equal(old.sourceMaterialVersion,a.version);a.dispose();assert.deepEqual(removed,[old]);assert.equal(get(b),candidate);assert(!a._listeners.dispose?.includes(old.onMaterialDispose));b.dispose();assert.deepEqual(removed,[old,candidate]);assert(!shadow._listeners.dispose?.includes(old.onMaterialDispose));assert(!shadow._listeners.dispose?.includes(candidate.onMaterialDispose));renderer._currentSourceMaterial=null;const ordinary=manager.get(mesh,shadow,scene,camera,lights,context,null,'shadow');assert.equal(ordinary.getChainArray().length,4);shadow.dispose();assert.deepEqual(removed,[old,candidate,ordinary]);}finally{geometry.dispose();}
});


test('mixed-length chain keys coexist without prefix collisions or deleting the other owner',()=>{
 const map=new ChainMap(),prefix=[{},{},{},{}],key=[...prefix,{}],a={},b={};map.set(prefix,a);map.set(key,b);assert.equal(map.get(prefix),a);assert.equal(map.get(key),b);assert.equal(map.delete(prefix),true);assert.equal(map.get(key),b);map.set(prefix,a);assert.equal(map.delete(key),true);assert.equal(map.get(prefix),a);assert.equal(map.get(key),undefined);
});
