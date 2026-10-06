import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {refreshResidentProps} from '../src/rendering/resident-props.js';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
import {FarTreeTransitions} from '../tools/experiments/far-tree-transitions.js';
import {NativeTreeCoverage} from '../tools/experiments/native-tree-coverage.js';
function fixture(){
 const geometry=new THREE.BoxGeometry(2,4,2);geometry.computeBoundingBox();const material=new THREE.MeshStandardMaterial(),levels=[{geometry,material}],group=new THREE.Group(),tree={id:'native-acacia',x:0,y:0,z:0,yaw:.4,sx:.8,sy:1.1,sz:1.2};
 group.userData.nativeChunkOrigin=[0,0];group.userData.propSources=[[tree]];group.userData.contactInstances=[[tree]];
 const build=(g,slot,instances)=>{if(instances.length)createAssetLod(g,levels,instances,{group:0},slot);};build(group,0,[tree]);
 const chunks=new Map([['0,0',group]]),camera=new THREE.PerspectiveCamera();camera.position.set(0,5,20);
 return {group,tree,chunks,camera,build,close(){for(const b of group.userData.lodBatches){b.shadow.dispose();for(const m of b.meshes){m.dispose();m.geometry.dispose();}}geometry.dispose();material.dispose();}};
}
test('loaded native chunk cannot replace impostor until color instances are packed; quiet frames reuse coverage',()=>{
 const f=fixture(),coverage=new NativeTreeCoverage();coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);
 updateAssetLods(f.chunks,f.camera,'media');assert.equal(coverage.update(f.chunks),true);assert.equal(coverage.has(f.tree.id),true);
 const scans=coverage.scans;for(let i=0;i<180;i++)assert.equal(coverage.update(f.chunks),false);assert.equal(coverage.scans,scans);
 const mesh=f.group.userData.lodBatches[0].meshes[0];mesh.visible=false;coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);
 mesh.visible=true;mesh.material.visible=false;coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);
 mesh.material.visible=true;coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),true);
 f.group.visible=false;coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);f.close();
});
test('native suppression, rebuilding and chunk retirement invalidate coverage without terrain regeneration',()=>{
 const f=fixture(),coverage=new NativeTreeCoverage(),suppressed=new Set();updateAssetLods(f.chunks,f.camera,'media');coverage.update(f.chunks);assert.ok(coverage.has(f.tree.id,suppressed));
 suppressed.add(f.tree.id);assert.equal(coverage.has(f.tree.id,suppressed),false);
 refreshResidentProps(f.chunks,suppressed,f.build);coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);
 suppressed.clear();refreshResidentProps(f.chunks,suppressed,f.build);coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);
 updateAssetLods(f.chunks,f.camera,'media');coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),true);
 f.chunks.clear();coverage.update(f.chunks);assert.equal(coverage.has(f.tree.id),false);assert.equal(coverage.batches.size,0);f.close();
});

test('coverage is species-specific and overlapping owners keep an ID until the final owner retires',()=>{
 const a=fixture(),b=fixture(),coverage=new NativeTreeCoverage();
 a.build(a.group,1,[{...a.tree,id:'other-species'}]);updateAssetLods(a.chunks,a.camera,'media');updateAssetLods(b.chunks,b.camera,'media');
 const chunks=new Map([['a',a.group],['b',b.group]]);coverage.update(chunks);assert.equal(coverage.has('other-species'),false);assert.equal(coverage.counts.get(a.tree.id),2);
 chunks.delete('a');coverage.update(chunks);assert.equal(coverage.has(a.tree.id),true);assert.equal(coverage.counts.get(a.tree.id),1);
 chunks.delete('b');coverage.update(chunks);assert.equal(coverage.has(a.tree.id),false);coverage.clear();assert.equal(coverage.counts.size,0);a.close();b.close();
});

test('native CPU coverage and explicit GPU completion jointly gate per-ID transitions and suppression',()=>{
 const f=fixture(),coverage=new NativeTreeCoverage(),controller=new FarTreeTransitions({duration:1}),values=new Map(),enabled=new Map();let writes=0;
 const sink={setTreeReadiness(id,v){values.set(id,v);writes++;},setTreeEnabled(id,v){enabled.set(id,v);}};
 controller.bind(sink,[f.tree]);coverage.update(f.chunks);controller.setCoverage(coverage,false);assert.equal(values.get(f.tree.id),0);
 updateAssetLods(f.chunks,f.camera,'media');coverage.update(f.chunks);controller.setCoverage(coverage,false);controller.advance(1);assert.equal(values.get(f.tree.id),0);
 controller.setCoverage(coverage,true);controller.advance(.25);assert.equal(values.get(f.tree.id),.25);
 controller.bind(sink,[{id:'new'},f.tree]);assert.equal(values.get(f.tree.id),.25);assert.equal(values.get('new'),0);controller.advance(.75);assert.equal(values.get(f.tree.id),1);
 const previous=writes;for(let i=0;i<180;i++){assert.equal(controller.setCoverage(coverage,true),false);assert.equal(controller.advance(.016),0);}assert.equal(writes,previous);
 controller.setSuppressions(new Set([f.tree.id]));assert.equal(enabled.get(f.tree.id),false);assert.equal(values.get(f.tree.id),0);assert.equal(controller.active.size,0);
 controller.setSuppressions(new Set());assert.equal(enabled.get(f.tree.id),true);controller.advance(.5);assert.equal(values.get(f.tree.id),.5);
 controller.setCoverage(coverage,false);assert.equal(values.get(f.tree.id),0);assert.equal(controller.advance(1),0);
 controller.setCoverage(coverage,true);controller.advance(1);f.chunks.clear();coverage.update(f.chunks);controller.setCoverage(coverage,true);assert.equal(values.get(f.tree.id),0);controller.bind(sink,[{id:'new'}]);assert.equal(controller.states.has(f.tree.id),false);
 assert.throws(()=>controller.advance(-1),/Invalid/);assert.throws(()=>controller.setCoverage(coverage,1),/Invalid/);controller.clear();assert.equal(controller.states.size,0);f.close();
});

test('native LOD coverage drives actual prototype readiness buffers and hides both representations on suppression',()=>{
 const f=fixture(),source=f.group.userData.lodBatches[0].levels[0],p=createFarImpostorPrototype(source,new THREE.Texture(),{impostorWidth:2,impostorHeight:4,localBase:[0,0,0]},[f.tree]),coverage=new NativeTreeCoverage(),controller=new FarTreeTransitions();
 controller.bind(p,[f.tree]);p.update(f.camera);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),0);assert.equal(p.models.geometry.attributes.aTreeReady.getX(0),0);
 updateAssetLods(f.chunks,f.camera,'media');coverage.update(f.chunks);controller.setCoverage(coverage,false);controller.advance(1);assert.equal(p.treeState(f.tree.id).ready,0);
 controller.setCoverage(coverage,true);controller.advance(.5);p.update(f.camera);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),.5);assert.equal(p.models.geometry.attributes.aTreeReady.getX(0),.5);
 controller.setSuppressions(new Set([f.tree.id]));p.update(f.camera);assert.equal(p.impostors.geometry.attributes.aTreeReady.getX(0),-1);assert.equal(p.models.geometry.attributes.aTreeReady.getX(0),-1);
 const revision=p.stats().readinessRevision;assert.equal(controller.setSuppressions(new Set([f.tree.id])),false);assert.equal(p.stats().readinessRevision,revision);
 controller.setSuppressions(new Set());controller.advance(1);p.update(f.camera);assert.deepEqual(p.treeState(f.tree.id),{ready:1,enabled:true});p.dispose();controller.clear();f.close();
});
