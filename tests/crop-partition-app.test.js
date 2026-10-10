import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
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
test('App retains current main rules and gates outside partition selection and opt-in visual connection',()=>{
 const base=execFileSync('git',['show','0e94d7be:src/app/main.js'],{encoding:'utf8'});
 const actual=readFileSync('src/app/main.js','utf8').replace("import {installLoadingVisualQa} from './loading-visual-bridge.js';\n",'').replace(',visual:installLoadingVisualQa(owner,diorama)','').replace('pending.visual?.close({cancelled:true});','').replace('loadingDiorama?.visualQa?.close({cancelled:true});','').replace('prepared.visual?.close();','').replace("import {prepareLoadingCropPartition} from './loading-crop-partition.js';\n",'').replace('prepareLoadingCropPartition(owner).then(()=>diorama.prepare())','diorama.prepare()');
 assert.equal(actual.replaceAll('\r\n','\n'),base.replaceAll('\r\n','\n'));
 for(const file of ['src/rendering/scene.js','src/rendering/loading-programs.js','src/rendering/loading-yield-budget.js','src/app/loading-downloads.js','public/menu/native.js','src/ui/menu-integration.js','src/simulation/game.js','src-tauri/smoke.js','src-tauri/src/main.rs','.github/workflows/windows.yml'])assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),execFileSync('git',['show',(['src-tauri/smoke.js','src-tauri/src/main.rs'].includes(file)?'8fb7f437:':'0e94d7be:')+file],{encoding:'utf8'}).replaceAll('\r\n','\n'),file);
});
