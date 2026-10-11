import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopExit} from '../src/app/desktop-exit.js';
test('web exit never invokes native APIs or saves',async()=>{
 const exit=createDesktopExit({host:{},hasGame:()=>true,save:()=>{throw Error('unexpected');}});
 assert.equal(await exit(),false);
});
test('native exit waits for committed persistence and coalesces clicks',async()=>{
 const calls=[];let committed;
 const exit=createDesktopExit({host:{__TAURI_INTERNALS__:{invoke:async command=>calls.push(command)}},hasGame:()=>true,save:()=>new Promise(resolve=>{committed=resolve;})});
 const a=exit(),b=exit();assert.equal(a,b);assert.deepEqual(calls,[]);
 committed(true);assert.equal(await a,true);assert.deepEqual(calls,['exit_application']);
});
test('failed save prevents native exit and permits retry',async()=>{
 let saves=0,exits=0;
 const exit=createDesktopExit({host:{__TAURI_INTERNALS__:{invoke:async()=>exits++}},hasGame:()=>true,save:async()=>++saves>1});
 assert.equal(await exit(),false);assert.equal(exits,0);
 assert.equal(await exit(),true);assert.equal(exits,1);
});
test('native failure is reported rather than hidden',async()=>{
 const errors=[];
 const exit=createDesktopExit({host:{__TAURI_INTERNALS__:{invoke:async()=>{throw Error('native failure');}}},onError:e=>errors.push(e.message)});
 assert.equal(await exit(),false);assert.deepEqual(errors,['native failure']);
});
