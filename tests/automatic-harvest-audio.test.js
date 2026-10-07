import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import {emit,newGame} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {simulateOpening} from '../tools/check_opening.mjs';

function setup(){
  const audio=new AudioSystem({sfx:1,music:1}),calls=[];
  audio.sound=async id=>{calls.push(id);};return {audio,calls};
}

test('paid first-day automatic harvest is silent when queued but physical pickup and delivery keep their cues',()=>{
  const {state}=simulateOpening('olderMale',1,{seed:712,slotId:'automatic-harvest-audio'});
  assert.equal(state.events.filter(e=>e.type==='HarvestRequested'&&e.automatic).length,1);
  assert.equal(state.events.filter(e=>e.type==='CropPicked').length,1);
  assert.equal(state.events.filter(e=>e.type==='CrateDelivered').length,1);
  const before=serialize(state),{audio,calls}=setup();
  audio.process(state.events,{state});audio.process(state.events,{state});
  assert.equal(calls.filter(id=>id==='ui_click').length,0);
  assert.equal(calls.filter(id=>id==='farm_crop_to_crate').length,1);
  assert.equal(calls.filter(id=>id==='eco_crop_sold').length,1);
  assert.equal(serialize(state),before);
});

test('rolling automatic orders remain silent and do not suppress later deliveries or replay after stop',()=>{
  const state=newGame({seed:712,slotId:'rolling-harvest-audio'}),{audio,calls}=setup();
  for(let batch=0;batch<800;batch++){
    for(let i=0;i<3;i++)emit(state,'HarvestRequested',{automatic:true});
    emit(state,'CrateDelivered');audio.process(state.events);audio.process(state.events);
    assert.ok(audio.seen.size<=2000);
  }
  audio.stop();audio.process(state.events);
  assert.equal(calls.length,800);assert.ok(calls.every(id=>id==='eco_crop_sold'));
});

test('a consumed automatic fact cannot sound after replacement while legacy manual requests retain their route',()=>{
  const {audio,calls}=setup(),automatic={id:'a',type:'HarvestRequested',automatic:true};
  audio.process([automatic]);
  audio.process([{...automatic,automatic:false},{id:'manual',type:'HarvestRequested'}]);
  assert.deepEqual(calls,['ui_click']);
  audio.remember([{id:'saved',type:'HarvestRequested',automatic:true}]);
  audio.process([{id:'saved',type:'HarvestRequested',automatic:true}]);
  assert.deepEqual(calls,['ui_click']);
});
