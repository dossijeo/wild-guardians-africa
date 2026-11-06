import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleCameraTerrain} from '../src/rendering/visible-camera-terrain.js';

test('camera receives only the most recent revision after it becomes visible',()=>{
 const sent=[];let visible=null;const bridge=createVisibleCameraTerrain({residency:{getVisible:()=>visible},send:value=>sent.push(value)}),payload=y=>{const positions=new Float32Array(49*49*3);for(let i=1;i<positions.length;i+=3)positions[i]=y;return {cx:1,cz:-1,terrain:{positions}};};
 bridge.stage(payload(2),1,{epoch:'e',sequence:1});bridge.published('1,-1');assert.equal(sent.length,0);visible={userData:{spatialTerrainRevision:1}};bridge.published('1,-1');assert.equal(sent.length,1);assert.equal(sent[0].heights[0],2);
 bridge.stage(payload(3),2,{epoch:'e',sequence:2});bridge.stage(payload(4),3,{epoch:'e',sequence:3});visible={userData:{spatialTerrainRevision:2}};bridge.published('1,-1');assert.equal(sent.length,1);visible.userData.spatialTerrainRevision=3;bridge.published('1,-1');assert.equal(sent.length,2);assert.equal(sent[1].revision,3);assert.equal(sent[1].heights[0],4);bridge.published('1,-1');assert.equal(sent.length,2);bridge.dispose();
});
test('closing the bridge discards staged terrain and prevents later publication',()=>{let sent=0;const bridge=createVisibleCameraTerrain({residency:{getVisible:()=>({userData:{spatialTerrainRevision:1}})},send:()=>sent++}),payload={cx:0,cz:0,terrain:{positions:new Float32Array(49*49*3)}};bridge.stage(payload,1,{epoch:'e',sequence:1});bridge.dispose();bridge.published('0,0');assert.equal(sent,0);assert.throws(()=>bridge.stage(payload,2,{epoch:'e',sequence:2}),/closed/);});
