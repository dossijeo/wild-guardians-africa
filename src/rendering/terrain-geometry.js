import * as THREE from 'three';
import {buildGroundData} from './terrain-source.js';

export function nativeGroundGeometry(field,profile,cx,cz){
  const data=new THREE.InterleavedBuffer(buildGroundData(field,profile,cx,cz),9),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(data,3,0));
  geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(data,3,3));
  geometry.setAttribute('color',new THREE.InterleavedBufferAttribute(data,3,6));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
