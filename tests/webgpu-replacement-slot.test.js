import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuReplacementSlot} from '../src/rendering/webgpu-replacement-slot.js';

test('publication callback failure is reported without silently discarding the admitted object',async()=>{
 const errors=[],released=[],slot=createWebGpuReplacementSlot({pipelineAdmission:{prepare:async()=>{}},release:object=>released.push(object),onReady:()=>{throw Error('consumer failed');},onError:error=>errors.push(error.message)}),object=new Group();
 slot.request('v1',()=>object);await new Promise(resolve=>setImmediate(resolve));assert.equal(slot.active,object);assert.deepEqual(errors,['consumer failed']);slot.dispose();assert.deepEqual(released,[object]);
});
