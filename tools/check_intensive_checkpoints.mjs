// Native paired strategy replay; checkpoints observe rather than act.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {createIntensiveHeartbeat} from './intensive-heartbeat.mjs';
import {createBlockedCheckpoint,createBlockedCheckpointWriter,readBlockedCheckpoint} from './intensive-blocked-checkpoint.mjs';
import {serialize} from '../src/persistence/snapshots.js';

const directory=resolve(process.argv[2]??'.cache/native-checkpoint-proof');mkdirSync(directory,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex'),runs=[];
for(const biome of ['sabana','gran-canon']){
 const reference=[];
 const original=simulateIntensiveFarm({days:1,seed:712,biome,culture:'mapungubwe',mixed:true,onTick:s=>reference.push(serialize(s))});
 assert.ok(auditIntensiveFarm(original));
 let clock=0,tick=0;const captures=[],heartbeat=createIntensiveHeartbeat({intervalMs:1,now:()=>clock});
 const write=createBlockedCheckpointWriter(directory,biome,{scope:'One-day native paired QA, not a 100-night campaign'});
 const checkpoint=createBlockedCheckpoint({minBlocked:1,intervalMs:1,now:()=>clock,capture:(payload,slot)=>{const receipt=write(payload,slot);captures.push(receipt);return receipt;}});
 const observed=simulateIntensiveFarm({days:1,seed:712,biome,culture:'mapungubwe',mixed:true,onTick:(s,nav)=>{
  clock++;const before=serialize(s),live=heartbeat(s);assert.ok(live);checkpoint(s,nav,live);
  assert.equal(serialize(s),before,'Observer mutated the input state');
  assert.equal(serialize(s),reference[tick],`Native state differs at ${biome} tick ${tick}`);tick++;
 }});
 assert.equal(tick,reference.length);assert.ok(auditIntensiveFarm(observed));assert.equal(serialize(observed.state),serialize(original.state));
 for(const receipt of new Set(captures))readBlockedCheckpoint(join(directory,receipt));
 runs.push({biome,ticks:tick,completedNights:observed.completedNights,result:observed.result,captures:captures.length,retained:[...new Set(captures)],
  trajectorySha256:sha(reference.join('\n')),finalStateSha256:sha(serialize(observed.state)),living:observed.state.plants.filter(p=>p.alive).length,delivered:observed.counts.CrateDelivered??0});
}
const report={scope:'Two ordinary one-day native intensive strategies, complete per-tick equality with and without checkpoint observer. QA capture threshold 1 and deterministic wall clock deliberately exercise capture when possible; production threshold remains 128 and 300000 ms. No gameplay overrides or timings. No large-backlog/100-night claim.',runs,
 sourceHashes:Object.fromEntries(['tools/check_intensive_checkpoints.mjs','tools/check_intensive_farm.mjs','tools/intensive-blocked-checkpoint.mjs','tools/intensive-heartbeat.mjs','src/simulation/game.js','src/world/navigation.js'].map(path=>[path,sha(readFileSync(path))]))};
writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
