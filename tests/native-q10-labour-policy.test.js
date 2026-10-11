// Synthetic planning fixtures only, not native economic campaign evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {q10EmptyFieldPlan} from '../tools/native-q10-labour-policy.mjs';
const state=()=>({day:8,time:0,plants:[],workers:[],tasks:[],structures:[{id:'center',kind:'center',hp:600,maxHp:600,status:'intact',cost:800}]});
const plan=(cash=332)=>({staff:1,cost:30,cash,desired:1,pendingRepair:0,seedCost:5,recoveryReserve:30,afterPayment:cash-30});

test('empty harvested field anticipates four funded workers instead of one without mutating state',()=>{
 const s=state(),before=JSON.stringify(s),p=q10EmptyFieldPlan(s,plan(),30);
 assert.equal(p.staff,4);assert.equal(p.cost,120);assert.equal(p.recoveryReserve,120);
 assert.equal(p.replanting.forecastCropPurchases,'18');assert.equal(p.purchaseBudgetShortfall,0);
 assert.equal(JSON.stringify(s),before);
});

test('native damage quote reserves actual reconstruction cost once, not a maintenance tariff',()=>{
 const s=state();s.structures.push({kind:'wall',hp:0,maxHp:200,status:'ruined',cost:70});
 const p=q10EmptyFieldPlan(s,{...plan(),pendingRepair:70},30);
 assert.equal(p.staff,3);assert.equal(p.replanting.quotedRepairs,'70');assert.equal(p.replanting.forecastCropPurchases,'16');
 const q=q10EmptyFieldPlan(s,{...plan(),pendingRepair:90},30);assert.equal(q.replanting.quotedRepairs,'90');
});

test('first day, existing crops and unaffordable recovery preserve original plan decisions',()=>{
 const s=state(),p=plan();s.day=1;assert.equal(q10EmptyFieldPlan(s,p,30),p);
 s.day=8;s.plants.push({alive:true,centerId:'center'});assert.equal(q10EmptyFieldPlan(s,p,30),p);
 s.plants=[];const limited=q10EmptyFieldPlan(s,plan(31),30);assert.equal(limited.staff,1);assert.match(limited.replanting.mode,/insufficient/);
});

test('capital forecast scales without a crop quota and rejects unsafe planning inputs',()=>{
 const s=state(),p=q10EmptyFieldPlan(s,plan(10000),30);
 assert.ok(Number(p.replanting.forecastCropPurchases)>60);
 assert.ok(2*p.cost+5<=10000);assert.equal(p.replanting.forecastOnly,true);
 assert.throws(()=>q10EmptyFieldPlan(s,plan(Number.MAX_SAFE_INTEGER+1),30));
 assert.throws(()=>q10EmptyFieldPlan(s,{...plan(),seedCost:0},30));
});
