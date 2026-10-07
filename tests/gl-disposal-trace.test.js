import test from 'node:test';import assert from 'node:assert/strict';
import {traceGlDisposals} from '../tools/experiments/trace-gl-disposals.js';
function fixture(){let code=0;return {gl:{NO_ERROR:0,CONTEXT_LOST_WEBGL:0x9242,canvas:new EventTarget(),getError(){const v=code;code=0;return v;},deleteBuffer(){code=0x502;}},set:c=>code=c};}
test('disposal trace identifies generated faults without hiding them from GPU proof checks',()=>{
 const f=fixture(),original=f.gl.getError,remove=f.gl.deleteBuffer,errors=[],trace=traceGlDisposals(f.gl,{onError:e=>errors.push(e)});f.gl.deleteBuffer({});assert.equal(trace.report().records[0].phase,'after');assert.equal(f.gl.getError(),0x502);assert.equal(f.gl.getError(),0);assert.match(errors[0],/0x502/);trace.dispose();trace.dispose();assert.equal(f.gl.getError,original);assert.equal(f.gl.deleteBuffer,remove);
});
test('prior faults remain distinct and restoration clears only old-context queued codes',()=>{
 const f=fixture(),trace=traceGlDisposals(f.gl);f.set(0x501);f.gl.deleteBuffer({});assert.deepEqual(trace.report().records.map(r=>r.phase),['prior','after']);assert.equal(f.gl.getError(),0x501);f.gl.canvas.dispatchEvent(new Event('webglcontextrestored'));assert.equal(f.gl.getError(),0);assert.equal(trace.report().records.length,2);trace.dispose();
});
