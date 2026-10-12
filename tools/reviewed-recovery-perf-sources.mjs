// Source-family classification only. Does not launch or mutate a campaign.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const current=JSON.parse(gunzipSync(readFileSync(new URL('docs/qa/integrated-spiritual-survival/recovery-perf-preparation/complete-source.json.gz',root)))).sourceHashes;
const original=JSON.parse(gunzipSync(readFileSync(new URL('docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz',root))));
const military=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'].sort();
const reference={...current};
for(const path of military){
 assert.equal(current[path],original.current.sourceHashes[path],'Military recipe changed during technical preparation');
 const row=original.changed.find(row=>row.path===path);assert(row&&/^[a-f0-9]{64}$/.test(row.before));reference[path]=row.before;
}
assert.equal(Object.keys(current).length,466);
export function recoveryPerfSourceInventories(){return {recovery:{...current},reference:{...reference}};}
export function verifyRecoveryPerfSources(actual){
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||Object.keys(actual).sort().join('|')!==Object.keys(current).sort().join('|'))throw Error('Recovery perf source inventory differs');
 const changed=Object.keys(current).filter(path=>actual[path]!==current[path]).sort();
 if(!changed.length)return {family:'recovery-perf-preparation-v1',arm:'recovery',militaryCandidate:4,changed};
 if(changed.join('|')!==military.join('|')||military.some(path=>actual[path]!==reference[path]))throw Error('Unreviewed recovery perf source differences: '+changed.join(', '));
 return {family:'recovery-perf-preparation-v1',arm:'reference',militaryCandidate:3,changed};
}
