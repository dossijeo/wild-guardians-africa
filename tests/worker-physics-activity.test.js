import test from 'node:test';
import assert from 'node:assert/strict';
import {BakedBeastFallbacks} from '../src/rendering/baked-beast-fallbacks.js';
import {captureWorldMotion} from '../src/simulation/worker-world-motion.js';
import {workerPhysicsActivity} from '../src/simulation/worker-physics-activity.js';

test('real baked fallback entries count as authoritative physics activity',()=>{
 const baked=new BakedBeastFallbacks({},new Map()),physics={manager:{entries:new Map(),baked}};
 assert.equal(workerPhysicsActivity(null),false);assert.equal(workerPhysicsActivity(physics),false);
 baked.entries.set('animal',{});assert.equal(workerPhysicsActivity(physics),true);
 baked.entries.clear();physics.manager.entries.set('animal',{});assert.equal(workerPhysicsActivity(physics),true);
 assert.throws(()=>workerPhysicsActivity({manager:{entries:new Map(),baked:{}}}),/Invalid/);
});

test('a baked fall that begins and ends inside a batch still invalidates the historical interval',()=>{
 const baked=new BakedBeastFallbacks({},new Map()),physics={manager:{entries:new Map(),baked}},game={elapsed:0,workers:[],raid:{animals:[]},structures:[]},revisions={topology:0,chunks:0,terrain:0,payloads:0},capture=captureWorldMotion(game,()=>revisions,()=>workerPhysicsActivity(physics),{spatialNavigation:{segmentClear:()=>true}});
 game.elapsed=.05;baked.entries.set('animal',{});capture.sampleTick();baked.entries.clear();game.elapsed=.1;capture.sampleTick();const result=capture.finish();assert.deepEqual(result.physicsActivity,{samplesComplete:true,observed:true});assert.equal(result.separationEvidence,undefined);
});

test('invalid physics bookkeeping cannot certify a historical interval',()=>{
 const game={elapsed:0,workers:[],raid:{animals:[]},structures:[]},revisions={topology:0,chunks:0,terrain:0,payloads:0},capture=captureWorldMotion(game,()=>revisions,()=>workerPhysicsActivity({manager:{entries:new Map(),baked:{}}}),{spatialNavigation:{segmentClear:()=>true}});
 game.elapsed=.1;capture.sampleTick();const result=capture.finish();assert.deepEqual(result.physicsActivity,{samplesComplete:false,observed:false});assert.equal(result.separationEvidence,undefined);
});
