import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {transact,rational} from '../src/simulation/money.js';
import {hitStructure} from '../src/simulation/rules.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {activeChunkRegion} from '../src/world/active-region.js';

// Mirrors the paid domain setup of audio-world-phases.html. The explicit QA
// credit and prepared damage are stress-fixture conditions, not player rules.
// No audio, GPU or perceptual acceptance is claimed by this CPU diagnostic.
const {s,nav}=createOpeningWorld({slotId:'integrated-load'}),center=s.structures[0];
transact(s.ledger,'qa-credit',rational(10000));
for(let z=-12;z<=12&&s.plants.length<32;z+=1.5)for(let x=5;x<=24&&s.plants.length<32;x+=1.5){
  try{Game.plant(s,'qa-seed-'+s.plants.length,'mijo',Math.round((center.x+x)/1.5)*1.5,Math.round((center.z+z)/1.5)*1.5,nav);}catch{}
}
assert.equal(s.plants.length,32);Game.openInitialHiring(s);Game.hire(s,'qa-hire',{olderFemale:4,olderMale:4});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
const eye={x:center.x+18,z:center.z+25};nav.setRaidView(eye,center);nav.setActiveBounds(activeChunkRegion(eye,'baja').bounds);
const report={seed:712,qaCredit:10000,paidPlants:32,paidWorkers:8,phase:'work',steps:0,searches:0,maxTickMs:0,slowTicks:[],slowSearches:[],events:{}};const seen=new Set(),find=nav.findPath;
nav.findPath=function(...args){report.searches++;const start=performance.now(),result=find.apply(this,args),ms=performance.now()-start;if(ms>20&&report.slowSearches.length<20){const [from,to,radius,ignore,worker,margin]=args;report.slowSearches.push({elapsed:s.elapsed,phase:report.phase,from:{x:from.x,z:from.z},to:{x:to.x,z:to.z},radius,worker,margin,ms,found:!!result});}return result;};
function step(){
  const before=performance.now();Game.tick(s,.1,nav);const ms=performance.now()-before;report.steps++;report.maxTickMs=Math.max(ms,report.maxTickMs);
  if(ms>50&&report.slowTicks.length<20)report.slowTicks.push({elapsed:s.elapsed,phase:report.phase,ms});
  for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);report.events[e.type]=(report.events[e.type]??0)+1;}
  if(report.steps%100===0)process.stdout.write(JSON.stringify({phase:report.phase,elapsed:s.elapsed,searches:report.searches,maxTickMs:report.maxTickMs})+'\n');
}
while(s.elapsed<130)step();assert.ok(report.events.WaterSatisfied>=8);
report.phase='raid';hitStructure(center,468,s.elapsed);nav.setState(s);spawnRaid(s,{group:['warthog','hyena','buffalo','lion','rhino']},nav);assert.equal(s.raid.animals.length,5);
while(s.raid&&!s.result&&s.elapsed<400)step();
report.phase='complete';report.elapsed=s.elapsed;report.raidFinished=!s.raid;report.centerStatus=center.status;report.domainResult=s.result;process.stdout.write(JSON.stringify(report,null,2)+'\n');
assert.ok(report.events.StructureHit>0);assert.equal(center.status,'ruined');assert.equal(s.raid,null);
