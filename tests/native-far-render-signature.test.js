import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarRenderSignature,nativeFarPackingSignature} from '../tools/experiments/native-far-render-signature.js';
import {NativePreparedTreeCoverage} from '../tools/experiments/native-prepared-tree-coverage.js';
import {NativeTreeCoverage} from '../tools/experiments/native-tree-coverage.js';
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

function packingFixture(){
 const world=fixture(),mesh=level=>({count:1,visible:true,geometry:{uuid:'source-'+level},material:{uuid:'source-material',version:1,visible:true},instanceMatrix:{version:1}}),batch={slot:0,meshes:[mesh(0),mesh(1)],orders:[[0],[1]],instances:[{id:'near'},{id:'far'}]},chunks=new Map([['chunk',{visible:true,userData:{lodBatches:[batch]}}]]),native=new NativeTreeCoverage(0);
 native.update(chunks);const proof=new NativePreparedTreeCoverage(native,()=>nativeFarRenderSignature(world,0),record=>nativeFarPackingSignature(world,record));proof.complete(proof.capture());return {world,batch,chunks,native,proof};
}
test('another LOD packing and merged resource replacement preserve an unchanged near packing proof',()=>{
 const f=packingFixture(),near=f.native.batches.get(f.batch.meshes[0]);assert.equal(f.proof.has('near'),true);
 f.batch.meshes[1].instanceMatrix.version++;f.native.update(f.chunks);f.world.assetGroups.colors.get('0:1').mesh.geometry.uuid='far-replacement';f.proof.update();
 assert.equal(f.native.batches.get(f.batch.meshes[0]),near);assert.equal(f.proof.has('near'),true);assert.equal(f.proof.has('far'),false);
 assert.equal(f.proof.complete(f.proof.capture()),1);assert.equal(f.proof.has('far'),true);
});
test('partial completion accepts only unchanged LOD packing resources, never matrices or new IDs',()=>{
 const f=packingFixture();f.proof.clear();const snapshot=f.proof.capture();f.world.assetGroups.colors.get('0:1').mesh.geometry.uuid='replacement';
 assert.equal(f.proof.complete(snapshot),1);assert.equal(f.proof.has('near'),true);assert.equal(f.proof.has('far'),false);
 const next=f.proof.capture();f.batch.instances.push({id:'added'});f.batch.orders[0]=[0,2];f.batch.meshes[0].count=2;f.batch.meshes[0].instanceMatrix.version++;f.native.update(f.chunks);
 assert.equal(f.proof.complete(next),1);assert.equal(f.proof.has('near'),false);assert.equal(f.proof.has('added'),false);assert.equal(f.proof.has('far'),true);
});
test('own source/merged material or geometry and origin replacement revoke exactly the affected LOD proofs',()=>{
 for(const change of [f=>f.batch.meshes[0].geometry.uuid='source-new',f=>f.batch.meshes[0].material.version++,f=>f.world.assetGroups.colors.get('0:0').mesh.geometry.uuid='merged-new',f=>f.world.assetGroups.colors.get('0:0').mesh.material.version++]){
  const f=packingFixture();change(f);f.native.update(f.chunks);f.proof.update();assert.equal(f.proof.has('near'),false);assert.equal(f.proof.has('far'),true);
 }
 const f=packingFixture();f.world.renderOrigin.revision++;f.proof.update();assert.equal(f.proof.has('near'),false);assert.equal(f.proof.has('far'),false);f.proof.clear();assert.equal(f.proof.resourceSignatures.size,0);
});
