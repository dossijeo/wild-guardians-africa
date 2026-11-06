import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {MessageChannel} from 'node:worker_threads';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createTemporalSurfaceRecovery} from '../src/rendering/temporal-surface-recovery.js';
import {createTemporalRecoveryReceiver} from '../src/rendering/temporal-recovery-receiver.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';
import {createPresentationRecoveryReplay} from '../src/simulation/presentation-recovery-replay.js';

test('journal replay reaches real temporal state and terrain receivers before acknowledging events',async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),authority=deserialize(serialize(state)),clock=createConfirmedPresentationClock(state.elapsed),events=[],port=()=>({postMessage(){},start(){},close(){}});let stream;
 const terrain=createConfirmedTerrainReceiver({port:port(),session:'s',confirmedSequence:1,confirmedElapsed:state.elapsed,retainRevisions:true,allowReplay:true,validateRevision:()=>{},residency:{replace(){throw Error('legacy terrain path');}},prepareGraphicalBatch:async messages=>{await stream.waitForTerrainSuppression(messages[0].sequence);return {commit(){events.push('terrain');return true;},abort(){}};},onApplied:()=>events.push('applied')});
 stream=createConfirmedPresentationStream({port:port(),session:'s',state,terrain,initialSequence:1,presentationClock:clock,timeline:{maxPublications:2,maxBytes:50000000,manualBoundaries:true,replay:true}});
 const stop=observePresentationGameEvents(state,event=>events.push(event.type)),surface=createTemporalSurfaceRecovery({stream,terrain,validateCheckpoint:m=>assert.equal(m.sequence,1),prepareCheckpoint:async()=>({sequence:1,epoch:'e',commit:()=>true,abort(){}})}),channel=new MessageChannel(),journal=createPresentationRecoveryJournal({strictBoundaries:true}),checkpoint={sequence:1,snapshot:serializeConfirmedState(state)},manifest={epoch:'e',chunks:[{cx:0,cz:0,revision:1}]};
 authority.elapsed+=1;emit(authority,'ReplayEvent');const publication={session:'s',sequence:2,elapsed:authority.elapsed,snapshot:serializeConfirmedState(authority),events:[authority.events.at(-1)]};journal.begin(1,checkpoint);journal.confirm(1);journal.appendTerrain(2,[{cx:0,cz:0}],manifest);journal.append(publication,true);
 let resolveCaught,rejectCaught;const caught=new Promise((resolve,reject)=>{resolveCaught=resolve;rejectCaught=reject;}),receiver=createTemporalRecoveryReceiver({port:channel.port2,session:'s',restoreCheckpoint:surface.restoreTimelineCheckpoint,applyBoundary:surface.applyTimelineRecoveryBoundary,onError:rejectCaught}),replay=createPresentationRecoveryReplay({port:channel.port1,session:'s',checkpoint,journal,atomicBoundaries:true,onCaughtUp:resolveCaught,onError:rejectCaught});
 try{const result=await caught;assert.equal(result.sequence,2);assert.equal(receiver.status().cursor,2);assert.deepEqual(events,['terrain','applied','ReplayEvent']);assert.equal(stream.status().sequence,2);assert.equal(surface.finishTimelineRecovery(),true);}finally{replay.dispose();receiver.dispose();journal.dispose();channel.port1.close();channel.port2.close();stop();stream.dispose();terrain.dispose();clock.dispose();}
});
