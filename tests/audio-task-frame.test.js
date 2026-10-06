import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const audio=new AudioSystem({sfx:1,music:1});audio.context={state:'running',currentTime:0};audio.sound=()=>null;audio.stopVoice=()=>{};
 const worker={id:'w',profile:'olderFemale',status:'acting',taskId:'t',actionRemaining:2,x:0,z:0};
 const state={elapsed:0,pauses:[],workers:[worker],plants:[{id:'p',alive:true}],crates:[],tasks:[{id:'t',workerId:'w',kind:'water',targetId:'p'}]};
 const dispose=()=>{audio.workers?.dispose();audio.work?.dispose();audio.farm?.dispose();};return {audio,state,worker,dispose};
}
test('all three live audio controllers share one FIFO read without changing domain',()=>{
 const {audio,state,dispose}=fixture();let reads=0;const tasks=state.tasks;Object.defineProperty(state,'tasks',{enumerable:true,get(){reads++;return tasks;}});
 const before=JSON.stringify(state);reads=0;audio.updateFarmActors(state);assert.equal(reads,1);assert.equal(JSON.stringify(state),before);dispose();
});
test('an idle cohort leaves the shared FIFO lazy; suspended/paused/result also avoid it',()=>{
 for(const reason of ['idle','suspended','paused','result']){
  const {audio,state,worker,dispose}=fixture();
  if(reason==='idle'){worker.status='idle';worker.taskId=null;}if(reason==='suspended')audio.context.state='suspended';if(reason==='paused')state.pauses=['menu'];if(reason==='result')state.result='defeat';
  Object.defineProperty(state,'tasks',{get(){throw Error('unnecessary FIFO read');}});assert.doesNotThrow(()=>audio.updateFarmActors(state));dispose();
 }
});
test('another update at the same simulated time sees task removal and stops the old water voice',async()=>{
 const {audio,state,dispose}=fixture(),source={},stopped=[];audio.sound=()=>source;audio.stopVoice=voice=>stopped.push(voice);
 audio.updateFarmActors(state);await flush();assert.equal(audio.work.entries.get('w').source,source);
 state.tasks=[];audio.updateFarmActors(state);assert.equal(audio.work.entries.size,0);assert.equal(audio.farm.entries.size,0);assert.ok(stopped.includes(source));dispose();
});
test('a late decoded voice validates current tasks, not the shared frame index',async()=>{
 const {audio,state,dispose}=fixture();let resolve,options;const stopped=[];
 audio.sound=(_id,opts)=>{options=opts;return new Promise(done=>resolve=done);};audio.stopVoice=voice=>stopped.push(voice);
 audio.updateFarmActors(state);assert.ok(options.isCurrent());state.tasks=[];assert.equal(options.isCurrent(),false);
 const source={};resolve(source);await flush();assert.ok(stopped.includes(source));dispose();
});
for(const {id:profile} of PROFILES)test(`${profile}: shared and separate audio follow the same paid native first delivery`,async()=>{
 const {s,nav}=createOpeningWorld({biome:'sabana',culture:'mapungubwe',seed:712,slotId:'audio-task-'+profile});
 const target=tutorialHandTarget(s,nav,'plant');assert.ok(target);Game.plant(s,'seed','mijo',target.position[0],target.position[2],nav);Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});
 const runs=['separate','shared'].map(mode=>{
  const audio=new AudioSystem({sfx:1,music:1}),cues=[],stopped=[];audio.context={state:'running',currentTime:0};
  // Keep observable cue data separate from the mutable source's callbacks.
  audio.sound=(id,options)=>{const cue={id,emitter:options.emitter,family:options.family,gain:options.gain};cues.push(cue);return {cue};};audio.stopVoice=source=>stopped.push(source.cue);
  return {audio,cues,stopped,mode};
 });
 for(let tick=0;tick<6000&&!s.crates.some(crate=>crate.delivered);tick++){
  Game.tick(s,.05,nav);const before=serialize(s);
  for(const run of runs){run.audio.context.currentTime=s.elapsed;if(run.mode==='shared')run.audio.updateFarmActors(s);else{run.audio.updateWorkers(s);run.audio.updateWork(s);run.audio.updateFarm(s);}assert.equal(serialize(s),before);}
  await flush();
 }
 assert.equal(s.crates.filter(crate=>crate.delivered).length,1);
 assert.deepEqual(runs[1].cues,runs[0].cues);assert.ok(runs[1].cues.some(c=>c.id==='farm_harvest_pick'));assert.ok(runs[1].cues.some(c=>c.id==='farm_watering_can'));
 for(const run of runs){run.audio.workers.dispose();run.audio.work.dispose();run.audio.farm.dispose();}
 assert.deepEqual(runs[1].stopped,runs[0].stopped);
});
