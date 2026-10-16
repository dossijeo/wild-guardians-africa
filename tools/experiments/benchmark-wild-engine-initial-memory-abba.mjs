import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Compare independently compiled INITIAL_MEMORY variants on one host.
// The nested workload runs in a fresh Node process for each position.
const artifactRoot=resolve(process.argv[2]??'.cache/wild-engine-memory-ci');
const output=process.argv[3];
const biome=process.argv[4]??'manglares';
const repetitions=Number(process.argv[5]??2);
if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>10)
  throw RangeError('Repetitions must be 1–10');
const temp=mkdtempSync(join(tmpdir(),'wild-engine-memory-'));
const runs=[];
try{
  for(const candidate of [16,32,64])for(let cycle=0;cycle<repetitions;cycle++)
    for(const mib of [4,candidate,candidate,4]){
      const wasmPath=join(artifactRoot,`wild-engine-memory-${mib}mib`,'engine.wasm');
      const reportPath=join(temp,`${runs.length}.json`);
      execFileSync(process.execPath,[
        'tools/experiments/benchmark-wild-engine-linear-memory.mjs',
        wasmPath,reportPath,'0',biome,'712'],{stdio:'ignore'});
      const report=JSON.parse(readFileSync(reportPath));
      const row=report.rows.at(-1);
      runs.push({mib,candidate,cycle,source:report.source,
        milliseconds:row.samples.slice(1).reduce((sum,sample)=>sum+sample.milliseconds,0),
        instantiatedBytes:row.samples[0].linearBytes,
        finalBytes:row.samples.at(-1).linearBytes,
        growthNotifications:row.growth.length,
        outcomes:row.outcomes,routeSha256:row.routeSha256,
        phaseMilliseconds:Object.fromEntries(row.samples.slice(1).map(s=>[s.phase,s.milliseconds]))});
    }
}finally{rmSync(temp,{recursive:true,force:true});}
const routeHashes=new Set(runs.map(run=>run.routeSha256));
if(routeHashes.size!==1)throw Error(`Route results differ across compiled variants: ${routeHashes.size} hashes`);
const result={biome,seed:712,chunks:49,repetitions,
  runnerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  description:'Sequential ABBA comparison of compiled binaries on the same host. Synthetic workload, not a campaign.',
  runs};
if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
for(const mib of [4,16,32,64]){
  const values=runs.filter(run=>run.mib===mib).map(run=>run.milliseconds).sort((a,b)=>a-b);
  console.log(JSON.stringify({mib,samples:values.length,medianMilliseconds:values[Math.floor(values.length/2)],
    minimumMilliseconds:values[0],maximumMilliseconds:values.at(-1)}));
}
