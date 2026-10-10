import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {staffingRepairPlan} from '../tools/horde-staffing-repair-plan.mjs';
const original=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/native-original/responsible/state.json.gz',import.meta.url))).toString());
test('Exact original cohort funds212 at30 plus real repair and tomorrow reserve without state changes',()=>{
 const s=original(),before=serialize(s),p=staffingRepairPlan(s);assert.equal(p.living,1272);assert.equal(p.count,212);assert.equal(p.paidCoins,6360);assert.equal(p.nextDayWages,6360);assert.equal(p.repairReserve,174);assert.equal(p.balanceAfterHire,55692);assert.equal(p.remainingAfterBothReserves,49158);assert.equal(p.centerId,'structure-2');assert.equal(serialize(s),before);
});
test('Ordinary insufficient wages+reserve or unavailable hiring state reject, not fabricated funding',()=>{
 const s=original();s.ledger.balance={n:'12000',d:'1'};assert.throws(()=>staffingRepairPlan(s),/Cannot fund/);const closed=original();closed.pauses=[];assert.throws(()=>staffingRepairPlan(closed));const later=original();later.time=1;assert.throws(()=>staffingRepairPlan(later));const wrongDay=original();wrongDay.day=22;assert.throws(()=>staffingRepairPlan(wrongDay));
});
