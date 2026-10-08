import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../../../../src/persistence/snapshots.js';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),raw=p=>gunzipSync(readFileSync(new URL(p,dir))),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(receipt.terminalExitCode,0);for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
const r=JSON.parse(raw('retained-raid-after-plant-report.json.gz')),s=deserialize(r.finalState);
assert.equal(r.statesCompared,201);assert.equal(r.movingTicks,85);assert.equal(r.preparedPaths,1);assert.equal(r.epoch,2);assert.deepEqual(r.targets,[r.second]);
assert.equal(s.plants.find(p=>p.id===r.first).species,'mijo');const target=s.plants.find(p=>p.id===r.second);assert.equal(target.species,'maiz');assert.equal(target.alive,false);assert.equal(target.attackHits,2);
assert.equal(s.raid,null);assert(s.events.some(e=>e.type==='RaidEnded'));assert.equal(s.navigationVersion,r.epoch+1,'Native raid completion still rebuilds navigation');
assert(s.ledger.entries['intensive-plant-raid-after-prepare']);assert(s.ledger.entries['raid-paid-worker']);
console.log('PASS stored source hashes and native paid post-preparation crop target proof; no independent replay or broader acceptance');
