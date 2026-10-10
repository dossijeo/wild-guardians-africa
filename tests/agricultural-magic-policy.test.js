import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createAgriculturalMagicPolicy} from '../tools/native-agricultural-magic.mjs';
import {PreciseTap} from '../src/ui/precise-tap.js';
import {createNativeCampaignEvidence} from '../tools/native-campaign-evidence.mjs';
import {clearNavigation} from './clear-navigation.js';
const nav=clearNavigation();
test('a successful native agricultural application earns no occupied decision-window credit',()=>{
 const s=fixture(),evidence=createNativeCampaignEvidence(s),policy=createAgriculturalMagicPolicy({mode:'intensive'});
 assert.equal(policy.act(s,nav),true);
 evidence.decision(s,{seconds:1,otherActions:0});Game.tick(s,1,nav);evidence.finishDecision(s);
 const report=evidence.report(s);
 assert.equal(report.status,'verified');assert.ok(Math.abs(report.meaningfulActivity.daylightSeconds-1)<1e-9);
 assert.equal(report.meaningfulActivity.unoccupiedSeconds,report.meaningfulActivity.daylightSeconds);
 assert.equal(policy.report(s).applications,1);assert.equal(policy.report(s).effectDurationActivityCreditSeconds,0);
});
function fixture(){
 const s=Game.newGame({slotId:'policy',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);
 for(let i=0;i<6;i++)Game.plant(s,'seed-'+i,'mijo',6+i*1.5,0,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});s.initialPreparation=false;s.dayPlan={done:true};s.tutorial.step='done';return s;
}
test('paced policies execute native single-plant applications without duration credit or artificial income',()=>{
 const counts=[];
 for(const mode of ['none','scarce','moderate','intensive']){
  const s=fixture(),policy=createAgriculturalMagicPolicy({mode});
  for(let t=0;t<30;t++){policy.act(s,nav);Game.tick(s,1,nav);}
  const report=policy.report(s);counts.push(report.applications);
  assert.equal(report.humanManualActivitySeconds,null);
  assert.equal(report.selectedModeActivityCreditSeconds,0);assert.equal(report.effectDurationActivityCreditSeconds,0);
  assert.ok(report.records.every(r=>s.plants.some(p=>p.id===r.targetPlantId)));
  assert.equal(report.economicallyRedundantMultiply,0);
 }
 assert.equal(counts[0],0);assert.ok(counts[1]<counts[2]&&counts[2]<counts[3]);
});
test('one pointer tap selects once; cancellation, drag-back and pinch select nothing',()=>{
 const p=(id,x,timeStamp=0)=>({pointerId:id,clientX:x,clientY:0,timeStamp,button:0,shiftKey:false});
 const tap=new PreciseTap();tap.down(p(1,0));assert.deepEqual(tap.up(p(1,0,200)),{gestureSeconds:.2});
 assert.equal(tap.up(p(1,0,200)),null);
 tap.down(p(1,0));tap.move(p(1,10));tap.move(p(1,0));assert.equal(tap.up(p(1,0)),null);
 tap.down(p(1,0));tap.down(p(2,0));assert.equal(tap.up(p(1,0)),null);assert.equal(tap.up(p(2,0)),null);
 tap.down(p(1,0));assert.equal(tap.up(p(1,0),true),null);
});
