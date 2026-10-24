import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldScene} from '../src/rendering/scene.js';
test('restoring context invalidates baked material targets and requests shadow refresh',()=>{
 const keys=[],world={mangroveMaterialCache:{states:new Map([['0,0',{}],['1,0',{}]]),invalidate:key=>keys.push(key)},releaseNativeShadow:{cache:{invalidate(){keys.push('shadow');}}},renderer:{shadowMap:{needsUpdate:false}}};
 WorldScene.prototype.restoreCachedGraphics.call(world);
 assert.deepEqual(keys,['0,0','1,0','shadow']);assert.equal(world.renderer.shadowMap.needsUpdate,true);
});
