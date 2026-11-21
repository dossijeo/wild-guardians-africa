import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry,BufferAttribute,InstancedBufferAttribute,DynamicDrawUsage} from 'three';
import {packWebGpuStaticVertexLayout} from '../src/rendering/webgpu-static-vertex-layout.js';

test('crop bridge channels share one static buffer without changing vertex values or live instance attributes',()=>{
 const source=new BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2],['aRoot',3],['aPeerRoot',3],['aSpin',4],['aPart',4]])source.setAttribute(name,new BufferAttribute(Float32Array.from({length:6*size},(_,i)=>i*.125),size));
 source.setIndex([0,1,2,3,4,5]);const geometry=source.clone(),live=new InstancedBufferAttribute(new Float32Array(8),4).setUsage(DynamicDrawUsage),shape=new InstancedBufferAttribute(new Float32Array(8),4),color=new BufferAttribute(new Uint8Array(18).fill(255),3,true);geometry.setAttribute('iBridge',live);geometry.setAttribute('iShape',shape);geometry.setAttribute('color',color);
 packWebGpuStaticVertexLayout(geometry);
 const buffers=new Set();for(const [name,original] of Object.entries(source.attributes)){const packed=geometry.getAttribute(name);assert.equal(packed.isInterleavedBufferAttribute,true);buffers.add(packed.data);for(let v=0;v<original.count;v++)for(let c=0;c<original.itemSize;c++)assert.equal(packed.getComponent(v,c),original.getComponent(v,c));assert.equal(original.isInterleavedBufferAttribute,undefined);}
 assert.equal(buffers.size,1);assert.equal(geometry.getAttribute('iBridge'),live);assert.equal(geometry.getAttribute('iShape'),shape);assert.equal(geometry.getAttribute('color'),color);assert.deepEqual(geometry.index.array,source.index.array);
 const position=geometry.getAttribute('position');packWebGpuStaticVertexLayout(geometry);assert.equal(geometry.getAttribute('position'),position);
 source.dispose();geometry.dispose();
});
