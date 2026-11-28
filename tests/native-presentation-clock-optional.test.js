import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,flush} from '../tests/helpers/remote-webgpu-fixture.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
const paused=elapsed=>({version:1,epoch:0,elapsed,safeUntil:elapsed,anchorAbsoluteMs:0,paused:true,segments:[]});
async function submit(f,metadata={}){const receipt=f.frame(7,metadata);await flush();await f.host.idle();f.host.present();return receipt;}

test('an untimed submitted frame and replay omit presentation time; a later clock at zero publishes its real time',async()=>{
 const f=await fixture({}, {absoluteNow:()=>0});try{
  const receipt=await submit(f);assert.equal(receipt.sequence,1);f.host.present();
  const untimed=f.host.inspect();assert.equal(untimed.failed,false);assert.equal(f.gpu.submitted.length,2);assert.equal(untimed.nativeRouteFrame.clockElapsed,null);
  assert.equal(Object.hasOwn(untimed.nativeRouteFrame,'presentationElapsed'),false);assert.throws(()=>captureNativeRoutePickFrame(untimed),/unavailable/);
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'absolute',epoch:0});await submit(f,{clock:paused(0)});
  const timed=f.host.inspect();assert.equal(timed.failed,false);assert.equal(timed.nativeRouteFrame.presentationElapsed,0);assert.equal(captureNativeRoutePickFrame(timed).getPresentationTime(),new Float32Array(f.gpu.buffers[0].data.buffer)[1]);
  const legacy={...timed,nativeRouteFrame:{...timed.nativeRouteFrame}};delete legacy.nativeRouteFrame.presentationElapsed;
  assert.throws(()=>captureNativeRoutePickFrame(legacy).getPresentationTime(),/No submitted presentation clock/);assert.deepEqual(f.errors,[]);
 }finally{f.client.dispose();await f.host.dispose();}
});

test('a failed later timed submit retains the untimed witness and never invents a presentation time',async()=>{
 const f=await fixture({}, {absoluteNow:()=>0});try{
  await submit(f);const before=f.host.inspect().nativeRouteFrame;
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'absolute',epoch:0});
  const receipt=f.frame(9,{clock:paused(.25)}),rejected=assert.rejects(receipt,/submit|failed/i);
  await flush();await f.host.idle();f.gpu.device.queue.submit=()=>{throw Error('intentional submit failure');};f.host.present();await rejected;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[1],.25,'a uniform upload alone is not a submitted image');
  assert.equal(f.host.inspect().failed,true);assert.deepEqual(f.host.inspect().nativeRouteFrame,before);assert.equal(Object.hasOwn(before,'presentationElapsed'),false);assert.throws(()=>captureNativeRoutePickFrame(f.host.inspect()),/unavailable/);
 }finally{f.client.dispose();await f.host.dispose();}
});
