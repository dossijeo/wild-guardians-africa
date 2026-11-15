import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';

function fixture({timeline=false}={}){
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),authority=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start),sent=[],errors=[],events=[],queued=[],port={postMessage:m=>sent.push(m),start(){},close(){}},stream=createConfirmedPresentationStream({port,session:'native-hold',state,presentationClock:clock,allowPresentationHold:true,allowPresentationInputs:true,onQueued:()=>queued.push(state.elapsed),...(timeline?{timeline:{maxPublications:2,maxBytes:50000000,manualBoundaries:true}}:{}),terrain:{ready:()=>true,confirm(){}},onError:e=>errors.push(e)}),stop=observePresentationGameEvents(state,e=>events.push(e.id));
 return {state,authority,start,clock,sent,errors,events,queued,port,stream,publish(sequence,extra={}){authority.elapsed=start+sequence;emit(authority,'Test',{sequence});port.onmessage({data:{kind:'publication',session:'native-hold',publication:{session:'native-hold',sequence,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)],...extra}}});},close(){stop();stream.dispose();clock.dispose();}};
}

test('a native hold keeps the manual timeline immutable, preserves its bounded queue and drains every publication/event in order',()=>{
 const f=fixture({timeline:true});try{f.stream.holdPresentation({releaseOnInput:false});f.publish(1);f.publish(2);f.publish(3);assert.deepEqual(f.queued,[f.start,f.start]);assert.equal(f.stream.timelineStatus().pending,2);assert.equal(f.stream.timelineStatus().waiting,true);assert.equal(f.stream.nextTimelineBoundary(),null);assert.equal(f.stream.advanceNextTimelineBoundary(),false);f.stream.advancePresentationTo(f.start+2);assert.equal(f.state.elapsed,f.start);assert.equal(f.clock.elapsed,f.start);assert.equal(f.events.length,0);assert.deepEqual(f.sent.filter(m=>m.kind==='publicationReceipt').map(m=>m.sequence),[1,2]);assert.equal(f.sent.some(m=>m.kind==='publicationAck'),false);
  f.stream.releasePresentation();assert.equal(f.state.elapsed,f.start);for(let sequence=1;sequence<=3;sequence++){assert.equal(f.stream.nextTimelineBoundary().sequence,sequence);assert(f.stream.advanceNextTimelineBoundary());assert.equal(f.state.elapsed,f.start+sequence);}assert.equal(f.stream.timelineStatus().pending,0);assert.equal(f.events.length,3);assert.equal(new Set(f.events).size,3);assert.deepEqual(f.sent.filter(m=>m.kind==='publicationAck').map(m=>m.sequence),[1,2,3]);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const releaseOnInput of [false,true])test(`native hold input policy ${releaseOnInput} sends commands without losing the held publication`,async()=>{
 const f=fixture();let pending;try{f.stream.holdPresentation({releaseOnInput});f.publish(1);assert.equal(f.state.elapsed,f.start);pending=f.stream.submitInput(7,{kind:'test'});pending.catch(()=>{});assert.equal(f.sent.at(-1).kind,'presentationInput');assert.equal(f.stream.status().holding,!releaseOnInput);assert.equal(f.state.elapsed,releaseOnInput?f.start+1:f.start);if(!releaseOnInput)f.stream.releasePresentation();f.publish(2,{presentationInput:7,value:'accepted'});assert.equal((await pending).value,'accepted');assert.deepEqual(f.sent.filter(m=>m.kind==='publicationAck').map(m=>m.sequence),[1,2]);assert.equal(f.events.length,2);assert.deepEqual(f.errors,[]);}finally{f.close();}
});
