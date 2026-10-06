import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NativeFarLayer} from '../tools/experiments/native-far-layer.js';
import {FarSceneStream} from '../tools/experiments/far-scene-stream.js';
import {buildFarSceneData,farSceneTransferables} from '../tools/experiments/far-scene-data.js';
import {readFileSync} from 'node:fs';
const tree={id:'tree',x:10,y:2,z:20,yaw:Math.PI/2,scale:1,sx:2,sy:1,sz:3};
function fixture(prepare=async()=>{}){
 const scene=new THREE.Scene(),source={geometry:new THREE.BoxGeometry(),material:new THREE.MeshBasicMaterial()},texture=new THREE.Texture(),metadata={localBase:[1,0,2],impostorWidth:3,impostorHeight:5};
 const stream=new FarSceneStream({load:async request=>({data:{trees:request.trees??[tree]}})});
 const layer=new NativeFarLayer({scene,source,texture,metadata,stream,prepare});
 return {layer,scene,source,texture};
}
test('region replacement preserves old visual until prepared, retains tree state and borrows source resources',async()=>{
 let pending;const f=fixture(async candidate=>{if(pending)await new Promise(resolve=>pending.resolve=resolve);});
 const first=await f.layer.request('a',{});assert.equal(first.prototype.models,undefined);assert.equal(first.trees[0].x,16);assert.equal(first.trees[0].z,18);
 const camera=new THREE.PerspectiveCamera(),coverage={revision:1,has:()=>true};f.layer.update(new Map(),camera,coverage,true,1,{x:0,z:0},new Set(['tree']));
 assert.equal(first.prototype.treeState('tree').enabled,false);
 pending={};const replace=f.layer.request('b',{});while(!pending.resolve)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.layer.current,first);assert.equal(f.scene.children.length,1);pending.resolve();const second=await replace;
 assert.equal(second.prototype.treeState('tree').enabled,false);assert.equal(second.prototype.treeState('tree').ready,1);assert.equal(f.scene.children.length,1);assert.ok(!f.scene.children.includes(first.prototype.impostors));
 let disposed=0;for(const resource of [f.source.geometry,f.source.material,f.texture])resource.addEventListener('dispose',()=>disposed++);
 f.layer.dispose();f.layer.dispose();assert.equal(f.scene.children.length,0);assert.equal(disposed,0);
});
test('obsolete or failed GPU preparation never replaces the resident visual',async()=>{
 let resolvePrepare,fail=false;const f=fixture(async()=>{if(fail)throw Error('GPU failed');if(resolvePrepare===null)await new Promise(resolve=>resolvePrepare=resolve);});
 const first=await f.layer.request('a',{});fail=true;await assert.rejects(f.layer.request('b',{}),/GPU failed/);assert.equal(f.layer.current,first);assert.equal(f.scene.children.length,1);
 fail=false;resolvePrepare=null;const late=f.layer.request('c',{});while(resolvePrepare===null)await new Promise(resolve=>setImmediate(resolve));f.layer.dispose();resolvePrepare();assert.equal(await late,null);assert.equal(f.scene.children.length,0);
});
test('vegetation-only worker requests allocate no terrain geometry buffers',()=>{
 const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
 const config={seed:'712',biome:'savanna',relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)};
 const data=buildFarSceneData({config,profile,treesOnly:true,treeBounds:{minX:-24,maxX:24,minZ:-24,maxZ:24}});
 assert.ok(data.trees.length>0);assert.equal(data.ground,null);assert.deepEqual(farSceneTransferables(data),[]);
});
test('disposal restores borrowed native color visibility without touching logical obstruction',async()=>{
 const f=fixture();await f.layer.request('a',{});const geometry=new THREE.BufferGeometry();geometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array([1]),1));
 const mesh={geometry,instanceMatrix:{version:1},count:1},logical=new THREE.InstancedBufferAttribute(new Float32Array([1]),1);
 const batch={slot:0,instances:[tree],fade:{attribute:logical},meshes:[mesh],orders:[[0]],key:'test'};
 const chunks=new Map([['0,0',{userData:{lodBatches:[batch]}}]]),camera=new THREE.PerspectiveCamera();camera.position.set(16,10,68);
 f.layer.update(chunks,camera,{revision:1,has:()=>true},true,1);
 assert.equal(geometry.attributes.nativeVisibility.getX(0),.5);assert.equal(logical.getX(0),1);
 f.layer.dispose();assert.equal(geometry.attributes.nativeVisibility.getX(0),1);assert.equal(logical.getX(0),1);geometry.dispose();
});

test('prepared standby coverage keeps the visual handoff while an unprepared native replacement remains hidden',async()=>{
 const f=fixture();await f.layer.request('a',{});const geometry=new THREE.BufferGeometry();geometry.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array([1]),1));const mesh={geometry,instanceMatrix:{version:1},count:1},logical=new THREE.InstancedBufferAttribute(new Float32Array([.8]),1),batch={slot:0,instances:[tree],fade:{attribute:logical},meshes:[mesh],orders:[[0]],key:'test'},chunks=new Map([['0,0',{userData:{lodBatches:[batch]}}]]),camera=new THREE.PerspectiveCamera();camera.position.set(16,10,68);
 const joint={revision:1,has:()=>true},native={revision:1,has:()=>false};f.layer.update(chunks,camera,joint,true,1,{x:0,z:0},new Set(),native);
 assert.equal(f.layer.current.prototype.treeState('tree').ready,1);assert.equal(geometry.attributes.nativeVisibility.getX(0),0);assert.ok(Math.abs(logical.getX(0)-.8)<1e-6);
 native.revision++;native.has=()=>true;f.layer.update(chunks,camera,joint,true,.016,{x:0,z:0},new Set(),native);assert.equal(f.layer.current.prototype.treeState('tree').ready,1);assert.ok(Math.abs(geometry.attributes.nativeVisibility.getX(0)-.4)<1e-6);
 f.layer.dispose();geometry.dispose();
});
