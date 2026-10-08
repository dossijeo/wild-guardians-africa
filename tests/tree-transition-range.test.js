import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {treeTransitionRange,treeTransitionWeight,validateTreeTransitionPolicy} from '../tools/experiments/tree-transition-range.js';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
import {NativeFarCoverage} from '../tools/experiments/native-far-coverage.js';
import {NativeTreeStandby,standbyTreeKey} from '../tools/experiments/native-tree-standby.js';
import {lodMix} from '../tools/experiments/far-impostor-math.js';
import {inspectFarTransition} from '../tools/experiments/far-transition-inspection.js';
const policy={minimumHeight:24,start:200,end:240},height=11;
const trees=[{id:'small',x:0,y:0,z:0,yaw:.6,scale:1,sx:1.2,sy:1,sz:.8},{id:'giant',x:0,y:0,z:0,yaw:.8,scale:1,sx:2.5,sy:3,sz:2}];
test('height classification is deterministic, anisotropic and independent of camera history',()=>{
 for(const tree of trees){const expected=tree.id==='giant'?[200,240]:[120,160];for(let i=0;i<100;i++)assert.deepEqual(treeTransitionRange({...tree},height,120,160,policy),expected);}
 assert.equal(treeTransitionWeight({scale:24/11},height,policy),1);
 assert.deepEqual(treeTransitionRange({sy:1e3},height,120,160,null),[120,160]);
 for(const invalid of [{minimumHeight:0,start:200,end:240},{minimumHeight:24,start:100,end:240},{minimumHeight:24,start:200,end:190}])assert.throws(()=>validateTreeTransitionPolicy(invalid,120,160));
 assert.throws(()=>treeTransitionWeight({},height,policy),/dimensions/);
});
test('sprite, resident native and retained standby share exact per-tree ranges and keep unready fallback',async()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),texture=new THREE.Texture(),source={geometry,material},metadata={impostorWidth:8,impostorHeight:height,localBase:[0,0,0]};
 const p=createFarImpostorPrototype(source,texture,metadata,trees,{nativeModels:false,start:120,end:160,transitionHeight:policy});
 assert.deepEqual(Array.from(p.impostors.geometry.attributes.aTreeTransitionWeight.array),[0,1]);assert.deepEqual(p.uniforms.uLargeRange.value.toArray(),[200,240]);assert.deepEqual(p.treeTransitionRange('giant'),[200,240]);assert.deepEqual(p.treeTransitionRange('small'),[120,160]);assert.equal(lodMix(220,...p.treeTransitionRange('giant'),1),.5);
 const mesh=new THREE.InstancedMesh(geometry.clone(),material,2);mesh.geometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(2),1));
 const batch={slot:2,instances:trees,fade:{attribute:new THREE.InstancedBufferAttribute(new Float32Array([1,1]),1)},meshes:[mesh],orders:[[0,1]],key:'test'},chunks=new Map([['0',{userData:{lodBatches:[batch]}}]]);
 const fade=new NativeFarCoverage([0,0,0],{start:120,end:160,slot:2,treeHeight:height,transitionHeight:policy}),scene=new THREE.Scene(),standby=new NativeTreeStandby({scene,sources:[source],start:120,end:160,keepDistance:288,treeHeight:height,transitionHeight:policy,prepare:async()=>{}});
 const entries=trees.map(t=>{const matrix=new THREE.Matrix4().compose(new THREE.Vector3(),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),t.yaw),new THREE.Vector3(t.sx,t.sy,t.sz));return {id:t.id,key:standbyTreeKey(t),sy:t.sy,x:0,z:0,level:0,matrix:matrix.toArray()};});
 standby.request(entries,{x:0,z:0});while(standby.busy)await new Promise(resolve=>setImmediate(resolve));
 const prepared=standby.active.preparedMatrices[0].slice(),map=new Map(trees.map(t=>[t.id,t]));
 for(const ready of [0,.25,1])for(const distance of [119,140,160,199,220,241]){
  const camera={position:{x:distance,z:0}};fade.update(chunks,camera,()=>({ready,enabled:true}),ready+':'+distance);
  standby.update(camera.position,map,()=>({ready,enabled:true}),()=>false,new Set());
  for(const [i,t]of trees.entries()){const range=treeTransitionRange(t,height,120,160,policy),native=Math.fround(1-lodMix(distance,...range,ready));assert.equal(mesh.geometry.attributes.nativeVisibility.getX(i),native);const draw=standby.drawDiagnosis(t.id);assert.equal(draw?.visibility??0,native);assert.equal(draw?.matrixExact??true,true);if(!ready)assert.equal(native,0,'unprepared model cannot hide sprite');}
 }
 assert.deepEqual(standby.active.preparedMatrices[0],prepared);
 const layer={options:{},fade,current:{prototype:p}};inspectFarTransition(layer,standby,120,160,null);assert.deepEqual(p.uniforms.uLargeRange.value.toArray(),[120,160]);assert.deepEqual(Array.from(p.impostors.geometry.attributes.aTreeTransitionWeight.array),[0,0]);assert.deepEqual(p.treeTransitionRange('giant'),[120,160]);assert.deepEqual(standby.active.entries.get('giant').transitionRange,[120,160]);
 inspectFarTransition(layer,standby,120,160,policy);assert.deepEqual(standby.active.entries.get('giant').transitionRange,[200,240]);assert.deepEqual(p.uniforms.uLargeRange.value.toArray(),[200,240]);assert.deepEqual(Array.from(p.impostors.geometry.attributes.aTreeTransitionWeight.array),[0,1]);
 standby.dispose();p.dispose();mesh.dispose();mesh.geometry.dispose();geometry.dispose();material.dispose();
});
