import assert from 'node:assert/strict';
import {installBufferStorageAudit} from './lib/frontside-gpu-buffer-budget.mjs';
// A deterministic allocator oracle exercises sharing, resizing, transient peaks
// and teardown. This is an instrument unit check, not a native GPU measurement.
const binding=new Map(),storage=new Map(),received=[];
const gl={ARRAY_BUFFER:34962,ARRAY_BUFFER_BINDING:34964,BUFFER_SIZE:34660,
 createBuffer(){const b={};storage.set(b,0);return b;},
 bindBuffer(target,buffer){binding.set(target,buffer);},
 getParameter(){return binding.get(34962);},
 getBufferParameter(target){return storage.get(binding.get(target));},
 bufferData(target,value,usage,offset=0,length){received.push([...arguments]);const bytes=typeof value==='number'?value:(length??value.length-offset)*value.BYTES_PER_ELEMENT;storage.set(binding.get(target),bytes);return 'original-result';},
 deleteBuffer(buffer){storage.delete(buffer);return 'deleted-original-result';}};
const original={create:gl.createBuffer,allocate:gl.bufferData,remove:gl.deleteBuffer};
const audit=installBufferStorageAudit(gl),shared=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,shared);
assert.equal(gl.bufferData(gl.ARRAY_BUFFER,new Uint16Array(12),35044,2,5),'original-result');
assert.equal(audit.snapshot('shared').liveBytes,10);
assert.deepEqual(received[0].slice(2),[35044,2,5]);
audit.setPhase('candidate coexistence');const candidate=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,candidate);gl.bufferData(gl.ARRAY_BUFFER,30,35044);
assert.equal(audit.snapshot('both').liveBytes,40);
gl.bindBuffer(gl.ARRAY_BUFFER,shared);gl.bufferData(gl.ARRAY_BUFFER,4,35044);
assert.equal(audit.snapshot('resized').liveBytes,34);
assert.equal(audit.snapshot('peak').peakBytes,40);
assert.equal(gl.deleteBuffer(candidate),'deleted-original-result');gl.deleteBuffer(candidate);
assert.equal(audit.snapshot('shared only').liveBytes,4);
gl.deleteBuffer(shared);const report=audit.finish();
assert.equal(report.liveBytes,0);assert.equal(report.peakBytes,40);assert.equal(report.liveBuffers.length,0);
assert.equal(gl.createBuffer,original.create);assert.equal(gl.bufferData,original.allocate);assert.equal(gl.deleteBuffer,original.remove);
assert.throws(()=>audit.finish(),/already finished/);
console.log('PASS: allocator lifecycle, shared storage, resize/peak, duplicate deletion and original API restoration; no native GPU claim.');
