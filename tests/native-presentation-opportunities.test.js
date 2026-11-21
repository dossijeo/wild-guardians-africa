import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

test('bounded RAF diagnostics distinguish guards from submissions without adding a scheduler',async()=>{
  let now=1000,callback,requested=0;
  const f=await fixture({}, {absoluteNow:()=>now,requestFrame:fn=>{callback=fn;return ++requested;}});
  const step=()=>{now+=33;const count=requested;callback();assert.equal(requested,count+1);};
  try{
    step();assert.equal(f.host.inspect().presentationOpportunities.at(-1).outcome,'awaiting-prepared-frame');
    const shown=f.frame(1);await flush();await f.host.idle();step();await shown;
    assert.equal(f.host.inspect().presentationOpportunities.at(-1).outcome,'submitted');
    const submissions=f.gpu.submitted.length;
    f.host.setVisibility(true);step();assert.equal(f.host.inspect().presentationOpportunities.at(-1).outcome,'hidden');
    assert.equal(f.gpu.submitted.length,submissions);
    f.host.setVisibility(false);step();assert.equal(f.host.inspect().presentationOpportunities.at(-1).intervalMs,null);
    for(let i=0;i<520;i++)step();
    const records=f.host.inspect().presentationOpportunities;
    assert.equal(records.length,512);assert(records.every(r=>r.outcome==='submitted'&&r.holdId===null));
    assert(records.every((r,i)=>i===0||r.at-records[i-1].at===33));
    assert.equal(f.gpu.submitted.length,submissions+521);assert.deepEqual(f.errors,[]);
  }finally{f.client.dispose();await f.host.dispose();}
});
