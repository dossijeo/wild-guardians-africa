// Frozen policy comparison: only legal virtual-player material and repair genes vary.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {serialize} from '../../src/persistence/snapshots.js';
import {evaluateOne} from './run-ga.mjs';
import {DEFAULT_GENES,validateGenes} from './policy-genes.mjs';

const config=JSON.parse(readFileSync(resolve(process.argv[2]),'utf8'));
const {biome,seed,days,wallMaterial,repairHealthFraction,output}=config;
if(typeof biome!=='string'||!Number.isSafeInteger(seed)||!Number.isSafeInteger(days)||days<1||days>100||typeof output!=='string')
 throw Error('Invalid pilot config');
const genes=validateGenes({...DEFAULT_GENES,wallMaterial,repairHealthFraction});
const dir=resolve(output),checkpoints=join(dir,'checkpoints');
mkdirSync(checkpoints,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const script=fileURLToPath(import.meta.url);
const stamp={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 scriptSha256:sha(readFileSync(script)),
 runnerSha256:sha(readFileSync(fileURLToPath(new URL('../native-campaign-runner.mjs',import.meta.url)))),
 policySha256:sha(readFileSync(fileURLToPath(new URL('../native-expanding-defense-policy.mjs',import.meta.url)))),
 input:{biome,seed,days,strategy:'evolved',genes},balance:'production-unchanged',
 costStop:{maxDayGameTickMs:180000,maxElapsedWallMs:1800000}};
writeFileSync(join(dir,'stamp.json'),JSON.stringify(stamp,null,2)+'\n');
let checkpointDay=0,currentDay=0,currentDayTickMs=0;
const began=Date.now();
const report=await evaluateOne({biome,seed},days,'evolved',genes,row=>{
 const progress={day:row.day,money:row.money,living:row.living,destroyed:row.destroyed,
  wallCost:row.finance?.walls,repairCost:row.finance?.repairs,
  gameTickMs:row.wallTime?.gameTickMs,result:row.result};
 appendFileSync(join(dir,'progress.jsonl'),JSON.stringify(progress)+'\n');
 console.log(JSON.stringify(progress));
},true,(state,_nav,timing)=>{
 if(state.day!==checkpointDay){
  const json=serialize(state),blob=gzipSync(json);
  const file=`day-${String(state.day).padStart(3,'0')}.json.gz`;
  writeFileSync(join(checkpoints,file),blob);
  appendFileSync(join(checkpoints,'index.jsonl'),JSON.stringify({day:state.day,
   time:state.time,file,sha256:sha(json),bytes:blob.length})+'\n');
  checkpointDay=state.day;
 }
 if(state.day!==currentDay){currentDay=state.day;currentDayTickMs=0;}
 currentDayTickMs+=timing.gameTickMs??0;
 if(currentDayTickMs>stamp.costStop.maxDayGameTickMs||
  Date.now()-began>stamp.costStop.maxElapsedWallMs){
  const error=new Error(`Cooperative computational cost stop at day ${state.day}`);
  error.name='CampaignCostStop';throw error;
 }
});
const json=Buffer.from(JSON.stringify(report,null,2)+'\n');
const archive=gzipSync(json);
writeFileSync(join(dir,'report.json.gz'),archive);
writeFileSync(join(dir,'archive-index.json'),JSON.stringify({codec:'gzip',files:[{
 sourceName:'report.json',archiveName:'report.json.gz',sourceSha256:sha(json),
 archiveSha256:sha(archive),sourceBytes:json.length,archiveBytes:archive.length}]},null,2)+'\n');
const classification=report.status==='error'?
 report.name==='CampaignCostStop'?'cost-stop':'technical-error':
 report.result==='defeat'?'native-defeat':
 report.result==='victory'?'native-victory':
 report.completedNights===days?'horizon-complete':'truncated';
const summary={stamp,classification,completedNights:report.completedNights??null,
 result:report.result??null,finalCash:report.rows?.at(-1)?.money??null,
 finalLiving:report.rows?.at(-1)?.living??null,
 totalGameTickMs:report.rows?.reduce((n,r)=>n+(r.wallTime?.gameTickMs??0),0)??null,
 technicalError:report.status==='error'?{name:report.name,message:report.message,day:report.day}:null};
writeFileSync(join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
if(classification==='technical-error')process.exitCode=2;
if(classification==='cost-stop')process.exitCode=3;
