import test from 'node:test';
import assert from 'node:assert/strict';
import {FarRegionTracker,nativeFarInitialCenter} from '../tools/experiments/far-region-tracker.js';

test('aligned initial region and settled return select the same sampling center',()=>{
 for(const position of [{x:105,z:18},{x:-105,z:-18},{x:247.5,z:-173.25}]){
  const initial=nativeFarInitialCenter(position,true);
  const tracker=new FarRegionTracker({...initial,settleMs:0});
  assert.equal(tracker.update(position.x,position.z,0),null);
  assert.ok(tracker.update(position.x+192,position.z,1));
  const returned=tracker.update(position.x,position.z,2);
  assert.deepEqual({x:returned.x,z:returned.z},initial);
 }
});
test('legacy exact anchor remains unchanged and input is not mutated',()=>{
 const position={x:105.5,y:20,z:-18.25};
 assert.deepEqual(nativeFarInitialCenter(position),{x:105.5,z:-18.25});
 nativeFarInitialCenter(position,true);
 assert.deepEqual(position,{x:105.5,y:20,z:-18.25});
 assert.throws(()=>nativeFarInitialCenter({x:NaN,z:0}),/Invalid/);
});
