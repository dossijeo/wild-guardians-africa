import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchPipelineSource,patchPipelineCacheSource,patchShadowCompileSource,patchShadowPositionSource,patchMorphInfluenceSource,restoreMorphInfluenceSource} from '../tools/patch-three-webgpu-pipeline.mjs';
import Pipelines from '../node_modules/three/src/renderers/common/Pipelines.js';

test('installed Three source is patched idempotently and unknown code fails closed',async()=>{
 for(const path of ['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','build/three.webgpu.js','build/three.webgpu.nodes.js']){
  const source=await readFile(`node_modules/three/${path}`,'utf8');
  assert.equal(patchPipelineSource(source),source,path);
 }
 assert.throws(()=>patchPipelineSource('unsupported implementation'),/Unexpected/);
 for(const path of ['src/renderers/common/Pipelines.js','build/three.webgpu.js','build/three.webgpu.nodes.js']){
  const source=await readFile(`node_modules/three/${path}`,'utf8');assert.equal(patchPipelineCacheSource(source),source,path);
 }
 for(const path of ['build/three.webgpu.js','build/three.webgpu.nodes.js']){const source=await readFile(`node_modules/three/${path}`,'utf8');assert.equal(patchShadowCompileSource(source),source,path);}
 assert.throws(()=>patchShadowCompileSource('unsupported implementation'),/Unexpected/);
 for(const path of ['src/renderers/common/Renderer.js','build/three.webgpu.js','build/three.webgpu.nodes.js']){const source=await readFile(`node_modules/three/${path}`,'utf8');assert.equal(patchShadowPositionSource(source),source,path);}
 assert.throws(()=>patchShadowPositionSource('unsupported implementation'),/Unexpected/);
});

test('stable morph reference is reproducible, reversible and fails closed',async()=>{
 for(const path of ['src/nodes/accessors/MorphNode.js','build/three.webgpu.js','build/three.webgpu.nodes.js']){
  const source=await readFile(`node_modules/three/${path}`,'utf8');assert.equal(patchMorphInfluenceSource(source),source,path);
  const original=restoreMorphInfluenceSource(source);assert.notEqual(original,source,path);assert.equal(restoreMorphInfluenceSource(original),original,path);assert.equal(patchMorphInfluenceSource(original),source,path);
 }
 assert.throws(()=>patchMorphInfluenceSource('unsupported implementation'),/Unexpected/);
 assert.throws(()=>restoreMorphInfluenceSource('unsupported implementation'),/Unexpected/);
});

test('pipeline creation forwards failure to the compilation promise',async()=>{
 const source=await readFile('node_modules/three/src/renderers/webgpu/utils/WebGPUPipelineUtils.js','utf8');
 const match=source.match(/const p = new Promise\( \( resolve, reject \) => \{[\s\S]*?\n\s*\} \);\s*\n\s*pipelineData\.pendingPromise = p;\s*\n\s*promises\.push\( p \);/);
 assert.ok(match,'patched promise found');
 const create=new Function('device','pipelineDescriptor','pipelineData','promises',match[0]);
 const failure=Error('pipeline rejected'),promises=[];
 create({createRenderPipelineAsync:()=>Promise.reject(failure)},{},{},promises);
 assert.equal(promises.length,1);await assert.rejects(promises[0],error=>error===failure);
 const result={},pipeline={},success=[];
 create({createRenderPipelineAsync:()=>Promise.resolve(pipeline)},{},result,success);
 await success[0];assert.equal(result.pipeline,pipeline);
});

test('a reused pipeline retains its pending compilation promise',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;}),pipeline={},renderObject={};
 const backend={needsRenderUpdate:()=>false,get:value=>{assert.equal(value,pipeline);return {pendingPromise:pending};}};
 const pipelines=new Pipelines(backend,{});pipelines.get(renderObject).pipeline=pipeline;
 const promises=[];assert.equal(pipelines.getForRender(renderObject,promises),pipeline);
 pipelines.getForRender(renderObject,promises);assert.deepEqual(promises,[pending]);
 let complete=false;const waiting=Promise.all(promises).then(()=>{complete=true;});await Promise.resolve();assert.equal(complete,false);
 finish();await waiting;assert.equal(complete,true);
});

test('shadow material version changes only when its source or position changes',async()=>{
 const source=await readFile('node_modules/three/src/renderers/common/Renderer.js','utf8'),match=source.match(/if \( overrideMaterial\.isShadowPassMaterial === true \) \{\n\n\s*const all = this\._wgShadowPositionKeys[\s\S]*?\n\s*\}\n\n\s*\}\n\n\s*material = overrideMaterial;/);assert.ok(match,'shadow tracking guard found');const body=match[0].slice(0,match[0].lastIndexOf('material = overrideMaterial;')),run=new Function('object','material','overrideMaterial',body),renderer={},object={},node={},otherNode={};let changes=0;const shadow={isShadowPassMaterial:true,positionNode:node,version:0,set needsUpdate(value){if(value){this.version++;changes++;}}},material={version:0};
 run.call(renderer,object,material,shadow);run.call(renderer,object,material,shadow);assert.equal(changes,1);shadow.positionNode=otherNode;run.call(renderer,object,material,shadow);assert.equal(changes,2);material.version++;run.call(renderer,object,material,shadow);assert.equal(changes,3);run.call(renderer,object,material,shadow);assert.equal(changes,3);run.call(renderer,object,shadow,shadow);run.call(renderer,object,shadow,shadow);assert.equal(changes,4,'the override material does not invalidate itself indefinitely');
});
