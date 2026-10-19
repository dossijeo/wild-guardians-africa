import test from 'node:test';
import assert from 'node:assert/strict';
import {createWallRouteWitness} from '../src/simulation/raid-wall-route-witness.js';

const side=(wallId,x=10)=>({wallId,x,z:0});
const point=x=>({x,z:0});

test('a direct, directed physical prefix reuses a positive route to one wall side',()=>{
  const routes=[],segments=[],nativeDurations=[];
  const status=createWallRouteWitness({
    spatialRouteStatus:(from,to,radius)=>{routes.push([from.x,to.wallId,radius]);return 'found';},
    segmentClear:(from,to,radius,ignore,worker)=>{
      segments.push([from.x,to.x,radius,ignore,worker]);return from.x===2&&to.x===1;
    }
  },duration=>nativeDurations.push(duration));
  assert.equal(status(point(1),side(7),1.1),'found');
  assert.equal(status(point(2),side(7),1.1),'found');
  assert.deepEqual(routes,[[1,7,1.1]]);
  assert.deepEqual(segments,[[2,1,1.1,null,false]]);
  assert.equal(nativeDurations.length,1);
});

test('an obstructed or reverse-only prefix requires its own native route',()=>{
  const routes=[],segments=[];
  const status=createWallRouteWitness({
    spatialRouteStatus:(from)=>{routes.push(from.x);return from.x===3?'blocked':'found';},
    segmentClear:(from,to)=>{segments.push([from.x,to.x]);return from.x===1&&to.x===2;}
  });
  assert.equal(status(point(1),side(7),1.1),'found');
  assert.equal(status(point(2),side(7),1.1),'found');
  assert.equal(status(point(3),side(7),1.1),'blocked');
  assert.deepEqual(routes,[1,2,3]);
  assert.deepEqual(segments,[[2,1],[3,1],[3,2]]);
});

test('unknown never becomes a witness, and profile or wall changes do not share routes',()=>{
  let routes=0;
  const status=createWallRouteWitness({
    spatialRouteStatus:()=>{routes++;return routes===1?'unknown':'found';},
    segmentClear:()=>true
  });
  assert.equal(status(point(1),side(7),1.1),'unknown');
  assert.equal(status(point(2),side(7),1.1),'found');
  assert.equal(status(point(3),side(7),1.5),'found');
  assert.equal(status(point(4),side(8),1.1),'found');
  assert.equal(status(point(5),side(7,11),1.1),'found');
  assert.equal(routes,5);
});

test('a blocked prefix is rechecked rather than trusting a prior clear result',()=>{
  let clear=true,routes=0;
  const status=createWallRouteWitness({
    spatialRouteStatus:()=>{routes++;return routes===1?'found':'blocked';},
    segmentClear:()=>clear
  });
  assert.equal(status(point(1),side(7),1.1),'found');
  clear=false;
  assert.equal(status(point(2),side(7),1.1),'blocked');
  assert.equal(routes,2);
});
