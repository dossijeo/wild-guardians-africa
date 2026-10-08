import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('receipt.json')),statusBytes=read('status.json'),status=JSON.parse(statusBytes),logBytes=gunzipSync(read('job.log.gz')),log=logBytes.toString();
assert.equal(hash(statusBytes),receipt.statusSha256);assert.equal(hash(logBytes),receipt.logSha256);
assert.equal(status.databaseId,receipt.run);assert.equal(status.headSha,receipt.sourceCommit);
assert.equal(status.status,'completed');assert.equal(status.conclusion,'success');
for(const job of status.jobs){assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');for(const step of job.steps)assert.equal(step.conclusion,'success');}
assert.match(log,/# tests 3167\s/);assert.match(log,/# pass 3167\s/);assert.match(log,/# fail 0\s/);
assert.match(log,/PASS: 701 files \/ 403034921 bytes, 859 relative links, 20 runtime GLBs/);
console.log(JSON.stringify({ci:'PASS',run:receipt.run,tests:3167,source:receipt.sourceCommit}));
