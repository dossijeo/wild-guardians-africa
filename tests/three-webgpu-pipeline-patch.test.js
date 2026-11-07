import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchPipelineSource,patchPipelineCacheSource,patchShadowCompileSource} from '../tools/patch-three-webgpu-pipeline.mjs';
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
