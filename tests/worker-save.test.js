import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createWorkerSaveCoordinator} from '../src/persistence/worker-save.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const packet=(state,sequence,saveAvailable=true)=>({sequence,saveAvailable,snapshot:serialize(state)});

test('worker checkpoints are captured immediately and written in request order',async()=>{
 const state=newGame({seed:712,slotId:'a'}),barriers=[],writes=[],firstWrite=deferred();
 const runtime={submit(command){assert.deepEqual(command,{kind:'snapshot'});const d=deferred();barriers.push(d);return d.promise;}};
 const repository={async save(saved){writes.push(structuredClone(saved));if(writes.length===1)await firstWrite.promise;}};
 const saves=createWorkerSaveCoordinator({runtime,repository,slotId:'a',now:()=>123});
 const a=saves.request(),b=saves.request();assert.equal(barriers.length,2);
 barriers[0].resolve(packet(state,1));state.day=2;barriers[1].resolve(packet(state,2));state.day=3;
 await new Promise(resolve=>setImmediate(resolve));assert.equal(writes.length,1);assert.equal(writes[0].day,1);
 firstWrite.resolve();assert.deepEqual(await a,{saved:true,sequence:1,elapsed:0});assert.equal((await b).sequence,2);
 assert.equal(writes[1].day,2);assert.equal(writes[1].savedAt,123);
});

test('unsafe physics checkpoint does not write or wait for the simulation to resume',async()=>{
 const state=newGame({seed:712,slotId:'a'});let writes=0;
 const saves=createWorkerSaveCoordinator({runtime:{submit:async()=>packet(state,4,false)},repository:{save(){writes++;}},slotId:'a'});
 assert.deepEqual(await saves.request(),{saved:false,reason:'physics-active',sequence:4});assert.equal(writes,0);
});

test('failed and cross-slot checkpoints do not block later saves',async()=>{
 const state=newGame({seed:712,slotId:'a'}),other=newGame({seed:713,slotId:'b'});let n=0,writes=0;
 const saves=createWorkerSaveCoordinator({runtime:{submit(){n++;if(n===1)return Promise.reject(Error('worker failed'));return Promise.resolve(packet(n===2?other:state,n));}},repository:{save(){writes++;}},slotId:'a'});
 await assert.rejects(saves.request(),/worker failed/);await assert.rejects(saves.request(),/slot mismatch/);
 assert.equal((await saves.request()).saved,true);assert.equal(writes,1);
});
