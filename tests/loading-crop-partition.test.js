import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import descriptor from '../content/manifests/crop-partition-runtime.json' with {type:'json'};
import {Assets} from '../src/rendering/assets.js';
import {LoadingTransferOwner} from '../src/app/loading-transfer-owner.js';
import {loadingCropPartitionEnabled,prepareLoadingCropPartition} from '../src/app/loading-crop-partition.js';
import {publishCropPartition} from '../tools/experiments/publish-crop-partition.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),scope={__desktopSmokeStarted:true,__desktopSmokeCropPartition:true};
const manifest=JSON.parse(fs.readFileSync('public'+descriptor.manifest)),deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(t,{manifestRequest}={}){
 const assets=new Assets(),world={assets,loading:new AbortController()},calls=[],previous=()=>null,transfers=new LoadingTransferOwner({expectedBytes:previous});
 const self=globalThis.self,event=globalThis.ProgressEvent;globalThis.self=globalThis;globalThis.ProgressEvent??=class {constructor(type,fields){Object.assign(this,{type},fields);}};
 t.mock.method(globalThis,'fetch',async request=>{const url=typeof request==='string'?request:request.url;calls.push(url);const pathname=new URL(url).pathname,bytes=fs.readFileSync('public'+pathname);assert.equal(transfers.downloads.expectedBytes(url),bytes.length,'size known before original request');return pathname===descriptor.manifest&&manifestRequest?manifestRequest():new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});});
 assets.textures.loadAsync=async()=>new THREE.Texture();
 t.after(()=>{world.loading.abort();transfers.dispose();assets.disposeModels();globalThis.self=self;globalThis.ProgressEvent=event;});
 return {assets,world,transfers,calls,previous};
}
test('selection is strict boolean smoke ownership; ordinary path never reads candidate getter',()=>{
 let reads=0;assert.equal(loadingCropPartitionEnabled({get __desktopSmokeCropPartition(){reads++;throw Error('ordinary');}}),false);assert.equal(reads,0);
 for(const value of [undefined,null,false,0,1,'true',{}])assert.equal(loadingCropPartitionEnabled({__desktopSmokeStarted:true,__desktopSmokeCropPartition:value}),false);
 assert.equal(loadingCropPartitionEnabled(scope),true);
});
test('one prepared owner supplies exact pending bytes, actual maize cache reuse and all40/32 completion',async t=>{
 const f=fixture(t),partition=await prepareLoadingCropPartition(f.world,f.transfers,{scope});assert.strictEqual(f.world.cropPartition,partition);
 await partition.models('maize');await partition.bridges(JSON.parse(fs.readFileSync('public/content/crop-bridges.json')),'maize');
 await partition.models('all');await partition.bridges(JSON.parse(fs.readFileSync('public/content/crop-bridges.json')),'all');
 assert.equal(f.calls.length,5);assert.equal(new Set(f.calls).size,5);assert.ok(f.calls.every(url=>url.includes('/crop-partition-v1-')));
 assert.equal(f.transfers.downloads.snapshot().pending,0);assert.equal([...f.transfers.downloads.requests.values()].filter(row=>row.cache==='application-cache').length,2);
 f.world.loading.abort();assert.equal(partition.closed,true);assert.equal(f.world.cropPartition,null);assert.strictEqual(f.transfers.downloads.expectedBytes,f.previous);
});
test('abort during original manifest request prevents late owner adoption and restores estimator',async t=>{
 const pending=deferred(),f=fixture(t,{manifestRequest:()=>pending.promise}),loading=prepareLoadingCropPartition(f.world,f.transfers,{scope}),rejected=assert.rejects(loading,/cancelled/);
 f.world.loading.abort();assert.strictEqual(f.transfers.downloads.expectedBytes,f.previous);pending.resolve(new Response(JSON.stringify(manifest)));await rejected;
 assert.equal(f.world.cropPartition,undefined);assert.equal(f.calls.length,1);
});
test('failed manifest restores estimator and explicit retry creates one fresh owner',async t=>{
 let fail=true;const f=fixture(t,{manifestRequest:()=>{if(fail)throw Error('manifest failure');return new Response(JSON.stringify(manifest));}});
 await assert.rejects(prepareLoadingCropPartition(f.world,f.transfers,{scope}),/manifest failure/);assert.strictEqual(f.transfers.downloads.expectedBytes,f.previous);fail=false;
 await prepareLoadingCropPartition(f.world,f.transfers,{scope});assert.equal(f.calls.length,2);assert.equal(f.calls[0],f.calls[1]);
});
test('cancel during selected parser await rejects late GLB adoption without resurrecting model cache',async t=>{
 const f=fixture(t),partition=await prepareLoadingCropPartition(f.world,f.transfers,{scope}),pending=deferred(),started=deferred();f.assets.textures.loadAsync=()=>{started.resolve();return pending.promise;};
 const loading=partition.models('maize'),rejected=assert.rejects(loading,/cancelled/);await started.promise;f.world.loading.abort();pending.resolve(new THREE.Texture());await rejected;assert.equal(f.assets.modelSources.size,0);assert.equal(f.world.cropPartition,null);
});
test('restore is identity guarded and disposed/replaced owners cannot be adopted',async t=>{
 const pending=deferred(),f=fixture(t,{manifestRequest:()=>pending.promise}),loading=prepareLoadingCropPartition(f.world,f.transfers,{scope}),rejected=assert.rejects(loading,/cancelled/),replacement=()=>42;
 f.transfers.downloads.expectedBytes=replacement;f.world.disposed=true;pending.resolve(new Response(JSON.stringify(manifest)));await rejected;assert.strictEqual(f.transfers.downloads.expectedBytes,replacement);assert.equal(f.world.cropPartition,undefined);
});
test('OFF or combined recipes reject before requests or estimator mutation',async t=>{
 const f=fixture(t);await assert.rejects(prepareLoadingCropPartition(f.world,f.transfers,{scope:{}}),/ownership/);
 for(const flag of ['__desktopSmokeWallBufferPackage','__desktopSmokeCompileWindow','__desktopSmokeResourceOverlap','__desktopSmokeSerialImageChain'])await assert.rejects(prepareLoadingCropPartition(f.world,f.transfers,{scope:{...scope,[flag]:true}}),/isolated/);
 assert.equal(f.calls.length,0);assert.strictEqual(f.transfers.downloads.expectedBytes,f.previous);
});
test('immutable publication hashes/sizes, relative URLs and original full assets preserved',()=>{
 const bytes=fs.readFileSync('public'+descriptor.manifest);assert.equal(bytes.length,descriptor.manifestBytes);assert.equal(sha(bytes),descriptor.manifestSha256);assert.ok(descriptor.manifest.includes(descriptor.manifestSha256.slice(0,20)));
 const base=path.dirname('public'+descriptor.manifest);for(const record of [...manifest.partitions,...manifest.textures]){const file=record.file??record.uri;assert.ok(!file.startsWith('/')&&!file.includes('..'));const payload=fs.readFileSync(path.join(base,file));assert.equal(payload.length,record.bytes);assert.equal(sha(payload),record.sha256);}
 const offline=JSON.parse(fs.readFileSync('docs/qa/windows-loading-regression/maize-partition-offline/partition-manifest.json'));for(const original of Object.values(offline.sources))assert.equal(sha(fs.readFileSync('public/'+original.runtime)),original.sha256);
 const again=publishCropPartition();assert.deepEqual(again.descriptor,descriptor);assert.deepEqual(again.manifest,manifest);assert.equal(again.totalBytes,40848807);
});
test('App OFF prepare unchanged and CLI/workflow/recipe explicitly guard both original gates',()=>{
 const read=file=>fs.readFileSync(file,'utf8'),app=read('src/app/main.js'),old=execFileSync('git',['show','0a416fd3:src/app/main.js'],{encoding:'utf8'});
 const normal=app.replace("import {loadingCropPartitionEnabled,prepareLoadingCropPartition} from './loading-crop-partition.js';\n",'').replace('const dioramaPending=loadingCropPartitionEnabled()?prepareLoadingCropPartition(owner,transfers).then(()=>diorama.prepare()):diorama.prepare();preparation.pending=Promise.all([dioramaPending,prepareLoadingFrames(','preparation.pending=Promise.all([diorama.prepare(),prepareLoadingFrames(');
 assert.equal(normal.replaceAll('\r\n','\n'),old.replaceAll('\r\n','\n'));
 const rust=read('src-tauri/src/main.rs'),workflow=read('.github/workflows/windows.yml'),smoke=read('src-tauri/smoke.js');assert.ok(rust.indexOf('arg == "--smoke-report"')<rust.indexOf('let crop_partition'));assert.match(rust,/--smoke-crop-partition/);assert.match(smoke,/cropPartition:window.__desktopSmokeCropPartition===true/);
 assert.match(workflow,/crop_partition:[\s\S]*?type: boolean\s+default: false/);assert.equal(workflow.match(/\$smokeArgs \+= '--smoke-crop-partition'/g).length,2);assert.match(smoke,/worldEnd = worldStartedAt \+ 90000/);assert.match(smoke,/await wait\(300000\)/);assert.match(workflow,/WaitForExit\(900000\)/);
});
