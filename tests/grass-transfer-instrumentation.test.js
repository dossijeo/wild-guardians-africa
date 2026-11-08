import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {instrumentGrassQueue} from '../tools/experiments/grass-worker-transfer-instrumentation.mjs';

test('QA transfer instrumentation requires current queue anchors',async()=>{
 const queue=await readFile(new URL('../src/rendering/grass-generation-queue.js',import.meta.url),'utf8');
 assert.match(instrumentGrassQueue(queue),/qaTransfer:structuredClone\(qa\)/);
 assert.throws(()=>instrumentGrassQueue(queue.replace('const snapshot=structuredClone(request),id=++nextId;','changed')),/anchor missing/);
});

test('instrumented queue counts clones, posts, returned bytes and retained snapshots',async()=>{
 const source=await readFile(new URL('../src/rendering/grass-generation-queue.js',import.meta.url),'utf8');
 const url=pathToFileURL(process.cwd()+'/src/simulation/retained-size.js').href,code=instrumentGrassQueue(source).replace("'/src/simulation/retained-size.js'",JSON.stringify(url));
 const {createGrassGenerationQueue}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')),listeners=new Map(),messages=[];
 const worker={addEventListener:(name,fn)=>listeners.set(name,fn),postMessage:message=>messages.push(message),terminate(){}};
 const queue=createGrassGenerationQueue(worker),first=queue.submit('a',{data:new Uint8Array(32)}),second=queue.submit('b',{data:new Uint8Array(64)});
 assert.equal(queue.status().qaTransfer.submissions,2);assert.equal(queue.status().qaTransfer.peakQueued,1);assert.ok(queue.status().qaTransfer.peakRetainedBytes>=96);
 listeners.get('message')({data:{id:messages[0].id,result:{anchors:new Float32Array(4),values:new Float32Array(4),slopes:new Float32Array(2)}}});await first;
 listeners.get('message')({data:{id:messages[1].id,result:{anchors:new Float32Array(0),values:new Float32Array(0),slopes:new Float32Array(0)}}});await second;
 const metrics=queue.status().qaTransfer;assert.equal(metrics.cloneMs.length,2);assert.equal(metrics.postMs.length,2);assert.equal(metrics.roundTripMs.length,2);assert.deepEqual(metrics.resultBytes,[40,0]);queue.dispose();
});
