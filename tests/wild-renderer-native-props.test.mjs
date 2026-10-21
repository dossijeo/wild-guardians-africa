import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';

test('native packed props preserve Three.js matrices, suppression and slot order',async()=>{
 const path=process.env.WR_PACKED_WASM??new URL('../src/rendering/wild-renderer/core.wasm',import.meta.url);
 const {instance}=await WebAssembly.instantiate(await readFile(path),{wasi_snapshot_preview1:{proc_exit(){throw Error('exit');}}});
 const w=instance.exports,n=512,p=w.malloc(n*40),out=w.malloc(n*64),indices=w.malloc(n*4),suppressed=w.malloc(12);
 const data=new DataView(w.memory.buffer,p,n*40),dummy=new THREE.Object3D();
 const expected=[],expectedIndices=[];
 new Int32Array(w.memory.buffer,suppressed,3).set([2,17,-17]);
 for(let i=0;i<n;i++){
  const values=[Math.fround(i*.37),Math.fround(-i*.21),Math.fround(i*.03),1,Math.fround(.3+(i%9)*.17),Math.fround(i*.123)];
  values.forEach((v,k)=>data.setFloat32(i*40+k*4,v,true));
  [i%3,2,i,-i].forEach((v,k)=>data.setInt32(i*40+24+k*4,v,true));
  if(i%3!==2||i===17)continue;
  dummy.position.set(values[0]-48,values[2],values[1]+96);
  dummy.rotation.set(0,values[5],0);dummy.scale.setScalar(values[4]);dummy.updateMatrix();
  expected.push(...new Float32Array(dummy.matrix.elements));expectedIndices.push(i);
 }
 const count=w.wr_props(p,n,2,suppressed,1,48,-96,out,indices);
 assert.equal(count,expectedIndices.length);
 // Signed zero is geometrically equivalent; every nonzero Float32 must match exactly.
 const actual=new Float32Array(w.memory.buffer,out,count*16);
 for(let i=0;i<actual.length;i++)assert.ok(actual[i]===expected[i],`matrix ${i}: ${actual[i]} != ${expected[i]}`);
 assert.deepEqual(Array.from(new Uint32Array(w.memory.buffer,indices,count)),expectedIndices);
 for(const ptr of [p,out,indices,suppressed])w.free(ptr);
});
