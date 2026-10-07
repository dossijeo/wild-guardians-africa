import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {attachNativeGroundSeam} from '../tools/experiments/native-far-ground-seam.js';
const result=()=>({data:{positions:new Float32Array([0,1,0,0,0,0,0,1,1,0,0,1]),indices:new Uint32Array([0,1,2,2,1,3])},buildMs:2});
function setup(){
 const canvas=new EventTarget(),requests=[],streams=[];let lost=false,materialDisposals=0;
 const world={nearBounds:[0,0,1,1],nav:{config:{seed:712}},renderer:{domElement:canvas,getContext:()=>({isContextLost:()=>lost})}},candidate={impostors:new THREE.Group()},map=new THREE.DataTexture(new Uint8Array(16),2,2),ground={positions:new Float32Array(12),indices:new Uint32Array(6),bounds:{minX:-1,maxX:2,minZ:-1,maxZ:2},nx:1,nz:1,colorMap:{width:2,height:2,bounds:{minX:-1,maxX:2,minZ:-1,maxZ:2}}};
 const owner=attachNativeGroundSeam(candidate,ground,world,{streamFactory:()=>{const stream={closed:0,request(key,request){return new Promise((resolve,reject)=>requests.push({key,request,resolve,reject}));},dispose(){this.closed++;}};streams.push(stream);return stream;},createMaterial:()=>{const material=new THREE.MeshBasicMaterial({map});material.addEventListener('dispose',()=>materialDisposals++);return material;}});
 return {world,candidate,owner,requests,streams,map,canvas,setLost(value){lost=value;canvas.dispatchEvent(new Event(value?'webglcontextlost':'webglcontextrestored'));},disposals:()=>materialDisposals};
}
test('seam owner adopts once per rectangle and releases previous geometry without releasing its borrowed texture',async()=>{
 const h=setup();let mapDisposals=0;h.map.addEventListener('dispose',()=>mapDisposals++);const a=h.owner.update();assert.equal(h.owner.update(),a);h.requests[0].resolve(result());const first=await a;let geometryDisposals=0;first.geometry.addEventListener('dispose',()=>geometryDisposals++);
 h.world.nearBounds=[1,0,2,1];const b=h.owner.update();assert.equal(h.candidate.impostors.children[0],first);h.requests[1].resolve(result());await b;assert.equal(h.candidate.impostors.children.length,1);assert.equal(geometryDisposals,1);assert.equal(h.disposals(),1);assert.equal(mapDisposals,0);
 h.owner.dispose();h.owner.dispose();assert.equal(h.candidate.impostors.children.length,0);assert.equal(h.disposals(),2);assert.equal(mapDisposals,0);assert.equal(h.streams[0].closed,1);
});
test('late seam completion after owner closure cannot create a material or attach a mesh',async()=>{
 const h=setup(),pending=h.owner.update();h.owner.dispose();h.requests[0].resolve(result());assert.equal(await pending,null);assert.equal(h.candidate.impostors.children.length,0);assert.equal(h.owner.stats.adopted,0);assert.equal(h.disposals(),0);
 h.setLost(true);h.setLost(false);assert.equal(h.streams.length,1);assert.equal(await h.owner.update(),null);
});
test('superseded bounds and changed world configuration are rejected before creating resources',async()=>{
 const h=setup(),a=h.owner.update();h.world.nearBounds=[1,0,2,1];h.requests[0].resolve(result());assert.equal(await a,null);assert.equal(h.candidate.impostors.children.length,0);
 const b=h.owner.update();h.world.nav.config.seed=713;h.requests[1].resolve(result());assert.equal(await b,null);assert.equal(h.owner.stats.adopted,0);await assert.rejects(h.owner.update(),/configuration/);h.owner.dispose();
});
test('context restoration retains old owned geometry and rejects old generation before replacement',async()=>{
 const h=setup(),a=h.owner.update();h.requests[0].resolve(result());const first=await a;h.world.nearBounds=[1,0,2,1];const old=h.owner.update();h.setLost(true);assert.equal(h.streams[0].closed,1);assert.equal(h.candidate.impostors.children[0],first);h.setLost(false);const fresh=h.owner.update();h.requests[1].resolve(result());assert.equal(await old,null);assert.equal(h.candidate.impostors.children[0],first);h.requests[2].resolve(result());await fresh;assert.equal(h.owner.stats.adopted,2);assert.equal(h.disposals(),1);h.owner.dispose();assert.equal(h.streams[1].closed,1);
});
test('unchanged frames reuse the completed promise without workers or context queries',async()=>{
 const h=setup(),first=h.owner.update();h.requests[0].resolve(result());await first;const cached=h.owner.update();h.world.renderer.getContext=()=>{throw Error('Unexpected per-frame GL query');};
 for(let i=0;i<120;i++)assert.equal(h.owner.update(),cached);assert.equal(h.requests.length,1);h.world.nav.config.seed=714;await assert.rejects(h.owner.update(),/configuration/);h.owner.dispose();
});
