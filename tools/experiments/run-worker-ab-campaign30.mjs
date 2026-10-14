// Isolated campaign validation. Checkpoints are QA artifacts, never reloads.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {serialize} from '../../src/persistence/snapshots.js';
import {evaluateOne} from '../evolutionary-balance/run-ga.mjs';
import {DEFAULT_GENES} from '../evolutionary-balance/policy-genes.mjs';

const strategy=process.argv[2]??'evolved';
if(!['evolved','good-current-magic'].includes(strategy))throw Error('Unsupported frozen policy');
const dir=resolve('docs/qa/evolutionary-balance/worker-ab-campaign30',strategy);
const checkpoints=join(dir,'checkpoints');mkdirSync(checkpoints,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const sourceHash=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const options={biome:'manglares',seed:123,days:30,strategy,
 genes:strategy==='evolved'?DEFAULT_GENES:null};
const stamp={sourceHash,baseLabCommit:'de719e0bdda877fe4ee183fb7107f69db4f7b585',
 runtimeCommit:'2486ba01076e8e221c3ec413167937a49b2fd401',
 runnerSha256:sha(readFileSync(fileURLToPath(import.meta.url))),options,
 checkpointKind:'State after first observed tick of each game day; no reloads',
 costStop:{maxDayGameTickMs:180000,maxElapsedWallMs:1800000}};
writeFileSync(join(dir,'stamp.json'),JSON.stringify(stamp,null,2)+'\n');
let checkpointDay=0,currentDay=0,currentDayTickMs=0;
const began=Date.now();
const report=await evaluateOne(options,options.days,strategy,options.genes,row=>{
 const sample={day:row.day,money:row.money,living:row.living,destroyed:row.destroyed,
  gameTickMs:row.wallTime?.gameTickMs,result:row.result};
 appendFileSync(join(dir,'progress.jsonl'),JSON.stringify(sample)+'\n');
 console.log(JSON.stringify(sample));
},false,(state,_nav,timing)=>{
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
writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
const classification=report.status==='error'?
 (report.name==='CampaignCostStop'?'cost-stop':'technical-error'):
 report.result==='defeat'?'native-defeat':
 report.result==='victory'?'native-victory':
 report.completedNights===options.days?'horizon-complete':'truncated';
const summary={stamp,classification,status:report.status,result:report.result??null,
 completedNights:report.completedNights??null,daysRecorded:report.rows?.length??0,
 finalCash:report.rows?.at(-1)?.money??null,finalLiving:report.rows?.at(-1)?.living??null,
 totalGameTickMs:report.rows?.reduce((n,r)=>n+(r.wallTime?.gameTickMs??0),0)??null,
 technicalError:report.status==='error'?{name:report.name,message:report.message,day:report.day}:null};
writeFileSync(join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
if(classification==='technical-error')process.exitCode=2;
if(classification==='cost-stop')process.exitCode=3;
