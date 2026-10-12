import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const review=JSON.parse(gunzipSync(readFileSync(new URL('../docs/qa/static-open-route-cache/campaign-source-review.json.gz',import.meta.url))));
const current=review.sourceHashes,control=review.controlHashes;
const military=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js'].sort();
const keys=Object.keys(current).sort();
assert.equal(keys.length,466);assert.deepEqual(Object.keys(control).sort(),keys);
assert.deepEqual(keys.filter(p=>current[p]!==control[p]),military);
assert(Object.values(current).every(x=>/^[a-f0-9]{64}$/.test(x)));
export function openWitnessSourceInventories(){return {candidate:{...current},control:{...control}};}
export function verifyOpenWitnessSources(actual){
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||Object.keys(actual).sort().join('|')!==keys.join('|'))throw Error('Loss-pressure dependency inventory differs');
 const changed=keys.filter(p=>actual[p]!==current[p]);
 if(!changed.length)return {family:review.family,arm:'candidate',militaryCandidate:5,changed};
 if(changed.join('|')!==military.join('|')||military.some(p=>actual[p]!==control[p]))throw Error('Unreviewed loss-pressure source differences: '+changed.join(', '));
 return {family:review.family,arm:'control',militaryCandidate:4,changed};
}
