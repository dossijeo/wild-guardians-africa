import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';

for(const mode of ['ready','unresolved','terrain','hold','replace'])test('real receiver checkpoint 521 before source 522: '+mode,async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
 const model=deserialize(serialize(state)),start=state.elapsed,clock=createConfirmedPresentationClock(start);
 const port={postMessage:m=>messages.push(m),start(){},close(){}},messages=[],faults=[],confirmed=[],facts=[];
 let finish,release,current=true,checkpointPrepared=0;
 const stream=createConfirmedPresentationStream({port,state,session:'q',initialSequence:516,presentationClock:clock,allowPresentationHold:true,
  timeline:{manualBoundaries:true,checkpoints:true,maxPublications:8,maxBytes:50000000},terrain:{ready:s=>s!==522||mode!=='terrain',confirm:s=>confirmed.push(s)},
  onError:e=>faults.push(e.message),prepareWorkCheckpoint:m=>{
   checkpointPrepared++;
   const data={version:1,sequence:m.sequence,effects:[]};
   return mode==='unresolved'?new Promise(resolve=>{finish=()=>resolve(data);}):data;
  }});
 const stop=observePresentationGameEvents(state,e=>facts.push(e.id));
 const pump=createConfirmedTimelinePump({stream,maxBoundaries:4});
 const preparing=pump.withOrdinaryPublications(()=>new Promise(resolve=>{release=resolve;}),{minSequence:522});
 try{
  for(let sequence=517;sequence<=522;sequence++){
   model.elapsed=start+(sequence-516)*.05;emit(model,'Test',{sequence});
   port.onmessage({data:{kind:'publication',session:'q',publication:{session:'q',sequence,elapsed:model.elapsed,snapshot:serializeConfirmedState(model),
    events:[model.events.at(-1)],...(sequence===521?{terrainCheckpoint:{sequence,chunks:[]}}:{})}}});
  }
  const yields=[];
  const count=await pump.advanceNativePreparationSource({isCurrent:()=>current,yieldBetween:async()=>{
   const s=stream.status().sequence;yields.push(s);
   if(s===521){assert.equal(stream.nextTimelineBoundary(),null);assert.equal(stream.timelineStatus().receivedSequence,522);}
   await new Promise(resolve=>setImmediate(resolve));
   if(s===521&&mode==='hold')stream.holdPresentation();
   if(s===521&&mode==='replace')current=false;
  }});
  assert.deepEqual(faults,[]);
  const end=mode==='ready'?522:521;
  assert.equal(stream.status().sequence,end);
  assert.equal(count,mode==='replace'?null:end-516);
  assert.deepEqual(yields,[520,521]);
  assert.deepEqual(confirmed,Array.from({length:end-516},(_,i)=>517+i));
  assert.deepEqual(facts,model.events.slice(-6).slice(0,end-516).map(e=>e.id));
  assert.equal(facts.length,end-516);
  assert.equal(checkpointPrepared,1);
  assert.equal(messages.filter(m=>m.workCheckpoint?.sequence===521).length,mode==='unresolved'?0:1);
 }finally{finish?.();release();await preparing;stop();pump.dispose();stream.dispose();clock.dispose();}
});
