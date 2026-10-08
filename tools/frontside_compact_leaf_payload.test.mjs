import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {encodeCompactLeafPayload,decodeCompactLeafPayload} from './lib/frontside-compact-leaf-payload.mjs';
import {sharedLeafReverseGeometry} from './lib/frontside-shared-leaf-reverse.mjs';
const archive='.cache/frontside-model-pilot/candidates/archive/4d6d5dd729211e9ed5e429915ec81960da5e6b2197d1c8982a3dbb6a92893065.json';
test('compact derived payload preserves actual writer buffers, groups and correspondence',()=>{
 const original=JSON.parse(fs.readFileSync(archive)),encoded=encodeCompactLeafPayload(original),decoded=decodeCompactLeafPayload(encoded.bytes),source=new THREE.BufferGeometry();
 assert.deepEqual(decoded.faceLabels,original.faceLabels);assert.deepEqual(decoded.originalCoreFaceIds,original.originalCoreFaceIds);assert.equal(decoded.sourceSha256,original.sourceSha256);assert.equal(decoded.mesh,original.mesh);
 for(const reverseLeaves of [false,true]){const a=sharedLeafReverseGeometry(source,original,{reverseLeaves}).geometry,b=sharedLeafReverseGeometry(source,decoded,{reverseLeaves}).geometry;for(const name of ['position','normal','uv'])assert.deepEqual(new Uint8Array(b.attributes[name].array.buffer),new Uint8Array(a.attributes[name].array.buffer));assert.deepEqual(b.index.array,a.index.array);assert.deepEqual(b.groups,a.groups);assert.deepEqual(b.userData,a.userData);a.dispose();b.dispose();}source.dispose();
 assert.ok(encoded.counts.totalBytes<300000);
});
test('corrupt header, truncated stream and lane overflow are rejected',()=>{const p={corners:[[[0,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0],[0,0,1,0,1,0,0,1]]],faceLabels:[2],originalCoreFaceIds:[]};const {bytes}=encodeCompactLeafPayload(p);assert.throws(()=>decodeCompactLeafPayload(bytes.subarray(0,bytes.length-1)),/lengths/);const bad=bytes.slice();bad[0]=0;assert.throws(()=>decodeCompactLeafPayload(bad),/header/);assert.throws(()=>encodeCompactLeafPayload({...p,faceLabels:[256]}),/overflow/);});
