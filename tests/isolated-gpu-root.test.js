import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,DirectionalLight} from 'three';
import {withGpuRootIsolation} from '../tools/experiments/isolated-gpu-root.js';

test('isolated root keeps scene lighting and shadow recipe, hides unrelated meshes only for the draw',()=>{
 const scene=new Scene(),root=new Group(),tree=new Mesh(),worker=new Mesh(),alreadyHidden=new Mesh(),sun=new DirectionalLight();alreadyHidden.visible=false;root.add(tree);scene.add(root,worker,alreadyHidden,sun);
 const shadow={enabled:true,autoUpdate:true,needsUpdate:true},renderer={shadowMap:shadow};
 const result=withGpuRootIsolation(renderer,root,scene,()=>{assert.equal(tree.visible,true);assert.equal(worker.visible,false);assert.equal(alreadyHidden.visible,false);assert.equal(sun.visible,true);assert.equal(shadow.enabled,true);assert.equal(shadow.autoUpdate,false);assert.equal(shadow.needsUpdate,false);return 42;});
 assert.equal(result,42);assert.equal(worker.visible,true);assert.equal(alreadyHidden.visible,false);assert.deepEqual(shadow,{enabled:true,autoUpdate:true,needsUpdate:true});
});
test('draw failure restores mesh and shadow flags before propagating',()=>{
 const scene=new Scene(),root=new Group(),other=new Mesh();scene.add(root,other);const renderer={shadowMap:{enabled:true,autoUpdate:false,needsUpdate:true}};
 assert.throws(()=>withGpuRootIsolation(renderer,root,scene,()=>{throw Error('Draw failed');}),/Draw failed/);assert.equal(other.visible,true);assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(renderer.shadowMap.needsUpdate,true);
});
test('shadow casting roots are rejected rather than falsely marked prepared',()=>{
 const scene=new Scene(),root=new Mesh();root.castShadow=true;scene.add(root);
 assert.throws(()=>withGpuRootIsolation({shadowMap:{}},root,scene,()=>assert.fail('draw')),/shadow casters/);assert.equal(root.visible,true);
});
