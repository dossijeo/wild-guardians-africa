import test from 'node:test';
import assert from 'node:assert/strict';
import {contactQuantile} from '../src/rendering/contact-quantile.js';
test('contact quantiles match numeric sort for ordered, tied and varied skin coordinates',()=>{
 let seed=42;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const size of [1,2,8,96,1001,12000]){
  const cases=[Array(size).fill(.25),Array.from({length:size},(_,i)=>i),Array.from({length:size},(_,i)=>-i),Array.from({length:size},()=>Math.floor(random()*17)),Array.from({length:size},()=>random()*20-10)];
  for(const values of cases){const sorted=values.slice().sort((a,b)=>a-b);for(const fraction of [0,.02,.5,.96,.98,1])assert.equal(contactQuantile(values.slice(),fraction),sorted[Math.floor((size-1)*fraction)]);}
 }
});
