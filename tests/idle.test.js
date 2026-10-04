import {Navigation} from '../src/world/navigation.js';
import {centerServicePoint} from '../src/world/centers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateIdle} from '../src/simulation/idle.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {enqueue,reserveTasks} from '../src/simulation/tasks.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url),'utf8'));
const nav={version:1,path:(_a,b)=>[{x:b.x,z:b.z}],placement:()=>({valid:true}),setState:()=>{},walkable:()=>true};
const anchor={id:'center',x:0,z:0};
const worker=profile=>({id:'worker-1',personId:'person-1',profile,x:3.4,z:0,status:'idle',runRemaining:80,path:null});

test('All four native profiles alternate Idle and Alert and occasionally walk inside eight metres without running',()=>{
  for(const profile of Object.keys(libraries)){
    const w=worker(profile),seen=new Set();let moved=0;
    for(let i=0;i<6000;i++){
      const previous={x:w.x,z:w.z};updateIdle(w,anchor,.1,nav,712);
      seen.add(workerPose(w,null,0,libraries[profile]).name);
      const distance=Math.hypot(w.x-previous.x,w.z-previous.z);moved+=distance;
      assert.ok(distance<=L.walkMetresPerSecond*1.5*.1+1e-9);assert.ok(Math.hypot(w.x,w.z)<=8);
      assert.equal(w.running,false);assert.equal(w.runRemaining,80);
    }
    assert.deepEqual(seen,new Set(['Idle','Alert','Walk_Skip']));assert.ok(moved>10);
    const source=L.sources.find(s=>s.profile===profile);
    assert.equal(source.idleSeconds,libraries[profile].actions.Idle.duration);assert.equal(source.alertSeconds,libraries[profile].actions.Alert.duration);
  }
});

test('FIFO assignment interrupts an ambient route immediately without losing a reservation',()=>{
  const w=worker('olderMale');w.centerId=anchor.id;
  while(w.idleState?.mode!=='walk')updateIdle(w,anchor,.1,nav,712);
  const state={day:1,workers:[w],tasks:[],plants:[{id:'p',x:6,z:1}],crates:[],structures:[],nextId:3,sequence:1};
  const task=enqueue(state,anchor.id,'water','p'),position={x:w.x,z:w.z};reserveTasks(state);
  assert.equal(w.status,'walking');assert.equal(w.taskId,task.id);assert.equal(task.workerId,w.id);
  assert.equal(w.idleState,null);assert.equal(w.path,null);assert.deepEqual({x:w.x,z:w.z},position);
});

test('Unreachable or nonlocal detours never become ambient movement',()=>{
  for(const path of [()=>null,(_a,b)=>[{x:9,z:0},b]]){
    const w=worker('olderFemale');
    for(let i=0;i<3000;i++)updateIdle(w,anchor,.1,{...nav,path},712);
    assert.equal(w.x,3.4);assert.equal(w.z,0);assert.notEqual(w.idleState.mode,'walk');
  }
});

test('A changed navigation version invalidates a blocked paseo before moving',()=>{
  const w=worker('youngMale');while(w.idleState?.mode!=='walk')updateIdle(w,anchor,.1,nav,712);
  const position={x:w.x,z:w.z};updateIdle(w,anchor,1,{...nav,version:2,path:()=>null},712);
  assert.deepEqual({x:w.x,z:w.z},position);assert.equal(w.path,null);assert.equal(w.idleState.mode,'rest');
});

function waitingGame(){
  const s=Game.newGame({seed:712,slotId:'idle'});Game.resume(s,'intro');Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:1});return s;
}
test('Waiting in a village has a real anchor and freezes/resumes identically across pause and save',()=>{
  const s=waitingGame(),w=s.workers[0],rng=s.rng;assert.equal(w.status,'waiting');assert.equal(w.centerId,null);
  while(w.idleState?.mode!=='walk')Game.tick(s,.1,nav);
  assert.equal(w.idleState.anchorId,s.villages[0].id);assert.equal(s.rng,rng);
  Game.pause(s,'options');const paused=serialize(s);Game.tick(s,10,nav);assert.equal(serialize(s),paused);
  const loaded=deserialize(paused);Game.resume(s,'options');Game.resume(loaded,'options');
  Game.tick(s,10,nav);Game.tick(loaded,10,nav);assert.equal(serialize(s),serialize(loaded));assert.equal(s.rng,rng);
  for(let i=0;i<1800;i++)Game.tick(s,.1,nav);
  assert.ok(Math.hypot(w.x,w.z)<=8);assert.equal(w.runRemaining,3*L.longTripMetres);
});

test('A waiting employee returns physically at shift end and does not prolong the contract',()=>{
  const s=waitingGame(),w=s.workers[0];while(w.idleState?.mode!=='walk')Game.tick(s,.1,nav);
  Game.tick(s,300-s.time,nav);assert.ok(['returning','home'].includes(w.status));assert.equal(w.idleState,null);
  Game.tick(s,20,nav);assert.equal(w.status,'home');assert.equal(w.x,0);assert.equal(w.z,0);
});

test('Receiving queued work prevents even one extra ambient step',()=>{
  const s=Game.newGame({seed:712,slotId:'idle-task'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);
  Game.pause(s,'hiring');Game.hire(s,'hire',{olderMale:1});Game.tick(s,8,nav);const w=s.workers[0];
  while(w.idleState?.mode!=='walk')Game.tick(s,.1,nav);
  Game.plant(s,'plant','mijo',6,1,nav);const position={x:w.x,z:w.z};Game.tick(s,.1,nav);
  assert.equal(w.status,'walking');assert.equal(w.idleState,null);assert.equal(w.path,null);assert.deepEqual({x:w.x,z:w.z},position);
});

test('Ambient paths stay inside the local radius and original terrain/building footprints',()=>{
  const {s,nav:actualNav}=createOpeningWorld();const center=s.structures[0],w=worker('youngFemale');Object.assign(w,centerServicePoint(center,s,.8));
  let walked=0;
  for(let i=0;i<6000;i++){
    const previous={x:w.x,z:w.z};updateIdle(w,center,.1,actualNav,s.seed);
    if(Math.hypot(w.x-previous.x,w.z-previous.z)>1e-9){walked++;assert.ok(actualNav.segmentClear(previous,w,.28,null,true));}
    assert.ok(Math.hypot(w.x-center.x,w.z-center.z)<=8);assert.ok(actualNav.walkable(w.x,w.z,.28,null,true));
  }
  assert.ok(walked>50);
});


test('after the final paid harvest the idle worker returns to the cultivated area, with physical paths and identical saved replay',()=>{
 const s=Game.newGame({seed:712,slotId:'idle-after-harvest'});Game.resume(s,'intro');
 const flat=state=>{const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.setState(state);return n;};
 const world=flat(s);Game.placeStructure(s,'center',{x:-12,z:0},world);Game.plant(s,'seed','mijo',8,4,world);Game.openInitialHiring(s);Game.hire(s,'wage',{olderFemale:1});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 for(let i=0;i<3000&&!s.crates.some(c=>c.delivered);i++)Game.tick(s,.1,world);
 assert.equal(s.crates.filter(c=>c.delivered).length,1);assert.equal(s.plants[0].alive,false);const w=s.workers[0],plant=s.plants[0],allowance=w.runRemaining;
 Game.tick(s,.1,world);assert.equal(w.idleState.anchorId,'farm-'+plant.id);
 const loaded=deserialize(serialize(s)),fresh=flat(loaded),rng=s.rng,end=Math.min(s.time+65,285);let settled=0;
 while(s.time<end){const before={x:w.x,z:w.z};Game.tick(s,.1,world);Game.tick(loaded,.1,fresh);assert.equal(serialize(s),serialize(loaded));assert.ok(world.segmentClear(before,w,.28,null,true));assert.equal(w.running,false);assert.equal(w.runRemaining,allowance);if(end-s.time<20){assert.ok(Math.hypot(w.x-plant.x,w.z-plant.z)<=3+1e-8);settled++;}}
 assert.ok(settled>100);assert.equal(s.rng,rng);assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);
});
