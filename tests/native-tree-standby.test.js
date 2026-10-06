import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {NativeTreeStandby,standbyTreeKey} from '../tools/experiments/native-tree-standby.js';
function fixture(prepare=async()=>{}){const geometry=new THREE.BoxGeometry(2,4,2),material=new THREE.MeshStandardMaterial(),scene=new THREE.Scene(),sources=[{geometry,material},{geometry,material}],owner=new NativeTreeStandby({scene,sources,prepare});return {owner,scene,sources,close(){owner.dispose();geometry.dispose();material.dispose();}};}
function tree(id='a',x=0){return {id,x,y:0,z:0,yaw:0,sx:1,sy:1,sz:1};}
function descriptor(t=tree(),level=0){const matrix=new THREE.Matrix4().makeTranslation(t.x,t.y,t.z).toArray();return {id:t.id,key:standbyTreeKey(t),x:t.x,z:t.z,level,matrix};}
async function settled(owner){for(let i=0;i<30&&owner.busy;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(owner.busy,false);}
test('standby owns uploaded frozen matrices and never authorizes CPU-only or changed logical trees',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve)),t=tree(),d=descriptor(t);f.owner.request([d],{x:0,z:0});assert.equal(f.owner.has(t.id,t),false);assert.equal(f.scene.children.length,0);d.matrix[12]=500;finish();await settled(f.owner);
 assert.equal(f.owner.has(t.id,t),true);assert.equal(f.owner.active.meshes[0].instanceMatrix.array[12],0);assert.equal(f.owner.has(t.id,tree('a',2)),false);assert.equal(f.owner.has(t.id,t,new Set(['a'])),false);assert.equal(f.owner.has('new',tree('new')),false);f.close();
});
test('previous prepared bank remains drawable until replacement upload finishes and logical LOD changes reuse it',async()=>{
 let finish;const f=fixture(),a=tree();f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const bank=f.owner.active,revision=f.owner.revision;
 f.owner.request([descriptor(a,1)],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.active,bank);assert.equal(f.owner.revision,revision);
 f.owner.prepare=()=>new Promise(resolve=>finish=resolve);const b=tree('b',2);f.owner.request([descriptor(a,1),descriptor(b)],{x:0,z:0});assert.equal(f.owner.active,bank);assert.equal(f.owner.has('a',a),true);assert.equal(f.owner.has('b',b),false);finish();await settled(f.owner);assert.notEqual(f.owner.active,bank);assert.equal(f.owner.has('b',b),true);assert.equal(f.scene.children.length,1);f.close();
});
test('fallback renders only while its native replacement lacks proof, using exact transition and suppression',async()=>{
 const f=fixture(),t=tree();f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);const mesh=f.owner.active.meshes[0],rows=new Map([[t.id,t]]),state=()=>({ready:1,enabled:true});
 f.owner.update({x:0,z:50},rows,state,()=>false,new Set());assert.equal(mesh.visible,true);assert.equal(mesh.geometry.attributes.nativeVisibility.getX(0),.5);assert.equal(mesh.castShadow,false);assert.equal(f.owner.stats.rendered,1);
 f.owner.update({x:0,z:50},rows,state,()=>true,new Set());assert.equal(mesh.visible,false);assert.equal(f.owner.stats.rendered,0);
 f.owner.update({x:0,z:30},rows,state,()=>false,new Set(['a']));assert.equal(mesh.visible,false);f.owner.update({x:0,z:30},new Map([['a',tree('a',3)]]),state,()=>false,new Set());assert.equal(mesh.visible,false);f.close();
});
test('inactive banks are reused and source GPU attribute identities remain borrowed only at CPU-array level',async()=>{
 const f=fixture();let sourceDisposed=0,materialDisposed=0;f.sources[0].geometry.addEventListener('dispose',()=>sourceDisposed++);f.sources[0].material.addEventListener('dispose',()=>materialDisposed++);
 f.owner.request([descriptor(tree())],{x:0,z:0});await settled(f.owner);const first=f.owner.active;
 assert.notEqual(first.meshes[0].geometry.attributes.position,f.sources[0].geometry.attributes.position);assert.equal(first.meshes[0].geometry.attributes.position.array,f.sources[0].geometry.attributes.position.array);
 f.owner.request([descriptor(tree()),descriptor(tree('b',2))],{x:0,z:0});await settled(f.owner);f.owner.request([descriptor(tree()),descriptor(tree('b',2)),descriptor(tree('c',3))],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.active,first);assert.ok(f.owner.stats.estimatedOwnedGpuBytes>0);f.owner.dispose();f.owner.dispose();assert.equal(sourceDisposed,0);assert.equal(materialDisposed,0);assert.equal(f.scene.children.length,0);f.close();
});
test('world close during replacement removes visible bank and releases late buffers exactly once',async()=>{
 let finish;const f=fixture();f.owner.request([descriptor(tree())],{x:0,z:0});await settled(f.owner);f.owner.prepare=()=>new Promise(resolve=>finish=resolve);f.owner.request([descriptor(tree('b',2))],{x:0,z:0});const geometries=f.owner.banks.flatMap(b=>b.meshes.map(m=>m.geometry)),releases=new Map();for(const g of geometries)g.addEventListener('dispose',()=>releases.set(g,(releases.get(g)??0)+1));
 f.owner.dispose();assert.equal(f.scene.children.length,0);finish();await settled(f.owner);assert.equal(f.owner.active,null);assert.equal(f.owner.banks.every(b=>b===null),true);assert.ok(geometries.every(g=>releases.get(g)===1));f.close();
});
test('standby prunes distant identities and refuses to exceed its explicit population budget',async()=>{
 const f=fixture();f.owner.request([descriptor(tree())],{x:0,z:0});await settled(f.owner);f.owner.request([descriptor(tree('b',200))],{x:200,z:0});await settled(f.owner);assert.equal(f.owner.has('a',tree()),false);assert.equal(f.owner.has('b',tree('b',200)),true);
 f.owner.maxTrees=1;f.owner.request([descriptor(tree('c',201))],{x:200,z:0});await settled(f.owner);assert.match(f.owner.stats.errors.at(-1),/budget/);assert.equal(f.owner.has('b',tree('b',200)),true);assert.equal(f.owner.has('c',tree('c',201)),false);f.close();
});
