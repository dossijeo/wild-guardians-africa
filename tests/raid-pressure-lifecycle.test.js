import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {planNight,spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createNativeRaidCampaignEvidence} from '../tools/native-raid-campaign-evidence.mjs';

function fixture(){
 const s=Game.newGame({seed:712,slotId:'pressure-lifecycle'});Game.resume(s,'intro');
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.activeBounds=[-48,-48,48,48];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);
 for(let i=0;i<30;i++)Game.plant(s,`plant-${i}`,'mijo',4+(i%6)*2,-4+Math.floor(i/6)*2,nav);
 s.day=100;s.time=600;s.dayPlan={done:true};s.initialPreparation=false;planNight(s);
 assert.ok(s.nightPlan.waves.length>=2);return {s,nav};
}
test('native wave lifecycle keeps raid open beyond dawn, spawns all planned actors and roundtrips between waves',()=>{
 let {s,nav}=fixture();const intended=s.nightPlan.waves.flat().length;
 const observer=createNativeRaidCampaignEvidence(s);
 assert.equal(spawnRaid(s,s.nightPlan,nav),true);s.nightPlan.done=true;
 let maximum=0,reloaded=false,steps=0;
 while(s.raid&&steps++<6000){
  s.elapsed+=1;updateRaid(s,1,nav);
  if(s.raid){maximum=Math.max(maximum,s.raid.animals.filter(a=>a.status!=='gone').length);
   if(s.raid.pendingWavePlan){assert.equal(s.raid.animals.every(a=>a.status==='gone'),true);assert.equal(Game.nightEntryPending(s),true);
    if(!reloaded){s=deserialize(serialize(s));nav.setState(s);reloaded=true;}
    assert.equal(spawnRaid(s,s.raid.pendingWavePlan,nav),true);
   }
  }
  observer.observe(s);
 }
 assert.equal(s.raid,null);assert.ok(reloaded);assert.ok(maximum<=16);
 // The native event ring is bounded; use the continuously observed receipts,
 // not a final buffer that may have evicted the first wave's spawn.
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
 const evidence=observer.report(s);assert.equal(evidence.status,'verified');assert.equal(evidence.raids.length,1);
 assert.equal(evidence.raids[0].waves.length,s.nightPlan.waves.length);assert.equal(evidence.raids[0].actors.length,intended);
 const r=evidence.raids[0];assert.equal(r.potentialAgriculturalHp,s.nightPlan.pressureFacts.potential);
 assert.equal(r.agriculturalEfficiency,r.effectiveAgriculturalHp/r.potentialAgriculturalHp);
 assert.ok(r.plantsReached>=r.cropsDestroyed);assert.ok(r.retirements.length>0);assert.ok(Number.isSafeInteger(r.targetUnavailableAttempts??0)&&(r.targetUnavailableAttempts??0)>=0);
});
test('pressure persistence rejects budget/profile/cohort mutations before restoring gameplay',()=>{
 const {s}=fixture();const original=serialize(s);assert.doesNotThrow(()=>deserialize(original));
 for(const change of [v=>v.nightPlan.pressureFacts.budget++,v=>v.nightPlan.waves[0][0].hits=999,v=>v.nightPlan.waves[0][0].damageProfile.areaCap=7,v=>v.raidPressureMemory.lastDay=101]){
  const altered=JSON.parse(original);change(altered);assert.throws(()=>deserialize(JSON.stringify(altered)));
 }
});
