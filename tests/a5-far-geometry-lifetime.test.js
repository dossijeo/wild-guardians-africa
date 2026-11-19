import test from 'node:test';
import assert from 'node:assert/strict';
import {probeGeometryLifetime} from '../tools/guardian/migration-support/a5-geometry-lifetime.mjs';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {cloneChunkGeometry} from '../src/rendering/webgpu-chunk-clip.js';

for(const kind of ['deep-clone','cpu-array-shared-private-attributes'])test(`A5 disposal preserves another live owner: ${kind}`,()=>{
  const r=probeGeometryLifetime(kind);assert.equal(r.disposalError,null);assert.equal(r.sourceBuffersSurviveCandidateDisposal,true);assert.equal(r.createsOnNextRender,0);assert.equal(r.liveAfterFinalDispose,0);assert.equal(r.initialCreates,4);
});
for(const [kind,recreated]of [['shared-attribute',2]])test(`A5 negative control detects premature destruction: ${kind}`,()=>{
  const r=probeGeometryLifetime(kind);assert.equal(r.sourceBuffersSurviveCandidateDisposal,false);assert.equal(r.createsOnNextRender,recreated);assert.equal(r.liveAfterFinalDispose,0);
});
test('private GPU attributes do not isolate writers of a shared CPU array',()=>{
  const source=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([0,0,0],3)),copy=cloneChunkGeometry(source);
  try{assert.notEqual(copy.attributes.position,source.attributes.position);copy.attributes.position.setX(0,99);assert.equal(source.attributes.position.getX(0),99,'sharing is only safe under an immutable-data contract');}finally{copy.dispose();source.dispose();}
});

test('stripping geometry before disposal breaks actual RenderObject listener',()=>{const r=probeGeometryLifetime('shared-attribute-stripped-before-dispose');assert.match(r.disposalError,/TypeError.*version/);assert.equal(r.createsOnNextRender,0,'zero allocations cannot excuse failed disposal');});
