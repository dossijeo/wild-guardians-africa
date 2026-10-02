import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {computeTangents,describeSurface,SURFACE_SOURCE_SHA256} from '../src/rendering/surface-source.js';
import {nativeAssetMaterial,nativeAssetSurface} from '../src/rendering/asset-surface.js';
import {Assets} from '../src/rendering/assets.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {obstructionMaterial} from '../src/rendering/obstruction.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const reference=Function(source.slice(source.indexOf('const add='),source.indexOf('const hex='))+source.slice(source.indexOf('function computeTangents('),source.indexOf('function validateAssetProfile('))+source.slice(source.indexOf('function describeSurface('),source.indexOf('function smoothTerrainLighting('))+'return {computeTangents,describeSurface};')();
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const pack=id=>JSON.parse(readFileSync('public/content/biome-'+id+'.json'));

test('all 120 original surface classifications and every LOD tangent buffer match the native recipes',()=>{
  assert.equal(createHash('sha256').update(source).digest('hex'),SURFACE_SOURCE_SHA256);
  for(const id of biomes){const p=pack(id),binary=readFileSync('public'+p.binary.url),buffer=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array},array=d=>new types[d.type](buffer,d.offset,d.count);
    p.assets.forEach((asset,i)=>{const descriptor=nativeAssetSurface(p,asset,i);assert.deepEqual(describeSurface(descriptor,0,id),reference.describeSurface(descriptor,0,id));
      for(const lod of asset.lods){const args=[lod.position,lod.normal,lod.uv,lod.index].map(array),actual=computeTangents(...args),expected=reference.computeTangents(...args);assert.deepEqual(actual,expected);for(const value of actual)assert.ok(Number.isFinite(value));}
    });
  }
});

test('native atlas loading preserves shared color/normal/MR maps, per-asset materials and per-LOD tangent handedness',async t=>{
  t.mock.method(globalThis,'fetch',async url=>{const file=readFileSync('public'+url);return {ok:true,arrayBuffer:async()=>file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)};});
  for(const id of biomes){const p=pack(id),assets=new Assets(),calls=[];assets.texture=async (url,color)=>{calls.push({url,color});const texture=new THREE.Texture();texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;return texture;};
    const levels=await assets.biome(p);assert.equal(calls.length,3);assert.deepEqual(calls.map(c=>c.color),[true,false,false]);assert.equal(levels.length,20);
    for(const group of levels){const material=group[0].material;assert.equal(material.map,levels[0][0].material.map);assert.equal(material.normalMap,levels[0][0].material.normalMap);assert.equal(material.metalnessMap,material.roughnessMap);assert.equal(material.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(material.normalScale.x,p.material.normalScale);assert.equal(material.alphaTest,.35);assert.equal(material.aoMap,null);
      for(const mesh of group){assert.equal(mesh.material,material);assert.equal(mesh.geometry.attributes.tangent.count,mesh.geometry.attributes.position.count);}
    }
    levels.flat().forEach(mesh=>mesh.geometry.dispose());new Set(levels.map(group=>group[0].material)).forEach(m=>m.dispose());
  }
});

test('native surface uniforms and atlas channels compose with cel shading and per-instance coverage',()=>{
  const p=pack('mangrove'),geometry=new THREE.BoxGeometry(4,10,4);geometry.computeBoundingBox();
  const textures={baseColor:new THREE.Texture(),normal:new THREE.Texture(),metallicRoughness:new THREE.Texture()},material=nativeAssetMaterial(p,p.assets[0],0,textures,geometry.boundingBox);
  obstructionMaterial(material);new AfricanToon().apply(new THREE.Mesh(geometry,material));
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.uSurfaceType.value,1);assert.deepEqual(shader.uniforms.uNativeSurface.value.toArray(),[.87,0,1,.52]);assert.equal(shader.uniforms.uNativeSizeY.value,10);
  assert.ok(shader.fragmentShader.includes('texture2D(roughnessMap,vRoughnessMapUv).g,.26'));assert.ok(shader.fragmentShader.includes('float toonLeaf=nativeLeaf'));assert.ok(shader.fragmentShader.includes('toonLeaf,nativeWet,metalnessFactor'));
  assert.ok(shader.fragmentShader.includes('coverageThreshold(gl_FragCoord.xy)'));assert.ok(shader.vertexShader.includes('vNativeHeight=position.y'));assert.equal(material.transparent,false);
});
