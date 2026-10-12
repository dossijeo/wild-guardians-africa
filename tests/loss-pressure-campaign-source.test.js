import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {lossPressureSourceInventories,verifyLossPressureSources} from '../tools/reviewed-loss-pressure-sources.mjs';
import {lossPressureCampaignOptions,lossPressureCampaignProvenance} from '../tools/run-reviewed-loss-pressure-campaign.mjs';
import {reviewedRecoveryOptions} from '../tools/run-reviewed-recovery-comparison.mjs';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const input={seed:123,biome:'sabana',culture:'mapungubwe',out:'.cache/not-launched-v5-test'};
test('materialized candidate matches all 466 reviewed inputs',()=>{
 const {candidate}=lossPressureSourceInventories();
 const actual=Object.fromEntries(Object.keys(candidate).map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 assert.equal(verifyLossPressureSources(actual).militaryCandidate,5);
});
test('control shares retreat repairs and differs only in the two pressure recipe files',()=>{
 const {candidate,control}=lossPressureSourceInventories();
 assert.equal(verifyLossPressureSources(control).militaryCandidate,4);
 assert.deepEqual(Object.keys(candidate).filter(p=>candidate[p]!==control[p]).sort(),['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js']);
});
test('source drift, mixed recipes and missing/extra dependencies are rejected',()=>{
 const {candidate,control}=lossPressureSourceInventories();
 for(const edit of [x=>x['src/simulation/game.js']='0'.repeat(64),x=>x['src/simulation/animal-exit-connectors.js']='0'.repeat(64),x=>x['src/simulation/raid-pressure-budget.js']=control['src/simulation/raid-pressure-budget.js'],x=>delete x['src/world/navigation.js'],x=>x['extra.js']='0'.repeat(64)]){
  const copy={...candidate};edit(copy);assert.throws(()=>verifyLossPressureSources(copy));
 }
 candidate['src/simulation/game.js']='0'.repeat(64);assert.equal(verifyLossPressureSources(lossPressureSourceInventories().candidate).arm,'candidate');
});
test('players keep exact frozen choices with only a case-local technical stop added',()=>{
 for(const profile of ['good','normal','bad']){
  const options=lossPressureCampaignOptions(profile,input),{'stop-file':stop,...choices}=options;
  assert.deepEqual(choices,reviewedRecoveryOptions(profile,input));assert(stop.endsWith('stop-requested'));assert.equal(options.days,100);
 }
 assert.throws(()=>lossPressureCampaignOptions('perfect',input));
 for(const edit of [{days:7},{defenseStartDay:1},{gateAnimationInvariant:false},{'stop-file':'arbitrary'}])assert.throws(()=>lossPressureCampaignProvenance({...lossPressureCampaignOptions('good',input),...edit}),/frozen player profiles/);
});
test('committed provenance labels actual frozen profile and the CLI plan never starts a campaign',()=>{
 const options=lossPressureCampaignOptions('good',input),source=lossPressureCampaignProvenance(options);
 assert.equal(source.comparison.playerProfile,'good');assert.equal(source.comparison.militaryCandidate,5);
 assert.equal(Object.keys(source.sourceHashes).length,469);
 assert.equal(lossPressureCampaignProvenance({...options,strategy:'bad'}).comparison.playerProfile,'bad');
 assert.equal(existsSync(options.out),false);
 const stdout=execFileSync(process.execPath,['tools/run-reviewed-loss-pressure-campaign.mjs','--plan','good','123','sabana','mapungubwe',input.out],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',maxBuffer:200000});
 const plan=JSON.parse(stdout);assert.equal(plan.options.days,100);assert.equal(plan.source.comparison.arm,'candidate');assert.equal(existsSync(options.out),false);
});
