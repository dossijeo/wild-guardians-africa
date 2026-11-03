import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
const packet=(sequence,events=[],physicsPose=null)=>({sequence,events,physicsPose,snapshot:String(sequence)});
test('folding preserves observed path segments and refuses discontinuous boundaries',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),trace=(start,end)=>({actorId:'a',start:{at:start,x:start,z:0},end:{at:end,x:end,z:0},segments:[{at:end,x0:start,z0:0,x1:end,z1:0,t0:start,t1:end}],continuous:true,timed:true});
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace(0,1)},true);q.publication({...packet(3),motionTrace:trace(1,2)},true);q.publication({...packet(4),motionTrace:trace(3,4)},true);q.ack(1);
 assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.motionTrace.segments.length,2);assert.equal(sent[1].publication.motionTrace.end.x,2);assert.equal(sent[1].publication.motionTrace.timed,true);q.ack(3);assert.equal(sent[2].publication.sequence,4);
});
test('observed paths are not discarded when tracking changes or the segment cap is reached',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),point={at:1,x:0,z:0},trace={actorId:'a',start:point,end:point,segments:Array(4096).fill({at:1,x0:0,z0:0,x1:0,z1:0}),continuous:true};
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace},true);q.publication({...packet(3),motionTrace:{...trace,segments:[trace.segments[0]]}},true);q.publication(packet(4),true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);q.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('a motion invalidation stays ordered between observed path publications',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)}),p={at:1,x:0,z:0},trace={actorId:'a',start:p,end:p,segments:[],continuous:true,timed:true},invalidation={actorId:'a',at:1,x:0,z:0,reason:'pause'};
 q.publication(packet(1),true);q.publication({...packet(2),motionTrace:trace},true);q.publication({...packet(3),motionInvalidation:invalidation},false);q.publication({...packet(4),motionTrace:trace},true);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.deepEqual(sent[2].publication.motionInvalidation,invalidation);q.ack(3);assert.equal(sent[3].publication.sequence,4);
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
test('active pose snapshots coalesce only while their owners remain the same',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);
 q.publication(packet(2,[],{actorId:'a',active:true}),true);q.publication(packet(3,[],{actorId:'a',active:true}),true);q.publication(packet(4,[],{actorId:'b',active:true}),true);q.publication(packet(5,[],{actorId:'b',active:false}),true);
 assert.equal(q.status().coalesced,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);q.ack(3);assert.equal(sent[2].publication.sequence,4);q.ack(4);assert.equal(sent[3].publication.sequence,5);
});
test('diagnostics count queued snapshots and eventful barriers without counting messages',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',diagnostics:true,send:value=>sent.push(value)});q.publication(packet(1),true);q.publication({...packet(2),snapshot:'abcdef'},true);q.publication({...packet(3,[{id:'e'}]),snapshot:'xyz'},true);q.message({kind:'commandResult',id:1,sequence:3});q.publication({...packet(4,[{id:'f'}]),snapshot:'12345'},true);
 let s=q.status();assert.equal(s.queuedPublications,2);assert.equal(s.eventfulPublications,2);assert.equal(s.tickPublications,2);assert.equal(s.unchangedPublications,0);assert.equal(s.snapshotChars,8);assert.equal(s.peakEventfulPublications,2);q.ack(1);s=q.status();assert.equal(s.queuedPublications,1);assert.equal(s.snapshotChars,5);q.ack(3);assert.equal(q.status().snapshotChars,0);assert.equal(sent.at(-1).publication.sequence,4);
});
test('an unchanged camera confirmation can share the preceding quiet state without changing its receipt',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=sequence=>({sequence,events:[],physicsPose:null,elapsed:1,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})});
 q.publication(full(1),true);q.publication(full(2),true);const receipt={session:'s',sequence:3,unchanged:true,slotId:'slot',stateSequence:7,elapsed:1,pauses:[],events:[],saveAvailable:true};
 assert.equal(q.publication(receipt,false),true);q.message({kind:'commandResult',id:5,sequence:3,receipt});q.publication(full(4),true);q.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.snapshot,full(2).snapshot);q.ack(3);assert.equal(sent[2].receipt,receipt);assert.equal(sent[3].publication.sequence,4);
});
test('view folding rejects mismatched confirmed state',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',foldViews:true,send:value=>sent.push(value)}),full=sequence=>({sequence,events:[],physicsPose:null,elapsed:1,pauses:[],saveAvailable:true,snapshot:JSON.stringify({slotId:'slot',sequence:7,elapsed:1})});
 q.publication(full(1),true);q.publication(full(2),true);assert.equal(q.publication({sequence:3,unchanged:true,slotId:'slot',stateSequence:8,elapsed:1,pauses:[],events:[],saveAvailable:true},false),false);q.ack(1);assert.equal(sent[1].publication.sequence,2);q.ack(2);assert.equal(sent[2].publication.sequence,3);
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
