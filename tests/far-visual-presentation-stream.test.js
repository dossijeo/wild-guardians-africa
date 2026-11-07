import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';

test('graphical stream discards a regional reply when an ordered publication advances its state',async()=>{
 const channel=new MessageChannel(),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),next=deserialize(serialize(state));next.elapsed+=.1;
 let release,start,confirmed;const invoked=new Promise(resolve=>{start=resolve;}),committed=new Promise(resolve=>{confirmed=resolve;});
 const host=openVisualStream(channel.port1,'s',()=>{},{onFarVisualQuery:()=>{start();return new Promise(resolve=>{release=resolve;});}}),stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain:{confirm(){}},allowFarVisualQueries:true,onConfirmed:confirmed});
 try{const pending=stream.queryFarVisualChunk({cx:0,cz:0,slots:[0],expectedSequence:0});await invoked;channel.port1.postMessage({kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serializeConfirmedState(next),events:[],physicsPose:null}});await committed;release({cx:0,cz:0,sequence:0,revision:1,elapsed:next.elapsed-.1,instances:Array.from({length:20},()=>[])});assert.equal(await pending,null);assert.equal(stream.status().sequence,1);}finally{stream.dispose();host.close();}
});
