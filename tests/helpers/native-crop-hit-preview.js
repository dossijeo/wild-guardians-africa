import assert from 'node:assert/strict';
import {createConfirmedHistoricalClock} from '../../src/rendering/confirmed-historical-clock.js';
import {createConfirmedHistoricalMotionGroup} from '../../src/rendering/confirmed-historical-motion-group.js';
import {createConfirmedMotionFeed} from '../../src/rendering/confirmed-motion-feed.js';
import {createConfirmedPresentationClock} from '../../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedTimelinePump} from '../../src/rendering/confirmed-timeline-pump.js';
import {observePresentationGameEvents} from '../../src/simulation/game.js';
import {createMainSnapshotEncoder} from '../../src/simulation/main-thread-snapshot-transport.js';

// Replay the exact before-state and publication emitted by the two-target WASM fixture.
export function checkCropHitPreview(before,publication,nativeCropLease){
 assert(nativeCropLease());
 for(const mode of ['motion only','read during commit','generic observer','released','release during preview','invalid tape']){
  const state=structuredClone(before),message=structuredClone(publication);
  const eventIds=message.events.map(event=>event.id),expected=[{at:message.elapsed,eventIds,count:4}];
  const sequence=message.sequence,seen=[],notifications=[];
  let deferred=0,reads=0,terrainReads=0,released=mode==='released',certificates=0;
  if(mode==='invalid tape')message.historicalEventBoundaries.boundaries.at(-1).changed.push(['invalid']);
  const port={postMessage(){},start(){},close(){}},encoder=createMainSnapshotEncoder();
  const clock=createConfirmedPresentationClock(state.elapsed);
  const history=createConfirmedHistoricalClock({initialElapsed:state.elapsed,initialSequence:sequence-1});
  const feed=createConfirmedMotionFeed({prepareTerrainSupport(value){
   terrainReads++;assert.equal(value.sequence,sequence);assert.equal(value.trace.end,message.elapsed);
   return null;
  }});
  const stream=createConfirmedPresentationStream({
   port,session:'crop',state,initialSequence:sequence-1,presentationClock:clock,
   terrain:{ready:()=>true,matchesManifest:()=>true,confirm(){}},
   timeline:{maxPublications:2,maxBytes:5000000,manualBoundaries:true,experimentalHistoricalEvents:true},
   onHistoricalBoundary(){},onMotion:feed.accept,onError:error=>{throw error;}
  });
  const group=createConfirmedHistoricalMotionGroup({animals:{nativeCropLease:()=>released?null:nativeCropLease()},
   getSupport:()=>null,inputPolicy:'ordered-boundary'});
  const pump=createConfirmedTimelinePump({stream,historicalPlayback:{...group,clock:history,certify(...args){certificates++;return group.certify(...args);}},
   deferredEventObserver:mode!=='generic observer',onPreview(value,boundary,reader){
    notifications.push(value?.sequence??null);
    if(reader){deferred++;if(mode==='release during preview')released=true;}
    if(value&&['released','generic observer'].includes(mode))assert.deepEqual(value.eventBoundaries,expected);
    feed.offerPreview(value,boundary,reader?()=>{reads++;return reader();}:null);
   }});
  const stop=observePresentationGameEvents(state,event=>{
   seen.push(event.id);
   if(mode==='read during commit'||mode==='invalid tape'){
    const readonly=feed.getReadonlyPreview();
    assert.deepEqual(readonly.eventBoundaries,mode==='invalid tape'?undefined:expected);
    if(readonly.eventBoundaries){
     assert(Object.isFrozen(readonly.eventBoundaries[0].eventIds));
     feed.getPreview().eventBoundaries.pop();
     assert.equal(feed.getReadonlyPreview(),readonly);
    }
   }
  });
  try{
   port.onmessage({data:encoder.encode({kind:'publication',session:'crop',publication:{...message,session:'crop'}})});
   assert.equal(pump.advance(),1);
   assert.deepEqual(seen,eventIds);assert.deepEqual(notifications,[sequence,null]);
   assert.equal(stream.status().sequence,sequence);assert.equal(state.elapsed,message.elapsed);
   assert.equal(feed.getPreview(),null);assert.equal(terrainReads,1);
   assert.deepEqual(state,JSON.parse(message.snapshot));
   if(mode==='release during preview')assert(certificates>0,'released owner allows event slice certification');
   assert.equal(deferred,['released','generic observer'].includes(mode)?0:1);
   assert.equal(reads,['read during commit','invalid tape'].includes(mode)?1:0);
  }finally{stop();pump.dispose();stream.dispose();feed.dispose();clock.dispose();history.dispose();encoder.dispose();}
 }
}
