import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCoordinatedChunkInstances,createChunkPublicationEpochs} from '../src/rendering/webgpu-world-surface.js';

test('wire and legacy checkpoint publication identities use disjoint namespaces',()=>{
 const epochs=createChunkPublicationEpochs(),first=epochs.checkpoint(),second=epochs.checkpoint();
 assert.notEqual(first,second);
 for(const epoch of [null,'checkpoint:1','wire:null','session:1',''])assert.notEqual(epochs.live(epoch),first);
 assert.equal(epochs.live('session:1'),epochs.live('session:1'));
 assert.notEqual(epochs.live(null),epochs.live('null'));
});
test('coordinated chunk rejects missing or malformed biome data before terrain publication',()=>{
 assert.throws(()=>assertCoordinatedChunkInstances({}),/biome instances/);assert.throws(()=>assertCoordinatedChunkInstances({instances:[[]]}),/biome instances/);
 const instances=Array.from({length:20},()=>[]);instances[0].push({id:'tree'});assert.doesNotThrow(()=>assertCoordinatedChunkInstances({instances}));instances[0].push({});assert.throws(()=>assertCoordinatedChunkInstances({instances}),/biome instances/);
});
