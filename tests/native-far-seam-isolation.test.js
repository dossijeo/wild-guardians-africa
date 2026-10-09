import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachNativeFarGround} from '../tools/experiments/native-far-ground.js';
import {releaseNativeFarGpuCache} from '../tools/experiments/prepare-native-far-gpu.js';

function fixture(isolated){
 const candidate={impostors:new THREE.Group(),dispose(){}},scene=new THREE.Scene(),resident=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
 resident.castShadow=true;scene.add(resident,candidate.impostors);scene.fog=new THREE.Fog('white',10,300);
 let viewport=new THREE.Vector4(2,3,1600,900),scissor=new THREE.Vector4(4,5,800,450),scissorTest=false;
 const draws=[],compiles=[],requests=[],fences=[];
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,CONDITION_SATISFIED:3,ALREADY_SIGNALED:2,WAIT_FAILED:4,isContextLost:()=>false,fenceSync:()=>{const fence={};fences.push(fence);return fence;},flush(){},clientWaitSync:()=>3,deleteSync(){}};
 const renderer={domElement:new EventTarget(),shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true},autoClear:true,getContext:()=>gl,initTexture(){},compileAsync:async(root,camera,actual)=>{compiles.push({root,actual});},getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setViewport:(...v)=>{viewport=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissor:(...v)=>{scissor=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissorTest:v=>{scissorTest=v;},render(actual,camera){
  assert.equal(actual,scene);assert.deepEqual(viewport.toArray(),[0,0,0,0]);assert.deepEqual(scissor.toArray(),[0,0,0,0]);assert.equal(scissorTest,true);assert.equal(this.autoClear,false);
  const submitted=[];actual.traverseVisible(mesh=>{if(mesh.isMesh){submitted.push(mesh);mesh.onBeforeRender(this,actual,camera);}});draws.push(submitted);
  assert.equal(this.shadowMap.enabled,true);assert.equal(this.shadowMap.autoUpdate,!isolated);assert.equal(this.shadowMap.needsUpdate,!isolated);
 }};
 const world={scene,renderer,camera:new THREE.PerspectiveCamera(),farIsolatedPreparation:isolated,nearBounds:[0,0,16,16],nav:{config:{seed:712,biome:'gran-rio'}},toon:{uniforms:{uWorldOrigin:{value:new THREE.Vector2()},uNight:{value:0}},environmentUniforms:{}},biomeGround:{attach(material){material.userData.biomeGround={uGroundMapped:{value:1},uGroundMicro:{value:1},uGroundRelief:{value:1}};}}};
 const data={positions:new Float32Array([0,0,0,16,0,0,0,0,16]),colors:new Float32Array(9).fill(.5),indices:new Uint32Array([0,2,1]),colorMap:{width:2,height:2,bounds:{minX:0,minZ:0,maxX:16,maxZ:16},data:new Uint8Array(16).fill(80),waterColor:[.2,.4,.6]}};
 const result=()=>({data:{positions:new Float32Array([0,1,0,0,0,0,0,1,1]),indices:new Uint32Array([0,1,2])},buildMs:0});
 attachNativeFarGround(candidate,data,world,{nativeWaterMask:true,seam:true,seamStreamFactory:()=>({request:()=>new Promise(resolve=>requests.push(()=>resolve(result()))),dispose(){}})});
 const restored=()=>{assert.deepEqual(viewport.toArray(),[2,3,1600,900]);assert.deepEqual(scissor.toArray(),[4,5,800,450]);assert.equal(scissorTest,false);assert.equal(renderer.autoClear,true);assert.equal(resident.visible,true);assert.deepEqual(renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});};
 return {world,candidate,resident,draws,compiles,requests,fences,restored,close(){candidate.dispose();releaseNativeFarGpuCache(renderer);resident.geometry.dispose();resident.material.dispose();}};
}

for(const isolated of [false,true])test(`seam uses live scene and preserves draw/fence/ownership with isolation ${isolated}`,async()=>{
 const h=fixture(isolated);h.requests[0]();await h.candidate.groundSeamReady;
 const first=h.candidate.impostors.children.find(m=>m.userData.farGroundSeam);assert.ok(first);assert.equal(first.castShadow,false);assert.equal(h.compiles[0].actual,h.world.scene);assert.equal(h.compiles[0].root,first);assert.equal(first.parent,h.candidate.impostors);
 assert.equal(h.draws[0].includes(h.resident),!isolated);assert.equal(h.draws[0].length,isolated?1:3);assert.ok(h.draws[0].includes(first));assert.equal(h.fences.length,1);h.restored();
 let finish;h.world.renderer.compileAsync=async(root,camera,actual)=>{assert.equal(actual,h.world.scene);await new Promise(resolve=>finish=resolve);};h.world.nearBounds=[16,0,32,16];h.candidate.updateGroundBounds();h.requests[1]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(first.parent,h.candidate.impostors);assert.equal(h.draws.length,1);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.candidate.groundSeamStats.adopted,2);
 const second=h.candidate.impostors.children.find(m=>m.userData.farGroundSeam);assert.notEqual(first,second);assert.equal(first.parent,null);assert.equal(second.parent,h.candidate.impostors);assert.equal(h.draws[1].length,isolated?1:4);assert.equal(h.draws[1].includes(first),!isolated);assert.equal(h.fences.length,2);h.restored();h.close();
});

test('isolated seam closed during compilation never uploads or adopts late geometry',async()=>{
 const h=fixture(true);let finish;h.world.renderer.compileAsync=async()=>new Promise(resolve=>finish=resolve);h.requests[0]();await new Promise(resolve=>setImmediate(resolve));h.candidate.dispose();finish();await h.candidate.groundSeamReady;
 assert.equal(h.draws.length,0);assert.equal(h.fences.length,0);assert.equal(h.candidate.impostors.children.length,0);h.restored();h.close();
});

test('isolated seam draw failure restores resident visibility/output state and rejects adoption',async()=>{
 const h=fixture(true),draw=h.world.renderer.render;
 h.world.renderer.render=function(...args){draw.apply(this,args);throw Error('seam draw fault');};h.requests[0]();await assert.rejects(h.candidate.groundSeamReady,/seam draw fault/);
 assert.equal(h.candidate.groundSeamStats.adopted,0);assert.equal(h.fences.length,0);assert.equal(h.candidate.impostors.children.filter(m=>m.userData.farGroundSeam).length,0);h.restored();h.close();
});
