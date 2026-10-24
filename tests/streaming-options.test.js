import test from 'node:test';
import assert from 'node:assert/strict';
import {streamingOptions} from '../src/rendering/streaming-options.js';
test('adopted streaming defaults apply only to Mangroves',()=>{
 assert(Object.values(streamingOptions('manglares','')).every(Boolean));
 for(const biome of ['sabana','gran-rio','desierto','volcanes','gran-canon'])assert(Object.values(streamingOptions(biome,'')).every(v=>!v));
});
test('explicit QA baseline overrides adopted defaults',()=>{
 assert.deepEqual(streamingOptions('manglares','?waterShoreWorker=0&chunkEviction=single&warmObstruction=0&retainPrograms=0'),{waterBed:true,waterShore:false,batchEviction:false,warmObstruction:false,retainPrograms:false});
 assert.equal(streamingOptions('manglares','?waterBedWorker=0&waterShoreWorker=1').waterShore,false);
});
test('auto follows defaults and independent reuse experiments remain available',()=>{
 assert.deepEqual(streamingOptions('manglares','?chunkEviction=auto&retainPrograms=auto'),streamingOptions('manglares',''));
 const other=streamingOptions('sabana','?chunkEviction=batch&retainPrograms=1&warmObstruction=1&waterBedWorker=1&waterShoreWorker=1');
 assert.deepEqual(other,{waterBed:false,waterShore:false,batchEviction:true,warmObstruction:true,retainPrograms:true});
});
