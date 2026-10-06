import assert from 'node:assert/strict';
import {cpSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
// Prepare a separate candidate from an immutable archive; never edit runtime.
const reference=resolve(process.argv[2]??''),candidate=resolve(process.argv[3]??'');
assert.ok(process.argv[2]&&process.argv[3],'Pass reference archive root and NEW candidate root');
assert.ok(!existsSync(candidate),'Candidate root must not already exist');
const path='src/world/navigation.js',original=readFileSync(resolve(reference,path),'utf8');
const old="  testWalkable(x,z,radius=.3,ignore=null,worker=false) {\n    if(!this.terrainValid(x,z,radius,worker))return false;\n    const point={x,z};";
const anchor="    return !this.propsAt(x,z,radius+4).some(p=>";
assert.equal(original.split(old).length,2);assert.equal(original.split(anchor).length,2);
const replacement=original.replace(old,"  testWalkable(x,z,radius=.3,ignore=null,worker=false) {\n    const point={x,z};").replace(anchor,"    // Solid footprints can reject a point before expensive terrain sampling.\n    if(!this.terrainValid(x,z,radius,worker))return false;\n"+anchor);
cpSync(reference,candidate,{recursive:true});writeFileSync(resolve(candidate,path),replacement);
if(!process.argv.includes('--prepare-only')){
 const run=root=>{const start=performance.now(),output=execFileSync(process.execPath,[resolve(root,'tools/check_integrated_load.mjs'),'--trace'],{encoding:'utf8',maxBuffer:2e6}),report=JSON.parse(output.slice(output.lastIndexOf('\n{')+1));return{totalMs:performance.now()-start,maxTickMs:report.maxTickMs,steps:report.steps,searches:report.searches,trajectorySha256:report.trajectorySha256};};
 const samples=[];
 for(let i=-2;i<8;i++){
  const row={};for(const kind of i%2?['candidate','reference']:['reference','candidate'])row[kind]=run(kind==='reference'?reference:candidate);
  for(const key of ['trajectorySha256','steps','searches'])assert.equal(row.reference[key],row.candidate[key],key);
  if(i>=0)samples.push(row);process.stderr.write(`Obstacle-first pair ${i+3}/10: identical trajectory\n`);
 }
 const median=(kind,key)=>{const a=samples.map(s=>s[kind][key]).sort((a,b)=>a-b);return(a[3]+a[4])/2;};
 console.log(JSON.stringify({scope:'Experimental collision-before-terrain order, outside runtime. Original integrated CPU fixture including QA credit, 32 paid crops/eight paid workers and five animals. Two warmup pairs/eight alternating pairs, complete-state trajectory hashes identical. No GPU/mobile/FPS claim.',medianMs:Object.fromEntries(['reference','candidate'].map(k=>[k,{total:median(k,'totalMs'),maxTick:median(k,'maxTickMs')}])),samples},null,2));
}
