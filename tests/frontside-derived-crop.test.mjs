import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {derivedCropGeometry} from '../tools/lib/frontside-derived-crop.mjs';
test('derived leaf reversals preserve UV/positions, negate normals and leave the core single',()=>{
 const source=new THREE.BufferGeometry(),growth=new THREE.InstancedBufferAttribute(new Float32Array([1,1,1,0]),4);source.setAttribute('iGrowth',growth);
 const triangle=[[0,0,0,0,0,1,0,0],[1,0,0,0,0,1,1,0],[0,1,0,0,0,1,0,1]];
 const payload={status:'BLENDER_REMODELLING_TRAINING_NOT_APPROVED',sourceSha256:'test',corners:[triangle,triangle],faceLabels:[0,2]};
 const geometry=derivedCropGeometry(source,payload,true);assert.equal(geometry.index.count,9);assert.equal(geometry.getAttribute('iGrowth'),growth);
 const index=geometry.index.array;for(let c=0;c<3;c++){const a=index[3+[0,2,1][c]],b=index[6+c];for(const lane of ['position','uv'])assert.deepEqual(Array.from(geometry.getAttribute(lane).array.slice(a*geometry.getAttribute(lane).itemSize,(a+1)*geometry.getAttribute(lane).itemSize)),Array.from(geometry.getAttribute(lane).array.slice(b*geometry.getAttribute(lane).itemSize,(b+1)*geometry.getAttribute(lane).itemSize)));assert.equal(geometry.getAttribute('normal').getZ(b),-1);assert.equal(geometry.getAttribute('aQaReverse').getX(b),1);}
 assert.deepEqual(geometry.userData.qaDerivedFaceLabels,[0,2,2]);assert.equal(source.index,null);
});
