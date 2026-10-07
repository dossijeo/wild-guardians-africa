import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameImageLoader} from '../src/ui/frame-image-loader.js';

function fixture(){
  const created=[];
  const load=createFrameImageLoader({frame_top:{src:'top.webp'},frame_bottom:{src:'bottom.webp'},coin:{src:'coin.webp'}},
    {createImage:()=>{const image={};created.push(image);return image;}});
  return {created,load};
}
test('concurrent and later panel openings retain the same loaded frame objects',async()=>{
  const {created,load}=fixture(),first=load(),second=load();
  assert.equal(first,second);assert.equal(created.length,2);
  for(const image of created)image.onload();
  const result=await first;
  assert.equal(result.frame_top,created[0]);assert.equal(result.frame_bottom,created[1]);
  assert.equal(await load(),result);assert.equal(created.length,2);
  assert.equal(created[0].onload,null);assert.equal(created[1].onerror,null);
});
test('failed frames can retry without recreating successful frames',async()=>{
  const {created,load}=fixture(),first=load();
  created[0].onload();created[1].onerror();
  await assert.rejects(first,/bottom.webp/);
  const retry=load();assert.equal(created.length,3);assert.equal(created[2].src,'bottom.webp');
  created[2].onload();const result=await retry;
  assert.equal(result.frame_top,created[0]);assert.equal(result.frame_bottom,created[2]);
});
