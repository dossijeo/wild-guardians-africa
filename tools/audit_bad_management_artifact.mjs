// Independently read retained poor-management reports; never rerun or force a loss.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {deserialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
const [directory,output]=process.argv.slice(2);
assert.ok(directory&&output,'Usage: ARTIFACT_DIRECTORY OUTPUT.json');
const read=file=>readFileSync(join(directory,file));
const matrix=JSON.parse(read('matrix.json'));
assert.equal(matrix.status,'passed');assert.equal(matrix.sourcesUnchanged,true);
assert.equal(matrix.cases.length,6);
const rows=matrix.cases.map(row=>{
 assert.equal(row.status,'audited');
 const bytes=gunzipSync(read(`${row.biome}-state.json.gz`));
 const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,row.snapshotSha256);
 const state=deserialize(bytes.toString('utf8'));
 const report=JSON.parse(read(`${row.biome}-report.json`));
 const savedSummary=JSON.parse(read(`${row.biome}-summary.json`));
 assert.equal(state.raid,null,'An unfinished raid is not a poor-management loss');
 assert.equal(state.result,row.result);assert.equal(state.completedNights,row.completedNights);
 const actual=summarizeIntensiveFarm({...report,state});assert.deepEqual(actual,savedSummary);
 assert.equal(state.events.filter(e=>e.type==='GameOver').length,Number(row.result==='defeat'));
 assert.equal(BigInt(state.ledger.balance.n),BigInt(row.money));
 return {biome:row.biome,result:row.result,completedNights:row.completedNights,money:row.money,
  delivered:row.delivered,snapshotSha256:hash};
});
assert.equal(rows.filter(r=>r.result==='defeat').length,matrix.defeats);
assert.ok(matrix.defeats>0,'A viable bad-management failure must remain possible');
const result={status:'verified',source:matrix.provenance.gitHead,defeats:matrix.defeats,cases:rows,
 scope:'Independent snapshot/ledger/physical-delivery summary and retained-result audit. This does not approve responsible survival, activity, a whole-culture matrix, or current-source replay.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
