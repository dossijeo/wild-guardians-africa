import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkAudio,wateringActivity} from '../src/audio/work-audio.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {PROFILES} from '../src/simulation/workforce.js';
import * as Game from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';
const flush=()=>new Promise(done=>setImmediate(done));
function fixture(){
 const calls=[],stopped=[],worker={id:'worker',profile:'olderFemale',taskId:'task',status:'acting',actionRemaining:2,x:48,z:0},task={id:'task',kind:'water'};
 const state={workers:[worker],tasks:[task],pauses:[]},audio=new WorkAudio((id,opts)=>{const source={};calls.push({id,opts,source});return source;},source=>stopped.push(source));
 return {calls,stopped,worker,task,state,audio};
}
for(const profile of PROFILES)test(`${profile.id}: watering activity matches the native combined-action pose`,()=>{
 const worker={profile:profile.id,taskId:'t',status:'acting'},task={id:'t',kind:'initial'},library={actions:{Plant:{duration:3.8,loop:false},Water:{duration:3.4,loop:false}}};
 for(const progress of [0,3.79,3.8,4,7.19]){
  worker.actionRemaining=(7.2-progress)/profile.speed;
  assert.equal(wateringActivity(worker,task),workerPose(worker,task,0,library).name==='Water');
 }
});
test('one original watering cue per task, with distance and no repeated completed samples',async()=>{
 const f=fixture();for(let i=0;i<100;i++)f.audio.update(f.state,{listener:{x:0,z:0}});await flush();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'farm_watering_can');assert.equal(f.calls[0].opts.bus,'world');assert.equal(f.calls[0].opts.emitter,'worker');assert.ok(Math.abs(f.calls[0].opts.gain-.07)<1e-12);
 f.calls[0].source.onended();f.audio.update(f.state);await flush();assert.equal(f.calls.length,1);
 f.task.id='next';f.worker.taskId='next';f.audio.update(f.state);await flush();assert.equal(f.calls.length,2);f.audio.dispose();
});
for(const reason of ['fleeing','incapacitated','pause','result','removed','dead-task','end'])test(`watering releases active and pending sources on ${reason}`,async()=>{
 const f=fixture();f.audio.update(f.state);await flush();assert.equal(f.calls.length,1);
 const cancel=()=>{if(reason==='fleeing')f.worker.status='fleeing';else if(reason==='incapacitated')f.worker.incapacitated=true;else if(reason==='pause')f.state.pauses=['menu'];else if(reason==='result')f.state.result='defeat';else if(reason==='removed')f.state.workers=[];else if(reason==='dead-task')f.state.tasks=[];else f.worker.actionRemaining=0;};
 cancel();assert.equal(f.calls[0].opts.isCurrent(),false);f.audio.update(f.state);assert.deepEqual(f.stopped,[f.calls[0].source]);
 const pending=fixture();let resolve;pending.audio.play=(id,opts)=>{pending.calls.push({id,opts});return new Promise(done=>resolve=done);};pending.audio.update(pending.state);pending.audio.dispose();assert.equal(pending.calls[0].opts.isCurrent(),false);const source={};resolve(source);await flush();assert.deepEqual(pending.stopped,[source]);
});
test('restoring a state cancels old activity and restores current activity without historical completion cues',async()=>{
 const f=fixture();f.audio.update(f.state);await flush();const restored=structuredClone(f.state);f.audio.update(restored);await flush();assert.equal(f.calls.length,2);assert.deepEqual(f.stopped,[f.calls[0].source]);assert.equal(f.calls[0].opts.isCurrent(),false);f.audio.dispose();
});
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
for(const profile of PROFILES)test(`${profile.id}: paid initial care plays only during Water and raid cancels its native task`,async()=>{
 const state=Game.newGame({seed:712,slotId:'audio-work-'+profile.id});Game.resume(state,'intro');state.ledger.balance=rational(10000);state.day=101;state.completedNights=100;state.postgame=true;state.initialPreparation=false;state.tutorial.step='done';
 Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'seed','mijo',10,4,nav);Game.pause(state,'hiring');Game.hire(state,'hire',{[profile.id]:1});
 const calls=[],stopped=[],audio=new WorkAudio((id,opts)=>{const source={};calls.push({id,opts,source});return source;},source=>stopped.push(source));
 let budget=2000;while(!calls.length&&budget--){Game.tick(state,.05,nav);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);await flush();}
 assert.equal(calls.length,1);assert.equal(state.workers[0].status,'acting');assert.equal(state.events.filter(e=>e.type==='WaterSatisfied').length,0);
 const loaded=deserialize(serialize(state));assert.ok(wateringActivity(loaded.workers[0],loaded.tasks.find(t=>t.id===loaded.workers[0].taskId)));
 state.postgame=false;spawnRaid(state,{group:['warthog']},nav);assert.ok(state.raid);assert.equal(state.workers[0].status,'fleeing');assert.equal(calls[0].opts.isCurrent(),false);const before=serialize(state);audio.update(state);assert.equal(serialize(state),before);assert.deepEqual(stopped,[calls[0].source]);assert.equal(state.events.filter(e=>e.type==='WaterSatisfied').length,0);audio.dispose();
});
