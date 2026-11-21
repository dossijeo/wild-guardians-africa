import test from 'node:test';import assert from 'node:assert/strict';
import {prepareRemoteImageCopies} from '../src/rendering/remote-image-copy-preparation.js';
test('copy primitives become ready only after their original queue completes and releases private targets',async()=>{
 let drain,closed=0,complete=false;const targets=[],copies=[];
 const device={pushErrorScope(){},popErrorScope:async()=>null,createTexture(descriptor){const t={descriptor,destroyed:false,destroy(){assert(complete,'premature native destruction');this.destroyed=true;}};targets.push(t);return t;},queue:{copyExternalImageToTexture(...args){copies.push(args);},onSubmittedWorkDone:()=>new Promise(resolve=>{drain=()=>{complete=true;resolve();};})}};
 let ready=false;const preparing=prepareRemoteImageCopies(device,{capture:async()=>({close(){closed++;}}),now:()=>10}).then(r=>{ready=true;return r;});
 await new Promise(setImmediate);assert.equal(ready,false);assert.equal(closed,0);assert(targets.every(t=>!t.destroyed));assert.deepEqual(targets.map(t=>t.descriptor.format),['rgba8unorm','rgba8unorm-srgb']);assert.equal(copies.length,2);assert(copies.every(c=>c[0].flipY&&c[1].premultipliedAlpha));
 drain();const receipt=await preparing;assert(receipt.completed);assert.equal(closed,1);assert(targets.every(t=>t.destroyed));
});
test('native copy validation failure cannot announce readiness',async()=>{
 let closed=0,destroyed=0;const device={pushErrorScope(){},popErrorScope:async()=>({message:'invalid target'}),createTexture:()=>({destroy(){destroyed++;}}),queue:{copyExternalImageToTexture(){},onSubmittedWorkDone:async()=>{}}};
 await assert.rejects(prepareRemoteImageCopies(device,{capture:async()=>({close(){closed++;}})}),/invalid target/);assert.equal(closed,1);assert.equal(destroyed,2);
});
test('a partial bootstrap failure drains already-issued work before destroying targets',async()=>{
 let calls=0,drain,completed=false,destroyed=0,closed=0;
 const device={pushErrorScope(){},popErrorScope:async()=>null,createTexture:()=>({destroy(){assert(completed);destroyed++;}}),queue:{copyExternalImageToTexture(){if(++calls===2)throw Error('second copy failed');},onSubmittedWorkDone:()=>new Promise(resolve=>{drain=()=>{completed=true;resolve();};})}};
 const preparing=prepareRemoteImageCopies(device,{capture:async()=>({close(){closed++;}})});const rejected=assert.rejects(preparing,/second copy failed/);
 await new Promise(setImmediate);assert.equal(destroyed,0);assert.equal(closed,0);drain();await rejected;assert.equal(destroyed,2);assert.equal(closed,1);
});
