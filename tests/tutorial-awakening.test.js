import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TUTORIAL_IDS,TUTORIAL_MESSAGES} from '../src/tutorial/messages.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {messages,translate} from '../public/i18n/catalog.js';

const id='magic.awakening';
function setup(){
  const state=Game.newGame({seed:712});state.day=2;state.completedNights=1;
  awakeningState(state);
  state.tutorial.step='done';state.tutorial.basicSkipped=true;
  const seen=new Set(TUTORIAL_IDS.filter(item=>item!==id));
  const profile={read:()=>seen,record:item=>seen.add(item),basicCompleted:true};
  return {state,profile,controller:new TutorialController(state,profile)};
}

test('the first full charge teaches the choice once without pausing or consuming it',()=>{
  const {state,profile,controller}=setup();
  state.awakenings.progress=99;controller.update();assert.notEqual(controller.presentation()?.id,id);
  state.awakenings.progress=100;controller.update();
  assert.equal(controller.presentation().id,id);assert.equal(controller.presentation().blocking,false);
  assert.equal(state.awakenings.progress,100);assert.deepEqual(state.pauses,[]);
  assert.equal(controller.dismiss(),true);assert.equal(state.awakenings.progress,100);
  state.awakenings.progress=0;controller.update();state.awakenings.progress=100;controller.update();
  assert.notEqual(controller.presentation()?.id,id);
  const restored=new TutorialController(deserialize(serialize(state)),profile);
  assert.notEqual(restored.presentation()?.id,id);
  const another=Game.newGame({seed:12});another.tutorial.basicSkipped=true;another.tutorial.step='done';awakeningState(another).progress=100;
  assert.notEqual(new TutorialController(another,profile).presentation()?.id,id);
});

test('the lesson waits behind another reading and survives saving before acknowledgement',()=>{
  const {state,profile,controller}=setup();
  state.tutorial.reading='worker.recovery';state.awakenings.progress=100;controller.update();
  assert.equal(controller.presentation().id,'worker.recovery');assert.ok(state.tutorial.pending.includes(id));
  const loaded=deserialize(serialize(state)),restored=new TutorialController(loaded,profile);
  assert.equal(restored.presentation().id,'worker.recovery');restored.acknowledge();
  assert.equal(restored.presentation().id,id);assert.equal(loaded.awakenings.progress,100);
});

test('the guardian explanation is available in Spanish and English',()=>{
  const text=TUTORIAL_MESSAGES[id].text;
  assert.equal(translate(text,'es'),text);assert.equal(translate(text,'en'),messages[text]);
  assert.match(messages[text],/crop or a wall/);assert.match(messages[text],/cancel/i);
});
