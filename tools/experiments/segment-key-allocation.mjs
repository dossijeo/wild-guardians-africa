import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

// Isolated candidate; production changes require equality and measurements.
const reference=resolve(process.argv[2]??''),candidate=resolve(process.argv[3]??'');
assert.ok(process.argv[2]&&process.argv[3],'Pass reference and NEW candidate roots');
assert.ok(!existsSync(candidate),'Candidate must not already exist');
const path='src/world/navigation.js',original=readFileSync(resolve(reference,path),'utf8');
const anchor=`    const grid=[start.x,start.z,end.x,end.z].every(Number.isInteger);
    const from=\`\${start.x},\${start.z}\`,to=\`\${end.x},\${end.z}\`;
    const key=grid?\`\${from}|\${to}:\${radius}:\${ignore}:\${worker}\`:null;`;
assert.equal(original.split(anchor).length,2);
const replacement=original.replace(anchor,`    const grid=Number.isInteger(start.x)&&Number.isInteger(start.z)&&Number.isInteger(end.x)&&Number.isInteger(end.z);
    const key=grid?\`\${start.x},\${start.z}|\${end.x},\${end.z}:\${radius}:\${ignore}:\${worker}\`:null;`);
mkdirSync(candidate,{recursive:true});
for(const relative of ['src','tools','tests','content','public/content','package.json'])cpSync(resolve(reference,relative),resolve(candidate,relative),{recursive:true});
writeFileSync(resolve(candidate,path),replacement);
const run=root=>{
 const start=performance.now();
 const output=execFileSync(process.execPath,[resolve(root,'tools/check_integrated_load.mjs'),'--trace'],{encoding:'utf8',maxBuffer:2e6});
 const report=JSON.parse(output.slice(output.lastIndexOf('\n{')+1));
 return {totalMs:performance.now()-start,maxTickMs:report.maxTickMs,steps:report.steps,searches:report.searches,trajectorySha256:report.trajectorySha256};
};
const samples=[];
for(let i=-2;i<8;i++){
 const row={};for(const kind of i%2?['candidate','reference']:['reference','candidate'])row[kind]=run(kind==='reference'?reference:candidate);
 for(const key of ['trajectorySha256','steps','searches'])assert.equal(row.reference[key],row.candidate[key],key);
 if(i>=0)samples.push(row);process.stderr.write(`Segment-key pair ${i+3}/10: identical trajectory\n`);
}
const median=(kind,key)=>{const a=samples.map(s=>s[kind][key]).sort((a,b)=>a-b);return(a[3]+a[4])/2;};
console.log(JSON.stringify({scope:'Avoid temporary arrays and unused non-grid strings in directed segment queries. Paid integrated CPU fixture; two warmup/eight alternating pairs; complete serialized tick trajectory equality. No GPU/mobile/FPS claim.',medianMs:Object.fromEntries(['reference','candidate'].map(k=>[k,{total:median(k,'totalMs'),maxTick:median(k,'maxTickMs')}])),samples},null,2));
