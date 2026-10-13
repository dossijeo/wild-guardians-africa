import test from 'node:test';
import assert from 'node:assert/strict';
import {observeUnitProgress,mobilePassActive,clearBlockedStaticLeg,RETREAT_DESPAWN_SECONDS} from '../src/simulation/unit-stuck-recovery.js';
import {walkTo} from '../src/simulation/game.js';

const fixture=()=>{
  const events=[],state={day:7,time:80,elapsed:80,sequence:1,events:[],workers:[],raid:{animals:[]}};
  const animal={id:'hyena',x:0,z:0,radius:.9,status:'walking',path:[{x:3,z:0}],destinationId:'plant',pathVersion:1};
  state.raid.animals.push(animal);
  const emit=(_state,type,detail)=>events.push({type,...detail});
  const nav={version:1,walkable:()=>true,segmentClear:()=>true,path:()=>[{x:3,z:0}]};
  return {events,state,animal,emit,nav};
};

test('stalled motion replans once, then passes only mobile blockers temporarily',()=>{
  const {events,state,animal,emit,nav}=fixture(),destination={id:'plant',x:3,z:0};
  for(let i=0;i<36;i++){
    state.elapsed+=.1;
    if(!animal.path)animal.path=[{x:3,z:0}];
    observeUnitProgress(state,animal,{x:0,z:0},destination,.1,nav,false,emit);
  }
  assert.equal(events.filter(e=>e.kind==='route-replan').length,1);
  assert.equal(events.filter(e=>e.kind==='mobile-pass').length,1);
  assert(mobilePassActive(state,animal));
  state.elapsed+=3;
  animal.x=2;
  observeUnitProgress(state,animal,{x:0,z:0},destination,.1,nav,false,emit);
  assert.equal(animal.stuckRecovery,undefined);
});

test('a local relocation requires a physically clear connector in the same region',()=>{
  for(const clear of [false,true]){
    const {events,state,animal,emit,nav}=fixture(),destination={id:'plant',x:3,z:0};
    nav.walkable=(x,z)=>x!==0||z!==0;nav.segmentClear=()=>clear;
    animal.stuckRecovery={destinationId:'plant',stalledFor:5.95,phase:2,mobilePassUntil:0,mobilePassMetres:0};
    observeUnitProgress(state,animal,{x:0,z:0},destination,.1,nav,false,emit);
    assert.equal(animal.x===0&&animal.z===0,!clear);
    assert.equal(events.filter(e=>e.kind==='local-relocation').length,Number(clear));
  }
});

test('a statically blocked first leg is discarded, including after a save-compatible recovery state',()=>{
  const {events,state,animal,emit,nav}=fixture();nav.segmentClear=()=>false;
  animal.stuckRecovery={destinationId:'plant',stalledFor:2,phase:1,mobilePassUntil:0,mobilePassMetres:0};
  const restored=JSON.parse(JSON.stringify(animal));state.raid.animals[0]=restored;
  assert(clearBlockedStaticLeg(state,restored,nav,false,emit));
  assert.equal(restored.path,null);
  assert.equal(restored.stuckRecovery.stalledFor,2);
  assert.equal(events.length,0,'do not emit a duplicate replan for a recovered route');
});

test('retreat safety threshold is bounded and never grants another attack',()=>{
  assert.equal(RETREAT_DESPAWN_SECONDS,10);
  const {state,animal,nav}=fixture();
  state.workers=[];animal.status='retreating';animal.hitsRemaining=0;animal.path=null;
  nav.path=()=>null;nav.walkable=()=>true;
  animal.stuckRecovery={destinationId:'exit-hyena',stalledFor:RETREAT_DESPAWN_SECONDS-.05,phase:3,mobilePassUntil:0,mobilePassMetres:0};
  // The recovery observes time only. Damage application remains exclusively
  // in the raid attack state machine, which this actor has already left.
  walkTo(state,animal,{id:'exit-hyena',x:10,z:0},.1,nav,{worker:false,speed:3.8});
  assert(animal.stuckRecovery.stalledFor>=RETREAT_DESPAWN_SECONDS);
  assert.equal(animal.hitsRemaining,0);
});
