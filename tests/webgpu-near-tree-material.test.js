import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {configureWebGpuNearTree} from '../src/rendering/webgpu-near-tree-material.js';
import {biomeSurfaceRecipe} from '../src/rendering/webgpu-material-graph-catalog.js';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {readFile} from 'node:fs/promises';

test('near tree graph keeps alpha map and blends original and detailed color and packed maps in WGSL',()=>{
 const original=new THREE.Texture(),near=new THREE.Texture(),originalPacked=new THREE.Texture(),nearPacked=new THREE.Texture(),material=new MeshStandardNodeMaterial({map:near,roughnessMap:nearPacked,metalnessMap:nearPacked}),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;near.channel=nearPacked.channel=1;
 try{geometry.setAttribute('uv1',geometry.attributes.uv.clone());configureWebGpuNearTree(material,{originalColor:original,originalPacked,nearPacked,blendStart:18,blendEnd:26});const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.equal(material.map,near);assert.ok(material.colorNode&&material.roughnessNode&&material.metalnessNode);assert.match(builder.fragmentShader,/smoothstep/);assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/18\.0/);assert.match(builder.fragmentShader,/26\.0/);assert.match(builder.vertexShader,/uv1/);}
 finally{geometry.dispose();material.dispose();for(const item of [original,near,originalPacked,nearPacked])item.dispose();}
});

test('near blend is an explicit recipe variant and validates its inputs',()=>{
 const texture=new THREE.Texture(),material=new MeshStandardNodeMaterial({map:texture}),base=biomeSurfaceRecipe({map:texture}),blended=biomeSurfaceRecipe({map:texture,nearBlend:true});try{assert.notEqual(base.key,blended.key);assert.equal(blended.structural.nodeMaterial,true);assert.throws(()=>configureWebGpuNearTree(material,{originalColor:texture,originalPacked:null,nearPacked:null,blendStart:5,blendEnd:5}),/near tree/);}finally{material.dispose();texture.dispose();}
});

for(const [biome,file,packed] of [['sabana','savanna',false],['volcanes','volcanoes',true]])test(`real ${biome} biome connects its near and original atlases`,async()=>{
 const pack=JSON.parse(await readFile(new URL(`../public/content/biome-${file}.json`,import.meta.url),'utf8')),scene=new THREE.Scene(),requests=[],props=createWebGpuBiomeProps({scene,state:{biome,suppressed:[]},biomePack:pack,initialSlots:[0],instanceContract:'attributes',byteLoader:async url=>{const bytes=await readFile(new URL('../public'+url,import.meta.url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},imageLoader:async url=>{requests.push(url);return {close(){}};}});
 try{assert.equal(await props.ready,true);const instances=Array.from({length:20},()=>[]);instances[0].push({id:'tree',x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});props.replace({cx:0,cz:0,instances},1);const mesh=scene.children[0],material=mesh.material,source=pack.assets[0].textureSet===undefined?pack.textures:pack.textureSets[pack.assets[0].textureSet];assert.ok(mesh.geometry.getAttribute('uv1'));assert.ok(material.colorNode);assert.equal(material.map.channel,1);assert.equal(!!material.roughnessNode,packed);assert.equal(!!material.metalnessNode,packed);assert.ok(requests.some(url=>url===pack.assets[0].nearTextures.textures.baseColor));assert.ok(requests.some(url=>url===source.find(item=>item.role==='baseColor').base64.url));const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgOffset/);assert.match(builder.fragmentShader,/smoothstep/);}finally{props.dispose();}
});
