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
 s.plants.push({id:'new-budget-crop',species:'mijo',alive:true,x:18,z:0});
 s.elapsed+=31;s.ledger.balance=rational(30);nav.setState(s);
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(policy.report(s).history.at(-1).reason,'budget');
 assert.equal(policy.report(s).history.at(-1).paidPieces,0,
  'the policy saves for the complete quoted enclosure');
});
test('a certified protection loss wakes the defense policy before its periodic interval',()=>{
 const {s,nav,options,policy}=fixture();
 assert.equal(policy.act(s,nav,options),1);
 const before=policy.report(s).history.length;
 policy.onCropProtectionChanged({previous:'protected',protection:'unknown'});
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(policy.report(s).history.length,before,
  'unknown is not a certified breach');
 policy.onCropProtectionChanged({previous:'protected',protection:'unprotected'});
 policy.act(s,nav,options);
 assert.equal(policy.report(s).history.length,before+1);
 assert.equal(policy.report(s).protectionWakes,1);
 const afterBreach=policy.report(s).history.length;
 policy.onCropProtectionChanged({previous:null,protection:'unprotected'});
 policy.act(s,nav,options);
 assert.equal(policy.report(s).history.length,afterBreach+1,
  'a newly planted exposed group wakes defense immediately');
 assert.equal(policy.report(s).protectionWakes,2);
});
test('event-driven defense sleeps without relevant changes and wakes on income or damage',()=>{
 const {s,nav,options,policy}=fixture({eventDriven:true});
 assert.equal(policy.act(s,nav,options),1);
 const first=policy.report(s).history.length;
 s.elapsed+=300;
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(policy.report(s).history.length,first,
  'elapsed time alone must not trigger another spatial plan');
 policy.onWorldEvent({type:'CrateDelivered'},s);
 policy.act(s,nav,options);
 assert.equal(policy.report(s).history.length,first+1);
 const second=policy.report(s).history.length;
 policy.onWorldEvent({type:'CrateDropped'});
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(policy.report(s).history.length,second);
 const wall=s.structures.find(item=>item.kind==='wall');
 wall.hp=50;nav.setState(s);
 policy.onWorldEvent({type:'StructureHit',targetId:wall.id});
 policy.act(s,nav,options);
 assert.ok(s.tasks.some(task=>task.kind==='repair'&&task.targetId===wall.id));
 assert.equal(policy.report(s).repairRequests,1);
});
test('event-driven defense waits for the whole stroke before quoting and spending',()=>{
 const phases=[];
 const {s,nav,options,policy}=fixture({eventDriven:true,reserveMode:'next-stroke',
  measure:kind=>phases.push(kind)});
 assert.equal(policy.act(s,nav,options),1);
 s.plants.push({id:'future-crop',species:'mijo',alive:true,x:18,z:0});
 s.ledger.balance=rational(30);nav.setState(s);
 policy.onWorldEvent({type:'CropPlaced',targetId:'future-crop'},s);
 assert.equal(policy.act(s,nav,options),0);
 const waiting=policy.report(s),target=waiting.waitForFunds;
 assert.equal(waiting.history.at(-1).reason,'budget');
 assert.ok(target>30);
 assert.equal(policy.reserve(s),waiting.capitalTarget,
  'agricultural spending must preserve the wall savings target');
 const quotes=phases.filter(kind=>kind==='defense.quoteWallChain').length;
 s.ledger.balance=rational(target-1);
 policy.onWorldEvent({type:'CrateDelivered'},s);
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(policy.report(s).history.length,waiting.history.length,
  'subthreshold deliveries do not repeat the same geometry quote');
 assert.equal(phases.filter(kind=>kind==='defense.quoteWallChain').length,quotes,
  'affordability is checked before the expensive full geometry quote');
 s.ledger.balance=rational(target);
 policy.onWorldEvent({type:'CrateDelivered'},s);
 assert.equal(policy.act(s,nav,options),1);
 assert.ok(policy.report(s).history.at(-1).paidCost>0);
 assert.ok(policy.report(s).history.at(-1).paidCost<=target-options.reserve,
  'the complete incremental quote is paid at once');
});
