import test from 'node:test';
import assert from 'node:assert/strict';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';

function setup(options={}) {
 const sent=[], port={postMessage(value){sent.push(value)},start(){},close(){this.closed=true}};
 const checkpoints=[], stream=openVisualStream(port,'s',()=>{}, {receiptAcknowledgements:true,highWatermark:2,onCheckpointAcknowledged:value=>checkpoints.push(value.sequence),...options});
 const send=(kind,sequence,extra={})=>port.onmessage({data:{kind,session:'s',sequence,...extra}});
 const publish=(sequence,extra={})=>stream.publish({sequence,snapshot:'state-'+sequence,events:[{id:sequence}],physicsPose:null,...extra},true);
 return {stream,port,sent,send,publish,checkpoints};
}
test('receipts advance transmission but retain ordered publications and events until applied',()=>{
 const {stream,sent,send,publish}=setup();
 publish(1);publish(2);publish(3);
 assert.equal(sent.length,1);
 send('publicationReceipt',1);
 assert.equal(sent[1].publication.sequence,2);
 send('publicationReceipt',2);
 assert.equal(sent[2].publication.sequence,3);
 assert.deepEqual(sent.map(p=>p.publication.events[0].id),[1,2,3]);
 assert.equal(stream.blocked(),true);
 assert.equal(stream.status().received,2);
 const before=stream.status().retained.bytes;
 send('publicationAck',1);
 assert.ok(stream.status().retained.bytes<before);
 assert.equal(stream.status().acknowledged,1);
 send('publicationReceipt',3);send('publicationAck',2);send('publicationAck',3);
 assert.equal(stream.status().retained.bytes,0);
 assert.equal(stream.blocked(),false);
 stream.close();
});
test('checkpoint becomes recovery base only after application acknowledgement',()=>{
 const {stream,send,publish,checkpoints}=setup();
 publish(1,{terrainCheckpoint:{sequence:1,chunks:[]}});
 send('publicationReceipt',1);
 assert.deepEqual(checkpoints,[]);
 send('publicationAck',1);
 assert.deepEqual(checkpoints,[1]);
 stream.close();
});
test('historical acknowledgement retains versioned presentation data in checkpoint candidate',()=>{const port={postMessage(){},start(){},close(){}},journal=createPresentationRecoveryJournal({strictBoundaries:true}),accepted=[],stream=openVisualStream(port,'s',()=>{},{receiptAcknowledgements:true,workRecovery:true,recoveryJournal:journal,onCheckpointAcknowledged:value=>accepted.push(value)});try{stream.publish({sequence:1,snapshot:'{}',events:[],physicsPose:null,terrainCheckpoint:{sequence:1,chunks:[]}},true);port.onmessage({data:{kind:'publicationReceipt',session:'s',sequence:1}});assert.equal(journal.status().base,null);const workCheckpoint={version:1,sequence:1,effects:[],presentation:{version:1,sequence:1,guardian:{active:null}}};port.onmessage({data:{kind:'publicationAck',session:'s',sequence:1,workCheckpoint}});assert.equal(journal.status().base,1);assert.deepEqual(accepted[0].workCheckpoint,workCheckpoint);}finally{stream.close();journal.dispose();}});
test('application must be FIFO and follow receipt',()=>{
 for(const action of [
  x=>x.send('publicationAck',1),
  x=>{x.send('publicationReceipt',1);x.send('publicationReceipt',2);x.send('publicationAck',2)},
  x=>{x.send('publicationReceipt',1);x.send('publicationReceipt',1)}
 ]) {
  const x=setup();x.publish(1);x.publish(2);action(x);
  assert.equal(x.port.closed,true);
  assert.equal(x.sent.at(-1).kind,'presentationFailure');
 }
});


test('receipt alone cannot bypass the retained byte or count watermark',()=>{
 const x=setup({highWatermark:2,maxRetainedBytes:4096,highWatermarkBytes:1024});
 x.publish(1,{payload:'x'.repeat(280)});x.send('publicationReceipt',1);
 x.publish(2,{payload:'x'.repeat(280)});x.send('publicationReceipt',2);
 assert.equal(x.stream.blocked(),true);
 assert.equal(x.stream.status().received,2);
 const bytes=x.stream.status().retained.bytes;
 x.send('publicationAck',1);
 assert.ok(x.stream.status().retained.bytes<bytes);
 assert.equal(x.stream.blocked(),false);
 x.stream.close();
});
test('receipt is rejected when the legacy protocol is selected',()=>{
 const sent=[],port={postMessage:m=>sent.push(m),start(){},close(){this.closed=true;}};
 const stream=openVisualStream(port,'s',()=>{});
 stream.publish({sequence:1,snapshot:'s',events:[],physicsPose:null},true);
 port.onmessage({data:{kind:'publicationReceipt',session:'s',sequence:1}});
 assert.equal(port.closed,true);assert.equal(sent.at(-1).kind,'presentationFailure');
});


test('a checkpoint remains an admission barrier after receipt until application',()=>{
 const x=setup();
 x.publish(1,{terrainCheckpoint:{sequence:1,chunks:[]}});
 assert.equal(x.stream.blocked(),true);
 x.send('publicationReceipt',1);
 assert.equal(x.stream.blocked(),true);
 assert.deepEqual(x.checkpoints,[]);
 x.send('publicationAck',1);
 assert.equal(x.stream.blocked(),false);
 assert.deepEqual(x.checkpoints,[1]);
 x.publish(2,{terrainCheckpoint:{sequence:2,chunks:[]}});
 assert.equal(x.stream.status().active,true);
 x.send('publicationReceipt',2);x.send('publicationAck',2);
 assert.deepEqual(x.checkpoints,[1,2]);
 x.stream.close();
});
test('legacy acknowledgement does not impose the new checkpoint admission barrier',()=>{
 const port={postMessage(){},start(){},close(){}},stream=openVisualStream(port,'s',()=>{},{onCheckpointAcknowledged(){}});
 stream.publish({sequence:1,snapshot:'s',events:[],physicsPose:null,terrainCheckpoint:{sequence:1,chunks:[]}},true);
 assert.equal(stream.blocked(),false);
 stream.close();
});


test('a caller bypassing the checkpoint barrier fails explicitly without promoting a later base',()=>{
 const x=setup();
 x.publish(1,{terrainCheckpoint:{sequence:1,chunks:[]}});
 x.send('publicationReceipt',1);
 x.publish(2,{terrainCheckpoint:{sequence:2,chunks:[]}});
 assert.equal(x.port.closed,true);
 assert.equal(x.sent.at(-1).kind,'presentationFailure');
 assert.deepEqual(x.checkpoints,[]);
});

