import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {projectMainThreadPublication} from '../src/simulation/main-thread-publication.js';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
import {createMainThreadHudDeltaEncoder} from '../src/simulation/main-thread-hud-delta.js';
import {createConfirmedHudDeltaDecoder} from '../src/simulation/confirmed-hud-delta.js';
import {validateConfirmedHudSchema} from '../src/simulation/confirmed-hud-projection.js';

test('HUD deltas are encoded after real coalescing against the last sent baseline',()=>{
 const state=newGame({seed:712}),wire=[],encoder=createMainThreadHudDeltaEncoder(),decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema}),queue=createHostPublicationQueue({session:'s',send:message=>wire.push(encoder.encode(message))});
 const make=(sequence,events=[])=>projectMainThreadPublication({sequence,snapshot:serializeConfirmedState(state),events,physicsPose:null,elapsed:state.elapsed,pauses:state.pauses,saveAvailable:true,terrainChanged:false},{hud:true});
 queue.publication(make(1),true);assert.equal(wire[0].publication.hudDelta.kind,'baseline');assert.equal(wire[0].publication.hudProjection,undefined);assert.equal(decoder.decode(wire[0].publication.hudDelta).sequence,1);
 state.time=1;queue.publication(make(2),true);state.time=2;queue.publication(make(3),true);state.time=3;const event={id:'event',type:'Notice'};queue.publication(make(4,[event]),true);queue.ack(1);
 assert.equal(wire[1].publication.sequence,4);assert.equal(wire[1].publication.hudDelta.base,1);assert.deepEqual(wire[1].publication.events,[event]);assert.equal(decoder.decode(wire[1].publication.hudDelta).time,3);assert.equal(typeof wire[1].publication.snapshot,'string');
});

test('unchanged acknowledgements leave the HUD base intact',()=>{const state=newGame({seed:713}),encoder=createMainThreadHudDeltaEncoder(),first=projectMainThreadPublication({sequence:1,snapshot:serializeConfirmedState(state),events:[],physicsPose:null},{hud:true}),base=encoder.encode({kind:'publication',publication:first});assert.equal(base.publication.hudDelta.sequence,1);const unchanged={kind:'publication',publication:{sequence:2,unchanged:true}};assert.equal(encoder.encode(unchanged),unchanged);const next=projectMainThreadPublication({sequence:3,snapshot:serializeConfirmedState(state),events:[],physicsPose:null},{hud:true});assert.equal(encoder.encode({kind:'publication',publication:next}).publication.hudDelta.base,1);});
