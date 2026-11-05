import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture} from 'three';
import {prepareWebGpuTexture} from '../src/rendering/webgpu-texture-upload.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){let finish,lose,uploads=0,releases=0;const submitted=new Promise(resolve=>{finish=resolve;}),lost=new Promise(resolve=>{lose=resolve;}),texture=new Texture(),renderer={backend:{isWebGPUBackend:true,device:{lost,queue:{onSubmittedWorkDone:()=>submitted}}},initTexture(value){assert.equal(value,texture);uploads++;}},release=()=>{releases++;texture.dispose();};return {renderer,texture,release,finish,lose,get uploads(){return uploads;},get releases(){return releases;}};}
test('upload readiness waits for the submitted work without releasing the texture',async()=>{const f=fixture();let ready=false;const pending=prepareWebGpuTexture(f).then(()=>{ready=true;});await turn();assert.equal(f.uploads,1);assert.equal(ready,false);f.finish();await pending;assert.equal(ready,true);assert.equal(f.releases,0);f.release();});
test('cancellation rejects promptly but retains the texture until queued work completes',async()=>{const f=fixture(),controller=new AbortController(),pending=prepareWebGpuTexture({...f,signal:controller.signal}),rejection=assert.rejects(pending,{name:'AbortError'});controller.abort();await rejection;assert.equal(f.releases,0);f.finish();await turn();assert.equal(f.releases,1);});
test('device loss rejects and releases even if the work completion never arrives',async()=>{const f=fixture(),pending=prepareWebGpuTexture(f),rejection=assert.rejects(pending,/device lost/);f.lose({reason:'destroyed'});await rejection;await turn();assert.equal(f.releases,1);});
test('already cancelled requests release without submitting',async()=>{const f=fixture(),controller=new AbortController();controller.abort();await assert.rejects(prepareWebGpuTexture({...f,signal:controller.signal}),{name:'AbortError'});assert.equal(f.uploads,0);assert.equal(f.releases,1);});
