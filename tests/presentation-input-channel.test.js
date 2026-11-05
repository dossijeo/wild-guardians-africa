import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';

test('ordered presentation inputs commit their matching publication and retain its receipt in the recovery journal',async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),channel=new MessageChannel(),journal=createPresentationRecoveryJournal(),order=[];journal.begin(1);journal.confirm(1);
 const message=(sequence,extra={})=>({session:'s',sequence,snapshot:serialize(state),events:[],physicsPose:null,...extra});let visual;
 visual=openVisualStream(channel.port1,'s',()=>{},{recoveryJournal:journal,onCheckpointAcknowledged:()=>{},onPresentationInput:input=>{order.push(['input',input.id]);if(input.command.kind==='fail'){visual.sendInputFailure(input.id,Error('denied'));return;}visual.publish(message(3,{presentationInput:input.id,value:true}),false);}});
 const stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,initialSequence:1,terrain:{confirm:n=>order.push(['terrain',n])},allowPresentationHold:true,allowPresentationInputs:true,onConfirmed:m=>order.push(['confirmed',m.sequence])});
 try{stream.holdPresentation();visual.publish(message(2),true);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(stream.status().held,true);const result=stream.submitInput(10,{kind:'test'});assert.equal(stream.status().held,false);assert.deepEqual(await result,{sequence:3,value:true});assert.deepEqual(order,[['terrain',2],['confirmed',2],['input',10],['terrain',3],['confirmed',3]]);assert.equal(journal.snapshot().entries.at(-1).publication.presentationInput,10);
  await assert.rejects(stream.submitInputForQa(11,{kind:'fail'}),/denied/);assert.equal(stream.status().closed,false);
 }finally{stream.dispose();visual.close();journal.dispose();}
});
