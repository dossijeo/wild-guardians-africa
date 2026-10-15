// Native paired diagnostic: identical virtual agriculture, changing only wall/Shield use.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {evaluateOne} from './run-ga.mjs';
import {DEFAULT_GENES,GENE_SCHEMA_VERSION,validateGenes} from './policy-genes.mjs';
import {MATCHED_DEFENSE_CONTROLS} from './matched-defense-controls.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateMatchedConfig(raw){
 const c={days:14,biome:'manglares',seed:123,genes:DEFAULT_GENES,
  output:'docs/qa/evolutionary-balance/matched-defense-14',
  maxDayGameTickMs:60000,maxElapsedWallMs:900000,...raw};
 if(!Number.isSafeInteger(c.days)||c.days<1||c.days>100||
  !Number.isSafeInteger(c.seed)||c.seed<0||typeof c.biome!=='string'||
  !Number.isSafeInteger(c.maxDayGameTickMs)||c.maxDayGameTickMs<1000||
  !Number.isSafeInteger(c.maxElapsedWallMs)||c.maxElapsedWallMs<1000)
  throw Error('Invalid matched defense budget');
 c.genes=validateGenes(c.genes);
 if(c.genes.wallPolicy!=='planned')throw Error('Matched defense arms require planned baseline wall policy');
 return c;
}
export async function runMatchedDefense(raw){
 const c=validateMatchedConfig(raw),out=resolve(c.output);mkdirSync(out,{recursive:true});
 const modules=['tools/evolutionary-balance/run-matched-defense.mjs',
  'tools/evolutionary-balance/run-ga.mjs','tools/evolutionary-balance/policy-genes.mjs',
  'tools/evolutionary-balance/matched-defense-controls.mjs',
  'tools/native-campaign-runner.mjs','tools/native-expanding-defense-policy.mjs'];
 const stamp={sourceHash:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  geneSchemaVersion:GENE_SCHEMA_VERSION,
  moduleHashes:Object.fromEntries(modules.map(p=>[p,sha256(readFileSync(p))])),
  config:c,arms:MATCHED_DEFENSE_CONTROLS,balance:'production unchanged'};
 const configPath=join(out,'config.json');
 if(existsSync(configPath)&&JSON.stringify(JSON.parse(readFileSync(configPath)))!==JSON.stringify(stamp))
  throw Error('Matched output already belongs to another source/configuration');
 writeFileSync(configPath,JSON.stringify(stamp,null,2)+'\n');
 const cases=[];
 for(const strategy of Object.keys(MATCHED_DEFENSE_CONTROLS)){
  const path=join(out,`${strategy}-${c.biome}-${c.seed}-${c.days}.json.gz`);
  const progress=join(out,`${strategy}-${c.biome}-${c.seed}-${c.days}.jsonl`);
  let day=0,gameTickMs=0;const began=Date.now();
  const report=existsSync(path)?JSON.parse(gunzipSync(readFileSync(path))):
   await evaluateOne({biome:c.biome,seed:c.seed},c.days,strategy,c.genes,row=>{
    const sample={day:row.day,result:row.result,money:row.money,living:row.living,
     destroyed:row.destroyed,gameTickMs:row.wallTime?.gameTickMs};
    appendFileSync(progress,JSON.stringify(sample)+'\n');console.log(JSON.stringify({strategy,...sample}));
   },true,(state,_nav,timing)=>{
    if(day!==state.day){day=state.day;gameTickMs=0;}
    gameTickMs+=timing.gameTickMs??0;
    if(gameTickMs>c.maxDayGameTickMs||Date.now()-began>c.maxElapsedWallMs){
     const error=new Error(`Cooperative computational cost stop at day ${state.day}`);
     error.name='CampaignCostStop';throw error;
    }
   });
  if(!existsSync(path))writeFileSync(path,gzipSync(JSON.stringify(report,null,2)+'\n',{level:9,mtime:0}));
  cases.push({strategy,status:report.status,stop:report.status==='error'?
   report.name==='CampaignCostStop'?'computational-cost-stop':'technical-error':
   report.result==='defeat'?'native-defeat':report.completedNights>=c.days?'horizon-survivor':'truncated',
   completedNights:report.completedNights??null,result:report.result??null,
   finalCash:report.rows?.at(-1)?.money??null,finalLiving:report.rows?.at(-1)?.living??null,
   destroyed:report.rows?.reduce((n,r)=>n+r.destroyed,0)??null,
   wallCost:report.rows?.reduce((n,r)=>n+r.walls,0)??null,
   shieldContacts:report.raid?.reduce((n,r)=>n+(r.shieldContacts??0),0)??null});
  writeFileSync(join(out,'summary.json'),JSON.stringify({stamp,cases},null,2)+'\n');
 }
 return {stamp,cases};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const config=process.argv[2]?JSON.parse(readFileSync(resolve(process.argv[2]),'utf8')):{};
 runMatchedDefense(config).then(r=>console.log(JSON.stringify(r.cases)),e=>{console.error(e);process.exitCode=1;});
}
