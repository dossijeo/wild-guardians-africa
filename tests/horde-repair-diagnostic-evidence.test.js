import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {analyseOpening} from '../tools/analyse_horde_opening.mjs';
const root=new URL('../docs/qa/horde-defense-pilot-88ebf647-20/',import.meta.url),dir=new URL('repair-snapshot-diagnostic/',root),hash=x=>createHash('sha256').update(x).digest('hex');
const report=JSON.parse(readFileSync(new URL('report.json',dir))),state=name=>{const raw=gunzipSync(readFileSync(new URL(name+'-state.json.gz',dir))).toString();assert.equal(serialize(deserialize(raw)),raw);return {raw,s:deserialize(raw)};};
test('Bounded legal native snapshot keeps original input and FIFO, only hire is paid',()=>{
 const original=readFileSync(new URL('native-original/responsible/state.json.gz',root));assert.equal(hash(original),report.inputSHA256);assert.equal(hash(gunzipSync(original)),report.initialSnapshotSHA256);
 const before=state('before-request'),after=state('final');assert.equal(hash(after.raw),report.finalSnapshotSHA256);assert.equal(after.s.day,21);assert.equal(after.s.time,1);
 const paid=after.s.ledger.entries['repair-diagnostic-hire'];assert.equal(paid.n,String(-report.commands.hire.paidCoins));assert.equal(report.commands.hire.paidCoins,report.commands.hire.count*30);
 assert.deepEqual(after.s.ledger,before.s.ledger);assert.equal(report.repairSettlements.paidRepairs,0);assert.equal(report.repairSettlements.completedRepairs,0);
 const task=after.s.tasks.find(t=>t.id===report.commands.repair.taskId);assert.equal(task.kind,'repair');assert.equal(task.workerId,null);assert.equal(task.targetId,report.commands.repair.targetId);
 assert.equal(after.s.tasks.filter(t=>t.created<task.created).length,1110);assert.equal(report.initial.precedingTasks,1110);assert.equal(before.s.tasks.length,1110);assert.ok(before.s.tasks.every(t=>t.created<task.created));
 assert.equal(before.s.structures[0].hp,after.s.structures[0].hp);assert.ok(report.routes.every(r=>r.reachable&&!r.idleReservationEligible));assert.equal(report.observations.length,4);
});
test('Opening postprocess is reproducible and does not invent delivery timestamps',()=>{
 const path=new URL('native-original/responsible/report.json.gz',root),before=readFileSync(path),r=analyseOpening(path),archived=JSON.parse(readFileSync(new URL('opening-analysis.json',dir)));assert.deepEqual(r,archived);assert.equal(hash(readFileSync(path)),hash(before));
 assert.ok(r.rows.every(d=>d.firstDeliveryTime===null));assert.equal(r.rows.length,5);assert.ok(Math.abs(r.rows.reduce((n,d)=>n+d.budgetSeconds,0)-574)<1e-6);
 assert.ok(Math.abs(r.rows.reduce((n,d)=>n+d.derivedReserveAttribution.maintenanceOnlySeconds,0)-315)<1e-6);assert.ok(Math.abs(r.rows.reduce((n,d)=>n+d.derivedReserveAttribution.belowLabourPlusSeedSeconds,0)-259)<1e-6);
});
