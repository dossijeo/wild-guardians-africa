import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,BoxGeometry,MeshStandardMaterial,PerspectiveCamera} from 'three';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
function setup(){
 let target={name:'previous'},complete,reject;const waiting=new Promise((resolve,fail)=>{complete=resolve;reject=fail;});
 const renderer={shadowMap:{enabled:true},getRenderTarget:()=>target,setRenderTarget:value=>{target=value;}};
 const pipeline=new BuildingDestructionPass(renderer),world=new Scene(),opaque=new Mesh(new BoxGeometry(),new MeshStandardMaterial()),alpha=new Mesh(new BoxGeometry(),new MeshStandardMaterial({alphaTest:.5})),transparent=new Mesh(new BoxGeometry(),new MeshStandardMaterial({transparent:true}));
 world.add(opaque,alpha,transparent);const originals=[opaque,alpha,transparent].map(mesh=>mesh.material),prior=target;
 const cleanup=()=>{pipeline.dispose();for(const mesh of world.children){mesh.geometry.dispose();mesh.material.dispose();}};
 return {renderer,pipeline,world,opaque,alpha,transparent,originals,prior,waiting,complete,reject,cleanup};
}

test('depth preload starts with the actual target and recipes, restores scene immediately, then waits for compilation',async()=>{
 const s=setup();s.renderer.compileAsync=(world,camera)=>{
  assert.equal(world,s.world);assert.ok(camera.isPerspectiveCamera);assert.equal(s.renderer.getRenderTarget(),s.pipeline.smokeDepth);assert.equal(s.renderer.shadowMap.enabled,false);
  assert.ok(s.opaque.material.isMeshDepthMaterial);assert.equal(s.alpha.material,s.originals[1]);assert.equal(s.alpha.material.colorWrite,false);assert.equal(s.transparent.material.visible,false);return s.waiting;
 };
 const preparing=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);
 assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);assert.ok(s.originals.every(material=>material.visible&&material.colorWrite));assert.equal(s.pipeline.depthWarmStats.stockAlphaSpecialized,0);
 assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);
 s.complete();await preparing;assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);s.cleanup();
});

test('synchronous compile errors and asynchronous rejections restore target, shadows and every borrowed material',async()=>{
 for(const synchronous of [true,false]){
  const s=setup();s.renderer.compileAsync=()=>{if(synchronous)throw Error('compile failed');return s.waiting;};
  const pending=s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);if(!synchronous)s.reject(Error('compile failed'));
  await assert.rejects(pending,/compile failed/);assert.equal(s.renderer.getRenderTarget(),s.prior);assert.equal(s.renderer.shadowMap.enabled,true);assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);assert.ok(s.originals.every(material=>material.visible&&material.colorWrite));s.cleanup();
 }
});

test('preload honors the same explicit diagnostic options as capture without enabling alpha or empty candidates globally',async()=>{
 const s=setup();s.pipeline.optimizedDepth=false;s.renderer.compileAsync=()=>{assert.equal(s.opaque.material,s.originals[0]);return Promise.resolve();};
 await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);assert.equal(s.pipeline.depthWarmStats.specialized,0);
 s.pipeline.optimizedDepth=true;s.pipeline.stockAlphaDepth=true;s.renderer.compileAsync=()=>{assert.ok(s.alpha.material.isMeshDepthMaterial);return Promise.resolve();};
 await s.pipeline.prepareDepth(new PerspectiveCamera(),s.world);assert.equal(s.pipeline.depthWarmStats.stockAlphaSpecialized,1);assert.deepEqual(s.world.children.map(mesh=>mesh.material),s.originals);s.cleanup();
});
