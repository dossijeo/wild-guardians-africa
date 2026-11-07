import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {handoffConfirmedSnapshot,confirmedSnapshotFor} from '../src/simulation/confirmed-snapshot-handoff.js';
import {createSnapshotPreparationCache} from '../src/simulation/main-thread-snapshot-transport.js';
const packet=(sequence,events=[],physicsPose=null)=>({sequence,events,physicsPose,snapshot:String(sequence)});
test('inactive and absent physical poses share one owner state but active transitions stay ordered',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:item=>sent.push(item)}),inactive={actorId:'a',active:false},active={actorId:'a',active:true},event={id:'e',type:'CropPlaced'};
 queue.publication(packet(1),true);queue.publication(packet(2,[],inactive),true);queue.publication(packet(3,[event]),true);queue.publication(packet(4,[],active),true);queue.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.deepEqual(sent[1].publication.events,[event]);queue.ack(3);assert.equal(sent[2].publication.sequence,4);assert.equal(sent[2].publication.physicsPose,active);
});
test('a legacy empty owner summary can coalesce with the canonical empty state',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:item=>sent.push(item)});queue.publication(packet(1),true);queue.publication({sequence:2,events:[],physicsOwnerSummary:'[]',snapshot:'2'},true);queue.publication({sequence:3,events:[],physicsOwnerSummary:'',snapshot:'3'},true);queue.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);
});
test('far world revisions coalesce quiet ticks only within the same revision',()=>{const sent=[],q=createHostPublicationQueue({session:'s',send:item=>sent.push(item)});q.publication(packet(1),true);q.publication({...packet(2),farVisualRevision:7},true);q.publication({...packet(3),farVisualRevision:7},true);q.publication({...packet(4),farVisualRevision:8},true);q.ack(1);assert.equal(sent.at(-1).publication.sequence,3);assert.equal(sent.at(-1).publication.farVisualRevision,7);q.ack(3);assert.equal(sent.at(-1).publication.sequence,4);assert.equal(sent.at(-1).publication.farVisualRevision,8);});
test('tutorial revisions permit same-version coalescing but retain invalidation and unsubscribe boundaries',()=>{const sent=[],q=createHostPublicationQueue({session:'s',send:item=>sent.push(item)});q.publication(packet(1),true);q.publication({...packet(2),tutorialGuideRevision:1},true);q.publication({...packet(3),tutorialGuideRevision:1},true);q.publication({...packet(4),tutorialGuideRevision:2},true);q.publication({...packet(5),tutorialGuideRevision:2},true);q.publication(packet(6),true);q.ack(1);assert.equal(sent.at(-1).publication.sequence,3);assert.equal(sent.at(-1).publication.tutorialGuideRevision,1);q.ack(3);assert.equal(sent.at(-1).publication.sequence,5);assert.equal(sent.at(-1).publication.tutorialGuideRevision,2);q.ack(5);assert.equal(sent.at(-1).publication.sequence,6);assert.equal(sent.at(-1).publication.tutorialGuideRevision,undefined);});
test('settled ledger facts form ordered barriers and count toward capacity',()=>{const sent=[],queue=createHostPublicationQueue({session:'s',send:value=>sent.push(value),maxEventFacts:1}),fact={id:'paid',n:'-1',d:'1',simulationTime:0,eventSequence:1};queue.publication(packet(1),true);queue.publication({...packet(2),settlements:[fact]},true);assert.equal(queue.status().retained.eventFacts,1);assert.throws(()=>queue.publication({...packet(3),settlements:[{...fact,id:'next'}]},true),/capacity/);queue.ack(1);assert.equal(sent.at(-1).publication.sequence,2);assert.deepEqual(sent.at(-1).publication.settlements,[fact]);queue.ack(2);queue.publication(packet(3),true);assert.equal(sent.at(-1).publication.sequence,3);});
test('queued incremental publications retain their decoded base without materializing discarded snapshots',()=>{
 const sent=[],cache=createSnapshotPreparationCache(),q=createHostPublicationQueue({session:'s',prepareState:cache.prepareState,send:value=>sent.push(value)});let materialized=0;const make=n=>{const state={slotId:'s',sequence:n,elapsed:n,padding:'x'.repeat(300)},publication={sequence:n,events:[],physicsPose:null,presentationWorkerHeadings:[]};Object.defineProperty(publication,'snapshot',{enumerable:true,get(){materialized++;return JSON.stringify(state);}});handoffConfirmedSnapshot(publication,state);return publication;};
 q.publication(packet(1),true);q.publication(make(2),true);const chars=q.status().retained.snapshotChars;assert.equal(chars,JSON.stringify({slotId:'s',sequence:2,elapsed:2,padding:'x'.repeat(300)}).length);q.publication(make(3),true);assert.equal(materialized,0);q.ack(1);assert.equal(sent[1].publication.sequence,3);assert.equal(confirmedSnapshotFor(sent[1].publication).sequence,3);assert.equal(materialized,0);q.ack(3);
});
test('a folded background view preserves the decoded snapshot and ordered boundary',()=>{
 const sent=[],cache=createSnapshotPreparationCache(),q=createHostPublicationQueue({session:'s',foldViews:true,prepareState:cache.prepareState,send:value=>sent.push(value)}),state={slotId:'s',sequence:9,elapsed:4,padding:'x'.repeat(200)};let materialized=0;
 const tick={sequence:2,events:[],physicsPose:null,elapsed:4,pauses:[],saveAvailable:true};Object.defineProperty(tick,'snapshot',{enumerable:true,get(){materialized++;return JSON.stringify(state);}});handoffConfirmedSnapshot(tick,state);
 q.publication(packet(1),true);q.publication(tick,true);q.publication({sequence:3,unchanged:true,slotId:'s',stateSequence:9,elapsed:4,pauses:[],saveAvailable:true,events:[]},false);assert.equal(materialized,0);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(confirmedSnapshotFor(sent[1].publication),state);assert.equal(materialized,0);q.ack(3);
});
test('actual authority result envelopes permit quiet advances to coalesce',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());state.pauses.push('menu');const keys=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)keys.push(`${x},${z}`);const authority=createSimulationAuthority(module,serialize(state),keys),sent=[],queue=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});
 try{for(let sequence=1;sequence<=3;sequence++){const result=authority.execute({kind:'advance',sequence,seconds:.05,nightFastForward:false});assert.deepEqual(result.events,[]);queue.publication({kind:'result',session:'s',...result},true);}assert.equal(queue.status().queued,1);queue.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.kind,'result');}finally{authority.dispose();}
});
test('unknown transport markers remain publication boundaries',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication({...packet(1),kind:'result'},true);q.publication({...packet(2),kind:'future'},true);q.publication({...packet(3),kind:'result'},true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);
});
test('authority envelopes preserve eventful and invalidation boundaries',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),make=(n,events=[])=>({...packet(n,events),kind:'result'});q.publication(make(1),true);q.publication(make(2,[{id:'e2'}]),true);q.publication(make(3,[{id:'e3'}]),true);q.publication({...make(4),motionInvalidation:{reason:'wall'}},true);q.publication(make(5),true);
 q.ack(1);assert.deepEqual(sent[1].publication.events,[{id:'e2'}]);q.ack(2);assert.deepEqual(sent[2].publication.events,[{id:'e3'}]);q.ack(3);assert.equal(sent[3].publication.motionInvalidation.reason,'wall');q.ack(4);assert.equal(sent[4].publication.sequence,5);
});
test('coalesces projected path publications without dropping their metadata or events',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);q.publication({...packet(2),presentationPaths:'head-v1'},true);q.publication({...packet(3,[{id:'event-3'}]),presentationPaths:'head-v1'},true);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.presentationPaths,'head-v1');assert.deepEqual(sent[1].publication.events,[{id:'event-3'}]);q.ack(3);
});
test('a directly transmitted publication is not scanned as retained queue data',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value),maxRetainedBytes:128}),payload={};Object.defineProperty(payload,'expensive',{enumerable:true,get(){throw Error('retained payload scanned');}});q.publication({...packet(1),payload},true);assert.equal(sent[0].publication.payload,payload);assert.equal(q.status().retained.bytes,0);q.ack(1);
});
test('byte admission bounds typed payloads and queued messages without dropping accepted events',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value),maxRetainedBytes:2048});q.publication(packet(1,[{id:'first'}]),true);q.publication(packet(2,[{id:'second'}]),true);const before=q.status().retained.bytes;assert.ok(before>0);assert.throws(()=>q.message({kind:'large',buffer:new Uint8Array(4096)}),/capacity exceeded/);assert.throws(()=>q.publication({...packet(3,[{id:'third'}]),terrainCheckpoint:{payload:new Uint8Array(4096)}},true),/capacity exceeded/);assert.equal(q.status().retained.bytes,before);q.ack(1);assert.equal(sent[1].publication.events[0].id,'second');assert.equal(q.status().retained.bytes,0);q.ack(2);
});
test('replacing a coalesced publication accounts for its full payload transactionally',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value),maxRetainedBytes:2048});q.publication(packet(1),true);q.publication(packet(2),true);const before=q.status().retained.bytes;assert.throws(()=>q.publication({...packet(3),residency:{chunk:new Uint8Array(4096)}},true),/capacity exceeded/);assert.equal(q.status().retained.bytes,before);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);
});
test('coalescing retains input receipts and rejections as publication boundaries',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:v=>sent.push(v)});
 q.publication(packet(1),true);q.publication({...packet(2),presentationInput:42},true);q.publication({...packet(3),rejection:'denied'},true);q.publication(packet(4),true);
 q.ack(1);assert.equal(sent[1].publication.presentationInput,42);q.ack(2);assert.equal(sent[2].publication.rejection,'denied');q.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('coalescing preserves fields introduced by future protocols',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:v=>sent.push(v)});
 q.publication(packet(1),true);q.publication({...packet(2),newProtocolField:'important'},true);q.publication(packet(3),true);
 q.ack(1);assert.equal(sent[1].publication.newProtocolField,'important');q.ack(2);assert.equal(sent[2].publication.sequence,3);
});
test('confirmed terrain changes remain barriers for quiet ticks and folded views',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)});
 q.publication(packet(1),true);q.publication({...packet(2),terrainChanged:true},true);q.publication({...packet(3),terrainChanged:false},true);q.publication({...packet(4),terrainChanged:false},true);
 q.ack(1);assert.equal(sent[1].publication.sequence,2);assert.equal(sent[1].publication.terrainChanged,true);q.ack(2);assert.equal(sent[2].firstSequence,3);assert.equal(sent[2].publication.sequence,4);q.ack(4);
 const view=n=>({sequence:n,unchanged:true,slotId:'s',stateSequence:1,elapsed:0,pauses:[],saveAvailable:true,events:[]});
 q.publication(packet(5),true);q.publication({...view(6),terrainChanged:true},false,{backgroundView:true});q.publication({...view(7),terrainChanged:false},false,{backgroundView:true});q.publication({...view(8),terrainChanged:false},false,{backgroundView:true});
 q.ack(5);assert.equal(sent[4].publication.sequence,6);assert.equal(sent[4].publication.terrainChanged,true);q.ack(6);assert.equal(sent[5].firstSequence,7);assert.equal(sent[5].publication.sequence,8);
});
test('malformed terrain metadata cannot be folded across a publication',()=>{
 for(const terrainChanged of [null,'false',0]){const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);q.publication({...packet(2),terrainChanged},true);q.publication(packet(3),true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);}
});
test('folding preserves observed path segments and refuses discontinuous boundaries',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),trace=(start,end)=>({actorId:'a',start:{at:start,x:start,z:0},end:{at:end,x:end,z:0},segments:[{at:end,x0:start,z0:0,x1:end,z1:0,t0:start,t1:end}],continuous:true,timed:true});
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace(0,1)},true);q.publication({...packet(3),motionTrace:trace(1,2)},true);q.publication({...packet(4),motionTrace:trace(3,4)},true);q.ack(1);
 assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.motionTrace.segments.length,2);assert.equal(sent[1].publication.motionTrace.end.x,2);assert.equal(sent[1].publication.motionTrace.timed,true);q.ack(3);assert.equal(sent[2].publication.sequence,4);
});
test('folded peer traces preserve every body and refuse a roster change',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:v=>sent.push(v)}),point=(at,x)=>({at,x,z:0}),series=(id,a,b)=>({actorId:id,start:point(a,a),end:point(b,b),segments:[{at:b,x0:a,z0:0,x1:b,z1:0,t0:a,t1:b}],continuous:true,timed:true}),trace=(a,b)=>({...series('a',a,b),peers:[{...series('b',a,b),radius:.28,startStatus:'walking',endStatus:'walking'}],rosterChanged:false});
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace(0,1)},true);q.publication({...packet(3),motionTrace:trace(1,2)},true);q.publication({...packet(4),motionTrace:{...trace(2,3),rosterChanged:true}},true);q.ack(1);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.motionTrace.peers[0].segments.length,2);q.ack(3);assert.equal(sent[2].publication.sequence,4);
});
test('observed paths are not discarded when tracking changes or the segment cap is reached',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),point={at:1,x:0,z:0},trace={actorId:'a',start:point,end:point,segments:Array(4096).fill({at:1,x0:0,z0:0,x1:0,z1:0}),continuous:true};
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace},true);q.publication({...packet(3),motionTrace:{...trace,segments:[trace.segments[0]]}},true);q.publication(packet(4),true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);q.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('a motion invalidation stays ordered between observed path publications',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),p={at:1,x:0,z:0},trace={actorId:'a',start:p,end:p,segments:[],continuous:true,timed:true},invalidation={actorId:'a',at:1,x:0,z:0,reason:'pause'};
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace},true);q.publication({...packet(3),motionInvalidation:invalidation},false);q.publication({...packet(4),motionTrace:trace},true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.deepEqual(sent[2].publication.motionInvalidation,invalidation);q.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('a quiet tick carrying a motion invalidation cannot be absorbed by later ticks',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),p={at:1,x:0,z:0},trace={actorId:'a',start:p,end:p,segments:[],continuous:true,timed:true},invalidation={actorId:'a',...p,reason:'peer-motion-unknown'};
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace,motionInvalidation:invalidation},true);q.publication({...packet(3),motionTrace:trace},true);q.publication({...packet(4,[{id:'e'}]),motionTrace:trace},true);
 q.ack(1);assert.equal(sent[1].publication.sequence,2);assert.deepEqual(sent[1].publication.motionInvalidation,invalidation);q.ack(2);assert.equal(sent[2].publication.sequence,4);assert.deepEqual(sent[2].publication.events,[{id:'e'}]);
});
test('an eventful batch retains its boundary when earlier path samples are folded',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),point=(at,x)=>({at,x,z:0}),trace=(a,b)=>({actorId:'a',start:point(a,a),end:point(b,b),segments:[{at:b,x0:a,z0:0,x1:b,z1:0,t0:a,t1:b}],continuous:true,timed:true});
 const barrier={actorId:'a',...point(1,1),reason:'simulation-event'};q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace(0,1)},true);q.publication({...packet(3,[{id:'event-1'}]),motionTrace:trace(1,2),motionInvalidation:barrier},true);q.ack(1);
 assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.motionTrace.segments.length,2);assert.deepEqual(sent[1].publication.motionInvalidation,barrier);assert.equal(sent[1].publication.events[0].id,'event-1');
});
test('coalesces only adjacent quiet ticks while preserving events, poses and command barriers',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});
 q.publication(packet(1),true);q.publication(packet(2),true);q.publication(packet(3),true);q.publication(packet(4,[{id:'e'}]),true);q.publication(packet(5),true);q.message({kind:'commandResult',id:4,sequence:5});q.publication(packet(6),true);q.publication(packet(7,[],{active:true}),true);
 assert.equal(sent.length,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,4);assert.deepEqual(sent[1].publication.events,[{id:'e'}]);q.ack(4);assert.equal(sent[2].publication.sequence,5);q.ack(5);assert.equal(sent[3].kind,'commandResult');assert.equal(sent[4].publication.sequence,6);q.ack(6);assert.equal(sent[5].publication.sequence,7);q.ack(7);assert.equal(q.status().coalesced,2);assert.throws(()=>q.ack(7),/Invalid/);
});
test('a stalled receiver keeps one quiet pending state even across many ticks',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);
 for(let sequence=2;sequence<=1001;sequence++)q.publication(packet(sequence,[],{actorId:'a',active:false}),true);
 assert.equal(q.status().queued,1);assert.equal(q.status().coalesced,999);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,1001);q.ack(1001);
});
test('a stalled receiver has a bounded queue and preserves every accepted event on saturation',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',maxQueued:2,maxSnapshotChars:100,maxEventFacts:10,send:value=>sent.push(value)});q.publication(packet(1),true);q.publication(packet(2,[{id:'a'}]),true);q.publication(packet(3,[{id:'b'}]),true);
 assert.throws(()=>q.publication(packet(4,[{id:'c'}]),true),/capacity exceeded/);assert.equal(q.status().queued,2);q.ack(1);assert.deepEqual(sent[1].publication.events,[{id:'a'}]);q.ack(2);assert.deepEqual(sent[2].publication.events,[{id:'b'}]);q.ack(3);assert.equal(q.status().queued,0);
});
test('snapshot and event limits are enforced before replacing a pending publication',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',maxQueued:5,maxSnapshotChars:5,maxEventFacts:2,send:value=>sent.push(value)});q.publication(packet(1),true);q.publication({...packet(2),snapshot:'small'},true);
 assert.throws(()=>q.publication({...packet(3),snapshot:'longer'},true),/capacity exceeded/);assert.equal(q.status().retained.snapshotChars,5);assert.equal(q.status().retained.eventFacts,0);assert.ok(q.status().retained.bytes>0);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);
 q.publication(packet(3),true);q.publication({...packet(4,[{id:'a'}]),presentationJournal:[{kind:'event',eventId:'a'}]},true);assert.throws(()=>q.publication(packet(5,[{id:'b'}]),true),/capacity exceeded/);q.ack(3);assert.equal(sent[3].publication.events[0].id,'a');q.ack(4);
});
test('queued control messages share the same finite admission limit',()=>{const q=createHostPublicationQueue({session:'s',maxQueued:1,send:()=>{}});q.publication(packet(1),true);q.message({kind:'commandResult',id:1});assert.throws(()=>q.message({kind:'commandResult',id:2}),/capacity exceeded/);q.ack(1);assert.equal(q.status().queued,0);});
test('active pose snapshots coalesce only while their owners remain the same',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);
 q.publication(packet(2,[],{actorId:'a',active:true}),true);q.publication(packet(3,[],{actorId:'a',active:true}),true);q.publication(packet(4,[],{actorId:'b',active:true}),true);q.publication(packet(5,[],{actorId:'b',active:false}),true);
 assert.equal(q.status().coalesced,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);q.ack(3);assert.equal(sent[2].publication.sequence,4);q.ack(4);assert.equal(sent[3].publication.sequence,5);
});
test('diagnostics count queued snapshots and eventful barriers without counting messages',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',diagnostics:true,send:value=>sent.push(value)});q.publication(packet(1),true);q.publication({...packet(2),snapshot:'abcdef'},true);q.publication({...packet(3,[{id:'e'}]),snapshot:'xyz'},true);q.message({kind:'commandResult',id:1,sequence:3});q.publication({...packet(4,[{id:'f'}]),snapshot:'12345'},true);
 let s=q.status();assert.equal(s.queuedPublications,2);assert.equal(s.eventfulPublications,2);assert.equal(s.tickPublications,2);assert.equal(s.unchangedPublications,0);assert.equal(s.snapshotChars,8);assert.equal(s.peakEventfulPublications,2);assert.equal(s.peakQueuedPublications,2);assert.equal(s.peakQueuedMessages,3);q.ack(1);s=q.status();assert.equal(s.queuedPublications,1);assert.equal(s.snapshotChars,5);q.ack(3);assert.equal(q.status().snapshotChars,0);assert.equal(q.status().peakQueuedMessages,3);assert.equal(sent.at(-1).publication.sequence,4);
});
test('diagnostics attribute only retained publications to their source without changing the wire',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',diagnostics:true,send:value=>sent.push(value)});
 q.publication(packet(1),true,{sourceKind:'advance'});q.publication(packet(2),true,{sourceKind:'advance'});q.publication(packet(3),true,{sourceKind:'advance'});q.publication(packet(4,[{id:'e'}]),false,{sourceKind:'castAttack'});
 assert.deepEqual(q.status().queuedBySource,{advance:1,castAttack:1});assert.deepEqual(q.status().peakQueuedBySource,{advance:1,castAttack:1});assert.equal(Object.hasOwn(sent[0],'sourceKind'),false);
 q.ack(1);assert.equal(Object.hasOwn(sent[1],'sourceKind'),false);assert.deepEqual(q.status().queuedBySource,{castAttack:1});q.ack(3);q.ack(4);assert.deepEqual(q.status().queuedBySource,{});
});
test('an unchanged camera confirmation can share the preceding quiet state without changing its receipt',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=sequence=>({sequence,events:[],physicsPose:null,elapsed:1,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})});
 q.publication(full(1),true);q.publication(full(2),true);const receipt={session:'s',sequence:3,unchanged:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:[],events:[],saveAvailable:true};
 assert.equal(q.publication(receipt,false),true);q.message({kind:'commandResult',id:5,sequence:3,receipt});q.publication(full(4),true);q.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.snapshot,full(2).snapshot);q.ack(3);assert.equal(sent[2].receipt,receipt);assert.equal(sent[3].publication.sequence,4);
});
test('an unchanged receipt folds into an eventful tick without losing facts or the invalidation boundary',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),snapshot=JSON.stringify({slotId:'slot',sequence:12,elapsed:4}),events=[{id:'event-9',type:'SpellActivated'},{id:'event-10',type:'RaidEnded'}],presentationJournal=[{kind:'event',eventId:'event-9',at:3.8},{kind:'animalGone',actorId:'a',at:3.9},{kind:'event',eventId:'event-10',at:4}],motionInvalidation={actorId:'a',at:4,reason:'simulation-event'},pose={actorId:'a',active:true};
 const full=sequence=>({sequence,events:[],physicsPose:pose,elapsed:4,pauses:['menu'],saveAvailable:true,snapshot});
 q.publication(full(1),true);q.publication({...full(2),events,presentationJournal,motionInvalidation},true);
 const view={sequence:3,unchanged:true,slotId:'slot',stateSequence:12,elapsed:4,pauses:['menu'],events:[],saveAvailable:true};
 assert.equal(q.publication(view,false),true);q.message({kind:'commandResult',sequence:3,receipt:view});q.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.snapshot,snapshot);
 assert.deepEqual(sent[1].publication.events,events);assert.deepEqual(sent[1].publication.presentationJournal,presentationJournal);assert.deepEqual(sent[1].publication.motionInvalidation,motionInvalidation);assert.deepEqual(sent[1].publication.physicsPose,pose);
 q.ack(3);assert.deepEqual(sent[2].receipt,view);assert.equal(q.status().queued,0);
});
test('the real receiver delivers a folded event once at its original confirmed state',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),authority=deserialize(serialize(state)),seen=[],stop=observePresentationGameEvents(state,event=>seen.push({id:event.id,elapsed:state.elapsed})),receiver=createConfirmedStateReceiver(state,'s'),sent=[],queue=createHostPublicationQueue({session:'s',foldViews:true,send:message=>sent.push(message)});
 try{
  const base={session:'s',sequence:1,events:[],physicsPose:null,snapshot:serialize(authority),elapsed:authority.elapsed,pauses:[...authority.pauses],saveAvailable:true};queue.publication(base,true);receiver.accept(sent[0].publication);
  authority.elapsed+=.1;emit(authority,'Test');const event=authority.events.at(-1),eventful={...base,sequence:2,snapshot:serialize(authority),events:[event],elapsed:authority.elapsed};queue.publication(eventful,true);
  const view={sequence:3,unchanged:true,slotId:authority.slotId,stateSequence:authority.sequence,elapsed:authority.elapsed,pauses:[...authority.pauses],events:[],saveAvailable:true};assert.equal(queue.publication(view,false),true);queue.ack(1);
  const message=sent[1];assert.equal(receiver.accept(message.publication,{firstSequence:message.firstSequence}).sequence,3);assert.deepEqual(seen,[{id:event.id,elapsed:authority.elapsed}]);queue.ack(3);
 }finally{stop();}
});
test('an eventful state is not folded across a checkpoint, an unknown field or a changed receipt',()=>{
 for(const previousExtra of [{terrainCheckpoint:{sequence:2}},{futureProtocolField:1}]){
  const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=n=>({sequence:n,events:[{id:'event-1'}],physicsPose:null,elapsed:4,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:12,elapsed:4})});
  q.publication(full(1),true);q.publication({...full(2),...previousExtra},true);assert.equal(q.publication({sequence:3,unchanged:true,slotId:'slot',stateSequence:12,elapsed:4,pauses:[],events:[],saveAvailable:true},false),false);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);
 }
});
test('view folding rejects mismatched confirmed state',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=sequence=>({sequence,events:[],physicsPose:null,elapsed:1,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})});
 q.publication(full(1),true);q.publication(full(2),true);assert.equal(q.publication({sequence:3,unchanged:true,slotId:'slot',stateSequence:8,elapsed:1,pauses:[],events:[],saveAvailable:true},false),false);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);
});
test('view folding cannot discard a new input receipt, terrain revision or unknown field',()=>{
 for(const extra of [{presentationInput:42},{rejection:'denied'},{terrainChanged:true},{newProtocolField:'important'}]){
  const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=sequence=>({sequence,events:[],physicsPose:null,elapsed:1,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})});
  q.publication(full(1),true);q.publication(full(2),true);const view={sequence:3,unchanged:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:[],events:[],saveAvailable:true,...extra};
  assert.equal(q.publication(view,false),false);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.deepEqual(sent[2].publication,view);
 }
});
test('unobserved views merge only with adjacent equal states or a later tick',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),view=sequence=>({sequence,unchanged:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:[],events:[],saveAvailable:true});
 q.publication(packet(1),true);q.publication(view(2),false,{backgroundView:true});q.publication(view(3),false,{backgroundView:true});
 assert.equal(q.status().queued,1);q.publication(packet(4,[{id:'e'}]),true);assert.equal(q.status().queued,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,4);assert.deepEqual(sent[1].publication.events,[{id:'e'}]);
 q.publication(view(5),false,{backgroundView:true});q.publication(view(6),false,{backgroundView:true});q.message({kind:'commandResult',sequence:6});q.publication(view(7),false,{backgroundView:true});q.ack(4);assert.equal(sent[2].firstSequence,5);assert.equal(sent[2].publication.sequence,6);q.ack(6);assert.equal(sent[3].kind,'commandResult');assert.equal(sent[4].publication.sequence,7);
});
test('observed camera receipts and mismatched states remain separate barriers',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),view=(sequence,stateSequence)=>({sequence,unchanged:true,slotId:'slot',stateSequence,elapsed:1,pauses:[],events:[],saveAvailable:true});
 q.publication(packet(1),true);q.publication(view(2,7),false,{backgroundView:true});q.publication(view(3,8),false,{backgroundView:true});q.publication(view(4,8),false);assert.equal(q.status().queued,3);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);q.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('bounded admission preserves every event and pose across a stalled presentation',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:v=>sent.push(v)});let sequence=1,peak=0;q.publication(packet(sequence,[{id:`event-${sequence}`}],{actorId:'a',active:true}),true);while(sequence<129){sequence++;q.publication(packet(sequence,[{id:`event-${sequence}`}],{actorId:'a',active:true}),true);peak=Math.max(peak,q.status().queued);}assert.equal(q.status().queued,128);let acknowledged=0;while(acknowledged<1000){const item=sent[acknowledged];assert.equal(item.publication.sequence,acknowledged+1);assert.equal(item.publication.events[0].id,`event-${acknowledged+1}`);assert.equal(item.publication.physicsPose.actorId,'a');q.ack(++acknowledged);if(sequence<1000){sequence++;q.publication(packet(sequence,[{id:`event-${sequence}`}],{actorId:'a',active:true}),true);peak=Math.max(peak,q.status().queued);}}assert.equal(peak,128);assert.equal(q.status().queued,0);
});

test('presentation lifecycle facts are boundaries even without gameplay events',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:v=>sent.push(v)});
 q.publication(packet(1),true);q.publication({...packet(2),presentationJournal:[{kind:'animalGone',actorId:'a'}]},true);q.publication(packet(3),true);q.ack(1);assert.equal(sent[1].publication.sequence,2);assert.equal(sent[1].publication.presentationJournal[0].actorId,'a');q.ack(2);assert.equal(sent[2].publication.sequence,3);
});

test('a visual checkpoint stays ordered with poses and events when the receiver is slow',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),pose={actorId:'a',active:true},checkpoint={sequence:3,chunks:[{cx:1,cz:2}]};
 q.publication(packet(1,[{id:'event-1'}],pose),true);q.publication(packet(2,[{id:'event-2'}],pose),true);q.publication({...packet(3,[],pose),terrainCheckpoint:checkpoint},false);q.publication(packet(4,[{id:'event-4'}],pose),true);
 assert.equal(sent.length,1);q.ack(1);assert.equal(sent[1].publication.events[0].id,'event-2');q.ack(2);assert.deepEqual(sent[2].publication.terrainCheckpoint,checkpoint);assert.deepEqual(sent[2].publication.physicsPose,pose);q.ack(3);assert.equal(sent[3].publication.events[0].id,'event-4');q.ack(4);assert.equal(q.status().queued,0);
});

test('checkpoint on a tick keeps its exact sequence across queued quiet ticks and views',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)});
 q.publication(packet(1),true);q.publication(packet(2),true);q.publication({...packet(3),terrainCheckpoint:{sequence:3,chunks:[]}},true);q.publication(packet(4),true);q.publication(packet(5),true);
 q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);assert.equal(sent[2].publication.terrainCheckpoint.sequence,3);q.ack(3);assert.equal(sent[3].publication.sequence,5);
});

test('paused compact acknowledgements remain ordered through a stalled host queue',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=n=>({sequence:n,events:[],physicsPose:null,elapsed:1,pauses:['menu'],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})}),ack=n=>({sequence:n,unchanged:true,pausedAdvance:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false});
 q.publication(full(1),true);q.publication(full(2),true);q.publication(ack(3),true,{backgroundView:true});q.publication(ack(4),true,{backgroundView:true});q.publication({...full(5),events:[{id:'event'}]},true);q.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,5);assert.deepEqual(sent[1].publication.events,[{id:'event'}]);q.ack(5);
});
