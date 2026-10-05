import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import assert from 'node:assert/strict';

const [biome='desierto',culture='mapungubwe',output]=process.argv.slice(2);
assert.ok(output,'Usage: node tools/capture_populated_raid.mjs BIOME CULTURE OUTPUT.json');
const provenance=intensiveRunProvenance(process.argv.slice(2));let captured;
const report=simulateIntensiveFarm({days:1,seed:712,biome,culture,onTick:(state,nav)=>{
 if(nav.preparedRaidEntry)return;
 // Observes the real spawn trigger before its RNG draw. Returning undefined
 // retains ordinary synchronous entry selection and all domain decisions.
 nav.preparedRaidEntry=(s,group,bounds)=>{
  if(!captured)captured={biome,culture,group:[...group],plan:structuredClone(s.nightPlan),provenance,
   timing:{navigationContext:{state:serialize(s),activeBounds:[...bounds],raidView:structuredClone(nav.raidView),warmedChunks:[...nav.chunks.keys()]}},
   living:s.plants.filter(p=>p.alive).length,workers:s.workers.length,
   scope:'Naturally reached first raid in paid intensive first-day play. Snapshot taken before the native spawn draw. No forced group, time jump, RNG override, credit or path double.'};
 };
}});
auditIntensiveFarm(report);assert.ok(captured);assert.equal(report.completedNights,1);assert.equal(report.result,null);
assert.ok(captured.living>1&&captured.workers>0,'Fixture must contain a populated working farm');
const {state,nav,...dayReport}=report;captured.completedDay=dayReport;
mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(captured,null,2)+'\n');
console.log(JSON.stringify({output:resolve(output),biome,culture,living:captured.living,workers:captured.workers,group:captured.group,completedNights:report.completedNights,money:report.money,events:report.counts}));
