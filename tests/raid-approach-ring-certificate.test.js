import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';

function certifiedRing(){
 const nav=Object.create(Navigation.prototype),region=new Set();
 nav.closedRegions=new Map();
 for(let z=-4;z<=4;z++)for(let x=-4;x<=4;x++){
  const key=`${x},${z}`;region.add(key);nav.closedRegions.set(`1.1:null:false|${key}`,region);
 }
 nav.walkable=()=>true;
 nav.segmentClear=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<3;
 return {nav,region};
}

test('a complete native closed component can reject every crop approach without changing the target',()=>{
 const {nav}=certifiedRing();
 assert.equal(nav.approachRingBlocked({x:10,z:0},{x:0,z:0},1.1,1.7,0),true);
});

test('unknown connectors, direct clearance and actor membership all prevent a false rejection',()=>{
 const {nav,region}=certifiedRing();
 nav.closedRegions.delete('1.1:null:false|2,0');
 assert.equal(nav.approachRingBlocked({x:10,z:0},{x:0,z:0},1.1,1.7,0),false);
 nav.closedRegions.set('1.1:null:false|2,0',region);
 assert.equal(nav.approachRingBlocked({x:1,z:0},{x:0,z:0},1.1,1.7,0),false);
 nav.segmentClear=()=>true;
 assert.equal(nav.approachRingBlocked({x:10,z:0},{x:0,z:0},1.1,1.7,0),false);
});
