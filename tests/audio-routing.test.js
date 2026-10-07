import {POWER_READY_SOUND_IDS} from '../src/audio/power-ready-audio.js';
import {DESTRUCTION_SOUND_ROUTES} from '../src/audio/destruction-audio.js';
import {UNLOCK_SOUND_IDS} from '../src/audio/unlock-audio.js';
import {GUARDIAN_SOUND_IDS} from '../src/audio/guardian-audio.js';
import {WORKER_SOUND_IDS} from '../src/audio/worker-audio.js';
import {FARM_CONTACT_IDS} from '../src/audio/farm-contact-audio.js';
import {ANIMAL_SOUND_IDS} from '../src/audio/animal-audio.js';
import {WALL_BUILD_SOUNDS,WALL_HIT_SOUNDS,STRUCTURE_ALERT_SOUNDS,STRUCTURE_DETAIL_SOUNDS} from '../src/audio/structure-audio.js';
import {UI_SOUND_ROUTES} from '../src/audio/ui-audio.js';
import {WORK_SOUND_IDS} from '../src/audio/work-audio.js';
import {AMBIENT_SOUND_IDS} from '../src/audio/ambient-audio.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MOVEMENT_SOUND_IDS} from '../src/audio/movement-audio.js';
import {AudioSystem,eventSound,eventExtraSound,eventAlertSound,eventRefundSound,eventSpendSound,SFX_LIMITS} from '../src/audio/audio.js';
import {simulateOpening} from '../tools/check_opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));
function context(){
 const sources=[],gains=[];
 const ctx={state:'running',currentTime:2,createBufferSource(){const s={playbackRate:{value:7},connect(){},disconnect(){this.disconnected=true;},start(when){this.when=when;this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;},createGain(){const g={gain:{value:0},connect(){},disconnect(){this.disconnected=true;}};gains.push(g);return g;}};
 return {ctx,sources,gains};
}
function fixture(){const audio=new AudioSystem({sfx:1,music:1}),f=context();audio.context=f.ctx;audio.sfxGain={};audio.musicGain={};audio.sfx=bank;audio.buffer=async url=>({url});return {...f,audio};}

test('QA-152: all 126 routes are explicit and every final MP3 is byte exact including approved 021/022',()=>{
 const routes=JSON.parse(readFileSync(new URL('../public/content/sfx-routing.json',import.meta.url),'utf8'));
 const reference=JSON.parse(readFileSync(new URL('../docs/plan/sfx_catalogo_extraido.json',import.meta.url),'utf8'));
 assert.equal(routes.items.length,126);assert.equal(new Set(routes.items.map(i=>i.id)).size,126);
 for(const item of bank.items){
  const route=routes.items.find(i=>i.id===item.id),original=reference.items.find(i=>i.id===item.id);assert.ok(route&&original,item.id);
  const data=readFileSync(new URL('../public'+item.audio.url,import.meta.url)),hash=createHash('sha256').update(data).digest('hex');
  assert.equal(hash,item.sha256);assert.equal(hash,original.sha256);assert.equal(hash,route.sha256);assert.equal(data.length,item.bytes);
  assert.equal(route.filename,item.filename);assert.equal(route.number,item.number);assert.ok(route.planned_trigger);
  const events=[...Object.keys(eventSound).filter(e=>eventSound[e]===item.id),...Object.keys(eventExtraSound).filter(e=>eventExtraSound[e]===item.id)];
  if(events.length){assert.equal(route.status,'connected');assert.deepEqual(route.destination,[...events,...(FARM_CONTACT_IDS.includes(item.id)?['native-farm-contact']:[]),...(UNLOCK_SOUND_IDS.includes(item.id)?['native-magic-unlock']:[])]);assert.equal(item.loop,false);}
  else if(Object.values(eventRefundSound).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['WallRemoved:positive-refund']);assert.equal(item.loop,false);}
  else if(Object.values(eventSpendSound).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['HiringConfirmed:positive-cost']);assert.equal(item.loop,false);}
  else if(Object.values(eventAlertSound).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,Object.keys(eventAlertSound).filter(type=>eventAlertSound[type]===item.id).map(type=>type+'-grouped-ui-warning'));assert.equal(item.loop,false);}
  else if(POWER_READY_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-magic-cooldown-ready']);assert.equal(item.loop,false);}
  else if(item.id==='game_enemy_detected'){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-raid-farm-arrival']);assert.equal(item.loop,false);}
  else if(Object.values(STRUCTURE_ALERT_SOUNDS).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,Object.keys(STRUCTURE_ALERT_SOUNDS).filter(trigger=>STRUCTURE_ALERT_SOUNDS[trigger]===item.id));assert.equal(item.loop,false);}
  else if(Object.values(STRUCTURE_DETAIL_SOUNDS).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,Object.keys(STRUCTURE_DETAIL_SOUNDS).filter(trigger=>STRUCTURE_DETAIL_SOUNDS[trigger]===item.id));assert.equal(item.loop,false);}
  else if(Object.values(DESTRUCTION_SOUND_ROUTES).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,[item.id==='wall_debris_small'?'Native building fragments: emitted batch':'Native building fragments: first ground contacts']);assert.equal(item.loop,false);}
  else if(Object.values(WALL_BUILD_SOUNDS).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,Object.keys(WALL_BUILD_SOUNDS).filter(material=>WALL_BUILD_SOUNDS[material]===item.id).map(material=>'WallChainBuilt:wall:'+material));assert.equal(item.loop,false);}
  else if(Object.values(WALL_HIT_SOUNDS).includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['StructureHit:wall:'+Object.keys(WALL_HIT_SOUNDS).find(material=>WALL_HIT_SOUNDS[material]===item.id)]);assert.equal(item.loop,false);}
  else if(GUARDIAN_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-guardian-lifecycle']);assert.equal(item.loop,false);}
  else if(WORKER_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-worker-reaction']);assert.equal(item.loop,false);}
  else if(ANIMAL_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-animal-phase']);assert.equal(item.loop,false);}
  else if(UI_SOUND_ROUTES[item.id]){assert.equal(route.status,'connected');assert.deepEqual(route.destination,[UI_SOUND_ROUTES[item.id]]);assert.equal(item.loop,false);}
  else if(FARM_CONTACT_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['native-farm-contact']);assert.equal(item.loop,false);}
  else if(WORK_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['worker-watering-activity']);assert.equal(item.loop,false);}
  else if(MOVEMENT_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['actor-foot-contact']);assert.equal(item.loop,false);}
  else if(AMBIENT_SOUND_IDS.includes(item.id)){assert.equal(route.status,'connected');assert.deepEqual(route.destination,['world-ambient-layer']);assert.equal(item.loop,true);}
  else{assert.equal(route.status,'reserved');assert.ok(route.reservation_reason);assert.deepEqual(route.destination,['sfx-library-preview']);}
 }
 assert.equal(bank.items.find(i=>i.number===21).sha256,'932df6a774847cf39bc2de324f6b8db4abea41eedfcf575a4caa5ddb91bf1290');
 assert.equal(bank.items.find(i=>i.number===22).sha256,'5c554b7ec30d174fec8becafcfa44472d1c6e65f0522a90dc643a876d4896381');
});

test('concurrent decode completion is bounded at playback, not before awaiting the buffer',async()=>{
 const {audio,sources}=fixture();let release;const pending=new Promise(resolve=>release=resolve);audio.buffer=()=>pending;
 const requests=Array.from({length:100},(_,i)=>audio.play('same-url',{family:'family-'+i}));release({});const results=await Promise.all(requests);
 assert.equal(results.filter(Boolean).length,SFX_LIMITS.total);assert.equal(audio.active.length,20);assert.equal(sources.length,20);
 audio.stop();assert.equal(audio.voices.size,0);assert.equal(audio.active.length,0);assert.ok(sources.every(s=>s.stopped&&s.disconnected));
});

test('repetitive families are bounded and a danger/result cue replaces only lower-priority SFX',async()=>{
 const {audio,sources,gains}=fixture();await Promise.all(Array.from({length:50},()=>audio.sound('farm_watering_can')));assert.equal(audio.active.length,4);
 for(let i=0;i<16;i++)await audio.play('world-'+i,{family:'world-'+i});assert.equal(audio.active.length,20);
 const first=sources[0],cue=await audio.sound('game_attack_alert');assert.ok(cue);assert.equal(first.stopped,true);assert.equal(first.disconnected,true);assert.equal(audio.active.length,20);
 assert.equal(await audio.play('routine',{family:'new-routine'}),null);assert.equal(cue.playbackRate.value,1);
 const result=await audio.sound('game_victory');assert.ok(result);assert.equal(cue.stopped,undefined);assert.equal(audio.active.length,20);
 result.onended();assert.equal(audio.active.length,19);audio.stop();assert.ok(gains.every(g=>g.disconnected));
});

test('music stems use one clock and playback cleanup without taking SFX family slots',()=>{
 const {audio,sources,gains}=fixture();for(let i=0;i<10;i++)audio.startBuffer({}, {music:true,loop:true,loopEnd:149.28,when:3.1});
 assert.equal(audio.active.length,10);assert.ok(sources.every(s=>s.when===3.1&&s.playbackRate.value===1&&s.loopEnd===149.28));
 audio.stop();assert.equal(audio.voices.size,0);assert.ok(sources.every(s=>s.stopped&&s.disconnected));assert.ok(gains.every(g=>g.disconnected));
});

test('QA-153: actual paid harvest delivery picks one mapped clip and audio does not mutate economy or RNG',async()=>{
 const {state}=simulateOpening('olderMale',1,{seed:712,slotId:'qa-audio-economy'}),before=serialize(state),deliveries=state.events.filter(e=>e.type==='CrateDelivered');assert.equal(deliveries.length,1);
 for(let replay=0;replay<2;replay++){
  const {audio,sources}=fixture();audio.process(state.events);audio.process(state.events);await new Promise(resolve=>setImmediate(resolve));
  const deliveryClip=bank.items.find(i=>i.id==='eco_crop_sold').audio.url;
  assert.equal(sources.filter(s=>s.buffer.url===deliveryClip).length,1);assert.ok(sources.every(s=>s.playbackRate.value===1));assert.equal(serialize(state),before);
  const snapshot=sources.map(s=>({url:s.buffer.url,rate:s.playbackRate.value}));assert.ok(snapshot.length>0);
 }
});

import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational} from '../src/simulation/money.js';
import {spawnRaid} from '../src/simulation/raids.js';
for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(`QA-153 ${species}: one physical structure hit selects one contact clip without extra damage or RNG`,async()=>{
 const state=Game.newGame({seed:712,slotId:'qa-audio-hit-'+species});Game.resume(state,'intro');state.ledger.balance=rational(10000);
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.activeBounds=[-48,-48,48,48];nav.setState(state);
 Game.placeStructure(state,'qa-paid-center',{x:-12,z:0},nav);state.day=3;state.completedNights=2;state.initialPreparation=false;state.tutorial.step='done';state.time=400;state.dayPlan={done:true};state.nightPlan={done:true};
 spawnRaid(state,{group:[species]},nav);assert.ok(state.raid);
 for(let i=0;i<3000&&!state.events.some(e=>e.type==='StructureHit');i++)Game.tick(state,.05,nav);
 const hits=state.events.filter(e=>e.type==='StructureHit');assert.equal(hits.length,1);assert.ok(state.structures[0].hp<600);
 const before=serialize(state),{audio,sources}=fixture();audio.process(state.events);audio.process(state.events);await new Promise(resolve=>setImmediate(resolve));
 const hitClip=bank.items.find(i=>i.id==='beast_hit_structure').audio.url;assert.equal(sources.filter(s=>s.buffer.url===hitClip).length,1);assert.equal(serialize(state),before);
});
