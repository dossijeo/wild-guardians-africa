// Isolated QA runner: one frozen policy, one paired seed, unchanged game rules.
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateOne} from '../evolutionary-balance/run-ga.mjs';
import {DEFAULT_GENES} from '../evolutionary-balance/policy-genes.mjs';

const digest=content=>createHash('sha256').update(content).digest('hex');
const baselinePath=resolve('docs/qa/evolutionary-balance/management-search/paired-14-manglares-123/evolved-manglares-123-14.json');
const output=resolve('docs/qa/evolutionary-balance/worker-ab-candidate14');
mkdirSync(output,{recursive:true});
const baselineSource=readFileSync(baselinePath),baseline=JSON.parse(baselineSource);
const sourceHash=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const input={biome:'manglares',seed:123,days:14,strategy:'evolved',genes:DEFAULT_GENES};
const stamp={sourceHash,baseLabCommit:'de719e0bdda877fe4ee183fb7107f69db4f7b585',
 runtimeCommit:'2486ba01076e8e221c3ec413167937a49b2fd401',
 baselineSha256:digest(baselineSource),baselinePath,
 runnerSha256:digest(readFileSync(fileURLToPath(import.meta.url))),input};
writeFileSync(join(output,'stamp.json'),JSON.stringify(stamp,null,2)+'\n');
const progress=join(output,'progress.jsonl');
const candidate=await evaluateOne(input,input.days,input.strategy,input.genes,row=>{
 const day={day:row.day,gameTickMs:row.wallTime?.gameTickMs,money:row.money,
  living:row.living,destroyed:row.destroyed,result:row.result};
 appendFileSync(progress,JSON.stringify(day)+'\n');
 console.log(JSON.stringify(day));
},true);
writeFileSync(join(output,'candidate.json'),JSON.stringify(candidate,null,2)+'\n');
const stripTime=rows=>rows.map(({wallTime,...row})=>row);
const dailySame=JSON.stringify(stripTime(baseline.rows??[]))===JSON.stringify(stripTime(candidate.rows??[]));
const raidsSame=JSON.stringify(baseline.raid??[])===JSON.stringify(candidate.raid??[]);
const statusSame=baseline.status===candidate.status&&
 baseline.result===candidate.result&&baseline.completedNights===candidate.completedNights;
const byDay=(baseline.rows??[]).map((old,i)=>{
 const fresh=candidate.rows?.[i];
 return {day:old.day,baselineTickMs:old.wallTime?.gameTickMs??null,
  candidateTickMs:fresh?.wallTime?.gameTickMs??null,
  samePhysicalEconomic:fresh?JSON.stringify(stripTime([old]))===JSON.stringify(stripTime([fresh])):false};
});
const total=rows=>rows.reduce((n,row)=>n+(row.wallTime?.gameTickMs??0),0);
const summary={stamp,statusSame,dailySame,raidsSame,
 baseline:{status:baseline.status,result:baseline.result,completedNights:baseline.completedNights,
  tickMs:total(baseline.rows??[])},
 candidate:{status:candidate.status,result:candidate.result,completedNights:candidate.completedNights,
  tickMs:total(candidate.rows??[])},byDay};
writeFileSync(join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({statusSame,dailySame,raidsSame,baselineTickMs:summary.baseline.tickMs,
 candidateTickMs:summary.candidate.tickMs}));
if(candidate.status==='error')process.exitCode=2;
