import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialChunkRetention} from '../src/world/wild-engine/spatial-chunk-retention.js';
import {createSpatialChunkStream} from '../src/world/wild-engine/spatial-chunk-stream.js';

function fixture(){
  const resident=new Set(['0,0','1,0','2,0']),loaded=new Map(),desired=new Map(),removed=[];
  const core={removeChunk(x,z){const key=`${x},${z}`;removed.push(key);return Number(resident.delete(key));},
    removeChunks(coordinates){return coordinates.reduce((n,[x,z])=>n+this.removeChunk(x,z),0);}};
  return {resident,loaded,desired,removed,retention:createSpatialChunkRetention(core,{loaded:()=>loaded,desired:()=>desired})};
}
test('native retention leaves graphical ownership empty and releases when demand ends',()=>{
  const f=fixture();f.retention.setDemand(['1,0']);
  assert.equal(f.retention.releaseChunk(1,0),0);
  assert.equal(f.loaded.size,0);assert(f.resident.has('1,0'));
  assert.deepEqual([...f.retention.keys()],['1,0']);
  assert.equal(f.retention.setDemand([]),1);
  assert(!f.resident.has('1,0'));assert.deepEqual(f.retention.summary(),{demand:0,retained:0});
});
test('batch eviction respects native demand and does not duplicate release',()=>{
  const f=fixture();f.retention.setDemand(['1,0']);
  assert.equal(f.retention.releaseChunks([[0,0],[1,0],[2,0]]),2);
  f.retention.releaseChunk(1,0);f.retention.setDemand([]);f.retention.setDemand([]);
  assert.deepEqual(f.removed,['0,0','2,0','1,0']);
});
test('returning graphical demand or installed chunks prevent premature release',()=>{
  for(const owner of ['loaded','desired']){
    const f=fixture();f.retention.setDemand(['1,0']);f.retention.releaseChunk(1,0);
    f[owner].set('1,0',{});f.retention.setDemand([]);
    assert(f.resident.has('1,0'));assert.equal(f.retention.summary().retained,0);
    f[owner].clear();assert.equal(f.retention.releaseChunk(1,0),1);
  }
});
test('retention does not generate absent chunks, and validates demand transactionally',()=>{
  const f=fixture();f.retention.setDemand(['1,0','99,99']);
  assert(!f.resident.has('99,99'));
  assert.throws(()=>f.retention.setDemand(['NaN,0']),TypeError);
  assert.throws(()=>f.retention.setDemand(['2147483648,0']),TypeError);
  assert.throws(()=>f.retention.setDemand(['01,0']),TypeError);
  assert.throws(()=>f.retention.releaseChunks([[1,0],[NaN,0]]),TypeError);
  assert.deepEqual(f.retention.summary(),{demand:2,retained:0});
  assert.equal(f.retention.releaseChunk(1,0),0);
});
test('stream eviction and obsolete payload cleanup share the same native owner',()=>{
  const f=fixture(),discarded=[];
  const core={currentChunk:()=>({cx:0,cz:0}),
    removeChunk(x,z){const key=`${x},${z}`;f.removed.push(key);return Number(f.resident.delete(key));},
    removeChunks(coords){return coords.reduce((n,[x,z])=>n+this.removeChunk(x,z),0);}};
  const stream=createSpatialChunkStream(core,{loaded:()=>f.loaded,onData:()=>{},discardData:d=>discarded.push(d)});
  stream.retention.setDemand(['1,0']);stream.releaseChunk(1,0);
  stream.discardData({cx:1,cz:0});
  assert(f.resident.has('1,0'));assert.equal(discarded.length,1);
  stream.discardData({cx:2,cz:0});assert(!f.resident.has('2,0'));
  stream.dispose();stream.dispose();
  assert.deepEqual(f.removed,['2,0','1,0']);assert.equal(stream.retention.summary().retained,0);
});
test('dispose releases native-only leases once and leaves graphic owners intact',()=>{
  const f=fixture();f.retention.setDemand(['0,0','1,0']);f.retention.releaseChunks([[0,0],[1,0]]);
  f.loaded.set('0,0',{});f.retention.dispose();f.retention.dispose();
  assert.deepEqual(f.removed,['1,0']);assert(f.resident.has('0,0'));
  assert.throws(()=>f.retention.setDemand(['1,0']),/disposed/);
});
