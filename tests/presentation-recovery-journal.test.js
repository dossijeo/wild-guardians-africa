import {createRecoveryCheckpointEstimator,estimateRetainedBytes} from '../src/simulation/retained-size.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal,assertPresentationRecoveryBoundary,shouldCapturePresentationCheckpoint,withPresentationRecoveryCheckpoint} from '../src/simulation/presentation-recovery-journal.js';
for(const incrementalSnapshots of [false,true])test(`deferred checkpoint preserves journal and rearms once with${incrementalSnapshots?'':'out'} a base`,()=>{
 const packet=n=>({sequence:n,snapshot:JSON.stringify({value:n,padding:'x'.repeat(300)}),events:[{id:'event-'+n}],physicsPose:null}),journal=createPresentationRecoveryJournal({incrementalSnapshots});
 journal.begin(1,packet(1));journal.append(packet(2),true);journal.deferCandidate(1);assert.equal(journal.status().entries,0);assert.equal(journal.status().through,null);assert.equal(journal.status().base,null);assert.equal(journal.status().checkpointDeferred,true);assert.equal(shouldCapturePresentationCheckpoint(journal.status()),false);assert.equal(journal.append(packet(2),true),false);assert.equal(journal.status().entries,0);assert.equal(journal.retryDeferred(),true);assert.equal(journal.retryDeferred(),false);assert.equal(shouldCapturePresentationCheckpoint(journal.status()),true);journal.begin(2,packet(2));journal.confirm(2);assert.equal(journal.status().base,2);
 journal.append(packet(3),true);journal.begin(3,packet(3));journal.deferCandidate(3);journal.append(packet(4),true);assert.deepEqual(journal.snapshot().entries.map(entry=>entry.publication.events[0].id),['event-3','event-4']);assert.equal(shouldCapturePresentationCheckpoint(journal.status()),false);journal.retryDeferred();assert.equal(shouldCapturePresentationCheckpoint(journal.status()),true);journal.begin(4,packet(4));journal.confirm(4);assert.equal(journal.status().base,4);assert.deepEqual(journal.snapshot().entries,[]);journal.append(packet(5),true);assert.equal(journal.snapshot().entries[0].publication.events[0].id,'event-5');journal.dispose();
});
test('recovery folds known authority envelopes but keeps unknown kinds as boundaries',()=>{
 const journal=createPresentationRecoveryJournal({compactTicks:true});journal.begin(1);journal.confirm(1);const quiet=n=>({kind:'result',sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]});
 journal.append(quiet(2),true);journal.append(quiet(3),true);journal.append({...quiet(4),kind:'future'},true);journal.append(quiet(5),true);assert.deepEqual(journal.snapshot().entries.map(entry=>[entry.firstSequence??entry.sequence,entry.sequence]),[[2,3],[4,4],[5,5]]);journal.dispose();
});
test('recovery folds authority paused and background view envelopes',()=>{
 const journal=createPresentationRecoveryJournal();journal.begin(1);journal.confirm(1);const view=n=>({kind:'result',sequence:n,unchanged:true,slotId:'slot',stateSequence:1,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false});
 journal.append({...view(2),pausedAdvance:true,stepsExecuted:1},true);journal.append({...view(3),pausedAdvance:true,stepsExecuted:1},true);journal.append(view(4),false,{backgroundView:true});journal.append(view(5),false,{backgroundView:true});assert.deepEqual(journal.snapshot().entries.map(entry=>[entry.firstSequence??entry.sequence,entry.sequence]),[[2,3],[4,5]]);journal.dispose();
});
test('incremental recovery retains event and terrain boundaries through checkpoint renewal',()=>{
 const j=createPresentationRecoveryJournal({capacity:12,highWatermark:10,incrementalSnapshots:true}),make=(sequence,x,events=[])=>({session:'s',sequence,snapshot:JSON.stringify({workers:Array.from({length:25},(_,i)=>({id:`w${i}`,x:i?i:x,data:'x'.repeat(120)})),elapsed:sequence}),events,physicsPose:null}),first=make(1,0);
 j.begin(1,first);j.confirm(1);const second=make(2,2,[{id:'event-2'}]),third=make(3,3,[{id:'event-3'}]);j.appendTerrain(2,[{cx:0,cz:0}]);j.append(second,true);j.append(third,true);
 const saved=j.snapshot();assert.deepEqual(saved.entries.map(entry=>entry.kind),['terrain','publication','publication']);assert.equal(saved.entries[1].publication.snapshot,second.snapshot);assert.equal(saved.entries[2].publication.snapshot,third.snapshot);assert.equal(saved.entries[2].publication.events[0].id,'event-3');assert.ok(j.status().entryBytes<second.snapshot.length*2);assert.ok(j.status().overheadBytes>0);assert.equal(j.status().bytes,j.status().entryBytes+j.status().overheadBytes);
 assert.deepEqual(j.entry(2),saved.entries[2]);assert.deepEqual(j.entry(0),saved.entries[0]);assert.deepEqual(j.entry(1),saved.entries[1]);assert.deepEqual(j.entry(1),saved.entries[1]);
 j.begin(3,third);const fourth=make(4,4,[{id:'event-4'}]);j.append(fourth,true);j.confirm(3);assert.equal(j.snapshot().entries[0].publication.snapshot,fourth.snapshot);assert.equal(j.entry(0).publication.events[0].id,'event-4');j.dispose();
});
test('incremental recovery cannot start without a full checkpoint or with incompatible compaction',()=>{
 assert.throws(()=>createPresentationRecoveryJournal({incrementalSnapshots:true,compactTicks:true}),/capacity/);const journal=createPresentationRecoveryJournal({incrementalSnapshots:true});assert.throws(()=>journal.begin(1),/checkpoint snapshot/);journal.dispose();
});
test('incremental retention accounts for bases, shared preparation and replay working memory',()=>{
 let shared=1000;const journal=createPresentationRecoveryJournal({capacity:8,highWatermark:6,maxBytes:30000,highWatermarkBytes:22000,incrementalSnapshots:true,sharedRetainedBytes:()=>shared}),packet=n=>({sequence:n,snapshot:JSON.stringify({value:n,padding:'x'.repeat(1000)}),events:[],physicsPose:null}),first=packet(1);journal.begin(1,first);journal.confirm(1);
 const initial=journal.status();assert.equal(initial.entryBytes,0);assert.ok(initial.overheadBytes>4000);assert.equal(shouldCapturePresentationCheckpoint({...initial,highWatermarkBytes:initial.bytes}),false);
 journal.append(packet(2),true);const before=journal.status();assert.ok(before.entryBytes>0);journal.entry(0);const during=journal.status();assert.ok(during.overheadBytes>before.overheadBytes);shared=30000;assert.equal(journal.status().saturated,true);assert.throws(()=>journal.appendTerrain(3,[{cx:0}]),/byte capacity/);shared=1000;journal.dispose();assert.equal(journal.status().bytes,0);
});
test('incremental capacity failure preserves prior replay but rejects further encoding',()=>{
 const journal=createPresentationRecoveryJournal({capacity:8,highWatermark:6,maxBytes:12000,highWatermarkBytes:11000,incrementalSnapshots:true}),packet=n=>({sequence:n,snapshot:JSON.stringify({value:n,padding:'x'.repeat(1000)}),events:[],physicsPose:null});journal.begin(1,packet(1));journal.confirm(1);assert.throws(()=>journal.append({...packet(2),large:new Uint8Array(12000)},true),/byte capacity/);assert.deepEqual(journal.snapshot().entries,[]);assert.equal(journal.status().encoderFault,true);assert.equal(journal.status().saturated,true);assert.throws(()=>assertPresentationRecoveryBoundary(journal,{status:()=>({active:true})},{sequence:1},1),/incomplete/);assert.throws(()=>journal.append(packet(2),true),/encoder failed/);journal.dispose();
});
test('incremental clone failure cannot leave an apparently recoverable journal',()=>{
 const journal=createPresentationRecoveryJournal({incrementalSnapshots:true}),packet=n=>({sequence:n,snapshot:JSON.stringify({value:n,padding:'x'.repeat(500)}),events:[],physicsPose:null});journal.begin(1,packet(1));journal.confirm(1);assert.throws(()=>journal.append({...packet(2),invalid:()=>{}},true));assert.equal(journal.status().encoderFault,true);assert.equal(journal.status().saturated,true);assert.throws(()=>journal.append(packet(2),true),/encoder failed/);journal.dispose();
});
test('recovery compacts known path projections while retaining unknown versions as boundaries',()=>{
 const journal=createPresentationRecoveryJournal({compactTicks:true});journal.begin(1);journal.confirm(1);const packet=sequence=>({sequence,snapshot:'s'+sequence,events:[],physicsPose:null,pauses:[],presentationPaths:'head-v1'});journal.append(packet(2),true);journal.append(packet(3),true);journal.append({...packet(4),presentationPaths:'future'},true);const entries=journal.snapshot().entries;assert.deepEqual(entries.map(entry=>entry.sequence),[3,4]);assert.equal(entries[0].firstSequence,2);assert.equal(entries[0].publication.presentationPaths,'head-v1');assert.equal(entries[1].publication.presentationPaths,'future');journal.dispose();
});

test('initial recovery checkpoint enriches the ordered command without injecting another',()=>{
 const journal=createPresentationRecoveryJournal(),command={kind:'pause',reason:'hidden'},initial=withPresentationRecoveryCheckpoint(command,journal.status());
 assert.deepEqual(initial,{...command,visualTerrain:true,visualRecoveryOnly:true});assert.deepEqual(command,{kind:'pause',reason:'hidden'});
 assert.equal(withPresentationRecoveryCheckpoint(command,journal.status(),{frozen:true}),command);
 assert.equal(withPresentationRecoveryCheckpoint(command,journal.status(),{detached:true}),command);
 const explicit={kind:'snapshot',visualTerrain:true};assert.equal(withPresentationRecoveryCheckpoint(explicit,journal.status()),explicit);
 journal.begin(1);assert.equal(withPresentationRecoveryCheckpoint(command,journal.status()),command);journal.confirm(1);assert.equal(withPresentationRecoveryCheckpoint(command,journal.status()),command);journal.dispose();
});
const publication=(sequence,events=[])=>({sequence,events,snapshot:'snapshot-'+sequence,physicsPose:{actorId:'a',active:true,bones:[sequence]},presentationJournal:events.map(e=>({kind:'event',eventId:e.id}))});
test('checkpoint promotion retains every later publication, pose and event in order',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:5});
 assert.equal(j.append(publication(1),true),false);j.begin(1);
 const two=publication(2,[{id:'event-2'}]);j.append(two,true);two.events[0].id='mutated';j.append(publication(3),true,{backgroundView:false});
 assert.throws(()=>j.snapshot(),/not acknowledged/);assert.throws(()=>j.confirm(2),/mismatch/);j.confirm(1);
 const saved=j.snapshot();assert.equal(saved.base,1);assert.equal(saved.through,3);assert.equal(saved.entries[0].publication.events[0].id,'event-2');assert.deepEqual(saved.entries.map(e=>e.publication.sequence),[2,3]);assert.equal(saved.entries[1].publication.physicsPose.bones[0],3);
 saved.entries[0].publication.events.length=0;assert.equal(j.snapshot().entries[0].publication.events.length,1);
});
test('new candidate does not discard old replay until its exact acknowledgement',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:5});j.begin(1);j.confirm(1);j.append(publication(2),true);j.append(publication(3,[{id:'event-3'}]),true);j.begin(3);j.append(publication(4,[{id:'event-4'}]),true);
 assert.equal(j.snapshot().base,1);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[2,3,4]);assert.throws(()=>j.confirm(2),/mismatch/);j.confirm(3);assert.equal(j.snapshot().base,3);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[4]);
});
test('a lost graphical channel cannot promote an unacknowledged candidate or hide its pending history',()=>{
 const journal=createPresentationRecoveryJournal({capacity:8,highWatermark:6});journal.begin(1);journal.confirm(1);journal.append(publication(2,[{id:'event-2'}]),true);journal.begin(2);journal.append(publication(3,[{id:'event-3'}]),true);assert.throws(()=>assertPresentationRecoveryBoundary(journal,{status:()=>({active:false})},{sequence:1},3),/incomplete/);const saved=journal.snapshot();assert.equal(saved.base,1);assert.deepEqual(saved.entries.map(entry=>entry.publication.events[0].id),['event-2','event-3']);assert.equal(journal.status().candidate,2);journal.dispose();
});
test('journal signals saturation before capacity and never silently drops a publication',()=>{
 const j=createPresentationRecoveryJournal({capacity:3,highWatermark:2});j.begin(1);j.confirm(1);j.append(publication(2),true);j.append(publication(3),true);assert.equal(j.status().saturated,true);j.append(publication(4),true);assert.throws(()=>j.append(publication(5),true),/capacity/);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[2,3,4]);assert.throws(()=>j.append(publication(6),true),/gap/);j.dispose();assert.throws(()=>j.snapshot(),/closed/);
});

test('terrain batches precede their publication, survive candidate ACK and retain independent bytes',()=>{
 const j=createPresentationRecoveryJournal({capacity:9,highWatermark:7});j.begin(4);const bytes=new Uint8Array([1,2]);
 j.appendTerrain(5,[{cx:0,cz:0,positions:bytes}]);j.appendTerrain(5,[{cx:1,cz:0}]);j.append(publication(5,[{id:'e'}]),true);j.confirm(4);bytes[0]=99;
 assert.deepEqual(j.snapshot().entries.map(e=>[e.kind,e.sequence]),[['terrain',5],['terrain',5],['publication',5]]);assert.equal(j.snapshot().entries[0].chunks[0].positions[0],1);
 assert.throws(()=>j.appendTerrain(5,[]),/sequence gap/);assert.throws(()=>j.appendTerrain(7,[]),/sequence gap/);
 j.appendTerrain(6,[{cx:2,cz:0}]);j.append(publication(6),true);j.begin(6);j.appendTerrain(7,[{cx:3,cz:0}]);j.append(publication(7),true);j.confirm(6);assert.deepEqual(j.snapshot().entries.map(e=>[e.kind,e.sequence]),[['terrain',7],['publication',7]]);
});

test('byte pressure is bounded and releases memory only on checkpoint promotion',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:6,maxBytes:4096,highWatermarkBytes:700});j.begin(1);j.confirm(1);j.appendTerrain(2,[{pixels:new Uint8Array(900)}]);assert.ok(j.status().bytes>=900);assert.equal(j.status().saturated,true);const before=j.status().bytes;
 assert.throws(()=>j.appendTerrain(2,[{pixels:new Uint8Array(4096)}]),/byte capacity/);assert.equal(j.status().bytes,before);j.append(publication(2),true);j.begin(2);j.confirm(2);assert.equal(j.status().bytes,0);assert.equal(j.status().saturated,false);
});

test('recovery boundary fails closed on channel error, missing publication, pending terrain, candidate or saturation',()=>{
 const j=createPresentationRecoveryJournal({capacity:6,highWatermark:4}),stream={status:()=>({active:true})},checkpoint={sequence:1};j.begin(1);j.confirm(1);assert.equal(assertPresentationRecoveryBoundary(j,stream,checkpoint,1),1);
 assert.throws(()=>assertPresentationRecoveryBoundary(j,{status:()=>({active:true,recoveryFailure:'overflow'})},checkpoint,1),/incomplete/);
 assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,2),/incomplete/);
 j.appendTerrain(2,[{cx:0}]);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,1),/incomplete/);j.append(publication(2),true);assert.equal(assertPresentationRecoveryBoundary(j,stream,checkpoint,2),2);
 j.begin(2);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,2),/incomplete/);j.confirm(2);j.append(publication(3),true);j.append(publication(4),true);j.append(publication(5),true);j.append(publication(6),true);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,{sequence:2},6),/saturated/);
});

test('checkpoint renewal starts early and waits for exact candidate acknowledgement',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:4,maxBytes:100000,highWatermarkBytes:90000});
 assert.equal(shouldCapturePresentationCheckpoint(j.status()),true);j.begin(1);assert.equal(shouldCapturePresentationCheckpoint(j.status()),false);j.confirm(1);
 const p=n=>({sequence:n,snapshot:'x',events:[],physicsPose:null});
 j.append(p(2),true);assert.equal(shouldCapturePresentationCheckpoint(j.status()),false);
 j.append(p(3),true);assert.equal(shouldCapturePresentationCheckpoint(j.status()),true);
 j.begin(3);assert.equal(shouldCapturePresentationCheckpoint(j.status()),false);j.append(p(4),true);j.confirm(3);
 assert.equal(shouldCapturePresentationCheckpoint(j.status()),false);assert.equal(j.status().through,4);
});


test('compact journal keeps event, pose, terrain, pause and checkpoint boundaries',()=>{
 const j=createPresentationRecoveryJournal({capacity:30,highWatermark:20,compactTicks:true});j.begin(1);j.confirm(1);
 const quiet=n=>({sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]});
 j.append(quiet(2),true);j.append(quiet(3),true);j.append({...quiet(4),events:[{id:'event-4'}]},true);j.append(quiet(5),true);j.append({...quiet(6),physicsPose:{actorId:'a',active:true}},true);j.append(quiet(7),true);j.appendTerrain(8,[{cx:0}]);j.append(quiet(8),true);j.append({...quiet(9),pauses:['menu']},true);j.append({...quiet(10),pauses:['menu'],terrainCheckpoint:{sequence:10,chunks:[]}},true);j.begin(10);j.append({...quiet(11),pauses:['menu']},true);
 const entries=j.snapshot().entries;assert.deepEqual(entries.map(e=>[e.kind,e.firstSequence??e.sequence,e.sequence]),[['publication',2,3],['publication',4,4],['publication',5,5],['publication',6,6],['publication',7,7],['terrain',8,8],['publication',8,8],['publication',9,9],['publication',10,10],['publication',11,11]]);
 assert.equal(entries[0].publication.snapshot,'s3');assert.equal(entries[1].publication.events[0].id,'event-4');j.confirm(10);assert.deepEqual(j.snapshot().entries.map(e=>e.sequence),[11]);
});

test('compact journal never absorbs a publication carrying a terrain change',()=>{
 const j=createPresentationRecoveryJournal({compactTicks:true});j.begin(1);j.confirm(1);
 const quiet=n=>({sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[],terrainChanged:false});
 j.append(quiet(2),true);j.append({...quiet(3),terrainChanged:true},true);j.append(quiet(4),true);j.append(quiet(5),true);
 const entries=j.snapshot().entries;assert.deepEqual(entries.map(entry=>[entry.firstSequence??entry.sequence,entry.sequence]),[[2,2],[3,3],[4,5]]);assert.equal(entries[1].publication.terrainChanged,true);
});
test('compact journal treats malformed terrain metadata as a boundary',()=>{
 for(const terrainChanged of [null,'false',0]){const j=createPresentationRecoveryJournal({compactTicks:true});j.begin(1);j.confirm(1);const quiet=n=>({sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]});j.append(quiet(2),true);j.append({...quiet(3),terrainChanged},true);j.append(quiet(4),true);assert.deepEqual(j.snapshot().entries.map(entry=>entry.sequence),[2,3,4]);}
});

test('reading a replay entry seals it against later folding',()=>{
 const j=createPresentationRecoveryJournal({compactTicks:true});j.begin(1);j.confirm(1);const q=n=>({sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]});j.append(q(2),true);assert.equal(j.entry(0).sequence,2);j.append(q(3),true);assert.deepEqual(j.snapshot().entries.map(e=>e.sequence),[2,3]);
});

test('compact journal retains one snapshot for a run of 100 eligible ticks',()=>{
 const reference=createPresentationRecoveryJournal({capacity:150,highWatermark:120}),compact=createPresentationRecoveryJournal({capacity:150,highWatermark:120,compactTicks:true});
 for(const j of [reference,compact]){j.begin(1);j.confirm(1);}
 for(let n=2;n<=101;n++){const p={sequence:n,snapshot:'x'.repeat(100000)+n,events:[],physicsPose:null,pauses:[]};reference.append(p,true);compact.append(p,true);}
 assert.equal(reference.status().entries,100);assert.equal(compact.status().entries,1);assert.ok(compact.status().bytes*90<reference.status().bytes);assert.equal(compact.snapshot().entries[0].firstSequence,2);assert.equal(compact.status().through,101);
});

test('compaction never hides malformed or explicitly present motion and lifecycle data',()=>{
 for(const malformed of [{motionTrace:null},{worldMotionTrace:null},{motionInvalidation:false},{presentationJournal:{}},{physicsPoses:null},{terrainCheckpoint:null},{pauses:null}]){
  const j=createPresentationRecoveryJournal({compactTicks:true});j.begin(1);j.confirm(1);const p=n=>({sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]});j.append(p(2),true);j.append({...p(3),...malformed},true);assert.equal(j.status().entries,2,JSON.stringify(malformed));
 }
});

test('paused acknowledgements compact across long pauses but preserve replay seals and resume',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:6}),ack=n=>({sequence:n,unchanged:true,pausedAdvance:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false});j.begin(1);j.confirm(1);
 for(let n=2;n<=600;n++)j.append(ack(n),true,{backgroundView:true});assert.equal(j.status().entries,1);assert.equal(j.status().saturated,false);let [first]=j.snapshot().entries;assert.equal(first.firstSequence,2);assert.equal(first.sequence,600);
 j.entry(0);j.append(ack(601),true,{backgroundView:true});j.append(ack(602),true,{backgroundView:true});j.append(publication(603,[{id:'resume-event'}]),false);j.append(ack(604),true,{backgroundView:true});
 const entries=j.snapshot().entries;assert.deepEqual(entries.map(e=>e.sequence),[600,602,603,604]);assert.equal(entries[1].firstSequence,601);assert.deepEqual(entries[2].publication.events,[{id:'resume-event'}]);
});
test('paused acknowledgements do not fold across identity, time, terrain, poses or events',()=>{
 const j=createPresentationRecoveryJournal({capacity:20,highWatermark:18}),ack=n=>({sequence:n,unchanged:true,pausedAdvance:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false});j.begin(1);j.confirm(1);
 const overrides=[{}, {slotId:'other'}, {elapsed:2}, {pauses:['other']}, {terrainChanged:true}, {physicsPose:{actorId:'a'}}, {events:[{id:'e'}]}, {terrainCheckpoint:{}}, {presentationWorkerHeadings:[]}];for(let i=0;i<overrides.length;i++)j.append({...ack(i+2),...overrides[i]},true,{backgroundView:true});
 assert.deepEqual(j.snapshot().entries.map(e=>e.sequence),[2,3,4,5,6,7,8,9,10]);
});

test('identical background views coalesce without losing barriers or crossing a replay seal',()=>{
 const j=createPresentationRecoveryJournal({capacity:12,highWatermark:10});j.begin(1);j.confirm(1);
 const view=n=>({sequence:n,unchanged:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:[],events:[],residency:{count:1},saveAvailable:true,terrainChanged:false});
 for(let n=2;n<=100;n++)j.append(view(n),false,{backgroundView:true});
 assert.equal(j.status().entries,1);assert.equal(j.snapshot().entries[0].tick,true);assert.equal(j.snapshot().entries[0].firstSequence,2);
 j.entry(0);j.append(view(101),false,{backgroundView:true});j.append({...view(102),presentationInput:3},false,{backgroundView:true});j.append({...view(103),events:[{id:'e'}]},false,{backgroundView:true});j.append({...view(104),residency:{count:2}},false,{backgroundView:true});
 assert.deepEqual(j.snapshot().entries.map(e=>e.sequence),[100,101,102,103,104]);
});

test('quiet and paused compaction preserve input receipts, rejections and unknown fields',()=>{
 for(const variant of ['quiet','paused']){
  const j=createPresentationRecoveryJournal({capacity:20,highWatermark:18,compactTicks:true});j.begin(1);j.confirm(1);
  const make=n=>variant==='quiet'?{sequence:n,snapshot:'s'+n,events:[],physicsPose:null,pauses:[]}:{sequence:n,unchanged:true,pausedAdvance:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:['menu'],events:[],saveAvailable:true,terrainChanged:false};
  j.append(make(2),true);j.append({...make(3),presentationInput:42},true);j.append({...make(4),rejection:'denied'},true);j.append({...make(5),newProtocolField:'important'},true);j.append(make(6),true);
  const entries=j.snapshot().entries;assert.deepEqual(entries.map(e=>e.sequence),[2,3,4,5,6],variant);assert.equal(entries[1].publication.presentationInput,42);assert.equal(entries[2].publication.rejection,'denied');
 }
});

for(const incrementalSnapshots of [false,true])test(`unavailable first base does not accumulate unrecoverable publications (${incrementalSnapshots?'incremental':'full'})`,()=>{
 const journal=createPresentationRecoveryJournal({capacity:4,highWatermark:2,incrementalSnapshots}),packet=sequence=>({sequence,snapshot:JSON.stringify({value:sequence,padding:'x'.repeat(300)}),events:[{id:'e'+sequence}],physicsPose:null});
 try{journal.begin(1,packet(1));journal.append(packet(2),true);journal.deferCandidate(1);for(let sequence=3;sequence<=300;sequence++)assert.equal(journal.append(packet(sequence),true),false);assert.equal(journal.status().entries,0);assert.equal(journal.status().saturated,false);assert.throws(()=>journal.snapshot(),/not acknowledged/);assert.equal(journal.retryDeferred(),true);journal.begin(301,packet(301));journal.confirm(301);journal.append(packet(302),true);assert.deepEqual(journal.snapshot().entries.map(item=>item.publication.events[0].id),['e302']);}finally{journal.dispose();}
});

test('shared recovery retention contributes to watermarks without an incremental encoder',()=>{
 let shared=60;const journal=createPresentationRecoveryJournal({capacity:5,highWatermark:3,maxBytes:200,highWatermarkBytes:100,sharedRetainedBytes:()=>shared});
 try{assert.equal(journal.status().overheadBytes,60);assert.equal(journal.status().saturated,false);shared=100;assert.equal(journal.status().saturated,true);shared=201;assert.throws(()=>journal.begin(1,{sequence:1,snapshot:'s'}),/capacity exceeded/);shared=-1;assert.throws(()=>journal.status(),/Invalid shared snapshot retention/);}finally{journal.dispose();}
});

test('checkpoint admission projects retained entries and replacement base before confirmation',()=>{
 let shared=100;const journal=createPresentationRecoveryJournal({capacity:8,highWatermark:4,maxBytes:2000,highWatermarkBytes:1000,sharedRetainedBytes:()=>shared});
 try{journal.begin(1,{sequence:1,snapshot:'s'});assert.equal(journal.canConfirm(1,{nextSharedBytes:899}),true);assert.equal(journal.canConfirm(1,{nextSharedBytes:900}),false);assert.equal(journal.status().base,null);journal.confirm(1);journal.append({sequence:2,snapshot:'s',events:[]},true);journal.begin(2,{sequence:2,snapshot:'s'});assert.equal(journal.canConfirm(2,{previousSharedBytes:100,nextSharedBytes:999}),true);assert.equal(journal.canConfirm(2,{previousSharedBytes:100,nextSharedBytes:1000}),false);assert.throws(()=>journal.canConfirm(2,{previousSharedBytes:101}),/Invalid shared snapshot retention/);assert.equal(journal.status().base,1);}finally{journal.dispose();}
});

test('incremental checkpoint admission includes encoder and candidate retention',()=>{
 let shared=0;const journal=createPresentationRecoveryJournal({incrementalSnapshots:true,sharedRetainedBytes:()=>shared}),packet=sequence=>({sequence,snapshot:JSON.stringify({value:sequence,padding:'x'.repeat(300)}),events:[],physicsPose:null});
 try{journal.begin(1,packet(1));assert.equal(journal.canConfirm(1,{nextSharedBytes:100}),true);assert.equal(journal.canConfirm(1,{nextSharedBytes:journal.status().highWatermarkBytes}),false);journal.confirm(1);shared=100;journal.append(packet(2),true);journal.begin(2,packet(2));journal.append(packet(3),true);assert.equal(journal.canConfirm(2,{previousSharedBytes:100,nextSharedBytes:100}),true);assert.equal(journal.status().base,1);assert.equal(journal.snapshot().entries.length,2);}finally{journal.dispose();}
});

test('recovery checkpoint estimate reuses the immutable preliminary payload and accounts for work',()=>{
 let visits=0;const terrain={};Object.defineProperty(terrain,'buffer',{enumerable:true,get(){visits++;return new Uint8Array(512);}});const base={sequence:1,snapshot:'state',terrain},work={effects:[{id:'w'}]},estimator=createRecoveryCheckpointEstimator(),first=estimator.estimate(base,{preflight:true});assert.equal(visits,1);const full={...base,workCheckpoint:work},estimated=estimator.estimate(full);assert.equal(visits,1);assert.equal(estimated,first+'workCheckpoint'.length*2+estimateRetainedBytes(work));const replacement={...base,terrain:{buffer:new Uint8Array(1024)},workCheckpoint:work};assert.equal(estimator.estimate(replacement),estimateRetainedBytes(replacement));
});
