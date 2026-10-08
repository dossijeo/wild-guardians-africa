import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',base)));
const hash=file=>createHash('sha256').update(readFileSync(new URL(file,base))).digest('hex');
for(const [file,expected] of Object.entries(receipt.artifacts))assert.equal(hash(file),expected,file);
const report=JSON.parse(readFileSync(new URL('report.json',base)));
assert.equal(report.done,true);assert.equal(report.ownedCompilation,true);
assert.deepEqual(report.errors,[]);assert.equal(report.disposed,true);assert.equal(report.contextLost,true);
assert.deepEqual(report.rows.map(row=>row.case),['real-selected-program-ready','owner-cancel','deadline','render-after-cancellation']);
for(const row of report.rows)assert.equal(row.passed,true,row.case);
for(const row of report.rows.slice(1,3)){assert.equal(row.lateQueries,0);assert.ok(row.queriesAtExit>=1);assert.match(row.scope,/deliberately held false/);}
assert.equal(report.rows[1].errorName,'AbortError');assert.match(report.rows[1].errorMessage,/owner-cancelled/);
assert.match(report.rows[2].errorMessage,/timed out/);assert.equal(report.rows[3].render.calls,1);
assert.equal(report.rows[3].render.triangles,12);assert.ok(report.limitations.length>=2);
console.log('PASS: archived native controlled compilation lifecycle; no production/performance acceptance.');
