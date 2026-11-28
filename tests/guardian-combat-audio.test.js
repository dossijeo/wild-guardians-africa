import test from 'node:test';import assert from 'node:assert/strict';import {AudioSystem} from '../src/audio/audio.js';import {readFileSync} from 'node:fs';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url)));
function fixture(){const audio=new AudioSystem({sfx:1,music:0}),calls=[];audio.context={state:'running',currentTime:0};audio.sound=async(id,options)=>calls.push({id,options});return {audio,calls};}
test('each species uses its own hurt cue plus the existing quiet impact, never retreat on a normal hit',()=>{for(const species of ['hyena','lion','rhino','buffalo','warthog']){const {audio,calls}=fixture(),events=[{id:'hit',type:'GuardianMagicHit',targetId:'beast',species,presentation:{x:24,z:0}}];const state={pauses:[],raid:{animals:[{id:'beast',status:'walking'}]}};audio.process(events,{state,listener:{x:0,z:0}});audio.process(events,{state});assert.deepEqual(calls.map(c=>c.id),[species+'_hurt','beast_take_damage']);for(const c of calls)assert.ok(bank.items.some(i=>i.id===c.id));assert.equal(calls[0].options.gain,.5);assert.equal(calls[1].options.gain,.225);assert.equal(calls[0].options.isCurrent(),true);audio.context.currentTime=1;assert.equal(calls[0].options.isCurrent(),false);}});
test('retreat history does not play early or duplicate the live locomotion cue',()=>{const {audio,calls}=fixture(),event={id:'flee',type:'AnimalRetreating',targetId:'rhino-1',species:'rhino',reason:'magic-resilience-exhausted'};audio.process([event],{state:{pauses:[],raid:{animals:[{id:'rhino-1',x:0,z:0}]}}});audio.process([event]);assert.deepEqual(calls,[]);assert.ok(audio.seen.has('flee'));});

test('launch and impact cues follow simulation markers across pauses and play exactly once',()=>{
 const {audio,calls}=fixture(),state={elapsed:0,pauses:[],raid:{animals:[{id:'beast',status:'walking'}]}};
 const events=[{id:'hit',type:'GuardianMagicHit',targetId:'beast',species:'hyena',presentation:{x:0,z:0,cueAt:.24}},{id:'cast',type:'SpellActivated',kind:'attack',presentation:{x:0,z:0,cueAt:.14}}];
 audio.process(events,{state});assert.equal(calls.length,0);
 state.elapsed=.14;audio.process(events,{state});assert.deepEqual(calls.map(c=>c.id),['spirit_power_activate']);
 state.pauses=['menu'];audio.context.currentTime=20;audio.process(events,{state});assert.equal(calls.length,1);
 state.pauses=[];state.elapsed=.24;audio.process(events,{state});audio.process(events,{state});
 assert.deepEqual(calls.map(c=>c.id),['spirit_power_activate','hyena_hurt','beast_take_damage']);assert.equal(calls[1].options.isCurrent(),true);
});

test('removed target, replaced scene and stale simulation clock discard pending impact cues',()=>{
 for(const reason of ['removed','scene','stale']){
  const {audio,calls}=fixture();let state={elapsed:0,pauses:[],raid:{animals:[{id:'beast',status:'walking'}]}};
  const events=[{id:'hit',type:'GuardianMagicHit',targetId:'beast',species:'hyena',presentation:{x:0,z:0,cueAt:.24}}];audio.process(events,{state});
  if(reason==='removed')state.raid=null;if(reason==='scene')state={...state};state.elapsed=reason==='stale'?2:.24;
  audio.process(events,{state});assert.equal(calls.length,0);assert.equal(audio.magicCues.pending.size,0);
 }
});


test('a slow observation crossing both markers keeps launch before impact',()=>{
 const {audio,calls}=fixture(),state={elapsed:0,pauses:[],raid:{animals:[{id:'beast',status:'walking'}]}},events=[{id:'hit',type:'GuardianMagicHit',targetId:'beast',species:'hyena',presentation:{cueAt:.24}},{id:'cast',type:'SpellActivated',kind:'attack',presentation:{cueAt:.14}}];
 audio.process(events,{state});state.elapsed=.3;audio.process(events,{state});assert.deepEqual(calls.map(c=>c.id),['spirit_power_activate','hyena_hurt','beast_take_damage']);
});


test('spell launch belongs to the Guardian, so it cannot consume the beast hurt voice slots',()=>{
 const {audio,calls}=fixture(),state={elapsed:1,pauses:[],raid:{animals:[{id:'beast',status:'walking'}]}};audio.process([{id:'cast',type:'SpellActivated',kind:'attack',targetId:'beast',presentation:{x:0,z:0,origin:{x:24,z:0},cueAt:1}}],{state,listener:{x:0,z:0}});
 assert.equal(calls[0].options.emitter,'guardian-world');assert.equal(calls[0].options.gain,.5);
});


test('impact decode cannot start after victim removal, result, clock rewind or world replacement',()=>{
 for(const reason of ['removed','gone','result','rewind','replacement']){
  const {audio,calls}=fixture(),animal={id:'beast',status:'walking'},state={elapsed:1,pauses:[],raid:{animals:[animal]}};
  audio.process([{id:'hit',type:'GuardianMagicHit',targetId:'beast',species:'hyena',presentation:{cueAt:1,x:0,z:0}}],{state});
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.options.isCurrent()));
  if(reason==='removed')state.raid=null;
  if(reason==='gone')animal.status='gone';
  if(reason==='result')state.result={won:false};
  if(reason==='rewind')state.elapsed=.5;
  if(reason==='replacement')audio.process([],{state:{elapsed:1,pauses:[]}});
  assert.ok(calls.every(c=>!c.options.isCurrent()),reason);
 }
});

for(const kind of ['growth','multiply'])test(`${kind} rejects stale queued and decoding crop cues`,()=>{
 for(const reason of ['removed','dead','result','rewind','replacement','paused','late']){
  const {audio,calls}=fixture(),plant={id:'crop',alive:true},state={elapsed:1,pauses:[],plants:[plant]};
  const event={id:'cast',type:'SpellActivated',kind,targetId:'crop',presentation:{cueAt:1}};
  audio.process([event],{state});assert.equal(calls.length,1);assert.equal(calls[0].options.isCurrent(),true);
  if(reason==='removed')state.plants=[];if(reason==='dead')plant.alive=false;if(reason==='result')state.result={won:false};if(reason==='rewind')state.elapsed=.5;if(reason==='replacement')audio.process([],{state:{elapsed:1,pauses:[],plants:[plant]}});if(reason==='paused')state.pauses=['menu'];if(reason==='late')audio.context.currentTime=1;
  assert.equal(calls[0].options.isCurrent(),false,reason);
 }
 for(const deferred of [false,true]){
  const {audio,calls}=fixture(),state={elapsed:0,pauses:[],plants:[{id:'crop',alive:true}]},event={id:'cast',type:'SpellActivated',kind,targetId:'crop',presentation:{cueAt:deferred?.2:0}};
  if(deferred)audio.process([event],{state});state.plants=[];state.elapsed=.2;audio.process([event],{state});assert.equal(calls.length,0);assert.equal(audio.magicCues.pending.size,0);
 }
});


test('Attack launch is cancelled with its vanished target before dispatch or decode',()=>{
 for(const reason of ['missing','gone'])for(const phase of ['queued','immediate','decode']){
  const {audio,calls}=fixture(),animal={id:'beast',status:'walking'},state={elapsed:0,pauses:[],raid:{animals:[animal]}};
  const event={id:'cast',type:'SpellActivated',kind:'attack',targetId:'beast',presentation:{cueAt:phase==='queued'?.14:0}};
  if(phase!=='immediate')audio.process([event],{state});
  if(phase==='decode'){assert.equal(calls.length,1);assert.equal(calls[0].options.isCurrent(),true);}
  if(reason==='missing')state.raid=null;else animal.status='gone';
  state.elapsed=.14;audio.process([event],{state});
  if(phase==='decode')assert.equal(calls[0].options.isCurrent(),false);
  else assert.equal(calls.length,0);
  assert.equal(audio.magicCues.pending.size,0);
 }
});
