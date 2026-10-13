import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation} from '../src/world/navigation.js';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {installSparseWasmCampaignHook} from '../tools/experiments/sparse-wasm-campaign-hook.mjs';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/hierarchical-wasm/lazy-sectors.wasm',import.meta.url)));

test('QA hybrid preserves native gate validity and restores Navigation methods',()=>{
  const previous=Navigation.prototype.path;
  const {s,nav}=fixture('closed-walls');
  const gate=s.structures.find(o=>o.id==='wall-2-5');gate.gate=true;gate.gateOpen=true;nav.setState(s);
  const hook=installSparseWasmCampaignHook(module);
  try{
    const start={x:15,z:29},end={x:15,z:7};
    const route=nav.path(start,end,.28,null,true,24);
    assert(route?.length>0);
    let at=start;for(const point of route){assert(nav.segmentClear(at,point,.28,null,true));at=point;}
    assert.deepEqual(at,end);
    assert.equal(hook.metrics().requests,1);
    gate.gate=false;gate.gateOpen=false;nav.setState(s);
    assert.equal(nav.path(start,end,.28,null,true,24),null);
    assert.equal(hook.metrics().wasmInvalid,0);
  }finally{hook.uninstall();}
  assert.equal(Navigation.prototype.path,previous);
});
