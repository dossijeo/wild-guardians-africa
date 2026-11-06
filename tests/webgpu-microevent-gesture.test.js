import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {Microevents} from '../src/microevents/controller.js';
import {PointerTrace} from '../src/microevents/pointer-trace.js';
import {EVENTS} from '../src/microevents/definitions.js';

test('worker microevent gesture waits for visible, current target and never claims after release',async()=>{
 let resolve,claimed=0,released=0;const camera=new PerspectiveCamera(),canvas={setPointerCapture(){},releasePointerCapture(){released++;}},particle={x:1,y:2,progress:0,reveal:1},active={def:{},anchor:{}},c=Object.create(Microevents.prototype);Object.assign(c,{world:{camera,canvas,webGpuWorld:{client:{microeventVisible:()=>new Promise(r=>resolve=r)}}},space:{worldPosition:()=>new Vector3(1,2,3)},particles:{pool:[particle],claim(){claimed++;}},active,pointer:{},owned:new Set(),trace:new PointerTrace(),director:{interaction(){}},metrics:{},blocked:()=>[]});const event={pointerId:1,clientX:10,clientY:10,preventDefault(){},stopImmediatePropagation(){}};
 c.beginWorkerGesture(event,active,0,1,2,0);assert.equal(claimed,0);resolve(true);await Promise.resolve();assert.equal(claimed,1);assert.equal(c.pointer.owned,true);c.owned.clear();c.pointer.owned=false;
 c.beginWorkerGesture(event,active,0,1,2,0);c.input('pointerup',event);resolve(true);await Promise.resolve();assert.equal(claimed,1);assert.equal(c.owned.size,0);assert.ok(released>0);
 c.beginWorkerGesture(event,active,0,1,2,0);camera.position.x=1;resolve(true);await Promise.resolve();assert.equal(claimed,1);assert.equal(c.owned.size,0);
});

test('worker spawn cancels the authority reservation if the anchor becomes occluded',async()=>{
 const camera=new PerspectiveCamera(),plant={id:'p',alive:true,x:1,z:2},state={time:100,biome:'sabana',plants:[plant],commandIds:[]},results=[true,false],calls=[],c=Object.create(Microevents.prototype);Object.assign(c,{state,world:{workerGpuOnly:true,camera,webGpuWorld:{client:{microeventVisible:async()=>results.shift()}}},settings:{microevents:'adaptive'},space:{begin(){},},point:new Vector3(),billboards:{ready:Promise.resolve()},particles:{start(){throw Error('occluded event started');}},director:{m:{negativeTimes:[],eventCooldowns:{}},reserve(){},begin(){},random:()=>.5},workerEconomy:{async reserve(){calls.push('reserve');return {id:'micro:1'};},async schedule(){},async settle(ticket,outcome){calls.push(outcome);}},save:async()=>true,owned:new Set(),cameraPointers:new Set(),clock:()=>0,project:()=>({x:200,y:200}),blocked:()=>[],log(){}});
 assert.equal(await c.spawn(EVENTS.seeds,{entity:plant,groundY:0,y:1},{force:true}),false);assert.deepEqual(calls,['reserve','cancelled']);assert.equal(c.active,undefined);assert.equal(c.pending,false);
});

test('failed visibility releases the pointer and does not claim a microevent',async()=>{
 const canvas={setPointerCapture(){},releasePointerCapture(){this.released=true;}},particle={x:1,y:2,progress:0,reveal:1},active={def:{}},c=Object.create(Microevents.prototype);let claimed=0;Object.assign(c,{world:{camera:new PerspectiveCamera(),canvas,webGpuWorld:{client:{microeventVisible:()=>Promise.reject(Error('timed out'))}}},space:{worldPosition:()=>new Vector3(1,2,3)},particles:{pool:[particle],claim(){claimed++;}},active,pointer:{},owned:new Set(),trace:new PointerTrace(),director:{interaction(){}},metrics:{},blocked:()=>[]});c.beginWorkerGesture({pointerId:1,clientX:10,clientY:10,preventDefault(){},stopImmediatePropagation(){}},active,0,1,2,0);await Promise.resolve();await Promise.resolve();assert.equal(claimed,0);assert.equal(c.owned.size,0);assert.equal(canvas.released,true);
});
