import test from 'node:test';
import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {BeastRagdollSolver} from '../src/simulation/beast-ragdoll.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {beastSkin} from './helpers/beast-skin.js';
await R.init();

for(const phase of ['falling','rolling','kinematic recovery'])test(`in-memory Rapier checkpoint preserves ${phase} with two animals`,()=>{
 const original=new BeastRagdollSolver(R);let restored;
 try{
  original.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});original.box({x:2,y:2,z:0},{x:.2,y:2,z:3});
  const model=beastSkin('hyena'),binding=new BeastRagdollBinding(model),animal=original.add('hyena',{pose:binding.capture(),colliders:binding.colliders(),direction:{x:1,y:0,z:0}}),otherModel=beastSkin('warthog');otherModel.position.x=1;otherModel.updateMatrixWorld(true);const otherBinding=new BeastRagdollBinding(otherModel),other=original.add('warthog',{pose:otherBinding.capture(),colliders:otherBinding.colliders(),direction:{x:-1,y:0,z:0}});
  for(let i=0;i<45;i++)original.step();if(phase==='rolling'){original.rollTo('hyena',{x:0,y:0,z:0,w:1});for(let i=0;i<20;i++)original.step();}
  if(phase==='kinematic recovery')original.makeKinematic('hyena');
  restored=BeastRagdollSolver.restoreCheckpoint(R,structuredClone(original.checkpoint()));const copy=restored.actors.get('hyena');assert.deepEqual([...copy.pose],[...animal.pose]);
  const otherCopy=restored.actors.get('warthog');for(let i=0;i<120;i++){if(phase==='kinematic recovery'){const target=animal.pose.slice();target[1]+=.001;original.follow('hyena',target);restored.follow('hyena',target);}original.step();restored.step();assert.deepEqual([...copy.pose],[...animal.pose],`pose mismatch at ${i}`);assert.deepEqual([...otherCopy.pose],[...other.pose],`peer mismatch at ${i}`);assert.equal(copy.settled,animal.settled);if(phase==='rolling')assert.deepEqual(copy.roll,animal.roll);}
 }finally{original.dispose();restored?.dispose();}
});
test('invalid checkpoint is rejected without changing the original solver',()=>{
 const solver=new BeastRagdollSolver(R);try{const binding=new BeastRagdollBinding(beastSkin('hyena'));solver.add('hyena',{pose:binding.capture(),colliders:binding.colliders()});const checkpoint=solver.checkpoint();checkpoint.actors[0].parts[0].radius=NaN;assert.throws(()=>BeastRagdollSolver.restoreCheckpoint(R,checkpoint),/Invalid checkpoint part/);assert.equal(solver.actors.size,1);solver.step();assert.ok(solver.actors.get('hyena').pose.every(Number.isFinite));}finally{solver.dispose();}
});
