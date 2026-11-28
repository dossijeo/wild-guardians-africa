import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Matrix4} from 'three';
import {VfxDepthDemand} from '../src/rendering/vfx-depth-demand.js';
test('depth demand follows softness and conservative billboard visibility',()=>{
 const camera=new PerspectiveCamera(60,1,.1,100),demand=new VfxDepthDemand(),data=new Float32Array(25);
 data.set([0,0,-5,1,1]);
 assert.equal(demand.required(data,1,camera.projectionMatrix),false);
 data[21]=1;assert.equal(demand.required(data,1,camera.projectionMatrix),true);
 data[0]=100;assert.equal(demand.required(data,1,camera.projectionMatrix),false);
 data[0]=3;data[3]=2;assert.equal(demand.required(data,1,camera.projectionMatrix),true,'edge-overlapping rotated sprite must retain depth');
 data[0]=0;data[2]=5;assert.equal(demand.required(data,1,camera.projectionMatrix),false);
 const localClip=camera.projectionMatrix.clone().multiply(new Matrix4().makeTranslation(0,0,-10));
 assert.equal(demand.required(data,1,localClip),true,'local/world transform must be respected');
 assert.equal(demand.required(data,0,localClip),false);
});
