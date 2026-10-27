import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachNativeFarGround} from '../tools/experiments/native-far-ground.js';
import {createRegionalWetlandBed} from '../tools/experiments/regional-wetland-bed.js';

test('regional water owns its resources, borrows the clock and never resamples the native world',()=>{
 const bounds={minX:0,minZ:0,maxX:16,maxZ:16},encoder=createRegionalWetlandBed(bounds,2,2,3.34);
 for(let i=0;i<4;i++)encoder.sample({mask:.9,shore:2,inside:true});
 const clock={value:17},origin={value:new THREE.Vector2(48,96)},night={value:0};
 const world={state:{biome:'manglares'},visualSearch:'?farWaterSurface=1&visualLab=global-lighting&mangroveSubstrate=full&mangroveShore=sediment',nearBounds:[0,0,48,48],pack:{profile:{colors:{water:'#448899'}}},nav:{field:{seed:37,waterInfo(){throw Error('Unexpected native query');}}},fluidLighting:{uniforms:{uWorldOrigin:origin,uNight:night},textures:[]},fluidMaterial:{userData:{paintUniforms:{uTime:clock}}},toon:{uniforms:{uWorldOrigin:origin,uNight:night},environmentUniforms:{}},biomeGround:{attach(m){m.userData.biomeGround={uGroundMapped:{value:1},uGroundMicro:{value:1},uGroundRelief:{value:1}};}}};
 let originals=0;
 const candidate={impostors:new THREE.Group(),dispose(){originals++;}},data={positions:new Float32Array([0,4,0,16,4,0,0,4,16]),colors:new Float32Array(9),water:new Float32Array(3),indices:new Uint32Array([0,2,1]),colorMap:{width:2,height:2,bounds,data:new Uint8Array(16).fill(255),waterColor:[.2,.4,.6]},waterBed:encoder.finish()};
 attachNativeFarGround(candidate,data,world,{nativeWaterMask:true});
 const water=candidate.impostors.children.find(m=>m.userData.regionalWaterSurface);
 assert.ok(water);assert.equal(water.geometry.attributes.position.count,4);assert.equal(water.material.userData.paintUniforms.uTime,clock);
 const shader={uniforms:{},vertexShader:'void main() {\n#include <begin_vertex>\n}',fragmentShader:'void main() {\nvec3 base=uInk0*.72;\n#include <clipping_planes_fragment>\n#include <opaque_fragment>\n}'};
 water.material.onBeforeCompile(shader,{});
 assert.ok(shader.fragmentShader.includes('regionalShore'));assert.ok(shader.fragmentShader.includes('uRegionalBounds'));assert.equal(shader.uniforms.qaBed.value.image.data,data.waterBed.bytes);
 const liveBounds=shader.uniforms.uRegionalBounds;world.nearBounds=[48,0,96,48];candidate.updateGroundBounds();assert.deepEqual(liveBounds.value.toArray(),world.nearBounds);
 const ground=candidate.impostors.children.find(m=>m.userData.farGround),groundShader={uniforms:{},vertexShader:'void main() {\n#include <worldpos_vertex>\n}',fragmentShader:'void main() {\n#include <clipping_planes_fragment>\n#include <opaque_fragment>\n}'};
 ground.material.onBeforeCompile(groundShader,{});assert.ok(!groundShader.fragmentShader.includes('a>=.5)discard'));assert.ok(!groundShader.fragmentShader.includes('gl_FragColor.rgb=mix'));assert.ok(groundShader.fragmentShader.includes('uFarNearBounds'));
 let releases=0;for(const resource of [water.geometry,water.material,shader.uniforms.qaBed.value,candidate.farGroundTextures[0]])resource.addEventListener('dispose',()=>releases++);
 candidate.dispose();candidate.dispose();assert.equal(releases,4);assert.equal(originals,1);assert.equal(candidate.impostors.children.length,0);assert.equal(clock.value,17);
});

