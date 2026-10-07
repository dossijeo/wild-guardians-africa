import test from 'node:test';
import assert from 'node:assert/strict';
import {frameDelta} from '../src/app/frame-delta.js';

test('queued RAF before load completion cannot reverse simulation or fades',()=>{
 assert.equal(frameDelta(1050,1052),0);
 assert.equal(frameDelta(1066,1050),.016);
 assert.equal(frameDelta(10000,1066),.1);
 assert.equal(frameDelta(1050,0),0);
 assert.equal(frameDelta(1050,1050),0);
});
