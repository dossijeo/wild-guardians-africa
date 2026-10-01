import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const json=async url=>{const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return response.json();};
export const bytes=async url=>{const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return response.arrayBuffer();};
export class Assets {
  constructor(){this.loader=new GLTFLoader();this.textures=new THREE.TextureLoader();this.cache=new Map();}
  async model(url) {if(!this.cache.has(url))this.cache.set(url,this.loader.loadAsync(url));return this.cache.get(url);}
  async texture(url,color=false) {
    const key=url+color;if(!this.cache.has(key))this.cache.set(key,this.textures.loadAsync(url).then(texture=>{if(color)texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;return texture;}));
    return this.cache.get(key);
  }
  async biome(pack) {
    const buffer=await bytes(pack.binary.url),map=await this.texture(pack.textures.find(t=>t.role==='baseColor').base64.url,true);
    const material=new THREE.MeshStandardMaterial({map,roughness:.95,metalness:0,side:THREE.DoubleSide});
    const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array};
    const attribute=desc=>new types[desc.type](buffer,desc.offset,desc.count);
    return pack.assets.map(a=>a.lods.map(lod=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(attribute(lod.position),3));geometry.setAttribute('normal',new THREE.BufferAttribute(attribute(lod.normal),3));geometry.setAttribute('uv',new THREE.BufferAttribute(attribute(lod.uv),2));geometry.setIndex(new THREE.BufferAttribute(attribute(lod.index),1));geometry.computeBoundingSphere();
      return new THREE.Mesh(geometry,material);
    }));
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
}

