// Replays one unchanged policy and preserves a native state for navigation profiling.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {serialize} from '../../src/persistence/snapshots.js';
import {evaluateOne} from './run-ga.mjs';
import {DEFAULT_GENES} from './policy-genes.mjs';

export async function captureCheckpoint({biome='sabana',seed=712,day=13,days=13,
 strategy='evolved',output='docs/qa/evolutionary-balance/profile-sabana-712'}={}){
 if(!Number.isSafeInteger(seed)||seed<0||!Number.isSafeInteger(day)||day<1||
  !Number.isSafeInteger(days)||days<day||days>100||
  !['evolved','good-current-magic'].includes(strategy))throw Error('Invalid checkpoint case');
 const dir=resolve(output);mkdirSync(dir,{recursive:true});
 const captured=new Set(),snapshots=[];
 const report=await evaluateOne({biome,seed},days,strategy,
  strategy==='evolved'?DEFAULT_GENES:null,null,false,(state,_nav,timing)=>{
   if(state.day!==day)return;
   const phase=state.raid?'raid':state.time<5?'dawn':null;
   if(!phase||captured.has(phase))return;
   const json=serialize(state),name=`${strategy}-${biome}-${seed}-day${day}-${phase}.json`;
   writeFileSync(join(dir,name),json);
   captured.add(phase);
   snapshots.push({name,day:state.day,time:state.time,raid:!!state.raid,
    triggeringTickMs:timing.gameTickMs,sha256:createHash('sha256').update(json).digest('hex')});
  });
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const moduleHashes=Object.fromEntries(['tools/evolutionary-balance/capture-checkpoint.mjs',
  'tools/evolutionary-balance/run-ga.mjs','tools/native-campaign-runner.mjs'].map(path=>
   [path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
 writeFileSync(join(dir,'capture-report.json'),JSON.stringify({source,moduleHashes,biome,seed,day,days,
  strategy,genes:strategy==='evolved'?DEFAULT_GENES:null,snapshots,
  status:report.status,completedNights:report.completedNights??null,result:report.result??null,
  lastRow:report.rows?.at(-1)??null},null,2)+'\n');
 return {snapshots,status:report.status,completedNights:report.completedNights};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const options=process.argv[2]?JSON.parse(readFileSync(resolve(process.argv[2]),'utf8')):{};
 captureCheckpoint(options).then(x=>console.log(JSON.stringify(x)),e=>{console.error(e);process.exitCode=1;});
}
