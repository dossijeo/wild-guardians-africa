import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {projectConfirmedActorAudio} from '../src/simulation/confirmed-actor-audio.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
import {tutorialActionPauseWanted} from '../src/tutorial/action-pause.js';
import {tutorialMessageShownToday} from '../src/tutorial/daily-messages.js';

test('confirmed tutorial inputs preserve hand, pause and daily-message decisions',()=>{
 const base=newGame({seed:712}),plant=createPlant('crop','platano',0,0,'center');base.plants.push(plant);base.structures.push({id:'center',kind:'center',status:'intact',x:0,z:0});
 for(const step of ['center','plant','work'])for(const reading of [null,'magic.growth','magic.multiply','basic.plant'])for(const paused of [false,true])for(const raid of [false,true]){
  const state=structuredClone(base);state.tutorial.step=step;state.tutorial.reading=reading;state.pauses=paused?['menu']:[];state.raid=raid?{id:'raid',animals:[]}:null;state.tutorial.shownToday={day:state.day,ids:['budget.reserve']};const view=projectConfirmedActorAudio(state);
  for(const message of [null,{id:'basic.center'},{id:'basic.plant'},{id:'magic.growth'},{id:'magic.multiply'},{id:'magic.awakening'}])assert.equal(tutorialHudHandTarget(view,message),tutorialHudHandTarget(state,message));
  for(const targets of [{hudTarget:true},{worldTarget:true},{selectionOpen:true},{}])assert.equal(tutorialActionPauseWanted(view,targets),tutorialActionPauseWanted(state,targets));
  assert.equal(tutorialMessageShownToday(view,'budget.reserve'),tutorialMessageShownToday(state,'budget.reserve'));
 }
});
