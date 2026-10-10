import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {numberOf,rational} from '../src/simulation/money.js';
import {cropSpec} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createQ7LabourPolicy} from '../tools/native-q7-labour-policy.mjs';
import {createQ8LabourPolicy} from '../tools/native-q8-labour-policy.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'q7-fixture'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);for(let n=0;n<30;n++)Game.plant(s,'p'+n,'mijo',n%10*1.5,Math.floor(n/10)*1.5,nav);
 const q=createQ7LabourPolicy(),plan=q.dawn(s);Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});return {s,nav,q};
}
test('Q7 startup pays three native salaries and preserves full renewal without changing production',()=>{
 const {s,q}=fixture();assert.equal(s.workers.length,3);assert.equal(s.ledger.entries.daily.n,'-90');assert.equal(q.reserve(),90);
 assert.equal(q.canSpend(s,5),true);assert.equal(q.dawn(s).staff,3);assert.equal(cropSpec('mijo').plant_cost,5);assert.equal(cropSpec('mijo').base_harvest_value,11);
 s.day=2;s.ledger.balance=rational(95);assert.equal(q.dawn(s).staff,3);assert.equal(q.dawn(s).workingCapitalShortfall,85);
 assert.equal(q.canSpend(s,6),false);assert.equal(q.canSpend(s,5),true);
});
test('Q7 postpones late staffing trials while crop purchases remain available',()=>{
 const {s,q}=fixture();s.elapsed=180;s.time=180;const plan=q.additional(s);assert.equal(plan.count,0);assert.equal(plan.reason,'late trial postponed until dawn');
 assert.equal(q.canSpend(s,5),true);assert.equal(s.workers.length,3);
});
test('Q7 trial requires an actual paid employee and retains proportional salary and worker IDs',()=>{
 const {s,q}=fixture();assert.throws(()=>q.hired(s,1,{workerIds:['missing'],centerId:s.structures[0].id,id:'unpaid'}));
 s.time=150;s.elapsed=150;const before=new Set(s.workers.map(w=>w.id)),centerId=s.structures[0].id;
 assert(Game.hireAdditional(s,'trial',{olderFemale:1},centerId));const workerIds=s.workers.filter(w=>!before.has(w.id)).map(w=>w.id);
 q.hired(s,1,{id:'trial',workerIds,centerId});const trial=q.report().history[0];assert.deepEqual(trial.workerIds,workerIds);assert.equal(trial.paidCoins,15);assert.equal(q.reserve(),120);
 s.elapsed=160;s.time=160;const plan=q.additional(s);assert.equal(plan.count,0);assert.equal(plan.reason,'await last new worker native delivery');assert.equal(plan.trialCredit.requiredTrialMargin,45);
});
test('native deliveries gate trials, survive world reload and never grant or double-count income',()=>{
 let {s,nav,q}=fixture();
 // Explicit mature-crop unit fixture; native FIFO harvest, carry and delivery
 // still required. This does not stand in for an economic campaign.
 for(const p of s.plants){p.growth=cropSpec(p.species).growth_seconds;p.water.forEach(w=>w.status='manual');}Game.rebuildTasks(s);
 for(let i=0;i<100&&!s.events.some(e=>e.type==='CrateDelivered');i++){Game.tick(s,1,nav);q.observe(s);}
 assert(s.events.some(e=>e.type==='CrateDelivered'));const before=new Set(s.workers.map(w=>w.id)),centerId=s.structures[0].id;
 assert(Game.hireAdditional(s,'trial',{olderFemale:1},centerId));const workerIds=s.workers.filter(w=>!before.has(w.id)).map(w=>w.id);q.hired(s,1,{id:'trial',workerIds,centerId});
 assert.equal(q.report().history[0].centerDeliveries,0,'past physical deliveries do not fund trial gate');
 let oldBeforeNew=false;
 for(let i=0;i<180;i++){
  Game.tick(s,1,nav);const cash=numberOf(s.ledger.balance);q.observe(s);q.observe(s);assert.equal(numberOf(s.ledger.balance),cash);
  const trial=q.report().history[0];if(trial.centerDeliveries&&!trial.newWorkerDeliveries)oldBeforeNew=true;
  if(i===10){s=deserialize(serialize(s));nav.setState(s);q.observe(s);}
  if(trial.newWorkerDeliveries)break;
 }
 const trial=q.report().history[0];assert(oldBeforeNew,'old employee deliveries must occur before the new employee settles a crate');assert(trial.newWorkerDeliveries>0);assert(trial.firstDeliveryDelay>0);
 assert.equal(new Set(trial.receipts.map(r=>r.id)).size,trial.receipts.length);
 assert.equal(trial.replacementMargin,trial.receipts.reduce((n,r)=>n+r.income-r.seedCost,0));
 for(const r of trial.receipts){assert.equal(r.seedCost,5);assert.equal(r.income,numberOf(s.ledger.entries['deliver:'+r.id]));}
 const stable=q.report();q.observe(s);assert.deepEqual(q.report(),stable);
});
test('Q7 remains explicit opt-in with source provenance and historical policies available',()=>{
 const options=parseNativeCampaignArgs(['--out','fixture','--labour-policy','q7']);assert.equal(options.labourPolicy,'q7');
 assert(nativeCampaignProvenance(options).sourceHashes['tools/native-q7-labour-policy.mjs']);
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).labourPolicy,'legacy');
});

test('Q8 differs only in affordable six-worker startup; native wages and receipt gates remain',()=>{
 const s=Game.newGame({seed:712,slotId:'q8-paid'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);Game.plant(s,'first','mijo',0,0,nav);
 const q=createQ8LabourPolicy(),options=parseNativeCampaignArgs(['--out','fixture','--labour-policy','q8']);
 assert.equal(options.labourPolicy,'q8');assert.equal(q.dawn(s).staff,6);assert.equal(q.dawn(s).cost,180);
 assert.equal(q.report().settings.openingStaff,6);assert.equal(q.report().settings.lastTrialTime,180);
 Game.openInitialHiring(s);Game.hire(s,'paid-six',{olderFemale:6});q.hired(s,6,{daily:true});assert.equal(s.workers.length,6);assert.equal(s.ledger.entries['paid-six'].n,'-180');
 assert.equal(q.reserve(),180);s.day=2;s.ledger.balance=rational(179);assert.equal(q.dawn(s).staff,5);
 assert.throws(()=>createQ7LabourPolicy({openingStaff:NaN}));assert.throws(()=>createQ7LabourPolicy({openingStaff:0}));
 assert(nativeCampaignProvenance(options).sourceHashes['tools/native-q8-labour-policy.mjs']);
});
