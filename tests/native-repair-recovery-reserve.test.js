// Synthetic starting damage/cash, followed by actual commands, FIFO workers and
// payments. This is a recovery regression, not campaign balance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {dawnMinimum} from '../src/simulation/rules.js';
import {breachRepairFunding,settledRepairQuote} from '../tools/native-repair-funding.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fundingState(){return {structures:[{kind:'center',status:'intact'},{id:'wall',kind:'wall',hp:0,maxHp:100,status:'ruined'}],plants:[],crates:[]};}
test('empty farm retains the actual 35-coin recovery floor, independently of requested full-crew reserve',()=>{
 const s=fundingState(),before=JSON.stringify(s);assert.equal(dawnMinimum(s),35);
 for(const reserve of [0,30,35,210])assert.equal(breachRepairFunding(s,new Set(['wall']),reserve).protectedCash,35);
 assert.equal(JSON.stringify(s),before);
});
test('remaining living crops or undelivered crates retain the native 30-coin breached recovery rule',()=>{
 const s=fundingState();s.plants.push({alive:true});assert.equal(breachRepairFunding(s,new Set(['wall']),210).protectedCash,30);
 s.plants[0].alive=false;s.crates.push({delivered:false});assert.equal(breachRepairFunding(s,new Set(['wall']),210).protectedCash,30);
 s.crates[0].delivered=true;assert.equal(breachRepairFunding(s,new Set(['wall']),210).protectedCash,35);
});
test('unbreached funding preserves both the requested reserve and native recovery floor',()=>{
 const s=fundingState();s.structures[1].status='intact';s.structures[1].hp=100;
 assert.equal(breachRepairFunding(s,new Set(['wall']),210).protectedCash,210);
 assert.equal(breachRepairFunding(s,new Set(['wall']),30).protectedCash,35);
});
test('native worker repairs leave cash for a paid replacement seed and minimum next wage',()=>{
 const s=Game.newGame({seed:712,slotId:'repair-recovery'}),nav=new Navigation(712,'sabana',{});
 nav.field={surface:()=>0,slope:()=>0,blocked:()=>false,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.resume(s,'intro');s.villages[0].entry={x:-15,z:-8};
 Game.placeStructure(s,'center',{x:-10,z:-10},nav);Game.plant(s,'initial-seed','mijo',-4,-9,nav);
 for(const [i,material] of ['piedra','adobe','zarzas'].entries())Game.placeStructure(s,'wall-'+i,{kind:'wall',material,x:8+4*i,z:0},nav);
 Game.openInitialHiring(s);Game.hire(s,'initial-hire',{olderFemale:1});
 // Explicit test setup reproduces an empty farm after the crew is paid.
 s.plants[0].alive=false;Game.rebuildTasks(s);s.ledger.balance=rational(157);
 const walls=s.structures.filter(p=>p.kind==='wall');for(const w of walls){w.hp=0;w.status='ruined';}nav.setState(s);
 assert.equal(walls.reduce((n,w)=>n+settledRepairQuote(w),0),125);
 let id=0;const policy=createNativeFundedDefensePolicy({startDay:1,material:'zarzas',repairPolicy:'breach-first'});
 policy.act(s,nav,{command:k=>'recovery-'+k+'-'+id++,reserve:35});
 const tasks=s.tasks.filter(t=>t.kind==='repair'),quoted=tasks.reduce((n,t)=>n+settledRepairQuote(s.structures.find(w=>w.id===t.targetId)),0);
 assert(quoted>0&&quoted<=122);assert.equal(numberOf(s.ledger.balance),157);assert.equal(policy.report().history[0].repairFunding.protectedCash,35);
 assert(Game.plant(s,'replacement-seed','mijo',-4,-9,nav));assert.equal(numberOf(s.ledger.entries['replacement-seed']),-5);
 const loaded=deserialize(serialize(s));nav.setState(loaded);
 for(let i=0;i<250&&tasks.some(t=>!loaded.ledger.entries['repair:'+t.id]);i++)Game.tick(loaded,1,nav);
 for(const t of tasks){const w=loaded.structures.find(w=>w.id===t.targetId);assert.equal(w.hp,w.maxHp);assert(loaded.ledger.entries['repair:'+t.id]);}
 const paid=tasks.reduce((n,t)=>n-numberOf(loaded.ledger.entries['repair:'+t.id]),0);
 assert.equal(paid,quoted);assert.equal(numberOf(loaded.ledger.balance),157-5-paid);assert(numberOf(loaded.ledger.balance)>=30);
 assert(loaded.plants.some(p=>p.alive));assert.equal(loaded.result,null);
});
