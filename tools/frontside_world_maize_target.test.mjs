import test from 'node:test';
import assert from 'node:assert/strict';
import {worldMaizeTarget} from './lib/frontside-world-maize-target.mjs';

test('focused QA spell skips lexically earlier immature/dead/other crops without changing plant order',()=>{
 const state={plants:[{id:'z',species:'maiz',alive:true,growth:270},{id:'a',species:'maiz',alive:true,growth:100},{id:'b',species:'maiz',alive:false,growth:300},{id:'c',species:'arroz',alive:true,growth:1000}]};
 const before=structuredClone(state);
 assert.equal(worldMaizeTarget(state).id,'z');
 assert.deepEqual(state,before);
});

test('missing mature maize rejects setup rather than casting away from the focused batch',()=>{
 assert.throws(()=>worldMaizeTarget({plants:[{id:'a',species:'maiz',alive:true,growth:269}]}),/No mature maize/);
});
