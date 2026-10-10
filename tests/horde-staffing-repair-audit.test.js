import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditStaffingRepair} from '../tools/audit_horde_staffing_repair.mjs';
import {auditContinuation} from '../tools/audit_horde_repair_continuation.mjs';
test('Paid212 legal cohort succeeds while original106 pending result remains unchanged',()=>{
 const root=fileURLToPath(new URL('../docs/qa/horde-defense-pilot-88ebf647-20/',import.meta.url)),directory=root+'staffing6-repair-e1a2281b',input=directory+'/continuation/final-state.json.gz',hash=()=>createHash('sha256').update(readFileSync(input)).digest('hex'),before=hash(),paid=auditStaffingRepair(directory),control=auditContinuation(root+'repair-continuation-a0c36ca7');
 assert.equal(paid.sourceHashesVerified,394);assert.equal(paid.staff,212);assert.equal(paid.wages,6360);assert.equal(paid.completion.paidCoins,174);assert.equal(paid.completion.restoredHp,130);assert.ok(paid.completion.sampledTime<300);assert.ok(paid.firstAssigned.time<paid.completion.sampledTime);assert.equal(paid.finalFifoRank,-1);assert.equal(control.paidRepairs,0);assert.equal(control.finalFifoRank,417);assert.equal(hash(),before);
});
