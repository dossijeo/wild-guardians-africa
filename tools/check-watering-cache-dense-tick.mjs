import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {uncachedWateringControl} from './watering-cache-control-game.mjs';
const [out,stepsText='10',countsText='50,200,500',...extra]=process.argv.slice(2),steps=Number(stepsText),counts=countsText.split(',').map(Number);
assert(out&&!extra.length&&!existsSync(out));assert(Number.isSafeInteger(steps)&&steps>=5&&steps<=3000);
assert(counts.length&&counts.length<=3&&new Set(counts).size===counts.length&&counts.every(n=>[50,200,500].includes(n)));
const {engine:Control,source}=await uncachedWateringControl(),hash=b=>createHash('sha256').update(b).digest('hex'),rows=[];
for(const count of counts){
 const fixturePath=`docs/qa/integrated-spiritual-survival/native-power-50-200-500-v2/fixture-${count}.json`,bytes=readFileSync(fixturePath),initial=bytes.toString();
 const state=deserialize(initial),profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
 assert.equal(state.plants.filter(p=>p.alive).length,count);const arms=[];
 for(const [variant,engine] of [['A',Control],['B',Game],['B',Game],['A',Control]]){
  const s=deserialize(initial),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const initialElapsed=s.elapsed,initialLedger=hash(JSON.stringify(s.ledger)),snapshots=[],calls={walkable:0,segmentClear:0,path:0};
  for(const name of Object.keys(calls)){const fn=nav[name];nav[name]=function(...args){calls[name]++;return fn.apply(this,args);};}
  let tickMilliseconds=0;const totalAt=performance.now();
  for(let i=0;i<steps;i++){
   const at=performance.now();engine.tick(s,.1,nav);tickMilliseconds+=performance.now()-at;snapshots.push(hash(serialize(s)));
   if((i+1)%100===0)console.log(JSON.stringify({phase:'progress',count,variant,steps:i+1,nativeTime:s.time,workerStates:s.workers.reduce((o,w)=>(o[w.status]=(o[w.status]??0)+1,o),{})}));
  }
  arms.push({variant,tickMilliseconds,totalMilliseconds:performance.now()-totalAt,snapshots,calls,workers:s.workers.length,elapsedAdvance:s.elapsed-initialElapsed,ledgerUnchanged:hash(JSON.stringify(s.ledger))===initialLedger,events:s.events.length,finalSha256:hash(serialize(s))});
 }
 for(const arm of arms.slice(1))assert.deepEqual(arm.snapshots,arms[0].snapshots,`Full native ${count}-plant tick state diverged`);
 rows.push({count,fixturePath,fixtureSha256:hash(bytes),steps,dt:.1,allTickStatesIdentical:true,arms});
 console.log(JSON.stringify({count,steps,allTickStatesIdentical:true,timing:arms.map(a=>({variant:a.variant,tickMilliseconds:a.tickMilliseconds,calls:a.calls}))}));
}
const sourceFiles=['src/world/work-points.js','src/world/watering-route-cache.js','tests/fixtures/watering-route-v1-reference.mjs','tools/watering-cache-control-game.mjs','tools/check-watering-cache-dense-tick.mjs'];
const report={observedAt:new Date().toISOString(),gameSourceSha256:hash(source),sourceSha256:Object.fromEntries(sourceFiles.map(p=>[p,hash(readFileSync(p))])),scope:'AB/BA short native replays of existing pre-funded 50/200/500-plant Sabana fixtures. No new fixture funding, prices, magic policy, player actions, geometry or production mutations. Not a survival campaign, whole-day throughput or GPU benchmark.',rows};
writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
