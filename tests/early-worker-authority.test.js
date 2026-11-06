import test from 'node:test';
import assert from 'node:assert/strict';
import {createEarlyWorkerAuthority} from '../src/app/early-worker-authority.js';

test('early authority attaches ordered callbacks after construction without a graphical scene',()=>{
 const initial={snapshot:'{}',navigationView:{bounds:[0,1]}},adapter={},clientOptions={guardianPlacement:true},runtimeOptions={presentationInputs:true,startupSuspended:true},recoveryOptions={visualRecovery:{backpressure:true}},runtime={},seen=[];let options;
 const early=createEarlyWorkerAuthority({session:'session',initial,adapter,clientOptions,runtimeOptions,recoveryOptions,hidden:true,onError:error=>seen.push(error),runtimeFactory:value=>(options=value,runtime)});
 assert.equal(early.runtime,runtime);assert.equal(early.snapshot,initial.snapshot);assert.equal(early.navigationView,initial.navigationView);assert.equal(early.desiredHidden,true);assert.equal(early.guardianPlacement,true);assert.equal(early.presentationInputs,true);
 assert.equal(options.confirmedReceiver,adapter);assert.equal(options.clientOptions,clientOptions);assert.equal(options.runtimeOptions,runtimeOptions);assert.equal(options.world,undefined);options.onConfirmedEvents(['before']);
 early.onEvents=events=>seen.push(events);early.onState=sequence=>seen.push(sequence);early.onVisualBackpressure=value=>seen.push(value);
 options.onConfirmedEvents(['event']);options.onConfirmedState(7);options.onVisualBackpressure('pressure');assert.deepEqual(seen,[['event'],7,'pressure']);
});

test('early authority rejects malformed setup before creating a runtime',()=>{
 let called=false;assert.throws(()=>createEarlyWorkerAuthority({session:'',runtimeFactory:()=>{called=true;}}),/Invalid early worker authority/);assert.equal(called,false);
});

test('prepared authority exposes snapshot-free presentation profile to its owner',()=>{const early=createEarlyWorkerAuthority({session:'s',initial:{snapshot:'{}',navigationView:{}},adapter:{},clientOptions:{},runtimeOptions:{presentationInputs:false,startupSuspended:true,mainThreadHudOnly:true},onError:()=>{},runtimeFactory:()=>({})});assert.equal(early.hudOnly,true);});
