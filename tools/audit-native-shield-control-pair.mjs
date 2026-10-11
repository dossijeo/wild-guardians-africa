// Read-only one-policy-factor gate; dynamic farm value/RNG outcomes may diverge.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeCampaignStrategy} from './native-campaign-protocol.mjs';
const [shieldDirectory,plainDirectory,output]=process.argv.slice(2);
assert(shieldDirectory&&plainDirectory&&output&&!existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex'),directories=[shieldDirectory,plainDirectory];
const runs=directories.map(directory=>({directory,report:JSON.parse(readFileSync(directory+'/report.json')),receipt:JSON.parse(readFileSync(directory+'/receipt.json')),source:JSON.parse(readFileSync(directory+'/source.json'))}));
const [a,b]=runs.map(r=>r.report);
assert.equal(a.strategy,'no-walls');assert.equal(b.strategy,'no-shield');
assert.deepEqual(runs[0].source.sourceHashes,runs[1].source.sourceHashes);
assert.deepEqual(a.protocol,b.protocol);
for(const key of ['seed','biome','culture','labourPolicy','completedNights'])assert.deepEqual(a[key],b[key]);
const strip=(value,key)=>Object.fromEntries(Object.entries(value).filter(([k])=>k!==key));
assert.deepEqual(strip(a.policy,'shieldEnabled'),strip(b.policy,'shieldEnabled'));
assert.deepEqual(strip(nativeCampaignStrategy(a.strategy),'shield'),strip(nativeCampaignStrategy(b.strategy),'shield'));
assert.equal(a.policy.shieldEnabled,true);assert.equal(b.policy.shieldEnabled,false);
for(const {report:r,receipt} of runs){
 assert.equal(receipt.status,'observed-horizon');assert.equal(r.result,null);assert.equal(receipt.completedNights,r.completedNights);
 assert.equal(r.policy.defend,false);assert.equal(r.defense,null);
 assert.equal(r.nativeEvidence.status,'verified');assert.equal(r.nativeEvidence.coverageLost,false);
 assert.equal(r.raidEvidence.status,'verified');assert.equal(r.raidEvidence.coverageLost,false);
 assert(r.daily.every(d=>d.finance.reconciliationDifference===0&&d.finance.walls===0));
}
const rows=runs.map(({report:r})=>({strategy:r.strategy,coins:r.money,living:r.daily.at(-1).living,destroyed:r.raidEvidence.raids.reduce((n,q)=>n+q.cropsDestroyed,0),strikes:Object.values(r.raidEvidence.raids.reduce((acc,q)=>{for(const [id,s] of Object.entries(q.species))acc[id]=(acc[id]??0)+s.observedBudgetConsumed;return acc;},{})).reduce((n,x)=>n+x,0),shieldContacts:r.raidEvidence.raids.reduce((n,q)=>n+q.shieldContacts,0),misses:r.raidEvidence.raids.reduce((n,q)=>n+q.misses,0)}));
const result={status:'verified-single-policy-factor-shield-control',directories,sourceHashes:runs[0].source.sourceHashes,inputHashes:directories.map(d=>Object.fromEntries(['report.json','source.json','receipt.json'].map(p=>[p,hash(readFileSync(d+'/'+p))]))),rows,scope:'Identical frozen sources, protocol, world, labour and all player-policy settings except Shield availability. Outcomes evolve through native crop value, labour decisions, targeting and persistent RNG; nightly compositions and budgets need not stay identical. Separate ledger/census/delivery audits required. No guaranteed Shield kill reduction, wall efficacy, human activity or 100-night acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,rows}));
