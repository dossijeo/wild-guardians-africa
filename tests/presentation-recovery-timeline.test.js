import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';
import {createPresentationRecoveryReplay} from '../src/simulation/presentation-recovery-replay.js';

test('strict recovery preserves each paused boundary, terrain and event order through replay',()=>{
 const journal=createPresentationRecoveryJournal({strictBoundaries:true,incrementalSnapshots:true}),sent=[],caught=[],errors=[],port={postMessage:message=>sent.push(structuredClone(message)),start(){}};
 const snapshot=value=>JSON.stringify({elapsed:value,padding:'x'.repeat(300)}),checkpoint={sequence:1,snapshot:snapshot(1)},paused=sequence=>({sequence,unchanged:true,pausedAdvance:true,slotId:'slot',stateSequence:1,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false});
 journal.begin(1,checkpoint);journal.confirm(1);journal.append(paused(2),true);journal.append(paused(3),true);journal.appendTerrain(4,[{cx:0,cz:0,capturedAt:2}],{epoch:'e',chunks:[{cx:0,cz:0,revision:2}]});journal.append({sequence:4,elapsed:2,snapshot:snapshot(2),events:[{type:'Impact',at:2}],physicsPose:null},true);
 const replay=createPresentationRecoveryReplay({port,session:'s',checkpoint,journal,onCaughtUp:value=>caught.push(value),onError:error=>errors.push(error.message)});
 try{for(let i=0;i<5;i++){const message=sent[i];assert.ok(message);port.onmessage({data:{kind:'recoveryAck',session:'s',id:message.id,phase:message.kind.slice(8).toLowerCase(),sequence:message.sequence}});}assert.deepEqual(sent.map(({kind,sequence})=>[kind,sequence]),[['recoveryCheckpoint',1],['recoveryPublication',2],['recoveryPublication',3],['recoveryTerrain',4],['recoveryPublication',4]]);assert.equal(sent[3].chunks[0].capturedAt,2);assert.equal(sent[4].publication.events[0].type,'Impact');assert.deepEqual(caught,[{sequence:4,entries:4}]);assert.deepEqual(errors,[]);}finally{replay.dispose();journal.dispose();}
});
