import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem,SFX_LIMITS,eventAudioOptions,soundBus} from '../src/audio/audio.js';
function fixture(){
 const sources=[],nodes=[],audio=new AudioSystem({sfx:.4,music:.7});
 audio.context={state:'running',destination:{},async resume(){},close(){this.state='closed';},createGain(){const node={gain:{value:0},connect(to){this.destination=to;},disconnect(){this.disconnected=true;}};nodes.push(node);return node;},createBufferSource(){const source={playbackRate:{value:0},connect(to){this.destination=to;},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;}};sources.push(source);return source;}};
 return {audio,sources,nodes};
}
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
