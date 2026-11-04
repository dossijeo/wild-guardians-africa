import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';

function fixture(){const sent=[],port={postMessage(message,transfer){sent.push({message,transfer});},close(){this.closed=true;},start(){}},publisher=createTerrainPublication({port,session:'session',maxPending:3});return {sent,port,publisher,ack:id=>port.onmessage({data:{kind:'terrainAck',session:'session',id}})};}
function chunk(cx,height){return {authority:'spatial-wasm',cx,cz:0,terrain:{positions:new Float32Array([height,0,0]),colors:new Float32Array([1,1,1]),indices:new Uint16Array([0])}};}
test('publishes only committed data and bounds in-flight work while coalescing',()=>{
 const {sent,publisher,ack}=fixture(),first=chunk(1,2);publisher.stage(first);first.terrain.positions[0]=99;assert.equal(sent.length,0);publisher.commit(4);assert.equal(sent[0].message.payload.terrain.positions[0],2);assert.equal(sent[0].message.sequence,4);assert.equal(sent[0].transfer.length,3);
 publisher.stage(chunk(1,3));publisher.commit(5);publisher.stage(chunk(1,4));publisher.commit(6);publisher.stage(chunk(2,5));publisher.commit(7);assert.equal(sent.length,1);assert.equal(publisher.status().pending,2);
 ack(1);assert.equal(sent[1].message.payload.terrain.positions[0],4);assert.equal(sent[1].message.sequence,6);assert.equal(sent[1].message.revision,3);ack(2);assert.equal(sent[2].message.sequence,7);ack(3);assert.deepEqual(publisher.status(),{closed:false,failure:null,inflight:false,pending:0,staged:0});publisher.dispose();
});
test('discarded command does not publish or consume a revision',()=>{const {sent,publisher}=fixture();publisher.stage(chunk(0,1));publisher.discard();publisher.commit(2);assert.equal(sent.length,0);publisher.stage(chunk(0,2));publisher.commit(3);assert.equal(sent[0].message.revision,1);publisher.dispose();});
test('invalid acknowledgement shuts down publication only',()=>{const {port,publisher}=fixture();publisher.stage(chunk(0,1));publisher.commit(1);port.onmessage({data:{kind:'terrainAck',session:'session',id:2}});assert.match(publisher.status().failure,/acknowledgement/);assert.equal(port.closed,true);});
test('capacity overflow closes the visual channel without accepting more terrain',()=>{const sent=[],port={postMessage:m=>sent.push(m),close(){this.closed=true;},start(){}},publisher=createTerrainPublication({port,session:'s',maxPending:1});publisher.stage(chunk(0,1));assert.equal(publisher.stage(chunk(1,2)),false);assert.equal(port.closed,true);assert.equal(publisher.status().closed,true);assert.equal(sent[0].kind,'terrainFailure');assert.equal(publisher.commit(0),false);});
