import test from 'node:test';import assert from 'node:assert/strict';import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';
test('an image capture completing after terminal close cannot post more resource work',async()=>{
 const beforeCanvas=globalThis.OffscreenCanvas,beforeCapture=globalThis.createImageBitmap;
 globalThis.OffscreenCanvas=class {};let complete,closed=0;globalThis.createImageBitmap=()=>new Promise(resolve=>{complete=resolve;});
 const sent=[],port={postMessage:m=>sent.push(m.type)},client=createRemoteWebGpuClient({port,capabilities:{resourceTransportVersion:1},onError(){}});
 try{const texture=client.device.createTexture({size:[1,1],format:'rgba8unorm',usage:18});client.device.queue.copyExternalImageToTexture({source:new OffscreenCanvas()},{texture},[1,1]);await new Promise(setImmediate);client.dispose();complete({close(){closed++;}});await new Promise(setImmediate);assert.equal(closed,1);assert(!sent.slice(sent.indexOf('dispose')+1).includes('operation'),'terminal transport must not post a late bitmap');assert.equal(client.inspect().transportInFlight,0);}
 finally{client.dispose();if(beforeCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=beforeCanvas;if(beforeCapture===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=beforeCapture;}
});
