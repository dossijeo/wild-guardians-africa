import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';

function pressure(cache,capacity){
  for(let i=cache.size;i<capacity;i++)cache.set(`pressure-${i}`,Boolean(i%2));
}
test('native walk queries survive capacity pressure without losing true or false results',()=>{
  const {s,nav}=createOpeningWorld(),c=s.structures[0];
  pressure(nav.walkCache,50000);
  let calls=0;const raw=nav.testWalkable.bind(nav);
  nav.testWalkable=(...args)=>{calls++;return raw(...args);};
  const results=[];
  for(let dz=-8;dz<8;dz++)for(let dx=-8;dx<8;dx++){
    const args=[Math.round(c.x)+dx,Math.round(c.z)+dz,.28,null,true];
    const expected=raw(...args);assert.equal(nav.walkable(...args),expected);
    results.push({args,expected});
  }
  assert.ok(results.some(r=>r.expected)&&results.some(r=>!r.expected));
  const misses=calls;
  for(const {args,expected} of results)assert.equal(nav.walkable(...args),expected);
  assert.equal(calls,misses,'recent results are reused across capacity insertions');
  assert.equal(nav.walkCache.size,50000);
  assert.equal(nav.walkCache.has('pressure-0'),false);
  assert.equal(nav.walkCache.has('pressure-49999'),true);
  nav.setState(s);assert.equal(nav.walkCache.size,0);
  assert.equal(nav.walkable(...results[0].args),raw(...results[0].args));
  assert.equal(calls,misses+1,'geometry rebuild invalidates retained queries');
});
test('native segment cache stays bounded, directed and separated by radius, ignore and worker',()=>{
  const {s,nav}=createOpeningWorld(),c=s.structures[0];
  pressure(nav.segmentCache,100000);
  const a={x:Math.round(c.x)+6,z:Math.round(c.z)},b={x:a.x+2,z:a.z+1};
  const queries=[[a,b,.28,null,true],[b,a,.28,null,true],[a,b,.7,null,true],
    [a,b,.28,c.id,true],[a,b,.28,null,false]];
  let calls=0;const raw=nav.testSegmentClear.bind(nav);
  nav.testSegmentClear=(...args)=>{calls++;return raw(...args);};
  const expected=queries.map(args=>raw(...args));
  queries.forEach((args,i)=>assert.equal(nav.segmentClear(...args),expected[i]));
  assert.equal(calls,queries.length);assert.equal(nav.segmentCache.size,100000);
  queries.forEach((args,i)=>assert.equal(nav.segmentClear(...args),expected[i]));
  assert.equal(calls,queries.length);assert.equal(nav.segmentCache.has('pressure-0'),false);
  const fractional=[{x:a.x+.25,z:a.z},b,.28,null,true];
  assert.equal(nav.segmentClear(...fractional),raw(...fractional));
  assert.equal(nav.segmentClear(...fractional),raw(...fractional));
  assert.equal(calls,queries.length+2);assert.equal(nav.segmentCache.size,100000);
  nav.setState(s);assert.equal(nav.segmentCache.size,0);
  queries.forEach((args,i)=>assert.equal(nav.segmentClear(...args),expected[i]));
  assert.equal(calls,queries.length*2+2);
});
test('fractional walk queries remain uncached under pressure',()=>{
  const {nav}=createOpeningWorld();pressure(nav.walkCache,50000);
  let calls=0;const raw=nav.testWalkable.bind(nav);
  nav.testWalkable=(...args)=>{calls++;return raw(...args);};
  const args=[.25,.75,.28,null,true],expected=raw(...args);
  assert.equal(nav.walkable(...args),expected);assert.equal(nav.walkable(...args),expected);
  assert.equal(calls,2);assert.equal(nav.walkCache.size,50000);
});
