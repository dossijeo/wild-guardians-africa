import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLoadingPrograms} from '../src/rendering/loading-programs.js';
function fixture(program){const material={};return {material,renderer:{compile:()=>new Set([material]),properties:{get:()=>({currentProgram:program})},getContext:()=>({isContextLost:()=>false})}};}
test('loading compilation snapshots programs before borrowed materials are restored',async()=>{let ready=false;const original={isReady:()=>ready},f=fixture(original);const pending=compileLoadingPrograms(f.renderer,{},{});f.renderer.properties.get=()=>({currentProgram:{isReady:()=>false}});ready=true;await pending;});
test('loading compilation cancellation releases a pending poll immediately',async()=>{const abort=new AbortController(),f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{signal:abort.signal});abort.abort();await assert.rejects(pending,/cancelled/);});
test('loading compilation reports timeout without an indefinite poll',async()=>{let clock=0;const f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{now:()=>clock,timeout:1});clock=2;await assert.rejects(pending,/timed out/);});
test('loading compilation rejects a destroyed owner before submitting programs',()=>{const f=fixture({isReady:()=>true});f.renderer.compile=()=>{throw Error('must not compile');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{cancelled:()=>true}),/cancelled/);});
