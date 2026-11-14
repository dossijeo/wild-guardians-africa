import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three';
import {createPreparedTerrainPlacement} from '../src/rendering/webgpu-terrain-placement.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture(nextHeight=7){
 const scene=new Scene(),object=new Group(),entity={id:'structure',x:2,z:3},geometry=new BoxGeometry(),material=new MeshBasicMaterial();object.add(new Mesh(geometry,material));object.position.set(2,2.025,3);scene.add(object);object.updateWorldMatrix(true,true);
 let current=true;const part=createPreparedTerrainPlacement({object,entity,previousHeight:2,nextHeight,isCurrent:()=>current}),admission={prepareManyAndPublish(){},prepareTicket:async()=>({valid:()=>true,validAfterAttach:()=>true})},coordinator=createChunkPublicationCoordinator({admission});
 const pair=side=>({key:'0,0',epoch:'e',revision:1,publicationOrder:1,side,object:new Group(),signal:new AbortController().signal,eventRoots(){return [this.object];},presentation:()=>({show:[],hide:[]}),activate:()=>true,attach(){},rollback(){},finalize:()=>({retire(){},notify(){}}),rollbackFinalized(){},cancel(){}});
 return {object,entity,part,scene,coordinator,parts:[pair('terrain'),pair('biome')],invalidate(){current=false;},dispose(){coordinator.dispose();geometry.dispose();material.dispose();}};
}

test('prepared placement records future world matrices, restores picking matrices and commits the same meshes',async()=>{
 const f=fixture();try{const mesh=f.object.children[0],geometry=mesh.geometry,material=mesh.material,batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[f.part]});
  batch.capturePresentation(()=>{assert.equal(f.object.position.y,7.025);assert.equal(mesh.getWorldPosition(new Vector3()).y,7.025);});
  assert.equal(f.object.position.y,2.025);assert.equal(mesh.getWorldPosition(new Vector3()).y,2.025);assert.equal(f.part.valid(),true);assert.equal(batch.commit(),true);assert.equal(f.object.position.y,7.025);assert.equal(f.object.children[0],mesh);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);f.part.rollback();assert.equal(f.object.position.y,7.025,'a retired reservation cannot undo a published placement');
 }finally{f.dispose();}
});

test('prepared support retirement hides an existing object without releasing its reusable resources',async()=>{
 const f=fixture(null);try{const mesh=f.object.children[0],batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[f.part]});batch.capturePresentation(()=>assert.equal(f.object.visible,false));assert.equal(f.object.visible,true);batch.commit();assert.equal(f.object.visible,false);assert.equal(mesh.parent,f.object);assert.equal(f.object.parent,f.scene);}finally{f.dispose();}
});

test('readmission prepares a hidden admitted root without changing it before confirmation',async()=>{
 const f=fixture();try{f.part.cancel();f.object.visible=false;const mesh=f.object.children[0],part=createPreparedTerrainPlacement({object:f.object,entity:f.entity,previousHeight:null,nextHeight:7,isCurrent:()=>true}),batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[part]});batch.capturePresentation(()=>{assert.equal(f.object.visible,true);assert.equal(mesh.getWorldPosition(new Vector3()).y,7.025);});assert.equal(f.object.visible,false);assert.equal(f.object.position.y,2.025);batch.commit();assert.equal(f.object.visible,true);assert.equal(f.object.position.y,7.025);assert.equal(f.object.children[0],mesh);}finally{f.dispose();}
});

test('capture failure and late batch failure both restore original placement and world matrices',async()=>{
 for(const phase of ['capture','finalize']){const f=fixture();try{if(phase==='finalize')f.parts[1].finalize=()=>{throw Error('finalization failed');};const batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[f.part]});assert.throws(()=>phase==='capture'?batch.capturePresentation(()=>{throw Error('capture failed');}):batch.commit(),/failed/);assert.equal(f.object.position.y,2.025);assert.equal(f.object.children[0].getWorldPosition(new Vector3()).y,2.025);assert.equal(f.object.visible,true);}finally{f.dispose();}}
});

test('another finalization failure reverses an already finalized placement before any retirement',async()=>{
 const f=fixture();try{const object=new Group(),other={object,valid:()=>true,signal:new AbortController().signal,eventRoots:()=>[object],activate:()=>true,attach(){},rollback(){},finalize(){throw Error('later owner failed');},rollbackFinalized(){},cancel(){}};const batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[f.part,other]});assert.throws(()=>batch.commit(),/later owner/);assert.equal(f.object.position.y,2.025);assert.equal(f.object.visible,true);assert.equal(f.object.children[0].getWorldPosition(new Vector3()).y,2.025);}finally{f.dispose();}
});

test('a render callback cannot silently overwrite the proposed position',async()=>{
 const f=fixture();try{const batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,dependents:[f.part]});assert.throws(()=>batch.capturePresentation(()=>{f.object.position.y=2.025;}),/changed while recording/);assert.equal(f.object.position.y,2.025);assert.equal(f.object.children[0].getWorldPosition(new Vector3()).y,2.025);assert.equal(f.part.valid(),false);}finally{f.dispose();}
});

for(const change of ['owner','position','rotation','parent'])test(`placement rejects a changed ${change} before becoming effective`,()=>{
 const f=fixture();try{if(change==='owner')f.invalidate();if(change==='position')f.object.position.x++;if(change==='rotation')f.object.rotation.y=.3;if(change==='parent')f.object.removeFromParent();assert.equal(f.part.valid(),false);assert.throws(()=>f.part.activate(),/stale/);f.part.cancel();assert.equal(f.object.position.y,2.025);}finally{f.dispose();}
});

test('placement cancellation detaches its upstream listener and never disposes the retained object',()=>{
 const f=fixture(),controller=new AbortController();try{f.part.cancel();const part=createPreparedTerrainPlacement({object:f.object,entity:f.entity,previousHeight:2,nextHeight:9,isCurrent:()=>true,signal:controller.signal});controller.abort();assert.equal(part.valid(),false);assert.equal(part.cancel(),false);assert.equal(f.object.parent,f.scene);assert.equal(f.object.position.y,2.025);}finally{f.dispose();}
});
