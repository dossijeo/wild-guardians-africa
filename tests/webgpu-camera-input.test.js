import test from 'node:test';
import assert from 'node:assert/strict';
import {installWebGpuCameraInput} from '../src/app/webgpu-camera-input.js';

function fixture(){
 const listeners=new Set(),tasks=[];let current=null;
 const controls={addEventListener(type,fn){assert.equal(type,'change');listeners.add(fn);},removeEventListener(type,fn){assert.equal(type,'change');listeners.delete(fn);}};
 const release=installWebGpuCameraInput({controls,context:()=>current,schedule:fn=>tasks.push(fn)});
 return {release,set(value){current=value;},change(){for(const fn of listeners)fn();},flush(){while(tasks.length)tasks.shift()();},tasks,listeners};
}

test('camera input waits for terrain correction and coalesces changes',()=>{
 const f=fixture(),sent=[];let y=-2;f.set({sync:()=>sent.push(y)});f.change();f.change();assert.equal(f.tasks.length,1);y=3;assert.deepEqual(sent,[]);f.flush();assert.deepEqual(sent,[3]);f.release();
});
test('drops pending camera changes when world or worker is replaced',()=>{
 const f=fixture(),sent=[];const first={sync:()=>sent.push('first')},second={sync:()=>sent.push('second')};f.set(first);f.change();f.set(second);f.flush();assert.deepEqual(sent,[]);f.change();f.flush();assert.deepEqual(sent,['second']);f.set(null);f.change();f.flush();assert.deepEqual(sent,['second']);f.release();
});
test('removal invalidates an already scheduled change',()=>{
 const f=fixture();let calls=0;f.set({sync:()=>calls++});f.change();f.release();f.release();f.flush();assert.equal(calls,0);assert.equal(f.listeners.size,0);
});
