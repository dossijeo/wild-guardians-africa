import test from 'node:test';
import assert from 'node:assert/strict';
import {ProvisionalCrops} from '../src/rendering/provisional-crops.js';

test('provisional crop is presentation only, reconciles smoothly and disappears on rejection',()=>{
 let now=0;const previews=new ProvisionalCrops({now:()=>now}),actual=[];
 previews.begin('one','mijo',2,3);
 assert.equal(actual.length,0);assert.deepEqual(previews.visible(actual).map(p=>[p.x,p.z]),[[2,3]]);
 const crop={id:'plant-1',species:'mijo',alive:true,growth:0,x:3,z:5};actual.push(crop);previews.confirm('one',crop.id);
 assert.deepEqual(previews.visible(actual).map(p=>[p.x,p.z]),[[2,3]]);
 now=100;assert.deepEqual(previews.visible(actual).map(p=>[p.x,p.z]),[[2.5,4]]);assert.deepEqual([crop.x,crop.z],[3,5]);
 now=200;assert.equal(previews.visible(actual)[0],crop);assert.equal(previews.entries.size,0);
 previews.begin('two','mijo',4,5);previews.reject('two');assert.deepEqual(previews.visible(actual),actual);
});
