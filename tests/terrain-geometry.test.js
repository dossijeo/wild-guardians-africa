import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TerrainField,canyonGroundColor,desertGroundColor} from '../src/world/terrain.js';
import {buildGroundData,TERRAIN_SOURCE_SHA256} from '../src/rendering/terrain-source.js';
import {nativeGroundGeometry} from '../src/rendering/terrain-geometry.js';
import {terrainTriangleHeight} from '../src/rendering/hand-terrain.js';
import {renderedTerrainSurface} from '../src/rendering/terrain-surface.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const fragment=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const recipe=source.slice(source.indexOf(' const points=[],colors=[];',source.indexOf('function buildChunkData(')),source.indexOf(' const edges={west:'));
const reference=Function('field','b','cx','cz','canyonGroundColor','desertGroundColor',
  'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;'+
  fragment('const smooth=','const GROUPS=')+fragment('class Geometry{','\nfunction branch(')+
  fragment('function smoothTerrainLighting(','\nfunction compactStaticMesh(')+fragment('function desertSmoothNormals(','\nclass TerrainField{')+
  fragment('function chunkBounds(','\nfunction buildChunkData(')+
  'const bo=chunkBounds(cx,cz),g=new Geometry(),wire={line(){}};'+recipe+
  'smoothTerrainLighting(field,g.v,bo.centerX,bo.centerZ);if(field.desert)desertSmoothNormals(field,g.v,bo.centerX,bo.centerZ);return new Float32Array(g.v);');
const packs=['savanna','grand_river','mangrove','volcanoes','canyons','desert'].map(id=>JSON.parse(readFileSync('public/content/biome-'+id+'.json')));

test('native ground vertices, colors and normals match original lab in every biome and negative chunks',()=>{
  assert.equal(createHash('sha256').update(source).digest('hex'),TERRAIN_SOURCE_SHA256);
  for(const pack of packs)for(const seed of ['712','918271'])for(const [cx,cz] of [[0,0],[-1,1],[1,-1]]){
    const field=new TerrainField({seed,biome:pack.biomeId,relief:1,river:true});
    const actual=buildGroundData(field,pack.profile,cx,cz),expected=reference(field,pack.profile,cx,cz,canyonGroundColor,desertGroundColor);
    assert.equal(actual.length,48*48*6*9);assert.deepEqual(actual,expected);
    const geometry=nativeGroundGeometry(field,pack.profile,cx,cz);
    assert.deepEqual(geometry.attributes.position.data.array,expected);assert.equal(geometry.index,null);
    assert.equal(geometry.boundingBox.min.x,-24);assert.equal(geometry.boundingBox.max.z,24);geometry.dispose();
  }
});

test('visual effects and debris support agree with raycast on native one-unit cells and chunk seams',()=>{
  for(const pack of packs){
    const field=new TerrainField({seed:'712',biome:pack.biomeId,relief:1,river:true});
    for(const [cx,cz] of [[0,0],[-1,1]]){
      const geometry=nativeGroundGeometry(field,pack.profile,cx,cz),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
      mesh.position.set(cx*48,0,cz*48);mesh.updateMatrixWorld();
      for(const [dx,dz] of [[-23.9,-23.8],[.8,.7],[23.9,23.8],[-.3,.3]]){
        const x=cx*48+dx,z=cz*48+dz,hit=new THREE.Raycaster(new THREE.Vector3(x,500,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];assert.ok(hit);
        assert.ok(Math.abs(hit.point.y-terrainTriangleHeight(x,z,field.surface.bind(field)))<1e-6);
        assert.ok(Math.abs(hit.point.y-renderedTerrainSurface(field,x,z))<3e-6);
      }
      geometry.dispose();mesh.material.dispose();
    }
  }
});

test('native RGB vertex palette is converted once before lighting in both quality material types',()=>{
  for(const Material of [THREE.MeshStandardMaterial,THREE.MeshBasicMaterial]){
    const material=new Material({vertexColors:true});Object.assign(material.userData,{toonGround:true,nativeGroundColor:true});new AfricanToon().material(material);
    const shader={uniforms:{},...THREE.ShaderLib[material.isMeshBasicMaterial?'basic':'standard']};material.onBeforeCompile(shader,{});
    assert.equal(shader.fragmentShader.split('diffuseColor.rgb=toLinear4(diffuseColor.rgb);').length,2);
  }
});
