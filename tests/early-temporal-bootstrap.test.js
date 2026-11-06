import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {bootstrapTerrainPublication} from '../src/simulation/terrain-bootstrap-publication.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {temporalPresentationOptions} from '../src/app/temporal-presentation-options.js';

test('retained bootstrap terrain precedes the first temporal publication from real Wild Engine',async()=>{
 const options=temporalPresentationOptions({params:new URLSearchParams('qa-webgpu-temporal'),dev:true,hosted:true,early:false,recoveryEnabled:false,hasWebGpu:true});
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'temporal-bootstrap'}),snapshot=serialize(opening.state),wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),authority=createSimulationAuthority(wasm,snapshot,[...opening.loaded.keys()]);
 const channel=new MessageChannel(),applied=[],failures=[],state=deserializeConfirmedState(snapshot),clock=createConfirmedPresentationClock(state.elapsed),terrain=createConfirmedTerrainReceiver({port:channel.port2,session:'s',residency:{replace(chunk){applied.push(chunk);}},confirmedElapsed:state.elapsed,retainRevisions:true,autoBootstrap:true,maxHistory:options.presentation.maxHistory,maxHistoryBytes:options.presentation.maxHistoryBytes,validateRevision(){},onError:error=>failures.push(error)}),producer=createTerrainPublication({port:channel.port1,session:'s',epoch:'epoch',retainRevisions:true,...options.terrainHistory}),port={postMessage(){},start(){},close(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain,presentationClock:clock,timeline:{manualBoundaries:true,maxPublications:2,maxBytes:50000000},onError:error=>failures.push(error)});
 const waitUntil=async predicate=>{const deadline=Date.now()+10000;while(!predicate()){if(failures.length)throw failures[0];if(Date.now()>deadline)throw Error('Timed out waiting for terrain');await delay(5);}};
 try{
  bootstrapTerrainPublication(authority,producer);await waitUntil(()=>terrain.status().completeSequence===0&&applied.length>0);
  assert.ok(applied.every(chunk=>chunk.capturedAt===state.elapsed));assert.equal(terrain.status().confirmedSequence,0);
  const publication=authority.execute({kind:'snapshot',sequence:1});assert.equal(producer.commit(1),true);port.onmessage({data:{kind:'publication',session:'s',publication:{...publication,session:'s'}}});
  assert.equal(stream.advanceNextTimelineBoundary(),false);await waitUntil(()=>terrain.ready(1));assert.equal(stream.advanceNextTimelineBoundary(),true);assert.equal(stream.status().sequence,1);assert.deepEqual(failures,[]);
 }finally{stream.dispose();terrain.dispose();producer.dispose();clock.dispose();authority.dispose();opening.session.dispose();}
});
