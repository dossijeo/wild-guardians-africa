import test from 'node:test';import assert from 'node:assert/strict';
import {colliderSupportSearch} from '../src/rendering/collider-support-search.js';
test('bounded support search equals exhaustive vertex choices with ties and mixed signs',()=>{
 let seed=61;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const directions=Array.from({length:96},()=>({x:random()*2-1,y:random()*2-1,z:random()*2-1}));directions.push({x:0,y:0,z:0});
 for(const n of [8,32,33,100,10000])for(const tied of [false,true]){
  const points=Array.from({length:n},()=>({x:tied?1:random()*20-10,y:tied?1:random()*20-10,z:tied?1:random()*20-10}));
  const expected=directions.map(d=>{let best=-Infinity,winner=0;for(let i=0;i<n;i++){const p=points[i],dot=p.x*d.x+p.y*d.y+p.z*d.z;if(dot>best){best=dot;winner=i;}}return winner;});
  assert.deepEqual(colliderSupportSearch(points,directions),expected);
 }
});
