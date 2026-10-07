import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {indexBridgeGeometry} from '../tools/lib/frontside-indexed-bridge.mjs';
function fixture(){
 const geo=new THREE.BufferGeometry(),keys=[[0,0,2],[0,1,2],[0,2,2],[0,0,2],[0,2,2],[0,3,2]];
 for(const [name,size] of Object.entries({position:3,normal:3,uv:2,aRoot:3,aPeerRoot:3,aSpin:4,aPart:4})){
  const array=new Float32Array(6*size);keys.forEach((key,i)=>{for(let c=0;c<size;c++)array[i*size+c]=name==='normal'?(c===1?1:0):name==='aPart'?(c===1?2:0):key[1]+c;});
  array[0]=-0;array[3*size]=-0;
  geo.setAttribute(name,new THREE.BufferAttribute(array,size));
 }
 geo.setAttribute('iBridge',new THREE.InstancedBufferAttribute(new Float32Array(8),4));return{geo,keys};
}
test('stable indexing preserves source bits/order, selective winding and live instance uploads',()=>{
 const {geo,keys}=fixture(),result=indexBridgeGeometry(geo,keys,[0]),candidate=result.geometry;
 assert.equal(result.indexedVertices,7);assert.equal(candidate.index.count,9);assert.deepEqual(result.triangleSourceFaces,[0,1,0]);
 assert.equal(candidate.getAttribute('iBridge'),geo.getAttribute('iBridge'));
 assert.equal(geo.index,null,'original remains unmodified');
 for(let j=0;j<3;j++){
  const original=j===0?0:j===1?2:1,v=candidate.index.getX(6+j);
  assert.equal(candidate.getAttribute('normal').getY(v),-geo.getAttribute('normal').getY(original));
  assert.equal(candidate.getAttribute('aPart').getW(v),1);
  assert.equal(candidate.getAttribute('uv').getX(v),geo.getAttribute('uv').getX(original));
 }
 assert.ok(Object.is(candidate.getAttribute('position').getX(candidate.index.getX(0)),-0));
});
test('different organ labels never merge and contradictory provenance rejects',()=>{
 const {geo,keys}=fixture();keys[3]=[0,0,3];assert.equal(indexBridgeGeometry(geo,keys).indexedVertices,5);
 keys[3]=[0,0,2];geo.getAttribute('aRoot').setY(3,99);assert.throws(()=>indexBridgeGeometry(geo,keys),/Conflicting shader inputs/);
});
test('invalid or duplicate reverse faces reject before candidate construction',()=>{
 const {geo,keys}=fixture();assert.throws(()=>indexBridgeGeometry(geo,keys,[2]),/Invalid reverse/);assert.throws(()=>indexBridgeGeometry(geo,keys,[0,0]),/Invalid reverse/);
});
