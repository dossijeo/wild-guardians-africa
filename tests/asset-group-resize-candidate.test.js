import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGLGeometries} from '../node_modules/three/src/renderers/webgl/WebGLGeometries.js';
import {NativeAssetGroups} from '../src/rendering/asset-groups.js';
import {StaticGeometryResizeGroups} from './browser/asset-group-resize-candidate.js';

function fixture(Class){
 const groups=new Class(new THREE.Scene());groups.origin={x:0,z:0};groups.shadowRoot.userData.lodBatches=[];
 const source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 source.geometry.computeBoundingBox();source.geometry.computeBoundingSphere();
 const mesh=new THREE.InstancedMesh(source.geometry,source.material,32),group=new THREE.Group();group.updateMatrixWorld(true);
 for(let i=0;i<32;i++)mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i,2,3));
 return {groups,source,mesh,entry:{group,mesh,level:0,batch:{uid:1,group:0,levels:[source]}}};
}
function prepare(f,count,pass='color'){
 f.mesh.count=count;const stats={uploads:0,bytes:0};f.groups.prepare(pass==='color'?f.groups.colors:f.groups.shadows,'0',[f.entry],pass,stats);return stats;
}

for(const Class of [NativeAssetGroups,StaticGeometryResizeGroups])test(`${Class.name}: real Three geometry disposal preserves transferred buffers across growth/shrink and deletes them on final retirement`,()=>{
 const f=fixture(Class),resident=new Set(),removed=[],info={memory:{geometries:0}},bindings={releaseStatesOfGeometry(){}};
 const attributes={update(a){resident.add(a);},remove(a){removed.push(a);resident.delete(a);}};
 const gpu=WebGLGeometries({},attributes,info,bindings);
 const upload=()=>{const m=f.groups.colors.get('0').mesh;gpu.get(m,m.geometry);gpu.update(m.geometry);if(m.geometry.index)resident.add(m.geometry.index);return m;};
 prepare(f,8);const original=upload(),index=original.geometry.index,position=original.geometry.attributes.position,visibility=original.geometry.attributes.nativeVisibility;
 prepare(f,9);const grown=upload();assert.equal(grown.geometry.index,index);assert.equal(grown.geometry.attributes.position,position);assert.notEqual(grown.geometry.attributes.nativeVisibility,visibility);assert.ok(removed.includes(visibility));assert.ok(!removed.includes(position));assert.equal(original.geometry.index,null);assert.deepEqual(Object.keys(original.geometry.attributes),['nativeVisibility']);
 prepare(f,4);const shrunk=upload();assert.equal(shrunk.geometry.attributes.position,position);assert.equal(info.memory.geometries,1);if(Class===StaticGeometryResizeGroups)assert.deepEqual(f.groups.resizeStats,{attempts:2,transferred:2,rejected:0});
 f.groups.dispose();assert.equal(resident.size,0);assert.equal(info.memory.geometries,0);assert.equal(removed.filter(a=>a===position).length,1);assert.equal(removed.filter(a=>a===index).length,1);assert.ok(!removed.includes(f.source.geometry.attributes.position));
});

for(const Class of [NativeAssetGroups,StaticGeometryResizeGroups])test(`${Class.name}: matrices, visibility, capacities and byte accounting match legacy grouping through resize, stable frame and compact coverage`,()=>{
 const a=fixture(NativeAssetGroups),b=fixture(Class);a.groups.reuseStaticOnResize=false;
 for(const f of [a,b]){f.mesh.geometry=f.mesh.geometry.clone();f.mesh.geometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(32).fill(.4),1));}
 for(const count of [8,9,17,4,4]){
  assert.deepEqual(prepare(a,count),prepare(b,count));const x=a.groups.colors.get('0'),y=b.groups.colors.get('0');
  assert.equal(x.capacity,y.capacity);assert.equal(x.mesh.count,y.mesh.count);assert.deepEqual(x.mesh.instanceMatrix.array,y.mesh.instanceMatrix.array);assert.deepEqual(x.mesh.geometry.attributes.nativeVisibility.array,y.mesh.geometry.attributes.nativeVisibility.array);
 }
 for(const f of [a,b]){f.groups.omitZeroColor=true;f.mesh.geometry.attributes.nativeVisibility.array[0]=0;f.mesh.geometry.attributes.nativeVisibility.needsUpdate=true;}
 assert.deepEqual(prepare(a,4),prepare(b,4));assert.equal(b.groups.colors.get('0').mesh.count,3);a.groups.dispose();b.groups.dispose();
});

for(const Class of [NativeAssetGroups,StaticGeometryResizeGroups])test(`${Class.name}: different source arrays fall back to new private identities; shadows remain borrowed and untouched`,()=>{
 const f=fixture(Class);prepare(f,8);const old=f.groups.colors.get('0').mesh.geometry;let disposed=0;old.addEventListener('dispose',()=>disposed++);
 const source=f.source.geometry.attributes.position;f.source.geometry.setAttribute('position',source.clone());prepare(f,9);assert.equal(disposed,1);assert.notEqual(f.groups.colors.get('0').mesh.geometry.attributes.position,old.attributes.position);if(Class===StaticGeometryResizeGroups)assert.deepEqual(f.groups.resizeStats,{attempts:1,transferred:0,rejected:1});
 prepare(f,8,'shadow');prepare(f,9,'shadow');assert.equal(f.groups.shadows.get('0').mesh.geometry,f.source.geometry);f.groups.dispose();
});

for(const Class of [NativeAssetGroups,StaticGeometryResizeGroups])test(`${Class.name}: failed packing releases the previous geometry without transferring its attributes or retaining scope`,()=>{
 const f=fixture(Class);prepare(f,8);const old=f.groups.colors.get('0').mesh.geometry,position=old.attributes.position;let disposed=0;old.addEventListener('dispose',()=>disposed++);
 f.entry.group.matrixWorld=null;assert.throws(()=>prepare(f,9));assert.equal(disposed,1);assert.equal(old.attributes.position,position);assert.equal(f.groups.resizeScope,undefined);f.groups.dispose();
});

test('production resize uploads updated source arrays again even when their identities remain unchanged',()=>{
 const f=fixture(NativeAssetGroups);prepare(f,8);const old=f.groups.colors.get('0').mesh.geometry,position=old.attributes.position,index=old.index;
 f.source.geometry.attributes.position.array[0]+=1;f.source.geometry.attributes.position.needsUpdate=true;
 prepare(f,9);const next=f.groups.colors.get('0').mesh.geometry;
 assert.notEqual(next.attributes.position,position);assert.notEqual(next.index,index);assert.equal(next.attributes.position.array,position.array);
 f.groups.dispose();
});
