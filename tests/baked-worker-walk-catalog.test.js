import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {BAKED_WORKER_WALK_PROFILES,loadBakedWorkerWalkAsset,createBakedWorkerWalkBank,createBakedWorkerDigBank} from '../src/rendering/baked-worker-walk-catalog.js';
import {createBakedWorkerDigTexture} from '../src/rendering/webgpu-baked-walk.js';

test('repair banks load every real profile, share resources and validate hoe channels',async()=>{
 const fetcher=async url=>{const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
 const load=(profile,options)=>loadBakedWorkerWalkAsset(profile,{...options,fetcher,subtle:webcrypto.subtle}),bank=createBakedWorkerDigBank({load});
 try{for(const profile of BAKED_WORKER_WALK_PROFILES){const [bake,shared]=await Promise.all([bank.get(profile),bank.get(profile)]);assert.equal(bake,shared);assert.equal(bake.meta.clip,'Dig');assert.equal(bake.meta.attachments.length,4);assert.ok(bake.meta.attachments.every(item=>item.parent==='Prop_Hoe'));const changed=structuredClone(bake.meta);changed.attachments[0].parent='Other';assert.throws(()=>createBakedWorkerDigTexture(changed,new ArrayBuffer(changed.byteLength)),/repair/);}}finally{bank.dispose();}
});

test('all worker walking assets are bound to their source and pass checksum validation',async()=>{
 const fetcher=async url=>{const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
 for(const profile of BAKED_WORKER_WALK_PROFILES){const bake=await loadBakedWorkerWalkAsset(profile,{fetcher,subtle:webcrypto.subtle});assert.equal(bake.meta.species,profile);assert.equal(bake.meta.validation.visibleAttachments,0);bake.dispose();}
});

test('worker bank verifies authoring and shares the texture until closed',async()=>{
 let requests=0;const fetcher=async url=>{requests++;const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
 const load=(profile,options)=>loadBakedWorkerWalkAsset(profile,{...options,fetcher,subtle:webcrypto.subtle}),bank=createBakedWorkerWalkBank({load});const [first,second]=await Promise.all([bank.get('youngMale'),bank.get('youngMale')]);assert.equal(first,second);assert.equal(requests,3);assert.equal(first.meta.validation.visibleAttachments,0);await assert.rejects(bank.get('oldMale'),/Unknown/);let disposed=0;first.texture.addEventListener('dispose',()=>disposed++);bank.close();await assert.rejects(bank.get('youngMale'),/disposed/);assert.equal(disposed,0);bank.dispose();assert.equal(disposed,1);bank.dispose();assert.equal(disposed,1);
});
test('worker bake rejects changed bytes and unknown profiles',async()=>{
 const fetcher=async url=>{const data=await readFile('public'+url);if(url.endsWith('.bin'))data[0]^=1;return {ok:true,json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
 await assert.rejects(loadBakedWorkerWalkAsset('youngMale',{fetcher,subtle:webcrypto.subtle}),/checksum/);await assert.rejects(loadBakedWorkerWalkAsset('oldMale',{fetcher,subtle:webcrypto.subtle}),/Invalid/);
});

test('closing the graphics owner defers worker texture release through pending compilation',async()=>{
 const {closeBakedWalkResources}=await import('../src/rendering/baked-walk-catalog.js');let closed=0,disposed=0,release;const workerBank={close(){closed++},dispose(){disposed++}},admission={dispose(){},deferCompilations(fn){release=fn}};
 const workerRunBank={close(){closed++},dispose(){disposed++}},workerHarvestBank={close(){closed++},dispose(){disposed++}},workerIdleBank={close(){closed++},dispose(){disposed++}},workerDigBank={close(){closed++},dispose(){disposed++}};closeBakedWalkResources({workerBank,workerRunBank,workerHarvestBank,workerIdleBank,workerDigBank,admission});assert.equal(closed,5);assert.equal(disposed,0);release();assert.equal(disposed,5);
});
