// Longer, paired native campaigns after a short GA pilot. No gene search occurs here.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {evaluateOne} from './run-ga.mjs';
import {DEFAULT_GENES,validateGenes} from './policy-genes.mjs';

export async function runPaired({days=14,biome='sabana',seeds=[712,123],genes=DEFAULT_GENES,
 output='docs/qa/evolutionary-balance/paired-14'}={}){
 if(!Number.isSafeInteger(days)||days<1||days>100||!Array.isArray(seeds)||!seeds.length||
  seeds.some(x=>!Number.isSafeInteger(x)||x<0))throw Error('Invalid paired campaign budget');
 genes=validateGenes(genes);
 const dir=resolve(output);mkdirSync(dir,{recursive:true});
 const sourceHash=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const sourceFiles=['tools/evolutionary-balance/run-paired.mjs','tools/evolutionary-balance/run-ga.mjs',
  'tools/native-campaign-runner.mjs','tools/native-expanding-defense-policy.mjs'];
 const moduleHashes=Object.fromEntries(sourceFiles.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
 const config={sourceHash,moduleHashes,days,biome,seeds,genes,
  controls:['evolved','good-current-magic'],balance:'production unchanged'};
 if(existsSync(join(dir,'config.json'))&&
  JSON.stringify(JSON.parse(readFileSync(join(dir,'config.json'),'utf8')))!==JSON.stringify(config))
  throw Error('Paired output already belongs to a different source or configuration');
 writeFileSync(join(dir,'config.json'),JSON.stringify(config,null,2)+'\n');
 const cases=[];
 for(const seed of seeds)for(const strategy of ['evolved','good-current-magic']){
  const name=`${strategy}-${biome}-${seed}-${days}`,path=join(dir,`${name}.json.gz`),
   legacyPath=join(dir,`${name}.json`),progress=join(dir,`${name}.jsonl`);
  const report=existsSync(path)?JSON.parse(gunzipSync(readFileSync(path))):
   existsSync(legacyPath)?JSON.parse(readFileSync(legacyPath,'utf8')):
   await evaluateOne({biome,seed},days,strategy,
   strategy==='evolved'?genes:null,row=>{
    const sample={day:row.day,money:row.money,living:row.living,destroyed:row.destroyed,
     gameTickMs:row.wallTime?.gameTickMs,result:row.result};
    appendFileSync(progress,JSON.stringify(sample)+'\n');
    console.log(JSON.stringify({strategy,seed,...sample}));
   },true);
  if(!existsSync(path)&&!existsSync(legacyPath))
   writeFileSync(path,gzipSync(JSON.stringify(report,null,2)+'\n',{level:9,mtime:0}));
  cases.push({strategy,seed,status:report.status,completedNights:report.completedNights??null,
   result:report.result??null,daysRecorded:report.rows?.length??0,
   finalCash:report.rows?.at(-1)?.money??null,finalLiving:report.rows?.at(-1)?.living??null,
   destroyed:report.rows?.reduce((n,r)=>n+r.destroyed,0)??null});
  writeFileSync(join(dir,'summary.json'),JSON.stringify({config,cases},null,2)+'\n');
 }
 return {config,cases};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const input=process.argv[2]?JSON.parse(readFileSync(resolve(process.argv[2]),'utf8')):{};
 runPaired(input).then(x=>console.log(JSON.stringify(x.cases)),e=>{console.error(e);process.exitCode=1;});
}
