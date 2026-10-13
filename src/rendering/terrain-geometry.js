import * as THREE from 'three';
import {buildGroundData} from './terrain-source.js';

export function nativeGroundGeometry(field,profile,cx,cz){
  return nativeTerrainBuffer(buildGroundData(field,profile,cx,cz));
}

export function nativeTerrainBuffer(vertices){
  if(vertices&&!(vertices instanceof Float32Array)){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(vertices.positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(vertices.colors,3));
    geometry.setIndex(new THREE.BufferAttribute(vertices.indices,1));
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
  }
  const data=new THREE.InterleavedBuffer(vertices,9),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(data,3,0));
  geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(data,3,3));
  geometry.setAttribute('color',new THREE.InterleavedBufferAttribute(data,3,6));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
