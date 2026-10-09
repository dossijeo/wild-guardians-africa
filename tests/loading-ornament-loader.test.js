import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingFrameLoader} from '../src/ui/loading-ornament-loader.js';

test('ornament preparation shares one decoded UI image across repeated loading owners',async()=>{
 let created=0,decodes=0,complete;const image={decode:()=>{decodes++;return Promise.resolve();},set src(value){assert.match(value,/loading-ornament-v2.webp$/);complete=()=>this.onload();}};
 const frame={},load=createLoadingFrameLoader(async()=>({frame_center:frame}),{createImage:()=>{created++;return image;}});
 const a=load(),b=load();complete();const [first,second]=await Promise.all([a,b]);assert.equal(created,1);assert.equal(decodes,1);assert.equal(first.loading_ornament,image);assert.equal(second.loading_ornament,image);assert.equal(first.frame_center,frame);assert.equal((await load()).loading_ornament,image);assert.equal(decodes,1);
});

test('failed image decode falls back through the caller and permits a later owner request',async()=>{
 let image,created=0;const load=createLoadingFrameLoader(async()=>({}),{createImage:()=>{created++;return image={decode:()=>{throw Error('decode failed');},set src(value){}};}});
 const pending=load();image.onload();await assert.rejects(pending,/decode failed/);const retry=load();image.decode=()=>Promise.resolve();image.onload();await retry;assert.equal(created,2);
});
