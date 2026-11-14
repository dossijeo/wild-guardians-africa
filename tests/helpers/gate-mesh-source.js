import {readFileSync} from 'node:fs';
import * as THREE from 'three';
const pack=JSON.parse(readFileSync(new URL('../../public/content/walls.json',import.meta.url))),cache=new Map();
const array=(descriptor,Type)=>{const bytes=readFileSync(new URL('../../public'+descriptor.url,import.meta.url));return new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
export function gateMeshSource(material){
 if(!cache.has(material)){const piece=pack.pieces[material+'_puerta'];cache.set(material,{p:array(piece.p,Float32Array),n:array(piece.n,Float32Array),uv:array(piece.uv,Float32Array),
  i:array(piece.i,Uint16Array),faceRegions:array(piece.faceRegions,Uint16Array),regions:piece.regions,morph:{}});}return cache.get(material);
}
export function gateMeshPrototype(material){const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());mesh.userData.nativePiece=gateMeshSource(material);return mesh;}
