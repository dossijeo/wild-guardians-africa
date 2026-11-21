import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCropFrameTracker} from '../src/rendering/webgpu-crop-frame-tracker.js';

test('crop frame requires the main camera draw and follows confirmed identity',()=>{
 const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix();
 const other=camera.clone(),tracker=createCropFrameTracker(camera),sprout={id:'provisional-c1',x:0,y:0,z:0};tracker.watch('c1');tracker.beginFrame();tracker.drawn(camera,[sprout]);assert.equal(tracker.rendered('c1'),false);tracker.startMainDraw();assert.equal(tracker.rendered('c1'),false);tracker.drawn(other,[sprout]);assert.equal(tracker.rendered('c1'),false);tracker.drawn(camera,[{...sprout,x:100}]);assert.equal(tracker.rendered('c1'),false);tracker.drawn(camera,[sprout]);assert.equal(tracker.rendered('c1'),true);tracker.beginFrame();assert.equal(tracker.rendered('c1'),false);tracker.startMainDraw();tracker.target('c1','plant1');tracker.drawn(camera,[{...sprout,id:'plant1'}]);assert.equal(tracker.rendered('c1'),true);tracker.destroyed('plant1');assert.equal(tracker.has('c1'),false);assert.equal(tracker.rendered('c1'),false);
});
test('crop frame acknowledgement is isolated by command ID',()=>{
 const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.z=5;camera.updateMatrixWorld();camera.updateProjectionMatrix();const tracker=createCropFrameTracker(camera);tracker.watch('one');tracker.watch('two');tracker.startMainDraw();tracker.drawn(camera,[{id:'provisional-one',x:0,y:0,z:0}]);tracker.forget('one');assert.equal(tracker.has('one'),false);assert.equal(tracker.has('two'),true);assert.equal(tracker.rendered('two'),false);
});
