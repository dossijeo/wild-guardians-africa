import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {createNativeExpandingDefensePolicy} from '../tools/native-expanding-defense-policy.mjs';

test('crop turnover inside an existing paid perimeter does not shrink it or buy redundant internal rings',()=>{
 const s=Game.newGame({seed:712,slotId:'defense-turnover'});Object.assign(s,{day:2,time:100,elapsed:700,initialPreparation:false});
 // Funded command/geometry fixture; not a new-game affordability claim.
 s.ledger.balance=rational(20000);
 const nav=new Navigation(712,'sabana');nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 s.plants=[{id:'outside',species:'mijo',alive:true,x:18,z:0}];nav.setState(s);
 let id=0;const options={command:k=>'turnover-'+k+'-'+id++,reserve:100},policy=createNativeExpandingDefensePolicy();
 assert.equal(policy.act(s,nav,options),1);
 const first=policy.report(s),cash=numberOf(s.ledger.balance);
 s.plants[0].alive=false;s.plants.push({id:'replacement',species:'mijo',alive:true,x:0,z:0});s.elapsed+=31;nav.setState(s);
 assert.equal(policy.act(s,nav,options),0);
 const second=policy.report(s);
 assert.deepEqual(second.built.bounds,first.built.bounds);
 assert.equal(second.paidPieces,first.paidPieces);assert.equal(second.paidCost,first.paidCost);assert.equal(numberOf(s.ledger.balance),cash);
});
