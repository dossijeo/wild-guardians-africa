import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createSharedCameraMailbox} from '../src/rendering/shared-camera-mailbox.js';

const pose={x:1,y:2,z:3,targetX:4,targetY:5,targetZ:6,fov:45,near:.1,far:1000};
test('camera mailbox publishes the latest complete version without waiting',()=>{
 const box=createSharedCameraMailbox(),reader=createSharedCameraMailbox(box.buffer);
 assert.equal(reader.read(),null);
 box.write(pose,1);box.write({...pose,x:9},2147483648);
 assert.deepEqual(reader.read(),{version:2147483648,pose:{...pose,x:9}});
 const header=new Int32Array(box.buffer,0,2);Atomics.add(header,0,1);
 assert.equal(reader.read(),null);
 Atomics.add(header,0,1);assert.equal(reader.read().version,2147483648);
 assert.throws(()=>box.write({...pose,x:NaN},2),/Invalid/);
});
test('camera mailbox is shared with a real Worker and retains only the newest pose',async()=>{
 const box=createSharedCameraMailbox(),url=new URL('../src/rendering/shared-camera-mailbox.js',import.meta.url);
 const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads'); import(workerData.url).then(({createSharedCameraMailbox})=>{const box=createSharedCameraMailbox(workerData.buffer);parentPort.on('message',()=>parentPort.postMessage(box.read()));});`,{eval:true,workerData:{url:url.href,buffer:box.buffer}});
 try{box.write(pose,1);box.write({...pose,z:42},2);const result=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});worker.postMessage('read');assert.deepEqual(await result,{version:2,pose:{...pose,z:42}});}finally{await worker.terminate();}
});
