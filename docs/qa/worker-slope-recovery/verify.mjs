import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'.json.gz',dir))));
const receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
for(const p of receipt.pieces){const raw=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(raw.length,p.rawBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),p.sha256);}
const native=read('native-return'),observed=read('observer');
assert.equal(native.rows.length,27);assert.equal(native.ticks,900);assert.equal(native.hired,112);
assert(native.rows.every(r=>r.firstValid.tick===1&&r.homeTick!==null&&r.homeTick<=676&&r.maxStep<=.24000001));
assert.equal(observed.ticks,100);assert.equal(observed.navigation.failures,31);
const previous=JSON.parse(gunzipSync(readFileSync(new URL('../watering-large-farm-return/attribution.json.gz',dir))));
assert.equal(previous.navigation.failures,3100);assert.deepEqual(observed.watering,previous.watering);
assert.deepEqual(receipt.exitCodes,[0,0,0]);assert.equal(receipt.benchmark,false);
console.log('PASS: 27 native workers physically return; observer parity and unchanged watering; scoped recovery evidence');
