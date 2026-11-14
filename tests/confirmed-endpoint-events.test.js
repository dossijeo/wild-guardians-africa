import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {confirmedEventsAtEndpoint} from '../src/rendering/confirmed-endpoint-events.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createMainSnapshotEncoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {observePresentationGameEvents} from '../src/simulation/game.js';

const publication=()=>({events:[{id:'a',simulationTime:2},{id:'b',simulationTime:2}],presentationJournalVersion:2,presentationJournal:[{kind:'event',eventId:'a',at:2},{kind:'event',eventId:'b',at:2}]});
test('only exact endpoint event references may wait for the normal commit',()=>{
 assert.equal(confirmedEventsAtEndpoint(publication(),1,2),true);
 assert.equal(confirmedEventsAtEndpoint({events:[],presentationJournal:[]},1,2),true);
 for(const mutate of [p=>p.events[0].simulationTime=1.5,p=>p.presentationJournal[0].at=1.5,p=>p.presentationJournal.reverse(),p=>p.presentationJournal.pop(),p=>p.presentationJournal.push({kind:'cast',at:2}),p=>p.events[1].id='a',p=>delete p.presentationJournalVersion,p=>p.settlements=[{id:'input'}],p=>p.motionInvalidation={at:2},p=>p.events[0].simulationTime=2-Number.EPSILON,p=>p.events=[]]){
  const p=publication();mutate(p);assert.equal(confirmedEventsAtEndpoint(p,1,2),false);
 }
 assert.equal(confirmedEventsAtEndpoint(publication(),2,2),false);
});

for(const seconds of [.02,.1])test(`real mangrove events ${seconds===.02?'at endpoint':'inside interval'} retain state and delivery order until commit`,()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot=gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString(),state=deserialize(snapshot),keys=[];
 for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true,captureHyenaDiagnostics:false}),clock=createConfirmedPresentationClock(state.elapsed),encoder=createMainSnapshotEncoder(),port={postMessage(){},start(){},close(){}},events=[];
 const stream=createConfirmedPresentationStream({port,session:'s',state,presentationClock:clock,timeline:{maxPublications:3,maxBytes:50000000,manualBoundaries:true},terrain:{ready:()=>true,matchesManifest:()=>true,confirm(){}}}),stop=observePresentationGameEvents(state,event=>events.push({id:event.id,elapsed:state.elapsed,clock:clock.elapsed}));
 try{
  const message=authority.execute({kind:'advance',sequence:1,seconds,nightFastForward:false,captureClockSegments:true});
  assert.ok(message.events.length>0);assert.equal(message.events[0].type,'AnimalTargetUnavailable');
  port.onmessage({data:encoder.encode({kind:'publication',session:'s',publication:{...message,session:'s'}})});
  const before=JSON.stringify(state),preview=stream.previewNextMotionBoundary();
  assert.equal(preview.reasons.includes('events'),seconds!==.02);if(seconds===.02)assert.ok(preview.reasons.includes('separation'),'endpoint timing must not bypass unresolved initial body overlaps');assert.equal(preview.safeForAutonomousPlayback,false,'timing alone never authorizes GPU motion');
  assert.equal(JSON.stringify(state),before);assert.equal(clock.elapsed,preview.start);assert.deepEqual(events,[]);
  assert.equal(stream.advanceNextTimelineBoundary(),true);
  assert.deepEqual(events.map(e=>e.id),message.events.map(e=>e.id));assert.ok(events.every(e=>e.elapsed===message.elapsed&&e.clock===message.elapsed));
  assert.equal(stream.advanceNextTimelineBoundary(),false);assert.equal(events.length,message.events.length);
 }finally{stop();stream.dispose();clock.dispose();encoder.dispose();authority.dispose();}
});
