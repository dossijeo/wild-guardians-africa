import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuMudMaterial} from '../src/rendering/webgpu-mud-material.js';

const fetchImpl=async()=>({ok:true,json:async()=>({mangrove:{mudPatches:{base:'/assets/a.jpg',normal:'/assets/b.jpg',arh:'/assets/c.jpg'}}})});
test('mud material shares uploaded maps and releases its own assets once',async()=>{
 const images=[],uploads=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}}}},initTexture(texture){uploads.push(texture);}},asset=await createWebGpuMudMaterial({renderer,fetchImpl,imageLoader:async()=>{const image={closed:0,close(){this.closed++;}};images.push(image);return image;}});
 assert.equal(uploads.length,3);assert.equal(asset.material.map,uploads[0]);assert.equal(asset.material.roughnessMap,uploads[2]);assert.equal(asset.material.aoMap,uploads[2]);asset.dispose();asset.dispose();assert.deepEqual(images.map(image=>image.closed),[1,1,1]);
});
test('a later decode failure releases previously prepared images',async()=>{
 const images=[],renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}}}},initTexture(){}};let n=0;await assert.rejects(createWebGpuMudMaterial({renderer,fetchImpl,imageLoader:async()=>{if(++n===2)throw Error('decode');const image={closed:0,close(){this.closed++;}};images.push(image);return image;}}),/decode/);assert.equal(images[0].closed,1);
});
