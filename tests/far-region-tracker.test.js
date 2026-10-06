import test from 'node:test';import assert from 'node:assert/strict';
import {FarRegionTracker,farRegionRequest} from '../tools/experiments/far-region-tracker.js';
test('stationary, orbit and grid-edge jitter never trigger regional sampling',()=>{
 const tracker=new FarRegionTracker();for(let i=0;i<10000;i++)assert.equal(tracker.update(48+Math.sin(i)*10,Math.cos(i)*10,i*16),null);
});
test('settled travel updates both coordinates once; reverse travel must cross the hysteresis margin',()=>{
 const tracker=new FarRegionTracker();assert.equal(tracker.update(70,-100,0),null);assert.equal(tracker.update(72,-100,149),null);assert.deepEqual(tracker.update(70,-100,150),{key:'96:-96',x:96,z:-96});
 for(let i=0;i<100;i++)assert.equal(tracker.update(40+Math.sin(i)*8,-96,151+i*16),null);
 assert.equal(tracker.update(30,-96,2000),null);assert.deepEqual(tracker.update(30,-96,2150),{key:'0:-96',x:0,z:-96});
});
test('rapid travel waits for latest region to settle and invalid focus produces no request',()=>{
 const tracker=new FarRegionTracker();for(let i=1;i<100;i++)assert.equal(tracker.update(i*96,i*-96,i*16),null);
 assert.equal(tracker.update(NaN,0,1600),null);assert.deepEqual(tracker.update(99*96,-99*96,99*16+150),{key:'9504:-9504',x:9504,z:-9504});
});
test('regional request covers every direction with fixed, grid-aligned bounds and terrain margin',()=>{
 const a=farRegionRequest({seed:712},{},{x:-96,z:192}),b=farRegionRequest({seed:712},{},{x:96,z:-192});
 for(const r of [a,b]){assert.equal(r.treeBounds.maxX-r.treeBounds.minX,360);assert.equal(r.treeBounds.maxZ-r.treeBounds.minZ,360);assert.equal(r.groundBounds.maxX-r.groundBounds.minX,480);assert.equal(r.groundBounds.maxZ-r.groundBounds.minZ,480);assert.equal(Math.abs(r.groundBounds.minX%4),0);assert.ok(r.groundBounds.minZ<r.treeBounds.minZ);}
 assert.throws(()=>new FarRegionTracker({step:0}),/Invalid/);assert.throws(()=>farRegionRequest({}, {},{x:0,z:0},{groundHalf:100}),/Invalid/);
});

test('failed region can reset to retained centre and retry after settling again',()=>{
 const tracker=new FarRegionTracker({settleMs:0});assert.equal(tracker.update(96,96,0).key,'96:96');tracker.reset(0,0);assert.equal(tracker.update(96,96,1000).key,'96:96');assert.throws(()=>tracker.reset(NaN,0),/Invalid/);
});
