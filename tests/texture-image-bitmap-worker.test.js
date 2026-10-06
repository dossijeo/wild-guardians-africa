import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../tools/experiments/texture-image-bitmap-worker.js',import.meta.url),'utf8');
test('worker measures fetch, body and bitmap phases and transfers its bitmap',async()=>{
 let tick=0,message,transfer;const blob={},bitmap={},options={imageOrientation:'flipY'},self={postMessage:(value,list)=>{message=value;transfer=list;}};
 vm.runInNewContext(source,{self,performance:{timeOrigin:1000,now:()=>tick+=10},fetch:async url=>{assert.equal(url,'image.webp');return {ok:true,blob:async()=>blob};},createImageBitmap:async(value,opts)=>{assert.equal(value,blob);assert.equal(opts,options);return bitmap;}});
 await self.onmessage({data:{url:'image.webp',options}});assert.equal(message.bitmap,bitmap);assert.equal(transfer[0],bitmap);
 assert.equal(message.timing.receivedEpochMs,1010);assert.equal(message.timing.fetchHeadersMs,10);assert.equal(message.timing.fetchBodyMs,10);assert.equal(message.timing.bitmapMs,10);assert.equal(message.timing.workerTotalMs,30);assert.equal(message.timing.postEpochMs,1050);
});
test('worker rejects an HTTP failure before decoding',async()=>{
 let message,decoded=false;const self={postMessage:value=>message=value};
 vm.runInNewContext(source,{self,performance:{timeOrigin:0,now:()=>0},fetch:async()=>({ok:false,status:404}),createImageBitmap:async()=>{decoded=true;}});
 await self.onmessage({data:{url:'missing.webp'}});assert.match(message.error,/404/);assert.equal(decoded,false);
});
