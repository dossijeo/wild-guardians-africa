import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePhysicsCheckpoint,decodePhysicsCheckpoint} from '../src/simulation/physics-checkpoint-codec.js';

test('checkpoint JSON preserves binary bytes, infinities and negative zero',()=>{
 const source={version:1,fall:{solver:{world:new Uint8Array([0,1,127,128,254,255])},values:[Infinity,-Infinity,-0,1.25]}};
 const decoded=decodePhysicsCheckpoint(encodePhysicsCheckpoint(source));assert.deepEqual(decoded,source);assert.notEqual(decoded.fall.solver.world,source.fall.solver.world);
});
test('checkpoint codec rejects invalid tags, bytes and non-finite corruption',()=>{
 assert.throws(()=>encodePhysicsCheckpoint({version:1,fall:{bad:NaN}}),/Invalid checkpoint number/);
 assert.throws(()=>decodePhysicsCheckpoint('{"version":1,"fall":{"solver":{"world":{"__wildPhysicsValue":"bytes","value":"%%%"}}}}'),/Invalid checkpoint bytes/);
 assert.throws(()=>decodePhysicsCheckpoint('{"version":1,"fall":{"__wildPhysicsValue":"mystery"}}'),/Invalid checkpoint value/);
});
