import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

// Build an isolated candidate from a frozen source archive, never edit runtime.
const reference=resolve(process.argv[2]??''),candidate=resolve(process.argv[3]??'');
assert.ok(process.argv[2]&&process.argv[3],'Pass reference archive and NEW candidate roots');
assert.ok(!existsSync(candidate),'Candidate must not already exist');
const path='src/world/navigation.js',original=readFileSync(resolve(reference,path),'utf8');
const anchor="    for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]) {";
assert.equal(original.split(anchor).length,2);
const replacement=original.replace(anchor,`    // Keep all five samples and their order without six temporary arrays.
    for(let sample=0;sample<5;sample++) {
      const dx=sample===1?radius:sample===2?-radius:0,dz=sample===3?radius:sample===4?-radius:0;`);
mkdirSync(candidate,{recursive:true});
// This CPU fixture needs source and JSON, not hundreds of MB of GLB/audio/art.
for(const relative of ['src','tools','tests','content','public/content','package.json'])cpSync(resolve(reference,relative),resolve(candidate,relative),{recursive:true});
writeFileSync(resolve(candidate,path),replacement);
if(!process.argv.includes('--prepare-only')){
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
  if(i>=0)samples.push(row);process.stderr.write(`Terrain-offset pair ${i+3}/10: identical trajectory\n`);
 }
 const median=(kind,key)=>{const a=samples.map(s=>s[kind][key]).sort((a,b)=>a-b);return(a[3]+a[4])/2;};
 console.log(JSON.stringify({scope:'Isolated terrain sample-offset allocation removal. Paid integrated CPU fixture: 32 crops, eight workers and five animal species, two warmup/eight alternating pairs. Full serialized trajectory equality checked. No GPU/mobile/FPS claim.',medianMs:Object.fromEntries(['reference','candidate'].map(k=>[k,{total:median(k,'totalMs'),maxTick:median(k,'maxTickMs')}])),samples},null,2));
}
