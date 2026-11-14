import test from 'node:test';
import assert from 'node:assert/strict';
import {movePath,moveWorker,observePathMotion,pathMotionClock} from '../src/simulation/locomotion.js';
import {LOCOMOTION} from '../src/simulation/locomotion-calibration.js';

test('observes each actually traversed segment, including turns but not blocked steps',()=>{
 const actor={x:0,z:0,path:[{x:1,z:0},{x:1,z:2}]},segments=[];
 const stop=observePathMotion(actor,(x,z,toX,toZ)=>segments.push({x,z,toX,toZ}));
 assert.equal(movePath(actor,2,(_,end)=>end.z<1.5),2);
 assert.deepEqual(segments,[{x:0,z:0,toX:1,toZ:0},{x:1,z:0,toX:1,toZ:1}]);
 assert.equal(movePath(actor,1,()=>false),0);assert.equal(segments.length,2);
 stop();stop();assert.equal(movePath(actor,1),1);assert.equal(segments.length,2);
});

test('observer registration does not alter actor state or movement',()=>{
 const a={x:0,z:0,path:[{x:.3,z:.4},{x:.7,z:.4}]},b=structuredClone(a),observed=[];
 const stop=observePathMotion(a,(...segment)=>observed.push(segment));assert.throws(()=>observePathMotion(a,()=>{}));
 assert.equal(movePath(a,.65),movePath(b,.65));stop();assert.deepEqual(a,b);assert.equal(observed.length,2);
});
test('timed segments retain turns, running-to-walking transitions and idle remainder',()=>{
 const actor={x:0,z:0,path:[{x:.4,z:0},{x:.4,z:2}],runRemaining:.8},segments=[],stop=observePathMotion(actor,(x0,z0,x1,z1,t0,t1)=>segments.push({x0,z0,x1,z1,t0,t1}));
 const clock=pathMotionClock(actor,10,11,1);moveWorker(actor,1,{urgent:true,clock});stop();
 assert.equal(segments.length,3);assert.equal(segments[0].t0,10);assert.ok(Math.abs(segments[1].t1-(10+.8/(LOCOMOTION.runMetresPerSecond*1.5)))<1e-9);assert.equal(segments[2].t0,segments[1].t1);assert.ok(Math.abs(segments[2].t1-11)<1e-9);
 const short={x:0,z:0,path:[{x:.1,z:0}],runRemaining:0},one=[],end=observePathMotion(short,(...args)=>one.push(args));moveWorker(short,1,{clock:pathMotionClock(short,20,21,1)});end();assert.ok(one[0][5]<21,'unused tick time remains stationary');
});
