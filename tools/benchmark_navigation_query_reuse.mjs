import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../src/world/navigation.js';
import {withNavigationQueries} from '../src/world/navigation-query-scope.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
assert.ok(process.argv[2],'Pass an explicit frozen reference root');
const {Navigation:ReferenceNavigation}=await import(pathToFileURL(resolve(process.argv[2],'src/world/navigation.js')));
const {s,nav:initial}=createOpeningWorld();
const inputs=JSON.parse(readFileSync(new URL('../docs/qa/crop-task-queue/native-comparison.json',import.meta.url))).rows[0].slowSearches;
const make=Class=>{const nav=new Class(s.seed,s.biome,initial.profile);nav.setState(deserialize(serialize(s)));return nav;};
const worlds={reference:make(ReferenceNavigation),reused:make(Navigation)},timings={reference:[],reused:[]},counts={reference:0,reused:0};
for(const mode of Object.keys(worlds)){const nav=worlds[mode],find=nav.findPath;nav.findPath=function(...args){counts[mode]++;return find.apply(this,args);};}
for(let trial=0;trial<13;trial++){
 const results={};
 for(const mode of trial%2?['reused','reference']:['reference','reused']){
  const nav=worlds[mode],start=performance.now();
  results[mode]=withNavigationQueries(nav,()=>{const paths=[];for(let repeat=0;repeat<2;repeat++)for(const q of inputs)paths.push(nav.path(q.from,q.to,q.radius,null,q.worker,q.margin));return paths;});
  if(trial>=3)timings[mode].push(performance.now()-start);
 }
 assert.deepEqual(results.reused,results.reference);
}
const summarize=values=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,minMs:a[0],medianMs:(a[4]+a[5])/2,maxMs:a.at(-1)};};
console.log(JSON.stringify({node:process.version,scope:'Isolated repeated exact native-terrain route queries from the integrated stress trace, twice per scope. Ten timed samples after three warmups, alternating order, setup excluded, complete returned paths compared. This repetition pattern is a diagnostic, not a frame/GPU/mobile benchmark.',inputs:inputs.length,searches:counts,timing:{reference:summarize(timings.reference),reused:summarize(timings.reused)}},null,2));
