import test from 'node:test';
import assert from 'node:assert/strict';
import {rational,rationalNumber} from '../src/simulation/money.js';

test('decimal rational conversion preserves persisted number precision and exponent forms',()=>{
 for(const [value,n,d] of [[0,0,1],[12.5,25,2],[-.05,-1,20],[1e-7,1,10000000],[1e21,10n**21n,1]])assert.deepEqual(rationalNumber(value),rational(n,d));
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>rationalNumber(value),/no finita/);
});
