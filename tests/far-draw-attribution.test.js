import test from 'node:test';
import assert from 'node:assert/strict';
import {measureFarDraw} from '../tools/experiments/far-draw-attribution.js';
test('QA attribution records nested CPU and restores inherited methods',()=>{
 let time=0;const rows=[],prototype={bufferData(){time+=3;}},gl=Object.create(prototype);
 const direct=function(){gl.bufferData();};const renderer={getContext:()=>gl,renderBufferDirect:direct};
 assert.equal(measureFarDraw(renderer,2,()=>{renderer.renderBufferDirect(null,null,{attributes:{position:{count:12}}},{name:'ground',type:'shader'},{name:'patch'});return 7;},{now:()=>time,record:r=>rows.push(r)}),7);
 assert.equal(Object.hasOwn(gl,'bufferData'),false);assert.equal(renderer.renderBufferDirect,direct);
 assert.equal(rows[0].api.bufferData.ms,3);assert.equal(rows[0].materials[0].ms,3);assert.equal(rows[0].ms,3);assert.equal(rows[0].failed,false);
});
test('QA attribution restores methods and preserves driver errors',()=>{
 const error=Error('driver'),gl={drawArrays(){throw error;}},original=gl.drawArrays,renderer={getContext:()=>gl},rows=[];
 assert.throws(()=>measureFarDraw(renderer,0,()=>gl.drawArrays(),{record:r=>rows.push(r)}),e=>e===error);
 assert.equal(gl.drawArrays,original);assert.equal(rows[0].failed,true);assert.equal(rows[0].api.drawArrays.count,1);
});
