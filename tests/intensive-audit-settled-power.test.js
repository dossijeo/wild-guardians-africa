import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {rational,numberOf} from '../src/simulation/money.js';

for(const magic of [false,true])test(`intensive audit reconciles native delivery with settled Multiply=${magic}`,()=>{
 const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
 const s=Game.newGame({slotId:'audit-power',seed:712});Game.resume(s,'intro');
 Game.placeStructure(s,'center',{x:0,z:0},nav);
 Game.plant(s,'intensive-plant-1','mijo',6,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 s.tutorial.step='done';s.dayPlan={done:true};
 if(magic)Game.cast(s,'multiply','multiply',6,0,nav,s.plants[0].id);
 Game.tick(s,299,nav);
 const counts={};for(const event of s.events)counts[event.type]=(counts[event.type]??0)+1;
 const report={state:s,counts};assert.equal(auditIntensiveFarm(report),true);
 const crate=s.crates.find(c=>c.delivered);assert(crate);
 assert.equal(numberOf(s.ledger.entries['deliver:'+crate.id]),magic?21:11);
 if(magic){
  const actual=crate.multiplyIncome;crate.multiplyIncome=rational(0);
  assert.throws(()=>auditIntensiveFarm(report),'Omitting the actual bonus must fail reconciliation');
  crate.multiplyIncome=actual;crate.multiplyPowerSettled=false;
  assert.throws(()=>auditIntensiveFarm(report),/settled spiritual power/);
 }
});
