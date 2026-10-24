import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
const root=process.env.WG_ACTIVE_OUT??'docs/qa/wild-engine-pthreads/active-batch-grid';await mkdir(root,{recursive:true});
const rows=[];
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon']){
 const report=`${root}/${biome}.json`,log=await open(`${root}/${biome}.log`,'wx'),output=log.createWriteStream();
 const env={...process.env,WG_THREAD_PORT:'5299',WG_THREADS:'1',WG_THREAD_BIOME:biome,WG_THREAD_QUALITY:'media',WG_THREAD_FROZEN:'1',WG_THREAD_BENCH:'1',WG_THREAD_ACTIVE:'1',WG_THREAD_FRAMES:'360',WG_THREAD_DISTANCE:'144',WG_THREAD_COMPLETE_LEGS:'0',WG_THREAD_ZIGZAG:'0',WG_THREAD_GPU:'1',WG_THREAD_GL_DETAIL:'1',WG_THREAD_DETAIL:'0',WG_THREAD_CPU_PROFILE:'0',WG_THREAD_RETAIN_APP:'0',WG_THREAD_PIN_PROGRAMS:'0',WG_CHUNK_EVICTION:'batch',WG_HORIZON_BED:'native-grid',WG_CHUNK_INSTALL:'sync',WG_THREAD_REPORT:report,WG_THREAD_EDIT:'0',WG_THREAD_CONTEXT:'0',WG_THREAD_EXIT:'0',WG_THREAD_NO_ISOLATION:'0',WG_THREAD_BOOT_FAILURE:'0'};
 delete env.WG_THREAD_FIXTURE_FILE;delete env.WG_THREAD_SAVE_FIXTURE;
 console.log(`START ${biome}`);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/check-spatial-thread-game.mjs'],{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});child.on('error',reject);child.on('close',code=>output.end(()=>code===0?resolve():reject(Error(`${biome} exited ${code}`))));});
 const raw=JSON.parse(await readFile(report,'utf8')),s=raw.result.streaming;
 assert.equal(raw.result.runtime.backend,'pthreads');assert(s.elapsed>s.initialElapsed);assert(s.created>0);assert(s.summary.publish.count>0);assert(s.summary.removeBatch.count>0);assert.equal(s.summary.generate.count,0);assert.equal(s.gpu.disjoint,false);assert(raw.errors.every(e=>e.includes('f_environment4')));
 rows.push({biome,scope:'Functional active-world streaming smoke; final simulation states differ, not an A/B performance comparison or complete campaign validation.',created:s.created,elapsed:s.elapsed-s.initialElapsed,frames:s.summary.frames,publication:s.summary.publish,batchEviction:s.summary.removeBatch,horizon:s.summary.horizon,gpu:s.gpu.summary,memoryBytes:s.final.memoryBytes,actorsReadyFrames:s.actorsReadyFrames,pausedFrames:s.pausedFrames,report});
 await writeFile(`${root}/summary.json`,JSON.stringify({rows},null,2)+'\n');console.log(`PASS ${biome}: ${s.created} chunks, ${s.elapsed-s.initialElapsed}s simulation`);
}
