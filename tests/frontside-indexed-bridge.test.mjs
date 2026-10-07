import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {indexBridgeGeometry,reverseIndexedState,patchReverseDerivativeFrame} from '../tools/lib/frontside-indexed-bridge.mjs';
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
test('indexed-state reverses preserve original UV/index prefix and live growth attribute',()=>{
 const {geo}=fixture();geo.setIndex([0,1,2,3,4,5]);geo.setAttribute('iGrowth',geo.getAttribute('iBridge'));
 const candidate=reverseIndexedState(geo,[1]);assert.deepEqual(Array.from(candidate.index.array.slice(0,6)),[0,1,2,3,4,5]);
 assert.equal(candidate.getAttribute('iGrowth'),geo.getAttribute('iGrowth'));assert.equal(candidate.index.count,9);
 for(let corner=0;corner<3;corner++){
  const source=[3,5,4][corner],target=candidate.index.getX(6+corner);
  assert.equal(candidate.getAttribute('normal').getY(target),-geo.getAttribute('normal').getY(source));
  assert.equal(candidate.getAttribute('uv').getX(target),geo.getAttribute('uv').getX(source));
  assert.equal(candidate.getAttribute('aQaReverse').getX(target),1);
 }
 geo.setAttribute('tangent',new THREE.BufferAttribute(new Float32Array(24),4));assert.throws(()=>reverseIndexedState(geo,[0]),/derivative-frame/);
});
test('frame patch retains preceding material hook and rejects incompatible shaders',()=>{
 const material=new THREE.MeshStandardMaterial();let invoked=0;
 material.onBeforeCompile=shader=>{invoked++;shader.vertexShader='// native crop hook\n'+shader.vertexShader;};
 material.customProgramCacheKey=()=> 'native-crop';patchReverseDerivativeFrame(material,true);
 const shader={vertexShader:'void main() { }',fragmentShader:'#include <normal_fragment_begin>\n#include <normal_fragment_maps>'};material.onBeforeCompile(shader,null);
 assert.equal(invoked,1);assert.ok(shader.vertexShader.includes('// native crop hook'));assert.ok(shader.vertexShader.includes('vQaReverse=aPart.w'));
 assert.ok(material.customProgramCacheKey().startsWith('native-crop|'));assert.throws(()=>material.onBeforeCompile({vertexShader:'void main() { }',fragmentShader:'void main(){}'},null),/shader contract/);
});
test('interleaving preserves original relative face priority and reconstructs every driver/UV bit',()=>{
 const {geo,keys}=fixture(),result=indexBridgeGeometry(geo,keys,[0],true),candidate=result.geometry;
 assert.deepEqual(result.triangleSourceFaces,[0,0,1]);assert.deepEqual(candidate.userData.qaTriangleSourceFaces,[0,0,1]);
 let forwardFace=0;for(let f=0;f<candidate.index.count/3;f++){
  const vertex=candidate.index.getX(f*3);if(candidate.getAttribute('aPart').getW(vertex)===1)continue;
  for(const [name,attribute] of Object.entries(geo.attributes)){if(attribute.isInstancedBufferAttribute)continue;const bits=new Uint32Array(attribute.array.buffer),restored=new Uint32Array(candidate.getAttribute(name).array.buffer);
   for(let corner=0;corner<3;corner++)for(let c=0;c<attribute.itemSize;c++)assert.equal(restored[candidate.index.getX(f*3+corner)*attribute.itemSize+c],bits[(forwardFace*3+corner)*attribute.itemSize+c]);
  }forwardFace++;
 }assert.equal(forwardFace,2);assert.equal(geo.index,null);
});
