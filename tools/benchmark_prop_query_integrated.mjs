import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
const reference=process.argv[2];assert.ok(reference,'Pass an explicit frozen reference root');
const run=kind=>{
 const file=kind==='reference'?resolve(reference,'tools/check_integrated_load.mjs'):resolve('tools/check_integrated_load.mjs'),start=performance.now();
 const output=execFileSync(process.execPath,[file,'--trace'],{encoding:'utf8',maxBuffer:2e6});
 const report=JSON.parse(output.slice(output.lastIndexOf('\n{')+1));
 return {totalMs:performance.now()-start,maxTickMs:report.maxTickMs,steps:report.steps,searches:report.searches,trajectorySha256:report.trajectorySha256};
};
const samples=[];
for(let i=-2;i<8;i++){
 const result={};for(const kind of i%2?['candidate','reference']:['reference','candidate'])result[kind]=run(kind);
 assert.equal(result.reference.trajectorySha256,result.candidate.trajectorySha256);assert.equal(result.reference.steps,result.candidate.steps);assert.equal(result.reference.searches,result.candidate.searches);
 if(i>=0)samples.push(result);
 process.stderr.write(`Integrated pair ${i+3}/10 complete; trajectories identical\n`);
}
const median=(kind,key)=>{const a=samples.map(s=>s[kind][key]).sort((a,b)=>a-b);return (a[3]+a[4])/2;};
console.log(JSON.stringify({scope:'Native CPU simulation stress, 32 paid crops and eight paid workers using explicit QA credit, followed by five animals. No renderer, audio, mobile or FPS claim.',referenceRoot:reference,warmupPairs:2,samplePairs:8,medianMs:{reference:{total:median('reference','totalMs'),maxTick:median('reference','maxTickMs')},candidate:{total:median('candidate','totalMs'),maxTick:median('candidate','maxTickMs')}},samples},null,2));
