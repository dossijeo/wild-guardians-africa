import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMotionPeers} from '../src/simulation/worker-motion-peers.js';
import {movePath,pathMotionClock} from '../src/simulation/locomotion.js';

test('captures synchronized peers and reports unobserved displacement',()=>{
 const target={id:'a',x:0,z:0,status:'walking'},moving={id:'b',x:3,z:0,status:'walking',path:[{x:4,z:0}],radius:.5},still={id:'c',x:5,z:0,status:'idle'},game={elapsed:1,raid:{animals:[target,moving]},workers:[still]};
 const capture=captureMotionPeers(game,target);game.elapsed=1.5;movePath(moving,.5,null,pathMotionClock(moving,1,1.5,1));still.z=1;const result=capture.finish();
 assert.equal(result.rosterChanged,false);assert.equal(result.peers.length,2);assert.equal(result.peers[0].continuous,true);assert.equal(result.peers[0].timed,true);assert.equal(result.peers[0].segments[0].t1,1.5);assert.equal(result.peers[1].continuous,false);assert.equal(result.peers[1].segments.length,0);
});
test('marks a changed roster and releases its observers',()=>{
 const target={id:'a',x:0,z:0,status:'walking'},peer={id:'b',x:1,z:0,status:'idle'},game={elapsed:1,raid:{animals:[target,peer]},workers:[]};
 const capture=captureMotionPeers(game,target);game.raid.animals.pop();game.workers.push({id:'c',x:3,z:0,status:'idle'});game.elapsed=2;const result=capture.finish();assert.equal(result.rosterChanged,true);assert.equal(result.peers[0].continuous,false);
 const again=captureMotionPeers({elapsed:2,raid:{animals:[target,peer]},workers:[]},target);again.finish();
});
test('retains a roster change seen between batch steps even if restored',()=>{
 const target={id:'a',x:0,z:0,status:'walking'},peer={id:'b',x:1,z:0,status:'idle'},game={elapsed:1,raid:{animals:[target,peer]},workers:[]};
 const capture=captureMotionPeers(game,target);game.workers.push({id:'c',x:2,z:0,status:'idle'});capture.checkpoint();game.workers.pop();game.elapsed=2;
 const result=capture.finish();assert.equal(result.rosterChanged,true);assert.equal(result.peers[0].continuous,true);
});
