import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const root=resolve(process.argv[2]??'docs/qa/native-q15-no-walls-short'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(root+'/manifest.json'));
for(const[p,h]of Object.entries(manifest.payloads)){const gz=readFileSync(root+'/native-original/'+p),raw=gunzipSync(gz);assert.equal(sha(gz),h.gzipSHA,p);assert.equal(sha(raw),h.rawSHA,p);}
const raw=p=>gunzipSync(readFileSync(root+'/native-original/'+p+'.gz')),json=p=>JSON.parse(raw(p));
const r=json('report.json'),s=json('state.json'),source=json('source.json'),receipt=json('receipt.json'),timing=json('timing-terminal.json');
assert.equal(receipt.status,'observed-horizon');assert.equal(r.completedNights,7);assert.equal(r.result,null);assert.equal(s.completedNights,7);assert.equal(s.day,8);assert.equal(s.time,0);assert.equal(r.money,768);assert.equal(serialize(deserialize(raw('state.json').toString())),raw('state.json').toString());
assert.equal(source.gitHead,manifest.source);assert.deepEqual(source.trackedChanges,[]);assert.equal(Object.keys(source.sourceHashes).length,441);
let balance=1500n;for(const entry of Object.values(s.ledger.entries)){assert.equal(entry.d,'1');balance+=BigInt(entry.n);}assert.equal(balance,768n);assert.equal(s.ledger.balance.n,'768');assert.equal(s.ledger.balance.d,'1');
assert.equal(r.nativeEvidence.status,'verified');assert.equal(r.raidEvidence.status,'verified');assert.equal(r.counts.CrateDelivered,410);assert.equal(r.nativeEvidence.deliveries.length,410);assert.equal(r.nativeEvidence.repairSettlements.paidCoins,'0');
assert.equal(r.daily.length,7);assert.equal(r.daily.reduce((n,d)=>n+d.destroyed,0),72);for(const day of r.daily){assert.equal(day.finance.reconciliationDifference,0);assert.equal(day.finance.walls,0);assert.equal(day.finance.repairs,0);assert.deepEqual(day.centerHp,[600]);}
assert.equal(timing.count,2681);assert.equal(timing.slowWindows,0);assert.ok(timing.maximumMs<2000);
const protectedRoot=resolve('docs/qa/native-balance-parallel-short/native-original'),previous=JSON.parse(gunzipSync(readFileSync(protectedRoot+'/report.json.gz'))),oldSource=JSON.parse(gunzipSync(readFileSync(protectedRoot+'/source.json.gz')));
assert.deepEqual(source.sourceHashes,oldSource.sourceHashes);for(let i=0;i<5;i++){assert.equal(r.daily[i].money,previous.daily[i].money);assert.equal(r.daily[i].living,previous.daily[i].living);assert.equal(r.daily[i].destroyed,previous.daily[i].destroyed);}
if(process.argv[3])for(const[p,h]of Object.entries(source.sourceHashes))assert.equal(sha(readFileSync(resolve(process.argv[3],p))),h,p);
console.log(JSON.stringify({status:'verified-short-control',payloads:Object.keys(manifest.payloads).length,sourceCount:441,sameProtectedSourceHashes:true,fullStateSHA:sha(raw('state.json')),cash:'768',physicalDeliveries:410,destroyedCrops:72,centerHp:600,paidWalls:0,paidRepairs:0,maximumObservationWindowMs:timing.maximumMs,scope:'Seven nights only; unlimited magic preserved, no inactivity gate, no long-campaign/GPU/performance acceptance'},null,2));
