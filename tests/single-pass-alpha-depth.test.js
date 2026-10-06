import test from 'node:test';
import assert from 'node:assert/strict';
import {SinglePassAlphaDepth} from './browser/single-pass-alpha-depth.js';
test('single-pass QA adapter forwards once without touching scene traversal and restores the prior flag',()=>{
 const scene={traverseVisible(){throw Error('Extra traversal');}},camera={};let calls=0;
 const pass={stockAlphaDepth:false,captureDepth(c,s){assert.equal(this,pass);assert.equal(c,camera);assert.equal(s,scene);calls++;this.depthCaptureStats={stockAlphaSpecialized:this.stockAlphaDepth?7:0};return 42;}},original=pass.captureDepth,probe=new SinglePassAlphaDepth(pass);
 probe.setEnabled(false);assert.equal(pass.captureDepth(camera,scene),42);assert.equal(probe.applications,0);
 probe.setEnabled(true);assert.equal(pass.captureDepth(camera,scene),42);assert.equal(calls,2);assert.equal(probe.applications,7);
 probe.dispose();assert.equal(pass.captureDepth,original);assert.equal(pass.stockAlphaDepth,false);
});
test('capture failure propagates and disposal restores an absent flag without replacing a later hook',()=>{
 const pass={captureDepth(){throw Error('capture failed');}},probe=new SinglePassAlphaDepth(pass);probe.setEnabled(true);
 assert.throws(()=>pass.captureDepth(),/capture failed/);assert.equal(probe.applications,0);
 const newer=()=>{};pass.captureDepth=newer;probe.dispose();assert.equal(pass.captureDepth,newer);assert.equal(Object.hasOwn(pass,'stockAlphaDepth'),false);
});
