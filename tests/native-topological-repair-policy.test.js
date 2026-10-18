import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {createNativeTopologicalDefensePolicy} from
  '../tools/native-topological-defense-policy.mjs';

function fixture(){
 const state=Game.newGame({seed:712,slotId:'topological-repair-events'});
 state.day=2;state.time=100;state.elapsed=700;state.initialPreparation=false;
 state.ledger.balance=rational(20000);
 const nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,
  fluidInside:()=>false};
 nav.propsAt=()=>[];nav.setState(state);
 Game.placeStructure(state,'center',{x:-15,z:0},nav);
 const center=state.structures.find(item=>item.kind==='center');
 const wall={id:'structure-999',kind:'wall',material:'zarzas',gate:true,
  cost:10,hp:100,maxHp:100,status:'intact',x:0,z:0,yaw:0,
  defenseEnclosureId:'enclosure:fixture',defenseGroupId:'crop:fixture'};
 state.structures.push(wall);nav.setState(state);
 let wallQueries=0,centerQueries=0,commands=0;
 const advice={
  getDamagedWalls:()=>{
   wallQueries++;
   return wall.hp<wall.maxHp?[{id:wall.id,kind:'wall',hp:wall.hp,
    maxHp:wall.maxHp,status:wall.status,paidCoins:Math.ceil(numberOf(Game.repairCost(wall))),
    damageRatio:1-wall.hp/wall.maxHp,enclosureId:wall.defenseEnclosureId,
    plannedGroupId:wall.defenseGroupId}]:[];
  },
  getDamagedCenters:()=>{
   centerQueries++;
   return center.hp<center.maxHp?[{id:center.id,kind:'center',hp:center.hp,
    maxHp:center.maxHp,status:center.status,
    paidCoins:Math.ceil(numberOf(Game.repairCost(center))),
    damageRatio:1-center.hp/center.maxHp}]:[];
  },
  getUnprotectedCropGroups:()=>{
   throw Error('Damage processing must not query crop connectivity');
  }
 };
 const policy=createNativeTopologicalDefensePolicy({session:{},advice,
  startDay:99,repairWalls:true,repairCenters:true});
 const options={command:kind=>`topological-${kind}-${commands++}`,
  reserve:100,centerReserve:50};
 return {state,wall,center,nav,policy,options,advice,
  queries:()=>({walls:wallQueries,centers:centerQueries})};
}

test('topological policy requests paid repairs only at condition and funding events',()=>{
 const {state,wall,nav,policy,options,queries}=fixture();
 assert.equal(policy.act(state,nav,options),0);
 assert.deepEqual(queries(),{walls:1,centers:1});
 assert.equal(policy.act(state,nav,options),0);
 assert.deepEqual(queries(),{walls:1,centers:1},
  'idle ticks must not query native repair indexes');
 wall.hp=90;
 policy.onStructureConditionChanged({change:'damaged',kind:'wall',
  hp:90,maxHp:100,status:'intact'});
 assert.equal(policy.act(state,nav,options),0);
 assert.deepEqual(queries(),{walls:1,centers:1},
  'minor damage does not need a repair decision');
 wall.hp=70;state.ledger.balance=rational(102);
 policy.onStructureConditionChanged({change:'damaged',kind:'wall',
  hp:70,maxHp:100,status:'intact'});
 assert.equal(policy.act(state,nav,options),0);
 assert.deepEqual(queries(),{walls:2,centers:2});
 assert.equal(state.tasks.filter(item=>item.kind==='repair').length,0);
 assert.equal(policy.report().repairWaitForFunds,103);
 policy.onWorldEvent({type:'CrateDelivered'},state);
 assert.equal(policy.act(state,nav,options),0);
 assert.deepEqual(queries(),{walls:2,centers:2});
 state.ledger.balance=rational(103);
 policy.onWorldEvent({type:'CrateDelivered'},state);
 assert.equal(policy.act(state,nav,options),1);
 assert.equal(state.tasks.filter(item=>item.kind==='repair'&&
  item.targetId===wall.id).length,1);
 assert.equal(policy.report().repairRequests,1);
 assert.equal(policy.report().repairHistory[0].enclosureId,'enclosure:fixture');
 assert.equal(policy.act(state,nav,options),0);
 assert.equal(state.tasks.filter(item=>item.kind==='repair').length,1,
  'pending repairs cannot be requested again');
});

test('a damaged center has priority and a breach wakes maintenance without planning paths',()=>{
 const {state,wall,center,nav,policy,options}=fixture();
 policy.act(state,nav,options);
 center.hp=500;wall.hp=0;wall.status='ruined';
 policy.onStructureConditionChanged({change:'damaged',kind:'center',
  hp:500,maxHp:center.maxHp,status:'intact'});
 policy.onStructureConditionChanged({change:'breach',kind:'wall',
  hp:0,maxHp:wall.maxHp,status:'ruined'});
 const before=numberOf(state.ledger.balance);
 assert.equal(policy.act(state,nav,options),2);
 assert.deepEqual(state.tasks.filter(item=>item.kind==='repair')
  .map(item=>item.targetId),[center.id,wall.id]);
 assert.equal(numberOf(state.ledger.balance),before,
  'ordinary repair tasks pay only when a worker completes them');
 assert.equal(policy.report().conditionNotifications,2);
});

test('new breach events outrank obsolete agricultural group IDs',()=>{
 const {state,wall,nav,policy,options,advice}=fixture();
 policy.act(state,nav,options);
 const old={...wall,id:'structure-100',created:100,x:4,hp:0,
  status:'ruined',defenseGroupId:'crop:old'};
 const fresh={...wall,id:'structure-200',created:200,x:8,hp:0,
  status:'ruined',defenseGroupId:'crop:replanted'};
 state.structures.push(old,fresh);nav.setState(state);
 advice.getDamagedWalls=()=>[old,fresh].map(item=>({id:item.id,
  kind:'wall',hp:0,maxHp:100,status:'ruined',paidCoins:10,
  damageRatio:1,plannedGroupId:item.defenseGroupId}));
 policy.onCropProtectionChanged({groupId:'crop:old',
  group:{value:10000},protection:'unprotected'});
 for(const item of [old,fresh])policy.onStructureConditionChanged({
  change:'breach',kind:'wall',structureId:item.id,hp:0,maxHp:100,
  status:'ruined'});
 assert.equal(policy.act(state,nav,options),2);
 assert.deepEqual(policy.report().repairHistory.map(row=>row.id),
  [fresh.id,old.id]);
 assert.equal(policy.act(state,nav,options),0,
  'idle decisions must not request the same repairs again');
});
