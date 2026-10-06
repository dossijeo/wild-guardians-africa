import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const rows=[];
for(let trial=0;trial<3;trial++)for(const mode of trial%2?['cached','uncached']:['uncached','cached']){
 const start=performance.now();
 const run=spawnSync(process.execPath,['tools/check_integrated_load.mjs','--warm-navigation','--trace','--terrain-metrics',...(mode==='uncached'?['--no-terrain-cache']:[])],{encoding:'utf8',maxBuffer:4*1024*1024});
 assert.equal(run.status,0,run.stderr);const wallMs=performance.now()-start;
 const report=JSON.parse(run.stdout.slice(run.stdout.indexOf('{\n')));
 assert.equal(report.trajectorySha256,'9ea59d5816db79085aafff2ec796d4322ab680afde6209555befa8d0baf0fd54');
 assert.equal(report.steps,1630);assert.equal(report.searches,161);
 rows.push({trial,mode,wallMs,maxTickMs:report.maxTickMs,terrainQueries:report.terrainQueries,terrainEvaluations:report.terrainEvaluations,trajectorySha256:report.trajectorySha256});
}
console.log(JSON.stringify({node:process.version,scope:'Sequential alternating child-process native terrain simulation, includes setup and serialized trace. Query counters add overhead. Three trials each, no GPU/mobile/frame-rate claim. All states match the frozen pre-cache trace.',rows},null,2));
