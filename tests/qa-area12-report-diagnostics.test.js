import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {auditArea12Opening} from '../tools/run_area12_opening.mjs';
import {ownedWallStateCounts} from '../tools/horde-defense-terminal-derivative.mjs';
const directory=new URL('../docs/qa/qa-area12-opening-4d939cb8-6/responsible/',import.meta.url);
const load=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,directory))));
test('post-freeze audit uses meaningful activity; raw success cannot replace missing or failed evidence',()=>{
 const original={...load('native-report.json.gz'),state:load('native-state.json.gz')};
 const r={...original,observedActivity:{...original.observedActivity,unoccupiedFraction:.1},meaningfulObservedActivity:{...original.meaningfulObservedActivity,unoccupiedFraction:.3}};
 const a=auditArea12Opening(r,6);assert.equal(a.rawActivityBelow25,true);assert.equal(a.strictActivityBelow25,false);assert.equal(a.meaningfulObservedActivity.unoccupiedFraction,.3);
 delete r.meaningfulObservedActivity;assert.equal(auditArea12Opening(r,6).meaningfulActivityAvailable,false);assert.equal(auditArea12Opening(r,6).strictActivityBelow25,false);
});
test('retained native walls remain intact in diagnostic despite centre-only original counter',()=>{
 const report=load('native-report.json.gz'),state=load('native-state.json.gz');
 const counts=ownedWallStateCounts(state,report.defense.built);assert.equal(counts.intact,428);assert.equal(counts.ruined,0);assert.equal(report.defense.currentOwnedOperational,0);assert.equal(report.defense.currentOwnedRuined,428);
});
