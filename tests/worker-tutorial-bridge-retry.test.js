import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerTutorialBridge} from '../src/tutorial/worker-bridge.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=presentation=>({value:{presentation,profileRecords:[]}});
test('a rejected tutorial presentation retries without flooding the simulation',async()=>{
 let now=0,calls=0;const errors=[],message={id:'welcome',variant:null,reading:true},runtime={submit(command){if(command.kind==='tutorialStart')return Promise.resolve(response(message));if(command.action==='present'){calls++;return calls===1?Promise.reject(Error('temporary failure')):Promise.resolve(response(message));}throw Error('Unexpected tutorial command');}},bridge=createWorkerTutorialBridge({runtime,profile:{read:()=>[],record(){}},clock:()=>now,onError:error=>errors.push(error.message)});
 try{await bridge.start();bridge.presentation();await tick();assert.equal(calls,1);bridge.presentation();now=999;bridge.presentation();assert.equal(calls,1);now=1000;bridge.presentation();await tick();assert.equal(calls,2);bridge.presentation();assert.equal(calls,2);assert.deepEqual(errors,['temporary failure']);}finally{bridge.dispose();}
});

test('an old rejection does not reset a newer tutorial presentation',async()=>{
 let failOld,calls=0,now=0;const first={id:'first'},second={id:'second'},runtime={submit(command){if(command.kind==='tutorialStart')return Promise.resolve(response(first));if(command.action==='update')return Promise.resolve(response(second));if(command.action==='present'){calls++;return calls===1?new Promise((_,reject)=>{failOld=reject;}):Promise.resolve(response(second));}throw Error('Unexpected tutorial command');}},bridge=createWorkerTutorialBridge({runtime,profile:{read:()=>[],record(){}},clock:()=>now});
 try{await bridge.start();bridge.presentation();bridge.update();await tick();bridge.presentation();await tick();assert.equal(calls,2);failOld(Error('late failure'));await tick();now=2000;bridge.presentation();assert.equal(calls,2);}finally{bridge.dispose();}
});
