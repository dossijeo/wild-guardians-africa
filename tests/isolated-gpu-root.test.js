import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,Line,Points,Sprite,DirectionalLight} from 'three';
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

test('wall lines, particle points and HUD-world sprites do not upload during a far-root draw, and restore on failure',()=>{
 const scene=new Scene(),root=new Group(),tree=new Mesh(),line=new Line(),points=new Points(),sprite=new Sprite(),hiddenSprite=new Sprite(),sun=new DirectionalLight();
 root.add(tree);hiddenSprite.visible=false;scene.add(root,line,points,sprite,hiddenSprite,sun);
 const renderer={shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true}};
 assert.throws(()=>withGpuRootIsolation(renderer,root,scene,()=>{
  // Representative unrelated gameplay renderables must never be submitted.
  const submitted=[];scene.traverseVisible(o=>{if(o.isMesh||o.isLine||o.isPoints||o.isSprite)submitted.push(o);});
  assert.deepEqual(submitted,[tree]);assert.equal(sun.visible,true);throw Error('upload interrupted');
 }),/upload interrupted/);
 assert.ok(line.visible&&points.visible&&sprite.visible);assert.equal(hiddenSprite.visible,false);
 assert.deepEqual(renderer.shadowMap,{enabled:true,autoUpdate:true,needsUpdate:true});
});

test('a line or particle shadow caster inside the root cannot receive a false readiness fence',()=>{
 for(const root of [new Line(),new Points()]){
  const scene=new Scene();root.castShadow=true;scene.add(root);
  assert.throws(()=>withGpuRootIsolation({shadowMap:{}},root,scene,()=>assert.fail('draw')),/shadow casters/);
  assert.equal(root.visible,true);
 }
});
