import test from 'node:test';
import assert from 'node:assert/strict';
import {AwakeningGlow} from '../src/rendering/awakening-glow.js';
function renderer(){return {target:null,autoClear:true,info:{autoReset:true},calls:0,copies:0,getRenderTarget(){return this.target;},setRenderTarget(t){this.target=t;},getDrawingBufferSize(v){return v.set(1280,720);},copyFramebufferToTexture(){this.copies++;},render(){this.calls++;assert.equal(this.info.autoReset,false);if(this.fail)throw Error('draw failure');}};}
test('glow reuses targets and adds three fixed draws while preserving renderer ownership',()=>{
 const r=renderer(),g=new AwakeningGlow();try{g.apply(r);const first=g.capture,a=g.a;assert.equal(r.calls,3);assert.equal(g.stats.frames,1);g.apply(r);assert.equal(g.capture,first);assert.equal(g.a,a);assert.equal(r.calls,6);assert.equal(r.target,null);assert.equal(r.autoClear,true);assert.equal(r.info.autoReset,true);
 r.target={};g.apply(r);assert.equal(r.calls,6);assert.equal(r.copies,2);
 }finally{g.dispose();}
});
test('glow restores renderer state even when a GPU draw fails',()=>{
 const r=renderer(),g=new AwakeningGlow();r.fail=true;try{assert.throws(()=>g.apply(r),/draw failure/);assert.equal(r.target,null);assert.equal(r.autoClear,true);assert.equal(r.info.autoReset,true);assert.equal(g.stats.frames,0);}finally{g.dispose();}
});
