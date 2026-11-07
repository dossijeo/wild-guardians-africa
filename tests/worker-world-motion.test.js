import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWorldMotion} from '../src/simulation/worker-world-motion.js';
import {movePath,pathMotionClock} from '../src/simulation/locomotion.js';
import {gateSwingPolygon} from '../src/world/gate-passages.js';

test('capture emits multi-body evidence without changing state and revokes it across lifecycle changes',()=>{
 const transform=x=>[x,0,0,0,0,0,1,1,1,1],actors=[{id:'a',species:'hyena',status:'entering',x:0,z:0,radius:.5},{id:'b',species:'hyena',status:'entering',x:10,z:0,radius:.5}],game={elapsed:0,workers:[],raid:{animals:actors},structures:[]},revision={topology:0,chunks:0,terrain:0,payloads:0};let active=true,step=1;
 const options={includeHyenaSamples:false,spatialNavigation:{segmentClear:()=>true},readPhysicsPoses:()=>({at:game.elapsed,step,complete:true,poses:actors.map(a=>({actorId:a.id,active:true,root:transform(a.x),model:transform(0),bones:[]})),bounds:actors.map(a=>({actorId:a.id,minX:a.x-1,maxX:a.x+1,minZ:-1,maxZ:1}))})};
 let capture=captureWorldMotion(game,()=>revision,()=>active,options);game.elapsed=.05;step++;capture.sampleTick();const before=JSON.stringify(game),trace=capture.finish();assert.equal(JSON.stringify(game),before);assert.deepEqual(trace.physicalIsolationEvidence,{version:2,actorIds:['a','b'],start:0,end:.05,actors:2});assert.equal(trace.separationEvidence.physicalGateBoundsChecked,true);assert.equal(trace.spatialEvidence.actors,2);
 capture=captureWorldMotion(game,()=>revision,()=>active,options);game.elapsed=.1;step++;active=false;capture.sampleTick();const ended=capture.finish();assert.equal(ended.physicalIsolationEvidence,undefined);assert.equal(ended.physicsPoseSamples.complete,false);
});

test('inactive home/gone bodies retain identity but do not block visual certification inside buildings',()=>{
 const home={id:'home',x:0,z:0,status:'home',radius:.28},gone={id:'gone',x:0,z:0,status:'gone',species:'hyena',radius:.28},walking={id:'a',x:0,z:0,status:'walking',radius:.28,path:[{x:1,z:0}]},game={elapsed:0,workers:[home,walking],raid:{animals:[gone]},structures:[]},revisions={topology:0,chunks:0,terrain:0,payloads:0};let queries=0;
 const capture=captureWorldMotion(game,()=>revisions,()=>false,{spatialNavigation:{segmentClear(){queries++;return true;}}});game.elapsed=.05;movePath(walking,.05,null,pathMotionClock(walking,0,.05,1));capture.sampleTick();const result=capture.finish();
 assert.equal(queries,1);assert.equal(result.actors.length,3);assert.equal(result.spatialEvidence.segments,3);assert.equal(result.separationEvidence.actors,3);
 // A body that emerges during the interval must participate again.
 const next=captureWorldMotion(game,()=>revisions,()=>false,{spatialNavigation:{segmentClear:()=>true}});game.elapsed=.1;home.status='idle';next.sampleTick();assert.equal(next.finish().separationEvidence,undefined);
});

test('observes all animals and workers over one existing movement batch',()=>{
 const animal={id:'a',x:0,z:0,status:'walking',radius:.6,path:[{x:1,z:0}]},worker={id:'w',x:2,z:0,status:'idle',radius:.3},game={elapsed:1,raid:{animals:[animal]},workers:[worker]},revision={topology:1,chunks:1,terrain:1,payloads:1},capture=captureWorldMotion(game,()=>revision);
 game.elapsed=1.5;movePath(animal,.5,null,pathMotionClock(animal,1,1.5,1));capture.checkpoint();const result=capture.finish();
 assert.deepEqual(result.actors.map(actor=>actor.actorId),['a','w']);assert.equal(result.start,1);assert.equal(result.end,1.5);assert.equal(result.spatialEvidence,undefined);assert.equal(result.rosterChanged,false);assert.equal(result.actors[0].segments.length,1);assert.equal(result.actors[0].continuous,true);assert.equal(result.actors[0].timed,true);assert.equal(result.actors[1].segments.length,0);assert.equal(result.terrainChanged,false);assert.throws(()=>capture.finish(),/finished/);
});
test('reports roster, chunk and terrain changes without claiming a safe interval',()=>{
 const actor={id:'a',x:0,z:0,status:'idle'},game={elapsed:2,raid:{animals:[actor]},workers:[]},revision={topology:0,chunks:0,terrain:0,payloads:0},capture=captureWorldMotion(game,()=>revision);game.raid.animals.pop();capture.checkpoint();revision.chunks++;revision.payloads++;game.elapsed=3;const result=capture.finish();assert.equal(result.rosterChanged,true);assert.equal(result.actors[0].continuous,false);assert.equal(result.chunkChanged,true);assert.equal(result.terrainChanged,true);assert.equal(result.topologyChanged,false);
});
test('captures physics activity across ticks and fails closed on invalid samples',()=>{
 const game={elapsed:0,raid:{animals:[]},workers:[]},revision={topology:0,chunks:0,terrain:0,payloads:0};let active=false;
 const capture=captureWorldMotion(game,()=>revision,()=>active);active=true;game.elapsed=1;capture.sampleTick();active=false;game.elapsed=2;capture.sampleTick();assert.deepEqual(capture.finish().physicsActivity,{samplesComplete:true,observed:true});
 const failed=captureWorldMotion(game,()=>revision,()=>{throw Error('unavailable');});assert.deepEqual(failed.finish().physicsActivity,{samplesComplete:false,observed:false});
 const missing=captureWorldMotion(game,()=>revision);assert.deepEqual(missing.finish().physicsActivity,{samplesComplete:false,observed:false});
});
test('spatial evidence is bounded, revision-bound and fails closed on blocked segments',()=>{
 const revisions={topology:0,chunks:0,terrain:0,payloads:0},actor={id:'w',x:0,z:0,status:'walking',radius:.28,path:[{x:1,z:0}]},game={elapsed:0,raid:{animals:[]},workers:[actor]},read=()=>revisions;let clear=true,queries=0;
 const capture=captureWorldMotion(game,read,null,{spatialNavigation:{segmentClear(){queries++;return clear;}}});game.elapsed=1;movePath(actor,1,null,pathMotionClock(actor,0,1,1));const trace=capture.finish();assert.equal(queries,1);assert.deepEqual(trace.spatialEvidence,{version:1,start:0,end:1,revisions:{...revisions},actors:1,segments:1});
 actor.path=[{x:2,z:0}];const blocked=captureWorldMotion(game,read,null,{spatialNavigation:{segmentClear:()=>false}});game.elapsed=2;movePath(actor,1,null,pathMotionClock(actor,1,2,1));assert.equal(blocked.finish().spatialEvidence,undefined);
 actor.path=[{x:3,z:0}];const changed=captureWorldMotion(game,read,null,{spatialNavigation:{segmentClear:()=>true}});game.elapsed=3;movePath(actor,1,null,pathMotionClock(actor,2,3,1));revisions.topology++;assert.equal(changed.finish().spatialEvidence,undefined);
});
test('separation evidence fails closed for a live gate or unknown physics',()=>{
 const revision={topology:0,chunks:0,terrain:0,payloads:0},worker={id:'w',x:0,z:0,status:'walking',radius:.28,path:[{x:1,z:0}]},game={elapsed:0,raid:{animals:[]},workers:[worker],structures:[]},options={spatialNavigation:{segmentClear:()=>true}};
 const capture=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=1;movePath(worker,1,null,pathMotionClock(worker,0,1,1));capture.sampleTick();assert.deepEqual(capture.finish().separationEvidence,{version:2,start:0,end:1,actors:1,gates:'none',existingSeparationChecked:true});
 worker.path=[{x:2,z:0}];game.structures.push({gate:true,status:'intact'});const gated=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=2;movePath(worker,1,null,pathMotionClock(worker,1,2,1));assert.equal(gated.finish().separationEvidence,undefined);
 game.structures=[];worker.path=[{x:3,z:0}];const unknown=captureWorldMotion(game,()=>revision,null,options);game.elapsed=3;movePath(worker,1,null,pathMotionClock(worker,2,3,1));assert.equal(unknown.finish().separationEvidence,undefined);
});
test('a stationary gate does not block certified motion outside its entire swing',()=>{
 const revision={topology:0,chunks:0,terrain:0,payloads:0},gate={gate:true,status:'intact',material:'empalizada',x:100,z:0,yaw:0,gateOpen:0},worker={id:'w',x:0,z:0,status:'walking',radius:.28,path:[{x:1,z:0}]},game={elapsed:0,raid:{animals:[]},workers:[worker],structures:[gate]},capture=captureWorldMotion(game,()=>revision,()=>false,{spatialNavigation:{segmentClear:()=>true}});
 game.elapsed=1;movePath(worker,1,null,pathMotionClock(worker,0,1,1));capture.sampleTick();assert.equal(capture.finish().separationEvidence?.gates,'swing-clear');
});
test('gate sweep proximity and gate geometry changes reject historical certification',()=>{
 const revision={topology:0,chunks:0,terrain:0,payloads:0},gate={gate:true,status:'intact',material:'empalizada',x:0,z:0,yaw:0,gateOpen:0},polygon=gateSwingPolygon(gate),x=polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,z=polygon.reduce((sum,p)=>sum+p.z,0)/polygon.length,worker={id:'w',x,z,status:'idle',radius:.28},game={elapsed:0,raid:{animals:[]},workers:[worker],structures:[gate]},options={spatialNavigation:{segmentClear:()=>true}};
 let capture=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=1;capture.sampleTick();assert.equal(capture.finish().separationEvidence,undefined);
 worker.x=100;capture=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=2;gate.x=1;capture.sampleTick();gate.x=0;assert.equal(capture.finish().separationEvidence,undefined);
 capture=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=3;gate.gateOpen=.5;capture.sampleTick();gate.gateOpen=0;assert.equal(capture.finish().separationEvidence,undefined);
});
