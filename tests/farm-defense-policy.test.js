import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateOpening,createOpeningWorld} from '../tools/check_opening.mjs';
import {createFarmDefensePolicy} from '../tools/farm-defense-policy.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';

test('ordinary native perimeter construction is charged and keeps worker access and physical crop deliveries',()=>{
 const defense=createFarmDefensePolicy({startDay:1,savingTarget:0});let sequence=0;
 const result=simulateOpening('olderMale',8,{onTick:(s,nav)=>{
  defense.act(s,nav,{reserve:30,command:kind=>`qa-defense-${kind}-${sequence++}`});return s;
 }});
 const report=defense.report(result.state);assert.ok(report.built);assert.ok(report.built.pieces>4);
 assert.equal(result.result,null);assert.equal(result.day,2);assert.ok(result.delivered>0);
 assert.equal(result.ledger.entries['qa-defense-wall-0'].n,String(-report.built.cost));
 const walls=result.state.structures.filter(p=>report.built.ids.includes(p.id));
 assert.equal(walls.length,report.built.pieces);assert.ok(walls.some(p=>p.autoGate),'normal automatic gates must preserve worker access');
 for(const crate of result.crates.filter(c=>c.delivered))assert.ok(result.ledger.entries['deliver:'+crate.id]);
 let cash=1500n;for(const entry of Object.values(result.ledger.entries))cash+=BigInt(entry.n);
 assert.equal(cash,BigInt(result.ledger.balance.n));
 assert.ok(result.money>=30);
});

test('a legal large perimeter increases the savings target instead of silently spending or remaining underfunded forever',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0],origin=centerServicePoint(center,s,.8);
 for(const side of [-1,1]){
  let point;
  for(const dz of [0,30,-30]){
   const p={x:center.x+side*40,z:center.z+dz};
   if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)){point=p;break;}
  }
  assert.ok(point,'ordinary reachable planting site');Game.plant(s,'distant-seed-'+side,'mijo',point.x,point.z,nav);
 }
 const defense=createFarmDefensePolicy({startDay:1,savingTarget:100}),before=serialize(s);
 assert.equal(defense.act(s,nav,{reserve:30,command:()=>{throw Error('Unaffordable wall command issued');}}),0);
 assert.equal(serialize(s),before);assert.equal(defense.report(s).built,null);
 assert.ok(defense.reserve(s)>Number(s.ledger.balance.n),'next purchases must preserve the actual larger wall budget');
});

test('saving for a perimeter does not spend protected cash or mutate the native world when it is unaffordable',()=>{
 const {s,nav}=createOpeningWorld(),defense=createFarmDefensePolicy({startDay:1,savingTarget:500});
 const before=serialize(s);assert.equal(defense.reserve(s),500);
 assert.equal(defense.act(s,nav,{reserve:1000,command:()=>{throw Error('Unfunded command issued');}}),0);
 assert.equal(serialize(s),before);assert.equal(defense.report(s).built,null);
});
