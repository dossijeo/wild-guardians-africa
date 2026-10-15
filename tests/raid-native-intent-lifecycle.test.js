import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';

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
