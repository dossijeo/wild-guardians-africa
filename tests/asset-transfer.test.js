import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribeAssetTransfers,beginAssetTransfer,updateAssetTransfer,finishAssetTransfer,readAssetBody,observeLoadingManager,cachedAssetTransfer} from '../src/rendering/asset-transfer.js';
import {bytes,json} from '../src/rendering/asset-fetch.js';

test('telemetry forwards the single body stream without a duplicate request or read',async t=>{
 const events=[],release=subscribeAssetTransfers(e=>events.push(e));t.after(release);
 let fetches=0,pulls=0;const chunks=[Uint8Array.of(1,2),Uint8Array.of(3,4,5)];
 t.mock.method(globalThis,'fetch',async()=>{fetches++;return new Response(new ReadableStream({pull(c){pulls++;const part=chunks.shift();if(part)c.enqueue(part);else c.close();}}),{headers:{'Content-Length':'5'}});});
 assert.deepEqual(new Uint8Array(await bytes('/asset.bin')),Uint8Array.of(1,2,3,4,5));assert.equal(fetches,1);assert.equal(pulls,3);
 assert.deepEqual(events.filter(e=>e.type==='progress').map(e=>[e.loaded,e.total,e.evidence]),[[2,5,'decoded-content-length'],[5,5,'decoded-content-length']]);assert.equal(events.at(-1).type,'end');assert.equal(events.at(-1).loaded,5);
});
test('compressed or chunked bodies do not compare decoded bytes with wire totals',async t=>{
 const events=[],release=subscribeAssetTransfers(e=>events.push(e));t.after(release);
 t.mock.method(globalThis,'fetch',async()=>new Response('{"value":7}',{headers:{'Content-Encoding':'gzip','Content-Length':'4'}}));
 assert.deepEqual(await json('/chunked.json'),{value:7});assert.equal(events.find(e=>e.type==='progress').total,null);
});
test('no observer preserves the original direct response read, and detached owners ignore late callbacks',async()=>{
 let reads=0;assert.equal(beginAssetTransfer('/empty'),null);assert.equal(await readAssetBody({arrayBuffer(){reads++;return 42;}},'arrayBuffer',null),42);assert.equal(reads,1);
 const events=[],release=subscribeAssetTransfers(e=>events.push(e)),token=beginAssetTransfer('/late');release();updateAssetTransfer(token,10,20);finishAssetTransfer(token);assert.deepEqual(events.map(e=>e.type),['start']);
});
test('observer failures cannot alter asset decoding and blob URLs are not downloads',async()=>{
 const release=subscribeAssetTransfers(()=>{throw Error('observer');});try{assert.equal(beginAssetTransfer('blob:owned'),null);const token=beginAssetTransfer('/ok');assert.deepEqual(new Uint8Array(await readAssetBody(new Response(Uint8Array.of(7)),'arrayBuffer',token)),Uint8Array.of(7));finishAssetTransfer(token);}finally{release();}
});
test('manager preserves native counters, skips synthetic GLTF sentinels, and reports failures once',()=>{
 const events=[],calls=[],release=subscribeAssetTransfers(e=>events.push(e));try{
 const manager={itemStart:u=>calls.push(['start',u]),itemEnd:u=>calls.push(['end',u]),itemError:u=>calls.push(['error',u])},owner=observeLoadingManager(manager,{skip:u=>u==='model.glb'});
 manager.itemStart('model.glb');manager.itemStart('image.png');manager.itemError('image.png');manager.itemEnd('image.png');manager.itemEnd('model.glb');
 assert.deepEqual(calls,[['start','model.glb'],['start','image.png'],['error','image.png'],['end','image.png'],['end','model.glb']]);assert.equal(events.filter(e=>e.type==='start').length,1);assert.equal(events.at(-1).failed,true);owner.release();
 }finally{release();}
});
test('application cache events carry explicit evidence rather than fast request duration',()=>{const events=[],release=subscribeAssetTransfers(e=>events.push(e));try{cachedAssetTransfer('/resident.glb');assert.deepEqual(events.map(e=>e.type),['start','cache']);}finally{release();}});
