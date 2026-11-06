import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal,assertPresentationRecoveryBoundary,shouldCapturePresentationCheckpoint,withPresentationRecoveryCheckpoint} from '../src/simulation/presentation-recovery-journal.js';
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
 const saved=j.snapshot();assert.deepEqual(saved.entries.map(entry=>entry.kind),['terrain','publication','publication']);assert.equal(saved.entries[1].publication.snapshot,second.snapshot);assert.equal(saved.entries[2].publication.snapshot,third.snapshot);assert.equal(saved.entries[2].publication.events[0].id,'event-3');assert.ok(j.status().bytes<second.snapshot.length*2);
 assert.deepEqual(j.entry(2),saved.entries[2]);assert.deepEqual(j.entry(0),saved.entries[0]);assert.deepEqual(j.entry(1),saved.entries[1]);assert.deepEqual(j.entry(1),saved.entries[1]);
 j.begin(3,third);const fourth=make(4,4,[{id:'event-4'}]);j.append(fourth,true);j.confirm(3);assert.equal(j.snapshot().entries[0].publication.snapshot,fourth.snapshot);assert.equal(j.entry(0).publication.events[0].id,'event-4');j.dispose();
});
test('incremental recovery cannot start without a full checkpoint or with incompatible compaction',()=>{
 assert.throws(()=>createPresentationRecoveryJournal({incrementalSnapshots:true,compactTicks:true}),/capacity/);const journal=createPresentationRecoveryJournal({incrementalSnapshots:true});assert.throws(()=>journal.begin(1),/checkpoint snapshot/);journal.dispose();
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
