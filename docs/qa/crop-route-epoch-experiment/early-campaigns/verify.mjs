import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../../../src/persistence/snapshots.js';
import {auditIntensiveFarm} from '../../../../tools/check_intensive_farm.mjs';
const dir=new URL('./',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex'),raw=p=>gunzipSync(readFileSync(new URL(p,dir))),json=p=>JSON.parse(raw(p));
const receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));assert.equal(receipt.productionChanged,false);assert.deepEqual(receipt.exitCodes,[0,0]);assert.equal(receipt.cases.length,6);
for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
const baseHashes={'.cache/no-crop-epoch-navigation.mjs':sha(raw('../candidate-navigation.mjs.gz')),'src/world/navigation.js':sha(raw('../production-navigation.js.gz')),'src/simulation/game.js':sha(raw('../production-game.js.gz'))};
let retained=0,rebuilds=0,destroyed=0;
for(const row of receipt.cases){
 const r=json(row.key+'-report.json.gz'),bytes=raw(row.key+'-state.json.gz'),state=deserialize(bytes.toString());
 assert.equal(r.completedNights,5);assert.equal(state.completedNights,5);assert.equal(state.day,6);assert.equal(r.result,null);assert.equal(r.money,row.money);assert.equal(r.violationCount,0);assert.equal(r.violations.length,0);assert.equal(r.reloads,5);assert.equal(r.counts.RaidSpawned,5);assert.equal(r.counts.RaidEnded,5);assert.equal(r.counts.HiringConfirmed,5);
 assert(r.daily.every(d=>d.staff>0&&d.delivered>0));assert.equal(r.counts.CrateDelivered,row.delivered);assert.equal(r.counts.CropPicked,row.delivered);assert.equal(r.counts.CropDestroyed??0,row.destroyed);assert.equal(r.sampledCallbacks,row.sampledCallbacks);
 assert.equal(r.cropEpoch.retainedEpochViolations,0);assert.deepEqual(r.cropEpoch,row.cropEpoch);assert.equal(r.cropEpoch.retained+r.cropEpoch.rebuild,r.counts.CropPlaced);retained+=r.cropEpoch.retained;rebuilds+=r.cropEpoch.rebuild;destroyed+=row.destroyed;
 for(const [key,value] of Object.entries(baseHashes))assert.equal(r.sourceHashes[key],value);
 for(const [key,value] of Object.entries(r.sourceHashes)){if(baseHashes[key])continue;const p=receipt.pieces.find(p=>p.source===key);assert(p,'Missing source '+key);assert.equal(p.sha256,value);}
 assert.equal(sha(bytes),r.stateHash);assert.equal(serialize(deserialize(serialize(state))),serialize(state));auditIntensiveFarm({state,counts:r.counts});
}
assert.equal(retained,2606);assert.equal(rebuilds,18);assert.equal(destroyed,14);
console.log('PASS six native five-night openings, actual crop epochs and final economy/physical delivery audit; no broad release acceptance');
