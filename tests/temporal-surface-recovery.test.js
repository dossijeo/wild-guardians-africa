import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createTemporalSurfaceRecovery} from '../src/rendering/temporal-surface-recovery.js';

test('surface recovery applies admitted terrain before replayed state events',async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),authority=deserialize(serialize(state)),clock=createConfirmedPresentationClock(state.elapsed),events=[],wire=[],port=()=>({postMessage:m=>wire.push(m),start(){},close(){}});let stream,release;
 const terrain=createConfirmedTerrainReceiver({port:port(),session:'s',confirmedSequence:1,confirmedElapsed:state.elapsed,retainRevisions:true,allowReplay:true,validateRevision:()=>{},residency:{replace(){throw Error('legacy terrain path');}},prepareGraphicalBatch:async messages=>{const suppressed=await stream.waitForTerrainSuppression(messages[0].sequence);assert.deepEqual(suppressed,authority.suppressed);await new Promise(resolve=>{release=resolve;});return {commit(){events.push('terrain');return true;},abort(){events.push('abort');}};},onApplied:()=>events.push('applied')});
 stream=createConfirmedPresentationStream({port:port(),session:'s',state,terrain,initialSequence:1,presentationClock:clock,timeline:{maxPublications:2,maxBytes:50000000,manualBoundaries:true,replay:true}});const stop=observePresentationGameEvents(state,event=>events.push(event.type));
 const recovery=createTemporalSurfaceRecovery({stream,terrain,validateCheckpoint:message=>assert.equal(message.sequence,1),prepareCheckpoint:async()=>({sequence:1,epoch:'e',commit:()=>true,abort(){}})});
 try{assert.equal(await recovery.restoreTimelineCheckpoint({sequence:1}),true);authority.elapsed+=1;emit(authority,'ReplayEvent');const boundary={sequence:2,publication:{session:'s',sequence:2,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)]},terrain:[{chunks:[{cx:0,cz:0}],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}}]};const pending=recovery.applyTimelineRecoveryBoundary(boundary);while(!release)await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,[]);assert.equal(stream.status().sequence,1);release();assert.equal(await pending,true);assert.deepEqual(events,['terrain','applied','ReplayEvent']);assert.equal(stream.status().sequence,2);assert.equal(recovery.finishTimelineRecovery(),true);assert.deepEqual(wire,[]);}finally{stop();stream.dispose();terrain.dispose();clock.dispose();}
});

test('failed checkpoint post-processing stops recovery without reporting success',async()=>{let aborts=0,errors=0;const stream={queueReplayBoundary(){},advanceNextTimelineBoundary(){},finishTimelineReplay(){}},terrain={beginReplay(){},stageReplayBoundary(){},waitForReplayBoundary(){},finishReplay(){}},recovery=createTemporalSurfaceRecovery({stream,terrain,validateCheckpoint(){},prepareCheckpoint:async()=>({sequence:1,epoch:'e',commit:()=>true,abort:()=>{aborts++;}}),onCheckpoint:async()=>{throw Error('effects restore failed');},onError:()=>errors++});await assert.rejects(recovery.restoreTimelineCheckpoint({sequence:1}),/effects restore failed/);assert.equal(recovery.status().phase,'failed');assert.equal(errors,1);assert.equal(aborts,1);assert.throws(()=>recovery.finishTimelineRecovery(),/not caught up/);});
