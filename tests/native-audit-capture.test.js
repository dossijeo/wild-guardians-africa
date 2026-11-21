import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeAuditCapture} from '../tools/guardian/native-audit-capture.mjs';

function fixture(){let now=10;const images=[];return {images,page:{evaluate:async()=>now++,locator:selector=>({screenshot:async({path})=>{assert.equal(selector,'#native-first-task');images.push(path);now+=100;}})}};}
test('visual acceptance keeps screenshots and records their full wall-clock window',async()=>{
  const f=fixture(),capture=createNativeAuditCapture(f.page,{output:'receipt.json'});await capture.checkpoint('issued-confirmed');
  const e=capture.evidence();assert.equal(e.visualEvidence,true);assert.deepEqual(f.images,['receipt-issued-confirmed.png']);assert.equal(e.checkpoints[0].finishedAt-e.checkpoints[0].startedAt,101);
});
test('timing arm omits GPU readback explicitly and never claims visual evidence',async()=>{
  const f=fixture(),capture=createNativeAuditCapture(f.page,{output:'receipt.json',mode:'timing'});await capture.checkpoint('issued-confirmed');
  assert.deepEqual(f.images,[]);assert.equal(capture.evidence().visualEvidence,false);assert.equal(capture.evidence().checkpoints[0].image,null);
});
test('unknown mode and capture errors do not silently turn into a successful visual run',async()=>{
  const f=fixture();assert.throws(()=>createNativeAuditCapture(f.page,{output:'r.json',mode:'off'}),/visual or timing/);
  f.page.locator=()=>({screenshot:async()=>{throw Error('readback failed');}});
  const capture=createNativeAuditCapture(f.page,{output:'r.json'});await assert.rejects(capture.checkpoint('issued'),/readback failed/);assert.equal(capture.evidence().visualEvidence,false);
});
