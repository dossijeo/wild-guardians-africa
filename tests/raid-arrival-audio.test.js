import test from 'node:test';
import assert from 'node:assert/strict';
import {RaidArrivalAudio} from '../src/audio/raid-arrival-audio.js';
import {AudioSystem,soundPriority} from '../src/audio/audio.js';
import {raidFarmBounds} from '../src/world/farm-envelope.js';
const flush=()=>new Promise(done=>setImmediate(done));
function fixture(){let time=0;const calls=[],stopped=[],actor={id:'a',status:'entering',x:30,z:0},raid={id:'r',animals:[actor]},state={elapsed:0,plants:[],structures:[{status:'intact',x:0,z:0}],pauses:[],raid};
 const audio=new RaidArrivalAudio((id,opts)=>{const source={};calls.push({id,opts,source});return source;},s=>stopped.push(s),()=>time);
 return {audio,calls,stopped,actor,state,clock:dt=>time+=dt,step(dt=.1){time+=dt;state.elapsed+=dt;audio.update(state);}};
}
test('farm bounds match live crops and intact buildings, frozen only by the observers',()=>{
 assert.equal(raidFarmBounds({plants:[],structures:[]}),null);
 assert.deepEqual(raidFarmBounds({plants:[{alive:true,x:-20,z:2},{alive:false,x:999,z:999}],structures:[{status:'intact',x:10,z:8},{status:'ruined',x:888,z:888}]}),[-32,-10,22,20]);
});
test('one physical arrival per group, independent of the camera and not the spawn alert',async()=>{
 const f=fixture();f.audio.update(f.state);for(let i=0;i<30;i++)f.step();assert.equal(f.calls.length,0);
 f.actor.x=11;f.state.raid.animals.push({id:'b',status:'attacking',x:2,z:0});f.step();await flush();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'game_enemy_detected');assert.equal(f.calls[0].opts.bus,'ui');assert.equal(f.calls[0].opts.gain,1);
 for(let i=0;i<200;i++)f.step();f.actor.x=30;f.step();f.actor.x=5;f.step();assert.equal(f.calls.length,1);
});
for(const status of ['entering','walking','attacking'])test('loaded animal already inside '+status+' seeds silently',()=>{
 const f=fixture();f.actor.x=0;f.actor.status=status;f.audio.update(f.state);for(let i=0;i<10;i++)f.step();assert.equal(f.calls.length,0);
});
test('retreating and gone animals cannot trigger detection; missing farm cannot trigger',()=>{
 for(const status of ['retreating','gone']){const f=fixture();f.audio.update(f.state);f.actor.x=0;f.actor.status=status;f.step();assert.equal(f.calls.length,0);}
 const f=fixture();f.state.structures=[];f.audio.update(f.state);f.actor.x=0;f.step();assert.equal(f.calls.length,0);
});
test('long live frame catches current arrival without rebuilding bounds per frame',()=>{
 const f=fixture();f.audio.update(f.state);f.state.plants.push({alive:true,x:100,z:0});f.step();assert.equal(f.calls.length,0);f.actor.x=0;f.step(2);assert.equal(f.calls.length,1);
});
test('paused/resumed and replaced snapshots never replay an existing detection',async()=>{
 const f=fixture();f.audio.update(f.state);f.actor.x=0;f.step();await flush();f.state.pauses=['menu'];f.step();assert.equal(f.stopped.length,1);
 f.state.pauses=[];f.step();f.step();assert.equal(f.calls.length,1);const loaded=structuredClone(f.state);f.audio.update(loaded);loaded.elapsed+=.1;f.audio.update(loaded);assert.equal(f.calls.length,1);
});
test('next raid receives its own cue while an elapsed rewind seeds silently',()=>{
 const f=fixture();f.audio.update(f.state);f.actor.x=0;f.step();assert.equal(f.calls.length,1);
 f.state.raid={id:'next',animals:[{...f.actor,x:30}]};f.step();f.state.raid.animals[0].x=0;f.step();assert.equal(f.calls.length,2);
 f.state.elapsed=0;f.audio.update(f.state);f.step();assert.equal(f.calls.length,2);
});
for(const reason of ['expired','pause','retreat','raid-end','replace','dispose'])test('late detection decode rejected after '+reason,async()=>{
 const f=fixture();let resolve;f.audio.play=(id,opts)=>{f.calls.push({id,opts});return new Promise(done=>resolve=done);};f.audio.update(f.state);f.actor.x=0;f.step();
 if(reason==='expired')f.clock(.6);if(reason==='pause')f.state.pauses=['hidden'];if(reason==='retreat')f.actor.status='retreating';if(reason==='raid-end')f.state.raid=null;if(reason==='replace')f.audio.update(structuredClone(f.state));if(reason==='dispose')f.audio.dispose();
 assert.equal(!!f.calls[0].opts.isCurrent(),false);const source={};resolve(source);await flush();assert(f.stopped.includes(source));
});
test('failed cue never changes state, events or RNG',async()=>{
 const f=fixture();f.audio.update(f.state);f.actor.x=0;f.state.elapsed=.1;f.audio.play=()=>Promise.reject(Error('audio failure'));const before=JSON.stringify(f.state);assert.doesNotThrow(()=>f.audio.update(f.state));await flush();assert.equal(JSON.stringify(f.state),before);
});
test('AudioSystem connects arrival to the bounded UI danger bus and releases it on stop',async()=>{
 const audio=new AudioSystem({sfx:1,music:0});audio.context={state:'running',currentTime:0};audio.prepareAnimalSounds=()=>{};const played=[],stopped=[];audio.sound=async(id,opts)=>{played.push({id,opts});return {};};audio.stopVoice=s=>stopped.push(s);
 const f=fixture();audio.updateAnimals(f.state);f.actor.x=0;f.state.elapsed=.1;audio.updateAnimals(f.state);await flush();assert.equal(played.filter(p=>p.id==='game_enemy_detected').length,1);assert.equal(soundPriority('game_enemy_detected'),3);audio.stop();assert.equal(stopped.length,1);
});
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],activeBounds:[-96,-96,96,96]};
for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(species+' paid center and actual domain raid movement cross the farm once',async()=>{
 const state=Game.newGame({seed:712,slotId:'arrival-'+species});Game.resume(state,'intro');Game.placeStructure(state,'center',{x:4,z:0},nav);state.time=400;state.dayPlan={done:true};state.nightPlan={done:true};
 const calls=[],audio=new RaidArrivalAudio((id,opts)=>{calls.push({id,opts,elapsed:state.elapsed});return {};},()=>{},()=>state.elapsed);audio.update(state);spawnRaid(state,{group:[species]},nav);audio.update(state);
 for(let i=0;i<5000&&state.raid;i++){Game.tick(state,.05,nav);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);await flush();}
 assert.equal(state.raid,null);assert.equal(calls.length,1);assert.equal(calls[0].id,'game_enemy_detected');assert(calls[0].elapsed>0);
 assert.equal(state.events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(state.events.filter(e=>e.type==='RaidEnded').length,1);
});

import {readFileSync} from 'node:fs';
test('arrival sound preloads with the upcoming species and shares one cached decode',async()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url))),loads=[];
 const audio=new AudioSystem({sfx:0,music:0},{json:async()=>bank,bytes:async url=>{loads.push(url);return {};}});audio.context={state:'running',decodeAudioData:async b=>b};
 const state={day:2,nightPlan:{group:['warthog','hyena']}};audio.prepareAnimalSounds(state);audio.prepareAnimalSounds(state);await Promise.all(audio.animalSoundPreparation.values());
 const alert=bank.items.find(i=>i.id==='game_enemy_detected').audio.url;
 assert.equal(loads.filter(url=>url===alert).length,1);assert.equal(loads.length,9);assert.equal(audio.buffers.size,9);
});
