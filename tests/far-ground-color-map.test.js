import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {farGroundColorMap,farGroundColorUvs} from '../tools/experiments/far-ground-color-map.js';
import {attachNativeFarGround} from '../tools/experiments/native-far-ground.js';
import {farGroundData,farGroundHeight} from '../tools/experiments/far-ground-data.js';
import {fitFarGroundContacts} from '../tools/experiments/far-ground-contacts.js';
import {farSceneTransferables} from '../tools/experiments/far-scene-data.js';
const bounds={minX:100,maxX:132,minZ:-64,maxZ:-32};
test('color grid is deterministic, bounded and independent of terrain triangle density',()=>{
 const calls=[],colorAt=(x,z)=>{calls.push([x,z]);return [(x-100)/32,(z+64)/32,.5];};
 const map=farGroundColorMap(bounds,{step:4,colorAt,wash:0});assert.equal(map.width,9);assert.equal(map.height,9);assert.equal(calls.length,81);assert.deepEqual(calls[0],[100,-64]);assert.deepEqual(calls.at(-1),[132,-32]);assert.deepEqual([...map.data.slice(0,4)],[0,0,128,255]);assert.deepEqual([...map.data.slice(-4)],[255,255,128,255]);
 assert.deepEqual(map,farGroundColorMap(bounds,{step:4,colorAt,wash:0}));assert.throws(()=>farGroundColorMap(bounds,{step:.001,colorAt}),/budget/);assert.throws(()=>farGroundColorMap(bounds,{step:4,colorAt:()=>[NaN,0,0]}),/sample/);
});
test('inserted contact vertices retain exact height and map world coordinates to texel centers',()=>{
 const field={surface:(x,z)=>.01*x+.02*z},data=farGroundData(field,bounds,{step:16}),fit=fitFarGroundContacts(data,[{id:'tree',x:111,y:12,z:-45}]),map=farGroundColorMap(bounds,{step:4,colorAt:()=>[.2,.3,.4]});
 const uv=farGroundColorUvs(fit.positions,map),vertex=fit.contactAnchors[0].vertex;
 assert.equal(farGroundHeight(fit,111,-45),12);assert.ok(Math.abs(uv[0]-.5/9)<1e-7);assert.ok(Math.abs(uv[vertex*2]-((11/32*8+.5)/9))<1e-7);assert.ok(Math.abs(uv[vertex*2+1]-((19/32*8+.5)/9))<1e-7);assert.equal(data.nx,2);assert.equal(map.width,9);
});
test('color map uses one owned sRGB texture, same near clipping and phase, and disposes with its candidate',()=>{
 const world={nearBounds:[100,-64,120,-40],toon:{uniforms:{uWorldOrigin:{value:new THREE.Vector2(96,-48)},uNight:{value:0}}}},candidate={impostors:new THREE.Mesh(),dispose(){this.closed=true;}},data=farGroundData({surface:()=>2},bounds,{step:16});data.colorMap=farGroundColorMap(bounds,{step:4,colorAt:()=>[.5,.4,.3]});
 attachNativeFarGround(candidate,data,world,{simplified:true});const mesh=candidate.impostors.children[0],texture=mesh.material.map;assert.equal(mesh.geometry.attributes.position.array,data.positions);assert.equal(mesh.geometry.index.array,data.indices);assert.equal(mesh.material.vertexColors,false);assert.equal(texture.image.data,data.colorMap.data);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);assert.deepEqual(candidate.farGroundTextures,[texture]);assert.equal(mesh.castShadow,false);
 const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <map_fragment>\n#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.uFarGroundNight,world.toon.uniforms.uNight);assert.ok(shader.fragmentShader.includes('diffuseColor.rgb*=mix'));assert.ok(shader.fragmentShader.includes('discard;'));assert.equal(shader.vertexShader.includes('vColor.rgb*=mix'),false);assert.equal(mesh.material.customProgramCacheKey(),'far-ground-color-map-v2:opaque');
 world.nearBounds=[96,-48,144,0];candidate.updateGroundBounds();assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.deepEqual(farSceneTransferables({ground:data}).map(b=>b.byteLength),[data.positions.byteLength,data.colors.byteLength,data.indices.byteLength,data.colorMap.data.byteLength]);let released=0;texture.addEventListener('dispose',()=>released++);candidate.dispose();candidate.dispose();assert.equal(released,1);assert.equal(candidate.closed,true);assert.equal(candidate.impostors.children.length,0);
});


test('water coverage is packed independently of land RGB and requires no second sampler',()=>{
 const map=farGroundColorMap(bounds,{step:4,wash:0,colorAt:()=>[.4,.5,.2],maskAt:x=>x>112&&x<120?1:0,waterColor:[.1,.3,.6]});
 assert.equal(map.data[3],0);const wet=(4*map.width+4)*4;assert.equal(map.data[wet+3],255);assert.deepEqual([...map.data.slice(0,3)],[102,128,51]);assert.deepEqual([...map.data.slice(wet,wet+3)],[102,128,51]);assert.deepEqual(map.waterColor,[.1,.3,.6]);
 const candidate={impostors:new THREE.Mesh(),dispose(){}},world={nearBounds:[100,-64,116,-48],toon:{uniforms:{uWorldOrigin:{value:new THREE.Vector2()},uNight:{value:0}}}},data=farGroundData({surface:()=>0},bounds,{step:16});data.colorMap=map;attachNativeFarGround(candidate,data,world,{simplified:true});const material=candidate.impostors.children[0].material,shader={uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <map_fragment>\n#include <clipping_planes_fragment>'};material.onBeforeCompile(shader);
 assert.equal(material.transparent,false);assert.equal(material.alphaTest,0);assert.equal(material.customProgramCacheKey(),'far-ground-color-map-v2:mask');assert.ok(shader.fragmentShader.includes('smoothstep(.45,.55,diffuseColor.a)'));assert.ok(shader.fragmentShader.includes('diffuseColor.a=1.;'));assert.equal(shader.fragmentShader.includes('texture2D'),false);assert.deepEqual(shader.uniforms.uFarGroundWaterColor.value.toArray(),new THREE.Color().setRGB(.1,.3,.6).convertSRGBToLinear().toArray());candidate.dispose();
 assert.throws(()=>farGroundColorMap(bounds,{colorAt:()=>[0,0,0],maskAt:()=>1}),/mask/);
});
test('opt-in seam shares the color map and night recipe but does not discard its own vertical boundary',async()=>{
 const field={surface:(x,z)=>.01*x},data=farGroundData(field,bounds,{step:16});data.colorMap=farGroundColorMap(bounds,{step:4,colorAt:()=>[.2,.3,.4],maskAt:()=>0,waterColor:[.1,.3,.6]});
 let prepareCalls=0;const candidate={impostors:new THREE.Group(),dispose(){}},world={nearBounds:[100,-64,132,-32],nav:{config:{seed:712}},renderer:{domElement:new EventTarget(),getContext:()=>({isContextLost:()=>false})},toon:{uniforms:{uWorldOrigin:{value:new THREE.Vector2()},uNight:{value:0}}}};
 const positions=new Float32Array([100,1,-64,100,0,-64,100,1,-63,100,0,-63]);
 attachNativeFarGround(candidate,data,world,{simplified:true,seam:true,seamStreamFactory:()=>({request:async()=>({data:{positions,indices:new Uint32Array([0,1,2,2,1,3])},buildMs:1}),dispose(){}}),seamPrepare:async()=>{prepareCalls++;}});await candidate.groundSeamReady;
 const meshes=candidate.impostors.children,ground=meshes.find(m=>!m.userData.farGroundSeam),seam=meshes.find(m=>m.userData.farGroundSeam);assert.equal(prepareCalls,1);assert.equal(seam.material.map,ground.material.map);assert.equal(seam.material.side,THREE.DoubleSide);assert.equal(seam.material.transparent,false);assert.equal(seam.castShadow,false);
 const shader=()=>({uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <map_fragment>\n#include <clipping_planes_fragment>'}),a=shader(),b=shader();ground.material.onBeforeCompile(a);seam.material.onBeforeCompile(b);assert.ok(a.fragmentShader.includes(')discard;'));assert.ok(b.fragmentShader.includes('if(!onFarEdge)discard;'));assert.equal(b.fragmentShader.includes('if(farGroundXZ.x>='),false);assert.ok(b.fragmentShader.includes('smoothstep(.45,.55,diffuseColor.a)'));assert.equal(b.uniforms.uFarGroundNight,world.toon.uniforms.uNight);assert.equal(seam.material.customProgramCacheKey(),ground.material.customProgramCacheKey()+':seam-v2');
 let textureDisposals=0;ground.material.map.addEventListener('dispose',()=>textureDisposals++);candidate.dispose();candidate.dispose();assert.equal(textureDisposals,1);assert.equal(candidate.impostors.children.length,0);
});


test('offline landscape grading preserves tree identity, geometry and water coverage',async()=>{
 const {readFileSync}=await import('node:fs');const {buildFarSceneData}=await import('../tools/experiments/far-scene-data.js');
 const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile,request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile,treeBounds:{minX:-24,maxX:24,minZ:-24,maxZ:24},groundBounds:{minX:-32,maxX:32,minZ:-32,maxZ:32},step:16,colorMapStep:4,waterSurface:true};
 const original=buildFarSceneData(request),explicit=buildFarSceneData({...request,groundWash:.25}),unwashed=buildFarSceneData({...request,groundWash:0});assert.deepEqual(original,explicit);assert.deepEqual(unwashed.trees,original.trees);assert.deepEqual(unwashed.ground.positions,original.ground.positions);assert.deepEqual(unwashed.ground.indices,original.ground.indices);
 assert.notDeepEqual(unwashed.ground.colorMap.data,original.ground.colorMap.data);for(let i=3;i<original.ground.colorMap.data.length;i+=4)assert.equal(unwashed.ground.colorMap.data[i],original.ground.colorMap.data[i]);
 for(const value of [-.01,1.01,NaN,Infinity])assert.throws(()=>buildFarSceneData({...request,groundWash:value}),/ground wash/);
});
