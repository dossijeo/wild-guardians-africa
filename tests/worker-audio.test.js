import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkerAudio,WORKER_VOICE_POLICY} from '../src/audio/worker-audio.js';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize} from '../src/persistence/snapshots.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  let clock=0;const calls=[],stopped=[],worker={id:'worker',profile:'olderMale',status:'idle',x:0,z:0},state={elapsed:0,pauses:[],workers:[worker],tasks:[],raid:null};
  const audio=new WorkerAudio((id,options)=>{const source={};calls.push({id,options,source});return source;},source=>stopped.push(source),()=>clock);
  const advance=(dt=.1)=>{clock+=dt;state.elapsed+=dt;audio.update(state,{listener:{x:0,z:0}});};
  const assign=()=>{const task={id:'task-'+state.elapsed,workerId:worker.id};state.tasks=[task];worker.taskId=task.id;worker.status='walking';return task;};
  return {audio,state,worker,calls,stopped,advance,assign,clock:dt=>clock+=dt};
}

test('task acknowledgment is tied to real ownership, never to hiring or repeated AI evaluation',async()=>{
  const f=fixture();f.worker.status='arriving';f.audio.update(f.state);f.advance();f.worker.status='idle';f.advance();assert.equal(f.calls.length,0);
  f.assign();f.advance();await flush();assert.deepEqual(f.calls.map(c=>c.id),['npc_acknowledge']);
  for(let i=0;i<10;i++)f.advance();assert.equal(f.calls.length,1);
  f.worker.status='acting';f.worker.actionRemaining=3;f.advance();await flush();assert.equal(f.calls.length,1);
});

test('brief effort waits for actual work and has worker and global cadence limits',async()=>{
  const f=fixture();f.audio.update(f.state);f.assign();f.advance();await flush();
  for(let i=0;i<25;i++)f.advance();f.worker.status='acting';f.worker.actionRemaining=7;f.advance();
  for(let i=0;i<8;i++)f.advance();await flush();assert.equal(f.calls.filter(c=>c.id==='npc_work_effort').length,1);
  for(let i=0;i<30;i++)f.advance();assert.equal(f.calls.filter(c=>c.id==='npc_work_effort').length,1);
  f.worker.status='idle';f.advance();f.assign();f.advance();f.worker.status='acting';f.advance();
  for(let i=0;i<10;i++)f.advance();assert.equal(f.calls.filter(c=>c.id==='npc_work_effort').length,1);
});

test('danger occurs once on flight entry and a contained shout requires continued displacement',async()=>{
  const f=fixture();f.audio.update(f.state);f.state.raid={id:'raid'};f.worker.status='fleeing';f.advance();await flush();
  for(let i=0;i<20;i++){f.worker.x+=.2;f.advance();}await flush();
  assert.deepEqual(f.calls.map(c=>c.id),['npc_danger_react','npc_flee_shout']);
  for(let i=0;i<40;i++){f.worker.x+=.2;f.advance();}assert.equal(f.calls.length,2);
  f.worker.status='home';f.advance();assert.equal(f.audio.entries.size,0);assert.ok(f.stopped.includes(f.calls[1].source));
});

for(const reason of ['stationary','gate','no-raid'])test(reason+' flight never emits a running shout',async()=>{
  const f=fixture();f.audio.update(f.state);f.worker.status='fleeing';if(reason!=='no-raid')f.state.raid={};
  f.advance();for(let i=0;i<20;i++){if(reason!=='stationary')f.worker.x+=.2;f.worker.gateWaiting=reason==='gate';f.advance();}
  await flush();assert.equal(f.calls.filter(c=>c.id==='npc_flee_shout').length,0);
});

for(const reason of ['pause','result','gap','remove','incapacitated','fall'])test(reason+' interrupts worker voices without replaying onset',async()=>{
  const f=fixture();f.audio.update(f.state);f.assign();f.advance();await flush();
  if(reason==='pause')f.state.pauses=['menu'];if(reason==='result')f.state.result='defeat';if(reason==='remove')f.state.workers=[];
  if(reason==='incapacitated')f.worker.incapacitated=true;if(reason==='fall')f.worker.fallRemaining=1;
  f.advance(reason==='gap'?1:.1);assert.ok(f.stopped.includes(f.calls[0].source));
  f.state.pauses=[];f.state.result=null;f.state.workers=[f.worker];f.worker.incapacitated=false;f.worker.fallRemaining=0;
  f.advance();f.advance();assert.equal(f.calls.length,1);
});

for(const status of ['walking','acting','fleeing'])test('restored '+status+' does not replay acknowledgment, effort or flight',async()=>{
  const f=fixture();f.assign();f.worker.status=status;f.worker.actionRemaining=5;if(status==='fleeing')f.state.raid={};
  f.audio.update(f.state);for(let i=0;i<40;i++){f.worker.x+=.1;f.advance();}await flush();assert.equal(f.calls.length,0);
});

test('crowd cadence and distance suppress unrelated off-camera choruses',async()=>{
  const f=fixture();f.state.workers=Array.from({length:20},(_,i)=>({id:'w'+i,status:'idle',x:i?0:100,z:0}));f.audio.update(f.state);
  f.state.raid={};for(const worker of f.state.workers)worker.status='fleeing';f.advance();await flush();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.emitter,'w1');assert.equal(f.calls[0].options.family,'worker-voice');
  for(let i=0;i<20;i++){for(const worker of f.state.workers)worker.x+=.1;f.advance();}await flush();assert.equal(f.calls.length,2);
});

test('pending decode is invalidated by task loss, state replacement, clock expiry and disposal',async()=>{
  for(const reason of ['task','state','clock','dispose']){
    const f=fixture();let resolve;f.audio.play=(id,options)=>{f.calls.push({id,options});return new Promise(done=>resolve=done);};
    f.audio.update(f.state);f.assign();f.advance();assert.ok(resolve);
    if(reason==='task'){f.worker.taskId=null;f.worker.status='idle';}
    if(reason==='state')f.audio.update({...f.state,workers:[]});if(reason==='clock')f.clock(.3);if(reason==='dispose')f.audio.dispose();
    assert.equal(f.calls[0].options.isCurrent(),false);const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));
  }
});

test('voice failure is contained and cannot create a per-frame retry storm',()=>{
  const f=fixture();f.audio.play=()=>{throw Error('unavailable');};f.audio.update(f.state);f.assign();assert.doesNotThrow(()=>f.advance());
  for(let i=0;i<100;i++)assert.doesNotThrow(()=>f.advance());assert.equal(f.audio.nextRoutine,.1+WORKER_VOICE_POLICY.routineGap);
});

for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(profile+' paid native assignment/work/raid reactions preserve domain state',async()=>{
  const f=fixture(),state=Game.newGame({seed:712,slotId:'qa-worker-'+profile}),nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
  Game.placeStructure(state,'center',{x:28,z:0},nav);Game.plant(state,'seed','mijo',36,4,nav);Game.pause(state,'hiring');Game.hire(state,'hire',{[profile]:1});assert.equal(state.workers.length,1);assert.equal(state.workers[0].profile,profile);
  f.audio.update(state);let raidStarted=false;
  for(let i=0;i<2000;i++){
    Game.tick(state,.05,nav);const before=serialize(state);f.audio.update(state);assert.equal(serialize(state),before);await flush();
    if(!raidStarted&&f.calls.some(c=>c.id==='npc_work_effort')){spawnRaid(state,{group:['warthog']},nav);assert.ok(state.raid);raidStarted=true;}
    if(f.calls.some(c=>c.id==='npc_flee_shout'))break;
  }
  assert.ok(raidStarted);assert.deepEqual(f.calls.map(c=>c.id),['npc_acknowledge','npc_work_effort','npc_danger_react','npc_flee_shout']);
  for(const call of f.calls){assert.equal(call.options.emitter,state.workers[0].id);assert.equal(call.options.bus,'world');assert.ok(call.options.gain<=.45);}
  f.audio.dispose();assert.equal(f.audio.entries.size,0);
});
