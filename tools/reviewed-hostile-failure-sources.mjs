import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
const review=JSON.parse(gunzipSync(readFileSync(new URL('../docs/qa/hostile-approach-cache/campaign-source-review.json.gz',import.meta.url))));
const keys=Object.keys(review.sourceHashes).sort(),military=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js'].sort();
assert.equal(keys.length,468);assert.deepEqual(Object.keys(review.controlHashes).sort(),keys);
assert.deepEqual(keys.filter(p=>review.sourceHashes[p]!==review.controlHashes[p]),military);
export function hostileFailureInventories(){return {candidate:{...review.sourceHashes},control:{...review.controlHashes}};}
export function verifyHostileFailureSources(actual){
 if(!actual||Object.keys(actual).sort().join('|')!==keys.join('|'))throw Error('Hostile-failure dependency inventory differs');
 const changed=keys.filter(p=>actual[p]!==review.sourceHashes[p]);
 if(!changed.length)return {family:review.family,arm:'candidate',militaryCandidate:5,acceptancePending:true};
 if(changed.join('|')!==military.join('|')||military.some(p=>actual[p]!==review.controlHashes[p]))throw Error('Unreviewed hostile-failure source differences: '+changed.join(', '));
 return {family:review.family,arm:'control',militaryCandidate:4,acceptancePending:true};
}
