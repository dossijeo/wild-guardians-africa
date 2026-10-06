import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarRenderSignature} from '../tools/experiments/native-far-render-signature.js';
import {NativePreparedTreeCoverage} from '../tools/experiments/native-prepared-tree-coverage.js';
function fixture(){const group=(id)=>({mesh:{geometry:{uuid:'g'+id},material:{uuid:'m'+id,version:1}}});return {renderOrigin:{revision:0},assetGroups:{colors:new Map([['0:0',group(0)],['0:1',group(1)],['1:0',group(2)],['10:0',group(3)]])}};}
test('another species or vegetation group cannot invalidate a completed fence of unchanged trees',()=>{
 const world=fixture(),native={revision:1,batches:new Map([[{}, {ids:new Set(['tree'])}]])},proof=new NativePreparedTreeCoverage(native,()=>nativeFarRenderSignature(world,0)),snapshot=proof.capture();
 world.assetGroups.colors.delete('1:0');world.assetGroups.colors.get('10:0').mesh.geometry.uuid='replacement';assert.equal(proof.complete(snapshot),1);assert.equal(proof.has('tree'),true);world.assetGroups.colors.set('1:0',{mesh:{geometry:{uuid:'another'},material:{uuid:'new',version:9}}});assert.equal(proof.update(),false);assert.equal(proof.has('tree'),true);
});
test('own geometry, material recipe, LOD addition/removal and render-origin changes reject obsolete fences',()=>{
 for(const change of [w=>w.assetGroups.colors.get('0:0').mesh.geometry.uuid='new',w=>w.assetGroups.colors.get('0:0').mesh.material.uuid='new',w=>w.assetGroups.colors.get('0:1').mesh.material.version++,w=>w.assetGroups.colors.delete('0:1'),w=>w.assetGroups.colors.set('0:2',w.assetGroups.colors.get('0:0')),w=>w.renderOrigin.revision++]){
 const world=fixture(),native={revision:1,batches:new Map([[{}, {ids:new Set(['tree'])}]])},proof=new NativePreparedTreeCoverage(native,()=>nativeFarRenderSignature(world,0)),snapshot=proof.capture();change(world);assert.equal(proof.complete(snapshot),0);assert.equal(proof.has('tree'),false);assert.equal(proof.complete(proof.capture()),1);
 }
});
test('camera motion, uniform fades and map iteration order do not create new renderable generations',()=>{
 const world=fixture(),before=nativeFarRenderSignature(world,0),g=world.assetGroups.colors.get('0:0');world.assetGroups.colors.delete('0:0');world.assetGroups.colors.set('0:0',g);g.mesh.instanceMatrix={version:99};world.camera={position:{x:200,z:300}};g.mesh.material.uniforms={fade:{value:.5}};assert.equal(nativeFarRenderSignature(world,0),before);
});
