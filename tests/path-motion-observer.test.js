import test from 'node:test';
import assert from 'node:assert/strict';
import {movePath,observePathMotion} from '../src/simulation/locomotion.js';

test('observes each actually traversed segment, including turns but not blocked steps',()=>{
 const actor={x:0,z:0,path:[{x:1,z:0},{x:1,z:2}]},segments=[];
 const stop=observePathMotion(actor,(x,z,toX,toZ)=>segments.push({x,z,toX,toZ}));
 assert.equal(movePath(actor,2,(_,end)=>end.z<1.5),2);
 assert.deepEqual(segments,[{x:0,z:0,toX:1,toZ:0},{x:1,z:0,toX:1,toZ:1}]);
 assert.equal(movePath(actor,1,()=>false),0);assert.equal(segments.length,2);
 stop();stop();assert.equal(movePath(actor,1),1);assert.equal(segments.length,2);
});

test('observer registration does not alter actor state or movement',()=>{
 const a={x:0,z:0,path:[{x:.3,z:.4},{x:.7,z:.4}]},b=structuredClone(a),observed=[];
 const stop=observePathMotion(a,(...segment)=>observed.push(segment));assert.throws(()=>observePathMotion(a,()=>{}));
 assert.equal(movePath(a,.65),movePath(b,.65));stop();assert.deepEqual(a,b);assert.equal(observed.length,2);
});
