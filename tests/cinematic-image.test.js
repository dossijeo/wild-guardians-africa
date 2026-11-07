import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCinematicImage} from '../src/ui/cinematic-image.js';

test('pending cinematic image is cancelled and releases its source',async()=>{
 const controller=new AbortController(),image={naturalWidth:100,decode:()=>new Promise(()=>{}),removeAttribute(name){this.removed=name;}};
 const pending=loadCinematicImage('/scene.webp',{signal:controller.signal,createImage:()=>image});
 controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(image.removed,'src');
});

test('a decoded image remains usable after the cinematic loading signal is aborted',async()=>{
 const controller=new AbortController(),image={naturalWidth:100,decode:async()=>{},removeAttribute(){throw Error('presented image must remain intact');}};
 assert.equal(await loadCinematicImage('/scene.webp',{signal:controller.signal,createImage:()=>image}),image);
 controller.abort();
});

test('fallback loading completes only on load, and already cancelled requests never create images',async()=>{
 const controller=new AbortController(),image={naturalWidth:4,removeAttribute(){}},pending=loadCinematicImage('/scene.webp',{signal:controller.signal,createImage:()=>image});
 image.onload();assert.equal(await pending,image);
 controller.abort();await assert.rejects(loadCinematicImage('/scene.webp',{signal:controller.signal,createImage:()=>{throw Error('must not create');}}),{name:'AbortError'});
});
