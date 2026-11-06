import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture} from 'three';
import {prepareWebGpuTexture,releaseAfterWebGpuUploads,releaseAfterWebGpuWork,waitForWebGpuUploads} from '../src/rendering/webgpu-texture-upload.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){let finish,lose,uploads=0,releases=0;const submitted=new Promise(resolve=>{finish=resolve;}),lost=new Promise(resolve=>{lose=resolve;}),texture=new Texture(),renderer={backend:{isWebGPUBackend:true,device:{lost,queue:{onSubmittedWorkDone:()=>submitted}}},initTexture(value){assert.equal(value,texture);uploads++;}},release=()=>{releases++;texture.dispose();};return {renderer,texture,release,finish,lose,get uploads(){return uploads;},get releases(){return releases;}};}
test('a progressive upload wait completes or stops promptly on cancellation or device loss',async()=>{
 const done=fixture(),success=waitForWebGpuUploads(done.renderer);done.finish();await success;
 const cancelled=fixture(),controller=new AbortController(),waiting=waitForWebGpuUploads(cancelled.renderer,{signal:controller.signal}),rejected=assert.rejects(waiting,{name:'AbortError'});controller.abort();await rejected;assert.equal(cancelled.releases,0);
 const lost=fixture(),pending=waitForWebGpuUploads(lost.renderer),failed=assert.rejects(pending,/device lost: destroyed/);lost.lose({reason:'destroyed'});await failed;assert.equal(lost.releases,0);
});
test('upload readiness waits for the submitted work without releasing the texture',async()=>{const f=fixture();let ready=false;const pending=prepareWebGpuTexture(f).then(()=>{ready=true;});await turn();assert.equal(f.uploads,1);assert.equal(ready,false);f.finish();await pending;assert.equal(ready,true);assert.equal(f.releases,0);f.release();});
test('cancellation rejects promptly but retains the texture until queued work completes',async()=>{const f=fixture(),controller=new AbortController(),pending=prepareWebGpuTexture({...f,signal:controller.signal}),rejection=assert.rejects(pending,{name:'AbortError'});controller.abort();await rejection;assert.equal(f.releases,0);f.finish();await turn();assert.equal(f.releases,1);});
test('device loss rejects and releases even if the work completion never arrives',async()=>{const f=fixture(),pending=prepareWebGpuTexture(f),rejection=assert.rejects(pending,/device lost/);f.lose({reason:'destroyed'});await rejection;await turn();assert.equal(f.releases,1);});
test('already cancelled requests release without submitting',async()=>{const f=fixture(),controller=new AbortController();controller.abort();await assert.rejects(prepareWebGpuTexture({...f,signal:controller.signal}),{name:'AbortError'});assert.equal(f.uploads,0);assert.equal(f.releases,1);});
test('a disposed progressive asset retains its resources until submitted uploads settle',async()=>{const f=fixture(),pending=releaseAfterWebGpuUploads(f.renderer,f.release);await turn();assert.equal(f.releases,0);f.finish();await pending;assert.equal(f.releases,1);f.lose({reason:'destroyed'});await turn();assert.equal(f.releases,1);});
test('device loss releases a disposed progressive asset even when uploads never finish',async()=>{const f=fixture(),pending=releaseAfterWebGpuUploads(f.renderer,f.release);f.lose({reason:'destroyed'});await pending;assert.equal(f.releases,1);});
test('shared resources outlive both pending compilation and upload in either order',async()=>{
 for(const uploadFirst of [true,false]){const f=fixture();let compileDone;const admission={deferCompilations:callback=>{compileDone=callback;}};releaseAfterWebGpuWork({renderer:f.renderer,admission,uploadsPending:true,release:f.release});if(uploadFirst){f.finish();await turn();assert.equal(f.releases,0);compileDone();}else{compileDone();assert.equal(f.releases,0);f.finish();await turn();}assert.equal(f.releases,1);f.lose({reason:'destroyed'});await turn();assert.equal(f.releases,1);}
});
