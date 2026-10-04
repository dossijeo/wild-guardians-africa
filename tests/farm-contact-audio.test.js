import test from 'node:test';
import assert from 'node:assert/strict';
import {FarmContactAudio,farmActivity} from '../src/audio/farm-contact-audio.js';
import {FARM_ACTIONS} from '../src/audio/farm-actions-data.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createPlant,isMature} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
const flush=()=>new Promise(done=>setImmediate(done));
function fixture(profile='olderFemale',kind='initial',species='mijo'){
 const speed=PROFILES.find(p=>p.id===profile).speed,worker={id:'worker',profile,taskId:'task',status:'acting',actionRemaining:({initial:7.2,water:3.4,harvest:3.6,crate:1}[kind])/speed,x:24,z:0},target=createPlant('target',species,24,0,'center');if(kind==='harvest'){target.growth=cropSpec(species).growth_seconds;target.harvestRequested=true;}if(kind==='crate'){target.delivered=false;target.carrierId=null;}
 const task={id:'task',kind,targetId:target.id},state={elapsed:0,workers:[worker],tasks:[task],plants:kind==='crate'?[]:[target],crates:kind==='crate'?[target]:[],pauses:[]},calls=[],stopped=[];let time=0;
 const audio=new FarmContactAudio((id,options)=>{const source={};calls.push({id,options,source});return source;},source=>stopped.push(source),()=>time);audio.update(state,{listener:{x:0,z:0}});
 return {worker,target,task,state,audio,calls,stopped,advance:async(dt=.05)=>{time+=dt;state.elapsed+=dt;worker.actionRemaining-=dt;audio.update(state,{listener:{x:0,z:0}});await flush();},clock:dt=>time+=dt};
}
for(const profile of PROFILES)test(profile.id+' initial native markers fire sow/seed/soil once and release at phase/pour boundaries',async()=>{
 const f=fixture(profile.id);for(let i=0;i<250&&f.worker.actionRemaining>0;i++)await f.advance();assert.deepEqual(f.calls.map(c=>c.id),['farm_sow','farm_seeds_drop','farm_water_soil']);assert.equal(f.calls[0].options.family,'farm-plant-contact');assert.equal(f.calls[1].options.family,'farm-plant-contact');assert.ok(Math.abs(f.calls[1].options.gain-.06)<1e-12);assert.equal(f.calls[2].options.family,'farm_water_soil');assert.ok(f.calls.every(c=>f.stopped.includes(c.source)));assert.equal(f.audio.entries.size,0);
});
for(const species of ['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'])test(species+' native harvest contact chooses one pick or root-pull take without another transaction',async()=>{
 const f=fixture('youngMale','harvest',species),before=JSON.stringify(f.target);for(let i=0;i<60&&f.worker.actionRemaining>0;i++)await f.advance();assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,['batata','yuca'].includes(species)?'farm_plant_pull':'farm_harvest_pick');assert.equal(JSON.stringify(f.target),before);
});
for(const reason of ['pause','result','flee','remove','task','replace','gap'])test('pending farm contact is suppressed on '+reason,async()=>{
 const f=fixture();let resolve;f.audio.play=(id,options)=>{f.calls.push({id,options});return new Promise(done=>resolve=done);};while(!f.calls.length)await f.advance();if(reason==='pause')f.state.pauses=['menu'];if(reason==='result')f.state.result='defeat';if(reason==='flee')f.worker.status='fleeing';if(reason==='remove')f.state.workers=[];if(reason==='task')f.state.tasks=[];if(reason==='replace')f.audio.update({...f.state,workers:[]});if(reason==='gap'){f.state.elapsed+=1;f.audio.update(f.state);}assert.equal(f.calls[0].options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));f.audio.dispose();
});
test('loading or skipping past physical harvest contact does not replay it',async()=>{
 for(const skip of [false,true]){const f=fixture('olderFemale','harvest');if(skip)await f.advance(2);else {f.audio.dispose();f.worker.actionRemaining=1.6;f.audio.update(f.state);}for(let i=0;i<20;i++)await f.advance();assert.equal(f.calls.length,0);}
});
test('a crate pickup permits its natural one-shot tail while carrying, and flight stops it',async()=>{
 const f=fixture('olderFemale','crate');while(!f.calls.length)await f.advance();assert.equal(f.calls[0].id,'farm_crate_move');f.worker.status='carrying';f.worker.crateId=f.target.id;f.target.carrierId=f.worker.id;f.worker.taskId=null;f.state.tasks=[];await f.advance();assert.equal(f.stopped.length,0);f.worker.status='fleeing';await f.advance();assert.ok(f.stopped.includes(f.calls[0].source));assert.equal(f.audio.entries.size,0);
});
test('water soil contact is invalid after its authored pour window even before another audio frame',async()=>{
 const f=fixture('olderFemale','water');while(!f.calls.length)await f.advance();f.worker.actionRemaining=3.4-FARM_ACTIONS.sources.olderFemale.fractions.pourEnd*3.4;assert.equal(f.calls[0].options.isCurrent(),false);f.audio.update(f.state);assert.ok(f.stopped.includes(f.calls[0].source));
});
test('invalid/fallen/gate-waiting workers never have a physical farm contact plan',()=>{
 const f=fixture();for(const changes of [{status:'walking'},{incapacitated:true},{fallRemaining:1},{gateWaiting:true},{actionRemaining:0},{taskId:'other'}])assert.equal(farmActivity({...f.worker,...changes},f.task,f.target),null);
});
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
for(const profile of PROFILES)test(profile.id+' actual paid first-day care/harvest produces physical cues without altering saved domain',async()=>{
 const state=Game.newGame({seed:712,slotId:'native-farm-audio-'+profile.id});Game.resume(state,'intro');state.tutorial.step='done';Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'seed','mijo',10,4,nav);Game.openInitialHiring(state);Game.hire(state,'hire',{[profile.id]:1});const ids=[],audio=new FarmContactAudio(id=>{ids.push(id);return {};},()=>{},()=>0);audio.update(state);
 for(let i=0;i<5500&&!state.crates.some(c=>c.delivered);i++){if(isMature(state.plants[0])&&!state.plants[0].harvestRequested)Game.harvest(state,'harvest',state.plants[0].id);Game.tick(state,.05,nav);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);await flush();}
 assert.equal(state.crates.filter(c=>c.delivered).length,1);assert.equal(state.events.filter(e=>e.type==='CropPicked').length,1);assert.equal(state.events.filter(e=>e.type==='CrateDelivered').length,1);for(const id of ['farm_sow','farm_seeds_drop','farm_water_soil','farm_harvest_pick'])assert.ok(ids.includes(id),id);assert.equal(ids.filter(id=>id==='farm_harvest_pick').length,1);audio.dispose();
});

test('a farm contact decoded after its quarter-second deadline stays silent',async()=>{
 const f=fixture();let resolve;f.audio.play=(id,options)=>{f.calls.push({id,options});return new Promise(done=>resolve=done);};while(!f.calls.length)await f.advance();f.clock(.3);assert.equal(f.calls[0].options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));f.audio.dispose();
});

test('inactive workers do not scan crop/crate populations for contact audio',()=>{
 const audio=new FarmContactAudio(()=>{throw Error('no physical action');},()=>{},()=>0),state={elapsed:0,pauses:[],workers:[{id:'idle',status:'idle'}],tasks:[]};Object.defineProperty(state,'plants',{get(){throw Error('unnecessary crop scan');}});Object.defineProperty(state,'crates',{get(){throw Error('unnecessary crate scan');}});assert.doesNotThrow(()=>audio.update(state));state.elapsed=.1;assert.doesNotThrow(()=>audio.update(state));audio.dispose();
});
