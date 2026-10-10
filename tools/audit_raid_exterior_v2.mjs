import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),base=resolve('docs/qa/raid-exterior-entry-candidate'),receipt=JSON.parse(readFileSync(resolve(base,'v2-receipt.json')));
for(const[p,r]of Object.entries(receipt.payloads)){const b=readFileSync(resolve(base,p));assert.equal(b.length,r.bytes,p);assert.equal(sha(b),r.sha256,p);}
for(const[p,h]of Object.entries(receipt.sources))assert.equal(sha(readFileSync(p)),h,p);
const probes=JSON.parse(readFileSync(resolve(base,'v2-original/native-cliff-probes-d579.json')));
assert.equal(probes.radius,1.1);assert.equal(probes.probes.length,36);assert.ok(probes.probes.find(p=>p.x===-39&&p.z===-6).witnesses.some(p=>p.x===-44&&p.z===-6));
const tap=readFileSync(resolve(base,'v2-original/entry-nine.tap'),'utf8');assert.match(tap,/# pass 9/);assert.match(tap,/# fail 0/);
const rows=tap.split(/\r?\n/).filter(l=>l.startsWith('# {')).map(l=>JSON.parse(l.slice(2))),natural=rows.find(r=>r.scope==='paid native Canyon closed-region proof, not campaign'),physical=rows.find(r=>r.scope==='one native paid-enclosure physical raid, not campaign');
assert.equal(natural.paidCoins,160);assert.equal(natural.radius,1.1);assert.equal(natural.interiorWalkable,true);assert.equal(natural.exteriorWalkable,true);assert.equal(natural.exteriorRoute,null);assert.equal(natural.finiteNativeGridNodes,14);
assert.deepEqual(natural.inside,{x:-30,z:26});assert.equal(physical.actualHits,2);assert.equal(physical.paidBalance,525);
console.log(JSON.stringify({status:'verified',payloads:Object.keys(receipt.payloads).length,sources:Object.keys(receipt.sources).length,naturalSnapshotSHA256:natural.snapshotSHA256,originalNegativePreserved:true,performanceAcceptance:false,campaignExecuted:false}));
