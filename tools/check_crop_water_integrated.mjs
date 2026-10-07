import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {BIOMES} from '../src/simulation/game.js';

assert.ok(process.argv[2],'Pass frozen reference root');
assert.ok(process.argv[3],'Pass output JSON');
const reference=await import(pathToFileURL(resolve(process.argv[2],'tools/check_intensive_farm.mjs')));
const report={scope:'Six native biomes, responsible mixed-crop first day through ordinary commands, paid labour and physical deliveries. Exact final snapshots and sampled full-state traces against frozen reference. No 100-night, visual, GPU or performance claim.',referenceRoot:resolve(process.argv[2]),cases:[]};
const hashFile=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
report.sources={referenceCrops:hashFile(resolve(process.argv[2],'src/simulation/crops.js')),candidateCrops:hashFile(new URL('../src/simulation/crops.js',import.meta.url)),referenceGame:hashFile(resolve(process.argv[2],'src/simulation/game.js')),candidateGame:hashFile(new URL('../src/simulation/game.js',import.meta.url))};
assert.equal(report.sources.referenceGame,report.sources.candidateGame,'game loop must remain identical in this targeted comparison');
for(const biome of BIOMES){
 const options={days:1,seed:712,slotId:'water-scan-'+biome,biome,culture:'mapungubwe',profile:'olderFemale',mixed:true,middayHiring:true};
 const runs={};
 for(const name of ['reference','candidate']){
  const digest=createHash('sha256');let ticks=0,checkpoints=0;
  const module=name==='reference'?reference:{simulateIntensiveFarm,auditIntensiveFarm};
  const result=module.simulateIntensiveFarm({...options,onTick:state=>{if(ticks++%50===0){digest.update(serialize(state));checkpoints++;}}});
  module.auditIntensiveFarm(result);
  runs[name]={result,ticks,checkpoints,traceSha256:digest.digest('hex'),state:serialize(result.state)};
 }
 const a=runs.reference,b=runs.candidate;
 assert.equal(b.state,a.state,biome+' final state');assert.equal(b.traceSha256,a.traceSha256,biome+' sampled trace');
 assert.equal(b.ticks,a.ticks);assert.equal(b.checkpoints,a.checkpoints);
 assert.deepEqual(b.result.daily,a.result.daily);assert.deepEqual(b.result.counts,a.result.counts);
 assert.equal(b.result.completedNights,1);assert.notEqual(b.result.result,'defeat');
 const row={biome,ticks:b.ticks,checkpoints:b.checkpoints,traceSha256:b.traceSha256,finalSha256:createHash('sha256').update(b.state).digest('hex'),completedNights:b.result.completedNights,money:b.result.money,counts:b.result.counts,daily:b.result.daily};
 report.cases.push(row);writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({biome,ticks:row.ticks,checkpoints:row.checkpoints,completedNights:row.completedNights,money:row.money}));
}
