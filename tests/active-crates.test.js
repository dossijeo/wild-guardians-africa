import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCrates,crateBecameInactive,invalidateActiveCrates} from '../src/simulation/active-crates.js';

test('live crate index ignores delivered history until membership changes',()=>{
  let reads=0;
  const history=Array.from({length:20000},(_,i)=>({id:`delivered-${i}`,get delivered(){reads++;return true;}}));
  const pending={id:'pending',delivered:false},crates=[...history,pending];
  assert.deepEqual(activeCrates(crates),[pending]);assert.equal(reads,history.length);
  reads=0;for(let i=0;i<30;i++)assert.deepEqual(activeCrates(crates),[pending]);
  assert.equal(reads,0);
  const next={id:'next',delivered:false};crates.push(next);
  assert.deepEqual(activeCrates(crates),[pending,next]);assert.equal(reads,0);
  pending.delivered=true;crateBecameInactive(crates);
  assert.deepEqual(activeCrates(crates),[next]);assert.equal(reads,0);
  const restored=structuredClone([{id:'restored',delivered:false}]);
  assert.deepEqual(activeCrates(restored),restored);
  invalidateActiveCrates(crates);assert.deepEqual(activeCrates(crates),[next]);
});
