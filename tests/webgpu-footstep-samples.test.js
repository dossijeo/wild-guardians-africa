import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4,Quaternion,Vector3 } from 'three';
import { bakeWebGpuFootstep } from '../src/rendering/webgpu-footstep-samples.js';
import { createNativeVfx } from '../src/rendering/vfx-native.js';

const rects={smoke:[[.1,.2,.3,.4]]};
test('sampled footsteps reproduce native sprite and rigid keyframes on flat and inclined terrain',()=>{
 for(const surface of [()=>0,(x,z)=>.17*x+.06*z]){
  const sampled=bakeWebGpuFootstep({rects,surface}),native=createNativeVfx('dust',rects,{stepMode:true,surface,softParticleDepth:false,worldLights:false});
  assert.equal(sampled.spriteCount,4);assert.equal(sampled.rigidCount,4);
  const spriteSlots=new Map(),rigidSlots=new Map(),matrix=new Matrix4(),pos=new Vector3(),quat=new Quaternion(),scale=new Vector3();
  for(let frame=1;frame<97;frame++){
   native.advance(1/60);const row=frame*176;
   for(const sprite of native.sprites()){
    const part=native.parts.find(p=>p.p===sprite.p);if(!spriteSlots.has(part))spriteSlots.set(part,spriteSlots.size);const offset=row+spriteSlots.get(part)*28;
    for(let k=0;k<3;k++)assert.ok(Math.abs(sampled.data[offset+k]-sprite.p[k])<1e-6);
    assert.ok(Math.abs(sampled.data[offset+17]-sprite.alpha)<1e-6);
   }
   const packed=native.rigidInstances().soil;let i=0;
   for(const rigid of native.rigids){if(!rigidSlots.has(rigid))rigidSlots.set(rigid,rigidSlots.size);const offset=row+112+rigidSlots.get(rigid)*16;
    matrix.compose(pos.fromArray(sampled.data,offset),quat.fromArray(sampled.data,offset+4),scale.fromArray(sampled.data,offset+8));
    for(let k=0;k<16;k++)assert.ok(Math.abs(matrix.elements[k]-packed.data[i*23+k])<1e-6,`frame ${frame}, element ${k}`);i++;
   }
  }
  assert.deepEqual(bakeWebGpuFootstep({rects,surface}).data,sampled.data);
 }
});
