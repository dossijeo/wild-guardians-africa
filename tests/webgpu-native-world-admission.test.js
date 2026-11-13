import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {prepareNativeWorldFrameBoundary} from '../src/rendering/webgpu-native-world-admission.js';

const worldBoundary={version:1,authorityEpoch:'native/1',nativeSession:1,ticket:2,effectiveTime:10};
function fixture(){let time=0,ready=true,current=true,issued=0;const f={
 options:{worldBoundary:{...worldBoundary},scene:new Scene(),admission:{prepareTicket:async()=>{issued++;return {valid:()=>true};}},isReady:()=>ready,assertCurrent(){if(!current)throw Error('Owner changed');},now:()=>time,timeoutMs:20,nextTask:async()=>{time++;}},
 set ready(value){ready=value;},set current(value){current=value;},set time(value){time=value;},get issued(){return issued;}};return f;}

test('native world admission waits for existing owners, then prepares their actual scene',async()=>{
 const f=fixture();f.ready=false;let turns=0,calls=0;f.options.nextTask=async()=>{if(++turns>=2)f.ready=true;};
 f.options.admission.prepareTicket=async(scene,options)=>{calls++;assert.equal(f.options.isReady(),true);assert.equal(scene,f.options.scene);assert.equal(options.requireShadowTarget,true);return {valid:()=>true};};
 const prepared=await prepareNativeWorldFrameBoundary(f.options);assert.equal(calls,1);assert.deepEqual(prepared.worldBoundary,worldBoundary);assert.equal(prepared.valid(),true);f.time=99;assert.equal(prepared.valid(),true,'a readiness deadline is not a clock permit or resource expiry');
 f.current=false;assert.equal(prepared.valid(),false);
});

test('stale structural tickets cause another admission, without publishing the stale identity',async()=>{
 const f=fixture();let issued=0;f.options.admission.prepareTicket=async()=>{const valid=++issued>1;return {valid:()=>valid};};
 const prepared=await prepareNativeWorldFrameBoundary(f.options);assert.equal(issued,2);assert.equal(prepared.valid(),true);
});

test('dependency timeout, source change and cancellation remain responsive with unresolved driver work',async()=>{
 const waiting=fixture();waiting.ready=false;await assert.rejects(prepareNativeWorldFrameBoundary(waiting.options),/did not become ready/);assert.equal(waiting.issued,0);
 const changed=fixture();changed.options.admission.prepareTicket=()=>new Promise(()=>{});changed.options.nextTask=async()=>{changed.current=false;};await assert.rejects(prepareNativeWorldFrameBoundary(changed.options),/Owner changed/);
 const cancelled=fixture(),controller=new AbortController();cancelled.options.signal=controller.signal;cancelled.options.admission.prepareTicket=()=>new Promise(()=>{});cancelled.options.nextTask=async()=>controller.abort();await assert.rejects(prepareNativeWorldFrameBoundary(cancelled.options),{name:'AbortError'});
});

test('driver failure and malformed admission tickets are never converted into readiness',async()=>{
 const f=fixture(),failure=Error('GPU compilation failed');f.options.admission.prepareTicket=async()=>{throw failure;};await assert.rejects(prepareNativeWorldFrameBoundary(f.options),e=>e===failure);
 f.options.admission.prepareTicket=async()=>({});await assert.rejects(prepareNativeWorldFrameBoundary(f.options),/lacks a resource ticket/);
});

test('admitted identities are owned copies and lose validity when their dependencies change',async()=>{
 const f=fixture(),prepared=await prepareNativeWorldFrameBoundary(f.options);f.options.worldBoundary.ticket=99;assert.equal(prepared.worldBoundary.ticket,2);assert(Object.isFrozen(prepared.worldBoundary));f.ready=false;assert.equal(prepared.valid(),false);
});
