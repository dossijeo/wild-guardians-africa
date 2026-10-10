import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions} from '../src/simulation/rules.js';
import {createRaidCompositionIndex} from '../src/simulation/raid-composition-index.js';
if(!global.gc)throw Error('Run with node --expose-gc');
const out=process.argv[2];if(!out)throw Error('Explicit output JSON path required');
const unlocked=B.animals.map(a=>a.id),samples=[];
const measure=(budget,variant,record=true)=>{
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 const pool=variant==='enumerated'?compositions(budget,unlocked):createRaidCompositionIndex(budget,unlocked);
 const count=variant==='enumerated'?pool.length:pool.count;
 const selected=variant==='enumerated'?pool[Math.floor(count/2)]:pool.at(Math.floor(count/2));
 const milliseconds=performance.now()-start,allocatedHeapBytes=process.memoryUsage().heapUsed-before;
 if(record)samples.push({budget,variant,milliseconds,allocatedHeapBytes,count,selected});
};
for(const budget of [14,72]){
 measure(budget,'enumerated',false);measure(budget,'indexed',false);
 for(let pair=0;pair<8;pair++)for(const variant of pair%2?['indexed','enumerated']:['enumerated','indexed'])measure(budget,variant);
}
const median=a=>{a=[...a].sort((x,y)=>x-y);return (a[3]+a[4])/2;};
const summary=[14,72].flatMap(budget=>['enumerated','indexed'].map(variant=>{
 const s=samples.filter(r=>r.budget===budget&&r.variant===variant);
 return {budget,variant,medianMilliseconds:median(s.map(r=>r.milliseconds)),medianAllocatedHeapBytes:median(s.map(r=>r.allocatedHeapBytes)),compositions:s[0].count};
}));
for(const budget of [14,72]){
 const s=samples.filter(r=>r.budget===budget);
 if(s.some(r=>r.count!==s[0].count||JSON.stringify(r.selected)!==JSON.stringify(s[0].selected)))throw Error('Selection mismatch');
}
const sourceHashes=Object.fromEntries(['src/simulation/raid-composition-index.js','src/simulation/rules.js','src/simulation/balance.js','tools/benchmark-raid-composition-index.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
const report={scope:'Isolated Node CPU/heap allocation diagnostic, AB/BA8 pairs, GC before each sample. Heap delta includes temporary allocations; not peak app RAM/VRAM, GPU or browser frame benchmark. No raid pressure changes.',node:process.version,sourceHashes,summary,samples};
mkdirSync(new URL('../'+out,import.meta.url),{recursive:true});
writeFileSync(new URL('../'+out+'/benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summary));
