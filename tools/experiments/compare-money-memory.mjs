import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const controlPath=process.argv[2];
if(!controlPath)throw Error('Pass the control checkout money.js path');
const candidatePath=resolve('src/simulation/money.js');
const scriptPath=resolve('tools/experiments/benchmark-money-memory.mjs');
const paths={candidate:candidatePath,control:resolve(controlPath)};
const samples={candidate:[],control:[]};
for(const name of ['control','candidate','candidate','control',
  'candidate','control','control','candidate']){
  const result=spawnSync(process.execPath,['--expose-gc',scriptPath,paths[name]],
    {encoding:'utf8',maxBuffer:1024*1024});
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  const sample=JSON.parse(result.stdout);
  if(sample.result.n!=='100000'||sample.result.d!=='7')
    throw Error(`${name} returned a different result`);
  samples[name].push({elapsedMs:sample.elapsedMs,
    retainedHeapBytes:sample.afterHeap-sample.beforeHeap,
    retainedRssBytes:sample.afterRss-sample.beforeRss,
    peakRssAboveStartBytes:sample.peakSampledRss-sample.beforeRss});
}
const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return (sorted[1]+sorted[2])/2;
};
const summary=Object.fromEntries(Object.entries(samples).map(([name,rows])=>[
  name,Object.fromEntries(Object.keys(rows[0]).map(key=>[
    key,median(rows.map(row=>row[key]))]))]));
const sourceHashes=Object.fromEntries(Object.entries(paths).map(([name,path])=>[
  name,createHash('sha256').update(readFileSync(path)).digest('hex')]));
console.log(JSON.stringify({node:process.version,operations:100000,
  sourceHashes,summary,samples},null,2));
