import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {dailyRunMetres,urgentWork,moveWorker} from '../src/simulation/locomotion.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
const actor=(metres=100)=>({x:0,z:0,path:[{x:1000,z:0}],runRemaining:metres,profile:'olderMale',status:'walking'});
test('Calibration preserves all four original route speeds and the median physical reference journey',()=>{
  const sorted=L.samples.map(s=>s.distanceMetres).sort((a,b)=>a-b);
  assert.equal(L.longTripMetres,sorted[2]);assert.equal(dailyRunMetres(),3*sorted[2]);
  for(const source of L.sources){
    const bytes=readFileSync(new URL('../'+source.file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
    assert.ok(bytes.toString('utf8').includes('(isRun?1.6:.72)/.68'));
    assert.equal(L.walkMetresPerSecond,source.walkMetresPerSecond);assert.equal(L.runMetresPerSecond,source.runMetresPerSecond);
  }
});
test('Running consumes travelled metres and switches to walking inside the exhaustion step',()=>{
  const worker=actor(.8);moveWorker(worker,1,{urgent:true});
  assert.equal(worker.runRemaining,0);assert.ok(Math.abs(worker.x-(.8+.5*.72))<1e-12);
  assert.equal(worker.running,false);assert.equal(worker.runPhase,.5);assert.equal(worker.walkPhase,.5);
  moveWorker(worker,1,{urgent:true});assert.ok(Math.abs(worker.x-1.88)<1e-12);
});
test('Short arrivals consume only their actual distance; blocked paths consume nothing',()=>{
  const worker=actor(10);worker.path=[{x:.2,z:0},{x:.2,z:.3}];
  assert.equal(moveWorker(worker,1,{urgent:true}),true);assert.equal(worker.runRemaining,9.5);
  moveWorker(worker,20,{urgent:true});assert.equal(worker.runRemaining,9.5);
});
test('Recovery forbids ordinary running but flight uses slowed Run without spending or replenishing the reserve',()=>{
  const worker={...actor(),recovering:true};moveWorker(worker,1,{urgent:true});assert.equal(worker.x,.72);assert.equal(worker.runRemaining,100);
  moveWorker(worker,1,{flight:true});assert.ok(Math.abs(worker.x-2.32)<1e-12);assert.equal(worker.runRemaining,100);
  worker.incapacitated=true;moveWorker(worker,1,{flight:true,slow:true});
  assert.ok(Math.abs(worker.x-2.88)<1e-12);assert.equal(worker.runRemaining,100);
});
test('Carrying and unhurried walking keep their native gaits and do not spend running metres',()=>{
  const worker=actor();moveWorker(worker,1,{urgent:true,carrying:true});assert.equal(worker.x,.72);assert.equal(worker.carryPhase,1);
  moveWorker(worker,1);assert.equal(worker.x,1.44);assert.equal(worker.runRemaining,100);
});
test('Urgency uses tasks per available worker at the assigned center, with strict greater-than-two threshold',()=>{
  const worker={...actor(),id:'w',centerId:'c'},state={time:0,workers:[worker],tasks:[{centerId:'c'},{centerId:'c'}]};
  assert.equal(urgentWork(state,worker),false);state.tasks.push({centerId:'c'});assert.equal(urgentWork(state,worker),true);
  state.workers.push({...worker,id:'w2'});assert.equal(urgentWork(state,worker),false);
  state.tasks.push(...Array.from({length:20},()=>({centerId:'other'})));assert.equal(urgentWork(state,worker),false);
  state.workers[1].incapacitated=true;assert.equal(urgentWork(state,worker),true);
  state.time=250;assert.equal(urgentWork(state,worker),false);
});
test('Running gait follows physical motion phase rather than hidden or paused wall time',()=>{
  const library=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url),'utf8')).olderMale;
  const worker=actor();moveWorker(worker,.25,{urgent:true});
  const pose=workerPose(worker,null,500,library);assert.equal(pose.name,'Run');assert.equal(pose.time,.25);
  assert.deepEqual(workerPose(worker,null,900,library),pose);
});
test('Hiring replenishes each person once per day; saves and pauses preserve a partially consumed reserve',()=>{
  const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[b]};
  const s=Game.newGame({seed:712,slotId:'reserve'});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:20,z:0},nav);Game.plant(s,'crop','mijo',24,0,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});const w=s.workers[0];
  assert.equal(w.runRemaining,dailyRunMetres());w.runRemaining=7.25;
  assert.equal(Game.hire(s,'hire-again',{olderMale:1}),false);assert.equal(w.runRemaining,7.25);
  Game.pause(s,'manual');Game.tick(s,120,nav);assert.equal(w.runRemaining,7.25);
  assert.equal(deserialize(serialize(s)).workers[0].runRemaining,7.25);
});
test('A distant arrival cannot extend the worker shift or teleport the worker to start a task',()=>{
  for(const [profile,end] of [['olderMale',250],['olderFemale',300],['youngMale',250],['youngFemale',300]]){
    const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[b]};
    const s=Game.newGame({seed:712,slotId:'distant'});Game.resume(s,'intro');
    Game.placeStructure(s,'center',{x:400,z:0},nav);Game.plant(s,'crop','mijo',404,0,nav);
    Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});Game.tick(s,end,nav);
    const worker=s.workers[0];assert.equal(worker.status,'returning');
    assert.ok(worker.x<400);assert.equal(s.plants[0].growth,0);assert.equal(s.plants[0].water[0].status,'due');
    assert.equal(worker.taskId,null);
  }
});
