import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
const root=process.env.WG_ADOPTION_OUT??'docs/qa/wild-engine-pthreads/reuse-adoption-loading';await mkdir(root,{recursive:true});
const rows=[];
for(const [label,adopted] of [['a1',false],['b1',true],['a2',false],['b2',true]]){
 const report=`${root}/${label}.json`,log=(await open(`${root}/${label}.log`,'wx')).createWriteStream();
 const env={...process.env,WG_THREAD_PORT:'5190',WG_THREADS:'1',WG_THREAD_BIOME:'manglares',WG_THREAD_QUALITY:'baja',WG_THREAD_FROZEN:'1',WG_THREAD_BENCH:'0',WG_THREAD_DEFAULT_STREAMING:adopted?'1':'0',WG_THREAD_LOADING_TIMES:'1',WG_THREAD_WATER_BED_WORKER:'1',WG_THREAD_WATER_SHORE_WORKER:'0',WG_THREAD_RETAIN_APP:'0',WG_THREAD_WARM_OBSTRUCTION:'0',WG_CHUNK_EVICTION:'single',WG_THREAD_EDIT:'0',WG_THREAD_EXIT:'0',WG_THREAD_CONTEXT:'0',WG_THREAD_REPORT:report};
 console.log('START',label);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/check-spatial-thread-game.mjs'],{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',code=>log.end(()=>code===0?resolve():reject(Error(`${label} failed ${code}`))));});
 const r=JSON.parse(await readFile(report,'utf8')),v=r.result;
 assert.equal(v.runtime.backend,'pthreads');assert.equal(v.streamingOptions.retainPrograms,adopted);assert.equal(v.streamingOptions.waterShore,adopted);assert.equal(v.streamingOptions.batchEviction,adopted);
 assert(r.errors.every(e=>e.includes('f_environment4')));assert(Number.isFinite(v.loading.readyMs)&&v.loading.readyMs>0);
 const obstruction=v.loading.phases.filter(p=>p.label==='warm-compile-obstruction');assert.equal(obstruction.length,adopted?1:0);
 if(adopted){assert(v.programRetention.retained>0);for(const key of ['waterBedWorker','waterShoreWorker','chunkEviction','warmObstruction','retainPrograms'])assert(!new URL(r.url).searchParams.has(key));}
 rows.push({label,adopted,readyMs:v.loading.readyMs,obstructionMs:obstruction.reduce((n,p)=>n+p.ms,0),programRetention:v.programRetention,phases:v.loading.phases,report});
 await writeFile(`${root}/summary.json`,JSON.stringify({scope:'Serial A/B/A/B Chrome launches on the same host, Mangroves low quality. A is the previous adopted water-only configuration; B selects current defaults without streaming QA parameters. Timing runs from menu action to world readiness before loading-overlay removal; includes presentation and I/O and is not CPU-only or a guaranteed cold-cache measurement.',rows},null,2)+'\n');console.log('DONE',label,rows.at(-1).readyMs);
}
