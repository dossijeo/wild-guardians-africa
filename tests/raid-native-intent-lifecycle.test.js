import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,targetFor,updateRaid} from '../src/simulation/raids.js';

test('native unknown crop connectivity waits without falling into individual JS searches',()=>{
  const state={elapsed:0,raid:{},plants:[],structures:[],spells:[]};
  const nav={raidSelectionStats:{},intentTaskPlanner:{planAttackCrop:()=>({status:'unknown',
    regionQueries:1,routeQueries:0})}};
  assert.deepEqual(targetFor(state,{id:'animal-1'},nav),{unknown:true});
  assert.equal(nav.raidSelectionStats.nativeCropResults.unknown,1);
  assert.equal(nav.raidSelectionStats.legacyFallbacks,undefined,
    'unknown connectivity must not enter the legacy selector');
});

test('raid instrumentation records why a conclusive native result still uses legacy selection',()=>{
  const state={elapsed:0,raid:{},plants:[],structures:[],spells:[]};
  const nav={raidSelectionStats:{},intentTaskPlanner:{planAttackCrop:()=>({status:'blocked',
    regionQueries:1,routeQueries:0})}};
  assert.equal(targetFor(state,{id:'animal-1'},nav),null);
  assert.equal(nav.raidSelectionStats.legacyFallbacks.blocked,1);
  assert.equal(nav.raidSelectionStats.legacyFallbackResults.none,1);
});

test('opt-in raid reports confirmed leases and committed damage frames once',()=>{
  const {s,nav}=fixture('mono');
  const active=new Map(),counts={register:0,start:0,finish:0,cancel:0};
  nav.intentTaskPlanner={
    registerAttackIntent(state,animal,target,path){
      assert.equal(state.raid.reservations[animal.reservation],animal.id);
      assert.equal(animal.targetId,target.id);
      assert(Array.isArray(path));
      assert.notEqual(active.get(animal.id)?.phase,'attacking');
      active.set(animal.id,{targetId:target.id,phase:'travelling'});
      counts.register++;return true;
    },
    markAttackActive(actorId){
      const intent=active.get(actorId);
      assert.equal(intent?.phase,'travelling');
      intent.phase='attacking';counts.start++;return true;
    },
    finishAttackIntent(actorId){
      assert.equal(active.get(actorId)?.phase,'attacking');
      active.delete(actorId);counts.finish++;return 0;
    },
    cancelAttackIntent(actorId){
      const intent=active.get(actorId);
      assert.notEqual(intent?.phase,'attacking');
      if(intent){active.delete(actorId);counts.cancel++;return true;}
      return false;
    }
  };
  assert(spawnRaid(s,{group:['warthog','warthog']},nav));
  for(let tick=0;tick<3000&&s.raid;tick++){
    s.elapsed+=.1;updateRaid(s,.1,nav);
  }
  assert.equal(s.raid,null,'the real raid must finish');
  assert.equal(active.size,0,'no native lease survives raid completion');
  assert(counts.start>0);
  assert.equal(counts.start,counts.finish,
    'every committed clip reaches exactly one logical damage frame');
  assert(counts.register>=counts.start);
});

test('a lost native travel path waits for an event or bounded recovery retry',()=>{
  const {s,nav}=fixture('mono');
  let selections=0;
  nav.planningObserver=event=>{
    if(event.kind==='attackSelection')selections++;
  };
  nav.intentTaskPlanner={
    registerAttackIntent:()=>true,
    cancelAttackIntent:()=>true
  };
  assert(spawnRaid(s,{group:['warthog']},nav));
  let animal=s.raid.animals[0];
  for(let tick=0;tick<100&&!animal.targetId;tick++){
    s.elapsed+=.1;updateRaid(s,.1,nav);
    animal=s.raid.animals[0];
  }
  assert(animal.targetId&&animal.path?.length,
    'the fixture needs a confirmed route before simulating its loss');
  animal.path=null;
  s.elapsed+=.1;updateRaid(s,.1,nav);
  animal=s.raid.animals[0];
  assert.equal(animal.status,'waiting');
  assert.equal(animal.targetId,null);
  const before=selections;
  for(let tick=0;tick<20;tick++){
    s.elapsed+=.1;updateRaid(s,.1,nav);
  }
  assert.equal(selections,before,
    'ordinary ticks cannot restart a failed target search');
});
