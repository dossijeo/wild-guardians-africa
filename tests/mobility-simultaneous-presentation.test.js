import test from 'node:test';
import assert from 'node:assert/strict';
import {actorSegmentClear} from '../src/simulation/actor-motion.js';
import {movePath} from '../src/simulation/locomotion.js';

test('sequentially safe simulation steps can collide if presented simultaneously',()=>{
 const a={id:'a',x:-1,z:0,radius:.2,path:[{x:1,z:0}]};
 const b={id:'b',x:0,z:-1,radius:.2,path:[{x:0,z:1}]};
 const startA={x:a.x,z:a.z},startB={x:b.x,z:b.z};
 assert.equal(movePath(a,2,(from,to)=>actorSegmentClear(from,to,a,[b])),2);
 assert.equal(movePath(b,2,(from,to)=>actorSegmentClear(from,to,b,[a])),2);
 assert.equal(a.x,1);assert.equal(b.z,1);
 const middleA={x:(startA.x+a.x)/2,z:(startA.z+a.z)/2};
 const middleB={x:(startB.x+b.x)/2,z:(startB.z+b.z)/2};
 assert.ok(Math.hypot(middleA.x-middleB.x,middleA.z-middleB.z)<a.radius+b.radius);
});
