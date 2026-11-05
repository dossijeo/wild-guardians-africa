import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchPipelineSource} from '../tools/patch-three-webgpu-pipeline.mjs';

test('installed Three source is patched idempotently and unknown code fails closed',async()=>{
 for(const path of ['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','build/three.webgpu.js','build/three.webgpu.nodes.js']){
  const source=await readFile(`node_modules/three/${path}`,'utf8');
  assert.equal(patchPipelineSource(source),source,path);
 }
 assert.throws(()=>patchPipelineSource('unsupported implementation'),/Unexpected/);
});

test('pipeline creation forwards failure to the compilation promise',async()=>{
 const source=await readFile('node_modules/three/src/renderers/webgpu/utils/WebGPUPipelineUtils.js','utf8');
 const match=source.match(/const p = new Promise\( \( resolve, reject \) => \{[\s\S]*?\n\s*\} \);\s*\n\s*promises\.push\( p \);/);
 assert.ok(match,'patched promise found');
 const create=new Function('device','pipelineDescriptor','pipelineData','promises',match[0]);
 const failure=Error('pipeline rejected'),promises=[];
 create({createRenderPipelineAsync:()=>Promise.reject(failure)},{},{},promises);
 assert.equal(promises.length,1);await assert.rejects(promises[0],error=>error===failure);
 const result={},pipeline={},success=[];
 create({createRenderPipelineAsync:()=>Promise.resolve(pipeline)},{},result,success);
 await success[0];assert.equal(result.pipeline,pipeline);
});
