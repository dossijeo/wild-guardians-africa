import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TerrainField,canyonFrame,hex} from '../src/world/terrain.js';
import {nativeChunkWater,nativeAssetWater} from '../src/rendering/water-geometry.js';
import {chunkBounds,WATER_SOURCE_SHA256} from '../src/rendering/water-source.js';
import {paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {WorldScene} from '../src/rendering/scene.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const wetland=source.slice(source.indexOf('function buildWetlandWater('),source.indexOf('\nclass Renderer{'));
const chunk=source.slice(source.indexOf(' if(field.riverActive){const color=hex(b.colors.water);'),source.indexOf('\n smoothTerrainLighting(field,g.v,bo.centerX,bo.centerZ);'));
const original=Function('field','bo','b','water','hex','canyonFrame','clamp',wetland+'\n'+chunk);
const sink=()=>({positions:[],tri(...points){this.positions.push(...points[0],...points[1],...points[2]);}});
const packs=['savanna','grand_river','mangrove','volcanoes','canyons','desert'].map(id=>JSON.parse(readFileSync('public/content/biome-'+id+'.json')));

test('river and wetland vertices reproduce the source recipe across six biomes and chunk boundaries',()=>{
  assert.equal(createHash('sha256').update(source).digest('hex'),WATER_SOURCE_SHA256);
  for(const pack of packs)for(const seed of ['712','918271','river seed']){
    const field=new TerrainField({seed,biome:pack.biomeId,relief:1,river:true});
    for(const [cx,cz] of [[0,0],[-1,1],[1,-1],[2,0],[-2,0]]){
      const expected=sink(),bo=chunkBounds(cx,cz);original(field,bo,pack.profile,expected,hex,canyonFrame,(v,a,b)=>Math.max(a,Math.min(b,v)));
      const geometry=nativeChunkWater(field,cx,cz,pack.profile);
      if(!expected.positions.length){assert.equal(geometry,null);continue;}
      assert.deepEqual(geometry.attributes.position.array,new Float32Array(expected.positions));
      for(let i=0;i<geometry.attributes.position.count;i++){
        assert.ok(geometry.attributes.position.getX(i)>=-24&&geometry.attributes.position.getX(i)<=24);
        assert.ok(geometry.attributes.position.getZ(i)>=-24&&geometry.attributes.position.getZ(i)<=24);
      }
      geometry.dispose();
    }
  }
});
test('pond and lava pool fans preserve original outline, local level and transformed instance placement',()=>{
  const pond=source.slice(source.indexOf('   const pts=a.water.outline;'),source.indexOf('\n  }\n  return {g,water,index:i'));
  const reference=Function('a','water',pond);
  for(const pack of packs)for(const asset of pack.assets){
    const geometry=nativeAssetWater(asset);if(!asset.water){assert.equal(geometry,null);continue;}
    const expected=sink();reference(asset,expected);assert.deepEqual(geometry.attributes.position.array,new Float32Array(expected.positions));
    assert.equal(geometry.attributes.position.count,asset.water.outline.length*3);
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(100,3,-80),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7),new THREE.Vector3(2,1.3,.8));
    const instance=new THREE.InstancedMesh(geometry,paintedWaterMaterial(pack.profile.colors.water,pack.biomeId==='volcanoes',712),1);instance.setMatrixAt(0,matrix);instance.computeBoundingBox();
    const bound=geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(instance.boundingBox.min.distanceTo(bound.min)<1e-5);assert.ok(instance.boundingBox.max.distanceTo(bound.max)<1e-5);
    geometry.dispose();instance.material.dispose();
  }
});
test('painted fluids evaluate transformed world coordinates for instanced pools',()=>{
  const material=paintedWaterMaterial('#49aeb6'),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('paintPosition=instanceMatrix*paintPosition;'));assert.ok(shader.vertexShader.includes('vPaintWorld=(modelMatrix*paintPosition).xyz;'));material.dispose();
});
test('unloading a chunk releases private instance buffers and retains shared water resources',()=>{
  const world=Object.create(WorldScene.prototype),group=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=paintedWaterMaterial('#49aeb6'),asset=new THREE.InstancedMesh(geometry,material,1),riverGeometry=new THREE.PlaneGeometry(2,2),river=new THREE.Mesh(riverGeometry,material);
  group.add(asset,river);let instances=0,sharedGeometry=0,localGeometry=0,sharedMaterial=0;
  asset.addEventListener('dispose',()=>instances++);geometry.addEventListener('dispose',()=>sharedGeometry++);riverGeometry.addEventListener('dispose',()=>localGeometry++);material.addEventListener('dispose',()=>sharedMaterial++);
  Object.assign(world,{nav:{config:{}},pack:{profile:{}},horizon:{update(){}},contacts:{update(){}},chunkRevision:0,camera:{position:{x:0,z:0}},prototypes:[],quality:'media',controls:{target:{x:0,z:0}},scene:new THREE.Scene(),chunks:new Map([['99,99',group]]),terrainMeshes:[],fluidMaterial:material,terrain:()=>new THREE.Group()});world.scene.add(group);world.syncChunks();
  assert.equal(instances,1);assert.equal(localGeometry,1);assert.equal(sharedGeometry,0);assert.equal(sharedMaterial,0);assert.equal(world.chunks.has('99,99'),false);assert.equal(world.chunks.size,25);
  geometry.dispose();material.dispose();
});
test('pool fragments keep the original half-open chunk clip and independent bounds',()=>{
  const first=paintedWaterMaterial('#49aeb6',false,712,[-24,-24,24,24]),next=paintedWaterMaterial('#49aeb6',false,712,[24,-24,72,24]);
  const compile=m=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);return shader;};
  const a=compile(first),b=compile(next);assert.notEqual(a.uniforms.uFluidBounds,b.uniforms.uFluidBounds);assert.deepEqual(a.uniforms.uFluidBounds.value.toArray(),[-24,-24,24,24]);assert.deepEqual(b.uniforms.uFluidBounds.value.toArray(),[24,-24,72,24]);
  assert.ok(a.fragmentShader.includes('vPaintWorld.x>=uFluidBounds.x'));assert.ok(a.fragmentShader.includes('vPaintWorld.x<uFluidBounds.z'));assert.equal(a.uniforms.uFluidClip.value,1);
  first.dispose();next.dispose();
});
