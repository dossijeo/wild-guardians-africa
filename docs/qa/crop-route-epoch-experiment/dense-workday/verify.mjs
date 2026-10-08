import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../../../src/persistence/snapshots.js';
import {auditIntensiveFarm} from '../../../../tools/check_intensive_farm.mjs';
const dir=new URL('./',import.meta.url),raw=p=>gunzipSync(readFileSync(new URL(p,dir))),sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),r=JSON.parse(raw('report.json.gz'));
assert.equal(receipt.productionChanged,false);assert.deepEqual(receipt.terminalSessions.map(s=>s.exitCode),[1,1,0]);
for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
assert.equal(receipt.input,'../../intensive-sabana-musgum-e461b550/state.json.gz');assert.equal(r.sourceHash,sha(raw(receipt.input)));
for(const [key,path] of Object.entries({'src/simulation/game.js':'../production-game.js.gz','src/world/navigation.js':'../production-navigation.js.gz','.cache/no-crop-epoch-navigation.mjs':'../candidate-navigation.mjs.gz'}))assert.equal(r.sourceHashes[key],sha(raw(path)));
assert.equal(r.rows.length,2);assert.equal(r.sites.length,10);
for(const [i,row] of r.rows.entries()){
 const b=raw(row.mode+'-state.json.gz'),s=deserialize(b.toString());
 assert.equal(sha(b),row.stateHash);assert.equal(row.error,null);assert.equal(row.ticks,6000);assert.equal(row.staff,112);assert.equal(row.restoreWindows,3);assert.equal(row.restorePairs,30);
 assert.equal(row.events.CropPlaced,10);assert.equal(row.events.CrateDelivered,[205,201][i]);assert.equal(row.violationCount,[5,2][i]);assert.equal(row.violations.length,row.violationCount);
 assert.deepEqual(row.checkpoints.find(c=>c.tick===4800).statuses,{home:143});
 assert.equal(s.day,102);assert.equal(s.time,0);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);assert.equal(s.crates.length,row.final.crates);assert.equal(s.crates.filter(c=>c.delivered).length,row.final.delivered);
 assert.equal(row.final.delivered-row.initialDelivered,row.events.CrateDelivered);assert.equal(row.final.crates-row.initialCrates,row.events.CropPicked);
 assert.equal(s.plants.filter(p=>p.alive).length,row.final.living);assert.equal(serialize(deserialize(serialize(s))),serialize(s));
 auditIntensiveFarm({state:s,counts:{CrateDelivered:row.final.delivered,CropPicked:row.final.crates}});
}
assert.equal(r.rows[1].final.money-r.rows[0].final.money,-712);
for(const attempt of ['night-plant','custom-id']){
 const fail=JSON.parse(raw(attempt+'-rejected-report.json.gz'));assert(fail.rows[0].error);assert.equal(fail.rows.length,1);assert.equal(sha(raw(attempt+'-rejected-state.json.gz')),fail.rows[0].stateHash);
}
console.log('PASS stored paired dense workdays, full states, native ledger/crate audit and preserved harness failures; no route equality or GPU claim');
