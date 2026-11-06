import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWorldMotion} from '../src/simulation/worker-world-motion.js';
import {movePath,pathMotionClock} from '../src/simulation/locomotion.js';

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
 const capture=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=1;movePath(worker,1,null,pathMotionClock(worker,0,1,1));capture.sampleTick();assert.deepEqual(capture.finish().separationEvidence,{version:1,start:0,end:1,actors:1,gates:'none'});
 worker.path=[{x:2,z:0}];game.structures.push({gate:true,status:'intact'});const gated=captureWorldMotion(game,()=>revision,()=>false,options);game.elapsed=2;movePath(worker,1,null,pathMotionClock(worker,1,2,1));assert.equal(gated.finish().separationEvidence,undefined);
 game.structures=[];worker.path=[{x:3,z:0}];const unknown=captureWorldMotion(game,()=>revision,null,options);game.elapsed=3;movePath(worker,1,null,pathMotionClock(worker,2,3,1));assert.equal(unknown.finish().separationEvidence,undefined);
});
