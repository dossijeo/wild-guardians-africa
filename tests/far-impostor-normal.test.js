import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {decodedImpostorNormal} from '../tools/experiments/far-impostor-lighting.js';
test('decoded normal rotates and rescales like the native inverse-transpose matrix',()=>{
 for(let i=0;i<64;i++){
  const n=new THREE.Vector3(Math.sin(i+.3),Math.cos(i*.7),Math.sin(i*1.3+.8)).normalize(),tree={yaw:i*.23,sx:.7+i*.01,sy:1.2,sz:1.5-i*.005};
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(10,20,-30),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),tree.yaw),new THREE.Vector3(tree.sx,tree.sy,tree.sz));
  const expected=n.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matrix));
  for(const alpha of [1,.4]){const rgb=n.toArray().map(value=>(value*.5+.5)*alpha),actual=decodedImpostorNormal(rgb,alpha,tree);assert.ok(new THREE.Vector3(...actual).distanceTo(expected)<1e-12);}
 }
});
test('cancelled angular directions and transparent samples use the stable fallback',()=>{
 assert.deepEqual(decodedImpostorNormal([.5,.5,.5],1,{yaw:0}),[0,1,0]);assert.deepEqual(decodedImpostorNormal([0,0,0],0,{yaw:0},[1,0,0]),[1,0,0]);
 const a=[.5,.5,1],b=[1,.5,.5],mixed=a.map((v,i)=>(v+b[i])*.5);const n=decodedImpostorNormal(mixed,1,{yaw:0,scale:1});assert.ok(Math.abs(n[0]-Math.SQRT1_2)<1e-12);assert.ok(Math.abs(n[2]-Math.SQRT1_2)<1e-12);
});
