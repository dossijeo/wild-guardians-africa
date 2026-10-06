import test from 'node:test';
import assert from 'node:assert/strict';
import {captureDepthSubmissionState,compareDepthSubmissionState} from './browser/depth-submission-state.js';
test('depth observation retains the original callback and restores it on failure',()=>{
 let draws=0;const original=function(){draws++;assert.equal(this,renderer);return 17;},renderer={renderBufferDirect:original,getRenderTarget:()=>null};
 const world={renderer,destructionPass:{smokeDepth:{}}};
 assert.deepEqual(captureDepthSubmissionState(world,()=>assert.equal(renderer.renderBufferDirect(),17)),[]);
 assert.equal(draws,1);assert.equal(renderer.renderBufferDirect,original);
 assert.throws(()=>captureDepthSubmissionState(world,()=>{renderer.renderBufferDirect();throw Error('GPU failure');}),/GPU failure/);assert.equal(renderer.renderBufferDirect,original);
});
test('comparison distinguishes draw order, buffers and transforms while reporting bounded differences',()=>{
 const a=[{object:'a',instances:[2,3],matrix:[1,2]},{object:'b',instances:[1,0],matrix:[3,4]}];
 assert.equal(compareDepthSubmissionState(a,structuredClone(a)).same,true);
 const b=structuredClone(a);b[0].instances[1]++;b[1].matrix[0]++;
 assert.deepEqual(compareDepthSubmissionState(a,b).firstDifferences.map(d=>d.changed),[['instances'],['matrix']]);
 assert.equal(compareDepthSubmissionState(a,[a[1],a[0]]).same,false);assert.equal(compareDepthSubmissionState(a,a.slice(1)).same,false);
 assert.equal(compareDepthSubmissionState(Array(12).fill({object:'a'}),Array(12).fill({object:'b'})).firstDifferences.length,8);
});
