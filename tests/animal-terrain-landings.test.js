import test from 'node:test';
import assert from 'node:assert/strict';
import {animalRouteClearance} from '../src/simulation/animal-route-clearance.js';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';

test('a reused sampled route cannot land an animal on an illegal slope',()=>{
 const actor={x:0,z:0,path:[{x:10,z:0}]};
 const nav={version:1,segmentClear:()=>true,terrainValid:x=>x<.2||x>.3};
 assert.ok(animalRouteClearance(actor,nav,{radius:.85},null).clear(actor,{x:.1,z:0}));
 actor.x=.1;
 const guard=animalRouteClearance(actor,nav,{radius:.85},null);
 assert.equal(guard.clear(actor,{x:.25,z:0}),false);
 assert.ok(guard.blocked());
 assert.equal(actor.x,.1,'Clearance never relocates the animal');
});

test('native Desert/Suajili night9 does not strand its lion on an unsampled slope',()=>{
 let observed=0;
 const report=simulateIntensiveFarm({days:9,seed:712,biome:'desierto',culture:'suajili',mixed:true,onTick(s,nav){
  if(s.day!==9)return;
  const actor=s.raid?.animals.find(a=>a.id==='animal-8183');
  if(actor){observed++;assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Every real lion landing obeys the unchanged native slope/fluid limit');}
 }});
 assert.ok(observed>0);
 assert.equal(report.completedNights,9);assert.equal(report.state.day,10);
 assert.equal(report.state.raid,null);assert.notEqual(report.result,'defeat');
 auditIntensiveFarm(report,{victory:false});
});
