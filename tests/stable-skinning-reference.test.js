import test from 'node:test';
import assert from 'node:assert/strict';
import {stableSkinningReference} from '../tools/experiments/stable-skinning-reference.mjs';

test('skinning QA override is exact and rejects duplicate or already patched references',()=>{
 const original='this.boneMatricesNode = referenceBuffer("skeleton.boneMatrices", "mat4", skinnedMesh.skeleton.bones.length);';
 assert.match(stableSkinningReference(original),/\.setName\("wgBoneMatrices"\)/);assert.equal(stableSkinningReference('other module'),null);
 assert.throws(()=>stableSkinningReference(original+original),/Unexpected Three/);assert.throws(()=>stableSkinningReference(stableSkinningReference(original)),/Unexpected Three/);
});
