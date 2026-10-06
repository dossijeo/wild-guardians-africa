import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem,eventSound,eventExtraSound,eventAlertSound} from '../src/audio/audio.js';
import {emit,newGame} from '../src/simulation/game.js';

function fixture(){
  const audio=new AudioSystem({sfx:1,music:1}),calls=[];
  audio.sound=async(id,options)=>{calls.push({id,options});};
  return {audio,calls};
}

test('quiet frames do not revisit IDs or allocate a replacement deduplication set',()=>{
  const {audio,calls}=fixture();let reads=0;
  const history=Array.from({length:200},(_,i)=>({get id(){reads++;return `event-${i}`;},type:'CropPlaced'}));
  audio.process(history);const initial=reads,seen=audio.seen;
  for(let frame=0;frame<1000;frame++)audio.process(history);
  assert.equal(reads,initial);assert.equal(audio.seen,seen);assert.equal(calls.length,200);
  history.push({id:'new',type:'HarvestRequested'});audio.process(history);
  assert.equal(reads,initial);assert.equal(calls.at(-1).id,'ui_click');assert.equal(calls.length,201);
});

test('actual Game.emit rolling history delivers each new fact once beyond the deduplication cap',()=>{
  const {audio,calls}=fixture(),state=newGame({seed:123,slotId:'audio-history'});
  for(let batch=0;batch<800;batch++){
    for(let i=0;i<3;i++)emit(state,'CropPlaced');
    audio.process(state.events,{state});audio.process(state.events,{state});
    assert.ok(state.events.length<=200);assert.ok(audio.seen.size<=2000);
  }
  assert.equal(calls.length,2400);assert.ok(calls.every(call=>call.id==='ui_buy'));
});

test('losing the old anchor falls back to processing the complete available history',()=>{
  const {audio,calls}=fixture(),history=Array.from({length:200},(_,i)=>({id:`old-${i}`,type:'CropPlaced'}));
  audio.process(history);calls.length=0;
  history.splice(0,history.length,...Array.from({length:200},(_,i)=>({id:`new-${i}`,type:'HarvestRequested'})));
  audio.process(history);audio.process(history);
  assert.equal(calls.length,200);assert.ok(calls.every(call=>call.id==='ui_click'));
});

test('replacement, copies, reordering, truncation and empty histories preserve ID deduplication',()=>{
  const {audio,calls}=fixture(),a={id:'a',type:'CropPlaced'},b={id:'b',type:'HarvestRequested'},c={id:'c',type:'HiringConfirmed'};
  const history=[a,b];audio.process(history);audio.process([b,a]);audio.process([...history,c]);
  history.length=1;audio.process(history);history.length=0;audio.process(history);
  history.push(c,{id:'d',type:'CrateDelivered'});audio.process(history);audio.process(history);
  assert.deepEqual(calls.map(call=>call.id),['ui_buy','ui_click','ui_confirm','eco_crop_sold']);
});

test('remember seeds the cursor silently and a restored history only plays subsequent events',()=>{
  const {audio,calls}=fixture(),history=[{id:'saved',type:'GameOver'}];
  audio.remember(history);audio.process(history);assert.equal(calls.length,0);assert.equal(audio.musicEvent,undefined);
  history.push({id:'next',type:'CampaignWon'});audio.process(history);audio.process(history);
  assert.equal(calls.length,1);assert.equal(calls[0].id,'game_victory');assert.equal(audio.musicEvent,'success');
  const restored=[{id:'saved',type:'CropPlaced'}];audio.remember(restored);audio.process(restored);
  restored.push({id:'next',type:'GameOver'});audio.process(restored);
  assert.equal(calls.length,2);assert.equal(calls[1].id,'game_major_loss');assert.equal(audio.musicEvent,'failure');
});

test('music-only and global audio stops do not replay processed event history',()=>{
  const {audio,calls}=fixture(),history=[{id:'first',type:'CropPlaced'}];audio.process(history);
  audio.stopMusic();audio.process(history);audio.stop();audio.process(history);
  assert.equal(calls.length,1);history.push({id:'second',type:'HarvestRequested'});audio.process(history);
  assert.equal(calls.length,2);
});

test('unknown event types and repeated undefined IDs retain the existing dispatcher contract',()=>{
  const {audio,calls}=fixture(),history=[{id:'unknown',type:'NotAnAudioEvent'},{type:'CropPlaced'},{type:'HarvestRequested'}];
  audio.process(history);history.push({id:'unknown',type:'HiringConfirmed'},{id:'known',type:'HiringConfirmed'});
  audio.process(history);assert.deepEqual(calls.map(call=>call.id),['ui_buy','ui_confirm']);
});

test('failed asynchronous playback is consumed once while following events still dispatch',async()=>{
  const {audio,calls}=fixture();audio.sound=async id=>{calls.push({id});throw new Error('decode failed');};
  const history=[{id:'first',type:'CropPlaced'}];audio.process(history);audio.process(history);
  history.push({id:'second',type:'HarvestRequested'});audio.process(history);
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls.map(call=>call.id),['ui_buy','ui_click']);
});

test('all logical audio routes keep their original selection when histories roll',()=>{
  const {audio,calls}=fixture(),state=newGame({seed:123,slotId:'audio-routing'});
  for(let i=0;i<200;i++)emit(state,'Unmapped');audio.remember(state.events);
  for(const type of Object.keys(eventSound))emit(state,type);
  audio.process(state.events,{state});audio.process(state.events,{state});
  assert.deepEqual(calls.map(call=>call.id),Object.entries(eventSound).flatMap(([type,id])=>[id,...(eventAlertSound[type]?[eventAlertSound[type]]:[]),...(eventExtraSound[type]?[eventExtraSound[type]]:[])]));
  assert.equal(calls.find(call=>call.id==='beast_hit_structure').options.family,'structure-contact');
});
