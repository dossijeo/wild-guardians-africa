import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {texture,uniform} from 'three/tsl';
import {createWebGpuDesertGround} from '../src/rendering/webgpu-desert-ground.js';
import {desertGroundRecipe} from '../src/rendering/webgpu-material-graph-catalog.js';
import {readFile,access} from 'node:fs/promises';
import {assetUrl} from '../src/rendering/asset-url.js';

const tile={base:'sand-base',normal:'sand-normal',scale:.1,blend:.58,normalBoost:1,jitter:.16};
const fetchImpl=async()=>({ok:true,json:async()=>({desert:tile})});

test('desert loads its two original atlases, shares its graph and keeps chunk masks independent',async()=>{
 const images=[],requests=[],provider=await createWebGpuDesertGround({fetchImpl,imageLoader:async url=>{requests.push(url);const image={closed:false,close(){this.closed=true;}};images.push(image);return image;}}),mask=new Uint8Array(35*35*4),a=provider.create({cx:0,cz:0,groundMask:mask}),b=provider.create({cx:1,cz:-1});
 try{assert.deepEqual(requests,['sand-base','sand-normal']);assert.equal(a.outputNode,b.outputNode);assert.equal(a._wgGroundMask.image.data,mask);assert.notEqual(a._wgGroundMask,b._wgGroundMask);assert.deepEqual(b._wgGroundMin.toArray(),[24,-72]);assert.deepEqual(Array.from(b._wgGroundMask.image.data),[0,128,0,0]);assert.throws(()=>provider.create({cx:0,cz:0,groundMask:new Uint8Array(2)}),/mask/);let disposed=0;a._wgGroundMask.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,1);assert.ok(images.every(image=>!image.closed));}finally{b.dispose();provider.dispose();}assert.ok(images.every(image=>image.closed));
});

test('desert graph builds WGSL from position, normal, vertex color and both sand textures',async()=>{
 const provider=await createWebGpuDesertGround({fetchImpl,imageLoader:async()=>({close(){}})}),material=provider.create({cx:0,cz:0}),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.equal(material.vertexColors,true);assert.match(builder.vertexShader,/color/i);assert.match(builder.fragmentShader,/textureSampleGrad/);assert.match(builder.fragmentShader,/0\.58/);}finally{material.dispose();geometry.dispose();provider.dispose();}
});

test('desert reflection shares stable environment bindings and builds the mipmapped WGSL graph',async()=>{
 const placeholder=new THREE.DataTexture(new Uint8Array([64,64,64,255]),1,1);placeholder.minFilter=THREE.LinearMipmapLinearFilter;placeholder.magFilter=THREE.LinearFilter;const environment={day:texture(placeholder),dark:texture(placeholder),night:uniform(0),blend:uniform(0)},provider=await createWebGpuDesertGround({fetchImpl,environment,imageLoader:async()=>({close(){}})}),material=provider.create({cx:0,cz:0}),geometry=new THREE.PlaneGeometry(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/textureSampleLevel/);assert.match(builder.fragmentShader,/atan2/);environment.blend.value=1;assert.equal(environment.day.value,placeholder);const options={textures:[new THREE.Texture(),new THREE.Texture()],scale:.1,blend:.58,normalBoost:1,jitter:.16};try{assert.notEqual(desertGroundRecipe(options).key,desertGroundRecipe({...options,environment:true}).key);}finally{options.textures.forEach(t=>t.dispose());}}finally{material.dispose();geometry.dispose();provider.dispose();placeholder.dispose();}
});

test('invalid options fail before loading and pipeline recipe captures texture identities',async()=>{
 let calls=0;await assert.rejects(createWebGpuDesertGround({fetchImpl:async()=>{calls++;return fetchImpl();},light:{}}),/options/);assert.equal(calls,0);
 const textures=[new THREE.Texture(),new THREE.Texture()],options={textures,scale:.1,blend:.58,normalBoost:1,jitter:.16};try{const first=desertGroundRecipe(options);assert.equal(first.key,desertGroundRecipe(options).key);assert.notEqual(first.key,desertGroundRecipe({...options,textures:[textures[1],textures[0]]}).key);assert.notEqual(first.key,desertGroundRecipe({...options,blend:.5}).key);assert.throws(()=>desertGroundRecipe({...options,textures:[textures[0]]}),/recipe/);}finally{textures.forEach(texture=>texture.dispose());}
});

test('the real desert catalogue supplies both existing assets',async()=>{
 const catalogue=JSON.parse(await readFile(new URL('../public/content/ground-materials.json',import.meta.url),'utf8')),requests=[],provider=await createWebGpuDesertGround({fetchImpl:async()=>({ok:true,json:async()=>catalogue}),imageLoader:async url=>{requests.push(url);await access(new URL('../public'+url,import.meta.url));return {close(){}};}});
 try{provider.update({seed:'desert-check',time:0});assert.deepEqual(requests,[assetUrl(catalogue.desert.base),assetUrl(catalogue.desert.normal)]);}finally{provider.dispose();}
});

test('cancellation during GPU upload releases the bitmap only after the submitted work',async()=>{
 const controller=new AbortController(),images=[],waiters=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>new Promise(resolve=>waiters.push(resolve))}}},initTexture(){}},pending=createWebGpuDesertGround({renderer,signal:controller.signal,fetchImpl,imageLoader:async()=>{const image={closed:false,close(){this.closed=true;}};images.push(image);return image;}});
 for(let i=0;i<10&&!waiters.length;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(waiters.length,1);const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();await rejected;assert.equal(images[0].closed,false);waiters[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(images[0].closed,true);
});
