import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {BrowserSaveRepository as After} from '../../../src/persistence/browser-saves.js';
import {deserialize} from '../../../src/persistence/snapshots.js';
const baseline='c18d119',source='src/persistence/browser-saves.js';
mkdirSync('.cache',{recursive:true});
writeFileSync('.cache/save-primary-before.mjs',execFileSync('git',['show',baseline+':'+source],{encoding:'utf8'}).replace("'./snapshots.js'","'../src/persistence/snapshots.js'"));
const {BrowserSaveRepository:Before}=await import('../../../.cache/save-primary-before.mjs');
function repository(Type){
  let record;
  const repo=new Type({getItem:()=>null,removeItem:()=>{}},{database:{}});
  repo.open=async()=>({transaction(){
    let written;
    const tx={objectStore:()=>({get(){const request={};queueMicrotask(()=>{request.result=record;request.onsuccess();record=written;tx.oncomplete();});return request;},put:value=>{written=value;}})};
    return tx;
  }});
  return {repo,row:()=>record};
}
const fixtures=['docs/qa/large-farm/reloaded-snapshot.json','docs/qa/intensive-mixed-100/state.json'],results=[];
for(const file of fixtures){
  const bytes=readFileSync(file),initial=deserialize(bytes.toString());
  const a=repository(Before),b=repository(After);let beforeParses=0,afterParses=0;
  for(let i=0;i<6;i++){
    initial.savedAt=i;const parse=JSON.parse;
    try{
      JSON.parse=function(...args){beforeParses++;return parse(...args);};await a.repo.save(initial);
      JSON.parse=function(...args){afterParses++;return parse(...args);};await b.repo.save(initial);
    }finally{JSON.parse=parse;}
    assert.deepEqual(a.row(),b.row());
  }
  const samples=[];
  for(let pass=0;pass<4;pass++)for(const name of pass%2?['after','before']:['before','after']){
    const {repo}=repository(name==='before'?Before:After);
    for(let i=0;i<3;i++){initial.savedAt=i;await repo.save(initial);}
    const start=performance.now();
    for(let i=0;i<10;i++){initial.savedAt=i+3;await repo.save(initial);}
    samples.push({name,totalMs:performance.now()-start,saves:10});
  }
  results.push({file,fixtureSha256:createHash('sha256').update(bytes).digest('hex'),fixtureBytes:bytes.length,day:initial.day,plants:initial.plants.length,crates:initial.crates.length,beforeParseCalls:beforeParses,afterParseCalls:afterParses,identicalPrimaryAndBackup:true,retainedStringCodeUnits:b.repo.lastCommitted.text.length,retainedStringUpperBoundBytes:2*b.repo.lastCommitted.text.length,samples});
}
const report={baseline,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),scope:'Actual repository save and snapshot validation with in-memory transaction double; excludes native IndexedDB I/O, browser/GPU/FPS and mobile. Archived snapshots, not current 100-night acceptance. Three campaign processes running in background. Upper bound assumes two-byte string storage, not measured heap.',results};
writeFileSync('docs/qa/save-primary-cache/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
