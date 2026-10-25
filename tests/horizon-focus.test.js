import test from 'node:test';
import assert from 'node:assert/strict';
import {HorizonFocus} from '../tools/experiments/horizon-focus.js';
const mock=()=>{const pending=[];return {pending,initialized:0,compileAsync(){return new Promise(resolve=>pending.push(resolve));},getDrawingBufferSize(v){return v.set(1280,720);},initRenderTarget(){this.initialized++;}};};
const configure=(f,quality='media')=>f.configure({enabled:true,quality,biome:'manglares'});
test('low quality releases the render target; reenabling prepares resources before drawing',async()=>{
 const r=mock(),f=new HorizonFocus(r);configure(f);const p=f.prepare();await Promise.resolve();r.pending.shift()();await p;assert(f.ready);assert.equal(f.stats.bytes,1280*720*8);const target=f.target;let disposed=0;target.addEventListener('dispose',()=>disposed++);
 configure(f,'baja');assert.equal(disposed,1);assert.equal(f.target,null);assert.equal(f.stats.bytes,0);configure(f);await f.prepare();assert.notEqual(f.target,target);assert.equal(r.initialized,2);f.dispose();
});
test('a context generation change prevents old compilation from publishing readiness',async()=>{
 const r=mock(),f=new HorizonFocus(r);configure(f);const old=f.prepare();await Promise.resolve();f.reset();const next=f.prepare();await Promise.resolve();r.pending.shift()();await old;assert.equal(f.ready,false);assert.equal(f.target,null);assert(f.preparing);r.pending.shift()();await next;assert(f.ready);assert.equal(r.initialized,1);f.dispose();
});
test('leaving the world during compilation never allocates a late target',async()=>{
 const r=mock(),f=new HorizonFocus(r);configure(f);const p=f.prepare();await Promise.resolve();f.dispose();r.pending.shift()();await p;assert.equal(r.initialized,0);assert.equal(f.target,null);assert.equal(f.ready,false);
});
