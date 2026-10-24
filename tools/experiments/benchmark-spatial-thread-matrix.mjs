import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';

// Run serially on an otherwise idle machine. Each leg drains the stream before
// moving again: frame-count camera paths can compare different cancelled work.
const biomes=(process.env.WG_MATRIX_BIOMES??'sabana,desierto,gran-rio,volcanes,manglares,gran-canon').split(',');
const quality=process.env.WG_THREAD_QUALITY??'media';
const compare=process.env.WG_MATRIX_COMPARE??'threads';
assert(['threads','program-retention','chunk-eviction','horizon-bed','horizon-native-grid','obstruction-warmup'].includes(compare));
const root=process.env.WG_MATRIX_OUT??`docs/qa/wild-engine-pthreads/matrix-${quality}`;
await mkdir(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const result={commit,quality,compare,farCompletionGate:true,horizonBedBudget:Number(process.env.WG_HORIZON_BED_BUDGET??2),scope:'Paused real game; equivalent completed streaming work, 720p, GPU timer every third render. Not active simulation or visual acceptance.',runs:[]};
let hardware;
for(const biome of biomes){
 let reference;
 for(const [label,variant] of [['a1','0'],['b1','1'],['a2','0'],['b2','1']]){
  const threads=compare==='threads'?variant:'1';
  const report=`${root}/${biome}-${label}.json`;
  console.log(`${new Date().toISOString()} START ${biome} ${label}`);
  const env={...process.env,WG_THREADS:threads,WG_THREAD_BIOME:biome,WG_THREAD_QUALITY:quality,
   WG_THREAD_FROZEN:'1',WG_THREAD_BENCH:'1',WG_THREAD_COMPLETE_LEGS:'1',WG_THREAD_FRAMES:'2',WG_THREAD_DISTANCE:'240',WG_THREAD_GPU:'1',
   WG_HORIZON_BED:compare==='horizon-native-grid'&&variant==='1'?'native-grid':compare==='horizon-bed'&&variant==='1'?'staged':'sync',WG_CHUNK_EVICTION:compare==='horizon-native-grid'||compare==='horizon-bed'||compare==='chunk-eviction'&&variant==='1'?'batch':'single',WG_THREAD_ACTIVE:'0',WG_THREAD_FAR_CHECK:'0',WG_THREAD_PIN_PROGRAMS:'0',WG_THREAD_WARM_OBSTRUCTION:compare==='obstruction-warmup'?variant:'0',WG_THREAD_RETAIN_APP:compare==='obstruction-warmup'?'1':compare==='program-retention'?variant:'0',WG_THREAD_ZIGZAG:'0',WG_THREAD_EDIT:'0',WG_THREAD_CONTEXT:'0',WG_THREAD_EXIT:'0',
   WG_THREAD_NO_ISOLATION:'0',WG_THREAD_BOOT_FAILURE:'0',WG_THREAD_GL_DETAIL:compare!=='threads'?'1':'0',WG_THREAD_CPU_PROFILE:'0',WG_THREAD_DEPTH_WARM:'0',WG_THREAD_DETAIL:'0',WG_CHUNK_INSTALL:'sync',WG_THREAD_REPORT:report};
  delete env.WG_THREAD_FIXTURE_FILE;delete env.WG_THREAD_SAVE_FIXTURE;
  // Refuse reused paths before spawning a browser (stream open is asynchronous).
  const log=await open(report.replace(/\.json$/,'.log'),'wx');
  const output=log.createWriteStream();
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['tools/experiments/check-spatial-thread-game.mjs'],{env,stdio:['ignore','pipe','pipe']});
   child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
   child.on('error',reject);child.on('close',code=>output.end(()=>code===0?resolve():reject(Error(`${biome} ${label} exited ${code}; see log`))));
  });
  const raw=JSON.parse(await readFile(report,'utf8')),s=raw.result.streaming;
  assert.equal(raw.result.runtime.backend,threads==='1'?'pthreads':'standalone');
  assert.equal(s.farSettled,true);assert(s.farStatus.every(a=>a.errors.length===0));
  assert.equal(s.created,50);assert.equal(s.summary.cancel.count,0);
  assert.equal(s.final.loadedChunks,25);assert.equal(s.elapsed,s.initialElapsed);
  assert.equal(s.gpu.supported,true);assert.equal(s.gpu.disjoint,false);
  hardware??=s.hardware;assert.equal(s.hardware,hardware);
  const signature={legs:s.legs,camera:s.cameraOrigin,target:s.targetOrigin,props:s.final.residentVisiblePropRecords,sectors:s.final.loadedSectors};
  reference??=signature;assert.deepEqual(signature,reference,'Compared runs did not complete equivalent work');
  const row={biome,label,backend:raw.result.runtime.backend,hardware,created:s.created,frames:s.summary.frames,gpu:s.gpu.summary,
   programRetention:raw.result.programRetention??null,slowGlCount:s.slowGl.length,slowGlMs:s.slowGl.reduce((sum,call)=>sum+call.ms,0),
   horizon:s.summary.horizon,syncChunks:s.summary.syncChunks,eviction:s.summary.remove,batchEviction:s.summary.removeBatch,generation:s.summary.generate,admission:s.summary.admit,publication:s.summary.publish,nativeCompute:s.summary.nativeCompute,install:s.summary.install,memoryBytes:s.final.memoryBytes,
   observedRafMs:s.rows.frames.reduce((a,b)=>a+b,0),report};
  result.runs.push(row);await writeFile(`${root}/summary.json`,JSON.stringify(result,null,2)+'\n');
  console.log(`${new Date().toISOString()} DONE ${biome} ${label} mean=${row.frames.mean.toFixed(2)} p95=${row.frames.p95.toFixed(2)} max=${row.frames.max.toFixed(2)}`);
 }
}
