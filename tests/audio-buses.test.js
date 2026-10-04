import {FARM_CONTACT_IDS} from '../src/audio/farm-contact-audio.js';
import {WORKER_SOUND_IDS} from '../src/audio/worker-audio.js';
import {UiAudio,UI_SOUND_IDS} from '../src/audio/ui-audio.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem,SFX_LIMITS,eventAudioOptions,soundBus} from '../src/audio/audio.js';
function fixture(){
 const sources=[],nodes=[],audio=new AudioSystem({sfx:.4,music:.7});
 audio.context={state:'running',destination:{},async resume(){},close(){this.state='closed';},createGain(){const node={gain:{value:0},connect(to){this.destination=to;},disconnect(){this.disconnected=true;}};nodes.push(node);return node;},createBufferSource(){const source={playbackRate:{value:0},connect(to){this.destination=to;},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;}};sources.push(source);return source;}};
 return {audio,sources,nodes};
}

test('native portrait disappearance uses the complete original UI source beyond visual closure',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:['spirit_appear','spirit_disappear'].map(id=>({id,loop:false,audio:{url:id}}))};audio.buffer=async url=>({url,duration:url==='spirit_appear'?1.6:2.48});
 audio.guardianPhase('intro');await new Promise(done=>setImmediate(done));audio.guardianPhase('reading');audio.guardianPhase('outro');await new Promise(done=>setImmediate(done));audio.guardianPhase('closed');
 assert.equal(sources.length,2);assert.ok(sources[0].stopped);assert.equal(sources[1].stopped,undefined);assert.equal(sources[1].buffer.duration,2.48);assert.equal(sources[1].playbackRate.value,1);assert.equal(sources[1].loop,false);
 const voice=audio.voices.get(sources[1]);assert.equal(voice.bus,'ui');assert.equal(voice.emitter,'guardian-avatar');assert.equal(voice.volume.destination,audio.sfxBuses.ui);
 audio.stop();assert.ok(sources[1].stopped);assert.equal(audio.guardianAudio.voice,null);audio.dispose();
});

test('context suspension invalidates pending portrait audio and resumes its phase silently',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.context.suspend=()=>{audio.context.state='suspended';};audio.context.resume=async()=>{audio.context.state='running';};
 audio.sfx={items:[{id:'spirit_appear',loop:false,audio:{url:'appear'}}]};let resolve;audio.buffer=()=>new Promise(done=>resolve=done);
 audio.guardianPhase('intro');await new Promise(done=>setImmediate(done));assert.equal(typeof resolve,'function');audio.suspend();audio.resume();resolve({});await new Promise(done=>setImmediate(done));
 audio.guardianPhase('intro');audio.guardianPhase('reading');assert.equal(sources.length,0);audio.dispose();
});

test('four original NPC reactions share one voice family, pitch and world bus',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:WORKER_SOUND_IDS.map(id=>({id,loop:false,audio:{url:id}}))};audio.buffer=async url=>({url});
 for(let i=0;i<4;i++)assert.ok(await audio.sound(WORKER_SOUND_IDS[i],{family:'worker-voice',emitter:'w'+i,bus:'world'}));
 assert.equal(await audio.sound(WORKER_SOUND_IDS[0],{family:'worker-voice',emitter:'w4',bus:'world'}),null);
 assert.equal(sources.length,4);assert.ok(sources.every(s=>s.playbackRate.value===1&&!s.loop));
 assert.ok([...audio.voices.values()].every(v=>v.family==='worker-voice'&&v.bus==='world'&&v.volume.destination===audio.sfxBuses.world));audio.dispose();
});

test('context suspension invalidates a pending NPC reaction before another frame',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.context.suspend=()=>{audio.context.state='suspended';};audio.context.resume=async()=>{audio.context.state='running';};
 audio.sfx={items:[{id:'npc_danger_react',loop:false,audio:{url:'danger'}}]};let resolve;audio.buffer=()=>new Promise(done=>resolve=done);
 const worker={id:'worker',status:'idle',x:0,z:0},state={elapsed:0,pauses:[],workers:[worker],tasks:[],raid:null};audio.updateWorkers(state);
 state.raid={};worker.status='fleeing';state.elapsed=.1;audio.updateWorkers(state);await new Promise(done=>setImmediate(done));assert.equal(typeof resolve,'function');
 audio.suspend();audio.resume();resolve({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);audio.dispose();
});
test('four buses preserve public music/SFX controls, remain reusable on stop and release on disposal',async()=>{
 const {audio,nodes}=fixture();await audio.unlock();const buses=audio.sfxBuses;
 assert.equal(audio.musicGain.gain.value,.7);assert.equal(audio.sfxGain.gain.value,.4);
 for(const bus of ['ambient','world','ui']){const source=audio.startBuffer({}, {bus});assert.equal(audio.voices.get(source).volume.destination,buses[bus]);assert.equal(buses[bus].destination,audio.sfxGain);}
 const music=audio.startBuffer({}, {music:true});assert.equal(audio.voices.get(music).volume.destination,audio.musicGain);
 audio.stop();assert.ok(Object.values(buses).every(node=>!node.disconnected));
 await audio.unlock();assert.equal(audio.sfxBuses,buses);audio.settings.sfx=0;audio.settings.music=.3;audio.volume();assert.equal(audio.sfxGain.gain.value,0);assert.equal(audio.musicGain.gain.value,.3);
 audio.dispose();assert.ok(nodes.every(node=>node.disconnected));assert.equal(audio.context.state,'closed');
});
test('a repeated emitter across different sound families is bounded after concurrent decode',async()=>{
 const {audio}=fixture();await audio.unlock();let release;
 // Share one deferred decode, as the real buffer cache does.
 const pending=new Promise(resolve=>release=resolve);audio.buffer=()=>pending;
 const requests=Array.from({length:60},(_,i)=>audio.play('same',{family:'work-'+i,emitter:'worker-1'}));release({});
 const accepted=await Promise.all(requests);assert.equal(accepted.filter(Boolean).length,SFX_LIMITS.perEmitter);
 assert.equal(audio.startBuffer({}, {family:'other',emitter:'worker-2'})!==null,true);audio.dispose();
});
test('rejecting a cue under two independent saturated limits does not partially evict voices',async()=>{
 const {audio}=fixture();await audio.unlock();
 const local=Array.from({length:2},(_,i)=>audio.startBuffer({}, {family:'local-'+i,emitter:'worker',priority:1}));
 const family=Array.from({length:4},(_,i)=>audio.startBuffer({}, {family:'contact',emitter:'animal-'+i,priority:4}));
 assert.equal(audio.startBuffer({}, {family:'contact',emitter:'worker',priority:3}),null);
 assert.equal(audio.active.length,6);assert.ok([...local,...family].every(source=>!source.stopped));
 // With a lower-priority family, admission satisfies both scopes atomically.
 for(const source of family)audio.voices.get(source).priority=1;
 const cue=audio.startBuffer({}, {family:'contact',emitter:'worker',priority:3});assert.ok(cue);
 assert.equal(local.filter(source=>source.stopped).length,1);assert.equal(family.filter(source=>source.stopped).length,1);
 assert.equal([...audio.voices.values()].filter(v=>v.emitter==='worker').length,2);
 assert.equal([...audio.voices.values()].filter(v=>v.family==='contact').length,4);audio.dispose();
});
test('native worker/animal metadata chooses positional world cues while UI and results stay unattenuated',()=>{
 const state={workers:[{id:'worker-1',x:48,z:0}],raid:{animals:[{id:'animal-1',x:24,z:0}]},structures:[{id:'center',x:0,z:0}]},listener={x:0,z:0};
 assert.deepEqual(eventAudioOptions({type:'WaterSatisfied',workerId:'worker-1',targetId:'crop'},'farm_watering_can',state,listener),{bus:'world',emitter:'worker-1',gain:.2});
 assert.deepEqual(eventAudioOptions({type:'StructureHit',animalId:'animal-1',targetId:'center'},'beast_hit_structure',state,listener),{bus:'world',emitter:'animal-1',gain:.5});
 assert.equal(eventAudioOptions({type:'WorkerHit',animalId:'animal-1',targetId:'worker-1'},'npc_hit',state,listener).emitter,'worker-1');
 assert.deepEqual(eventAudioOptions({type:'RaidSpawned'},'game_attack_alert',state,listener),{bus:'ui'});
 assert.equal(soundBus('amb_night'),'ambient');assert.equal(soundBus('ui_click'),'ui');assert.equal(soundBus('farm_harvest_pick'),'world');
});

test('a foot contact invalidated or expired during decode never creates a voice',async()=>{
 const {audio,sources}=fixture();await audio.unlock();let resolve,current=true;audio.buffer=()=>new Promise(done=>resolve=done);
 const pending=audio.play('step',{emitter:'worker',isCurrent:()=>current});current=false;resolve({});assert.equal(await pending,null);assert.equal(sources.length,0);audio.dispose();
});

test('context suspension cancels a pending foot contact even when no simulation frame runs',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.context.suspend=()=>{audio.context.state='suspended';};audio.context.resume=async()=>{audio.context.state='running';};
 audio.sfx={items:[{id:'step_dry_soil',loop:false,audio:{url:'step'}}]};let resolve;audio.buffer=()=>new Promise(done=>resolve=done);
 const time=FOOTSTEPS.sources.olderMale.clips.Walk_Skip.contacts[0].time,worker={id:'worker',profile:'olderMale',status:'walking',x:0,z:0,walkPhase:time-.1},state={workers:[worker],biome:'sabana',elapsed:0,pauses:[]};
 audio.updateMovement(state);worker.x=.144;worker.walkPhase=time+.1;state.elapsed=.2;audio.updateMovement(state);await new Promise(done=>setImmediate(done));assert.equal(typeof resolve,'function');
 audio.suspend();audio.resume();resolve({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);audio.dispose();
});

test('native ambient loops use the ambient child bus and share SFX budgets without changing simulation',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:['amb_wind_soft','amb_birds'].map(id=>({id,loop:true,audio:{url:id}}))};audio.buffer=async url=>({url});
 const state={biome:'sabana',time:0,pauses:[]},before=JSON.stringify(state);audio.updateAmbient(state);await new Promise(done=>setImmediate(done));
 assert.equal(sources.length,2);assert.equal(JSON.stringify(state),before);assert.ok(sources.every(source=>source.loop&&source.playbackRate.value===1));
 for(const voice of audio.voices.values()){assert.equal(voice.volume.destination,audio.sfxBuses.ambient);assert.equal(voice.priority,0);assert.ok(voice.emitter.startsWith('ambient:'));}
 audio.stop();assert.equal(audio.active.length,0);assert.equal(audio.ambient.entries.size,0);audio.dispose();
});
test('leaving while original ambient MP3s decode prevents every late loop from starting',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:['amb_wind_soft','amb_birds'].map(id=>({id,loop:true,audio:{url:id}}))};const pending=[];audio.buffer=()=>new Promise(done=>pending.push(done));
 audio.updateAmbient({biome:'sabana',time:0,pauses:[]});await new Promise(done=>setImmediate(done));assert.equal(pending.length,2);audio.stop();for(const resolve of pending)resolve({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);audio.dispose();
});


test('native work audio uses one unpitched world source and completion events do not replay it',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:[{id:'farm_watering_can',loop:false,audio:{url:'watering'}}]};audio.buffer=async()=>({});
 const worker={id:'worker',profile:'olderFemale',taskId:'task',status:'acting',actionRemaining:2,x:0,z:0},state={workers:[worker],tasks:[{id:'task',kind:'water'}],pauses:[]};audio.updateWork(state);await new Promise(done=>setImmediate(done));assert.equal(sources.length,1);assert.equal(sources[0].playbackRate.value,1);assert.equal(audio.voices.get(sources[0]).volume.destination,audio.sfxBuses.world);
 worker.status='idle';audio.process([{id:'water-end',type:'WaterSatisfied',workerId:'worker'}],{state});audio.updateWork(state);await new Promise(done=>setImmediate(done));assert.equal(sources.length,1);assert.ok(sources[0].stopped);assert.equal(audio.active.length,0);audio.dispose();
});
test('suspending during work decode invalidates its request even before the next frame',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:[{id:'farm_watering_can',loop:false,audio:{url:'watering'}}]};let resolve;audio.buffer=()=>new Promise(done=>resolve=done);audio.context.suspend=()=>{audio.context.state='suspended';};
 audio.updateWork({workers:[{id:'worker',profile:'olderFemale',status:'acting',taskId:'task',actionRemaining:1}],tasks:[{id:'task',kind:'water'}],pauses:[]});await new Promise(done=>setImmediate(done));audio.suspend();await audio.unlock();resolve({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);audio.dispose();
});


test('native UI transition decodes into the UI child bus while stale panel-open requests stay silent',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:UI_SOUND_IDS.map(id=>({id,loop:false,audio:{url:id}}))};let release;const pending=new Promise(done=>release=done);audio.buffer=()=>pending;
 const ui=new UiAudio((id,opts)=>audio.sound(id,opts));ui.surface('panel','seed');ui.close();await new Promise(done=>setImmediate(done));release({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,1);assert.equal(audio.voices.get(sources[0]).family,'ui_panel_close');assert.equal(audio.voices.get(sources[0]).volume.destination,audio.sfxBuses.ui);assert.equal(sources[0].playbackRate.value,1);assert.equal(sources[0].loop,false);audio.dispose();
});
test('leaving the production UI cancels pending one-shots without affecting the next scene',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:UI_SOUND_IDS.map(id=>({id,loop:false,audio:{url:id}}))};let release;audio.buffer=()=>new Promise(done=>release=done);const ui=new UiAudio((id,opts)=>audio.sound(id,opts));ui.surface('panel');await new Promise(done=>setImmediate(done));ui.reset();audio.stop();release({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);assert.equal(audio.active.length,0);audio.dispose();
});

test('native animal activity uses original unpitched world audio and preserves its family/emitter',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:[{id:'lion_attack',loop:false,audio:{url:'lion-original'}}]};audio.buffer=async url=>({url});const state={elapsed:0,pauses:[],raid:{animals:[]}};audio.updateAnimals(state);state.raid.animals.push({id:'lion',species:'lion',status:'attacking',attackId:'native-one',x:24,z:0});state.elapsed=.1;const before=JSON.stringify(state);audio.updateAnimals(state,{listener:{x:0,z:0}});await new Promise(done=>setImmediate(done));assert.equal(JSON.stringify(state),before);assert.equal(sources.length,1);const voice=audio.voices.get(sources[0]);assert.equal(sources[0].playbackRate.value,1);assert.equal(voice.family,'animal-attack');assert.equal(voice.emitter,'lion');assert.equal(voice.volume.gain.value,.25);assert.equal(voice.volume.destination,audio.sfxBuses.world);audio.stop();assert.equal(audio.active.length,0);assert.equal(audio.animals.entries.size,0);audio.dispose();
});
test('context suspension invalidates pending native animal activity even before the next frame',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.context.suspend=()=>{audio.context.state='suspended';};audio.sfx={items:[{id:'lion_attack',loop:false,audio:{url:'lion-original'}}]};let release;audio.buffer=()=>new Promise(done=>release=done);const state={elapsed:0,pauses:[],raid:{animals:[]}};audio.updateAnimals(state);state.raid.animals.push({id:'lion',species:'lion',status:'attacking',attackId:'native-one',x:0,z:0});state.elapsed=.1;audio.updateAnimals(state);await new Promise(done=>setImmediate(done));audio.suspend();await audio.unlock();release({});await new Promise(done=>setImmediate(done));assert.equal(sources.length,0);audio.dispose();
});

test('seed purchase and crop-to-crate facts select receipts instead of replaying physical sow/pick contacts',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.sfx={items:['ui_buy','farm_crop_to_crate','farm_seeds_drop','farm_harvest_pick'].map(id=>({id,loop:false,audio:{url:id}}))};audio.buffer=async url=>({url});const events=[{id:'purchase',type:'CropPlaced'},{id:'pick',type:'CropPicked',workerId:'worker'}];audio.process(events);audio.process(events);await new Promise(done=>setImmediate(done));assert.deepEqual(sources.map(s=>s.buffer.url),['ui_buy','farm_crop_to_crate']);assert.deepEqual([...audio.voices.values()].map(v=>v.bus),['ui','world']);audio.dispose();
});
test('original can and soil contact coexist only during the authored pour without changing pitch',async()=>{
 const {audio,sources}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:['farm_watering_can','farm_water_soil'].map(id=>({id,loop:false,audio:{url:id}}))};audio.buffer=async url=>({url});const worker={id:'worker',profile:'olderFemale',taskId:'task',status:'acting',actionRemaining:3.4,x:0,z:0},state={elapsed:0,pauses:[],workers:[worker],tasks:[{id:'task',kind:'water',targetId:'plant'}],plants:[{id:'plant',alive:true}],crates:[]};audio.updateWork(state);audio.updateFarm(state);worker.actionRemaining=2.7;state.elapsed=.1;audio.updateWork(state);audio.updateFarm(state);await new Promise(done=>setImmediate(done));assert.deepEqual(sources.map(s=>s.buffer.url),['farm_watering_can','farm_water_soil']);assert.ok(sources.every(s=>s.playbackRate.value===1&&!s.loop));assert.ok([...audio.voices.values()].every(v=>v.emitter==='worker'&&v.volume.destination===audio.sfxBuses.world));worker.actionRemaining=.1;state.elapsed=.2;audio.updateWork(state);audio.updateFarm(state);assert.equal(audio.active.length,0);audio.dispose();
});
test('sowing and seed layers share four family slots and two slots per worker after concurrent decode',async()=>{
 const {audio}=fixture();await audio.unlock();audio.context.currentTime=0;audio.sfx={items:FARM_CONTACT_IDS.map(id=>({id,loop:false,audio:{url:id}}))};audio.buffer=async()=>({});const workers=Array.from({length:20},(_,i)=>({id:'worker-'+i,profile:'olderFemale',taskId:'task-'+i,status:'acting',actionRemaining:7.2,x:0,z:0})),state={elapsed:0,pauses:[],workers,tasks:workers.map((w,i)=>({id:w.taskId,kind:'initial',targetId:'plant-'+i})),plants:workers.map((w,i)=>({id:'plant-'+i,alive:true})),crates:[]};audio.updateFarm(state);workers.forEach(w=>w.actionRemaining=5.9);state.elapsed=.1;audio.updateFarm(state);await new Promise(done=>setImmediate(done));assert.equal(audio.active.length,4);assert.ok([...audio.voices.values()].every(v=>v.family==='farm-plant-contact'));for(const w of workers)assert.ok([...audio.voices.values()].filter(v=>v.emitter===w.id).length<=2);audio.stop();assert.equal(audio.farm.entries.size,0);audio.dispose();
});
