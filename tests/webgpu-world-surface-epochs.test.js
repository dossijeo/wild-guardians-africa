import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCoordinatedChunkInstances,createChunkPublicationEpochs} from '../src/rendering/webgpu-world-surface.js';

test('wire and legacy checkpoint publication identities use disjoint namespaces',()=>{
 const epochs=createChunkPublicationEpochs(),first=epochs.checkpoint(),second=epochs.checkpoint();
 assert.notEqual(first,second);
 for(const epoch of [null,'checkpoint:1','wire:null','session:1',''])assert.notEqual(epochs.live(epoch),first);
 assert.equal(epochs.live('session:1'),epochs.live('session:1'));
 assert.notEqual(epochs.live(null),epochs.live('null'));
 assert.equal(epochs.order(),1);assert.equal(epochs.order(),2);
});
test('coordinated chunk rejects missing or malformed biome data before terrain publication',()=>{
 assert.throws(()=>assertCoordinatedChunkInstances({}),/biome instances/);assert.throws(()=>assertCoordinatedChunkInstances({instances:[[]]}),/biome instances/);
 const instances=Array.from({length:20},()=>[]),tree={slot:0,id:'tree',x:1,y:2,z:3,yaw:0,sx:1,sy:1,sz:1};instances[0].push(tree);assert.doesNotThrow(()=>assertCoordinatedChunkInstances({instances}));
 for(const bad of [{...tree,slot:1},{...tree,y:NaN},{...tree,sx:Infinity},{...tree,id:null},{}]){instances[0][0]=bad;assert.throws(()=>assertCoordinatedChunkInstances({instances}),/biome instances/);}
});
