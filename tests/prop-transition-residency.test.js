import test from 'node:test';import assert from 'node:assert/strict';
import {chunkInPropTransition} from '../src/rendering/prop-transition-residency.js';
test('transition residency retains the real canyon edge chunk after square radius drops it',()=>{
 // Native trace: tree z=-121.056 in chunk(-1,-3), camera z~-69.164.
 assert.equal(chunkInPropTransition([-48,-144],{x:-47.8028,z:-69.164},68),true);
 assert.equal(chunkInPropTransition([-48,-192],{x:-47.8028,z:-69.164},68),false);
});
test('all chunk-owned anchors in the handoff circle remain resident across cell borders and negative coordinates',()=>{
 for(const eye of [{x:23.99,z:23.99},{x:24.01,z:-24.01},{x:-71.99,z:-72.01}])for(let cz=-4;cz<=4;cz++)for(let cx=-4;cx<=4;cx++)for(const ox of [-23.99,0,23.99])for(const oz of [-23.99,0,23.99]){
  const x=cx*48+ox,z=cz*48+oz;if(Math.hypot(x-eye.x,z-eye.z)<=60)assert.equal(chunkInPropTransition([cx*48,cz*48],eye,68),true);
 }
});
