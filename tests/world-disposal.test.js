import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';

for(const loaded of [false,true])test(`WorldScene ${loaded?'loaded':'partially loaded'} disposal releases once and detaches owned canvas events`,()=>{
  const calls=new Map(),count=id=>calls.set(id,(calls.get(id)??0)+1),resource=id=>({dispose:()=>count(id)});
  const world=Object.create(WorldScene.prototype);
  for(const id of ['spellPreview','materialRegistry','assetGroups','contacts','sky','wallDrawing','strokePreview','destructionPass','controls','renderer'])world[id]=resource(id);
  world.glResourceEpoch={dispose(){assert.equal(calls.get('renderer'),1);count('glResourceEpoch');}};
  world.renderer.forceContextLoss=()=>{assert.equal(world.canvasEvents.signal.aborted,true);assert.equal(calls.get('renderer'),1);assert.equal(calls.get('glResourceEpoch'),1);count('contextLoss');};
  world.scene=new THREE.Scene();world.chunks=new Map();world.buildingTemplates=new Map();world.sun={shadow:resource('shadow')};world.resizeObserver={disconnect:()=>count('resizeObserver')};world.state={elapsed:0};
  world.canvasEvents=new AbortController();const canvas=new EventTarget();let callbacks=0;
  canvas.addEventListener('pointerup',()=>callbacks++,{signal:world.canvasEvents.signal});canvas.dispatchEvent(new Event('pointerup'));assert.equal(callbacks,1);
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();geometry.addEventListener('dispose',()=>count('meshGeometry'));material.addEventListener('dispose',()=>count('meshMaterial'));world.scene.add(new THREE.Mesh(geometry,material));
  if(loaded)world.fluidMaterial=resource('fluid');
  assert.doesNotThrow(()=>world.dispose());assert.equal(world.state,null);assert.equal(world.canvasEvents.signal.aborted,true);
  canvas.dispatchEvent(new Event('pointerup'));assert.equal(callbacks,1);
  assert.doesNotThrow(()=>world.dispose());assert.ok(calls.size>=14);for(const [id,n] of calls)assert.equal(n,1,id);
});
