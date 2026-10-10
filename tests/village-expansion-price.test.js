import test from 'node:test';
import assert from 'node:assert/strict';
import {expansionVillagePrice,expansionVillagePriceForRuntime} from '../src/simulation/village-expansion-price.js';
import {rational,transact,negate,compare,formatWholeCoins} from '../src/simulation/money.js';
import {ensurePurchaseBudget} from '../src/simulation/budget.js';

test('proposed exact candidate matches all nine specified milestones',()=>{
  const expected=[50000,80000,128000,205000,328000,524000,839000,1342000,2147000];
  expected.forEach((value,i)=>{assert.equal(expansionVillagePrice(i+2),BigInt(value));assert.equal(expansionVillagePriceForRuntime(i+2),value);});
});
test('candidate exponentiation rounds final price, never a previously rounded price',()=>{
  // Repeatedly multiplying the rounded fifth price would give 328,000 for
  // the sixth but eventually drifts; compare independently for 100 ordinals.
  for(const [variant,a] of [['moderate',7n],['proposed',8n],['demanding',9n]])for(let n=2;n<=101;n++){
    const k=BigInt(n-2),num=50000n*a**k,den=5n**k;
    const units=num/(1000n*den),remainder=num%(1000n*den);
    const expected=(units+(2n*remainder>=1000n*den?1n:0n))*1000n;
    assert.equal(expansionVillagePrice(n,variant),expected);
  }
});
test('large prices retain integer precision through ledger, replay and JSON',()=>{
  const cost=expansionVillagePriceForRuntime(100);
  assert.equal(typeof cost,'bigint');assert(cost>BigInt(Number.MAX_SAFE_INTEGER));
  const ledger={balance:rational(cost+30n),entries:{}};
  ensurePurchaseBudget({ledger},cost);
  assert.throws(()=>ensurePurchaseBudget({ledger:{balance:rational(cost+29n)}},cost),/30/);
  assert(transact(ledger,'village-100',negate(rational(cost))));
  assert.equal(compare(ledger.balance,rational(30)),0);
  assert.equal(ledger.entries['village-100'].n,String(-cost));
  assert.equal(transact(ledger,'village-100',negate(rational(cost))),false);
  assert.deepEqual(JSON.parse(JSON.stringify(ledger)),ledger);
  assert.equal(expansionVillagePrice(100n),cost);
  for(const locale of ['es-ES','en-GB'])assert.equal(formatWholeCoins(cost,locale).replace(/[^0-9]/g,''),String(cost));
});
test('price only depends on ordinal and declared candidate, and rejects invalid inputs',()=>{
  for(const n of [0,1,-1,2.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',null])assert.throws(()=>expansionVillagePrice(n));
  assert.throws(()=>expansionVillagePrice(2,'unknown'));
  for(let n=3;n<100;n++)assert(expansionVillagePrice(n,'moderate')<=expansionVillagePrice(n)&&expansionVillagePrice(n)<=expansionVillagePrice(n,'demanding'));
});
