import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMudEdgeSteps} from '../src/rendering/mangrove-mud-edge-data.js';
const attr=values=>({count:values.length/3,getX:i=>values[i*3],getZ:i=>values[i*3+2],getComponent:(i,k)=>values[i*3+k]});
test('pure edge data interpolates both terrain triangles and reuses duplicate vertices',()=>{
 const input={gp:attr([0,0,0,1,0,0,0,0,1,1,0,1]),gc:attr([0,0,0,1,0,0,0,1,0,1,1,0]),gn:attr([0,1,0,1,1,0,0,1,1,1,1,1]),p:attr([.25,0,.25,.75,0,.75,.25,0,.25]),origin:[48,-48],outlines:[[[48,-48],[49,-48],[49,-47],[48,-47]]]};
 const steps=computeMudEdgeSteps(input);let step;do{step=steps.next();}while(!step.done);const r=step.value;
 assert.deepEqual(r.colors,new Float32Array([.25,.25,0,.75,.75,0,.25,.25,0]));
 assert.deepEqual(r.normals,new Float32Array([.25,1,.25,.75,1,.75,.25,1,.25]));
 assert.deepEqual(r.edges,new Float32Array([.25,.25,.25]));assert.equal(r.cacheHits,1);assert.equal(r.uniqueVertices,2);
});
