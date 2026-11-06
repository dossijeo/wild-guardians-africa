import test from 'node:test';
import assert from 'node:assert/strict';
import {dueCinematicAct} from '../src/app/campaign-cinematics.js';
import {projectConfirmedCinematic,validateConfirmedCinematicProjection} from '../src/simulation/confirmed-cinematic-projection.js';

test('cinematic projection preserves due acts for existing and older saves without mutating authority',()=>{
 for(const nights of [0,9,10,19,20,55,99,100,110])for(const seen of [undefined,null,0,1,5,9,10])for(const result of [null,'defeat','victory'])for(const postgame of [false,true])for(const hiring of [false,true]){
  const state={completedNights:nights,result,postgame,pauses:hiring?['menu','hiring']:['menu']};if(seen!==undefined)state.cinematicSeenAct=seen;const original=structuredClone(state),view=projectConfirmedCinematic(state);assert.deepEqual(state,original);assert.equal(validateConfirmedCinematicProjection(view),view);assert.equal(dueCinematicAct(view),dueCinematicAct(structuredClone(state)));
 }
});
test('cinematic wire facts reject invalid or unexpected values',()=>{const view=projectConfirmedCinematic({completedNights:30,pauses:[]});assert.throws(()=>validateConfirmedCinematicProjection({...view,cinematicSeenAct:11}),/Invalid/);assert.throws(()=>validateConfirmedCinematicProjection({...view,pauses:['menu']}),/Invalid/);assert.throws(()=>validateConfirmedCinematicProjection({...view,extra:true}),/Invalid/);});
