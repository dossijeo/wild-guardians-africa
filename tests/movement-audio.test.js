import test from 'node:test';
import assert from 'node:assert/strict';
import {MovementAudio,movementSound} from '../src/audio/movement-audio.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
import {serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(actor){const calls=[],stopped=[],state={elapsed:0,biome:'sabana',pauses:[],workers:actor.profile?[actor]:[],raid:actor.profile?null:{animals:[actor]}};let clock=0;
 const audio=new MovementAudio((id,options)=>{const source={onended(){}};calls.push({id,options,source});return Promise.resolve(source);},source=>stopped.push(source),()=>clock);
 return {audio,state,calls,stopped,setClock:t=>clock=t};}
for(const profile of ['youngMale','youngFemale','olderMale','olderFemale'])for(const name of ['Walk_Skip','Run','Carry_Crate'])test(`${profile} ${name}: original contact phases emit steps only after actual displacement`,async()=>{
 const key={Walk_Skip:'walkPhase',Run:'runPhase',Carry_Crate:'carryPhase'}[name],actor={id:'worker',profile,x:0,z:0,status:name==='Carry_Crate'?'carrying':'walking',running:name==='Run',[key]:0},f=fixture(actor);
 f.audio.update(f.state);const duration=FOOTSTEPS.sources[profile].clips[name].duration;
 for(let i=0;i<Math.ceil(duration/.05)+1;i++){actor[key]+=.05;actor.x+=.05;f.state.elapsed+=.05;f.audio.update(f.state);await settle();}
 assert.ok(f.calls.length>=2);assert.ok(f.calls.every(c=>c.id===(name==='Run'?'run_surface_set':'step_dry_soil')&&c.options.emitter===actor.id&&c.options.gain>0&&c.options.gain<=.25));
 const count=f.calls.length;actor[key]+=1;f.state.elapsed+=.1;f.audio.update(f.state);await settle();assert.equal(f.calls.length,count);assert.ok(f.stopped.length>0);f.audio.dispose();
});
for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(`${species}: native animal toe contacts select original weight category`,async()=>{
 const actor={id:'animal',species,x:0,z:0,status:'walking',motionPhase:0},f=fixture(actor);f.audio.update(f.state);
 for(let i=0;i<80;i++){actor.motionPhase+=.05;actor.x+=.075;f.state.elapsed+=.05;f.audio.update(f.state);await settle();}
 assert.ok(f.calls.length>0);assert.ok(f.calls.every(c=>c.id===(['buffalo','rhino'].includes(species)?'beast_step_heavy':'beast_step_light')));f.audio.dispose();
});
test('pause, actor removal, reload and an unobserved gap cancel active or pending footstep sounds',async()=>{
 const actor={id:'worker',profile:'olderMale',x:0,z:0,status:'walking',walkPhase:0},f=fixture(actor),contact=FOOTSTEPS.sources.olderMale.clips.Walk_Skip.contacts[0].time;
 actor.walkPhase=contact-.1;f.audio.update(f.state);actor.walkPhase=contact+.1;actor.x=.144;f.state.elapsed=.2;f.audio.update(f.state);await settle();assert.ok(f.calls.length>0);
 const pending=f.calls[0].options;assert.equal(pending.isCurrent(),true);f.state.pauses=['menu'];f.audio.update(f.state);assert.equal(pending.isCurrent(),false);assert.ok(f.stopped.includes(f.calls[0].source));
 f.state.pauses=[];f.audio.update(f.state);actor.x+=1;actor.walkPhase+=2;f.state.elapsed+=2;const count=f.calls.length;f.audio.update(f.state);assert.equal(f.calls.length,count);
 f.audio.update({...f.state,workers:[{...actor}]});assert.equal(f.calls.length,count);f.state.workers=[];f.audio.update({...f.state,elapsed:f.state.elapsed+.1});assert.equal(f.audio.observations.size,0);
 f.setClock(2);assert.equal(pending.isCurrent(),false);f.audio.dispose();
});
test('surface override, running selection and distance attenuation do not invent clip variants',()=>{
 const actor={profile:'olderMale'};for(const surface of ['soil','grass','mud','sand','stone','wood'])assert.equal(movementSound(actor,{name:'Walk_Skip'},'sabana',surface),'step_'+(surface==='soil'?'dry_soil':surface));
 assert.equal(movementSound(actor,{name:'Run'},'desierto','sand'),'run_surface_set');assert.equal(movementSound(actor,{name:'Walk_Skip'},'desierto'),'step_sand');
});
test('paid native walking and cadence changes never mutate simulation or replay historical contacts',async()=>{
 const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]},state=Game.newGame({slotId:'movement-audio',seed:712});
 Game.resume(state,'intro');Game.placeStructure(state,'center',{x:12,z:8},nav);Game.plant(state,'seed','mijo',18,8,nav);Game.openInitialHiring(state);Game.hire(state,'hire',{olderMale:1});
 const calls=[],audio=new MovementAudio((id,options)=>{calls.push({id,options});return null;},()=>{},()=>0);audio.update(state);
 for(let i=0;i<100;i++){Game.tick(state,.05,nav);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);await settle();}assert.ok(calls.length>0);
 const n=calls.length;audio.update(state);assert.equal(calls.length,n);Game.pause(state,'qa');Game.tick(state,30,nav);audio.update(state);assert.equal(calls.length,n);audio.dispose();
});
