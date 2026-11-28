import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal,withPresentationRecoveryCheckpoint} from '../src/simulation/presentation-recovery-journal.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';

for(const accepted of [true,false])test(`deferred provisional ${accepted?'acceptance':'rejection'} drains in order and renews the journal`,()=>{
 const journal=createPresentationRecoveryJournal({capacity:8,highWatermark:3}),sent=[],bases=[],port={postMessage:m=>sent.push(m),start(){},close(){}};
 const stream=openVisualStream(port,'s',()=>{},{receiptAcknowledgements:true,workRecovery:true,recoveryJournal:journal,onCheckpointAcknowledged:c=>bases.push(c.sequence),allowDeferredJournalReserve:true});
 const packet=(n,events=[])=>({sequence:n,elapsed:n,snapshot:'s'+n,events,physicsPose:null}),receive=(kind,sequence,extra={})=>port.onmessage({data:{kind,session:'s',sequence,...extra}}),work=n=>({version:1,sequence:n,effects:[]});
 try{
  stream.publish({...packet(1),terrainCheckpoint:{sequence:1,chunks:[]}},true);receive('publicationReceipt',1);receive('publicationAck',1,{workCheckpoint:work(1)});
  stream.publish({...packet(2),terrainCheckpoint:{sequence:2,chunks:[]}},true);receive('publicationReceipt',2);receive('publicationAck',2,{checkpointUnavailable:true});
  stream.publish(packet(3,[{id:'prior'}]),true);receive('publicationReceipt',3);receive('publicationAck',3);
  stream.publish(packet(4),true);receive('publicationReceipt',4);receive('publicationAck',4);
  assert.equal(journal.status().saturated,true);assert.equal(stream.blocked(),false);
  const event={id:accepted?'attack-confirmed':'attack-rejected'};stream.publish(packet(5,[event]),false);receive('publicationReceipt',5);receive('publicationAck',5);
  assert.deepEqual(journal.snapshot().entries.map(item=>item.sequence),[2,3,4,5]);
  // Readiness follows removal of the provisional gesture, not its receipt.
  assert.equal(journal.status().checkpointDeferred,true);receive('checkpointReady');
  assert.equal(withPresentationRecoveryCheckpoint({kind:'advance'},journal.status()).visualTerrain,true);
  stream.publish({...packet(6),terrainCheckpoint:{sequence:6,chunks:[]}},true);receive('publicationReceipt',6);receive('publicationAck',6,{workCheckpoint:work(6)});
  assert.deepEqual(bases,[1,6]);assert.equal(journal.status().base,6);assert.deepEqual(journal.snapshot().entries,[]);
 }finally{stream.close();journal.dispose();}
});
test('reserve exhaustion blocks without deleting history or admitting another command',()=>{
 const journal=createPresentationRecoveryJournal({capacity:6,highWatermark:2}),port={postMessage(){},start(){},close(){}},notices=[];
 const stream=openVisualStream(port,'s',()=>{},{workRecovery:true,recoveryJournal:journal,onCheckpointAcknowledged(){},allowDeferredJournalReserve:true,onJournalReserveExhausted:()=>notices.push('exhausted')});
 const packet=n=>({sequence:n,snapshot:'s'+n,events:[{id:`e${n}`}],physicsPose:null}),ack=(n,extra={})=>port.onmessage({data:{kind:'publicationAck',session:'s',sequence:n,...extra}});
 try{stream.publish({...packet(1),terrainCheckpoint:{sequence:1,chunks:[]}},true);ack(1,{workCheckpoint:{version:1,sequence:1,effects:[]}});stream.publish({...packet(2),terrainCheckpoint:{sequence:2,chunks:[]}},true);ack(2,{checkpointUnavailable:true});stream.publish(packet(3),true);ack(3);assert.equal(stream.blocked(),false);stream.publish(packet(4),true);ack(4);stream.publish(packet(5),true);ack(5);assert.equal(stream.blocked(),true);assert.deepEqual(notices,['exhausted']);assert.deepEqual(journal.snapshot().entries.map(item=>item.sequence),[2,3,4,5]);}finally{stream.close();journal.dispose();}
});
test('journal admits at most one terrain batch for one authority result',()=>{
 const journal=createPresentationRecoveryJournal({strictBoundaries:true});try{journal.begin(1);journal.confirm(1);journal.appendTerrain(2,[{cx:0,cz:0}]);assert.throws(()=>journal.appendTerrain(2,[{cx:1,cz:0}]),/duplicate batch/);assert.equal(journal.status().pendingTerrain,true);journal.append({sequence:2,snapshot:'s',events:[],physicsPose:null},true);assert.deepEqual(journal.snapshot().entries.map(item=>item.kind),['terrain','publication']);}finally{journal.dispose();}
});
