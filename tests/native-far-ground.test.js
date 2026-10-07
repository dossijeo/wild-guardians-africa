import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {attachNativeFarGround,configureNativeFarSeamGeometry} from '../tools/experiments/native-far-ground.js';
test('regional ground clips the current native rectangle and follows the shared render origin',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){this.originalDisposed=true;}},origin={value:new THREE.Vector2(192,0)},world={nearBounds:[100,-50,200,50],toon:{uniforms:{uWorldOrigin:origin,uNight:{value:0}}}};
 const positions=new Float32Array([0,0,0,1,0,0,0,0,1]),colors=new Float32Array(9).fill(.5),indices=new Uint32Array([0,2,1]);
 attachNativeFarGround(candidate,{positions,colors,indices},world);const mesh=candidate.impostors.children[0],shader={uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);
 assert.equal(mesh.userData.materialRegistryExcluded,true);assert.equal(mesh.material.toneMapped,false);assert.ok(Math.abs(mesh.geometry.attributes.color.getX(0)-.21404114)<1e-6);assert.equal(colors[0],.5);
 assert.equal(shader.uniforms.uFarGroundNight,world.toon.uniforms.uNight);assert.ok(shader.vertexShader.includes('vColor.rgb*=mix'));world.toon.uniforms.uNight.value=1;assert.equal(shader.uniforms.uFarGroundNight.value,1);
 assert.equal(shader.uniforms.uFarGroundOrigin,origin);assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.ok(shader.fragmentShader.includes('discard;'));
 world.nearBounds=[200,-50,300,50];candidate.updateGroundBounds();assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.equal(mesh.geometry.attributes.position.array,positions);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);candidate.dispose();assert.equal(disposed,2);assert.equal(candidate.impostors.children.length,0);assert.equal(candidate.originalDisposed,true);
});

test('mapped far ground borrows biome tiles and freezes expensive detail without changing global uniforms',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){}},night={value:.5},fine={value:1},origin={value:new THREE.Vector2()},world={nearBounds:[-24,-24,24,24],nav:{field:{waterInfo:(x,z)=>({inside:x===1})}},toon:{uniforms:{uWorldOrigin:origin,uNight:night,uFineNoise:fine},environmentUniforms:{}},biomeGround:{attach(material){material.userData.biomeGround={uGroundMapped:{value:1},uGroundMicro:{value:1},uGroundRelief:{value:1}};}}};
 const positions=new Float32Array([0,0,0,1,0,0,0,0,1]),colors=new Float32Array(9).fill(.5),indices=new Uint32Array([0,2,1]);attachNativeFarGround(candidate,{positions,colors,indices},world);const mesh=candidate.impostors.children[0],u=mesh.material.userData.biomeGround;
 assert.equal(mesh.material.customProgramCacheKey(),'far-ground-resident-material-v4:native');assert.equal(mesh.geometry.attributes.color.array,colors);assert.ok(mesh.geometry.attributes.normal);assert.deepEqual([...mesh.geometry.attributes.aFarWater.array],[0,1,0]);assert.equal(u.uGroundMapped.value,0);assert.equal(u.uGroundMicro.value,0);assert.equal(u.uGroundRelief.value,0);
 const shader={uniforms:{},vertexShader:'void main() {\n#include <worldpos_vertex>\n#include <color_vertex>\n}',fragmentShader:'void main() {\n#include <clipping_planes_fragment>\n#include <opaque_fragment>\n}'};mesh.material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uNight,night);assert.equal(shader.uniforms.uFineNoise.value,0);assert.equal(fine.value,1);assert.ok(shader.fragmentShader.includes('vFarWater'));assert.ok(shader.fragmentShader.includes('gl_FragColor.rgb=mix'));assert.equal(mesh.userData.materialRegistryExcluded,true);candidate.dispose();
});

test('simplified distant ground retains relief, clipping, phase and ownership without biome fragment recipe',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){this.closed=true;}},night={value:0},origin={value:new THREE.Vector2(48,96)},world={nearBounds:[0,0,96,192],toon:{uniforms:{uWorldOrigin:origin,uNight:night}},biomeGround:{attach(){throw Error('Detailed biome hook must not run');}}},data={positions:new Float32Array([0,4,0,1,8,0,0,9,1]),colors:new Float32Array(9).fill(.5),indices:new Uint32Array([0,2,1])};attachNativeFarGround(candidate,data,world,{simplified:true});const mesh=candidate.impostors.children[0],shader={uniforms:{},vertexShader:'#include <worldpos_vertex>\n#include <color_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);assert.equal(mesh.material.customProgramCacheKey(),'far-ground-resident-material-v4:vertex');assert.equal(mesh.material.type,'MeshBasicMaterial');assert.equal(mesh.geometry.attributes.position.array,data.positions);assert.equal(mesh.geometry.index.array,data.indices);assert.equal(mesh.geometry.attributes.normal,undefined);assert.equal(shader.uniforms.uFarGroundNight,night);assert.equal(shader.uniforms.uFarGroundOrigin,origin);assert.deepEqual(shader.uniforms.uFarNearBounds.value.toArray(),world.nearBounds);assert.ok(shader.fragmentShader.includes('discard;'));assert.ok(shader.vertexShader.includes('vColor.rgb*=mix'));assert.equal(shader.fragmentShader.includes('materialNoise'),false);candidate.dispose();assert.equal(candidate.closed,true);assert.equal(candidate.impostors.children.length,0);
});


test('opt-in native water mask keeps native ground recipe and independent fragment water coverage',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){}},night={value:0},origin={value:new THREE.Vector2(48,96)},world={nearBounds:[0,0,96,192],toon:{uniforms:{uWorldOrigin:origin,uNight:night},environmentUniforms:{}},biomeGround:{attach(material){material.userData.biomeGround={uGroundMapped:{value:1},uGroundMicro:{value:1},uGroundRelief:{value:1}};}}};
 const data={positions:new Float32Array([0,4,0,16,8,0,0,9,16]),colors:new Float32Array(9).fill(.5),indices:new Uint32Array([0,2,1]),colorMap:{width:2,height:2,bounds:{minX:0,minZ:0,maxX:16,maxZ:16},data:new Uint8Array([80,80,80,0,80,80,80,255,80,80,80,0,80,80,80,255]),waterColor:[.2,.4,.6]}};
 attachNativeFarGround(candidate,data,world,{nativeWaterMask:true});const mesh=candidate.impostors.children[0],map=candidate.farGroundTextures[0];
 assert.equal(mesh.material.map,null);assert.equal(mesh.geometry.attributes.position.array,data.positions);assert.equal(mesh.geometry.attributes.color.array,data.colors);assert.deepEqual([...mesh.geometry.attributes.aFarWater.array],[0,0,0]);assert.deepEqual([...mesh.geometry.attributes.uv.array],[.25,.25,.75,.25,.25,.75]);
 const shader={uniforms:{},vertexShader:'void main() {\n#include <worldpos_vertex>\n}',fragmentShader:'void main() {\n#include <clipping_planes_fragment>\n#include <opaque_fragment>\n}'};mesh.material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uFarWaterMask.value,map);assert.deepEqual(shader.uniforms.uFarMaskWaterColor.value.toArray(),data.colorMap.waterColor);assert.ok(shader.fragmentShader.includes('texture2D(uFarWaterMask,vFarWaterUv).a'));assert.ok(shader.fragmentShader.includes('discard;'));assert.equal(shader.uniforms.uNight,night);assert.equal(mesh.material.customProgramCacheKey(),'far-ground-native-water-mask-v1');
 let releases=0;map.addEventListener('dispose',()=>releases++);candidate.dispose();candidate.dispose();assert.equal(releases,1);
});

test('native water mask rejects absent map or incompatible simplified recipe before creating meshes',()=>{
 const candidate={impostors:new THREE.Mesh(),dispose(){}},world={biomeGround:{}};
 for(const extra of [{nativeWaterMask:true},{nativeWaterMask:true,simplified:true}])assert.throws(()=>attachNativeFarGround(candidate,{colors:new Float32Array(),positions:new Float32Array(),indices:new Uint32Array()},world,extra),/requires/);
 assert.equal(candidate.impostors.children.length,0);
});


test('native seam gets exact bilinear mask RGB, up normals and explicit water attribute without moving vertices',()=>{
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array([0,1,0,1,2,1,2,3,2]);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([.25,.25,.5,.5,.75,.75]),2));
 const map={width:2,height:2,data:new Uint8Array([0,0,0,0,100,100,100,0,200,200,200,0,255,255,255,255])};configureNativeFarSeamGeometry(geometry,map);
 assert.equal(geometry.attributes.position.array,positions);assert.equal(geometry.attributes.color.getX(0),0);assert.ok(Math.abs(geometry.attributes.color.getX(1)-138.75/255)<1e-7);assert.equal(geometry.attributes.color.getX(2),1);assert.deepEqual([...geometry.attributes.normal.array],[0,1,0,0,1,0,0,1,0]);assert.deepEqual([...geometry.attributes.aFarWater.array],[0,0,0]);geometry.dispose();
});
