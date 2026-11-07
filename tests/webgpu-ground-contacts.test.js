import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWebGpuGroundContacts} from '../src/rendering/webgpu-ground-contacts.js';
import {buildContactData} from '../src/rendering/contact-source.js';
import {rasterBuildingContacts} from '../src/rendering/building-contacts.js';
import {SLOTS} from '../src/world/terrain.js';
import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuSavannaGround} from '../src/rendering/webgpu-savanna-ground.js';
import {createWebGpuVolcanicGround} from '../src/rendering/webgpu-volcanic-ground.js';
import {createWebGpuMangroveGround} from '../src/rendering/webgpu-mangrove-ground.js';

test('contact atlas follows published chunks, suppression and removal without duplicate rebuilds',async()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')),contact=createWebGpuGroundContacts({pack}),instances=Array.from({length:20},()=>[]),radii=pack.assets.map(asset=>Math.max(asset.max[0]-asset.min[0],asset.max[2]-asset.min[2])*.5),tree={id:'tree',x:0,z:0,sx:1,sz:1};instances[0].push(tree);
 try{contact.replace({cx:0,cz:0,instances,radii});await Promise.resolve();const prototypes=pack.assets.map((asset,slot)=>({group:pack.profile?.assetGroups?.[slot]??SLOTS[slot].g,radius:radii[slot]})),expected=buildContactData(prototypes,instances,[-24,-24,24,24],[true,true,true,true,true,true]);assert.deepEqual(contact.texture.image.data,expected.pixels);assert.deepEqual(contact.status().bounds,expected.bounds);assert.equal(contact.status().revision,1);contact.replace({cx:0,cz:0,instances,radii});await Promise.resolve();assert.equal(contact.status().revision,1);contact.replace({cx:0,cz:0,instances:Array.from({length:20},()=>[]),radii});await Promise.resolve();assert.ok(contact.texture.image.data.every(value=>value===255));contact.remove(0,0);await Promise.resolve();assert.equal(contact.status().chunks,0);contact.dispose();assert.equal(contact.status().closed,true);}finally{contact.dispose();}
});

test('optional confirmed building contacts match the original atlas and coalesce changes',async()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')),contact=createWebGpuGroundContacts({pack,buildings:true}),instances=Array.from({length:20},()=>[]),radii=pack.assets.map(asset=>Math.max(asset.max[0]-asset.min[0],asset.max[2]-asset.min[2])*.5),state={culture:'suajili',villages:[],structures:[{id:'c',kind:'center',x:0,z:0,status:'intact',culture:'suajili',yaw:0},{id:'w',kind:'wall',x:5,z:2,status:'intact',material:'adobe',hp:100,maxHp:100}]};
 try{contact.setBuildings(state);contact.replace({cx:0,cz:0,instances,radii});await Promise.resolve();const prototypes=pack.assets.map((asset,slot)=>({group:pack.profile?.assetGroups?.[slot]??SLOTS[slot].g,radius:radii[slot]})),expected=buildContactData(prototypes,instances,[-24,-24,24,24],[true,true,true,true,true,true]);rasterBuildingContacts(expected,state);assert.deepEqual(contact.texture.image.data,expected.pixels);assert.equal(contact.status().revision,1);assert.equal(contact.setBuildings(state),false);await Promise.resolve();assert.equal(contact.status().revision,1);state.structures[1].hp=20;state.structures[0].status='ruined';assert.equal(contact.setBuildings(state),true);await Promise.resolve();assert.equal(contact.status().revision,2);const changed=buildContactData(prototypes,instances,[-24,-24,24,24],[true,true,true,true,true,true]);rasterBuildingContacts(changed,state);assert.deepEqual(contact.texture.image.data,changed.pixels);state.structures=[];contact.setBuildings(state);await Promise.resolve();assert.ok(contact.texture.image.data.every(value=>value===255));}finally{contact.dispose();}
});

test('building contacts remain disabled by default',async()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')),contact=createWebGpuGroundContacts({pack}),instances=Array.from({length:20},()=>[]),radii=pack.assets.map(asset=>Math.max(asset.max[0]-asset.min[0],asset.max[2]-asset.min[2])*.5);try{contact.replace({cx:0,cz:0,instances,radii});assert.equal(contact.setBuildings({structures:[{id:'c',kind:'center',x:0,z:0,status:'intact'}]}),false);await Promise.resolve();assert.ok(contact.texture.image.data.every(value=>value===255));}finally{contact.dispose();}
});

test('the deferred raster uses the last confirmed structure snapshot',async()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')),contact=createWebGpuGroundContacts({pack,buildings:true}),instances=Array.from({length:20},()=>[]),radii=pack.assets.map(asset=>Math.max(asset.max[0]-asset.min[0],asset.max[2]-asset.min[2])*.5),state={culture:'suajili',villages:[],structures:[{id:'c',kind:'center',x:0,z:0,status:'intact',culture:'suajili',yaw:0}]};
 try{const published=structuredClone(state);contact.replace({cx:0,cz:0,instances,radii});contact.setBuildings(state);state.structures[0].status='ruined';await Promise.resolve();const prototypes=pack.assets.map((asset,slot)=>({group:pack.profile?.assetGroups?.[slot]??SLOTS[slot].g,radius:radii[slot]})),expected=buildContactData(prototypes,instances,[-24,-24,24,24],[true,true,true,true,true,true]);rasterBuildingContacts(expected,published);assert.deepEqual(contact.texture.image.data,expected.pixels);contact.setBuildings(state);await Promise.resolve();assert.ok(contact.texture.image.data.every(value=>value===255));}finally{contact.dispose();}
});

test('terrain families with contact shading generate a stable shader',async()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')),contact=createWebGpuGroundContacts({pack}),tile={base:'base',normal:'normal',arh:'arh',scale:.1,blend:1,normalBoost:1,relief:.1,jitter:.1},fetchImpl=async()=>({ok:true,json:async()=>({savanna:tile,grand_river:tile,canyons:tile,volcanoes:tile,mangrove:tile,desert:tile})}),imageLoader=async()=>({close(){}}),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;
 try{for(const [create,biome] of [[createWebGpuSavannaGround,'savanna'],[createWebGpuSavannaGround,'grand_river'],[createWebGpuSavannaGround,'canyons'],[createWebGpuVolcanicGround,null],[createWebGpuMangroveGround,null] ]){const provider=await create({contact,fetchImpl,imageLoader,...(biome?{biome}:{})}),material=provider.sharedMaterial??provider.create({cx:0,cz:0,groundMask:new Uint8Array(35*35*4)}),geometry=new THREE.PlaneGeometry();geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));try{const builder=renderer.backend.createNodeBuilder(new THREE.Mesh(geometry,material),renderer);builder.scene=new THREE.Scene();builder.camera=new THREE.PerspectiveCamera();builder.build();assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/step\(/);}finally{if(material!==provider.sharedMaterial)material.dispose();geometry.dispose();provider.dispose();}}}finally{contact.dispose();}
});

test('all biome manifests allow contact atlas creation even without baked asset bounds',()=>{
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){const pack=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')),contact=createWebGpuGroundContacts({pack});assert.ok(contact.node.isNode);contact.dispose();}
});
