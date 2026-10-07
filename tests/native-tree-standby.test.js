import {obstructionMaterial} from '../src/rendering/obstruction.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../src/rendering/material-registry.js';
import {NativeFarGpuCancelled} from '../tools/experiments/prepare-native-far-gpu.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {NativeTreeStandby,standbyTreeKey,standbyCoverageReady,finalizeStandbyMaterials,standbySubmittedTriangles} from '../tools/experiments/native-tree-standby.js';
function fixture(prepare=async()=>{}){const geometry=new THREE.BoxGeometry(2,4,2),material=new THREE.MeshStandardMaterial(),scene=new THREE.Scene(),sources=[{geometry,material},{geometry,material}],owner=new NativeTreeStandby({scene,sources,prepare});return {owner,scene,sources,close(){owner.dispose();geometry.dispose();material.dispose();}};}
function tree(id='a',x=0){return {id,x,y:0,z:0,yaw:0,sx:1,sy:1,sz:1};}
function descriptor(t=tree(),level=0){const matrix=new THREE.Matrix4().makeTranslation(t.x,t.y,t.z).toArray();return {id:t.id,key:standbyTreeKey(t),x:t.x,z:t.z,level,matrix};}
async function settled(owner){for(let i=0;i<30&&owner.busy;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(owner.busy,false);}
test('retained proof requires current physical selection and matching native and procedural identities',async()=>{
 const f=fixture(),t=tree();f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);
 let selected=true;const args={coverage:{has:(id,s)=>selected&&id===t.id&&!s?.has(id)},standby:f.owner,nativeTree:t,logicalTree:{...t}};
 assert.equal(standbyCoverageReady(t.id,args),true);selected=false;assert.equal(standbyCoverageReady(t.id,args),false);selected=true;
 for(const field of ['nativeTree','logicalTree']){const previous=args[field];args[field]=tree(t.id,2);assert.equal(standbyCoverageReady(t.id,args),false);args[field]=undefined;assert.equal(standbyCoverageReady(t.id,args),false);args[field]=previous;}
 args.suppressed=new Set([t.id]);assert.equal(standbyCoverageReady(t.id,args),false);f.close();
});
test('standby owns uploaded frozen matrices and never authorizes CPU-only or changed logical trees',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve)),t=tree(),d=descriptor(t);f.owner.request([d],{x:0,z:0});assert.equal(f.owner.has(t.id,t),false);assert.equal(f.scene.children.length,0);d.matrix[12]=500;finish();await settled(f.owner);
 assert.equal(f.owner.has(t.id,t),true);assert.equal(f.owner.active.meshes[0].instanceMatrix.array[12],0);assert.equal(f.owner.has(t.id,tree('a',2)),false);assert.equal(f.owner.has(t.id,t,new Set(['a'])),false);assert.equal(f.owner.has('new',tree('new')),false);f.close();
});
test('LOD replacement keeps the uploaded previous level until its new fence completes',async()=>{
 let finish;const f=fixture(),a=tree();f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const bank=f.owner.active,revision=f.owner.revision;
 f.owner.prepare=()=>new Promise(resolve=>finish=resolve);f.owner.request([descriptor(a,1)],{x:0,z:0});
 assert.equal(f.owner.active,bank);assert.equal(f.owner.revision,revision);assert.equal(bank.entries.get(a.id).level,0);assert.equal(f.owner.has(a.id,a),true);
 f.owner.update({x:0,z:50},new Map([[a.id,a]]),()=>({ready:1,enabled:true}),()=>false,new Set());assert.equal(bank.meshes[0].geometry.attributes.nativeVisibility.getX(0),.5);
 finish();await settled(f.owner);assert.notEqual(f.owner.active,bank);assert.equal(f.owner.active.entries.get(a.id).level,1);assert.equal(f.owner.active.rows[0].length,0);assert.equal(f.owner.active.rows[1][0].id,a.id);assert.equal(f.owner.has(a.id,a),true);assert.equal(f.scene.children.length,1);
 const accepted=f.owner.active,acceptedRevision=f.owner.revision;f.owner.prepare=async()=>{};f.owner.request([descriptor(a,1)],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.active,accepted);assert.equal(f.owner.revision,acceptedRevision);
 f.owner.request([descriptor(a,0)],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.active.entries.get(a.id).level,0);assert.equal(f.owner.has(a.id,a),true);f.close();
});

test('a rejected LOD fence never replaces the previous prepared representation',async()=>{
 const f=fixture(),a=tree();f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const bank=f.owner.active;
 f.owner.prepare=async()=>{throw new NativeFarGpuCancelled('context-changed');};f.owner.request([descriptor(a,1)],{x:0,z:0});await settled(f.owner);
 assert.equal(f.owner.active,bank);assert.equal(bank.entries.get(a.id).level,0);assert.equal(f.owner.has(a.id,a),true);assert.equal(f.owner.stats.cancelledPreparations,1);assert.deepEqual(f.owner.stats.errors,[]);f.close();
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
 f.owner.dispose();assert.equal(f.scene.children.length,0);finish();await settled(f.owner);assert.equal(f.owner.active,null);assert.equal(f.owner.banks.every(b=>b===null),true);assert.ok(geometries.every(g=>releases.get(g)===1));assert.equal(f.owner.stats.estimatedOwnedGpuBytes,0);assert.equal(f.owner.stats.rendered,0);assert.equal(f.owner.stats.trees,0);f.close();
});
test('standby prunes distant identities and refuses to exceed its explicit population budget',async()=>{
 const f=fixture();f.owner.request([descriptor(tree())],{x:0,z:0});await settled(f.owner);f.owner.request([descriptor(tree('b',200))],{x:200,z:0});await settled(f.owner);assert.equal(f.owner.has('a',tree()),false);assert.equal(f.owner.has('b',tree('b',200)),true);
 f.owner.maxTrees=1;f.owner.request([descriptor(tree('c',201))],{x:200,z:0});await settled(f.owner);assert.match(f.owner.stats.errors.at(-1),/budget/);assert.equal(f.owner.has('b',tree('b',200)),true);assert.equal(f.owner.has('c',tree('c',201)),false);f.close();
});
test('context restoration revokes retained GPU proof until a fresh owned-bank upload completes',async()=>{
 const f=fixture(),t=tree();let revision=0;f.owner.resourceRevision=()=>revision;f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.has(t.id,t),true);
 revision++;assert.equal(f.owner.has(t.id,t),false);let finish;f.owner.prepare=()=>new Promise(resolve=>finish=resolve);f.owner.request([descriptor(t)],{x:0,z:0});assert.equal(f.owner.has(t.id,t),false);finish();await settled(f.owner);assert.equal(f.owner.has(t.id,t),true);assert.equal(f.owner.stats.preparations,2);f.close();
});
test('replacement source geometry cannot borrow the old bank buffers or its uploaded proof',async()=>{
 const f=fixture(),t=tree();f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);const old=f.owner.active.meshes[0].geometry.attributes.position.array,replacement=new THREE.SphereGeometry(2,8,4);
 f.sources[0]={geometry:replacement,material:f.sources[0].material};assert.equal(f.owner.has(t.id,t),false);f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);
 assert.equal(f.owner.has(t.id,t),true);assert.notEqual(f.owner.active.meshes[0].geometry.attributes.position.array,old);assert.equal(f.owner.active.meshes[0].geometry.attributes.position.array,replacement.attributes.position.array);f.close();replacement.dispose();
});
test('large world placement preserves fractional coordinates through a relative GPU bank anchor',async()=>{
 const f=fixture(),t=tree('far',1e8+.25);t.z=-1e8+.125;f.owner.request([descriptor(t)],{x:t.x,z:t.z});await settled(f.owner);const bank=f.owner.active,m=bank.meshes[0];
 assert.equal(bank.entries.get(t.id).matrix[12],t.x);assert.equal(bank.root.position.x+m.instanceMatrix.array[12],t.x);assert.equal(bank.root.position.z+m.instanceMatrix.array[14],t.z);assert.equal(f.owner.has(t.id,t),true);f.close();
});

test('missing physical chunk bridges with retained uploaded identity without weakening resident selection or epoch guards',async()=>{
 const f=fixture(),t=tree();let epoch=0;f.owner.resourceRevision=()=>epoch;f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);
 const args={coverage:{has:()=>false},standby:f.owner,nativeTree:undefined,logicalTree:{...t},nativeMissing:true};
 assert.equal(standbyCoverageReady(t.id,args),true);
 f.owner.update({x:0,z:50},new Map([[t.id,t]]),()=>({ready:1,enabled:true}),()=>!standbyCoverageReady(t.id,args),new Set());assert.equal(f.owner.stats.rendered,1);assert.equal(f.owner.active.meshes[0].geometry.attributes.nativeVisibility.getX(0),.5);
 args.nativeMissing=false;assert.equal(standbyCoverageReady(t.id,args),false);args.nativeMissing=true;
 args.nativeTree=t;assert.equal(standbyCoverageReady(t.id,args),false);args.nativeTree=undefined;
 args.logicalTree=tree(t.id,2);assert.equal(standbyCoverageReady(t.id,args),false);args.logicalTree={...t};
 args.suppressed=new Set([t.id]);assert.equal(standbyCoverageReady(t.id,args),false);args.suppressed=undefined;
 epoch++;assert.equal(standbyCoverageReady(t.id,args),false);epoch--;
 f.sources[0].material.version++;assert.equal(standbyCoverageReady(t.id,args),false);f.close();
});


test('zero-fade tail is not submitted and returns without changing prepared packing',async()=>{
 const f=fixture(),near=tree('near',5),middle=tree('middle',30),far=tree('far',80);
 f.owner.request([descriptor(far),descriptor(middle),descriptor(near)],{x:0,z:0});await settled(f.owner);
 const bank=f.owner.active,mesh=bank.meshes[0],version=mesh.instanceMatrix.version,matrices=Array.from(mesh.instanceMatrix.array),revision=f.owner.revision;
 assert.deepEqual(bank.rows[0].map(d=>d.id),['near','middle','far']);
 const trees=new Map([near,middle,far].map(t=>[t.id,t])),state=()=>({ready:1,enabled:true});
 f.owner.update({x:0,z:0},trees,state,()=>false,new Set());assert.equal(mesh.count,2);assert.equal(f.owner.stats.rendered,2);
 f.owner.update({x:80,z:0},trees,state,()=>false,new Set());assert.equal(mesh.count,3);assert.equal(f.owner.has('far',far),true);
 f.owner.update({x:300,z:0},trees,state,()=>false,new Set());assert.equal(mesh.count,0);assert.equal(mesh.visible,false);
 assert.equal(mesh.instanceMatrix.version,version);assert.deepEqual(Array.from(mesh.instanceMatrix.array),matrices);assert.equal(f.owner.revision,revision);
 assert.equal(f.owner.has('near',near,new Set(['near'])),false);f.close();
});


test('explicit context cancellation preserves the previous bank and resumes the queued fresh generation',async()=>{
 const f=fixture(),a=tree(),b=tree('b',2),c=tree('c',3);f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const previous=f.owner.active;let reject;
 f.owner.prepare=()=>new Promise((resolve,fail)=>reject=fail);
 f.owner.request([descriptor(b)],{x:0,z:0});f.owner.request([descriptor(c)],{x:0,z:0});
 assert.equal(f.owner.active,previous);f.owner.prepare=async()=>{};reject(new NativeFarGpuCancelled('context-changed'));await settled(f.owner);
 assert.equal(f.owner.stats.cancelledPreparations,1);assert.deepEqual(f.owner.stats.errors,[]);
 assert.equal(f.owner.has('a',a),true);assert.equal(f.owner.has('b',b),false);assert.equal(f.owner.has('c',c),true);assert.equal(f.scene.children.length,1);f.close();
});

test('ordinary preparation faults remain errors and never replace the accepted bank',async()=>{
 let reported;const f=fixture(),a=tree();f.owner.onError=error=>reported=error;
 f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const bank=f.owner.active;
 const fault=Error('Native GPU preparation error 0x502');f.owner.prepare=async()=>{throw fault;};
 f.owner.request([descriptor(tree('b',2))],{x:0,z:0});await settled(f.owner);
 assert.equal(f.owner.active,bank);assert.equal(reported,fault);assert.match(f.owner.stats.errors[0],/0x502/);assert.equal(f.owner.stats.cancelledPreparations,0);f.close();
});


test('a completed promise from an old epoch never adopts over the existing bank',async()=>{
 const f=fixture(),a=tree(),b=tree('b',2);let epoch=0,finish;f.owner.resourceRevision=()=>epoch;
 f.owner.request([descriptor(a)],{x:0,z:0});await settled(f.owner);const previous=f.owner.active,revision=f.owner.revision;
 f.owner.prepare=()=>new Promise(resolve=>finish=resolve);f.owner.request([descriptor(b)],{x:0,z:0});epoch++;finish();await settled(f.owner);
 assert.equal(f.owner.active,previous);assert.equal(f.owner.revision,revision);assert.equal(f.owner.has('b',b),false);assert.equal(f.owner.has('a',a),false);
 assert.equal(f.owner.stats.cancelledPreparations,1);assert.deepEqual(f.owner.stats.errors,[]);assert.equal(f.scene.children.length,1);
 f.owner.prepare=async()=>{};f.owner.request([descriptor(a),descriptor(b)],{x:0,z:0});await settled(f.owner);assert.equal(f.owner.has('b',b),true);f.close();
});


test('native coverage alone cannot begin a handoff before its retained backup fence completes',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve)),t=tree();
 const args={coverage:{has:()=>true},standby:f.owner,nativeTree:t,logicalTree:{...t},suppressed:new Set()};
 f.owner.request([descriptor(t)],{x:0,z:0});assert.equal(standbyCoverageReady(t.id,args),false);
 finish();await settled(f.owner);assert.equal(standbyCoverageReady(t.id,args),true);
 args.logicalTree={...t,y:t.y+1};assert.equal(standbyCoverageReady(t.id,args),false);f.close();
});

test('logical sources finalize the real toon recipe before a fenced bank enters the registry',async()=>{
 const f=fixture(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(f.scene,toon),t=tree();
 const before=f.sources[0].material.version;finalizeStandbyMaterials(toon,f.sources);
 const finalized=f.sources[0].material.version;assert.equal(finalized,before+2);
 let fencedVersion;f.owner.prepare=async()=>{fencedVersion=f.sources[0].material.version;};
 f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);
 assert.equal(fencedVersion,finalized);assert.equal(f.sources[0].material.version,finalized);
 assert.equal(f.owner.has(t.id,t),true);assert.equal(registry.materials.has(f.sources[0].material),true);
 obstructionMaterial(f.sources[0].material);finalizeStandbyMaterials(toon,f.sources);assert.equal(f.sources[0].material.version,finalized);
 f.sources[0].material.needsUpdate=true;assert.equal(f.owner.has(t.id,t),false);
 registry.dispose();f.close();
});

test('control: registry adoption invalidates a fence captured before the first real toon recipe',async()=>{
 const f=fixture(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(f.scene,toon),t=tree();
 let fencedVersion;f.owner.prepare=async()=>{fencedVersion=f.sources[0].material.version;};
 f.owner.request([descriptor(t)],{x:0,z:0});await settled(f.owner);
 assert.equal(f.sources[0].material.version,fencedVersion+1);assert.equal(f.owner.has(t.id,t),false);
 registry.dispose();f.close();
});


test('submission accounting keeps masked interior rows visible in cost diagnostics without changing packing',async()=>{
 const f=fixture(),a=tree('a',5),b=tree('b',20),c=tree('c',30);
 f.owner.request([a,b,c].map(t=>descriptor(t)),{x:0,z:0});await settled(f.owner);
 const mesh=f.owner.active.meshes[0],version=mesh.instanceMatrix.version,matrices=Array.from(mesh.instanceMatrix.array);
 f.owner.update({x:0,z:0},new Map([a,b,c].map(t=>[t.id,t])),()=>({enabled:true,ready:1}),id=>id==='b',new Set());
 assert.equal(f.owner.stats.rendered,2);assert.equal(f.owner.stats.submittedInstances,3);assert.equal(f.owner.stats.maskedInstances,1);
 assert.equal(f.owner.stats.submittedTriangles,36);assert.equal(f.owner.stats.visibleTriangles,24);
 assert.equal(standbySubmittedTriangles(mesh),36);assert.equal(mesh.instanceMatrix.version,version);assert.deepEqual(Array.from(mesh.instanceMatrix.array),matrices);
 mesh.geometry.setDrawRange(3,12);assert.equal(standbySubmittedTriangles(mesh),12);
 f.owner.dispose();assert.equal(f.owner.stats.submittedTriangles,0);assert.equal(f.owner.stats.submittedInstances,0);f.close();
});

test('bridge triangle accounting follows renderer single-material versus grouped draws',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),mesh=new THREE.InstancedMesh(geometry,material,2);
 geometry.clearGroups();geometry.addGroup(0,6,0);geometry.addGroup(3,6,1);
 assert.equal(standbySubmittedTriangles(mesh),24);
 mesh.material=[material,material];assert.equal(standbySubmittedTriangles(mesh),8);
 geometry.setDrawRange(3,3);assert.equal(standbySubmittedTriangles(mesh),4);mesh.dispose();geometry.dispose();material.dispose();
});
