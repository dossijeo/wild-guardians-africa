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

test('native Desert/Suajili night9 keeps every actual animal landing on legal terrain',()=>{
 let observed=0;
 const report=simulateIntensiveFarm({days:9,seed:712,biome:'desierto',culture:'suajili',mixed:true,onTick(s,nav){
  if(s.day!==9)return;
  // Shorter paid-work routes change timing and therefore this encounter's
  // IDs and composition. Check all actual animals; the archived lion-8183
  // checkpoint remains covered by animal-slope-recovery.test.js.
  for(const actor of s.raid?.animals??[]){observed++;assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Every real animal landing obeys the unchanged native slope/fluid limit');}
 }});
 assert.ok(observed>0);
 assert.equal(report.completedNights,9);assert.equal(report.state.day,10);
 assert.equal(report.state.raid,null);assert.notEqual(report.result,'defeat');
 auditIntensiveFarm(report,{victory:false});
});
