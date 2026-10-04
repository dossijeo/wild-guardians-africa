import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TUTORIAL_IDS,TUTORIAL_MESSAGES,DEFENSES_FOLLOWUP} from '../src/tutorial/messages.js';
import {messages,translate} from '../public/i18n/catalog.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function setup(){
  const state=Game.newGame({seed:712});state.time=250;state.tutorial.step='done';
  const seen=new Set(TUTORIAL_IDS.filter(id=>id!=='mechanic.defenses'));
  const profile={read:()=>seen,record:id=>seen.add(id),basicCompleted:true};
  return {state,profile,controller:new TutorialController(state,profile)};
}

test('first-night defence warning updates when the raid starts and remains accurate after withdrawal',()=>{
  const {state:s,controller:c}=setup();
  assert.equal(c.presentation().id,'mechanic.defenses');
  assert.equal(c.presentation().text,TUTORIAL_MESSAGES['mechanic.defenses'].text);
  s.raid={animals:[]};c.update();
  assert.equal(c.presentation().variant,'after-raid');assert.equal(c.presentation().text,DEFENSES_FOLLOWUP.text);
  s.raid=null;s.nightPlan={done:true,group:['warthog']};c.update();
  assert.equal(c.presentation().text,DEFENSES_FOLLOWUP.text);
  assert.deepEqual(s.pauses,[],'Informational defence guidance must not pause');
});

test('a delayed defence message survives reload without announcing a first raid that already happened',()=>{
  const {state:s,profile}=setup();s.day=2;s.completedNights=1;
  const loaded=deserialize(serialize(s)),c=new TutorialController(loaded,profile);
  assert.equal(c.presentation().id,'mechanic.defenses');assert.equal(c.presentation().variant,'after-raid');
  assert.equal(c.presentation().text,DEFENSES_FOLLOWUP.text);
  assert.ok(c.advance(30));assert.ok(loaded.tutorial.seen.includes('mechanic.defenses'));
});

test('liberation removes unread and queued defence warnings without acknowledging them',()=>{
  for(const result of ['victory',null]){
    const {state:s,controller:c}=setup();s.tutorial.pending.push('mechanic.defenses');
    s.result=result;s.postgame=result===null;s.day=101;c.update();
    assert.notEqual(c.presentation()?.id,'mechanic.defenses');
    assert.ok(!s.tutorial.pending.includes('mechanic.defenses'));
    assert.ok(!s.tutorial.seen.includes('mechanic.defenses'));
  }
});

test('follow-up defence explanation has complete English and Spanish translations',()=>{
  assert.ok(messages[DEFENSES_FOLLOWUP.text]);
  assert.equal(translate(DEFENSES_FOLLOWUP.text,'es'),DEFENSES_FOLLOWUP.text);
  assert.equal(translate(DEFENSES_FOLLOWUP.text,'en'),messages[DEFENSES_FOLLOWUP.text]);
  assert.match(translate(DEFENSES_FOLLOWUP.text,'en'),/future raids/);
});
