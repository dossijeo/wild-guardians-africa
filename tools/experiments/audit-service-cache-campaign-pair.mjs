// Compare two native campaign artifacts without treating a running prefix as a result.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const [reference,candidate,output,referenceTiming]=process.argv.slice(2);
if(!reference||!candidate||!output||existsSync(output))throw Error('Pass reference run, candidate run and fresh report path');
const read=(dir,name)=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const lines=(dir,name)=>{
 const path=join(dir,name);if(!existsSync(path))return [];
 const text=readFileSync(path,'utf8');
 return text.split(/\r?\n/).filter(Boolean).flatMap((line,i)=>{try{return [JSON.parse(line)];}catch(error){if(i===text.split(/\r?\n/).length-1)return [];throw error;}});
};
const refSource=read(reference,'source.json'),candidateSource=read(candidate,'source.json');
const refOptions={...refSource.arguments},candidateOptions={...candidateSource.arguments};
for(const options of [refOptions,candidateOptions])for(const key of ['out','days','timingDay'])delete options[key];
const policyMatches=JSON.stringify(refOptions)===JSON.stringify(candidateOptions);
const allHashes=new Set([...Object.keys(refSource.sourceHashes),...Object.keys(candidateSource.sourceHashes)]);
const changedSourceHashes=[...allHashes].filter(p=>refSource.sourceHashes[p]!==candidateSource.sourceHashes[p]);
const refReceipt=read(reference,'receipt.json'),candidateReceipt=read(candidate,'receipt.json');
const refDays=lines(reference,'days.jsonl'),candidateDays=lines(candidate,'days.jsonl'),length=Math.min(refDays.length,candidateDays.length);
const firstDifferentDay=Array.from({length},(_,i)=>i).find(i=>JSON.stringify(refDays[i])!==JSON.stringify(candidateDays[i]));
const timings=referenceTiming&&existsSync(referenceTiming)?lines(dirname(referenceTiming),referenceTiming.split(/[\\/]/).at(-1)):[];
const candidateTimings=lines(candidate,'timings.jsonl');
const summarize=rows=>{
 const ms=rows.map(x=>x.decisionMilliseconds).filter(Number.isFinite).sort((a,b)=>a-b);
 if(!ms.length)return null;
 return {rows:ms.length,meanMs:ms.reduce((a,b)=>a+b,0)/ms.length,p50Ms:ms[Math.floor(ms.length*.5)],p95Ms:ms[Math.min(ms.length-1,Math.floor(ms.length*.95))],maxMs:ms.at(-1)};
};
const report={status:refReceipt.status==='running'||candidateReceipt.status==='running'?'prefix-only':'terminal-comparison',reference:{sourceHead:refSource.gitHead,receipt:refReceipt.status,days:refDays.length},candidate:{sourceHead:candidateSource.gitHead,receipt:candidateReceipt.status,days:candidateDays.length},
 policyMatches,changedSourceHashes,commonDays:length,identicalCommonDays:firstDifferentDay===undefined,firstDifferentDay:firstDifferentDay===undefined?null:firstDifferentDay+1,
 timing:{reference:summarize(timings),candidate:summarize(candidateTimings)},
 inputHashes:{referenceDays:createHash('sha256').update(existsSync(join(reference,'days.jsonl'))?readFileSync(join(reference,'days.jsonl')):'').digest('hex'),candidateDays:createHash('sha256').update(existsSync(join(candidate,'days.jsonl'))?readFileSync(join(candidate,'days.jsonl')):'').digest('hex')},
 scope:'Identical completed daily rows prove only the observed shared prefix. A running receipt is not victory, defeat or campaign acceptance. Timing files may cover different intervals and concurrent host load.'};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,commonDays:length,identicalCommonDays:report.identicalCommonDays,changedSourceHashes,reference:report.reference,candidate:report.candidate,timing:report.timing}));
if(!policyMatches||changedSourceHashes.some(p=>p!=='tools/native-service-component-proof.mjs')||firstDifferentDay!==undefined)process.exitCode=1;
