import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareLoadingCropPartition} from '../src/app/loading-crop-partition.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('App uses canonical Assets singleton and releases only its owner on abort',async()=>{
 const loading=new AbortController(),partition={calls:0,dispose(){this.calls++;}},world={loading,assets:{getCropPartition:async()=>partition}};
 assert.strictEqual(await prepareLoadingCropPartition(world),partition);assert.strictEqual(world.cropPartition,partition);
 await assert.rejects(prepareLoadingCropPartition(world),/already prepared/);
 loading.abort();loading.abort();assert.equal(partition.calls,1);assert.equal(world.cropPartition,null);
});
test('cancelled late manifest arrival cannot adopt into App',async()=>{
 const pending=deferred(),loading=new AbortController(),world={loading,assets:{getCropPartition:()=>pending.promise}};
 const work=prepareLoadingCropPartition(world),rejected=assert.rejects(work,/cancelled/);loading.abort();let disposals=0;pending.resolve({dispose(){disposals++;}});await rejected;assert.equal(disposals,1);assert.equal(world.cropPartition,undefined);
});
test('rejected preparation is observed and aborted owner cannot start a new manifest',async()=>{
 const error=Error('manifest failure'),loading=new AbortController(),world={loading,assets:{getCropPartition:async()=>{throw error;}}};
 await assert.rejects(prepareLoadingCropPartition(world),e=>e===error);loading.abort();await assert.rejects(prepareLoadingCropPartition(world),/cancelled/);
});
test('minimal integration preserves current main outside exact App partition await',()=>{
 const baseline=JSON.parse(readFileSync('tests/fixtures/crop-partition-main-baseline.json','utf8'));
 const sha=text=>createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');
 const actual=readFileSync('src/app/main.js','utf8').replace("import {prepareLoadingCropPartition} from './loading-crop-partition.js';\n",'').replace('prepareLoadingCropPartition(owner).then(()=>diorama.prepare())','diorama.prepare()');
 assert.equal(sha(actual),baseline.mainSha256);
 for(const row of baseline.unchanged)assert.equal(sha(readFileSync(row.path,'utf8')),row.sha256,row.path);
});
