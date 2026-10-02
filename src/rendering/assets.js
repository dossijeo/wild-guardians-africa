import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl,resolveAssetValues} from './asset-url.js';
import {prepareNativeBuilding} from './buildings.js';
import {nativeAssetMaterial} from './asset-surface.js';
import {computeTangents} from './surface-source.js';
export const json=async url=>{const response=await fetch(assetUrl(url));if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return resolveAssetValues(await response.json());};
export const bytes=async url=>{const response=await fetch(assetUrl(url));if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return response.arrayBuffer();};
export class Assets {
  constructor(){this.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);this.textures=new THREE.TextureLoader();this.cache=new Map();}
  async model(url) {if(!this.cache.has(url))this.cache.set(url,this.loader.loadAsync(assetUrl(url)));return this.cache.get(url);}
  async building(descriptor){const key='building:'+descriptor.url;if(!this.cache.has(key))this.cache.set(key,this.model(descriptor.url).then(gltf=>prepareNativeBuilding(gltf,descriptor)));return this.cache.get(key);}
  async texture(url,color=false) {
    const key=url+color;if(!this.cache.has(key))this.cache.set(key,this.textures.loadAsync(assetUrl(url)).then(texture=>{if(color)texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;return texture;}));
    return this.cache.get(key);
  }
  async biome(pack) {
    const [buffer,entries]=await Promise.all([bytes(pack.binary.url),Promise.all(pack.textures.map(async t=>[t.role,await this.texture(t.base64.url,t.role==='baseColor')]))]),textures=Object.fromEntries(entries);
    const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array};
    const attribute=desc=>new types[desc.type](buffer,desc.offset,desc.count);
    return pack.assets.map((a,index)=>{const levels=a.lods.map(lod=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(attribute(lod.position),3));geometry.setAttribute('normal',new THREE.BufferAttribute(attribute(lod.normal),3));geometry.setAttribute('uv',new THREE.BufferAttribute(attribute(lod.uv),2));geometry.setIndex(new THREE.BufferAttribute(attribute(lod.index),1));geometry.computeBoundingSphere();
      geometry.setAttribute('tangent',new THREE.BufferAttribute(computeTangents(geometry.attributes.position.array,geometry.attributes.normal.array,geometry.attributes.uv.array,geometry.index.array),4));geometry.computeBoundingBox();
      return geometry;
    });const material=nativeAssetMaterial(pack,a,index,textures,levels[0].boundingBox);return levels.map(geometry=>new THREE.Mesh(geometry,material));});
  }
  async village(payload) {
    const buffer=await bytes(payload.binary.url),vertices=new Float32Array(buffer,0,payload.vertexBytes/4),index=new Uint32Array(buffer,payload.vertexBytes,payload.indexCount);
    const interleaved=new THREE.InterleavedBuffer(vertices,8),map=await this.texture(payload.textures.color,true);
    const material=new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide});
    return payload.units.map(unit=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(interleaved,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new THREE.InterleavedBufferAttribute(interleaved,2,6));geometry.setIndex(new THREE.BufferAttribute(index,1));geometry.setDrawRange(unit.offset,unit.count);
      const mesh=new THREE.Mesh(geometry,material);mesh.userData.unit=unit;mesh.castShadow=mesh.receiveShadow=true;return mesh;
    });
  }
  async walls(pack) {
    const map=await this.texture(pack.texture,true),material=new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide}),result={};
    await Promise.all(Object.entries(pack.pieces).map(async([key,piece])=>{
      const [positions,normals,uv,index,faceRegions]=await Promise.all([piece.p,piece.n,piece.uv,piece.i,piece.faceRegions].map(p=>bytes(p.url)));
      const morph=Object.fromEntries(await Promise.all(Object.entries(piece.morph).map(async([dest,bridge])=>{
        const [p,n]=await Promise.all([bytes(bridge.p.url),bytes(bridge.n.url)]);return [dest,{peers:bridge.peers,p:new Float32Array(p),n:new Float32Array(n)}];
      })));
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(normals),3));geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(index),1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,material);mesh.userData.nativePiece={p:new Float32Array(positions),n:new Float32Array(normals),uv:new Float32Array(uv),i:new Uint16Array(index),faceRegions:new Uint16Array(faceRegions),regions:piece.regions,morph};mesh.castShadow=mesh.receiveShadow=true;result[key]=mesh;
    }));return result;
  }
}
