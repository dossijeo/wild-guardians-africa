import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';

test('optional authority clock segments preserve simulation and validate with confirmed states',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'clock-segments'});opening.state.time=299.99;opening.state.elapsed=299.99;const snapshot=serialize(opening.state),keys=[...opening.loaded.keys()],baseline=createSimulationAuthority(module,snapshot,keys),observed=createSimulationAuthority(module,snapshot,keys),visible=deserializeConfirmedState(snapshot),clock=createConfirmedPresentationClock(visible.elapsed),port={postMessage(){},start(){},close(){}},receiver=createConfirmedPresentationStream({port,session:'s',state:visible,presentationClock:clock,terrain:{ready:()=>true,confirm(){}},timeline:{manualBoundaries:true,maxPublications:8,maxBytes:50000000}}),pump=createConfirmedTimelinePump({stream:receiver});
 try{let sequence=0;for(const command of [{kind:'advance',seconds:.1,nightFastForward:true},{kind:'pause',reason:'clock-test'},{kind:'advance',seconds:.1,nightFastForward:true}]){sequence++;const a=baseline.execute({...command,sequence}),b=observed.execute({...command,sequence,...(command.kind==='advance'?{captureClockSegments:true}:{})});assert.equal(b.snapshot,a.snapshot);assert.deepEqual(b.events,a.events);if(command.kind==='advance'){assert.equal(b.clockSegments.version,1);assert.equal(b.clockSegments.complete,true);assert.equal(b.clockSegments.end,b.elapsed);if(sequence===1)assert.deepEqual(b.clockSegments.segments.map(segment=>segment.rate),[1,5]);if(sequence===3)assert.deepEqual(b.clockSegments.segments,[]);}port.onmessage({data:{kind:'publication',session:'s',publication:{...b,session:'s'}}});assert.equal(pump.advance(),1);assert.equal(clock.elapsed,b.elapsed);assert.equal(pump.status().lastClock?.sequence??null,command.kind==='advance'?sequence:null);}
 }finally{pump.dispose();receiver.dispose();clock.dispose();baseline.dispose();observed.dispose();opening.session.dispose();}
});
