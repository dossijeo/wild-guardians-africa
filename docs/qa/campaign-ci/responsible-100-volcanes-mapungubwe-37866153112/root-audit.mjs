import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {deserialize} from '../src/persistence/snapshots.js';
import {auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from '../tools/summarize_intensive_farm.mjs';
const dir='.cache/campaign-qa-37866153112/volcanes/';
const read=name=>JSON.parse(readFileSync(dir+name,'utf8'));
const report=read('volcanes-mapungubwe-report.json'), summary=read('volcanes-mapungubwe-summary.json'), status=read('volcanes-mapungubwe-status.json'), job=read('job.json');
assert.equal(report.provenance.gitHead,job.sha);assert.equal(status.status,'passed');assert.equal(status.result,'victory');
assert.deepEqual(report.provenance.trackedChanges,[]);
const matched=[],mismatches=[];
for(const [file,hash] of Object.entries(report.provenance.sourceHashes)){
 const current=createHash('sha256').update(readFileSync(file)).digest('hex');
 (current===hash?matched:mismatches).push(file);
}
assert.deepEqual(mismatches,['src/rendering/scene.js','src/simulation/actor-motion.js']);
const raw=readFileSync(dir+'volcanes-mapungubwe-state.json');const state=deserialize(raw.toString('utf8'));
auditIntensiveFarm({...report,state},{victory:true});
const computed=summarizeIntensiveFarm({...report,state});
for(const field of ['cashflow','activity','speciesObserved','bySpecies'])if(field in summary)assert.deepEqual(computed[field],summary[field]);
assert.equal(report.daily.length,100);assert.ok(report.daily.every(d=>d.staff>0&&d.delivered>0));
assert.equal(report.counts.RaidSpawned,report.counts.RaidEnded);assert.equal(report.counts.CampaignWon,1);assert.equal(report.counts.GameOver??0,0);assert.equal(state.raid,null);
assert.equal(summary.activity.acceptance.status,'accepted');assert.ok(summary.activity.unoccupiedFraction<.25);
const out={status:'passed',recordedHead:job.sha,sourceFilesMatched:matched.length,sourceMismatches:mismatches,meaning:'Frozen campaign predates the render-scene depth/isolation changes and Desert opposing-traffic fix. This audits its archived native state, without replaying it on current main.',result:state.result,completedNights:state.completedNights,day:state.day,money:summary.money,maximumLiving:summary.maximumLiving,speciesObserved:summary.speciesObserved,delivered:report.counts.CrateDelivered,raidsEnded:report.counts.RaidEnded,unoccupiedFraction:summary.activity.unoccupiedFraction,activityAcceptance:summary.activity.acceptance,cashflow:computed.cashflow,snapshotSha256:createHash('sha256').update(raw).digest('hex'),auditScope:'Downloaded complete original snapshot; native persistence roundtrip, physical picked/crate/delivered state, integer ledger, species seed debits, all daily staffing/deliveries, actual victory after 100 completed nights and no active raid. One biome/culture/seed/policy only; no rendering or physical mobile acceptance.'};
writeFileSync(dir+'root-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
