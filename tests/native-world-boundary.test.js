import test from 'node:test';
import assert from 'node:assert/strict';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../src/world/native-world-boundary.js';

const boundary={version:1,authorityEpoch:'owner/1',nativeSession:1,ticket:3,effectiveTime:10};
test('native world identities copy only versioned commit facts and distinguish old resources',()=>{
 const copy=copyNativeWorldBoundary(boundary);assert.notEqual(copy,boundary);assert(Object.isFrozen(copy));
 assert(sameNativeWorldBoundary(copy,boundary));assert.equal(copyNativeWorldBoundary(null),null);
 for(const change of [{version:2},{authorityEpoch:'other/1'},{nativeSession:2},{ticket:4},{effectiveTime:11}])
  assert.equal(sameNativeWorldBoundary(copy,{...copy,...change}),false);
 assert.equal(sameNativeWorldBoundary(copy,null),false);assert.equal(sameNativeWorldBoundary(copy,undefined),false);
});
test('malformed and future native resource schemas cannot grant graphical publication',()=>{
 for(const value of [undefined,{},0,{...boundary,version:2},{...boundary,ticket:0},{...boundary,ticket:1.2},
  {...boundary,nativeSession:0},{...boundary,effectiveTime:Infinity},{...boundary,effectiveTime:-1},
  {...boundary,authorityEpoch:''},{...boundary,future:true}])assert.throws(()=>copyNativeWorldBoundary(value),/Invalid native world/);
});
