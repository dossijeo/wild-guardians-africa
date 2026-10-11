// Preserve the exact legacy CI policy, including negative native outcomes.
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {simulateActiveFarm} from './check_active_farm.mjs';
import {nativeCampaignProvenance} from './run_native_campaign.mjs';
import {serialize} from '../src/persistence/snapshots.js';

export function activeFarmDiagnosticOptions(kind){
 if(!['sunflower','mixed'].includes(kind))throw Error('Use sunflower or mixed');
 return {days:100,startDay:5,profile:'olderFemale',repairBelowHp:540,plotCount:16,species:'girasol',diversifyDay:kind==='mixed'?20:null,seed:712,biome:'sabana',culture:'mapungubwe'};
}
export function runActiveFarmDiagnostic(kind,directory,{simulate=simulateActiveFarm}={}){
 const options=activeFarmDiagnosticOptions(kind),out=resolve(directory);
 if(existsSync(out))throw Error('Fresh diagnostic output directory required');
 const raw=nativeCampaignProvenance({profile:options.profile,labourPolicy:'legacy'});
 if(raw.trackedChanges.length)throw Error('Freeze tracked sources before diagnosing');
 const sourceHashes={...raw.sourceHashes};
 for(const path of ['tools/check_active_farm.mjs','tools/run-active-farm-diagnostic.mjs'])sourceHashes[path]=createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');
 mkdirSync(out,{recursive:true});
 const save=(name,value)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 save('source.json',{gitHead:raw.gitHead,options,sourceHashes,scope:'Overinclusive dependency inventory; exact legacy active-farm policy, not frozen good/normal/bad or the native campaign protocol.'});
 const started=performance.now();let daysObserved=0;
 writeFileSync(resolve(out,'running.json'),JSON.stringify({pid:process.pid,kind,options,startedAt:new Date().toISOString()})+'\n',{flag:'wx'});
 try{
  const report=simulate({...options,onDay:row=>{daysObserved++;appendFileSync(resolve(out,'days.jsonl'),JSON.stringify(row)+'\n');},onProgress:row=>writeFileSync(resolve(out,'progress.json'),JSON.stringify({observedAt:new Date().toISOString(),pid:process.pid,...row})+'\n')});
  for(const [path,hash] of Object.entries(sourceHashes))if(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')!==hash)throw Error('Source changed during diagnostic: '+path);
  const {state,nav,...summary}=report;
  writeFileSync(resolve(out,'state.json.gz'),gzipSync(serialize(state)),{flag:'wx'});save('report.json',summary);
  const receipt={status:report.result==='defeat'?'observed-native-defeat':report.result==='victory'?'observed-native-victory':'observed-horizon',nativeResult:report.result,completedNights:report.completedNights,daysObserved,milliseconds:performance.now()-started,sourceUnchanged:true,scope:'Observed legacy fixture; not responsible-policy survival or population acceptance.'};
  save('receipt.json',receipt);return receipt;
 }catch(error){
  save('receipt.json',{status:'incomplete-diagnostic-error',message:error.message,stack:error.stack,daysObserved,milliseconds:performance.now()-started,scope:'Technical error or source drift; no native defeat inferred. Any prior progress journal is retained.'});throw error;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [kind,out,...extra]=process.argv.slice(2);if(!out||extra.length)throw Error('Use sunflower|mixed NEW_OUTPUT_DIRECTORY');console.log(JSON.stringify(runActiveFarmDiagnostic(kind,out)));}
 catch(error){console.error(error.stack);process.exitCode=1;}
}
