import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';
import {workerPresentationGround} from '../src/app/worker-presentation-ground.js';

test('a minimal Worker world exposes only confirmed visual heights',()=>{
 let field=null;const owner={cameraField:()=>field};assert.equal(workerPresentationGround(owner,4,7),null);field={surface:(x,z)=>x+z};assert.equal(workerPresentationGround(owner,4,7),11);field={surface:()=>NaN};assert.equal(workerPresentationGround(owner,4,7),null);
});
test('missing confirmed terrain hides a visual effect while unexpected failures are not swallowed',()=>{
 const owner={cameraField:()=>({surface:(x,z)=>{throw new CameraTerrainUnavailable(x,z);}})};assert.equal(workerPresentationGround(owner,1,2),null);owner.cameraField=()=>({surface:()=>{throw Error('unexpected terrain failure');}});assert.throws(()=>workerPresentationGround(owner,1,2),/unexpected terrain failure/);
});
