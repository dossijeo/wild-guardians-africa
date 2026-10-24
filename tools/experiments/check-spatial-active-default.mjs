import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
const root=process.env.WG_ACTIVE_OUT??'docs/qa/wild-engine-pthreads/active-default-low';await mkdir(root,{recursive:true});
const quality=process.env.WG_THREAD_QUALITY??'baja',night=process.env.WG_ACTIVE_NIGHT==='1',reuse=process.env.WG_ACTIVE_STREAM_REUSE==='1';
const biomes=(process.env.WG_ACTIVE_BIOMES??'sabana,desierto,gran-rio,volcanes,manglares,gran-canon').split(',');
assert(['media','baja'].includes(quality));
assert(!night||biomes.length===1&&biomes[0]==='manglares','Night fixture is explicitly scoped to Mangroves');
let nightFixture;
if(night){const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/manglares-populated-frozen-20261022/native-fixture.json','utf8'));const state=JSON.parse(fixture.timing.navigationContext.state);state.time=450;state.elapsed=450;fixture.timing.navigationContext.state=JSON.stringify(state);nightFixture=`${root}/night-fixture.json`;await writeFile(nightFixture,JSON.stringify(fixture)+'\n');}
const rows=[];
for(const biome of biomes){
 const report=`${root}/${biome}.json`,log=await open(`${root}/${biome}.log`,'wx'),output=log.createWriteStream();
 const env={...process.env,WG_THREAD_LOCK_RAID_CAMERA:night?'1':'0',WG_THREAD_PORT:process.env.WG_THREAD_PORT??'5190',WG_THREADS:'1',WG_THREAD_BIOME:biome,WG_THREAD_QUALITY:quality,WG_THREAD_FROZEN:'1',WG_THREAD_BENCH:'1',WG_THREAD_ACTIVE:'1',WG_THREAD_FRAMES:'360',WG_THREAD_DISTANCE:'144',WG_THREAD_COMPLETE_LEGS:'0',WG_THREAD_ZIGZAG:'0',WG_THREAD_GPU:'1',WG_THREAD_GL_DETAIL:'1',WG_THREAD_DETAIL:'0',WG_THREAD_CPU_PROFILE:'0',WG_THREAD_RETAIN_APP:'0',WG_THREAD_PIN_PROGRAMS:'0',WG_THREAD_WARM_OBSTRUCTION:'0',WG_THREAD_WATER_BED_DIRECT:'0',WG_THREAD_FAR_CHECK:'0',WG_CHUNK_EVICTION:'single',WG_HORIZON_BED:'sync',WG_CHUNK_INSTALL:'sync',WG_THREAD_REPORT:report,WG_THREAD_EDIT:'0',WG_THREAD_CONTEXT:'0',WG_THREAD_EXIT:'0',WG_THREAD_NO_ISOLATION:'0',WG_THREAD_BOOT_FAILURE:'0'};
 if(reuse){env.WG_THREAD_RETAIN_APP='1';env.WG_THREAD_WARM_OBSTRUCTION='1';env.WG_CHUNK_EVICTION='batch';env.WG_THREAD_WATER_SHORE_WORKER='1';}
 delete env.WG_THREAD_WATER_BED_WORKER;delete env.WG_THREAD_FIXTURE_FILE;delete env.WG_THREAD_SAVE_FIXTURE;if(nightFixture)env.WG_THREAD_FIXTURE_FILE=nightFixture;
 console.log(`START ${biome}`);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/check-spatial-thread-game.mjs'],{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});child.on('error',reject);child.on('close',code=>output.end(()=>code===0?resolve():reject(Error(`${biome} exited ${code}`))));});
 const raw=JSON.parse(await readFile(report,'utf8')),s=raw.result.streaming;
 assert.equal(raw.result.runtime.backend,'pthreads');if(biome==='manglares')assert(s.preparedWater.count>0,'Default Mangroves must prepare water on the pthread');else assert.equal(s.preparedWater.count,0);assert(s.elapsed>s.initialElapsed);assert(s.created>0);assert(s.summary.publish.count>0);if(reuse){assert(s.summary.removeBatch.count>0);if(biome==='manglares')assert(s.preparedShore.count>0);else assert.equal(s.preparedShore.count,0);}else{assert(s.summary.remove.count>0);assert.equal(s.summary.removeBatch.count,0);}assert.equal(s.farSettled,true);assert(s.farStatus.every(a=>a.errors.length===0));assert.equal(s.pausedFrames,0);assert(s.actorsReadyFrames>0);if(night)assert(s.initialElapsed>=450);assert.equal(s.summary.generate.count,0);assert.equal(s.gpu.disjoint,false);assert(raw.errors.every(e=>e.includes('f_environment4')));
 rows.push({biome,quality,night,reuse,scope:(reuse?'Combined prepared-bank/reuse candidate; ':'Default pthread path; ')+' active simulation and continuous camera. Night uses an explicit time-450 fixture and QA override of raid-camera movement, not a tested dusk transition or normal night-camera interaction. Final simulation states differ; not an A/B speed claim or full campaign validation.',created:s.created,preparedWater:s.preparedWater,preparedShore:s.preparedShore,elapsed:s.elapsed-s.initialElapsed,frames:s.summary.frames,publication:s.summary.publish,eviction:s.summary.remove,horizon:s.summary.horizon,gpu:s.gpu.summary,memoryBytes:s.final.memoryBytes,actorsReadyFrames:s.actorsReadyFrames,pausedFrames:s.pausedFrames,report});
 await writeFile(`${root}/summary.json`,JSON.stringify({rows},null,2)+'\n');console.log(`PASS ${biome}: ${s.created} chunks, ${s.elapsed-s.initialElapsed}s simulation`);
}
