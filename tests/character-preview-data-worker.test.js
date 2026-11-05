import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {Worker} from 'node:worker_threads';
import {createCharacterPreviewDataClient} from '../src/rendering/character-preview-worker-client.js';

test('auxiliary worker verifies and transfers real character packages',async()=>{
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/content/character-preview/')||path.includes('..'))throw Error('Invalid path');const bytes=await readFile('public'+path);res.writeHead(200,{'content-length':bytes.length});res.end(bytes);}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
 const moduleUrl=new URL('../src/rendering/character-preview-data-worker.js',import.meta.url).href,code=`import {parentPort} from 'node:worker_threads';import {webcrypto} from 'node:crypto';if(!globalThis.crypto)globalThis.crypto=webcrypto;globalThis.self={postMessage:(value,transfer)=>parentPort.postMessage(value,transfer)};await import(${JSON.stringify(moduleUrl)});parentPort.on('message',data=>self.onmessage({data}));`,nodeWorker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(code)),{type:'module'}),adapter={postMessage:value=>nodeWorker.postMessage(value),terminate:()=>nodeWorker.terminate()};nodeWorker.on('message',data=>adapter.onmessage?.({data}));nodeWorker.on('error',error=>adapter.onerror?.({message:error.message}));const client=createCharacterPreviewDataClient({workerFactory:()=>adapter});
 try{const base=`http://127.0.0.1:${server.address().port}/content/character-preview/`,[hyena,worker]=await Promise.all([client.open(base+'hyena/package.json'),client.open(base+'youngMale/package.json')]);assert.equal(hyena.id,'hyena');assert.equal(worker.id,'youngMale');const [preview,metadata]=await Promise.all([hyena.loadPreview(),hyena.loadMetadata()]);assert.ok(preview.byteLength>1000);const textures=await hyena.loadTextures(metadata);assert.equal(textures.size,metadata.texturePaths.length);assert.ok([...textures.values()].every(bytes=>bytes.byteLength>0));hyena.close();const workerPreview=await worker.loadPreview();assert.ok(workerPreview.byteLength>1000);worker.close();}
 finally{client.dispose();await new Promise(resolve=>server.close(resolve));}
});
