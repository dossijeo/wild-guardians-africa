import test from 'node:test';
import assert from 'node:assert/strict';
import {captureHyenaTickSamples} from '../src/simulation/worker-hyena-tick-samples.js';

test('records every supplied tick boundary without inventing phase between samples',()=>{
 const actor={id:'h',species:'hyena',status:'walking',motionPhase:1,path:[{}]},game={elapsed:4,raid:{animals:[actor]}},capture=captureHyenaTickSamples(game);
 game.elapsed=4.02;actor.motionPhase=1.01;capture.sample();game.elapsed=4.04;actor.motionPhase=1.01;capture.sample();const observed=capture.finish();assert.equal(observed.complete,true);assert.deepEqual(observed.actors[0].samples.map(x=>[x.at,x.motionPhase]),[[4,1],[4.02,1.01],[4.04,1.01]]);
});
test('rejects missing ticks, invalid data, replacement and post-sample mutations',()=>{
 const make=()=>{const actor={id:'h',species:'hyena',status:'walking'},game={elapsed:1,raid:{animals:[actor]}};return {actor,game,capture:captureHyenaTickSamples(game)};};
 {const {game,capture}=make();game.elapsed=2;assert.equal(capture.finish().complete,false);}
 {const {actor,game,capture}=make();game.elapsed=2;actor.motionPhase=NaN;capture.sample();assert.equal(capture.finish().complete,false);}
 {const {actor,game,capture}=make();game.raid.animals=[{...actor}];game.elapsed=2;capture.sample();assert.equal(capture.finish().complete,false);}
 {const {actor,capture}=make();actor.status='attacking';assert.equal(capture.finish().complete,false);}
});
