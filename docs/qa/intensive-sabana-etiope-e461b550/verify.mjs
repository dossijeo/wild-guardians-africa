import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {deserialize} from '../../../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from '../../../tools/summarize_intensive_farm.mjs';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(await fs.readFile(new URL('receipt.json',dir),'utf8')),raw={};
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [name,record]of Object.entries(receipt.files)){
 const packed=await fs.readFile(new URL(name+'.json.gz',dir)),bytes=gunzipSync(packed);
 assert.equal(hash(packed),record.compressedSha256);assert.equal(hash(bytes),record.rawSha256);
 assert.equal(bytes.length,record.rawBytes);assert.equal(packed.length,record.compressedBytes);raw[name]=bytes;
}
const processResult=JSON.parse(raw.process),report=JSON.parse(raw.report),summary=JSON.parse(raw.summary);
assert.equal(processResult.outcome.code,0);assert.equal(processResult.outcome.signal,null);assert.equal(processResult.stderr,'');
assert.equal(report.result,'victory');assert.equal(report.completedNights,100);report.state=deserialize(raw.state.toString('utf8'));
assert.deepEqual(summarizeIntensiveFarm(report),summary);
assert.equal(JSON.parse(raw['frozen-source']).revision,receipt.sourceRevision);
assert.equal(Object.keys(report.provenance.sourceHashes).length,291);
assert.equal(receipt.summaryRecalculationExact,true);
const prior=JSON.parse(gunzipSync(await fs.readFile(new URL('../intensive-sabana-musgum-e461b550/report.json.gz',dir))));
assert.deepEqual(report.provenance.sourceHashes,prior.provenance.sourceHashes);
console.log(JSON.stringify({result:summary.result,completedNights:100,maximumLiving:summary.maximumLiving,balance:summary.money,summaryRecalculationExact:true,loadedSource:receipt.sourceRevision,scope:'Historical frozen run; archive audit is not a replay of current main.'}));
