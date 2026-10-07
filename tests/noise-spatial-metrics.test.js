import test from 'node:test';
import assert from 'node:assert/strict';
import {noiseSpatialPoses,compareNoisePixels} from './browser/noise-spatial-metrics.js';

test('review path crosses negative coordinates, world origin and multiple short/long pigment periods',()=>{
  const state={structures:[{kind:'center',x:241,z:99}],villages:[]},before=JSON.stringify(state),poses=noiseSpatialPoses(state);
  assert.equal(poses.length,20);assert.equal(JSON.stringify(state),before);
  assert.ok(poses.some(pose=>pose.x===0&&pose.z===0));
  assert.ok(poses.filter(pose=>pose.kind==='terrain').every(pose=>pose.x*.4===pose.z));
  assert.ok(poses[0].x< -64/.85&&poses[16].x>64/.85);
  assert.equal(poses.at(-1).x,271);assert.equal(poses.at(-1).z,110);
});

test('localized errors and partial edge tiles cannot be diluted by the full image denominator',()=>{
  const a=new Uint8Array(17*17*4),b=a.slice(),i=(16*17+16)*4;b.set([255,255,255,0],i);
  const result=compareNoisePixels(a,b,17,17);
  assert.equal(result.differentPixels,1);assert.equal(result.rgbMae,1/289);
  assert.equal(result.maxTileMae,1);assert.deepEqual(result.maxTile,[16,16,1,1]);
  assert.deepEqual(result.bounds,[16,16,16,16]);assert.equal(result.maxError,255);
});

test('alpha-only changes stay separate from RGB appearance and unchanged controls are exactly zero',()=>{
  const a=new Uint8Array(4*4*4),b=a.slice();b[3]=255;
  const changed=compareNoisePixels(a,b,4,4);
  assert.equal(changed.alphaDifferences,1);assert.equal(changed.differentPixels,0);assert.equal(changed.bounds,null);
  const same=compareNoisePixels(a,a,4,4);assert.equal(same.rgbMae,0);assert.equal(same.maxTileMae,0);assert.equal(same.maxTile,null);
  assert.throws(()=>compareNoisePixels(a,b,5,4),/dimensions/);
});
