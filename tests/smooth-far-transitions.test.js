import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {smoothFarTransitionsEnabled,smoothStandbyMaterial} from '../src/rendering/smooth-far-transitions.js';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
import {NativeTreeStandby,standbyTreeKey} from '../tools/experiments/native-tree-standby.js';

function fixture(scene=new THREE.Scene()){
 const source={geometry:new THREE.BoxGeometry(),material:new THREE.MeshStandardMaterial()},texture=new THREE.Texture();
 const metadata={impostorWidth:2,impostorHeight:4,localBase:[0,0,0],impostorHull:[[0,.2],[.2,0],[.8,0],[1,.2],[1,.8],[.8,1],[.2,1],[0,.8]]};
 const trees=[{id:'near',x:0,y:0,z:-1,yaw:0,scale:1},{id:'far',x:0,y:0,z:-10,yaw:0,scale:1}];
 const p=createFarImpostorPrototype(source,texture,metadata,trees,{nativeModels:false,smoothScene:scene});
 return {p,source,texture,scene,close(){p.dispose({disposeTexture:false});source.geometry.dispose();source.material.dispose();texture.dispose();}};
}

test('smooth far remains an explicit visual-lab opt-in',()=>{
 assert.equal(smoothFarTransitionsEnabled('?farTransitions=smooth'),false);
 assert.equal(smoothFarTransitionsEnabled('?visualLab=global-lighting'),false);
 assert.equal(smoothFarTransitionsEnabled('?visualLab=global-lighting&farTransitions=smooth'),true);
});

test('scene-owned sorted views preserve canonical IDs, hull updates and borrowed resources',()=>{
 const scene=new THREE.Scene(),previous=scene.onBeforeRender,f=fixture(scene),camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
 const g=f.p.impostors.geometry,opaque=f.p.impostors.children[0];
 f.p.setTreeReadiness('near',.25);f.p.setTreeReadiness('far',.75);f.p.prepareSmoothFar(camera);
 assert.deepEqual([...g.attributes.aTreeBase.array],[0,0,-10,0,0,-1]);assert.deepEqual([...g.attributes.aTreeReady.array],[.75,.25]);
 f.p.setTreeEnabled('far',false);scene.onBeforeRender(null,scene,camera);assert.equal(g.attributes.aTreeReady.getX(0),-1);assert.equal(f.p.treeState('near').ready,.25);
 const oldVersion=g.index.version;f.p.setHullEnabled(false);scene.onBeforeRender(null,scene,camera);assert.equal(g.drawRange.count,6);assert.ok(g.index.version>oldVersion);
 assert.equal(f.p.impostors.material.transparent,true);assert.equal(opaque.material.depthWrite,true);assert.equal(opaque.material.transparent,false);assert.equal(opaque.geometry,g);
 for(const m of [f.p.impostors.material,opaque.material]){assert.equal(m.uniforms,f.p.uniforms);const shader={fragmentShader:m.fragmentShader};m.onBeforeCompile(shader);assert.ok(!shader.fragmentShader.includes('if(coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;'));assert.ok(shader.fragmentShader.includes('gl_FragColor.a=clamp'));}
 let borrowed=0,owned=0;f.texture.addEventListener('dispose',()=>borrowed++);f.source.material.addEventListener('dispose',()=>borrowed++);f.source.geometry.addEventListener('dispose',()=>borrowed++);
 for(const o of [g,f.p.impostors.material,opaque.material])o.addEventListener('dispose',()=>owned++);
 f.p.dispose({disposeTexture:false});assert.equal(owned,3);assert.equal(borrowed,0);assert.equal(scene.onBeforeRender,previous);assert.equal(f.p.impostors.children.length,0);
 f.source.geometry.dispose();f.source.material.dispose();f.texture.dispose();
});

test('one region disposal does not unregister another region, and later scene hooks survive',()=>{
 const scene=new THREE.Scene(),previous=scene.onBeforeRender,a=fixture(scene),hook=scene.onBeforeRender,b=fixture(scene);
 a.close();assert.equal(scene.onBeforeRender,hook);const later=function(){};scene.onBeforeRender=later;b.close();assert.equal(scene.onBeforeRender,later);
 scene.onBeforeRender=previous;const c=fixture(scene);c.close();assert.equal(scene.onBeforeRender,previous);
});

test('smooth standby owns its clone and leaves source materials unchanged on disposal',async()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),scene=new THREE.Scene();let sourceDisposed=0,cloneDisposed=0;material.addEventListener('dispose',()=>sourceDisposed++);
 const owner=new NativeTreeStandby({scene,sources:[{geometry,material}],smoothTransitions:true,prepare:async()=>{}});
 const tree={id:'a',x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1};owner.request([{id:'a',key:standbyTreeKey(tree),x:0,z:0,level:0,matrix:new THREE.Matrix4().toArray()}],{x:0,z:0});
 for(let i=0;i<30&&owner.busy;i++)await new Promise(setImmediate);
 assert.equal(owner.busy,false);assert.deepEqual(owner.stats.errors,[]);const mesh=owner.active.meshes[0];assert.equal(mesh.userData.materialRegistryExcluded,true);assert.notEqual(mesh.material,material);assert.equal(mesh.material.side,THREE.FrontSide);assert.equal(material.transparent,false);
 mesh.material.addEventListener('dispose',()=>cloneDisposed++);owner.dispose();owner.dispose();assert.equal(cloneDisposed,1);assert.equal(sourceDisposed,0);geometry.dispose();material.dispose();
});
