import test from 'node:test';import assert from 'node:assert/strict';
import {nativeTreePresence} from '../tools/experiments/native-tree-presence.js';
function group(ids){return {userData:{lodBatches:[{instances:ids.map(id=>({id}))}]}};}
test('physical index is shared across species and stable while camera and LOD change',()=>{
 const g=group(['a','b']),world={chunks:new Map([['0',g]]),chunkRevision:0};const first=nativeTreePresence(world);
 g.visible=false;g.userData.lodBatches[0].orders=[[],[]];assert.equal(nativeTreePresence(world),first);assert.deepEqual([...first],['a','b']);
 world.chunks.delete('0');world.chunkRevision++;const missing=nativeTreePresence(world);assert.notEqual(missing,first);assert.equal(missing.size,0);
 world.chunks.set('1',group(['a']));world.chunkRevision++;assert.deepEqual([...nativeTreePresence(world)],['a']);
});
test('replacement chunk map and callers without discrete revision rebuild physical presence',()=>{
 const world={chunks:new Map([['0',group(['a'])]]),chunkRevision:1};const first=nativeTreePresence(world);world.chunks=new Map([['0',group(['b'])]]);assert.deepEqual([...nativeTreePresence(world)],['b']);assert.notEqual(nativeTreePresence(world),first);
 delete world.chunkRevision;world.chunks.clear();assert.equal(nativeTreePresence(world).size,0);world.chunks.set('1',group(['c']));assert.deepEqual([...nativeTreePresence(world)],['c']);
});
