import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {add,negate,rational} from '../src/simulation/money.js';

test('rational addition stays canonical for signed, zero and non-reduced saved values',()=>{
 const operands=[
  {n:'0',d:'8'},{n:'-6',d:'9'},{n:'12',d:'18'},
  rational(1,1000003),rational(-7,10),rational(123456789,1000000000)
 ];
 for(const a of operands)for(const b of operands){
  const actual=add(a,b);
  const expected=rational(BigInt(a.n)*BigInt(b.d)+BigInt(b.n)*BigInt(a.d),
    BigInt(a.d)*BigInt(b.d));
  assert.deepEqual(actual,expected);
 }
});

test('long sums retain the same exact numerator and denominator',()=>{
 const terms=Array.from({length:200},(_,i)=>rational(BigInt((i*37)%127+1),
  BigInt(1000003+i*20)));
 let actual=rational(0),expected=rational(0);
 for(const term of terms){
  actual=add(actual,term);
  expected=rational(BigInt(expected.n)*BigInt(term.d)+BigInt(term.n)*BigInt(expected.d),
    BigInt(expected.d)*BigInt(term.d));
 }
 assert.deepEqual(actual,expected);
});

test('signed sums and restored large growth accounts remain exact',()=>{
 const fixture=JSON.parse(readFileSync(new URL(
  '../docs/qa/exact-money-performance/manglares-day11-growth-operand.json',
  import.meta.url)));
 let actual=JSON.parse(JSON.stringify(fixture.consumed));
 let expected=actual;
 for(let i=0;i<240;i++){
  const term=i%3===0?negate(rational(i+1,1000000000)):
    rational(i+1,1000000000);
  actual=add(actual,term);
  expected=rational(BigInt(expected.n)*BigInt(term.d)+
    BigInt(term.n)*BigInt(expected.d),BigInt(expected.d)*BigInt(term.d));
  assert.deepEqual(actual,expected,`exact value after update ${i}`);
  if(i===120)actual=JSON.parse(JSON.stringify(actual));
 }
});
