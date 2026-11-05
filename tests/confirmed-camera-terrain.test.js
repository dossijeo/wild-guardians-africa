import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedCameraTerrain,cameraTerrainHeights,CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';

const chunk=(sequence,revision,height,cx=0)=>({sequence,revision,cx,cz:0,epoch:'epoch-a',heights:new Float32Array(49*49).fill(height)});
test('camera terrain exposes only main-confirmed heights and rejects absent chunks',()=>{
 const view=createConfirmedCameraTerrain();view.ingest(chunk(2,1,3));assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(1);assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(2);assert.equal(view.surface(0,0),3);view.ingest(chunk(3,2,7));assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(3);assert.equal(view.surface(0,0),7);assert.throws(()=>view.surface(500,0),CameraTerrainUnavailable);view.dispose();
});
test('camera terrain copies ownership and rejects stale epochs, revisions and overflow',()=>{
 const view=createConfirmedCameraTerrain({maxPending:1}),first=chunk(1,1,2);view.ingest(first);first.heights.fill(8);assert.throws(()=>view.ingest(chunk(2,2,3)),/capacity/);view.confirm(1);assert.equal(view.surface(0,0),2);assert.throws(()=>view.ingest(chunk(2,1,3)),/revision/);assert.throws(()=>view.ingest({...chunk(2,2,3),epoch:'other'}),/epoch/);assert.throws(()=>view.confirm(0),/confirmation/);view.dispose();
});
test('height-only extraction preserves the confirmed terrain grid',()=>{const positions=new Float32Array(49*49*3);for(let i=0;i<49*49;i++)positions[3*i+1]=i/10;const heights=cameraTerrainHeights({terrain:{positions}});assert.equal(heights.byteLength,49*49*4);for(let i=0;i<heights.length;i++)assert.equal(heights[i],positions[i*3+1]);});
test('different chunks may arrive out of sequence without exposing future terrain',()=>{const view=createConfirmedCameraTerrain();view.ingest(chunk(3,1,7,0));view.ingest(chunk(2,1,4,1));assert.throws(()=>view.ingest(chunk(2,2,9,0)),/revision/);view.confirm(2);assert.equal(view.surface(48,0),4);assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(3);assert.equal(view.surface(0,0),7);view.dispose();});
test('multiple future revisions do not expose an obsolete intermediate chunk',()=>{const view=createConfirmedCameraTerrain();view.ingest(chunk(0,1,1));view.ingest(chunk(2,2,2));view.ingest(chunk(3,3,3));view.confirm(2);assert.throws(()=>view.surface(0,0),CameraTerrainUnavailable);view.confirm(3);assert.equal(view.surface(0,0),3);view.dispose();});
test('resident chunk budget rejects additional distinct chunks',()=>{const view=createConfirmedCameraTerrain({maxChunks:1});view.ingest(chunk(0,1,1));assert.throws(()=>view.ingest(chunk(0,1,2,1)),/chunk capacity/);view.dispose();});
