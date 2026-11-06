import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLegacyWorldScene} from '../src/app/load-legacy-world-scene.js';

test('returns the legacy constructor only while the loading request is current',async()=>{
 let finish,current=true;const pending=loadLegacyWorldScene({isCurrent:()=>current,load:()=>new Promise(resolve=>{finish=resolve;})});class WorldScene{}finish({WorldScene});assert.equal(await pending,WorldScene);
 let finishCancelled;const cancelled=loadLegacyWorldScene({isCurrent:()=>current,load:()=>new Promise(resolve=>{finishCancelled=resolve;})});current=false;finishCancelled({WorldScene});await assert.rejects(cancelled,{name:'AbortError'});
});
test('propagates module failures and rejects an invalid constructor',async()=>{
 await assert.rejects(loadLegacyWorldScene({isCurrent:()=>true,load:async()=>{throw Error('import failed');}}),/import failed/);
 await assert.rejects(loadLegacyWorldScene({isCurrent:()=>true,load:async()=>({})}),/Invalid legacy scene module/);
});
