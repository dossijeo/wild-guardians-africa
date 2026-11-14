import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';

test('graphics trace follows the profile identity across profiler threads and classifies nested samples once',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wg-trace-'));try{
  const input=join(dir,'trace.json.gz'),output=join(dir,'summary.json');
  const frame=(functionName,url)=>({functionName,url,scriptId:1,lineNumber:0,columnNumber:0});
  const events=[{name:'WG_RAID_TRACE_START',ts:1000},{name:'WG_RAID_TRACE_END',ts:201000},{name:'FunctionCall',pid:7,tid:8,args:{data:{functionName:'draw',url:'/src/rendering/webgpu-world-worker.js'}}},{name:'RunTask',ph:'X',pid:7,tid:8,ts:1000,dur:100000},{name:'RunTask',ph:'X',pid:7,tid:8,ts:110000,dur:20000},{name:'Profile',pid:7,tid:8,id:'p',args:{data:{startTime:1000}}},{name:'ProfileChunk',pid:7,tid:99,id:'p',args:{data:{cpuProfile:{nodes:[{id:1,callFrame:frame('draw','/src/rendering/webgpu-world-worker.js'),children:[2,3]},{id:2,callFrame:frame('pump','/src/rendering/webgpu-pipeline-admission.js'),children:[4]},{id:3,callFrame:frame('advance','/src/rendering/confirmed-timeline-pump.js')},{id:4,callFrame:frame('sampleGrassTerrain','/src/rendering/grass-terrain-sampling.js')}],samples:[4,2,3]},timeDeltas:[20000,30000,40000]}}}];
  await writeFile(input,gzipSync(JSON.stringify({traceEvents:events})));execFileSync(process.execPath,['tools/experiments/classify-graphics-worker-trace.mjs',input,output]);const result=JSON.parse(await readFile(output,'utf8'));assert.equal(result.tasks.length,1);assert.deepEqual(result.tasks[0].categoriesMs,{grass:20,admission:30,timeline:40,draw:0,other:0});
 }finally{await rm(dir,{recursive:true,force:true});}
});
