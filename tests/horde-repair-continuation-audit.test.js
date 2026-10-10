import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {auditContinuation} from '../tools/audit_horde_repair_continuation.mjs';
test('Full daylight continuation preserves input, physical payments and honest pending outcome',()=>{
 const directory=new URL('../docs/qa/horde-defense-pilot-88ebf647-20/repair-continuation-a0c36ca7/',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),file=directory+'final-state.json.gz',hash=()=>createHash('sha256').update(readFileSync(file)).digest('hex'),before=hash(),r=auditContinuation(directory);
 assert.equal(r.sourceHashesVerified,392);assert.equal(r.initialFifoRank,1110);assert.equal(r.finalFifoRank,417);assert.equal(r.reservedSamples,0);assert.equal(r.idleWorkerSamples,0);assert.equal(r.paidRepairs,0);assert.equal(r.eventCounts.RaidSpawned,undefined);assert.equal(r.newDeliveredPayments,141);assert.equal(r.earnedCoins,'50679');assert.equal(hash(),before);
});
