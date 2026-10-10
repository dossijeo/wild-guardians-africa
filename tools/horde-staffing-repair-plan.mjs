import assert from 'node:assert/strict';
import {PROFILES,hiringCost} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
export function staffingRepairPlan(s){
 assert.equal(s.day,21);assert.equal(s.time,0);assert.equal(s.completedNights,20);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);assert.equal(s.hiringPaidDay,null);
 const profile=PROFILES.find(p=>p.id==='olderFemale');assert.equal(profile.wage,30);assert.equal(profile.end,300);
 const centers=s.structures.filter(c=>c.kind==='center'&&c.status==='intact');assert.equal(centers.length,1);const center=centers[0];assert.equal(center.cost,800);assert.ok(center.hp>0&&center.hp<center.maxHp);
 const living=s.plants.filter(p=>p.alive).length,count=Math.ceil(living/6);assert.ok(count>0);const selection={olderFemale:count},paidCoins=hiringCost(selection,{time:s.time}),nextDayWages=count*profile.wage;
 const repair=Game.repairCost(center),repairReserve=Math.max(100,Math.ceil(numberOf(repair))),balance=numberOf(s.ledger.balance);assert.ok(balance>=paidCoins+nextDayWages+repairReserve,'Cannot fund ordinary hiring plus tomorrow wages and actual repair reserve');
 return {changedPolicy:{plantsPerWorker:6,profile:'olderFemale',scope:'Separate fixed-cohort productive staffing diagnosis; not original strategy or activity acceptance'},living,selection,count,paidCoins,nextDayWages,repairReserve,initialBalance:balance,balanceAfterHire:balance-paidCoins,remainingAfterBothReserves:balance-paidCoins-nextDayWages-repairReserve,centerId:center.id,originalCenterHp:center.hp};
}
