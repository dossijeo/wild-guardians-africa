import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-palette-benchmark.json';
const source=process.env.WG_QA_BASELINE_COMMIT??'6f3796c6';
const binary='src/world/hierarchical-wasm/spatial-savanna.wasm';
const modules={before:new WebAssembly.Module(execFileSync('git',['show',`${source}:${binary}`])),
  after:new WebAssembly.Module(readFileSync(binary))};
function run(which){
  const core=createSpatialSavannaPrototype(modules[which]);
  const start=performance.now();
  core.generate(712,0,0);
  const generated=performance.now();
  core.buildNavigation(1.1,false);
  const navigated=performance.now();
  return {which,generationMs:generated-start,navigationMs:navigated-generated,
    totalMs:navigated-start,memoryBytes:core.metrics().memoryBytes};
}
const rows=[];
for(let trial=0;trial<12;trial++)for(const which of trial%2?['after','before']:['before','after'])rows.push({trial,...run(which)});
const report={scope:'Twelve ABBA pairs; one Sabana seed 712 chunk, generation then animal graph. Compare the named source revision with the current WASM binary.',source,rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
for(const which of ['before','after']){
  const times=rows.filter(row=>row.which===which).map(row=>row.totalMs).sort((a,b)=>a-b);
  console.log(JSON.stringify({which,medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.floor(times.length*.95)]}));
}
