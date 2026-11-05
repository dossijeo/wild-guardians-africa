import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuMangroveGround} from '../src/rendering/webgpu-mangrove-ground.js';

test('shared mangrove material uses the same shader graph without a per-chunk mask',async()=>{
 const old=globalThis.createImageBitmap,closed=[];globalThis.createImageBitmap=async()=>({close(){closed.push(true);}});
 const tile={base:'base',normal:'normal',arh:'arh',scale:1,normalBoost:1},fetchImpl=async url=>url.endsWith('ground-materials.json')?{ok:true,json:async()=>({mangrove:tile})}:{ok:true,blob:async()=>new Blob()},provider=await createWebGpuMangroveGround({fetchImpl});
 try{const material=provider.create({groundMask:new Uint8Array(35*35*4)});assert.equal(material.outputNode,provider.sharedMaterial.outputNode);assert.equal(provider.sharedMaterial.userData.confirmedGroundMask,undefined);assert.ok(material.userData.confirmedGroundMask?.isDataTexture);material.dispose();let disposed=0;provider.sharedMaterial.addEventListener('dispose',()=>disposed++);provider.dispose();provider.dispose();assert.equal(disposed,1);assert.equal(closed.length,3);}finally{provider.dispose();globalThis.createImageBitmap=old;}
});

test('ground loads images through the auxiliary loader and closes them on disposal',async()=>{
 const tile={base:'base',normal:'normal',arh:'arh',scale:1,normalBoost:1},images=[],requests=[],fetchImpl=async url=>{assert.ok(url.endsWith('ground-materials.json'));return {ok:true,json:async()=>({mangrove:tile})};},imageLoader=async(url,{signal})=>{requests.push({url,signal});const image={close(){this.closed=true;}};images.push(image);return image;},controller=new AbortController(),provider=await createWebGpuMangroveGround({signal:controller.signal,fetchImpl,imageLoader});
 assert.deepEqual(requests.map(request=>request.url),['base','normal','arh']);assert.ok(requests.every(request=>request.signal===controller.signal));provider.dispose();assert.ok(images.every(image=>image.closed));
});

test('cancelled ground decoding releases all images including a late result',async()=>{
 const tile={base:'base',normal:'normal',arh:'arh',scale:1,normalBoost:1},images=[],controller=new AbortController();let finish;const fetchImpl=async()=>({ok:true,json:async()=>({mangrove:tile})}),imageLoader=async()=>{const image={close(){this.closed=true;}};images.push(image);if(images.length===2)await new Promise(resolve=>{finish=resolve;});return image;},pending=createWebGpuMangroveGround({signal:controller.signal,fetchImpl,imageLoader});
 await new Promise(resolve=>setImmediate(resolve));const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();finish();await rejected;assert.equal(images.length,2);assert.ok(images.every(image=>image.closed));
});
