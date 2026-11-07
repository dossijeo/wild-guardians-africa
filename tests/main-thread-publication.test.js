import test from 'node:test';
import assert from 'node:assert/strict';
import {projectMainThreadPublication,copyPublication} from '../src/simulation/main-thread-publication.js';
import {createHostPublicationQueue,physicsOwners} from '../src/simulation/host-publication-queue.js';
import {handoffConfirmedSnapshot,confirmedSnapshotFor} from '../src/simulation/confirmed-snapshot-handoff.js';
import {createMainSnapshotEncoder,createMainSnapshotDecoder,createSnapshotPreparationCache} from '../src/simulation/main-thread-snapshot-transport.js';

test('projection and delta encoding reuse a decoded state without materializing its snapshot',()=>{
 const cache=createSnapshotPreparationCache(),encoders=Array.from({length:3},()=>createMainSnapshotEncoder({prepareSnapshot:cache.prepare,prepareState:cache.prepareState})),decoders=encoders.map(()=>createMainSnapshotDecoder()),initial={slotId:'s',value:1,padding:'x'.repeat(1000)},next={...initial,value:2};let materialized=0;
 const first={kind:'publication',publication:{sequence:1,snapshot:JSON.stringify(initial)}};for(let i=0;i<encoders.length;i++)decoders[i].decode(encoders[i].encode(first));
 const source={sequence:2,physicsPose:null,events:[]};Object.defineProperty(source,'snapshot',{enumerable:true,get(){materialized++;return JSON.stringify(next);}});handoffConfirmedSnapshot(source,next);
 source.terrainCheckpoint={sequence:2};const projected=projectMainThreadPublication(copyPublication(source,{omit:['terrainCheckpoint'],add:{presentationInput:7}}));assert.equal(materialized,0);assert.equal(confirmedSnapshotFor(projected),next);assert.equal(Object.hasOwn(projected,'terrainCheckpoint'),false);assert.equal(projected.presentationInput,7);
 for(let i=0;i<encoders.length;i++){const encoded=encoders[i].encode({kind:'publication',publication:projected});assert.equal(materialized,0);assert.ok(encoded.publication.snapshotDelta);const decoded=decoders[i].decode(encoded);assert.deepEqual(confirmedSnapshotFor(decoded.publication),next);}assert.equal(materialized,0);
});

test('interface projection removes graphical payloads without mutating the graphical publication',()=>{
 const pose={actorId:'a',active:true,bones:new Float32Array(128)},event={id:'e'},publication={sequence:2,physicsPose:pose,physicsPoses:[pose],motionTrace:{segments:[1]},worldMotionTrace:{segments:[2]},presentationWorkerHeadings:[{id:'w',yaw:2}],events:[event],snapshot:'state',motionInvalidation:{reason:'obstacle'}};
 const projected=projectMainThreadPublication(publication);assert.equal(projected.physicsOwnerSummary,'["a"]');assert.equal(projected.events,publication.events);assert.equal(projected.motionInvalidation,publication.motionInvalidation);for(const field of ['physicsPose','physicsPoses','motionTrace','worldMotionTrace','presentationWorkerHeadings'])assert.equal(Object.hasOwn(projected,field),false);assert.equal(publication.physicsPose,pose);assert.equal(publication.worldMotionTrace.segments[0],2);
});

test('projection retains pose-owner boundaries and every event when ticks are folded',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:message=>sent.push(message)}),packet=(sequence,actor,events=[])=>{const pose={actorId:actor,active:true,bones:new Float32Array(128)};return projectMainThreadPublication({sequence,physicsPose:pose,physicsPoses:[pose],events,snapshot:String(sequence)});};
 queue.publication(packet(1,'a'),true);queue.publication(packet(2,'a'),true);queue.publication(packet(3,'a',[{id:'e'}]),true);queue.publication(packet(4,'b'),true);queue.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.deepEqual(sent[1].publication.events,[{id:'e'}]);queue.ack(3);assert.equal(sent[2].publication.sequence,4);assert.equal(physicsOwners(sent[2].publication),'["b"]');
});

test('unchanged and malformed pose publications are not rewritten',()=>{
 const unchanged={unchanged:true},bad={physicsPose:{actorId:'a',active:true},physicsPoses:[{actorId:'b',active:true}]};assert.equal(projectMainThreadPublication(unchanged),unchanged);assert.equal(projectMainThreadPublication(bad),bad);assert.equal(physicsOwners({physicsOwnerSummary:'["b","a"]'}),null);assert.equal(physicsOwners({physicsOwnerSummary:'[]'}),'');
});
