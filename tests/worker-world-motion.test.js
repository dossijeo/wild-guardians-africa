import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWorldMotion} from '../src/simulation/worker-world-motion.js';
import {movePath,pathMotionClock} from '../src/simulation/locomotion.js';

test('observes all animals and workers over one existing movement batch',()=>{
 const animal={id:'a',x:0,z:0,status:'walking',radius:.6,path:[{x:1,z:0}]},worker={id:'w',x:2,z:0,status:'idle',radius:.3},game={elapsed:1,raid:{animals:[animal]},workers:[worker]},revision={topology:1,chunks:1,terrain:1,payloads:1},capture=captureWorldMotion(game,()=>revision);
 game.elapsed=1.5;movePath(animal,.5,null,pathMotionClock(animal,1,1.5,1));capture.checkpoint();const result=capture.finish();
 assert.deepEqual(result.actors.map(actor=>actor.actorId),['a','w']);assert.equal(result.start,1);assert.equal(result.end,1.5);assert.equal(result.rosterChanged,false);assert.equal(result.actors[0].segments.length,1);assert.equal(result.actors[0].continuous,true);assert.equal(result.actors[0].timed,true);assert.equal(result.actors[1].segments.length,0);assert.equal(result.terrainChanged,false);assert.throws(()=>capture.finish(),/finished/);
});
test('reports roster, chunk and terrain changes without claiming a safe interval',()=>{
 const actor={id:'a',x:0,z:0,status:'idle'},game={elapsed:2,raid:{animals:[actor]},workers:[]},revision={topology:0,chunks:0,terrain:0,payloads:0},capture=captureWorldMotion(game,()=>revision);game.raid.animals.pop();capture.checkpoint();revision.chunks++;revision.payloads++;game.elapsed=3;const result=capture.finish();assert.equal(result.rosterChanged,true);assert.equal(result.actors[0].continuous,false);assert.equal(result.chunkChanged,true);assert.equal(result.terrainChanged,true);assert.equal(result.topologyChanged,false);
});
