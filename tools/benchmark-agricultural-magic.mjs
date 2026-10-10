import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {createOpeningWorld} from './check_opening.mjs';
import {createNativeCampaignPlots} from './native-campaign-plots.mjs';
import {createAgriculturalMagicPolicy} from './native-agricultural-magic.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf,rational} from '../src/simulation/money.js';
import assert from 'node:assert/strict';
const directory=process.argv[2];
if(!directory||existsSync(directory))throw Error('Supply a fresh output directory');
mkdirSync(directory,{recursive:true});
const rows=[];
for(const count of [50,200,500]){
 const opening=createOpeningWorld({seed:712}),s=opening.s,nav=opening.nav;
 // Controlled populated-farm fixture, not a survival campaign or free production income.
 s.ledger.balance=rational(numberOf(s.ledger.balance)+100000);
 s.ledger.entries['qa-fixture-funding']=rational(100000);
 const plots=createNativeCampaignPlots(nav,()=>s);
 for(let attempts=0;s.plants.length<count&&attempts<20000;attempts++){
  const p=plots.choose();if(p)Game.plant(s,'fixture-seed-'+s.plants.length,'mijo',p.x,p.z,nav);
 }
 assert.equal(s.plants.length,count,'Fixture requires genuinely accessible native plots');
 Game.openInitialHiring(s);Game.hire(s,'fixture-hire',{olderFemale:Math.ceil(count/10)});
 s.initialPreparation=false;s.dayPlan={done:true};s.tutorial.step='done';
 const fixture=serialize(s),fixtureHash=createHash('sha256').update(fixture).digest('hex');
 writeFileSync(directory+'/fixture-'+count+'.json',fixture);
 for(const mode of ['none','moderate','intensive']){
  const state=deserialize(fixture);nav.setState(state);
  const magic=createAgriculturalMagicPolicy({mode}),started=performance.now(),daily=[],workers={moving:0,acting:0,carrying:0,idle:0};
  const before=numberOf(state.ledger.balance),events=[];let lastEvent=state.events.at(-1)?.id;
  for(let time=0;time<300;time++){
   magic.act(state,nav);
   // One-second sampled autonomous activity. Never credited as player activity.
   for(const w of state.workers){
    if(w.status==='acting')workers.acting++;
    else if(w.status==='carrying')workers.carrying++;
    else if(w.status==='walking')workers.moving++;
    else workers.idle++;
   }
   Game.tick(state,1,nav);
   const tail=state.events.findIndex(e=>e.id===lastEvent);
   if(tail<0&&lastEvent)throw Error('Event observer lost coverage within a one-second sample');
   events.push(...state.events.slice(tail+1));lastEvent=state.events.at(-1)?.id;
   if(time%10===9)daily.push({time:state.time,balance:numberOf(state.ledger.balance),alive:state.plants.filter(p=>p.alive).length,
    mature:state.plants.filter(p=>p.alive&&p.growth>=140).length,delivered:state.crates.filter(c=>c.delivered).length});
  }
  const income=events.filter(e=>e.type==='CrateDelivered').reduce((n,e)=>n+numberOf(state.ledger.entries['deliver:'+e.targetId]),0);
  assert.equal(numberOf(state.ledger.balance)-before,income,'Only native crate delivery can increase cash');
  assert.ok(state.crates.every(c=>numberOf(c.value)<=22),'Multiply cannot exceed original female harvest x2');
  const report={count,mode,fixtureHash,workers:state.workers.length,timeSeconds:state.time,cpuMilliseconds:performance.now()-started,
   income,delivered:events.filter(e=>e.type==='CrateDelivered').length,picked:events.filter(e=>e.type==='CropPicked').length,
   plantsBenefited:state.plants.filter(p=>p.multiplyHarvest).length,magic:magic.report(state),autonomousWorkerSampleSeconds:workers,daily};
  rows.push(report);writeFileSync(directory+'/result-'+count+'-'+mode+'.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({count,mode,income,delivered:report.delivered,applications:report.magic.applications,cpuMilliseconds:report.cpuMilliseconds}));
 }
}
writeFileSync(directory+'/comparison.json',JSON.stringify({scope:'Native procedural terrain, paths, workers, tasks, crates and ledger. Pre-funded populated fixtures; no campaign survival claims. Human interaction time is not measured, no 10-second or effect-duration credit.',rows},null,2));
