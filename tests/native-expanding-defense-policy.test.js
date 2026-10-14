import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {createNativeExpandingDefensePolicy} from '../tools/native-expanding-defense-policy.mjs';
function fixture(policyOptions){
 const s=Game.newGame({seed:712,slotId:'paid-policy'});s.day=2;s.time=100;s.elapsed=700;s.initialPreparation=false;
 // Explicit paid-command fixture credit, not a new-game economic result.
 s.ledger.balance=rational(20000);const nav=new Navigation(712,'sabana');nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);s.plants=[{id:'crop',species:'mijo',alive:true,x:3,z:0}];nav.setState(s);
 let id=0;return {s,nav,options:{command:k=>'policy-'+k+'-'+id++,reserve:100},policy:createNativeExpandingDefensePolicy(policyOptions)};
}
test('expanding native paid enclosure changes bounds and charges actual new pieces, no free/repriced fixture walls',()=>{
 const {s,nav,options,policy}=fixture(),cash=numberOf(s.ledger.balance);assert.equal(policy.act(s,nav,options),1);const first=policy.report(s);
 assert.equal(cash-numberOf(s.ledger.balance),first.paidCost);assert.ok(first.paidPieces>0);
 s.plants.push({id:'newcrop',species:'maiz',alive:true,x:18,z:0});s.elapsed+=31;nav.setState(s);
 assert.equal(policy.act(s,nav,options),1);const second=policy.report(s);assert.ok(second.built.bounds[2]>first.built.bounds[2]);assert.ok(second.paidPieces>first.paidPieces);
 assert.ok(s.structures.filter(w=>w.kind==='wall').every(w=>w.cost===10));assert.equal(second.paidCost,cash-numberOf(s.ledger.balance));
});
test('failed/unaffordable strokes and uncompleted repair requests are not counted as useful build actions',()=>{
 const {s,nav,options,policy}=fixture();assert.equal(policy.act(s,nav,options),1);const wall=s.structures.find(w=>w.kind==='wall');wall.hp=50;nav.setState(s);s.elapsed+=31;
 assert.equal(policy.act(s,nav,options),0);assert.ok(s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id));assert.equal(policy.report(s).repairRequests,1);
 s.elapsed+=31;s.ledger.balance=rational(30);assert.equal(policy.act(s,nav,options),0);assert.equal(policy.report(s).history.at(-1).reason,'budget');
});

test('optional ruined-first priority spends a one-repair budget on a late ruin',()=>{
 for(const [priority,expected] of [['creation','damaged'],['ruined-first','ruined']]){
  const {s,nav,options,policy}=fixture({repairPriority:priority});
  assert.equal(policy.act(s,nav,options),1);
  const walls=s.structures.filter(w=>w.kind==='wall');
  assert(walls.length>1);
  const damaged=walls[0],ruined=walls.at(-1);
  damaged.hp=damaged.maxHp/2;ruined.hp=0;ruined.status='ruined';
  s.ledger.balance=rational(110);s.elapsed+=31;nav.setState(s);
  assert.equal(policy.act(s,nav,options),0);
  const repairs=s.tasks.filter(t=>t.kind==='repair');
  assert.equal(repairs.length,1);
  assert.equal(repairs[0].targetId,expected==='ruined'?ruined.id:damaged.id);
  assert.equal(policy.report(s).repairPriority,priority);
 }
 assert.throws(()=>createNativeExpandingDefensePolicy({repairPriority:'other'}),/priority/);
});

test('ruined-first preserves creation order when no wall is ruined',()=>{
 for(const priority of ['creation','ruined-first']){
  const {s,nav,options,policy}=fixture({repairPriority:priority});
  assert.equal(policy.act(s,nav,options),1);
  const walls=s.structures.filter(w=>w.kind==='wall');
  const first=walls[0],later=walls.at(-1);
  first.hp=first.maxHp/2;later.hp=later.maxHp/2;
  s.ledger.balance=rational(105);s.elapsed+=31;nav.setState(s);
  assert.equal(policy.act(s,nav,options),0);
  assert.deepEqual(s.tasks.filter(t=>t.kind==='repair').map(t=>t.targetId),[first.id]);
 }
});
