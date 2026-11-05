import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuMangroveGround} from '../src/rendering/webgpu-mangrove-ground.js';

test('shared mangrove material uses the same shader graph without a per-chunk mask',async()=>{
 const old=globalThis.createImageBitmap,closed=[];globalThis.createImageBitmap=async()=>({close(){closed.push(true);}});
 const tile={base:'base',normal:'normal',arh:'arh',scale:1,normalBoost:1},fetchImpl=async url=>url.endsWith('ground-materials.json')?{ok:true,json:async()=>({mangrove:tile})}:{ok:true,blob:async()=>new Blob()},provider=await createWebGpuMangroveGround({fetchImpl});
 try{const material=provider.create({groundMask:new Uint8Array(35*35*4)});assert.equal(material.outputNode,provider.sharedMaterial.outputNode);assert.equal(provider.sharedMaterial.userData.confirmedGroundMask,undefined);assert.ok(material.userData.confirmedGroundMask?.isDataTexture);material.dispose();let disposed=0;provider.sharedMaterial.addEventListener('dispose',()=>disposed++);provider.dispose();provider.dispose();assert.equal(disposed,1);assert.equal(closed.length,3);}finally{provider.dispose();globalThis.createImageBitmap=old;}
});
