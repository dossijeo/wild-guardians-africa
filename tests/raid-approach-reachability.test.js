import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';

function grid(barrier){
  const nav=new Navigation(712,'sabana',{});
  nav.obstacles=[{kind:'wall'}];
  nav.walkable=(x,z)=>!barrier(x,z);
  nav.segmentClear=(a,b)=>{
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*8));
    for(let i=0;i<=steps;i++)if(barrier(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
    return true;
  };
  return nav;
}
const targets=Array.from({length:40},(_,i)=>({x:4+i%5*.2,z:-2+Math.floor(i/5)*.5}));

test('group prefilter only rejects points that the bounded native route cannot reach',()=>{
  const nav=grid((x)=>Math.abs(x)<.45),start={x:-4,z:0},filter=nav.approachReachability(start,targets,.3);
  assert(filter);
  for(const target of targets){
    assert.equal(filter(target),false);
    assert.equal(nav.approachPath(start,target,.3,32),null);
  }
});

test('group prefilter retains a detour through an open corridor',()=>{
  const nav=grid((x,z)=>Math.abs(x)<.45&&z<4),start={x:-4,z:0},filter=nav.approachReachability(start,targets,.3);
  assert(filter);
  const target=targets[0];
  assert(filter(target));
  assert(nav.approachPath(start,target,.3,32));
});

test('group prefilter retains a clear direct route when grid starts are unavailable',()=>{
  const nav=grid(()=>false),start={x:-4.2,z:.2};
  nav.walkable=(x,z)=>!Number.isInteger(x)||!Number.isInteger(z);
  const filter=nav.approachReachability(start,targets,.3);
  const target={x:4.2,z:.2};
  assert(filter(target));
  assert(nav.approachPath(start,target,.3,32));
});
