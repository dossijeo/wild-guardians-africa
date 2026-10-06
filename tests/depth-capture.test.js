import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';

function fixture(){
 const world=new THREE.Scene(),source=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),depth=new THREE.MeshDepthMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),source);
 depth.userData.worldDepthCompatible=true;mesh.customDepthMaterial=depth;world.add(mesh);return {world,mesh,source,depth};
}
test('authored depth route shares live deformation uniforms and restores original objects and materials after failure',()=>{
 const {world,mesh,source,depth}=fixture(),clock={value:12};depth.userData.clock=clock;depth.visible=false;
 assert.throws(()=>withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,depth);assert.equal(depth.visible,true);assert.equal(depth.colorWrite,false);assert.equal(depth.userData.clock,clock);throw new Error('GPU failure');}),/GPU failure/);
 assert.equal(mesh.material,source);assert.equal(source.colorWrite,true);assert.equal(source.visible,true);assert.equal(depth.colorWrite,true);assert.equal(depth.visible,false);
});
test('unverified depth shaders, clipping, alpha mismatch, offset, side mismatch and multi-material meshes retain their original recipes',()=>{
 for(const change of [f=>delete f.depth.userData.worldDepthCompatible,f=>f.source.visible=false,f=>f.source.clippingPlanes=[new THREE.Plane()],f=>f.source.alphaTest=.3,f=>f.source.alphaHash=true,f=>f.source.wireframe=true,f=>f.source.displacementMap=new THREE.Texture(),f=>f.source.polygonOffset=true,f=>f.depth.side=THREE.FrontSide,f=>f.mesh.material=[f.source]]){
  const f=fixture();change(f);const original=f.mesh.material;
  const stats=withDepthCaptureMaterials(f.world,()=>assert.equal(f.mesh.material,original));assert.equal(stats.specialized,0);assert.equal(stats.fallback,1);assert.equal(f.mesh.material,original);
 }
});
test('transparency and non-writing materials remain excluded; override and diagnostic comparison preserve the old route',()=>{
 const {world,mesh,source,depth}=fixture();
 for(const flag of ['transparent','depthWrite']){source[flag]=flag==='transparent';withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,source);assert.equal(source.visible,false);});source[flag]=flag!=='transparent';assert.equal(source.visible,true);}
 world.overrideMaterial=new THREE.MeshBasicMaterial();withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,source);assert.equal(world.overrideMaterial.colorWrite,false);});assert.equal(world.overrideMaterial.colorWrite,true);world.overrideMaterial=null;
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,source),{optimized:false});assert.equal(stats.specialized,0);assert.equal(depth.colorWrite,true);
});

test('hidden ancestors skip depth preparation while shared visible materials and restoration remain correct',()=>{
 const {world,mesh,source,depth}=fixture(),hidden=new THREE.Group();hidden.visible=false;world.add(hidden);
 const child=new THREE.Mesh(mesh.geometry,source);child.customDepthMaterial=depth;hidden.add(child);
 const hiddenSource=new THREE.MeshStandardMaterial(),hiddenOnly=new THREE.Mesh(mesh.geometry,hiddenSource);hidden.add(hiddenOnly);
 const stats=withDepthCaptureMaterials(world,()=>{
  assert.equal(mesh.material,depth);assert.equal(child.material,source);
  assert.equal(hiddenOnly.material,hiddenSource);assert.equal(hiddenSource.colorWrite,true);
 });
 assert.equal(stats.specialized,1);assert.equal(stats.fallback,0);assert.equal(child.material,source);assert.equal(source.colorWrite,true);
 hidden.visible=true;const revealed=withDepthCaptureMaterials(world,()=>assert.equal(child.material,depth));assert.equal(revealed.specialized,3);
 hidden.visible=false;const reference=withDepthCaptureMaterials(world,()=>assert.equal(child.material,depth),{visibleOnly:false});assert.equal(reference.specialized,3);
 assert.throws(()=>withDepthCaptureMaterials(world,()=>{assert.equal(child.material,source);throw Error('render failure');}),/render failure/);
 assert.equal(mesh.material,source);assert.equal(depth.colorWrite,true);assert.equal(source.colorWrite,true);
mesh.geometry.dispose();source.dispose();depth.dispose();hiddenSource.dispose();
});

test('empty batches keep children and shared nonempty owners prepared; revealing them restores normal eligibility',()=>{
 const {world,mesh,source,depth}=fixture(),empty=new THREE.InstancedMesh(mesh.geometry,source,4);empty.count=0;empty.customDepthMaterial=depth;world.add(empty);
 const child=new THREE.Mesh(mesh.geometry,source);child.customDepthMaterial=depth;empty.add(child);
 const solo=new THREE.MeshBasicMaterial(),zero=new THREE.Mesh(new THREE.InstancedBufferGeometry(),solo);zero.geometry.instanceCount=0;world.add(zero);
 const stats=withDepthCaptureMaterials(world,()=>{assert.equal(empty.material,source);assert.equal(mesh.material,depth);assert.equal(child.material,depth);assert.equal(depth.colorWrite,false);assert.equal(solo.colorWrite,true);},{nonEmptyOnly:true});
 assert.equal(stats.emptySkipped,2);assert.equal(stats.specialized,2);assert.equal(source.colorWrite,true);
 empty.count=1;zero.geometry.instanceCount=1;const revealed=withDepthCaptureMaterials(world,()=>assert.equal(empty.material,depth),{nonEmptyOnly:true});assert.equal(revealed.emptySkipped,0);assert.equal(revealed.specialized,4);
 empty.count=0;zero.geometry.instanceCount=0;const reference=withDepthCaptureMaterials(world,()=>assert.equal(empty.material,depth),{nonEmptyOnly:false});assert.equal(reference.emptySkipped,0);assert.equal(reference.specialized,4);
 assert.throws(()=>withDepthCaptureMaterials(world,()=>{throw Error('draw failed');},{nonEmptyOnly:true}),/draw failed/);assert.equal(empty.material,source);assert.equal(mesh.material,source);assert.equal(child.material,source);assert.equal(source.colorWrite,true);assert.equal(depth.colorWrite,true);
});

test('zero draw ranges do not override InstancedMesh precedence or guess unknown render hooks',()=>{
 for(const hook of ['object-before','object-after','source-before','source-compile','depth-before','depth-compile']){
  const {world,mesh,source,depth}=fixture();mesh.geometry.setDrawRange(0,0);
  if(hook==='object-before')mesh.onBeforeRender=()=>{};
  if(hook==='object-after')mesh.onAfterRender=()=>{};
  if(hook==='source-before')source.onBeforeRender=()=>{};
  if(hook==='source-compile')source.onBeforeCompile=()=>{};
  if(hook==='depth-before')depth.onBeforeRender=()=>{};
  if(hook==='depth-compile')depth.onBeforeCompile=()=>{};
  const stats=withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,depth);assert.equal(depth.colorWrite,false);},{nonEmptyOnly:true});assert.equal(stats.emptySkipped,0);
 }
 const {world,mesh,source,depth}=fixture();mesh.geometry.setDrawRange(0,0);assert.equal(withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,source),{nonEmptyOnly:true}).emptySkipped,1);
 const geometry=new THREE.InstancedBufferGeometry();geometry.instanceCount=0;const instanced=new THREE.InstancedMesh(geometry,source,1);instanced.customDepthMaterial=depth;world.add(instanced);
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(instanced.material,depth),{nonEmptyOnly:true});assert.equal(stats.emptySkipped,1);assert.equal(stats.specialized,1);
});

test('scene callbacks and override materials retain original empty-owner preparation',()=>{
 for(const mode of ['before','after','override']){
  const {world,mesh,source,depth}=fixture();mesh.geometry.setDrawRange(0,0);
  if(mode==='before')world.onBeforeRender=()=>{};
  if(mode==='after')world.onAfterRender=()=>{};
  if(mode==='override')world.overrideMaterial=new THREE.MeshBasicMaterial();
  const stats=withDepthCaptureMaterials(world,()=>{assert.equal(mesh.material,mode==='override'?source:depth);assert.equal((world.overrideMaterial??depth).colorWrite,false);},{nonEmptyOnly:true});assert.equal(stats.emptySkipped,0);assert.equal(source.colorWrite,true);
 }
});

test('empty-batch experiment is disabled by default after its measured CPU tradeoff',()=>{
 const {world,mesh,source,depth}=fixture();mesh.geometry.setDrawRange(0,0);
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,depth));assert.equal(stats.emptySkipped,0);assert.equal(stats.specialized,1);assert.equal(mesh.material,source);
});

test('single-traversal alpha opt-in keeps shared native alpha silhouettes and restores every owner after failure',()=>{
 const world=new THREE.Scene(),map=new THREE.Texture(),source=new THREE.MeshStandardMaterial({alphaTest:.35,map,side:THREE.DoubleSide}),a=new THREE.Mesh(new THREE.BoxGeometry(),source),b=new THREE.Mesh(a.geometry,source);world.add(a,b);
 let depth;
 assert.throws(()=>withDepthCaptureMaterials(world,stats=>{depth=a.material;assert.equal(a.material,b.material);assert.ok(depth.isMeshDepthMaterial);assert.equal(depth.alphaTest,source.alphaTest);assert.equal(depth.map,map);assert.equal(depth.side,source.side);assert.equal(depth.colorWrite,false);assert.equal(stats.stockAlphaSpecialized,2);throw Error('GPU failure');},{stockAlpha:true}),/GPU failure/);
 assert.equal(a.material,source);assert.equal(b.material,source);assert.equal(source.colorWrite,true);assert.equal(depth.colorWrite,true);assert.equal(a.customDepthMaterial,undefined);
 const stats=withDepthCaptureMaterials(world,()=>assert.equal(a.material,source));assert.equal(stats.stockAlphaSpecialized,0);assert.equal(stats.fallback,2);
 source.dispose();map.dispose();a.geometry.dispose();
});

test('alpha opt-in retains unknown/rasterization exceptions and authored-depth precedence',()=>{
 for(const kind of ['hook','offset','hash','clip','authored','disabled','override']){
  const {world,mesh,source,depth}=fixture();source.alphaTest=.35;
  if(kind==='hook')source.onBeforeCompile=()=>{};
  if(kind==='offset')source.polygonOffset=true;
  if(kind==='hash')source.alphaHash=true;
  if(kind==='clip')source.clippingPlanes=[new THREE.Plane()];
  if(kind!=='authored')delete mesh.customDepthMaterial;else depth.alphaTest=.35;
  if(kind==='override')world.overrideMaterial=new THREE.MeshBasicMaterial();
  const stats=withDepthCaptureMaterials(world,()=>assert.equal(mesh.material,kind==='authored'?depth:source),{stockAlpha:true,optimized:kind!=='disabled'});assert.equal(stats.stockAlphaSpecialized,0);
 }
});


test('shared standard compatibility is checked once per capture and refreshed after raster or hook changes',()=>{
 const source=new THREE.MeshStandardMaterial(),world=new THREE.Scene(),geometry=new THREE.BoxGeometry();
 let side=THREE.FrontSide,reads=0;
 Object.defineProperty(source,'side',{get(){reads++;return side;},set(value){side=value;},configurable:true});
 for(let i=0;i<40;i++)world.add(new THREE.Mesh(geometry,source));
 let observed;
 const first=withDepthCaptureMaterials(world,()=>{observed=world.children[0].material;assert.ok(world.children.every(o=>o.material===observed));});
 assert.equal(first.specialized,40);assert.ok(reads<=3,'Compatibility must not re-read side for every owner');
 assert.ok(world.children.every(o=>o.material===source));
 side=THREE.BackSide;reads=0;
 withDepthCaptureMaterials(world,()=>{assert.equal(world.children[0].material.side,THREE.BackSide);});
 assert.ok(reads<=4);
 source.polygonOffset=true;const blocked=withDepthCaptureMaterials(world,()=>assert.ok(world.children.every(o=>o.material===source)));
 assert.equal(blocked.specialized,0);assert.equal(blocked.fallback,40);
 source.polygonOffset=false;source.onBeforeCompile=()=>{};
 const unknown=withDepthCaptureMaterials(world,()=>assert.ok(world.children.every(o=>o.material===source)));
 assert.equal(unknown.specialized,0);geometry.dispose();source.dispose();
});

test('authored depths retain individual compatibility even when they share a source with standard owners',()=>{
 const source=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(),world=new THREE.Scene();
 const a=new THREE.Mesh(geometry,source),b=new THREE.Mesh(geometry,source),c=new THREE.Mesh(geometry,source);
 const authored=new THREE.MeshDepthMaterial();authored.userData.worldDepthCompatible=true;authored.side=THREE.BackSide;b.customDepthMaterial=authored;
 c.customDepthMaterial=new THREE.MeshDepthMaterial();c.customDepthMaterial.userData.worldDepthCompatible=true;
 world.add(a,b,c);const stats=withDepthCaptureMaterials(world,()=>{assert.ok(a.material.isMeshDepthMaterial);assert.equal(b.material,source);assert.equal(c.material,c.customDepthMaterial);});
 assert.equal(stats.specialized,2);assert.equal(stats.fallback,1);for(const mesh of world.children)assert.equal(mesh.material,source);
 geometry.dispose();source.dispose();authored.dispose();c.customDepthMaterial.dispose();
});
