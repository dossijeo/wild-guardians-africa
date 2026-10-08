import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>read(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json'));
for(const p of receipt.pieces){const encoded=get(p.path),bytes=p.gzip?gunzipSync(encoded):encoded;assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256);}
const status=JSON.parse(get('status.json')),log=gunzipSync(get('log.txt.gz')).toString();
assert.equal(status.headSha,receipt.headSha);assert.equal(status.status,'completed');assert.equal(status.conclusion,'success');assert.equal(receipt.run,37782785754);
for(const [metric,value] of Object.entries({tests:3160,pass:3160,fail:0,cancelled:0,skipped:0}))assert(new RegExp('# '+metric+' '+value+'(?:\\r?\\n|$)').test(log));
const steps=status.jobs.flatMap(j=>j.steps);
for(const name of ['Run npm test','Run npm run build','Run npm run test:web-package','Run python tools/package_itch.py','Run npm run verify:assets','Run npm run verify:web-assets','Run npm run verify:audio-runtime','Run npm run verify:plan','Run npm run verify:balance','Run npm run verify:browser-syntax'])assert.equal(steps.find(s=>s.name===name)?.conclusion,'success');
const sourceReceipt=JSON.parse(get(receipt.sourceBindingArchive));
for(const [source,sha] of Object.entries(receipt.productionSources))assert.equal(sourceReceipt.pieces.find(p=>p.source===source)?.sha256,sha);
console.log('PASS: archived cloud CI3160/3160, build/assets/package/ZIP succeeded for integrated guard sources. No mobile/GPU acceptance.');
