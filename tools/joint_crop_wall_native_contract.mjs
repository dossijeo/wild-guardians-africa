import assert from 'node:assert/strict';
import {BALANCE} from '../src/simulation/balance.js';
import {newGame,repairCost,wallRefund} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {rational,numberOf,negate,transact} from '../src/simulation/money.js';
// Isolated process only. Do not modify production configuration on disk.
const old=BALANCE.walls.map(w=>w.cost);
try {
  const s=newGame({slotId:'qa-historical-wall',seed:'712'});
  const historic={id:'historic-wall',kind:'wall',material:'zarzas',cost:10,hp:73,maxHp:100,status:'intact',x:0,z:0,yaw:0,gate:false};
  s.structures.push(historic);
  const bytes=serialize(s);
  BALANCE.walls.forEach(w=>{w.cost=Math.ceil(w.cost*.25);});
  const restored=deserialize(bytes),wall=restored.structures.find(w=>w.id==='historic-wall');
  assert.equal(wall.cost,10);assert.equal(numberOf(repairCost(wall)),2.7);assert.equal(numberOf(wallRefund(wall)),8);
  const ledger={balance:rational(100),entries:{}};
  transact(ledger,'historic-repair',negate(repairCost(wall)));assert.equal(numberOf(ledger.balance),97);
  const cheap={...wall,id:'new-wall',cost:BALANCE.walls[0].cost};
  assert.equal(cheap.cost,3);transact(ledger,'new-repair',negate(repairCost(cheap)));assert.equal(numberOf(ledger.balance),96);
  assert.equal(numberOf(wallRefund(cheap)),3);
  const gate={...cheap,gate:true,maxHp:60,hp:13.5};
  assert.equal(numberOf(wallRefund(gate)),1);
  transact(ledger,'gate-repair',negate(repairCost(gate)));assert.equal(numberOf(ledger.balance),93);
  console.log(JSON.stringify({pass:true,baseline:'This branch native runtime; frozen productive price calculations use e040 source separately',historicalCost:wall.cost,newCost:cheap.cost,historicRepairCharged:3,newRepairCharged:1,gateRepairCharged:3,productionMutation:false}));
}finally{BALANCE.walls.forEach((w,i)=>{w.cost=old[i];});}
