import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {workerEntityLookup} from '../src/simulation/worker-entity-lookup.js';
assert.ok(process.argv[2],'Pass output JSON');
const scenarios=[];const median=values=>{const s=[...values].sort((a,b)=>a-b);return (s[4]+s[5])/2;};
for(const [history,workers,repeats] of [[32,8,100],[14558,114,10]]){
 const groups=[Array.from({length:history},(_,i)=>({id:'plant-'+i,alive:i>=history-200})),Array.from({length:history},(_,i)=>({id:'crate-'+i,delivered:i<history-200})),Array.from({length:Math.min(history,1200)},(_,i)=>({id:'task-'+i,workerId:null}))];
 const inputs=groups.map((group,k)=>Array.from({length:workers},(_,i)=>k===2&&i%5===0?null:group[Math.max(0,group.length-1-i%group.length)].id));
 const sampleRows=[];let expected;
 for(let trial=0;trial<20;trial++){
  const pair={};for(const mode of trial%2?['indexed','reference']:['reference','indexed']){
   const start=performance.now();let result;
   for(let repeat=0;repeat<repeats;repeat++){
    const lookups=groups.map(group=>mode==='indexed'?workerEntityLookup(()=>group):id=>group.find(e=>e.id===id));
    result=inputs.map((ids,k)=>ids.map(id=>lookups[k](id)));
   }
   const ms=(performance.now()-start)/repeats;expected??=result;assert.deepEqual(result,expected);pair[mode]=ms;
  }if(trial>=10)sampleRows.push(pair);
 }
 scenarios.push({historyPerCropCrateCollection:history,workers,scopeRepeatsPerSample:repeats,samples:sampleRows,medianMs:{reference:median(sampleRows.map(r=>r.reference)),indexed:median(sampleRows.map(r=>r.indexed))},indexedWins:sampleRows.filter(r=>r.indexed<r.reference).length});
}
const report={node:process.version,scope:'Synthetic read-only lookup passes: crop, crate and task IDs near the end of historical arrays, plus unassigned task IDs. Ten warmup pairs and ten measured pairs, alternating order. Collections and inputs prepared outside timing; per-update lookup creation/indexing included. Results deep-equal. No terrain, gameplay tick, FPS, GPU, RAM, mobile or campaign claim.',scenarios};writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
