import test from 'node:test';
import assert from 'node:assert/strict';
import {hiringCost,PROFILES} from '../src/simulation/workforce.js';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';

test('all integer shift times agree with exact proportional wages for each profile',()=>{
 for(const p of PROFILES)for(let time=0;time<p.end;time++)for(const count of [1,2,7]){
  const numerator=BigInt(count*p.wage*(p.end-time)),denominator=BigInt(p.end);
  assert.equal(hiringCost({[p.id]:count},{time}),Number((numerator+denominator-1n)/denominator),`${p.id}, ${count}, ${time}`);
 }
 assert.equal(hiringCost({olderFemale:1},{time:100}),20);
 assert.equal(hiringCost({olderFemale:1},{time:200}),10);
});

test('mixed fractional wages round only once and preserve actual decimal time',()=>{
 // 0.30 + 0.40 is one coin, not two independently rounded charges.
 assert.equal(hiringCost({olderFemale:1,youngFemale:1},{time:297}),1);
 assert.equal(hiringCost({olderFemale:1},{time:100.000001}),20);
 assert.equal(hiringCost({olderFemale:1},{time:99.999999}),21);
 assert.equal(hiringCost({}, {time:1e20}),0);
 assert.throws(()=>hiringCost({olderFemale:Number.MAX_SAFE_INTEGER}),/representable/);
 assert.throws(()=>hiringCost({olderFemale:1},{time:300}),/terminado/);
});

test('native additional hire charges the quote once and remains idempotent after reload',()=>{
 const s=Game.newGame();Game.resume(s,'intro');const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 Game.openInitialHiring(s);Game.hire(s,'morning',{olderFemale:1});s.time=100;
 const before=numberOf(s.ledger.balance);
 assert.equal(Game.hireAdditional(s,'exact-midday',{olderFemale:1},s.structures[0].id),true);
 assert.equal(numberOf(s.ledger.balance),before-20);
 const loaded=deserialize(serialize(s)),saved=serialize(loaded);
 assert.equal(Game.hireAdditional(loaded,'exact-midday',{olderFemale:1},s.structures[0].id),false);
 assert.equal(serialize(loaded),saved);
});
