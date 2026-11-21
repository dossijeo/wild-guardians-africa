import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=(run,file)=>JSON.parse(readFileSync(new URL(`${run}/${file}.json`,import.meta.url)));
const runs=Object.fromEntries(['a1','b1','b2','a2'].map(run=>[run,read(run,'rows')]));
const sources=Object.fromEntries(Object.keys(runs).map(run=>[run,read(run,'source')]));
assert.deepEqual(sources.a1,sources.a2);assert.deepEqual(sources.b1,sources.b2);
for(const path of Object.keys(sources.a1.sourceHashes))if(!['src/simulation/raids.js','src/simulation/raid-contention.js','src/simulation/defensive-groups.js','src/world/navigation.js'].includes(path))assert.equal(sources.a1.sourceHashes[path],sources.b1.sourceHashes[path]);
const mean=(rows,key)=>rows.reduce((n,r)=>n+r.cpu[key],0)/rows.length;
const comparisons=runs.a1.map((row,i)=>{
 const before=[runs.a1[i],runs.a2[i]],after=[runs.b1[i],runs.b2[i]];
 for(const item of [...before,...after]){assert.equal(item.layout,row.layout);assert.equal(item.count,row.count);assert.equal(item.budget,row.budget);assert.equal(item.rngAtSpawn,row.rngAtSpawn);assert.equal(item.overlapPairs,0);assert(item.ended);}
 for(const pair of [before,after]){const plain=r=>Object.fromEntries(Object.entries(r).filter(([key])=>key!=='cpu'));assert.deepEqual(plain(pair[0]),plain(pair[1]));}
 return {layout:row.layout,count:row.count,budget:row.budget,before:before[0],after:after[0],cpuMean:Object.fromEntries(['totalMs','p95Ms','p99Ms','maxMs'].map(key=>[key,{before:mean(before,key),after:mean(after,key)}]))};
});
writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(comparisons,null,2)+'\n');
for(const c of comparisons)console.log(JSON.stringify({case:`${c.layout}/${c.count}`,hits:[c.before.spent,c.after.spent],destroyed:[c.before.destroyed,c.after.destroyed],targets:[c.before.simultaneousTargets,c.after.simultaneousTargets],seconds:[c.before.elapsed,c.after.elapsed],cpu:c.cpuMean}));
