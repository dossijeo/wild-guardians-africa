import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {createMainSnapshotDecoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {estimateRetainedBytes} from '../src/simulation/retained-size.js';
import {projectSuppression} from '../src/simulation/presentation-suppression-projection.js';

function fixture(maxPublications=3,maxBytes=1000){
 const sent=[],encoded=[],q=createHostPublicationQueue({session:'s',receiptAcknowledgements:true,coalesce:false,prepareSend(message){encoded.push(message.publication.sequence);return {message,bytes:message.publication.cost};},send:message=>sent.push(message)});
 q.configureReceiptWindow({maxPublications,maxBytes});
 return {q,sent,encoded,publish(n,cost=10){q.publication({sequence:n,events:[{id:n}],snapshot:'{}',cost},true);}};
}
test('negotiated window sends ahead without receipts and releases credit only after ordered application',()=>{
 const x=fixture();for(let n=1;n<=8;n++)x.publish(n);
 assert.deepEqual(x.sent.map(x=>x.publication.sequence),[1,2,3]);
 for(let n=1;n<=3;n++)x.q.receipt(n);
 assert.equal(x.sent.length,3);assert.equal(x.q.status().window.publications,3);
 x.q.ack(1);assert.equal(x.sent.at(-1).publication.sequence,4);x.q.receipt(4);
 for(let n=2;n<=8;n++){x.q.ack(n);if(n+3<=8)x.q.receipt(n+3);}
 assert.deepEqual(x.sent.map(x=>x.publication.events[0].id),[1,2,3,4,5,6,7,8]);
 assert.deepEqual(x.encoded,[1,2,3,4,5,6,7,8]);
 assert.equal(x.q.status().retained.bytes,0);assert.equal(x.q.status().window.bytes,0);
});
test('byte credit blocks a staged packet without reencoding or admitting later packets',()=>{
 const x=fixture(10,100);x.publish(1,60);x.publish(2,60);x.publish(3,1);
 assert.equal(x.sent.length,1);assert.deepEqual(x.encoded,[1,2]);
 x.q.receipt(1);assert.deepEqual(x.encoded,[1,2]);assert.equal(x.sent.length,1);
 x.q.ack(1);assert.deepEqual(x.sent.map(x=>x.publication.sequence),[1,2,3]);
 assert.deepEqual(x.encoded,[1,2,3]);assert.equal(x.q.status().window.bytes,61);
 x.q.receipt(2);x.q.receipt(3);x.q.ack(2);x.q.ack(3);assert.equal(x.q.status().retained.bytes,0);
});
test('out-of-order receipts, early ACKs and duplicates cannot release credit',()=>{
 const x=fixture();x.publish(1);x.publish(2);
 assert.throws(()=>x.q.receipt(2),/receipt/);assert.throws(()=>x.q.ack(1),/acknowledgement/);
 x.q.receipt(1);assert.throws(()=>x.q.receipt(1),/receipt/);x.q.receipt(2);
 assert.throws(()=>x.q.ack(2),/acknowledgement/);assert.equal(x.q.status().window.publications,2);
 x.q.ack(1);assert.throws(()=>x.q.ack(1),/acknowledgement/);x.q.ack(2);
});
test('oversize publication fails instead of exceeding receiver capacity',()=>{
 const x=fixture(3,100);assert.throws(()=>x.publish(1,101),/exceeds capacity/);assert.equal(x.sent.length,0);
});
test('real visual stream negotiates bounded incremental packets with exact receiver byte charges',()=>{
 const sent=[],port={postMessage:m=>sent.push(m),start(){},close(){}},stream=openVisualStream(port,'s',()=>{},{receiptAcknowledgements:true,timelineHandshake:true,incrementalTransport:true}),decoder=createMainSnapshotDecoder();
 const receive=(kind,sequence)=>port.onmessage({data:{kind,session:'s',sequence}});
 port.onmessage({data:{kind:'presentationTimelineHello',session:'s',version:1,maxPublications:3,maxBytes:100000}});
 const publications=()=>sent.filter(x=>x.kind==='publication');
 for(let n=1;n<=6;n++)stream.publish({sequence:n,elapsed:n,snapshot:JSON.stringify({suppressed:n<3?[]:['crop'],padding:'x'.repeat(1000),elapsed:n}),events:[{id:n}]},true);
 assert.equal(publications().length,3);assert.ok(publications()[1].publication.snapshotDelta);
 let suppression=[],base=0,bytes=0;
 for(const wire of publications()){suppression=projectSuppression(wire.publication,suppression,base);base=wire.publication.sequence;bytes+=estimateRetainedBytes(wire)+estimateRetainedBytes(suppression);assert.equal(JSON.parse(decoder.decode(wire).publication.snapshot).elapsed,base);receive('publicationReceipt',base);}
 assert.equal(stream.status().window.bytes,bytes);assert.equal(publications().length,3);
 for(let n=1;n<=6;n++){receive('publicationAck',n);if(n+3<=6){const wire=publications().at(-1);assert.equal(wire.publication.sequence,n+3);assert.equal(JSON.parse(decoder.decode(wire).publication.snapshot).elapsed,n+3);receive('publicationReceipt',n+3);}}
 assert.deepEqual(publications().flatMap(x=>x.publication.events.map(e=>e.id)),[1,2,3,4,5,6]);
 assert.equal(stream.status().retained.bytes,0);assert.equal(stream.status().window.bytes,0);stream.close();
});
